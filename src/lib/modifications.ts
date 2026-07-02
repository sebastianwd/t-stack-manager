import fs from "node:fs";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { type Modification, ModificationSchema } from "../schemas/modification.js";
import type { TemplateSource } from "../types.js";
import { discoverStoreFiles } from "./packs.js";
import { userModificationsDir } from "./paths.js";
import { fail, ok, type Result } from "./result.js";
import { parseFrontmatter } from "./storage.js";

export interface LoadedModification {
  modification: Modification;
  body: string;
  path: string;
  source: TemplateSource;
}

export interface ModificationSummary {
  id: string;
  description: string;
  kind: Modification["kind"];
  applies_to: string[];
  path: string;
  source: TemplateSource;
}

function discoverModificationFiles(
  cwd?: string,
): Map<string, { file: string; source: TemplateSource }> {
  const result = new Map<string, { file: string; source: TemplateSource }>();
  for (const [id, { file, pack }] of discoverStoreFiles("modifications", cwd)) {
    result.set(id, { file, source: pack });
  }
  return result;
}

export function loadModification(id: string, cwd?: string): Result<LoadedModification> {
  const files = discoverModificationFiles(cwd);
  const entry = files.get(id);
  if (!entry) {
    return fail(
      "MODIFICATION_NOT_FOUND",
      `No modification named "${id}".`,
      "Run `t-stack-manager modifications list` to see what is available.",
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(entry.file, "utf8");
  } catch (cause) {
    return fail("MODIFICATION_READ_ERROR", `Could not read ${entry.file}: ${String(cause)}`);
  }

  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return fail("MODIFICATION_NO_FRONTMATTER", `Modification ${entry.file} has no YAML frontmatter.`);
  }

  const validated = ModificationSchema.safeParse(parsed.frontmatter);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("MODIFICATION_INVALID", `Modification ${entry.file} failed validation:\n${issues}`);
  }

  return ok({
    modification: validated.data,
    body: parsed.body,
    path: entry.file,
    source: entry.source,
  });
}

export function listModifications(cwd?: string): {
  modifications: ModificationSummary[];
  errors: Array<{ id: string; message: string }>;
} {
  const files = discoverModificationFiles(cwd);
  const modifications: ModificationSummary[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const [id, entry] of files) {
    const loaded = loadModification(id, cwd);
    if (!loaded.ok) {
      errors.push({ id, message: loaded.error.message });
      continue;
    }
    modifications.push({
      id: loaded.value.modification.id,
      description: loaded.value.modification.description,
      kind: loaded.value.modification.kind,
      applies_to: loaded.value.modification.applies_to,
      path: entry.file,
      source: entry.source,
    });
  }

  modifications.sort((a, b) => a.id.localeCompare(b.id));
  return { modifications, errors };
}

export interface SaveModificationResult {
  path: string;
}

export function saveModification(
  mod: Modification,
  body: string,
  opts: { force?: boolean; cwd?: string } = {},
): Result<SaveModificationResult> {
  const validated = ModificationSchema.safeParse(mod);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("MODIFICATION_INVALID", `Refusing to write an invalid modification:\n${issues}`);
  }

  const dir = userModificationsDir(opts.cwd);
  const file = path.join(dir, `${validated.data.id}.md`);

  if (!opts.force && fs.existsSync(file)) {
    return fail(
      "MODIFICATION_EXISTS",
      `A modification named "${validated.data.id}" already exists at ${file}.`,
      "Pass --force to overwrite it, or choose a different --id.",
    );
  }

  const frontmatter = stringifyYaml(validated.data).trimEnd();
  const contents = `---\n${frontmatter}\n---\n\n${body.trim()}\n`;

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, contents, "utf8");
  } catch (cause) {
    return fail("MODIFICATION_WRITE_ERROR", `Could not write ${file}: ${String(cause)}`);
  }

  return ok({ path: file });
}

/** Build the markdown body for a captured patch modification. */
export function patchBody(diff: string, note?: string): string {
  const intro = note ? `${note}\n\n` : "";
  return `${intro}\`\`\`diff\n${diff.trimEnd()}\n\`\`\``;
}

/**
 * Extract the applyable payload from a modification body, by kind.
 * `instructions` returns the prose body; `patch`/`script` return the contents
 * of the first matching fenced code block.
 */
export function extractPayload(kind: Modification["kind"], body: string): string | null {
  if (kind === "instructions") return body.trim() || null;
  const langs =
    kind === "patch"
      ? ["diff", "patch"]
      : ["ts", "typescript", "mjs", "js", "javascript"];
  const re = new RegExp(`\`\`\`(?:${langs.join("|")})\\r?\\n([\\s\\S]*?)\`\`\``);
  const m = re.exec(body);
  return m && m[1] !== undefined ? m[1] : null;
}
