import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter
} from "@angular/core";

import { classNames } from "../../utils/class-names";

export type AppButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
export type AppButtonSize = "sm" | "md" | "lg";
export type AppButtonType = "button" | "submit" | "reset";

@Component({
  selector: "vf-button",
  standalone: true,
  inputs: ["variant", "size", "type", "disabled", "loading", "ariaLabel"],
  outputs: ["clicked"],
  template: `
    <button
      [attr.aria-label]="ariaLabel || null"
      [class]="buttonClass"
      [disabled]="disabled || loading"
      [type]="type"
      (click)="handleClick($event)"
    >
      @if (loading) {
        <span class="vf-button__spinner" aria-hidden="true"></span>
      }

      <span class="vf-button__content">
        <ng-content />
      </span>
    </button>
  `,
  styles: [
    `
      .vf-button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: 40px;
        border: 1px solid transparent;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 850;
        letter-spacing: -0.01em;
        transition:
          transform 150ms ease,
          border-color 150ms ease,
          background 150ms ease,
          opacity 150ms ease;
        user-select: none;
      }

      .vf-button:hover:not(:disabled) {
        transform: translateY(-1px);
      }

      .vf-button:active:not(:disabled) {
        transform: translateY(0);
      }

      .vf-button:focus-visible {
        outline: 3px solid var(--vf-primary-soft);
        outline-offset: 2px;
      }

      .vf-button:disabled {
        cursor: not-allowed;
        opacity: 0.58;
      }

      .vf-button--sm {
        min-height: 34px;
        padding: 0 12px;
        font-size: 13px;
      }

      .vf-button--md {
        min-height: 40px;
        padding: 0 16px;
        font-size: 14px;
      }

      .vf-button--lg {
        min-height: 48px;
        padding: 0 20px;
        font-size: 15px;
      }

      .vf-button--primary {
        background: var(--vf-primary);
        color: #03121d;
      }

      .vf-button--secondary {
        border-color: var(--vf-border);
        background: var(--vf-surface);
        color: var(--vf-text);
      }

      .vf-button--ghost {
        background: transparent;
        color: var(--vf-text-soft);
      }

      .vf-button--danger {
        background: var(--vf-danger);
        color: #fff8fb;
      }

      .vf-button--success {
        background: var(--vf-success);
        color: #052013;
      }

      .vf-button__spinner {
        width: 14px;
        height: 14px;
        border: 2px solid currentColor;
        border-right-color: transparent;
        border-radius: 999px;
        animation: vf-button-spin 700ms linear infinite;
      }

      @keyframes vf-button-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppButtonComponent {
  variant: AppButtonVariant = "primary";
  size: AppButtonSize = "md";
  type: AppButtonType = "button";
  disabled = false;
  loading = false;
  ariaLabel: string | null = null;

  readonly clicked = new EventEmitter<MouseEvent>();

  get buttonClass(): string {
    return classNames(
      "vf-button",
      `vf-button--${this.variant}`,
      `vf-button--${this.size}`
    );
  }

  handleClick(event: MouseEvent): void {
    if (this.disabled || this.loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    this.clicked.emit(event);
  }
}
