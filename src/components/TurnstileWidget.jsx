import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback } from "react";
import { TURNSTILE_SITE_KEY, TURNSTILE_ENABLED } from "@/lib/turnstileConfig";

// One reusable Cloudflare Turnstile widget (Managed mode, interaction-only).
// - Renders explicitly (for dynamically created StudyOS forms).
// - appearance: "interaction-only" — normal users are not shown a challenge
//   unless Cloudflare's managed risk model decides one is needed.
// - Exposes an imperative reset() via ref: tokens are single-use, so the
//   parent must reset after every submitted/failed request to obtain a fresh
//   token while the page stays active.
// - Loads the Turnstile API script exactly once across the whole app.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise = null;

function loadScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error("turnstile-load-failed")); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const TurnstileWidget = forwardRef(function TurnstileWidget(
  { action, onToken, onError, className = "" },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const handleToken = useCallback((token) => {
    onTokenRef.current?.(token || "");
  }, []);
  const handleError = useCallback((err) => {
    onErrorRef.current?.(err);
  }, []);
  const handleExpired = useCallback(() => {
    onTokenRef.current?.("");
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!TURNSTILE_ENABLED) return undefined;

    loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action,
          appearance: "interaction-only",
          theme: "dark",
          callback: handleToken,
          "error-callback": handleError,
          "expired-callback": handleExpired,
        });
      } catch {
        onErrorRef.current?.("render-failed");
      }
    }).catch(() => {
      onErrorRef.current?.("load-failed");
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch {}
        widgetIdRef.current = null;
      }
    };
  }, [action, handleToken, handleError, handleExpired]);

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.reset(widgetIdRef.current); } catch {}
      }
    },
  }), []);

  if (!TURNSTILE_ENABLED) {
    return (
      <div className={`rounded-lg border border-dashed border-border bg-card px-3 py-2.5 text-[11px] text-muted-foreground ${className}`}>
        Security verification is not configured for this environment.
      </div>
    );
  }

  return <div ref={containerRef} className={className} aria-label="Security verification" role="group" />;
});

export default TurnstileWidget;