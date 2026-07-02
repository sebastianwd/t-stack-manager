import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { type Template, TemplateSchema } from "../schemas/template.js";
import type { LoadedTemplate, TemplateSource, TemplateSummary } from "../types.js";
import { userTemplatesDir } from "./paths.js";
import { fail, ok, type Result } from "./result.js";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n([\s\S]*))?$/;

interface ParsedMarkdown {
  frontmatter: unknown;
  body: string;
}

/** Split a markdown file into YAML frontmatter + body. */
export function parseFrontmatter(raw: string): ParsedMarkdown | null {
  const match = FRONTMATTER_RE.exec(raw);
  if (!match) return null;
  const yamlText = match[1] ?? "";
  const body = match[2] ?? "";
  return { frontmatter: parseYaml(yamlText), body };
}

function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f));
}

/**
 * Discover template files from user storage. Bundled defaults are a seed source
 * (`stacksmith seed`), not merged at runtime, so a fresh install is clean.
 */
function discoverTemplateFiles(
  cwd?: string,
): Map<string, { file: string; source: TemplateSource }> {
  const result = new Map<string, { file: string; source: TemplateSource }>();
  for (const file of listMarkdownFiles(userTemplatesDir(cwd))) {
    const name = path.basename(file, ".md");
    result.set(name, { file, source: "user" });
  }
  return result;
}

/** Load + validate a single template by name. */
export function loadTemplate(name: string, cwd?: string): Result<LoadedTemplate> {
  const files = discoverTemplateFiles(cwd);
  const entry = files.get(name);
  if (!entry) {
    return fail(
      "TEMPLATE_NOT_FOUND",
      `No template named "${name}".`,
      "Run `stacksmith templates list` to see available templates.",
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(entry.file, "utf8");
  } catch (cause) {
    return fail("TEMPLATE_READ_ERROR", `Could not read ${entry.file}: ${String(cause)}`);
  }

  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return fail(
      "TEMPLATE_NO_FRONTMATTER",
      `Template ${entry.file} has no YAML frontmatter.`,
      "Templates must start with a `---` delimited YAML block.",
    );
  }

  const validated = TemplateSchema.safeParse(parsed.frontmatter);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail(
      "TEMPLATE_INVALID",
      `Template ${entry.file} failed validation:\n${issues}`,
      "The flags may target a different better-t-stack version than the one Stacksmith was built against.",
    );
  }

  return ok({ template: validated.data, path: entry.file, source: entry.source });
}

/** Summaries for `templates list`, sorted by name. Skips invalid templates but notes them. */
export function listTemplates(cwd?: string): {
  templates: TemplateSummary[];
  errors: Array<{ name: string; message: string }>;
} {
  const files = discoverTemplateFiles(cwd);
  const templates: TemplateSummary[] = [];
  const errors: Array<{ name: string; message: string }> = [];

  for (const [name, entry] of files) {
    const loaded = loadTemplate(name, cwd);
    if (!loaded.ok) {
      errors.push({ name, message: loaded.error.message });
      continue;
    }
    templates.push({
      name: loaded.value.template.name,
      description: loaded.value.template.description,
      better_t_stack_version: loaded.value.template["better-t-stack-version"],
      path: entry.file,
      source: entry.source,
    });
  }

  templates.sort((a, b) => a.name.localeCompare(b.name));
  return { templates, errors };
}

export interface SaveTemplateResult {
  path: string;
}

/**
 * Write a template to user storage as markdown + YAML frontmatter.
 *
 * Validates the frontmatter against `TemplateSchema` before writing, so a saved
 * template is guaranteed loadable. Refuses to clobber an existing file unless
 * `force` is set (matches the project rule: never silently overwrite a template).
 */
export function saveTemplate(
  template: Template,
  body: string,
  opts: { force?: boolean; cwd?: string } = {},
): Result<SaveTemplateResult> {
  const validated = TemplateSchema.safeParse(template);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("TEMPLATE_INVALID", `Refusing to write an invalid template:\n${issues}`);
  }

  const dir = userTemplatesDir(opts.cwd);
  const file = path.join(dir, `${validated.data.name}.md`);

  if (!opts.force && fs.existsSync(file)) {
    return fail(
      "TEMPLATE_EXISTS",
      `A template named "${validated.data.name}" already exists at ${file}.`,
      "Pass --force to overwrite it, or choose a different --name.",
    );
  }

  const frontmatter = stringifyYaml(validated.data).trimEnd();
  const trimmedBody = body.trim();
  const contents = `---\n${frontmatter}\n---\n\n${trimmedBody}\n`;

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, contents, "utf8");
  } catch (cause) {
    return fail("TEMPLATE_WRITE_ERROR", `Could not write ${file}: ${String(cause)}`);
  }

  return ok({ path: file });
}
