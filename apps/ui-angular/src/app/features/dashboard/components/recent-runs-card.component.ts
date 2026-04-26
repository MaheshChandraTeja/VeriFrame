import { ChangeDetectionStrategy, Component } from "@angular/core";
import type { AnalysisStatus } from "@veriframe/contracts";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import { AppCardComponent } from "../../../shared/ui/card/app-card.component";
import { ConfidencePipe } from "../../../shared/pipes/confidence.pipe";
import { DateTimePipe } from "../../../shared/pipes/date-time.pipe";

interface RecentRun {
  readonly runId: string;
  readonly title: string;
  readonly workflow: string;
  readonly status: AnalysisStatus;
  readonly confidence: number;
  readonly createdAt: string;
}

@Component({
  selector: "vf-recent-runs-card",
  standalone: true,
  imports: [AppBadgeComponent, AppCardComponent, ConfidencePipe, DateTimePipe],
  template: `
    <vf-card
      title="Recent audit runs"
      subtitle="Fixture data for now. Reports will wire this to SQLite."
    >
      <div class="vf-runs">
        @for (run of recentRuns; track run.runId) {
          <article class="vf-runs__row">
            <div>
              <strong>{{ run.title }}</strong>
              <span>{{ run.workflow }} · {{ run.createdAt | vfDateTime }}</span>
            </div>

            <div class="vf-runs__meta">
              <span>{{ run.confidence | confidence }}</span>
              <vf-badge [variant]="statusVariant(run.status)">
                {{ run.status }}
              </vf-badge>
            </div>
          </article>
        }
      </div>
    </vf-card>
  `,
  styles: [
    `
      .vf-runs {
        display: grid;
        gap: 10px;
      }

      .vf-runs__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-surface);
        padding: 14px;
      }

      .vf-runs__row strong,
      .vf-runs__row span {
        display: block;
      }

      .vf-runs__row span {
        margin-top: 4px;
        color: var(--vf-text-muted);
        font-size: 13px;
      }

      .vf-runs__meta {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .vf-runs__meta > span {
        margin: 0;
        color: var(--vf-text);
        font-weight: 900;
      }

      @media (max-width: 640px) {
        .vf-runs__row,
        .vf-runs__meta {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentRunsCardComponent {
  readonly recentRuns: readonly RecentRun[] = [
    {
      runId: "run_demo_001",
      title: "Sample receipt audit",
      workflow: "Receipt verification",
      status: "completed",
      confidence: 0.91,
      createdAt: "2026-04-26T08:00:00.000Z"
    },
    {
      runId: "run_demo_002",
      title: "Delivery package photo",
      workflow: "Package evidence",
      status: "queued",
      confidence: 0.72,
      createdAt: "2026-04-26T08:08:00.000Z"
    },
    {
      runId: "run_demo_003",
      title: "Treadmill display capture",
      workflow: "Device display",
      status: "running",
      confidence: 0.84,
      createdAt: "2026-04-26T08:16:00.000Z"
    }
  ];

  statusVariant(status: AnalysisStatus): AppBadgeVariant {
    switch (status) {
      case "completed":
        return "success";
      case "running":
        return "info";
      case "queued":
        return "neutral";
      case "failed":
        return "danger";
      case "cancelled":
        return "warning";
    }
  }
}
