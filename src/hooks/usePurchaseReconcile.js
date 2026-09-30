import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

// Keeps a recorded RevenueCat grant truthful while RevenueCat cannot call the
// app's webhook (the webhook needs a published public URL).
//
// The recorded grant is re-checked against RevenueCat once when the
// subscription surface is opened — one call per visit, and only for a learner
// who already has a recorded RevenueCat grant. Renewals, cancellations and
// expirations therefore show up when the learner next looks at the page, and
// nothing is polled in the background.
export function usePurchaseReconcile(entitlement, refresh) {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    const configured = entitlement?.purchase?.configured === true;
    if (!configured || !entitlement?.revenuecat_grant) return;
    attempted.current = true;

    (async () => {
      try {
        const res = await base44.functions.invoke("verifyRevenueCatPurchase", {});
        if (res?.data?.ok) await refresh?.();
      } catch {
        // Best effort only: the entitlement read stays authoritative, and the
        // re-check is attempted again the next time the page is opened.
      }
    })();
  }, [entitlement, refresh]);
}