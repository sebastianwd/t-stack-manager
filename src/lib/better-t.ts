import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { TemplateFlags } from "../schemas/template.js";
import { fail, ok, type Result } from "./result.js";

/**
 * Fallback better-t-stack version, used when a parsed command pins no explicit
 * `@<version>` (or pins `@latest`/`@next`). Keep in lockstep with the
 * `@better-t-stack/types` dependency in package.json.
 */
export const DEFAULT_BETTER_T_STACK_VERSION = "3.30.3";

export interface ScaffoldOptions {
  /** Validated template flags (the better-t-stack create input, minus projectName). */
  flags: TemplateFlags;
  /** Absolute path to the project directory to create. */
  targetDir: string;
  /** Project name; defaults to basename(targetDir) when omitted. */
  projectName?: string;
  /** better-t-stack version to pin via npx. */
  betterTStackVersion: string;
  /** When true, validate without writing files. */
  dryRun?: boolean;
}

export interface ScaffoldSuccess {
  projectDir: string;
  reproducibleCommand: string;
  elapsedMs: number;
  raw: unknown;
}

/**
 * Adapter over better-t-stack. Phase 1 shells out to the `create-json`
 * subcommand (the agent-friendly entry point). Swappable for the
 * `@better-t-stack/template-generator` library later without touching callers.
 */
export interface BTStackAdapter {
  scaffold(opts: ScaffoldOptions): Promise<Result<ScaffoldSuccess>>;
}

/** Pull the last top-level JSON object out of mixed stdout. */
function extractJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.lastIndexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("could not parse JSON from create-better-t-stack output");
  }
}

export class SpawnBTStackAdapter implements BTStackAdapter {
  async scaffold(opts: ScaffoldOptions): Promise<Result<ScaffoldSuccess>> {
    const cwd = path.dirname(opts.targetDir);
    const projectName = opts.projectName ?? path.basename(opts.targetDir);

    // better-t-stack runs in the parent of the target and creates the project
    // dir itself. Ensure the parent exists, or the spawn fails with ENOENT on cwd.
    try {
      fs.mkdirSync(cwd, { recursive: true });
    } catch (cause) {
      return fail(
        "BTSTACK_BAD_TARGET",
        `Could not create the target's parent directory ${cwd}: ${String(cause)}`,
        "Check that --target points at a writable path.",
      );
    }

    // T Stack Manager owns these fields; never let a template smuggle them in.
    const input: Record<string, unknown> = { ...opts.flags };
    delete input.yes;
    delete input.yolo;
    input.projectName = projectName;
    input.dryRun = opts.dryRun ?? false;

    const pkg = `create-better-t-stack@${opts.betterTStackVersion}`;
    const started = Date.now();

    let stdout: string;
    try {
      const result = await execa(
        "npx",
        ["--yes", pkg, "create-json", "--input", JSON.stringify(input)],
        {
          cwd,
          // stream progress to the user, capture structured output
          stdio: ["inherit", "pipe", "inherit"],
        },
      );
      stdout = result.stdout;
    } catch (cause) {
      return fail(
        "BTSTACK_SPAWN_FAILED",
        `create-better-t-stack exited with an error: ${String(cause)}`,
        "Check the better-t-stack output above for the underlying cause.",
      );
    }

    let parsed: { success?: boolean; projectDir?: string; reproducibleCommand?: string };
    try {
      parsed = extractJson(stdout) as typeof parsed;
    } catch (cause) {
      return fail("BTSTACK_BAD_OUTPUT", `Could not parse better-t-stack output: ${String(cause)}`);
    }

    if (parsed.success !== true) {
      return fail("BTSTACK_REPORTED_FAILURE", "better-t-stack reported success=false.");
    }

    return ok({
      projectDir: parsed.projectDir ?? path.join(cwd, projectName),
      reproducibleCommand: parsed.reproducibleCommand ?? "",
      elapsedMs: Date.now() - started,
      raw: parsed,
    });
  }
}
