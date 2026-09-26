import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useStudyOSData } from "@/hooks/useStudyOSData";
import { base44 } from "@/api/base44Client";
import { track, EVENTS } from "@/lib/analytics";
import { uploadPrivateFile } from "@/lib/upload";
import StudyPanel from "@/components/StudyPanel";
import PageSkeleton from "@/components/PageSkeleton";
import Turnstile from "@/components/Turnstile";
import { TURNSTILE_ACTIONS } from "@/lib/turnstileConfig";
import { Loader2, ScanLine, ImagePlus, Type, Sparkles, AlertTriangle, ArrowRight, Lightbulb } from "lucide-react";

export default function StudyLens() {
  const { user } = useAuth();
  const { profile, concepts, loading } = useStudyOSData();
  const [tab, setTab] = useState("text");
  const [text, setText] = useState("");
  const [fileUri, setFileUri] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [tsToken, setTsToken] = useState(null);
  const [tsBypass, setTsBypass] = useState(false);
  const [tsReset, setTsReset] = useState(0);
  const [pendingFile, setPendingFile] = useState(null);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (!profile || !profile.onboarding_completed) return <Navigate to="/onboarding" replace />;

  async function processSelectedFile(file) {
    setBusy(true);
    setError(null);
    try {
      const { file_uri, size } = await uploadPrivateFile("image", file, tsToken);
      setFileUri(file_uri);
      setFileSize(size);
      setPreviewUrl(URL.createObjectURL(file));
      setPendingFile(null);
    } catch (err) {
      // Do not retain a rejected/failed file for a later Turnstile token.
      // This prevents an unsafe or failed selection from being retried
      // implicitly after a security-check refresh.
      setPendingFile(null);
      setError(err?.message || "Couldn't upload the image. Try again.");
    } finally {
      setTsToken("");
      setTsReset((r) => r + 1);
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    // Keep the picker usable even before Turnstile finishes. The file is not
    // uploaded or processed until the server-verifiable token is available.
    if (!tsBypass && !tsToken) {
      setPendingFile(file);
      setError("Complete the security check above; the selected photo will upload automatically.");
      return;
    }

    await processSelectedFile(file);
  }

  useEffect(() => {
    if (!pendingFile || busy || (!tsBypass && !tsToken)) return;
    processSelectedFile(pendingFile);
  }, [pendingFile, busy, tsBypass, tsToken]);

  async function analyze() {
    if (!text.trim() && !fileUri) return;
    setBusy(true); setError(null); setResult(null);
    try {
      track(EVENTS.STUDYLENS_USED, { mode: fileUri ? "image" : "text" });
      const res = await base44.functions.invoke("studyLensExtract", { text: text.trim(), file_uri: fileUri, file_size: fileSize });
      setResult(res.data);
    } catch (err) {
      setError("Analysis failed. Please try again.");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-[820px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Study · Stage 3</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <ScanLine className="w-6 h-6 text-primary" /> StudyLens
          <span className="text-[9px] font-bold uppercase tracking-wide rounded-full border border-primary/30 text-primary px-2 py-1">Pro · 1 credit</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Capture a problem by photo or paste it in. Get structured extraction, concept detection, and a learning path — not just an answer.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("text")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === "text" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <Type className="w-4 h-4" /> Paste text
        </button>
        <button onClick={() => setTab("image")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${tab === "image" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          <ImagePlus className="w-4 h-4" /> Upload photo
        </button>
      </div>

      <StudyPanel className="p-6 mb-4">
        {tab === "text" ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a problem, equation, or passage here…"
            className="w-full min-h-[140px] rounded-lg border border-border bg-card px-4 py-3 text-[14px] text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ) : (
          <div>
            <Turnstile action={TURNSTILE_ACTIONS.upload} onVerify={(token) => { setTsToken(token); if (token) setError(null); }} onBypass={() => setTsBypass(true)} resetKey={tsReset} className="mb-3" />
            {(!tsBypass && !tsToken) && (
              <div className="mb-3 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
                Complete the security check above before the photo is sent for malware scanning.
              </div>
            )}
            <label className={`block w-full rounded-lg border-2 border-dashed border-border bg-card px-4 py-10 text-center ${busy ? "opacity-50 pointer-events-none" : "cursor-pointer hover:bg-secondary/40"}`}>
              <ImagePlus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-foreground">{fileUri ? "Image uploaded ✓ — tap to replace" : "Tap to upload a photo of the problem"}</div>
              <div className="text-[11px] text-muted-foreground mt-1">JPG, PNG, or WEBP — up to 3.5 MB</div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} disabled={busy} className="hidden" />
            </label>
            {previewUrl && <img src={previewUrl} alt="preview" className="mt-3 max-h-48 rounded-lg border border-border" />}
          </div>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={analyze} disabled={busy || (!text.trim() && !fileUri)} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 disabled:opacity-40 hover:opacity-90">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>
      </StudyPanel>

      {error && (
        <StudyPanel className="p-4 mb-4 flex items-center gap-2 text-destructive text-sm">
          <AlertTriangle className="w-4 h-4" /> {error}
        </StudyPanel>
      )}

      {result && (
        <div className="space-y-4">
          <StudyPanel className="p-6">
            <div className="eyebrow mb-2">Problem summary</div>
            <p className="text-[14px] text-foreground">{result.problem_summary}</p>
          </StudyPanel>

          {result.detected_concepts?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="eyebrow mb-3">Detected concepts</div>
              <div className="flex flex-wrap gap-2">
                {result.detected_concepts.map((c, i) => (
                  <span key={i} className="rounded-full bg-primary/10 text-primary text-[12px] font-semibold px-3 py-1">{c}</span>
                ))}
              </div>
            </StudyPanel>
          )}

          {result.key_information && (
            <StudyPanel className="p-6">
              <div className="eyebrow mb-2">Key information</div>
              <p className="text-[14px] text-foreground">{result.key_information}</p>
            </StudyPanel>
          )}

          {result.suggested_steps?.length > 0 && (
            <StudyPanel className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-primary" />
                <div className="eyebrow">Learning path</div>
              </div>
              <ol className="space-y-2">
                {result.suggested_steps.map((s, i) => (
                  <li key={i} className="flex gap-3 text-[13px] text-foreground">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary grid place-items-center text-[11px] font-bold shrink-0">{i + 1}</span>
                    {s}
                  </li>
                ))}
              </ol>
            </StudyPanel>
          )}

          <div className="flex gap-2">
            <Link to="/practice" className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 hover:opacity-90">
              Practice related <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/tool/homework" state={{ problem: result.problem_summary || text }} className="inline-flex items-center gap-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-semibold px-4 py-2.5 hover:bg-secondary/70">
              Get homework help
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}