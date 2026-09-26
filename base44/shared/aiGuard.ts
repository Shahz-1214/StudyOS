const FREE_DAILY_LIMIT = 15;
const PER_MINUTE_LIMIT = 4;

export async function enforceAIQuota(base44, eventName = "ai_request_started") {
  const subs = await base44.entities.SubscriptionState.list("-created_date", 1);
  const sub = subs[0];
  const now = Date.now();
  const paid = !!sub && ["pro", "elite"].includes(sub.plan) && ["active", "trialing"].includes(sub.status)
    && (!sub.expires_at || new Date(sub.expires_at).getTime() > now);

  // Read only this quota event type (not all events) so a user cannot flood
  // the ledger with unrelated events to evict quota rows from the window.
  // Combined with admin-only delete on Event, neither deletion nor flooding
  // can reset the counters.
  const events = await base44.entities.Event.filter({ event_name: eventName }, "-occurred_at", 120);
  const minuteAgo = now - 60_000;
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const recent = events.filter((e) => e.event_name === eventName && new Date(e.occurred_at).getTime() >= minuteAgo);
  const today = events.filter((e) => e.event_name === eventName && new Date(e.occurred_at).getTime() >= dayStart.getTime());

  if (recent.length >= PER_MINUTE_LIMIT) {
    return Response.json({ error: "Too many AI requests. Please wait a minute and try again.", code: "RATE_LIMITED" }, { status: 429 });
  }
  if (!paid && today.length >= FREE_DAILY_LIMIT) {
    return Response.json({ error: "Daily AI limit reached. Try again tomorrow.", code: "DAILY_LIMIT_REACHED", limit: FREE_DAILY_LIMIT }, { status: 429 });
  }

  await base44.entities.Event.create({ event_name: eventName, properties: { source: "server_ai_guard", plan: paid ? sub.plan : "free" }, occurred_at: new Date().toISOString() });
  return null;
}