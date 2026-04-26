import "@angular/compiler";
import "zone.js";
import "zone.js/testing";

import { getTestBed } from "@angular/core/testing";
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from "@angular/platform-browser-dynamic/testing";

class MemoryStorage implements Storage {
  private readonly store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

function ensureStableLocalStorage(): void {
  const maybeStorage = globalThis.window?.localStorage;

  if (
    maybeStorage &&
    typeof maybeStorage.clear === "function" &&
    typeof maybeStorage.getItem === "function" &&
    typeof maybeStorage.setItem === "function"
  ) {
    return;
  }

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    enumerable: true,
    value: new MemoryStorage()
  });
}

ensureStableLocalStorage();

const testBed = getTestBed();

try {
  testBed.initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(),
    {
      teardown: {
        destroyAfterEach: true
      }
    }
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  if (!message.includes("Cannot set base providers because it has already been called")) {
    throw error;
  }
}
