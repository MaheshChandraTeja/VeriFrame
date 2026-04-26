import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent } from "../../../shared/ui/badge/app-badge.component";
import { AppCardComponent } from "../../../shared/ui/card/app-card.component";

@Component({
  selector: "vf-privacy-card",
  standalone: true,
  imports: [AppBadgeComponent, AppCardComponent],
  template: `
    <vf-card
      title="Privacy posture"
      subtitle="The default mode is local-first. Revolutionary, apparently."
    >
      <div class="vf-privacy">
        @for (item of guarantees; track item) {
          <div class="vf-privacy__item">
            <span aria-hidden="true">✓</span>
            <strong>{{ item }}</strong>
          </div>
        }

        <vf-badge variant="success">No telemetry configured</vf-badge>
      </div>
    </vf-card>
  `,
  styles: [
    `
      .vf-privacy {
        display: grid;
        gap: 10px;
      }

      .vf-privacy__item {
        display: flex;
        align-items: center;
        gap: 10px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-surface);
        padding: 12px;
      }

      .vf-privacy__item span {
        display: grid;
        width: 24px;
        height: 24px;
        place-items: center;
        border-radius: 999px;
        background: var(--vf-success-soft);
        color: var(--vf-success);
        font-weight: 950;
      }

      .vf-privacy__item strong {
        font-size: 13px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PrivacyCardComponent {
  readonly guarantees: readonly string[] = [
    "Images stay on device",
    "No cloud upload path in UI",
    "No direct Angular-to-Python calls",
    "Reports remain local"
  ];
}
