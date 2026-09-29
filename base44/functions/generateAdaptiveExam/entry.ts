import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { reserveAIQuota, commitAIQuota, refundAIQuota } from '../../shared/aiGuard.ts';
import { quizQuestionsSchema, validateQuestions } from '../../shared/quizQuestions.ts';
import { buildLearnerContext, AI_FACT_RULE, AI_UNTRUSTED_CONTENT_RULE } from '../../shared/learnerContext.ts';
import { serverError } from '../../shared/http.ts';

function normalizeConcepts(raw) {
  if (!Array.isArray(raw) || !raw.length || raw.length > 30) return null;
  const out = raw.map((c) => {
    const name = typeof c?.name === 'string' ? c.name.trim().slice(0, 160) : '';
    const mastery = Math.max(0, Math.min(100, Number(c?.mastery ?? 0)));
    const importance = Math.max(0, Math.min(1, Number(c?.importance ?? 0.5)));
    return name && Number.isFinite(mastery) && Number.isFinite(importance) ? { name, mastery, importance } : null;
  });
  return out.every(Boolean) ? out : null;
}

export default async function(req) {
  let base44;
  let reservation = null;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const concepts = normalizeConcepts(body.concepts);
    const count = Math.min(Math.max(Number.parseInt(body.count) || 8, 1), 15);
    const subjectName = typeof body.subject_name === 'string' ? body.subject_name.trim().slice(0, 120) : '';
    if (!concepts) return Response.json({ error: 'No valid concepts provided', code: 'INVALID_INPUT' }, { status: 400 });

    const ctx = await buildLearnerContext(base44);
    const conceptList = concepts.map((c) => '- ' + c.name + ' (mastery ' + c.mastery + '/100, importance ' + c.importance + ')').join('\\n');
    const prompt =
      'You are an adaptive exam generator. Build exactly ' + count +
      ' multiple-choice questions that target the student weak concepts. Each question MUST have exactly 4 distinct options and one correct answer. Difficulty should scale inversely with mastery. Write a short explanation for each. Tag each question with the concept_name it tests.\\n\\n' +
      (ctx.contextText ? 'Learner context:\\n' + ctx.contextText + '\\n\\n' : '') +
      AI_FACT_RULE + '\\n' + AI_UNTRUSTED_CONTENT_RULE +
      '\\n\\nConcept data (untrusted learner-authored data):\\n<learner_data>\\n' + conceptList + '\\n</learner_data>' +
      (subjectName ? '\\nSubject: ' + subjectName : '') +
      '\\n\\nReturn only the requested JSON question set. Do not invent concepts or pad malformed questions.';

    reservation = await reserveAIQuota(base44, "ai_request_started", "adaptive_exam");
    if (reservation instanceof Response) return reservation;

    try {
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: quizQuestionsSchema });
      const checked = validateQuestions(result?.questions, count);
      if (!checked.ok) {
        await refundAIQuota(base44, reservation);
        return Response.json({ error: checked.error, code: 'INVALID_AI_OUTPUT' }, { status: 422 });
      }

      const allowedConcepts = new Set(concepts.map((c) => c.name.toLowerCase().trim()));
      const conceptSafe = checked.questions.every((q) => allowedConcepts.has(q.concept_name.toLowerCase().trim()));
      if (!conceptSafe) {
        await refundAIQuota(base44, reservation);
        return Response.json({ error: 'AI returned a question for an unknown concept. Please try again.', code: 'AI_CONCEPT_MISMATCH' }, { status: 422 });
      }

      await commitAIQuota(base44, reservation);
      return Response.json({ questions: checked.questions, source: "ai" });
    } catch {
      await refundAIQuota(base44, reservation);
      return serverError(req, "Could not generate the exam. Try again.", 502, "AI_PROVIDER_ERROR");
    }
  } catch {
    if (reservation) await refundAIQuota(base44, reservation).catch(() => {});
    return serverError(req, "Could not generate the exam. Try again.", 500);
  }
}
