import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  signal
} from "@angular/core";

import { AppButtonComponent } from "../button/app-button.component";
import { FileSizePipe } from "../../pipes/file-size.pipe";

export interface FileDropzoneRejection {
  readonly file: File;
  readonly reason: "unsupported_type" | "too_large" | "multiple_not_allowed";
  readonly message: string;
}

@Component({
  selector: "vf-file-dropzone",
  standalone: true,
  imports: [AppButtonComponent, FileSizePipe],
  inputs: [
    "label",
    "description",
    "accept",
    "maxFileSizeBytes",
    "multiple",
    "disabled"
  ],
  outputs: ["filesSelected", "rejected"],
  template: `
    <section
      class="vf-dropzone"
      [class.vf-dropzone--active]="isDragActive()"
      [class.vf-dropzone--disabled]="disabled"
      tabindex="0"
      role="button"
      [attr.aria-label]="label"
      (click)="onBrowseClick(fileInput)"
      (keydown.enter)="onBrowseClick(fileInput)"
      (keydown.space)="onBrowseClick(fileInput)"
      (dragenter)="onDragEnter($event)"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <input
        #fileInput
        class="vf-dropzone__input"
        type="file"
        [attr.accept]="acceptAttr"
        [multiple]="multiple"
        [disabled]="disabled"
        (change)="onInputChange($event)"
      >

      <div class="vf-dropzone__icon" aria-hidden="true">⇡</div>
      <h2>{{ label }}</h2>
      <p>{{ description }}</p>

      <div class="vf-dropzone__meta">
        <span>{{ acceptSummary }}</span>
        <span>Max {{ maxFileSizeBytes | fileSize }}</span>
      </div>

      <vf-button
        type="button"
        variant="secondary"
        size="sm"
        [disabled]="disabled"
        (clicked)="onBrowseClick(fileInput)"
      >
        Browse files
      </vf-button>
    </section>
  `,
  styles: [
    `
      .vf-dropzone {
        display: grid;
        justify-items: center;
        gap: 12px;
        border: 1px dashed var(--vf-border-strong);
        border-radius: var(--vf-radius-xl);
        background:
          radial-gradient(circle at 50% 0%, var(--vf-primary-soft), transparent 56%),
          var(--vf-surface);
        padding: 34px 22px;
        text-align: center;
        cursor: pointer;
        transition:
          border-color 160ms ease,
          background 160ms ease,
          transform 160ms ease;
      }

      .vf-dropzone:hover,
      .vf-dropzone--active {
        border-color: var(--vf-primary);
        background:
          radial-gradient(circle at 50% 0%, var(--vf-primary-soft), transparent 64%),
          var(--vf-surface-strong);
        transform: translateY(-1px);
      }

      .vf-dropzone--disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      .vf-dropzone__input {
        display: none;
      }

      .vf-dropzone__icon {
        display: grid;
        width: 58px;
        height: 58px;
        place-items: center;
        border-radius: 21px;
        background: var(--vf-bg-elevated);
        color: var(--vf-primary);
        font-size: 28px;
        box-shadow: var(--vf-shadow-sm);
      }

      .vf-dropzone h2 {
        margin: 0;
        font-size: 20px;
        letter-spacing: -0.04em;
      }

      .vf-dropzone p {
        max-width: 540px;
        margin: 0;
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      .vf-dropzone__meta {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }

      .vf-dropzone__meta span {
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-surface);
        padding: 6px 9px;
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 800;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FileDropzoneComponent {
  label = "Drop images here";
  description = "Use JPG, PNG, WebP, BMP, or TIFF evidence images. Files stay local.";
  accept: readonly string[] = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/tiff",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff"
  ];
  maxFileSizeBytes = 25 * 1024 * 1024;
  multiple = true;
  disabled = false;

  readonly filesSelected = new EventEmitter<readonly File[]>();
  readonly rejected = new EventEmitter<readonly FileDropzoneRejection[]>();

  readonly isDragActive = signal(false);

  get acceptAttr(): string {
    return this.accept.join(",");
  }

  get acceptSummary(): string {
    const extensions = this.accept.filter((item) => item.startsWith("."));
    return extensions.length > 0 ? extensions.join(" ") : "Images";
  }

  onBrowseClick(inputElement: HTMLInputElement): void {
    if (this.disabled) {
      return;
    }

    inputElement.click();
  }

  onInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.handleFiles(Array.from(inputElement.files ?? []));
    inputElement.value = "";
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();

    if (!this.disabled) {
      this.isDragActive.set(true);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive.set(false);

    if (this.disabled) {
      return;
    }

    this.handleFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  handleFiles(files: readonly File[]): void {
    if (this.disabled || files.length === 0) {
      return;
    }

    const allowedFiles: File[] = [];
    const rejectedFiles: FileDropzoneRejection[] = [];

    if (!this.multiple && files.length > 1) {
      rejectedFiles.push(
        ...files.slice(1).map((file) => ({
          file,
          reason: "multiple_not_allowed" as const,
          message: "Only one file can be selected for this dropzone."
        }))
      );
    }

    const candidateFiles = this.multiple ? files : files.slice(0, 1);

    for (const file of candidateFiles) {
      const rejection = this.validateFile(file);

      if (rejection) {
        rejectedFiles.push(rejection);
      } else {
        allowedFiles.push(file);
      }
    }

    if (allowedFiles.length > 0) {
      this.filesSelected.emit(allowedFiles);
    }

    if (rejectedFiles.length > 0) {
      this.rejected.emit(rejectedFiles);
    }
  }

  private validateFile(file: File): FileDropzoneRejection | null {
    if (!this.isAccepted(file)) {
      return {
        file,
        reason: "unsupported_type",
        message: `${file.name} is not a supported image type.`
      };
    }

    if (file.size > this.maxFileSizeBytes) {
      return {
        file,
        reason: "too_large",
        message: `${file.name} is too large for the current limit.`
      };
    }

    return null;
  }

  private isAccepted(file: File): boolean {
    if (this.accept.length === 0) {
      return true;
    }

    const lowerName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();

    return this.accept.some((rule) => {
      const normalized = rule.toLowerCase().trim();

      if (normalized === "image/*") {
        return fileType.startsWith("image/");
      }

      if (normalized.startsWith(".")) {
        return lowerName.endsWith(normalized);
      }

      return normalized === fileType;
    });
  }
}
