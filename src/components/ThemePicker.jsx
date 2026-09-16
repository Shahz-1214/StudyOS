import { useEffect, useState } from "react";
import { BACKGROUND_THEMES, getStoredThemeId, applyTheme } from "@/lib/backgroundThemes";
import { Check } from "lucide-react";

export default function ThemePicker() {
  const [active, setActive] = useState(getStoredThemeId());

  useEffect(() => {
    applyTheme(active);
  }, [active]);

  return (
    <div className="flex flex-wrap gap-2.5">
      {BACKGROUND_THEMES.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            title={t.label}
            aria-label={t.label}
            aria-pressed={isActive}
            className="relative w-9 h-9 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: t.swatch,
              borderColor: isActive ? "hsl(var(--primary))" : "hsl(var(--border))",
            }}
          >
            {isActive && (
              <Check
                className="absolute inset-0 m-auto w-4 h-4"
                style={{ color: t.id === "slate" || t.id === "sand" ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}