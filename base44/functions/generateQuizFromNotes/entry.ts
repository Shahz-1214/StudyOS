import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { enforceAIQuota } from '../../shared/aiGuard.ts';
import { quizQuestionsSchema, sanitizeQuestions } from '../../shared/quizQuestions.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const guard = await enforceAIQuota(base44);
    if (guard) return guard;

    const body = await req.json();
    const notes = (body.notes || '').trim();
    const count = Math.min(Math.max(parseInt(body.count) || 5, 1), 10);
    const subjectName = (body.subject_name || '').trim();

    if (!notes) return Response.json({ error: 'Notes are required' }, { status: 400 });
    if (notes.length > 8000) return Response.json({ error: 'Notes too long (max 8000 chars)' }, { status: 400 });

    const prompt = `You are an academic quiz generator. From the following study notes${subjectName ? ` in ${subjectName}` : ''}, create ${count} multiple-choice questions that test understanding, not just recall. Each question MUST have exactly 4 options and exactly one correct answer. Assign a difficulty (easy, medium, or hard). Write a short explanation for the correct answer. Tag each question with the concept name it tests.

Return JSON with a "questions" array. Each question: { prompt, options (array of 4 strings), correct_index (0-3), difficulty, explanation, concept_name }.

Notes:
${notes}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: quizQuestionsSchema
    });

    const questions = sanitizeQuestions(result.questions);
    if (!questions.length) return Response.json({ error: 'Could not generate valid questions from these notes' }, { status: 422 });

    return Response.json({ questions, source: "ai" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}