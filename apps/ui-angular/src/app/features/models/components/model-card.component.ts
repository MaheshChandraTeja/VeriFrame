import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";
import type { ModelProfileStatus } from "../services/model.service";

@Component({
  selector: "vf-model-card",
  standalone: true,
  imports: [AppBadgeComponent, AppButtonComponent],
  inputs: ["model"],
  outputs: ["loadModel", "loadWarmModel", "unloadModel"],
  template: `
    @if (model) {
      <article class="vf-model-card">
        <header class="vf-model-card__header">
          <div>
            <span class="vf-model-card__eyebrow">{{ model.task }}</span>
            <h3>{{ model.name }}</h3>
            <p>{{ model.description }}</p>
          </div>

          <vf-badge [variant]="badgeVariant(model)">
            {{ badgeLabel(model) }}
          </vf-badge>
        </header>

        <dl class="vf-model-card__meta">
          <div>
            <dt>Version</dt>
            <dd>{{ model.version }}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>{{ model.device || 'not loaded' }}</dd>
          </div>
          <div>
            <dt>Checkpoint</dt>
            <dd>{{ checkpointLabel(model) }}</dd>
          </div>
          <div>
            <dt>Labels</dt>
            <dd>{{ model.labels.length }}</dd>
          </div>
        </dl>

        <section class="vf-model-card__paths">
          <div>
            <span>Config</span>
            <code>{{ compactPath(model.configPath) }}</code>
          </div>

          @if (model.checkpointPath) {
            <div>
              <span>Checkpoint</span>
              <code>{{ compactPath(model.checkpointPath) }}</code>
            </div>
          }
        </section>

        <section class="vf-model-card__labels">
          @for (label of visibleLabels(); track label) {
            <span>{{ label }}</span>
          }

          @if (model.labels.length > visibleLabels().length) {
            <span>+{{ model.labels.length - visibleLabels().length }} more</span>
          }
        </section>

        <footer class="vf-model-card__footer">
          @if (model.loaded) {
            <vf-button variant="secondary" size="sm" (clicked)="unloadModel.emit(model.modelId)">
              Unload
            </vf-button>
          } @else {
            <vf-button
              variant="primary"
              size="sm"
              [disabled]="!model.loadable"
              (clicked)="loadModel.emit(model.modelId)"
            >
              Load
            </vf-button>

            <vf-button
              variant="ghost"
              size="sm"
              [disabled]="!model.loadable"
              (clicked)="loadWarmModel.emit(model.modelId)"
            >
              Load + warmup
            </vf-button>
          }
        </footer>
      </article>
    }
  `,
  styles: [
    `
      .vf-model-card {
        display: grid;
        gap: 16px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.018), transparent 35%),
          var(--vf-surface);
        box-shadow: var(--vf-shadow-sm);
        padding: 18px;
      }

      .vf-model-card__header,
      .vf-model-card__footer {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }

      .vf-model-card__footer {
        border-top: 1px solid var(--vf-border);
        padding-top: 14px;
        justify-content: flex-start;
        flex-wrap: wrap;
      }

      .vf-model-card__eyebrow {
        display: inline-flex;
        width: fit-content;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-bg-elevated);
        color: var(--vf-primary);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        padding: 6px 9px;
        text-transform: uppercase;
      }

      h3 {
        margin: 12px 0 0;
        color: var(--vf-text);
        font-size: 22px;
        letter-spacing: -0.06em;
      }

      p {
        margin: 7px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      .vf-model-card__meta {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        margin: 0;
      }

      .vf-model-card__meta div,
      .vf-model-card__paths div {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: rgba(2, 6, 23, 0.2);
        padding: 11px 12px;
      }

      dt,
      .vf-model-card__paths span {
        display: block;
        color: var(--vf-text-muted);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      dd {
        margin: 6px 0 0;
        color: var(--vf-text);
        font-weight: 900;
      }

      .vf-model-card__paths {
        display: grid;
        gap: 10px;
      }

      code {
        display: block;
        margin-top: 6px;
        color: var(--vf-primary);
        overflow-wrap: anywhere;
      }

      .vf-model-card__labels {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
      }

      .vf-model-card__labels span {
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-bg-elevated);
        color: var(--vf-text-soft);
        font-size: 12px;
        font-weight: 800;
        padding: 7px 9px;
      }

      @media (max-width: 920px) {
        .vf-model-card__header {
          align-items: flex-start;
          flex-direction: column;
        }

        .vf-model-card__meta {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        .vf-model-card__meta {
          grid-template-columns: 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelCardComponent {
  model: ModelProfileStatus | null = null;
  readonly loadModel = new EventEmitter<string>();
  readonly loadWarmModel = new EventEmitter<string>();
  readonly unloadModel = new EventEmitter<string>();

  visibleLabels(): readonly string[] {
    return this.model?.labels.slice(0, 8) ?? [];
  }

  badgeLabel(model: ModelProfileStatus): string {
    if (model.loaded) {
      return "loaded";
    }

    if (!model.loadable) {
      return "missing checkpoint";
    }

    return "available";
  }

  badgeVariant(model: ModelProfileStatus): AppBadgeVariant {
    if (model.loaded) {
      return "success";
    }

    if (!model.loadable) {
      return "danger";
    }

    return "info";
  }

  checkpointLabel(model: ModelProfileStatus): string {
    if (!model.checkpointRequired) {
      return "not required";
    }

    return model.checkpointPresent ? "present" : "missing";
  }

  compactPath(value: string): string {
    const parts = value.split(/[\\/]/);

    if (parts.length <= 3) {
      return value;
    }

    return `…/${parts.slice(-3).join("/")}`;
  }
}
