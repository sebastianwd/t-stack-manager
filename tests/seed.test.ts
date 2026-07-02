import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSeeded } from "../src/lib/config.js";
import { seedDefaults } from "../src/lib/seed.js";
import { listLibraries } from "../src/lib/libraries.js";
import { listTemplates } from "../src/lib/storage.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-seed-"));
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("seedDefaults", () => {
  it("a fresh install is clean until seeded", () => {
    expect(listTemplates().templates).toHaveLength(0);
    expect(listLibraries().libraries).toHaveLength(0);
    expect(isSeeded()).toBe(false);
  });

  it("copies bundled defaults into user storage and marks seeded", () => {
    const result = seedDefaults();
    expect(result.copied.length).toBeGreaterThan(0);
    expect(isSeeded()).toBe(true);

    const templates = listTemplates().templates.map((t) => t.name);
    expect(templates).toContain("tanstack-cf-orpc");
    const libraries = listLibraries().libraries.map((l) => l.id);
    expect(libraries).toContain("zod");
    // seeded entries are now user-owned files
    expect(listTemplates().templates.every((t) => t.source === "user")).toBe(true);
  });

  it("is idempotent: a second seed skips existing files", () => {
    seedDefaults();
    const again = seedDefaults();
    expect(again.copied).toHaveLength(0);
    expect(again.skipped.length).toBeGreaterThan(0);
  });

  it("can seed a single store", () => {
    const result = seedDefaults({ stores: ["libraries"] });
    expect(result.copied.every((k) => k.startsWith("libraries/"))).toBe(true);
    expect(listTemplates().templates).toHaveLength(0);
    expect(listLibraries().libraries.length).toBeGreaterThan(0);
  });
});
