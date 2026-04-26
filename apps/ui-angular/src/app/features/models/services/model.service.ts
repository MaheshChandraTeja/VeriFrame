import { Injectable, inject } from "@angular/core";

import { TauriService } from "../../../core/native/tauri.service";

export type ModelTask = "classification" | "detection" | "segmentation";

export interface ModelProfileStatus {
  readonly modelId: string;
  readonly name: string;
  readonly version: string;
  readonly task: ModelTask;
  readonly labels: readonly string[];
  readonly configPath: string;
  readonly checkpointPath: string | null;
  readonly checkpointPresent: boolean;
  readonly checkpointRequired: boolean;
  readonly loadable: boolean;
  readonly loaded: boolean;
  readonly device: string | null;
  readonly description: string;
}

export interface LoadedModelSummary {
  readonly modelId: string;
  readonly name: string;
  readonly version: string;
  readonly task: ModelTask;
  readonly device: string;
  readonly labels: readonly string[];
}

export interface ModelRegistryResponse {
  readonly availableModels: readonly ModelProfileStatus[];
  readonly loadedModels: readonly LoadedModelSummary[];
}

export interface ModelOperationResponse {
  readonly modelId: string;
  readonly loaded: boolean;
  readonly device: string | null;
  readonly message: string;
  readonly warmup?: Record<string, unknown> | null;
}

@Injectable({
  providedIn: "root"
})
export class ModelService {
  private readonly tauri = inject(TauriService);

  async listModels(): Promise<ModelRegistryResponse> {
    const response = await this.tauri.invoke<ModelRegistryResponse>("list_models");

    return {
      availableModels: [...(response.availableModels ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
      loadedModels: [...(response.loadedModels ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name)
      )
    };
  }

  loadModel(modelId: string, warmup = false): Promise<ModelOperationResponse> {
    return this.tauri.invoke<ModelOperationResponse>("load_model", {
      request: {
        modelId,
        warmup
      }
    });
  }

  unloadModel(modelId: string): Promise<ModelOperationResponse> {
    return this.tauri.invoke<ModelOperationResponse>("unload_model", {
      request: {
        modelId,
        warmup: false
      }
    });
  }
}
