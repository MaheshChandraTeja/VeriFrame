import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import type { AppSettings } from "../services/settings.service";

@Component({
  selector: "vf-model-settings",
  standalone: true,
  inputs: ["settings"],
  outputs: ["changed"],
  template: `
    <section class="vf-settings-panel">
      <header>
        <span>Model defaults</span>
        <h2>Make inference behave.</h2>
        <p>
          Set default device selection and detection threshold for new analysis requests.
        </p>
      </header>

      <div class="vf-settings-panel__controls">
        <label>
          <strong>Device preference</strong>
          <select
            [value]="string('model.devicePreference', 'auto')"
            (change)="changed.emit({ 'model.devicePreference': $any($event.target).value })"
          >
            <option value="auto">Auto</option>
            <option value="cpu">CPU</option>
            <option value="cuda">CUDA</option>
            <option value="mps">MPS</option>
          </select>
          <small>CPU is safest. CUDA is faster if the machine deserves joy.</small>
        </label>

        <label>
          <strong>Confidence threshold</strong>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            [value]="number('model.defaultConfidenceThreshold', 0.5)"
            (change)="changed.emit({ 'model.defaultConfidenceThreshold': parseThreshold($any($event.target).value) })"
          >
          <small>{{ thresholdHint() }}</small>
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

      strong {
        color: var(--vf-text);
      }

      input,
      select {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-bg-elevated);
        color: var(--vf-text);
        outline: none;
        padding: 11px 12px;
      }

      small {
        color: var(--vf-text-muted);
        line-height: 1.5;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelSettingsComponent {
  settings: Partial<AppSettings> = {};
  readonly changed = new EventEmitter<Partial<AppSettings>>();

  string(key: keyof AppSettings, fallback: string): string {
    return String(this.settings[key] ?? fallback);
  }

  number(key: keyof AppSettings, fallback: number): number {
    const value = Number(this.settings[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  parseThreshold(value: string): number {
    const parsed = Number(value);
    return Math.min(1, Math.max(0, Number.isFinite(parsed) ? parsed : 0.5));
  }

  thresholdHint(): string {
    const value = this.number("model.defaultConfidenceThreshold", 0.5);

    if (value >= 0.75) {
      return "Strict threshold. Fewer weak detections, more missed edge cases.";
    }

    if (value <= 0.35) {
      return "Loose threshold. More review noise, useful when testing.";
    }

    return "Balanced default for early QA.";
  }
}
