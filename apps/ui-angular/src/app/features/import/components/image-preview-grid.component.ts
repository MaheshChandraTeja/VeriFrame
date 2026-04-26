import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";
import type { ImportQueueItem } from "../services/import.service";

@Component({
  selector: "vf-image-preview-grid",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["items"],
  template: `
    <section class="vf-preview-grid">
      <header>
        <div>
          <p>Preview</p>
          <h2>Visual intake</h2>
        </div>
        <span>{{ validItems().length }} previewable</span>
      </header>

      @if (items.length === 0) {
        <div class="vf-preview-grid__empty">
          <strong>No previews yet.</strong>
          <span>Only verified images get thumbnails. Fake JPGs can sulk outside.</span>
        </div>
      } @else {
        <div class="vf-preview-grid__items">
          @for (item of items; track item.id) {
            <article [class.is-invalid]="item.status === 'invalid'">
              <div class="vf-preview-grid__image">
                @if (item.previewUrl) {
                  <img [src]="item.previewUrl" [alt]="item.name">
                } @else {
                  <span>Rejected</span>
                }
              </div>
              <div class="vf-preview-grid__meta">
                <strong>{{ item.name }}</strong>
                <vf-badge [variant]="item.status === 'valid' ? 'success' : 'danger'">{{ item.status }}</vf-badge>
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .vf-preview-grid {
        display: grid;
        gap: 14px;
      }

      header {
        display: flex;
        justify-content: space-between;
        gap: 14px;
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
        font-size: 22px;
        letter-spacing: -0.055em;
      }

      header span {
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
      }

      .vf-preview-grid__empty {
        display: grid;
        gap: 6px;
        min-height: 180px;
        place-items: center;
        border: 1px dashed var(--vf-border);
        border-radius: 22px;
        background:
          radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.12), transparent 18rem),
          rgba(255, 255, 255, 0.025);
        color: var(--vf-text-muted);
        text-align: center;
      }

      .vf-preview-grid__empty strong {
        color: var(--vf-text);
      }

      .vf-preview-grid__items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }

      article {
        overflow: hidden;
        border: 1px solid var(--vf-border);
        border-radius: 22px;
        background: var(--vf-bg-elevated);
      }

      article.is-invalid {
        border-color: rgba(251, 113, 133, 0.42);
      }

      .vf-preview-grid__image {
        display: grid;
        place-items: center;
        aspect-ratio: 1.1;
        background: #05070d;
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .vf-preview-grid__image span {
        border-radius: 999px;
        background: rgba(251, 113, 133, 0.16);
        color: #fda4af;
        font-size: 12px;
        font-weight: 950;
        padding: 8px 10px;
        text-transform: uppercase;
      }

      .vf-preview-grid__meta {
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      strong {
        overflow: hidden;
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImagePreviewGridComponent {
  items: readonly ImportQueueItem[] = [];

  validItems(): readonly ImportQueueItem[] {
    return this.items.filter((item) => item.status === "valid");
  }
}
