"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlatformIcon from "@/components/PlatformIcon";
import { isReservedUsername } from "@/lib/reservedUsernames";

const GOALS = [
  { id: "creator", title: "Creator", desc: "Build my following and share what I make.", emoji: "🎨" },
  { id: "business", title: "Business", desc: "Grow my business and reach more customers.", emoji: "💼" },
  { id: "personal", title: "Personal", desc: "Share links with my friends and acquaintances.", emoji: "🙌" },
];

const PLATFORMS = [
  { id: "instagram", label: "Instagram", placeholder: "@yourhandle" },
  { id: "facebook", label: "Facebook", placeholder: "facebook.com/username" },
  { id: "whatsapp", label: "WhatsApp", placeholder: "8801XXXXXXXXX" },
  { id: "x", label: "X", placeholder: "@yourhandle" },
  { id: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/username" },
  { id: "discord", label: "Discord", placeholder: "discord.gg/invite" },
  { id: "email", label: "Email", placeholder: "you@example.com" },
];

// Turn what the person typed into a proper link for each platform
function toUrl(platform: string, raw: string): string {
  const v = raw.trim().replace(/^@/, "");
  if (!v) return "";
  if (platform === "email") return v;
  if (/^https?:\/\//i.test(v)) return v;
  switch (platform) {
    case "instagram": return `https://instagram.com/${v}`;
    case "facebook": return v.includes("facebook.com") ? `https://${v}` : `https://facebook.com/${v}`;
    case "whatsapp": return `https://wa.me/${v.replace(/[^0-9]/g, "")}`;
    case "x": return `https://x.com/${v}`;
    case "linkedin": return v.includes("linkedin.com") ? `https://${v}` : `https://linkedin.com/in/${v}`;
    default: return `https://${v}`;
  }
}

// Steps: 0 username · 1 goal · 2 platforms · 3 links · 4 profile · 5 done
const TOTAL = 6;

export default function Onboarding() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name, bio, avatar_url")
        .eq("id", user.id)
        .single();
      if (p) {
        setUsername(p.username);
        // Auto-generated placeholders (user_xxxxxxxx) show as an empty
        // field so the person actively claims their real username.
        setUsernameInput(/^user_[a-z0-9]{8}$/.test(p.username) ? "" : p.username);
        setDisplayName(p.display_name ?? p.username);
        setBio(p.bio ?? "");
        setAvatarUrl(p.avatar_url ?? "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reaching the final "done" screen marks registration as complete —
  // whether the user clicked Continue or Skip to get there.
  useEffect(() => {
    if (step === 5 && userId) {
      supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId)
        .then(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, userId]);

  async function saveUsername() {
    if (!userId) return;
    setUsernameError(null);
    const clean = usernameInput.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      setUsernameError("Username must be 3–30 characters: a–z, 0–9, underscore.");
      return;
    }
    if (isReservedUsername(clean)) {
      setUsernameError("That username is reserved — please choose another.");
      return;
    }
    if (clean === username) { setStep(1); return; } // unchanged, nothing to save
    setBusy(true);
    const { data: taken } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .maybeSingle();
    if (taken) {
      setUsernameError("That username is taken — try another.");
      setBusy(false);
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        username: clean,
        // Keep display name in sync while it's still just the placeholder.
        ...(displayName === username ? { display_name: clean } : {}),
      })
      .eq("id", userId);
    setBusy(false);
    if (error) {
      setUsernameError("Couldn't save that username — please try again.");
      return;
    }
    setUsername(clean);
    if (displayName === username || !displayName) setDisplayName(clean);
    setStep(1);
  }

  function togglePlatform(id: string) {
    setPicked((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length >= 5 ? cur : [...cur, id]
    );
  }

  async function saveGoal() {
    if (userId && goal) {
      // The goal column is optional — if the migration wasn't run, just continue.
      try { await supabase.from("profiles").update({ goal }).eq("id", userId); } catch { /* ignore */ }
    }
    setStep(2);
  }

  async function saveLinks() {
    if (!userId) return;
    setBusy(true);
    const rows = picked
      .map((pid, i) => {
        const url = toUrl(pid, values[pid] ?? "");
        if (!url) return null;
        const label = PLATFORMS.find((p) => p.id === pid)?.label ?? pid;
        return { user_id: userId, title: label, url, platform: pid, position: i };
      })
      .filter(Boolean) as object[];
    if (rows.length) await supabase.from("links").insert(rows);
    setBusy(false);
    setStep(4);
  }

  async function handleAvatar(file: File) {
    if (!userId || !file) return;
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file);
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
    }
    setUploading(false);
  }

  async function saveProfile() {
    if (!userId) return;
    setBusy(true);
    await supabase
      .from("profiles")
      .update({ display_name: displayName || username, bio })
      .eq("id", userId);
    setBusy(false);
    setStep(5);
  }

  // pre-generate confetti pieces for the final screen
  const confetti = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 3,
        color: ["#f0a83c", "#e46a5e", "#d8f462", "#7bd4c2", "#b465da"][i % 5],
        size: 6 + Math.random() * 6,
      })),
    []
  );

  return (
    <div className="ob">
      {step < 5 && (
        <div className="ob-top">
          <button
            className="ob-nav"
            onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}
          >
            Back
          </button>
          <div className="ob-progress">
            <div
              className="ob-progress-fill"
              style={{ width: `${((step + 1) / TOTAL) * 100}%` }}
            />
          </div>
          <button className="ob-nav" onClick={() => setStep(step + 1)}>
            Skip
          </button>
        </div>
      )}

      {/* ---- STEP 0: claim username ---- */}
      {step === 0 && (
        <div className="ob-body">
          <h1>Claim your username</h1>
          <p className="ob-sub">It becomes your public URL — you can change it later.</p>
          <div className="ob-fields">
            <div className="field">
              <label htmlFor="ob-username">Username</label>
              <input
                id="ob-username"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveUsername()}
                placeholder="yourname"
                autoComplete="username"
                autoFocus
              />
              {usernameInput && (
                <span className="hint">
                  Your page: /{usernameInput.toLowerCase().trim()}
                </span>
              )}
            </div>
          </div>
          {usernameError && <p className="error">{usernameError}</p>}
          <button
            className="ob-continue"
            disabled={!usernameInput.trim() || busy}
            onClick={saveUsername}
          >
            {busy ? "Checking…" : "Continue"}
          </button>
        </div>
      )}

      {/* ---- STEP 1: goal ---- */}
      {step === 1 && (
        <div className="ob-body">
          <h1>Which best describes your goal?</h1>
          <p className="ob-sub">This helps us personalize your experience.</p>
          <div className="ob-goals">
            {GOALS.map((g) => (
              <button
                key={g.id}
                className={`ob-goal ${goal === g.id ? "selected" : ""}`}
                onClick={() => setGoal(g.id)}
              >
                <div>
                  <div className="ob-goal-title">{g.title}</div>
                  <div className="ob-goal-desc">{g.desc}</div>
                </div>
                <div className="ob-goal-emoji">{g.emoji}</div>
              </button>
            ))}
          </div>
          <button className="ob-continue" disabled={!goal} onClick={saveGoal}>
            Continue
          </button>
        </div>
      )}

      {/* ---- STEP 2: platforms ---- */}
      {step === 2 && (
        <div className="ob-body">
          <h1>Which platforms are you on?</h1>
          <p className="ob-sub">Pick up to five to get started. You can update at any time.</p>
          <div className="ob-grid">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                className={`ob-tile ${picked.includes(p.id) ? "selected" : ""}`}
                onClick={() => togglePlatform(p.id)}
              >
                <span className="ob-tile-icon">
                  <PlatformIcon platform={p.id} size={26} />
                </span>
                {p.label}
              </button>
            ))}
          </div>
          <button
            className="ob-continue"
            disabled={picked.length === 0}
            onClick={() => setStep(3)}
          >
            Continue
          </button>
        </div>
      )}

      {/* ---- STEP 3: add links ---- */}
      {step === 3 && (
        <div className="ob-body">
          <h1>Add your links</h1>
          <p className="ob-sub">Complete the fields below to add your content to your page.</p>
          <div className="ob-links">
            {picked.map((pid) => {
              const meta = PLATFORMS.find((p) => p.id === pid)!;
              return (
                <div className="ob-link-row" key={pid}>
                  <span className="ob-tile-icon small">
                    <PlatformIcon platform={pid} size={20} />
                  </span>
                  <input
                    value={values[pid] ?? ""}
                    onChange={(e) => setValues({ ...values, [pid]: e.target.value })}
                    placeholder={meta.placeholder}
                    aria-label={meta.label}
                  />
                </div>
              );
            })}
          </div>
          <button className="ob-continue" onClick={saveLinks} disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      )}

      {/* ---- STEP 4: profile details ---- */}
      {step === 4 && (
        <div className="ob-body">
          <h1>Add profile details</h1>
          <p className="ob-sub">Add your profile image, name, and bio.</p>

          <button
            className="ob-avatar"
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            aria-label="Upload profile photo"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" />
            ) : (
              <span className="ob-avatar-letter">
                {uploading ? "…" : (displayName || username || "?")[0]?.toUpperCase()}
              </span>
            )}
            <span className="ob-avatar-plus">+</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleAvatar(f);
              e.target.value = "";
            }}
          />

          <div className="ob-fields">
            <div className="field">
              <label htmlFor="dn">Display Name</label>
              <input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={3}
                maxLength={160}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
              <span className="hint" style={{ textAlign: "right" }}>{bio.length}/160</span>
            </div>
          </div>

          <button className="ob-continue" onClick={saveProfile} disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </div>
      )}

      {/* ---- STEP 5: done + confetti ---- */}
      {step === 5 && (
        <div className="ob-body ob-done">
          <div className="ob-confetti" aria-hidden="true">
            {confetti.map((c, i) => (
              <span
                key={i}
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  background: c.color,
                  width: c.size,
                  height: c.size * 0.6,
                }}
              />
            ))}
          </div>
          <h1>Looking good!</h1>
          <p className="ob-sub">Your page is off to a great start.</p>

          <div className="ob-preview">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="ob-preview-avatar" src={avatarUrl} alt="" />
            ) : (
              <div className="ob-preview-avatar placeholder">
                {(displayName || username || "?")[0]?.toUpperCase()}
              </div>
            )}
            <div className="ob-preview-name">{displayName || username}</div>
            {bio && <div className="ob-preview-bio">{bio}</div>}
            <div className="ob-preview-icons">
              {picked.slice(0, 5).map((pid) => (
                <span key={pid}>
                  <PlatformIcon platform={pid} size={16} />
                </span>
              ))}
            </div>
          </div>

          <div className="ob-done-actions">
            <button
              className="btn ob-cta"
              onClick={() => router.push("/dashboard")}
            >
              Continue to dashboard →
            </button>
            <a
              className="btn ob-view"
              href={`/${username}`}
              target="_blank"
              rel="noreferrer"
            >
              View my page →
            </a>
          </div>

          {/* Soft cross-sell — a text link, not a third button, so the two
              real actions above stay unambiguous. */}
          <p className="ob-crosssell">
            Need a professional CV too?{" "}
            <button onClick={() => router.push("/cv/onboarding")}>
              Build a portfolio →
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
