import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import StudyPanel from "@/components/StudyPanel";
import {
  ScanLine, GraduationCap, FileText, Headphones, PenLine, CalendarClock,
  AlertCircle, CheckSquare, RefreshCw, Timer, Brain, TrendingUp, Layers,
  Archive, BookOpen, HelpCircle, Lightbulb, Repeat, ChevronLeft,
} from "lucide-react";

const STUDY_MODULES = [
  { id: "studylens", icon: ScanLine, title: "StudyLens", to: "/tool/studylens",
    desc: "Capture a problem by photo or paste it in. You get structured extraction, detected concepts, and a guided learning path — not an answer dump." },
  { id: "homework", icon: GraduationCap, title: "Homework Coach", to: "/tool/homework",
    desc: "Guided hints and checkpoints that teach the concept. The full solution is never shown by default — you do the thinking." },
  { id: "note-quiz", icon: FileText, title: "Note → Quiz", to: "/tool/note-quiz",
    desc: "Turn notes into validated practice questions, then let StudyOS learn what you keep missing." },
  { id: "lecture", icon: Headphones, title: "LectureMind", to: "/tool/lecture",
    desc: "Upload a lecture to get a transcript, key-point chunks, summary, concepts, flashcards, and Q&A over the source." },
  { id: "essay", icon: PenLine, title: "EssayCheck", to: "/tool/essay",
    desc: "Grammar, structure, argument, and readability analysis with targeted feedback. Your voice stays yours — no auto-rewrite." },
];

const PLAN_MODULES = [
  { id: "exampilot", icon: CalendarClock, title: "ExamPilot", to: "/tool/exampilot",
    desc: "Build adaptive exams that target your weakest concepts, and generate a day-by-day revision plan around the time you actually have." },
  { id: "weakness", icon: AlertCircle, title: "Weakness AI", to: "/tool/weakness",
    desc: "An AI diagnostic over your mastery data — surfaces hidden weaknesses, priority order, and targeted recommendations." },
  { id: "tasks", icon: CheckSquare, title: "Tasks", to: "/tool/tasks",
    desc: "One canonical task layer linking deadlines, study blocks, quizzes, and progress across every module." },
  { id: "studysync", icon: RefreshCw, title: "StudySync", to: "/tool/studysync",
    desc: "The connection layer — every quiz, weakness, and exam event becomes the right task or plan update." },
  { id: "focus", icon: Timer, title: "FocusStudy", to: "/tool/focus",
    desc: "A real study timer with confidence checks before and after. Results feed straight back into your mastery." },
];

const OTHER_PAGES = [
  { icon: Brain, title: "Practice", to: "/practice", desc: "Answer short quizzes; StudyOS scores them and updates concept mastery." },
  { icon: TrendingUp, title: "Progress", to: "/progress", desc: "Overall mastery, accuracy trends, and granular concept status." },
  { icon: Layers, title: "Subject Hub", to: "/subject-hub", desc: "Concepts, notes, and exam materials for each of your subjects." },
  { icon: Archive, title: "Exam Vault", to: "/exam-vault", desc: "Your personal library of saved past papers, organised by subject." },
  { icon: FileText, title: "Past Papers", to: "/past-papers", desc: "Browse official and supplementary past papers for your board." },
  { icon: CalendarClock, title: "Exam Dates", to: "/exam-dates", desc: "Verified exam series windows for your board." },
];

const TIPS = [
  "Follow the mastery loop: Practice → mastery updates → Weakness AI → ExamPilot plan → FocusStudy → retest. Each step feeds the next.",
  "Add concepts that match your real syllabus in Profile. Mastery is tracked per concept, so precise concepts give precise diagnostics.",
  "Use Homework Coach's hint levels in order — levels 1–3 teach the approach; only level 4 reveals the full solution.",
  "Save past papers to the Exam Vault and assign a subject so your library stays organised as exams approach.",
  "Note → Quiz works best on focused notes; keep each batch to one topic for cleaner concept tagging.",
  "FocusStudy's before/after confidence check is what updates mastery — answer honestly for accurate tracking.",
];

function ModuleCard({ icon: Icon, title, desc, to }) {
  return (
    <Link to={to} className="study-panel p-4 block hover:opacity-90 transition-opacity">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
      </div>
      <p className="text-[12px] text-muted-foreground leading-relaxed">{desc}</p>
    </Link>
  );
}

export default function HelpCenter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-4">
        <Link to="/profile" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Profile
        </Link>
      </div>
      <div className="mb-6">
        <div className="eyebrow">Support</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" /> Help Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Documentation and quick tips for getting the most out of StudyOS.</p>
      </div>

      {/* Mastery loop */}
      <StudyPanel className="p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Repeat className="w-4 h-4 text-primary" />
          <h2 className="text-[15px] font-bold text-foreground">The mastery loop</h2>
        </div>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          StudyOS is built around one loop: practice updates your concept mastery, diagnostics find what's weak,
          ExamPilot plans revision around your time, and FocusStudy turns that plan into tracked study sessions.
          Everything connects — a quiz you take today shapes the plan you get tomorrow.
        </p>
      </StudyPanel>

      {/* Study modules */}
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">Study modules</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {STUDY_MODULES.map((m) => <ModuleCard key={m.id} {...m} />)}
      </div>

      {/* Plan modules */}
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">Plan modules</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {PLAN_MODULES.map((m) => <ModuleCard key={m.id} {...m} />)}
      </div>

      {/* Other pages */}
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">Other pages</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {OTHER_PAGES.map((m, i) => <ModuleCard key={i} {...m} />)}
      </div>

      {/* Quick tips */}
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h2 className="text-[15px] font-bold text-foreground">Quick tips</h2>
      </div>
      <StudyPanel className="p-5">
        <ul className="space-y-2.5">
          {TIPS.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] text-foreground leading-relaxed">
              <span className="text-primary font-bold shrink-0">{i + 1}.</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </StudyPanel>
    </div>
  );
}