import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import { resolveFreshVersion } from "./freshness.js";
import { loadLibrary } from "./libraries.js";

export interface ResolvedPkg {
  package: string;
  /** Fresh, policy-compliant version, or null if it could not be resolved. */
  version: string | null;
}

export interface LibraryInjectResult {
  id: string;
  /**
   * - `installed`: deps added to the project automatically.
   * - `agent_install`: the agent must run it (monorepo, or a version could not be
   *   resolved, or the install failed). `command` holds the resolved plan.
   * - `error`: the library could not be loaded.
   */
  status: "installed" | "agent_install" | "error";
  packages: ResolvedPkg[];
  command?: string;
  message?: string;
}

/** A pnpm/npm/bun workspace root: deps belong in a specific workspace, not here. */
function isMonorepo(projectDir: string): boolean {
  if (fs.existsSync(path.join(projectDir, "pnpm-workspace.yaml"))) return true;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf8")) as {
      workspaces?: unknown;
    };
    return pkg.workspaces !== undefined;
  } catch {
    return false;
  }
}

/** Build the install command for the project's package manager. */
export function addCommand(packageManager: string, specs: string[]): { bin: string; args: string[] } {
  if (packageManager === "npm") return { bin: "npm", args: ["install", ...specs] };
  if (packageManager === "bun") return { bin: "bun", args: ["add", ...specs] };
  return { bin: "pnpm", args: ["add", ...specs] }; // pnpm is the default
}

/**
 * Inject a catalogue library into a scaffolded project: resolve a fresh version
 * for the package and its peer deps, then install. Falls back to a structured
 * `agent_install` plan when it is unsafe to auto-install (monorepo, unresolved
 * version, or a failed install), mirroring the modification apply fallback.
 */
export async function injectLibrary(
  libId: string,
  projectDir: string,
  packageManager: string,
  opts: { now?: number; cwd?: string } = {},
): Promise<LibraryInjectResult> {
  const loaded = loadLibrary(libId, opts.cwd);
  if (!loaded.ok) return { id: libId, status: "error", packages: [], message: loaded.error.message };

  const names = [loaded.value.library.package, ...loaded.value.library.peer_deps];
  const now = opts.now ?? Date.now();
  const packages: ResolvedPkg[] = [];
  for (const name of names) {
    const r = await resolveFreshVersion(name, now);
    packages.push({ package: name, version: r.ok ? r.value.version : null });
  }

  const specs = packages
    .filter((p): p is ResolvedPkg & { version: string } => p.version !== null)
    .map((p) => `${p.package}@${p.version}`);
  const { bin, args } = addCommand(packageManager, specs);
  const command = `${bin} ${args.join(" ")}`;

  const unresolved = packages.filter((p) => p.version === null).map((p) => p.package);
  if (unresolved.length > 0) {
    return {
      id: libId,
      status: "agent_install",
      packages,
      command,
      message: `No policy-compliant version for: ${unresolved.join(", ")}. Resolve and install manually rather than pinning a too-recent release.`,
    };
  }

  if (isMonorepo(projectDir)) {
    return {
      id: libId,
      status: "agent_install",
      packages,
      command,
      message: "Monorepo detected; install into the correct workspace rather than the root.",
    };
  }

  try {
    await execa(bin, args, { cwd: projectDir, stdio: ["inherit", "inherit", "inherit"] });
    return { id: libId, status: "installed", packages, command };
  } catch (cause) {
    return {
      id: libId,
      status: "agent_install",
      packages,
      command,
      message: `Install failed: ${String(cause)}`,
    };
  }
}
