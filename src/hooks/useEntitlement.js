import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Entitlement abstraction. Loads the user's server-managed subscription state,
// daily standard-AI usage, premium Pro-credit usage, and plan-specific reset timers.
export function useEntitlement() {
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("checkEntitlement", {});
      setEntitlement(res.data);
    } catch {
      setEntitlement(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // The single frontend source for demo status: it mirrors the server's own
  // `demo_mode` from the same checkEntitlement call every credit surface
  // already uses. No second demo flag exists.
  return { entitlement, loading, refresh, isDemoModeActive: entitlement?.demo_mode === true };
}