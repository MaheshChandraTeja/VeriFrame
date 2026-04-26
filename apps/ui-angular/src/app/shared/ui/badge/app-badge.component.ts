import { ChangeDetectionStrategy, Component } from "@angular/core";

import { classNames } from "../../utils/class-names";

export type AppBadgeVariant = "neutral" | "info" | "success" | "warning" | "danger";

@Component({
  selector: "vf-badge",
  standalone: true,
  inputs: ["variant"],
  template: `
    <span [class]="badgeClass">
      <span class="vf-badge__dot" aria-hidden="true"></span>
      <ng-content />
    </span>
  `,
  styles: [
    `
      .vf-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        width: max-content;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        padding: 6px 9px;
        color: var(--vf-text-soft);
        font-size: 12px;
        font-weight: 850;
        line-height: 1;
      }

      .vf-badge__dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: currentColor;
      }

      .vf-badge--neutral {
        background: var(--vf-surface);
      }

      .vf-badge--info {
        background: var(--vf-primary-soft);
        color: var(--vf-primary);
      }

      .vf-badge--success {
        background: var(--vf-success-soft);
        color: var(--vf-success);
      }

      .vf-badge--warning {
        background: var(--vf-warning-soft);
        color: var(--vf-warning);
      }

      .vf-badge--danger {
        background: var(--vf-danger-soft);
        color: var(--vf-danger);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppBadgeComponent {
  variant: AppBadgeVariant = "neutral";

  get badgeClass(): string {
    return classNames("vf-badge", `vf-badge--${this.variant}`);
  }
}
