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
    const concepts = Array.isArray(body.concepts) ? body.concepts : [];
    if (!concepts.length) return Response.json({ error: 'No concepts provided' }, { status: 400 });

    const conceptList = concepts.map((c) => `- ${c.name}: mastery ${c.mastery ?? 0}/100, status ${c.status || 'developing'}, importance ${c.importance ?? 0.5}`).join('\n');

    const prompt = `You are a learning diagnostician. Analyze this student's concept mastery and find hidden weaknesses and priorities. A "hidden weakness" is a high-importance concept with middling mastery that the student might think they know, or a foundational concept whose weakness undermines others.

Concept data:
${conceptList}

Return JSON: {
  overall_assessment (string),
  hidden_weaknesses: [{ concept (string), reason (string) }],
  priority_order: [string],
  recommendations: [string]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_assessment: { type: "string" },
          hidden_weaknesses: {
            type: "array",
            items: {
              type: "object",
              properties: {
                concept: { type: "string" },
                reason: { type: "string" }
              },
              required: ["concept", "reason"]
            }
          },
          priority_order: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } }
        },
        required: ["overall_assessment", "priority_order", "recommendations"]
      }
    });

    return Response.json({
      overall_assessment: result.overall_assessment || "",
      hidden_weaknesses: result.hidden_weaknesses || [],
      priority_order: result.priority_order || [],
      recommendations: result.recommendations || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}