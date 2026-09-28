// Deterministic textbook layer — NO AI anywhere in this module.
//
// Storage validation, integrity hashing, page/chapter indexing and chapter
// digesting all work with ordinary deterministic code (bytes, hashes, PDF
// structure, plain text). The textbook must stay usable when AI is unavailable.
//
// Security note: this is NOT the learner media gate. The learner upload gate
// (uploadSecurity.ts + scanUploadedMedia) is unchanged and still enforces its
// own size/structure limits and malware scan for images and audio. These
// operator-supplied, admin-only textbook files exceed the malware scanner's
// 3.5 MB ceiling, so their scan state is recorded truthfully as not_scanned —
// never presented as scanned.

import { sha256Hex, readQuarantinedBytes } from "./uploadSecurity.ts";

// Platform storage accepted a 167 MB upload and served range requests in the
// verification pass; this is a guard, not a discovered platform limit.
export const MAX_TEXTBOOK_BYTES = 250 * 1024 * 1024;

// Active-content tokens that make a textbook unfit for release. Deliberately
// narrow and ASCII-literal: false positives would block genuine textbooks, so
// short/noisy tokens (/JS) are excluded. /EmbeddedFile is deliberately NOT
// rejected — embedded font files are legitimate and appear in most real books.
const ACTIVE_CONTENT_TOKENS = ["/JavaScript", "/Launch", "/RichMedia", "/XFA"];

function asciiAt(bytes: Uint8Array, offset: number, len: number) {
  let s = "";
  for (let i = 0; i < len && offset + i < bytes.length; i++) s += String.fromCharCode(bytes[offset + i]);
  return s;
}

