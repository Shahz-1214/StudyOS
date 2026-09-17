// Quick global search across the user's concepts (per subject) and board note
// resources. Concepts come from the loaded learner state; notes are the
// verified note/guide/textbook resources for the user's board.
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, X, Brain, FileText, ExternalLink } from "lucide-react";

const NOTE_TYPES = new Set(["notes", "guide", "official_textbook"]);

export default function GlobalSearch({ concepts, subjects, boardId }) {
  const [q, setQ] = useState("");
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!boardId) return;
    base44.entities.BoardResource.filter({ board_id: boardId }, "-created_date", 200)
      .then((rows) => setNotes((rows || []).filter((r) => NOTE_TYPES.has(r.resource_type))))
      .catch(() => {});
  }, [boardId]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return { concepts: [], notes: [] };
    return {
      concepts: concepts
        .filter((c) => (c.name || "").toLowerCase().includes(query))
        .slice(0, 6)
        .map((c) => ({ ...c, subject: subjects.find((s) => s.id === c.subject_id) })),
      notes: notes.filter((n) => (n.title || "").toLowerCase().includes(query)).slice(0, 4),
    };
  }, [q, concepts, subjects, notes]);

  const hasResults = results.concepts.length > 0 || results.notes.length > 0;
  const showPanel = q.trim().length > 0 && open;

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search concepts or notes across your subjects…"
          className="w-full rounded-lg border border-border bg-card pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute z-30 mt-2 w-full study-panel p-2 max-h-[420px] overflow-y-auto">
          {!hasResults && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for "{q}".</div>
          )}
          {results.concepts.length > 0 && (
            <div className="mb-1">
              <div className="eyebrow px-2 py-1.5">Concepts</div>
              {results.concepts.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={() => { navigate("/practice"); setOpen(false); }}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60"
                >
                  <Brain className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.subject?.name || "—"} · {c.mastery || 0}%</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.notes.length > 0 && (
            <div>
              <div className="eyebrow px-2 py-1.5">Notes</div>
              {results.notes.map((n) => (
                <a
                  key={n.id}
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={() => setOpen(false)}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/60"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground truncate">{n.title}</div>
                    <div className="text-[10px] text-muted-foreground">{n.provider || "Board resource"}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}