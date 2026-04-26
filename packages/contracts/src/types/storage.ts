import type { AnalysisStatus, FindingSeverity } from "./analysis";
import type { ExportFormat } from "./report";

export type AuditLogLevel = "trace" | "debug" | "info" | "warn" | "error";

export interface StoredAnalysisRun {
  readonly runId: string;
  readonly requestId: string;
  readonly status: AnalysisStatus;
  readonly workflow: string;
  readonly imageId: string;
  readonly createdAt: string;
  readonly completedAt?: string;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface StoredImageRecord {
  readonly imageId: string;
  readonly fileName: string;
  readonly sourcePath: string;
  readonly sha256: string;
  readonly mimeType: string;
  readonly width: number;
  readonly height: number;
  readonly sizeBytes: number;
  readonly importedAt: string;
}

export interface StoredModelRegistryEntry {
  readonly modelId: string;
  readonly name: string;
  readonly version: string;
  readonly task: "classification" | "detection" | "segmentation";
  readonly framework: "torchvision";
  readonly configPath: string;
  readonly checkpointPath?: string;
  readonly configHash: string;
  readonly checkpointHash?: string;
  readonly enabled: boolean;
}

export interface StoredReportArtifact {
  readonly artifactId: string;
  readonly runId: string;
  readonly format: ExportFormat;
  readonly path: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export interface AuditLogEntry {
  readonly entryId: string;
  readonly level: AuditLogLevel;
  readonly eventType: string;
  readonly message: string;
  readonly runId?: string;
  readonly context?: Record<string, unknown>;
  readonly createdAt: string;
}

export interface FindingIndexRecord {
  readonly findingId: string;
  readonly runId: string;
  readonly severity: FindingSeverity;
  readonly confidence: number;
  readonly title: string;
}
