// Deterministic learner-state engine. No LLM. This is the single canonical
// source of concept mastery — every feature reads and updates through here.
// Full weighted formula arrives in Stage 2 (Weakness AI); the helpers below
// are the foundation all stages share.

export const STATUS_LABELS = {
  critical_weakness: "Critical Weakness",
  weak: "Weak",
  developing: "Developing",
  strong: "Strong",
  mastered: "Mastered",
};

export const STATUS_ORDER = ["critical_weakness", "weak", "developing", "strong", "mastered"];

export function statusColor(status) {
  switch (status) {
    case "critical_weakness":
      return "#EF4444";
    case "weak":
      return "#F59E0B";
    case "developing":
      return "#3B82F6";
    case "strong":
      return "#10B981";
    case "mastered":
      return "#059669";
    default:
      return "#64748B";
  }
}

export function computeConceptStatus(mastery) {
  if (mastery == null || isNaN(mastery)) return "developing";
  if (mastery < 35) return "critical_weakness";
  if (mastery < 55) return "weak";
  if (mastery < 75) return "developing";
  if (mastery < 90) return "strong";
  return "mastered";
}

// Subject mastery = mean of its concepts' mastery (0 when no concepts yet).
export function computeSubjectMastery(concepts, subjectId) {
  const subset = concepts.filter((c) => c.subject_id === subjectId);
  if (!subset.length) return 0;
  return Math.round(subset.reduce((s, c) => s + (c.mastery || 0), 0) / subset.length);
}

// "What should I study next?" — lowest mastery weighted up by importance.
// Works even before any attempts (picks the most important concept to begin).
export function recommendNextConcept(concepts, subjects) {
  if (!concepts || !concepts.length) return null;
  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "";
  return [...concepts]
    .map((c) => ({ ...c, _score: (c.mastery || 0) - (c.importance || 0.5) * 100, subject_name: subjectName(c.subject_id) }))
    .sort((a, b) => a._score - b._score)[0];
}

// The canonical mastery formula. Deterministic. Shared by every feature.
// mastery = 45% recent + 20% historical + 20% difficulty + 15% confidence
export function computeMastery({ recentAccuracy, historicalAccuracy, difficultyPerformance, confidence }) {
  const r = num(recentAccuracy);
  const h = num(historicalAccuracy);
  const d = num(difficultyPerformance);
  const c = num(confidence);
  return clamp(Math.round(0.45 * r + 0.2 * h + 0.2 * d + 0.15 * c), 0, 100);
}

// Exponential smoothing so one question can't swing a score wildly.
export function smoothMastery(prevMastery, newMastery, alpha = 0.35) {
  const p = num(prevMastery);
  const n = num(newMastery);
  return clamp(Math.round((1 - alpha) * p + alpha * n), 0, 100);
}

// Difficulty weight for the mastery formula's difficultyPerformance term.
// Hard questions reward mastery more; easy questions reward it less.
export function difficultyWeight(difficulty) {
  if (difficulty === "hard") return 1;
  if (difficulty === "medium") return 0.7;
  return 0.4;
}

// Apply a completed quiz attempt to concept mastery through the canonical
// formula + exponential smoothing. `conceptStats` = [{ concept_id, correct,
// total, difficultyWeight }] per concept tested. `concepts` = current concept
// records (to read previous mastery). Returns [{ concept_id, prevMastery,
// newMastery }] for every concept in the attempt.
export function applyQuizResult(conceptStats, concepts) {
  return conceptStats.map((cs) => {
    const prev = concepts.find((c) => c.id === cs.concept_id);
    const prevMastery = prev?.mastery || 0;
    const recentAccuracy = cs.total ? (cs.correct / cs.total) * 100 : 0;
    const historicalAccuracy = prevMastery;
    const difficultyPerformance = Math.min(100, recentAccuracy * (cs.difficultyWeight || 1));
    const confidence = recentAccuracy; // proxy until FocusStudy confidence checks (Stage 4)
    const raw = computeMastery({ recentAccuracy, historicalAccuracy, difficultyPerformance, confidence });
    const newMastery = smoothMastery(prevMastery, raw, 0.4);
    return { concept_id: cs.concept_id, prevMastery, newMastery };
  });
}

function num(x) {
  return typeof x === "number" && !isNaN(x) ? x : 0;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}