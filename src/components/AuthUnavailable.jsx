import React from "react";
import { Link } from "react-router-dom";
import { Home, RefreshCw, WifiOff, ShieldAlert } from "lucide-react";
import AppFooter from "@/components/AppFooter";

export default function AuthUnavailable({ offline = false, message }) {
  return (
    <div className="min-h-screen bg-[#050708] text-white flex flex-col">
      <main className="flex-1 grid place-items-center px-5 py-12">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30">
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            {offline ? (
              <WifiOff className="h-7 w-7 text-emerald-400" aria-hidden="true" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-blue-400" aria-hidden="true" />
            )}
          </div>
          <p className="mt-5 text-[11px] uppercase tracking-[0.2em] text-white/40">
            {offline ? "Connection lost" : "Authentication unavailable"}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {offline ? "You're offline" : "We couldn't sign you in"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/55">
            {message ||
              (offline
                ? "Reconnect to the internet and try again. Your password was not stored by StudyOS."
                : "The authentication service did not complete the request. Your account has not been changed.")}
          </p>
          <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-black px-4 text-sm font-semibold transition hover:bg-white/90"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
            <Link
              to="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white/80 transition hover:bg-white/[0.07]"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Go to StudyOS
            </Link>
          </div>
        </div>
      </main>
      <AppFooter compact />
    </div>
  );
}
