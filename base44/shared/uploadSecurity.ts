// Canonical server-side upload-security gate, shared by scanUploadedMedia and
// every media processor (studyLensExtract, processLecture).
//
// Security invariant: uploaded bytes are untrusted data, never application
// code. A file becomes processable ONLY after the scanUploadedMedia pipeline
// records status 'approved' for the authenticated owner: content-based type
// detection, size/structure limits, archive and active-content rejection, a
// real malware scan (Cloudmersive Virus Scan API; the gate FAILS CLOSED if the
// scanner is unavailable), and
// a safe derivative. Filenames, extensions, and declared MIME types are never
// trusted for classification — the bytes are.

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];
const AUDIO_EXT = [".mp3", ".wav", ".m4a", ".ogg", ".oga", ".webm", ".mp4", ".mpeg", ".mpga", ".flac"];

export function validateUploadedFile(kind: "image" | "audio", fileUri: string, declaredSize?: number) {
  const ext = (fileUri || "").toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
  const allow = kind === "image" ? IMAGE_EXT : AUDIO_EXT;
  if (!allow.includes(ext)) {
    return { ok: false as const, error: `Unsupported file type. Allowed: ${allow.join(", ")}`, code: "INVALID_TYPE" };
  }
  const max = kind === "image" ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
  if (typeof declaredSize === "number" && declaredSize > max) {
    return { ok: false as const, error: `File too large. Max ${Math.round(max / 1024 / 1024)}MB.`, code: "TOO_LARGE" };
  }
  return { ok: true as const };
}

// Mint a short-lived signed URL for a private file. Server-side only; never
// returned to the client.
export async function createSignedFileUrl(base44: any, fileUri: string, expiresIn = 180) {
  const r = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
  return r.signed_url as string;
}

// Read the quarantined original with the caller's storage permissions and a
// hard byte cap. This prevents the service role from being used to read an
// arbitrary private URI supplied by a caller. Service-role signing is reserved
// for already-approved media downstream.
export async function readQuarantinedBytes(base44: any, fileUri: string, maxBytes: number) {
  const signed = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 180 });
  const signedUrl = String(signed?.signed_url || '');
  if (!signedUrl) return { ok: false as const, code: "SOURCE_SIGN_URL_FAILED" };
  const res = await fetch(signedUrl);
  if (!res.ok) return { ok: false as const, code: "SOURCE_READ_FAILED" };
  const declaredLen = Number(res.headers.get("content-length") || 0);
  if (declaredLen && declaredLen > maxBytes) return { ok: false as const, code: "TOO_LARGE" };
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) return { ok: false as const, code: "EMPTY_FILE" };
  if (bytes.byteLength > maxBytes) return { ok: false as const, code: "TOO_LARGE" };
  return { ok: true as const, bytes };
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tag(b: Uint8Array, offset: number, len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += String.fromCharCode(b[offset + i]);
  return s;
}

