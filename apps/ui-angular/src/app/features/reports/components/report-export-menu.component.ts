import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";

import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";
import type { ReportExportFormat } from "../services/report.service";

@Component({
  selector: "vf-report-export-menu",
  standalone: true,
  imports: [AppButtonComponent],
  inputs: ["runId"],
  outputs: ["exportRequested"],
  template: `
    <section class="vf-report-export-menu" aria-label="Report export actions">
      <span>Export</span>

      <div class="vf-report-export-menu__buttons">
        <vf-button variant="ghost" size="sm" (clicked)="exportRequested.emit('html')">
          HTML
        </vf-button>
        <vf-button variant="ghost" size="sm" (clicked)="exportRequested.emit('json')">
          JSON
        </vf-button>
        <vf-button variant="ghost" size="sm" (clicked)="exportRequested.emit('evidence_map')">
          Evidence Map
        </vf-button>
        <vf-button variant="ghost" size="sm" (clicked)="exportRequested.emit('audit_receipt')">
          Audit Receipt
        </vf-button>
      </div>
    </section>
  `,
  styles: [
    `
      .vf-report-export-menu {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      span {
        flex: 0 0 auto;
        color: var(--vf-text-muted);
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.1em;
        text-transform: uppercase;
      }

      .vf-report-export-menu__buttons {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
      }

      @media (max-width: 760px) {
        .vf-report-export-menu {
          align-items: flex-start;
          flex-direction: column;
        }

        .vf-report-export-menu__buttons {
          justify-content: flex-start;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportExportMenuComponent {
  runId = "";
  readonly exportRequested = new EventEmitter<ReportExportFormat>();
}
