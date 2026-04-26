import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import type { Finding, FindingSeverity } from "@veriframe/contracts";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";

@Component({
  selector: "vf-finding-list",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["findings"],
  outputs: ["regionRequested"],
  template: `
    <section class="vf-finding-list">
      @if (findings.length === 0) {
        <p class="vf-finding-list__empty">No findings match the current filter.</p>
      } @else {
        @for (finding of findings; track finding.findingId) {
          <article class="vf-finding-list__item">
            <header>
              <h3>{{ finding.title }}</h3>
              <vf-badge [variant]="variantForSeverity(finding.severity)">
                {{ finding.severity }}
              </vf-badge>
            </header>

            <p>{{ finding.description }}</p>
            <small>Confidence: {{ confidence(finding.confidence) }}</small>

            @if (finding.regionIds.length > 0) {
              <button type="button" (click)="regionRequested.emit(finding.regionIds[0])">
                Show region
              </button>
            }
          </article>
        }
      }
    </section>
  `,
  styles: [
    `
      .vf-finding-list {
        display: grid;
        gap: 12px;
      }

      .vf-finding-list__item {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: var(--vf-surface);
        padding: 14px;
      }

      header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      h3 {
        margin: 0;
        font-size: 15px;
        letter-spacing: -0.03em;
      }

      p {
        margin: 9px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.5;
      }

      small {
        display: block;
        margin-top: 9px;
        color: var(--vf-text-soft);
        font-weight: 800;
      }

      button {
        margin-top: 10px;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: transparent;
        color: var(--vf-primary);
        cursor: pointer;
        font-weight: 900;
        padding: 7px 10px;
      }

      .vf-finding-list__empty {
        color: var(--vf-text-muted);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FindingListComponent {
  findings: readonly Finding[] = [];
  readonly regionRequested = new EventEmitter<string>();

  confidence(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  variantForSeverity(severity: FindingSeverity): AppBadgeVariant {
    switch (severity) {
      case "critical":
      case "high":
        return "danger";
      case "medium":
        return "warning";
      case "low":
        return "info";
      case "info":
        return "neutral";
    }
  }
}
