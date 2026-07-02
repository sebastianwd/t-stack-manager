import path from "node:path";
import { applyModification } from "../lib/apply.js";
import { captureProjectDiff } from "../lib/capture.js";
import {
  listModifications,
  loadModification,
  patchBody,
  saveModification,
} from "../lib/modifications.js";
import { emitError, emitJson } from "../lib/output.js";
import { loadTemplate, saveTemplate } from "../lib/storage.js";
import type { Modification } from "../schemas/modification.js";
import type { Template } from "../schemas/template.js";

export interface ModificationsArgs {
  sub: string;
  id?: string;
  fromProject?: string;
  template?: string;
  asTemplate?: string;
  description?: string;
  target?: string;
  force: boolean;
  json: boolean;
}

export async function runModifications(args: ModificationsArgs): Promise<number> {
  switch (args.sub) {
    case "list":
      return listCmd(args);
    case "add":
      return addCmd(args);
    case "apply":
      return applyCmd(args);
    default:
      emitError(args.json, {
        code: "UNKNOWN_SUBCOMMAND",
        message: `Unknown subcommand: modifications ${args.sub}`,
        hint: "Use list, add, or apply.",
      });
      return 1;
  }
}

function listCmd(args: ModificationsArgs): number {
  const { modifications, errors } = listModifications();
  if (args.json) {
    emitJson({ ok: true, modifications, errors });
  } else if (modifications.length === 0) {
    process.stderr.write("No modifications saved.\n");
  } else {
    for (const m of modifications) {
      process.stderr.write(`${m.id} [${m.kind}] ${m.description}\n`);
    }
  }
  return 0;
}

async function addCmd(args: ModificationsArgs): Promise<number> {
  if (!args.id) {
    emitError(args.json, { code: "MISSING_ID", message: "--id is required." });
    return 1;
  }
  if (!args.fromProject) {
    emitError(args.json, {
      code: "MISSING_SOURCE",
      message: "--from-project=<path> is required.",
      hint: "Point at the scaffolded project whose changes you want to save. (Hand-author script/instructions mods directly as markdown.)",
    });
    return 1;
  }

  const projectDir = path.resolve(args.fromProject);
  const captured = await captureProjectDiff(projectDir);
  if (!captured.ok) {
    emitError(args.json, captured.error);
    return 1;
  }

  const mod: Modification = {
    id: args.id,
    description: args.description ?? "",
    kind: "patch",
    applies_to: args.template ? [args.template] : [],
    idempotent: false,
    source_project_name: captured.value.projectName,
    version: "1",
    license: "",
  };
  const note = `Captured by \`t-stack-manager modifications add\` from a modified scaffold${
    args.template ? ` (base template: ${args.template})` : ""
  }. Applies cleanly to its own template; on a different template, apply the diff as intent (the agent adapts paths/structure).`;

  const saved = saveModification(mod, patchBody(captured.value.diff, note), { force: args.force });
  if (!saved.ok) {
    emitError(args.json, saved.error);
    return 1;
  }

  // Optional (b): a named bundle = base template's flags + this mod linked.
  let bundlePath: string | undefined;
  if (args.asTemplate) {
    if (!args.template) {
      emitError(args.json, {
        code: "MISSING_TEMPLATE",
        message: "--as-template requires --template (the base template to clone flags from).",
      });
      return 1;
    }
    const base = loadTemplate(args.template);
    if (!base.ok) {
      emitError(args.json, base.error);
      return 1;
    }
    const bundle: Template = {
      name: args.asTemplate,
      description: args.description || `${args.template} + ${args.id}`,
      "better-t-stack-version": base.value.template["better-t-stack-version"],
      flags: base.value.template.flags,
      default_libraries: base.value.template.default_libraries,
      default_modifications: [
        ...new Set([...base.value.template.default_modifications, args.id]),
      ],
      default_skills: base.value.template.default_skills,
    };
    // A bundle must not reference a modification that does not resolve (the new
    // mod plus any the base template already links). Otherwise scaffold would
    // fail later when it tries to apply a missing mod.
    const missing = bundle.default_modifications.filter((mid) => !loadModification(mid).ok);
    if (missing.length > 0) {
      emitError(args.json, {
        code: "BUNDLE_UNRESOLVED_MODS",
        message: `Bundle "${args.asTemplate}" links modifications that do not resolve: ${missing.join(", ")}.`,
        hint: "Save those modifications first, or remove them from the base template's default_modifications.",
      });
      return 1;
    }

    const body = `# ${args.asTemplate}\n\n\`${args.template}\` with the \`${args.id}\` modification linked. Created by \`t-stack-manager modifications add --as-template\`.`;
    const savedBundle = saveTemplate(bundle, body, { force: args.force });
    if (!savedBundle.ok) {
      emitError(args.json, savedBundle.error);
      return 1;
    }
    bundlePath = savedBundle.value.path;
  }

  if (args.json) {
    emitJson({
      ok: true,
      id: args.id,
      path: saved.value.path,
      kind: "patch",
      baseline: captured.value.baseline,
      bundle: bundlePath ?? null,
    });
  } else {
    process.stderr.write(
      `Saved modification "${args.id}"${bundlePath ? ` and bundle "${args.asTemplate}"` : ""}\n`,
    );
  }
  return 0;
}

async function applyCmd(args: ModificationsArgs): Promise<number> {
  if (!args.id || !args.target) {
    emitError(args.json, { code: "MISSING_ARGS", message: "--id and --target are required." });
    return 1;
  }

  const result = await applyModification(args.id, args.target);

  // Auto-applied cleanly.
  if (result.status === "patched" || result.status === "script_ran") {
    if (args.json) emitJson({ ok: true, id: result.id, kind: result.kind, action: result.status });
    else process.stderr.write(`Applied "${result.id}" (${result.status}) to ${path.resolve(args.target)}\n`);
    return 0;
  }

  // Instructions: the agent follows the steps. Expected, not a failure.
  if (result.status === "agent_apply" && result.steps !== undefined) {
    if (args.json) emitJson({ ok: true, id: result.id, kind: result.kind, action: "agent_apply", steps: result.steps });
    else process.stderr.write(`${result.steps}\n`);
    return 0;
  }

  // Patch did not apply cleanly: surface the raw diff for the agent to adapt.
  if (result.status === "agent_apply" && result.diff !== undefined) {
    const message = `Patch "${result.id}" did not apply cleanly to ${path.resolve(args.target)}. ${result.message ?? ""}`.trim();
    const hint =
      "Apply the diff as intent: adapt paths/structure to this project. The raw diff is in the action payload and the modification file.";
    if (args.json) {
      emitJson({
        ok: false,
        error: { code: "APPLY_PATCH_FAILED", message, hint },
        id: result.id,
        kind: result.kind,
        action: "agent_apply",
        diff: result.diff,
      });
    } else {
      process.stderr.write(`Error [APPLY_PATCH_FAILED]: ${message}\nHint: ${hint}\n\n${result.diff}\n`);
    }
    return 1;
  }

  // status === "error"
  emitError(args.json, {
    code: "APPLY_FAILED",
    message: result.message ?? `Could not apply "${result.id}".`,
  });
  return 1;
}
