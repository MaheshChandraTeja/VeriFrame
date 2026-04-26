import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: string;
  readonly description: string;
}

@Component({
  selector: "vf-sidebar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="vf-sidebar" aria-label="Primary navigation">
      <a class="vf-sidebar__brand" routerLink="/dashboard" aria-label="Go to dashboard">
        <span class="vf-sidebar__brand-mark">VF</span>
        <span>
          <strong>VeriFrame</strong>
          <small>Local visual audit</small>
        </span>
      </a>

      <nav class="vf-sidebar__nav">
        @for (item of navItems; track item.route) {
          <a
            class="vf-sidebar__link"
            routerLinkActive="vf-sidebar__link--active"
            [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            [routerLink]="item.route"
          >
            <span class="vf-sidebar__icon" aria-hidden="true">{{ item.icon }}</span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>{{ item.description }}</small>
            </span>
          </a>
        }
      </nav>

      <section class="vf-sidebar__local-card" aria-label="Local-only status">
        <span class="vf-sidebar__pulse" aria-hidden="true"></span>
        <div>
          <strong>Local-only mode</strong>
          <p>No cloud upload. No telemetry. The machine keeps its secrets, for once.</p>
        </div>
      </section>
    </aside>
  `,
  styles: [
    `
      .vf-sidebar {
        position: sticky;
        top: 0;
        display: flex;
        flex-direction: column;
        gap: 22px;
        height: 100vh;
        padding: 24px 18px;
        border-right: 1px solid var(--vf-border);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent),
          rgba(9, 11, 16, 0.72);
        backdrop-filter: blur(22px);
      }

      .vf-sidebar__brand {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: var(--vf-radius-lg);
        padding: 12px;
        transition:
          background 160ms ease,
          transform 160ms ease;
      }

      .vf-sidebar__brand:hover {
        background: var(--vf-surface);
        transform: translateY(-1px);
      }

      .vf-sidebar__brand-mark {
        display: grid;
        width: 48px;
        height: 48px;
        place-items: center;
        border: 1px solid rgba(125, 211, 252, 0.3);
        border-radius: 17px;
        background:
          radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.28), transparent 35%),
          linear-gradient(135deg, rgba(125, 211, 252, 0.95), rgba(14, 165, 233, 0.68));
        box-shadow: var(--vf-shadow-glow);
        color: #03121d;
        font-weight: 950;
        letter-spacing: -0.08em;
      }

      .vf-sidebar__brand strong,
      .vf-sidebar__link strong,
      .vf-sidebar__local-card strong {
        display: block;
        color: var(--vf-text);
      }

      .vf-sidebar__brand small,
      .vf-sidebar__link small {
        display: block;
        margin-top: 2px;
        color: var(--vf-text-muted);
        font-size: 12px;
      }

      .vf-sidebar__nav {
        display: grid;
        gap: 8px;
      }

      .vf-sidebar__link {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        border: 1px solid transparent;
        border-radius: var(--vf-radius-md);
        padding: 10px;
        color: var(--vf-text-soft);
        transition:
          border-color 160ms ease,
          background 160ms ease,
          transform 160ms ease;
      }

      .vf-sidebar__link:hover,
      .vf-sidebar__link--active {
        border-color: var(--vf-border);
        background: var(--vf-surface);
        transform: translateY(-1px);
      }

      .vf-sidebar__link--active {
        box-shadow: inset 3px 0 0 var(--vf-primary);
      }

      .vf-sidebar__icon {
        display: grid;
        width: 38px;
        height: 38px;
        place-items: center;
        border-radius: 14px;
        background: var(--vf-surface);
      }

      .vf-sidebar__local-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 12px;
        margin-top: auto;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-lg);
        background: var(--vf-surface);
        padding: 14px;
      }

      .vf-sidebar__local-card p {
        margin: 4px 0 0;
        color: var(--vf-text-muted);
        font-size: 12px;
        line-height: 1.45;
      }

      .vf-sidebar__pulse {
        width: 10px;
        height: 10px;
        margin-top: 6px;
        border-radius: 999px;
        background: var(--vf-success);
        box-shadow: 0 0 0 6px var(--vf-success-soft);
      }

      @media (max-width: 980px) {
        .vf-sidebar {
          position: static;
          height: auto;
          border-right: 0;
          border-bottom: 1px solid var(--vf-border);
        }

        .vf-sidebar__nav {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .vf-sidebar__link {
          grid-template-columns: 1fr;
        }

        .vf-sidebar__icon {
          width: 100%;
        }
      }

      @media (max-width: 640px) {
        .vf-sidebar__nav {
          grid-template-columns: 1fr 1fr;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  readonly navItems: readonly NavItem[] = [
    {
      label: "Dashboard",
      route: "/dashboard",
      icon: "⌁",
      description: "System overview"
    },
    {
      label: "Import",
      route: "/import",
      icon: "⇡",
      description: "Add evidence"
    },
    {
      label: "Reports",
      route: "/reports",
      icon: "▣",
      description: "Audit exports"
    },
    {
      label: "Models",
      route: "/models",
      icon: "◈",
      description: "TorchVision"
    },
    {
      label: "Settings",
      route: "/settings",
      icon: "⚙",
      description: "Local config"
    },
    {
      label: "Doctor",
      route: "/doctor",
      icon: "✚",
      description: "Diagnostics"
    }
  ];
}
