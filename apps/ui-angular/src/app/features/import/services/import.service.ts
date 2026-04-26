import { Injectable, inject } from "@angular/core";

import { TauriService } from "../../../core/native/tauri.service";

export type ImportItemStatus = "valid" | "invalid" | "pending" | "analyzing";

export interface ImportValidationIssue {
  readonly code:
    | "empty_file"
    | "unsupported_extension"
    | "unsupported_signature"
    | "too_large"
    | "decode_failed"
    | "read_failed";
  readonly message: string;
}

export interface ImportQueueItem {
  readonly id: string;
  readonly file: File;
  readonly name: string;
  readonly sizeBytes: number;
  readonly extension: string;
  readonly mimeType: string;
  readonly previewUrl: string | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly detectedFormat: string | null;
  readonly status: ImportItemStatus;
  readonly issues: readonly ImportValidationIssue[];
}

export interface NativeSelectedImage {
  readonly path: string;
  readonly fileName: string;
  readonly sizeBytes: number;
  readonly valid: boolean;
  readonly reason?: string | null;
}

export interface AnalysisRequestDraft {
  readonly sourcePath: string;
  readonly workflow: "visual_audit";
  readonly requestedTasks: readonly string[];
  readonly modelProfileIds: readonly string[];
  readonly confidenceThreshold: number;
}

const SUPPORTED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff"]);
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024;

@Injectable({
  providedIn: "root"
})
export class ImportService {
  private readonly tauri = inject(TauriService);

  async buildQueueItems(files: readonly File[]): Promise<readonly ImportQueueItem[]> {
    const items = await Promise.all(files.map((file) => this.validateBrowserFile(file)));
    return items;
  }

  async selectLocalImages(): Promise<readonly NativeSelectedImage[]> {
    return this.tauri.invoke<readonly NativeSelectedImage[]>("select_images");
  }

  async createAnalysisDraft(sourcePath: string): Promise<AnalysisRequestDraft> {
    return {
      sourcePath,
      workflow: "visual_audit",
      requestedTasks: ["quality", "detection"],
      modelProfileIds: ["receipt_region_detector"],
      confidenceThreshold: 0.5
    };
  }

  revokePreviews(items: readonly ImportQueueItem[]): void {
    for (const item of items) {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  private async validateBrowserFile(file: File): Promise<ImportQueueItem> {
    const extension = extensionOf(file.name);
    const issues: ImportValidationIssue[] = [];

    if (file.size === 0) {
      issues.push({
        code: "empty_file",
        message: "The file is empty."
      });
    }

    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      issues.push({
        code: "unsupported_extension",
        message: `.${extension || "unknown"} is not a supported image extension.`
      });
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      issues.push({
        code: "too_large",
        message: `File is larger than ${formatBytes(MAX_IMAGE_SIZE_BYTES)}.`
      });
    }

    let detectedFormat: string | null = null;
    try {
      detectedFormat = await detectImageSignature(file);
      if (!detectedFormat) {
        issues.push({
          code: "unsupported_signature",
          message: "File contents do not match a supported image signature."
        });
      }
    } catch {
      issues.push({
        code: "read_failed",
        message: "Could not read file header for validation."
      });
    }

    let dimensions: { width: number; height: number } | null = null;
    if (issues.length === 0) {
      dimensions = await decodeImageDimensions(file);
      if (!dimensions) {
        issues.push({
          code: "decode_failed",
          message: "The file has an image-like extension but cannot be decoded as an image."
        });
      }
    }

    const valid = issues.length === 0;
    const previewUrl = valid ? URL.createObjectURL(file) : null;

    return {
      id: createImportId(file),
      file,
      name: file.name,
      sizeBytes: file.size,
      extension,
      mimeType: file.type || "application/octet-stream",
      previewUrl,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      detectedFormat,
      status: valid ? "valid" : "invalid",
      issues
    };
  }
}

export async function detectImageSignature(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "jpeg";
  }

  if (
    header.length >= 8 &&
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a
  ) {
    return "png";
  }

  if (
    header.length >= 12 &&
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  ) {
    return "webp";
  }

  if (header.length >= 2 && header[0] === 0x42 && header[1] === 0x4d) {
    return "bmp";
  }

  if (
    header.length >= 4 &&
    ((header[0] === 0x49 && header[1] === 0x49 && header[2] === 0x2a && header[3] === 0x00) ||
      (header[0] === 0x4d && header[1] === 0x4d && header[2] === 0x00 && header[3] === 0x2a))
  ) {
    return "tiff";
  }

  return null;
}

export async function decodeImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = {
        width: bitmap.width,
        height: bitmap.height
      };
      bitmap.close();
      return dimensions;
    } catch {
      // Fall back to HTMLImageElement below. Browser image APIs are delightfully inconsistent.
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight
      };
      URL.revokeObjectURL(url);
      resolve(dimensions.width > 0 && dimensions.height > 0 ? dimensions : null);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    image.src = url;
  });
}

export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).trim().toLowerCase() : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units.shift() ?? "KB";

  while (value >= 1024 && units.length > 0) {
    value /= 1024;
    unit = units.shift() ?? unit;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

function createImportId(file: File): string {
  return [
    "import",
    file.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase(),
    file.size,
    file.lastModified,
    Math.random().toString(16).slice(2)
  ].join("_");
}
