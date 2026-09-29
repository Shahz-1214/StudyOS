import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// StudySync — the connection layer. Reads recent quiz attempts + events,
// recommends tasks (review weak concepts, follow up exams/lectures), dedupes
// against existing open tasks, and bulk-creates the new ones. Returns a
// summary of what was created and from which sources.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const [attempts, events, existingTasks, concepts] = await Promise.all([
      base44.entities.QuizAttempt.list("-completed_at", 20),
      base44.entities.Event.list("-occurred_at", 30),
      base44.entities.Task.list("-created_date", 100),
      base44.entities.Concept.list("-updated_date", 200),
    ]) as any[];

    const concept = (id) => concepts.find((c) => c.id === id);
    const openKeys = new Set(
      existingTasks.filter((t) => t.status !== "done").map((t) => `${t.type}|${t.concept_id || ""}|${t.title}`)
    );
    const recommended = [];
    const add = (t) => {
      const key = `${t.type}|${t.concept_id || ""}|${t.title}`;
      if (openKeys.has(key)) return false;
      openKeys.add(key);
      recommended.push({ ...t, source: "studysync", status: "todo" });
      return true;
    };

    // 1. Low-accuracy quiz concepts → high-priority review tasks.
    const acc: Record<string, { correct: number; total: number }> = {};
    for (const a of attempts) {
      for (const ans of a.answers || []) {
        if (!ans.concept_id) continue;
        acc[ans.concept_id] = acc[ans.concept_id] || { correct: 0, total: 0 };
        acc[ans.concept_id].total++;
        if (ans.correct) acc[ans.concept_id].correct++;
      }
    }
    let weakCount = 0;
    for (const [cid, s] of Object.entries(acc)) {
      const ratio = s.total ? s.correct / s.total : 0;
      if (ratio < 0.6) {
        const c = concept(cid);
        if (add({
          title: `Review ${c?.name || "weak concept"}`,
          description: `Accuracy ${(ratio * 100).toFixed(0)}% on recent quizzes — review and re-practice.`,
          type: "review", concept_id: cid, subject_id: c?.subject_id || "", priority: "high",
        })) weakCount++;
      }
    }

    // 2. Recent exam events → schedule study blocks.
    const examCount = events.filter((e) => e.event_name === "exam_created").length;
    if (examCount > 0) {
      add({
        title: "Start adaptive exam plan",
        description: "An adaptive exam was generated — schedule study blocks for your weakest concepts.",
        type: "study_block", priority: "medium",
      });
    }

    // 3. Recent lecture events → flashcard review.
    const lectureCount = events.filter((e) => e.event_name === "lecture_processed").length;
    if (lectureCount > 0) {
      add({
        title: "Review lecture flashcards",
        description: "A lecture was processed — review the generated flashcards while it's fresh.",
        type: "review", priority: "medium",
      });
    }

    let created = [];
    if (recommended.length) {
      created = await base44.entities.Task.bulkCreate(recommended);
    }
    await base44.entities.Event.create({
      event_name: "studysync_run",
      properties: { created: created.length, weak_concepts: weakCount, exams: examCount, lectures: lectureCount },
      occurred_at: new Date().toISOString(),
    });

    return Response.json({
      created: created.length,
      tasks: created,
      sources: { weak_concepts: weakCount, exams: examCount, lectures: lectureCount },
    });
  } catch {
    return Response.json({ error: "Could not refresh StudySync right now. Please try again.", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}