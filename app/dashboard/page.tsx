"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PlatformIcon, { PLATFORMS } from "@/components/PlatformIcon";
import {
  WALLPAPERS,
  WALLPAPER_CATEGORIES,
  ACCENTS,
  FONTS,
  CURSORS,
  getWallpaper,
  getFontFamily,
  getCursorCss,
  normalizeAccent,
  normalizeButtonStyle,
  type ButtonStyle,
} from "@/lib/design";
import BrandLink from "@/components/BrandLink";
import ProductSwitcher from "@/components/ProductSwitcher";
import CvAnnounceBanner from "@/components/CvAnnounceBanner";
import { isReservedUsername } from "@/lib/reservedUsernames";
import ThemeToggle from "@/components/ThemeToggle";

type LinkRow = {
  id: string;
  title: string;
  url: string;
  platform: string;
  position: number;
  is_active: boolean;
};

// Platforms that render as round icons under the name on the public page;
// everything else renders as a full-width card. Mirrors app/[username]/page.tsx.
const SOCIAL = new Set([
  "facebook", "instagram", "whatsapp", "discord", "x", "linkedin", "email",
]);

function SectionIcon({ kind }: { kind: "links" | "design" | "appearance" | "profile" }) {
  const paths: Record<string, string> = {
    design: "M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h6a3 3 0 0 0 3-3c0-3.3-4-6-9-6zM7.5 10.5h.01M10.5 6.5h.01M15.5 6.5h.01",
    links: "M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 0 0-7.07-7.07L10.5 5.5M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 0 0 7.07 7.07L13.5 18.5",
    appearance: "M4 16l4.5-6 3.5 4.5L15.5 9 20 16H4zM8 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z",
    profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6",
  };
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverVideoUrl, setCoverVideoUrl] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | "video" | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const avatarInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // new-link form
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState("custom");
  const [showAddForm, setShowAddForm] = useState(false);

  // cross-product discovery (Phase 9)
  const [hasCv, setHasCv] = useState(false);
  const [showCvAnnounce, setShowCvAnnounce] = useState(false);

  // public-page design settings
  const [wallpaper, setWallpaper] = useState("aurora");
  const [accent, setAccent] = useState<string>(ACCENTS[0]);
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>("glass");
  const [fontChoice, setFontChoice] = useState<string>("system");
  const [cursorStyle, setCursorStyle] = useState<string>("default");

  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);

    // Identity lives on `profiles`; this product's design settings live on
    // `link_page_settings` (1:1, created by trigger).
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "username, display_name, bio, avatar_url, link_page_settings(wallpaper_preset, accent_color, button_style, font_choice, cursor_style, cover_image_url, cover_video_url)"
      )
      .eq("id", user.id)
      .single();
    if (profile) {
      setUsername(profile.username);
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setAvatarUrl(profile.avatar_url ?? "");

      const design =
        (Array.isArray(profile.link_page_settings)
          ? profile.link_page_settings[0]
          : profile.link_page_settings) ?? {};
      setCoverUrl(design.cover_image_url ?? "");
      setCoverVideoUrl(design.cover_video_url ?? "");
      setWallpaper(getWallpaper(design.wallpaper_preset).id);
      setAccent(normalizeAccent(design.accent_color));
      setButtonStyle(normalizeButtonStyle(design.button_style));
      setFontChoice(design.font_choice ?? "system");
      setCursorStyle(design.cursor_style ?? "default");
    }

    // Which products does this account have, and should the one-time
    // portfolio announcement show?
    const { data: prods } = await supabase
      .from("user_products")
      .select("product")
      .eq("user_id", user.id);
    const cvOn = (prods ?? []).some((p) => p.product === "cv");
    setHasCv(cvOn);

    const { data: flag } = await supabase
      .from("profiles")
      .select("seen_cv_announcement")
      .eq("id", user.id)
      .single();
    setShowCvAnnounce(!cvOn && !flag?.seen_cv_announcement);

    const { data: rows } = await supabase
      .from("links")
      .select("*")
      .eq("user_id", user.id)
      .order("position");
    setLinks(rows ?? []);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ---- direct file upload to Supabase Storage ----
  async function handleUpload(kind: "avatar" | "cover", file: File) {
    if (!userId || !file) return;
    if (file.size > 8 * 1024 * 1024) {
      notify("Choose an image under 8 MB.");
      return;
    }
    setUploading(kind);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600" });

    if (error) {
      notify("Upload failed: " + error.message);
      setUploading(null);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // avatar_url is identity (profiles); cover_image_url is a design
    // setting (link_page_settings) — different tables now.
    if (kind === "avatar") {
      await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);
    } else {
      await supabase
        .from("link_page_settings")
        .upsert({ user_id: userId, cover_image_url: publicUrl });
    }

    if (kind === "avatar") setAvatarUrl(publicUrl);
    else setCoverUrl(publicUrl);
    setUploading(null);
    notify(kind === "avatar" ? "Profile photo updated" : "Background updated");
  }

  async function handleVideoUpload(file: File) {
    if (!userId || !file) return;
    if (!file.type.startsWith("video/")) {
      notify("Please choose a video file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      notify("Video must be under 25 MB. Try a shorter or lower-res clip.");
      return;
    }
    // Guard against long clips (heavy + poor UX as a loop).
    const durationOk = await new Promise<boolean>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => {
        URL.revokeObjectURL(v.src);
        resolve(v.duration <= 30);
      };
      v.onerror = () => resolve(true); // if we can't read it, let upload try
      v.src = URL.createObjectURL(file);
    });
    if (!durationOk) {
      notify("Keep the video under 30 seconds for a smooth looping background.");
      return;
    }

    setUploading("video");
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = `${userId}/cover-video-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", contentType: file.type });
    if (error) {
      notify("Upload failed: " + error.message);
      setUploading(null);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase
      .from("link_page_settings")
      .upsert({ user_id: userId, cover_video_url: data.publicUrl });
    setCoverVideoUrl(data.publicUrl);
    setUploading(null);
    notify("Live wallpaper set");
  }

  async function removeVideo() {
    if (!userId) return;
    await supabase
      .from("link_page_settings")
      .upsert({ user_id: userId, cover_video_url: null });
    setCoverVideoUrl("");
    notify("Live wallpaper removed");
  }

  async function removeImage(kind: "avatar" | "cover") {
    if (!userId) return;
    if (kind === "avatar") {
      await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);
    } else {
      await supabase
        .from("link_page_settings")
        .upsert({ user_id: userId, cover_image_url: null });
    }
    if (kind === "avatar") setAvatarUrl("");
    else setCoverUrl("");
    notify(kind === "avatar" ? "Profile photo removed" : "Background removed");
  }

  async function saveProfile() {
    if (!userId) return;
    const clean = username.toLowerCase().trim();
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      notify("Username must be 3–30 characters: a–z, 0–9, underscore.");
      return;
    }
    if (isReservedUsername(clean)) {
      notify("That username is reserved — please choose another.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ username: clean, display_name: displayName, bio })
      .eq("id", userId);
    if (error) {
      notify(
        error.code === "23505"
          ? "That username is taken — try another."
          : "Save failed: " + error.message
      );
    } else {
      setUsername(clean);
      notify("Profile saved");
    }
    setSaving(false);
  }

  async function addLink() {
    if (!userId || !newUrl) return;
    const title =
      newTitle ||
      (newPlatform !== "custom"
        ? newPlatform[0].toUpperCase() + newPlatform.slice(1)
        : "My link");
    const { data } = await supabase
      .from("links")
      .insert({
        user_id: userId,
        title,
        url: newUrl,
        platform: newPlatform,
        position: links.length,
      })
      .select()
      .single();
    if (data) {
      setLinks([...links, data]);
      notify("Link added");
      setShowAddForm(false);
    }
    setNewTitle("");
    setNewUrl("");
    setNewPlatform("custom");
  }

  async function deleteLink(id: string) {
    await supabase.from("links").delete().eq("id", id);
    setLinks(links.filter((l) => l.id !== id));
    notify("Link deleted");
  }

  async function toggleActive(id: string) {
    const target = links.find((l) => l.id === id);
    if (!target) return;
    const next = !target.is_active;
    // optimistic update; roll back if the write fails
    setLinks(links.map((l) => (l.id === id ? { ...l, is_active: next } : l)));
    const { error } = await supabase
      .from("links")
      .update({ is_active: next })
      .eq("id", id);
    if (error) {
      setLinks(links); // restore previous state
      notify("Couldn't update that link — try again.");
    }
  }

  // Design changes apply optimistically and save immediately, so the
  // live preview and the database never drift apart.
  async function saveDesign(patch: {
    wallpaper_preset?: string;
    accent_color?: string;
    button_style?: string;
    font_choice?: string;
    cursor_style?: string;
  }) {
    if (!userId) return;
    if (patch.wallpaper_preset !== undefined) setWallpaper(patch.wallpaper_preset);
    if (patch.accent_color !== undefined) setAccent(patch.accent_color);
    if (patch.button_style !== undefined)
      setButtonStyle(normalizeButtonStyle(patch.button_style));
    if (patch.font_choice !== undefined) setFontChoice(patch.font_choice);
    if (patch.cursor_style !== undefined) setCursorStyle(patch.cursor_style);
    const { error } = await supabase
      .from("link_page_settings")
      .upsert({ user_id: userId, ...patch });
    if (error) notify("Couldn't save design — try again.");
  }

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[idx], next[j]] = [next[j], next[idx]];
    setLinks(next);
    await Promise.all(
      next.map((l, i) =>
        supabase.from("links").update({ position: i }).eq("id", l.id)
      )
    );
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/${username}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      notify("Couldn't copy — long-press the link instead.");
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  // ---- derived bits for stats + preview ----
  const activeCount = links.filter((l) => l.is_active).length;
  const completeness = Math.round(
    (
      [
        Boolean(avatarUrl),
        Boolean(displayName.trim()),
        Boolean(bio.trim()),
        links.length > 0,
      ].filter(Boolean).length / 4
    ) * 100
  );
  const activeLinks = links.filter((l) => l.is_active);
  const pvSocials = activeLinks.filter((l) => SOCIAL.has(l.platform));
  const pvCards = activeLinks.filter((l) => !SOCIAL.has(l.platform));

  return (
    <div className="db">
      {/* ============ top bar ============ */}
      <header className="db-topbar">
        <BrandLink className="db-brand" />
        <div className="db-topbar-actions">
          <ProductSwitcher current="links" hasCv={hasCv} />
          <ThemeToggle />
          {username && (
            <button
              className={`db-urlpill ${copied ? "copied" : ""}`}
              onClick={copyUrl}
              title="Copy your public link"
            >
              <span className="db-urlpill-host">shongjog/</span>
              {username}
              <span className="db-urlpill-copy">{copied ? "Copied ✓" : "Copy"}</span>
            </button>
          )}
          {username && (
            <a className="btn ghost small" href={`/${username}`} target="_blank">
              View page
            </a>
          )}
          <button className="btn ghost small" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="db-subnav" aria-label="Dashboard sections">
        <a href="#sec-links">
          <SectionIcon kind="links" /> Links
        </a>
        <a href="#sec-design">
          <SectionIcon kind="design" /> Design
        </a>
        <a href="#sec-appearance">
          <SectionIcon kind="appearance" /> Appearance
        </a>
        <a href="#sec-profile">
          <SectionIcon kind="profile" /> Profile
        </a>
      </nav>

      <div className="db-layout">
        {/* ============ main column ============ */}
        <main className="db-main">
          {loaded && showCvAnnounce && userId && (
            <CvAnnounceBanner userId={userId} />
          )}
          {!loaded ? (
            <div className="db-skeleton" aria-label="Loading your dashboard">
              <div className="sk sk-hero" />
              <div className="sk sk-card" />
              <div className="sk sk-card" />
            </div>
          ) : (
          <>
          {/* ---- identity hero ---- */}
          <section className="db-hero">
            <div className="db-hero-avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" />
              ) : (
                <span>{(displayName || username || "?")[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="db-hero-meta">
              <h1>{displayName || username || "Your page"}</h1>
              <p className="db-hero-handle">@{username}</p>
              {bio && <p className="db-hero-bio">{bio}</p>}
            </div>
            <div className="db-stats">
              <div className="db-stat">
                <span className="db-stat-icon" aria-hidden="true">
                  <SectionIcon kind="links" />
                </span>
                <strong>{links.length}</strong>
                <span>links</span>
              </div>
              <div className="db-stat">
                <span className="db-stat-icon" aria-hidden="true">●</span>
                <strong>{activeCount}</strong>
                <span>live</span>
              </div>
              <div className="db-stat">
                <span className="db-stat-icon" aria-hidden="true">✦</span>
                <strong>{completeness}%</strong>
                <span>complete</span>
              </div>
            </div>
          </section>

          {completeness < 100 && loaded && (
            <p className="db-nudge">
              {!avatarUrl
                ? "Add a profile photo — pages with faces get more taps."
                : !bio.trim()
                ? "Write a short bio so visitors know it's you."
                : links.length === 0
                ? "Add your first link to bring your page to life."
                : "Almost there — fill in your display name."}
            </p>
          )}

          {/* ---- links ---- */}
          <section className="card db-card" id="sec-links">
            <div className="db-card-head db-card-head-row">
              <div>
                <p className="db-eyebrow">Links</p>
                <h2>Your links</h2>
              </div>
              <button
                className="btn small db-add-toggle"
                onClick={() => setShowAddForm((v) => !v)}
                aria-expanded={showAddForm}
              >
                {showAddForm ? "Cancel" : "+ Add link"}
              </button>
            </div>

            <div className={`db-addlink ${showAddForm ? "open" : ""}`}>
              <div className="db-addlink-grid">
                <div className="field">
                  <label htmlFor="pf">Platform</label>
                  <select
                    id="pf"
                    value={newPlatform}
                    onChange={(e) => setNewPlatform(e.target.value)}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>
                        {p === "custom" ? "Custom link" : p[0].toUpperCase() + p.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="url">
                    URL {newPlatform === "email" && "(or email address)"}
                  </label>
                  <input
                    id="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder={
                      newPlatform === "email"
                        ? "you@example.com"
                        : "https://instagram.com/yourhandle"
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="title">Title (optional)</label>
                  <input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="My Instagram"
                  />
                </div>
              </div>
              <button className="btn small" onClick={addLink} disabled={!newUrl}>
                Save link
              </button>
              <p className="hint db-addlink-hint">
                Social platforms show as icons under your name; custom links show
                as buttons.
              </p>
            </div>

            {loaded && links.length === 0 && (
              <div className="db-empty">
                <div className="db-empty-icon" aria-hidden="true">✦</div>
                <p>No links yet.</p>
                <p className="hint">
                  Your page is live at /{username || "…"} — add a link above and
                  it appears instantly.
                </p>
              </div>
            )}

            <div className="db-links">
              {links.map((l, i) => (
                <div
                  className={`db-link ${l.is_active ? "" : "off"}`}
                  key={l.id}
                >
                  <span className="db-link-badge">
                    <PlatformIcon platform={l.platform} size={18} />
                  </span>
                  <div className="db-link-meta">
                    <div className="db-link-title">{l.title}</div>
                    <div className="db-link-url">{l.url}</div>
                  </div>
                  <div className="db-link-actions">
                    <button
                      className="icon-btn"
                      aria-label="Move up"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      className="icon-btn"
                      aria-label="Move down"
                      disabled={i === links.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      className={`db-toggle ${l.is_active ? "on" : ""}`}
                      role="switch"
                      aria-checked={l.is_active}
                      aria-label={l.is_active ? "Hide this link" : "Show this link"}
                      onClick={() => toggleActive(l.id)}
                    >
                      <span className="db-toggle-thumb" />
                    </button>
                    <button
                      className="icon-btn danger"
                      aria-label="Delete link"
                      onClick={() => deleteLink(l.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ---- design ---- */}
          <section className="card db-card" id="sec-design">
            <div className="db-card-head">
              <p className="db-eyebrow">Design</p>
              <h2>Make it yours</h2>
            </div>

            <p className="db-design-label">Wallpaper</p>
            {WALLPAPER_CATEGORIES.map((cat) => (
              <div key={cat} className="db-wallgroup">
                <p className="db-wallcat">{cat}</p>
                <div className="db-swatches">
                  {WALLPAPERS.filter((w) => w.category === cat).map((w) => (
                    <button
                      key={w.id}
                      className={`db-swatch ${
                        wallpaper === w.id && !coverUrl ? "selected" : ""
                      }`}
                      title={w.label}
                      aria-label={`Wallpaper: ${w.label}`}
                      onClick={() => saveDesign({ wallpaper_preset: w.id })}
                      style={{ backgroundColor: w.color, backgroundImage: w.image }}
                    >
                      <span>{w.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {coverUrl && (
              <p className="hint db-design-hint">
                Your uploaded background photo is currently overriding the
                wallpaper — remove it in Appearance to use a preset.
              </p>
            )}

            <p className="db-design-label">Buttons</p>
            <div className="db-btnstyles">
              {(["glass", "solid", "outline"] as ButtonStyle[]).map((b) => (
                <button
                  key={b}
                  className={`db-btnstyle db-btnstyle-${b} ${
                    buttonStyle === b ? "selected" : ""
                  }`}
                  style={{ "--pg-accent": accent } as React.CSSProperties}
                  onClick={() => saveDesign({ button_style: b })}
                >
                  {b === "glass" ? "Glass" : b === "solid" ? "Solid" : "Outline"}
                </button>
              ))}
            </div>

            <p className="db-design-label">Accent color</p>
            <div className="db-accents">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  className={`db-accent ${accent === c ? "selected" : ""}`}
                  style={{ background: c }}
                  aria-label={`Accent color ${c}`}
                  onClick={() => saveDesign({ accent_color: c })}
                />
              ))}
            </div>

            <p className="db-design-label">Font</p>
            <div className="db-fonts">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  className={`db-font ${fontChoice === f.id ? "selected" : ""}`}
                  style={f.family ? { fontFamily: f.family } : undefined}
                  onClick={() => saveDesign({ font_choice: f.id })}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <p className="db-design-label">Cursor</p>
            <div className="db-fonts">
              {CURSORS.map((c) => (
                <button
                  key={c.id}
                  className={`db-font ${cursorStyle === c.id ? "selected" : ""}`}
                  style={{ cursor: getCursorCss(c.id) || "auto" }}
                  onClick={() => saveDesign({ cursor_style: c.id })}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="hint db-design-hint">
              Hover each option to preview it. Applies to your public page.
            </p>
          </section>

          {/* ---- appearance ---- */}
          <section className="card db-card" id="sec-appearance">
            <div className="db-card-head">
              <p className="db-eyebrow">Appearance</p>
              <h2>Photos</h2>
            </div>

            <div className="upload-row">
              <div className="upload-preview avatar-preview">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Profile" />
                ) : (
                  <span>{(displayName || username || "?")[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="upload-meta">
                <div className="db-upload-title">Profile photo</div>
                <div className="hint">Shown in a circle at the top of your page.</div>
                <div className="db-upload-actions">
                  <button
                    className="btn small"
                    onClick={() => avatarInput.current?.click()}
                    disabled={uploading === "avatar"}
                  >
                    {uploading === "avatar" ? "Uploading…" : "Upload photo"}
                  </button>
                  {avatarUrl && (
                    <button
                      className="btn danger small"
                      onClick={() => removeImage("avatar")}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={avatarInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("avatar", f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="upload-row db-upload-gap">
              <div className="upload-preview cover-preview">
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="Background" />
                ) : (
                  <span className="hint">Default theme</span>
                )}
              </div>
              <div className="upload-meta">
                <div className="db-upload-title">Background photo (optional)</div>
                <div className="hint">
                  Fills your whole page behind your links. Without one, your page
                  uses the built-in theme — which already looks great.
                </div>
                <div className="db-upload-actions">
                  <button
                    className="btn small"
                    onClick={() => coverInput.current?.click()}
                    disabled={uploading === "cover"}
                  >
                    {uploading === "cover" ? "Uploading…" : "Upload photo"}
                  </button>
                  {coverUrl && (
                    <button
                      className="btn danger small"
                      onClick={() => removeImage("cover")}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload("cover", f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="upload-row db-upload-gap">
              <div className="upload-preview cover-preview">
                {coverVideoUrl ? (
                  <video
                    src={coverVideoUrl}
                    muted
                    loop
                    autoPlay
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span className="hint">No video</span>
                )}
              </div>
              <div className="upload-meta">
                <div className="db-upload-title">Live wallpaper (optional)</div>
                <div className="hint">
                  A short looping video background — plays silently behind your
                  links. Takes priority over a background photo. Keep it under
                  25&nbsp;MB and 30&nbsp;seconds for best performance.
                </div>
                <div className="db-upload-actions">
                  <button
                    className="btn small"
                    onClick={() => videoInput.current?.click()}
                    disabled={uploading === "video"}
                  >
                    {uploading === "video" ? "Uploading…" : "Upload video"}
                  </button>
                  {coverVideoUrl && (
                    <button className="btn danger small" onClick={removeVideo}>
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={videoInput}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleVideoUpload(f);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </section>

          {/* ---- profile details ---- */}
          <section className="card db-card" id="sec-profile">
            <div className="db-card-head">
              <p className="db-eyebrow">Profile</p>
              <h2>Details</h2>
            </div>
            <div className="field">
              <label htmlFor="un">Username (your public URL)</label>
              <input
                id="un"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="yourname"
              />
              <span className="hint">Your page: /{username || "…"}</span>
            </div>
            <div className="field">
              <label htmlFor="dn">Display name</label>
              <input
                id="dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="field">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={2}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short line about you"
              />
            </div>
            <button className="btn small" onClick={saveProfile} disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </button>
          </section>
          </>
          )}
        </main>

        {/* ============ live preview ============ */}
        <aside className="db-preview" aria-label="Live preview of your page">
          <p className="db-eyebrow db-preview-label">Live preview</p>
          <div
            className="pv-phone"
            style={
              {
                "--pg-accent": accent,
                ...(coverVideoUrl
                  ? {}
                  : coverUrl
                  ? { backgroundImage: `url(${coverUrl})` }
                  : {
                      backgroundColor: getWallpaper(wallpaper).color,
                      backgroundImage: getWallpaper(wallpaper).image,
                    }),
              } as unknown as React.CSSProperties
            }
          >
            {coverVideoUrl && (
              <video
                className="pv-video"
                src={coverVideoUrl}
                muted
                loop
                autoPlay
                playsInline
                aria-hidden="true"
              />
            )}
            <div className="pv-scrim" />
            <div
              className="pv-body"
              style={
                getFontFamily(fontChoice)
                  ? { fontFamily: getFontFamily(fontChoice) }
                  : undefined
              }
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="pv-avatar" src={avatarUrl} alt="" />
              ) : (
                <div className="pv-avatar pv-avatar-placeholder">
                  {(displayName || username || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="pv-name">{displayName || username || "your_name"}</div>
              {bio && <div className="pv-bio">{bio}</div>}
              {pvSocials.length > 0 && (
                <div className="pv-socials">
                  {pvSocials.map((l) => (
                    <span key={l.id}>
                      <PlatformIcon platform={l.platform} size={14} />
                    </span>
                  ))}
                </div>
              )}
              <div className="pv-cards">
                {pvCards.map((l) => (
                  <div className={`pv-card pv-${buttonStyle}`} key={l.id}>
                    <PlatformIcon platform={l.platform} size={13} />
                    <span>{l.title}</span>
                  </div>
                ))}
                {activeLinks.length === 0 && (
                  <div className="pv-hintcard">Your links appear here</div>
                )}
              </div>
              <div className="pv-watermark">
                সংযোগ · <b>shongjog</b>/{username || "you"}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {toast && (
        <div className="db-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
