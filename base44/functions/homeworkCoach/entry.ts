import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { enforceAIQuota } from '../../shared/aiGuard.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const guard = await enforceAIQuota(base44);
    if (guard) return guard;

    const body = await req.json();
    const problem = (body.problem || '').trim();
    const hintLevel = Math.min(Math.max(parseInt(body.hint_level) || 1, 1), 4);
    const previousHints = Array.isArray(body.previous_hints) ? body.previous_hints : [];

    if (!problem) return Response.json({ error: 'Problem is required' }, { status: 400 });
    if (problem.length > 4000) return Response.json({ error: 'Problem too long (max 4000 chars)' }, { status: 400 });

    const levelGuidance = {
      1: "Ask a guiding question that helps the student identify what concept to apply. Do not solve.",
      2: "Point to the relevant concept or formula and why it applies. Do not solve.",
      3: "Outline the approach step by step in words. Do not give the final numerical answer.",
      4: "Provide the full worked solution with the final answer.",
    };

    const prompt = `You are a homework coach. A student needs help with this problem:

${problem}

The student has requested hint level ${hintLevel} of 4. ${levelGuidance[hintLevel]}

${previousHints.length ? `Previous hints given:\n${previousHints.map((h, i) => `Level ${i + 1}: ${h}`).join('\n')}\nBuild on these without repeating.` : ''}

Return JSON: { hint (the hint text), hint_level, is_final (true only at level 4), teaching_note (a one-line concept takeaway) }.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          hint: { type: "string" },
          hint_level: { type: "number" },
          is_final: { type: "boolean" },
          teaching_note: { type: "string" }
        },
        required: ["hint", "hint_level", "is_final"]
      }
    });

    return Response.json({
      hint: result.hint || "",
      hint_level: hintLevel,
      is_final: hintLevel >= 4 || !!result.is_final,
      teaching_note: result.teaching_note || "",
    });
  } catch (error) {
    return Response.json({ error: 'Could not provide a hint right now. Try again.' }, { status: 500 });
  }
}