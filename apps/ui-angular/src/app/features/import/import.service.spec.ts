import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TAURI_INVOKE, type TauriInvoke } from "../../core/native/tauri.service";
import { detectImageSignature, extensionOf, ImportService } from "./services/import.service";

describe("ImportService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("extracts file extensions safely", () => {
    expect(extensionOf("sample.JPG")).toBe("jpg");
    expect(extensionOf("archive")).toBe("");
  });

  it("rejects fake jpg files by signature", async () => {
    const file = new File(["not an image, just lies"], "fake.jpg", {
      type: "image/jpeg"
    });

    expect(await detectImageSignature(file)).toBeNull();
  });

  it("accepts png signatures", async () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const file = new File([pngHeader], "sample.png", {
      type: "image/png"
    });

    expect(await detectImageSignature(file)).toBe("png");
  });

  it("calls Tauri for native image selection", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue([]);

    TestBed.configureTestingModule({
      providers: [
        ImportService,
        {
          provide: TAURI_INVOKE,
          useValue: invoke
        }
      ]
    });

    const service = TestBed.inject(ImportService);
    await service.selectLocalImages();

    expect(invoke).toHaveBeenCalledWith("select_images", undefined);
  });
});
