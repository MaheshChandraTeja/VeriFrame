import { Injectable, computed, signal } from "@angular/core";

export type ImportItemStatus = "valid" | "rejected";
export type ImportItemSource = "native_path" | "browser_file";

export interface ImportQueueItem {
  readonly id: string;
  readonly fileName: string;
  readonly sizeBytes: number | null;
  readonly path: string | null;
  readonly previewUrl: string | null;
  readonly status: ImportItemStatus;
  readonly reason: string | null;
  readonly addedAt: string;
  readonly source: ImportItemSource;
}

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"]);
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"];
const MAX_BYTES = 25 * 1024 * 1024;

@Injectable({ providedIn: "root" })
export class ImportStateService {
  private readonly itemsState = signal<readonly ImportQueueItem[]>([]);

  readonly items = this.itemsState.asReadonly();
  readonly validItems = computed(() => this.items().filter((item) => item.status === "valid"));
  readonly rejectedItems = computed(() => this.items().filter((item) => item.status === "rejected"));
  readonly analyzableItems = computed(() => this.validItems().filter((item) => item.path));
  readonly stagedCount = computed(() => this.items().length);
  readonly validCount = computed(() => this.validItems().length);
  readonly rejectedCount = computed(() => this.rejectedItems().length);
  readonly analyzableCount = computed(() => this.analyzableItems().length);
  readonly hasItems = computed(() => this.items().length > 0);

  stageFiles(files: readonly File[]): void {
    this.itemsState.update((current) => [...current, ...files.map((file) => this.toBrowserQueueItem(file))]);
  }

  stagePaths(paths: readonly string[]): void {
    this.itemsState.update((current) => [...current, ...paths.map((path) => this.toNativeQueueItem(path))]);
  }

  removeItem(id: string): void {
    const target = this.items().find((item) => item.id === id);
    if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
    this.itemsState.update((items) => items.filter((item) => item.id !== id));
  }

  clear(): void {
    for (const item of this.items()) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.itemsState.set([]);
  }

  private toBrowserQueueItem(file: File): ImportQueueItem {
    const rejectionReason = this.rejectionReasonForFile(file);
    const previewUrl = rejectionReason ? null : URL.createObjectURL(file);
    const browserPath = extractBrowserFilePath(file);

    return {
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      fileName: file.name,
      sizeBytes: file.size,
      path: browserPath,
      previewUrl,
      status: rejectionReason ? "rejected" : "valid",
      reason: rejectionReason,
      addedAt: new Date().toISOString(),
      source: "browser_file"
    };
  }

  private toNativeQueueItem(path: string): ImportQueueItem {
    const fileName = fileNameFromPath(path);
    const rejectionReason = this.rejectionReasonForPath(path);

    return {
      id: `${path}-${crypto.randomUUID()}`,
      fileName,
      sizeBytes: null,
      path: rejectionReason ? null : path,
      previewUrl: null,
      status: rejectionReason ? "rejected" : "valid",
      reason: rejectionReason,
      addedAt: new Date().toISOString(),
      source: "native_path"
    };
  }

  private rejectionReasonForFile(file: File): string | null {
    const lowerName = file.name.toLowerCase();
    const extensionOk = ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    const typeOk = file.type.length === 0 || ACCEPTED_TYPES.has(file.type);

    if (!extensionOk || !typeOk) return "Unsupported image type.";
    if (file.size > MAX_BYTES) return "File is over 25 MB.";
    return null;
  }

  private rejectionReasonForPath(path: string): string | null {
    const lowerPath = path.toLowerCase();
    return ACCEPTED_EXTENSIONS.some((extension) => lowerPath.endsWith(extension)) ? null : "Unsupported image type.";
  }
}

function extractBrowserFilePath(file: File): string | null {
  const maybeTauriFile = file as File & { path?: unknown };
  return typeof maybeTauriFile.path === "string" && maybeTauriFile.path.length > 0 ? maybeTauriFile.path : null;
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
