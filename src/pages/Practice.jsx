import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { generateQuiz } from "@/lib/quizGenerator";
import {
  applyQuizResult, difficultyWeight, computeConceptStatus,
} from "@/lib/learnerState";
import StudyPanel from "@/components/StudyPanel";
import QuizRunner from "@/components/practice/QuizRunner";
import QuizResults from "@/components/practice/QuizResults";
import { Loader2, Brain, Zap, AlertTriangle, ChevronRight } from "lucide-react";

export default function Practice() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, error, reload } = useStudyOSData();
  const navigate = useNavigate();

  const [mode, setMode] = useState("select"); // select | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [busy, setBusy] = useState(false);

  const weakConcepts = useMemo(
    () => [...concepts].sort((a, b) => (a.mastery || 0) - (b.mastery || 0)).slice(0, 5),
    [concepts]
  );

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
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
    } catch (e) {
      console.error(e);
    }
    setBusy(false);
  }

  async function finishQuiz(finalAnswers) {
    // Per-concept stats.
    const stats = {};
    quiz.questions.forEach((q, i) => {
      const sel = finalAnswers[i]?.selected_index;
      const correct = sel === q.correct_index;
      if (!stats[q.concept_id]) stats[q.concept_id] = { correct: 0, total: 0, diffSum: 0 };
      stats[q.concept_id].total++;
      if (correct) stats[q.concept_id].correct++;
      stats[q.concept_id].diffSum += difficultyWeight(q.difficulty);
    });
    const statArr = Object.entries(stats).map(([concept_id, v]) => ({
      concept_id, correct: v.correct, total: v.total, difficultyWeight: v.diffSum / v.total,
    }));

    const masteryUpdates = applyQuizResult(statArr, concepts);

    // Score + attempt record.
    const score = quiz.questions.filter((q, i) => finalAnswers[i]?.selected_index === q.correct_index).length;
    const total = quiz.questions.length;
    const accuracy = total ? Math.round((score / total) * 100) : 0;
    const answerRecords = quiz.questions.map((q, i) => ({
      question_index: i,
      concept_id: q.concept_id,
      selected_index: finalAnswers[i]?.selected_index ?? -1,
      correct: finalAnswers[i]?.selected_index === q.correct_index,
      difficulty: q.difficulty,
    }));

    try {
      await base44.entities.QuizAttempt.create({
        quiz_id: quiz.id,
        subject_id: quiz.subject_id,
        score, total, accuracy,
        answers: answerRecords,
        completed_at: new Date().toISOString(),
      });
      // Persist mastery updates.
      const now = new Date().toISOString();
      await base44.entities.Concept.bulkUpdate(
        masteryUpdates.map((u) => ({
          id: u.concept_id,
          mastery: u.newMastery,
          status: computeConceptStatus(u.newMastery),
          last_practiced: now,
        }))
      );
      track(EVENTS.QUIZ_COMPLETED, { quiz_id: quiz.id, score, total, accuracy });
      answerRecords.forEach((a) => track(a.correct ? EVENTS.QUESTION_CORRECT : EVENTS.QUESTION_INCORRECT, { concept_id: a.concept_id }));
      track(EVENTS.WEAKNESS_UPDATED, { concepts_updated: masteryUpdates.length });
      await reload();
    } catch (e) {
      console.error(e);
    }

    setAnswers(finalAnswers);
    setUpdates(masteryUpdates);
    setMode("results");
  }

  function reset() {
    setQuiz(null); setAnswers(null); setUpdates([]); setMode("select");
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Practice</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">Quiz practice</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Answer a short quiz. StudyOS scores it and updates your concept mastery using the canonical formula — no fake data.
        </p>
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
            Questions use a built-in glossary for standard subjects (demo content). Real AI-generated questions from your notes arrive in Stage 3 (Note → Quiz).
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
        />
      )}
    </div>
  );
}