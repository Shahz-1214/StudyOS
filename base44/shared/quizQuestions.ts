// Shared question-generation helpers for the AI quiz/exam backend functions.
// Plain module — no Deno.serve. Imported by generateQuizFromNotes and
// generateAdaptiveExam so validation logic lives in one place.

export const quizQuestionsSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          correct_index: { type: "number" },
          difficulty: { type: "string" },
          explanation: { type: "string" },
          concept_name: { type: "string" }
        },
        required: ["prompt", "options", "correct_index", "explanation"]
      }
    }
  },
  required: ["questions"]
};

// Sanitize raw LLM output into valid, bounded MCQ questions.
export function sanitizeQuestions(rawQuestions) {
  return (rawQuestions || []).map((q, i) => {
    const options = (q.options || []).slice(0, 4);
    while (options.length < 4) options.push(`Option ${options.length + 1}`);
    let correct = Number(q.correct_index);
    if (isNaN(correct) || correct < 0 || correct > 3) correct = 0;
    return {
      prompt: q.prompt || `Question ${i + 1}`,
      options,
      correct_index: correct,
      difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
      explanation: q.explanation || "",
      concept_name: q.concept_name || ""
    };
  }).filter((q) => q.prompt && q.options.length === 4);
}