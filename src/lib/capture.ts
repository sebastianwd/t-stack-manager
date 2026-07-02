import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { fail, ok, type Result } from "./result.js";

export interface CaptureResult {
  /** Unified diff of the working tree against the scaffold's initial commit. */
  diff: string;
  /** The baseline (root) commit the diff is relative to. */
  baseline: string;
  /** Project name of the source (package.json name, else dir basename), for name-agnostic apply. */
  projectName: string;
}

/**
 * Noise we never want in a captured modification: lockfiles regenerate on every
 * install and must never be patched. Both root and nested (monorepo) paths.
 * node_modules is gitignored, so it never reaches the diff.
 */
const EXCLUDES = [
  ":(exclude)pnpm-lock.yaml",
  ":(exclude)**/pnpm-lock.yaml",
  ":(exclude)package-lock.json",
  ":(exclude)**/package-lock.json",
  ":(exclude)yarn.lock",
  ":(exclude)**/yarn.lock",
  ":(exclude)bun.lock",
  ":(exclude)**/bun.lock",
  ":(exclude)bun.lockb",
  ":(exclude)**/bun.lockb",
];

/** The project's name: package.json `name`, falling back to the directory basename. */
export function readProjectName(dir: string): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as {
      name?: unknown;
    };
    if (typeof pkg.name === "string" && pkg.name.trim()) return pkg.name.trim();
  } catch {
    // no/invalid package.json; fall back to the directory name
  }
  return path.basename(path.resolve(dir));
}

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execa("git", ["-C", cwd, ...args]);
  return result.stdout;
}

/**
 * Capture a scaffolded project's hand-made changes as a unified diff, relative
 * to its initial (root) commit. `scaffold` runs `git init` + an initial commit,
 * so that root commit is the pristine template output.
 *
 * Non-destructive to the working tree: it stages everything to read the diff,
 * then resets the index back. New (untracked) files are included.
 */
export async function captureProjectDiff(projectDir: string): Promise<Result<CaptureResult>> {
  let baseline: string;
  try {
    const roots = await git(projectDir, ["rev-list", "--max-parents=0", "HEAD"]);
    const root = roots
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .pop();
    if (!root) {
      return fail(
        "CAPTURE_NO_BASELINE",
        `No commits found in ${projectDir}.`,
        "Stacksmith scaffolds with git enabled; the initial commit is the baseline a modification is diffed against.",
      );
    }
    baseline = root;
  } catch (cause) {
    return fail(
      "CAPTURE_NO_GIT",
      `${projectDir} is not a git repository (or git is unavailable): ${String(cause)}`,
      "Modifications are captured by diffing against the scaffold's initial git commit.",
    );
  }

  try {
    await git(projectDir, ["add", "-A"]);
    const diff = await git(projectDir, ["diff", "--cached", baseline, "--", ".", ...EXCLUDES]);
    await git(projectDir, ["reset", "-q"]);
    if (!diff.trim()) {
      return fail(
        "CAPTURE_EMPTY",
        "No changes found between the project and its initial commit.",
        "Modify the scaffolded project first, then save.",
      );
    }
    return ok({ diff, baseline, projectName: readProjectName(projectDir) });
  } catch (cause) {
    try {
      await git(projectDir, ["reset", "-q"]);
    } catch {
      // best effort; leave the index as-is
    }
    return fail("CAPTURE_FAILED", `Could not capture the diff: ${String(cause)}`);
  }
}
