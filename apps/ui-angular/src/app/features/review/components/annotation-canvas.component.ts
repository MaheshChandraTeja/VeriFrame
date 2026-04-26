import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import type { DetectedRegion } from "@veriframe/contracts";

export interface RegionBoxUpdate {
  readonly region: DetectedRegion;
  readonly bbox: DetectedRegion["bbox"];
}

@Component({
  selector: "vf-annotation-canvas",
  standalone: true,
  inputs: ["regions", "selectedRegionId", "imageWidth", "imageHeight", "editMode"],
  outputs: ["regionSelected", "regionMoved", "regionDeleted"],
  template: `
    <section class="vf-annotation-canvas">
      <svg
        [attr.viewBox]="'0 0 ' + imageWidth + ' ' + imageHeight"
        role="img"
        aria-label="Annotation canvas"
        (pointerup)="dragging = null"
        (pointerleave)="dragging = null"
        (pointermove)="onPointerMove($event)"
      >
        <rect class="vf-annotation-canvas__bg" x="0" y="0" [attr.width]="imageWidth" [attr.height]="imageHeight" />

        @for (region of regions; track region.regionId) {
          <g
            class="vf-annotation-canvas__region"
            [class.is-selected]="region.regionId === selectedRegionId"
            (pointerdown)="onRegionPointerDown($event, region)"
          >
            <rect
              [attr.x]="region.bbox.x"
              [attr.y]="region.bbox.y"
              [attr.width]="region.bbox.width"
              [attr.height]="region.bbox.height"
            />
            <text [attr.x]="region.bbox.x + 6" [attr.y]="region.bbox.y + 18">
              {{ region.label }}
            </text>
            <circle
              class="vf-annotation-canvas__handle"
              [attr.cx]="region.bbox.x + region.bbox.width"
              [attr.cy]="region.bbox.y + region.bbox.height"
              r="7"
              (pointerdown)="onResizePointerDown($event, region)"
            />
          </g>
        }
      </svg>

      <p>
        Mode: <strong>{{ editMode }}</strong>.
        Drag selected boxes to move. Drag bottom-right handle to resize. Use delete mode to remove.
      </p>
    </section>
  `,
  styles: [
    `
      .vf-annotation-canvas {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-bg-elevated);
        padding: 14px;
      }

      svg {
        display: block;
        width: 100%;
        max-height: 620px;
        border-radius: var(--vf-radius-lg);
        background: #05070d;
        touch-action: none;
      }

      .vf-annotation-canvas__bg {
        fill: rgba(255, 255, 255, 0.035);
      }

      .vf-annotation-canvas__region {
        cursor: grab;
      }

      .vf-annotation-canvas__region rect {
        fill: rgba(56, 189, 248, 0.1);
        stroke: rgb(56, 189, 248);
        stroke-width: 3;
        vector-effect: non-scaling-stroke;
      }

      .vf-annotation-canvas__region.is-selected rect {
        fill: rgba(74, 222, 128, 0.16);
        stroke: rgb(74, 222, 128);
        stroke-width: 5;
      }

      text {
        fill: white;
        font-size: 14px;
        font-weight: 900;
        paint-order: stroke;
        stroke: rgba(0, 0, 0, 0.8);
        stroke-width: 4px;
      }

      .vf-annotation-canvas__handle {
        fill: rgb(74, 222, 128);
        stroke: #020617;
        stroke-width: 3;
        cursor: nwse-resize;
      }

      p {
        margin: 12px 0 0;
        color: var(--vf-text-muted);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationCanvasComponent {
  regions: readonly DetectedRegion[] = [];
  selectedRegionId: string | null = null;
  imageWidth = 1;
  imageHeight = 1;
  editMode: "select" | "move" | "resize" | "draw" | "delete" = "select";

  readonly regionSelected = new EventEmitter<string>();
  readonly regionMoved = new EventEmitter<RegionBoxUpdate>();
  readonly regionDeleted = new EventEmitter<DetectedRegion>();

  dragging: {
    readonly mode: "move" | "resize";
    readonly region: DetectedRegion;
    readonly startX: number;
    readonly startY: number;
    readonly originalBox: DetectedRegion["bbox"];
  } | null = null;

  onRegionPointerDown(event: PointerEvent, region: DetectedRegion): void {
    event.stopPropagation();
    this.regionSelected.emit(region.regionId);

    if (this.editMode === "delete") {
      this.regionDeleted.emit(region);
      return;
    }

    if (this.editMode === "select") {
      return;
    }

    this.dragging = {
      mode: "move",
      region,
      startX: event.offsetX,
      startY: event.offsetY,
      originalBox: region.bbox
    };
  }

  onResizePointerDown(event: PointerEvent, region: DetectedRegion): void {
    event.stopPropagation();
    this.regionSelected.emit(region.regionId);

    this.dragging = {
      mode: "resize",
      region,
      startX: event.offsetX,
      startY: event.offsetY,
      originalBox: region.bbox
    };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }

    const scale = this.svgScale(event);
    const dx = (event.offsetX - this.dragging.startX) * scale.x;
    const dy = (event.offsetY - this.dragging.startY) * scale.y;
    const box = this.dragging.originalBox;

    const nextBox =
      this.dragging.mode === "move"
        ? {
            ...box,
            x: clamp(box.x + dx, 0, this.imageWidth - box.width),
            y: clamp(box.y + dy, 0, this.imageHeight - box.height)
          }
        : {
            ...box,
            width: clamp(box.width + dx, 4, this.imageWidth - box.x),
            height: clamp(box.height + dy, 4, this.imageHeight - box.y)
          };

    this.regionMoved.emit({
      region: this.dragging.region,
      bbox: nextBox
    });
  }

  private svgScale(event: PointerEvent): { x: number; y: number } {
    const target = event.currentTarget as SVGSVGElement | null;
    const bounds = target?.getBoundingClientRect();

    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: 1, y: 1 };
    }

    return {
      x: this.imageWidth / bounds.width,
      y: this.imageHeight / bounds.height
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
