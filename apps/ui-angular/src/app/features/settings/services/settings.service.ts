import { Injectable, inject } from "@angular/core";

import { TauriService } from "../../../core/native/tauri.service";

export interface AppSettings {
  readonly "privacy.includeExifByDefault": boolean;
  readonly "privacy.cleanupTempOnExit": boolean;
  readonly "privacy.telemetryEnabled": boolean;
  readonly "model.devicePreference": "auto" | "cpu" | "cuda" | "mps";
  readonly "model.defaultConfidenceThreshold": number;
  readonly "model.defaultProfiles": readonly string[];
  readonly "storage.maxCacheSizeMb": number;
  readonly "storage.autoCleanupReports": boolean;
  readonly "storage.keepAuditReceiptsForever": boolean;
  readonly [key: string]: unknown;
}

export interface SettingsResponse {
  readonly settings: AppSettings;
  readonly localOnly: boolean;
  readonly telemetry: boolean;
}

export interface SettingsUpdateResponse {
  readonly ok: boolean;
  readonly changed: readonly unknown[];
  readonly settings: AppSettings;
}

@Injectable({
  providedIn: "root"
})
export class SettingsService {
  private readonly tauri = inject(TauriService);

  async getSettings(): Promise<SettingsResponse> {
    const response = await this.tauri.invoke<SettingsResponse>("get_settings");

    return {
      ...response,
      settings: normalizeSettings(response.settings)
    };
  }

  async updateSettings(values: Partial<AppSettings>): Promise<SettingsUpdateResponse> {
    const response = await this.tauri.invoke<SettingsUpdateResponse>("update_settings", {
      request: {
        values
      }
    });

    return {
      ...response,
      settings: normalizeSettings(response.settings)
    };
  }
}

export function normalizeSettings(settings: Record<string, unknown>): AppSettings {
  return {
    "privacy.includeExifByDefault": booleanValue(settings["privacy.includeExifByDefault"], false),
    "privacy.cleanupTempOnExit": booleanValue(settings["privacy.cleanupTempOnExit"], true),
    "privacy.telemetryEnabled": false,
    "model.devicePreference": devicePreference(settings["model.devicePreference"]),
    "model.defaultConfidenceThreshold": clampNumber(
      settings["model.defaultConfidenceThreshold"],
      0.5,
      0,
      1
    ),
    "model.defaultProfiles": arrayValue(settings["model.defaultProfiles"], ["receipt_region_detector"]),
    "storage.maxCacheSizeMb": Math.max(
      128,
      Math.round(numberValue(settings["storage.maxCacheSizeMb"], 2048))
    ),
    "storage.autoCleanupReports": booleanValue(settings["storage.autoCleanupReports"], false),
    "storage.keepAuditReceiptsForever": booleanValue(
      settings["storage.keepAuditReceiptsForever"],
      true
    ),
    ...settings
  };
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, numberValue(value, fallback)));
}

function arrayValue(value: unknown, fallback: readonly string[]): readonly string[] {
  return Array.isArray(value) ? value.map(String) : fallback;
}

function devicePreference(value: unknown): AppSettings["model.devicePreference"] {
  if (value === "cpu" || value === "cuda" || value === "mps" || value === "auto") {
    return value;
  }

  return "auto";
}
