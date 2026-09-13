// Deterministic demo question generator (Stage 2). Produces real, answerable
// MCQs from a built-in glossary for the preset concepts, and a clearly-labelled
// placeholder for custom concepts. Stage 3 (Note → Quiz) replaces this with
// AI-generated questions via the QuizGenerationService — same engine, real content.

const GLOSSARY = {
  // Mathematics
  "Algebra": "The study of symbols and the rules for manipulating them to solve equations.",
  "Functions": "A relation that assigns each input exactly one output.",
  "Trigonometry": "The study of relationships between side lengths and angles of triangles.",
  "Calculus": "The mathematical study of continuous change using derivatives and integrals.",
  "Probability": "The measure of how likely an event is to occur, expressed from 0 to 1.",
  // Physics
  "Mechanics": "The study of motion, forces, and the laws governing physical objects.",
  "Momentum": "The quantity of motion, equal to mass times velocity.",
  "Waves": "Disturbances that transfer energy through space or a medium without transferring matter.",
  "Electricity": "The flow of electric charge through a conductor.",
  "Optics": "The study of light's behavior, including reflection, refraction, and lenses.",
  // Chemistry
  "Atomic Structure": "The arrangement of protons, neutrons, and electrons within an atom.",
  "Bonding": "The attraction between atoms that forms chemical compounds.",
  "Stoichiometry": "The calculation of reactants and products in chemical reactions.",
  "Organic": "The chemistry of carbon-containing compounds.",
  "Equilibrium": "The state where forward and reverse reaction rates are equal.",
  // Biology
  "Cells": "The basic structural and functional unit of all living organisms.",
  "Genetics": "The study of heredity and the variation of inherited traits.",
  "Evolution": "The change in heritable traits of populations over generations.",
  "Physiology": "The study of how living systems and their parts function.",
  "Ecology": "The study of relationships between organisms and their environment.",
  // Computer Science
  "Programming": "The process of writing instructions for a computer to execute.",
  "Data Structures": "Organized formats for storing and accessing data efficiently.",
  "Algorithms": "Step-by-step procedures for solving problems or performing tasks.",
  "Recursion": "A method where a function calls itself to solve smaller subproblems.",
  "Complexity": "The analysis of an algorithm's time and space requirements as input grows.",
  // English
  "Essay Writing": "Structured prose that develops a thesis with supporting evidence.",
  "Comprehension": "The ability to understand and interpret written text.",
  "Grammar": "The rules governing how words are structured into sentences.",
  "Literature": "Written works valued for artistic and intellectual content.",
  "Rhetoric": "The art of effective or persuasive speaking and writing.",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultyFor(concept) {
  const imp = concept.importance || 0.5;
  if (imp >= 0.7) return "hard";
  if (imp >= 0.4) return "medium";
  return "easy";
}

// Build one question for a concept. `pool` = other concepts (for distractors).
function buildQuestion(concept, pool, type) {
  const def = GLOSSARY[concept.name];
  const difficulty = difficultyFor(concept);

  if (def) {
    // Real glossary-backed question.
    const distractorDefs = shuffle(pool.filter((c) => c.id !== concept.id && GLOSSARY[c.name]))
      .slice(0, 3)
      .map((c) => GLOSSARY[c.name]);
    // Backfill from the global glossary if the subject is thin.
    while (distractorDefs.length < 3) {
      const extras = shuffle(Object.entries(GLOSSARY).filter(([n, d]) => d !== def && !distractorDefs.includes(d)));
      if (!extras.length) break;
      distractorDefs.push(extras[0][1]);
    }
    if (type === "name") {
      // "Which concept is defined as: '...'"
      const distractorNames = shuffle(pool.filter((c) => c.id !== concept.id)).slice(0, 3).map((c) => c.name);
      while (distractorNames.length < 3) {
        const extras = shuffle(Object.keys(GLOSSARY).filter((n) => n !== concept.name && !distractorNames.includes(n)));
        if (!extras.length) break;
        distractorNames.push(extras[0]);
      }
      const options = shuffle([concept.name, ...distractorNames]);
      return {
        concept_id: concept.id,
        prompt: `Which concept is defined as: "${def}"`,
        options,
        correct_index: options.indexOf(concept.name),
        difficulty,
        explanation: `${concept.name}: ${def}`,
      };
    }
    const options = shuffle([def, ...distractorDefs]);
    return {
      concept_id: concept.id,
      prompt: `Which statement best describes "${concept.name}"?`,
      options,
      correct_index: options.indexOf(def),
      difficulty,
      explanation: `${concept.name}: ${def}`,
    };
  }

  // Custom concept without a glossary entry — clearly-labelled placeholder.
  const distractorNames = shuffle(pool.filter((c) => c.id !== concept.id)).slice(0, 3).map((c) => c.name);
  while (distractorNames.length < 3) {
    const extras = shuffle(Object.keys(GLOSSARY).filter((n) => n !== concept.name && !distractorNames.includes(n)));
    if (!extras.length) break;
    distractorNames.push(extras[0]);
  }
  const options = shuffle([concept.name, ...distractorNames]);
  return {
    concept_id: concept.id,
    prompt: `Demo question for "${concept.name}" — real AI questions arrive with Note → Quiz (Stage 3). Which option is this concept?`,
    options,
    correct_index: options.indexOf(concept.name),
    difficulty,
    explanation: `Placeholder for "${concept.name}". Add notes to generate real questions in Stage 3.`,
  };
}

// Generate a quiz from a set of concepts. `pool` provides distractors (use the
// same subject's concepts, or all concepts for a mixed quiz).
export function generateQuiz(concepts, pool, title, count = 5) {
  const picked = shuffle(concepts).slice(0, count);
  const questions = picked.map((c, i) => buildQuestion(c, pool, i % 2 === 0 ? "def" : "name"));
  return {
    subject_id: "mixed",
    title,
    concept_ids: picked.map((c) => c.id),
    questions,
    source: "demo",
  };
}