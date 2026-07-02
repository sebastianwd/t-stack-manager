import fs from "node:fs";
import path from "node:path";

// Matches better-t-stack's supported package managers (no yarn).
export type PackageManager = "npm" | "pnpm" | "bun";

const KNOWN: readonly PackageManager[] = ["npm", "pnpm", "bun"];

/** The ephemeral package runner (`{{dlx}}`) per package manager. */
const DLX: Record<PackageManager, string> = {
  npm: "npx",
  pnpm: "pnpm dlx",
  bun: "bunx",
};

function coerce(pm: string | undefined): PackageManager {
  return pm && (KNOWN as readonly string[]).includes(pm) ? (pm as PackageManager) : "npm";
}

/**
 * Detect a project's package manager: `packageManager` in package.json first,
 * then the lockfile, else npm.
 */
export function detectPackageManager(dir: string): PackageManager {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as {
      packageManager?: string;
    };
    const name = pkg.packageManager?.split("@")[0];
    if (name && (KNOWN as readonly string[]).includes(name)) return name as PackageManager;
  } catch {
    // no/invalid package.json; fall through to lockfiles
  }
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "bun.lockb")) || fs.existsSync(path.join(dir, "bun.lock"))) {
    return "bun";
  }
  if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm";
  return "npm";
}

/**
 * Substitute runner placeholders in a command so a portable skill recipe adapts
 * to the project's package manager:
 *   {{dlx}} -> npx | pnpm dlx | bunx
 *   {{pm}}  -> npm | pnpm | bun
 */
export function substituteRunner(command: string, packageManager: string | undefined): string {
  const pm = coerce(packageManager);
  return command.replace(/\{\{dlx\}\}/g, DLX[pm]).replace(/\{\{pm\}\}/g, pm);
}
