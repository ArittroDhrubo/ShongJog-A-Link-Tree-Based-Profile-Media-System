// Design presets for public pages. Shared by the dashboard picker,
// the live preview, and the public [username] page so they can never
// drift out of sync.

export type ButtonStyle = "glass" | "solid" | "outline";

export const WALLPAPER_CATEGORIES = ["Vivid", "Space", "Nature", "Minimal"] as const;

export const WALLPAPERS = [
  // ---- Vivid ----
  {
    id: "aurora", label: "Aurora", category: "Vivid", color: "#070f13",
    image: "radial-gradient(ellipse 70% 50% at 15% -5%, rgba(64,145,155,0.38), transparent 60%), radial-gradient(ellipse 60% 45% at 90% 10%, rgba(240,168,60,0.20), transparent 55%), radial-gradient(ellipse 65% 55% at 50% 110%, rgba(94,74,227,0.25), transparent 60%), linear-gradient(180deg, #0b1a20 0%, #070f13 100%)",
  },
  {
    id: "sunset", label: "Sunset", category: "Vivid", color: "#170a10",
    image: "radial-gradient(ellipse 75% 55% at 20% -10%, rgba(240,120,60,0.42), transparent 60%), radial-gradient(ellipse 60% 50% at 90% 15%, rgba(226,64,110,0.30), transparent 55%), radial-gradient(ellipse 70% 60% at 50% 115%, rgba(120,40,90,0.35), transparent 60%), linear-gradient(180deg, #1d0c12 0%, #170a10 100%)",
  },
  {
    id: "plum", label: "Plum", category: "Vivid", color: "#120a18",
    image: "radial-gradient(ellipse 70% 50% at 15% -5%, rgba(150,70,200,0.36), transparent 60%), radial-gradient(ellipse 60% 45% at 90% 10%, rgba(226,64,150,0.24), transparent 55%), radial-gradient(ellipse 68% 58% at 50% 112%, rgba(80,40,140,0.40), transparent 60%), linear-gradient(180deg, #170d20 0%, #120a18 100%)",
  },
  {
    id: "candy", label: "Candy", category: "Vivid", color: "#140b16",
    image: "radial-gradient(ellipse 65% 50% at 12% 0%, rgba(236,88,160,0.38), transparent 58%), radial-gradient(ellipse 60% 48% at 90% 20%, rgba(80,140,255,0.30), transparent 55%), radial-gradient(ellipse 70% 55% at 50% 115%, rgba(160,60,200,0.28), transparent 60%), linear-gradient(180deg, #190e1d 0%, #140b16 100%)",
  },
  {
    id: "ember", label: "Ember", category: "Vivid", color: "#150a08",
    image: "radial-gradient(ellipse 70% 55% at 50% -12%, rgba(255,110,50,0.40), transparent 58%), radial-gradient(ellipse 55% 45% at 10% 90%, rgba(220,50,60,0.28), transparent 55%), radial-gradient(ellipse 60% 50% at 95% 80%, rgba(255,170,60,0.16), transparent 55%), linear-gradient(180deg, #1c0d09 0%, #150a08 100%)",
  },
  // ---- Space ----
  {
    id: "nebula", label: "Nebula", category: "Space", color: "#0a0714",
    image: "radial-gradient(ellipse 60% 45% at 25% 15%, rgba(120,60,220,0.40), transparent 58%), radial-gradient(ellipse 55% 42% at 80% 55%, rgba(60,140,240,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 55% 95%, rgba(220,60,160,0.22), transparent 55%), radial-gradient(1.5px 1.5px at 20% 30%, rgba(255,255,255,0.9), transparent 100%), radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.8), transparent 100%), radial-gradient(1.5px 1.5px at 85% 75%, rgba(255,255,255,0.7), transparent 100%), radial-gradient(1px 1px at 40% 70%, rgba(255,255,255,0.75), transparent 100%), linear-gradient(180deg, #0d0a1c 0%, #0a0714 100%)",
  },
  {
    id: "starfield", label: "Starfield", category: "Space", color: "#05070d",
    image: "radial-gradient(1.6px 1.6px at 12% 22%, rgba(255,255,255,0.95), transparent 100%), radial-gradient(1px 1px at 32% 8%, rgba(255,255,255,0.7), transparent 100%), radial-gradient(1.4px 1.4px at 55% 30%, rgba(255,255,255,0.85), transparent 100%), radial-gradient(1px 1px at 76% 14%, rgba(255,255,255,0.7), transparent 100%), radial-gradient(1.7px 1.7px at 90% 42%, rgba(255,255,255,0.9), transparent 100%), radial-gradient(1px 1px at 18% 58%, rgba(255,255,255,0.65), transparent 100%), radial-gradient(1.3px 1.3px at 44% 74%, rgba(255,255,255,0.8), transparent 100%), radial-gradient(1px 1px at 66% 60%, rgba(255,255,255,0.6), transparent 100%), radial-gradient(1.5px 1.5px at 84% 86%, rgba(255,255,255,0.85), transparent 100%), radial-gradient(1px 1px at 8% 88%, rgba(255,255,255,0.6), transparent 100%), radial-gradient(ellipse 80% 60% at 50% 110%, rgba(40,60,120,0.25), transparent 60%), linear-gradient(180deg, #070a12 0%, #05070d 100%)",
  },
  {
    id: "eclipse", label: "Eclipse", category: "Space", color: "#090909",
    image: "radial-gradient(circle 130px at 50% 32%, transparent 62%, rgba(255,180,80,0.55) 64%, rgba(255,120,40,0.22) 72%, transparent 82%), radial-gradient(ellipse 70% 55% at 50% 115%, rgba(60,40,20,0.35), transparent 60%), linear-gradient(180deg, #0d0c0a 0%, #090909 100%)",
  },
  // ---- Nature ----
  {
    id: "forest", label: "Forest", category: "Nature", color: "#08130d",
    image: "radial-gradient(ellipse 70% 50% at 12% -5%, rgba(46,140,90,0.38), transparent 60%), radial-gradient(ellipse 55% 45% at 92% 8%, rgba(216,244,98,0.16), transparent 55%), radial-gradient(ellipse 70% 55% at 50% 112%, rgba(20,82,63,0.45), transparent 62%), linear-gradient(180deg, #0b1a12 0%, #08130d 100%)",
  },
  {
    id: "ocean", label: "Ocean", category: "Nature", color: "#060e18",
    image: "radial-gradient(ellipse 75% 55% at 18% -8%, rgba(56,120,200,0.40), transparent 60%), radial-gradient(ellipse 60% 45% at 88% 12%, rgba(64,190,200,0.24), transparent 55%), radial-gradient(ellipse 70% 60% at 50% 115%, rgba(30,60,130,0.38), transparent 62%), linear-gradient(180deg, #081524 0%, #060e18 100%)",
  },
  {
    id: "dusk", label: "Dusk Sky", category: "Nature", color: "#10101c",
    image: "linear-gradient(180deg, rgba(30,34,70,0.9) 0%, rgba(90,60,110,0.55) 42%, rgba(220,120,90,0.35) 72%, rgba(240,170,90,0.25) 88%, rgba(20,16,28,0.9) 100%), linear-gradient(180deg, #141428 0%, #10101c 100%)",
  },
  {
    id: "deepsea", label: "Deep Sea", category: "Nature", color: "#03111a",
    image: "radial-gradient(ellipse 90% 55% at 50% -15%, rgba(30,120,150,0.35), transparent 60%), radial-gradient(1.4px 1.4px at 30% 40%, rgba(180,240,255,0.5), transparent 100%), radial-gradient(1px 1px at 60% 65%, rgba(180,240,255,0.4), transparent 100%), radial-gradient(1.2px 1.2px at 80% 30%, rgba(180,240,255,0.45), transparent 100%), linear-gradient(180deg, #06202c 0%, #03111a 100%)",
  },
  // ---- Minimal ----
  {
    id: "mono", label: "Mono", category: "Minimal", color: "#0c0c0e",
    image: "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(255,255,255,0.09), transparent 60%), radial-gradient(ellipse 70% 60% at 50% 115%, rgba(255,255,255,0.05), transparent 60%), linear-gradient(180deg, #121214 0%, #0c0c0e 100%)",
  },
  {
    id: "slate", label: "Slate", category: "Minimal", color: "#11151a",
    image: "linear-gradient(160deg, #1b222b 0%, #11151a 55%, #0d1015 100%)",
  },
  {
    id: "carbon", label: "Carbon", category: "Minimal", color: "#0a0a0b",
    image: "repeating-linear-gradient(45deg, rgba(255,255,255,0.028) 0 2px, transparent 2px 8px), linear-gradient(180deg, #101012 0%, #0a0a0b 100%)",
  },
  {
    id: "fog", label: "Fog", category: "Minimal", color: "#26292c",
    image: "radial-gradient(ellipse 85% 60% at 50% -15%, rgba(255,255,255,0.16), transparent 60%), linear-gradient(180deg, #33373b 0%, #26292c 100%)",
  },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]["id"];

