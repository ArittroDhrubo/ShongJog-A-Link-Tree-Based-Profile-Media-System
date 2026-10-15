// Shared contract for the CV product. The dashboard editors and the
// public page both build against these, so the two can't drift apart.

export type SectionType =
  | "about"
  | "experience"
  | "education"
  | "projects"
  | "skills"
  | "certifications"
  | "contact";

export type CvSection = {
  id: string;
  type: SectionType;
  position: number;
  visible: boolean;
  custom_title: string | null;
};

export type CvItem = {
  id: string;
  section_id: string;
  data: Record<string, unknown>;
  position: number;
  visible: boolean;
};

// ---- item shapes per section type ----
// Stored in cv_items.data (jsonb). The editors enforce these; the DB
// stays flexible so new fields don't need a migration.

export type ExperienceData = {
  role: string;
  company: string;
  location?: string;
  start_date?: string; // "2023-04"
  end_date?: string; // "" when current
  current?: boolean;
  description?: string;
  logo_url?: string;
};

export type ProjectData = {
  title: string;
  description?: string;
  cover_url?: string;
  tags?: string[];
  demo_url?: string;
  repo_url?: string;
};

export type EducationData = {
  institution: string;
  degree?: string;
  field?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  gpa?: string;
  description?: string;
};

export type SkillData = {
  name: string;
  level?: 1 | 2 | 3 | 4 | 5;
  category?: string;
};

export type CertificationData = {
  title: string;
  issuer?: string;
  date?: string;
  credential_url?: string;
  credential_id?: string;
};

export type ContactData = {
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
};

// Canonical section order for a full CV.
export const ALL_SECTIONS: SectionType[] = [
  "about", "experience", "projects", "skills",
  "education", "certifications", "contact",
];

// ---- section metadata ----

export const SECTION_META: Record<
  SectionType,
  { label: string; defaultTitle: string; description: string }
> = {
  about: {
    label: "About",
    defaultTitle: "About",
    description: "Your photo, tagline, and a short introduction.",
  },
  experience: {
    label: "Experience",
    defaultTitle: "Experience",
    description: "Roles you've held, most recent first.",
  },
  projects: {
    label: "Projects",
    defaultTitle: "Projects",
    description: "Work you want people to actually look at.",
  },
  skills: {
    label: "Skills",
    defaultTitle: "Skills",
    description: "What you're good at.",
  },
  education: {
    label: "Education",
    defaultTitle: "Education",
    description: "Degrees, courses, and academic work.",
  },
  certifications: {
    label: "Certifications",
    defaultTitle: "Certifications",
    description: "Credentials worth verifying.",
  },
  contact: {
    label: "Contact",
    defaultTitle: "Contact",
    description: "How people reach you.",
  },
};

// Sections created automatically for a new CV — the three that make a
// portfolio feel real immediately. The rest are added in Phase 5.
export const DEFAULT_SECTIONS: SectionType[] = [
  "about",
  "experience",
  "projects",
];

// ---- CV design presets ----
// Same engine as the Links product, but professional-leaning defaults:
// higher contrast, more restrained than the link page's playful gradients.

export const CV_WALLPAPERS = [
  {
    id: "slate",
    label: "Slate",
    color: "#11151a",
    image: "linear-gradient(160deg, #1b222b 0%, #11151a 55%, #0d1015 100%)",
  },
  {
    id: "ivory",
    label: "Ivory",
    color: "#f5f1e6",
    image:
      "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(215,143,30,0.08), transparent 60%), linear-gradient(180deg, #faf7ef 0%, #f5f1e6 100%)",
  },
  {
    id: "graphite",
    label: "Graphite",
    color: "#0c0c0e",
    image:
      "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,255,255,0.07), transparent 60%), linear-gradient(180deg, #121214 0%, #0c0c0e 100%)",
  },
  {
    id: "deepteal",
    label: "Deep Teal",
    color: "#08171b",
    image:
      "radial-gradient(ellipse 70% 50% at 15% -5%, rgba(64,145,155,0.22), transparent 60%), linear-gradient(180deg, #0b1f26 0%, #08171b 100%)",
  },
] as const;

export const CV_ACCENTS = [
  "#f0a83c", // marigold (brand)
  "#4a90d9", // professional blue
  "#2f9e75", // green
  "#b4543a", // rust
  "#6b5bd2", // indigo
  "#2b3a42", // charcoal
] as const;

export const CV_FONTS = [
  { id: "system", label: "Classic", family: "" },
  { id: "poppins", label: "Poppins", family: "'Poppins', sans-serif" },
  { id: "playfair", label: "Playfair", family: "'Playfair Display', serif" },
  { id: "space", label: "Grotesk", family: "'Space Grotesk', sans-serif" },
] as const;

export function getCvWallpaper(id: string | null | undefined) {
  return CV_WALLPAPERS.find((w) => w.id === id) ?? CV_WALLPAPERS[0];
}

export function getCvFontFamily(id: string | null | undefined) {
  return CV_FONTS.find((f) => f.id === id)?.family ?? "";
}

export function normalizeCvAccent(v: string | null | undefined): string {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : CV_ACCENTS[0];
}

// Formats "2023-04" -> "Apr 2023"; blank/invalid input returns "".
export function formatMonth(value?: string): string {
  if (!value) return "";
  const [y, m] = value.split("-");
  const year = Number(y);
  const month = Number(m);
  if (!year || !month || month < 1 || month > 12) return value;
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[month - 1]} ${year}`;
}

export function formatDateRange(
  start?: string,
  end?: string,
  current?: boolean
): string {
  const s = formatMonth(start);
  const e = current ? "Present" : formatMonth(end);
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} — ${e}`;
}
