import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { secrets } from 'base44:runtime';
import { validateUploadedFile, readQuarantinedBytes, sha256Hex, detectFileType, classifyUpload } from '../../shared/uploadSecurity.ts';
import { sanitizeMedia } from '../../shared/mediaSanitize.ts';
import { verifyTurnstileToken } from '../../shared/turnstileVerify.ts';

// Canonical security gate for every learner-uploaded media file. One gate,
// consumed by every media processor (StudyLens images, LectureMind audio).
//
// Pipeline (fail closed at every stage):
//   QUARANTINE (private storage) -> SHA-256 -> content-based type detection ->
//   size/structure limits -> archive & active-content rejection ->
//   MALWARE SCAN (Cloudmersive Virus Scan API; fails closed when not configured
//   or when the scanner cannot safely process the file) -> SANITIZATION / safe derivative ->
//   APPROVED (recorded server-side only; users cannot forge it).
//
// The quarantined original is never executed, rendered, or sent to AI. Only
// the approved safe derivative (or, for formats without a rebuildable
// derivative, the scanned + structure-validated original) is released.

const GENERIC_REJECT = 'That file could not be processed safely. Please upload a different file.';
const GENERIC_UNAVAILABLE = 'Security checking is unavailable right now. Your file stays protected and was not processed. Please try again later.';
const GENERIC_THREAT = 'Security scanning detected a threat. The file has been blocked and will not be processed.';
const SCAN_RATE_PER_MINUTE = 10;
const SCAN_TIMEOUT_MS = 15000;
const TERMINAL_STATUSES = ['approved', 'infected', 'rejected', 'unsupported', 'sanitization_failed'];

function json(payload, status) {
  return Response.json(payload, { status });
}

function getSecret(name) {
  try {
    return secrets.get(name) || '';
  } catch {
    return '';
  }
}

function getRemoteIp(req) {
  try {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
    const xff = req.headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
  } catch {
    /* ignore */
  }
  return '';
}

