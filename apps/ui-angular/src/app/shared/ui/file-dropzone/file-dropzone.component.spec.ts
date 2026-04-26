import { ComponentFixture, TestBed } from "@angular/core/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  FileDropzoneComponent,
  type FileDropzoneRejection
} from "./file-dropzone.component";

interface DropzoneOverrides {
  readonly maxFileSizeBytes?: number;
  readonly multiple?: boolean;
  readonly disabled?: boolean;
}

describe("FileDropzoneComponent", () => {
  beforeEach(async () => {
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [FileDropzoneComponent]
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  async function createComponent(
    overrides: DropzoneOverrides = {}
  ): Promise<ComponentFixture<FileDropzoneComponent>> {
    const fixture = TestBed.createComponent(FileDropzoneComponent);

    if (overrides.maxFileSizeBytes !== undefined) {
      fixture.componentInstance.maxFileSizeBytes = overrides.maxFileSizeBytes;
    }

    if (overrides.multiple !== undefined) {
      fixture.componentInstance.multiple = overrides.multiple;
    }

    if (overrides.disabled !== undefined) {
      fixture.componentInstance.disabled = overrides.disabled;
    }

    fixture.detectChanges();
    await fixture.whenStable();

    return fixture;
  }

  it("emits selected files when valid image files are provided", async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;
    const selected: readonly File[][] = [];

    component.filesSelected.subscribe((files) => {
      selected.push(files);
    });

    const file = new File(["image"], "receipt.jpg", {
      type: "image/jpeg"
    });

    component.handleFiles([file]);

    expect(selected).toHaveLength(1);
    expect(selected[0]?.[0]?.name).toBe("receipt.jpg");
  });

  it("rejects unsupported file types", async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;
    const rejected: readonly FileDropzoneRejection[][] = [];

    component.rejected.subscribe((files) => {
      rejected.push(files);
    });

    const file = new File(["not image"], "notes.txt", {
      type: "text/plain"
    });

    component.handleFiles([file]);

    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.[0]?.reason).toBe("unsupported_type");
  });

  it("rejects files over the configured size limit", async () => {
    const fixture = await createComponent({
      maxFileSizeBytes: 3
    });
    const component = fixture.componentInstance;
    const rejected: readonly FileDropzoneRejection[][] = [];

    component.rejected.subscribe((files) => {
      rejected.push(files);
    });

    const file = new File(["large image"], "package.png", {
      type: "image/png"
    });

    component.handleFiles([file]);

    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.[0]?.reason).toBe("too_large");
  });

  it("tracks drag-active state", async () => {
    const fixture = await createComponent();
    const component = fixture.componentInstance;

    const dragEnter = new Event("dragenter") as DragEvent;
    const dragLeave = new Event("dragleave") as DragEvent;

    component.onDragEnter(dragEnter);
    expect(component.isDragActive()).toBe(true);

    component.onDragLeave(dragLeave);
    expect(component.isDragActive()).toBe(false);
  });
});
