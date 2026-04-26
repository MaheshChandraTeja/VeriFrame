import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import type { ModelProfileStatus } from "../services/model.service";

@Component({
  selector: "vf-model-health-panel",
  standalone: true,
  imports: [AppBadgeComponent],
  inputs: ["models"],
  template: `
    <section class="vf-model-health">
      <div>
        <span>{{ models.length }}</span>
        <p>Profiles</p>
      </div>

      <div>
        <span>{{ loadedCount }}</span>
        <p>Loaded</p>
      </div>

      <div>
        <span>{{ loadableCount }}</span>
        <p>Loadable</p>
      </div>

      <div>
        <span>{{ missingCheckpointCount }}</span>
        <p>Missing checkpoints</p>
      </div>

      <vf-badge [variant]="readinessVariant">
        {{ readinessLabel }}
      </vf-badge>
    </section>
  `,
  styles: [
    `
      .vf-model-health {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr)) auto;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(135deg, rgba(56, 189, 248, 0.06), transparent 70%),
          var(--vf-surface);
        padding: 18px;
      }

      div {
        border-right: 1px solid var(--vf-border);
        padding-right: 12px;
      }

      span {
        display: block;
        color: var(--vf-text);
        font-size: 28px;
        font-weight: 950;
        letter-spacing: -0.06em;
      }

      p {
        margin: 4px 0 0;
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      @media (max-width: 980px) {
        .vf-model-health {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        div {
          border-right: 0;
          border-bottom: 1px solid var(--vf-border);
          padding: 0 0 12px;
        }
      }

      @media (max-width: 620px) {
        .vf-model-health {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelHealthPanelComponent {
  models: readonly ModelProfileStatus[] = [];

  get loadedCount(): number {
    return this.models.filter((model) => model.loaded).length;
  }

  get loadableCount(): number {
    return this.models.filter((model) => model.loadable).length;
  }

  get missingCheckpointCount(): number {
    return this.models.filter((model) => model.checkpointRequired && !model.checkpointPresent).length;
  }

  get readinessLabel(): string {
    if (this.models.length === 0) {
      return "waiting";
    }

    if (this.missingCheckpointCount > 0) {
      return "partial readiness";
    }

    return "ready";
  }

  get readinessVariant(): AppBadgeVariant {
    if (this.models.length === 0) {
      return "neutral";
    }

    return this.missingCheckpointCount > 0 ? "warning" : "success";
  }
}
