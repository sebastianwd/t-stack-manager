import fs from "node:fs";
import path from "node:path";
import { skillBundleDir } from "./paths.js";
import { fail, ok, type Result } from "./result.js";

function copyTree(src: string, dest: string): number {
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyTree(from, to);
    } else {
      fs.copyFileSync(from, to);
      count += 1;
    }
  }
  return count;
}

/**
 * Deploy the built skill bundle into an agent's skills dir (Claude Code).
 * `base` is the dir that holds `.claude/` (the home dir for a global install, or
 * a project root for a project-scoped install). Idempotent: overwrites in place.
 */
export function installSkillBundle(opts: {
  base: string;
  srcDir?: string;
}): Result<{ dest: string; files: number }> {
  const src = opts.srcDir ?? skillBundleDir();
  if (!fs.existsSync(src)) {
    return fail(
      "BUNDLE_MISSING",
      `Skill bundle not found at ${src}.`,
      "Reinstall t-stack-manager, or run `pnpm build` in a dev checkout.",
    );
  }
  const dest = path.join(opts.base, ".claude", "skills", "t-stack-manager");
  const files = copyTree(src, dest);
  return ok({ dest, files });
}
