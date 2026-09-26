import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { uploadPrivateFile } from "@/lib/upload";
import StudyPanel from "@/components/StudyPanel";
import PageSkeleton from "@/components/PageSkeleton";
import Turnstile from "@/components/Turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/turnstileConfig";
import { Loader2, Headphones, Upload, Sparkles, AlertTriangle, FileText, Layers, HelpCircle, MessageSquareQuote, Send, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";

export default function LectureMind() {
  const { user } = useAuth();
  const { profile, loading } = useStudyOSData();
  const [title, setTitle] = useState("");
  const [audioUri, setAudioUri] = useState("");
  const [audioSize, setAudioSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lecture, setLecture] = useState(null);
  const [past, setPast] = useState([]);
  const [flipped, setFlipped] = useState(null);
  const [question, setQuestion] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const [openChunk, setOpenChunk] = useState(null);
  const [tsToken, setTsToken] = useState(null);
  const [tsBypass, setTsBypass] = useState(false);
  const [tsReset, setTsReset] = useState(0);

  useEffect(() => { base44.entities.Lecture.list("-created_date", 5).then(setPast).catch(() => {}); }, []);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(null);
    try {
      const { file_uri, size } = await uploadPrivateFile("audio", file, tsToken);
      setTsToken("");
      setTsReset((r) => r + 1);
      setAudioUri(file_uri);
      setAudioSize(size);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
    } catch (err) {
      setTsToken("");
      setTsReset((r) => r + 1);
      setError(err?.message || "Couldn't upload the audio.");
    }
    setBusy(false);
  }

  async function process() {
    if (!audioUri) return;
    setBusy(true); setError(null); setLecture(null); setAnswer(null);
    try {
      track(EVENTS.LECTURE_PROCESSED, {});
      const res = await base44.functions.invoke("processLecture", { file_uri: audioUri, file_size: audioSize, title: title.trim() || "Untitled lecture" });
      const data = res.data;
      const created = await base44.entities.Lecture.create({
        title: title.trim() || "Untitled lecture",
        audio_url: audioUri,
        transcript: data.transcript,
        summary: data.summary,
        chunks: data.chunks,
        concepts: data.concepts,
        flashcards: data.flashcards,
      });
      setLecture(created);
      setPast([created, ...past]);
      track(EVENTS.NOTE_UPLOADED, { source: "lecture", chunks: data.chunks.length, flashcards: data.flashcards.length });
    } catch (err) {
      setError("Couldn't process the lecture. Try a shorter or clearer recording.");
    }
    setBusy(false);
  }

  async function ask() {
    if (!question.trim() || !lecture) return;
    setAskBusy(true); setAnswer(null);
    try {
      const res = await base44.functions.invoke("askLecture", { transcript: lecture.transcript, question: question.trim() });
      setAnswer(res.data);
    } catch { setError("Couldn't answer that right now."); }
    setAskBusy(false);
  }

  return (
    <div className="max-w-[860px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study · Stage 5</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Headphones className="w-6 h-6 text-primary" /> LectureMind
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Upload a lecture recording. StudyOS transcribes it, chunks it into key points, extracts concepts, builds flashcards, and lets you ask the lecture questions.</p>
      </div>

      {!lecture && (
        <StudyPanel className="p-6 mb-4">
          <label className="eyebrow block mb-2">Lecture title (optional)</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cell Biology — Lecture 4"
            className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-[14px] text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-primary" />
          <Turnstile action={TURNSTILE_ACTIONS.upload} onVerify={setTsToken} onBypass={() => setTsBypass(true)} resetKey={tsReset} className="mb-3" />
          <label className={`block w-full rounded-lg border-2 border-dashed border-border bg-card px-4 py-10 text-center ${(!tsBypass && !tsToken) ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-secondary/40"}`}>
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <div className="text-sm text-foreground">{audioUri ? "Audio uploaded ✓ — tap to replace" : "Tap to upload an audio recording"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">mp3, wav, m4a, ogg, flac — up to 3.5 MB</div>
            <input type="file" accept="audio/*" onChange={onFile} className="hidden" />
          </label>
          <div className="flex justify-end mt-4">
            <button onClick={process} disabled={busy || !audioUri} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? "Transcribing & analyzing…" : "Process lecture"}
            </button>
          </div>
        </StudyPanel>
      )}

      {error && <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm"><AlertTriangle className="w-4 h-4" /> {error}</StudyPanel>}

      {lecture && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">{lecture.title}</h2>
            <button onClick={() => { setLecture(null); setTitle(""); setAudioUri(""); setAnswer(null); }} className="inline-flex items-center gap-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-3 py-2 hover:bg-secondary/70">
              <RotateCcw className="w-3.5 h-3.5" /> New lecture
            </button>
          </div>

          <StudyPanel className="p-6">
            <div className="eyebrow mb-2">Summary</div>
            <p className="text-[14px] text-foreground">{lecture.summary}</p>
          </StudyPanel>

          {lecture.concepts?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="eyebrow mb-3">Concepts</div>
              <div className="flex flex-wrap gap-2">
                {lecture.concepts.map((c, i) => <span key={i} className="rounded-full bg-primary/10 text-primary text-[12px] font-semibold px-3 py-1">{c}</span>)}
              </div>
            </StudyPanel>
          )}

          {lecture.flashcards?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3"><HelpCircle className="w-4 h-4 text-primary" /><div className="eyebrow">Flashcards ({lecture.flashcards.length})</div></div>
              <div className="grid sm:grid-cols-2 gap-3">
                {lecture.flashcards.map((f, i) => (
                  <button key={i} onClick={() => setFlipped(flipped === i ? null : i)} className="text-left rounded-lg bg-secondary/50 p-4 min-h-[100px] hover:bg-secondary">
                    <div className="text-[11px] text-muted-foreground mb-1">{flipped === i ? "Answer" : "Question"}</div>
                    <div className="text-[13px] text-foreground">{flipped === i ? f.answer : f.question}</div>
                  </button>
                ))}
              </div>
            </StudyPanel>
          )}

          {lecture.chunks?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3"><Layers className="w-4 h-4 text-primary" /><div className="eyebrow">Key points</div></div>
              <div className="space-y-2">
                {lecture.chunks.map((c, i) => (
                  <div key={i} className="rounded-lg border border-border">
                    <button onClick={() => setOpenChunk(openChunk === i ? null : i)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                      <span className="text-[13px] font-semibold text-foreground">{c.title}</span>
                      {openChunk === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    {openChunk === i && <div className="px-4 pb-3 text-[13px] text-muted-foreground">{c.text}</div>}
                  </div>
                ))}
              </div>
            </StudyPanel>
          )}

          <StudyPanel className="p-6">
            <div className="flex items-center gap-2 mb-3"><MessageSquareQuote className="w-4 h-4 text-primary" /><div className="eyebrow">Ask the lecture</div></div>
            <div className="flex gap-2">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} placeholder="Ask anything about this lecture…"
                className="flex-1 rounded-lg border border-border bg-card px-3 py-2.5 text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              <button onClick={ask} disabled={askBusy || !question.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 disabled:opacity-40 hover:opacity-90">
                {askBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {answer && (
              <div className="mt-4 rounded-lg bg-secondary/50 p-4">
                <div className="text-[14px] text-foreground">{answer.answer}</div>
                {answer.source_snippet && <div className="mt-3 text-[12px] text-muted-foreground border-l-2 border-border pl-3 italic">"{answer.source_snippet}"</div>}
              </div>
            )}
          </StudyPanel>
        </div>
      )}

      {!lecture && past.length > 0 && (
        <div>
          <div className="eyebrow px-1 mb-2">Recent lectures</div>
          <div className="space-y-2">
            {past.map((l) => (
              <button key={l.id} onClick={() => { setLecture(l); setAnswer(null); }} className="w-full text-left">
                <StudyPanel className="p-4 hover:bg-secondary/40">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-foreground text-[13px]">{l.title}</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">{l.flashcards?.length || 0} cards</span>
                  </div>
                </StudyPanel>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}