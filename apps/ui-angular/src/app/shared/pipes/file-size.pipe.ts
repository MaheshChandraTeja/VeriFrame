import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "fileSize",
  standalone: true
})
export class FileSizePipe implements PipeTransform {
  transform(value: number | null | undefined, fractionDigits = 1): string {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "—";
    }

    const bytes = Math.max(0, value);
    const units = ["B", "KB", "MB", "GB", "TB"] as const;

    if (bytes === 0) {
      return "0 B";
    }

    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const amount = bytes / 1024 ** index;

    return `${amount.toFixed(index === 0 ? 0 : fractionDigits)} ${units[index]}`;
  }
}
