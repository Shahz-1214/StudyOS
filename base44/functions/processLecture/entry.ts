import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { enforceAIQuota } from '../../shared/aiGuard.ts';
import { validateUploadedFile, createSignedFileUrl } from '../../shared/uploadSecurity.ts';
import { buildLearnerContext, AI_FACT_RULE } from '../../shared/learnerContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const guard = await enforceAIQuota(base44);
    if (guard) return guard;

    const body = await req.json();
    const fileUri = (body.file_uri || '').trim();
    const declaredSize = typeof body.file_size === 'number' ? body.file_size : undefined;
    if (!fileUri) return Response.json({ error: 'Audio file is required' }, { status: 400 });

    const v = validateUploadedFile('audio', fileUri, declaredSize);
    if (!v.ok) return Response.json({ error: v.error, code: v.code }, { status: 400 });

    // 1. Mint a short-lived signed URL and transcribe.
    const audioUrl = await createSignedFileUrl(base44, fileUri, 180);
    const tr = await base44.asServiceRole.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
    const transcript = (typeof tr === "string" ? tr : (tr.transcript || tr.text || "")).trim();
    if (!transcript) return Response.json({ error: 'Could not transcribe the audio' }, { status: 422 });

    // 2. Structure into study material, with canonical learner/board context.
    const ctx = await buildLearnerContext(base44);
    const excerpt = transcript.slice(0, 12000);
    const prompt = `You are LectureMind. Analyze this lecture transcript and produce structured study material.

${ctx.contextText ? `Learner context:\n${ctx.contextText}\n\n` : ''}${AI_FACT_RULE}

Transcript:
${excerpt}

Return JSON: {
  summary (string, 2-4 sentences),
  concepts (array of short concept names),
  chunks (array of { title, text } — the key points/passages of the lecture),
  flashcards (array of { question, answer })
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          concepts: { type: "array", items: { type: "string" } },
          chunks: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, text: { type: "string" } },
              required: ["title", "text"]
            }
          },
          flashcards: {
            type: "array",
            items: {
              type: "object",
              properties: { question: { type: "string" }, answer: { type: "string" } },
              required: ["question", "answer"]
            }
          }
        },
        required: ["summary", "concepts", "chunks", "flashcards"]
      }
    });

    return Response.json({
      transcript,
      summary: result.summary || "",
      concepts: result.concepts || [],
      chunks: (result.chunks || []).map((c) => ({ title: c.title || "", text: c.text || "" })).filter((c) => c.text),
      flashcards: (result.flashcards || []).map((f) => ({ question: f.question || "", answer: f.answer || "" })).filter((f) => f.question && f.answer),
    });
  } catch (error) {
    return Response.json({ error: 'Could not process the lecture. Try a shorter or clearer recording.' }, { status: 500 });
  }
}