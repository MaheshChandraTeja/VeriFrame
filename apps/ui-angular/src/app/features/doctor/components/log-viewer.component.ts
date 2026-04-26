import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "vf-log-viewer",
  standalone: true,
  inputs: ["lines", "path", "message"],
  template: `
    <section class="vf-log-viewer">
      <header class="vf-log-viewer__header">
        <div>
          <h2>Logs</h2>
          <p>{{ message || 'Recent local log output for quick debugging.' }}</p>
        </div>

        <div class="vf-log-viewer__meta">
          <span>{{ lines.length }} line(s)</span>
          <small>{{ path || 'No log file discovered' }}</small>
        </div>
      </header>

      @if (lines.length > 0) {
        <pre>@for (line of lines; track $index) {
{{ line }}
}</pre>
      } @else {
        <div class="vf-log-viewer__empty">
          <strong>No log lines available.</strong>
          <p>
            If the engine has not started, or nothing has emitted log events yet, this panel stays empty.
            Run an action, then refresh logs.
          </p>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .vf-log-viewer {
        display: grid;
        gap: 14px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 35%),
          var(--vf-surface);
        padding: 16px;
      }

      .vf-log-viewer__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .vf-log-viewer__header h2 {
        margin: 0;
        color: var(--vf-text);
        font-size: 18px;
        letter-spacing: -0.05em;
      }

      .vf-log-viewer__header p {
        margin: 6px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      .vf-log-viewer__meta {
        display: grid;
        gap: 6px;
        justify-items: end;
      }

      .vf-log-viewer__meta span {
        border: 1px solid var(--vf-border);
        border-radius: 999px;
        padding: 6px 10px;
        color: var(--vf-text-soft);
        font-size: 12px;
        font-weight: 900;
      }

      .vf-log-viewer__meta small {
        max-width: 260px;
        color: var(--vf-text-muted);
        text-align: right;
        overflow-wrap: anywhere;
      }

      pre {
        max-height: 420px;
        overflow: auto;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: rgba(2, 6, 23, 0.88);
        color: #d6e0eb;
        padding: 14px;
        white-space: pre-wrap;
        line-height: 1.5;
        font-size: 12px;
      }

      .vf-log-viewer__empty {
        border: 1px dashed var(--vf-border-strong);
        border-radius: var(--vf-radius-lg);
        padding: 16px;
      }

      .vf-log-viewer__empty strong {
        color: var(--vf-text);
        font-size: 15px;
      }

      .vf-log-viewer__empty p {
        margin: 6px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.6;
      }

      @media (max-width: 760px) {
        .vf-log-viewer__header {
          align-items: flex-start;
          flex-direction: column;
        }

        .vf-log-viewer__meta {
          justify-items: start;
        }

        .vf-log-viewer__meta small {
          text-align: left;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogViewerComponent {
  lines: readonly string[] = [];
  path: string | null = null;
  message: string | null = null;
}
