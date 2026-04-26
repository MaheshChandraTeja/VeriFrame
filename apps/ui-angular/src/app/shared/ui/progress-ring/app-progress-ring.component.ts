import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "vf-progress-ring",
  standalone: true,
  inputs: ["value", "size", "label"],
  template: `
    <div
      class="vf-progress-ring"
      [style.width.px]="size"
      [style.height.px]="size"
      [style.background]="ringBackground"
      role="progressbar"
      [attr.aria-valuenow]="clampedValue"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span>{{ displayLabel }}</span>
    </div>
  `,
  styles: [
    `
      .vf-progress-ring {
        display: grid;
        place-items: center;
        border-radius: 999px;
        box-shadow: inset 0 0 0 1px var(--vf-border);
      }

      .vf-progress-ring span {
        display: grid;
        width: calc(100% - 16px);
        height: calc(100% - 16px);
        place-items: center;
        border-radius: 999px;
        background: var(--vf-bg-elevated);
        color: var(--vf-text);
        font-size: 13px;
        font-weight: 900;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppProgressRingComponent {
  value = 0;
  size = 86;
  label: string | null = null;

  get clampedValue(): number {
    return Math.round(Math.min(100, Math.max(0, this.value)));
  }

  get displayLabel(): string {
    return this.label ?? `${this.clampedValue}%`;
  }

  get ringBackground(): string {
    return `conic-gradient(var(--vf-primary) ${this.clampedValue}%, var(--vf-surface-strong) 0)`;
  }
}
