// Admin-only textbook import. The operator supplies each board textbook PDF
// from their own machine; StudyOS stores that copy, validates it
// deterministically and indexes its chapters. Nothing is scraped, mirrored or
// auto-fetched from a board site, and an existing canonical record is attached
// to rather than duplicated.
import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StudyPanel from "@/components/StudyPanel";
import PageSkeleton from "@/components/PageSkeleton";
import { Upload, Loader2, CheckCircle2, AlertTriangle, BookOpen, ShieldAlert } from "lucide-react";

const toList = (r) => (Array.isArray(r) ? r : (r?.items || []));

export default function AdminTextbooks() {
  const { user, isLoadingAuth } = useAuth();
  const [pending, setPending] = useState([]);
  const [stored, setStored] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [status, setStatus] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        base44.entities.BoardResource.filter(
          { resource_type: "official_textbook", active: true, stored_copy_status: "not_stored" },
          "title",
          200
        ),
        base44.entities.BoardResource.filter(
          { resource_type: "official_textbook", active: true, stored_copy_status: "stored" },
          "title",
          200
        ),
      ]);
      setPending(toList(p));
      setStored(toList(s));
    } catch {
      setPending([]);
      setStored([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (isLoadingAuth || loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "admin") {
    return (
      <div className="max-w-[820px] mx-auto px-5 py-8">
        <StudyPanel className="p-6 text-[13px] text-muted-foreground">This area is limited to administrators.</StudyPanel>
      </div>
    );
  }

  const setBookStatus = (id, value) => setStatus((s) => ({ ...s, [id]: value }));

  async function importFile(book, file) {
    if (!file) return;
    setBusyId(book.id);
    setBookStatus(book.id, { state: "uploading", message: "Uploading the supplied copy…" });
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      setBookStatus(book.id, { state: "validating", message: "Validating and storing…" });
      const reg = await base44.functions.invoke("registerTextbook", {
        attach_to_record_id: book.id,
        file_uri,
        file_size: file.size,
        board_id: book.board_id,
        sub_board_id: book.sub_board_id || "",
        title: book.title,
        subject_name: book.subject_name || "",
        class_or_year: book.class_or_year || "",
        medium: book.medium || "unspecified",
        syllabus_year: book.syllabus_year || "",
        edition: book.edition || "",
        provider: book.provider || "",
        official_source_url: book.url || "",
      });
      if (!reg?.data?.ok) throw new Error(reg?.data?.error || "The file could not be registered.");

      setBookStatus(book.id, { state: "indexing", message: "Indexing chapters…" });
      const idx = await base44.functions.invoke("indexTextbookChapters", { book_resource_id: book.id });
      const d = idx?.data || {};
      setBookStatus(book.id, {
        state: d.status === "indexed" ? "done" : "warn",
        message:
          d.status === "indexed"
            ? `Stored and indexed — ${d.chapters} chapters (${d.method}).`
            : `Stored. Chapters not established: ${d.reason || "no reliable structure"}.`,
      });
      await load();
    } catch (err) {
      setBookStatus(book.id, {
        state: "error",
        message: err?.response?.data?.error || err?.message || "Import failed.",
      });
    }
    setBusyId("");
  }

  return (
    <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-6 md:py-8">
      <div className="mb-6">
        <div className="eyebrow">Operator</div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-1 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Textbook import
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Supply the board PDF for each registered textbook. StudyOS stores your copy, validates its structure, and indexes
          chapters from the book's own layout. Registering the same file twice changes nothing.
        </p>
      </div>

      <StudyPanel className="p-4 mb-6 flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-[hsl(var(--chart-3))] shrink-0 mt-0.5" />
        <p className="text-[12px] text-muted-foreground">
          These files are far larger than the learner upload scanner's 3.5 MB limit, so they are stored as
          <span className="text-foreground"> structurally validated but not malware-scanned</span>. That state is shown to
          learners as well. Redistribution permission remains <span className="text-foreground">pending verification</span>.
        </p>
      </StudyPanel>

      <div className="eyebrow mb-2">Awaiting a stored copy ({pending.length})</div>
      <div className="space-y-3 mb-8">
        {pending.length === 0 && (
          <StudyPanel className="p-4 text-[13px] text-muted-foreground">Every registered textbook has a stored copy.</StudyPanel>
        )}
        {pending.map((b) => {
          const st = status[b.id];
          const busy = busyId === b.id;
          return (
            <StudyPanel key={b.id} className="p-4">
              <div className="text-[14px] font-semibold text-foreground">{b.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {[b.board, b.sub_board_id, b.class_or_year, b.subject_name, b.medium !== "unspecified" ? b.medium : ""]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 break-all">
                {b.url ? "Official source: " + b.url : "No official source recorded"}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-3">
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={busy}
                  onChange={(e) => importFile(b, e.target.files?.[0])}
                  className="text-[12px] text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-primary-foreground"
                />
                {busy && <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> working…</span>}
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Upload className="w-3.5 h-3.5" /> 19–170 MB supported
                </span>
              </div>

              {st && (
                <div
                  className={`mt-3 flex items-start gap-2 text-[12px] ${
                    st.state === "error" ? "text-destructive" : st.state === "warn" ? "text-[hsl(var(--chart-3))]" : "text-muted-foreground"
                  }`}
                >
                  {st.state === "done" ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{st.message}</span>
                </div>
              )}
            </StudyPanel>
          );
        })}
      </div>

      <div className="eyebrow mb-2">Stored and readable ({stored.length})</div>
      <div className="space-y-2">
        {stored.map((b) => (
          <StudyPanel key={b.id} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] text-foreground truncate">{b.title}</div>
              <div className="text-[11px] text-muted-foreground">
                {b.index_status === "indexed" ? "chapters indexed" : b.index_status} · {(b.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
            <a href={`/book/${b.id}`} className="text-[12px] font-semibold text-primary shrink-0">Open</a>
          </StudyPanel>
        ))}
      </div>
    </div>
  );
}