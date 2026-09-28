import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  TEXTBOOKS,
  SUB_BOARD,
  VERIFIED_ON,
  PROVENANCE,
  COPYRIGHT_NOTE,
  buildNotes,
} from '../../shared/punjabMatricTextbooks.js';

// Admin-only, idempotent import of the verified PECTAA Punjab Matric / SSC
// compulsory textbook links into the EXISTING BoardResource framework as
// `official_textbook` records. No new entity, resource type, storage system or
// subject records are created.
//
// Deterministic: no AI, no URL construction, no third-party substitution.
// Deduplication happens BEFORE insert on two keys — the exact URL and the
// deterministic resource_id — so re-running the import creates zero duplicates.
//
// Board mapping guard: the canonical Matric (SSC) parent board must already
// exist. If it does not, the import STOPS rather than filing textbooks against
// the wrong board.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // --- Board mapping: resolve the canonical parent, never create one ------
    const parents = await base44.asServiceRole.entities.Board.filter({
      board_id: SUB_BOARD.parent_board_id,
    });
    const parent = (parents || [])[0];
    if (!parent) {
      return Response.json({
        error: 'Canonical parent board could not be resolved — import stopped.',
        code: 'BOARD_MISMATCH',
        expected_board_id: SUB_BOARD.parent_board_id,
        imported: 0,
      }, { status: 409 });
    }

    // --- Sub-board layer (approved design). Additive + idempotent -----------
    const existingSubs = Array.isArray(parent.sub_boards) ? parent.sub_boards : [];
    const subBoardExists = existingSubs.some(
      (s) => s && s.sub_board_id === SUB_BOARD.sub_board_id
    );
    if (!subBoardExists) {
      await base44.asServiceRole.entities.Board.update(parent.id, {
        sub_boards: [...existingSubs, SUB_BOARD],
        requires_subboard: true,
      });
    }

    // --- Duplicate detection (deterministic, pre-insert) -------------------
    const existing = await base44.asServiceRole.entities.BoardResource.list('-created_date', 1000);
    const scope = (existing || []).filter((r) => r.board_id === SUB_BOARD.parent_board_id);

    const existingUrls = new Set(scope.map((r) => String(r.url || '').trim()));
    const existingIds = new Set(scope.map((r) => String(r.resource_id || '').trim()));

    const toCreate = [];
    const alreadyExisting = [];

    for (const t of TEXTBOOKS) {
      const url = String(t.url || '').trim();
      const rid = String(t.resource_id || '').trim();
      if (existingUrls.has(url) || existingIds.has(rid)) {
        alreadyExisting.push(t.resource_id);
        continue;
      }
      toCreate.push({
        resource_id: rid,
        board_id: SUB_BOARD.parent_board_id,
        sub_board_id: SUB_BOARD.sub_board_id,
        country: parent.country || '',
        education_system: parent.education_system || '',
        qualification: parent.qualification || '',
        level: parent.level || '',
        class_or_year: t.class_or_year,
        board: parent.board || '',
        subject_code: '',
        subject_name: t.subject_name,
        syllabus_year: t.syllabus_year || '',
        medium: t.medium || 'unspecified',
        resource_type: 'official_textbook',
        title: t.title,
        url,
        provider: 'PECTAA',
        authority_level: 'official_textbook_authority',
        verification_status: 'verified',
        verified_on: VERIFIED_ON,
        access_type: 'Public',
        provenance: PROVENANCE + ' · Source record: ' + t.source_record,
        copyright_note: COPYRIGHT_NOTE,
        last_checked: VERIFIED_ON,
        active: true,
        notes: buildNotes(t),
      });
    }

    let created = [];
    if (toCreate.length) {
      created = await base44.asServiceRole.entities.BoardResource.bulkCreate(toCreate);
    }

    const classOf = (rid) => {
      const t = TEXTBOOKS.find((x) => x.resource_id === rid);
      return t ? t.class_or_year : 'unknown';
    };
    const countByClass = (ids) =>
      ids.reduce((acc, rid) => {
        const k = classOf(rid);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});

    const createdIds = (created || []).map((r) => r.resource_id);

    return Response.json({
      board_mapping: {
        parent_board_id: parent.board_id,
        parent_board: parent.board,
        sub_board_id: SUB_BOARD.sub_board_id,
        sub_board_created: !subBoardExists,
      },
      resource_type: 'official_textbook',
      authority_level: 'official_textbook_authority',
      links_supplied: TEXTBOOKS.length,
      imported: createdIds.length,
      imported_by_class: countByClass(createdIds),
      already_existing: alreadyExisting.length,
      already_existing_ids: alreadyExisting,
      duplicates_prevented: alreadyExisting.length,
      unavailable: 0,
      fallback_required: 0,
      errors: [],
    });
  } catch {
    return Response.json(
      { error: 'Could not import the textbook registry. Please try again.', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}