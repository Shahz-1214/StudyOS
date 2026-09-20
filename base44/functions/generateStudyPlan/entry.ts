import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { enforceAIQuota } from '../../shared/aiGuard.ts';
import { buildLearnerContext, AI_FACT_RULE } from '../../shared/learnerContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const guard = await enforceAIQuota(base44);
    if (guard) return guard;

    const body = await req.json();
    const weakConcepts = Array.isArray(body.weak_concepts) ? body.weak_concepts : [];
    const dailyMinutes = Math.min(Math.max(parseInt(body.daily_minutes) || 60, 15), 480);
    let days = Math.min(Math.max(parseInt(body.days) || 7, 1), 30);
    const examDate = (body.exam_date || '').trim();

    if (!weakConcepts.length) return Response.json({ error: 'No weak concepts provided' }, { status: 400 });

    // Never schedule past the exam date: cap the plan length to the days
    // remaining before the exam so no task falls on or after exam day.
    let examConstraint = '';
    if (examDate) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const exam = new Date(`${examDate}T00:00:00`);
      const diffDays = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
      if (diffDays > 0 && days > diffDays) days = diffDays;
      examConstraint = `Target exam date: ${examDate}. The plan MUST end on or before this date — no study tasks on or after exam day. The final days should taper toward light review, not new material.`;
    }

    const ctx = await buildLearnerContext(base44);
    const conceptList = weakConcepts.map((c) => `- ${c.name} (mastery ${c.mastery ?? 0}/100)`).join('\n');

    const prompt = `You are a study-plan scheduler. Build a ${days}-day revision plan for a student who studies ${dailyMinutes} minutes per day. Prioritize the weakest concepts first, use spaced repetition across days, and build in review + practice. ${examConstraint}

${ctx.contextText ? `Learner context:\n${ctx.contextText}\n\n` : ''}${AI_FACT_RULE}

Weak concepts:
${conceptList}

Return JSON: { summary (string), plan: [{ day (number), label (string), tasks: [string], focus_concepts: [string] }] }`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          plan: {
            type: "array",
            items: {
              type: "object",
              properties: {
                day: { type: "number" },
                label: { type: "string" },
                tasks: { type: "array", items: { type: "string" } },
                focus_concepts: { type: "array", items: { type: "string" } }
              },
              required: ["day", "label", "tasks"]
            }
          }
        },
        required: ["summary", "plan"]
      }
    });

    return Response.json({
      summary: result.summary || "",
      plan: (result.plan || []).map((d) => ({
        day: d.day,
        label: d.label || `Day ${d.day}`,
        tasks: d.tasks || [],
        focus_concepts: d.focus_concepts || [],
      })),
    });
  } catch (error) {
    return Response.json({ error: 'Could not build the plan. Try again.' }, { status: 500 });
  }
}