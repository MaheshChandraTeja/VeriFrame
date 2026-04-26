import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeService } from "./theme.service";

describe("ThemeService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();

    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("dark"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    });
  });

  it("defaults to system preference", () => {
    const service = TestBed.inject(ThemeService);

    expect(service.preference()).toBe("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists explicit dark preference", () => {
    const service = TestBed.inject(ThemeService);

    service.setPreference("dark");

    expect(service.preference()).toBe("dark");
    expect(window.localStorage.getItem("veriframe.theme.preference")).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("toggles between light and dark preferences", () => {
    const service = TestBed.inject(ThemeService);

    service.setPreference("dark");
    service.toggleTheme();

    expect(service.preference()).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
