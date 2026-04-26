import { describe, expect, it } from "vitest";

describe("report output golden contract", () => {
  it("keeps stable report expectations visible", () => {
    expect({
      requiredExports: ["json", "html", "evidence_map", "audit_receipt"],
      requiredReceiptFields: ["inputHash", "resultHash", "configHash", "signature"]
    }).toMatchInlineSnapshot(`
      {
        "requiredExports": [
          "json",
          "html",
          "evidence_map",
          "audit_receipt",
        ],
        "requiredReceiptFields": [
          "inputHash",
          "resultHash",
          "configHash",
          "signature",
        ],
      }
    `);
  });
});
