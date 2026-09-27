import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { applyQuizResult, difficultyWeight, computeConceptStatus } from "@/lib/learnerState";

// Quiz completion is idempotent per quiz instance. The attempt stores the
// calculated mastery targets before applying them. Each Concept records the
// completion id, so a retry can safely finish a partial update without
// applying the mastery formula twice.
export async function completeQuiz(quiz, answers, concepts) {
  if (!quiz?.id || !Array.isArray(quiz.questions) || !quiz.questions.length) {
    throw new Error("Invalid quiz");
  }
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
    throw new Error("Incomplete quiz answers");
  }

  const completionId = "quiz:" + quiz.id;
  const existingRows = await base44.entities.QuizAttempt.filter({ completion_id: completionId }, "-created_date", 1);
  const existing = existingRows?.[0] || null;

  if (existing?.mastery_applied) {
    return {
      score: existing.score || 0,
      total: existing.total || quiz.questions.length,
      accuracy: existing.accuracy || 0,
      updates: Array.isArray(existing.mastery_updates) ? existing.mastery_updates : [],
      idempotent: true,
    };
  }

  const stats = {};
  quiz.questions.forEach((q, i) => {
    const sel = answers[i]?.selected_index;
    const correct = sel === q.correct_index;
    const key = q.concept_id || "__none_" + i;
    if (!stats[key]) {
      stats[key] = { concept_id: q.concept_id, correct: 0, total: 0, diffSum: 0 };
    }
    stats[key].total++;
    if (correct) stats[key].correct++;
    stats[key].diffSum += difficultyWeight(q.difficulty);
  });

  const statArr = Object.values(stats).map((v) => ({
    concept_id: v.concept_id,
    correct: v.correct,
    total: v.total,
    difficultyWeight: v.diffSum / v.total,
  }));

  const calculatedUpdates = applyQuizResult(statArr, concepts).filter(
    (u) => u.concept_id && concepts.find((c) => c.id === u.concept_id)
  );

  const score = quiz.questions.filter((q, i) => answers[i]?.selected_index === q.correct_index).length;
  const total = quiz.questions.length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const answerRecords = quiz.questions.map((q, i) => ({
    question_index: i,
    concept_id: q.concept_id || "",
    selected_index: Number.isInteger(answers[i]?.selected_index) ? answers[i].selected_index : -1,
    correct: answers[i]?.selected_index === q.correct_index,
    difficulty: q.difficulty,
  }));

  let attempt = existing;
  if (!attempt) {
    attempt = await base44.entities.QuizAttempt.create({
      quiz_id: quiz.id,
      subject_id: quiz.subject_id,
      score,
      total,
      accuracy,
      answers: answerRecords,
      completed_at: new Date().toISOString(),
      completion_id: completionId,
      mastery_applied: false,
      mastery_updates: calculatedUpdates.map((u) => ({
        concept_id: u.concept_id,
        prevMastery: u.prevMastery,
        newMastery: u.newMastery,
      })),
    });
  }

  const savedUpdates = Array.isArray(attempt.mastery_updates) && attempt.mastery_updates.length
    ? attempt.mastery_updates
    : calculatedUpdates.map((u) => ({
        concept_id: u.concept_id,
        prevMastery: u.prevMastery,
        newMastery: u.newMastery,
      }));

  // Conditional updateMany is used per concept so a retry skips concepts that
  // already received this exact completion id.
  await Promise.all(
    savedUpdates.map(async (u) => {
      if (!u?.concept_id) return;
      await base44.entities.Concept.updateMany(
        { id: u.concept_id, last_quiz_attempt_id: { $ne: completionId } },
        {
          $set: {
            mastery: Math.max(0, Math.min(100, Number(u.newMastery) || 0)),
            status: computeConceptStatus(Number(u.newMastery) || 0),
            last_practiced: new Date().toISOString(),
            last_quiz_attempt_id: completionId,
          },
        }
      );
    })
  );

  await base44.entities.QuizAttempt.update(attempt.id, {
    mastery_applied: true,
    mastery_updates: savedUpdates,
    completion_id: completionId,
  });

  if (!existing) {
    track(EVENTS.QUIZ_COMPLETED, {
      quiz_id: quiz.id,
      score,
      total,
      accuracy,
      source: quiz.source,
      completion_id: completionId,
    });
    answerRecords.forEach((a) =>
      track(a.correct ? EVENTS.QUESTION_CORRECT : EVENTS.QUESTION_INCORRECT, {
        concept_id: a.concept_id,
        completion_id: completionId,
      })
    );
    if (savedUpdates.length) track(EVENTS.WEAKNESS_UPDATED, { concepts_updated: savedUpdates.length, completion_id: completionId });
  }

  return { score, total, accuracy, updates: savedUpdates, idempotent: false };
}
