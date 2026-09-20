import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Entitlement abstraction. Loads the user's subscription state + today's AI
// usage from the checkEntitlement backend function, and exposes setPlan to
// upgrade/downgrade (mock purchase — the real RevenueCat purchase is the
// native Android/Galaxy step, documented in ARCHITECTURE.md).
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