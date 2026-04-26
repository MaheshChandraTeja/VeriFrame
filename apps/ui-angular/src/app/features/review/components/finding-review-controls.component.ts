import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import type { Finding } from "@veriframe/contracts";

import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";
import type { FindingDecision } from "../services/review.service";

@Component({
  selector: "vf-finding-review-controls",
  standalone: true,
  imports: [AppButtonComponent],
  inputs: ["findings"],
  outputs: ["reviewed"],
  template: `
    <section class="vf-finding-review">
      <h2>Finding review</h2>

      @if (findings.length === 0) {
        <p>No findings to review.</p>
      } @else {
        @for (finding of findings; track finding.findingId) {
          <article>
            <h3>{{ finding.title }}</h3>
            <p>{{ finding.description }}</p>
            <div>
              <vf-button variant="success" size="sm" (clicked)="reviewed.emit({ finding, decision: 'valid' })">Valid</vf-button>
              <vf-button variant="danger" size="sm" (clicked)="reviewed.emit({ finding, decision: 'false_positive' })">False Positive</vf-button>
              <vf-button variant="secondary" size="sm" (clicked)="reviewed.emit({ finding, decision: 'needs_review' })">Needs Review</vf-button>
              <vf-button variant="ghost" size="sm" (clicked)="reviewed.emit({ finding, decision: 'ignored' })">Ignore</vf-button>
            </div>
          </article>
        }
      }
    </section>
  `,
  styles: [
    `
      .vf-finding-review {
        display: grid;
        gap: 12px;
      }

      article {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: var(--vf-surface);
        padding: 14px;
      }

      h2,
      h3 {
        margin: 0;
        letter-spacing: -0.04em;
      }

      p {
        color: var(--vf-text-muted);
        line-height: 1.5;
      }

      div {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FindingReviewControlsComponent {
  findings: readonly Finding[] = [];
  readonly reviewed = new EventEmitter<{ finding: Finding; decision: FindingDecision }>();
}
