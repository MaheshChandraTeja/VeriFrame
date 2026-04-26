import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TAURI_INVOKE, type TauriInvoke } from "../../core/native/tauri.service";
import { ModelService } from "./services/model.service";

describe("ModelService", () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it("lists model profiles through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      availableModels: [
        {
          modelId: "general_object_detector",
          name: "General Object Detector",
          version: "0.1.0",
          task: "detection",
          labels: ["object"],
          configPath: "models/configs/general-object-detector.json",
          checkpointPath: null,
          checkpointPresent: false,
          checkpointRequired: false,
          loadable: true,
          loaded: false,
          device: null,
          description: "General detector."
        }
      ],
      loadedModels: []
    });

    TestBed.configureTestingModule({
      providers: [
        ModelService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(ModelService);
    const result = await service.listModels();

    expect(result.availableModels).toHaveLength(1);
    expect(invoke).toHaveBeenCalledWith("list_models", undefined);
  });

  it("loads a model through Tauri", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      modelId: "general_object_detector",
      loaded: true,
      device: "cpu",
      message: "loaded",
      warmup: null
    });

    TestBed.configureTestingModule({
      providers: [
        ModelService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(ModelService);
    const result = await service.loadModel("general_object_detector", true);

    expect(result.loaded).toBe(true);
    expect(invoke).toHaveBeenCalledWith("load_model", {
      request: {
        modelId: "general_object_detector",
        warmup: true
      }
    });
  });

  it("unloads a model through Tauri using the request envelope", async () => {
    const invoke = vi.fn<Parameters<TauriInvoke>, ReturnType<TauriInvoke>>().mockResolvedValue({
      modelId: "general_object_detector",
      loaded: false,
      device: null,
      message: "Model unloaded."
    });

    TestBed.configureTestingModule({
      providers: [
        ModelService,
        { provide: TAURI_INVOKE, useValue: invoke }
      ]
    });

    const service = TestBed.inject(ModelService);
    const result = await service.unloadModel("general_object_detector");

    expect(result.loaded).toBe(false);
    expect(invoke).toHaveBeenCalledWith("unload_model", {
      request: {
        modelId: "general_object_detector",
        warmup: false
      }
    });
  });
});
