// Verified metadata for a stored textbook. States only what is actually
// recorded — including what was NOT done (no malware scan) and what is not yet
// established (redistribution permission). Never implies more than reality.
import StudyPanel from "@/components/StudyPanel";
import { ShieldAlert, ShieldCheck, BookMarked } from "lucide-react";

function formatBytes(n) {
  const b = Number(n) || 0;
  if (!b) return "";
  if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(1) + " MB";
  return Math.max(1, Math.round(b / 1024)) + " KB";
}

const MEDIUM_LABEL = { english: "English Medium", urdu: "Urdu Medium", unspecified: "" };

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[11px] text-foreground text-right">{value}</span>
    </div>
  );
}

export default function BookMeta({ book, chapterCount = 0 }) {
  const size = formatBytes(book.file_size_bytes);
  const indexed = book.index_status === "indexed";
  const notScanned = book.malware_scan_status !== "scanned_clean";

  return (
    <StudyPanel className="p-4">
      <div className="eyebrow mb-2">Verified details</div>
      <Row label="Board" value={book.board} />
      <Row label="Class" value={book.class_or_year} />
      <Row label="Subject" value={book.subject_name} />
      <Row label="Medium" value={MEDIUM_LABEL[book.medium] || ""} />
      <Row label="Edition" value={book.edition} />
      <Row label="Syllabus year" value={book.syllabus_year} />
      <Row label="Source" value={book.provider} />
      <Row label="Pages" value={book.page_count ? String(book.page_count) : ""} />
      <Row label="File size" value={size} />

      <div className="mt-3 space-y-2">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            {book.structural_validation === "structurally_validated"
              ? "File structure validated before release."
              : "File structure has not been validated."}
          </span>
        </div>

        {notScanned && (
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[hsl(var(--chart-3))]" />
            <span>Not malware-scanned — this file is larger than the current scanner's limit.</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <BookMarked className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          <span>
            {indexed
              ? `Chapters indexed from the book's own structure (${chapterCount}).`
              : "Chapters have not been indexed for this book yet."}
          </span>
        </div>

        {book.rights_status === "pending_verification" && (
          <div className="text-[11px] text-muted-foreground">
            Redistribution permission: pending verification.
          </div>
        )}
      </div>
    </StudyPanel>
  );
}