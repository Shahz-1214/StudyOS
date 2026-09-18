import { useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, Archive, Trash2, ExternalLink, Bookmark, ChevronLeft, ChevronRight } from "lucide-react";

const TYPE_LABEL = {
  official_past_paper: "Official past paper",
  official_specimen: "Specimen / sample",
  official_mark_scheme: "Mark scheme",
  official_model_paper: "Model paper",
  notes: "Notes",
  quiz: "Practice",
};

export default function ExamVault() {
  const { user } = useAuth();
  const { profile, subjects, loading } = useStudyOSData();
  const [saved, setSaved] = useState([]);
  const [busy, setBusy] = useState(true);
  const [noteDraft, setNoteDraft] = useState({});

  async function load() {
    setBusy(true);
    try { setSaved(await base44.entities.SavedPaper.list("-created_date", 200)); } catch { /* ignore */ }
    setBusy(false);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function remove(id) {
    try { await base44.entities.SavedPaper.delete(id); setSaved((s) => s.filter((p) => p.id !== id)); } catch { /* ignore */ }
  }
  async function assignSubject(id, subjectId) {
    try {
      await base44.entities.SavedPaper.update(id, { subject_id: subjectId });
      setSaved((s) => s.map((p) => p.id === id ? { ...p, subject_id: subjectId } : p));
    } catch { /* ignore */ }
  }
  async function saveNote(id) {
    // Blur without editing (no draft for this row) must not clear the stored note.
    if (!(id in noteDraft)) return;
    const v = noteDraft[id];
    try {
      await base44.entities.SavedPaper.update(id, { note: v });
      setSaved((s) => s.map((p) => p.id === id ? { ...p, note: v } : p));
      setNoteDraft((d) => { const n = { ...d }; delete n[id]; return n; });
    } catch { /* ignore */ }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  // Group saved papers by subject ("" = Unassigned).
  const groups = {};
  for (const p of saved) {
    const k = p.subject_id || "";
    (groups[k] = groups[k] || []).push(p);
  }
  const groupOrder = ["" , ...subjects.filter((s) => groups[s.id]).map((s) => s.id)];

  return (
    <div className="max-w-[960px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/past-papers" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          <ChevronLeft className="w-4 h-4" /> Back to Past Papers
        </Link>
        <Link to="/tool/exampilot" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          ExamPilot <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="mb-6">
        <div className="eyebrow">ExamPilot · Library</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Archive className="w-6 h-6 text-primary" /> Exam Vault
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your personal library of saved past papers. Organise by subject, add notes, and open them anytime.</p>
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : saved.length === 0 ? (
        <StudyPanel className="p-8 text-center">
          <Bookmark className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No saved papers yet. Save past papers from the Past Papers page to build your vault.</p>
          <Link to="/past-papers" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2">
            Browse past papers
          </Link>
        </StudyPanel>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((gid) => {
            const subject = subjects.find((s) => s.id === gid);
            const label = gid ? (subject?.name || "Assigned") : "Unassigned";
            const items = groups[gid] || [];
            if (!items.length) return null;
            return (
              <div key={gid}>
                <div className="flex items-center gap-2 mb-3">
                  {gid && subject && <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject.color }} />}
                  <h2 className="text-[15px] font-bold text-foreground">{label}</h2>
                  <span className="text-[11px] text-muted-foreground">· {items.length}</span>
                </div>
                <div className="space-y-3">
                  {items.map((p) => (
                    <StudyPanel key={p.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold text-foreground hover:opacity-80 flex items-center gap-1">
                            {p.title} <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                            <span>{p.provider}</span>
                            <span className="text-[10px] uppercase tracking-wide">{TYPE_LABEL[p.resource_type] || p.resource_type}</span>
                          </div>
                        </div>
                        <button onClick={() => remove(p.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2 mt-3">
                        <select
                          value={p.subject_id || ""}
                          onChange={(e) => assignSubject(p.id, e.target.value)}
                          className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
                        >
                          <option value="">Unassigned</option>
                          {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <input
                          value={noteDraft[p.id] ?? p.note ?? ""}
                          onChange={(e) => setNoteDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onBlur={() => saveNote(p.id)}
                          placeholder="Add a note…"
                          className="rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
                        />
                      </div>
                    </StudyPanel>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}