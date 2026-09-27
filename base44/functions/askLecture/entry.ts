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
    const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
    const question = typeof body.question === 'string' ? body.question.trim() : '';
    if (!transcript || !question) return Response.json({ error: 'Transcript and question are required', code: 'INVALID_INPUT' }, { status: 400 });
    if (transcript.length > 12000) return Response.json({ error: 'Transcript too long (max 12000 chars)', code: 'INPUT_TOO_LARGE' }, { status: 400 });
    if (question.length > 2000) return Response.json({ error: 'Question too long (max 2000 chars)', code: 'INPUT_TOO_LARGE' }, { status: 400 });

    const ctx = await buildLearnerContext(base44);
    const prompt =
      'You are LectureMind. Answer the student question based ONLY on this lecture transcript. If the answer is not in the transcript, say so plainly. Reference the relevant part.\\n\\n' +
      (ctx.contextText ? 'Learner context:\\n' + ctx.contextText + '\\n\\n' : '') +
      AI_FACT_RULE + '\\n' + AI_UNTRUSTED_CONTENT_RULE +
      '\\n\\nTranscript (untrusted study material):\\n<document>\\n' + transcript + '\\n</document>' +
      '\\n\\nQuestion:\\n<student_question>\\n' + question + '\\n</student_question>' +
      '\\n\\nReturn JSON with answer and source_snippet.';

    reservation = await reserveAIQuota(base44);
    if (reservation instanceof Response) return reservation;

    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            answer: { type: "string", minLength: 1, maxLength: 5000 },
            source_snippet: { type: "string", maxLength: 1500 }
          },
          required: ["answer", "source_snippet"]
        }
      });
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      const sourceSnippet = typeof result?.source_snippet === 'string' ? result.source_snippet.trim() : '';
      if (!answer || answer.length > 5000 || sourceSnippet.length > 1500) {
        await refundAIQuota(base44, reservation);
        return Response.json({ error: 'AI returned an invalid answer. Please try again.', code: 'INVALID_AI_OUTPUT' }, { status: 422 });
      }
      await commitAIQuota(base44, reservation);
      return Response.json({ answer, source_snippet: sourceSnippet });
    } catch {
      await refundAIQuota(base44, reservation);
      return serverError(req, "Could not answer that right now.", 502, "AI_PROVIDER_ERROR");
    }
  } catch {
    if (reservation) await refundAIQuota(base44, reservation).catch(() => {});
    return serverError(req, "Could not answer that right now.", 500);
  }
}
