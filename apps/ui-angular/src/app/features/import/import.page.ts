import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject, signal } from "@angular/core";

import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { ImagePreviewGridComponent } from "./components/image-preview-grid.component";
import { ImportQueueComponent } from "./components/import-queue.component";
import { ImportQueueItem, ImportService } from "./services/import.service";

@Component({
  selector: "vf-import-page",
  standalone: true,
  imports: [
    AppButtonComponent,
    AppCardComponent,
    ImagePreviewGridComponent,
    ImportQueueComponent
  ],
  template: `
    <section class="vf-import-page" (dragover)="onDragOver($event)" (drop)="onDrop($event)">
      <input
        #filePicker
        class="vf-import-page__input"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,image/jpeg,image/png,image/webp,image/bmp,image/tiff"
        multiple
        (change)="onFilePickerChange($event)"
      >

      <div class="vf-import-hero">
        <div class="vf-import-hero__copy">
          <span>Evidence Intake</span>
          <h2>Import evidence without trusting fake pixels.</h2>
          <p>
            VeriFrame validates real image signatures, decodes dimensions, blocks corrupted files,
            and prepares clean local analysis requests through the native boundary.
          </p>

          <div class="vf-import-hero__stats">
            <div>
              <strong>{{ totalCount() }}</strong>
              <small>staged</small>
            </div>
            <div>
              <strong>{{ validCount() }}</strong>
              <small>valid</small>
            </div>
            <div>
              <strong>{{ invalidCount() }}</strong>
              <small>rejected</small>
            </div>
          </div>
        </div>

        <div class="vf-import-hero__actions">
          <vf-button variant="primary" (clicked)="openPicker()">Browse images</vf-button>
          <vf-button variant="secondary" (clicked)="selectNativeImages()">Select local images</vf-button>
        </div>
      </div>

      <div class="vf-import-page__grid">
        <vf-card class="vf-import-page__drop-card">
          <div
            class="vf-dropzone"
            [class.is-dragging]="dragging()"
            (dragenter)="dragging.set(true)"
            (dragleave)="dragging.set(false)"
            (click)="openPicker()"
            role="button"
            tabindex="0"
          >
            <div class="vf-dropzone__orb">
              <span>↥</span>
            </div>
            <h3>Drop verified image files here</h3>
            <p>
              JPG, PNG, WebP, BMP, TIFF. Extension and binary signature must agree.
              The fake.jpg goblin is no longer welcome.
            </p>
            <div class="vf-dropzone__chips">
              <span>.jpg</span>
              <span>.png</span>
              <span>.webp</span>
              <span>.bmp</span>
              <span>max 25 MB</span>
            </div>
          </div>
        </vf-card>

        <vf-card>
          <vf-image-preview-grid [items]="items()" />
        </vf-card>
      </div>

      <vf-card class="vf-import-page__queue-card">
        <vf-import-queue
          [items]="items()"
          (analyzeRequested)="analyze($event)"
          (removeRequested)="remove($event)"
        />
      </vf-card>

      @if (message()) {
        <p class="vf-import-page__message">{{ message() }}</p>
      }
    </section>
  `,
  styleUrl: "./import.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPageComponent {
  private readonly importService = inject(ImportService);

  @ViewChild("filePicker")
  private readonly filePicker?: ElementRef<HTMLInputElement>;

  readonly items = signal<readonly ImportQueueItem[]>([]);
  readonly dragging = signal(false);
  readonly message = signal<string | null>("No files staged yet. Suspiciously peaceful.");

  openPicker(): void {
    this.filePicker?.nativeElement.click();
  }

  async onFilePickerChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    await this.addFiles(Array.from(input.files ?? []));
    input.value = "";
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    await this.addFiles(Array.from(event.dataTransfer?.files ?? []));
  }

  async addFiles(files: readonly File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    const nextItems = await this.importService.buildQueueItems(files);
    this.items.set([...this.items(), ...nextItems]);

    const rejected = nextItems.filter((item) => item.status === "invalid").length;
    const accepted = nextItems.length - rejected;

    this.message.set(`${accepted} accepted · ${rejected} rejected. Validation used file contents, not wishful extensions.`);
  }

  async selectNativeImages(): Promise<void> {
    try {
      const selected = await this.importService.selectLocalImages();
      this.message.set(`${selected.length} native path(s) selected. Browser preview still uses staged files.`);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : "Could not select local images.");
    }
  }

  analyze(item: ImportQueueItem): void {
    if (item.status !== "valid") {
      this.message.set(`${item.name} is invalid and cannot be analyzed.`);
      return;
    }

    this.message.set(`${item.name} is ready for desktop analysis. Native path promotion happens through Tauri.`);
  }

  remove(item: ImportQueueItem): void {
    this.importService.revokePreviews([item]);
    this.items.set(this.items().filter((existing) => existing.id !== item.id));
    this.message.set(`${item.name} removed from the queue.`);
  }

  totalCount(): number {
    return this.items().length;
  }

  validCount(): number {
    return this.items().filter((item) => item.status === "valid").length;
  }

  invalidCount(): number {
    return this.items().filter((item) => item.status === "invalid").length;
  }

  ngOnDestroy(): void {
    this.importService.revokePreviews(this.items());
  }
}
