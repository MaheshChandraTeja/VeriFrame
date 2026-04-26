import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter
} from "@angular/core";

import { AppButtonComponent } from "../button/app-button.component";

@Component({
  selector: "vf-empty-state",
  standalone: true,
  imports: [AppButtonComponent],
  inputs: ["icon", "title", "description", "actionLabel"],
  outputs: ["action"],
  template: `
    <section class="vf-empty-state">
      <div class="vf-empty-state__icon" aria-hidden="true">{{ icon }}</div>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>

      @if (actionLabel) {
        <vf-button variant="secondary" (clicked)="action.emit()">
          {{ actionLabel }}
        </vf-button>
      }
    </section>
  `,
  styles: [
    `
      .vf-empty-state {
        display: grid;
        justify-items: center;
        gap: 12px;
        max-width: 560px;
        margin: 0 auto;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          radial-gradient(circle at 50% 0%, var(--vf-primary-soft), transparent 58%),
          var(--vf-surface);
        padding: 44px 28px;
        text-align: center;
      }

      .vf-empty-state__icon {
        display: grid;
        width: 64px;
        height: 64px;
        place-items: center;
        border-radius: 22px;
        background: var(--vf-surface-strong);
        font-size: 28px;
      }

      .vf-empty-state h2 {
        margin: 0;
        font-size: 22px;
        letter-spacing: -0.04em;
      }

      .vf-empty-state p {
        max-width: 460px;
        margin: 0;
        color: var(--vf-text-muted);
        line-height: 1.6;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppEmptyStateComponent {
  icon = "▣";
  title = "Nothing here yet";
  description = "This area will populate once data is available.";
  actionLabel: string | null = null;

  readonly action = new EventEmitter<void>();
}
