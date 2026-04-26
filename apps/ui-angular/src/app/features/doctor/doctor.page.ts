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
          <span class="vf-doctor-page__eyebrow">System diagnostics</span>
          <h1>Check system health and fix issues faster.</h1>
          <p>
            Verify the desktop shell, local engine, storage folders, database path,
            model directory, runtime details, and recent logs from one place.
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
            <strong>When to use this</strong>
            <p>
              Open this page when imports fail, reports look empty, models do not load,
              logs are missing, or the app feels like it has started negotiating with the void.
            </p>
          </section>
        </aside>
      </header>

      <section class="vf-doctor-page__statusbar">
        <div>
          <strong>Health summary</strong>
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
            subtitle="Each check explains what was tested, what passed, and what needs attention."
          >
            @if (checks().length === 0) {
              <div class="vf-doctor-page__empty-panel">
                <strong>No results yet.</strong>
                <p>
                  Run diagnostics to inspect the desktop shell, engine, storage, model directory, and logs.
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
        </section>

        <aside class="vf-doctor-page__side">
          <vf-system-info-card [info]="systemInfo()" />

          <vf-log-viewer
            [lines]="logLines()"
            [path]="logPath()"
            [message]="logStateMessage()"
          />

          <vf-card
            title="Fix guide"
            subtitle="Start here when a check fails. Boring, yes. Useful, unfortunately also yes."
          >
            <div class="vf-doctor-page__runbook">
              <article>
                <strong>Engine is stopped</strong>
                <p>
                  Use the engine control in the top bar. For development QA, you can also run
                  <code>pnpm dev:engine</code> in a separate terminal.
                </p>
              </article>
              <article>
                <strong>Storage is blocked</strong>
                <p>
                  Confirm the app data, reports, logs, models, and temp folders exist and are writable by your Windows user.
                </p>
              </article>
              <article>
                <strong>Models are missing</strong>
                <p>
                  Check the model directory and registry configuration. Fine-tuned checkpoints must be exactly where the config expects them.
                </p>
              </article>
              <article>
                <strong>Logs are empty</strong>
                <p>
                  Trigger an engine action, then refresh. Empty logs usually mean nothing has written yet, not that the universe has ended.
                </p>
              </article>
            </div>
          </vf-card>
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
  readonly statusMessage = signal("Run diagnostics to inspect the local app environment.");
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
        label: "Healthy",
        value: String(passCount),
        hint: "passing checks"
      },
      {
        label: "Attention",
        value: String(warnCount + failCount),
        hint: "warnings and failures"
      },
      {
        label: "Logs",
        value: String(this.logLines().length),
        hint: "lines loaded"
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
      return "Showing recent desktop or engine log lines.";
    }

    if (this.logPath()) {
      return "No log lines were found at the current log path yet.";
    }

    return "No log file has been discovered yet. Run an engine action, then refresh.";
  });

  async ngOnInit(): Promise<void> {
    await this.run();
  }

  async run(): Promise<void> {
    this.isRunning.set(true);
    this.statusMessage.set("Running diagnostics…");

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
        `Diagnostics returned partial results. Could not collect: ${failures.join(", ")}.`
      );
    } else {
      this.statusMessage.set("Diagnostics completed. Results are current.");
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
      this.lastRunOk.set(true);
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
            "The diagnostics command responded, but returned an empty checklist.",
          details: {
            nextStep: "Verify that the desktop diagnostics command is registered and returning check objects."
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
          "The app could not collect the diagnostic checklist. System info and logs may still show partial details.",
        details: {
          error: this.errorMessage(result.reason),
          nextStep: "Check the desktop terminal output, then rerun diagnostics."
        }
      }
    ];
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

    return "Unknown error";
  }
}
