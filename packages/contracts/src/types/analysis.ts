export type RequestedWorkflow =
  | "visual_audit"
  | "receipt_verification"
  | "package_evidence"
  | "device_display"
  | "screenshot_review";

export type AnalysisTask =
  | "quality"
  | "detection"
  | "segmentation"
  | "classification"
  | "evidence_overlay";

export type AnalysisStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type FindingSeverity =
  | "info"
  | "low"
  | "medium"
  | "high"
  | "critical";

export interface AnalysisSource {
  readonly type: "image_file";
  readonly path: string;
  readonly sha256?: string;
}

export interface AnalysisRequest {
  readonly schemaVersion: "1.0.0";
  readonly requestId: string;
  readonly source: AnalysisSource;
  readonly workflow: RequestedWorkflow;
  readonly requestedTasks: readonly AnalysisTask[];
  readonly modelProfileIds: readonly string[];
  readonly options: {
    readonly confidenceThreshold: number;
    readonly maxImageSizePx: number;
    readonly includeExif: boolean;
    readonly exportArtifacts: boolean;
  };
  readonly createdAt: string;
}

export interface ImageMetadata {
  readonly imageId: string;
  readonly fileName: string;
  readonly sha256: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly exifPresent: boolean;
}

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SegmentationMask {
  readonly format: "polygon" | "rle";
  readonly points?: readonly (readonly [number, number])[];
  readonly rle?: {
    readonly counts: readonly number[];
    readonly size: readonly [number, number];
  };
}

export interface DetectedRegion {
  readonly regionId: string;
  readonly label: string;
  readonly category:
    | "receipt_header"
    | "line_item_block"
    | "price_label"
    | "product_package"
    | "damage_zone"
    | "display_panel"
    | "sensitive_region"
    | "unknown";
  readonly confidence: number;
  readonly bbox: BoundingBox;
  readonly mask?: SegmentationMask;
  readonly sourceModelId: string;
  readonly rationale: string;
  readonly reviewStatus: "unreviewed" | "accepted" | "corrected" | "rejected";
}

export interface ImageQualityReport {
  readonly blurScore: number;
  readonly brightness: number;
  readonly contrast: number;
  readonly glareRisk: "none" | "low" | "medium" | "high";
  readonly resolutionAdequate: boolean;
  readonly warnings: readonly string[];
}

export interface ModelInfo {
  readonly modelId: string;
  readonly name: string;
  readonly version: string;
  readonly task: "classification" | "detection" | "segmentation";
  readonly framework: "torchvision";
  readonly device: "cpu" | "cuda" | "mps";
  readonly labels: readonly string[];
  readonly configHash: string;
  readonly checkpointHash?: string;
}

export interface Finding {
  readonly findingId: string;
  readonly title: string;
  readonly description: string;
  readonly severity: FindingSeverity;
  readonly confidence: number;
  readonly regionIds: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly recommendation: string;
}

export interface AuditReceipt {
  readonly schemaVersion: "1.0.0";
  readonly receiptId: string;
  readonly runId: string;
  readonly generatedAt: string;
  readonly inputHash: string;
  readonly resultHash: string;
  readonly configHash: string;
  readonly modelRefs: readonly {
    readonly modelId: string;
    readonly version: string;
    readonly configHash: string;
    readonly checkpointHash?: string;
  }[];
  readonly artifactHashes: readonly {
    readonly artifactId: string;
    readonly path: string;
    readonly sha256: string;
  }[];
  readonly signature: {
    readonly algorithm: "sha256-local-integrity";
    readonly value: string;
  };
}

export interface AnalysisResult {
  readonly schemaVersion: "1.0.0";
  readonly runId: string;
  readonly requestId: string;
  readonly status: AnalysisStatus;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly image: ImageMetadata;
  readonly modelInfo: readonly ModelInfo[];
  readonly qualityReport: ImageQualityReport;
  readonly regions: readonly DetectedRegion[];
  readonly findings: readonly Finding[];
  readonly auditReceipt: AuditReceipt;
  readonly warnings: readonly string[];
}
