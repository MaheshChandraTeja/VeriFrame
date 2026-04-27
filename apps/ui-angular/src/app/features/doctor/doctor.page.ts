import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";

import { AppBadgeComponent } from "../../shared/ui/badge/app-badge.component";
import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { DoctorCheckCardComponent } from "./components/doctor-check-card.component";
import { LogViewerComponent } from "./components/log-viewer.component";
import { SystemInfoCardComponent } from "./components/system-info-card.component";
import {
  type DiagnosticCheck,
  type DoctorChecksResponse,
  type LogTailResponse,
  type SystemInfo,
  DoctorService
} from "./services/doctor.service";

@Component({
  selector: "vf-doctor-page",
  standalone: true,
  imports: [
    AppBadgeComponent,
    AppButtonComponent,
    AppCardComponent,
    DoctorCheckCardComponent,
    LogViewerComponent,
    SystemInfoCardComponent
  ],
  template: `
    <section class="vf-doctor-page">
      <header class="vf-doctor-page__hero">
        <div class="vf-doctor-page__hero-copy">
          <span class="vf-doctor-page__eyebrow">System doctor</span>
          <h1>Diagnose the local audit stack.</h1>
          <p>
            Check engine reachability, database readiness, model paths, storage permissions, runtime information, and recent local logs.
          </p>

          <div class="vf-doctor-page__hero-actions">
            <vf-button variant="primary" (clicked)="run()">
              {{ isRunning() ? 'Running checks…' : 'Run diagnostics' }}
            </vf-button>
            <vf-button variant="secondary" (clicked)="refreshLogs()">
              Refresh logs
            </vf-button>
          </div>
        </div>

        <aside class="vf-doctor-page__hero-side">
          <div class="vf-doctor-page__hero-metric-grid">
            @for (item of summaryCards(); track item.label) {
              <article class="vf-doctor-page__metric">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.hint }}</small>
              </article>
            }
          </div>

          <section class="vf-doctor-page__hero-note">
            <strong>What this page is for</strong>
            <p>
              Use it when the app feels “weird”: empty screens, failed imports, missing models,
              no logs, or anything that smells like a setup problem rather than a product feature.
            </p>
          </section>
        </aside>
      </header>

      <section class="vf-doctor-page__statusbar">
        <div>
          <strong>Doctor status</strong>
          <span>{{ statusMessage() }}</span>
        </div>

        <vf-badge [variant]="statusBadgeVariant()">
          {{ statusBadgeLabel() }}
        </vf-badge>
      </section>

      <div class="vf-doctor-page__grid">
        <section class="vf-doctor-page__main">
          <vf-card
            title="Diagnostic checks"
            subtitle="Each card explains what was tested and what the result actually means."
          >
            @if (checks().length === 0) {
              <div class="vf-doctor-page__empty-panel">
                <strong>No diagnostic results collected yet.</strong>
                <p>
                  Run diagnostics after starting the local engine to collect engine, database, model path, and storage checks.
                </p>
              </div>
            } @else {
              <div class="vf-doctor-page__checks">
                @for (check of checks(); track check.checkId) {
                  <vf-doctor-check-card [check]="check" />
                }
              </div>
            }
          </vf-card>

          <vf-card
            title="What to do next"
            subtitle="A quick runbook so the page gives you answers, not just vibes."
          >
            <div class="vf-doctor-page__runbook">
              <article>
                <strong>If the engine fails</strong>
                <p>
                  Use the Start engine button in the top bar. If it still stays offline, check the sidecar path and log folder below, then rerun diagnostics.
                </p>
              </article>
              <article>
                <strong>If storage fails</strong>
                <p>
                  Check whether the configured app data, report, or temp directories exist and are writable.
                </p>
              </article>
              <article>
                <strong>If model paths fail</strong>
                <p>
                  Verify config files exist, checkpoints are where the registry expects them, and the model page
                  can still list profiles.
                </p>
              </article>
              <article>
                <strong>If logs are empty</strong>
                <p>
                  Start the engine from the top bar, run one action, then refresh logs. An empty viewer usually means nothing has written yet.
                </p>
              </article>
            </div>
          </vf-card>
        </section>

        <aside class="vf-doctor-page__side">
          <vf-system-info-card [info]="systemInfo()" />

          <vf-log-viewer
            [lines]="logLines()"
            [path]="logPath()"
            [message]="logStateMessage()"
          />
        </aside>
      </div>
    </section>
  `,
  styleUrl: "./doctor.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DoctorPageComponent {
  private readonly doctorService = inject(DoctorService);

  readonly checks = signal<readonly DiagnosticCheck[]>([]);
  readonly systemInfo = signal<SystemInfo | null>(null);
  readonly logLines = signal<readonly string[]>([]);
  readonly logPath = signal<string | null>(null);
  readonly isRunning = signal(false);
  readonly statusMessage = signal("Run diagnostics to inspect the local desktop environment.");
  readonly lastRunOk = signal<boolean | null>(null);

  readonly summaryCards = computed(() => {
    const checks = this.checks();

    const passCount = checks.filter((check) => check.status === "pass").length;
    const warnCount = checks.filter((check) => check.status === "warn").length;
    const failCount = checks.filter((check) => check.status === "fail").length;

    return [
      {
        label: "Checks",
        value: String(checks.length),
        hint: "results collected"
      },
      {
        label: "Passing",
        value: String(passCount),
        hint: "healthy checks"
      },
      {
        label: "Needs attention",
        value: String(warnCount + failCount),
        hint: "warn + fail"
      },
      {
        label: "Logs",
        value: String(this.logLines().length),
        hint: "tail lines loaded"
      }
    ];
  });

  readonly statusBadgeLabel = computed(() => {
    if (this.isRunning()) {
      return "running";
    }

    const state = this.lastRunOk();
    if (state === null) {
      return "idle";
    }

    return state ? "ready" : "partial";
  });

  readonly statusBadgeVariant = computed<"neutral" | "info" | "success" | "warning">(() => {
    if (this.isRunning()) {
      return "info";
    }

    const state = this.lastRunOk();
    if (state === null) {
      return "neutral";
    }

    return state ? "success" : "warning";
  });

  readonly logStateMessage = computed(() => {
    if (this.logLines().length > 0) {
      return "Showing the most recent local log lines.";
    }

    if (this.logPath()) {
      return "The log file exists, but the current tail is empty.";
    }

    return "No log file has been discovered yet. Run the engine or trigger an action, then refresh.";
  });

  async ngOnInit(): Promise<void> {
    await this.run();
  }

  async run(): Promise<void> {
    this.isRunning.set(true);
    this.statusMessage.set("Running local diagnostics…");

    const [checksResult, systemInfoResult, logTailResult] = await Promise.allSettled([
      this.doctorService.collectChecks(),
      this.doctorService.collectSystemInfo(),
      this.doctorService.getEngineLogTail()
    ]);

    const collectedChecks = this.resolveChecks(checksResult);
    this.checks.set(collectedChecks);

    if (systemInfoResult.status === "fulfilled") {
      this.systemInfo.set(systemInfoResult.value);
    } else {
      this.systemInfo.set({
        status: "Unavailable",
        reason: this.errorMessage(systemInfoResult.reason)
      });
    }

    if (logTailResult.status === "fulfilled") {
      this.logLines.set(logTailResult.value.lines ?? []);
      this.logPath.set(logTailResult.value.path ?? null);
    } else {
      this.logLines.set([]);
      this.logPath.set(null);
    }

    const hadFailure =
      checksResult.status === "rejected" ||
      systemInfoResult.status === "rejected" ||
      logTailResult.status === "rejected";

    this.lastRunOk.set(!hadFailure);

    if (hadFailure) {
      const failures = [
        checksResult.status === "rejected" ? "checks" : null,
        systemInfoResult.status === "rejected" ? "system info" : null,
        logTailResult.status === "rejected" ? "logs" : null
      ].filter(Boolean);

      this.statusMessage.set(
        `Diagnostics completed with partial results. ${failures.join(", ")} could not be collected.`
      );
    } else {
      this.statusMessage.set("Diagnostics completed. Everything on this page is current.");
    }

    this.isRunning.set(false);
  }

  async refreshLogs(): Promise<void> {
    this.statusMessage.set("Refreshing log tail…");

    try {
      const result = await this.doctorService.getEngineLogTail();
      this.logLines.set(result.lines ?? []);
      this.logPath.set(result.path ?? null);
      this.statusMessage.set("Log tail refreshed.");
    } catch (error) {
      this.logLines.set([]);
      this.logPath.set(null);
      this.statusMessage.set(`Could not refresh logs. ${this.errorMessage(error)}`);
      this.lastRunOk.set(false);
    }
  }

  private resolveChecks(
    result: PromiseSettledResult<DoctorChecksResponse>
  ): readonly DiagnosticCheck[] {
    if (result.status === "fulfilled") {
      if ((result.value.checks ?? []).length > 0) {
        return result.value.checks;
      }

      return [
        {
          checkId: "doctor.empty",
          title: "No checks returned",
          status: "warn",
          message:
            "The diagnostics endpoint responded, but it returned an empty checklist. That usually means the command is wired correctly, but the check aggregation returned no items.",
          details: {
            nextStep: "Inspect the desktop diagnostics command and verify each check is registered."
          }
        }
      ];
    }

    return [
      {
        checkId: "doctor.failed",
        title: "Diagnostics command failed",
        status: "fail",
        message:
          "The app could not collect the main diagnostic checklist. The rest of the page may still show partial information.",
        details: {
          error: this.errorMessage(result.reason),
          nextStep: "Start the engine from the top bar if it is offline. If diagnostics still fail, check the local desktop logs and rerun diagnostics."
        }
      }
    ];
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : "Unknown error";
  }
}
