import { DEFAULT_BETTER_T_STACK_VERSION } from "../lib/better-t.js";
import { emitError, emitJson } from "../lib/output.js";
import { parseBetterTCommand } from "../lib/parse-command.js";
import { saveTemplate } from "../lib/storage.js";
import type { Template } from "../schemas/template.js";

export interface InitArgs {
  name: string;
  fromCommand: string;
  description?: string;
  force: boolean;
  json: boolean;
}

/**
 * `stacksmith init` - author a template from a pasted better-t-stack command.
 *
 * Parses the command (or its create-json form), validates the flags, and writes
 * a template markdown file to user storage. Does NOT scaffold; `scaffold` runs it.
 */
export function runInit(args: InitArgs): number {
  if (!args.name) {
    emitError(args.json, { code: "MISSING_NAME", message: "--name is required." });
    return 1;
  }
  if (!args.fromCommand) {
    emitError(args.json, {
      code: "MISSING_COMMAND",
      message: "--from-command is required.",
      hint: 'Paste a better-t-stack command, e.g. --from-command "npx create-better-t-stack@3.30.3 my-app --frontend tanstack-start ...".',
    });
    return 1;
  }

  const parsed = parseBetterTCommand(args.fromCommand);
  if (!parsed.ok) {
    emitError(args.json, parsed.error);
    return 1;
  }

  const version = parsed.value.version ?? DEFAULT_BETTER_T_STACK_VERSION;

  const template: Template = {
    name: args.name,
    description: args.description ?? "",
    "better-t-stack-version": version,
    flags: parsed.value.flags,
    default_libraries: [],
    default_modifications: [],
    default_skills: [],
  };

  const body = `# ${args.name}

Authored by \`stacksmith init\` from a pasted better-t-stack command. Add notes
here: why this combo, gotchas, deploy steps.`;

  const saved = saveTemplate(template, body, { force: args.force });
  if (!saved.ok) {
    emitError(args.json, saved.error);
    return 1;
  }

  if (args.json) {
    emitJson({
      ok: true,
      name: args.name,
      path: saved.value.path,
      better_t_stack_version: version,
      version_source: parsed.value.version ? "command" : "default",
      flags: template.flags,
    });
  } else {
    process.stderr.write(`Saved template "${args.name}" to ${saved.value.path}\n`);
  }
  return 0;
}
