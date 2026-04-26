import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import type { AnalysisResult, DetectedRegion } from "@veriframe/contracts";

@Component({
  selector: "vf-evidence-viewer",
  standalone: true,
  inputs: ["result", "selectedRegionId"],
  outputs: ["regionSelected"],
  template: `
    <section class="vf-evidence-viewer">
      @if (result) {
        <div class="vf-evidence-viewer__canvas">
          <svg
            [attr.viewBox]="'0 0 ' + result.image.width + ' ' + result.image.height"
            role="img"
            [attr.aria-label]="'Evidence overlay for ' + result.image.fileName"
          >
            <rect
              x="0"
              y="0"
              [attr.width]="result.image.width"
              [attr.height]="result.image.height"
              rx="12"
            />

            @for (region of result.regions; track region.regionId) {
              <g
                class="vf-evidence-viewer__region"
                [class.vf-evidence-viewer__region--selected]="region.regionId === selectedRegionId"
                (click)="regionSelected.emit(region.regionId)"
              >
                <rect
                  [attr.x]="region.bbox.x"
                  [attr.y]="region.bbox.y"
                  [attr.width]="region.bbox.width"
                  [attr.height]="region.bbox.height"
                />
                <text
                  [attr.x]="region.bbox.x + 6"
                  [attr.y]="region.bbox.y + 18"
                >
                  {{ region.label }} · {{ displayConfidence(region) }}
                </text>
              </g>
            }
          </svg>
        </div>
      } @else {
        <div class="vf-evidence-viewer__empty">
          No analysis result loaded.
        </div>
      }
    </section>
  `,
  styles: [
    `
      .vf-evidence-viewer {
        overflow: hidden;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-bg-elevated);
      }

      .vf-evidence-viewer__canvas {
        padding: 14px;
      }

      svg {
        display: block;
        width: 100%;
        max-height: 620px;
        border-radius: var(--vf-radius-lg);
        background:
          linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
          linear-gradient(-45deg, rgba(255,255,255,0.05) 25%, transparent 25%),
          #05070d;
        background-size: 24px 24px;
      }

      svg > rect {
        fill: rgba(255, 255, 255, 0.035);
        stroke: rgba(255, 255, 255, 0.08);
      }

      .vf-evidence-viewer__region {
        cursor: pointer;
      }

      .vf-evidence-viewer__region rect {
        fill: rgba(56, 189, 248, 0.10);
        stroke: rgb(56, 189, 248);
        stroke-width: 3;
        vector-effect: non-scaling-stroke;
      }

      .vf-evidence-viewer__region text {
        fill: white;
        font-size: 14px;
        font-weight: 800;
        paint-order: stroke;
        stroke: rgba(0, 0, 0, 0.78);
        stroke-width: 4px;
      }

      .vf-evidence-viewer__region--selected rect {
        fill: rgba(74, 222, 128, 0.16);
        stroke: rgb(74, 222, 128);
        stroke-width: 5;
      }

      .vf-evidence-viewer__empty {
        display: grid;
        min-height: 320px;
        place-items: center;
        color: var(--vf-text-muted);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EvidenceViewerComponent {
  result: AnalysisResult | null = null;
  selectedRegionId: string | null = null;
  readonly regionSelected = new EventEmitter<string>();

  displayConfidence(region: DetectedRegion): string {
    return `${Math.round(region.confidence * 100)}%`;
  }
}
