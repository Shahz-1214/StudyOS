import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { quizQuestionsSchema, sanitizeQuestions } from '../../shared/quizQuestions.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const concepts = Array.isArray(body.concepts) ? body.concepts : [];
    const count = Math.min(Math.max(parseInt(body.count) || 8, 1), 15);
    const subjectName = (body.subject_name || '').trim();

    if (!concepts.length) return Response.json({ error: 'No concepts provided' }, { status: 400 });

    const conceptList = concepts.map((c) => `- ${c.name} (mastery ${c.mastery ?? 0}/100, importance ${c.importance ?? 0.5})`).join('\n');

    const prompt = `You are an adaptive exam generator. Build a ${count}-question multiple-choice exam that targets the student's weakest concepts. Each question MUST have exactly 4 options and one correct answer. Difficulty should scale inversely with mastery — lower-mastery concepts get easier scaffolded questions, higher-mastery concepts get harder application questions. Write a short explanation for each. Tag each question with the concept_name it tests.

Student's concepts (mastery 0-100, lower = weaker):
${conceptList}
${subjectName ? `Subject: ${subjectName}` : ''}

Return JSON: { questions: [{ prompt, options (4 strings), correct_index (0-3), difficulty, explanation, concept_name }] }`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: quizQuestionsSchema
    });

    const questions = sanitizeQuestions(result.questions);
    if (!questions.length) return Response.json({ error: 'Could not generate an exam' }, { status: 422 });
    return Response.json({ questions, source: "ai" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}