import { ChangeDetectionStrategy, Component } from "@angular/core";

import { AppShellComponent } from "./core/layout/app-shell.component";

@Component({
  selector: "vf-root",
  standalone: true,
  imports: [AppShellComponent],
  template: "<vf-app-shell />",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {}
