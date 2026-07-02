import { listSkills, saveSkill } from "../lib/skills.js";
import { installSkill } from "../lib/skill-install.js";
import { emitError, emitJson } from "../lib/output.js";
import { type Skill, type SkillStep, SkillStepSchema } from "../schemas/skill.js";
import { z } from "zod";

export interface SkillsArgs {
  sub: string;
  id?: string;
  install?: string;
  url?: string;
  btsSource?: string;
  agents?: string;
  category?: string;
  description?: string;
  license?: string;
  note?: string;
  target?: string;
  packageManager?: string;
  yes?: boolean;
  force: boolean;
  json: boolean;
}

const splitCsv = (v?: string): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export async function runSkills(args: SkillsArgs): Promise<number> {
  switch (args.sub) {
    case "list":
      return listCmd(args);
    case "add":
      return addCmd(args);
    case "install":
      return installCmd(args);
    default:
      emitError(args.json, {
        code: "UNKNOWN_SUBCOMMAND",
        message: `Unknown subcommand: skills ${args.sub}`,
        hint: "Use list, add, or install.",
      });
      return 1;
  }
}

function listCmd(args: SkillsArgs): number {
  const { skills, errors } = listSkills({ category: args.category });
  if (args.json) {
    emitJson({ ok: true, skills, errors });
  } else if (skills.length === 0) {
    process.stderr.write("No skills saved.\n");
  } else {
    for (const s of skills) {
      process.stderr.write(`${s.id} [${s.category}] ${s.install_steps} step(s) - ${s.description}\n`);
    }
  }
  return 0;
}

function addCmd(args: SkillsArgs): number {
  if (!args.id) {
    emitError(args.json, { code: "MISSING_ID", message: "--id is required." });
    return 1;
  }

  // --install is a JSON array of ordered steps: [{"run":"..."},{"slash":"..."},{"note":"..."}]
  let install: SkillStep[] = [];
  if (args.install) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(args.install);
    } catch (cause) {
      emitError(args.json, {
        code: "BAD_INSTALL_JSON",
        message: `--install is not valid JSON: ${String(cause)}`,
        hint: 'Pass an array of steps, e.g. --install=\'[{"run":"npx impeccable install"}]\'.',
      });
      return 1;
    }
    const v = z.array(SkillStepSchema).safeParse(parsed);
    if (!v.success) {
      emitError(args.json, {
        code: "BAD_INSTALL",
        message: "--install steps are invalid.",
        hint: 'Each step must be exactly one of {"run":"..."}, {"slash":"..."}, {"note":"..."}.',
      });
      return 1;
    }
    install = v.data;
  }

  const agents = splitCsv(args.agents);
  const skill: Skill = {
    id: args.id,
    description: args.description ?? "",
    category: args.category ?? "",
    url: args.url ?? "",
    bts_source: args.btsSource ?? "",
    agents: agents.length > 0 ? agents : ["claude-code"],
    install,
    license: args.license ?? "",
  };

  const body = args.note ?? `# ${args.id}\n\nWhat this skill teaches and when to install it.`;

  const saved = saveSkill(skill, body, { force: args.force });
  if (!saved.ok) {
    emitError(args.json, saved.error);
    return 1;
  }

  if (args.json) {
    emitJson({ ok: true, id: args.id, path: saved.value.path, install_steps: install.length });
  } else {
    process.stderr.write(`Saved skill "${args.id}" (${install.length} install step(s))\n`);
  }
  return 0;
}

async function installCmd(args: SkillsArgs): Promise<number> {
  if (!args.id) {
    emitError(args.json, { code: "MISSING_ID", message: "--id is required." });
    return 1;
  }

  const result = await installSkill(args.id, {
    targetDir: args.target,
    execute: args.yes,
    packageManager: args.packageManager,
  });
  if (result.status === "error") {
    emitError(args.json, { code: "SKILL_INSTALL_ERROR", message: result.message ?? `Could not install "${args.id}".` });
    return 1;
  }

  if (args.json) {
    emitJson({ ok: result.status !== "failed", ...result });
  } else {
    process.stderr.write(`skill ${result.id}: ${result.status}${result.message ? ` (${result.message})` : ""}\n`);
    for (const s of result.steps) {
      process.stderr.write(`  [${s.type}] ${s.status}: ${s.value}${s.message ? ` (${s.message})` : ""}\n`);
    }
    if (result.status === "needs_consent") {
      process.stderr.write("Re-run with --yes to execute the shell steps (after reviewing them).\n");
    }
  }
  return result.status === "failed" ? 1 : 0;
}
