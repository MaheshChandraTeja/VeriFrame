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
import { TauriService } from "../native/tauri.service";
import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";

interface EngineStatus {
  readonly running: boolean;
  readonly port: number;
  readonly pid: number | null;
  readonly startedAt: string | null;
  readonly tokenIssued: boolean;
  readonly message: string;
  readonly logsPath: string;
}

interface ModelRegistryResponse {
  readonly loadedModels?: readonly unknown[];
}

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
          {{ engineBadgeLabel() }}
        </vf-badge>

        @if (!engineRunning()) {
          <button
            class="vf-topbar__engine-action"
            type="button"
            [disabled]="engineBusy()"
            [attr.aria-busy]="engineBusy()"
            (click)="startEngine()"
          >
            {{ engineBusy() ? 'Starting engine…' : 'Start engine' }}
          </button>
        }

        @if (engineError()) {
          <span class="vf-topbar__engine-error" [title]="engineError()">
            Engine start failed
          </span>
        }

        <span class="vf-topbar__model">
          Model: <strong>{{ modelStatusLabel() }}</strong>
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
        background: color-mix(in srgb, var(--vf-bg) 78%, transparent);
        backdrop-filter: blur(22px);
      }

      .vf-topbar__title {
        min-width: 0;
      }

      .vf-topbar__eyebrow {
        display: block;
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .vf-topbar h1 {
        margin: 4px 0 0;
        font-size: clamp(22px, 3vw, 32px);
        letter-spacing: -0.05em;
      }

      .vf-topbar__meta {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        min-width: max-content;
      }

      .vf-topbar__model,
      .vf-topbar__engine-error {
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        padding: 9px 12px;
        color: var(--vf-text-muted);
        font-size: 13px;
      }

      .vf-topbar__model strong {
        color: var(--vf-text);
      }

      .vf-topbar__engine-error {
        border-color: color-mix(in srgb, var(--vf-danger) 45%, var(--vf-border));
        background: var(--vf-danger-soft);
        color: var(--vf-danger);
        font-weight: 800;
      }

      .vf-topbar__theme,
      .vf-topbar__action,
      .vf-topbar__engine-action {
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
          border-color 160ms ease,
          opacity 160ms ease;
      }

      .vf-topbar__theme {
        width: 42px;
      }

      .vf-topbar__action,
      .vf-topbar__engine-action {
        padding: 0 14px;
        font-weight: 850;
      }

      .vf-topbar__action {
        background: var(--vf-primary);
        color: #03121d;
      }

      .vf-topbar__engine-action {
        border-color: color-mix(in srgb, var(--vf-success) 48%, var(--vf-border));
        background: linear-gradient(135deg, var(--vf-success), #7dd3fc);
        color: #03121d;
        box-shadow: 0 14px 40px rgba(123, 241, 168, 0.14);
      }

      .vf-topbar__theme:hover,
      .vf-topbar__action:hover,
      .vf-topbar__engine-action:hover {
        transform: translateY(-1px);
        border-color: var(--vf-border-strong);
      }

      .vf-topbar__engine-action:disabled {
        cursor: wait;
        opacity: 0.68;
        transform: none;
      }

      @media (max-width: 980px) {
        .vf-topbar {
          position: static;
          align-items: flex-start;
          flex-direction: column;
          padding: 18px 16px;
        }

        .vf-topbar__meta {
          flex-wrap: wrap;
          min-width: 0;
          justify-content: flex-start;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent implements OnInit, OnDestroy {
  private readonly themeService = inject(ThemeService);
  private readonly tauri = inject(TauriService);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  readonly engineStatus = signal<EngineStatus | null>(null);
  readonly engineBusy = signal(false);
  readonly engineError = signal<string | null>(null);
  readonly loadedModelCount = signal(0);

  readonly engineRunning = computed(() => this.engineStatus()?.running === true);

  readonly engineBadgeLabel = computed(() => {
    const status = this.engineStatus();

    if (this.engineBusy()) {
      return "Engine starting";
    }

    if (!status) {
      return "Engine checking";
    }

    return status.running ? "Engine online" : "Engine offline";
  });

  readonly engineBadgeVariant = computed<"success" | "warning" | "neutral">(() => {
    if (this.engineBusy()) {
      return "warning";
    }

    const status = this.engineStatus();
    if (!status) {
      return "neutral";
    }

    return status.running ? "success" : "warning";
  });

  readonly modelStatusLabel = computed(() => {
    const count = this.loadedModelCount();

    if (count === 0) {
      return "No model loaded";
    }

    return count === 1 ? "1 model loaded" : `${count} models loaded`;
  });

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

  async ngOnInit(): Promise<void> {
    await this.refreshEngineState();

    this.refreshTimer = setInterval(() => {
      void this.refreshEngineState();
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

  async startEngine(): Promise<void> {
    if (this.engineBusy()) {
      return;
    }

    this.engineBusy.set(true);
    this.engineError.set(null);

    try {
      const status = await this.tauri.invoke<EngineStatus>("start_engine");
      this.engineStatus.set(status);

      // Give the FastAPI sidecar a moment to finish binding before model registry refresh.
      window.setTimeout(() => {
        void this.refreshEngineState();
      }, 900);
    } catch (error) {
      this.engineError.set(this.errorMessage(error));
      await this.refreshEngineState();
    } finally {
      this.engineBusy.set(false);
    }
  }

  private async refreshEngineState(): Promise<void> {
    try {
      const status = await this.tauri.invoke<EngineStatus>("engine_status");
      this.engineStatus.set(status);

      if (status.running) {
        await this.refreshLoadedModels();
      } else {
        this.loadedModelCount.set(0);
      }
    } catch (error) {
      this.engineStatus.set(null);
      this.loadedModelCount.set(0);
      this.engineError.set(this.errorMessage(error));
    }
  }

  private async refreshLoadedModels(): Promise<void> {
    try {
      const registry = await this.tauri.invoke<ModelRegistryResponse>("list_models");
      this.loadedModelCount.set(registry.loadedModels?.length ?? 0);
    } catch {
      // Engine may be alive while FastAPI is still warming. Keep the top bar calm.
      this.loadedModelCount.set(0);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "The local engine could not be started.";
  }
}
