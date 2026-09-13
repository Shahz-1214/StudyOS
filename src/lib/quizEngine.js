import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { applyQuizResult, difficultyWeight, computeConceptStatus } from "@/lib/learnerState";

// Shared quiz-completion logic used by Practice (demo quizzes) and Note → Quiz
// (AI quizzes). Scores the attempt, persists a QuizAttempt, updates concept
// mastery through the canonical formula, and fires analytics. Returns
// { score, total, accuracy, updates }.
export async function completeQuiz(quiz, answers, concepts) {
  const stats = {};
  quiz.questions.forEach((q, i) => {
    const sel = answers[i]?.selected_index;
    const correct = sel === q.correct_index;
    const key = q.concept_id || `__none_${i}`;
    if (!stats[key]) stats[key] = { concept_id: q.concept_id, correct: 0, total: 0, diffSum: 0 };
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
  const updates = applyQuizResult(statArr, concepts).filter(
    (u) => u.concept_id && concepts.find((c) => c.id === u.concept_id)
  );

  const score = quiz.questions.filter((q, i) => answers[i]?.selected_index === q.correct_index).length;
  const total = quiz.questions.length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const answerRecords = quiz.questions.map((q, i) => ({
    question_index: i,
    concept_id: q.concept_id || "",
    selected_index: answers[i]?.selected_index ?? -1,
    correct: answers[i]?.selected_index === q.correct_index,
    difficulty: q.difficulty,
  }));

  await base44.entities.QuizAttempt.create({
    quiz_id: quiz.id,
    subject_id: quiz.subject_id,
    score, total, accuracy,
    answers: answerRecords,
    completed_at: new Date().toISOString(),
  });

  if (updates.length) {
    const now = new Date().toISOString();
    await base44.entities.Concept.bulkUpdate(
      updates.map((u) => ({
        id: u.concept_id,
        mastery: u.newMastery,
        status: computeConceptStatus(u.newMastery),
        last_practiced: now,
      }))
    );
  }

  track(EVENTS.QUIZ_COMPLETED, { quiz_id: quiz.id, score, total, accuracy, source: quiz.source });
  answerRecords.forEach((a) =>
    track(a.correct ? EVENTS.QUESTION_CORRECT : EVENTS.QUESTION_INCORRECT, { concept_id: a.concept_id })
  );
  if (updates.length) track(EVENTS.WEAKNESS_UPDATED, { concepts_updated: updates.length });

  return { score, total, accuracy, updates };
}