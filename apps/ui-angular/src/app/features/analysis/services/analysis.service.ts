import { Injectable, inject } from "@angular/core";
import type { AnalysisRequest, AnalysisResult } from "@veriframe/contracts";

import { TauriService } from "../../../core/native/tauri.service";

export interface AnalysisProgress {
  readonly runId: string;
  readonly status: "queued" | "running" | "completed" | "failed" | "cancelled";
  readonly percent: number;
  readonly message: string;
  readonly updatedAt?: string;
}

@Injectable({
  providedIn: "root"
})
export class AnalysisService {
  private readonly tauri = inject(TauriService);

  submitAnalysisRequest(request: AnalysisRequest): Promise<AnalysisResult> {
    return this.tauri.invoke<AnalysisResult>("submit_analysis_request", {
      request
    });
  }

  loadAnalysisResult(runId: string): Promise<AnalysisResult> {
    return this.tauri.invoke<AnalysisResult>("load_analysis_result", {
      runId
    });
  }

  getAnalysisProgress(runId: string): Promise<AnalysisProgress> {
    return this.tauri.invoke<AnalysisProgress>("get_analysis_progress", {
      runId
    });
  }

  cancelAnalysis(runId: string): Promise<AnalysisProgress> {
    return this.tauri.invoke<AnalysisProgress>("cancel_analysis", {
      runId
    });
  }
}
