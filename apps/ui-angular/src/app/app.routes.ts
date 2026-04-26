import { Component, inject } from "@angular/core";
import { ActivatedRoute, Routes } from "@angular/router";

import { AnalysisPageComponent } from "./features/analysis/analysis.page";
import { DashboardPageComponent } from "./features/dashboard/dashboard.page";
import { DoctorPageComponent } from "./features/doctor/doctor.page";
import { ImportPageComponent } from "./features/import/import.page";
import { ModelsPageComponent } from "./features/models/models.page";
import { ReportsPageComponent } from "./features/reports/reports.page";
import { ReviewPageComponent } from "./features/review/review.page";
import { SettingsPageComponent } from "./features/settings/settings.page";
import { AppEmptyStateComponent } from "./shared/ui/empty-state/app-empty-state.component";

@Component({
  selector: "vf-placeholder-page",
  standalone: true,
  imports: [AppEmptyStateComponent],
  template: `
    <section class="vf-placeholder-page">
      <vf-empty-state
        icon="🧪"
        [title]="title"
        [description]="description"
      />
    </section>
  `,
  styles: [
    `
      .vf-placeholder-page {
        display: grid;
        min-height: min(62vh, 680px);
        place-items: center;
      }
    `
  ]
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  readonly title = String(this.route.snapshot.data["title"] ?? "Coming Soon");
  readonly description = String(
    this.route.snapshot.data["description"] ??
      "This screen is reserved for a later VeriFrame module. The route exists now so the app shell, navigation, and layout are already integrated."
  );
}

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  { path: "dashboard", component: DashboardPageComponent, title: "VeriFrame · Dashboard" },
  { path: "import", component: ImportPageComponent, title: "VeriFrame · Import" },
  { path: "analysis/:runId", component: AnalysisPageComponent, title: "VeriFrame · Analysis" },
  { path: "review/:runId", component: ReviewPageComponent, title: "VeriFrame · Review" },
  { path: "reports", component: ReportsPageComponent, title: "VeriFrame · Reports" },
  { path: "models", component: ModelsPageComponent, title: "VeriFrame · Models" },
  { path: "settings", component: SettingsPageComponent, title: "VeriFrame · Settings" },
  { path: "doctor", component: DoctorPageComponent, title: "VeriFrame · Doctor" },
  { path: "**", redirectTo: "dashboard" }
];
