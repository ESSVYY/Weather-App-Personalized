"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyResolvedAppearance, isAppearancePreference, resolveAppearance, THEME_STORAGE_KEY, type AppearancePreference, type ResolvedAppearance } from "@/lib/theme";

type AppearanceContextValue = {
  preference: AppearancePreference;
  resolvedTheme: ResolvedAppearance;
  setPreference: (preference: AppearancePreference) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function readPreference(): AppearancePreference {
  if (typeof window === "undefined") return "dark";
  try { const saved = localStorage.getItem(THEME_STORAGE_KEY); return isAppearancePreference(saved) ? saved : "dark"; }
  catch { return "dark"; }
}

function readResolved(): ResolvedAppearance {
  if (typeof document !== "undefined" && document.documentElement.dataset.theme === "light") return "light";
  return "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<AppearancePreference>(readPreference);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedAppearance>(readResolved);

  const updateResolved = useCallback((nextPreference: AppearancePreference) => {
    const resolved = resolveAppearance(nextPreference, window.matchMedia("(prefers-color-scheme: dark)").matches);
    applyResolvedAppearance(resolved);
    setResolvedTheme(resolved);
    window.dispatchEvent(new CustomEvent("atmos-theme-changed", { detail: { preference: nextPreference, resolved } }));
  }, []);

  const setPreference = useCallback((nextPreference: AppearancePreference) => {
    setPreferenceState(nextPreference);
    try { localStorage.setItem(THEME_STORAGE_KEY, nextPreference); } catch { /* The choice still applies for this visit. */ }
    updateResolved(nextPreference);
  }, [updateResolved]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const systemChanged = () => { if (preference === "system") updateResolved("system"); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY || !isAppearancePreference(event.newValue)) return;
      setPreferenceState(event.newValue);
      updateResolved(event.newValue);
    };
    media.addEventListener("change", systemChanged);
    window.addEventListener("storage", storageChanged);
    return () => { media.removeEventListener("change", systemChanged); window.removeEventListener("storage", storageChanged); };
  }, [preference, updateResolved]);

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme, setPreference]);
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within ThemeProvider");
  return value;
}
