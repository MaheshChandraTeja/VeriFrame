import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";

import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { AppEmptyStateComponent } from "../../shared/ui/empty-state/app-empty-state.component";
import { ModelCardComponent } from "./components/model-card.component";
import { ModelHealthPanelComponent } from "./components/model-health-panel.component";
import { ModelProfileStatus, ModelService, ModelTask } from "./services/model.service";

type ModelFilter = "all" | ModelTask | "loaded" | "ready" | "missing_checkpoint";

@Component({
  selector: "vf-models-page",
  standalone: true,
  imports: [
    AppBadgeComponent,
    AppButtonComponent,
    AppCardComponent,
    AppEmptyStateComponent,
    ModelCardComponent,
    ModelHealthPanelComponent
  ],
  template: `
    <section class="vf-models-page">
      <header class="vf-models-page__hero">
        <div class="vf-models-page__hero-copy">
          <span class="vf-models-page__eyebrow">Model registry</span>
          <h1>Load the right vision model, without cooking the laptop.</h1>
          <p>
            Inspect TorchVision profiles, checkpoint readiness, labels, loaded state,
            and CPU-first inference settings from one local registry.
          </p>

          <div class="vf-models-page__hero-actions">
            <vf-button variant="primary" (clicked)="refresh()">
              {{ loading() ? 'Refreshing…' : 'Refresh models' }}
            </vf-button>
            <vf-button
              variant="secondary"
              [disabled]="firstLoadableUnloadedModel() === null"
              (clicked)="loadFirstReadyModel()"
            >
              Load first ready model
            </vf-button>
          </div>
        </div>

        <aside class="vf-models-page__hero-side">
          <div class="vf-models-page__metric-grid">
            @for (item of summaryCards(); track item.label) {
              <article class="vf-models-page__metric">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </article>
            }
          </div>

          <section class="vf-models-page__note">
            <strong>How to read this page</strong>
            <p>
              A profile can be available even without a fine-tuned checkpoint. That means the
              architecture can load, but it may not be useful for domain-specific evidence work yet.
            </p>
          </section>
        </aside>
      </header>

      <section class="vf-models-page__statusbar">
        <div>
          <strong>Registry status</strong>
          <span>{{ message() }}</span>
        </div>

        <vf-badge [variant]="statusVariant()">
          {{ statusLabel() }}
        </vf-badge>
      </section>

      <vf-model-health-panel [models]="models()" />

      <section class="vf-models-page__toolbar">
        <div class="vf-models-page__filters" aria-label="Model filters">
          @for (filter of filters; track filter.id) {
            <button
              type="button"
              [class.is-active]="activeFilter() === filter.id"
              (click)="activeFilter.set(filter.id)"
            >
              {{ filter.label }}
            </button>
          }
        </div>

        <div class="vf-models-page__search">
          <input
            type="search"
            placeholder="Search model name, id, label, or description"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          >
        </div>
      </section>

      <div class="vf-models-page__layout">
        <main class="vf-models-page__main">
          <vf-card
            title="Available model profiles"
            subtitle="Profiles are loaded from local config files and exposed by the Python engine."
          >
            @if (visibleModels().length === 0) {
              <vf-empty-state
                icon="🧠"
                title="No matching model profiles"
                description="Refresh models, clear the search/filter, or confirm the engine is running on 127.0.0.1:32187."
              />
            } @else {
              <div class="vf-models-page__grid">
                @for (model of visibleModels(); track model.modelId) {
                  <vf-model-card
                    [model]="model"
                    (loadModel)="load($event, false)"
                    (loadWarmModel)="load($event, true)"
                    (unloadModel)="unload($event)"
                  />
                }
              </div>
            }
          </vf-card>
        </main>

        <aside class="vf-models-page__side">
          <vf-card
            title="Model readiness"
            subtitle="What these states actually mean."
          >
            <div class="vf-models-page__guide">
              <article>
                <strong>Available</strong>
                <p>The profile exists and can load with the current config. Accuracy still depends on training and checkpoints.</p>
              </article>
              <article>
                <strong>Loaded</strong>
                <p>The model is in engine memory and ready for inference. On CPU, keep your expectations emotionally modest.</p>
              </article>
              <article>
                <strong>Missing checkpoint</strong>
                <p>A required checkpoint is absent. Put the file where the config expects it, then refresh.</p>
              </article>
              <article>
                <strong>Warmup</strong>
                <p>Runs a small first pass after loading so the first real request pays less startup tax.</p>
              </article>
            </div>
          </vf-card>

          <vf-card
            title="Current recommendation"
            subtitle="For QA and early development."
          >
            <div class="vf-models-page__recommendation">
              <strong>{{ recommendationTitle() }}</strong>
              <p>{{ recommendationText() }}</p>
            </div>
          </vf-card>
        </aside>
      </div>
    </section>
  `,
  styleUrl: "./models.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelsPageComponent {
  private readonly modelService = inject(ModelService);

  readonly models = signal<readonly ModelProfileStatus[]>([]);
  readonly loadedModelIds = signal<readonly string[]>([]);
  readonly message = signal<string>("Start the local engine, then refresh the registry.");
  readonly loading = signal(false);
  readonly lastRefreshOk = signal<boolean | null>(null);
  readonly query = signal("");
  readonly activeFilter = signal<ModelFilter>("all");

  readonly filters: readonly { id: ModelFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "detection", label: "Detection" },
    { id: "segmentation", label: "Segmentation" },
    { id: "classification", label: "Classification" },
    { id: "loaded", label: "Loaded" },
    { id: "ready", label: "Ready" },
    { id: "missing_checkpoint", label: "Missing checkpoint" }
  ];

  readonly loadedCount = computed(() => this.models().filter((model) => model.loaded).length);

  readonly missingCheckpointCount = computed(() =>
    this.models().filter((model) => model.checkpointRequired && !model.checkpointPresent).length
  );

  readonly loadableCount = computed(() => this.models().filter((model) => model.loadable).length);

  readonly detectionCount = computed(() => this.models().filter((model) => model.task === "detection").length);

  readonly firstLoadableUnloadedModel = computed(() =>
    this.models().find((model) => model.loadable && !model.loaded) ?? null
  );

  readonly summaryCards = computed(() => [
    {
      label: "Profiles",
      value: String(this.models().length),
      hint: "local configs"
    },
    {
      label: "Loaded",
      value: String(this.loadedCount()),
      hint: "in engine memory"
    },
    {
      label: "Ready",
      value: String(this.loadableCount()),
      hint: "loadable now"
    },
    {
      label: "Detection",
      value: String(this.detectionCount()),
      hint: "vision profiles"
    }
  ]);

  readonly visibleModels = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.models().filter((model) => {
      const matchesQuery =
        query.length === 0 ||
        model.modelId.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.labels.some((label) => label.toLowerCase().includes(query));

      const matchesFilter =
        filter === "all" ||
        model.task === filter ||
        (filter === "loaded" && model.loaded) ||
        (filter === "ready" && model.loadable) ||
        (filter === "missing_checkpoint" && model.checkpointRequired && !model.checkpointPresent);

      return matchesQuery && matchesFilter;
    });
  });

  readonly statusLabel = computed(() => {
    if (this.loading()) {
      return "loading";
    }

    const state = this.lastRefreshOk();
    if (state === null) {
      return "idle";
    }

    return state ? "ready" : "attention";
  });

  readonly statusVariant = computed<"neutral" | "info" | "success" | "warning">(() => {
    if (this.loading()) {
      return "info";
    }

    const state = this.lastRefreshOk();
    if (state === null) {
      return "neutral";
    }

    return state ? "success" : "warning";
  });

  readonly recommendationTitle = computed(() => {
    if (this.models().length === 0) {
      return "No profiles visible";
    }

    if (this.loadedCount() === 0) {
      return "Load one detector before analysis";
    }

    return "Model layer is ready for QA";
  });

  readonly recommendationText = computed(() => {
    if (this.models().length === 0) {
      return "The engine API can list models directly, so if this stays empty, restart the desktop shell and check the Tauri model command bridge.";
    }

    if (this.loadedCount() === 0) {
      return "For receipt and package tests, load a detector first. Otherwise analysis will only produce quality and pipeline warnings.";
    }

    return "Run a fresh analysis with requestedTasks including detection and the relevant modelProfileIds.";
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.message.set("Refreshing model registry…");

    try {
      const response = await this.modelService.listModels();
      this.models.set(response.availableModels);
      this.loadedModelIds.set(response.loadedModels.map((model) => model.modelId));
      this.lastRefreshOk.set(true);
      this.message.set(`Loaded ${response.availableModels.length} model profile(s).`);
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async loadFirstReadyModel(): Promise<void> {
    const model = this.firstLoadableUnloadedModel();

    if (!model) {
      this.message.set("No unloaded loadable model is available.");
      return;
    }

    await this.load(model.modelId, false);
  }

  async load(modelId: string, warmup: boolean): Promise<void> {
    try {
      const response = await this.modelService.loadModel(modelId, warmup);
      this.message.set(response.message);
      await this.refresh();
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    }
  }

  async unload(modelId: string): Promise<void> {
    try {
      const response = await this.modelService.unloadModel(modelId);
      this.message.set(response.message);
      await this.refresh();
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === "string") {
      return error;
    }

    if (error && typeof error === "object") {
      const record = error as Record<string, unknown>;
      const message = record["message"];
      const code = record["code"];

      if (typeof message === "string" && typeof code === "string") {
        return `${code}: ${message}`;
      }

      if (typeof message === "string") {
        return message;
      }

      try {
        return JSON.stringify(error);
      } catch {
        return "Unknown object error";
      }
    }

    return "Unable to list models.";
  }
}
