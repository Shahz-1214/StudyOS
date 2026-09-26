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
    const text = (body.text || '').trim();
    if (!text) return Response.json({ error: 'Essay text is required' }, { status: 400 });
    if (text.length > 12000) return Response.json({ error: 'Essay too long (max 12000 chars)' }, { status: 400 });

    const prompt = `You are EssayCheck, an essay feedback tool. Analyze this essay on four rubric dimensions (each scored 0-100): grammar, structure, argument, readability. Give targeted, actionable feedback for each. Do NOT rewrite the essay — the student's voice stays theirs. Identify specific strengths and improvements.

Essay:
${text}

Return JSON: {
  overall_score (number 0-100),
  dimensions: { grammar: { score, feedback }, structure: { score, feedback }, argument: { score, feedback }, readability: { score, feedback } },
  strengths (array of strings),
  improvements (array of strings),
  summary (string)
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_score: { type: "number" },
          dimensions: {
            type: "object",
            properties: {
              grammar: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" } } },
              structure: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" } } },
              argument: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" } } },
              readability: { type: "object", properties: { score: { type: "number" }, feedback: { type: "string" } } }
            }
          },
          strengths: { type: "array", items: { type: "string" } },
          improvements: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        },
        required: ["overall_score", "dimensions", "summary"]
      }
    });

    return Response.json({
      overall_score: Math.max(0, Math.min(100, Math.round(result.overall_score || 0))),
      dimensions: result.dimensions || {},
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      summary: result.summary || "",
    });
  } catch (error) {
    return Response.json({ error: 'Could not analyze the essay. Try again.' }, { status: 500 });
  }
}