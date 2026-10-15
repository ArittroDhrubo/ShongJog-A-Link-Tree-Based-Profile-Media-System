"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandLink from "@/components/BrandLink";
import ThemeToggle from "@/components/ThemeToggle";
import { DEFAULT_SECTIONS } from "@/lib/cv";

// First-run setup for the CV product. Activates the product, creates the
// cv_profile row and the default sections, then hands off to the editor.
export default function CvOnboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);

      // Already activated? Skip straight to the editor.
      const { data: existing } = await supabase
        .from("user_products")
        .select("product")
        .eq("user_id", user.id)
        .eq("product", "cv")
        .maybeSingle();
      if (existing) {
        router.push("/cv/dashboard");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .single();
      if (profile) setDisplayName(profile.display_name ?? profile.username);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activate() {
    if (!userId) return;
    setBusy(true);
    setError(null);

    // 1. Activate the product.
    const { error: prodErr } = await supabase
      .from("user_products")
      .insert({ user_id: userId, product: "cv" });
    if (prodErr && !prodErr.message.includes("duplicate")) {
      setError("Couldn't set up your portfolio — please try again.");
      setBusy(false);
      return;
    }

    // 2. Create the CV profile row.
    const { error: cvErr } = await supabase.from("cv_profiles").upsert({
      user_id: userId,
      tagline: tagline.trim() || null,
    });
    if (cvErr) {
      setError("Couldn't save your details — please try again.");
      setBusy(false);
      return;
    }

    // 3. Seed the default sections so the editor isn't empty.
    const rows = DEFAULT_SECTIONS.map((type, i) => ({
      user_id: userId,
      type,
      position: i,
    }));
    await supabase.from("cv_sections").upsert(rows, {
      onConflict: "user_id,type",
      ignoreDuplicates: true,
    });

    router.push("/cv/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="auth-split">
        <div className="auth-pane">
          <div className="auth-box">
            <p className="hint">Loading…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-split">
      <div className="auth-pane">
        <div className="auth-box">
          <div className="auth-brand-row">
            <BrandLink className="hero-brand" />
            <ThemeToggle />
          </div>

          <h1 style={{ marginBottom: 4, fontSize: "1.7rem" }}>
            Build your portfolio
          </h1>
          <p className="hint" style={{ marginBottom: 22 }}>
            A professional page for your work, experience, and projects — using
            the same account and username.
          </p>

          <div className="field">
            <label htmlFor="tagline">
              Your tagline <span className="hint">(you can change this later)</span>
            </label>
            <input
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && activate()}
              placeholder="Product Designer · Dhaka"
              autoFocus
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button
            className="btn"
            style={{ width: "100%" }}
            onClick={activate}
            disabled={busy}
          >
            {busy ? "Setting up…" : "Create my portfolio →"}
          </button>

          <p className="hint" style={{ marginTop: 16, textAlign: "center" }}>
            Hi {displayName || "there"} — this won't affect your link page.
          </p>
        </div>
      </div>

      <div className="auth-visual" aria-hidden="true">
        <div className="mock-phone">
          <div className="mock-avatar">S</div>
          <div className="mock-name">your portfolio</div>
          <div className="mock-bio">Experience · Projects · Skills</div>
          <div className="mock-card" />
          <div className="mock-card" />
          <div className="mock-card short" />
        </div>
      </div>
    </div>
  );
}
