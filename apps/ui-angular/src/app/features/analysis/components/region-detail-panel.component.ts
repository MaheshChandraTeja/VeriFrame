import { ChangeDetectionStrategy, Component } from "@angular/core";
import type { DetectedRegion } from "@veriframe/contracts";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";

@Component({
  selector: "vf-region-detail-panel",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["region"],
  template: `
    <section class="vf-region-detail">
      @if (region) {
        <header>
          <h2>{{ region.label }}</h2>
          <vf-badge variant="info">{{ confidence(region.confidence) }}</vf-badge>
        </header>

        <dl>
          <div>
            <dt>Category</dt>
            <dd>{{ region.category }}</dd>
          </div>
          <div>
            <dt>Source model</dt>
            <dd>{{ region.sourceModelId }}</dd>
          </div>
          <div>
            <dt>Box</dt>
            <dd>
              x {{ number(region.bbox.x) }},
              y {{ number(region.bbox.y) }},
              w {{ number(region.bbox.width) }},
              h {{ number(region.bbox.height) }}
            </dd>
          </div>
          <div>
            <dt>Review status</dt>
            <dd>{{ region.reviewStatus }}</dd>
          </div>
        </dl>

        <p>{{ region.rationale }}</p>
      } @else {
        <p class="vf-region-detail__empty">Select a region to inspect details.</p>
      }
    </section>
  `,
  styles: [
    `
      .vf-region-detail {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-surface);
        padding: 16px;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }

      h2 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.04em;
      }

      dl {
        display: grid;
        gap: 10px;
        margin: 16px 0 0;
      }

      div {
        border-top: 1px solid var(--vf-border);
        padding-top: 10px;
      }

      dt {
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      dd {
        margin: 4px 0 0;
        color: var(--vf-text);
      }

      p {
        margin: 14px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      .vf-region-detail__empty {
        margin: 0;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegionDetailPanelComponent {
  region: DetectedRegion | null = null;

  confidence(value: number): string {
    return `${Math.round(value * 100)}%`;
  }

  number(value: number): string {
    return value.toFixed(1);
  }
}
