import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runModifications } from "../src/commands/modifications.js";
import { applyModification, normalizeProjectName } from "../src/lib/apply.js";
import { captureProjectDiff, readProjectName } from "../src/lib/capture.js";
import { patchBody, saveModification } from "../src/lib/modifications.js";
import type { Modification } from "../src/schemas/modification.js";

let tmp: string;

async function git(cwd: string, args: string[]): Promise<void> {
  await execa("git", ["-C", cwd, ...args]);
}

async function initRepoWithBaseline(dir: string): Promise<void> {
  await git(dir, ["init", "-q"]);
  await git(dir, ["config", "user.email", "test@example.com"]);
  await git(dir, ["config", "user.name", "test"]);
  await git(dir, ["config", "commit.gpgsign", "false"]);
  fs.writeFileSync(path.join(dir, "keep.txt"), "original\n", "utf8");
  await git(dir, ["add", "-A"]);
  await git(dir, ["commit", "-q", "-m", "baseline"]);
}

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "t-stack-manager-capture-"));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("captureProjectDiff", () => {
  it("captures modified and newly added files against the initial commit", async () => {
    await initRepoWithBaseline(tmp);
    // modify a tracked file and add a new one
    fs.writeFileSync(path.join(tmp, "keep.txt"), "changed\n", "utf8");
    fs.writeFileSync(path.join(tmp, "new.ts"), "export const x = 1;\n", "utf8");

    const result = await captureProjectDiff(tmp);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.diff).toContain("keep.txt");
    expect(result.value.diff).toContain("new.ts");
    expect(result.value.diff).toContain("+changed");
    expect(result.value.baseline).toMatch(/^[0-9a-f]{7,40}$/);
  });

  it("leaves the working tree intact after capture", async () => {
    await initRepoWithBaseline(tmp);
    fs.writeFileSync(path.join(tmp, "new.ts"), "export const x = 1;\n", "utf8");
    await captureProjectDiff(tmp);
    // the new file should still be present and still untracked (index reset)
    expect(fs.existsSync(path.join(tmp, "new.ts"))).toBe(true);
    const status = await execa("git", ["-C", tmp, "status", "--porcelain"]);
    expect(status.stdout).toContain("?? new.ts");
  });

  it("errors when there are no changes", async () => {
    await initRepoWithBaseline(tmp);
    const result = await captureProjectDiff(tmp);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CAPTURE_EMPTY");
  });

  it("errors when the directory is not a git repo", async () => {
    const result = await captureProjectDiff(tmp);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CAPTURE_NO_GIT");
  });

  it("reports the project name from package.json", async () => {
    await initRepoWithBaseline(tmp);
    fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ name: "proj-alpha" }), "utf8");
    fs.writeFileSync(path.join(tmp, "x.txt"), "y\n", "utf8");
    const result = await captureProjectDiff(tmp);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.projectName).toBe("proj-alpha");
  });

  it("excludes the lockfile from a captured diff", async () => {
    await initRepoWithBaseline(tmp);
    fs.writeFileSync(path.join(tmp, "pnpm-lock.yaml"), "lockfileVersion: 9\n", "utf8");
    fs.writeFileSync(path.join(tmp, "real.ts"), "export const r = 1;\n", "utf8");
    const result = await captureProjectDiff(tmp);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.diff).toContain("real.ts");
      expect(result.value.diff).not.toContain("pnpm-lock.yaml");
    }
  });
});

describe("normalizeProjectName", () => {
  it("rewrites a distinctive name across the patch", () => {
    const patch = `"name": "proj-alpha"\n+import x from "proj-alpha"`;
    expect(normalizeProjectName(patch, "proj-alpha", "proj-beta")).toBe(
      `"name": "proj-beta"\n+import x from "proj-beta"`,
    );
  });

  it("is a no-op for equal or too-generic names", () => {
    expect(normalizeProjectName("the app runs", "app", "web")).toBe("the app runs");
    expect(normalizeProjectName("x", "proj-alpha", "proj-alpha")).toBe("x");
  });
});

