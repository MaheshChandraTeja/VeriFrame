import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NativeError } from "./native-error.model";
import { TAURI_INVOKE, TauriService, type TauriInvoke } from "./tauri.service";

describe("TauriService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("invokes typed Tauri commands through the injected invoke function", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      running: false
    });

    TestBed.configureTestingModule({
      providers: [
        TauriService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(TauriService);
    const result = await service.invoke<{ running: boolean }>("engine_status");

    expect(result.running).toBe(false);
    expect(invoke).toHaveBeenCalledWith("engine_status", undefined);
  });

  it("normalizes thrown native errors", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockRejectedValue({
      code: "ENGINE_UNAVAILABLE",
      message: "Engine stopped."
    });

    TestBed.configureTestingModule({
      providers: [
        TauriService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(TauriService);

    await expect(service.invoke("start_engine")).rejects.toEqual({
      code: "ENGINE_UNAVAILABLE",
      message: "Engine stopped."
    } satisfies NativeError);
  });

  it("returns null from invokeOrNull when native command fails", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockRejectedValue(
      new Error("No shell today.")
    );

    TestBed.configureTestingModule({
      providers: [
        TauriService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(TauriService);
    const result = await service.invokeOrNull("engine_status");

    expect(result).toBeNull();
  });
});
