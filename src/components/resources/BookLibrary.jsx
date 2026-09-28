// The learner's book list for their own board. Board-scoped on the server, so
// another board's books can never appear here. Class, medium and subject
// options are read from the records that actually exist.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StudyPanel from "@/components/StudyPanel";
import BookCard from "@/components/resources/BookCard";
import BookFilters from "@/components/resources/BookFilters";
import { BookOpen, Loader2, Settings2 } from "lucide-react";

const EMPTY_FILTERS = { class_or_year: "", medium: "", subject_name: "" };

export default function BookLibrary({ boardId, title = "Your board's textbooks" }) {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ classes: [], mediums: [], subjects: [] });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [loading, setLoading] = useState(false);

  // Option lists: distinct values that genuinely exist on this board's textbooks.
  useEffect(() => {
    if (!boardId) return;
    const base = { board_id: boardId, resource_type: "official_textbook", active: true };
    Promise.all([
      base44.entities.BoardResource.list({ ...base, distinct: "class_or_year" }),
      base44.entities.BoardResource.list({ ...base, distinct: "medium" }),
      base44.entities.BoardResource.list({ ...base, distinct: "subject_name" }),
    ])
      .then(([c, m, s]) => setOptions({
        classes: (c?.items || []).filter(Boolean),
        mediums: (m?.items || []).filter(Boolean),
        subjects: (s?.items || []).filter(Boolean),
      }))
      .catch(() => setOptions({ classes: [], mediums: [], subjects: [] }));
  }, [boardId]);

  // The list itself is always a server query with the current selections.
  useEffect(() => {
    if (!boardId) { setRows([]); return; }
    const query = { board_id: boardId, resource_type: "official_textbook", active: true };
    if (filters.class_or_year) query.class_or_year = filters.class_or_year;
    if (filters.medium) query.medium = filters.medium;
    if (filters.subject_name) query.subject_name = filters.subject_name;
    setLoading(true);
    base44.entities.BoardResource
      .filter(query, { sort: "subject_name", limit: 100 })
      .then((r) => setRows(r?.items || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [boardId, filters]);

  // Learners only ever see their own board's library. An admin keeps the panel
  // (and its Textbook import entry) even with no board set, so the operator tool
  // is never hidden by learner profile state.
  if (!boardId && user?.role !== "admin") return null;

  const grouped = rows.reduce((acc, b) => {
    const k = b.subject_name || "Other";
    (acc[k] = acc[k] || []).push(b);
    return acc;
  }, {});

  return (
    <StudyPanel className="p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <BookOpen className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-bold text-foreground">{title}</h3>
        {user?.role === "admin" && (
          <Link
            to="/admin/textbooks"
            className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <Settings2 className="w-3.5 h-3.5" /> Import books
          </Link>
        )}
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">
        Official textbooks registered for your board. Only what is actually registered is listed.
      </p>

      {boardId && <BookFilters options={options} value={filters} onChange={setFilters} />}

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-elevated p-4 text-[12px] text-muted-foreground">
          {boardId
            ? "No verified textbook is currently registered for this board with these filters."
            : "No board is set on your profile, so there is no board library to show. Textbook copies can still be registered and stored in Textbook import."}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([subject, books]) => (
            <div key={subject}>
              <div className="eyebrow mb-2">{subject}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {books.map((b) => <BookCard key={b.id} book={b} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </StudyPanel>
  );
}