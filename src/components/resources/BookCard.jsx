// One canonical textbook in the learner's book list. Shows only verified
// metadata that actually exists on the record, and states plainly whether
// StudyOS holds a readable copy or only the official source link.
import { Link } from "react-router-dom";
import { BookOpen, ExternalLink, Info } from "lucide-react";

const MEDIUM_LABEL = { english: "English Medium", urdu: "Urdu Medium", unspecified: "" };

export default function BookCard({ book }) {
  const readable = !!book.stored_file_uri;
  const medium = MEDIUM_LABEL[book.medium] || "";
  const meta = [book.class_or_year, medium, book.edition, book.syllabus_year].filter(Boolean).join(" · ");

  return (
    <div className="rounded-xl border border-border bg-elevated p-4">
      <div className="flex items-start gap-3">
        <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold text-foreground">{book.title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Official textbook{book.provider ? " · " + book.provider : ""}
          </div>
          {meta && <div className="text-[11px] text-muted-foreground mt-0.5">{meta}</div>}
          {book.subject_name && (
            <div className="text-[11px] text-muted-foreground mt-0.5">{book.subject_name}</div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mt-3">
        {readable ? (
          <Link
            to={`/book/${book.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-semibold px-3 py-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" /> Read
          </Link>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] text-muted-foreground">
            <Info className="w-3.5 h-3.5" /> No stored copy yet
          </div>
        )}
        {book.url && (
          <a
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border text-[12px] px-3 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Official source
          </a>
        )}
      </div>
    </div>
  );
}