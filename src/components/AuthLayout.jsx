import React from "react";
import AppFooter from "@/components/AppFooter";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050708] px-4 py-8 text-white sm:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-blue-500/[.08] blur-3xl" />
        <div className="absolute inset-0 opacity-[0.035]" style={{backgroundImage:"linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",backgroundSize:"32px 32px"}} />
      </div>
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-7 text-center sm:mb-9">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[.06] shadow-2xl shadow-emerald-500/10">
            <Icon className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="brand-wordmark mb-2 text-3xl font-semibold text-white">StudyOS</div>
          <div className="mb-3 text-[9px] font-medium uppercase tracking-[0.3em] text-emerald-400/65">LEARN • PRACTICE • MASTER</div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
          {subtitle && <p className="mt-2 text-sm leading-6 text-[#B4C0BA]">{subtitle}</p>}
        </div>
        <div className="overflow-hidden rounded-[28px] border border-[#293630] bg-[#18211E] p-6 shadow-2xl shadow-black/30 sm:p-8">{children}</div>
        {footer && <p className="mt-6 text-center text-sm text-[#B4C0BA]">{footer}</p>}
        <AppFooter compact />
      </div>
    </div>
  );
}