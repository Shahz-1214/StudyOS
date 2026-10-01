// Client-side upload helper. Uploads to PRIVATE app storage (UploadPrivateFile)
// and returns a file_uri plus declared metadata. The file_uri is passed to a
// backend function, which re-validates server-side and mints a short-lived
// signed URL only when an AI integration needs to read it. The file_uri is
// never exposed publicly.

import { base44 } from "@/api/base44Client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
  "audio/m4a", "audio/x-m4a", "audio/mp4", "audio/ogg", "audio/oga",
  "audio/webm", "audio/flac", "audio/x-flac",
];

// Recordings are allowed up to 10 MB (the server enforces the same cap).
const AUDIO_MAX_BYTES = 10 * 1024 * 1024;

// Cloudmersive's own file limit (measured against the live API). The server
// enforces it independently and releases audio above it as not scanned; this
// client check only avoids uploading files the scanner will inevitably refuse.
const CLOUDMERSIVE_MAX_BYTES = 3_500_000;

// Demo Mode drops the size limits (the 3.5 MB scanner ceiling and the per-kind
// caps) and the security-check requirement. The format allowlist stays, because
// it reflects what the AI can actually read — dropping it would only produce a
// confusing failure later.
export function validateClientFile(kind: "image" | "audio", file: File, demoMode = false) {
  const allow = kind === "image" ? IMAGE_TYPES : AUDIO_TYPES;
  const max = kind === "image" ? 10 * 1024 * 1024 : AUDIO_MAX_BYTES;
  if (!allow.includes(file.type)) {
    return { ok: false as const, error: `Unsupported file type. Allowed: ${kind === "image" ? "JPG, PNG, WEBP" : "MP3, WAV, M4A, OGG, FLAC"}.` };
  }
  if (demoMode) return { ok: true as const };
  if (file.size > max) {
    return { ok: false as const, error: `File too large. Max ${Math.round(max / 1024 / 1024)}MB.` };
  }
  // The scanner ceiling only limits what can be malware-scanned. Audio above it
  // is still accepted (the server records it as not scanned); images above it
  // are refused, because the scanner must be able to check them.
  if (kind === "image" && file.size > CLOUDMERSIVE_MAX_BYTES) {
    return { ok: false as const, error: "This image is too large for the current security scanner. Please upload an image smaller than 3.5 MB." };
  }
  return { ok: true as const };
}

export async function uploadPrivateFile(kind: "image" | "audio", file: File, turnstileToken: string = "", demoMode = false) {
  const v = validateClientFile(kind, file, demoMode);
  if (!v.ok) throw new Error(v.error);
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

  // The uploaded object remains quarantined until the backend security gate
  // (content checks + malware scan + safe derivative) returns APPROVED. No
  // AI/media processor ever receives an unapproved file URI. The Turnstile
  // token (upload action) is verified server-side inside the gate as an
  // anti-bot layer — it is NOT malware scanning or file sanitization.
  // In Demo Mode the gate skips those stops for the demo administrator and
  // writes the approval itself, so this call is always required.
  let scan;
  try {
    scan = await base44.functions.invoke("scanUploadedMedia", {
      file_uri,
      file_size: file.size,
      kind,
      original_filename: file.name,
      declared_mime_type: file.type,
      turnstile_token: turnstileToken,
    });
  } catch (err) {
    const message = err?.response?.data?.error || err?.response?.data?.message;
    throw new Error(message || "That file could not be processed safely. Please upload a different file.");
  }
  if (!scan?.data?.ok || scan.data.status !== "approved") {
    throw new Error(scan?.data?.error || "That file could not be processed safely. Please upload a different file.");
  }

  return { file_uri, size: file.size, type: file.type, name: file.name };
}