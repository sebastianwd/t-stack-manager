import path from "node:path";
import { type ApplyResult, applyModification } from "../lib/apply.js";
import { type BTStackAdapter, SpawnBTStackAdapter } from "../lib/better-t.js";
import { type LibraryInjectResult, injectLibrary } from "../lib/install.js";
import { emitError, emitJson } from "../lib/output.js";
import { type SkillPlan, planSkill } from "../lib/skills.js";
import { loadTemplate } from "../lib/storage.js";

export interface ScaffoldArgs {
  template: string;
  target: string;
  name?: string;
  dryRun: boolean;
  json: boolean;
}

export async function runScaffold(
  args: ScaffoldArgs,
  adapter: BTStackAdapter = new SpawnBTStackAdapter(),
): Promise<number> {
  if (!args.template) {
    emitError(args.json, { code: "MISSING_TEMPLATE", message: "--template is required." });
    return 1;
  }
  if (!args.target) {
    emitError(args.json, { code: "MISSING_TARGET", message: "--target is required." });
    return 1;
  }

  const loaded = loadTemplate(args.template);
  if (!loaded.ok) {
    emitError(args.json, loaded.error);
    return 1;
  }

  const targetDir = path.resolve(args.target);
  const version = loaded.value.template["better-t-stack-version"];

  const result = await adapter.scaffold({
    flags: loaded.value.template.flags,
    targetDir,
    projectName: args.name,
    betterTStackVersion: version,
    dryRun: args.dryRun,
  });

  if (!result.ok) {
    emitError(args.json, result.error);
    return 1;
  }

  // Post-scaffold steps, skipped on a dry run (nothing was written). Neither a
  // mod nor a library that needs agent attention fails the scaffold; both are
  // surfaced in the JSON for the agent to finish.
  const appliedMods: ApplyResult[] = [];
  const injectedLibs: LibraryInjectResult[] = [];
  const skillPlans: SkillPlan[] = [];
  if (!args.dryRun) {
    for (const id of loaded.value.template.default_modifications) {
      appliedMods.push(await applyModification(id, result.value.projectDir));
    }
    const pm =
      typeof loaded.value.template.flags.packageManager === "string"
        ? loaded.value.template.flags.packageManager
        : "pnpm";
    for (const id of loaded.value.template.default_libraries) {
      injectedLibs.push(await injectLibrary(id, result.value.projectDir, pm));
    }
    // Skills are resolved into plans for the agent (install is agent-specific);
    // `bts` skills are handled by better-t-stack via the template flags.
    for (const id of loaded.value.template.default_skills) {
      skillPlans.push(planSkill(id, { packageManager: pm }));
    }
  }

  if (args.json) {
    emitJson({
      ok: true,
      template: loaded.value.template.name,
      target: result.value.projectDir,
      better_t_stack_version: version,
      dry_run: args.dryRun,
      reproducible_command: result.value.reproducibleCommand,
      elapsed_ms: result.value.elapsedMs,
      modifications: appliedMods,
      libraries: injectedLibs,
      skills: skillPlans,
    });
  } else {
    const verb = args.dryRun ? "Validated" : "Scaffolded";
    process.stderr.write(`${verb} ${loaded.value.template.name} at ${result.value.projectDir}\n`);
    for (const m of appliedMods) {
      process.stderr.write(`  mod ${m.id}: ${m.status}${m.message ? ` (${m.message})` : ""}\n`);
    }
    for (const l of injectedLibs) {
      process.stderr.write(`  lib ${l.id}: ${l.status}${l.message ? ` (${l.message})` : ""}\n`);
    }
    for (const s of skillPlans) {
      process.stderr.write(`  skill ${s.id}: ${s.action}${s.message ? ` (${s.message})` : ""}\n`);
    }
  }
  return 0;
}
