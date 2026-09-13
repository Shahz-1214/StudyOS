// Central registry of the 10 StudyOS modules. Used by navigation, dashboard
// quick-actions, and the honest "not yet implemented" status page.
// status: "functional" | "coming_soon"

export const FEATURES = [
  { id: "studylens", title: "StudyLens", group: "study", stage: 3, status: "functional", icon: "ScanLine",
    desc: "Capture a problem by photo or paste it in. Get structured extraction, concept detection, and a guided learning path — not just an answer dump." },
  { id: "homework", title: "Homework Coach", group: "study", stage: 3, status: "functional", icon: "GraduationCap",
    desc: "Guided hints and checkpoints that teach the concept. The full solution is never shown by default — you do the thinking." },
  { id: "note-quiz", title: "Note → Quiz", group: "study", stage: 3, status: "functional", icon: "FileText",
    desc: "Turn notes into validated practice questions (MCQ, True/False, short answer), then let StudyOS learn what you keep missing." },
  { id: "lecture", title: "LectureMind", group: "study", stage: 5, status: "coming_soon", icon: "Headphones",
    desc: "Transcripts → timestamped chunks, summaries, key concepts, flashcards, and exam questions. Ask the lecture and jump back to the source." },
  { id: "essay", title: "EssayCheck", group: "study", stage: 5, status: "coming_soon", icon: "PenLine",
    desc: "Grammar, structure, argument, and readability analysis with targeted feedback. Your voice stays yours — no auto-rewrite." },

  { id: "exampilot", title: "ExamPilot", group: "plan", stage: 4, status: "coming_soon", icon: "CalendarClock",
    desc: "A deterministic scheduler that builds a revision plan around exam dates, mastery, and the time you actually have." },
  { id: "tasks", title: "Tasks", group: "plan", stage: 4, status: "coming_soon", icon: "CheckSquare",
    desc: "One canonical task layer linking deadlines, study blocks, quizzes, and progress across every module." },
  { id: "studysync", title: "StudySync", group: "plan", stage: 4, status: "coming_soon", icon: "RefreshCw",
    desc: "The connection layer — every quiz, weakness, and exam event becomes the right task or plan update." },
  { id: "focus", title: "FocusStudy", group: "plan", stage: 4, status: "coming_soon", icon: "Timer",
    desc: "A real study timer with confidence checks before and after. Results feed straight back into your mastery." },
];

export const FEATURE_MAP = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

export const STUDY_FEATURES = FEATURES.filter((f) => f.group === "study");
export const PLAN_FEATURES = FEATURES.filter((f) => f.group === "plan");