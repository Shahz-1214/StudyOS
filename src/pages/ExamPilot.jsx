import { useState, useEffect } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { completeQuiz } from "@/lib/quizEngine";
import StudyPanel from "@/components/StudyPanel";
import QuizRunner from "@/components/practice/QuizRunner";
import QuizResults from "@/components/practice/QuizResults";
import { Loader2, CalendarClock, ClipboardList, Sparkles, AlertTriangle, Target, Clock, ListChecks, FileText, Archive } from "lucide-react";

export default function ExamPilot() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, reload } = useStudyOSData();
  const navigate = useNavigate();

  const [tab, setTab] = useState("exam");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [mode, setMode] = useState("setup");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [updates, setUpdates] = useState([]);

  const [days, setDays] = useState(7);
  const [plan, setPlan] = useState(null);
  const [pastPlans, setPastPlans] = useState([]);

  const weakConcepts = (concepts || [])
    .filter((c) => (c.mastery || 0) < 75)
    .sort((a, b) => (a.mastery || 0) - (b.mastery || 0));

  useEffect(() => {
    if (tab === "plan" && !pastPlans.length) {
      base44.entities.StudyPlan.list("-created_date", 5).then(setPastPlans).catch(() => {});
    }
  }, [tab]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function buildExam() {
    if (!weakConcepts.length) return;
    setBusy(true); setError(null);
    try {
      const target = weakConcepts.slice(0, 12);
      const res = await base44.functions.invoke("generateAdaptiveExam", {
        concepts: target.map((c) => ({ name: c.name, mastery: c.mastery, importance: c.importance })),
        count: 8,
      });
      const byName = {};
      concepts.forEach((c) => { byName[c.name.toLowerCase()] = c.id; });
      const questions = res.data.questions.map((q) => ({
        concept_id: q.concept_name ? (byName[q.concept_name.toLowerCase()] || "") : "",
        prompt: q.prompt, options: q.options, correct_index: q.correct_index,
        difficulty: q.difficulty, explanation: q.explanation,
      }));
      const conceptIds = [...new Set(questions.map((q) => q.concept_id).filter(Boolean))];
      const created = await base44.entities.Quiz.create({
        subject_id: "mixed", title: "Adaptive Exam · Weak Concepts",
        concept_ids: conceptIds, questions, source: "ai",
      });
      track(EVENTS.EXAM_CREATED, { quiz_id: created.id, weak_count: target.length });
      track(EVENTS.QUIZ_STARTED, { quiz_id: created.id, source: "ai-adaptive" });
      setQuiz(created); setMode("quiz");
    } catch (err) {
      setError("Couldn't build the exam. Try again.");
    }
    setBusy(false);
  }

  async function finish(finalAnswers) {
    try {
      const { updates: ups } = await completeQuiz(quiz, finalAnswers, concepts);
      await reload();
      setAnswers(finalAnswers); setUpdates(ups);
    } catch (e) { console.error(e); setAnswers(finalAnswers); setUpdates([]); }
    setMode("results");
  }

  async function buildPlan() {
    if (!weakConcepts.length) return;
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("generateStudyPlan", {
        weak_concepts: weakConcepts.slice(0, 15).map((c) => ({ name: c.name, mastery: c.mastery })),
        daily_minutes: profile.daily_study_minutes || 60,
        days,
      });
      const data = res.data;
      const created = await base44.entities.StudyPlan.create({
        title: `${days}-day revision plan`,
        summary: data.summary,
        plan: data.plan,
      });
      setPlan(created);
      setPastPlans([created, ...pastPlans]);
      track(EVENTS.STUDY_STARTED, { source: "exampilot", days });
    } catch (err) {
      setError("Couldn't build the plan. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[860px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Plan · Stage 4</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" /> ExamPilot
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Adaptive exams that target your weakest concepts, plus a day-by-day revision plan built around the time you actually have.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/past-papers" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2 hover:bg-secondary/70">
          <FileText className="w-4 h-4" /> Past Papers
        </Link>
        <Link to="/exam-dates" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2 hover:bg-secondary/70">
          <CalendarClock className="w-4 h-4" /> Exam Dates
        </Link>
        <Link to="/exam-vault" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2 hover:bg-secondary/70">
          <Archive className="w-4 h-4" /> Exam Vault
        </Link>
      </div>

      {!weakConcepts.length && (
        <StudyPanel className="p-5 mb-4 text-sm text-muted-foreground">
          You don't have weak concepts yet. Take a few quizzes first and ExamPilot will target what you miss.
        </StudyPanel>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("exam")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === "exam" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <Target className="w-4 h-4" /> Adaptive exam
        </button>
        <button onClick={() => setTab("plan")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === "plan" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <ClipboardList className="w-4 h-4" /> Study plan
        </button>
      </div>

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </StudyPanel>
      )}

      {tab === "exam" && mode === "setup" && (
        <StudyPanel className="p-6">
          <div className="eyebrow mb-3">Targeting {weakConcepts.length} weak concept{weakConcepts.length === 1 ? "" : "s"}</div>
          <div className="flex flex-wrap gap-2 mb-4">
            {weakConcepts.slice(0, 10).map((c) => (
              <span key={c.id} className="rounded-full bg-secondary text-secondary-foreground text-[11px] font-semibold px-3 py-1">
                {c.name} · {c.mastery || 0}%
              </span>
            ))}
          </div>
          <button onClick={buildExam} disabled={busy || !weakConcepts.length} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Building exam…" : "Build adaptive exam"}
          </button>
          <p className="text-[11px] text-muted-foreground mt-3">8 questions, difficulty scaled to each concept's mastery. Results update your mastery in real time.</p>
        </StudyPanel>
      )}

      {tab === "exam" && mode === "quiz" && quiz && <QuizRunner quiz={quiz} onComplete={finish} />}

      {tab === "exam" && mode === "results" && quiz && answers && (
        <QuizResults quiz={quiz} answers={answers} updates={updates} concepts={concepts} subjects={subjects}
          onAgain={() => { setMode("setup"); setQuiz(null); setAnswers(null); setUpdates([]); }}
          onDone={() => navigate("/")} />
      )}

      {tab === "plan" && (
        <div className="space-y-4">
          <StudyPanel className="p-6">
            <div className="eyebrow mb-3">Plan length</div>
            <div className="flex items-center gap-3 mb-4">
              <input type="range" min={3} max={21} value={days} onChange={(e) => setDays(Number(e.target.value))} className="flex-1 accent-primary" />
              <span className="text-sm font-semibold text-foreground w-20 text-right">{days} days</span>
            </div>
            <div className="text-[12px] text-muted-foreground mb-4">Using your daily goal of {profile.daily_study_minutes || 60} min/day · {weakConcepts.length} weak concepts prioritized</div>
            <button onClick={buildPlan} disabled={busy || !weakConcepts.length} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Building plan…" : "Build study plan"}
            </button>
          </StudyPanel>

          {plan && (
            <div className="space-y-3">
              {plan.summary && (
                <StudyPanel className="p-5">
                  <div className="eyebrow mb-2">Summary</div>
                  <p className="text-[14px] text-foreground">{plan.summary}</p>
                </StudyPanel>
              )}
              {plan.plan.map((d, i) => (
                <StudyPanel key={i} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary grid place-items-center text-[12px] font-bold">{d.day}</span>
                    <div className="font-semibold text-foreground text-[14px]">{d.label}</div>
                  </div>
                  <ul className="space-y-1.5">
                    {d.tasks.map((t, j) => (
                      <li key={j} className="flex gap-2 text-[13px] text-foreground">
                        <ListChecks className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                  {d.focus_concepts?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {d.focus_concepts.map((c, k) => (
                        <span key={k} className="rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2.5 py-0.5">{c}</span>
                      ))}
                    </div>
                  )}
                </StudyPanel>
              ))}
            </div>
          )}

          {!plan && pastPlans.length > 0 && (
            <div>
              <div className="eyebrow px-1 mb-2">Recent plans</div>
              <div className="space-y-2">
                {pastPlans.map((p) => (
                  <button key={p.id} onClick={() => setPlan(p)} className="w-full text-left">
                    <StudyPanel className="p-4 hover:bg-secondary/40">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-foreground text-[13px]">{p.title}</div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="w-3 h-3" /> {p.plan?.length || 0} days</div>
                      </div>
                    </StudyPanel>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}