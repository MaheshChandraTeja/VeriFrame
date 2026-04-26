import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";
import type { ImportQueueItem } from "../services/import.service";
import { formatBytes } from "../services/import.service";

@Component({
  selector: "vf-import-queue",
  standalone: true,
  imports: [AppBadgeComponent, AppButtonComponent],
  inputs: ["items"],
  outputs: ["analyzeRequested", "removeRequested"],
  template: `
    <section class="vf-import-queue">
      <header>
        <div>
          <p>Import queue</p>
          <h2>{{ items.length }} staged item(s)</h2>
        </div>
        <span>{{ validCount() }} valid · {{ invalidCount() }} rejected</span>
      </header>

      @if (items.length === 0) {
        <div class="vf-import-queue__empty">
          <strong>No files staged.</strong>
          <span>Drop images or use the picker. The void is very organized today.</span>
        </div>
      } @else {
        <div class="vf-import-queue__list">
          @for (item of items; track item.id) {
            <article class="vf-import-queue__item" [class.is-invalid]="item.status === 'invalid'">
              <div class="vf-import-queue__thumb">
                @if (item.previewUrl) {
                  <img [src]="item.previewUrl" [alt]="item.name">
                } @else {
                  <span>!</span>
                }
              </div>

              <div class="vf-import-queue__body">
                <div class="vf-import-queue__title">
                  <h3>{{ item.name }}</h3>
                  <vf-badge [variant]="item.status === 'valid' ? 'success' : 'danger'">
                    {{ item.status }}
                  </vf-badge>
                </div>

                <dl>
                  <div>
                    <dt>Size</dt>
                    <dd>{{ bytes(item.sizeBytes) }}</dd>
                  </div>
                  <div>
                    <dt>Format</dt>
                    <dd>{{ item.detectedFormat || item.extension || 'unknown' }}</dd>
                  </div>
                  <div>
                    <dt>Dimensions</dt>
                    <dd>{{ dimensions(item) }}</dd>
                  </div>
                </dl>

                @if (item.issues.length > 0) {
                  <ul>
                    @for (issue of item.issues; track issue.code) {
                      <li>{{ issue.message }}</li>
                    }
                  </ul>
                }
              </div>

              <div class="vf-import-queue__actions">
                <vf-button
                  variant="primary"
                  size="sm"
                  [disabled]="item.status !== 'valid'"
                  (clicked)="analyzeRequested.emit(item)"
                >
                  Analyze
                </vf-button>
                <vf-button variant="ghost" size="sm" (clicked)="removeRequested.emit(item)">
                  Remove
                </vf-button>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .vf-import-queue {
        display: grid;
        gap: 16px;
      }

      header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 18px;
      }

      header p {
        margin: 0 0 6px;
        color: var(--vf-primary);
        font-size: 11px;
        font-weight: 950;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      header h2 {
        margin: 0;
        font-size: clamp(22px, 3vw, 34px);
        letter-spacing: -0.06em;
      }

      header span {
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-bg-elevated);
        color: var(--vf-text-soft);
        font-size: 12px;
        font-weight: 900;
        padding: 8px 11px;
        white-space: nowrap;
      }

      .vf-import-queue__empty {
        display: grid;
        gap: 6px;
        border: 1px dashed var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: rgba(255, 255, 255, 0.025);
        color: var(--vf-text-muted);
        padding: 22px;
        text-align: center;
      }

      .vf-import-queue__empty strong {
        color: var(--vf-text);
      }

      .vf-import-queue__list {
        display: grid;
        gap: 12px;
      }

      .vf-import-queue__item {
        display: grid;
        grid-template-columns: 92px minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
        border: 1px solid var(--vf-border);
        border-radius: 22px;
        background:
          linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.025)),
          var(--vf-bg-elevated);
        padding: 12px;
        transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
      }

      .vf-import-queue__item:hover {
        border-color: rgba(125, 211, 252, 0.48);
        transform: translateY(-1px);
      }

      .vf-import-queue__item.is-invalid {
        border-color: rgba(251, 113, 133, 0.42);
        background:
          linear-gradient(135deg, rgba(251, 113, 133, 0.12), rgba(255, 255, 255, 0.025)),
          var(--vf-bg-elevated);
      }

      .vf-import-queue__thumb {
        display: grid;
        place-items: center;
        width: 92px;
        height: 76px;
        overflow: hidden;
        border: 1px solid var(--vf-border);
        border-radius: 18px;
        background: #05070d;
      }

      .vf-import-queue__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .vf-import-queue__thumb span {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: rgba(251, 113, 133, 0.16);
        color: #fb7185;
        font-weight: 950;
      }

      .vf-import-queue__body {
        min-width: 0;
      }

      .vf-import-queue__title {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: space-between;
      }

      h3 {
        overflow: hidden;
        margin: 0;
        font-size: 16px;
        letter-spacing: -0.035em;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      dl {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 0;
      }

      dt {
        color: var(--vf-text-muted);
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }

      dd {
        margin: 3px 0 0;
        color: var(--vf-text-soft);
        font-size: 13px;
        font-weight: 800;
      }

      ul {
        margin: 12px 0 0;
        padding-left: 18px;
        color: #fda4af;
        font-size: 13px;
        line-height: 1.5;
      }

      .vf-import-queue__actions {
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      @media (max-width: 860px) {
        .vf-import-queue__item {
          grid-template-columns: 1fr;
        }

        .vf-import-queue__thumb {
          width: 100%;
          height: 160px;
        }

        .vf-import-queue__actions {
          justify-items: stretch;
        }

        dl {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportQueueComponent {
  items: readonly ImportQueueItem[] = [];

  readonly analyzeRequested = new EventEmitter<ImportQueueItem>();
  readonly removeRequested = new EventEmitter<ImportQueueItem>();

  validCount(): number {
    return this.items.filter((item) => item.status === "valid").length;
  }

  invalidCount(): number {
    return this.items.filter((item) => item.status === "invalid").length;
  }

  bytes(value: number): string {
    return formatBytes(value);
  }

  dimensions(item: ImportQueueItem): string {
    if (item.width === null || item.height === null) {
      return "not decoded";
    }

    return `${item.width} × ${item.height}`;
  }
}
