import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/errors/ErrorActions";

// Component-level fallback for a failed resource or section — keeps the rest
// of the page (nav, footer, other panels) alive instead of replacing the app.
export default function LoadError({ message, onRetry }) {
  return (
    <div className="mx-auto w-full max-w-md px-5 py-12 text-white">
      <div className="rounded-3xl border border-border bg-card p-7 text-center shadow-2xl shadow-black/30">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06]">
          <AlertTriangle className="h-6 w-6 text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-white">We couldn't load this</h2>
        <p className="mt-2 text-sm leading-6 text-white/50">
          {message || "Something prevented this content from loading."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => (onRetry ? onRetry() : window.location.reload())}
            className={PRIMARY_BUTTON}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try Again
          </button>
          <Link to="/" className={SECONDARY_BUTTON}>
            <Home className="h-4 w-4" aria-hidden="true" /> Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}