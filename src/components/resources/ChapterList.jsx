// Chapters established for one textbook. Chapters come from the book's own
// structure (outline, table of contents, or an operator-supplied map) — never
// from inference. A grounded chapter can be taken straight into the existing
// Note → Quiz workflow, seeded with that chapter's own text.
import { useNavigate } from "react-router-dom";
import { List, FileText, Sparkles } from "lucide-react";

export default function ChapterList({ chapters, currentPage, onSelectPage }) {
  const navigate = useNavigate();
  if (!chapters.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <List className="w-4 h-4 text-primary" />
        <h3 className="text-[13px] font-bold text-foreground">Chapters</h3>
        <span className="text-[11px] text-muted-foreground">{chapters.length}</span>
      </div>
      <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
        {chapters.map((c) => {
          const grounded = !!c.source_digest;
          const active = currentPage >= c.start_page && currentPage <= c.end_page;
          return (
            <div
              key={c.id}
              className={`rounded-lg border px-3 py-2 transition-colors ${
                active ? "border-primary/50 bg-primary/10" : "border-border"
              }`}
            >
              <button onClick={() => onSelectPage(c.start_page)} className="w-full text-left">
                <div className="text-[12px] font-semibold text-foreground">
                  {c.chapter_index}. {c.chapter_title}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  p. {c.start_page}{c.end_page !== c.start_page ? "–" + c.end_page : ""}
                </div>
              </button>
              {grounded ? (
                <button
                  onMouseDown={() => navigate(`/tool/note-quiz?chapter=${c.id}`)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:opacity-80"
                >
                  <Sparkles className="w-3 h-3" /> Quiz this chapter
                </button>
              ) : (
                <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <FileText className="w-3 h-3" /> no text indexed for this chapter
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}