// Per-action credit-cost badge shown on premium tool headers.
// It renders nothing while Demo Mode is active: in a demo, premium actions are
// unlimited and no credits are deducted, so no per-action cost is advertised.
// The single demo source is useEntitlement (server-side `demo_mode`), passed in
// by the page so no extra entitlement call is made here.
export default function ProCreditBadge({ isDemoMode = false }) {
  if (isDemoMode) return null;
  return (
    <span className="text-[9px] font-bold uppercase tracking-wide rounded-full border border-primary/30 text-primary px-2 py-1">Pro · 1 credit</span>
  );
}