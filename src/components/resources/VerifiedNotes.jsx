// Verified notes/reference for the learner's board, shown inside Note → Quiz.
// Users open these for reference, then paste their own notes to generate a quiz.
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import { AUTHORITY_LABEL } from "@/lib/resourceMeta";
import { Loader2, FileText, ExternalLink, Info } from "lucide-react";

export default function VerifiedNotes({ boardId }) {
  const [notes, setNotes] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!boardId) { setNotes([]); return; }
    setBusy(true);
    base44.entities.BoardResource.filter({ board_id: boardId, resource_type: "notes", active: true })
      .then((r) => setNotes(r))
      .catch(() => setNotes([]))
      .finally(() => setBusy(false));
  }, [boardId]);

  if (!boardId) {
    return (
      <StudyPanel className="p-5 mb-4">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" /> Set your board during onboarding to see verified notes here.
        </div>
      </StudyPanel>
    );
  }
  if (busy) return <div className="mb-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  if (!notes.length) return null;

  return (
    <StudyPanel className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-foreground text-[14px]">Verified notes for your board</h3>
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">Open these for reference, then paste your notes below to generate a quiz.</p>
      <div className="space-y-2">
        {notes.map((n) => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 hover:border-primary/40">
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-foreground truncate">{n.title}</div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                {n.provider}
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">· {AUTHORITY_LABEL[n.authority_level] || n.authority_level}</span>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
          </a>
        ))}
      </div>
    </StudyPanel>
  );
}