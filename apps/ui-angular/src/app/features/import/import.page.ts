import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { Router } from "@angular/router";
import type { AnalysisRequest } from "@veriframe/contracts";

import { TauriService } from "../../core/native/tauri.service";
import { AnalysisService } from "../analysis/services/analysis.service";
import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { ImportQueueItem, ImportStateService } from "./import-state.service";

@Component({
  selector: "vf-import-page",
  standalone: true,
  imports: [AppBadgeComponent, AppButtonComponent, AppCardComponent],
  template: `
    <section class="vf-import-page" [class.is-dragging]="dragActive()">
      <header class="vf-import-hero">
        <div class="vf-import-hero__copy">
          <span class="vf-import-hero__eyebrow">Evidence intake</span>
          <h1>Import evidence without trusting fake pixels.</h1>
          <p>
            Stage image evidence locally, reject obvious impostors, and send clean
            analysis requests through the native boundary.
          </p>

          <div class="vf-import-hero__actions">
            <vf-button variant="primary" (clicked)="selectLocalImages(fileInput)">
              Select local images
            </vf-button>
            <vf-button
              variant="success"
              [disabled]="state.analyzableCount() === 0 || analyzingItemId() !== null"
              [loading]="analyzingItemId() === 'first'"
              (clicked)="analyzeFirstReadyItem()"
            >
              Analyze first ready image
            </vf-button>
            <vf-button variant="ghost" [disabled]="!state.hasItems()" (clicked)="state.clear()">
              Clear queue
            </vf-button>
          </div>

          @if (message()) {
            <p class="vf-import-hero__message">{{ message() }}</p>
          }
        </div>

        <aside class="vf-import-hero__stats" aria-label="Import queue summary">
          <article><strong>{{ state.stagedCount() }}</strong><span>staged</span></article>
          <article><strong>{{ state.validCount() }}</strong><span>valid</span></article>
          <article><strong>{{ state.analyzableCount() }}</strong><span>ready</span></article>
          <article><strong>{{ state.rejectedCount() }}</strong><span>rejected</span></article>
        </aside>

        <input
          #fileInput
          class="vf-import-page__file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.bmp,.tif,.tiff,image/jpeg,image/png,image/webp,image/bmp,image/tiff"
          multiple
          (change)="handleFileInput($event)"
        />
      </header>

      <div class="vf-import-page__workspace">
        <vf-card title="Dropzone" subtitle="Drag-and-drop previews are useful, but native-selected files are the ones VeriFrame can analyze because they include real local paths.">
          <section
            class="vf-import-dropzone"
            tabindex="0"
            role="button"
            aria-label="Drop image files here or press Enter to browse"
            (click)="selectLocalImages(fileInput)"
            (keydown.enter)="selectLocalImages(fileInput)"
            (keydown.space)="selectLocalImages(fileInput)"
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
          >
            <div class="vf-import-dropzone__icon">⇧</div>
            <h2>Drop verified image files here</h2>
            <p>
              Use the native picker for analysis-ready paths. Browser-only files are
              preview-only unless the shell exposes a path.
            </p>
            <div class="vf-import-dropzone__chips">
              <span>.jpg</span><span>.png</span><span>.webp</span><span>.bmp</span><span>.tiff</span>
            </div>
          </section>
        </vf-card>

        <vf-card title="Preview" [subtitle]="previewSubtitle()">
          @if (state.validItems().length === 0) {
            <div class="vf-import-empty">
              <strong>No previews yet.</strong>
              <p>Pick a local image. The void is available, but not very analytical.</p>
            </div>
          } @else {
            <div class="vf-import-preview-grid">
              @for (item of state.validItems(); track item.id) {
                <article>
                  @if (item.previewUrl) {
                    <img [src]="item.previewUrl" [alt]="item.fileName">
                  } @else {
                    <div class="vf-import-preview-grid__placeholder">{{ extensionLabel(item.fileName) }}</div>
                  }

                  <div>
                    <strong>{{ item.fileName }}</strong>
                    <span>{{ item.path ? 'analysis ready' : 'preview only' }} · {{ sizeLabel(item) }}</span>
                  </div>

                  <div class="vf-import-preview-grid__actions">
                    <button
                      type="button"
                      [disabled]="!item.path || analyzingItemId() !== null"
                      (click)="analyzeItem(item); $event.stopPropagation()"
                    >
                      {{ analyzingItemId() === item.id ? 'Analyzing…' : 'Analyze' }}
                    </button>
                    <button type="button" (click)="state.removeItem(item.id); $event.stopPropagation()">
                      Remove
                    </button>
                  </div>
                </article>
              }
            </div>
          }
        </vf-card>
      </div>

      <vf-card title="Import queue" subtitle="Files stay staged until you remove them, clear the queue, or refresh the app.">
        <section class="vf-import-queue">
          <header>
            <div>
              <span>Import queue</span>
              <h2>{{ state.stagedCount() }} staged item(s)</h2>
            </div>

            <vf-badge [variant]="state.rejectedCount() > 0 ? 'warning' : 'success'">
              {{ state.analyzableCount() }} ready · {{ state.rejectedCount() }} rejected
            </vf-badge>
          </header>

          @if (!state.hasItems()) {
            <div class="vf-import-empty">
              <strong>No files staged.</strong>
              <p>Use the local picker or drop images. The analysis goblin is waiting.</p>
            </div>
          } @else {
            <div class="vf-import-queue__rows">
              @for (item of state.items(); track item.id) {
                <article [class.is-rejected]="item.status === 'rejected'" [class.is-preview-only]="!item.path && item.status === 'valid'">
                  <div>
                    <strong>{{ item.fileName }}</strong>
                    <span>
                      {{ item.path ? compactPath(item.path) : 'No local path available' }}
                      · {{ sizeLabel(item) }}
                      @if (item.reason) {
                        · {{ item.reason }}
                      }
                    </span>
                  </div>

                  <div class="vf-import-queue__actions">
                    <vf-badge [variant]="item.status === 'valid' ? item.path ? 'success' : 'warning' : 'danger'">
                      {{ item.status === 'valid' ? item.path ? 'ready' : 'preview only' : 'rejected' }}
                    </vf-badge>
                    <button
                      type="button"
                      [disabled]="!item.path || analyzingItemId() !== null"
                      (click)="analyzeItem(item)"
                    >
                      {{ analyzingItemId() === item.id ? 'Analyzing…' : 'Analyze' }}
                    </button>
                    <button type="button" (click)="state.removeItem(item.id)">Remove</button>
                  </div>
                </article>
              }
            </div>
          }
        </section>
      </vf-card>

      <section class="vf-import-status">
        @if (state.analyzableCount() > 0) {
          {{ state.analyzableCount() }} analysis-ready image(s). Click Analyze before this page starts collecting dust.
        } @else if (state.validCount() > 0) {
          {{ state.validCount() }} preview-only image(s). Use Select local images so VeriFrame gets real paths for analysis.
        } @else {
          No files staged yet. Suspiciously peaceful.
        }
      </section>
    </section>
  `,
  styleUrl: "./import.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportPageComponent {
  readonly state = inject(ImportStateService);
  private readonly tauri = inject(TauriService);
  private readonly analysisService = inject(AnalysisService);
  private readonly router = inject(Router);

  readonly dragActive = signal(false);
  readonly analyzingItemId = signal<string | null>(null);
  readonly message = signal<string | null>(null);

  readonly previewSubtitle = computed(() =>
    `${this.state.validCount()} valid · ${this.state.analyzableCount()} ready · ${this.state.rejectedCount()} rejected`
  );

  async selectLocalImages(fallbackInput: HTMLInputElement): Promise<void> {
    this.message.set(null);

    try {
      const paths = await this.tauri.invoke<readonly string[]>("select_images");

      if (paths.length === 0) {
        return;
      }

      this.state.stagePaths(paths);
      this.message.set(`${paths.length} local image(s) staged with analysis-ready paths.`);
    } catch (error) {
      this.message.set(`${this.errorMessage(error)} Falling back to browser preview picker.`);
      fallbackInput.click();
    }
  }

  handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.stageFileList(input.files);
    input.value = "";
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragActive.set(false);
    this.stageFileList(event.dataTransfer?.files ?? null);
  }

  async analyzeFirstReadyItem(): Promise<void> {
    const firstReady = this.state.analyzableItems()[0];

    if (!firstReady) {
      this.message.set("No analysis-ready local file path found. Use Select local images, not browser-only preview files.");
      return;
    }

    this.analyzingItemId.set("first");
    await this.analyzeItem(firstReady, false);
  }

  async analyzeItem(item: ImportQueueItem, setOwnLoading = true): Promise<void> {
    if (!item.path) {
      this.message.set("This staged item is preview-only. Re-select it with Select local images so the engine receives a real file path.");
      return;
    }

    if (this.analyzingItemId() && this.analyzingItemId() !== "first") {
      return;
    }

    if (setOwnLoading) {
      this.analyzingItemId.set(item.id);
    }

    this.message.set(`Analyzing ${item.fileName} locally…`);

    try {
      const result = await this.analysisService.submitAnalysisRequest(this.buildAnalysisRequest(item));
      this.message.set(`Analysis complete: ${result.runId}`);
      await this.router.navigate(["/analysis", result.runId]);
    } catch (error) {
      this.message.set(this.errorMessage(error));
    } finally {
      this.analyzingItemId.set(null);
    }
  }

  sizeLabel(item: ImportQueueItem): string {
    return item.sizeBytes === null
      ? item.source === "native_path" ? "local path" : "size unavailable"
      : this.formatBytes(item.sizeBytes);
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  extensionLabel(fileName: string): string {
    const extension = fileName.split(".").at(-1);
    return extension ? extension.toUpperCase() : "IMG";
  }

  compactPath(path: string): string {
    const parts = path.split(/[\\/]/).filter(Boolean);
    return parts.length <= 3 ? path : `…/${parts.slice(-3).join("/")}`;
  }

  private stageFileList(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return;
    this.state.stageFiles(Array.from(fileList));
  }

  private buildAnalysisRequest(item: ImportQueueItem): AnalysisRequest {
    const workflow = this.workflowFor(item.fileName);

    return {
      schemaVersion: "1.0.0",
      requestId: `req_${crypto.randomUUID().replaceAll("-", "")}`,
      source: {
        type: "image_file",
        path: item.path ?? ""
      },
      workflow,
      requestedTasks: ["quality", "detection", "evidence_overlay"],
      modelProfileIds: this.modelProfilesFor(workflow),
      options: {
        confidenceThreshold: 0.05,
        maxImageSizePx: 4096,
        includeExif: false,
        exportArtifacts: true
      },
      createdAt: new Date().toISOString()
    } satisfies AnalysisRequest;
  }

  private workflowFor(fileName: string): AnalysisRequest["workflow"] {
    const lower = fileName.toLowerCase();

    if (lower.includes("receipt") || lower.includes("invoice") || lower.includes("bill")) {
      return "receipt_verification";
    }

    if (lower.includes("package") || lower.includes("damage") || lower.includes("parcel")) {
      return "package_evidence";
    }

    if (lower.includes("display") || lower.includes("treadmill") || lower.includes("panel")) {
      return "device_display";
    }

    return "visual_audit";
  }

  private modelProfilesFor(workflow: AnalysisRequest["workflow"]): string[] {
    switch (workflow) {
      case "receipt_verification":
        return ["receipt_region_detector"];
      case "package_evidence":
        return ["product_package_detector", "damage_detector"];
      case "device_display":
        return ["display_panel_detector"];
      case "screenshot_review":
      case "visual_audit":
        return ["general_object_detector"];
    }
  }

  private errorMessage(error: unknown): string {
    const clean = (message: string): string => {
      if (
        message.includes("Start the engine after Module 4 is implemented") ||
        message.includes("Python engine is not running")
      ) {
        return "Local analysis engine is not reachable. Start VeriFrame Engine and try again.";
      }

      return message;
    };

    if (error instanceof Error) return clean(error.message);
    if (typeof error === "string") return clean(error);

    if (error && typeof error === "object") {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string") return clean(maybeMessage);
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown import/analysis error";
    }
  }
}
