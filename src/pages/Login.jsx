import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github, LogIn, Lock, Mail, ShieldCheck, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import AuthUnavailable from "@/components/AuthUnavailable";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { getAuthRateLimitState, recordFailedAuthAttempt, resetAuthRateLimit } from "@/lib/authRateLimit";

function friendlyAuthError(error) {
  if (error?.status === 429) {
    return "Too many sign-in attempts or requests. Please wait and try again.";
  }
  if (error?.status === 401) {
    return "The email or password is incorrect.";
  }
  if (error?.status === 403) {
    return "This account needs verification or is not currently permitted to sign in.";
  }
  return error?.message || "We couldn't complete sign-in. Please try again.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [rateState, setRateState] = useState(() => getAuthRateLimitState());
  const returnTo = safeReturnTo();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  useEffect(() => {
    if (!rateState.locked) return undefined;
    const timer = window.setInterval(() => setRateState(getAuthRateLimitState()), 1000);
    return () => window.clearInterval(timer);
  }, [rateState.locked]);

  const lockSeconds = useMemo(() => {
    if (!rateState.lockedUntil) return 0;
    return Math.max(0, Math.ceil((rateState.lockedUntil - Date.now()) / 1000));
  }, [rateState.lockedUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const currentRate = getAuthRateLimitState();
    setRateState(currentRate);
    if (currentRate.locked) {
      setError(`For security, sign-in is temporarily locked. Try again in ${Math.ceil((currentRate.lockedUntil - Date.now()) / 1000)}s.`);
      return;
    }
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }

    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      resetAuthRateLimit();
      window.location.href = returnTo;
    } catch (err) {
      const next = recordFailedAuthAttempt();
      setRateState(next);
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    base44.auth.loginWithProvider("google", returnTo);
  };

  const handleGitHub = () => {
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }
    // GitHub SSO must be enabled for the Base44 app/plan. If it is not enabled,
    // Base44 will reject the flow rather than falling back to a weaker method.
    base44.auth.loginWithProvider("github", returnTo);
  };

  if (offline) {
    return <AuthUnavailable offline message="Reconnect to the internet to securely contact the StudyOS authentication service. No password is stored by StudyOS." />;
  }

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Sign in securely and continue where you left off"
      footer={
        <>
          Don't have an account?{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            Create one
          </Link>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/85">Protected sign-in</p>
          <p className="mt-0.5 text-[11px] leading-5 text-white/45">Credentials are handled by Base44 authentication; StudyOS never stores your password in an app entity.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon className="mr-2 h-5 w-5" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:text-white"
          onClick={handleGitHub}
          disabled={loading}
        >
          <Github className="mr-2 h-5 w-5" />
          GitHub
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/[0.06] p-3.5 text-sm text-red-200">
          {error}
          {rateState.locked && (
            <div className="mt-1 text-xs text-red-200/65">Local safeguard: try again in {lockSeconds}s.</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/75">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/25 focus-visible:ring-emerald-400/30"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-white/75">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-emerald-400 hover:text-emerald-300">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/25 focus-visible:ring-emerald-400/30"
              required
              disabled={loading}
            />
          </div>
        </div>

        <Button type="submit" className="h-12 w-full bg-emerald-400 font-semibold text-black hover:bg-emerald-300" disabled={loading || rateState.locked}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating securely...
            </>
          ) : rateState.locked ? (
            <>Try again in {lockSeconds}s</>
          ) : (
            <>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Sign in securely
            </>
          )}
        </Button>

        <div className="pt-1 text-center text-[11px] text-white/30">
          {rateState.remaining} protected attempts available in this browser window.
        </div>
      </form>
    </AuthLayout>
  );
}