export default async function(req) {
  let base44;
  try {
    base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return json({ ok: false, error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);

    const body = await req.json();
    const fileUri = String(body.file_uri || '').trim();
    const kind = body.kind === 'audio' ? 'audio' : body.kind === 'image' ? 'image' : '';
    const declaredSize = typeof body.file_size === 'number' ? body.file_size : undefined;
    const originalFilename = String(body.original_filename || '').slice(0, 200);
    const declaredMime = String(body.declared_mime_type || '').slice(0, 100);
    if (!fileUri || !kind) return json({ ok: false, error: 'A valid media file is required.', code: 'INVALID_INPUT' }, 400);

    // Stage 0: declared extension + declared size allowlist.
    const validation = validateUploadedFile(kind, fileUri, declaredSize);
    if (!validation.ok) return json({ ok: false, error: validation.error, code: validation.code }, 400);

    // Anti-bot gate (Cloudflare Turnstile, "upload" action). Enforced
    // server-side before any expensive scanning work. Supplements (does not
    // replace) the rate limiter below. Bypasses only when Turnstile is not
    // configured (both site key + secret unset).
    const turnstile = await verifyTurnstileToken(body.turnstile_token, 'upload', getRemoteIp(req));
    if (!turnstile.ok) {
      return json({ ok: false, error: turnstile.error || GENERIC_REJECT, code: 'TURNSTILE_' + (turnstile.code || 'FAILED') }, 400);
    }

    // Repeated-upload abuse guard (deterministic, server-side, per user).
    // The accounting event is written FIRST, then the rolling window is
    // re-counted, so both sequential rapid-fire and concurrent bursts
    // observe the limit.
    await base44.entities.Event.create({
      event_name: 'media_scan_requested',
      properties: { source: 'security_gate' },
      occurred_at: new Date().toISOString(),
    });
    // Read only scan-request events so unrelated filler events cannot evict
    // scan rows from the window. Combined with admin-only delete on Event,
    // neither deletion nor flooding can reset the rate window.
    const window = await base44.entities.Event.filter({ event_name: 'media_scan_requested' }, '-occurred_at', 30);
    const minuteAgo = Date.now() - 60000;
    const recentScans = (window || []).filter(
      (e) => e.event_name === 'media_scan_requested' && new Date(e.occurred_at).getTime() >= minuteAgo
    );
    if (recentScans.length > SCAN_RATE_PER_MINUTE) {
      return json({ ok: false, error: 'Too many uploads at once. Please wait a moment and try again.', code: 'RATE_LIMITED' }, 429);
    }

    // Stage 1: read quarantined bytes with a hard cap; verify actual size.
    const maxBytes = kind === 'image' ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
    const read = await readQuarantinedBytes(base44, fileUri, maxBytes);
    if (!read.ok) return json({ ok: false, error: GENERIC_REJECT, code: read.code }, 422);
    const bytes = read.bytes;
    if (typeof declaredSize === 'number' && bytes.byteLength !== declaredSize) {
      return json({ ok: false, error: GENERIC_REJECT, code: 'SIZE_MISMATCH' }, 422);
    }

    // Stage 2: integrity hash (detection of duplicate/known verdicts).
    const sha256 = await sha256Hex(bytes);

    // Idempotency: a terminal verdict for the same owner + hash is reused,
    // so identical re-uploads are not scanned twice.
    const prior = await base44.asServiceRole.entities.MediaSecurityScan.filter(
      { sha256, owner_email: user.email }, '-created_date', 20
    );
    const priorTerminal = (prior || []).find(
      (p) => TERMINAL_STATUSES.includes(p.status) && p.media_kind === kind
    );
    if (priorTerminal) {
      if (priorTerminal.status === 'approved') return json({ ok: true, status: 'approved' }, 200);
      return json({ ok: false, error: GENERIC_REJECT, code: priorTerminal.rejection_reason_code || 'REJECTED' }, 422);
    }

    // Stage 3: content-based classification. Filenames, extensions and
    // declared MIME types are never trusted; the bytes decide.
    const detected = detectFileType(bytes);
    const verdict = classifyUpload(kind, detected);
    if (verdict.verdict !== 'ok') {
      const status = verdict.verdict === 'unsupported' ? 'unsupported' : 'rejected';
      await base44.asServiceRole.entities.MediaSecurityScan.create({
        file_uri: fileUri,
        owner_email: user.email,
        media_kind: kind,
        original_filename: originalFilename,
        declared_mime_type: declaredMime,
        detected_file_type: detected,
        file_size: bytes.byteLength,
        sha256,
        status,
        rejection_reason_code: verdict.reason_code,
        sanitization_status: 'pending',
        scan_timestamp: new Date().toISOString(),
      });
      return json({ ok: false, error: GENERIC_REJECT, code: verdict.reason_code }, 422);
    }

    // Locate or create the in-flight security record for this upload.
    const inFlight = (prior || []).find(
      (p) => p.status === 'scanning' || p.status === 'scan_error' || p.status === 'pending_scan'
    );
    const baseRecord = {
      file_uri: fileUri,
      owner_email: user.email,
      media_kind: kind,
      original_filename: originalFilename,
      declared_mime_type: declaredMime,
      detected_file_type: detected,
      file_size: bytes.byteLength,
      sha256,
      status: 'scanning',
      sanitization_status: 'pending',
    };
    let recordId;
    if (inFlight) {
      await base44.asServiceRole.entities.MediaSecurityScan.update(inFlight.id, baseRecord);
      recordId = inFlight.id;
    } else {
      const created = await base44.asServiceRole.entities.MediaSecurityScan.create(baseRecord);
      recordId = created.id;
    }

    // Stage 4: malware scan via Cloudmersive Virus Scan API. The API accepts
    // multipart/form-data at /virus/scan/file with the Apikey header. The
    // Cloudmersive free tier currently limits files to 3.5 MB, so files above
    // that scanner limit fail closed rather than bypassing malware scanning.
    const cloudmersiveKey = getSecret('CLOUDMERSIVE_API_KEY');
    const CLOUDMERSIVE_URL = 'https://api.cloudmersive.com/virus/scan/file';
    const CLOUDMERSIVE_MAX_BYTES = 3.5 * 1024 * 1024;
    if (!cloudmersiveKey || bytes.byteLength > CLOUDMERSIVE_MAX_BYTES) {
      await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
        status: 'scan_error',
        rejection_reason_code: !cloudmersiveKey ? 'SCANNER_UNAVAILABLE' : 'SCANNER_FILE_TOO_LARGE',
        scan_timestamp: new Date().toISOString(),
      });
      return json({ ok: false, error: GENERIC_UNAVAILABLE, code: !cloudmersiveKey ? 'SCANNER_UNAVAILABLE' : 'SCANNER_FILE_TOO_LARGE' }, 503);
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    let report = null;
    try {
      const form = new FormData();
      const file = new File([bytes], originalFilename || ('upload.' + detected), { type: declaredMime || 'application/octet-stream' });
      form.append('inputFile', file);
      const scanRes = await fetch(CLOUDMERSIVE_URL, {
        method: 'POST',
        headers: { Apikey: cloudmersiveKey },
        body: form,
        signal: controller.signal,
      });
      if (!scanRes.ok) throw new Error('scanner_http_' + scanRes.status);
      report = await scanRes.json();
      if (!report || typeof report.CleanResult !== 'boolean') throw new Error('scanner_bad_payload');
    } catch {
      await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
        status: 'scan_error',
        rejection_reason_code: 'SCAN_ERROR',
        scan_timestamp: new Date().toISOString(),
      });
      return json({ ok: false, error: GENERIC_UNAVAILABLE, code: 'SCAN_ERROR' }, 503);
    } finally {
      clearTimeout(timer);
    }

    const scanTimestamp = new Date().toISOString();
    const scannerName = 'cloudmersive-virus-scan';
    const foundViruses = Array.isArray(report.FoundViruses) ? report.FoundViruses : [];

    if (report.CleanResult !== true) {
      const signature = foundViruses
        .map((v) => String(v?.VirusName || '').trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
        status: 'infected',
        malware_detected: true,
        scanner_name: scannerName,
        scanner_id: String(report.ContentInformation?.Hash_SHA1 || '').slice(0, 100),
        scanner_version: '',
        detected_signature: signature.slice(0, 200),
        rejection_reason_code: 'MALWARE_DETECTED',
        scan_timestamp: scanTimestamp,
      });
      return json({ ok: false, error: GENERIC_THREAT, code: 'MALWARE_DETECTED' }, 422);
    }

    // Stage 5: sanitization — build the safe derivative before approval.
    const san = sanitizeMedia(detected, bytes);
    if (!san.ok) {
      await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
        status: 'sanitization_failed',
        rejection_reason_code: 'SANITIZATION_FAILED',
        sanitization_status: 'failed',
        scan_timestamp: scanTimestamp,
      });
      return json({ ok: false, error: GENERIC_REJECT, code: 'SANITIZATION_FAILED' }, 422);
    }

    let sanitizedUri = '';
    if (!san.passthrough) {
      const derivative = new File([san.bytes], 'sanitized.' + san.ext, { type: san.mime });
      const uploadRes = await base44.asServiceRole.integrations.Core.UploadPrivateFile({ file: derivative });
      sanitizedUri = String(uploadRes?.file_uri || '');
      if (!sanitizedUri) {
        await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
          status: 'sanitization_failed',
          rejection_reason_code: 'SANITIZATION_FAILED',
          sanitization_status: 'failed',
          scan_timestamp: scanTimestamp,
        });
        return json({ ok: false, error: GENERIC_REJECT, code: 'SANITIZATION_FAILED' }, 422);
      }
    }

    // Stage 6: APPROVED — every applicable gate has completed successfully.
    await base44.asServiceRole.entities.MediaSecurityScan.update(recordId, {
      status: 'approved',
      malware_detected: false,
      scanner_name: scannerName,
      scanner_id: String(report.id || '').slice(0, 100),
      scanner_version: String(report.definitions || '').slice(0, 100),
      sanitization_status: san.passthrough ? 'validated_original' : 'sanitized',
      sanitized_uri: sanitizedUri,
      scan_timestamp: scanTimestamp,
      rejection_reason_code: '',
    });
    return json({ ok: true, status: 'approved' }, 200);
  } catch {
    return json({ ok: false, error: 'Security checking failed. The file was not processed.', code: 'SCAN_GATE_ERROR' }, 503);
  }
}