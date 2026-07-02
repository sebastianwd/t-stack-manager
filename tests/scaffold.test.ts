import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BTStackAdapter, ScaffoldOptions } from "../src/lib/better-t.js";
import { patchBody, saveModification } from "../src/lib/modifications.js";
import { ok } from "../src/lib/result.js";
import type { Modification } from "../src/schemas/modification.js";
import { runScaffold } from "../src/commands/scaffold.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-scaffold-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "templates"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const TEMPLATE = `---
name: t1
description: test
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-start"]
  backend: hono
  runtime: workers
  api: orpc
  packageManager: pnpm
  install: false
  git: false
---
`;

function writeTemplate(): void {
  fs.writeFileSync(path.join(tmp, ".stacksmith", "templates", "t1.md"), TEMPLATE, "utf8");
}

/** Adapter that records the options it received and never spawns anything. */
function makeFakeAdapter(): { adapter: BTStackAdapter; calls: ScaffoldOptions[] } {
  const calls: ScaffoldOptions[] = [];
  const adapter: BTStackAdapter = {
    async scaffold(opts) {
      calls.push(opts);
      return ok({
        projectDir: opts.targetDir,
        reproducibleCommand: "fake command",
        elapsedMs: 1,
        raw: {},
      });
    },
  };
  return { adapter, calls };
}

describe("runScaffold", () => {
  it("passes the template flags + pinned version to the adapter (no real spawn)", async () => {
    writeTemplate();
    const { adapter, calls } = makeFakeAdapter();
    const target = path.join(tmp, "out-app");

    const code = await runScaffold(
      { template: "t1", target, name: "out-app", dryRun: false, json: true },
      adapter,
    );

    expect(code).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.betterTStackVersion).toBe("3.30.3");
    expect(calls[0]?.flags.backend).toBe("hono");
    expect(calls[0]?.targetDir).toBe(path.resolve(target));
  });

  it("fails cleanly when the template is missing", async () => {
    const { adapter, calls } = makeFakeAdapter();
    const code = await runScaffold(
      { template: "ghost", target: path.join(tmp, "x"), dryRun: false, json: true },
      adapter,
    );
    expect(code).toBe(1);
    expect(calls).toHaveLength(0);
  });

  it("requires --target", async () => {
    writeTemplate();
    const { adapter } = makeFakeAdapter();
    const code = await runScaffold(
      { template: "t1", target: "", dryRun: false, json: true },
      adapter,
    );
    expect(code).toBe(1);
  });

  it("applies the template's default_modifications after scaffolding", async () => {
    // a template that links one modification
    const t2 = `---
name: t2
description: test
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-start"]
  backend: hono
  runtime: workers
  api: orpc
  packageManager: pnpm
  install: false
  git: false
default_modifications:
  - add-file
---
`;
    fs.writeFileSync(path.join(tmp, ".stacksmith", "templates", "t2.md"), t2, "utf8");
    // a patch mod that adds a new file (applies in any directory)
    const mod: Modification = {
      id: "add-file",
      description: "add a file",
      kind: "patch",
      applies_to: ["t2"],
      idempotent: false,
      source_project_name: "",
      version: "1",
      license: "",
    };
    const diff = [
      "diff --git a/added.txt b/added.txt",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/added.txt",
      "@@ -0,0 +1 @@",
      "+hello from mod",
      "",
    ].join("\n");
    saveModification(mod, patchBody(diff));

    // adapter that actually creates the project dir so the patch can land
    const calls: ScaffoldOptions[] = [];
    const adapter: BTStackAdapter = {
      async scaffold(opts) {
        calls.push(opts);
        fs.mkdirSync(opts.targetDir, { recursive: true });
        return ok({
          projectDir: opts.targetDir,
          reproducibleCommand: "fake",
          elapsedMs: 1,
          raw: {},
        });
      },
    };

    const target = path.join(tmp, "app2");
    const code = await runScaffold(
      { template: "t2", target, name: "app2", dryRun: false, json: true },
      adapter,
    );

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(target, "added.txt"))).toBe(true);
    expect(fs.readFileSync(path.join(target, "added.txt"), "utf8")).toContain("hello from mod");
  });
});