export const ACCENTS = [
  "#f0a83c", // marigold (brand default)
  "#d8f462", // lime
  "#7bd4c2", // teal
  "#6aa5ff", // sky
  "#e46a5e", // coral
  "#b465da", // violet
  "#f2f2f2", // ivory
] as const;

export const FONTS = [
  { id: "system", label: "Classic", family: "" },
  { id: "poppins", label: "Poppins", family: "'Poppins', sans-serif" },
  { id: "playfair", label: "Playfair", family: "'Playfair Display', serif" },
  { id: "space", label: "Grotesk", family: "'Space Grotesk', sans-serif" },
  { id: "caveat", label: "Caveat", family: "'Caveat', cursive" },
] as const;

export type FontId = (typeof FONTS)[number]["id"];

// One-click bundles of the individual settings.
export const THEMES = [
  { id: "midnight", label: "Midnight", wallpaper: "aurora", accent: "#f0a83c", button: "glass" as ButtonStyle, font: "system" as FontId },
  { id: "golden", label: "Golden Hour", wallpaper: "sunset", accent: "#f0a83c", button: "solid" as ButtonStyle, font: "poppins" as FontId },
  { id: "grove", label: "Grove", wallpaper: "forest", accent: "#d8f462", button: "outline" as ButtonStyle, font: "space" as FontId },
  { id: "tide", label: "Tide", wallpaper: "ocean", accent: "#7bd4c2", button: "glass" as ButtonStyle, font: "poppins" as FontId },
  { id: "velvet", label: "Velvet", wallpaper: "plum", accent: "#b465da", button: "solid" as ButtonStyle, font: "playfair" as FontId },
  { id: "paper", label: "Ink", wallpaper: "mono", accent: "#f2f2f2", button: "outline" as ButtonStyle, font: "space" as FontId },
] as const;

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Space+Grotesk:wght@400;600;700&family=Caveat:wght@600;700&display=swap";

