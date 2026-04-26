import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), "utf-8")) as T;
}

function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true
  });

  addFormats(ajv);
  return ajv;
}

describe("golden contract fixtures", () => {
  it("validates sample analysis result against the analysis result schema", () => {
    const schema = readJson<Record<string, unknown>>(
      "packages/contracts/schemas/analysis-result.schema.json"
    );

    const fixture = readJson<Record<string, unknown>>(
      "packages/shared-fixtures/analysis/sample-analysis-result.json"
    );

    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(fixture);

    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });

  it("validates embedded audit receipt against the audit receipt schema", () => {
    const schema = readJson<Record<string, unknown>>(
      "packages/contracts/schemas/audit-receipt.schema.json"
    );

    const fixture = readJson<{ auditReceipt: Record<string, unknown> }>(
      "packages/shared-fixtures/analysis/sample-analysis-result.json"
    );

    const ajv = createAjv();
    const validate = ajv.compile(schema);
    const valid = validate(fixture.auditReceipt);

    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});
