import type {
  AuditReceipt,
  DetectedRegion,
  Finding,
  ImageMetadata,
  ImageQualityReport,
  ModelInfo
} from "./analysis";

export type ExportFormat = "json" | "html" | "evidence_map" | "audit_receipt";

export interface ReportSection {
  readonly sectionId: string;
  readonly title: string;
  readonly summary: string;
  readonly findingIds: readonly string[];
}

export interface EvidenceMapRegion {
  readonly regionId: string;
  readonly label: string;
  readonly bbox: DetectedRegion["bbox"];
  readonly confidence: number;
  readonly evidenceRefs: readonly string[];
}

export interface EvidenceMap {
  readonly schemaVersion: "1.0.0";
  readonly runId: string;
  readonly imageId: string;
  readonly width: number;
  readonly height: number;
  readonly regions: readonly EvidenceMapRegion[];
  readonly generatedAt: string;
}

export interface VisualReport {
  readonly schemaVersion: "1.0.0";
  readonly reportId: string;
  readonly runId: string;
  readonly title: string;
  readonly generatedAt: string;
  readonly image: ImageMetadata;
  readonly qualityReport: ImageQualityReport;
  readonly models: readonly ModelInfo[];
  readonly sections: readonly ReportSection[];
  readonly findings: readonly Finding[];
  readonly evidenceMap: EvidenceMap;
  readonly auditReceipt: AuditReceipt;
}
