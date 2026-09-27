function requestId(req) {
  const supplied = req?.headers?.get?.("x-request-id") || "";
  return /^[A-Za-z0-9._:-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}

export function serverError(req, message = "Something went wrong. Please try again.", status = 500, code = "INTERNAL_ERROR") {
  return Response.json(
    { error: message, code, request_id: requestId(req) },
    { status }
  );
}

export function safeInputString(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function boundedStringArray(value, maxItems, itemMax) {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const out = value.map((v) => safeInputString(v, itemMax));
  return out.every(Boolean) ? out : null;
}
