import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";

import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { AppEmptyStateComponent } from "../../shared/ui/empty-state/app-empty-state.component";
import { ReportCardComponent } from "./components/report-card.component";
import { ReportExportFormat, ReportService, ReportSummary } from "./services/report.service";

type ReportFilter = "all" | "completed" | "needs_review" | "exported";

@Component({
  selector: "vf-reports-page",
  standalone: true,
  imports: [AppBadgeComponent, AppButtonComponent, AppCardComponent, AppEmptyStateComponent, ReportCardComponent],
  template: `
    <section class="vf-reports-page">
      <header class="vf-reports-page__hero">
        <div class="vf-reports-page__hero-copy">
          <span class="vf-reports-page__eyebrow">Reports</span>
          <h1>Audit trail, without the filing cabinet tantrum.</h1>
          <p>
            Browse completed local analysis runs, export evidence, and delete stale reports
            when QA chaos has served its purpose.
          </p>

          <div class="vf-reports-page__hero-actions">
            <vf-button variant="primary" (clicked)="refresh()">
              {{ loading() ? 'Refreshing…' : 'Refresh reports' }}
            </vf-button>
          </div>
        </div>

        <aside class="vf-reports-page__hero-side">
          <div class="vf-reports-page__metric-grid">
            @for (item of summaryCards(); track item.label) {
              <article class="vf-reports-page__metric">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </article>
            }
          </div>

          <section class="vf-reports-page__note">
            <strong>Deletion policy</strong>
            <p>
              Delete removes the stored run and generated app-data artifacts.
              Exported copies outside VeriFrame are outside this app’s tiny jurisdiction.
            </p>
          </section>
        </aside>
      </header>

      <section class="vf-reports-page__statusbar">
        <div>
          <strong>Report status</strong>
          <span>{{ message() }}</span>
        </div>

        <vf-badge [variant]="statusVariant()">
          {{ statusLabel() }}
        </vf-badge>
      </section>

      <section class="vf-reports-page__toolbar">
        <div class="vf-reports-page__filters" aria-label="Report filters">
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

        <div class="vf-reports-page__search">
          <input
            type="search"
            placeholder="Search run id, source path, or workflow"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          >
        </div>
      </section>

      <vf-card title="Analysis reports" subtitle="Stored locally and exportable as HTML, JSON, evidence map, or audit receipt.">
        @if (visibleReports().length === 0) {
          <vf-empty-state
            icon="🧾"
            title="No matching reports"
            description="Refresh reports or adjust the filter. If nothing appears, the engine is probably sulking."
          />
        } @else {
          <div class="vf-reports-page__grid">
            @for (report of visibleReports(); track report.runId) {
              <vf-report-card
                [report]="report"
                (exportRequested)="export($event.runId, $event.format)"
                (deleteRequested)="openDeleteDialog($event)"
              />
            }
          </div>
        }
      </vf-card>

      @if (reportPendingDelete(); as report) {
        <div class="vf-delete-dialog" role="presentation" (click)="closeDeleteDialog()">
          <section
            class="vf-delete-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-report-title"
            (click)="$event.stopPropagation()"
          >
            <div class="vf-delete-dialog__icon">🧨</div>

            <div class="vf-delete-dialog__copy">
              <span>Delete report</span>
              <h2 id="delete-report-title">Remove this audit run?</h2>
              <p>
                This deletes the stored report record and generated artifacts for this run.
                It does not chase down copies you exported elsewhere, because unlike certain software,
                it knows boundaries.
              </p>
            </div>

            <dl class="vf-delete-dialog__details">
              <div>
                <dt>Run</dt>
                <dd>{{ report.runId }}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{{ report.sourcePath }}</dd>
              </div>
              <div>
                <dt>Contents</dt>
                <dd>{{ report.findingCount }} finding(s), {{ report.regionCount }} region(s), {{ report.artifactCount }} artifact(s)</dd>
              </div>
            </dl>

            <div class="vf-delete-dialog__actions">
              <vf-button variant="ghost" (clicked)="closeDeleteDialog()">Cancel</vf-button>
              <vf-button variant="danger" (clicked)="confirmDeleteReport()">
                {{ deleting() ? 'Deleting…' : 'Delete report' }}
              </vf-button>
            </div>
          </section>
        </div>
      }
    </section>
  `,
  styleUrl: "./reports.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent {
  private readonly reportService = inject(ReportService);

  readonly reports = signal<readonly ReportSummary[]>([]);
  readonly message = signal<string>("Start the local engine, then refresh reports.");
  readonly loading = signal(false);
  readonly deleting = signal(false);
  readonly lastRefreshOk = signal<boolean | null>(null);
  readonly query = signal("");
  readonly activeFilter = signal<ReportFilter>("all");
  readonly reportPendingDelete = signal<ReportSummary | null>(null);

  readonly filters: readonly { id: ReportFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "completed", label: "Completed" },
    { id: "needs_review", label: "Needs review" },
    { id: "exported", label: "Exported" }
  ];

  readonly totalFindings = computed(() =>
    this.reports().reduce((sum, report) => sum + report.findingCount, 0)
  );

  readonly exportedCount = computed(() =>
    this.reports().filter((report) => report.artifactCount > 0).length
  );

  readonly completedCount = computed(() =>
    this.reports().filter((report) => report.status === "completed").length
  );

  readonly summaryCards = computed(() => [
    { label: "Reports", value: String(this.reports().length), hint: "runs found" },
    { label: "Findings", value: String(this.totalFindings()), hint: "review items" },
    { label: "Exported", value: String(this.exportedCount()), hint: "with artifacts" },
    { label: "Completed", value: String(this.completedCount()), hint: "finished runs" }
  ]);

  readonly visibleReports = computed(() => {
    const query = this.query().trim().toLowerCase();
    const filter = this.activeFilter();

    return this.reports().filter((report) => {
      const matchesQuery =
        query.length === 0 ||
        report.runId.toLowerCase().includes(query) ||
        report.requestId.toLowerCase().includes(query) ||
        report.workflow.toLowerCase().includes(query) ||
        report.sourcePath.toLowerCase().includes(query);

      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && report.status === "completed") ||
        (filter === "needs_review" && report.findingCount > 0) ||
        (filter === "exported" && report.artifactCount > 0);

      return matchesQuery && matchesFilter;
    });
  });

  readonly statusLabel = computed(() => {
    if (this.loading()) return "loading";
    if (this.deleting()) return "deleting";
    const state = this.lastRefreshOk();
    if (state === null) return "idle";
    return state ? "ready" : "attention";
  });

  readonly statusVariant = computed<"neutral" | "info" | "success" | "warning">(() => {
    if (this.loading() || this.deleting()) return "info";
    const state = this.lastRefreshOk();
    if (state === null) return "neutral";
    return state ? "success" : "warning";
  });

  async ngOnInit(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.message.set("Refreshing report list…");

    try {
      const response = await this.reportService.listReports();
      this.reports.set(response.reports);
      this.lastRefreshOk.set(true);
      this.message.set(`Loaded ${response.reports.length} report(s).`);
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async export(runId: string, format: ReportExportFormat): Promise<void> {
    try {
      const response = await this.reportService.exportReport(runId, format);
      this.message.set(`Exported ${format} to ${response.path}`);
      await this.refresh();
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    }
  }

  openDeleteDialog(runId: string): void {
    const report = this.reports().find((item) => item.runId === runId);

    if (!report) {
      this.message.set(`Report ${runId} is not in the current list. Refresh and try again.`);
      return;
    }

    this.reportPendingDelete.set(report);
  }

  closeDeleteDialog(): void {
    if (this.deleting()) return;
    this.reportPendingDelete.set(null);
  }

  async confirmDeleteReport(): Promise<void> {
    const report = this.reportPendingDelete();
    if (!report) return;

    this.deleting.set(true);
    this.message.set(`Deleting report ${report.runId}…`);

    try {
      await this.reportService.deleteReport(report.runId);
      this.reports.set(this.reports().filter((item) => item.runId !== report.runId));
      this.lastRefreshOk.set(true);
      this.message.set(`Deleted report ${report.runId}.`);
      this.reportPendingDelete.set(null);
    } catch (error) {
      this.lastRefreshOk.set(false);
      this.message.set(this.errorMessage(error));
    } finally {
      this.deleting.set(false);
    }
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;

    if (error && typeof error === "object") {
      const maybeMessage = (error as { message?: unknown }).message;
      if (typeof maybeMessage === "string") return maybeMessage;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown error";
    }
  }
}