function findToken(bytes: Uint8Array, token: string) {
  const needle = token.split("").map((c) => c.charCodeAt(0));
  const n = bytes.length;
  const m = needle.length;
  if (m === 0 || n < m) return false;
  const first = needle[0];
  for (let i = 0; i <= n - m; i++) {
    if (bytes[i] !== first) continue;
    let ok = true;
    for (let j = 1; j < m; j++) {
      if (bytes[i + j] !== needle[j]) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}

// Deterministic byte-level structural validation of an operator-supplied PDF.
// Answers only what can be established from the bytes themselves.
export function validatePdfBytes(bytes: Uint8Array) {
  const size = bytes.byteLength;
  if (!size) return { ok: false as const, code: "EMPTY_FILE" };
  if (size > MAX_TEXTBOOK_BYTES) return { ok: false as const, code: "TOO_LARGE" };

  if (asciiAt(bytes, 0, 4) !== "%PDF") return { ok: false as const, code: "NOT_A_PDF" };

  const tailStart = Math.max(0, size - 2048);
  const tail = asciiAt(bytes, tailStart, size - tailStart);
  if (!tail.includes("%%EOF")) return { ok: false as const, code: "TRUNCATED_PDF" };

  // An encrypted document cannot be indexed or served page-by-page.
  const head = asciiAt(bytes, 0, Math.min(size, 4096));
  const encrypted = head.includes("/Encrypt") || tail.includes("/Encrypt");

  const activeContent = ACTIVE_CONTENT_TOKENS.filter((t) => findToken(bytes, t));
  if (activeContent.length) {
    return { ok: false as const, code: "ACTIVE_CONTENT", activeContent };
  }
  if (encrypted) return { ok: false as const, code: "ENCRYPTED_PDF" };

  return {
    ok: true as const,
    size,
    pageCountHint: countPageObjects(bytes),
  };
}

// Page count from PDF structure when the parser is unavailable. This is a
// hint only — the parser's own count wins, and 0 is reported as unknown.
function countPageObjects(bytes: Uint8Array) {
  const sample = asciiAt(bytes, 0, Math.min(bytes.length, 60 * 1024 * 1024));
  const pages = (sample.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return pages > 0 && pages < 20000 ? pages : 0;
}

export async function hashTextbookBytes(bytes: Uint8Array) {
  return sha256Hex(bytes);
}

// Read an already-stored textbook copy server-side with a hard byte cap.
export async function readStoredBook(base44: any, fileUri: string, maxBytes = MAX_TEXTBOOK_BYTES) {
  const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
  const signedUrl = String(signed?.signed_url || "");
  if (!signedUrl) return { ok: false as const, code: "SIGN_URL_FAILED" };
  const res = await fetch(signedUrl);
  if (!res.ok) return { ok: false as const, code: "SOURCE_READ_FAILED" };
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared && declared > maxBytes) return { ok: false as const, code: "TOO_LARGE" };
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) return { ok: false as const, code: "EMPTY_FILE" };
  if (bytes.byteLength > maxBytes) return { ok: false as const, code: "TOO_LARGE" };
  return { ok: true as const, bytes };
}

// Exposed for the admin upload path: reads the operator's freshly uploaded file
// with the caller's own permissions and the same cap.
export async function readOperatorUpload(base44: any, fileUri: string) {
  return readQuarantinedBytes(base44, fileUri, MAX_TEXTBOOK_BYTES);
}

// ---------------------------------------------------------------------------
// Chapter identification (PRD §13). Preference order: PDF outline -> table of
// contents -> operator-supplied map -> not_indexed. Never guesses.
// ---------------------------------------------------------------------------

const TOC_LINE = /^\s*(chapter|unit|section|باب|سبق|یونٹ)\s*[-–.:]?\s*(\d{1,3})\b(.{0,120}?)(\d{1,4})\s*$/i;

// Conservative table-of-contents detection: requires at least four matches with
// strictly increasing page numbers. Anything less is treated as no structure.
function deriveChaptersFromToc(pageTexts: string[], pageCount: number) {
  const limit = Math.min(pageTexts.length, 30);
  const found: { title: string; page: number }[] = [];
  for (let i = 0; i < limit; i++) {
    const lines = String(pageTexts[i] || "").split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(TOC_LINE);
      if (!m) continue;
      const page = Number.parseInt(m[4], 10);
      if (!Number.isFinite(page) || page < 1 || page > pageCount) continue;
      const title = `${m[1].trim()} ${m[2]}`.replace(/\s+/g, " ") + (m[3] ? " — " + m[3].trim() : "");
      found.push({ title: title.slice(0, 200), page });
    }
  }
  if (found.length < 4) return null;
  const deduped: { title: string; page: number }[] = [];
  for (const f of found) {
    if (deduped.some((d) => d.page === f.page)) continue;
    deduped.push(f);
  }
  for (let i = 1; i < deduped.length; i++) {
    if (deduped[i].page <= deduped[i - 1].page) return null;
  }
  if (deduped.length < 4) return null;
  return deduped;
}

// Verified in this runtime: `pdfjs-dist` (4.2.67 legacy and 3.11.174 legacy)
// resolves as a module but never yields a document here, while `unpdf` — a
// serverless-oriented pdfjs wrapper — loads and extracts text correctly, so it
// is the single parser this layer uses. If it is ever unavailable the caller
// degrades to the honest not_indexed state rather than guessing.
async function loadPdfDocument(bytes: Uint8Array) {
  try {
    const unpdf = await import("npm:unpdf@0.12.1");
    return await unpdf.getDocumentProxy(bytes);
  } catch {
    return null;
  }
}

