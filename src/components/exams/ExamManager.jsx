import { useState } from "react";
import { base44 } from "@/api/base44Client";
import StudyPanel from "@/components/StudyPanel";
import { Plus, Pencil, Check, X, CalendarClock, Archive } from "lucide-react";

const EXAM_TYPES = [
  { value: "board", label: "Board exam" },
  { value: "school", label: "School exam" },
  { value: "mock", label: "Mock / practice" },
  { value: "university", label: "University exam" },
  { value: "entrance", label: "Entrance test" },
  { value: "other", label: "Other" },
];

const EMPTY = { title: "", exam_date: "", exam_type: "board", subject_id: "", notes: "" };

// Add / edit / archive the learner's personal exams. Distinct from board
// ExamSeries (public registry). Used inside ExamPilot.
export default function ExamManager({ profile, subjects, exams, onChange }) {
  const [draft, setDraft] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const upcoming = (exams || [])
    .filter((e) => !e.archived && e.status === "upcoming")
    .sort((a, b) => String(a.exam_date).localeCompare(String(b.exam_date)));

  async function add() {
    if (!draft.title.trim() || !draft.exam_date) { setErr("Title and date are required."); return; }
    setBusy(true); setErr(null);
    try {
      await base44.entities.LearnerExam.create({
        ...draft,
        title: draft.title.trim(),
        learner_profile_id: profile?.id || "",
        board_id: profile?.board_id || "",
        status: "upcoming",
        archived: false,
      });
      setDraft(EMPTY);
      await onChange?.();
    } catch (e) { setErr("Couldn't save the exam."); }
    setBusy(false);
  }

  async function saveEdit(id) {
    if (!draft.title.trim() || !draft.exam_date) { setErr("Title and date are required."); return; }
    setBusy(true); setErr(null);
    try {
      await base44.entities.LearnerExam.update(id, {
        title: draft.title.trim(),
        exam_date: draft.exam_date,
        exam_type: draft.exam_type,
        subject_id: draft.subject_id,
        notes: draft.notes,
      });
      setEditingId(null); setDraft(EMPTY);
      await onChange?.();
    } catch (e) { setErr("Couldn't update the exam."); }
    setBusy(false);
  }

  async function archive(id) {
    setBusy(true); setErr(null);
    try {
      await base44.entities.LearnerExam.update(id, { archived: true, status: "cancelled" });
      await onChange?.();
    } catch (e) { setErr("Couldn't archive the exam."); }
    setBusy(false);
  }

  function startEdit(e) {
    setEditingId(e.id);
    setDraft({ title: e.title, exam_date: e.exam_date, exam_type: e.exam_type || "board", subject_id: e.subject_id || "", notes: e.notes || "" });
  }

  function cancelEdit() { setEditingId(null); setDraft(EMPTY); }

  return (
    <StudyPanel className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-foreground text-[15px]">Your exams</h3>
      </div>

      {upcoming.length === 0 && (
        <p className="text-[13px] text-muted-foreground mb-4">No personal exams added yet. Add your real exam dates below — ExamPilot will build your plan around them.</p>
      )}

      <div className="space-y-2 mb-4">
        {upcoming.map((e) => {
          const subj = subjects.find((s) => s.id === e.subject_id);
          const editing = editingId === e.id;
          if (editing) {
            return (
              <div key={e.id} className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} placeholder="Exam title"
                    className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input type="date" value={draft.exam_date} onChange={(ev) => setDraft({ ...draft, exam_date: ev.target.value })}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <select value={draft.exam_type} onChange={(ev) => setDraft({ ...draft, exam_type: ev.target.value })}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <select value={draft.subject_id} onChange={(ev) => setDraft({ ...draft, subject_id: ev.target.value })}
                    className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">No specific subject</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <input value={draft.notes} onChange={(ev) => setDraft({ ...draft, notes: ev.target.value })} placeholder="Notes (optional)"
                    className="sm:col-span-2 rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => saveEdit(e.id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-1.5 disabled:opacity-40">
                    <Check className="w-3.5 h-3.5" /> Save
                  </button>
                  <button onClick={cancelEdit} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground text-[12px] font-semibold px-3 py-1.5">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground truncate">{e.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(`${e.exam_date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  {subj ? ` · ${subj.name}` : ""} · {EXAM_TYPES.find((t) => t.value === e.exam_type)?.label || e.exam_type}
                </div>
              </div>
              <button onClick={() => startEdit(e)} disabled={busy} className="text-muted-foreground hover:text-foreground p-1.5">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => archive(e.id)} disabled={busy} className="text-muted-foreground hover:text-destructive p-1.5">
                <Archive className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new (when not editing) */}
      {editingId === null && (
        <div className="rounded-lg border border-dashed border-border p-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <input value={draft.title} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} placeholder="Exam title (e.g. Physics Paper 1)"
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <input type="date" value={draft.exam_date} onChange={(ev) => setDraft({ ...draft, exam_date: ev.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <select value={draft.exam_type} onChange={(ev) => setDraft({ ...draft, exam_type: ev.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={draft.subject_id} onChange={(ev) => setDraft({ ...draft, subject_id: ev.target.value })}
              className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">No specific subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={add} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-1.5 disabled:opacity-40">
              <Plus className="w-3.5 h-3.5" /> Add exam
            </button>
          </div>
        </div>
      )}

      {err && <p className="mt-2 text-[12px] text-destructive">{err}</p>}
    </StudyPanel>
  );
}