import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { AppProgressRingComponent } from "../../shared/ui/progress-ring/app-progress-ring.component";
import { ModelService, type ModelProfileStatus } from "../models/services/model.service";
import { ReportService, type ReportSummary } from "../reports/services/report.service";

@Component({
  selector: "vf-dashboard-page",
  standalone: true,
  imports: [
    RouterLink,
    AppBadgeComponent,
    AppButtonComponent,
    AppCardComponent,
    AppProgressRingComponent
  ],
  template: `
    <section class="vf-dashboard">
      <header class="vf-dashboard__hero">
        <div class="vf-dashboard__hero-copy">
          <span class="vf-dashboard__eyebrow">Command center</span>
          <h1>Local visual audits, minus the cloud circus.</h1>
          <p>
            Import evidence, load TorchVision models, review findings, export reports,
            and keep the entire audit trail on this machine. Wild concept, apparently.
          </p>

          <div class="vf-dashboard__actions">
            <a routerLink="/import">
              <vf-button variant="primary">Start new audit</vf-button>
            </a>
            <a routerLink="/models">
              <vf-button variant="secondary">Manage models</vf-button>
            </a>
            <a routerLink="/reports">
              <vf-button variant="ghost">Open reports</vf-button>
            </a>
          </div>
        </div>

        <aside class="vf-dashboard__hero-card">
          <vf-progress-ring [value]="readinessScore()" [label]="readinessScore() + '%'" />
          <div>
            <strong>{{ readinessLabel() }}</strong>
            <span>{{ readinessHint() }}</span>
          </div>
        </aside>
      </header>

      <section class="vf-dashboard__status-strip">
        @for (item of statusTiles(); track item.label) {
          <article>
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.hint }}</small>
          </article>
        }
      </section>

      <section class="vf-dashboard__layout">
        <main class="vf-dashboard__main">
          <vf-card title="Operational snapshot" subtitle="Real data from the local engine where available. No crystal ball, sadly.">
            <div class="vf-dashboard__ops">
              <article class="vf-dashboard__ops-card is-engine">
                <div>
                  <span>Engine</span>
                  <strong>{{ engineOnline() ? 'Online' : 'Offline' }}</strong>
                  <p>{{ engineMessage() }}</p>
                </div>

                <vf-badge [variant]="engineOnline() ? 'success' : 'danger'">
                  {{ engineOnline() ? 'ready' : 'offline' }}
                </vf-badge>
              </article>

              <article class="vf-dashboard__ops-card is-model">
                <div>
                  <span>Models</span>
                  <strong>{{ loadedModelLabel() }}</strong>
                  <p>{{ modelMessage() }}</p>
                </div>

                <vf-badge [variant]="loadedCount() > 0 ? 'success' : 'warning'">
                  {{ loadedCount() }} loaded
                </vf-badge>
              </article>

              <article class="vf-dashboard__ops-card is-report">
                <div>
                  <span>Reports</span>
                  <strong>{{ reports().length }} runs</strong>
                  <p>{{ reportMessage() }}</p>
                </div>

                <vf-badge [variant]="reports().length > 0 ? 'success' : 'neutral'">
                  {{ totalFindings() }} findings
                </vf-badge>
              </article>
            </div>
          </vf-card>

          <vf-card title="Recent audit runs" subtitle="Latest persisted analysis runs from local storage.">
            @if (reports().length === 0) {
              <div class="vf-dashboard__empty">
                <strong>No persisted runs yet.</strong>
                <p>
                  Import an image and run analysis. Reports will appear here once the engine writes them to storage.
                </p>
                <a routerLink="/import">
                  <vf-button variant="primary">Import evidence</vf-button>
                </a>
              </div>
            } @else {
              <div class="vf-dashboard__runs">
                @for (report of recentReports(); track report.runId) {
                  <article class="vf-dashboard__run">
                    <div>
                      <span>{{ compactPath(report.sourcePath) }}</span>
                      <strong>{{ fileName(report.sourcePath) }}</strong>
                      <small>{{ formatDate(report.completedAt ?? report.createdAt) }}</small>
                    </div>

                    <div class="vf-dashboard__run-meta">
                      <span>{{ report.findingCount }} finding(s)</span>
                      <vf-badge [variant]="report.status === 'completed' ? 'success' : 'warning'">
                        {{ report.status }}
                      </vf-badge>
                    </div>
                  </article>
                }
              </div>
            }
          </vf-card>
        </main>

        <aside class="vf-dashboard__side">
          <vf-card title="Model readiness" subtitle="The model layer is where the magic either happens or quietly refuses.">
            <div class="vf-dashboard__model-list">
              @if (models().length === 0) {
                <div class="vf-dashboard__mini-empty">
                  <strong>No profiles visible.</strong>
                  <p>Start the engine and refresh. If the API works but this is empty, Tauri is sulking again.</p>
                </div>
              } @else {
                @for (model of topModels(); track model.modelId) {
                  <article>
                    <div>
                      <strong>{{ model.name }}</strong>
                      <span>{{ model.task }} · {{ model.labels.length }} labels</span>
                    </div>

                    <vf-badge [variant]="model.loaded ? 'success' : model.loadable ? 'info' : 'danger'">
                      {{ model.loaded ? 'loaded' : model.loadable ? 'available' : 'blocked' }}
                    </vf-badge>
                  </article>
                }
              }
            </div>
          </vf-card>

          <vf-card title="Privacy posture" subtitle="The app is local-first by design, not by accident.">
            <div class="vf-dashboard__privacy">
              @for (item of privacyItems; track item.title) {
                <article>
                  <span aria-hidden="true">✓</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                </article>
              }
            </div>
          </vf-card>

          <vf-card title="Recommended next move" subtitle="Based on the current local state.">
            <div class="vf-dashboard__next">
              <strong>{{ nextMoveTitle() }}</strong>
              <p>{{ nextMoveText() }}</p>
              <a [routerLink]="nextMoveRoute()">
                <vf-button variant="secondary">{{ nextMoveAction() }}</vf-button>
              </a>
            </div>
          </vf-card>
        </aside>
      </section>
    </section>
  `,
  styleUrl: "./dashboard.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPageComponent {
  private readonly modelService = inject(ModelService);
  private readonly reportService = inject(ReportService);

  readonly models = signal<readonly ModelProfileStatus[]>([]);
  readonly reports = signal<readonly ReportSummary[]>([]);
  readonly engineOnline = signal(false);
  readonly loading = signal(false);
  readonly message = signal("Loading local dashboard state…");

  readonly privacyItems = [
    {
      title: "Images stay local",
      description: "Imports, previews, reports, and receipts stay on this device."
    },
    {
      title: "No telemetry",
      description: "The machine keeps its thoughts to itself, for once."
    },
    {
      title: "Tauri guards native access",
      description: "Angular talks to safe services, not directly to Python or the file system."
    }
  ] as const;

  readonly loadedCount = computed(() => this.models().filter((model) => model.loaded).length);
  readonly loadableCount = computed(() => this.models().filter((model) => model.loadable).length);
  readonly totalFindings = computed(() =>
    this.reports().reduce((sum, report) => sum + report.findingCount, 0)
  );

  readonly recentReports = computed(() => this.reports().slice(0, 5));

  readonly topModels = computed(() => {
    const loaded = this.models().filter((model) => model.loaded);
    const available = this.models().filter((model) => !model.loaded && model.loadable);

    return [...loaded, ...available].slice(0, 5);
  });

  readonly readinessScore = computed(() => {
    let score = 30;

    if (this.engineOnline()) {
      score += 25;
    }

    if (this.models().length > 0) {
      score += 15;
    }

    if (this.loadedCount() > 0) {
      score += 20;
    }

    if (this.reports().length > 0) {
      score += 10;
    }

    return Math.min(100, score);
  });

  readonly readinessLabel = computed(() => {
    const score = this.readinessScore();

    if (score >= 90) {
      return "Audit stack ready";
    }

    if (score >= 70) {
      return "Mostly ready";
    }

    if (score >= 50) {
      return "Needs setup";
    }

    return "Waiting for engine";
  });

  readonly readinessHint = computed(() => {
    if (!this.engineOnline()) {
      return "Start the local engine first.";
    }

    if (this.loadedCount() === 0) {
      return "Load a model before detection runs.";
    }

    if (this.reports().length === 0) {
      return "Run an analysis to produce reports.";
    }

    return "Engine, models, and reports are visible.";
  });

  readonly statusTiles = computed(() => [
    {
      label: "Engine",
      value: this.engineOnline() ? "Online" : "Offline",
      hint: this.engineOnline() ? "local API reachable" : "start pnpm dev:engine"
    },
    {
      label: "Model profiles",
      value: String(this.models().length),
      hint: `${this.loadedCount()} loaded`
    },
    {
      label: "Reports",
      value: String(this.reports().length),
      hint: "persisted runs"
    },
    {
      label: "Findings",
      value: String(this.totalFindings()),
      hint: "review items"
    }
  ]);

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);

    const [modelsResult, reportsResult] = await Promise.allSettled([
      this.modelService.listModels(),
      this.reportService.listReports()
    ]);

    if (modelsResult.status === "fulfilled") {
      this.models.set(modelsResult.value.availableModels);
      this.engineOnline.set(true);
    } else {
      this.models.set([]);
      this.engineOnline.set(false);
    }

    if (reportsResult.status === "fulfilled") {
      this.reports.set(reportsResult.value.reports);
      if (modelsResult.status !== "fulfilled") {
        this.engineOnline.set(true);
      }
    } else {
      this.reports.set([]);
    }

    this.message.set("Dashboard updated.");
    this.loading.set(false);
  }

  loadedModelLabel(): string {
    const loaded = this.models().filter((model) => model.loaded);

    if (loaded.length === 0) {
      return "No model loaded";
    }

    if (loaded.length === 1) {
      return loaded[0]?.name ?? "1 model loaded";
    }

    return `${loaded.length} models loaded`;
  }

  engineMessage(): string {
    return this.engineOnline()
      ? "The local engine API is reachable through the desktop bridge."
      : "Start the Python engine or let Tauri launch the sidecar.";
  }

  modelMessage(): string {
    if (this.models().length === 0) {
      return "No model profiles are visible yet.";
    }

    if (this.loadedCount() === 0) {
      return "Profiles are available, but detection will be skipped until a model is loaded.";
    }

    return `${this.loadedCount()} model(s) are ready for local inference.`;
  }

  reportMessage(): string {
    if (this.reports().length === 0) {
      return "No persisted analysis runs yet.";
    }

    return "Reports are stored locally and available for export.";
  }

  nextMoveTitle(): string {
    if (!this.engineOnline()) {
      return "Start the engine";
    }

    if (this.loadedCount() === 0) {
      return "Load a detector";
    }

    if (this.reports().length === 0) {
      return "Run your first audit";
    }

    return "Review reports";
  }

  nextMoveText(): string {
    if (!this.engineOnline()) {
      return "Run pnpm dev:engine in another terminal, then refresh the page.";
    }

    if (this.loadedCount() === 0) {
      return "Open Models and load a detector before expecting regions. Otherwise you only get quality warnings. Thrilling, but limited.";
    }

    if (this.reports().length === 0) {
      return "Import a receipt, package, or display image and run analysis to create a report.";
    }

    return "Open Reports to inspect findings, export HTML, or review audit receipts.";
  }

  nextMoveRoute(): string {
    if (!this.engineOnline()) {
      return "/doctor";
    }

    if (this.loadedCount() === 0) {
      return "/models";
    }

    if (this.reports().length === 0) {
      return "/import";
    }

    return "/reports";
  }

  nextMoveAction(): string {
    if (!this.engineOnline()) {
      return "Open Doctor";
    }

    if (this.loadedCount() === 0) {
      return "Open Models";
    }

    if (this.reports().length === 0) {
      return "Import evidence";
    }

    return "Open Reports";
  }

  compactPath(value: string): string {
    const parts = value.split(/[\\/]/);

    if (parts.length <= 3) {
      return value;
    }

    return `…/${parts.slice(-3).join("/")}`;
  }

  fileName(value: string): string {
    return value.split(/[\\/]/).at(-1) || value;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return "not completed";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  }
}
