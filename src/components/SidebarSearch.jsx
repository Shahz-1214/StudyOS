// The sidebar's own search: a real input that searches in place, so it works
// from wherever you are instead of handing you off to the Home screen.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useSearchResults } from "@/hooks/useSearchResults";
import SearchResultsPanel from "@/components/search/SearchResultsPanel";

export default function SidebarSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const query = q.trim();
  const { subjects, concepts, resources, busy } = useSearchResults(query);

  // ⌘K / Ctrl+K focuses the sidebar search on desktop. On a narrow screen,
  // where the sidebar is hidden, it hands off to the Home bar instead.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.metaKey || e.ctrlKey) || String(e.key).toLowerCase() !== "k") return;
      e.preventDefault();
      if (window.matchMedia("(min-width: 768px)").matches) {
        setOpen(true);
        inputRef.current?.focus();
      } else {
        navigate("/", { state: { focusSearch: Date.now() } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const close = () => { setOpen(false); setQ(""); };

  return (
    <div className="relative mt-4">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          placeholder="Search StudyOS…"
          aria-label="Search StudyOS"
          className="w-full rounded-xl border border-border bg-elevated py-2 pl-8 pr-7 text-[11px] text-foreground transition-colors duration-150 placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
        />
        {q && (
          <button onClick={close} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!!query && open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[360px] study-panel p-2 max-h-[70vh] overflow-y-auto">
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