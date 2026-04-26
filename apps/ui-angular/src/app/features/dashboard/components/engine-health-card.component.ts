import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppBadgeComponent, type AppBadgeVariant } from "../../../shared/ui/badge/app-badge.component";
import { AppCardComponent } from "../../../shared/ui/card/app-card.component";

interface EngineCheck {
  readonly label: string;
  readonly detail: string;
  readonly status: "ready" | "pending" | "offline";
}

@Component({
  selector: "vf-engine-health-card",
  standalone: true,
  imports: [AppBadgeComponent, AppCardComponent],
  template: `
    <vf-card
      title="Engine health"
      subtitle="Static shell status until the Tauri sidecar arrives."
    >
      <div class="vf-engine-health">
        @for (check of checks; track check.label) {
          <article class="vf-engine-health__check">
            <div>
              <strong>{{ check.label }}</strong>
              <span>{{ check.detail }}</span>
            </div>

            <vf-badge [variant]="variantFor(check.status)">
              {{ check.status }}
            </vf-badge>
          </article>
        }
      </div>
    </vf-card>
  `,
  styles: [
    `
      .vf-engine-health {
        display: grid;
        gap: 10px;
      }

      .vf-engine-health__check {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-surface);
        padding: 13px;
      }

      .vf-engine-health__check strong,
      .vf-engine-health__check span {
        display: block;
      }

      .vf-engine-health__check span {
        margin-top: 4px;
        color: var(--vf-text-muted);
        font-size: 13px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EngineHealthCardComponent {
  readonly checks: readonly EngineCheck[] = [
    {
      label: "Angular shell",
      detail: "Routes, layout, and UI primitives are online.",
      status: "ready"
    },
    {
      label: "Tauri bridge",
      detail: "Module 3 will add secure native IPC.",
      status: "pending"
    },
    {
      label: "Python engine",
      detail: "Module 4 will add the local TorchVision sidecar.",
      status: "pending"
    }
  ];

  variantFor(status: EngineCheck["status"]): AppBadgeVariant {
    switch (status) {
      case "ready":
        return "success";
      case "pending":
        return "warning";
      case "offline":
        return "danger";
    }
  }
}
