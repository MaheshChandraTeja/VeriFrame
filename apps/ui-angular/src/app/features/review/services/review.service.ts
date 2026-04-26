import { Injectable, inject } from "@angular/core";
import type { AnalysisResult, DetectedRegion, Finding } from "@veriframe/contracts";

import { TauriService } from "../../../core/native/tauri.service";

export type RegionCorrectionAction = "add" | "update" | "delete";
export type FindingDecision = "valid" | "false_positive" | "needs_review" | "ignored";

export interface RegionCorrection {
  readonly correctionId: string;
  readonly runId: string;
  readonly regionId: string | null;
  readonly action: RegionCorrectionAction;
  readonly originalRegion: DetectedRegion | null;
  readonly correctedRegion: DetectedRegion;
  readonly labelCorrection: {
    readonly before: string | null;
    readonly after: string;
  } | null;
  readonly boxCorrection: {
    readonly before: DetectedRegion["bbox"] | null;
    readonly after: DetectedRegion["bbox"];
  } | null;
  readonly maskCorrection: null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FindingReview {
  readonly reviewId: string;
  readonly runId: string;
  readonly findingId: string;
  readonly decision: FindingDecision;
  readonly notes: string | null;
  readonly reviewer: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReviewSession {
  readonly runId: string;
  readonly corrections: readonly RegionCorrection[];
  readonly findingReviews: readonly FindingReview[];
  readonly correctionCount: number;
  readonly findingReviewCount: number;
  readonly unresolvedFindingCount: number;
}

export interface ReviewSessionResponse {
  readonly runId: string;
  readonly result: AnalysisResult;
  readonly session: ReviewSession;
}

export interface DatasetExportResponse {
  readonly exportId: string;
  readonly runId: string;
  readonly datasetPath: string;
  readonly annotationPath: string;
  readonly imagePath: string | null;
  readonly correctionCount: number;
  readonly findingReviewCount: number;
  readonly sha256: string;
  readonly createdAt: string;
}

@Injectable({
  providedIn: "root"
})
export class ReviewService {
  private readonly tauri = inject(TauriService);

  getReviewSession(runId: string): Promise<ReviewSessionResponse> {
    return this.tauri.invoke<ReviewSessionResponse>("get_review_session", { runId });
  }

  saveRegionCorrection(runId: string, correction: RegionCorrection): Promise<{ ok: boolean }> {
    return this.tauri.invoke<{ ok: boolean }>("save_region_correction", {
      request: {
        runId,
        correction
      }
    });
  }

  saveFindingReview(runId: string, review: FindingReview): Promise<{ ok: boolean }> {
    return this.tauri.invoke<{ ok: boolean }>("save_finding_review", {
      request: {
        runId,
        review
      }
    });
  }

  exportDataset(runId: string): Promise<DatasetExportResponse> {
    return this.tauri.invoke<DatasetExportResponse>("export_review_dataset", { runId });
  }
}

export function createRegionCorrection(params: {
  runId: string;
  originalRegion: DetectedRegion;
  correctedRegion: DetectedRegion;
  notes?: string | null;
}): RegionCorrection {
  const now = new Date().toISOString();

  return {
    correctionId: createId("corr"),
    runId: params.runId,
    regionId: params.originalRegion.regionId,
    action: "update",
    originalRegion: params.originalRegion,
    correctedRegion: params.correctedRegion,
    labelCorrection:
      params.originalRegion.label !== params.correctedRegion.label
        ? { before: params.originalRegion.label, after: params.correctedRegion.label }
        : null,
    boxCorrection:
      JSON.stringify(params.originalRegion.bbox) !== JSON.stringify(params.correctedRegion.bbox)
        ? { before: params.originalRegion.bbox, after: params.correctedRegion.bbox }
        : null,
    maskCorrection: null,
    notes: params.notes ?? null,
    createdAt: now,
    updatedAt: now
  };
}

export function createFindingReview(params: {
  runId: string;
  finding: Finding;
  decision: FindingDecision;
  notes?: string | null;
}): FindingReview {
  const now = new Date().toISOString();

  return {
    reviewId: createId("fr"),
    runId: params.runId,
    findingId: params.finding.findingId,
    decision: params.decision,
    notes: params.notes ?? null,
    reviewer: null,
    createdAt: now,
    updatedAt: now
  };
}

function createId(prefix: string): string {
  const randomId =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().replaceAll("-", "")
      : Math.random().toString(16).slice(2);

  return `${prefix}_${randomId}`;
}
