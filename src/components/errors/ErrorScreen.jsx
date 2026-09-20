import React from "react";
import AppFooter from "@/components/AppFooter";

// Shared full-screen error surface using the StudyOS black/emerald/blue
// visual system (same family as the auth pages). Every error page renders
// inside this layout. No technical details are ever shown here.
export default function ErrorScreen({ icon: Icon, eyebrow, code, title, message, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050708] px-4 py-8 text-white sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-blue-500/[.08] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] shadow-2xl shadow-emerald-500/10">
            <Icon className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="brand-wordmark text-2xl font-semibold text-white">StudyOS</div>
          <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.3em] text-emerald-400/65">
            LEARN • PRACTICE • MASTER
          </div>
        </div>
        <div className="overflow-hidden rounded-[28px] border border-[#293630] bg-[#121816] p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
          {eyebrow && (
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">{eyebrow}</p>
          )}
          {code && (
            <div
              className="brand-wordmark mt-2 text-7xl font-semibold leading-none text-emerald-300 sm:text-8xl"
              style={{ textShadow: "0 0 44px rgba(52,211,153,.35)" }}
            >
              {code}
            </div>
          )}
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">{title}</h1>
          {message && <p className="mt-3 text-sm leading-6 text-white/50">{message}</p>}
          {children}
        </div>
        <AppFooter compact />
      </div>
    </div>
  );
}