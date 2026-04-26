import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";

import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { ModelSettingsComponent } from "./components/model-settings.component";
import { PrivacySettingsComponent } from "./components/privacy-settings.component";
import { StorageSettingsComponent } from "./components/storage-settings.component";
import { type AppSettings, SettingsService } from "./services/settings.service";

@Component({
  selector: "vf-settings-page",
  standalone: true,
  imports: [
    AppBadgeComponent,
    AppButtonComponent,
    AppCardComponent,
    ModelSettingsComponent,
    PrivacySettingsComponent,
    StorageSettingsComponent
  ],
  template: `
    <section class="vf-settings-page">
      <header class="vf-settings-page__hero">
        <div class="vf-settings-page__hero-copy">
          <span class="vf-settings-page__eyebrow">Local settings</span>
          <h1>Control the machine. Keep the cloud out of it.</h1>
          <p>
            Tune privacy defaults, model behavior, and local storage limits without sending
            configuration data anywhere. Revolutionary stuff: software minding its own business.
          </p>

          <div class="vf-settings-page__hero-actions">
            <vf-button variant="primary" (clicked)="reload()">
              {{ loading() ? 'Loading…' : 'Reload settings' }}
            </vf-button>
            <vf-button variant="secondary" (clicked)="saveDefaults()">
              Restore safe defaults
            </vf-button>
          </div>
        </div>

        <aside class="vf-settings-page__hero-side">
          <div class="vf-settings-page__metric-grid">
            @for (item of summaryCards(); track item.label) {
              <article class="vf-settings-page__metric">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </article>
            }
          </div>

          <section class="vf-settings-page__note">
            <strong>Local-only contract</strong>
            <p>
              These settings are stored in the local SQLite database. Telemetry stays off.
              EXIF stays opt-in. Reports stay on this machine unless you export them yourself.
            </p>
          </section>
        </aside>
      </header>

      <section class="vf-settings-page__statusbar">
        <div>
          <strong>Settings status</strong>
          <span>{{ message() }}</span>
        </div>

        <vf-badge [variant]="statusVariant()">
          {{ statusLabel() }}
        </vf-badge>
      </section>

      <div class="vf-settings-page__layout">
        <main class="vf-settings-page__main">
          <div class="vf-settings-page__grid">
            <vf-card title="Privacy" subtitle="Image metadata, temp cleanup, and telemetry guardrails.">
              <vf-privacy-settings [settings]="settings()" (changed)="update($event)" />
            </vf-card>

            <vf-card title="Models" subtitle="Inference defaults and model selection behavior.">
              <vf-model-settings [settings]="settings()" (changed)="update($event)" />
            </vf-card>

            <vf-card title="Storage" subtitle="Cache limits, report retention, and audit receipts.">
              <vf-storage-settings [settings]="settings()" (changed)="update($event)" />
            </vf-card>
          </div>
        </main>

        <aside class="vf-settings-page__side">
          <vf-card title="Current policy" subtitle="What the active settings mean in plain English.">
            <div class="vf-settings-page__policy">
              @for (item of policyItems(); track item.title) {
                <article>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              }
            </div>
          </vf-card>

          <vf-card title="Settings notes" subtitle="A tiny runbook, because knobs need labels.">
            <div class="vf-settings-page__guide">
              <article>
                <span>EXIF</span>
                <p>Keep disabled unless metadata is part of the evidence. EXIF can contain camera and location context.</p>
              </article>
              <article>
                <span>Confidence</span>
                <p>Higher thresholds reduce weak detections. Lower thresholds increase review load. Pick your chaos responsibly.</p>
              </article>
              <article>
                <span>Receipts</span>
                <p>Audit receipts are tiny integrity records. Keeping them forever is usually the sensible local-first default.</p>
              </article>
            </div>
          </vf-card>
        </aside>
      </div>
    </section>
  `,
  styleUrl: "./settings.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsPageComponent {
  private readonly settingsService = inject(SettingsService);

  readonly settings = signal<Partial<AppSettings>>({});
  readonly message = signal<string>("Start the local engine, then reload settings.");
  readonly loading = signal(false);
  readonly lastSaveOk = signal<boolean | null>(null);

  readonly includeExif = computed(() => Boolean(this.settings()["privacy.includeExifByDefault"]));
  readonly cleanupTemp = computed(() => Boolean(this.settings()["privacy.cleanupTempOnExit"]));
  readonly telemetryEnabled = computed(() => Boolean(this.settings()["privacy.telemetryEnabled"]));
  readonly devicePreference = computed(() => String(this.settings()["model.devicePreference"] ?? "auto"));
  readonly confidenceThreshold = computed(() =>
    Number(this.settings()["model.defaultConfidenceThreshold"] ?? 0.5)
  );
  readonly maxCacheSizeMb = computed(() => Number(this.settings()["storage.maxCacheSizeMb"] ?? 2048));

  readonly summaryCards = computed(() => [
    {
      label: "Telemetry",
      value: this.telemetryEnabled() ? "On" : "Off",
      hint: "always local"
    },
    {
      label: "EXIF",
      value: this.includeExif() ? "Included" : "Excluded",
      hint: "metadata default"
    },
    {
      label: "Device",
      value: this.devicePreference().toUpperCase(),
      hint: "inference target"
    },
    {
      label: "Cache",
      value: `${this.maxCacheSizeMb()} MB`,
      hint: "local limit"
    }
  ]);

  readonly statusLabel = computed(() => {
    if (this.loading()) {
      return "loading";
    }

    const state = this.lastSaveOk();
    if (state === null) {
      return "idle";
    }

    return state ? "saved" : "attention";
  });

  readonly statusVariant = computed<"neutral" | "info" | "success" | "warning">(() => {
    if (this.loading()) {
      return "info";
    }

    const state = this.lastSaveOk();
    if (state === null) {
      return "neutral";
    }

    return state ? "success" : "warning";
  });

  readonly policyItems = computed(() => [
    {
      title: "Privacy posture",
      description: this.includeExif()
        ? "EXIF metadata will be included by default. Use this only when metadata is relevant evidence."
        : "EXIF metadata is excluded by default, which is the safer choice for most local reviews."
    },
    {
      title: "Temporary files",
      description: this.cleanupTemp()
        ? "Temporary files are cleaned on exit, reducing stale artifacts."
        : "Temporary files may remain after exit. Useful for debugging, messy for real life."
    },
    {
      title: "Model confidence",
      description: `Default detection threshold is ${this.confidenceThreshold().toFixed(2)}. Adjust only when review noise or missed detections become obvious.`
    },
    {
      title: "Storage retention",
      description: `Generated cache target is ${this.maxCacheSizeMb()} MB. Reports and receipts remain local.`
    }
  ]);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.message.set("Loading settings…");

    try {
      const response = await this.settingsService.getSettings();
      this.settings.set(response.settings);
      this.lastSaveOk.set(true);
      this.message.set("Settings loaded from the local engine.");
    } catch (error) {
      this.lastSaveOk.set(false);
      this.message.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async update(values: Partial<AppSettings>): Promise<void> {
    const optimistic = {
      ...this.settings(),
      ...values
    };

    this.settings.set(optimistic);
    this.message.set("Saving settings locally…");

    try {
      const response = await this.settingsService.updateSettings(values);
      this.settings.set(response.settings);
      this.lastSaveOk.set(true);
      this.message.set("Settings saved locally.");
    } catch (error) {
      this.lastSaveOk.set(false);
      this.message.set(this.errorMessage(error));
      await this.reload();
    }
  }

  async saveDefaults(): Promise<void> {
    await this.update({
      "privacy.includeExifByDefault": false,
      "privacy.cleanupTempOnExit": true,
      "privacy.telemetryEnabled": false,
      "model.devicePreference": "auto",
      "model.defaultConfidenceThreshold": 0.5,
      "model.defaultProfiles": ["receipt_region_detector"],
      "storage.maxCacheSizeMb": 2048,
      "storage.autoCleanupReports": false,
      "storage.keepAuditReceiptsForever": true
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      const record = error as Record<string, unknown>;
      const message = record["message"];
      const code = record["code"];

      if (typeof message === "string" && typeof code === "string") {
        return `${code}: ${message}`;
      }

      if (typeof message === "string") {
        return message;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return "Unknown object error";
      }
    }

    return "Unable to load settings.";
  }
}
