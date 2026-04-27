import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";
import { ReportExportMenuComponent } from "./report-export-menu.component";
import type { ReportExportFormat, ReportSummary } from "../services/report.service";

@Component({
  selector: "vf-report-card",
  standalone: true,
  imports: [AppBadgeComponent, AppButtonComponent, ReportExportMenuComponent, RouterLink],
  inputs: ["report"],
  outputs: ["exportRequested", "deleteRequested"],
  template: `
    @if (report) {
      <article class="vf-report-card">
        <header class="vf-report-card__header">
          <div>
            <span class="vf-report-card__eyebrow">{{ report.workflow }}</span>
            <h3>
              <a [routerLink]="['/analysis', report.runId]">{{ displayName(report) }}</a>
            </h3>
            <p>{{ compactPath(report.sourcePath) }}</p>
          </div>

          <div class="vf-report-card__badges">
            <vf-badge [variant]="statusVariant(report.status)">
              {{ report.status }}
            </vf-badge>
            <vf-badge [variant]="report.findingCount > 0 ? 'warning' : 'success'">
              {{ report.findingCount }} finding(s)
            </vf-badge>
          </div>
        </header>

        <dl class="vf-report-card__metrics">
          <div>
            <dt>Completed</dt>
            <dd>{{ formatDate(report.completedAt ?? report.createdAt) }}</dd>
          </div>
          <div>
            <dt>Regions</dt>
            <dd>{{ report.regionCount }}</dd>
          </div>
          <div>
            <dt>Artifacts</dt>
            <dd>{{ report.artifactCount }}</dd>
          </div>
          <div>
            <dt>Run</dt>
            <dd><code>{{ shortId(report.runId) }}</code></dd>
          </div>
        </dl>

        <footer class="vf-report-card__footer">
          <div class="vf-report-card__export-area">
            <vf-report-export-menu
              [runId]="report.runId"
              (exportRequested)="exportRequested.emit({ runId: report!.runId, format: $event })"
            />
          </div>

          <div class="vf-report-card__primary-actions">
            <vf-button variant="danger" (clicked)="deleteRequested.emit(report!.runId)">
              Delete report
            </vf-button>

            <a class="vf-report-card__view" [routerLink]="['/analysis', report.runId]">
              View analysis
            </a>

            <a class="vf-report-card__review" [routerLink]="['/review', report.runId]">
              Review
            </a>
          </div>
        </footer>
      </article>
    }
  `,
  styles: [
    `
      .vf-report-card {
        display: grid;
        gap: 16px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 40%),
          var(--vf-surface);
        box-shadow: var(--vf-shadow-sm);
        padding: 18px;
      }

      .vf-report-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }

      .vf-report-card__eyebrow {
        display: inline-flex;
        width: fit-content;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-bg-elevated);
        color: var(--vf-primary);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        padding: 6px 9px;
        text-transform: uppercase;
      }

      h3 {
        margin: 12px 0 0;
        color: var(--vf-text);
        font-size: 22px;
        letter-spacing: -0.06em;
      }

      a {
        color: inherit;
        text-decoration: none;
      }

      p {
        margin: 7px 0 0;
        color: var(--vf-text-muted);
        max-width: 760px;
        overflow-wrap: anywhere;
      }

      .vf-report-card__badges {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
      }

      .vf-report-card__metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin: 0;
      }

      .vf-report-card__metrics div {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-bg-elevated);
        padding: 11px 12px;
      }

      dt {
        display: block;
        color: var(--vf-text-muted);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      dd {
        margin: 6px 0 0;
        color: var(--vf-text);
        font-weight: 900;
      }

      code {
        color: var(--vf-primary);
        overflow-wrap: anywhere;
      }

      .vf-report-card__footer {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        border-top: 1px solid var(--vf-border);
        padding-top: 14px;
      }

      .vf-report-card__export-area {
        min-width: 0;
      }

      .vf-report-card__primary-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        white-space: nowrap;
      }

      .vf-report-card__view,
      .vf-report-card__review {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        border-radius: 999px;
        font-weight: 950;
        padding: 9px 14px;
        text-decoration: none;
      }

      .vf-report-card__view {
        border: 1px solid rgba(56, 189, 248, 0.22);
        background: var(--vf-primary-soft);
        color: var(--vf-primary);
      }

      .vf-report-card__review {
        border: 1px solid color-mix(in srgb, var(--vf-success) 36%, var(--vf-border));
        background: color-mix(in srgb, var(--vf-success) 18%, transparent);
        color: var(--vf-success);
      }

      .vf-report-card__view:hover,
      .vf-report-card__review:hover {
        transform: translateY(-1px);
      }

      @media (max-width: 1180px) {
        .vf-report-card__footer {
          grid-template-columns: 1fr;
          align-items: stretch;
        }

        .vf-report-card__primary-actions {
          justify-content: flex-start;
          flex-wrap: wrap;
        }
      }

      @media (max-width: 920px) {
        .vf-report-card__header {
          align-items: flex-start;
          flex-direction: column;
        }

        .vf-report-card__badges {
          justify-content: flex-start;
        }

        .vf-report-card__metrics {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 620px) {
        .vf-report-card__primary-actions {
          align-items: stretch;
          flex-direction: column;
          white-space: normal;
        }

        .vf-report-card__view,
        .vf-report-card__review {
          width: 100%;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportCardComponent {
  report: ReportSummary | null = null;
  readonly exportRequested = new EventEmitter<{ runId: string; format: ReportExportFormat }>();
  readonly deleteRequested = new EventEmitter<string>();

  displayName(report: ReportSummary): string {
    return report.sourcePath.split(/[\\/]/).at(-1) || report.runId;
  }

  compactPath(value: string): string {
    const parts = value.split(/[\\/]/);
    return parts.length <= 3 ? value : `…/${parts.slice(-3).join("/")}`;
  }

  shortId(value: string): string {
    if (!value) {
      return "not recorded";
    }

    const separatorIndex = value.indexOf("_");

    if (separatorIndex > -1 && separatorIndex < value.length - 1) {
      const prefix = value.slice(0, separatorIndex);
      const suffix = value.slice(separatorIndex + 1);

      return `${prefix}_${suffix.slice(0, 8)}`;
    }

    return value.slice(0, 12);
  }

  formatDate(value: string | null): string {
    if (!value) {
      return "not completed";
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  statusVariant(status: string): AppBadgeVariant {
    return status === "completed" ? "success" : "warning";
  }
}
