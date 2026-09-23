// Byte-level format validation and sanitization for quarantined learner media.
// Pure data transforms only: no eval, no code execution, no native decoders.
//
// Where a safe derivative can be rebuilt in-runtime (JPEG / PNG / WebP images,
// MP3 / WAV / FLAC audio), metadata and non-essential structural payloads are
// stripped and trailing/foreign content is dropped, and the REBUILT derivative
// (not the original) is what reaches AI processing. For supported containers
// that cannot be safely rebuilt in this runtime (OGG / M4A / WebM), the
// scanned + structure-validated original passes through and the caller
// records sanitization_status='validated_original'.

const SAN_FAIL = { ok: false as const, code: "SANITIZATION_FAILED" };

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u16be(b: Uint8Array, i: number) {
  return (b[i] << 8) | b[i + 1];
}

function u32be(b: Uint8Array, i: number) {
  return b[i] * 0x1000000 + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
}

function u32le(b: Uint8Array, i: number) {
  return b[i] + (b[i + 1] << 8) + (b[i + 2] << 16) + b[i + 3] * 0x1000000;
}

function tag(b: Uint8Array, i: number, len: number) {
  let s = "";
  for (let k = 0; k < len; k++) s += String.fromCharCode(b[i + k]);
  return s;
}

const MAX_CHUNKS = 300;
const MAX_CHUNK_BYTES = 64 * 1024 * 1024;

// JPEG: keep only essential markers, drop all APPn (EXIF/XMP/ICC/Adobe) and
// COM metadata segments, truncate everything after the first EOI.
export function sanitizeJpeg(b: Uint8Array) {
  if (b.length < 4 || u16be(b, 0) !== 0xffd8) return SAN_FAIL;
  const parts = [b.slice(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return SAN_FAIL;
    const m = b[i + 1];
    if (m === 0xff) return SAN_FAIL;
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) {
      parts.push(b.slice(i, i + 2));
      i += 2;
      continue;
    }
    if (m === 0xd9) {
      parts.push(b.slice(i, i + 2));
      return { ok: true as const, bytes: concat(parts), ext: "jpg", mime: "image/jpeg" };
    }
    const len = u16be(b, i + 2);
    if (len < 2 || i + 2 + len > b.length) return SAN_FAIL;
    const isMeta = (m >= 0xe0 && m <= 0xef) || m === 0xfe;
    if (!isMeta) parts.push(b.slice(i, i + 2 + len));
    i += 2 + len;
    if (m === 0xda) {
      for (let j = i; j + 1 < b.length; j++) {
        if (b[j] === 0xff && b[j + 1] === 0xd9) {
          parts.push(b.slice(i, j + 2));
          return { ok: true as const, bytes: concat(parts), ext: "jpg", mime: "image/jpeg" };
        }
      }
      return SAN_FAIL;
    }
  }
  return SAN_FAIL;
}

// PNG: keep critical chunks only (IHDR/PLTE/IDAT/IEND); drop all ancillary
// chunks (tEXt/zTXt/iTXt/eXIf/tIME/pHYs/gAMA/iCCP...). Original bytes and
// CRCs of kept chunks are untouched.
export function sanitizePng(b: Uint8Array) {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length < 8 + 25) return SAN_FAIL;
  for (let k = 0; k < 8; k++) if (b[k] !== sig[k]) return SAN_FAIL;
  const parts = [b.slice(0, 8)];
  let i = 8;
  let chunks = 0;
  let sawIhdr = false;
  let sawIdat = false;
  while (i + 8 <= b.length) {
    if (++chunks > MAX_CHUNKS) return SAN_FAIL;
    const len = u32be(b, i);
    const type = tag(b, i + 4, 4);
    if (len > MAX_CHUNK_BYTES || i + 12 + len > b.length) return SAN_FAIL;
    if (type === "IHDR") sawIhdr = true;
    if (type === "IDAT") sawIdat = true;
    const critical = type.charCodeAt(0) >= 0x41 && type.charCodeAt(0) <= 0x5a;
    if (critical) parts.push(b.slice(i, i + 12 + len));
    i += 12 + len;
    if (type === "IEND") {
      if (!sawIhdr || !sawIdat) return SAN_FAIL;
      return { ok: true as const, bytes: concat(parts), ext: "png", mime: "image/png" };
    }
  }
  return SAN_FAIL;
}

// WebP: RIFF container — keep only image/animation chunks (VP8/VP8L/VP8X/ANIM/
// ANMF); drop EXIF/XMP/ICCP metadata chunks.
export function sanitizeWebp(b: Uint8Array) {
  if (b.length < 16 || tag(b, 0, 4) !== "RIFF" || tag(b, 8, 4) !== "WEBP") return SAN_FAIL;
  const parts = [b.slice(0, 12)];
  let i = 12;
  let chunks = 0;
  let sawImage = false;
  while (i + 8 <= b.length) {
    if (++chunks > MAX_CHUNKS) return SAN_FAIL;
    const cc = tag(b, i, 4);
    const size = u32le(b, i + 4);
    if (size > MAX_CHUNK_BYTES || i + 8 + size > b.length) return SAN_FAIL;
    const keep = cc === "VP8 " || cc === "VP8L" || cc === "VP8X" || cc === "ANIM" || cc === "ANMF";
    if (cc === "VP8 " || cc === "VP8L" || cc === "VP8X") sawImage = true;
    if (keep) parts.push(b.slice(i, i + 8 + size));
    i += 8 + size + (size % 2);
  }
  if (!sawImage) return SAN_FAIL;
  return { ok: true as const, bytes: concat(parts), ext: "webp", mime: "image/webp" };
}

