import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { isDemoModeActive } from "../../shared/subscriptionPlans.ts";

// Mirrors the canonical thresholds in src/lib/learnerState.js
// (computeConceptStatus). Duplicated because a backend function cannot import
// client source modules; keep the two in step if the thresholds ever change.
function conceptStatus(mastery: number) {
  if (!Number.isFinite(mastery)) return "developing";
  if (mastery < 35) return "critical_weakness";
  if (mastery < 55) return "weak";
  if (mastery < 75) return "developing";
  if (mastery < 90) return "strong";
  return "mastered";
}

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
      const subs = await base44.asServiceRole.entities.SubscriptionState.filter(
        { created_by_id: user.id },
        "-created_date",
        5
      );
      const current = subs?.[0];
      if (current?.id) {
        await base44.asServiceRole.entities.SubscriptionState.update(current.id, {
          demo_mode: false,
          demo_activated_at: null,
        });
      }
      await base44.asServiceRole.entities.DemoModeSession.updateMany(
        { activated_by_id: user.id, active: true },
        { $set: { active: false } }
      ).catch(() => {});
      return json({ ok: true, demo_mode: false, message: "Demo mode disabled." });
    }

    // Demo-only mastery control. Admin identity is already verified above, and
    // the demo state is re-verified here against the single shared demo
    // predicate, so a non-demo caller can never reach the write.
    //
    // It writes the caller's OWN stored concept mastery values (never another
    // user's records), so the overall mastery displayed across StudyOS — the
    // mean of concept mastery — becomes the chosen value. The spread is
    // deterministic and zero-sum in pairs, so the resulting mean is exact
    // rather than approximately on target.
    if (action === "set_mastery") {
      const demoSubs = await base44.asServiceRole.entities.SubscriptionState.filter(
        { created_by_id: user.id },
        "-created_date",
        5
      );
      if (!isDemoModeActive(demoSubs?.[0])) {
        return json({ error: "Demo Mode must be active to change the demo mastery.", code: "DEMO_REQUIRED" }, 403);
      }

      const requested = Number(body?.mastery);
      if (!Number.isFinite(requested) || requested < 0 || requested > 100) {
        return json({ error: "Choose a mastery between 0 and 100.", code: "INVALID_MASTERY" }, 400);
      }
      const target = Math.round(requested);

      const rows = await base44.asServiceRole.entities.Concept.filter(
        { created_by_id: user.id },
        "-created_date",
        300
      );
      const concepts = (rows || []).filter((c) => !c.archived);
      if (!concepts.length) {
        return json({ error: "Add subjects and concepts before setting a demo mastery.", code: "NO_CONCEPTS" }, 400);
      }

      const spread = Math.min(6, target, 100 - target);
      const oddCount = concepts.length % 2 === 1;
      const updates = concepts.map((c, index) => {
        // Pairs carry +spread and -spread so the mean stays exact; with an odd
        // number of concepts the unpaired last one sits exactly on the target.
        const unpaired = oddCount && index === concepts.length - 1;
        const mastery = spread === 0 || unpaired ? target : index % 2 === 0 ? target + spread : target - spread;
        return { id: c.id, mastery, status: conceptStatus(mastery) };
      });
      await base44.asServiceRole.entities.Concept.bulkUpdate(updates);

      return json({ ok: true, mastery: target, updated: updates.length });
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
    const subs = await base44.asServiceRole.entities.SubscriptionState.filter(
      { created_by_id: user.id },
      "-created_date",
      5
    );
    const current = subs?.[0];

    const payload = {
      plan: current?.plan === "elite" ? "elite" : "elite",
      status: "active",
      expires_at: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      trial_ends_at: null,
      demo_mode: true,
      demo_activated_at: now,
    };

    if (current?.id) {
      await base44.asServiceRole.entities.SubscriptionState.update(current.id, payload);
    } else {
      await base44.asServiceRole.entities.SubscriptionState.create({
        ...payload,
        created_by_id: user.id,
      });
    }

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