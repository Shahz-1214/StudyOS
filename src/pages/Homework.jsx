import { useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, GraduationCap, AlertTriangle, Lightbulb, ChevronRight, BookOpen } from "lucide-react";

export default function Homework() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const location = useLocation();
  const [problem, setProblem] = useState(() => location.state?.problem || "");
  const [hints, setHints] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const currentLevel = hints.length ? hints[hints.length - 1].hint_level : 0;
  const isFinal = hints.length && hints[hints.length - 1].is_final;

  async function getHint() {
    if (!problem.trim()) return;
    setBusy(true); setError(null);
    try {
      if (!hints.length) track(EVENTS.HOMEWORK_STARTED, {});
      const nextLevel = currentLevel + 1;
      const res = await base44.functions.invoke("homeworkCoach", {
        problem: problem.trim(),
        hint_level: nextLevel,
        previous_hints: hints.map((h) => h.hint),
      });
      setHints([...hints, res.data]);
      track(EVENTS.HINT_REQUESTED, { level: nextLevel });
      if (res.data.is_final) track(EVENTS.HOMEWORK_COMPLETED, {});
    } catch (err) {
      setError("Couldn't get a hint right now. Try again.");
    }
    setBusy(false);
  }

  function reset() {
    setHints([]); setError(null);
  }

  return (
    <div className="max-w-[1040px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study · Stage 3</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary" /> Homework Coach
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Guided hints that teach the concept. The full solution is never shown by default — you do the thinking.</p>
      </div>

      {/* Galaxy/foldable-ready split: problem on the left, hints on the right.
          Stacks on mobile, side-by-side on tablet/desktop. */}
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="md:sticky md:top-6 space-y-4">
          <StudyPanel className="p-6">
            <label className="eyebrow block mb-2">Your problem</label>
            <textarea
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Paste the problem you're stuck on…"
              className="w-full min-h-[140px] rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-muted-foreground">
                {hints.length ? `Hint level ${currentLevel} of 4` : "Start at level 1 — a guiding question"}
              </span>
              <div className="flex gap-2">
                {hints.length > 0 && !isFinal && (
                  <button onClick={reset} className="rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
                    Reset
                  </button>
                )}
                <button
                  onClick={getHint}
                  disabled={busy || !problem.trim() || isFinal}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                  {hints.length === 0 ? "Get a hint" : isFinal ? "Solution shown" : "Next hint"}
                </button>
              </div>
            </div>
          </StudyPanel>

          {error && (
            <StudyPanel className="p-4 flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" /> {error}
            </StudyPanel>
          )}

          {hints.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-1">Tip: paste a problem from any subject — math, physics, chemistry, economics. Hints escalate across four levels.</p>
          )}
        </div>

        <div className="space-y-3">
          {hints.length === 0 && (
            <StudyPanel className="p-8 text-center">
              <Lightbulb className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Your hints will appear here. Enter a problem and ask for a hint to begin.</p>
            </StudyPanel>
          )}

          {hints.map((h, i) => (
            <StudyPanel key={i} className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-[11px] font-bold">{h.hint_level}</span>
                <span className="eyebrow">{h.is_final ? "Solution" : `Hint level ${h.hint_level}`}</span>
              </div>
              <p className="text-[14px] text-foreground">{h.hint}</p>
              {h.teaching_note && (
                <div className="mt-3 flex items-start gap-2 text-[12px] text-muted-foreground">
                  <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {h.teaching_note}
                </div>
              )}
            </StudyPanel>
          ))}

          {hints.length > 0 && !isFinal && (
            <p className="text-[11px] text-muted-foreground px-1">Still stuck? Request the next hint — each level reveals a little more.</p>
          )}
          {isFinal && (
            <Link to="/practice" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
              Practice this now <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}