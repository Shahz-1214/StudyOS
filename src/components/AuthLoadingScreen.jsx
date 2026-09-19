import React from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthLoadingScreen() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#050708] text-white flex items-center justify-center px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-emerald-500/10">
          <ShieldCheck className="h-7 w-7 text-emerald-400" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Securing StudyOS</h1>
        <p className="mt-2 text-sm text-white/55">Checking your session and preparing sign-in.</p>
        <div className="mt-7 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
          <div className="h-1 w-1/2 animate-[auth-progress_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 to-blue-400" />
        </div>
        <div className="mt-5 space-y-2 text-left">
          <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.04]" />
        </div>
      </div>
      <style>{`
        @keyframes auth-progress {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(50%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </div>
  );
}
