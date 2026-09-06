export type AppearancePreference = "light" | "dark" | "system";
export type ResolvedAppearance = "light" | "dark";

export const THEME_STORAGE_KEY = "atmos-theme";
export const THEME_COLOURS: Record<ResolvedAppearance, string> = {
  light: "#d9e7eb",
  dark: "#497da6",
};

export function isAppearancePreference(value: string | null): value is AppearancePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveAppearance(preference: AppearancePreference, systemDark: boolean): ResolvedAppearance {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function applyResolvedAppearance(theme: ResolvedAppearance) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => meta.content = THEME_COLOURS[theme]);
}
