import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import type { AppSettings } from "../services/settings.service";

@Component({
  selector: "vf-privacy-settings",
  standalone: true,
  inputs: ["settings"],
  outputs: ["changed"],
  template: `
    <section class="vf-settings-panel">
      <header>
        <span>Privacy defaults</span>
        <h2>Keep evidence local.</h2>
        <p>
          Decide what metadata is allowed into reports and how temporary files are handled.
        </p>
      </header>

      <div class="vf-settings-panel__controls">
        <label class="vf-toggle">
          <input
            type="checkbox"
            [checked]="bool('privacy.includeExifByDefault')"
            (change)="emitBool('privacy.includeExifByDefault', $any($event.target).checked)"
          >
          <span>
            <strong>Include EXIF by default</strong>
            <small>Only enable when metadata is part of the evidence trail.</small>
          </span>
        </label>

        <label class="vf-toggle">
          <input
            type="checkbox"
            [checked]="bool('privacy.cleanupTempOnExit')"
            (change)="emitBool('privacy.cleanupTempOnExit', $any($event.target).checked)"
          >
          <span>
            <strong>Clean temporary files on exit</strong>
            <small>Recommended for normal local review sessions.</small>
          </span>
        </label>

        <label class="vf-toggle is-disabled">
          <input
            type="checkbox"
            [checked]="bool('privacy.telemetryEnabled')"
            disabled
          >
          <span>
            <strong>Telemetry enabled</strong>
            <small>Locked off. The app does not phone home to tell strangers about your receipts.</small>
          </span>
        </label>
      </div>
    </section>
  `,
  styles: [sharedSettingsPanelStyles()],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacySettingsComponent {
  settings: Partial<AppSettings> = {};
  readonly changed = new EventEmitter<Partial<AppSettings>>();

  bool(key: keyof AppSettings): boolean {
    return Boolean(this.settings[key]);
  }

  emitBool(key: keyof AppSettings, value: boolean): void {
    this.changed.emit({ [key]: value });
  }
}

function sharedSettingsPanelStyles(): string {
  return `
    .vf-settings-panel {
      display: grid;
      gap: 18px;
    }

    header {
      display: grid;
      gap: 7px;
    }

    header span {
      color: var(--vf-primary);
      font-size: 11px;
      font-weight: 950;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h2 {
      margin: 0;
      color: var(--vf-text);
      font-size: 28px;
      line-height: 1;
      letter-spacing: -0.07em;
    }

    p {
      margin: 0;
      color: var(--vf-text-muted);
      line-height: 1.6;
    }

    .vf-settings-panel__controls {
      display: grid;
      gap: 12px;
    }

    .vf-toggle {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      border: 1px solid var(--vf-border);
      border-radius: var(--vf-radius-lg);
      background: rgba(2, 6, 23, 0.18);
      padding: 13px;
      cursor: pointer;
    }

    .vf-toggle.is-disabled {
      cursor: not-allowed;
      opacity: 0.78;
    }

    input[type="checkbox"] {
      width: 18px;
      height: 18px;
      margin-top: 2px;
      accent-color: var(--vf-primary);
    }

    strong {
      display: block;
      color: var(--vf-text);
      font-size: 14px;
      letter-spacing: -0.02em;
    }

    small {
      display: block;
      margin-top: 4px;
      color: var(--vf-text-muted);
      line-height: 1.5;
    }
  `;
}
