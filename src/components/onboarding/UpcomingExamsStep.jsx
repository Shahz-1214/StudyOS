import { useState } from "react";
import { Plus, X, CalendarClock } from "lucide-react";

const EXAM_TYPES = [
  { value: "board", label: "Board exam" },
  { value: "school", label: "School exam" },
  { value: "mock", label: "Mock / practice" },
  { value: "university", label: "University exam" },
  { value: "entrance", label: "Entrance test" },
  { value: "other", label: "Other" },
];

// Optional onboarding step: add zero or more upcoming personal exams.
// Never forces entry — the user can continue with an empty list.
export default function UpcomingExamsStep({ exams, setExams }) {
  const [draft, setDraft] = useState({ title: "", exam_date: "", exam_type: "board" });

  function add() {
    if (!draft.title.trim() || !draft.exam_date) return;
    setExams([...exams, { ...draft, title: draft.title.trim() }]);
    setDraft({ title: "", exam_date: "", exam_type: "board" });
  }

  function remove(i) {
    setExams(exams.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-foreground">Any upcoming exams?</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-4">Optional. Add real exam dates and ExamPilot will build your revision plan around them. You can skip this and add exams later.</p>

      {exams.length > 0 && (
        <div className="space-y-2 mb-4">
          {exams.map((e, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <CalendarClock className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground truncate">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(`${e.exam_date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  {" · "}{EXAM_TYPES.find((t) => t.value === e.exam_type)?.label || e.exam_type}
                </div>
              </div>
              <button onClick={() => remove(i)} className="text-muted-foreground hover:text-destructive p-1.5">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-dashed border-border p-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Exam title (e.g. Physics Paper 1)"
            className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <input type="date" value={draft.exam_date} onChange={(e) => setDraft({ ...draft, exam_date: e.target.value })}
            className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          <select value={draft.exam_type} onChange={(e) => setDraft({ ...draft, exam_type: e.target.value })}
            className="sm:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <button onClick={add} disabled={!draft.title.trim() || !draft.exam_date}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground text-[12px] font-semibold px-3 py-1.5 disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add this exam
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">{exams.length} exam{exams.length === 1 ? "" : "s"} added · skip if you don't have any yet</p>
    </div>
  );
}