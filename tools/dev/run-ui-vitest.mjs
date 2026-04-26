#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "../..");
const uiPackageJson = resolve(repoRoot, "apps/ui-angular/package.json");

function splitNodeOptions(value) {
  if (!value) {
    return [];
  }

  return value.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
}

function sanitizeNodeOptions(value) {
  const tokens = splitNodeOptions(value);
  const sanitized = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token === "--localstorage-file") {
      const next = tokens[index + 1];

      if (next && !next.startsWith("--")) {
        index += 1;
      }

      continue;
    }

    if (token.startsWith("--localstorage-file=")) {
      continue;
    }

    sanitized.push(token);
  }

  return sanitized.join(" ");
}

function resolveVitestCli() {
  const requireFromUiPackage = createRequire(uiPackageJson);

  try {
    return requireFromUiPackage.resolve("vitest/vitest.mjs");
  } catch {
    const requireFromRepo = createRequire(resolve(repoRoot, "package.json"));
    return requireFromRepo.resolve("vitest/vitest.mjs");
  }
}

const env = { ...process.env };
const sanitizedNodeOptions = sanitizeNodeOptions(env.NODE_OPTIONS ?? "");

if (sanitizedNodeOptions.length > 0) {
  env.NODE_OPTIONS = sanitizedNodeOptions;
} else {
  delete env.NODE_OPTIONS;
}

/*
 * Some Windows + Vitest + DOM emulator setups still emit:
 *   Warning: `--localstorage-file` was provided without a valid path
 *
 * This is not a VeriFrame app warning. It is test-runner noise coming from
 * the spawned Node/Vitest environment. For the UI test script, suppressing
 * Node process warnings is cleaner than polluting every spec with warning hacks.
 */
env.NODE_NO_WARNINGS = "1";

const vitestCli = resolveVitestCli();

const result = spawnSync(
  process.execPath,
  [vitestCli, ...process.argv.slice(2)],
  {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
    shell: false,
    windowsHide: true
  }
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
