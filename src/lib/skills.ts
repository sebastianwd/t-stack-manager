import fs from "node:fs";
import path from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { type Skill, SkillSchema, stepKind } from "../schemas/skill.js";
import type { TemplateSource } from "../types.js";
import { discoverStoreFiles } from "./packs.js";
import { userSkillsDir } from "./paths.js";
import { fail, ok, type Result } from "./result.js";
import { substituteRunner } from "./runner.js";
import { parseFrontmatter } from "./storage.js";

export interface LoadedSkill {
  skill: Skill;
  body: string;
  path: string;
  source: TemplateSource;
}

export interface SkillSummary {
  id: string;
  description: string;
  category: string;
  url: string;
  install_steps: number;
  path: string;
  source: TemplateSource;
}

function discoverSkillFiles(cwd?: string): Map<string, { file: string; source: TemplateSource }> {
  const result = new Map<string, { file: string; source: TemplateSource }>();
  for (const [id, { file, pack }] of discoverStoreFiles("skills", cwd)) {
    result.set(id, { file, source: pack });
  }
  return result;
}

export function loadSkill(id: string, cwd?: string): Result<LoadedSkill> {
  const files = discoverSkillFiles(cwd);
  const entry = files.get(id);
  if (!entry) {
    return fail(
      "SKILL_NOT_FOUND",
      `No skill named "${id}".`,
      "Run `stacksmith skills list` to see what is available.",
    );
  }

  let raw: string;
  try {
    raw = fs.readFileSync(entry.file, "utf8");
  } catch (cause) {
    return fail("SKILL_READ_ERROR", `Could not read ${entry.file}: ${String(cause)}`);
  }

  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return fail("SKILL_NO_FRONTMATTER", `Skill ${entry.file} has no YAML frontmatter.`);
  }

  const validated = SkillSchema.safeParse(parsed.frontmatter);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("SKILL_INVALID", `Skill ${entry.file} failed validation:\n${issues}`);
  }

  return ok({ skill: validated.data, body: parsed.body, path: entry.file, source: entry.source });
}

export function listSkills(
  opts: { category?: string; cwd?: string } = {},
): { skills: SkillSummary[]; errors: Array<{ id: string; message: string }> } {
  const files = discoverSkillFiles(opts.cwd);
  const skills: SkillSummary[] = [];
  const errors: Array<{ id: string; message: string }> = [];

  for (const [id, entry] of files) {
    const loaded = loadSkill(id, opts.cwd);
    if (!loaded.ok) {
      errors.push({ id, message: loaded.error.message });
      continue;
    }
    if (opts.category && loaded.value.skill.category !== opts.category) continue;
    skills.push({
      id: loaded.value.skill.id,
      description: loaded.value.skill.description,
      category: loaded.value.skill.category,
      url: loaded.value.skill.url,
      install_steps: loaded.value.skill.install.length,
      path: entry.file,
      source: entry.source,
    });
  }

  skills.sort((a, b) => a.id.localeCompare(b.id));
  return { skills, errors };
}

export interface SaveSkillResult {
  path: string;
}

export function saveSkill(
  skill: Skill,
  body: string,
  opts: { force?: boolean; cwd?: string } = {},
): Result<SaveSkillResult> {
  const validated = SkillSchema.safeParse(skill);
  if (!validated.success) {
    const issues = validated.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return fail("SKILL_INVALID", `Refusing to write an invalid skill:\n${issues}`);
  }

  const dir = userSkillsDir(opts.cwd);
  const file = path.join(dir, `${validated.data.id}.md`);

  if (!opts.force && fs.existsSync(file)) {
    return fail(
      "SKILL_EXISTS",
      `A skill named "${validated.data.id}" already exists at ${file}.`,
      "Pass --force to overwrite it, or choose a different --id.",
    );
  }

  const frontmatter = stringifyYaml(validated.data).trimEnd();
  const contents = `---\n${frontmatter}\n---\n\n${body.trim()}\n`;

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, contents, "utf8");
  } catch (cause) {
    return fail("SKILL_WRITE_ERROR", `Could not write ${file}: ${String(cause)}`);
  }

  return ok({ path: file });
}

export interface SkillPlanStep {
  type: "run" | "slash" | "note";
  value: string;
}

export interface SkillPlan {
  id: string;
  url?: string;
  bts_source?: string;
  agents?: string[];
  /** Ordered install recipe: `run` in the shell, `slash` in the agent, `note` manual. */
  steps: SkillPlanStep[];
  /**
   * - `agent_install`: run the steps in order (show the user before untrusted commands).
   * - `via_better_t_stack`: no steps; encode `bts_source` in the template skills addon.
   * - `none`: nothing to install (reference-only).
   * - `error`: the skill could not be loaded.
   */
  action: "via_better_t_stack" | "agent_install" | "none" | "error";
  message?: string;
}

/** Resolve a linked skill into an ordered install plan for the agent (no execution). */
export function planSkill(id: string, opts: { packageManager?: string; cwd?: string } = {}): SkillPlan {
  const loaded = loadSkill(id, opts.cwd);
  if (!loaded.ok) return { id, steps: [], action: "error", message: loaded.error.message };

  const s = loaded.value.skill;
  const steps = s.install
    .map(stepKind)
    .map((step) => ({ ...step, value: substituteRunner(step.value, opts.packageManager) }));
  const base = {
    id,
    url: s.url || undefined,
    bts_source: s.bts_source || undefined,
    agents: s.agents,
    steps,
  };

  if (steps.length > 0) {
    return {
      ...base,
      action: "agent_install",
      message:
        "Run these steps in order: `run` steps in the shell, `slash` steps in the agent/harness. Show the user before executing untrusted commands.",
    };
  }
  if (s.bts_source) {
    return {
      ...base,
      action: "via_better_t_stack",
      message: `Encode "${s.bts_source}" in the template's better-t-stack skills addon; it installs at scaffold.`,
    };
  }
  return { ...base, action: "none" };
}
