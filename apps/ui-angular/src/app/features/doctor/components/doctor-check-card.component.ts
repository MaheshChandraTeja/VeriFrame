import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import type { DiagnosticCheck } from "../services/doctor.service";

interface DetailRow {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly kind: "text" | "path" | "boolean" | "number" | "empty";
}

@Component({
  selector: "vf-doctor-check-card",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["check"],
  template: `
    @if (check) {
      <article class="vf-doctor-check" [class]="statusClass(check.status)">
        <header class="vf-doctor-check__header">
          <div class="vf-doctor-check__titleblock">
            <h3>{{ check.title }}</h3>
            <p>{{ check.message }}</p>
          </div>

          <vf-badge [variant]="variant(check.status)">
            {{ statusLabel(check.status) }}
          </vf-badge>
        </header>

        @if (detailRows().length > 0) {
          <section class="vf-doctor-check__details">
            <strong>Details</strong>

            <dl>
              @for (row of detailRows(); track row.key) {
                <div [class]="'vf-doctor-check__detail is-' + row.kind">
                  <dt>{{ row.label }}</dt>
                  <dd>{{ row.value }}</dd>
                </div>
              }
            </dl>
          </section>
        }

        @if (suggestion()) {
          <section class="vf-doctor-check__suggestion">
            <strong>Suggested fix</strong>
            <p>{{ suggestion() }}</p>
          </section>
        }
      </article>
    }
  `,
  styles: [
    `
      .vf-doctor-check {
        display: grid;
        gap: 14px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 35%),
          var(--vf-surface);
        padding: 16px;
        box-shadow: var(--vf-shadow-sm);
      }

      .vf-doctor-check.is-pass {
        border-color: rgba(74, 222, 128, 0.22);
      }

      .vf-doctor-check.is-warn {
        border-color: rgba(250, 204, 21, 0.26);
      }

      .vf-doctor-check.is-fail {
        border-color: rgba(248, 113, 113, 0.3);
      }

      .vf-doctor-check__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .vf-doctor-check__titleblock {
        display: grid;
        gap: 8px;
      }

      .vf-doctor-check h3 {
        margin: 0;
        color: var(--vf-text);
        font-size: 18px;
        letter-spacing: -0.05em;
      }

      .vf-doctor-check p {
        margin: 0;
        color: var(--vf-text-muted);
        line-height: 1.6;
      }

      .vf-doctor-check__details,
      .vf-doctor-check__suggestion {
        display: grid;
        gap: 10px;
        border-top: 1px solid var(--vf-border);
        padding-top: 12px;
      }

      .vf-doctor-check__details > strong,
      .vf-doctor-check__suggestion > strong {
        color: var(--vf-text);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      .vf-doctor-check__details dl {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      .vf-doctor-check__detail {
        display: grid;
        gap: 5px;
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: var(--vf-radius-md);
        background: rgba(2, 6, 23, 0.18);
        padding: 10px 11px;
      }

      .vf-doctor-check__detail.is-empty {
        display: none;
      }

      .vf-doctor-check__details dt {
        color: var(--vf-text-muted);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .vf-doctor-check__details dd {
        margin: 0;
        color: var(--vf-text-soft);
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      .vf-doctor-check__detail.is-path dd {
        font-family:
          ui-monospace,
          SFMono-Regular,
          Menlo,
          Consolas,
          "Liberation Mono",
          monospace;
        font-size: 12px;
      }

      .vf-doctor-check__detail.is-boolean dd {
        font-weight: 900;
      }

      .vf-doctor-check__suggestion {
        border-radius: var(--vf-radius-lg);
        border: 1px solid rgba(56, 189, 248, 0.14);
        background: rgba(56, 189, 248, 0.045);
        padding: 12px;
      }

      .vf-doctor-check__suggestion p {
        color: var(--vf-text-soft);
      }

      @media (max-width: 760px) {
        .vf-doctor-check__header {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorCheckCardComponent {
  check: DiagnosticCheck | null = null;

  detailRows(): readonly DetailRow[] {
    const details = this.check?.details ?? {};

    return Object.entries(details)
      .map(([key, value]) => this.toDetailRow(key, value))
      .filter((row) => row.kind !== "empty");
  }

  suggestion(): string | null {
    const checkId = this.check?.checkId ?? "";
    const status = this.check?.status;

    if (status === "pass") {
      return null;
    }

    if (checkId.includes("engine")) {
      return "Start the local engine from the top bar, or run `pnpm dev:engine` in a separate terminal while testing.";
    }

    if (checkId.includes("database")) {
      return "Run the engine once so migrations can create the SQLite database, then rerun diagnostics.";
    }

    if (checkId.includes("models")) {
      return "Open the Models page and confirm the registry can see your model configs and checkpoint folder.";
    }

    if (checkId.includes("storage")) {
      return "Check Windows permissions for the app data, reports, logs, models, and temp folders.";
    }

    if (checkId.includes("logs")) {
      return "Trigger an engine action, then refresh logs. Empty logs are normal before anything writes output.";
    }

    return null;
  }

  statusClass(status: DiagnosticCheck["status"]): string {
    return `is-${status === "warn" ? "warn" : status}`;
  }

  statusLabel(status: DiagnosticCheck["status"]): string {
    switch (status) {
      case "pass":
        return "Healthy";
      case "warn":
        return "Needs attention";
      case "fail":
        return "Failed";
    }
  }

  variant(status: DiagnosticCheck["status"]): AppBadgeVariant {
    switch (status) {
      case "pass":
        return "success";
      case "warn":
        return "warning";
      case "fail":
        return "danger";
    }
  }

  private toDetailRow(key: string, value: unknown): DetailRow {
    if (value === null || value === undefined || value === "") {
      return {
        key,
        label: this.formatKey(key),
        value: "Not available",
        kind: this.shouldHideWhenEmpty(key) ? "empty" : "text"
      };
    }

    if (typeof value === "boolean") {
      return {
        key,
        label: this.formatKey(key),
        value: value ? "Yes" : "No",
        kind: "boolean"
      };
    }

    if (typeof value === "number") {
      return {
        key,
        label: this.formatKey(key),
        value: Number.isFinite(value) ? String(value) : "Not available",
        kind: "number"
      };
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return {
          key,
          label: this.formatKey(key),
          value: "None",
          kind: this.shouldHideWhenEmpty(key) ? "empty" : "text"
        };
      }

      return {
        key,
        label: this.formatKey(key),
        value: value.map((item) => this.stringifyValue(item)).join(", "),
        kind: "text"
      };
    }

    const text = this.stringifyValue(value);

    return {
      key,
      label: this.formatKey(key),
      value: this.cleanPathText(text),
      kind: this.looksLikePath(key, text) ? "path" : "text"
    };
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "object" && value !== null) {
      try {
        return JSON.stringify(value);
      } catch {
        return "Unserializable value";
      }
    }

    return String(value);
  }

  private shouldHideWhenEmpty(key: string): boolean {
    return ["pid", "startedAt"].includes(key);
  }

  private looksLikePath(key: string, value: string): boolean {
    return key.toLowerCase().includes("path") || /[a-zA-Z]:\\/.test(value) || value.includes("\\");
  }

  private cleanPathText(value: string): string {
    return value.replace(/\\\\/g, "\\");
  }

  private formatKey(key: string): string {
    const overrides: Record<string, string> = {
      logsPath: "Log folder",
      startedAt: "Started",
      tokenIssued: "Session token created",
      appDataDir: "App data folder",
      reportsDir: "Reports folder",
      logsDir: "Logs folder",
      modelsDir: "Models folder",
      databasePath: "Database path",
      parentExists: "Folder exists",
      databaseExists: "Database exists"
    };

    if (overrides[key]) {
      return overrides[key];
    }

    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
