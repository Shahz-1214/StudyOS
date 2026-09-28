import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { completeQuiz } from "@/lib/quizEngine";
import StudyPanel from "@/components/StudyPanel";
import QuizRunner from "@/components/practice/QuizRunner";
import QuizResults from "@/components/practice/QuizResults";
import VerifiedNotes from "@/components/resources/VerifiedNotes";
import PageSkeleton from "@/components/PageSkeleton";
import { Loader2, FileText, Sparkles, AlertTriangle, BookOpen } from "lucide-react";

export default function NoteQuiz() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, reload } = useStudyOSData();
  const navigate = useNavigate();

  const [notes, setNotes] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("input"); // input | quiz | results
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [saveError, setSaveError] = useState(false);
  const [grounding, setGrounding] = useState(null);

  // Optional textbook grounding: ?chapter=<id> seeds this quiz from that
  // chapter's own indexed text instead of the learner pasting notes. The
  // generator itself is unchanged and stays behind the existing AI quota guard.
  const chapterId = new URLSearchParams(window.location.search).get("chapter") || "";
  useEffect(() => {
    if (!chapterId) return;
    let cancelled = false;
    (async () => {
      try {
        const ch = await base44.entities.TextbookChapter.get(chapterId);
        if (cancelled || !ch) return;
        let book = null;
        try {
          book = await base44.entities.BoardResource.get(ch.book_resource_id);
        } catch {
          book = null;
        }
        if (cancelled) return;
        setGrounding({ chapter: ch, book });
        if (ch.source_digest) setNotes((prev) => prev || ch.source_digest);
      } catch {
        if (!cancelled) setGrounding(null);
      }
    })();
    return () => { cancelled = true; };
  }, [chapterId]);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function generate() {
    if (!notes.trim()) return;
    setBusy(true); setError(null);
    try {
      const subjectName =
        subjects.find((s) => s.id === subjectId)?.name ||
        grounding?.book?.subject_name ||
        "";
      const res = await base44.functions.invoke("generateQuizFromNotes", {
        notes: notes.trim(),
        count: 5,
        subject_name: subjectName,
      });
      const aiQuestions = res.data.questions;

      // Map AI concepts only to the selected subject. When no subject is
      // selected, only an unambiguous concept name may be linked. This prevents
      // same-name concepts from another subject receiving mastery credit.
      const normalizedTargetConcepts = subjectId
        ? concepts.filter((c) => c.subject_id === subjectId)
        : concepts;
      const byName = new Map();
      normalizedTargetConcepts.forEach((c) => {
        const key = String(c.name || "").trim().toLowerCase();
        if (!key) return;
        const list = byName.get(key) || [];
        list.push(c.id);
        byName.set(key, list);
      });
      const questions = aiQuestions.map((q) => {
        const key = String(q.concept_name || "").trim().toLowerCase();
        const matches = byName.get(key) || [];
        return {
          concept_id: matches.length === 1 ? matches[0] : "",
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          difficulty: q.difficulty,
          explanation: q.explanation,
        };
      });
      const conceptIds = [...new Set(questions.map((q) => q.concept_id).filter(Boolean))];

      // Grounding metadata keeps a chapter-derived quiz traceable to the exact
      // book and chapter it came from.
      const grounded = !!grounding?.chapter?.source_digest;
      const created = await base44.entities.Quiz.create({
        subject_id: subjectId || "mixed",
        title: grounded
          ? `${grounding.book?.title || subjectName || "Textbook"} · Chapter ${grounding.chapter.chapter_index}`
          : (subjectName ? `${subjectName} · Note → Quiz` : "Note → Quiz"),
        concept_ids: conceptIds,
        questions,
        source: "ai",
        source_resource_id: grounded ? grounding.chapter.book_resource_id : "",
        source_chapter_id: grounded ? grounding.chapter.id : "",
        source_book_title: grounded ? (grounding.book?.title || "") : "",
        source_chapter_title: grounded ? grounding.chapter.chapter_title : "",
      });
      track(EVENTS.QUIZ_GENERATED, { source: "ai", count: questions.length });
      track(EVENTS.QUIZ_STARTED, { quiz_id: created.id, source: "ai" });
      track(EVENTS.NOTE_UPLOADED, { source: "note-quiz", chars: notes.trim().length });
      setQuiz(created);
      setMode("quiz");
    } catch (err) {
      setError(err?.response?.data?.error || "Couldn't generate a quiz from these notes. Try again.");
    }
    setBusy(false);
  }

  async function finish(finalAnswers) {
    setSaveError(false);
    try {
      const { updates: ups } = await completeQuiz(quiz, finalAnswers, concepts);
      await reload();
      setAnswers(finalAnswers);
      setUpdates(ups);
    } catch {
      setAnswers(finalAnswers);
      setUpdates([]);
      setSaveError(true);
    }
    setMode("results");
  }

  function reset() {
    setQuiz(null); setAnswers(null); setUpdates([]); setSaveError(false); setMode("input"); setNotes("");
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study · Stage 3</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" /> Note → Quiz
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Turn your notes into AI-generated practice questions, then let StudyOS learn what you keep missing.</p>
      </div>

      {mode === "input" && grounding && (
        <StudyPanel className="p-4 mb-4">
          {grounding.chapter.source_digest ? (
            <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <BookOpen className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>
                Grounded in <span className="text-foreground font-semibold">{grounding.book?.title || "this textbook"}</span>
                {" · Chapter "}{grounding.chapter.chapter_index}: {grounding.chapter.chapter_title}
                {" · p. "}{grounding.chapter.start_page}
                {grounding.chapter.end_page !== grounding.chapter.start_page ? "–" + grounding.chapter.end_page : ""}
                . Questions are generated from this chapter's own indexed text, not invented.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>This chapter has no indexed text yet, so StudyOS cannot create textbook-grounded questions from it.</span>
            </div>
          )}
        </StudyPanel>
      )}

      {mode === "input" && (
        <VerifiedNotes boardId={profile?.board_id} />
      )}

      {mode === "input" && (
        <StudyPanel className="p-6">
          <label className="eyebrow block mb-2">Your notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your study notes here — StudyOS will generate 5 questions from them…"
            className="w-full min-h-[180px] rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <label className="eyebrow block mt-4 mb-2">Subject (optional)</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">No specific subject</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex justify-end mt-4">
            <button onClick={generate} disabled={busy || !notes.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Generating…" : "Generate quiz"}
            </button>
          </div>
        </StudyPanel>
      )}

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </StudyPanel>
      )}

      {mode === "quiz" && quiz && <QuizRunner quiz={quiz} onComplete={finish} />}

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

      {mode === "input" && (
        <p className="text-[11px] text-muted-foreground mt-3 px-1">
          AI-generated questions are validated before the quiz starts. Mastery updates only for concepts that match your subjects.
        </p>
      )}
    </div>
  );
}