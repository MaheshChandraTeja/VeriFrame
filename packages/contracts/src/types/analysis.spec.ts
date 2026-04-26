import { describe, expect, it } from "vitest";
import type {
  AnalysisRequest,
  AnalysisResult,
  DetectedRegion,
  FindingSeverity
} from "./analysis";

describe("analysis contracts", () => {
  it("accepts a valid analysis request shape", () => {
    const request: AnalysisRequest = {
      schemaVersion: "1.0.0",
      requestId: "req_001",
      source: {
        type: "image_file",
        path: "fixtures/images/sample-receipt.jpg"
      },
      workflow: "visual_audit",
      requestedTasks: ["quality", "detection"],
      modelProfileIds: ["receipt-region-detector"],
      options: {
        confidenceThreshold: 0.5,
        maxImageSizePx: 2048,
        includeExif: false,
        exportArtifacts: true
      },
      createdAt: "2026-04-26T00:00:00.000Z"
    };

    expect(request.workflow).toBe("visual_audit");
    expect(request.requestedTasks).toContain("quality");
  });

  it("keeps finding severity as a stable finite union", () => {
    const severities: readonly FindingSeverity[] = [
      "info",
      "low",
      "medium",
      "high",
      "critical"
    ];

    expect(severities).toHaveLength(5);
  });

  it("supports detected regions with polygon masks", () => {
    const region: DetectedRegion = {
      regionId: "reg_001",
      label: "price label",
      category: "price_label",
      confidence: 0.94,
      bbox: {
        x: 10,
        y: 20,
        width: 100,
        height: 50
      },
      mask: {
        format: "polygon",
        points: [
          [10, 20],
          [110, 20],
          [110, 70],
          [10, 70]
        ]
      },
      sourceModelId: "receipt-region-detector",
      rationale: "Detected rectangular region likely containing price information.",
      reviewStatus: "unreviewed"
    };

    expect(region.mask?.format).toBe("polygon");
  });

  it("accepts the minimal completed analysis result contract", () => {
    const result: AnalysisResult = {
      schemaVersion: "1.0.0",
      runId: "run_001",
      requestId: "req_001",
      status: "completed",
      createdAt: "2026-04-26T00:00:00.000Z",
      completedAt: "2026-04-26T00:00:02.000Z",
      image: {
        imageId: "img_001",
        fileName: "sample-receipt.jpg",
        sha256: "a".repeat(64),
        mimeType: "image/jpeg",
        width: 1280,
        height: 720,
        sizeBytes: 1024,
        exifPresent: false
      },
      modelInfo: [],
      qualityReport: {
        blurScore: 0.12,
        brightness: 0.62,
        contrast: 0.71,
        glareRisk: "low",
        resolutionAdequate: true,
        warnings: []
      },
      regions: [],
      findings: [],
      auditReceipt: {
        schemaVersion: "1.0.0",
        receiptId: "receipt_001",
        runId: "run_001",
        generatedAt: "2026-04-26T00:00:02.000Z",
        inputHash: "b".repeat(64),
        resultHash: "c".repeat(64),
        configHash: "d".repeat(64),
        modelRefs: [],
        artifactHashes: [],
        signature: {
          algorithm: "sha256-local-integrity",
          value: "e".repeat(64)
        }
      },
      warnings: []
    };

    expect(result.status).toBe("completed");
  });
});
