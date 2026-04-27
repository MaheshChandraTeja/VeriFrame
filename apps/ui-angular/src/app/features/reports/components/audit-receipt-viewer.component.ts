import { JsonPipe } from "@angular/common";
import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "vf-audit-receipt-viewer",
  standalone: true,
  imports: [JsonPipe],
  inputs: ["receipt"],
  template: `
    <section class="vf-audit-receipt">
      <header>
        <h2>Audit Receipt</h2>
        <p>Local integrity record. Useful. Not magic. Not legal notarization.</p>
      </header>

      @if (receipt) {
        <pre>{{ receipt | json }}</pre>
      } @else {
        <p class="vf-audit-receipt__empty">Export or open a report to inspect its receipt.</p>
      }
    </section>
  `,
  styles: [
    `
      .vf-audit-receipt {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-surface);
        padding: 16px;
      }

      h2 {
        margin: 0;
        letter-spacing: -0.04em;
      }

      p {
        color: var(--vf-text-muted);
      }

      pre {
        overflow: auto;
        border-radius: var(--vf-radius-md);
        background: var(--vf-bg-elevated);
        padding: 14px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuditReceiptViewerComponent {
  receipt: unknown = null;
}
