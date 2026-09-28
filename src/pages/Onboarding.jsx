import { useState, useEffect, useMemo } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { track, EVENTS } from "@/lib/analytics";
import { SUBJECT_PRESETS, EDUCATION_LEVELS, GOAL_PRESETS, STUDY_TIME_OPTIONS } from "@/lib/subjectPresets";
import StudyPanel from "@/components/StudyPanel";
import UpcomingExamsStep from "@/components/onboarding/UpcomingExamsStep";
import { Loader2, Check, ArrowRight, ArrowLeft, Sparkles, Globe, Layers } from "lucide-react";

// Onboarding flow. CRITICAL: Country and Board are INDEPENDENT selectors.
//   - Country is its own standalone field (not a board route).
//   - Board / Qualification is its own independent list showing ALL active
//     boards, never filtered/hidden by the chosen country.
//   - Both are stored separately on LearnerProfile (country, board_id).
//   - An optional Upcoming Exams step lets the learner add personal exams.
const STEPS = ["Country", "Board", "Education", "Subjects", "Exams", "Goal", "Study time"];

export default function Onboarding() {
  const { user } = useAuth();
  const { profile, subjects, loading, reload } = useStudyOSData();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [boards, setBoards] = useState([]);
  const [boardsLoaded, setBoardsLoaded] = useState(false);

  const [country, setCountry] = useState("");
  const [boardId, setBoardId] = useState("");
  const [education, setEducation] = useState("high_school");
  const [selectedSubjects, setSelectedSubjects] = useState(["Mathematics", "Physics"]);
  const [exams, setExams] = useState([]);
  const [goal, setGoal] = useState(GOAL_PRESETS[0]);
  const [studyTime, setStudyTime] = useState(60);

  // Re-entering onboarding (admins) must never reset what is already saved:
  // once the shared data has settled, seed the steps from the existing profile
  // and its subjects. A brand-new learner has no profile and keeps the defaults.
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || loading || !profile) return;
    setCountry(profile.country || "");
    setBoardId(profile.board_id || "");
    if (profile.education_level) setEducation(profile.education_level);
    if (profile.main_goal) setGoal(profile.main_goal);
    if (profile.daily_study_minutes) setStudyTime(profile.daily_study_minutes);
    const owned = (subjects || []).filter((s) => !s.archived).map((s) => s.name);
    if (owned.length) setSelectedSubjects(owned);
    setPrefilled(true);
  }, [profile, subjects, loading, prefilled]);

  useEffect(() => {
    if (!user) return;
    base44.entities.Board.list("-board", 200)
      .then((b) => { setBoards(b.filter((x) => x.active)); })
      .catch(() => {})
      .finally(() => setBoardsLoaded(true));
  }, [user]);

  // Country list is its own independent list (distinct countries present in
  // the verified board registry). It does NOT filter the board list.
  const countries = useMemo(() => [...new Set(boards.map((b) => b.country).filter(Boolean))].sort(), [boards]);
  // Board list: ALL active boards, independent of country. Grouped by
  // education_system only for readability — never hidden by country.
  const boardGroups = useMemo(() => {
    const groups = new Map();
    for (const b of boards) {
      const key = b.education_system || b.board || "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(b);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [boards]);
  const selectedBoard = useMemo(() => boards.find((b) => b.board_id === boardId), [boards, boardId]);

  if (loading || !boardsLoaded) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  // Learners run onboarding once. An admin may re-enter it at any time, because
  // country and board are only ever set here — without this they are frozen
  // after the first run, with no way to correct a wrong or missing board.
  if (profile && profile.onboarding_completed && user?.role !== "admin") return <Navigate to="/" replace />;

  const toggleSubject = (name) => {
    setSelectedSubjects((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const finish = async () => {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        display_name: user?.full_name || "",
        education_level: education,
        main_goal: goal,
        daily_study_minutes: studyTime,
        onboarding_completed: true,
        country: country || "",
        board_id: boardId || "",
      };

      let profileId = profile?.id;
      if (profileId) {
        await base44.entities.LearnerProfile.update(profileId, payload);
      } else {
        const created = await base44.entities.LearnerProfile.create({
          ...payload,
          streak: 0,
          galaxy_mode: false,
        });
        profileId = created.id;
      }

      // Only create subjects that aren't already present (no duplicates).
      const existingNames = new Set((subjects || []).filter((s) => !s.archived).map((s) => s.name.trim().toLowerCase()));
      let order = (subjects || []).length;
      for (const name of selectedSubjects) {
        if (existingNames.has(name.trim().toLowerCase())) continue;
        const preset = SUBJECT_PRESETS.find((p) => p.name === name);
        const subject = await base44.entities.Subject.create({
          name,
          color: preset?.color || "#3B82F6",
          order_index: order++,
          mastery_estimate: 0,
          learner_profile_id: profileId,
          archived: false,
        });
        const conceptNames = preset?.concepts || [];
        if (conceptNames.length) {
          await base44.entities.Concept.bulkCreate(
            conceptNames.map((cn, i) => ({
              subject_id: subject.id,
              name: cn,
              description: "",
              importance: Math.round((1 - i / conceptNames.length) * 100) / 100,
              mastery: 0,
              status: "developing",
            }))
          );
        }
      }

      // Optional personal exams (distinct from board ExamSeries).
      if (exams.length) {
        await base44.entities.LearnerExam.bulkCreate(
          exams.map((e) => ({
            learner_profile_id: profileId,
            title: e.title,
            exam_date: e.exam_date,
            exam_type: e.exam_type || "board",
            board_id: boardId || "",
            status: "upcoming",
            archived: false,
          }))
        );
      }

      await track(EVENTS.ONBOARDING_COMPLETED, {});
      await reload();
      navigate("/");
    } catch {
      setErr("Could not save your profile. Please try again.");
      setSaving(false);
    }
  };

  const canNext =
    step === 3 ? selectedSubjects.length > 0 :
    true; // Country, Board, Exams, Goal, Study time are all optional/skippable.

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
              <h2 className="text-lg font-bold text-foreground">Where are you studying?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">Pick your country. This is your own field — it doesn't restrict which board you can choose next.</p>
              <div className="grid grid-cols-1 gap-2">
                {countries.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCountry(c)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                      country === c ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> {c}</span>
                    {country === c && <Check className="w-4 h-4 text-primary" />}
                  </button>
                ))}
                {countries.length === 0 && (
                  <p className="text-sm text-muted-foreground">No countries listed yet. You can continue and pick a board next.</p>
                )}
              </div>
              <button onClick={() => setCountry("")} className={`mt-3 text-[11px] ${country ? "text-muted-foreground hover:text-foreground" : "text-primary font-semibold"}`}>
                {country ? "Clear selection" : "Skip for now"}
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">Select your board / qualification</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">All supported boards are shown — pick the one that matches your syllabus, regardless of country.</p>
              <div className="max-h-80 overflow-y-auto space-y-4 pr-1">
                {boardGroups.map(([system, list]) => (
                  <div key={system}>
                    <div className="eyebrow flex items-center gap-1.5 mb-1.5"><Layers className="w-3 h-3" /> {system}</div>
                    <div className="grid grid-cols-1 gap-2">
                      {list.map((b) => (
                        <button
                          key={b.board_id}
                          onClick={() => setBoardId(b.board_id)}
                          className={`flex items-start justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                            boardId === b.board_id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-foreground">{b.board}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{b.qualification} · {b.level} · {b.country}</div>
                          </div>
                          {boardId === b.board_id && <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {boardGroups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No boards available right now. You can continue without one.</p>
                )}
              </div>
              {selectedBoard?.requires_subboard && (
                <p className="text-[11px] text-amber-600 mt-3">{selectedBoard.qualification} is a qualification level — you'll pick your exact sub-board, subject and year on the official page when using resources.</p>
              )}
              <button onClick={() => setBoardId("")} className={`mt-3 text-[11px] ${boardId ? "text-muted-foreground hover:text-foreground" : "text-primary font-semibold"}`}>
                {boardId ? "Clear selection" : "Skip for now"}
              </button>
            </div>
          )}

          {step === 2 && (
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

          {step === 3 && (
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

          {step === 4 && (
            <UpcomingExamsStep exams={exams} setExams={setExams} />
          )}

          {step === 5 && (
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

          {step === 6 && (
            <div>
              <h2 className="text-lg font-bold text-foreground">How much can you study daily?</h2>
              <p className="text-sm text-muted-foreground mt-1 mb-4">ExamPilot will respect this limit.</p>
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