import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, ShieldCheck, CalendarDays, Github, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import AuthUnavailable from "@/components/AuthUnavailable";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

const MINIMUM_AGE = 13;
const OTP_UI_TTL_MS = 10 * 60 * 1000;

function calculateAge(dateValue) {
  if (!dateValue) return 0;
  const birth = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function passwordChecks(password) {
  return {
    length: password.length >= 12,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageError, setAgeError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpStartedAt, setOtpStartedAt] = useState(0);
  const [otpRemaining, setOtpRemaining] = useState(0);
  const [resendBusy, setResendBusy] = useState(false);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const passwordScore = Object.values(checks).filter(Boolean).length;
  const age = calculateAge(dateOfBirth);
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
    if (!otpStartedAt) return undefined;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, OTP_UI_TTL_MS - Date.now() + otpStartedAt);
      setOtpRemaining(remaining);
      if (remaining === 0) {
        setOtpCode("");
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpStartedAt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAgeError("");

    if (!dateOfBirth || age < MINIMUM_AGE) {
      setAgeError(`StudyOS accounts currently require an age of ${MINIMUM_AGE} or older.`);
      return;
    }
    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions and Privacy Policy to create an account.");
      return;
    }
    if (passwordScore < 4) {
      setError("Use a password with at least 12 characters plus uppercase, lowercase, a number, and a symbol.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!navigator.onLine) {
      setOffline(true);
      return;
    }

    setLoading(true);
    try {
      await base44.auth.register({ email: email.trim(), password });
      setShowOtp(true);
      setOtpStartedAt(Date.now());
      setOtpRemaining(OTP_UI_TTL_MS);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    if (!otpRemaining) {
      setError("This verification screen has expired. Request a new code.");
      return;
    }
    if (otpCode.length < 6) return;
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email: email.trim(), otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      window.location.href = returnTo;
    } catch (err) {
      setError(err?.status === 429 ? "Too many verification attempts. Please wait before trying again." : (err.message || "Invalid or expired verification code."));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendBusy || !navigator.onLine) {
      if (!navigator.onLine) setOffline(true);
      return;
    }
    setResendBusy(true);
    setError("");
    try {
      await base44.auth.resendOtp(email.trim());
      setOtpStartedAt(Date.now());
      setOtpRemaining(OTP_UI_TTL_MS);
      setOtpCode("");
      toast({ title: "New code sent", description: "Check your email for the latest verification code." });
    } catch (err) {
      setError(err?.status === 429 ? "Too many code requests. Please wait before requesting another." : (err.message || "Failed to resend code."));
    } finally {
      setResendBusy(false);
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
    base44.auth.loginWithProvider("github", returnTo);
  };

  if (offline) {
    return <AuthUnavailable offline message="Reconnect to the internet to create your StudyOS account. Your password is sent to Base44 authentication and is not saved in a StudyOS database entity." />;
  }

  if (showOtp) {
    const minutes = Math.floor(otpRemaining / 60000);
    const seconds = Math.floor((otpRemaining % 60000) / 1000).toString().padStart(2, "0");

    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`Enter the code we sent to ${email}`}>
        <div className="mb-6 rounded-2xl border border-[#293630] bg-[#18211E] p-4 text-sm text-[#B4C0BA]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-400/10">
              <ShieldCheck className="h-5 w-5 text-blue-300" aria-hidden="true" />
            </div>
            <div>
              <p className="font-semibold text-white/90">Email verification</p>
              <p className="text-xs leading-5 text-[#7F8C86]">This screen expires after 10 minutes and requires a fresh code after expiry.</p>
            </div>
          </div>
        </div>

        {error && <div role="alert" className="mb-4 rounded-2xl border border-[#EF6B73]/30 bg-[#241A1C] p-3.5 text-sm text-[#F5A9AD]">{error}</div>}

        <div className="mb-6 flex justify-center">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
            disabled={loading || !otpRemaining}
          >
            <InputOTPGroup>
              {[0,1,2,3,4,5].map((index) => <InputOTPSlot key={index} index={index} />)}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <div className="mb-5 text-center text-xs text-[#7F8C86]">
          {otpRemaining ? `Code window: ${minutes}:${seconds}` : "Code window expired"}
        </div>

        <Button
          className="h-12 w-full bg-emerald-400 font-semibold text-black hover:bg-emerald-300"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6 || !otpRemaining}
        >
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : "Verify email"}
        </Button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendBusy || loading}
          className="mt-4 w-full text-center text-sm font-medium text-emerald-400 transition hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {resendBusy ? "Sending..." : "Send a new code"}
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Set up a secure StudyOS account in a few steps"
      footer={
        <>
          Already have an account?{" "}
          <Link to={"/login" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")} className="font-medium text-emerald-400 hover:text-emerald-300">
            Log in
          </Link>
        </>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" className="h-12 border-[#293630] bg-[#1E2925] text-white hover:bg-[#232E29] hover:text-white" onClick={handleGoogle} disabled={loading}>
          <GoogleIcon className="mr-2 h-5 w-5" /> Google
        </Button>
        <Button type="button" variant="outline" className="h-12 border-[#293630] bg-[#1E2925] text-white hover:bg-[#232E29] hover:text-white" onClick={handleGitHub} disabled={loading}>
          <Github className="mr-2 h-5 w-5" /> GitHub
        </Button>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[#293630]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#7F8C86]">standard sign up</span>
        <div className="h-px flex-1 bg-[#293630]" />
      </div>

      {error && <div role="alert" className="mb-4 rounded-2xl border border-[#EF6B73]/30 bg-[#241A1C] p-3.5 text-sm text-[#F5A9AD]">{error}</div>}
      {ageError && <div role="alert" className="mb-4 rounded-2xl border border-[#F2B84B]/30 bg-[#272118] p-3.5 text-sm text-[#F2CE8F]">{ageError}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#B4C0BA]">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input id="email" type="email" autoComplete="email" autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 border-[#314039] bg-[#0E1412] pl-10 text-white placeholder:text-[#718078] focus-visible:ring-emerald-400/30" required disabled={loading} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dob" className="text-[#B4C0BA]">Date of birth</Label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input id="dob" type="date" autoComplete="bday" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} max={new Date().toISOString().slice(0,10)} className="h-12 border-white/10 bg-black/20 pl-10 text-white focus-visible:ring-emerald-400/30" required disabled={loading} />
          </div>
          <p className="text-[11px] text-[#7F8C86]">StudyOS currently accepts accounts for ages 13 and above. Date of birth is used here for the eligibility check and is not sent to the authentication API.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#B4C0BA]">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input id="password" type="password" autoComplete="new-password" placeholder="Create a strong password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 border-[#314039] bg-[#0E1412] pl-10 text-white placeholder:text-[#718078] focus-visible:ring-emerald-400/30" required disabled={loading} />
          </div>
          <div className="grid grid-cols-5 gap-1" aria-label={`Password strength ${passwordScore} of 5`}>
            {[1,2,3,4,5].map((level) => (
              <div key={level} className={`h-1.5 rounded-full transition-colors ${passwordScore >= level ? "bg-emerald-400" : "bg-[#293630]"}`} />
            ))}
          </div>
          <div className="grid gap-1 text-[10px] text-[#7F8C86] sm:grid-cols-2">
            <span className={checks.length ? "text-emerald-300/80" : ""}>• 12+ characters</span>
            <span className={checks.upper ? "text-emerald-300/80" : ""}>• uppercase</span>
            <span className={checks.lower ? "text-emerald-300/80" : ""}>• lowercase</span>
            <span className={checks.number ? "text-emerald-300/80" : ""}>• number</span>
            <span className={checks.symbol ? "text-emerald-300/80" : ""}>• symbol</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-[#B4C0BA]">Confirm password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" aria-hidden="true" />
            <Input id="confirm" type="password" autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-12 border-[#314039] bg-[#0E1412] pl-10 text-white placeholder:text-[#718078] focus-visible:ring-emerald-400/30" required disabled={loading} />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#293630] bg-[#18211E] p-3.5">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-400"
            disabled={loading}
            required
          />
          <span className="text-xs leading-5 text-[#B4C0BA]">
            I agree to the{" "}
            <Link to="/terms" className="font-medium text-emerald-400 hover:text-emerald-300" target="_blank" rel="noreferrer">Terms & Conditions</Link>
            {" "}and acknowledge the{" "}
            <Link to="/privacy" className="font-medium text-emerald-400 hover:text-emerald-300" target="_blank" rel="noreferrer">Privacy Policy</Link>.
          </span>
        </label>

        <Button type="submit" className="h-12 w-full bg-emerald-400 font-semibold text-black hover:bg-emerald-300" disabled={loading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating securely...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Create secure account</>}
        </Button>
      </form>
    </AuthLayout>
  );
}