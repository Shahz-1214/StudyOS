import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useEntitlement } from "@/hooks/useEntitlement";
import StudyPanel from "@/components/StudyPanel";
import {
  Loader2, CreditCard, Sparkles, Check, Zap, Crown, Timer,
  ScanLine, Headphones, BrainCircuit, FileCheck2, Target, LockKeyhole, KeyRound
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
      "15 Pro credits / month",
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
      "12 Pro credits / week",
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
      "36 Pro credits / week",
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
  const [accessCode, setAccessCode] = useState("");
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState("");
  const [codeError, setCodeError] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [demoError, setDemoError] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const resetAt = entitlement?.next_reset_at ? new Date(entitlement.next_reset_at).getTime() : 0;
  const countdown = useMemo(
    () => (resetAt ? formatCountdown(resetAt - now) : "--:--:--"),
    [resetAt, now]
  );
  const premiumResetAt = entitlement?.next_premium_reset_at
    ? new Date(entitlement.next_premium_reset_at).getTime()
    : 0;
  const premiumCountdown = useMemo(
    () => (premiumResetAt ? formatCountdown(premiumResetAt - now) : "--:--:--"),
    [premiumResetAt, now]
  );

  if (loading || entLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const currentPlan = entitlement?.plan || "free";

  async function activateDemoMode(event) {
    event.preventDefault();
    setDemoError("");
    setDemoMessage("");
    const code = demoCode.trim().toUpperCase();
    if (!code) {
      setDemoError("Enter the administrator demo access code.");
      return;
    }
    setDemoBusy(true);
    try {
      const res = await base44.functions.invoke("adminDemoMode", { action: "activate", code });
      setDemoMessage(res?.data?.message || "Shipathon Demo Mode activated.");
      setDemoCode("");
      await entitlement.refresh();
    } catch (error) {
      setDemoError(error?.response?.data?.error || error?.data?.error || "Could not activate Demo Mode.");
    } finally {
      setDemoBusy(false);
    }
  }

  async function deactivateDemoMode() {
    setDemoError("");
    setDemoMessage("");
    setDemoBusy(true);
    try {
      const res = await base44.functions.invoke("adminDemoMode", { action: "deactivate" });
      setDemoMessage(res?.data?.message || "Demo mode disabled.");
      await entitlement.refresh();
    } catch (error) {
      setDemoError(error?.response?.data?.error || error?.data?.error || "Could not disable Demo Mode.");
    } finally {
      setDemoBusy(false);
    }
  }

  async function redeemCode(event) {
    event.preventDefault();
    setCodeError("");
    setCodeMessage("");
    const code = accessCode.trim().toUpperCase();
    if (!code) {
      setCodeError("Enter your access code.");
      return;
    }

    setRedeemingCode(true);
    try {
      const res = await base44.functions.invoke("redeemStudyOSCode", { code });
      setCodeMessage(res?.data?.message || "Paid access activated.");
      setAccessCode("");
      await entitlement.refresh();
    } catch (error) {
      setCodeError(
        error?.response?.data?.error ||
        error?.data?.error ||
        "That access code could not be redeemed."
      );
    } finally {
      setRedeemingCode(false);
    }
  }

  return (
    <div className="max-w-[1040px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Stage 6 · Entitlements</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Subscription
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A three-tier system with separate standard AI and premium Pro-credit budgets. Free credits restock monthly; paid credits restock weekly.
        </p>
      </div>

      <StudyPanel className="p-4 md:p-5 mb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Timer className="w-4 h-4 text-primary" />
              Credit restock schedule
            </div>
            <p className="text-[12px] text-muted-foreground mt-1">
              Standard AI refreshes daily. Pro credits restock monthly on Free and weekly on paid plans.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Standard resets</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">{countdown}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Pro restock</span>
              <span className="font-mono text-sm font-bold text-foreground tabular-nums">{premiumCountdown}</span>
            </div>
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
              {entitlement?.premium_remaining ?? 0} <span className="text-xs font-medium text-muted-foreground">/ {entitlement?.premium_limit ?? 0} left · {entitlement?.premium_reset_type ?? "monthly"}</span>
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

      <StudyPanel className="p-5 mt-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary grid place-items-center shrink-0">
            <KeyRound className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="eyebrow">Have an access code?</div>
            <h2 className="text-lg font-bold text-foreground mt-1">Redeem paid access</h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              Enter a valid StudyOS access code to activate its server-issued plan entitlement.
            </p>

            <form onSubmit={redeemCode} className="flex flex-col sm:flex-row gap-2 mt-4">
              <input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                placeholder="STUDYOS-PRO-XXXXXXXXXXXXXXXX"
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="StudyOS access code"
              />
              <button
                type="submit"
                disabled={redeemingCode || !accessCode.trim()}
                className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {redeemingCode ? "Redeeming…" : "Redeem code"}
              </button>
            </form>

            {codeMessage && (
              <div className="mt-3 text-xs font-semibold text-primary" role="status">{codeMessage}</div>
            )}
            {codeError && (
              <div className="mt-3 text-xs font-semibold text-destructive" role="alert">{codeError}</div>
            )}
          </div>
        </div>
      </StudyPanel>

      {user?.role === "admin" && (
        <StudyPanel className="p-5 mt-5 border-primary/30">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
              <KeyRound className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="eyebrow">Administrator · Shipathon</div>
              <h2 className="text-lg font-bold text-foreground mt-1">Demo Mode</h2>
              <p className="text-[12px] text-muted-foreground mt-1">
                Private demo entitlement for the app owner. It is enforced server-side and is invisible to ordinary accounts.
              </p>
              {entitlement?.demo_mode ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary" role="status">
                    Demo Mode is active · high demo quotas enabled
                  </div>
                  <button type="button" onClick={deactivateDemoMode} disabled={demoBusy} className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-50">
                    {demoBusy ? "Working…" : "Disable Demo Mode"}
                  </button>
                </div>
              ) : (
                <form onSubmit={activateDemoMode} className="flex flex-col sm:flex-row gap-2 mt-4">
                  <input
                    value={demoCode}
                    onChange={(e) => setDemoCode(e.target.value.toUpperCase())}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={64}
                    placeholder="ADMIN DEMO ACCESS CODE"
                    className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label="Administrator demo access code"
                  />
                  <button type="submit" disabled={demoBusy || !demoCode.trim()} className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold disabled:opacity-50">
                    {demoBusy ? "Activating…" : "Enter Demo Mode"}
                  </button>
                </form>
              )}
              {demoMessage && <div className="mt-3 text-xs font-semibold text-primary" role="status">{demoMessage}</div>}
              {demoError && <div className="mt-3 text-xs font-semibold text-destructive" role="alert">{demoError}</div>}
            </div>
          </div>
        </StudyPanel>
      )}

      <p className="text-[11px] text-muted-foreground mt-5 px-1">
        Launch pricing is staged for the current entitlement prototype. Payments remain disabled until a verified RevenueCat purchase path is connected, so the app cannot accidentally grant or charge for a plan from this page.
      </p>
    </div>
  );
}