import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Slider } from "@/components/ui/slider";
import { TrendingUp } from "lucide-react";

// Demo-only control: sets the overall mastery shown across StudyOS by writing
// the demo administrator's own stored concept mastery values, so every surface
// (dashboard, progress, subject hub) stays consistent from the same records.
//
// It renders only while the server-verified demo state is active, so ordinary
// accounts never see it, and the write itself is re-checked server-side.
export default function DemoMasteryControl({ concepts = [], onApplied }) {
  const { isDemoModeActive } = useEntitlement();
  const [value, setValue] = useState(60);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (!isDemoModeActive) return null;

  const current = concepts.length
    ? Math.round(concepts.reduce((s, c) => s + (c.mastery || 0), 0) / concepts.length)
    : 0;

  const apply = async () => {
    if (!concepts.length) return;
    const confirmed = window.confirm(
      `Set your ${concepts.length} tracked concepts to about ${value}% mastery? This replaces your saved mastery values on this account.`
    );
    if (!confirmed) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await base44.functions.invoke("adminDemoMode", { action: "set_mastery", mastery: value });
      setMessage(`Demo mastery set to ${value}%.`);
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
        <div className="text-[13px] font-semibold text-foreground">Demo mastery control</div>
        <span className="text-[9px] font-bold uppercase tracking-wide rounded-full border border-primary/30 text-primary px-2 py-1">Demo only</span>
      </div>
      <p className="text-[12px] text-muted-foreground mb-3">
        Sets the overall mastery shown across StudyOS by writing your stored concept mastery values.
        Currently {current}% across {concepts.length} concept{concepts.length === 1 ? "" : "s"}.
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
        <div className="mt-3 text-[12px] text-muted-foreground">
          Add subjects and concepts first — there is no stored mastery to set yet.
        </div>
      )}
      {message && <div className="mt-3 text-xs font-semibold text-primary" role="status">{message}</div>}
      {error && <div className="mt-3 text-xs font-semibold text-destructive" role="alert">{error}</div>}
    </div>
  );
}