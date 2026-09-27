import { useMemo, useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { generateQuiz } from "@/lib/quizGenerator";
import { completeQuiz } from "@/lib/quizEngine";
import StudyPanel from "@/components/StudyPanel";
import QuizRunner from "@/components/practice/QuizRunner";
import QuizResults from "@/components/practice/QuizResults";
import PageSkeleton from "@/components/PageSkeleton";
import { Loader2, Brain, Zap, AlertTriangle, ChevronRight, FileText } from "lucide-react";

export default function Practice() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, error, reload } = useStudyOSData();
  const navigate = useNavigate();

  const [mode, setMode] = useState("select"); // select | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const weakConcepts = useMemo(
    () => [...concepts].sort((a, b) => (a.mastery || 0) - (b.mastery || 0)).slice(0, 5),
    [concepts]
  );

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function startQuiz(conceptsForQuiz, pool, title, subjectId) {
    setBusy(true);
    try {
      const generated = generateQuiz(conceptsForQuiz, pool, title, Math.min(5, conceptsForQuiz.length));
      generated.subject_id = subjectId || "mixed";
      const created = await base44.entities.Quiz.create(generated);
      track(EVENTS.QUIZ_GENERATED, { source: generated.source, count: generated.questions.length });
      track(EVENTS.QUIZ_STARTED, { quiz_id: created.id });
      setQuiz(created);
      setMode("quiz");
    } catch {
      setError?.("Could not start that quiz. Please try again.");
    }
    setBusy(false);
  }

  async function finishQuiz(finalAnswers) {
    setSaveError(false);
    try {
      const { updates: masteryUpdates } = await completeQuiz(quiz, finalAnswers, concepts);
      await reload();
      setAnswers(finalAnswers);
      setUpdates(masteryUpdates);
    } catch {
      setAnswers(finalAnswers);
      setUpdates([]);
      setSaveError(true);
    }
    setMode("results");
  }

  function reset() {
    setQuiz(null); setAnswers(null); setUpdates([]); setSaveError(false); setMode("select");
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Practice</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">Quiz practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Answer a short quiz. StudyOS scores it and updates your concept mastery using the canonical formula.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Link to="/past-papers" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2 hover:bg-secondary/70">
          <FileText className="w-4 h-4" /> Past Papers
        </Link>
      </div>

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> Couldn't load your data. Try refreshing.
        </StudyPanel>
      )}

      {mode === "select" && (
        <div className="space-y-4">
          {/* Weakest concepts quick start */}
          {weakConcepts.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground">Practice your weakest concepts</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">A 5-question quiz drawn from your lowest-mastery concepts across all subjects.</p>
              <button
                disabled={busy}
                onClick={() => startQuiz(weakConcepts, concepts, "Weakest concepts", "mixed")}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-50 hover:opacity-90"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Start weakest quiz <ChevronRight className="w-4 h-4" />
              </button>
            </StudyPanel>
          )}

          {/* Per-subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.map((s) => {
              const subjConcepts = concepts.filter((c) => c.subject_id === s.id);
              return (
                <StudyPanel key={s.id} className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color || "#3B82F6" }} />
                    <h3 className="font-bold text-foreground">{s.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">{subjConcepts.length} concepts available</p>
                  <button
                    disabled={busy || subjConcepts.length === 0}
                    onClick={() => startQuiz(subjConcepts, subjConcepts, `${s.name} practice`, s.id)}
                    className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-40 hover:bg-secondary/70"
                  >
                    <Brain className="w-4 h-4" /> Start quiz <ChevronRight className="w-4 h-4" />
                  </button>
                </StudyPanel>
              );
            })}
          </div>

          <p className="text-[11px] text-muted-foreground px-1">
            Built-in glossary questions for standard subjects. For AI-generated questions from your own notes, use Note → Quiz.
          </p>
        </div>
      )}

      {mode === "quiz" && quiz && (
        <QuizRunner quiz={quiz} onComplete={finishQuiz} />
      )}

      {mode === "results" && quiz && answers && (
        <QuizResults
          quiz={quiz}
          answers={answers}
          updates={updates}
          concepts={concepts}
          subjects={subjects}
          onAgain={reset}
          onDone={() => navigate("/")}
          saveError={saveError}
        />
      )}
    </div>
  );
}