import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const EXPORTS = [
  ["LearnerProfile", 20],
  ["Subject", 200],
  ["Concept", 1000],
  ["Task", 1000],
  ["StudyPlan", 200],
  ["Essay", 200],
  ["Lecture", 200],
  ["FocusSession", 1000],
  ["LearnerExam", 100],
  ["SavedPaper", 500],
  ["Quiz", 500],
  ["QuizAttempt", 1000],
  ["Event", 5000],
  ["SubscriptionState", 20],
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });

    const result = {};
    for (const [entityName, limit] of EXPORTS) {
      try {
        const records = await base44.entities[entityName].list("-created_date", limit);
        result[entityName] = Array.isArray(records) ? records : [];
      } catch {
        result[entityName] = [];
      }
    }

    return Response.json({
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email || "",
        full_name: user.full_name || "",
      },
      data: result,
      notes: [
        "Media bytes are not embedded in this JSON export.",
        "Security scanner internals are not exported.",
        "Board and public resource registries are not personal records and are not included.",
      ],
    });
  } catch {
    return Response.json({ error: "Could not export your StudyOS data. Please try again.", code: "EXPORT_FAILED" }, { status: 500 });
  }
}
