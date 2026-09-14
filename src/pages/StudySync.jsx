import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, ArrowRight, Zap, FileText, Headphones } from "lucide-react";

export default function StudySync() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function runSync() {
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("studySync", {});
      setResult(res.data);
      track(EVENTS.STUDYSYNC_RUN, { created: res.data?.created || 0 });
    } catch (err) {
      setError("Sync failed — try again.");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Plan · Stage 6</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-primary" /> StudySync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">The connection layer. Every quiz, exam, and lecture event becomes the right task — weak concepts get review tasks, exams get study blocks, lectures get flashcard reviews.</p>
      </div>

      <StudyPanel className="p-6 mb-5">
        <p className="text-[13px] text-foreground mb-4">StudySync reads your recent activity and creates tasks in the canonical Tasks layer — deduplicated against what's already open.</p>
        <button
          onClick={runSync}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {busy ? "Syncing…" : "Run sync now"}
        </button>
      </StudyPanel>

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </StudyPanel>
      )}

      {result && (
        <>
          <StudyPanel className="p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              <span className="font-semibold text-foreground">{result.created} task{result.created === 1 ? "" : "s"} created</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SourceStat icon={Zap} label="Weak concepts" value={result.sources.weak_concepts} />
              <SourceStat icon={FileText} label="Exams" value={result.sources.exams} />
              <SourceStat icon={Headphones} label="Lectures" value={result.sources.lectures} />
            </div>
          </StudyPanel>

          {result.tasks.length > 0 && (
            <div className="space-y-2 mb-4">
              {result.tasks.map((t) => (
                <StudyPanel key={t.id} className="p-4">
                  <div className="text-[14px] font-medium text-foreground">{t.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5">{t.description}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Sync</span>
                    <span className="text-[11px] text-muted-foreground capitalize">{t.type.replace("_", " ")}</span>
                    <span className="text-[11px] text-muted-foreground">· {t.priority} priority</span>
                  </div>
                </StudyPanel>
              ))}
            </div>
          )}

          {result.created === 0 && (
            <p className="text-[13px] text-muted-foreground mb-4">Nothing new to sync — your tasks are already up to date with your recent activity.</p>
          )}

          <Link to="/tool/tasks" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
            Go to Tasks <ArrowRight className="w-4 h-4" />
          </Link>
        </>
      )}

      {!result && !busy && (
        <p className="text-[11px] text-muted-foreground">Tip: take a quiz or process a lecture first, then run sync — StudySync turns that activity into follow-up tasks automatically.</p>
      )}
    </div>
  );
}

function SourceStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <div className="text-lg font-bold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}