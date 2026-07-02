import os from "node:os";
import path from "node:path";
import { emitError, emitJson } from "../lib/output.js";
import { installSkillBundle } from "../lib/self-install.js";

export interface InstallArgs {
  /** undefined = global (~/.claude); "" or a path = project-scoped at that dir. */
  project?: string;
  json: boolean;
}

/** `t-stack-manager install`: deploy the skill into Claude Code (global or project). */
export function runInstall(args: InstallArgs): number {
  const isProject = args.project !== undefined;
  const base = isProject ? path.resolve(args.project || ".") : os.homedir();
  const scope = isProject ? "project" : "global";

  const result = installSkillBundle({ base });
  if (!result.ok) {
    emitError(args.json, result.error);
    return 1;
  }

  if (args.json) {
    emitJson({ ok: true, scope, dest: result.value.dest, files: result.value.files });
  } else {
    process.stderr.write(
      `Installed the t-stack-manager skill (${scope}) to ${result.value.dest} (${result.value.files} files).\n` +
        "Reload your agent to pick it up.\n",
    );
  }
  return 0;
}
