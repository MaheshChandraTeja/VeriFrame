import { computed, Injectable, signal } from "@angular/core";
import type { AnalysisResult, DetectedRegion } from "@veriframe/contracts";

import type { FindingReview, RegionCorrection, ReviewSession } from "../services/review.service";

export type ReviewEditMode = "select" | "move" | "resize" | "draw" | "delete";

@Injectable({
  providedIn: "root"
})
export class ReviewStore {
  readonly result = signal<AnalysisResult | null>(null);
  readonly session = signal<ReviewSession | null>(null);
  readonly selectedRegionId = signal<string | null>(null);
  readonly editMode = signal<ReviewEditMode>("select");
  readonly pendingCorrections = signal<readonly RegionCorrection[]>([]);
  readonly pendingFindingReviews = signal<readonly FindingReview[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly savedMessage = signal<string | null>(null);

  readonly allCorrections = computed<readonly RegionCorrection[]>(() => [
    ...(this.session()?.corrections ?? []),
    ...this.pendingCorrections()
  ]);

  readonly allFindingReviews = computed<readonly FindingReview[]>(() => [
    ...(this.session()?.findingReviews ?? []),
    ...this.pendingFindingReviews()
  ]);

  readonly regions = computed<readonly DetectedRegion[]>(() => {
    const result = this.result();

    if (!result) {
      return [];
    }

    const byId = new Map(result.regions.map((region) => [region.regionId, region]));

    for (const correction of this.allCorrections()) {
      if (correction.action === "delete" && correction.regionId) {
        byId.delete(correction.regionId);
        continue;
      }

      byId.set(correction.correctedRegion.regionId, correction.correctedRegion);
    }

    return [...byId.values()].sort((left, right) => left.regionId.localeCompare(right.regionId));
  });

  readonly selectedRegion = computed<DetectedRegion | null>(() => {
    const selected = this.selectedRegionId();
    return selected ? this.regions().find((region) => region.regionId === selected) ?? null : null;
  });

  readonly correctionCount = computed(() => this.allCorrections().length);
  readonly reviewedFindingCount = computed(() => this.allFindingReviews().length);
  readonly unsavedCount = computed(() => this.pendingCorrections().length + this.pendingFindingReviews().length);

  load(result: AnalysisResult, session: ReviewSession): void {
    this.result.set(result);
    this.session.set(session);
    this.pendingCorrections.set([]);
    this.pendingFindingReviews.set([]);
    this.selectedRegionId.set(result.regions[0]?.regionId ?? null);
    this.error.set(null);
  }

  selectRegion(regionId: string | null): void {
    this.selectedRegionId.set(regionId);
  }

  setEditMode(mode: ReviewEditMode): void {
    this.editMode.set(mode);
  }

  queueCorrection(correction: RegionCorrection): void {
    this.pendingCorrections.set([...this.pendingCorrections(), correction]);
    this.selectedRegionId.set(correction.correctedRegion.regionId);
  }

  queueFindingReview(review: FindingReview): void {
    this.pendingFindingReviews.set([...this.pendingFindingReviews(), review]);
  }

  markSaved(savedCorrections: readonly RegionCorrection[], savedReviews: readonly FindingReview[]): void {
    const session = this.session();

    if (!session) {
      return;
    }

    this.session.set({
      ...session,
      corrections: [...session.corrections, ...savedCorrections],
      findingReviews: [...session.findingReviews, ...savedReviews],
      correctionCount: session.correctionCount + savedCorrections.length,
      findingReviewCount: session.findingReviewCount + savedReviews.length,
      unresolvedFindingCount: Math.max(0, session.unresolvedFindingCount - savedReviews.length)
    });
    this.pendingCorrections.set([]);
    this.pendingFindingReviews.set([]);
    this.savedMessage.set("Review changes saved locally.");
  }

  clear(): void {
    this.result.set(null);
    this.session.set(null);
    this.selectedRegionId.set(null);
    this.editMode.set("select");
    this.pendingCorrections.set([]);
    this.pendingFindingReviews.set([]);
    this.loading.set(false);
    this.error.set(null);
    this.savedMessage.set(null);
  }
}
