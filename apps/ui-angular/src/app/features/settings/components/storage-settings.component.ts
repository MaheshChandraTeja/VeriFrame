import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import type { AppSettings } from "../services/settings.service";

@Component({
  selector: "vf-storage-settings",
  standalone: true,
  inputs: ["settings"],
  outputs: ["changed"],
  template: `
    <section class="vf-settings-panel">
      <header>
        <span>Storage</span>
        <h2>Keep the evidence trail tidy.</h2>
        <p>
          Control cache size, generated report cleanup, and audit receipt retention.
        </p>
      </header>

      <div class="vf-settings-panel__controls">
        <label>
          <strong>Max cache size</strong>
          <input
            type="number"
            min="128"
            step="128"
            [value]="number('storage.maxCacheSizeMb', 2048)"
            (change)="changed.emit({ 'storage.maxCacheSizeMb': parsePositive($any($event.target).value) })"
          >
          <small>Measured in MB. This is a target limit, not a sacred prophecy.</small>
        </label>

        <label class="vf-toggle">
          <input
            type="checkbox"
            [checked]="bool('storage.autoCleanupReports')"
            (change)="changed.emit({ 'storage.autoCleanupReports': $any($event.target).checked })"
          >
          <span>
            <strong>Auto-clean generated reports</strong>
            <small>Useful for test runs. Risky if reports are evidence.</small>
          </span>
        </label>

        <label class="vf-toggle">
          <input
            type="checkbox"
            [checked]="bool('storage.keepAuditReceiptsForever')"
            (change)="changed.emit({ 'storage.keepAuditReceiptsForever': $any($event.target).checked })"
          >
          <span>
            <strong>Keep audit receipts forever</strong>
            <small>Recommended. Receipts are small and explain what happened.</small>
          </span>
        </label>
      </div>
    </section>
  `,
  styles: [
    `
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

      label {
        display: grid;
        gap: 8px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: rgba(2, 6, 23, 0.18);
        padding: 13px;
      }

      .vf-toggle {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        cursor: pointer;
      }

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        accent-color: var(--vf-primary);
      }

      input[type="number"] {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-bg-elevated);
        color: var(--vf-text);
        outline: none;
        padding: 11px 12px;
      }

      strong {
        color: var(--vf-text);
      }

      small {
        color: var(--vf-text-muted);
        line-height: 1.5;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StorageSettingsComponent {
  settings: Partial<AppSettings> = {};
  readonly changed = new EventEmitter<Partial<AppSettings>>();

  bool(key: keyof AppSettings): boolean {
    return Boolean(this.settings[key]);
  }

  number(key: keyof AppSettings, fallback: number): number {
    const value = Number(this.settings[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  parsePositive(value: string): number {
    const parsed = Number(value);
    return Math.max(128, Math.round(Number.isFinite(parsed) ? parsed : 2048));
  }
}
