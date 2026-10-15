import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import PlatformIcon from "@/components/PlatformIcon";
import {
  getWallpaper,
  getFontFamily,
  getCursorCss,
  normalizeAccent,
  normalizeButtonStyle,
} from "@/lib/design";

// Open Graph / Twitter cards for shared link pages. Retroactive win for
// the existing Links product — same technique as the CV page.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, avatar_url")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) return { title: "Page not found · সংযোগ" };

  const name = profile.display_name ?? profile.username;
  const description = profile.bio?.slice(0, 160) || `All of ${name}'s links, one page.`;

  return {
    title: `${name} · সংযোগ`,
    description,
    openGraph: {
      title: `${name} · সংযোগ`,
      description,
      type: "profile",
      url: `/${profile.username}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : undefined,
    },
    twitter: {
      card: profile.avatar_url ? "summary_large_image" : "summary",
      title: `${name} · সংযোগ`,
      description,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

// Social platforms render as a compact icon row under the name;
// everything else renders as full-width link cards.
const SOCIAL = new Set([
  "facebook",
  "instagram",
  "whatsapp",
  "discord",
  "x",
  "linkedin",
  "email",
]);

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  // `profiles` holds identity; the Links product's design settings live in
  // `link_page_settings` (one row per user, created by trigger on signup).
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, link_page_settings(wallpaper_preset, accent_color, button_style, font_choice, cursor_style, cover_image_url, cover_video_url)"
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profile) notFound();

  // The embed returns an object (1:1 relation) — normalise and default it so
  // a missing settings row can never break a public page.
  const design = (Array.isArray(profile.link_page_settings)
    ? profile.link_page_settings[0]
    : profile.link_page_settings) ?? {};

  const { data: links } = await supabase
    .from("links")
    .select("id, title, url, platform")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .order("position");

  const socials = (links ?? []).filter((l) => SOCIAL.has(l.platform));
  const cards = (links ?? []).filter((l) => !SOCIAL.has(l.platform));

  // Owner's design settings; every value has a safe default.
  const wallpaper = getWallpaper(design.wallpaper_preset);
  const accent = normalizeAccent(design.accent_color);
  const buttonStyle = normalizeButtonStyle(design.button_style);
  const fontFamily = getFontFamily(design.font_choice);

  const cursorCss = getCursorCss(design.cursor_style);
  const hasVideo = Boolean(design.cover_video_url);
  const wrapStyle = {
    "--pg-accent": accent,
    ...(cursorCss ? { cursor: cursorCss } : {}),
    // Priority: live video > uploaded photo > preset gradient.
    // When a video is present it's rendered as an element below, so no
    // background-image is set here.
    ...(hasVideo
      ? {}
      : design.cover_image_url
      ? { backgroundImage: `url(${design.cover_image_url})` }
      : { backgroundColor: wallpaper.color, backgroundImage: wallpaper.image }),
  };

  return (
    <div
      className={`profile-wrap ${hasVideo ? "has-video" : ""}`}
      style={wrapStyle as unknown as CSSProperties}
    >
      {hasVideo && (
        <video
          className="profile-video"
          src={design.cover_video_url!}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      )}
      <main
        className="profile"
        style={fontFamily ? { fontFamily } : undefined}
      >
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="avatar" src={profile.avatar_url} alt="" />
        ) : (
          <div className="avatar placeholder">
            {(profile.display_name ?? profile.username)[0].toUpperCase()}
          </div>
        )}

        <h1>{profile.display_name ?? profile.username}</h1>
        {profile.bio && <p className="bio">{profile.bio}</p>}

        {socials.length > 0 && (
          <div className="socials">
            {socials.map((l) => (
              <a
                key={l.id}
                href={l.platform === "email" ? `mailto:${l.url.replace(/^mailto:/, "")}` : l.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={l.title}
              >
                <PlatformIcon platform={l.platform} size={20} />
              </a>
            ))}
          </div>
        )}

        <div className="link-list">
          {cards.map((l) => (
            <a
              key={l.id}
              className={`link-card lk-${buttonStyle}`}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="platform-badge">
                <PlatformIcon platform={l.platform} size={18} />
              </span>
              <div>
                <div className="title">{l.title}</div>
                <div className="url">{l.url}</div>
              </div>
            </a>
          ))}
        </div>

        <p className="watermark">
          <Link href="/">
            made with <b>সংযোগ</b>
          </Link>
        </p>
      </main>
    </div>
  );
}
