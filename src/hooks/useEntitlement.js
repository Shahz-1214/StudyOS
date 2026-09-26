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

  return { entitlement, loading, refresh };
}