export function getWallpaper(id: string | null | undefined) {
  return WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];
}

export function getFontFamily(id: string | null | undefined) {
  return FONTS.find((f) => f.id === id)?.family ?? "";
}

export function normalizeButtonStyle(v: string | null | undefined): ButtonStyle {
  return v === "solid" || v === "outline" ? v : "glass";
}

export function normalizeAccent(v: string | null | undefined): string {
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v : ACCENTS[0];
}

export const CURSORS = [
  { id: "default", label: "Default", css: "" },
  {
    id: "dot",
    label: "Dot",
    css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='5' fill='white' stroke='black' stroke-width='1.5'/%3E%3C/svg%3E") 10 10, auto`,
  },
  {
    id: "ring",
    label: "Ring",
    css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='22' height='22'%3E%3Ccircle cx='11' cy='11' r='7' fill='none' stroke='white' stroke-width='2'/%3E%3Ccircle cx='11' cy='11' r='8.5' fill='none' stroke='black' stroke-width='1' opacity='0.5'/%3E%3C/svg%3E") 11 11, auto`,
  },
  { id: "cross", label: "Crosshair", css: "crosshair" },
] as const;

export function getCursorCss(id: string | null | undefined): string {
  return CURSORS.find((c) => c.id === id)?.css ?? "";
}
