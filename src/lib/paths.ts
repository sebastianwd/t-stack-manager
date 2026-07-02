import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Repo/package root, resolved relative to this module.
 * In dev (tsx) this file is src/lib/paths.ts, in the build it is bundled into
 * dist/cli/bin.js. Both resolve two levels up to the package root.
 */
export function packageRoot(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

/** Templates that ship inside the package (the seed defaults). */
export function bundledTemplatesDir(): string {
  return path.join(packageRoot(), "defaults", "templates");
}

/**
 * User/project storage root. Resolution order:
 *   1. STACKSMITH_HOME env var (absolute or relative to cwd)
 *   2. nearest ./.stacksmith walking up from cwd (project-scoped)
 *   3. ~/.stacksmith (user-scoped default)
 */
export function resolveStorageDir(cwd: string = process.cwd()): string {
  const envHome = process.env.STACKSMITH_HOME;
  if (envHome && envHome.trim().length > 0) {
    return path.resolve(cwd, envHome);
  }

  let dir = path.resolve(cwd);
  for (;;) {
    const candidate = path.join(dir, ".stacksmith");
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.join(os.homedir(), ".stacksmith");
}

export function userTemplatesDir(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "templates");
}

/** Modifications that ship inside the package. */
export function bundledModificationsDir(): string {
  return path.join(packageRoot(), "defaults", "modifications");
}

export function userModificationsDir(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "modifications");
}

/** Libraries that ship inside the package. */
export function bundledLibrariesDir(): string {
  return path.join(packageRoot(), "defaults", "libraries");
}

export function userLibrariesDir(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "libraries");
}

/** Skills that ship inside the package. */
export function bundledSkillsDir(): string {
  return path.join(packageRoot(), "defaults", "skills");
}

export function userSkillsDir(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "skills");
}

export function logDir(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "log");
}

export function configFile(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "config.json");
}
