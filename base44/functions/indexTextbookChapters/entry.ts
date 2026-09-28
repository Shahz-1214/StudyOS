import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  readStoredBook,
  validatePdfBytes,
  extractPdfIndex,
  normalizeOperatorChapterMap,
  chaptersFromStartPages,
  buildChapterDigest,
  countWords,
} from '../../shared/textbookPdf.ts';

// Admin-only chapter indexing for ONE registered textbook. Separate from
// registration on purpose: extraction is the slow, failure-prone step and must
// never block or break registration.
//
// Deterministic only. Chapter boundaries come from the PDF's own outline, a
// conservative table-of-contents detection, or the operator's explicit chapter
// map. When none of those establish reliable boundaries the book is recorded
// as not_indexed — never guessed, never AI-fabricated (PRD §13, §14).
//
// Repeatable: existing chapter records are updated in place, missing ones
// created, and stale ones deactivated (never hard-deleted).

const TEXT_BUDGET_MS = 100000;

function clean(v: unknown, max = 200) {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only', code: 'FORBIDDEN' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const recordId = clean(body.book_resource_id, 120);
    if (!recordId) return Response.json({ error: 'A textbook record is required.', code: 'INVALID_INPUT' }, { status: 400 });

    const books = await base44.asServiceRole.entities.BoardResource.filter({ id: recordId }, '-created_date', 1);
    const book = (books || [])[0];
    if (!book) return Response.json({ error: 'Textbook not found.', code: 'NOT_FOUND' }, { status: 404 });
    if (book.resource_type !== 'official_textbook') {
      return Response.json({ error: 'That record is not a textbook.', code: 'WRONG_RESOURCE_TYPE' }, { status: 400 });
    }
    if (!book.stored_file_uri) {
      return Response.json({ error: 'No stored copy exists for this textbook, so it cannot be indexed.', code: 'NO_STORED_FILE' }, { status: 409 });
    }

    await base44.asServiceRole.entities.BoardResource.update(book.id, {
      processing_status: 'indexing',
      index_status: 'indexing',
    });

    const read = await readStoredBook(base44, book.stored_file_uri);
    if (!read.ok) {
      await base44.asServiceRole.entities.BoardResource.update(book.id, {
        processing_status: 'failed',
        index_status: 'failed',
        notes: 'Stored file could not be read during indexing (' + read.code + ').',
      });
      return Response.json({ error: 'The stored file could not be read.', code: read.code }, { status: 422 });
    }
    const bytes = read.bytes;

    const structure = validatePdfBytes(bytes);
    if (!structure.ok) {
      await base44.asServiceRole.entities.BoardResource.update(book.id, {
        processing_status: 'failed',
        index_status: 'failed',
        structural_validation: 'failed',
        notes: 'Structural validation failed during indexing (' + structure.code + ').',
      });
      return Response.json({ error: 'The stored file failed structural validation.', code: structure.code }, { status: 422 });
    }

    // --- Establish chapter boundaries deterministically.
    let pageCount = structure.pageCountHint || 0;
    let pageTexts: string[] = [];
    let chapters: { chapter_index: number; chapter_title: string; start_page: number; end_page: number }[] = [];
    let method = 'operator_map';
    let notes = '';

    const operatorMap = normalizeOperatorChapterMap(body.chapters);
    if (body.chapters !== undefined && !operatorMap) {
      await base44.asServiceRole.entities.BoardResource.update(book.id, {
        processing_status: 'needs_review',
        index_status: 'not_indexed',
        notes: 'The supplied chapter map was inconsistent and was not applied.',
      });
      return Response.json({ error: 'The supplied chapter map is inconsistent.', code: 'INVALID_CHAPTER_MAP' }, { status: 400 });
    }

    const extracted = await extractPdfIndex(bytes, TEXT_BUDGET_MS);
    if (extracted.ok) {
      pageCount = extracted.pageCount || pageCount;
      pageTexts = extracted.pageTexts || [];
      if (extracted.textTruncated) {
        notes = 'Text extraction reached its time budget; some chapters have no grounded text.';
      }
    }

    if (operatorMap) {
      chapters = operatorMap.map((c) => ({
        chapter_index: c.chapter_index,
        chapter_title: c.chapter_title,
        start_page: c.start_page,
        end_page: Math.min(c.end_page, pageCount || c.end_page),
      }));
      method = 'operator_map';
    } else if (extracted.ok && extracted.chapters.length >= 2) {
      chapters = chaptersFromStartPages(extracted.chapters, pageCount);
      method = extracted.method === 'toc' ? 'toc' : 'pdf_outline';
    }

    if (chapters.length < 2) {
      await base44.asServiceRole.entities.BoardResource.update(book.id, {
        processing_status: 'not_indexed',
        index_status: 'not_indexed',
        page_count: pageCount || book.page_count || 0,
        chapter_index_source: 'not_set',
        notes: extracted.ok
          ? 'Reliable chapter boundaries could not be established from this PDF. Supply a chapter map to index it.'
          : 'No PDF parser was available to read this book, so chapters were not established. Supply a chapter map to index it.',
      });
      return Response.json({
        ok: true,
        status: 'not_indexed',
        page_count: pageCount || 0,
        reason: extracted.ok ? 'NO_RELIABLE_STRUCTURE' : extracted.code || 'EXTRACTOR_UNAVAILABLE',
        chapters: 0,
        text_extracted: false,
      });
    }

    // --- Persist chapters idempotently.
    const existing = await base44.asServiceRole.entities.TextbookChapter.filter(
      { book_resource_id: book.id },
      '-chapter_index',
      400
    );
    const byIndex = new Map<number, any>();
    for (const c of existing || []) byIndex.set(Number(c.chapter_index), c);

    const seen = new Set<number>();
    const results: any[] = [];

    for (const ch of chapters) {
      const pageSlice = pageTexts.slice(ch.start_page - 1, ch.end_page);
      const text = pageSlice.join('\n').trim();
      const digest = buildChapterDigest(text);
      const words = countWords(text);

      // Full chapter text lives in private storage, not in the record: entity
      // fields stay small and the chapter still references its own source.
      let textUri = '';
      if (text) {
        try {
          const upload = await base44.asServiceRole.integrations.Core.UploadPrivateFile({
            file: new File([text], `chapter-${book.id}-${ch.chapter_index}.txt`, { type: 'text/plain' }),
          });
          textUri = String(upload?.file_uri || '');
        } catch {
          textUri = '';
        }
      }

      const payload = {
        book_resource_id: book.id,
        board_id: book.board_id || '',
        sub_board_id: book.sub_board_id || '',
        class_or_year: book.class_or_year || '',
        subject_name: book.subject_name || '',
        medium: book.medium || 'unspecified',
        chapter_index: ch.chapter_index,
        chapter_title: ch.chapter_title,
        start_page: ch.start_page,
        end_page: ch.end_page,
        word_count: words,
        source_digest: digest,
        source_text_uri: textUri,
        derivation_method: method,
        index_status: digest ? 'indexed' : 'needs_review',
        verification_status: digest ? 'verified' : 'needs_review',
        provenance: `Derived from ${book.title} (${method})`,
        active: true,
      };

      seen.add(ch.chapter_index);
      const prior = byIndex.get(ch.chapter_index);
      if (prior) {
        // Never drop a previously extracted digest if this pass produced none.
        const merged = digest ? payload : { ...payload, source_digest: prior.source_digest || '', source_text_uri: prior.source_text_uri || '', word_count: prior.word_count || 0, index_status: prior.index_status || 'needs_review' };
        await base44.asServiceRole.entities.TextbookChapter.update(prior.id, merged);
        results.push({ chapter_index: ch.chapter_index, updated: true, grounded: !!merged.source_digest });
      } else {
        await base44.asServiceRole.entities.TextbookChapter.create(payload);
        results.push({ chapter_index: ch.chapter_index, updated: false, grounded: !!digest });
      }
    }

    // Stale chapters are deactivated, never deleted.
    let deactivated = 0;
    for (const c of existing || []) {
      if (!seen.has(Number(c.chapter_index)) && c.active) {
        await base44.asServiceRole.entities.TextbookChapter.update(c.id, { active: false, index_status: 'needs_review' });
        deactivated++;
      }
    }

    const grounded = results.filter((r) => r.grounded).length;
    const allGrounded = grounded === results.length && !notes;
    const finalNotes = notes || (allGrounded ? '' : 'Some chapters have no extracted text.');

    await base44.asServiceRole.entities.BoardResource.update(book.id, {
      page_count: pageCount || 0,
      index_status: allGrounded ? 'indexed' : 'needs_review',
      chapter_index_source: method,
      processing_status: allGrounded ? 'ready' : 'needs_review',
      notes: finalNotes,
    });

    return Response.json({
      ok: true,
      status: allGrounded ? 'indexed' : 'needs_review',
      page_count: pageCount || 0,
      method,
      chapters: chapters.length,
      chapters_grounded: grounded,
      chapters_deactivated: deactivated,
      text_extracted: pageTexts.length > 0,
      text_truncated: !!(extracted.ok && extracted.textTruncated),
      notes: finalNotes,
    });
  } catch (error) {
    return Response.json(
      { error: 'Could not index the textbook. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}