import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import { AnalysisStore } from "./state/analysis.store";

const sampleResult: any = {
  schemaVersion: "1.0.0",
  runId: "run_1",
  requestId: "req_1",
  status: "completed",
  createdAt: "2026-04-26T00:00:00Z",
  completedAt: "2026-04-26T00:00:00Z",
  image: {
    imageId: "img_1",
    fileName: "receipt.jpg",
    sha256: "a".repeat(64),
    mimeType: "image/jpeg",
    width: 640,
    height: 480,
    sizeBytes: 100,
    exifPresent: false
  },
  modelInfo: [],
  qualityReport: {
    blurScore: 100,
    brightness: 0.5,
    contrast: 0.3,
    glareRisk: "none",
    resolutionAdequate: true,
    warnings: []
  },
  regions: [
    {
      regionId: "reg_1",
      label: "price_label",
      category: "price_label",
      confidence: 0.9,
      bbox: { x: 10, y: 20, width: 100, height: 40 },
      mask: null,
      sourceModelId: "test",
      rationale: "test",
      reviewStatus: "unreviewed"
    }
  ],
  findings: [
    {
      findingId: "find_1",
      title: "Info",
      description: "Info finding",
      severity: "info",
      confidence: 1,
      regionIds: [],
      evidenceRefs: [],
      recommendation: "Review"
    },
    {
      findingId: "find_2",
      title: "High",
      description: "High finding",
      severity: "high",
      confidence: 0.9,
      regionIds: ["reg_1"],
      evidenceRefs: [],
      recommendation: "Review"
    }
  ],
  auditReceipt: {
    schemaVersion: "1.0.0",
    receiptId: "receipt_1",
    runId: "run_1",
    generatedAt: "2026-04-26T00:00:00Z",
    inputHash: "a".repeat(64),
    resultHash: "b".repeat(64),
    configHash: "c".repeat(64),
    modelRefs: [],
    artifactHashes: [],
    signature: {
      algorithm: "sha256-local-integrity",
      value: "d".repeat(64)
    }
  },
  warnings: []
};

describe("AnalysisStore", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("sets result and selects first region", () => {
    TestBed.configureTestingModule({
      providers: [AnalysisStore]
    });

    const store = TestBed.inject(AnalysisStore);
    store.setResult(sampleResult);

    expect(store.result()?.runId).toBe("run_1");
    expect(store.selectedRegionId()).toBe("reg_1");
    expect(store.selectedRegion()?.label).toBe("price_label");
  });

  it("filters findings by severity", () => {
    TestBed.configureTestingModule({
      providers: [AnalysisStore]
    });

    const store = TestBed.inject(AnalysisStore);
    store.setResult(sampleResult);
    store.setSeverityFilter("high");

    expect(store.filteredFindings()).toHaveLength(1);
    expect(store.filteredFindings()[0]?.severity).toBe("high");
  });

  it("clears state", () => {
    TestBed.configureTestingModule({
      providers: [AnalysisStore]
    });

    const store = TestBed.inject(AnalysisStore);
    store.setResult(sampleResult);
    store.clear();

    expect(store.result()).toBeNull();
    expect(store.selectedRegion()).toBeNull();
    expect(store.severityFilter()).toBe("all");
  });
});
