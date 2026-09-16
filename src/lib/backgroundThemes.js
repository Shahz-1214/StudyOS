// App background theme palette. Each theme overrides the --background and
// --card CSS tokens (HSL channel strings) while keeping the slate ink + blue
// accent. Choice persists in localStorage and is re-applied on load.

export const BACKGROUND_THEMES = [
  { id: "alabaster", label: "Alabaster",  bg: "40 27% 97%",  card: "210 40% 96%", swatch: "#FAF9F6" },
  { id: "slate",     label: "Slate",      bg: "215 28% 93%", card: "214 32% 90%", swatch: "#E2E8F0" },
  { id: "ivory",     label: "Ivory",      bg: "55 60% 97%",  card: "48 53% 95%",  swatch: "#FBF9F0" },
  { id: "mint",      label: "Mint",       bg: "140 38% 96%", card: "150 30% 93%", swatch: "#ECFDF5" },
  { id: "sky",       label: "Sky",        bg: "205 70% 97%", card: "210 55% 94%", swatch: "#EFF8FF" },
  { id: "lavender",  label: "Lavender",   bg: "270 45% 97%", card: "260 38% 95%", swatch: "#F5F3FF" },
  { id: "rose",      label: "Rose",       bg: "350 55% 97%", card: "340 45% 95%", swatch: "#FFF1F2" },
  { id: "peach",     label: "Peach",      bg: "25 70% 97%",  card: "20 60% 95%",  swatch: "#FFF4ED" },
  { id: "sand",      label: "Sand",       bg: "40 55% 95%",  card: "36 45% 92%",  swatch: "#FAF3E0" },
  { id: "sage",      label: "Sage",       bg: "100 25% 95%", card: "110 20% 92%", swatch: "#F0F4EC" },
];

const STORAGE_KEY = "studyos.bgTheme";
export const DEFAULT_THEME = BACKGROUND_THEMES[0];

export function getStoredThemeId() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME.id; }
  catch { return DEFAULT_THEME.id; }
}

export function applyTheme(id) {
  const t = BACKGROUND_THEMES.find((x) => x.id === id) || DEFAULT_THEME;
  const root = document.documentElement;
  root.style.setProperty("--background", t.bg);
  root.style.setProperty("--card", t.card);
  try { localStorage.setItem(STORAGE_KEY, t.id); } catch { /* ignore */ }
}

// Call once on app load so the chosen background paints before first paint.
export function initTheme() {
  applyTheme(getStoredThemeId());
}