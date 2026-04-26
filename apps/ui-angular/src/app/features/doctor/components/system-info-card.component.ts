import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "vf-system-info-card",
  standalone: true,
  inputs: ["info"],
  template: `
    <section class="vf-system-info">
      <header>
        <div>
          <h2>System info</h2>
          <p>Runtime and environment details collected from the local app side.</p>
        </div>
      </header>

      @if (entries().length > 0) {
        <dl>
          @for (item of entries(); track item[0]) {
            <div>
              <dt>{{ formatKey(item[0]) }}</dt>
              <dd>{{ item[1] }}</dd>
            </div>
          }
        </dl>
      } @else {
        <div class="vf-system-info__empty">
          <strong>No system info collected yet.</strong>
          <p>Run diagnostics to populate platform, device, and runtime details here.</p>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .vf-system-info {
        display: grid;
        gap: 14px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 35%),
          var(--vf-surface);
        padding: 16px;
      }

      header h2 {
        margin: 0;
        color: var(--vf-text);
        font-size: 18px;
        letter-spacing: -0.05em;
      }

      header p {
        margin: 6px 0 0;
        color: var(--vf-text-muted);
        line-height: 1.55;
      }

      dl {
        display: grid;
        gap: 10px;
        margin: 0;
      }

      dl div {
        display: grid;
        gap: 4px;
        border-top: 1px solid var(--vf-border);
        padding-top: 10px;
      }

      dt {
        color: var(--vf-text-muted);
        font-size: 12px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      dd {
        margin: 0;
        color: var(--vf-text-soft);
        line-height: 1.55;
        overflow-wrap: anywhere;
      }

      .vf-system-info__empty {
        border: 1px dashed var(--vf-border-strong);
        border-radius: var(--vf-radius-lg);
        padding: 16px;
      }

      .vf-system-info__empty strong {
        color: var(--vf-text);
        font-size: 15px;
      }

      .vf-system-info__empty p {
        margin: 6px 0 0;
        color: var(--vf-text-muted);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemInfoCardComponent {
  info: Record<string, unknown> | null = null;

  entries(): readonly [string, string][] {
    return Object.entries(this.info ?? {}).map(([key, value]) => [
      key,
      typeof value === "object" ? JSON.stringify(value) : String(value)
    ]);
  }

  formatKey(key: string): string {
    return key
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}