async function repoWithPackage(dir: string, name: string): Promise<void> {
  fs.mkdirSync(dir, { recursive: true });
  await execa("git", ["-C", dir, "init", "-q"]);
  await execa("git", ["-C", dir, "config", "user.email", "t@t.com"]);
  await execa("git", ["-C", dir, "config", "user.name", "t"]);
  await execa("git", ["-C", dir, "config", "commit.gpgsign", "false"]);
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify({ name, version: "1.0.0" }, null, 2)}\n`,
    "utf8",
  );
  await execa("git", ["-C", dir, "add", "-A"]);
  await execa("git", ["-C", dir, "commit", "-q", "-m", "baseline"]);
}

describe("name-agnostic patch apply (the reuse-on-another-name bug)", () => {
  it("applies a patch captured from one project name onto another", async () => {
    process.env.T_STACK_MANAGER_HOME = path.join(tmp, "store");
    fs.mkdirSync(path.join(tmp, "store", "modifications"), { recursive: true });

    // Source project "proj-alpha": add a script to package.json (hunk context holds the name).
    const a = path.join(tmp, "alpha");
    await repoWithPackage(a, "proj-alpha");
    fs.writeFileSync(
      path.join(a, "package.json"),
      `${JSON.stringify({ name: "proj-alpha", version: "1.0.0", scripts: { lint: "oxlint" } }, null, 2)}\n`,
      "utf8",
    );
    const captured = await captureProjectDiff(a);
    expect(captured.ok).toBe(true);
    if (!captured.ok) return;

    const mod: Modification = {
      id: "add-lint",
      description: "add lint script",
      kind: "patch",
      applies_to: [],
      idempotent: false,
      source_project_name: captured.value.projectName,
      version: "1",
      license: "",
    };
    saveModification(mod, patchBody(captured.value.diff));

    // Target project "proj-beta": same baseline package.json, different name.
    const b = path.join(tmp, "beta");
    await repoWithPackage(b, "proj-beta");

    const result = await applyModification("add-lint", b);
    expect(result.status).toBe("patched");
    const pkg = JSON.parse(fs.readFileSync(path.join(b, "package.json"), "utf8")) as {
      scripts?: { lint?: string };
      name?: string;
    };
    expect(pkg.scripts?.lint).toBe("oxlint");
    expect(pkg.name).toBe("proj-beta"); // name untouched

    delete process.env.T_STACK_MANAGER_HOME;
  });
});

describe("modifications add --as-template", () => {
  it("refuses to create a bundle that links an unresolved modification", async () => {
    process.env.T_STACK_MANAGER_HOME = path.join(tmp, "store");
    const tplDir = path.join(tmp, "store", "packs", "default", "templates");
    fs.mkdirSync(tplDir, { recursive: true });
    // base template that already links a modification that doesn't exist
    fs.writeFileSync(
      path.join(tplDir, "base.md"),
      `---\nname: base\nbetter-t-stack-version: 3.30.3\nflags:\n  frontend: ["tanstack-router"]\n  install: false\n  git: false\ndefault_modifications:\n  - ghost-mod\n---\n`,
      "utf8",
    );
    const proj = path.join(tmp, "p");
    await repoWithPackage(proj, "p");
    fs.writeFileSync(path.join(proj, "x.txt"), "y\n", "utf8");

    const code = await runModifications({
      sub: "add",
      id: "new-mod",
      fromProject: proj,
      template: "base",
      asTemplate: "bundle-x",
      force: false,
      json: true,
    });

    expect(code).toBe(1);
    // the bundle must NOT have been written
    expect(fs.existsSync(path.join(tplDir, "bundle-x.md"))).toBe(false);
    delete process.env.T_STACK_MANAGER_HOME;
  });
});

describe("readProjectName", () => {
  it("prefers package.json name, falls back to basename", () => {
    const d = path.join(tmp, "named");
    fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({ name: "from-pkg" }), "utf8");
    expect(readProjectName(d)).toBe("from-pkg");

    const e = path.join(tmp, "no-pkg-here");
    fs.mkdirSync(e, { recursive: true });
    expect(readProjectName(e)).toBe("no-pkg-here");
  });
});
