import { ChangeDetectionStrategy, Component } from "@angular/core";
import type { ImageQualityReport } from "@veriframe/contracts";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";
import { AppProgressRingComponent } from "../../../shared/ui/progress-ring/app-progress-ring.component";

@Component({
  selector: "vf-quality-panel",
  standalone: true,
  imports: [AppBadgeComponent, AppProgressRingComponent],
  inputs: ["quality"],
  template: `
    <section class="vf-quality-panel">
      @if (quality) {
        <header>
          <h2>Image quality</h2>
          <vf-badge [variant]="quality.resolutionAdequate ? 'success' : 'warning'">
            {{ quality.resolutionAdequate ? 'adequate' : 'review' }}
          </vf-badge>
        </header>

        <div class="vf-quality-panel__rings">
          <vf-progress-ring [value]="quality.brightness * 100" label="Bright" />
          <vf-progress-ring [value]="quality.contrast * 100" label="Contrast" />
          <vf-progress-ring [value]="blurDisplayValue" label="Sharp" />
        </div>

        <p>Glare risk: <strong>{{ quality.glareRisk }}</strong></p>

        @if (quality.warnings.length > 0) {
          <ul>
            @for (warning of quality.warnings; track warning) {
              <li>{{ warning }}</li>
            }
          </ul>
        }
      } @else {
        <p>No quality report loaded.</p>
      }
    </section>
  `,
  styles: [
    `
      .vf-quality-panel {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-surface);
        padding: 16px;
      }

      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      h2 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.04em;
      }

      .vf-quality-panel__rings {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
      }

      p,
      li {
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      ul {
        margin-bottom: 0;
        padding-left: 18px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QualityPanelComponent {
  quality: ImageQualityReport | null = null;

  get blurDisplayValue(): number {
    if (!this.quality) {
      return 0;
    }

    return Math.max(0, Math.min(100, this.quality.blurScore / 2));
  }
}
