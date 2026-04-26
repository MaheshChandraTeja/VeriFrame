import { Component } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppButtonComponent, type AppButtonVariant } from "./app-button.component";

@Component({
  selector: "vf-button-host",
  standalone: true,
  imports: [AppButtonComponent],
  template: `
    <vf-button
      [variant]="variant"
      [disabled]="disabled"
      (clicked)="clickCount = clickCount + 1"
    >
      Analyze
    </vf-button>
  `
})
class ButtonHostComponent {
  variant: AppButtonVariant = "primary";
  disabled = false;
  clickCount = 0;
}

interface ButtonHostOverrides {
  readonly variant?: AppButtonVariant;
  readonly disabled?: boolean;
}

describe("AppButtonComponent", () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [ButtonHostComponent]
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function createHost(
    overrides: ButtonHostOverrides = {}
  ): Promise<ComponentFixture<ButtonHostComponent>> {
    const fixture = TestBed.createComponent(ButtonHostComponent);

    if (overrides.variant !== undefined) {
      fixture.componentInstance.variant = overrides.variant;
    }

    if (overrides.disabled !== undefined) {
      fixture.componentInstance.disabled = overrides.disabled;
    }

    fixture.detectChanges();
    await fixture.whenStable();

    return fixture;
  }

  it("renders projected text", async () => {
    const fixture = await createHost();

    expect(fixture.nativeElement.textContent).toContain("Analyze");
  });

  it("applies the requested variant class", async () => {
    const fixture = await createHost({
      variant: "danger"
    });

    const button = fixture.nativeElement.querySelector("button") as HTMLButtonElement;

    expect(button.classList.contains("vf-button--danger")).toBe(true);
  });

  it("emits clicked when enabled", async () => {
    const fixture = await createHost();

    const button = fixture.nativeElement.querySelector("button") as HTMLButtonElement;

    button.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.clickCount).toBe(1);
  });

  it("does not emit clicked when disabled", async () => {
    const fixture = await createHost({
      disabled: true
    });

    const button = fixture.nativeElement.querySelector("button") as HTMLButtonElement;

    button.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true
      })
    );

    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.clickCount).toBe(0);
  });
});
