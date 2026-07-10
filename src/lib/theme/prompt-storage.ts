const STORAGE_KEY = "yourstore-theme-prompt";

export type ThemePromptChoice = "dismissed" | "dark" | "light";

export function getThemePromptChoice(): ThemePromptChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "dismissed" || value === "dark" || value === "light") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

export function setThemePromptChoice(choice: ThemePromptChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    // Storage may be unavailable in private mode or strict browsers.
  }
}

export function prefersDarkSystem(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}
