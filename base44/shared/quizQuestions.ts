// Shared strict validation for AI-generated MCQs.
// Malformed model output is rejected; StudyOS never pads questions, invents
// options, silently changes invalid correct answers, or creates fallback text.

export const quizQuestionsSchema = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      minItems: 1,
      maxItems: 15,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          prompt: { type: "string", minLength: 1, maxLength: 1000 },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string", minLength: 1, maxLength: 500 }
          },
          correct_index: { type: "integer", minimum: 0, maximum: 3 },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
          explanation: { type: "string", minLength: 1, maxLength: 1200 },
          concept_name: { type: "string", minLength: 1, maxLength: 160 }
        },
        required: ["prompt", "options", "correct_index", "explanation", "concept_name"]
      }
    }
  },
  required: ["questions"],
  additionalProperties: false
};

function cleanString(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function validateQuestions(rawQuestions, expectedCount) {
  if (!Array.isArray(rawQuestions)) {
    return { ok: false, error: "AI returned no question set." };
  }
  if (rawQuestions.length !== expectedCount) {
    return { ok: false, error: "AI returned an incomplete question set. Please try again." };
  }

  const questions = [];
  for (const raw of rawQuestions) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "AI returned a malformed question." };
    }
    const prompt = cleanString(raw.prompt, 1000);
    const explanation = cleanString(raw.explanation, 1200);
    const concept_name = cleanString(raw.concept_name, 160);
    const options = Array.isArray(raw.options)
      ? raw.options.map((option) => cleanString(option, 500))
      : [];
    const correct = raw.correct_index;
    const difficulty = raw.difficulty;

    if (!prompt || !explanation || !concept_name || options.length !== 4 ||
        options.some((option) => !option) ||
        !Number.isInteger(correct) || correct < 0 || correct > 3 ||
        !["easy", "medium", "hard"].includes(difficulty)) {
      return { ok: false, error: "AI returned a malformed question set. Please try again." };
    }

    const optionKeys = options.map((o) => o.toLowerCase());
    if (new Set(optionKeys).size !== 4) {
      return { ok: false, error: "AI returned duplicate answer choices. Please try again." };
    }

    questions.push({
      prompt,
      options,
      correct_index: correct,
      difficulty,
      explanation,
      concept_name,
    });
  }

  return { ok: true, questions };
}

// Legacy name retained so other imports do not silently break.
export function sanitizeQuestions(rawQuestions, expectedCount) {
  const result = validateQuestions(rawQuestions, expectedCount);
  return result.ok ? result.questions : [];
}
