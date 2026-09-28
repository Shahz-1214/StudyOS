import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  validatePdfBytes,
  hashTextbookBytes,
  readOperatorUpload,
} from '../../shared/textbookPdf.ts';

// Admin-only registration of an operator-supplied board textbook.
//
// The operator uploads the PDF themselves (browser -> private storage); this
// function validates it structurally, hashes it and files it as the canonical
// `official_textbook` BoardResource record. It never scrapes, mirrors or
// auto-fetches a board URL, and it never replaces an external link silently.
//
// Idempotent: exact-file identity is SHA-256. Re-registering the same file
// creates no record and stores no second copy. A resource_id that already
// exists with DIFFERENT bytes is refused rather than overwritten (a corrected
// re-upload or a new edition is an explicit operator decision).
//
// Security truthfulness: these files exceed the existing malware scanner's
// 3.5 MB ceiling, so malware_scan_status is recorded as not_scanned. Nothing
// here ever claims a scan that did not happen.

const MEDIA = ['english', 'urdu', 'unspecified'];

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
    const fileUri = clean(body.file_uri, 500);
    const boardId = clean(body.board_id, 120);
    const subBoardId = clean(body.sub_board_id, 120);
    const title = clean(body.title, 300);
    const subjectName = clean(body.subject_name, 160);
    const classOrYear = clean(body.class_or_year, 60);
    const officialSourceUrl = clean(body.official_source_url, 500);
    const medium = MEDIA.includes(body.medium) ? body.medium : 'unspecified';
    const syllabusYear = clean(body.syllabus_year, 40);
    const edition = clean(body.edition, 80);
    const provider = clean(body.provider, 160);
    const declaredSize = Number(body.file_size) || 0;
    const resourceId = clean(body.resource_id, 120) || 'textbook-' + Date.now().toString(36);

    if (!fileUri || !boardId || !title || !subjectName) {
      return Response.json({ error: 'File, board, title and subject are required.', code: 'INVALID_INPUT' }, { status: 400 });
    }

    // --- Board mapping (PRD §4): resolve the canonical board, never create one.
    const boards = await base44.asServiceRole.entities.Board.filter({ board_id: boardId });
    const board = (boards || [])[0];
    if (!board) {
      return Response.json({
        error: 'That board could not be resolved from the canonical board registry — registration stopped.',
        code: 'BOARD_MISMATCH',
        board_id: boardId,
      }, { status: 409 });
    }
    let subBoard = null;
    if (subBoardId) {
      const subs = Array.isArray(board.sub_boards) ? board.sub_boards : [];
      subBoard = subs.find((s) => s && s.sub_board_id === subBoardId) || null;
      if (!subBoard) {
        return Response.json({
          error: 'That sub-board is not part of the resolved board — registration stopped.',
          code: 'SUB_BOARD_MISMATCH',
          board_id: boardId,
          sub_board_id: subBoardId,
        }, { status: 409 });
      }
    }

    // --- Read the operator's uploaded file with a hard cap.
    const read = await readOperatorUpload(base44, fileUri);
    if (!read.ok) {
      return Response.json({ error: 'The uploaded file could not be read.', code: read.code }, { status: 422 });
    }
    const bytes = read.bytes;
    if (declaredSize && bytes.byteLength !== declaredSize) {
      return Response.json({ error: 'The uploaded file did not arrive intact.', code: 'SIZE_MISMATCH' }, { status: 422 });
    }

    // --- Deterministic structural validation (no AI, no execution).
    const verdict = validatePdfBytes(bytes);
    if (!verdict.ok) {
      const messages: Record<string, string> = {
        NOT_A_PDF: 'That file is not a PDF.',
        TRUNCATED_PDF: 'That PDF looks truncated or malformed.',
        ENCRYPTED_PDF: 'That PDF is password-protected and cannot be indexed or read.',
        ACTIVE_CONTENT: 'That PDF contains executable or script-like content and was refused.',
        EMPTY_FILE: 'That file is empty.',
        TOO_LARGE: 'That file is larger than the supported size.',
      };
      return Response.json({
        error: messages[verdict.code] || 'That file could not be validated.',
        code: verdict.code,
        active_content: verdict.activeContent || undefined,
      }, { status: 422 });
    }

    // --- Exact-file identity.
    const sha256 = await hashTextbookBytes(bytes);

    const existing = await base44.asServiceRole.entities.BoardResource.filter(
      { board_id: boardId, sha256 },
      '-created_date',
      5
    );
    const sameFile = (existing || []).find((r) => r.sha256 === sha256);
    if (sameFile) {
      return Response.json({
        ok: true,
        status: 'already_registered',
        resource_id: sameFile.resource_id,
        record_id: sameFile.id,
        stored_again: false,
        message: 'This exact file is already registered.',
      });
    }

    // --- Attach mode: store the supplied copy on an EXISTING canonical record
    // instead of creating a second one. This is the path for textbooks that are
    // already registered as official source links (no duplicates, no new book).
    const attachTo = clean(body.attach_to_record_id, 120);
    if (attachTo) {
      const targets = await base44.asServiceRole.entities.BoardResource.filter({ id: attachTo }, '-created_date', 1);
      const target = (targets || [])[0];
      if (!target) return Response.json({ error: 'That textbook record was not found.', code: 'NOT_FOUND' }, { status: 404 });
      if (target.resource_type !== 'official_textbook') {
        return Response.json({ error: 'That record is not a textbook.', code: 'WRONG_RESOURCE_TYPE' }, { status: 400 });
      }
      if (target.sha256 && target.sha256 === sha256) {
        return Response.json({
          ok: true,
          status: 'already_registered',
          record_id: target.id,
          resource_id: target.resource_id,
          stored_again: false,
          message: 'This exact file is already stored for this textbook.',
        });
      }

      const replaced = !!(target.sha256 && target.sha256 !== sha256);
      const attachNote = [
        'Authorised copy supplied by the operator and stored in StudyOS.',
        (officialSourceUrl || target.url) ? 'Official source retained: ' + (officialSourceUrl || target.url) + '.' : '',
        'Malware scanning was not performed (file exceeds the existing 3.5 MB scanner ceiling).',
        'Redistribution permission: pending verification.',
        replaced ? 'This copy replaced a previously stored different file.' : '',
      ].filter(Boolean).join(' ');

      await base44.asServiceRole.entities.BoardResource.update(target.id, {
        url: officialSourceUrl || target.url || '',
        provider: provider || target.provider || '',
        stored_file_uri: fileUri,
        stored_file_name: (title || target.title) + '.pdf',
        file_size_bytes: bytes.byteLength,
        sha256,
        page_count: verdict.pageCountHint || target.page_count || 0,
        stored_copy_status: replaced ? 'replaced' : 'stored',
        processing_status: 'validated',
        index_status: 'not_indexed',
        chapter_index_source: 'not_set',
        structural_validation: 'structurally_validated',
        malware_scan_status: 'not_scanned',
        rights_status: 'pending_verification',
        copyright_note: attachNote,
        notes: 'Stored copy attached. Chapter indexing has not been run yet.',
      });

      return Response.json({
        ok: true,
        status: 'attached',
        record_id: target.id,
        resource_id: target.resource_id,
        replaced_previous_file: replaced,
        file: {
          bytes: bytes.byteLength,
          sha256,
          structurally_validated: true,
          malware_scan_status: 'not_scanned',
          page_count_hint: verdict.pageCountHint || 0,
        },
        next_step: 'Run indexTextbookChapters to establish chapters for this book.',
      });
    }

    const idClash = await base44.asServiceRole.entities.BoardResource.filter({ resource_id: resourceId }, '-created_date', 5);
    if ((idClash || []).length) {
      return Response.json({
        error: 'A different file is already registered under this resource id. Refusing to overwrite it.',
        code: 'RESOURCE_ID_IN_USE',
        resource_id: resourceId,
      }, { status: 409 });
    }

    // --- Canonical record. Provenance is truthful: a stored copy is a stored
    // copy, and rights are not claimed until they are actually established.
    const nowIso = new Date().toISOString().slice(0, 10);
    const copyrightNote = [
      'Authorised copy supplied by the operator and stored in StudyOS.',
      officialSourceUrl ? 'Official source retained: ' + officialSourceUrl + '.' : '',
      'Malware scanning was not performed (file exceeds the existing 3.5 MB scanner ceiling).',
      'Redistribution permission: pending verification.',
    ].filter(Boolean).join(' ');

    const created = await base44.asServiceRole.entities.BoardResource.create({
      resource_id: resourceId,
      board_id: board.board_id,
      sub_board_id: subBoard ? subBoard.sub_board_id : '',
      country: board.country || '',
      education_system: board.education_system || '',
      qualification: board.qualification || '',
      level: board.level || '',
      class_or_year: classOrYear,
      board: board.board || '',
      subject_code: '',
      subject_name: subjectName,
      medium,
      syllabus_year: syllabusYear,
      resource_type: 'official_textbook',
      title,
      url: officialSourceUrl,
      provider,
      authority_level: 'official_textbook_authority',
      verification_status: 'verified',
      verified_on: nowIso,
      access_type: 'Restricted',
      provenance: subBoard
        ? `Operator-supplied ${subBoard.name} textbook · official source: ${officialSourceUrl || 'not supplied'}`
        : `Operator-supplied textbook · official source: ${officialSourceUrl || 'not supplied'}`,
      copyright_note: copyrightNote,
      last_checked: nowIso,
      active: true,
      edition,
      stored_file_uri: fileUri,
      stored_file_name: title + '.pdf',
      file_size_bytes: bytes.byteLength,
      sha256,
      page_count: verdict.pageCountHint || 0,
      stored_copy_status: 'stored',
      processing_status: 'validated',
      index_status: 'not_indexed',
      chapter_index_source: 'not_set',
      structural_validation: 'structurally_validated',
      malware_scan_status: 'not_scanned',
      rights_status: 'pending_verification',
      notes: 'Chapter indexing has not been run yet.',
    });

    return Response.json({
      ok: true,
      status: 'registered',
      record_id: created.id,
      resource_id: resourceId,
      board: { board_id: board.board_id, board: board.board, sub_board_id: subBoard ? subBoard.sub_board_id : '' },
      file: {
        bytes: bytes.byteLength,
        sha256,
        structurally_validated: true,
        malware_scan_status: 'not_scanned',
        page_count_hint: verdict.pageCountHint || 0,
      },
      rights_status: 'pending_verification',
      next_step: 'Run indexTextbookChapters to establish chapters for this book.',
    });
  } catch (error) {
    return Response.json(
      { error: 'Could not register the textbook. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}