// Extract page count, text per page and chapter boundaries. Returns
// { ok: false } when no parser is available, which the caller records as the
// honest not_indexed state rather than inventing structure.
export async function extractPdfIndex(bytes: Uint8Array, budgetMs = 100000) {
  const doc = await loadPdfDocument(bytes);
  if (!doc) return { ok: false as const, code: "EXTRACTOR_UNAVAILABLE" };

  const started = Date.now();
  try {
    const pageCount = doc.numPages;

    // Chapter boundaries: the document's own outline first.
    let chapters: { title: string; page: number }[] = [];
    let method = "pdf_outline";
    try {
      const outline = await doc.getOutline();
      if (Array.isArray(outline) && outline.length) {
        const resolve = async (item: any) => {
          try {
            let dest = item.dest;
            if (typeof dest === "string") dest = await doc.getDestination(dest);
            if (!Array.isArray(dest)) return 0;
            const ref = dest[0];
            const idx = await doc.getPageIndex(ref);
            return Number(idx) + 1;
          } catch {
            return 0;
          }
        };
        const flat: { title: string; page: number }[] = [];
        for (const item of outline) {
          const title = String(item?.title || "").trim().slice(0, 200);
          if (!title) continue;
          const page = await resolve(item);
          if (page < 1 || page > pageCount) continue;
          if (flat.some((f) => f.page === page)) continue;
          flat.push({ title, page });
        }
        if (flat.length >= 2) chapters = flat;
        else method = "none";
      } else {
        method = "none";
      }
    } catch {
      method = "none";
    }

    // Page text (also the table-of-contents fallback source).
    const pageTexts: string[] = [];
    let textTruncated = false;
    for (let p = 1; p <= pageCount; p++) {
      if (Date.now() - started > budgetMs) { textTruncated = true; break; }
      try {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        // Line structure is preserved (hasEOL) so table-of-contents detection
        // can work on real lines rather than one flattened blob.
        const raw = (content?.items || [])
          .map((it: any) => {
            const s = typeof it?.str === "string" ? it.str : "";
            return it?.hasEOL ? s + "\n" : s;
          })
          .join("");
        const text = raw.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
        pageTexts.push(text);
        if (typeof page.cleanup === "function") page.cleanup();
      } catch {
        pageTexts.push("");
      }
    }

    if (!chapters.length && pageTexts.length >= 4) {
      const toc = deriveChaptersFromToc(pageTexts, pageCount);
      if (toc) { chapters = toc; method = "toc"; }
    }

    return {
      ok: true as const,
      pageCount,
      pageTexts,
      textTruncated,
      chapters,
      method: chapters.length ? method : "none",
    };
  } catch {
    return { ok: false as const, code: "PARSE_FAILED" };
  } finally {
    try { if (typeof doc.destroy === "function") await doc.destroy(); } catch { /* optional */ }
  }
}

// Operator-supplied chapter map (PRD §13 method 3). Strictly validated: any
// inconsistency rejects the whole map rather than half-applying it.
export function normalizeOperatorChapterMap(raw: unknown) {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 400) return null;
  const out: { chapter_index: number; chapter_title: string; start_page: number; end_page: number }[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r: any = raw[i] || {};
    const title = typeof r.chapter_title === "string" ? r.chapter_title.trim().slice(0, 200) : "";
    const start = Number.parseInt(r.start_page);
    const end = Number.parseInt(r.end_page);
    if (!title || !Number.isFinite(start) || !Number.isFinite(end)) return null;
    if (start < 1 || end < start) return null;
    out.push({ chapter_index: i + 1, chapter_title: title, start_page: start, end_page: end });
  }
  for (let i = 1; i < out.length; i++) {
    if (out[i].start_page <= out[i - 1].start_page) return null;
  }
  return out;
}

// Turn chapter start pages into bounded page ranges.
export function chaptersFromStartPages(
  starts: { title: string; page: number }[],
  pageCount: number
) {
  return starts.map((s, i) => {
    const next = starts[i + 1];
    const end = next ? Math.max(s.page, next.page - 1) : pageCount;
    return {
      chapter_index: i + 1,
      chapter_title: s.title,
      start_page: s.page,
      end_page: Math.min(end, pageCount),
    };
  });
}

// Deterministic digest: a bounded representation spread across the chapter, so
// the grounding source represents the whole chapter rather than only its first
// lines. Kept under the existing 8,000-character AI input ceiling.
export function buildChapterDigest(text: string, maxChars = 6000) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= maxChars) return clean;
  const sentences = clean.split(/(?<=[.!?۔])\s+/).filter((s) => s.trim().length > 1);
  if (sentences.length <= 3) return clean.slice(0, maxChars);
  const picks = [
    sentences.slice(0, Math.ceil(sentences.length / 6)).join(" "),
    sentences.slice(Math.floor(sentences.length / 2), Math.floor(sentences.length / 2) + 4).join(" "),
    sentences.slice(-Math.ceil(sentences.length / 6)).join(" "),
  ];
  return picks.filter(Boolean).join(" … ").slice(0, maxChars);
}

export function countWords(text: string) {
  const clean = String(text || "").trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}