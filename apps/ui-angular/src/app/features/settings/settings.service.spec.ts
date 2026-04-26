import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TAURI_INVOKE, type TauriInvoke } from "../../core/native/tauri.service";
import { normalizeSettings, SettingsService } from "./services/settings.service";

describe("SettingsService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("loads settings through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      settings: {
        "model.devicePreference": "auto",
        "model.defaultConfidenceThreshold": 0.5
      },
      localOnly: true,
      telemetry: false
    });

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(SettingsService);
    const result = await service.getSettings();

    expect(result.settings["model.devicePreference"]).toBe("auto");
    expect(result.settings["privacy.telemetryEnabled"]).toBe(false);
    expect(invoke).toHaveBeenCalledWith("get_settings", undefined);
  });

  it("updates settings through the request envelope", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      ok: true,
      changed: [],
      settings: {
        "storage.maxCacheSizeMb": 4096
      }
    });

    TestBed.configureTestingModule({
      providers: [
        SettingsService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(SettingsService);
    const result = await service.updateSettings({
      "storage.maxCacheSizeMb": 4096
    });

    expect(result.ok).toBe(true);
    expect(result.settings["storage.maxCacheSizeMb"]).toBe(4096);
    expect(invoke).toHaveBeenCalledWith("update_settings", {
      request: {
        values: {
          "storage.maxCacheSizeMb": 4096
        }
      }
    });
  });

  it("normalizes missing settings to safe defaults", () => {
    const settings = normalizeSettings({});

    expect(settings["privacy.includeExifByDefault"]).toBe(false);
    expect(settings["privacy.cleanupTempOnExit"]).toBe(true);
    expect(settings["privacy.telemetryEnabled"]).toBe(false);
    expect(settings["model.defaultConfidenceThreshold"]).toBe(0.5);
    expect(settings["storage.maxCacheSizeMb"]).toBe(2048);
  });
});
