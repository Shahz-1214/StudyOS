import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";

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
