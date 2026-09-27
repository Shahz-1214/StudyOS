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
import Turnstile from "@/components/Turnstile";
import { TURNSTILE_ACTIONS, verifyTurnstileToken } from "@/lib/turnstileConfig";

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
  return "We couldn't complete sign-in. Please try again.";
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [rateState, setRateState] = useState(() => getAuthRateLimitState());
  const [tsToken, setTsToken] = useState(null);
  const [tsBypass, setTsBypass] = useState(false);
  const [tsReset, setTsReset] = useState(0);
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
      if (!tsBypass) {
        const ok = await verifyTurnstileToken(tsToken, TURNSTILE_ACTIONS.login);
        if (!ok) {
          setError("Verification failed. Please try again.");
          setTsToken("");
          setTsReset((r) => r + 1);
          return;
        }
      }
      await base44.auth.loginViaEmailPassword(email.trim(), password);
      resetAuthRateLimit();
      window.location.href = returnTo;
    } catch (err) {
      const next = recordFailedAuthAttempt();
      setRateState(next);
      setError(friendlyAuthError(err));
      setTsReset((r) => r + 1);
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
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#293630] bg-[#18211E] p-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10">
          <ShieldCheck className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/90">Protected sign-in</p>
          <p className="mt-0.5 text-[11px] leading-5 text-[#B4C0BA]">Credentials are handled by Base44 authentication; StudyOS never stores your password in an app entity.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 border-[#293630] bg-[#1E2925] text-white hover:bg-[#232E29] hover:text-white"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleIcon className="mr-2 h-5 w-5" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-12 border-[#293630] bg-[#1E2925] text-white hover:bg-[#232E29] hover:text-white"
          onClick={handleGitHub}
          disabled={loading}
        >
          <Github className="mr-2 h-5 w-5" />
          GitHub
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#293630]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#7F8C86]">or</span>
        <div className="h-px flex-1 bg-[#293630]" />
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-2xl border border-[#EF6B73]/30 bg-[#241A1C] p-3.5 text-sm text-[#F5A9AD]">
          {error}
          {rateState.locked && (
            <div className="mt-1 text-xs text-[#F5A9AD]/70">Local safeguard: try again in {lockSeconds}s.</div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#B4C0BA]">Email</Label>
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
              className="h-12 border-[#314039] bg-[#0E1412] pl-10 text-white placeholder:text-[#718078] focus-visible:ring-emerald-400/30"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[#B4C0BA]">Password</Label>
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
              className="h-12 border-[#314039] bg-[#0E1412] pl-10 text-white placeholder:text-[#718078] focus-visible:ring-emerald-400/30"
              required
              disabled={loading}
            />
          </div>
        </div>

        <Turnstile action={TURNSTILE_ACTIONS.login} onVerify={setTsToken} onBypass={() => setTsBypass(true)} resetKey={tsReset} className="mb-1" />

        <Button type="submit" className="h-12 w-full bg-emerald-400 font-semibold text-black hover:bg-emerald-300" disabled={loading || rateState.locked || (!tsBypass && !tsToken)}>
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

        <div className="pt-1 text-center text-[11px] text-[#7F8C86]">
          {rateState.remaining} protected attempts available in this browser window.
        </div>
      </form>
    </AuthLayout>
  );
}