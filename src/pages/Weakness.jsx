import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, AlertCircle, Sparkles, AlertTriangle, ArrowRight, TrendingDown, Target } from "lucide-react";

export default function Weakness() {
  const { user } = useAuth();
  const { profile, concepts, subjects, loading } = useStudyOSData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function analyze() {
    if (!concepts.length) return;
    setBusy(true); setError(null); setReport(null);
    try {
      track(EVENTS.WEAKNESS_UPDATED, { source: "weakness-ai", concept_count: concepts.length });
      const res = await base44.functions.invoke("analyzeWeaknesses", {
        concepts: concepts.map((c) => ({ name: c.name, mastery: c.mastery, status: c.status, importance: c.importance })),
      });
      setReport(res.data);
    } catch (err) {
      setError("Analysis failed. Try again.");
    }
    setBusy(false);
  }

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "";

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Plan · Stage 4</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <AlertCircle className="w-6 h-6 text-primary" /> Weakness AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">An AI diagnostic over your mastery data — surfaces hidden weaknesses, priority order, and targeted recommendations.</p>
      </div>

      {!concepts.length ? (
        <StudyPanel className="p-5 text-sm text-muted-foreground">Add concepts in your profile first, then run a diagnosis.</StudyPanel>
      ) : (
        <StudyPanel className="p-6 mb-4">
          <div className="eyebrow mb-2">Analyzing {concepts.length} concept{concepts.length === 1 ? "" : "s"}</div>
          <p className="text-[13px] text-muted-foreground mb-4">Weakness AI looks beyond raw mastery scores for high-importance concepts with middling confidence and foundational gaps that undermine others.</p>
          <button onClick={analyze} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Diagnosing…" : "Diagnose my weaknesses"}
          </button>
        </StudyPanel>
      )}

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </StudyPanel>
      )}

      {report && (
        <div className="space-y-4">
          <StudyPanel className="p-6">
            <div className="eyebrow mb-2">Overall assessment</div>
            <p className="text-[14px] text-foreground">{report.overall_assessment}</p>
          </StudyPanel>

          {report.hidden_weaknesses?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <div className="eyebrow">Hidden weaknesses</div>
              </div>
              <div className="space-y-3">
                {report.hidden_weaknesses.map((w, i) => (
                  <div key={i} className="rounded-lg bg-secondary/50 p-3">
                    <div className="font-semibold text-foreground text-[13px]">{w.concept}</div>
                    <div className="text-[12px] text-muted-foreground mt-0.5">{w.reason}</div>
                  </div>
                ))}
              </div>
            </StudyPanel>
          )}

          {report.priority_order?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-primary" />
                <div className="eyebrow">Study priority</div>
              </div>
              <ol className="space-y-2">
                {report.priority_order.map((p, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0">{i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            </StudyPanel>
          )}

          {report.recommendations?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="eyebrow mb-3">Recommendations</div>
              <ul className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground">
                    <ArrowRight className="w-4 h-4 mt-0.5 text-primary shrink-0" /> {r}
                  </li>
                ))}
              </ul>
            </StudyPanel>
          )}

          <div className="flex gap-2">
            <Link to="/tool/exampilot" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
              Build an exam <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/tool/focus" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
              Start a focus session
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}