import { computed, Injectable, signal } from "@angular/core";
import type { AnalysisResult, DetectedRegion, Finding, FindingSeverity } from "@veriframe/contracts";

export type SeverityFilter = FindingSeverity | "all";

@Injectable({
  providedIn: "root"
})
export class AnalysisStore {
  readonly result = signal<AnalysisResult | null>(null);
  readonly selectedRegionId = signal<string | null>(null);
  readonly severityFilter = signal<SeverityFilter>("all");
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly regions = computed<readonly DetectedRegion[]>(() => this.result()?.regions ?? []);
  readonly findings = computed<readonly Finding[]>(() => this.result()?.findings ?? []);

  readonly filteredFindings = computed<readonly Finding[]>(() => {
    const filter = this.severityFilter();

    if (filter === "all") {
      return this.findings();
    }

    return this.findings().filter((finding) => finding.severity === filter);
  });

  readonly selectedRegion = computed<DetectedRegion | null>(() => {
    const selected = this.selectedRegionId();

    if (!selected) {
      return null;
    }

    return this.regions().find((region) => region.regionId === selected) ?? null;
  });

  setResult(result: AnalysisResult): void {
    this.result.set(result);
    this.error.set(null);

    const firstRegion = result.regions[0]?.regionId ?? null;
    this.selectedRegionId.set(firstRegion);
  }

  selectRegion(regionId: string | null): void {
    this.selectedRegionId.set(regionId);
  }

  setSeverityFilter(filter: SeverityFilter): void {
    this.severityFilter.set(filter);
  }

  setLoading(value: boolean): void {
    this.loading.set(value);
  }

  setError(message: string | null): void {
    this.error.set(message);
  }

  clear(): void {
    this.result.set(null);
    this.selectedRegionId.set(null);
    this.severityFilter.set("all");
    this.loading.set(false);
    this.error.set(null);
  }
}
