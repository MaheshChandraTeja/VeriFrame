import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "vf-loading-state",
  standalone: true,
  inputs: ["message", "compact"],
  template: `
    <div class="vf-loading-state" [class.vf-loading-state--compact]="compact">
      <span class="vf-loading-state__spinner" aria-hidden="true"></span>
      <span>{{ message }}</span>
    </div>
  `,
  styles: [
    `
      .vf-loading-state {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-surface);
        padding: 10px 14px;
        color: var(--vf-text-soft);
        font-weight: 700;
      }

      .vf-loading-state--compact {
        padding: 6px 10px;
        font-size: 12px;
      }

      .vf-loading-state__spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--vf-primary);
        border-right-color: transparent;
        border-radius: 999px;
        animation: vf-loading-spin 700ms linear infinite;
      }

      @keyframes vf-loading-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLoadingStateComponent {
  message = "Loading…";
  compact = false;
}
