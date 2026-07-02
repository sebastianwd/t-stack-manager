import path from "node:path";
import { appendScaffoldLog } from "../lib/log-writer.js";
import { emitError, emitJson } from "../lib/output.js";
import { loadTemplate } from "../lib/storage.js";
import type { ScaffoldLogEntry } from "../types.js";

export interface LogArgs {
  template: string;
  target: string;
  version?: string;
  ok: boolean;
  json: boolean;
}

export function runLog(args: LogArgs): number {
  if (!args.template || !args.target) {
    emitError(args.json, {
      code: "MISSING_ARGS",
      message: "--template and --target are required.",
    });
    return 1;
  }

  // Resolve the version from the template when not supplied explicitly.
  let version = args.version ?? "";
  if (!version) {
    const loaded = loadTemplate(args.template);
    if (loaded.ok) version = loaded.value.template["better-t-stack-version"];
  }

  const entry: ScaffoldLogEntry = {
    timestamp: new Date().toISOString(),
    template: args.template,
    target: path.resolve(args.target),
    better_t_stack_version: version,
    ok: args.ok,
  };

  const file = appendScaffoldLog(entry);

  if (args.json) {
    emitJson({ ok: true, file, entry });
  } else {
    process.stderr.write(`Logged scaffold to ${file}\n`);
  }
  return 0;
}
