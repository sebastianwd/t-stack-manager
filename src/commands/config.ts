import path from "node:path";
import { clearDefaultTargetDir, getDefaultTargetDir, setDefaultTargetDir } from "../lib/config.js";
import { emitError, emitJson } from "../lib/output.js";

export interface ConfigArgs {
  /** undefined | "get" | "set" | "unset" (defaults to "get"). */
  sub?: string;
  defaultTargetDir?: string;
  json: boolean;
}

/** `t-stack-manager config`: read/set user preferences (currently the default target dir). */
export function runConfig(args: ConfigArgs): number {
  const sub = args.sub ?? "get";

  switch (sub) {
    case "get": {
      const defaultTargetDir = getDefaultTargetDir() ?? null;
      if (args.json) emitJson({ ok: true, defaultTargetDir });
      else process.stderr.write(`defaultTargetDir=${defaultTargetDir ?? "(unset)"}\n`);
      return 0;
    }

    case "set": {
      if (!args.defaultTargetDir) {
        emitError(args.json, {
          code: "MISSING_ARGS",
          message: "Usage: t-stack-manager config set --default-target-dir=<path>",
        });
        return 1;
      }
      const resolved = path.resolve(args.defaultTargetDir);
      setDefaultTargetDir(resolved);
      if (args.json) emitJson({ ok: true, defaultTargetDir: resolved });
      else process.stderr.write(`Set defaultTargetDir=${resolved}\n`);
      return 0;
    }

    case "unset": {
      clearDefaultTargetDir();
      if (args.json) emitJson({ ok: true, defaultTargetDir: null });
      else process.stderr.write("Cleared defaultTargetDir.\n");
      return 0;
    }

    default: {
      emitError(args.json, {
        code: "UNKNOWN_SUBCOMMAND",
        message: `Unknown: config ${sub}`,
        hint: "Use: config get | config set --default-target-dir=<path> | config unset.",
      });
      return 1;
    }
  }
}
