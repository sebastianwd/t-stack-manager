import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearDefaultTargetDir, getDefaultTargetDir, setDefaultTargetDir } from "../src/lib/config.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t-stack-manager-config-"));
  process.env.T_STACK_MANAGER_HOME = path.join(tmp, ".t-stack-manager");
});

afterEach(() => {
  delete process.env.T_STACK_MANAGER_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("defaultTargetDir config", () => {
  it("is undefined on a fresh install", () => {
    expect(getDefaultTargetDir()).toBeUndefined();
  });

  it("persists and reads back a set value", () => {
    const dir = path.join(tmp, "dev");
    setDefaultTargetDir(dir);
    expect(getDefaultTargetDir()).toBe(dir);
  });

  it("clears back to undefined", () => {
    setDefaultTargetDir(path.join(tmp, "dev"));
    clearDefaultTargetDir();
    expect(getDefaultTargetDir()).toBeUndefined();
  });
});
