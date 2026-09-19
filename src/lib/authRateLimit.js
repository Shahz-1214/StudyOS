const STORAGE_KEY = "studyos_auth_attempts";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;

function readState() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { attempts: [], lockedUntil: 0 };
    const parsed = JSON.parse(raw);
    return {
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.filter(Boolean) : [],
      lockedUntil: Number(parsed.lockedUntil) || 0,
    };
  } catch {
    return { attempts: [], lockedUntil: 0 };
  }
}

function writeState(state) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage is only an additional local safeguard; server-side auth remains authoritative.
  }
}

export function getAuthRateLimitState() {
  const now = Date.now();
  const state = readState();
  const attempts = state.attempts.filter((time) => now - time < WINDOW_MS);
  const lockedUntil = state.lockedUntil > now ? state.lockedUntil : 0;
  writeState({ attempts, lockedUntil });
  return {
    attempts: attempts.length,
    remaining: Math.max(0, MAX_ATTEMPTS - attempts.length),
    lockedUntil,
    locked: Boolean(lockedUntil),
  };
}

export function recordFailedAuthAttempt() {
  const now = Date.now();
  const state = readState();
  const attempts = [...state.attempts.filter((time) => now - time < WINDOW_MS), now];
  const lockedUntil = attempts.length >= MAX_ATTEMPTS ? now + LOCKOUT_MS : 0;
  writeState({ attempts, lockedUntil });
  return getAuthRateLimitState();
}

export function resetAuthRateLimit() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
