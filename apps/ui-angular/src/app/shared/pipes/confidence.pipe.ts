import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "confidence",
  standalone: true
})
export class ConfidencePipe implements PipeTransform {
  transform(value: number | null | undefined, fractionDigits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "—";
    }

    const clamped = Math.min(1, Math.max(0, value));
    return `${(clamped * 100).toFixed(fractionDigits)}%`;
  }
}
