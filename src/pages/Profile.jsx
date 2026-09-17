import { useState, useEffect } from "react";
import { Navigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useAuth } from "@/lib/AuthContext";
import { SUBJECT_PRESETS, EDUCATION_LEVELS, GOAL_PRESETS, STUDY_TIME_OPTIONS } from "@/lib/subjectPresets";
import { computeConceptStatus, STATUS_LABELS, statusColor, computeSubjectMastery } from "@/lib/learnerState";
import StudyPanel from "@/components/StudyPanel";
import MasteryBar from "@/components/MasteryBar";
import ThemePicker from "@/components/ThemePicker";
import { Switch } from "@/components/ui/switch";
import { NOTIFICATION_PREF_DEFS, getNotificationPrefs, setNotificationPrefs } from "@/lib/appSettings";
import { Loader2, Plus, Trash2, Check, X, BookOpen, Palette, Layers, Settings, Bell, CreditCard, LogOut } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { profile, subjects, concepts, loading, error, reload } = useStudyOSData();
  const [newSubject, setNewSubject] = useState("");
  const [newConcept, setNewConcept] = useState({}); // subjectId -> name
  const [saving, setSaving] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState(getNotificationPrefs);
  const [savingGalaxy, setSavingGalaxy] = useState(false);

  useEffect(() => { setNotificationPrefs(notifPrefs); }, [notifPrefs]);

  const toggleGalaxy = async (next) => {
    if (!profile?.id) return;
    setSavingGalaxy(true);
    try {
      await base44.entities.LearnerProfile.update(profile.id, { galaxy_mode: next });
      await reload();
    } catch { /* ignore */ }
    setSavingGalaxy(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const addSubject = async (name) => {
    const preset = SUBJECT_PRESETS.find((p) => p.name === name);
    if (!name?.trim()) return;
    setSaving(true);
    try {
      const subject = await base44.entities.Subject.create({
        name: name.trim(),
        color: preset?.color || "#3B82F6",
        order_index: subjects.length,
        mastery_estimate: 0,
      });
      const conceptNames = preset?.concepts || [];
      if (conceptNames.length) {
        await base44.entities.Concept.bulkCreate(
          conceptNames.map((cn, i) => ({
            subject_id: subject.id,
            name: cn,
            importance: Math.round((1 - i / conceptNames.length) * 100) / 100,
            mastery: 0,
            status: "developing",
          }))
        );
      }
      setNewSubject("");
      await reload();
    } catch (e) { alert(e?.message || "Could not add subject"); }
    setSaving(false);
  };

  const deleteSubject = async (subject) => {
    if (!confirm(`Delete ${subject.name} and all its concepts? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const subs = concepts.filter((c) => c.subject_id === subject.id);
      if (subs.length) await base44.entities.Concept.deleteMany({ subject_id: subject.id });
      await base44.entities.Subject.delete(subject.id);
      await reload();
    } catch (e) { alert(e?.message || "Could not delete subject"); }
    setSaving(false);
  };

  const addConcept = async (subjectId) => {
    const name = (newConcept[subjectId] || "").trim();
    if (!name) return;
    setSaving(true);
    try {
      await base44.entities.Concept.create({
        subject_id: subjectId,
        name,
        importance: 0.5,
        mastery: 0,
        status: "developing",
      });
      setNewConcept((s) => ({ ...s, [subjectId]: "" }));
      await reload();
    } catch (e) { alert(e?.message || "Could not add concept"); }
    setSaving(false);
  };

  const deleteConcept = async (concept) => {
    setSaving(true);
    try {
      await base44.entities.Concept.delete(concept.id);
      await reload();
    } catch (e) { alert(e?.message || "Could not delete concept"); }
    setSaving(false);
  };

  const updateProfile = async (patch) => {
    setSaving(true);
    try {
      await base44.entities.LearnerProfile.update(profile.id, patch);
      await reload();
    } catch (e) { alert(e?.message || "Could not update profile"); }
    setSaving(false);
  };

  const eduLabel = EDUCATION_LEVELS.find((l) => l.value === profile.education_level)?.label || profile.education_level;

  return (
    <div className="max-w-[1100px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Account</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">Profile</h1>
      </div>

      {error && <div className="mb-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">Couldn't load data. Try refreshing.</div>}

      {/* Profile summary */}
      <StudyPanel className="p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="eyebrow">Name</div>
            <div className="text-sm text-foreground mt-1">{user?.full_name || "—"}</div>
            <div className="text-[11px] text-muted-foreground">{user?.email}</div>
          </div>
          <div>
            <label className="eyebrow">Education level</label>
            <select
              value={profile.education_level}
              onChange={(e) => updateProfile({ education_level: e.target.value })}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {EDUCATION_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow">Main goal</label>
            <select
              value={profile.main_goal}
              onChange={(e) => updateProfile({ main_goal: e.target.value })}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {GOAL_PRESETS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="eyebrow">Daily study time</label>
            <select
              value={profile.daily_study_minutes}
              onChange={(e) => updateProfile({ daily_study_minutes: Number(e.target.value) })}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {STUDY_TIME_OPTIONS.map((t) => <option key={t} value={t}>{t} min/day</option>)}
            </select>
          </div>
        </div>
      </StudyPanel>

      {/* Quick links */}
      <StudyPanel className="p-5 mb-4">
        <div className="eyebrow mb-3">Quick links</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/subject-hub" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary">
            <Layers className="w-4 h-4" /> Subject Hub
          </Link>
          <Link to="/help" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary">
            <BookOpen className="w-4 h-4" /> Help Center
          </Link>
        </div>
      </StudyPanel>

      {/* App settings */}
      <StudyPanel className="p-5 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-primary" />
          <div className="eyebrow">App settings</div>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4 text-primary" />
          <div className="text-[13px] font-semibold text-foreground">Display theme</div>
        </div>
        <p className="text-[12px] text-muted-foreground mb-3">Pick a background tint for the whole app. Saved on this device.</p>
        <ThemePicker />

        <div className="mt-5 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-primary" />
            <div className="text-[13px] font-semibold text-foreground">Notification preferences</div>
          </div>
          <p className="text-[12px] text-muted-foreground mb-3">Saved on this device.</p>
          <div className="space-y-3">
            {NOTIFICATION_PREF_DEFS.map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-foreground">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.desc}</div>
                </div>
                <Switch checked={!!notifPrefs[p.key]} onCheckedChange={(v) => setNotifPrefs((s) => ({ ...s, [p.key]: v }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">Galaxy mode</div>
            <div className="text-[11px] text-muted-foreground">Optimise layout for Galaxy/foldable devices.</div>
          </div>
          <Switch checked={!!profile.galaxy_mode} disabled={savingGalaxy} onCheckedChange={toggleGalaxy} />
        </div>

        <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-2">
          <Link to="/subscription" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary">
            <CreditCard className="w-4 h-4" /> Subscription
          </Link>
          <button
            onClick={() => base44.auth.logout("/")}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-[13px] font-semibold px-3 py-2 hover:bg-destructive/20"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </StudyPanel>

      {/* Add subject */}
      <StudyPanel className="p-5 mb-4">
        <div className="eyebrow mb-3">Add a subject</div>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_PRESETS.filter((p) => !subjects.some((s) => s.name === p.name)).map((p) => (
            <button
              key={p.name}
              onClick={() => addSubject(p.name)}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-[13px] hover:border-primary disabled:opacity-50"
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
              <Plus className="w-3.5 h-3.5" />
            </button>
          ))}
          {SUBJECT_PRESETS.filter((p) => !subjects.some((s) => s.name === p.name)).length === 0 && (
            <span className="text-[12px] text-muted-foreground">All preset subjects added. Add a custom one below.</span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Custom subject name…"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            onClick={() => addSubject(newSubject)}
            disabled={saving || !newSubject.trim()}
            className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </StudyPanel>

      {/* Subjects + concepts */}
      <div className="space-y-4">
        {subjects.length === 0 && (
          <StudyPanel className="p-8 text-center text-sm text-muted-foreground">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            No subjects yet. Add one above to start tracking concepts.
          </StudyPanel>
        )}
        {subjects.map((s) => {
          const subs = concepts.filter((c) => c.subject_id === s.id);
          const m = computeSubjectMastery(concepts, s.id);
          return (
            <StudyPanel key={s.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <h3 className="font-bold text-foreground">{s.name}</h3>
                  <span className="text-[11px] text-muted-foreground">{subs.length} concepts · {m}% mastery</span>
                </div>
                <button onClick={() => deleteSubject(s)} disabled={saving} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <MasteryBar value={m} color={s.color} className="mb-3" />
              <div className="space-y-1.5">
                {subs.map((c) => {
                  const st = computeConceptStatus(c.mastery);
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-border last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-foreground truncate">{c.name}</div>
                        <div className="text-[10px] text-muted-foreground">importance {Math.round((c.importance || 0) * 100)}%</div>
                      </div>
                      <span className="text-[11px] font-semibold" style={{ color: statusColor(st) }}>{STATUS_LABELS[st]}</span>
                      <span className="text-[12px] text-muted-foreground w-8 text-right">{c.mastery || 0}%</span>
                      <button onClick={() => deleteConcept(c)} disabled={saving} className="text-muted-foreground hover:text-destructive disabled:opacity-50">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {subs.length === 0 && <div className="text-[12px] text-muted-foreground py-2">No concepts yet.</div>}
              </div>
              <div className="flex gap-2 mt-3">
                <input
                  value={newConcept[s.id] || ""}
                  onChange={(e) => setNewConcept((prev) => ({ ...prev, [s.id]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addConcept(s.id)}
                  placeholder="Add a concept…"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button onClick={() => addConcept(s.id)} disabled={saving || !(newConcept[s.id] || "").trim()} className="rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-2 disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </StudyPanel>
          );
        })}
      </div>
    </div>
  );
}