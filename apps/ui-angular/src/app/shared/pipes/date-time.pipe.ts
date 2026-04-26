import { Pipe, PipeTransform } from "@angular/core";

type DateTimeFormat = "short" | "long" | "time";

@Pipe({
  name: "vfDateTime",
  standalone: true
})
export class DateTimePipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: DateTimeFormat = "short"): string {
    if (!value) {
      return "—";
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    const options: Intl.DateTimeFormatOptions =
      format === "long"
        ? {
            dateStyle: "medium",
            timeStyle: "medium"
          }
        : format === "time"
          ? {
              timeStyle: "medium"
            }
          : {
              dateStyle: "medium",
              timeStyle: "short"
            };

    return new Intl.DateTimeFormat(undefined, options).format(date);
  }
}
