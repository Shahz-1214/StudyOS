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
    const imageUrl = (body.image_url || '').trim();
    if (!text && !imageUrl) return Response.json({ error: 'Provide text or an image' }, { status: 400 });

    const prompt = `You are StudyLens, an academic vision assistant. Analyze the following problem ${imageUrl ? 'from the provided image' : 'from the text below'}. Do NOT just give the answer — structure the learning path so the student learns.

Extract:
- problem_summary: a concise restatement of the problem
- detected_concepts: the academic concepts involved (array of short names)
- key_information: the given data and what is being asked
- suggested_steps: an ordered learning path to solve it (array of strings)
- related_concept_names: broader concepts to review (array of short names)

${text ? `Problem text:\n${text}` : 'See the attached image.'}`;

    const payload = {
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          problem_summary: { type: "string" },
          detected_concepts: { type: "array", items: { type: "string" } },
          key_information: { type: "string" },
          suggested_steps: { type: "array", items: { type: "string" } },
          related_concept_names: { type: "array", items: { type: "string" } }
        },
        required: ["problem_summary", "detected_concepts", "suggested_steps"]
      }
    };
    if (imageUrl) payload.file_urls = [imageUrl];

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM(payload);
    return Response.json({
      problem_summary: result.problem_summary || "",
      detected_concepts: result.detected_concepts || [],
      key_information: result.key_information || "",
      suggested_steps: result.suggested_steps || [],
      related_concept_names: result.related_concept_names || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}