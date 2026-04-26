import { describe, expect, it } from "vitest";
import type { AuditLogEntry, StoredAnalysisRun } from "./storage";

describe("storage contracts", () => {
  it("accepts a stored analysis run", () => {
    const run: StoredAnalysisRun = {
      runId: "run_001",
      requestId: "req_001",
      status: "completed",
      workflow: "visual_audit",
      imageId: "img_001",
      createdAt: "2026-04-26T00:00:00.000Z",
      completedAt: "2026-04-26T00:00:02.000Z"
    };

    expect(run.status).toBe("completed");
  });

  it("accepts structured audit logs", () => {
    const entry: AuditLogEntry = {
      entryId: "log_001",
      level: "info",
      eventType: "analysis.completed",
      message: "Analysis completed successfully.",
      runId: "run_001",
      context: {
        regionCount: 3
      },
      createdAt: "2026-04-26T00:00:02.000Z"
    };

    expect(entry.context?.["regionCount"]).toBe(3);
  });
});
