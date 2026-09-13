import { useMemo } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { track, EVENTS } from "@/lib/analytics";
import {
  computeSubjectMastery, recommendNextConcept, computeConceptStatus,
  STATUS_LABELS, statusColor,
} from "@/lib/learnerState";
import { FEATURES } from "@/lib/features";
import StudyPanel from "@/components/StudyPanel";
import StatCard from "@/components/StatCard";
import MasteryBar from "@/components/MasteryBar";
import {
  Flame, Target, BookOpen, Brain, ArrowRight, Loader2, LogIn,
  AlertTriangle, ChevronRight, Sparkles, Clock,
} from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user, profile, subjects, concepts, events, loading, error } = useStudyOSData();
  const navigate = useNavigate();

  const overallMastery = useMemo(() => {
    if (!concepts.length) return 0;
    return Math.round(concepts.reduce((s, c) => s + (c.mastery || 0), 0) / concepts.length);
  }, [concepts]);

  const recommendation = useMemo(
    () => recommendNextConcept(concepts, subjects),
    [concepts, subjects]
  );

  const weakConcepts = useMemo(
    () => [...concepts].sort((a, b) => (a.mastery || 0) - (b.mastery || 0)).slice(0, 4),
    [concepts]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <StudyPanel className="max-w-md p-8 text-center">
          <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary grid place-items-center mx-auto mb-4">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in to start StudyOS</h1>
          <p className="text-sm text-muted-foreground mt-2">
            StudyOS keeps your subjects, notes, quizzes, and progress private to you. Sign in to begin onboarding.
          </p>
          <button
            onClick={() => import("@/api/base44Client").then(({ base44 }) => base44.auth.redirectToLogin(window.location.href))}
            className="mt-5 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2.5 hover:opacity-90"
          >
            Sign in
          </button>
        </StudyPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <StudyPanel className="max-w-md p-8 text-center">
          <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-3" />
          <h1 className="text-lg font-bold text-foreground">Couldn't load your study data</h1>
          <p className="text-sm text-muted-foreground mt-2">
            This may be a temporary connection issue. Try again in a moment — your saved data is still safe.
          </p>
        </StudyPanel>
      </div>
    );
  }

  if (!profile || !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const firstName = (user?.full_name || user?.email || "there").split(" ")[0];

  return (
    <div className="max-w-[1400px] mx-auto px-5 md:px-8 py-6 md:py-8">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1">
            {greeting()}, {firstName} 👋
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-foreground">{profile.streak || 0}</span>
          <span>day streak</span>
        </div>
      </div>

      {/* Hero + priority */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 mb-4">
        <StudyPanel className="p-6 md:p-8">
          <div className="eyebrow">Today's priority</div>
          {recommendation ? (
            <>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mt-2">
                {recommendation.subject_name} — {recommendation.name}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-lg">
                {recommendation.mastery > 0
                  ? `Currently at ${recommendation.mastery}%. This is your highest-impact concept right now.`
                  : "You haven't practiced this yet — a great place to start building mastery."}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                <button
                  onClick={() => { track(EVENTS.RECOMMENDATION_CLICKED, { concept: recommendation.name }); navigate("/practice"); }}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90"
                >
                  Start session <ArrowRight className="w-4 h-4" />
                </button>
                <Link to="/tool/studylens" className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
                  Open StudyLens
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground mt-2">Add a subject to begin</h2>
              <p className="text-sm text-muted-foreground mt-2">Your dashboard adapts once you have subjects and concepts.</p>
              <Link to="/profile" className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5">
                Manage subjects <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </StudyPanel>

        <StudyPanel className="p-6 md:p-8 flex flex-col items-center justify-center">
          <div className="eyebrow">Overall mastery</div>
          <div className="relative w-36 h-36 my-3 grid place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--primary))" strokeWidth="8"
                strokeLinecap="round" strokeDasharray={`${(overallMastery / 100) * 327} 327`} />
            </svg>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground leading-none">{overallMastery}%</div>
              <div className="text-[10px] text-muted-foreground mt-1">{concepts.length} concepts</div>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground text-center">
            {concepts.length ? "Derived from your concept mastery" : "No practice data yet"}
          </div>
        </StudyPanel>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard icon={Target} value={`${overallMastery}%`} label="Overall mastery" />
        <StatCard icon={BookOpen} value={subjects.length} label="Subjects" />
        <StatCard icon={Brain} value={concepts.length} label="Concepts tracked" />
        <StatCard icon={Flame} value={profile.streak || 0} label="Day streak" />
      </div>

      {/* Two-column: academic health + weak concepts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <StudyPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Academic health</h3>
              <p className="text-xs text-muted-foreground">Subject mastery from your concept data</p>
            </div>
          </div>
          <div className="space-y-4">
            {subjects.length === 0 && <p className="text-sm text-muted-foreground">No subjects yet.</p>}
            {subjects.map((s) => {
              const m = computeSubjectMastery(concepts, s.id);
              return (
                <div key={s.id} className="grid grid-cols-[120px_1fr_40px] items-center gap-3">
                  <span className="text-[13px] text-foreground truncate">{s.name}</span>
                  <MasteryBar value={m} color={s.color || "#3B82F6"} />
                  <span className="text-[12px] text-muted-foreground text-right">{m}%</span>
                </div>
              );
            })}
          </div>
        </StudyPanel>

        <StudyPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-foreground">Weakest concepts</h3>
              <p className="text-xs text-muted-foreground">Where your effort should go next</p>
            </div>
          </div>
          <div className="space-y-3">
            {weakConcepts.length === 0 && <p className="text-sm text-muted-foreground">No concepts yet.</p>}
            {weakConcepts.map((c) => {
              const st = computeConceptStatus(c.mastery);
              const subj = subjects.find((s) => s.id === c.subject_id);
              return (
                <div key={c.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] text-foreground truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{subj?.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold" style={{ color: statusColor(st) }}>{STATUS_LABELS[st]}</span>
                    <span className="text-[12px] text-muted-foreground w-8 text-right">{c.mastery || 0}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </StudyPanel>
      </div>

      {/* Recent activity + loop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <StudyPanel className="p-6">
          <h3 className="font-bold text-foreground mb-1">Recent activity</h3>
          <p className="text-xs text-muted-foreground mb-4">Your academic graph, updating live</p>
          <div className="space-y-3">
            {events.length === 0 && <p className="text-sm text-muted-foreground">No activity yet — onboarding counts.</p>}
            {events.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div className="min-w-0">
                  <div className="text-[13px] text-foreground">{e.event_name.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-muted-foreground">{new Date(e.occurred_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </StudyPanel>

        <StudyPanel className="p-6">
          <h3 className="font-bold text-foreground mb-1">The StudyOS loop</h3>
          <p className="text-xs text-muted-foreground mb-4">Every tool feeds the next one</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              ["1 · Capture", "Question, notes, lecture or essay"],
              ["2 · Understand", "AI explains and structures the material"],
              ["3 · Practice", "Quizzes reveal what's actually understood"],
              ["4 · Diagnose", "Weakness AI finds recurring gaps"],
              ["5 · Adapt", "ExamPilot and FocusStudy change the plan"],
            ].map(([t, d]) => (
              <div key={t} className="flex items-start gap-3 py-1.5 border-b border-border last:border-0">
                <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{t}</div>
                  <div className="text-[11px] text-muted-foreground">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </StudyPanel>
      </div>

      {/* Quick actions */}
      <div className="mt-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">Quick actions</h3>
          <span className="text-[11px] text-muted-foreground">10 connected features</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {FEATURES.map((f) => (
            <Link key={f.id} to={`/tool/${f.id}`} className="block">
              <StudyPanel className="p-4 h-full hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-md bg-primary/10 text-primary grid place-items-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Stage {f.stage}</span>
                </div>
                <div className="mt-3 text-[13px] font-semibold text-foreground">{f.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{f.desc}</div>
              </StudyPanel>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}