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
    const transcript = (body.transcript || '').trim();
    const question = (body.question || '').trim();
    if (!transcript || !question) return Response.json({ error: 'Transcript and question are required' }, { status: 400 });

    const ctx = await buildLearnerContext(base44);
    const excerpt = transcript.slice(0, 12000);
    const prompt = `You are LectureMind. Answer the student's question based ONLY on this lecture transcript. If the answer isn't in the transcript, say so plainly. Reference the relevant part.

${ctx.contextText ? `Learner context:\n${ctx.contextText}\n\n` : ''}${AI_FACT_RULE}

Transcript:
${excerpt}

Question: ${question}

Return JSON: { answer (string), source_snippet (the relevant passage from the transcript, or empty string) }`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          answer: { type: "string" },
          source_snippet: { type: "string" }
        },
        required: ["answer"]
      }
    });

    return Response.json({ answer: result.answer || "", source_snippet: result.source_snippet || "" });
  } catch (error) {
    return Response.json({ error: 'Could not answer that right now.' }, { status: 500 });
  }
}