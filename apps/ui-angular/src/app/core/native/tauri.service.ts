import { inject, Injectable, InjectionToken } from "@angular/core";

import { NativeError, normalizeNativeError } from "./native-error.model";

export type TauriInvoke = <T>(
  command: string,
  args?: Record<string, unknown>
) => Promise<T>;

export const TAURI_INVOKE = new InjectionToken<TauriInvoke>("TAURI_INVOKE", {
  providedIn: "root",
  factory: () => async <T>(command: string, args?: Record<string, unknown>): Promise<T> => {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(command, args);
  }
});

@Injectable({
  providedIn: "root"
})
export class TauriService {
  private readonly invokeImpl = inject(TAURI_INVOKE);

  isTauriRuntime(): boolean {
    return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  }

  async invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
    try {
      return await this.invokeImpl<T>(command, args);
    } catch (error) {
      throw normalizeNativeError(error);
    }
  }

  async invokeOrNull<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
    try {
      return await this.invoke<T>(command, args);
    } catch {
      return null;
    }
  }

  async requireTauri(): Promise<void> {
    if (!this.isTauriRuntime()) {
      const error: NativeError = {
        code: "TAURI_UNAVAILABLE",
        message: "This action requires the VeriFrame desktop shell."
      };

      throw error;
    }
  }
}
