// Client-side upload helper. Uploads to PRIVATE app storage (UploadPrivateFile)
// and returns a file_uri plus declared metadata. The file_uri is passed to a
// backend function, which re-validates server-side and mints a short-lived
// signed URL only when an AI integration needs to read it. The file_uri is
// never exposed publicly.

import { base44 } from "@/api/base44Client";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const AUDIO_TYPES = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave",
  "audio/m4a", "audio/x-m4a", "audio/mp4", "audio/ogg", "audio/oga",
  "audio/webm", "audio/flac", "audio/x-flac",
];

export function validateClientFile(kind: "image" | "audio", file: File) {
  const allow = kind === "image" ? IMAGE_TYPES : AUDIO_TYPES;
  const max = kind === "image" ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
  if (!allow.includes(file.type)) {
    return { ok: false as const, error: `Unsupported file type. Allowed: ${kind === "image" ? "JPG, PNG, WEBP, HEIC" : "MP3, WAV, M4A, OGG, FLAC"}.` };
  }
  if (file.size > max) {
    return { ok: false as const, error: `File too large. Max ${Math.round(max / 1024 / 1024)}MB.` };
  }
  return { ok: true as const };
}

export async function uploadPrivateFile(kind: "image" | "audio", file: File) {
  const v = validateClientFile(kind, file);
  if (!v.ok) throw new Error(v.error);
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

  // The uploaded object remains quarantined until the authenticated backend
  // malware scanner explicitly returns CLEAN. No AI/media processor receives
  // an unscanned file URI.
  const scan = await base44.functions.invoke("scanUploadedMedia", {
    file_uri,
    file_size: file.size,
    kind,
  });
  if (!scan?.data?.ok || scan.data.status !== "clean") {
    throw new Error(scan?.data?.error || "Security scanning blocked this file.");
  }

  return { file_uri, size: file.size, type: file.type, name: file.name };
}