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

  const setPlan = useCallback(async (plan) => {
    const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
    const expiresAt = plan === "free" ? null : new Date(Date.now() + 30 * 86400000).toISOString();
    if (subs[0]) {
      await base44.entities.SubscriptionState.update(subs[0].id, { plan, status: "active", expires_at: expiresAt });
    } else {
      await base44.entities.SubscriptionState.create({ plan, status: "active", expires_at: expiresAt });
    }
    await refresh();
  }, [refresh]);

  return { entitlement, loading, refresh, setPlan };
}