import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { buildRegistry } from "../../shared/boardRegistryTransform.js";

// Admin-only import of the verified board resource registry into the
// Board / BoardResource / ExamSeries entities. Deduplicates against existing
// records (preserves verified entries, never overwrites with a weaker source).
// Optional verify_urls performs a live availability check and deactivates fails.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const verifyUrls = body?.verify_urls === true;

    const { boards, resources, examSeries, duplicatesRemoved } = buildRegistry();

    const [existingBoards, existingResources, existingExam] = await Promise.all([
      base44.asServiceRole.entities.Board.list("-created_date", 500),
      base44.asServiceRole.entities.BoardResource.list("-created_date", 500),
      base44.asServiceRole.entities.ExamSeries.list("-created_date", 500),
    ]);

    const boardIds = new Set(existingBoards.map((b) => b.board_id));
    const resKeys = new Set(existingResources.map((r) => r.board_id + "|" + r.url));
    const examKeys = new Set(existingExam.map((e) => e.board_id + "|" + e.exam_series));

    const newBoards = boards.filter((b) => !boardIds.has(b.board_id));
    const newResources = resources.filter((r) => !resKeys.has(r.board_id + "|" + r.url));
    const newExam = examSeries.filter((e) => !examKeys.has(e.board_id + "|" + e.exam_series));

    let createdBoards = [], createdResources = [], createdExam = [];
    if (newBoards.length) createdBoards = await base44.asServiceRole.entities.Board.bulkCreate(newBoards);
    if (newResources.length) createdResources = await base44.asServiceRole.entities.BoardResource.bulkCreate(newResources);
    if (newExam.length) createdExam = await base44.asServiceRole.entities.ExamSeries.bulkCreate(newExam);

    // Optional live availability check — mark unreachable URLs inactive.
    let urlChecks = [];
    if (verifyUrls && newResources.length) {
      urlChecks = await Promise.all(newResources.map(async (r) => {
        try {
          const res = await fetch(r.url, { method: "GET", redirect: "follow", headers: { "User-Agent": "StudyOS-Registry-Check/1.0" } });
          return { url: r.url, status: res.status, ok: res.ok };
        } catch (e) {
          return { url: r.url, status: 0, ok: false, error: String(e).slice(0, 120) };
        }
      }));
      const failed = urlChecks.filter((c) => !c.ok).map((c) => c.url);
      if (failed.length) {
        await base44.asServiceRole.entities.BoardResource.updateMany(
          { url: { $in: failed } },
          { $set: { verification_status: "failed", active: false, last_checked: new Date().toISOString().slice(0, 10) } }
        );
      }
    }

    // Boards requiring manual sub-board selection (SSC / HSSC).
    const boardsRequiringSubboard = boards.filter((b) => b.requires_subboard).map((b) => b.board_id);

    // Subjects with no verified supplementary resource at board level.
    const boardsWithSupp = new Set(resources.filter((r) => r.authority_level !== "official").map((r) => r.board_id));
    const subjectsWithoutSupplementary = boards.filter((b) => !boardsWithSupp.has(b.board_id)).map((b) => b.board_id);

    return Response.json({
      boards_imported: createdBoards.length,
      resources_imported: createdResources.length,
      exam_series_imported: createdExam.length,
      duplicates_removed: duplicatesRemoved + (resources.length - newResources.length),
      boards_total: boards.length,
      resources_total: resources.length,
      exam_series_total: examSeries.length,
      existing_preserved: { boards: existingBoards.length, resources: existingResources.length, exam_series: existingExam.length },
      boards_requiring_subboard: boardsRequiringSubboard,
      subjects_without_verified_supplementary: subjectsWithoutSupplementary,
      copyright_restricted_not_copied: ["AQA copyrighted examination materials", "Cambridge copyrighted past papers (linked only, not ingested)"],
      url_checks: urlChecks,
      files_modified: ["base44/entities/Board.jsonc", "base44/entities/BoardResource.jsonc", "base44/entities/ExamSeries.jsonc", "base44/shared/boardRegistryTransform.js", "base44/functions/importBoardRegistry/entry.ts", "src/lib/resourceMeta.js", "src/components/resources/ResourceCard.jsx", "src/pages/Resources.jsx"],
    });
  } catch {
    return Response.json({ error: "Could not import the board registry. Please try again.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}