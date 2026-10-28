import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";

import { springPress } from "@/lib/motion";
import { cn } from "@/lib/utils";

const ThemeContext = createContext(null);
const STORAGE_KEY = "sm_theme";
const ORDER = ["light", "dark", "system"];

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

function applyTheme(theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return ORDER.includes(stored) ? stored : "system";
    } catch {
      return "system";
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
    }
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(ORDER.includes(next) ? next : "system");
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}

const ICONS = { light: Sun, dark: Moon, system: Monitor };
const LABELS = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle({ className, showLabels = false, size = "sm" }) {
  const { theme, setTheme } = useTheme();
  const reduced = useReducedMotion();
  const pillId = useId();
  const segment =
    size === "sm"
      ? "h-8 min-w-8 max-md:h-11 max-md:min-w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-11"
      : "h-11 min-w-11";

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-control border-2 border-control bg-surface p-0.5 shadow-hs-sm",
        className
      )}
    >
      {ORDER.map((option) => {
        const Icon = ICONS[option];
        const selected = theme === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            aria-label={`${LABELS[option]} theme`}
            title={`${LABELS[option]} theme`}
            onClick={() => setTheme(option)}
            className={cn(
              "relative inline-flex items-center justify-center gap-1.5 rounded-[6px] px-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150",
              segment,
              selected ? "text-bone dark:text-ink" : "text-muted-foreground hover:bg-surface-sunk hover:text-foreground"
            )}
          >
            {selected && (
              <motion.span
                layoutId={reduced ? undefined : `theme-pill-${pillId}`}
                transition={springPress}
                className="absolute inset-0 rounded-[6px] bg-ink dark:bg-citron"
                aria-hidden="true"
              />
            )}
            <Icon className="relative size-4" aria-hidden="true" />
            {showLabels && <span className="relative">{LABELS[option]}</span>}
          </button>
        );
      })}
    </div>
  );
}
