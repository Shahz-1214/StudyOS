// Search bar on the Home screen. The matching lives in useSearchResults; this
// file is the input plus its results panel. It is also where the mobile search
// button lands, so it can be focused from a navigation handoff.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useSearchResults } from "@/hooks/useSearchResults";
import SearchResultsPanel from "@/components/search/SearchResultsPanel";

export default function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const location = useLocation();

  const query = q.trim();
  const { subjects, concepts, resources, busy } = useSearchResults(query);

  // The mobile header button hands off through navigation state, so focus the
  // field and open the panel — the handoff has to actually start a search.
  useEffect(() => {
    if (!location.state?.focusSearch) return;
    setOpen(true);
    inputRef.current?.focus();
  }, [location.state]);

  const close = () => { setOpen(false); setQ(""); };

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

      {!!query && open && (
        <div className="absolute z-30 mt-2 w-full study-panel p-2 max-h-[420px] overflow-y-auto">
          <SearchResultsPanel
            query={query}
            busy={busy}
            concepts={concepts}
            resources={resources}
            subjects={subjects}
            onSelect={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}