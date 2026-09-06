export const DISPLAY_NAME_STORAGE_KEY = "atmos-display-name-v1";
export const DISPLAY_NAME_CHANGED_EVENT = "atmos-display-name-changed";
export const DEFAULT_DISPLAY_NAME = "Saksham";
export const DISPLAY_NAME_MAX_LENGTH = 12;

export function normalizeDisplayName(value: string) {
  return value.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

export function visibleDisplayName(value: string) {
  return value.trim() || DEFAULT_DISPLAY_NAME;
}
