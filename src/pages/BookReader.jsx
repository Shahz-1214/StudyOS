// In-app reader for a stored board textbook. The file is served from private
// storage through a short-lived signed URL, so the browser streams it with
// range requests and opens the first page without downloading the whole book.
// Only verified metadata that exists on the record is displayed, and the
// security/rights state is stated truthfully.
import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import StudyPanel from "@/components/StudyPanel";
import PageSkeleton from "@/components/PageSkeleton";
import ChapterList from "@/components/resources/ChapterList";
import BookMeta from "@/components/resources/BookMeta";
import { ArrowLeft, Download, ExternalLink, BookOpen, Info } from "lucide-react";

const toList = (r) => (Array.isArray(r) ? r : (r?.items || []));

export default function BookReader() {
  const { id } = useParams();
  const { user } = useAuth();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [url, setUrl] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const rec = await base44.entities.BoardResource.get(id);
        if (cancelled) return;
        setBook(rec);
        if (rec?.stored_file_uri) {
          try {
            const signed = await base44.integrations.Core.CreateFileSignedUrl({
              file_uri: rec.stored_file_uri,
              expires_in: 3600,
            });
            if (!cancelled) setUrl(String(signed?.signed_url || ""));
          } catch {
            if (!cancelled) setUrl("");
          }
        }
        const ch = await base44.entities.TextbookChapter.filter(
          { book_resource_id: id, active: true },
          "chapter_index",
          300
        );
        if (!cancelled) setChapters(toList(ch));
      } catch {
        if (!cancelled) setError("This textbook could not be opened.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/" replace />;

  if (error || !book) {
    return (
      <div className="max-w-[1000px] mx-auto px-5 md:px-8 py-8">
        <StudyPanel className="p-6 text-center">
          <p className="text-sm text-muted-foreground">{error || "This textbook was not found."}</p>
          <Link to="/subject-hub" className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
            <ArrowLeft className="w-4 h-4" /> Back to Subject Hub
          </Link>
        </StudyPanel>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
      <Link to="/subject-hub" className="inline-flex items-center gap-2 text-[12px] text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Subject Hub
      </Link>

      <div className="mb-4">
        <div className="eyebrow">Official textbook</div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1 flex items-start gap-2">
          <BookOpen className="w-5 h-5 text-primary shrink-0 mt-1" />
          {book.title}
        </h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {url && (
          <a
            href={url}
            download={(book.stored_file_name || book.title || "textbook") + ".pdf"}
            className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold px-4 py-2"
          >
            <Download className="w-4 h-4" /> Download the book
          </a>
        )}
        {book.url && (
          <a
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border text-[13px] px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-4 h-4" /> Official source
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4">
        <StudyPanel className="p-2 md:p-3 overflow-hidden">
          {url ? (
            <iframe
              key={page}
              title={book.title}
              src={`${url}#page=${page}`}
              className="w-full rounded-lg bg-elevated"
              style={{ height: "min(78vh, 900px)" }}
            />
          ) : (
            <div className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
                <Info className="w-4 h-4" /> No stored copy is available for this book, so there is nothing to read in the app.
              </div>
              {book.url && (
                <a href={book.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-[13px] font-semibold text-primary">
                  <ExternalLink className="w-4 h-4" /> Open the official source
                </a>
              )}
            </div>
          )}
        </StudyPanel>

        <div className="space-y-4">
          {!!chapters.length && (
            <StudyPanel className="p-4">
              <ChapterList chapters={chapters} currentPage={page} onSelectPage={(p) => setPage(p || 1)} />
            </StudyPanel>
          )}
          <BookMeta book={book} chapterCount={chapters.length} />
        </div>
      </div>
    </div>
  );
}