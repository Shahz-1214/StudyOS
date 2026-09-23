// Server-side validation for learner-uploaded files.
//
// Security invariant: uploaded bytes are untrusted data, never application code.
// They must pass the authenticated malware-scan gate before any AI/media
// processor is allowed to read them.
//
// Architecture note: Base44's UploadPrivateFile stores
// the file in app-private storage and returns a `file_uri`. True content
// inspection / quarantine scanning of the stored bytes is not available in
// the platform, so we enforce the strongest controls we can server-side:
//   1. Extension allowlist (the file_uri extension must match the declared kind).
//   2. Declared-size limit per kind.
//   3. Short-lived signed URLs minted only when an AI integration actually
//      needs to read the file, never returned to the client.
// Client-side MIME/size checks still run before upload (src/lib/upload.ts),
// but the server re-validates the declared metadata before processing.

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
const AUDIO_EXT = [".mp3", ".wav", ".m4a", ".ogg", ".oga", ".webm", ".mp4", ".mpeg", ".mpga", ".flac"];

export function isTrustedScanRecord(record: any, ownerEmail: string, fileUri: string) {
  return Boolean(
    record &&
    record.status === "clean" &&
    record.owner_email === ownerEmail &&
    record.file_uri === fileUri &&
    record.provider
  );
}

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

// Mint a short-lived signed URL for a private file. Server-side only.
export async function createSignedFileUrl(base44, fileUri: string, expiresIn = 180) {
  const r = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: expiresIn });
  return r.signed_url as string;
}