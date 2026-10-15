"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLink from "@/components/BrandLink";
import ThemeToggle from "@/components/ThemeToggle";
import { validateEmail } from "@/lib/emailValidation";
import { isReservedUsername } from "@/lib/reservedUsernames";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

const AUTH_MESSAGES: Record<string, string> = {
  no_account:
    "No account found with this Google account. Please claim your username and complete the registration process first.",
  already_registered:
    "An account already exists with this Google account. Please log in instead.",
  oauth: "Google sign-in failed. Please try again.",
};

function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(
    params.get("mode") === "signup" ? "signup" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [username, setUsername] = useState(params.get("username") ?? "");
  const [error, setError] = useState<string | null>(() => {
    const code = params.get("error");
    return code ? AUTH_MESSAGES[code] ?? null : null;
  });
  const [notice, setNotice] = useState<string | null>(() =>
    params.get("reset") === "done"
      ? "Password updated — log in with your new password."
      : null
  );
  const [busy, setBusy] = useState(false);
  // forgot-password sub-view (login flow only)
  const [resetView, setResetView] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // email/password signup awaiting inbox confirmation
  const [verifySent, setVerifySent] = useState(false);

  const passwordsMismatch =
    mode === "signup" &&
    confirmPassword.length > 0 &&
    password !== confirmPassword;

  async function resendVerification() {
    const supabase = createClient();
    await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setError(null);
    setNotice("Verification email re-sent — check your inbox and spam folder.");
  }

  async function sendResetEmail() {
    setError(null);
    const clean = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    // Same response whether or not the email is registered, so this form
    // can't be used to probe which emails have accounts.
    await supabase.auth.resetPasswordForEmail(clean, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setBusy(false);
    setResetSent(true);
  }

  async function signInWithGoogle() {
    setError(null);
    const supabase = createClient();

    // The intent travels via short-lived cookies: Supabase's redirect
    // allow-list silently rejects redirectTo URLs with query params,
    // which dumps users on the homepage with no session.
    const cookieOpts = "path=/; max-age=600; SameSite=Lax";

    if (mode === "signup") {
      document.cookie = `auth_intent=signup; ${cookieOpts}`;
      // If a valid username is already typed/pre-filled, carry it along as
      // a pre-claim. If not, no problem — the user claims one as the first
      // step of onboarding, after Google confirms who they are.
      const clean = username.toLowerCase().trim();
      if (isReservedUsername(clean)) {
        setError("That username is reserved — please choose another.");
        return;
      }
      if (/^[a-z0-9_]{3,30}$/.test(clean)) {
        document.cookie = `auth_claim=${encodeURIComponent(clean)}; ${cookieOpts}`;
      } else {
        document.cookie = "auth_claim=; path=/; max-age=0";
      }
    } else {
      document.cookie = `auth_intent=login; ${cookieOpts}`;
      document.cookie = "auth_claim=; path=/; max-age=0";
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    const supabase = createClient();

    if (mode === "signup") {
      const clean = username.toLowerCase().trim();
      if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
        setError("Username must be 3–30 characters: a–z, 0–9, underscore.");
        setBusy(false);
        return;
      }
      if (isReservedUsername(clean)) {
        setError("That username is reserved — please choose another.");
        setBusy(false);
        return;
      }
      const emailCheck = validateEmail(email);
      if (!emailCheck.ok) {
        setError(emailCheck.message);
        setBusy(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setBusy(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please enter the same password in both fields.");
        setBusy(false);
        return;
      }
      const { data: taken } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .maybeSingle();
      if (taken) {
        setError("That username is taken — try another.");
        setBusy(false);
        return;
      }
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: emailCheck.email,
        password,
        options: {
          data: { username: clean },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(
          /already registered/i.test(error.message)
            ? "An account already exists with this email. Please log in instead."
            : error.message
        );
        setBusy(false);
        return;
      }
      // With email confirmation enabled, no session is returned until the
      // address is verified — the account stays inactive until then.
      if (!signUpData.session) {
        setVerifySent(true);
        setBusy(false);
        return;
      }
      // Confirmation disabled in Supabase → straight to onboarding.
      router.push("/onboarding");
      router.refresh();
      return;
    } else {
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(
          /not confirmed/i.test(error.message)
            ? "Please verify your email first — check your inbox for the confirmation link."
            : error.message
        );
        setBusy(false);
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", auth.user.id)
        .maybeSingle();
      router.push(p?.onboarding_completed ? "/dashboard" : "/onboarding");
      router.refresh();
      return;
    }
  }

  return (
    <div className="auth-split">
      {/* ---- left: the form ---- */}
      <div className="auth-pane">
        <div className="auth-box">
          <div className="auth-brand-row">
            <BrandLink className="hero-brand" />
            <ThemeToggle />
          </div>
          <h1 style={{ marginBottom: 4, fontSize: "1.7rem" }}>
            {mode === "signup" ? "Create your page" : "Welcome back"}
          </h1>
          <p className="hint" style={{ marginBottom: 22 }}>
            {mode === "signup"
              ? "Pick a username — it becomes your public URL."
              : "Log in to edit your links."}
          </p>

          {verifySent ? (
            <>
              <p className="success">
                Almost there! We sent a confirmation link to <b>{email}</b>.
                Click it to verify your email — your account activates only
                after verification.
              </p>
              {notice && <p className="success">{notice}</p>}
              <p className="hint" style={{ marginBottom: 16 }}>
                No email after a minute? Check spam, or resend below.
              </p>
              <button
                className="btn"
                style={{ width: "100%" }}
                onClick={resendVerification}
              >
                Resend verification email
              </button>
              <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setVerifySent(false);
                    setNotice(null);
                    setMode("login");
                  }}
                >
                  Back to log in
                </button>
              </p>
            </>
          ) : resetView ? (
            <>
              {resetSent ? (
                <>
                  <p className="success">
                    If an account exists with this email, password reset
                    instructions have been sent. Please check your inbox.
                  </p>
                  <p className="hint" style={{ marginBottom: 16 }}>
                    The link expires after a short time. No email? Check spam,
                    or try again in a minute.
                  </p>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="reset-email">Email</label>
                    <input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendResetEmail()}
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                  {error && <p className="error">{error}</p>}
                  <button
                    className="btn"
                    style={{ width: "100%" }}
                    onClick={sendResetEmail}
                    disabled={busy}
                  >
                    {busy ? "Sending…" : "Send reset link"}
                  </button>
                </>
              )}
              <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setResetView(false);
                    setResetSent(false);
                    setError(null);
                  }}
                >
                  Back to log in
                </button>
              </p>
            </>
          ) : (
            <>
          <button className="oauth-btn" onClick={signInWithGoogle}>
            <GoogleLogo />
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                autoComplete="username"
              />
              {username && (
                <span className="hint">
                  Your page: /{username.toLowerCase().trim()}
                </span>
              )}
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (mode === "signup") {
                  const check = validateEmail(e.target.value);
                  setEmailHint(
                    !check.ok && e.target.value.includes("@") ? check.message : null
                  );
                } else {
                  setEmailHint(null);
                }
              }}
              autoComplete="email"
              aria-invalid={!!emailHint}
            />
            {emailHint && mode === "signup" && (
              <span className="error" style={{ margin: "4px 0 0" }}>
                {emailHint}
              </span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={passwordsMismatch}
              />
              {passwordsMismatch && (
                <span className="error" style={{ margin: "4px 0 0" }}>
                  Passwords do not match. Please enter the same password in
                  both fields.
                </span>
              )}
            </div>
          )}

          {mode === "login" && (
            <p style={{ textAlign: "right", marginTop: -6, marginBottom: 10 }}>
              <button
                type="button"
                className="auth-forgot"
                onClick={() => {
                  setResetView(true);
                  setError(null);
                  setNotice(null);
                }}
              >
                Forgot password?
              </button>
            </p>
          )}

          {notice && <p className="success">{notice}</p>}
          {error && <p className="error">{error}</p>}

          <button
            className="btn"
            style={{ width: "100%" }}
            onClick={handleSubmit}
            disabled={busy || passwordsMismatch}
          >
            {busy ? "Working…" : mode === "signup" ? "Create account" : "Log in"}
          </button>

          <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              className="btn ghost small"
              onClick={() => setMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </p>
            </>
          )}
        </div>
      </div>

      {/* ---- right: visual panel ---- */}
      <div className="auth-visual" aria-hidden="true">
        <div className="mock-phone">
          <div className="mock-avatar">S</div>
          <div className="mock-name">your_name</div>
          <div className="mock-bio">All your links, one page</div>
          <div className="mock-socials">
            <span /><span /><span /><span /><span />
          </div>
          <div className="mock-card" />
          <div className="mock-card" />
          <div className="mock-card short" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
