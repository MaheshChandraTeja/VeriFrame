import { Injectable, inject } from "@angular/core";

import { TauriService } from "../../../core/native/tauri.service";

export type DoctorStatus = "pass" | "warn" | "fail";

export interface DiagnosticCheck {
  readonly checkId: string;
  readonly title: string;
  readonly status: DoctorStatus;
  readonly message: string;
  readonly details: Record<string, unknown>;
}

export interface DoctorChecksResponse {
  readonly checks: readonly DiagnosticCheck[];
}

export interface SystemInfo {
  readonly [key: string]: unknown;
}

export interface LogTailResponse {
  readonly lines: readonly string[];
  readonly path: string | null;
}

@Injectable({
  providedIn: "root"
})
export class DoctorService {
  private readonly tauri = inject(TauriService);

  collectChecks(): Promise<DoctorChecksResponse> {
    return this.tauri.invoke<DoctorChecksResponse>("collect_doctor_checks");
  }

  collectSystemInfo(): Promise<SystemInfo> {
    return this.tauri.invoke<SystemInfo>("collect_system_info");
  }

  getEngineLogTail(): Promise<LogTailResponse> {
    return this.tauri.invoke<LogTailResponse>("get_engine_log_tail");
  }

  checkEngine(): Promise<DiagnosticCheck> {
    return this.tauri.invoke<DiagnosticCheck>("check_engine");
  }

  checkDatabase(): Promise<DiagnosticCheck> {
    return this.tauri.invoke<DiagnosticCheck>("check_database");
  }

  checkModelPaths(): Promise<DiagnosticCheck> {
    return this.tauri.invoke<DiagnosticCheck>("check_model_paths");
  }

  checkStoragePermissions(): Promise<DiagnosticCheck> {
    return this.tauri.invoke<DiagnosticCheck>("check_storage_permissions");
  }
}
