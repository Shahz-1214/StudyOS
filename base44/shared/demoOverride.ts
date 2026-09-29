import { isDemoModeActive } from "./subscriptionPlans.ts";

// Server-side demo gate for the upload-security path.
//
// Demo Mode (the existing admin-only demo switch stored on the caller's own
// SubscriptionState record) suspends the upload-security STOPS so a live demo
// is never interrupted: no size ceiling, no malware-scan requirement, no
// anti-bot challenge.
//
// It is honoured ONLY for an administrator whose demo state is still valid,
// and it fails closed on any error, so every other caller keeps the full
// fail-closed pipeline unchanged.
//
// What is NOT weakened: verdict records are still written server-side only
// (app users can never create or edit a MediaSecurityScan row), files are
// still stored privately, the caller must still prove their own read access
// to the file, and every demo verdict is written with explicit demo
// provenance so it can never be mistaken for a scanned file.
export async function demoOverrideActive(base44: any, now = Date.now()): Promise<boolean> {
  try {
    const user = await base44.auth.me();
    if (user?.role !== "admin") return false;
    const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
    return isDemoModeActive(subs?.[0], now);
  } catch {
    return false;
  }
}