// Determine the ACTUAL file format from content magic bytes / structure.
// Returns a canonical label; never trusts names or declared types.
export function detectFileType(b: Uint8Array): string {
  const n = b.length;
  if (n < 4) return "unknown";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (n >= 8 && b[0] === 0x89 && tag(b, 1, 3) === "PNG") return "png";
  if (n >= 12 && tag(b, 0, 4) === "RIFF") {
    const kind = tag(b, 8, 4);
    if (kind === "WEBP") return "webp";
    if (kind === "WAVE") return "wav";
    return "unknown";
  }
  if (n >= 12 && tag(b, 4, 4) === "ftyp") {
    const brand = tag(b, 8, 4);
    if (["heic", "heix", "hevc", "heim", "heis", "heif", "mif1", "msf1"].includes(brand)) return "heic";
    return "m4a";
  }
  if (n >= 10 && tag(b, 0, 3) === "ID3") return "mp3";
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return "mp3";
  if (tag(b, 0, 4) === "fLaC") return "flac";
  if (tag(b, 0, 4) === "OggS") return "ogg";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "webm";
  if (tag(b, 0, 4) === "%PDF") return "pdf";
  if (tag(b, 0, 4) === "PK\x03\x04") return "zip";
  if (n >= 7 && tag(b, 0, 6) === "Rar!\x1a\x07") return "rar";
  if (b[0] === 0x37 && b[1] === 0x7a && b[2] === 0xbc && b[3] === 0xaf && b[4] === 0x27 && b[5] === 0x1c) return "7z";
  if (b[0] === 0x1f && b[1] === 0x8b) return "gzip";
  if (b[0] === 0x4d && b[1] === 0x5a) return "exe";
  if (b[0] === 0x7f && tag(b, 1, 3) === "ELF") return "elf";
  if (b[0] === 0xca && b[1] === 0xfe && b[2] === 0xba && b[3] === 0xbe) return "javaclass";
  if (((b[0] === 0xfe && b[1] === 0xed && b[2] === 0xfa) || (b[0] === 0xce && b[1] === 0xfa && b[2] === 0xed) || (b[0] === 0xcf && b[1] === 0xfa && b[2] === 0xed)) && b[3] === 0xfe) return "macho";
  if (tag(b, 0, 2) === "#!") return "script";
  if (n >= 4 && tag(b, 0, 3) === "GIF") return "gif";
  if (tag(b, 0, 2) === "BM" && n > 64) return "bmp";
  const head = tag(b, 0, Math.min(512, n)).toLowerCase();
  const trimmed = head.replace(/^\s+/, "");
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html") || head.includes("<svg") || trimmed.startsWith("<?xml")) return "html";
  return "unknown";
}

const IMAGE_OK = ["jpeg", "png", "webp"];
const AUDIO_OK = ["mp3", "wav", "flac", "ogg", "m4a", "webm"];
const IMAGE_UNSUPPORTED = ["heic", "gif", "bmp", "pdf"];
const AUDIO_UNSUPPORTED = ["pdf"];
const DANGEROUS: Record<string, string> = {
  exe: "EXECUTABLE_CONTENT",
  elf: "EXECUTABLE_CONTENT",
  macho: "EXECUTABLE_CONTENT",
  javaclass: "EXECUTABLE_CONTENT",
  script: "EXECUTABLE_CONTENT",
  html: "ACTIVE_CONTENT",
};
const ARCHIVES: Record<string, string> = {
  zip: "ARCHIVE_NOT_ALLOWED",
  rar: "ARCHIVE_NOT_ALLOWED",
  "7z": "ARCHIVE_NOT_ALLOWED",
  gzip: "ARCHIVE_NOT_ALLOWED",
};

// Content-based verdict for a declared upload kind. Anything not explicitly
// allowed is rejected/unsupported — fail closed.
export function classifyUpload(kind: "image" | "audio", detected: string) {
  if (DANGEROUS[detected]) return { verdict: "rejected" as const, reason_code: DANGEROUS[detected] };
  if (ARCHIVES[detected]) return { verdict: "rejected" as const, reason_code: ARCHIVES[detected] };
  const ok = kind === "image" ? IMAGE_OK : AUDIO_OK;
  if (ok.includes(detected)) return { verdict: "ok" as const };
  const other = kind === "image" ? AUDIO_OK : IMAGE_OK;
  if (other.includes(detected)) return { verdict: "rejected" as const, reason_code: "CONTENT_MISMATCH" };
  const unsup = kind === "image" ? IMAGE_UNSUPPORTED : AUDIO_UNSUPPORTED;
  if (unsup.includes(detected)) return { verdict: "unsupported" as const, reason_code: "FORMAT_NOT_SUPPORTED" };
  return { verdict: "rejected" as const, reason_code: "UNKNOWN_CONTENT" };
}

// Downstream gate used by media processors: returns the owner's APPROVED
// security record for this exact file (including the safe derivative), or a
// generic fail-closed error. Never trusts client-supplied status.
export async function verifyApprovedMedia(base44: any, ownerEmail: string, kind: "image" | "audio", fileUri: string) {
  const records = await base44.asServiceRole.entities.MediaSecurityScan.filter(
    { file_uri: fileUri, owner_email: ownerEmail, status: "approved" },
    "-created_date",
    20
  );
  const record = (records || []).find((r: any) => r.media_kind === kind && r.sanitization_status !== "failed");
  if (!record) {
    return {
      error: "That file could not be processed safely. Please upload a different file.",
      code: "MEDIA_NOT_APPROVED",
    };
  }
  return { record };
}