// MP3: strip ID3v2 header and ID3v1 tail; the derivative starts at the first
// MPEG frame sync.
export function sanitizeMp3(b: Uint8Array) {
  let start = 0;
  if (b.length > 10 && tag(b, 0, 3) === "ID3") {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    start = 10 + size + (b[5] & 0x10 ? 10 : 0);
    if (start >= b.length) return SAN_FAIL;
  }
  let frame = -1;
  for (let i = start; i + 2 < b.length; i++) {
    if (b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0) {
      frame = i;
      break;
    }
  }
  if (frame < 0 || b.length - frame < 32) return SAN_FAIL;
  let end = b.length;
  if (end - frame > 128 && tag(b, end - 128, 3) === "TAG") end -= 128;
  return { ok: true as const, bytes: b.slice(frame, end), ext: "mp3", mime: "audio/mpeg" };
}

// WAV: rebuild the RIFF container keeping only fmt + data chunks.
export function sanitizeWav(b: Uint8Array) {
  if (b.length < 44 || tag(b, 0, 4) !== "RIFF" || tag(b, 8, 4) !== "WAVE") return SAN_FAIL;
  const chunks: Uint8Array[] = [];
  let i = 12;
  let sawFmt = false;
  let sawData = false;
  while (i + 8 <= b.length) {
    const id = tag(b, i, 4);
    const size = u32le(b, i + 4);
    if (size > MAX_CHUNK_BYTES || i + 8 + size > b.length) return SAN_FAIL;
    if (id === "fmt ") sawFmt = true;
    if (id === "data") sawData = true;
    if (id === "fmt " || id === "data") chunks.push(b.slice(i, i + 8 + size));
    i += 8 + size + (size % 2);
  }
  if (!sawFmt || !sawData) return SAN_FAIL;
  const bodyLen = chunks.reduce((s, c) => s + c.length, 0);
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  const riffSize = 4 + bodyLen;
  header[4] = riffSize & 0xff;
  header[5] = (riffSize >> 8) & 0xff;
  header[6] = (riffSize >> 16) & 0xff;
  header[7] = (riffSize >>> 24) & 0xff;
  header.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"
  return { ok: true as const, bytes: concat([header, ...chunks]), ext: "wav", mime: "audio/wav" };
}

// FLAC: keep the signature + STREAMINFO metadata block (marked as last) plus
// the audio frames; drop all other metadata blocks (VORBIS_COMMENT, PICTURE,
// etc.).
export function sanitizeFlac(b: Uint8Array) {
  if (b.length < 42 || tag(b, 0, 4) !== "fLaC") return SAN_FAIL;
  if ((b[4] & 0x7f) !== 0) return SAN_FAIL; // first block must be STREAMINFO
  const siLen = (b[5] << 16) | (b[6] << 8) | b[7];
  if (8 + siLen > b.length) return SAN_FAIL;
  let i = 8 + siLen;
  while (i < b.length) {
    if (i + 4 > b.length) return SAN_FAIL;
    const last = (b[i] & 0x80) !== 0;
    const len = (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3];
    i += 4 + len;
    if (last) break;
  }
  if (i >= b.length) return SAN_FAIL; // no audio frames
  const streamInfo = new Uint8Array(8 + siLen); // signature + block header + block data
  streamInfo.set(b.slice(0, 8 + siLen), 0);
  streamInfo[4] |= 0x80; // mark STREAMINFO as the last metadata block
  return { ok: true as const, bytes: concat([streamInfo, b.slice(i)]), ext: "flac", mime: "audio/flac" };
}

export function sanitizeMedia(detected: string, bytes: Uint8Array) {
  switch (detected) {
    case "jpeg":
      return sanitizeJpeg(bytes);
    case "png":
      return sanitizePng(bytes);
    case "webp":
      return sanitizeWebp(bytes);
    case "mp3":
      return sanitizeMp3(bytes);
    case "wav":
      return sanitizeWav(bytes);
    case "flac":
      return sanitizeFlac(bytes);
    // Containers that cannot be safely rebuilt in this runtime: the scanned,
    // structure-validated original is passed through unchanged.
    case "ogg":
      return { ok: true as const, bytes, ext: "ogg", mime: "audio/ogg", passthrough: true };
    case "m4a":
      return { ok: true as const, bytes, ext: "m4a", mime: "audio/mp4", passthrough: true };
    case "webm":
      return { ok: true as const, bytes, ext: "webm", mime: "audio/webm", passthrough: true };
    default:
      return SAN_FAIL;
  }
}