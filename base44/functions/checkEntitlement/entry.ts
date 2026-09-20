import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const AI_EVENTS = ["ai_request_started", "studylens_used", "homework_started", "quiz_generated", "lecture_processed", "essay_analyzed", "exam_created", "weakness_updated"];
const FREE_LIMIT = 15;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find or seed the user's subscription state.
    let subs = await base44.entities.SubscriptionState.list("-created_date", 1);
    let sub = subs[0];
    if (!sub) {
      sub = await base44.entities.SubscriptionState.create({ plan: "free", status: "active" });
    }
    const now = Date.now();
    const isPro = (sub.plan === "pro" || sub.plan === "elite") && ["active", "trialing"].includes(sub.status) && (!sub.expires_at || new Date(sub.expires_at).getTime() > now);

    // Count today's AI usage from the Event log (user-scoped via RLS).
    const events = await base44.entities.Event.list("-occurred_at", 100);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const used = events.filter((e) => AI_EVENTS.includes(e.event_name) && new Date(e.occurred_at) >= todayStart).length;

    return Response.json({
      plan: sub.plan,
      status: sub.status,
      is_pro: isPro,
      ai_used_today: used,
      ai_limit: isPro ? null : FREE_LIMIT,
      remaining: isPro ? null : Math.max(0, FREE_LIMIT - used),
      expires_at: sub.expires_at || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}