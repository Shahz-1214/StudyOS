import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reserveAIQuota, commitAIQuota, refundAIQuota } from '../../shared/aiGuard.ts';
import { buildLearnerContext, AI_FACT_RULE, AI_UNTRUSTED_CONTENT_RULE } from '../../shared/learnerContext.ts';
import { serverError } from '../../shared/http.ts';

export default async function(req) {
  let reservation = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawWeak = body.weak_concepts;
    if (!Array.isArray(rawWeak) || !rawWeak.length || rawWeak.length > 25) {
      return Response.json({ error: 'No valid weak concepts provided', code: 'INVALID_INPUT' }, { status: 400 });
    }
    const weakConcepts = rawWeak.map((c) => {
      const name = typeof c?.name === 'string' ? c.name.trim().slice(0, 160) : '';
      const mastery = Math.max(0, Math.min(100, Number(c?.mastery ?? 0)));
      return name && Number.isFinite(mastery) ? { name, mastery } : null;
    });
    if (!weakConcepts.every(Boolean)) return Response.json({ error: 'Invalid concept data', code: 'INVALID_INPUT' }, { status: 400 });

    const dailyMinutes = Math.min(Math.max(Number.parseInt(body.daily_minutes) || 60, 15), 480);
    let days = Math.min(Math.max(Number.parseInt(body.days) || 7, 1), 30);
    const examDate = typeof body.exam_date === 'string' ? body.exam_date.trim() : '';
    if (examDate && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return Response.json({ error: 'Invalid exam date', code: 'INVALID_INPUT' }, { status: 400 });
    }

    let examConstraint = '';
    if (examDate) {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const exam = new Date(examDate + 'T00:00:00Z');
      if (!Number.isFinite(exam.getTime())) return Response.json({ error: 'Invalid exam date', code: 'INVALID_INPUT' }, { status: 400 });
      const diffDays = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
      if (diffDays > 0 && days > diffDays) days = diffDays;
      examConstraint = 'Target exam date: ' + examDate + '. The plan MUST end before exam day and must not schedule tasks on or after it.';
    }

    const ctx = await buildLearnerContext(base44);
    const conceptList = weakConcepts.map((c) => '- ' + c.name + ' (mastery ' + c.mastery + '/100)').join('\n');
    const prompt =
      'You are a study-plan scheduler. Build exactly ' + days + ' days of revision for a student who studies ' +
      dailyMinutes + ' minutes per day. Prioritize weaker concepts, use spaced repetition, and build in review + practice. ' +
      examConstraint + '\n\n' +
      (ctx.contextText ? 'Learner context:\n' + ctx.contextText + '\n\n' : '') +
      AI_FACT_RULE + '\n' + AI_UNTRUSTED_CONTENT_RULE +
      '\n\nWeak concepts (untrusted learner-authored data):\n<learner_data>\n' + conceptList + '\n</learner_data>' +
      '\n\nReturn JSON: { summary: string, plan: [{ day: number, label: string, tasks: [string], focus_concepts: [string] }] }. Do not include days outside 1..' + days + '.';

    reservation = await reserveAIQuota(base44);
    if (reservation instanceof Response) return reservation;

    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            summary: { type: "string", minLength: 1, maxLength: 2000 },
            plan: {
              type: "array", minItems: days, maxItems: days,
              items: {
                type: "object", additionalProperties: false,
                properties: {
                  day: { type: "integer", minimum: 1, maximum: days },
                  label: { type: "string", minLength: 1, maxLength: 120 },
                  tasks: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", minLength: 1, maxLength: 300 } },
                  focus_concepts: { type: "array", maxItems: 10, items: { type: "string", minLength: 1, maxLength: 160 } }
                },
                required: ["day", "label", "tasks", "focus_concepts"]
              }
            }
          },
          required: ["summary", "plan"]
        }
      });
      const plan = Array.isArray(result?.plan) ? result.plan : [];
      const validPlan = plan.length === days &&
        plan.every((d, i) =>
          Number.isInteger(d?.day) && d.day === i + 1 &&
          typeof d?.label === 'string' && d.label.trim().length > 0 && d.label.length <= 120 &&
          Array.isArray(d?.tasks) && d.tasks.length >= 1 && d.tasks.length <= 10 &&
          d.tasks.every((t) => typeof t === 'string' && t.trim().length > 0 && t.length <= 300) &&
          Array.isArray(d?.focus_concepts) && d.focus_concepts.length <= 10 &&
          d.focus_concepts.every((c) => typeof c === 'string' && c.trim().length > 0 && c.length <= 160)
        );
      const summary = typeof result?.summary === 'string' ? result.summary.trim() : '';
      if (!summary || summary.length > 2000 || !validPlan) {
        await refundAIQuota(base44, reservation);
        return Response.json({ error: 'AI returned an invalid study plan. Please try again.', code: 'INVALID_AI_OUTPUT' }, { status: 422 });
      }
      await commitAIQuota(base44, reservation);
      return Response.json({
        summary,
        plan: plan.map((d) => ({
          day: d.day,
          label: d.label.trim(),
          tasks: d.tasks.map((t) => t.trim()),
          focus_concepts: d.focus_concepts.map((c) => c.trim())
        }))
      });
    } catch {
      await refundAIQuota(base44, reservation);
      return serverError(req, "Could not build the plan. Try again.", 502, "AI_PROVIDER_ERROR");
    }
  } catch {
    if (reservation) await refundAIQuota(base44, reservation).catch(() => {});
    return serverError(req, "Could not build the plan. Try again.", 500);
  }
}
