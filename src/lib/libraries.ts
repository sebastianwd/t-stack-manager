import fs from "node:fs";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { type Library, LibrarySchema } from "../schemas/library.js";
import type { TemplateSource } from "../types.js";
import { discoverStoreFiles } from "./packs.js";
import { userLibrariesDir } from "./paths.js";
import { fail, ok, type Result } from "./result.js";
import { parseFrontmatter } from "./storage.js";

export interface LoadedLibrary {
  library: Library;
  body: string;
  path: string;
  source: TemplateSource;
}

export interface LibrarySummary {
  id: string;
  category: string;
  package: string;
  description: string;
  use_cases: string[];
  path: string;
  source: TemplateSource;
}

function discoverLibraryFiles(cwd?: string): Map<string, { file: string; source: TemplateSource }> {
  const result = new Map<string, { file: string; source: TemplateSource }>();
  for (const [id, { file, pack }] of discoverStoreFiles("libraries", cwd)) {
    result.set(id, { file, source: pack });
  }
  return result;
}

export function loadLibrary(id: string, cwd?: string): Result<LoadedLibrary> {
  const files = discoverLibraryFiles(cwd);
  const entry = files.get(id);
  if (!entry) {
    return fail(
      "LIBRARY_NOT_FOUND",
      `No library named "${id}".`,
      "Run `t-stack-manager libraries list` to see the catalogue.",
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(entry.file, "utf8");
  } catch (cause) {
    return fail("LIBRARY_READ_ERROR", `Could not read ${entry.file}: ${String(cause)}`);
  }

  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return fail("LIBRARY_NO_FRONTMATTER", `Library ${entry.file} has no YAML frontmatter.`);
  }

  const validated = LibrarySchema.safeParse(parsed.frontmatter);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("LIBRARY_INVALID", `Library ${entry.file} failed validation:\n${issues}`);
  }

  return ok({ library: validated.data, body: parsed.body, path: entry.file, source: entry.source });
}

export function listLibraries(
  opts: { category?: string; cwd?: string } = {},
): { libraries: LibrarySummary[]; errors: Array<{ id: string; message: string }> } {
  const files = discoverLibraryFiles(opts.cwd);
  const libraries: LibrarySummary[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const [id, entry] of files) {
    const loaded = loadLibrary(id, opts.cwd);
    if (!loaded.ok) {
      errors.push({ id, message: loaded.error.message });
      continue;
    }
    if (opts.category && loaded.value.library.category !== opts.category) continue;
    libraries.push({
      id: loaded.value.library.id,
      category: loaded.value.library.category,
      package: loaded.value.library.package,
      description: loaded.value.library.description,
      use_cases: loaded.value.library.use_cases,
      path: entry.file,
      source: entry.source,
    });
  }

  libraries.sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id));
  return { libraries, errors };
}

export interface SaveLibraryResult {
  path: string;
}

export function saveLibrary(
  library: Library,
  body: string,
  opts: { force?: boolean; cwd?: string } = {},
): Result<SaveLibraryResult> {
  const validated = LibrarySchema.safeParse(library);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("LIBRARY_INVALID", `Refusing to write an invalid library:\n${issues}`);
  }

  const dir = userLibrariesDir(opts.cwd);
  const file = path.join(dir, `${validated.data.id}.md`);

  if (!opts.force && fs.existsSync(file)) {
    return fail(
      "LIBRARY_EXISTS",
      `A library named "${validated.data.id}" already exists at ${file}.`,
      "Pass --force to overwrite it, or choose a different --id.",
    );
  }

  const frontmatter = stringifyYaml(validated.data).trimEnd();
  const contents = `---\n${frontmatter}\n---\n\n${body.trim()}\n`;

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, contents, "utf8");
  } catch (cause) {
    return fail("LIBRARY_WRITE_ERROR", `Could not write ${file}: ${String(cause)}`);
  }

  return ok({ path: file });
}
