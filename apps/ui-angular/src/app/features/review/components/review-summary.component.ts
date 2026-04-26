import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";

@Component({
  selector: "vf-review-summary",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["correctionCount", "reviewedFindingCount", "unresolvedFindingCount", "unsavedCount"],
  template: `
    <section class="vf-review-summary">
      <div>
        <span>{{ correctionCount }}</span>
        <p>Corrections</p>
      </div>
      <div>
        <span>{{ reviewedFindingCount }}</span>
        <p>Reviewed findings</p>
      </div>
      <div>
        <span>{{ unresolvedFindingCount }}</span>
        <p>Unresolved</p>
      </div>
      <vf-badge [variant]="unsavedCount > 0 ? 'warning' : 'success'">
        {{ unsavedCount }} unsaved
      </vf-badge>
    </section>
  `,
  styles: [
    `
      .vf-review-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-surface);
        padding: 16px;
      }

      span {
        display: block;
        font-size: 28px;
        font-weight: 950;
        letter-spacing: -0.06em;
      }

      p {
        margin: 4px 0 0;
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      @media (max-width: 840px) {
        .vf-review-summary {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewSummaryComponent {
  correctionCount = 0;
  reviewedFindingCount = 0;
  unresolvedFindingCount = 0;
  unsavedCount = 0;
}
