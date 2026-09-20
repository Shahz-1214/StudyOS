// Central registry of the 10 StudyOS modules. Used by navigation, dashboard
// tool cards, and the honest "not yet implemented" status page.
// status: "functional" | "coming_soon"
// accent: restrained per-tool identity color (icon chip / small accents only)
// short: one-line purpose used on dashboard tool cards

export const FEATURES = [
  { id: "studylens", title: "StudyLens", group: "study", stage: 3, status: "functional", icon: "ScanLine", accent: "#4D8DFF",
    short: "Turn a difficult question into a clear solution.",
    desc: "Capture a problem by photo or paste it in. Get structured extraction, concept detection, and a guided learning path — not just an answer dump." },
  { id: "homework", title: "Homework Coach", group: "study", stage: 3, status: "functional", icon: "GraduationCap", accent: "#9B82F3",
    short: "Work through problems step by step.",
    desc: "Guided hints and checkpoints that teach the concept. The full solution is never shown by default — you do the thinking." },
  { id: "note-quiz", title: "Note → Quiz", group: "study", stage: 3, status: "functional", icon: "FileText", accent: "#42D392",
    short: "Turn your notes into practice questions.",
    desc: "Turn notes into validated practice questions (MCQ, True/False, short answer), then let StudyOS learn what you keep missing." },
  { id: "lecture", title: "LectureMind", group: "study", stage: 5, status: "functional", icon: "Headphones", accent: "#E779A8",
    short: "Turn lectures into structured study material.",
    desc: "Upload a lecture → transcript, key-point chunks, summary, concepts, flashcards, and a Q&A over the source." },
  { id: "essay", title: "EssayCheck", group: "study", stage: 5, status: "functional", icon: "PenLine", accent: "#F2B84B",
    short: "Feedback on structure and argument that keeps your voice yours.",
    desc: "Grammar, structure, argument, and readability analysis with targeted feedback. Your voice stays yours — no auto-rewrite." },

  { id: "exampilot", title: "ExamPilot", group: "plan", stage: 4, status: "functional", icon: "CalendarClock", accent: "#4D8DFF",
    short: "Build a study plan around your real exams.",
    desc: "Build adaptive exams that target your weakest concepts, and generate a day-by-day revision plan around the time you actually have." },
  { id: "weakness", title: "Weakness AI", group: "plan", stage: 4, status: "functional", icon: "AlertCircle", accent: "#EF6B73",
    short: "Find the topics costing you marks.",
    desc: "An AI diagnostic over your mastery data — surfaces hidden weaknesses, priority order, and targeted recommendations." },
  { id: "tasks", title: "Tasks", group: "plan", stage: 6, status: "functional", icon: "CheckSquare", accent: "#42D392",
    short: "One list linking deadlines, blocks, and quizzes.",
    desc: "One canonical task layer linking deadlines, study blocks, quizzes, and progress across every module." },
  { id: "studysync", title: "StudySync", group: "plan", stage: 6, status: "functional", icon: "RefreshCw", accent: "#42D392",
    short: "Turns your activity into the right tasks.",
    desc: "The connection layer — every quiz, weakness, and exam event becomes the right task or plan update." },
  { id: "focus", title: "FocusStudy", group: "plan", stage: 4, status: "functional", icon: "Timer", accent: "#F2B84B",
    short: "Deep focus sessions that feed your mastery.",
    desc: "A real study timer with confidence checks before and after. Results feed straight back into your mastery." },
];

export const FEATURE_MAP = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

export const STUDY_FEATURES = FEATURES.filter((f) => f.group === "study");
export const PLAN_FEATURES = FEATURES.filter((f) => f.group === "plan");