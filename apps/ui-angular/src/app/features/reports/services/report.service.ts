import { Injectable, inject } from "@angular/core";

import { TauriService } from "../../../core/native/tauri.service";

export type ReportExportFormat = "json" | "html" | "evidence_map" | "audit_receipt";

export interface ReportSummary {
  readonly runId: string;
  readonly requestId: string;
  readonly status: string;
  readonly workflow: string;
  readonly sourcePath: string;
  readonly inputHash: string | null;
  readonly resultHash: string | null;
  readonly configHash: string | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
  readonly findingCount: number;
  readonly regionCount: number;
  readonly artifactCount: number;
}

export interface ReportListResponse {
  readonly reports: readonly ReportSummary[];
}

export interface ReportExportResponse {
  readonly runId: string;
  readonly format: ReportExportFormat;
  readonly path: string;
  readonly sha256: string;
  readonly sizeBytes: number;
}

export interface DeleteReportResponse {
  readonly ok: boolean;
  readonly runId: string;
  readonly deleted: Record<string, unknown>;
}

@Injectable({
  providedIn: "root"
})
export class ReportService {
  private readonly tauri = inject(TauriService);

  async listReports(): Promise<ReportListResponse> {
    const response = await this.tauri.invoke<ReportListResponse>("list_reports");

    return {
      reports: [...(response.reports ?? [])].sort((left, right) =>
        String(right.createdAt).localeCompare(String(left.createdAt))
      )
    };
  }

  exportReport(runId: string, format: ReportExportFormat): Promise<ReportExportResponse> {
    const command = commandForFormat(format);
    return this.tauri.invoke<ReportExportResponse>(command, { runId });
  }

  deleteReport(runId: string): Promise<DeleteReportResponse> {
    return this.tauri.invoke<DeleteReportResponse>("delete_report", { runId });
  }
}

function commandForFormat(format: ReportExportFormat): string {
  switch (format) {
    case "json":
      return "export_report_json";
    case "html":
      return "export_report_html";
    case "evidence_map":
      return "export_evidence_map";
    case "audit_receipt":
      return "export_audit_receipt";
  }
}
