import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useEntitlement } from "@/hooks/useEntitlement";
import StudyPanel from "@/components/StudyPanel";
import {
  Loader2, CreditCard, Sparkles, Check, Zap, Crown, Timer,
  ScanLine, Headphones, BrainCircuit, FileCheck2, Target, LockKeyhole
} from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "Rs 0",
    period: "/mo",
    icon: Sparkles,
    description: "A useful daily allowance with real access to the full study system.",
    features: [
      "10 standard AI actions / day",
      "5 Pro credits / day",
      "All core study tools",
      "Progress, quizzes and study plans",
    ],
  },
  {
    id: "pro",
    name: "Plus",
    price: "Rs 799",
    period: "/mo",
    icon: Zap,
    highlight: true,
    description: "For students who use AI regularly without needing a large monthly bill.",
    features: [
      "50 standard AI actions / day",
      "20 Pro credits / day",
      "All 5 premium AI features",
      "Higher burst limits",
    ],
  },
  {
    id: "elite",
    name: "Pro",
    price: "Rs 1,499",
    period: "/mo",
    icon: Crown,
    description: "For heavy study weeks and frequent AI-assisted revision.",
    features: [
      "120 standard AI actions / day",
      "60 Pro credits / day",
      "All 5 premium AI features",
      "Highest launch-time rate limits",
    ],
  },
];

const PREMIUM_FEATURES = [
  { id: "studylens", name: "StudyLens", desc: "Image-based problem extraction", icon: ScanLine },
  { id: "lecturemind", name: "LectureMind", desc: "Audio transcription + study material", icon: Headphones },
  { id: "weakness_ai", name: "Weakness AI", desc: "Personalized weak-area analysis", icon: BrainCircuit },
  { id: "essay_check", name: "EssayCheck", desc: "AI essay analysis and feedback", icon: FileCheck2 },
  { id: "adaptive_exam", name: "Adaptive Exam", desc: "Generated exams targeting weak concepts", icon: Target },
];

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function Subscription() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const { entitlement, loading: entLoading } = useEntitlement();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const resetAt = entitlement?.next_reset_at ? new Date(entitlement.next_reset_at).getTime() : 0;
  const countdown = useMemo(
    () => (resetAt ? formatCountdown(resetAt - now) : "--:--:--"),
    [resetAt, now]
  );

  if (loading || entLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const currentPlan = entitlement?.plan || "free";

  return (
    <div className="max-w-[1040px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Stage 6 · Entitlements</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Subscription
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A simple three-tier system with capped AI budgets. Premium features stay available to everyone through daily Pro credits.
        </p>
      </div>

      <StudyPanel className="p-4 md:p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Timer className="w-4 h-4 text-primary" />
              Daily allowance refresh
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Your standard actions and Pro credits refresh automatically at the next daily reset.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Resets in</span>
            <span className="font-mono text-sm font-bold text-foreground tabular-nums">{countdown}</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <div className="rounded-lg bg-secondary/50 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Standard AI</div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {entitlement?.remaining ?? 0} <span className="text-xs font-medium text-muted-foreground">/ {entitlement?.ai_limit ?? 0} left</span>
            </div>
          </div>
          <div className="rounded-lg bg-secondary/50 px-3 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pro credits</div>
            <div className="mt-1 text-lg font-bold text-foreground">
              {entitlement?.premium_remaining ?? 0} <span className="text-xs font-medium text-muted-foreground">/ {entitlement?.premium_limit ?? 0} left</span>
            </div>
          </div>
        </div>
      </StudyPanel>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((p) => {
          const Icon = p.icon;
          const isCurrent = p.id === currentPlan;
          return (
            <StudyPanel key={p.id} className={`p-6 flex flex-col ${p.highlight ? "ring-2 ring-primary" : ""}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-lg grid place-items-center ${p.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-bold text-foreground">{p.name}</div>
                {isCurrent && <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-primary">Current</span>}
              </div>

              <div className="mb-2">
                <span className="text-2xl font-bold text-foreground">{p.price}</span>
                <span className="text-[12px] text-muted-foreground">{p.period}</span>
              </div>
              <p className="text-[12px] leading-5 text-muted-foreground mb-5">{p.description}</p>

              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <button
                disabled
                title="Payments are not enabled yet"
                className={`w-full rounded-lg text-sm font-semibold px-4 py-2.5 disabled:opacity-50 ${p.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                {isCurrent ? "Current plan" : "Coming with payments"}
              </button>
            </StudyPanel>
          );
        })}
      </div>

      <StudyPanel className="p-5 mt-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="eyebrow">Pro features · 1 credit per action</div>
            <h2 className="text-lg font-bold text-foreground mt-1">Premium processing without a hard paywall</h2>
          </div>
          <LockKeyhole className="w-5 h-5 text-primary shrink-0" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PREMIUM_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary grid place-items-center">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wide rounded-full border border-primary/30 text-primary px-2 py-1">Pro</span>
                </div>
                <div className="font-semibold text-[13px] text-foreground mt-3">{feature.name}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-4">{feature.desc}</div>
                <div className="text-[10px] text-muted-foreground mt-3">Uses 1 Pro credit</div>
              </div>
            );
          })}
        </div>
      </StudyPanel>

      <p className="text-[11px] text-muted-foreground mt-5 px-1">
        Launch pricing is staged for the current entitlement prototype. Payments remain disabled until a verified RevenueCat purchase path is connected, so the app cannot accidentally grant or charge for a plan from this page.
      </p>
    </div>
  );
}