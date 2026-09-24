import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { getTurnstileConfig } from "@/lib/turnstileConfig";

// Reusable Cloudflare Turnstile widget (explicit rendering, interaction-only
// appearance). One component used by every protected form — no duplication.
//
// Contract:
//   onVerify(token) — called with a non-empty token when verified, or "" when
//                     the token expires / errors (the parent should reset).
//   onBypass()       — called once when Turnstile is not configured (both the
//                     site key + secret must be set); the parent may proceed
//                     without a token (feature inactive during setup).
//   resetKey         — increment to reset the widget after a failed/submitted
//                     request (tokens are single-use).
//   action           — one of TURNSTILE_ACTIONS.
//
// The widget loads the Turnstile script once per page, renders into a stable
// container, and removes itself on unmount. It never logs tokens.

let scriptPromise = null;
function loadTurnstileScript() {
  if (typeof window !== "undefined" && window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const Turnstile = forwardRef(function Turnstile(
  { action, onVerify, onBypass, resetKey = 0, className = "" },
  ref
) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  // siteKey: null = loading, "" = disabled (not configured), "<key>" = enabled
  const [siteKey, setSiteKey] = useState(null);
  const onVerifyRef = useRef(onVerify);
  const onBypassRef = useRef(onBypass);
  useEffect(() => {
    onVerifyRef.current = onVerify;
    onBypassRef.current = onBypass;
  }, [onVerify, onBypass]);

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        if (widgetIdRef.current != null && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            /* ignore */
          }
        }
      },
    }),
    []
  );

  // Fetch config once (cached module-level).
  useEffect(() => {
    let cancelled = false;
    getTurnstileConfig().then((cfg) => {
      if (cancelled) return;
      setSiteKey(cfg.enabled ? cfg.siteKey : "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Render / remove the widget when the site key or action changes.
  useEffect(() => {
    if (siteKey === null) return undefined; // still loading
    if (siteKey === "") {
      // Not configured — bypass once.
      if (onBypassRef.current) onBypassRef.current();
      return undefined;
    }
    let cancelled = false;
    let wid = null;
    loadTurnstileScript()
      .then((ts) => {
        if (cancelled || !containerRef.current) return;
        wid = ts.render(containerRef.current, {
          sitekey: siteKey,
          action,
          appearance: "interaction-only",
          callback: (token) => {
            if (onVerifyRef.current) onVerifyRef.current(token);
          },
          "expired-callback": () => {
            if (onVerifyRef.current) onVerifyRef.current("");
          },
          "error-callback": () => {
            if (onVerifyRef.current) onVerifyRef.current("");
          },
        });
        widgetIdRef.current = wid;
      })
      .catch(() => {
        if (onVerifyRef.current) onVerifyRef.current("");
      });
    return () => {
      cancelled = true;
      if (wid != null && window.turnstile) {
        try {
          window.turnstile.remove(wid);
        } catch {
          /* ignore */
        }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, action]);

  // Reset the widget when resetKey changes (single-use tokens).
  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current != null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* ignore */
      }
    }
  }, [resetKey]);

  if (siteKey === "" || siteKey === null) return null;
  return <div ref={containerRef} className={className} />;
});

export default Turnstile;