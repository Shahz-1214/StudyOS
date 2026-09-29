// Results list shared by every search entry point (the Home bar and the
// sidebar). Matching happens in useSearchResults; this component only renders
// what was found. The caller owns positioning and closing.
import { useNavigate } from "react-router-dom";
import { Brain, FileText, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { RESOURCE_TYPE_LABEL, AUTHORITY_LABEL } from "@/lib/resourceMeta";
import { SEARCH_MIN_QUERY } from "@/hooks/useSearchResults";

function resourceMeta(r) {
  const typeLabel = RESOURCE_TYPE_LABEL[r.resource_type] || "Board resource";
  const authority = r.authority_level && AUTHORITY_LABEL[r.authority_level]
    ? ` · ${AUTHORITY_LABEL[r.authority_level]}`
    : "";
  return `${typeLabel}${authority}`;
}

export default function SearchResultsPanel({ query, busy, concepts, resources, subjects, onSelect }) {
  const navigate = useNavigate();
  const hasResults = concepts.length > 0 || resources.length > 0;

  return (
    <>
      {busy && (
        <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching board resources…
        </div>
      )}

      {!busy && !hasResults && (
        <div className="px-3 py-5 text-center text-sm text-muted-foreground">
          No matches for "{query}".
          <div className="text-[11px] mt-1">
            {query.length < SEARCH_MIN_QUERY
              ? `Type at least ${SEARCH_MIN_QUERY} characters to search your concepts and your board's resources.`
              : "Searches your concepts and your board's registered resources."}
          </div>
        </div>
      )}

      {concepts.length > 0 && (
        <div className="mb-1">
          <div className="eyebrow px-2 py-1.5">Your concepts</div>
          {concepts.map((c) => {
            const subject = subjects.find((s) => s.id === c.subject_id);
            return (
              <button
                key={c.id}
                onMouseDown={() => { navigate("/practice"); onSelect?.(); }}
                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60"
              >
                <Brain className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-foreground truncate">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{subject?.name || "No subject"} · {c.mastery || 0}% mastery</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {resources.length > 0 && (
        <div>
          <div className="eyebrow px-2 py-1.5">Board resources</div>
          {resources.map((r) => {
            const meta = resourceMeta(r);
            // A stored textbook opens in the in-app reader; everything else
            // opens its official source.
            if (r.resource_type === "official_textbook" && r.stored_file_uri) {
              return (
                <button
                  key={r.id}
                  onMouseDown={() => { navigate(`/book/${r.id}`); onSelect?.(); }}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60"
                >
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground truncate">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground">{meta}</div>
                  </div>
                </button>
              );
            }
            if (!r.url) {
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground truncate">{r.title}</div>
                    <div className="text-[10px] text-muted-foreground">{meta} · no source link recorded</div>
                  </div>
                </div>
              );
            }
            return (
              <a
                key={r.id}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onSelect?.()}
                className="w-full flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-secondary/60"
              >
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-foreground truncate">{r.title}</div>
                  <div className="text-[10px] text-muted-foreground">{meta}</div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}