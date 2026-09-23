import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { validateUploadedFile, createSignedFileUrl } from '../../shared/uploadSecurity.ts';

const POLL_MS = 2000;
const MAX_POLLS = 30;

function fail(message, code, status = 422) {
  return Response.json({ ok: false, error: message, code }, { status });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return fail('Unauthorized', 'UNAUTHORIZED', 401);

    const body = await req.json();
    const fileUri = String(body.file_uri || '').trim();
    const kind = body.kind === 'audio' ? 'audio' : body.kind === 'image' ? 'image' : '';
    const declaredSize = typeof body.file_size === 'number' ? body.file_size : undefined;
    if (!fileUri || !kind) return fail('A valid media file is required.', 'INVALID_INPUT', 400);

    const validation = validateUploadedFile(kind, fileUri, declaredSize);
    if (!validation.ok) return fail(validation.error, validation.code, 400);

    const apiKey = Deno.env.get('OPSWAT_API_KEY');
    const privateScan = Deno.env.get('OPSWAT_PRIVATE_SCAN') === '1';
    if (!apiKey || !privateScan) {
      return fail(
        'This upload is quarantined because malware scanning is not configured. The file will not be processed.',
        'SCANNER_NOT_CONFIGURED',
        503
      );
    }

    const signedUrl = await createSignedFileUrl(base44, fileUri, 180);
    const source = await fetch(signedUrl);
    if (!source.ok) return fail('The quarantined file could not be read safely.', 'SOURCE_READ_FAILED', 422);

    const blob = await source.blob();
    if (declaredSize && blob.size !== declaredSize) {
      return fail('The uploaded file size changed unexpectedly and was blocked.', 'SIZE_MISMATCH', 422);
    }

    const form = new FormData();
    form.append('file', blob, 'quarantined-media');

    const upload = await fetch('https://api.metadefender.com/v4/file', {
      method: 'POST',
      headers: { apikey: apiKey, samplesharing: '0' },
      body: form,
    });
    if (!upload.ok) return fail('Malware scanning could not be completed. The file remains blocked.', 'SCANNER_UPLOAD_FAILED', 503);

    const uploaded = await upload.json();
    const dataId = uploaded?.data_id;
    if (!dataId) return fail('Malware scanner returned no scan ID. The file remains blocked.', 'SCANNER_NO_ID', 503);

    for (let i = 0; i < MAX_POLLS; i++) {
      const reportRes = await fetch(`https://api.metadefender.com/v4/file/${encodeURIComponent(dataId)}`, {
        headers: { apikey: apiKey },
      });
      if (!reportRes.ok) return fail('Malware scan status could not be verified. The file remains blocked.', 'SCANNER_STATUS_FAILED', 503);

      const report = await reportRes.json();
      const scan = report?.scan_results || {};
      const detected = Number(scan.total_detected_avs ?? 0);
      const result = Number(scan.scan_all_result_i);

      if (result === 1 || detected > 0) {
        await base44.asServiceRole.entities.MediaSecurityScan.create({
          file_uri: fileUri,
          owner_email: user.email,
          media_kind: kind,
          status: 'blocked',
          provider: 'opswat-metadefender',
          provider_id: String(dataId),
          detected_count: detected,
          error_code: 'MALWARE_DETECTED',
        });
        return fail('Security scanning detected a threat. The file has been blocked and will not be processed.', 'MALWARE_DETECTED', 422);
      }

      if (result === 0) {
        await base44.asServiceRole.entities.MediaSecurityScan.create({
          file_uri: fileUri,
          owner_email: user.email,
          media_kind: kind,
          status: 'clean',
          provider: 'opswat-metadefender',
          provider_id: String(dataId),
          detected_count: 0,
        });
        return Response.json({ ok: true, status: 'clean', provider: 'opswat-metadefender' });
      }

      await new Promise(r => setTimeout(r, POLL_MS));
    }

    return fail('The malware scan did not finish in time. The file remains quarantined and will not be processed.', 'SCANNER_TIMEOUT', 503);
  } catch {
    return fail('Security scanning failed closed. The file will not be processed.', 'SCANNER_ERROR', 503);
  }
}