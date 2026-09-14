import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { applyConfidenceCheck, computeConceptStatus, statusColor, STATUS_LABELS } from "@/lib/learnerState";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, Timer, Play, Square, Star, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

const PRESETS = [15, 25, 45, 60];

export default function FocusStudy() {
  const { user } = useAuth();
  const { profile, concepts, loading, reload } = useStudyOSData();

  const sorted = (concepts || []).slice().sort((a, b) => (a.mastery || 0) - (b.mastery || 0));
  const [conceptId, setConceptId] = useState("");
  const [duration, setDuration] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("setup"); // setup | running | check | done
  const [confidence, setConfidence] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newMastery, setNewMastery] = useState(null);

  useEffect(() => { if (!conceptId && sorted.length) setConceptId(sorted[0].id); }, [sorted, conceptId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) { clearInterval(t); setRunning(false); setPhase("check"); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  function start() {
    setRemaining(duration * 60);
    setRunning(true);
    setPhase("running");
    track(EVENTS.STUDY_STARTED, { source: "focus", concept_id: conceptId, duration });
  }

  function stopEarly() {
    setRunning(false);
    setPhase("check");
  }

  async function saveSession() {
    setSaving(true); setError(null);
    try {
      const concept = concepts.find((c) => c.id === conceptId);
      await base44.entities.FocusSession.create({
        concept_id: conceptId,
        subject_id: concept?.subject_id || "",
        duration_minutes: duration,
        confidence,
        completed_at: new Date().toISOString(),
      });
      if (concept) {
        const nm = applyConfidenceCheck(concept.mastery, confidence);
        await base44.entities.Concept.update(concept.id, {
          mastery: nm,
          status: computeConceptStatus(nm),
          last_practiced: new Date().toISOString(),
        });
        setNewMastery({ prev: concept.mastery || 0, next: nm });
      }
      track(EVENTS.STUDY_COMPLETED, { concept_id: conceptId, duration, confidence });
      await reload();
      setPhase("done");
    } catch (e) {
      setError("Couldn't save the session. Try again.");
    }
    setSaving(false);
  }

  function reset() {
    setPhase("setup"); setRunning(false); setRemaining(duration * 60); setConfidence(3); setNewMastery(null); setError(null);
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const concept = concepts.find((c) => c.id === conceptId);

  return (
    <div className="max-w-[640px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Plan · Stage 4</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Timer className="w-6 h-6 text-primary" /> FocusStudy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">A real study timer with a confidence check after. Your confidence feeds straight back into the mastery formula.</p>
      </div>

      {phase === "setup" && (
        <StudyPanel className="p-6 space-y-5">
          <div>
            <label className="eyebrow block mb-2">Concept to focus on</label>
            {sorted.length ? (
              <select value={conceptId} onChange={(e) => setConceptId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                {sorted.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.mastery || 0}% ({STATUS_LABELS[c.status] || "Developing"})</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">Add concepts in your profile to start a focus session.</p>
            )}
          </div>
          <div>
            <label className="eyebrow block mb-2">Session length</label>
            <div className="flex gap-2">
              {PRESETS.map((p) => (
                <button key={p} onClick={() => { setDuration(p); setRemaining(p * 60); }} className={`rounded-lg px-4 py-2 text-sm font-semibold ${duration === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  {p}m
                </button>
              ))}
            </div>
          </div>
          <button onClick={start} disabled={!sorted.length} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
            <Play className="w-4 h-4" /> Start session
          </button>
        </StudyPanel>
      )}

      {phase === "running" && (
        <StudyPanel className="p-8 text-center">
          <div className="eyebrow mb-1">{concept?.name}</div>
          <div className="text-6xl font-bold text-foreground tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>{mm}:{ss}</div>
          <div className="text-[12px] text-muted-foreground mt-2">Stay focused. You've got this.</div>
          <button onClick={stopEarly} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-5 py-2.5 hover:bg-secondary/70">
            <Square className="w-4 h-4" /> End early
          </button>
        </StudyPanel>
      )}

      {phase === "check" && (
        <StudyPanel className="p-6">
          <div className="text-center mb-5">
            <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
            <div className="text-lg font-bold text-foreground">Session complete</div>
            <div className="text-[12px] text-muted-foreground">{duration} min · {concept?.name}</div>
          </div>
          <label className="eyebrow block mb-3 text-center">How confident do you feel about this concept?</label>
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setConfidence(n)} className="p-1">
                <Star className={`w-8 h-8 ${n <= confidence ? "fill-primary text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </div>
          <div className="text-center text-[11px] text-muted-foreground mb-4">Confidence is the 4th term of your mastery — honest answers make your plan sharper.</div>
          {error && <div className="flex items-center gap-2 text-destructive text-sm mb-3 justify-center"><AlertTriangle className="w-4 h-4" /> {error}</div>}
          <div className="flex justify-center">
            <button onClick={saveSession} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {saving ? "Saving…" : "Save & update mastery"}
            </button>
          </div>
        </StudyPanel>
      )}

      {phase === "done" && (
        <StudyPanel className="p-6 text-center">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-2" />
          <div className="text-lg font-bold text-foreground">Nice work.</div>
          {newMastery && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-lg bg-secondary px-4 py-2 text-[13px]">
              <span className="text-muted-foreground">{concept?.name}</span>
              <span className="font-semibold" style={{ color: statusColor(computeConceptStatus(newMastery.prev)) }}>{newMastery.prev}%</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-semibold" style={{ color: statusColor(computeConceptStatus(newMastery.next)) }}>{newMastery.next}%</span>
            </div>
          )}
          <div className="mt-6">
            <button onClick={reset} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 hover:opacity-90">
              <Timer className="w-4 h-4" /> Start another
            </button>
          </div>
        </StudyPanel>
      )}
    </div>
  );
}