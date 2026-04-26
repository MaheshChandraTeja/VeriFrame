import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";

import { SidebarComponent } from "./sidebar.component";
import { TopbarComponent } from "./topbar.component";

@Component({
  selector: "vf-app-shell",
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <a class="vf-skip-link" href="#main-content">Skip to content</a>

    <div class="vf-shell">
      <vf-sidebar />

      <main id="main-content" class="vf-shell__main" tabindex="-1">
        <vf-topbar />
        <section class="vf-shell__content" aria-live="polite">
          <router-outlet />
        </section>
      </main>
    </div>
  `,
  styles: [
    `
      .vf-shell {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        min-height: 100vh;
      }

      .vf-shell__main {
        min-width: 0;
        outline: none;
      }

      .vf-shell__content {
        width: min(1440px, calc(100vw - 320px));
        margin: 0 auto;
        padding: 24px 28px 40px;
      }

      .vf-skip-link {
        position: fixed;
        top: 12px;
        left: 12px;
        z-index: 1000;
        transform: translateY(-160%);
        border-radius: 999px;
        background: var(--vf-primary);
        color: var(--vf-bg);
        padding: 10px 14px;
        font-weight: 800;
        transition: transform 160ms ease;
      }

      .vf-skip-link:focus {
        transform: translateY(0);
      }

      @media (max-width: 980px) {
        .vf-shell {
          grid-template-columns: 1fr;
        }

        .vf-shell__content {
          width: min(100%, 980px);
          padding: 18px 16px 32px;
        }
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {}
