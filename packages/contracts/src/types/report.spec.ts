import { describe, expect, it } from "vitest";
import type { EvidenceMap, ExportFormat } from "./report";

describe("report contracts", () => {
  it("defines supported export formats", () => {
    const formats: readonly ExportFormat[] = [
      "json",
      "html",
      "evidence_map",
      "audit_receipt"
    ];

    expect(formats).toContain("json");
    expect(formats).toContain("audit_receipt");
  });

  it("accepts a valid evidence map", () => {
    const map: EvidenceMap = {
      schemaVersion: "1.0.0",
      runId: "run_001",
      imageId: "img_001",
      width: 1280,
      height: 720,
      generatedAt: "2026-04-26T00:00:00.000Z",
      regions: [
        {
          regionId: "reg_001",
          label: "display panel",
          bbox: {
            x: 100,
            y: 100,
            width: 300,
            height: 120
          },
          confidence: 0.91,
          evidenceRefs: ["overlay:reg_001"]
        }
      ]
    };

    expect(map.regions[0]?.label).toBe("display panel");
  });
});
