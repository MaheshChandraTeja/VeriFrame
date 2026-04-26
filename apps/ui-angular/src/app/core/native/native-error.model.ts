export type NativeErrorCode =
  | "BAD_REQUEST"
  | "FORBIDDEN_PATH"
  | "UNSUPPORTED_FILE_TYPE"
  | "NOT_FOUND"
  | "ENGINE_UNAVAILABLE"
  | "MODULE_UNAVAILABLE"
  | "IO_ERROR"
  | "INTERNAL_ERROR"
  | "TAURI_UNAVAILABLE"
  | "UNKNOWN_NATIVE_ERROR";

export interface NativeError {
  readonly code: NativeErrorCode;
  readonly message: string;
  readonly details?: unknown;
}

export function isNativeError(value: unknown): value is NativeError {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeError = value as Partial<NativeError>;

  return typeof maybeError.code === "string" && typeof maybeError.message === "string";
}

export function normalizeNativeError(error: unknown): NativeError {
  if (isNativeError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN_NATIVE_ERROR",
      message: error.message
    };
  }

  if (typeof error === "string") {
    return {
      code: "UNKNOWN_NATIVE_ERROR",
      message: error
    };
  }

  return {
    code: "UNKNOWN_NATIVE_ERROR",
    message: "An unknown native error occurred.",
    details: error
  };
}
