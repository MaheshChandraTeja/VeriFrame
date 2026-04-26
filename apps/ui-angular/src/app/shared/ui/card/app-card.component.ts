import { ChangeDetectionStrategy, Component } from "@angular/core";

import { classNames } from "../../utils/class-names";

@Component({
  selector: "vf-card",
  standalone: true,
  inputs: ["title", "subtitle", "elevated"],
  template: `
    <section [class]="cardClass">
      @if (title || subtitle) {
        <header class="vf-card__header">
          <div>
            @if (title) {
              <h2>{{ title }}</h2>
            }

            @if (subtitle) {
              <p>{{ subtitle }}</p>
            }
          </div>

          <ng-content select="[card-actions]" />
        </header>
      }

      <div class="vf-card__body">
        <ng-content />
      </div>

      <ng-content select="[card-footer]" />
    </section>
  `,
  styles: [
    `
      .vf-card {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.045), transparent),
          var(--vf-surface);
        box-shadow: var(--vf-shadow-sm);
        overflow: hidden;
      }

      .vf-card--elevated {
        background: var(--vf-bg-elevated);
        box-shadow: var(--vf-shadow-md);
      }

      .vf-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 18px 0;
      }

      .vf-card__header h2 {
        margin: 0;
        font-size: 16px;
        letter-spacing: -0.03em;
      }

      .vf-card__header p {
        margin: 5px 0 0;
        color: var(--vf-text-muted);
        font-size: 13px;
        line-height: 1.45;
      }

      .vf-card__body {
        padding: 18px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppCardComponent {
  title: string | null = null;
  subtitle: string | null = null;
  elevated = false;

  get cardClass(): string {
    return classNames("vf-card", {
      "vf-card--elevated": this.elevated
    });
  }
}
