import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { useEntitlement } from "@/hooks/useEntitlement";
import StudyPanel from "@/components/StudyPanel";
import { Loader2, CreditCard, Sparkles, Check, Zap, Crown, AlertTriangle } from "lucide-react";

const PLANS = [
  { id: "free", name: "Free", price: "Rs 0", period: "/mo", icon: Sparkles,
    features: ["15 AI actions / day", "All study tools", "Progress tracking", "Adaptive exams"] },
  { id: "pro", name: "Pro", price: "Rs 1,500", period: "/mo", icon: Zap, highlight: true,
    features: ["Unlimited AI actions", "Weakness AI diagnostics", "LectureMind & EssayCheck", "Study plan generation"] },
  { id: "elite", name: "Elite", price: "Rs 3,000", period: "/mo", icon: Crown,
    features: ["Everything in Pro", "Priority AI models", "Galaxy foldable layouts", "Early access to new modules"] },
];

export default function Subscription() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const { entitlement, loading: entLoading } = useEntitlement();

  if (loading || entLoading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  const currentPlan = entitlement?.plan || "free";

  return (
    <div className="max-w-[920px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Stage 6 · Entitlements</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Subscription
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your plan controls AI usage limits. This is the entitlement layer — real purchases are handled by RevenueCat in the native Android/Galaxy build.</p>
      </div>

      {entitlement && !entitlement.is_pro && (
        <StudyPanel className="p-4 mb-5 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="text-[13px] text-foreground">
            <span className="font-semibold">Free plan:</span> {entitlement.remaining} of {entitlement.ai_limit} AI actions left today.
          </div>
        </StudyPanel>
      )}

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
              <div className="mb-4">
                <span className="text-2xl font-bold text-foreground">{p.price}</span>
                <span className="text-[12px] text-muted-foreground">{p.period}</span>
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {p.features.map((f, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-foreground">
                    <Check className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                disabled
                title="Purchases are not enabled yet"
                className={`w-full rounded-lg text-sm font-semibold px-4 py-2.5 disabled:opacity-50 ${p.highlight ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"}`}
              >
                {isCurrent ? "Current plan" : "Purchases not enabled"}
              </button>
            </StudyPanel>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-6 px-1">
        Purchases are intentionally disabled until a verified payment provider is integrated. The app never grants paid entitlements from a client-side button.
      </p>
    </div>
  );
}