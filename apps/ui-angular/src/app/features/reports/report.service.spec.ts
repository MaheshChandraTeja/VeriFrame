import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TAURI_INVOKE, type TauriInvoke } from "../../core/native/tauri.service";
import { ReportService } from "./services/report.service";

describe("ReportService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("lists reports through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      reports: []
    });

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(ReportService);
    const result = await service.listReports();

    expect(result.reports).toEqual([]);
    expect(invoke).toHaveBeenCalledWith("list_reports", undefined);
  });

  it("exports html reports through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      runId: "run_1",
      format: "html",
      path: "report.html",
      sha256: "a".repeat(64),
      sizeBytes: 10
    });

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(ReportService);
    const result = await service.exportReport("run_1", "html");

    expect(result.format).toBe("html");
    expect(invoke).toHaveBeenCalledWith("export_report_html", {
      runId: "run_1"
    });
  });

  it("exports audit receipts through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      runId: "run_1",
      format: "audit_receipt",
      path: "audit-receipt.json",
      sha256: "b".repeat(64),
      sizeBytes: 10
    });

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(ReportService);
    const result = await service.exportReport("run_1", "audit_receipt");

    expect(result.format).toBe("audit_receipt");
    expect(invoke).toHaveBeenCalledWith("export_audit_receipt", {
      runId: "run_1"
    });
  });
});
