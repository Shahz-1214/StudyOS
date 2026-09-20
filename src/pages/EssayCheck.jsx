import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import StudyPanel from "@/components/StudyPanel";
import PageSkeleton from "@/components/PageSkeleton";
import { Loader2, PenLine, Sparkles, AlertTriangle, FileText, CheckCircle2, ArrowUpRight, RotateCcw } from "lucide-react";

const DIMENSIONS = [
  { key: "grammar", label: "Grammar", color: "#3B82F6" },
  { key: "structure", label: "Structure", color: "#10B981" },
  { key: "argument", label: "Argument", color: "#F59E0B" },
  { key: "readability", label: "Readability", color: "#8B5CF6" },
];

export default function EssayCheck() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [essay, setEssay] = useState(null);
  const [past, setPast] = useState([]);

  useEffect(() => { base44.entities.Essay.list("-created_date", 5).then(setPast).catch(() => {}); }, []);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function analyze() {
    if (!text.trim()) return;
    setBusy(true); setError(null); setEssay(null);
    try {
      track(EVENTS.ESSAY_ANALYZED, {});
      const res = await base44.functions.invoke("analyzeEssay", { text: text.trim() });
      const data = res.data;
      const created = await base44.entities.Essay.create({
        title: title.trim() || "Untitled essay",
        text: text.trim(),
        overall_score: data.overall_score,
        analysis: data.dimensions,
        strengths: data.strengths,
        improvements: data.improvements,
        summary: data.summary,
      });
      setEssay(created);
      setPast([created, ...past]);
    } catch (err) {
      setError("Analysis failed. Try again.");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study · Stage 5</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <PenLine className="w-6 h-6 text-primary" /> EssayCheck
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Grammar, structure, argument, and readability analysis with targeted feedback. Your voice stays yours — no auto-rewrite.</p>
      </div>

      {!essay && (
        <StudyPanel className="p-6 mb-4">
          <label className="eyebrow block mb-2">Essay title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hamlet essay draft"
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[14px] text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-primary" />
          <label className="eyebrow block mb-2">Your essay</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your essay here…"
            className="w-full min-h-[220px] rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary" />
          <div className="flex items-center justify-between mt-4">
            <span className="text-[11px] text-muted-foreground">{text.length} chars · max 12,000</span>
            <button onClick={analyze} disabled={busy || !text.trim()} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Analyzing…" : "Analyze essay"}
            </button>
          </div>
        </StudyPanel>
      )}

      {error && <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm"><AlertTriangle className="w-4 h-4" /> {error}</StudyPanel>}

      {essay && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{essay.title}</h2>
            <button onClick={() => { setEssay(null); setTitle(""); setText(""); }} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-2 hover:bg-secondary/70">
              <RotateCcw className="w-3.5 h-3.5" /> New essay
            </button>
          </div>

          <StudyPanel className="p-6 flex items-center gap-5">
            <div className="relative w-20 h-20 grid place-items-center shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(essay.overall_score / 100) * 97.4} 97.4`} />
              </svg>
              <div className="absolute text-xl font-bold text-foreground">{essay.overall_score}</div>
            </div>
            <div>
              <div className="eyebrow">Overall score</div>
              <p className="text-[13px] text-foreground mt-1">{essay.summary}</p>
            </div>
          </StudyPanel>

          <div className="grid sm:grid-cols-2 gap-3">
            {DIMENSIONS.map((d) => {
              const dim = essay.analysis?.[d.key] || {};
              const score = Math.round(dim.score || 0);
              return (
                <StudyPanel key={d.key} className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-semibold text-foreground">{d.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: d.color }}>{score}/100</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, backgroundColor: d.color }} />
                  </div>
                  <p className="text-[12px] text-muted-foreground">{dim.feedback || "No feedback."}</p>
                </StudyPanel>
              );
            })}
          </div>

          {essay.strengths?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><div className="eyebrow">Strengths</div></div>
              <ul className="space-y-2">
                {essay.strengths.map((s, i) => <li key={i} className="flex gap-2 text-[13px] text-foreground"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" /> {s}</li>)}
              </ul>
            </StudyPanel>
          )}

          {essay.improvements?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3"><ArrowUpRight className="w-4 h-4 text-primary" /><div className="eyebrow">Improvements</div></div>
              <ul className="space-y-2">
                {essay.improvements.map((s, i) => <li key={i} className="flex gap-2 text-[13px] text-foreground"><ArrowUpRight className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {s}</li>)}
              </ul>
            </StudyPanel>
          )}
        </div>
      )}

      {!essay && past.length > 0 && (
        <div>
          <div className="eyebrow px-1 mb-2">Recent essays</div>
          <div className="space-y-2">
            {past.map((e) => (
              <button key={e.id} onClick={() => setEssay(e)} className="w-full text-left">
                <StudyPanel className="p-4 hover:bg-secondary/40">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground text-[13px]">{e.title}</span>
                    <span className="ml-auto text-[13px] font-bold text-primary">{e.overall_score}/100</span>
                  </div>
                </StudyPanel>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}