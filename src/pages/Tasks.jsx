import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, CheckSquare, Plus, Trash2, Circle, CheckCircle2, RefreshCw, Calendar } from "lucide-react";

const TYPE_LABELS = { study_block: "Study block", quiz: "Quiz", review: "Review", deadline: "Deadline", custom: "Task" };
const PRIORITY_COLOR = { low: "text-slate-400", medium: "text-amber-500", high: "text-rose-500" };

export default function Tasks() {
  const { user } = useAuth();
  const { profile, subjects, loading } = useStudyOSData();
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState(true);
  const [filter, setFilter] = useState("todo");
  const [form, setForm] = useState({ title: "", type: "custom", priority: "medium", subject_id: "", due_date: "" });

  async function load() {
    setBusy(true);
    const list = await base44.entities.Task.list("-created_date", 200);
    setTasks(list);
    setBusy(false);
  }
  useEffect(() => { if (user) load(); }, [user]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const subjectName = (id) => subjects.find((s) => s.id === id)?.name || "";

  async function addTask(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await base44.entities.Task.create({
      title: form.title.trim(),
      type: form.type, priority: form.priority,
      subject_id: form.subject_id || undefined,
      due_date: form.due_date || undefined,
      source: "manual", status: "todo",
    });
    track(EVENTS.TASK_CREATED, { type: form.type });
    setForm({ title: "", type: "custom", priority: "medium", subject_id: "", due_date: "" });
    load();
  }

  async function toggle(t) {
    await base44.entities.Task.update(t.id, { status: t.status === "done" ? "todo" : "done" });
    load();
  }

  async function remove(t) {
    await base44.entities.Task.delete(t.id);
    load();
  }

  const filtered = filter === "all" ? tasks : tasks.filter((t) => (filter === "done" ? t.status === "done" : t.status !== "done"));
  const counts = { todo: tasks.filter((t) => t.status !== "done").length, done: tasks.filter((t) => t.status === "done").length, all: tasks.length };

  return (
    <div className="max-w-[860px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Plan · Stage 6</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-primary" /> Tasks
        </h1>
        <p className="text-sm text-muted-foreground mt-1">One canonical task layer — deadlines, study blocks, quizzes, and reviews across every module. StudySync writes here automatically.</p>
      </div>

      <StudyPanel className="p-5 mb-5">
        <form onSubmit={addTask} className="flex flex-col gap-3">
          <input
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Add a task — e.g. Finish calculus problem set"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground">
              {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
            <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground">
              <option value="">No subject</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground" />
          </div>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
            <Plus className="w-4 h-4" /> Add task
          </button>
        </form>
      </StudyPanel>

      <div className="flex items-center gap-2 mb-4">
        {[["todo", `To do (${counts.todo})`], ["done", `Done (${counts.done})`], ["all", `All (${counts.all})`]].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${filter === k ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}>{l}</button>
        ))}
      </div>

      {busy ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <StudyPanel className="p-8 text-center">
          <Circle className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No tasks here. Add one above, or run StudySync to generate tasks from your recent activity.</p>
        </StudyPanel>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <StudyPanel key={t.id} className="p-4 flex items-center gap-3">
              <button onClick={() => toggle(t)} className="shrink-0">
                {t.status === "done"
                  ? <CheckCircle2 className="w-5 h-5 text-primary" />
                  : <Circle className="w-5 h-5 text-muted-foreground hover:text-primary" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className={`text-[14px] font-medium text-foreground ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground">{TYPE_LABELS[t.type] || "Task"}</span>
                  {subjectName(t.subject_id) && <span className="text-[11px] text-muted-foreground">· {subjectName(t.subject_id)}</span>}
                  {t.due_date && <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {t.due_date}</span>}
                  {t.source === "studysync" && <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">Sync</span>}
                  <span className={`text-[11px] font-semibold ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                </div>
              </div>
              <button onClick={() => remove(t)} className="shrink-0 text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </StudyPanel>
          ))}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 text-[12px] text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5" /> <a href="/tool/studysync" className="text-primary hover:underline">Run StudySync</a> to auto-generate tasks from your quiz, exam, and lecture activity.
      </div>
    </div>
  );
}