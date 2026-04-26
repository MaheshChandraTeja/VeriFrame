import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter
} from "@angular/core";

import { AppButtonComponent } from "../button/app-button.component";

@Component({
  selector: "vf-modal",
  standalone: true,
  imports: [CommonModule, AppButtonComponent],
  inputs: ["open", "title", "description"],
  outputs: ["closed"],
  host: {
    "(document:keydown.escape)": "onEscape()"
  },
  template: `
    <div
      *ngIf="open"
      class="vf-modal__backdrop"
      role="presentation"
      (click)="closeFromBackdrop($event)"
    >
      <section
        class="vf-modal"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title"
      >
        <header class="vf-modal__header">
          <div>
            <h2>{{ title }}</h2>
            <p *ngIf="description">{{ description }}</p>
          </div>

          <vf-button
            ariaLabel="Close modal"
            variant="ghost"
            size="sm"
            (clicked)="close()"
          >
            ✕
          </vf-button>
        </header>

        <div class="vf-modal__body">
          <ng-content />
        </div>

        <footer class="vf-modal__footer">
          <ng-content select="[modal-footer]" />
        </footer>
      </section>
    </div>
  `,
  styles: [
    `
      .vf-modal__backdrop {
        position: fixed;
        inset: 0;
        z-index: 200;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(0, 0, 0, 0.62);
        backdrop-filter: blur(16px);
      }

      .vf-modal {
        width: min(620px, 100%);
        max-height: min(760px, 90vh);
        overflow: auto;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-bg-elevated);
        box-shadow: var(--vf-shadow-md);
      }

      .vf-modal__header,
      .vf-modal__footer {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        padding: 18px;
      }

      .vf-modal__header {
        border-bottom: 1px solid var(--vf-border);
      }

      .vf-modal__footer {
        border-top: 1px solid var(--vf-border);
      }

      .vf-modal__header h2 {
        margin: 0;
        font-size: 18px;
      }

      .vf-modal__header p {
        margin: 5px 0 0;
        color: var(--vf-text-muted);
      }

      .vf-modal__body {
        padding: 18px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppModalComponent {
  open = false;
  title = "Dialog";
  description: string | null = null;

  readonly closed = new EventEmitter<void>();

  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  closeFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
