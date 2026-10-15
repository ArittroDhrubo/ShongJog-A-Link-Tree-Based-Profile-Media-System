// ============================================================
// PHASE A — CV template system
// ============================================================
// A template is a *composed* design system: type scale, colour,
// spacing, hero layout and motion chosen together. This is the
// difference between "picked a nice font and a nice colour" and
// "looks designed" — a generator can't rely on users assembling
// good combinations from parts, so we ship whole systems.
//
// Content is template-agnostic: switching templates never touches
// a user's data, only how it's presented.
// ============================================================

export type HeroLayout = "centered" | "asymmetric" | "editorial";
export type MotionStyle = "calm" | "crisp" | "none";

export type CvTemplate = {
  id: string;
  label: string;
  blurb: string;
  /** Sets `color-scheme` and picks light/dark defaults on the public page. */
  scheme: "dark" | "light";
  heroLayout: HeroLayout;
  motion: MotionStyle;
  /** Google Fonts family names used by this template (loaded in layout.tsx). */
  fonts: { display: string; body: string };
  /** Modular type scale — multiplier per step from the body size. */
  scaleRatio: number;
  /** CSS custom properties applied to the page root. */
  tokens: {
    bg: string;
    bgImage: string;
    text: string;
    muted: string;
    line: string;
    card: string;
    accent: string;
    /** Text colour that sits on top of the accent (buttons). */
    accentInk: string;
  };
};

export const CV_TEMPLATES: CvTemplate[] = [
  {
    id: "aurora",
    label: "Aurora",
    blurb: "The signature look — deep slate, marigold accents, calm motion.",
    scheme: "dark",
    heroLayout: "centered",
    motion: "calm",
    fonts: { display: "Poppins", body: "Poppins" },
    scaleRatio: 1.25,
    tokens: {
      bg: "#11151a",
      bgImage:
        "linear-gradient(160deg, #1b222b 0%, #11151a 55%, #0d1015 100%)",
      text: "#eef2f0",
      muted: "rgba(238,242,240,0.66)",
      line: "rgba(255,255,255,0.14)",
      card: "rgba(255,255,255,0.045)",
      accent: "#f0a83c",
      accentInk: "#16130a",
    },
  },
  {
    id: "monolith",
    label: "Monolith",
    blurb: "Bold and technical. Near-black, high contrast, crisp motion.",
    scheme: "dark",
    heroLayout: "asymmetric",
    motion: "crisp",
    fonts: { display: "Space Grotesk", body: "Space Grotesk" },
    scaleRatio: 1.333,
    tokens: {
      bg: "#08090b",
      bgImage:
        "radial-gradient(ellipse 90% 60% at 50% -20%, rgba(120,90,240,0.14), transparent 60%), linear-gradient(180deg, #0d0f13 0%, #08090b 100%)",
      text: "#f4f6f8",
      muted: "rgba(244,246,248,0.6)",
      line: "rgba(255,255,255,0.12)",
      card: "rgba(255,255,255,0.04)",
      accent: "#8b7bff",
      accentInk: "#0a0812",
    },
  },
  {
    id: "manuscript",
    label: "Manuscript",
    blurb: "Editorial and restrained. Warm paper, serif display, minimal motion.",
    scheme: "light",
    heroLayout: "editorial",
    motion: "calm",
    fonts: { display: "Playfair Display", body: "Poppins" },
    scaleRatio: 1.25,
    tokens: {
      bg: "#f7f4ec",
      bgImage:
        "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(180,84,58,0.06), transparent 60%), linear-gradient(180deg, #fbf9f4 0%, #f7f4ec 100%)",
      text: "#1e2422",
      muted: "rgba(30,36,34,0.62)",
      line: "rgba(30,36,34,0.16)",
      card: "rgba(30,36,34,0.035)",
      accent: "#b4543a",
      accentInk: "#fff8f4",
    },
  },
  {
    id: "meridian",
    label: "Meridian",
    blurb: "Clean and corporate. Cool white, professional blue, quiet motion.",
    scheme: "light",
    heroLayout: "asymmetric",
    motion: "calm",
    fonts: { display: "Poppins", body: "Poppins" },
    scaleRatio: 1.2,
    tokens: {
      bg: "#f4f6f8",
      bgImage:
        "radial-gradient(ellipse 80% 55% at 50% -12%, rgba(74,144,217,0.10), transparent 60%), linear-gradient(180deg, #fafbfc 0%, #f4f6f8 100%)",
      text: "#16202a",
      muted: "rgba(22,32,42,0.6)",
      line: "rgba(22,32,42,0.14)",
      card: "rgba(22,32,42,0.035)",
      accent: "#2f6fd0",
      accentInk: "#ffffff",
    },
  },
];

export const DEFAULT_TEMPLATE_ID = "aurora";

export function getTemplate(id: string | null | undefined): CvTemplate {
  return (
    CV_TEMPLATES.find((t) => t.id === id) ??
    CV_TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
  );
}

// Users may still override the template's accent — content-neutral, and
// the one customisation that reliably survives contact with taste.
export function resolveAccent(
  template: CvTemplate,
  override: string | null | undefined
): string {
  return override && /^#[0-9a-fA-F]{6}$/.test(override)
    ? override
    : template.tokens.accent;
}

/**
 * The template's tokens as CSS custom properties for the page root.
 * Every public CV page and the dashboard preview read from these — one
 * source of truth, so a template change can never half-apply.
 */
export function templateVars(
  template: CvTemplate,
  accentOverride?: string | null
): Record<string, string> {
  const accent = resolveAccent(template, accentOverride);
  const t = template.tokens;
  return {
    "--cvt-bg": t.bg,
    "--cvt-bg-image": t.bgImage,
    "--cvt-text": t.text,
    "--cvt-muted": t.muted,
    "--cvt-line": t.line,
    "--cvt-card": t.card,
    "--cvt-accent": accent,
    "--cvt-accent-ink": t.accentInk,
    "--cvt-display": `'${template.fonts.display}', ${
      template.fonts.display === "Playfair Display" ? "serif" : "sans-serif"
    }`,
    "--cvt-body": `'${template.fonts.body}', sans-serif`,
    // Modular type scale, derived rather than hand-written per size.
    "--cvt-step-0": "1rem",
    "--cvt-step-1": `${template.scaleRatio ** 1}rem`,
    "--cvt-step-2": `${template.scaleRatio ** 2}rem`,
    "--cvt-step-3": `${template.scaleRatio ** 3}rem`,
    "--cvt-step-4": `${template.scaleRatio ** 4}rem`,
    "--cvt-step-5": `${template.scaleRatio ** 5}rem`,
  };
}

/** Accents offered as overrides — curated, never a free-form picker. */
export const CV_ACCENT_OVERRIDES = [
  "#f0a83c",
  "#8b7bff",
  "#2f6fd0",
  "#2f9e75",
  "#b4543a",
  "#d0417e",
] as const;

/** URL-safe slug for project detail routes (Phase B/E). */
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}
