import { useEffect, useState } from "react";
import { loadCurrentOffering, packagePrice, packagesByPlan } from "@/lib/revenueCatWeb";

// Loads the current RevenueCat offering once, and only when the server reports
// that the purchase path is configured.
//
// status: "unconfigured" — no RevenueCat key on the server: nothing is fetched
//         "loading"      — offering in flight
//         "ready"        — at least one plan has a purchase option
//         "unavailable"  — configured, but no usable offering/package: the page
//                          keeps its honest non-purchase state
export function useRevenueCatOffering(purchaseConfig, appUserId, entitlementMap) {
  const configured = purchaseConfig?.configured === true;
  const publicApiKey = purchaseConfig?.public_api_key || "";
  const [state, setState] = useState({ status: "unconfigured", packages: {}, prices: {}, error: "" });

  useEffect(() => {
    if (!configured || !publicApiKey || !appUserId) {
      setState({ status: "unconfigured", packages: {}, prices: {}, error: "" });
      return undefined;
    }

    let cancelled = false;
    setState({ status: "loading", packages: {}, prices: {}, error: "" });

    (async () => {
      try {
        const offering = await loadCurrentOffering(publicApiKey, appUserId);
        if (cancelled) return;
        const packages = packagesByPlan(offering, entitlementMap);
        const prices = {};
        for (const [planId, rcPackage] of Object.entries(packages)) {
          prices[planId] = packagePrice(rcPackage);
        }
        setState({
          status: Object.keys(packages).length ? "ready" : "unavailable",
          packages,
          prices,
          error: "",
        });
      } catch (error) {
        if (cancelled) return;
        // No offering means no purchase action. The cards stay unavailable
        // rather than showing a button that cannot complete.
        setState({
          status: "unavailable",
          packages: {},
          prices: {},
          error: error?.message || "Could not load purchase options.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, publicApiKey, appUserId, entitlementMap]);

  return state;
}