import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { detectPackageManager, substituteRunner } from "../src/lib/runner.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-runner-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("substituteRunner", () => {
  it("maps {{dlx}} per package manager", () => {
    const cmd = "{{dlx}} @tanstack/intent@latest install";
    expect(substituteRunner(cmd, "npm")).toBe("npx @tanstack/intent@latest install");
    expect(substituteRunner(cmd, "pnpm")).toBe("pnpm dlx @tanstack/intent@latest install");
    expect(substituteRunner(cmd, "bun")).toBe("bunx @tanstack/intent@latest install");
  });

  it("maps {{pm}} and defaults unknown/undefined/yarn to npm", () => {
    expect(substituteRunner("{{pm}} install", "pnpm")).toBe("pnpm install");
    expect(substituteRunner("{{dlx}} x", "weird")).toBe("npx x");
    expect(substituteRunner("{{dlx}} x", "yarn")).toBe("npx x"); // yarn not supported
    expect(substituteRunner("{{dlx}} x", undefined)).toBe("npx x");
  });
});

describe("detectPackageManager", () => {
  it("prefers the packageManager field in package.json", () => {
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ packageManager: "pnpm@10.0.0" }));
    expect(detectPackageManager(tmp)).toBe("pnpm");
  });

  it("falls back to the lockfile", () => {
    fs.writeFileSync(path.join(tmp, "bun.lockb"), "");
    expect(detectPackageManager(tmp)).toBe("bun");
  });

  it("defaults to npm when nothing is detectable", () => {
    expect(detectPackageManager(tmp)).toBe("npm");
  });
});
