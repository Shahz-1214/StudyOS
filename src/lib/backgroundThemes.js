// StudyOS display themes. Every theme independently defines the full set of
// shared tokens, so no theme can produce unreadable text (e.g. white text on
// a pale background). All themes are dark and WCAG-coherent. The default is
// the dark premium StudyOS theme. Choice persists in localStorage.
//
// NOTE: ids from the old light-theme system (alabaster, slate, …) no longer
// exist; a stored old id safely falls back to the default theme.

const STORAGE_KEY = "studyos.bgTheme";

export const BACKGROUND_THEMES = [
  {
    id: "studyos-dark",
    label: "StudyOS Dark",
    swatch: "#0B0F0E",
    tokens: {
      background: "160 15% 5%",
      foreground: "140 12% 96%",
      card: "162 14% 8%",
      "card-foreground": "140 12% 96%",
      popover: "160 15% 11%",
      "popover-foreground": "140 12% 96%",
      secondary: "160 16% 15%",
      "secondary-foreground": "140 12% 96%",
      muted: "163 16% 11%",
      "muted-foreground": "160 6% 54%",
      border: "160 12% 18%",
      input: "160 14% 21%",
      elevated: "163 16% 11%",
      "elevated-high": "160 16% 15%",
      field: "163 16% 7%",
      primary: "155 64% 55%",
      "primary-foreground": "160 15% 5%",
      accent: "217 100% 65%",
      "accent-foreground": "160 15% 5%",
      ring: "155 64% 55%",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    swatch: "#0C0D0F",
    tokens: {
      background: "225 10% 5%",
      foreground: "220 12% 94%",
      card: "225 9% 9%",
      "card-foreground": "220 12% 94%",
      popover: "225 8% 13%",
      "popover-foreground": "220 12% 94%",
      secondary: "225 8% 17%",
      "secondary-foreground": "220 12% 94%",
      muted: "225 8% 13%",
      "muted-foreground": "220 5% 56%",
      border: "225 6% 17%",
      input: "225 7% 22%",
      elevated: "225 8% 13%",
      "elevated-high": "225 8% 17%",
      field: "225 10% 7%",
      primary: "155 64% 55%",
      "primary-foreground": "225 10% 5%",
      accent: "217 100% 65%",
      "accent-foreground": "225 10% 5%",
      ring: "155 64% 55%",
    },
  },
  {
    id: "midnight",
    label: "Midnight",
    swatch: "#0B0E14",
    tokens: {
      background: "225 26% 6%",
      foreground: "220 16% 95%",
      card: "226 24% 9%",
      "card-foreground": "220 16% 95%",
      popover: "226 22% 13%",
      "popover-foreground": "220 16% 95%",
      secondary: "226 22% 17%",
      "secondary-foreground": "220 16% 95%",
      muted: "226 23% 13%",
      "muted-foreground": "220 9% 58%",
      border: "226 18% 19%",
      input: "226 20% 24%",
      elevated: "226 23% 13%",
      "elevated-high": "226 22% 17%",
      field: "226 26% 7%",
      primary: "217 100% 65%",
      "primary-foreground": "225 26% 6%",
      accent: "155 64% 55%",
      "accent-foreground": "225 26% 6%",
      ring: "217 100% 65%",
    },
  },
];

export const DEFAULT_THEME = BACKGROUND_THEMES[0];

// Every token a theme must define — applyTheme sets all of them so a theme
// can never half-apply and create an inconsistent surface/text pairing.
const TOKEN_VARS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "border",
  "input",
  "elevated",
  "elevated-high",
  "field",
  "primary",
  "primary-foreground",
  "accent",
  "accent-foreground",
  "ring",
];

export function getStoredThemeId() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME.id; }
  catch { return DEFAULT_THEME.id; }
}

export function applyTheme(id) {
  const t = BACKGROUND_THEMES.find((x) => x.id === id) || DEFAULT_THEME;
  const root = document.documentElement;
  for (const key of TOKEN_VARS) {
    root.style.setProperty(`--${key}`, t.tokens[key]);
  }
  try { localStorage.setItem(STORAGE_KEY, t.id); } catch { /* ignore */ }
}

// Call once on app load so the chosen theme paints before first paint.
export function initTheme() {
  applyTheme(getStoredThemeId());
}