import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogIn } from "lucide-react";
import ErrorScreen from "@/components/errors/ErrorScreen";
import { ErrorActions, GoBackButton, PRIMARY_BUTTON } from "@/components/errors/ErrorActions";
import { safeReturnTo } from "@/lib/authReturnTo";

// Shown when a protected resource requires authentication. Preserves the
// same-origin returnTo behaviour so sign-in resumes on the original page.
export default function AuthRequired() {
  const location = useLocation();
  const fromQuery = safeReturnTo();
  const returnTo =
    fromQuery !== "/"
      ? fromQuery
      : location.pathname.startsWith("/error/")
      ? "/"
      : location.pathname + location.search;

  return (
    <ErrorScreen
      icon={LogIn}
      eyebrow="Authentication required"
      title="Sign in required"
      message="Please sign in to continue."
    >
      <ErrorActions>
        <Link to={"/login?returnTo=" + encodeURIComponent(returnTo)} className={PRIMARY_BUTTON}>
          <LogIn className="h-4 w-4" aria-hidden="true" /> Sign In
        </Link>
        <GoBackButton />
      </ErrorActions>
    </ErrorScreen>
  );
}