import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TAURI_INVOKE, type TauriInvoke } from "../../core/native/tauri.service";
import { DoctorService } from "./services/doctor.service";

describe("DoctorService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("collects doctor checks through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      checks: []
    });

    TestBed.configureTestingModule({
      providers: [
        DoctorService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(DoctorService);
    const result = await service.collectChecks();

    expect(result.checks).toEqual([]);
    expect(invoke).toHaveBeenCalledWith("collect_doctor_checks", undefined);
  });

  it("collects system info through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      os: "Windows"
    });

    TestBed.configureTestingModule({
      providers: [
        DoctorService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(DoctorService);
    const result = await service.collectSystemInfo();

    expect(result["os"]).toBe("Windows");
    expect(invoke).toHaveBeenCalledWith("collect_system_info", undefined);
  });

  it("collects engine log tail through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      lines: ["hello"],
      path: "logs/veriframe.log"
    });

    TestBed.configureTestingModule({
      providers: [
        DoctorService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(DoctorService);
    const result = await service.getEngineLogTail();

    expect(result.lines).toEqual(["hello"]);
    expect(invoke).toHaveBeenCalledWith("get_engine_log_tail", undefined);
  });
});
