import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import type { DetectedRegion, Finding } from "@veriframe/contracts";

import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { AnnotationCanvasComponent, RegionBoxUpdate } from "./components/annotation-canvas.component";
import { FindingReviewControlsComponent } from "./components/finding-review-controls.component";
import { LabelEditorComponent } from "./components/label-editor.component";
import { ReviewSummaryComponent } from "./components/review-summary.component";
import {
  createFindingReview,
  createRegionCorrection,
  FindingDecision,
  ReviewService
} from "./services/review.service";
import { ReviewStore } from "./state/review.store";

@Component({
  selector: "vf-review-page",
  standalone: true,
  imports: [
    AppButtonComponent,
    AppCardComponent,
    AnnotationCanvasComponent,
    FindingReviewControlsComponent,
    LabelEditorComponent,
    ReviewSummaryComponent
  ],
  template: `
    <section class="vf-review-page">
      <div class="vf-review-page__hero">
        <div>
          <span>Review workspace</span>
          <h2>Human review and correction.</h2>
          <p>
            Correct boxes and labels, review findings, and export local training datasets.
          </p>
        </div>

        <div class="vf-review-page__actions">
          <vf-button variant="secondary" (clicked)="reload()">Reload</vf-button>
          <vf-button variant="primary" (clicked)="saveAll()">Save review</vf-button>
          <vf-button variant="ghost" (clicked)="exportDataset()">Export dataset</vf-button>
        </div>
      </div>

      @if (store.error()) {
        <p class="vf-review-page__message">{{ store.error() }}</p>
      }

      @if (store.savedMessage()) {
        <p class="vf-review-page__message">{{ store.savedMessage() }}</p>
      }

      <vf-review-summary
        [correctionCount]="store.correctionCount()"
        [reviewedFindingCount]="store.reviewedFindingCount()"
        [unresolvedFindingCount]="store.session()?.unresolvedFindingCount ?? 0"
        [unsavedCount]="store.unsavedCount()"
      />

      <div class="vf-review-page__toolbar">
        @for (mode of modes; track mode) {
          <button type="button" [class.is-active]="store.editMode() === mode" (click)="store.setEditMode(mode)">
            {{ mode }}
          </button>
        }
      </div>

      <div class="vf-review-page__layout">
        <div class="vf-review-page__main">
          <vf-annotation-canvas
            [regions]="store.regions()"
            [selectedRegionId]="store.selectedRegionId()"
            [imageWidth]="store.result()?.image?.width ?? 1"
            [imageHeight]="store.result()?.image?.height ?? 1"
            [editMode]="store.editMode()"
            (regionSelected)="store.selectRegion($event)"
            (regionMoved)="onRegionMoved($event)"
            (regionDeleted)="deleteRegion($event)"
          />

          <vf-card title="Finding decisions" subtitle="Mark findings as valid, false positive, needs review, or ignored.">
            <vf-finding-review-controls
              [findings]="store.result()?.findings ?? []"
              (reviewed)="reviewFinding($event.finding, $event.decision)"
            />
          </vf-card>
        </div>

        <aside class="vf-review-page__side">
          <vf-label-editor
            [region]="store.selectedRegion()"
            (labelChanged)="changeLabel($event)"
          />
        </aside>
      </div>
    </section>
  `,
  styleUrl: "./review.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly reviewService = inject(ReviewService);

  readonly store = inject(ReviewStore);
  readonly runId = computed(() => this.route.snapshot.paramMap.get("runId"));
  readonly modes = ["select", "move", "resize", "draw", "delete"] as const;

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const runId = this.runId();

    if (!runId) {
      this.store.error.set("No run id was provided.");
      return;
    }

    this.store.loading.set(true);

    try {
      const response = await this.reviewService.getReviewSession(runId);
      this.store.load(response.result, response.session);
    } catch (error) {
      this.store.error.set(error instanceof Error ? error.message : "Unable to load review session.");
    } finally {
      this.store.loading.set(false);
    }
  }

  onRegionMoved(update: RegionBoxUpdate): void {
    const corrected = {
      ...update.region,
      bbox: update.bbox,
      reviewStatus: "corrected"
    } as DetectedRegion;

    this.queueRegionCorrection(update.region, corrected);
  }

  changeLabel(label: string): void {
    const selected = this.store.selectedRegion();

    if (!selected) {
      return;
    }

    const corrected = {
      ...selected,
      label,
      reviewStatus: "corrected"
    } as DetectedRegion;

    this.queueRegionCorrection(selected, corrected);
  }

  deleteRegion(region: DetectedRegion): void {
    const corrected = {
      ...region,
      reviewStatus: "rejected"
    } as DetectedRegion;
    const correction = createRegionCorrection({
      runId: this.runId() ?? "",
      originalRegion: region,
      correctedRegion: corrected,
      notes: "Region marked for deletion."
    });
    this.store.queueCorrection({ ...correction, action: "delete" });
  }

  reviewFinding(finding: Finding, decision: FindingDecision): void {
    const runId = this.runId();

    if (!runId) {
      return;
    }

    this.store.queueFindingReview(
      createFindingReview({
        runId,
        finding,
        decision
      })
    );
  }

  async saveAll(): Promise<void> {
    const runId = this.runId();

    if (!runId) {
      return;
    }

    const corrections = [...this.store.pendingCorrections()];
    const reviews = [...this.store.pendingFindingReviews()];

    if (corrections.length === 0 && reviews.length === 0) {
      this.store.savedMessage.set("No review changes to save.");
      return;
    }

    try {
      for (const correction of corrections) {
        await this.reviewService.saveRegionCorrection(runId, correction);
      }
      for (const review of reviews) {
        await this.reviewService.saveFindingReview(runId, review);
      }
      this.store.markSaved(corrections, reviews);
    } catch (error) {
      this.store.error.set(error instanceof Error ? error.message : "Unable to save review changes.");
    }
  }

  async exportDataset(): Promise<void> {
    const runId = this.runId();

    if (!runId) {
      return;
    }

    if (this.store.unsavedCount() > 0) {
      await this.saveAll();
    }

    try {
      const result = await this.reviewService.exportDataset(runId);
      this.store.savedMessage.set(`Dataset exported: ${result.datasetPath}`);
    } catch (error) {
      this.store.error.set(error instanceof Error ? error.message : "Unable to export dataset.");
    }
  }

  private queueRegionCorrection(original: DetectedRegion, corrected: DetectedRegion): void {
    const runId = this.runId();

    if (!runId) {
      return;
    }

    this.store.queueCorrection(
      createRegionCorrection({
        runId,
        originalRegion: original,
        correctedRegion: corrected
      })
    );
  }
}
