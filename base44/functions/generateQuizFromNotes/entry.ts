import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reserveAIQuota, commitAIQuota, refundAIQuota } from '../../shared/aiGuard.ts';
import { quizQuestionsSchema, validateQuestions } from '../../shared/quizQuestions.ts';
import { buildLearnerContext, AI_FACT_RULE, AI_UNTRUSTED_CONTENT_RULE } from '../../shared/learnerContext.ts';
import { serverError } from '../../shared/http.ts';

export default async function(req) {
  let base44;
  let reservation = null;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const count = Math.min(Math.max(Number.parseInt(body.count) || 5, 1), 10);
    const subjectName = typeof body.subject_name === 'string' ? body.subject_name.trim().slice(0, 120) : '';

    if (!notes) return Response.json({ error: 'Notes are required', code: 'INVALID_INPUT' }, { status: 400 });
    if (notes.length > 8000) return Response.json({ error: 'Notes too long (max 8000 chars)', code: 'INPUT_TOO_LARGE' }, { status: 400 });

    const ctx = await buildLearnerContext(base44);
    const prompt =
      'You are an academic quiz generator. From the following study notes' +
      (subjectName ? ' in ' + subjectName : '') +
      ', create exactly ' + count +
      ' multiple-choice questions that test understanding, not just recall. Each question MUST have exactly 4 distinct options and exactly one correct answer. Assign a difficulty (easy, medium, or hard). Write a short explanation for the correct answer. Tag each question with the concept name it tests.\\n\\n' +
      (ctx.contextText ? 'Learner context:\\n' + ctx.contextText + '\\n\\n' : '') +
      AI_FACT_RULE + '\\n' + AI_UNTRUSTED_CONTENT_RULE +
      '\\n\\nReturn JSON with a "questions" array. Do not add, remove, pad, or invent missing questions.' +
      '\\n\\nNotes (untrusted study material):\\n<document>\\n' + notes + '\\n</document>';

    reservation = await reserveAIQuota(base44);
    if (reservation instanceof Response) return reservation;

    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: quizQuestionsSchema
      });
      const checked = validateQuestions(result?.questions, count);
      if (!checked.ok) {
        await refundAIQuota(base44, reservation);
        return Response.json({ error: checked.error, code: 'INVALID_AI_OUTPUT' }, { status: 422 });
      }
      await commitAIQuota(base44, reservation);
      return Response.json({ questions: checked.questions, source: "ai" });
    } catch {
      await refundAIQuota(base44, reservation);
      return serverError(req, "Could not generate questions from these notes. Try again.", 502, "AI_PROVIDER_ERROR");
    }
  } catch {
    if (reservation) await refundAIQuota(base44, reservation).catch(() => {});
    return serverError(req, "Could not generate questions from these notes. Try again.", 500);
  }
}
