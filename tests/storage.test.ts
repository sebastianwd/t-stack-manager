import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listTemplates, loadTemplate, parseFrontmatter, saveTemplate } from "../src/lib/storage.js";
import type { Template } from "../src/schemas/template.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-test-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "packs", "default", "templates"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function writeTemplate(name: string, contents: string): void {
  fs.writeFileSync(
    path.join(tmp, ".stacksmith", "packs", "default", "templates", `${name}.md`),
    contents,
    "utf8",
  );
}

const VALID = `---
name: my-template
description: A valid template
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

# Notes
hello
`;

describe("parseFrontmatter", () => {
  it("splits frontmatter from body", () => {
    const parsed = parseFrontmatter(VALID);
    if (!parsed) throw new Error("expected frontmatter");
    expect((parsed.frontmatter as { name: string }).name).toBe("my-template");
    expect(parsed.body).toContain("hello");
  });

  it("returns null when there is no frontmatter", () => {
    expect(parseFrontmatter("# just a heading")).toBeNull();
  });
});

describe("loadTemplate", () => {
  it("loads and validates a good template", () => {
    writeTemplate("my-template", VALID);
    const result = loadTemplate("my-template");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.template.name).toBe("my-template");
      expect(result.value.template.flags.backend).toBe("hono");
      expect(result.value.source).toBe("default");
    }
  });

  it("errors on a missing template", () => {
    const result = loadTemplate("does-not-exist");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TEMPLATE_NOT_FOUND");
  });

  it("errors on an invalid flag value", () => {
    writeTemplate("bad", VALID.replace("backend: hono", "backend: not-a-real-backend"));
    const result = loadTemplate("bad");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("TEMPLATE_INVALID");
  });
});

describe("listTemplates", () => {
  it("lists user templates only (bundled defaults are a seed, not auto-merged)", () => {
    writeTemplate("my-template", VALID);
    const { templates } = listTemplates();
    const names = templates.map((t) => t.name);
    expect(names).toContain("my-template");
    // bundled defaults are NOT merged at runtime; a clean install shows nothing until `seed`
    expect(names).not.toContain("tanstack-fullstack");
  });

  it("reports invalid templates in errors, not templates", () => {
    writeTemplate("bad", VALID.replace("backend: hono", "backend: nope"));
    const { templates, errors } = listTemplates();
    expect(templates.map((t) => t.name)).not.toContain("bad");
    expect(errors.some((e) => e.name === "bad")).toBe(true);
  });
});

describe("saveTemplate", () => {
  const template: Template = {
    name: "saved-one",
    description: "a saved template",
    "better-t-stack-version": "3.30.3",
    flags: { frontend: ["tanstack-start"], backend: "hono", install: false, git: false },
    default_libraries: [],
    default_modifications: [],
    default_skills: [],
  };

  it("writes a loadable template that round-trips through loadTemplate", () => {
    const result = saveTemplate(template, "# saved-one\nnotes");
    expect(result.ok).toBe(true);

    const loaded = loadTemplate("saved-one");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.template.flags.backend).toBe("hono");
      expect(loaded.value.template["better-t-stack-version"]).toBe("3.30.3");
    }
  });

  it("refuses to overwrite an existing template without force", () => {
    saveTemplate(template, "body");
    const again = saveTemplate(template, "body");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("TEMPLATE_EXISTS");
  });

  it("overwrites when force is set", () => {
    saveTemplate(template, "body");
    const forced = saveTemplate(template, "body", { force: true });
    expect(forced.ok).toBe(true);
  });
});
