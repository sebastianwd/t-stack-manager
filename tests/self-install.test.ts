import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installSkillBundle } from "../src/lib/self-install.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t-stack-manager-selfinstall-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("installSkillBundle", () => {
  it("copies the bundle into <base>/.claude/skills/t-stack-manager", () => {
    const src = path.join(tmp, "bundle");
    fs.mkdirSync(path.join(src, "reference"), { recursive: true });
    fs.writeFileSync(path.join(src, "SKILL.md"), "skill", "utf8");
    fs.writeFileSync(path.join(src, "reference", "scaffold.md"), "ref", "utf8");

    const base = path.join(tmp, "home");
    const result = installSkillBundle({ base, srcDir: src });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.files).toBe(2);
    expect(fs.existsSync(path.join(base, ".claude", "skills", "t-stack-manager", "SKILL.md"))).toBe(true);
    expect(
      fs.existsSync(path.join(base, ".claude", "skills", "t-stack-manager", "reference", "scaffold.md")),
    ).toBe(true);
  });

  it("errors when the bundle source is missing", () => {
    const result = installSkillBundle({ base: path.join(tmp, "home"), srcDir: path.join(tmp, "nope") });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("BUNDLE_MISSING");
  });
});
