import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from "@angular/core";
import { RouterLink } from "@angular/router";

import { ThemeService } from "../theme/theme.service";
import { AppBadgeComponent, type AppBadgeVariant } from "../../shared/ui/badge/app-badge.component";
import { ModelService, type LoadedModelSummary } from "../../features/models/services/model.service";

@Component({
  selector: "vf-topbar",
  standalone: true,
  imports: [RouterLink, AppBadgeComponent],
  template: `
    <header class="vf-topbar">
      <div class="vf-topbar__title">
        <span class="vf-topbar__eyebrow">Evidence workspace</span>
        <h1>Visual audit console</h1>
      </div>

      <div class="vf-topbar__meta" aria-label="Application status">
        <vf-badge [variant]="engineBadgeVariant()">
          {{ engineLabel() }}
        </vf-badge>

        <span class="vf-topbar__model" [title]="modelTooltip()">
          Model:
          <strong>{{ modelLabel() }}</strong>
        </span>

        <button
          class="vf-topbar__theme"
          type="button"
          [attr.aria-label]="themeButtonLabel()"
          (click)="toggleTheme()"
        >
          {{ themeIcon() }}
        </button>

        <a class="vf-topbar__action" routerLink="/import">New analysis</a>
      </div>
    </header>
  `,
  styles: [
    `
      .vf-topbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        min-height: 82px;
        padding: 18px 28px;
        border-bottom: 1px solid var(--vf-border);
        background:
          radial-gradient(circle at 80% 0%, rgba(56, 189, 248, 0.08), transparent 26rem),
          color-mix(in srgb, var(--vf-bg) 82%, transparent);
        backdrop-filter: blur(22px);
      }

      .vf-topbar__title {
        min-width: 0;
      }

      .vf-topbar__eyebrow {
        display: block;
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .vf-topbar h1 {
        margin: 4px 0 0;
        color: var(--vf-text);
        font-size: clamp(22px, 3vw, 32px);
        line-height: 1;
        letter-spacing: -0.06em;
      }

      .vf-topbar__meta {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: max-content;
      }

      .vf-topbar__model {
        max-width: min(360px, 34vw);
        overflow: hidden;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: rgba(2, 6, 23, 0.22);
        padding: 9px 12px;
        color: var(--vf-text-muted);
        font-size: 13px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .vf-topbar__model strong {
        color: var(--vf-text);
      }

      .vf-topbar__theme,
      .vf-topbar__action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 38px;
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        background: var(--vf-surface);
        color: var(--vf-text);
        cursor: pointer;
        transition:
          background 160ms ease,
          transform 160ms ease,
          border-color 160ms ease;
      }

      .vf-topbar__theme {
        width: 42px;
      }

      .vf-topbar__action {
        padding: 0 14px;
        background: var(--vf-primary);
        color: #03121d;
        font-weight: 900;
      }

      .vf-topbar__theme:hover,
      .vf-topbar__action:hover {
        transform: translateY(-1px);
        border-color: var(--vf-border-strong);
      }

      @media (max-width: 880px) {
        .vf-topbar {
          position: static;
          align-items: flex-start;
          flex-direction: column;
          padding: 18px 16px;
        }

        .vf-topbar__meta {
          flex-wrap: wrap;
          min-width: 0;
        }

        .vf-topbar__model {
          max-width: 100%;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly modelService = inject(ModelService);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly engineOnline = signal<boolean | null>(null);
  readonly loadedModels = signal<readonly LoadedModelSummary[]>([]);

  readonly themeIcon = computed(() => {
    const preference = this.themeService.preference();

    if (preference === "system") {
      return "◐";
    }

    return preference === "dark" ? "☾" : "☀";
  });

  readonly themeButtonLabel = computed(
    () => `Current theme: ${this.themeService.preference()}. Toggle theme.`
  );

  readonly engineLabel = computed(() => {
    const state = this.engineOnline();

    if (state === null) {
      return "Engine checking";
    }

    return state ? "Engine online" : "Engine offline";
  });

  readonly engineBadgeVariant = computed<AppBadgeVariant>(() => {
    const state = this.engineOnline();

    if (state === null) {
      return "neutral";
    }

    return state ? "success" : "danger";
  });

  readonly modelLabel = computed(() => {
    const loaded = this.loadedModels();

    if (loaded.length === 0) {
      return "No model loaded";
    }

    if (loaded.length === 1) {
      return loaded[0]?.name ?? "1 model loaded";
    }

    return `${loaded.length} models loaded`;
  });

  readonly modelTooltip = computed(() => {
    const loaded = this.loadedModels();

    if (loaded.length === 0) {
      return "No TorchVision model is currently loaded in the engine.";
    }

    return loaded
      .map((model) => `${model.name} · ${model.task} · ${model.device}`)
      .join("\n");
  });

  ngOnInit(): void {
    void this.refreshStatus();

    this.refreshTimer = setInterval(() => {
      void this.refreshStatus();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  private async refreshStatus(): Promise<void> {
    try {
      const response = await this.modelService.listModels();
      this.loadedModels.set(response.loadedModels);
      this.engineOnline.set(true);
    } catch {
      this.loadedModels.set([]);
      this.engineOnline.set(false);
    }
  }
}
