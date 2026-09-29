import { useEffect, useMemo, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { track, EVENTS } from "@/lib/analytics";
import {
  computeSubjectMastery, recommendNextConcept,
} from "@/lib/learnerState";
import { FEATURES } from "@/lib/features";
import { subjectIcon } from "@/lib/subjectVisuals";
import StudyPanel from "@/components/StudyPanel";
import GlobalSearch from "@/components/GlobalSearch";
import MasteryBar from "@/components/MasteryBar";
import ExamCountdown from "@/components/ExamCountdown";
import DailyReminder from "@/components/DailyReminder";
import PageSkeleton from "@/components/PageSkeleton";
import LoadError from "@/components/errors/LoadError";
import { BookOpen, ArrowRight, LogIn, ChevronRight,
  CalendarClock, Plus, ScanLine, GraduationCap, FileText,
  Headphones, PenLine, AlertCircle, CheckSquare, RefreshCw, Timer, Circle,
} from "lucide-react";

const FEATURE_ICONS = {
  ScanLine, GraduationCap, FileText, Headphones, PenLine,
  CalendarClock, AlertCircle, CheckSquare, RefreshCw, Timer,
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user, profile, subjects, concepts, exams, loading, error } = useStudyOSData();
  const navigate = useNavigate();
  const [openTasks, setOpenTasks] = useState(null);

  const overallMastery = useMemo(() => {
    if (!concepts.length) return 0;
    return Math.round(concepts.reduce((s, c) => s + (c.mastery || 0), 0) / concepts.length);
  }, [concepts]);

  const recommendation = useMemo(
    () => recommendNextConcept(concepts, subjects),
    [concepts, subjects]
  );

  // Next PERSONAL exam (LearnerExam), not a board ExamSeries. Board series
  // remain separate and are viewed on the Exam Dates page.
  const nextExam = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (exams || [])
      .filter((e) => e.exam_date && e.exam_date >= today)
      .sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)))[0] || null;
  }, [exams]);

  // Supplementary priority data: open task summary (deterministic counts only).
  useEffect(() => {
    if (!user) { setOpenTasks(null); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const [todo, doing] = await Promise.all([
          base44.entities.Task.filter({ status: "todo" }, "-created_date", 100),
          base44.entities.Task.filter({ status: "in_progress" }, "-created_date", 100),
        ]);
        const all = [...(todo || []), ...(doing || [])];
        const today = new Date().toISOString().slice(0, 10);
        const due = all.filter((t) => t.due_date && t.due_date <= today).length;
        if (!cancelled) setOpenTasks({ dueToday: due, total: all.length });
      } catch {
        if (!cancelled) setOpenTasks(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <PageSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <StudyPanel className="max-w-md p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in to start StudyOS</h1>
          <p className="text-sm text-muted-foreground mt-2">
            StudyOS keeps your subjects, notes, quizzes, and progress private to you. Sign in to begin onboarding.
          </p>
          <button
            onClick={() => import("@/api/base44Client").then(({ base44 }) => base44.auth.redirectToLogin(window.location.href))}
            className="mt-5 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:opacity-90"
          >
            Sign in
          </button>
          <Link to="/register" className="mt-2 block text-center text-sm text-primary font-medium hover:underline">
            Create an account
          </Link>
        </StudyPanel>
      </div>
    );
  }

  if (error) {
    return (
      <LoadError
        message="This may be a temporary connection issue. Your saved data is still safe."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!profile || !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const firstName = (user?.full_name || user?.email || "there").split(" ")[0];

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-6 md:py-8 space-y-6">
      {/* Greeting */}
      <div>
        <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
        <h1 className="page-title mt-1.5 text-foreground">{greeting()}, {firstName}</h1>
      </div>

      <GlobalSearch />

      <DailyReminder concepts={concepts} openTasks={openTasks} />

      {/* Priority section: dominant focus card + supporting priority stats */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4">
        <StudyPanel className="p-6 md:p-8 flex flex-col justify-center">
          <div className="eyebrow">Today's focus</div>
          {recommendation ? (
            <>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mt-2.5">
                {recommendation.subject_name} — {recommendation.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-2.5 max-w-lg leading-6">
                {recommendation.mastery > 0
                  ? `Currently at ${recommendation.mastery}%. This is your highest-impact concept right now.`
                  : "You haven't practiced this yet — a great place to start building mastery."}
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <button
                  onClick={() => { track(EVENTS.RECOMMENDATION_CLICKED, {}); navigate("/practice"); }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90"
                >
                  Start session <ArrowRight className="w-4 h-4" />
                </button>
                <Link to="/tool/studylens" className="inline-flex items-center gap-2 rounded-lg border border-border bg-elevated text-foreground text-sm font-semibold px-4 py-2.5 hover:bg-elevated-high">
                  Open StudyLens
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl md:text-3xl font-semibold text-foreground mt-2.5">Add a subject to begin</h2>
              <p className="text-sm text-muted-foreground mt-2.5 max-w-lg leading-6">
                Your dashboard adapts once you have subjects and concepts.
              </p>
              <Link to="/profile" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90 w-fit">
                Manage subjects <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </StudyPanel>

        <div className="grid grid-cols-2 gap-4">
          {/* Next exam */}
          <StudyPanel className="p-5">
            <div className="eyebrow">Next exam</div>
            {nextExam ? (
              <>
                <div className="mt-2 text-[14px] font-semibold text-foreground truncate">{nextExam.title}</div>
                <ExamCountdown targetDate={nextExam.exam_date} />
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(`${nextExam.exam_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</div>
              </>
            ) : (
              <>
                <p className="mt-2 text-[13px] text-muted-foreground">No exams yet</p>
                <Link to="/tool/exampilot" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:opacity-80">
                  <CalendarClock className="w-3.5 h-3.5" /> Add an exam
                </Link>
              </>
            )}
          </StudyPanel>

          {/* Today */}
          <StudyPanel className="p-5">
            <div className="eyebrow">Today</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-semibold text-foreground">{openTasks ? openTasks.dueToday : "—"}</span>
              <span className="text-[11px] text-muted-foreground">tasks due</span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {openTasks ? `${openTasks.total} open · ${profile.daily_study_minutes || 60} min planned` : `${profile.daily_study_minutes || 60} min planned`}
            </p>
          </StudyPanel>

          {/* Streak */}
          <StudyPanel className="p-5">
            <div className="eyebrow">Streak</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-semibold text-foreground">{profile.streak || 0}</span>
              <span className="text-[11px] text-muted-foreground">days</span>
            </div>
          </StudyPanel>

          {/* Mastery */}
          <StudyPanel className="p-5">
            <div className="eyebrow">Mastery</div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-display text-3xl font-semibold text-foreground">{overallMastery}%</span>
            </div>
            <div className="mt-2.5"><MasteryBar value={overallMastery} color="hsl(var(--primary))" /></div>
          </StudyPanel>
        </div>
      </div>

      {/* Subjects */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">Subjects</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{subjects.length} subjects · {concepts.length} concepts tracked</p>
          </div>
          <Link to="/subject-hub" className="text-[12px] font-semibold text-primary hover:opacity-80 hidden sm:inline-flex items-center gap-1">
            Subject Hub <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.length === 0 && (
            <StudyPanel className="p-8 text-center sm:col-span-2 lg:col-span-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">No subjects yet</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">Add your subjects and StudyOS adapts every module around them.</p>
              <Link to="/profile" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
                <Plus className="w-4 h-4" /> Add subjects
              </Link>
            </StudyPanel>
          )}
          {subjects.map((s) => {
            const m = computeSubjectMastery(concepts, s.id);
            const subjConcepts = concepts.filter((c) => c.subject_id === s.id);
            const next = subjConcepts.length ? recommendNextConcept(subjConcepts, [s]) : null;
            const Icon = subjectIcon(s.name);
            const color = s.color || "#3B82F6";
            return (
              <StudyPanel key={s.id} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `${color}1A`, color }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-foreground">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{subjConcepts.length} concepts</div>
                  </div>
                  <span className="ml-auto font-display text-xl font-semibold text-foreground">{m}%</span>
                </div>
                <div className="mt-4"><MasteryBar value={m} color={color} /></div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {next ? `Next: ${next.name}` : "Ready to practice"}
                  </span>
                  <Link to="/practice" className="inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:opacity-80 shrink-0">
                    Practice <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </StudyPanel>
            );
          })}
        </div>
      </section>

      {/* StudyOS tools */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">StudyOS tools</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => {
            const Icon = FEATURE_ICONS[f.icon] || Circle;
            return (
              <Link key={f.id} to={`/tool/${f.id}`} className="block group">
                <StudyPanel className="p-5 h-full transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${f.accent}1A`, color: f.accent }}>
                      <Icon className="h-[18px] w-[18px]" />
                    </div>
                    <div className="text-[14px] font-semibold text-foreground">{f.title}</div>
                  </div>
                  <p className="mt-3 text-[12px] leading-5 text-muted-foreground">{f.short}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-primary">
                    Open
                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </StudyPanel>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}