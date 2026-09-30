import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { purchasePackage } from "@/lib/revenueCatWeb";

function isCancellation(error) {
  const code = String(error?.errorCode || error?.code || "");
  const text = String(error?.message || "");
  return /cancel/i.test(code) || /cancel/i.test(text);
}

// The purchase action for one plan card.
//
// It lives inside the existing card so the subscription surface keeps its
// current layout and typography, and it stays honestly unavailable whenever
// RevenueCat is not configured or the plan has no purchase option — never an
// inert "buy" button, and never a fabricated success. The client grants
// nothing: every completed purchase is confirmed by the server with RevenueCat.
export default function PlanPurchaseButton({
  plan,
  entitlement,
  appUserId,
  rcPackage,
  isCurrent,
  onVerified,
}) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const configured = entitlement?.purchase?.configured === true;
  const publicApiKey = entitlement?.purchase?.public_api_key || "";
  const busy = phase !== "idle";
  const purchasable =
    configured &&
    plan.id !== "free" &&
    Boolean(rcPackage) &&
    Boolean(appUserId) &&
    Boolean(publicApiKey);

  const className = `w-full rounded-lg text-sm font-semibold px-4 py-2.5 disabled:opacity-50 ${
    plan.highlight ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
  }`;

  async function handlePurchase() {
    setError("");
    setMessage("");
    setPhase("purchasing");
    try {
      await purchasePackage(publicApiKey, appUserId, rcPackage);
      setPhase("verifying");
      const res = await base44.functions.invoke("verifyRevenueCatPurchase", {});
      const data = res?.data || {};
      if (data.verified) {
        const until = data.expires_at
          ? ` until ${new Date(data.expires_at).toLocaleDateString()}`
          : "";
        setMessage(`${data.plan_name || plan.name} activated${until}.`);
        await onVerified?.();
      } else {
        setError(data.error || "This purchase could not be verified.");
      }
    } catch (err) {
      if (isCancellation(err)) {
        setMessage("Purchase cancelled. No plan was changed.");
      } else {
        setError(String(err?.message || "") || "The purchase could not be completed.");
      }
    } finally {
      setPhase("idle");
    }
  }

  // Unchanged page behaviour when RevenueCat is not configured.
  if (!configured) {
    return (
      <button disabled title="Payments are not enabled yet" className={className}>
        {isCurrent ? "Current plan" : "Coming with payments"}
      </button>
    );
  }

  if (isCurrent) {
    return (
      <button disabled className={className}>
        Current plan
      </button>
    );
  }

  if (!purchasable) {
    return (
      <button
        disabled
        title="This plan has no purchase option in the current offering"
        className={className}
      >
        {plan.id === "free" ? "Free plan" : "Not available yet"}
      </button>
    );
  }

  return (
    <div>
      <button type="button" onClick={handlePurchase} disabled={busy} className={className}>
        {phase === "purchasing" ? "Opening checkout…" : phase === "verifying" ? "Confirming…" : `Upgrade to ${plan.name}`}
      </button>
      {message && (
        <div className="mt-2 text-[11px] font-semibold text-primary" role="status">
          {message}
        </div>
      )}
      {error && (
        <div className="mt-2 text-[11px] font-semibold text-destructive" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}