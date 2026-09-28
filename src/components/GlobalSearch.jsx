// Quick global search across the learner's own concepts and their board's
// resources. Concepts are matched from the already-loaded learner state;
// board resources are matched on the server (title match, board-scoped), so
// past papers, syllabus, timetables, notes and textbooks are all findable —
// not just the handful of resources loaded on the current page.
import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Search, X, Brain, FileText, ExternalLink, BookOpen, Loader2 } from "lucide-react";
import { RESOURCE_TYPE_LABEL, AUTHORITY_LABEL } from "@/lib/resourceMeta";

const MAX_CONCEPTS = 8;
const MAX_RESOURCES = 12;
const MIN_QUERY = 2;

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default function GlobalSearch({ concepts, subjects, boardId }) {
  const [q, setQ] = useState("");
  const [resources, setResources] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);

  const query = q.trim();

  // The sidebar "Find anything" control and ⌘K land here, so focus the field
  // and open the panel — the handoff has to actually start a search.
  useEffect(() => {
    if (!location.state?.focusSearch) return;
    setOpen(true);
    inputRef.current?.focus();
  }, [location.state]);

  // Board resources: matched on the server against the board's own registry,
  // so every registered resource type is searchable.
  useEffect(() => {
    if (!boardId || query.length < MIN_QUERY) {
      setResources([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    base44.entities.BoardResource.filter(
      { board_id: boardId, active: true, title: { $regex: escapeRegex(query), $options: "i" } },
      "-created_date",
      MAX_RESOURCES
    )
      .then((rows) => {
        if (!cancelled) setResources(Array.isArray(rows) ? rows : (rows?.items || []));
      })
      .catch(() => {
        if (!cancelled) setResources([]);
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => { cancelled = true; };
  }, [boardId, query]);

  const results = useMemo(() => {
    if (!query) return { concepts: [], resources: [] };
    const needle = query.toLowerCase();
    const seen = new Set();
    const matched = [];
    for (const c of concepts) {
      if (!(c.name || "").toLowerCase().includes(needle)) continue;
      // The same concept name can repeat within one subject; show it once.
      const key = `${c.subject_id}::${(c.name || "").toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matched.push({ ...c, subject: subjects.find((s) => s.id === c.subject_id) });
      if (matched.length >= MAX_CONCEPTS) break;
    }
    return { concepts: matched, resources: query.length < MIN_QUERY ? [] : resources };
  }, [query, concepts, subjects, resources]);

  const hasResults = results.concepts.length > 0 || results.resources.length > 0;
  const showPanel = !!query && open;

  const close = () => { setOpen(false); setQ(""); };

  function resourceMeta(r) {
    const typeLabel = RESOURCE_TYPE_LABEL[r.resource_type] || "Board resource";
    const authority = r.authority_level && AUTHORITY_LABEL[r.authority_level]
      ? ` · ${AUTHORITY_LABEL[r.authority_level]}`
      : "";
    return `${typeLabel}${authority}`;
  }

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          placeholder="Search concepts, past papers, books or syllabus…"
          className="w-full rounded-lg border border-border bg-card pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {q && (
          <button onClick={close} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showPanel && (
        <div className="absolute z-30 mt-2 w-full study-panel p-2 max-h-[420px] overflow-y-auto">
          {searching && (
            <div className="flex items-center gap-2 px-3 py-2 text-[12px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching board resources…
            </div>
          )}

          {!hasResults && !searching && (
            <div className="px-3 py-5 text-center text-sm text-muted-foreground">
              No matches for "{query}".
              <div className="text-[11px] mt-1">
                {query.length < MIN_QUERY
                  ? "Type at least 2 characters to search your board's resources."
                  : "Searches your concepts and your board's registered resources."}
              </div>
            </div>
          )}

          {results.concepts.length > 0 && (
            <div className="mb-1">
              <div className="eyebrow px-2 py-1.5">Your concepts</div>
              {results.concepts.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={() => { navigate("/practice"); setOpen(false); }}
                  className="w-full flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary/60"
                >
                  <Brain className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.subject?.name || "No subject"} · {c.mastery || 0}% mastery</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.resources.length > 0 && (
            <div>
              <div className="eyebrow px-2 py-1.5">Board resources</div>
              {results.resources.map((r) => {
                const meta = resourceMeta(r);
                // A stored textbook opens in the in-app reader; everything else
                // opens its official source.
                if (r.resource_type === "official_textbook" && r.stored_file_uri) {
                  return (
                    <button
                      key={r.id}
                      onMouseDown={() => { navigate(`/book/${r.id}`); setOpen(false); }}
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
                    onClick={() => setOpen(false)}
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
        </div>
      )}
    </div>
  );
}