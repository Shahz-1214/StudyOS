import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const AI_EVENTS = ["ai_request_started", "studylens_used", "homework_started", "quiz_generated", "lecture_processed", "essay_analyzed", "exam_created", "weakness_updated"];
const FREE_LIMIT = 15;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // SubscriptionState is admin-only for create/update/delete (RLS), so the
    // plan/status fields are server-managed and cannot be self-upgraded by the
    // caller. Absence of a record means free — we do not seed a record here.
    const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
    const sub = subs[0];
    const now = Date.now();
    const isPro = !!sub && (sub.plan === "pro" || sub.plan === "elite") && ["active", "trialing"].includes(sub.status) && (!sub.expires_at || new Date(sub.expires_at).getTime() > now);

    // Count today's AI usage from the Event log (user-scoped via RLS).
    // Read only AI-accounting events so unrelated filler events cannot evict
    // quota rows from the window. Combined with admin-only delete on Event,
    // the daily count cannot be reset by deletion or flooding.
    const events = await base44.entities.Event.filter({ event_name: { $in: AI_EVENTS } }, "-occurred_at", 100);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const used = events.filter((e) => AI_EVENTS.includes(e.event_name) && new Date(e.occurred_at) >= todayStart).length;

    return Response.json({
      plan: sub?.plan || "free",
      status: sub?.status || "active",
      is_pro: isPro,
      ai_used_today: used,
      ai_limit: isPro ? null : FREE_LIMIT,
      remaining: isPro ? null : Math.max(0, FREE_LIMIT - used),
      expires_at: sub?.expires_at || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}