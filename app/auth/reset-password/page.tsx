"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BrandLink from "@/components/BrandLink";
import ThemeToggle from "@/components/ThemeToggle";

// The reset email links here. Supabase includes a one-time recovery code
// in the URL; exchanging it grants a short-lived session whose only real
// job is to let the person set a new password.
export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<"checking" | "ready" | "invalid">(
    "checking"
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsubbed = false;

    // The browser client may auto-exchange the recovery code; listen for
    // the session in case it does.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !unsubbed) setStatus("ready");
    });

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setStatus("ready");
        return;
      }
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setStatus("ready");
          return;
        }
        // The auto-detect path may have consumed the code already — re-check.
        const {
          data: { session: retry },
        } = await supabase.auth.getSession();
        if (retry) {
          setStatus("ready");
          return;
        }
      }
      setStatus((s) => (s === "checking" ? "invalid" : s));
    })();

    return () => {
      unsubbed = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mismatch = confirm.length > 0 && password !== confirm;

  async function saveNewPassword() {
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError(
        "Passwords do not match. Please enter the same password in both fields."
      );
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(
        error.message.includes("different from the old")
          ? "New password must be different from your old one."
          : "Couldn't update the password: " + error.message
      );
      setBusy(false);
      return;
    }
    // Per the flow: land back on the login page and sign in fresh.
    await supabase.auth.signOut();
    router.push("/login?reset=done");
    router.refresh();
  }

  return (
    <div className="auth-split">
      <div className="auth-pane">
        <div className="auth-box">
          <div className="auth-brand-row">
            <BrandLink className="hero-brand" />
            <ThemeToggle />
          </div>

          {status === "checking" && (
            <p className="hint">Checking your reset link…</p>
          )}

          {status === "invalid" && (
            <>
              <h1 style={{ marginBottom: 4, fontSize: "1.7rem" }}>
                Link expired
              </h1>
              <p className="hint" style={{ marginBottom: 22 }}>
                This reset link is invalid or has expired. Request a new one
                from the login page.
              </p>
              <Link className="btn" style={{ display: "block", textAlign: "center" }} href="/login">
                Back to log in
              </Link>
            </>
          )}

          {status === "ready" && (
            <>
              <h1 style={{ marginBottom: 4, fontSize: "1.7rem" }}>
                Set a new password
              </h1>
              <p className="hint" style={{ marginBottom: 22 }}>
                Choose a new password for your account.
              </p>

              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  autoFocus
                />
              </div>
              <div className="field">
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <input
                  id="confirm-new-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNewPassword()}
                  autoComplete="new-password"
                  aria-invalid={mismatch}
                />
                {mismatch && (
                  <span className="error" style={{ margin: "4px 0 0" }}>
                    Passwords do not match. Please enter the same password in
                    both fields.
                  </span>
                )}
              </div>

              {error && <p className="error">{error}</p>}

              <button
                className="btn"
                style={{ width: "100%" }}
                onClick={saveNewPassword}
                disabled={busy || mismatch}
              >
                {busy ? "Saving…" : "Save new password"}
              </button>
            </>
          )}
        </div>
      </div>

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
