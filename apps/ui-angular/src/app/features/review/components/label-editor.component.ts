import { ChangeDetectionStrategy, Component, EventEmitter } from "@angular/core";
import type { DetectedRegion } from "@veriframe/contracts";

import { AppButtonComponent } from "../../../shared/ui/button/app-button.component";

@Component({
  selector: "vf-label-editor",
  standalone: true,
  imports: [AppButtonComponent],
  inputs: ["region", "labels"],
  outputs: ["labelChanged"],
  template: `
    <section class="vf-label-editor">
      <h2>Label editor</h2>

      @if (region) {
        <p>Selected: <strong>{{ region.label }}</strong></p>

        <select #labelSelect [value]="region.label">
          @for (label of labels; track label) {
            <option [value]="label">{{ label }}</option>
          }
        </select>

        <vf-button variant="primary" size="sm" (clicked)="labelChanged.emit(labelSelect.value)">
          Apply label
        </vf-button>
      } @else {
        <p>No region selected.</p>
      }
    </section>
  `,
  styles: [
    `
      .vf-label-editor {
        display: grid;
        gap: 10px;
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-xl);
        background: var(--vf-surface);
        padding: 16px;
      }

      h2 {
        margin: 0;
        font-size: 18px;
        letter-spacing: -0.04em;
      }

      p {
        color: var(--vf-text-muted);
      }

      select {
        border: 1px solid var(--vf-border);
        border-radius: var(--vf-radius-md);
        background: var(--vf-bg-elevated);
        color: var(--vf-text);
        padding: 10px;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LabelEditorComponent {
  region: DetectedRegion | null = null;
  labels: readonly string[] = [
    "receipt_header",
    "line_item_block",
    "price_label",
    "barcode",
    "qr_code",
    "product_package",
    "shipping_label",
    "damage_zone",
    "display_panel",
    "unreadable_region",
    "unknown"
  ];

  readonly labelChanged = new EventEmitter<string>();
}
