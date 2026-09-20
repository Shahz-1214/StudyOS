import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Home, ArrowLeft, RefreshCw } from "lucide-react";

export const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-semibold text-black transition hover:bg-emerald-300";
export const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#293630] bg-[#1E2925] px-5 text-sm font-semibold text-white/90 transition hover:bg-[#232E29]";

export function ErrorActions({ children }) {
  return <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>;
}

export function DashboardButton({ label = "Go to Dashboard" }) {
  return (
    <Link to="/" className={PRIMARY_BUTTON}>
      <Home className="h-4 w-4" aria-hidden="true" /> {label}
    </Link>
  );
}

export function GoBackButton({ label = "Go Back" }) {
  const navigate = useNavigate();
  function goBack() {
    // Only step back if there is in-app history; otherwise land on the dashboard.
    if (window.history.state && window.history.state.idx > 0) navigate(-1);
    else navigate("/");
  }
  return (
    <button type="button" onClick={goBack} className={SECONDARY_BUTTON}>
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}

export function TryAgainButton({ label = "Try Again", onClick }) {
  return (
    <button type="button" onClick={onClick || (() => window.location.reload())} className={PRIMARY_BUTTON}>
      <RefreshCw className="h-4 w-4" aria-hidden="true" /> {label}
    </button>
  );
}