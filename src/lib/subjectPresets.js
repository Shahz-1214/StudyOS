// Seed library used during onboarding. This is real, deterministic starter
// data owned by the user — NOT fake traction. It gives a new account a
// concrete subject/concept graph to begin practicing against.

export const SUBJECT_PRESETS = [
  { name: "Mathematics", color: "#3B82F6", concepts: ["Algebra", "Functions", "Trigonometry", "Calculus", "Probability"] },
  { name: "Physics", color: "#8B5CF6", concepts: ["Mechanics", "Momentum", "Waves", "Electricity", "Optics"] },
  { name: "Chemistry", color: "#10B981", concepts: ["Atomic Structure", "Bonding", "Stoichiometry", "Organic", "Equilibrium"] },
  { name: "Biology", color: "#F59E0B", concepts: ["Cells", "Genetics", "Evolution", "Physiology", "Ecology"] },
  { name: "Computer Science", color: "#EC4899", concepts: ["Programming", "Data Structures", "Algorithms", "Recursion", "Complexity"] },
  { name: "English", color: "#6366F1", concepts: ["Essay Writing", "Comprehension", "Grammar", "Literature", "Rhetoric"] },
];

export const EDUCATION_LEVELS = [
  { value: "secondary", label: "Secondary school" },
  { value: "high_school", label: "High school / A-level" },
  { value: "undergraduate", label: "Undergraduate" },
  { value: "postgraduate", label: "Postgraduate" },
  { value: "self_learner", label: "Self-learner" },
];

export const GOAL_PRESETS = [
  "Pass my next exam",
  "Improve my grades",
  "Master a specific subject",
  "Build consistent study habits",
  "Prepare for university entrance",
];

export const STUDY_TIME_OPTIONS = [30, 45, 60, 90, 120, 180];