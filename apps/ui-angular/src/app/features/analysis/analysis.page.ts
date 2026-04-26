import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

import { AppButtonComponent } from "../../shared/ui/button/app-button.component";
import { AppCardComponent } from "../../shared/ui/card/app-card.component";
import { EvidenceViewerComponent } from "./components/evidence-viewer.component";
import { FindingListComponent } from "./components/finding-list.component";
import { QualityPanelComponent } from "./components/quality-panel.component";
import { RegionDetailPanelComponent } from "./components/region-detail-panel.component";
import { AnalysisService } from "./services/analysis.service";
import { AnalysisStore, SeverityFilter } from "./state/analysis.store";

@Component({
  selector: "vf-analysis-page",
  standalone: true,
  imports: [
    AppButtonComponent,
    AppCardComponent,
    EvidenceViewerComponent,
    FindingListComponent,
    QualityPanelComponent,
    RegionDetailPanelComponent
  ],
  template: `
    <section class="vf-analysis-page">
      <div class="vf-analysis-page__hero">
        <div>
          <span>Analysis workspace</span>
          <h2>Visual audit workspace.</h2>
          <p>
            Review regions, evidence overlays, deterministic findings, and image quality signals.
          </p>
        </div>

        <vf-button variant="secondary" (clicked)="reload()">
          Reload result
        </vf-button>
      </div>

      @if (store.error()) {
        <p class="vf-analysis-page__message">{{ store.error() }}</p>
      }

      <div class="vf-analysis-page__layout">
        <div class="vf-analysis-page__main">
          <vf-evidence-viewer
            [result]="store.result()"
            [selectedRegionId]="store.selectedRegionId()"
            (regionSelected)="store.selectRegion($event)"
          />

          <vf-card title="Findings" subtitle="Deterministic, explainable review prompts. No chatbot séance required.">
            <div class="vf-analysis-page__filters">
              @for (severity of severities; track severity) {
                <button
                  type="button"
                  [class.is-active]="store.severityFilter() === severity"
                  (click)="store.setSeverityFilter(severity)"
                >
                  {{ severity }}
                </button>
              }
            </div>

            <vf-finding-list
              [findings]="store.filteredFindings()"
              (regionRequested)="store.selectRegion($event)"
            />
          </vf-card>
        </div>

        <aside class="vf-analysis-page__side">
          <vf-quality-panel [quality]="store.result()?.qualityReport ?? null" />
          <vf-region-detail-panel [region]="store.selectedRegion()" />
        </aside>
      </div>
    </section>
  `,
  styleUrl: "./analysis.page.scss",
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnalysisPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly analysisService = inject(AnalysisService);

  readonly store = inject(AnalysisStore);
  readonly runId = computed(() => this.route.snapshot.paramMap.get("runId"));
  readonly severities: readonly SeverityFilter[] = ["all", "info", "low", "medium", "high", "critical"];

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    const runId = this.runId();

    if (!runId) {
      this.store.setError("No run id was provided.");
      return;
    }

    this.store.setLoading(true);
    this.store.setError(null);

    try {
      const result = await this.analysisService.loadAnalysisResult(runId);
      this.store.setResult(result);
    } catch (error) {
      this.store.setError(error instanceof Error ? error.message : "Unable to load analysis result.");
    } finally {
      this.store.setLoading(false);
    }
  }
}
