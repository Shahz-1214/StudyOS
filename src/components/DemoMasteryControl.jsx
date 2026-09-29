import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Slider } from "@/components/ui/slider";
import { TrendingUp } from "lucide-react";

// Demo-only mastery control. It sets a DISPLAY override: while Demo Mode is
// active, StudyOS shows the chosen value as the mastery across its study views.
// No stored concept mastery is ever changed, and the override ends when Demo
// Mode is turned off.
//
// `demoActive` comes from the page (the single entitlement read), and the write
// is re-verified server-side against the admin + demo state.
export default function DemoMasteryControl({ concepts = [], demoActive = false, onApplied }) {
  const [value, setValue] = useState(60);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!demoActive) return null;

  const shown = concepts.length
    ? Math.round(concepts.reduce((s, c) => s + (c.mastery || 0), 0) / concepts.length)
    : 0;

  const apply = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await base44.functions.invoke("adminDemoMode", { action: "set_mastery", mastery: value });
      setMessage(`Demo Mode now displays ${value}% overall mastery.`);
      await onApplied?.();
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "Could not change the demo mastery.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <div className="text-[13px] font-semibold text-foreground">Demo mastery display</div>
        <span className="text-[9px] font-bold uppercase tracking-wide rounded-full border border-primary/30 text-primary px-2 py-1">Demo only</span>
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">
        Shows the chosen overall mastery across StudyOS while Demo Mode is on. Display only — your saved mastery values
        stay exactly as they are, and the override ends when Demo Mode is turned off. Currently displaying {shown}%
        across {concepts.length} concept{concepts.length === 1 ? "" : "s"}.
      </p>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={0}
          max={100}
          step={1}
          onValueChange={(next) => setValue(next[0])}
          disabled={!concepts.length || busy}
          className="flex-1"
        />
        <span className="font-mono text-sm font-bold text-foreground w-12 text-right tabular-nums">{value}%</span>
        <button
          onClick={apply}
          disabled={busy || !concepts.length}
          className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          {busy ? "Applying…" : "Apply"}
        </button>
      </div>
      {!concepts.length && (
        <div className="mt-3 text-[12px] text-muted-foreground">Add subjects and concepts first — the mastery display has no concepts yet.</div>
      )}
      {message && <div className="mt-3 text-xs font-semibold text-primary" role="status">{message}</div>}
      {error && <div className="mt-3 text-xs font-semibold text-destructive" role="alert">{error}</div>}
    </div>
  );
}