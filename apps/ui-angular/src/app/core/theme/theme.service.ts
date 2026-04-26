import { Injectable, computed, signal } from "@angular/core";

export type ThemePreference = "light" | "dark" | "system";
export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "veriframe.theme.preference";

@Injectable({
  providedIn: "root"
})
export class ThemeService {
  private readonly preferenceSignal = signal<ThemePreference>(this.readInitialPreference());

  readonly preference = this.preferenceSignal.asReadonly();

  readonly effectiveTheme = computed<ThemeMode>(() => {
    const preference = this.preference();

    if (preference === "system") {
      return this.detectSystemTheme();
    }

    return preference;
  });

  constructor() {
    this.applyTheme(this.effectiveTheme());
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    this.writePreference(preference);
    this.applyTheme(this.effectiveTheme());
  }

  toggleTheme(): void {
    const current = this.preference();

    if (current === "system") {
      this.setPreference(this.detectSystemTheme() === "dark" ? "light" : "dark");
      return;
    }

    this.setPreference(current === "dark" ? "light" : "dark");
  }

  resetToSystem(): void {
    this.setPreference("system");
  }

  private readInitialPreference(): ThemePreference {
    const stored = this.safeLocalStorage()?.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  }

  private writePreference(preference: ThemePreference): void {
    this.safeLocalStorage()?.setItem(STORAGE_KEY, preference);
  }

  private detectSystemTheme(): ThemeMode {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "dark";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  private applyTheme(theme: ThemeMode): void {
    if (typeof document === "undefined") {
      return;
    }

    document.documentElement.setAttribute("data-theme", theme);
  }

  private safeLocalStorage(): Storage | null {
    try {
      if (typeof window === "undefined") {
        return null;
      }

      return window.localStorage;
    } catch {
      return null;
    }
  }
}
