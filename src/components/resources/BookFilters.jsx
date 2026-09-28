// Filters for the book list. Every option comes from values that actually
// exist on registered textbook records — nothing is invented, and an empty
// option list means the board genuinely has nothing registered for it.
const selectClass =
  "rounded-lg border border-border bg-card px-2.5 py-1.5 text-[12px] text-foreground focus:outline-none focus:border-primary";

const MEDIUM_LABEL = { english: "English Medium", urdu: "Urdu Medium", unspecified: "Medium not specified" };

export default function BookFilters({ options, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <select className={selectClass} value={value.class_or_year} onChange={(e) => set({ class_or_year: e.target.value })} aria-label="Filter by class">
        <option value="">All classes</option>
        {options.classes.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select className={selectClass} value={value.medium} onChange={(e) => set({ medium: e.target.value })} aria-label="Filter by medium">
        <option value="">All media</option>
        {options.mediums.map((m) => <option key={m} value={m}>{MEDIUM_LABEL[m] || m}</option>)}
      </select>

      <select className={selectClass} value={value.subject_name} onChange={(e) => set({ subject_name: e.target.value })} aria-label="Filter by subject">
        <option value="">All subjects</option>
        {options.subjects.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}