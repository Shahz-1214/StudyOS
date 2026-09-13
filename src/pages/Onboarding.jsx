import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { track, EVENTS } from "@/lib/analytics";
import { SUBJECT_PRESETS, EDUCATION_LEVELS, GOAL_PRESETS, STUDY_TIME_OPTIONS } from "@/lib/subjectPresets";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, Check, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";

const STEPS = ["Education", "Subjects", "Goal", "Study time"];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const [education, setEducation] = useState("high_school");
  const [selectedSubjects, setSelectedSubjects] = useState(["Mathematics", "Physics"]);
  const [goal, setGoal] = useState(GOAL_PRESETS[0]);
  const [studyTime, setStudyTime] = useState(60);

  if (!user) return <Navigate to="/" replace />;

  const toggleSubject = (name) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const finish = async () => {
    setSaving(true);
    setErr(null);
    try {
      // 1. Create the learner profile (one per user)
      const profile = await base44.entities.LearnerProfile.create({
        display_name: user?.full_name || "",
        education_level: education,
        main_goal: goal,
        daily_study_minutes: studyTime,
        streak: 0,
        onboarding_completed: true,
        galaxy_mode: false,
      });

      // 2. Create subjects + seed concepts for each selected preset
      let order = 0;
      for (const name of selectedSubjects) {
        const preset = SUBJECT_PRESETS.find((p) => p.name === name);
        const subject = await base44.entities.Subject.create({
          name,
          color: preset?.color || "#3B82F6",
          order_index: order++,
          mastery_estimate: 0,
        });
        const conceptNames = preset?.concepts || [];
        if (conceptNames.length) {
          await base44.entities.Concept.bulkCreate(
            conceptNames.map((cn, i) => ({
              subject_id: subject.id,
              name: cn,
              description: "",
              importance: Math.round((1 - i / conceptNames.length) * 100) / 100, // earlier = more important
              mastery: 0,
              status: "developing",
            }))
          );
        }
      }

      await track(EVENTS.ONBOARDING_COMPLETED, {
        education_level: education,
        subjects: selectedSubjects,
        goal,
        daily_study_minutes: studyTime,
        profile_id: profile.id,
      });

      navigate("/");
    } catch (e) {
      setErr(e?.message || "Could not save your profile. Please try again.");
      setSaving(false);
    }
  };

  const canNext = step === 1 ? selectedSubjects.length > 0 : true;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold">S</div>
          <div>
            <div className="text-base font-bold text-foreground">Welcome to StudyOS</div>
            <div className="text-[11px] text-muted-foreground">A few questions to set up your system</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
              <div className={`text-[10px] mt-1 ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>{s}</div>
            </div>
          ))}
        </div>

        <StudyPanel className="p-6">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">What's your education level?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">This tunes how StudyOS explains concepts.</p>
              <div className="grid grid-cols-1 gap-2">
                {EDUCATION_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setEducation(lvl.value)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                      education === lvl.value ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {lvl.label}
                    {education === lvl.value && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">What are you studying?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Pick the subjects you want to track. We'll seed starter concepts for each.</p>
              <div className="grid grid-cols-2 gap-2">
                {SUBJECT_PRESETS.map((p) => {
                  const active = selectedSubjects.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => toggleSubject(p.name)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-foreground flex-1 text-left">{p.name}</span>
                      {active && <Check className="w-4 h-4 text-primary" />}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">{selectedSubjects.length} selected · {selectedSubjects.reduce((n, s) => n + (SUBJECT_PRESETS.find(p => p.name === s)?.concepts.length || 0), 0)} starter concepts</p>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">What's your main goal?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">StudyOS will orient your plan around this.</p>
              <div className="grid grid-cols-1 gap-2">
                {GOAL_PRESETS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                      goal === g ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                    {goal === g && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">How much can you study daily?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">ExamPilot will respect this limit (Stage 4).</p>
              <div className="grid grid-cols-3 gap-2">
                {STUDY_TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setStudyTime(t)}
                    className={`rounded-lg border px-3 py-4 text-center transition-colors ${
                      studyTime === t ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="text-lg font-bold">{t}<span className="text-xs font-normal">m</span></div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {err && (
            <div className="mt-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
          )}

          <div className="flex items-center justify-between mt-6">
            <button
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground disabled:opacity-40 hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-40"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={finish}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {saving ? "Setting up…" : "Start studying"}
              </button>
            )}
          </div>
        </StudyPanel>
      </div>
    </div>
  );
}