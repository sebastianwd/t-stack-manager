import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  extractPayload,
  listModifications,
  loadModification,
  patchBody,
  saveModification,
} from "../src/lib/modifications.js";
import type { Modification } from "../src/schemas/modification.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-mod-test-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "modifications"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

const patchMod: Modification = {
  id: "add-readme",
  description: "drop in a README",
  kind: "patch",
  applies_to: ["tanstack-fullstack"],
  idempotent: false,
  source_project_name: "",
  version: "1",
  license: "",
};

describe("saveModification + loadModification", () => {
  it("round-trips a modification", () => {
    const result = saveModification(patchMod, patchBody("diff --git a/x b/x\n+hi"));
    expect(result.ok).toBe(true);

    const loaded = loadModification("add-readme");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.modification.kind).toBe("patch");
      expect(loaded.value.modification.applies_to).toEqual(["tanstack-fullstack"]);
      expect(loaded.value.body).toContain("```diff");
    }
  });

  it("refuses to overwrite without force, allows with force", () => {
    saveModification(patchMod, "body");
    const again = saveModification(patchMod, "body");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("MODIFICATION_EXISTS");

    const forced = saveModification(patchMod, "body", { force: true });
    expect(forced.ok).toBe(true);
  });

  it("errors on a missing modification", () => {
    const result = loadModification("ghost");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("MODIFICATION_NOT_FOUND");
  });
});

describe("listModifications", () => {
  it("lists saved modifications", () => {
    saveModification(patchMod, "body");
    const { modifications } = listModifications();
    expect(modifications.map((m) => m.id)).toContain("add-readme");
  });
});

describe("extractPayload", () => {
  it("pulls the diff out of a patch body", () => {
    const body = patchBody("diff --git a/x b/x\n+hello", "a note");
    const payload = extractPayload("patch", body);
    expect(payload).toContain("+hello");
    expect(payload).not.toContain("a note");
  });

  it("pulls a script block out of a script body", () => {
    const body = "intro\n\n```ts\nexport default async () => {}\n```\n";
    const payload = extractPayload("script", body);
    expect(payload).toContain("export default async");
  });

  it("returns the prose body for instructions", () => {
    const payload = extractPayload("instructions", "1. do this\n2. do that");
    expect(payload).toBe("1. do this\n2. do that");
  });

  it("returns null when no payload is present", () => {
    expect(extractPayload("patch", "no fence here")).toBeNull();
  });
});
