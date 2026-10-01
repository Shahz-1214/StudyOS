import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { isDemoModeActive } from "../../shared/subscriptionPlans.ts";
import { findLearnerSubscription, saveLearnerSubscription } from "../../shared/subscriptionRecord.ts";

const DEMO_CODE_HASH = "1c79ffa728981232e50f5d234ef3a7810756f123339907dfcc19d6a3ee79717f";

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data: any, status = 200) {
  return Response.json(data, { status });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return json({ error: "Unauthorized" }, 401);
    if (user.role !== "admin") {
      return json({ error: "Demo mode is restricted to administrators.", code: "ADMIN_ONLY" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "activate").toLowerCase();

    if (action === "deactivate") {
      const current = await findLearnerSubscription(base44, user.id);
      if (current?.id) {
        await base44.asServiceRole.entities.SubscriptionState.update(current.id, {
          demo_mode: false,
          demo_activated_at: null,
          // The display-only mastery override ends with Demo Mode.
          demo_mastery: null,
        });
      }
      await base44.asServiceRole.entities.DemoModeSession.updateMany(
        { activated_by_id: user.id, active: true },
        { $set: { active: false } }
      ).catch(() => {});
      return json({ ok: true, demo_mode: false, message: "Demo mode disabled." });
    }

    // Demo-only mastery DISPLAY override. Admin identity is verified above and
    // the demo state is re-verified here with the single shared demo predicate,
    // so a non-demo caller can never reach this write.
    //
    // It stores ONE number on the caller's own server-managed SubscriptionState
    // record. It never touches learner records: while Demo Mode is active the app
    // renders that number as the mastery shown in its study views, stored concept
    // mastery stays exactly as it is, and the override ends when Demo Mode is
    // turned off.
    if (action === "set_mastery") {
      const currentSub = await findLearnerSubscription(base44, user.id);
      if (!isDemoModeActive(currentSub)) {
        return json({ error: "Demo Mode must be active to change the demo mastery.", code: "DEMO_REQUIRED" }, 403);
      }

      const requested = Number(body?.mastery);
      if (!Number.isFinite(requested) || requested < 0 || requested > 100) {
        return json({ error: "Choose a mastery between 0 and 100.", code: "INVALID_MASTERY" }, 400);
      }
      const target = Math.round(requested);

      await base44.asServiceRole.entities.SubscriptionState.update(currentSub.id, { demo_mastery: target });
      return json({ ok: true, mastery: target, display_only: true });
    }

    const code = String(body?.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{12,64}$/.test(code)) {
      return json({ error: "Enter the administrator demo access code.", code: "INVALID_CODE" }, 400);
    }

    const hash = await sha256Hex(code);
    if (hash !== DEMO_CODE_HASH) {
      return json({ error: "That administrator demo code is invalid.", code: "INVALID_DEMO_CODE" }, 400);
    }

    const now = new Date().toISOString();
    const current = await findLearnerSubscription(base44, user.id);

    const payload = {
      plan: current?.plan === "elite" ? "elite" : "elite",
      status: "active",
      expires_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      trial_ends_at: null,
      demo_mode: true,
      demo_activated_at: now,
    };

    // One record per learner: the caller's existing record is updated in place
    // (stamped with their learner key when it is a legacy record).
    await saveLearnerSubscription(base44, user.id, payload, {
      plan: "free",
      status: "active",
    });

    await base44.asServiceRole.entities.DemoModeSession.updateMany(
      { activated_by_id: user.id, active: true },
      { $set: { active: false } }
    ).catch(() => {});

    await base44.asServiceRole.entities.DemoModeSession.create({
      activated_at: now,
      activated_by_id: user.id,
      active: true,
      source: "admin_demo_code",
    });

    return json({
      ok: true,
      demo_mode: true,
      plan: "elite",
      message: "Shipathon Demo Mode activated.",
    });
  } catch {
    return json({ error: "Could not change demo mode. Please try again.", code: "INTERNAL_ERROR" }, 500);
  }
}