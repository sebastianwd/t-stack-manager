import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addPack, parseSource } from "../src/lib/add.js";
import { listLibraries } from "../src/lib/libraries.js";
import { listTemplates } from "../src/lib/storage.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-add-"));
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe("parseSource", () => {
  it("parses github shorthand, url, ref, and local dir", () => {
    expect(parseSource("github:me/my-stack")).toEqual({
      kind: "github",
      owner: "me",
      repo: "my-stack",
      ref: "main",
    });
    expect(parseSource("github:me/my-stack@dev")).toMatchObject({ ref: "dev" });
    expect(parseSource("https://github.com/me/my-stack")).toMatchObject({
      kind: "github",
      owner: "me",
      repo: "my-stack",
      ref: "main",
    });
    // browser URL with a branch, and a .git suffix
    expect(parseSource("https://github.com/me/my-stack/tree/dev")).toMatchObject({ ref: "dev" });
    expect(parseSource("https://github.com/me/my-stack.git")).toMatchObject({ repo: "my-stack" });
    expect(parseSource(tmp)).toEqual({ kind: "local", dir: path.resolve(tmp) });
    expect(parseSource("not-a-real-thing")).toBeNull();
  });
});

const TEMPLATE = `---
name: shared-tpl
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-start"]
  install: false
  git: false
---
body
`;

const LIBRARY = `---
id: shared-lib
category: forms
package: react-hook-form
---
body
`;

function writePack(dir: string): void {
  fs.mkdirSync(path.join(dir, "templates"), { recursive: true });
  fs.mkdirSync(path.join(dir, "libraries"), { recursive: true });
  fs.writeFileSync(path.join(dir, "templates", "shared-tpl.md"), TEMPLATE);
  fs.writeFileSync(path.join(dir, "libraries", "shared-lib.md"), LIBRARY);
  // a malformed entry should be reported invalid, not written
  fs.writeFileSync(path.join(dir, "libraries", "broken.md"), "no frontmatter here");
}

describe("addPack (local source)", () => {
  it("imports valid entries, flags invalid ones, and writes to user storage", async () => {
    const pack = path.join(tmp, "pack");
    writePack(pack);

    const result = await addPack(pack);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const byStatus = (s: string) => result.value.items.filter((i) => i.status === s).map((i) => i.id);
    expect(byStatus("imported").toSorted()).toEqual(["shared-lib", "shared-tpl"]);
    expect(byStatus("invalid")).toEqual(["broken"]);

    expect(listTemplates().templates.map((t) => t.name)).toContain("shared-tpl");
    expect(listLibraries().libraries.map((l) => l.id)).toContain("shared-lib");
  });

  it("skips already-present entries unless force", async () => {
    const pack = path.join(tmp, "pack");
    writePack(pack);
    await addPack(pack);

    const again = await addPack(pack);
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.items.some((i) => i.id === "shared-tpl" && i.status === "skipped")).toBe(true);

    const forced = await addPack(pack, { force: true });
    expect(forced.ok).toBe(true);
    if (!forced.ok) return;
    expect(forced.value.items.some((i) => i.id === "shared-tpl" && i.status === "imported")).toBe(true);
  });

  it("errors on an unknown source and an empty pack", async () => {
    const bad = await addPack("not-a-source");
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("ADD_BAD_SOURCE");

    const emptyDir = path.join(tmp, "empty");
    fs.mkdirSync(emptyDir, { recursive: true });
    const empty = await addPack(emptyDir);
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.error.code).toBe("ADD_EMPTY");
  });
});
