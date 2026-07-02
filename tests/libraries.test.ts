import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listLibraries, loadLibrary, saveLibrary } from "../src/lib/libraries.js";
import type { Library } from "../src/schemas/library.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-lib-test-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "libraries"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function lib(over: Partial<Library>): Library {
  return {
    id: "react-hook-form",
    category: "forms",
    package: "react-hook-form",
    description: "performant forms",
    use_cases: ["forms"],
    alternatives_considered: ["formik"],
    when_to_use: "complex forms",
    gotchas: "needs a resolver for zod",
    peer_deps: ["zod"],
    skill_ref: "",
    last_reviewed: "",
    license: "MIT",
    ...over,
  };
}

describe("saveLibrary + loadLibrary", () => {
  it("round-trips a library entry", () => {
    const result = saveLibrary(lib({}), "why react-hook-form");
    expect(result.ok).toBe(true);

    const loaded = loadLibrary("react-hook-form");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.library.category).toBe("forms");
      expect(loaded.value.library.peer_deps).toEqual(["zod"]);
      expect(loaded.value.library.package).toBe("react-hook-form");
    }
  });

  it("does not persist a version field (resolved at install time)", () => {
    saveLibrary(lib({}), "body");
    const raw = fs.readFileSync(
      path.join(tmp, ".stacksmith", "libraries", "react-hook-form.md"),
      "utf8",
    );
    expect(raw).not.toMatch(/^version:/m);
  });

  it("refuses to overwrite without force, allows with force", () => {
    saveLibrary(lib({}), "body");
    const again = saveLibrary(lib({}), "body");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("LIBRARY_EXISTS");

    const forced = saveLibrary(lib({}), "body", { force: true });
    expect(forced.ok).toBe(true);
  });

  it("errors on a missing library", () => {
    const result = loadLibrary("ghost");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("LIBRARY_NOT_FOUND");
  });
});

describe("listLibraries", () => {
  it("lists and filters by category", () => {
    saveLibrary(lib({ id: "react-hook-form", category: "forms" }), "b");
    saveLibrary(lib({ id: "zod", category: "validation", package: "zod" }), "b");

    // filter to user source: the package also ships bundled default libraries
    const all = listLibraries();
    const userIds = all.libraries.filter((l) => l.source === "user").map((l) => l.id).toSorted();
    expect(userIds).toEqual(["react-hook-form", "zod"]);

    const forms = listLibraries({ category: "forms" });
    expect(forms.libraries.map((l) => l.id)).toContain("react-hook-form");
  });
});
