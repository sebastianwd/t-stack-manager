import fs from "node:fs";
import path from "node:path";
import { configFile } from "./paths.js";

interface Config {
  /** Whether first-run seeding has been handled (installed or explicitly skipped). */
  seeded?: boolean;
  defaultTargetDir?: string;
}

export function readConfig(cwd?: string): Config {
  try {
    return JSON.parse(fs.readFileSync(configFile(cwd), "utf8")) as Config;
  } catch {
    return {};
  }
}

function writeConfig(cfg: Config, cwd?: string): void {
  const file = configFile(cwd);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`, "utf8");
}

/** Has first-run seeding been handled (installed or skipped)? */
export function isSeeded(cwd?: string): boolean {
  return readConfig(cwd).seeded === true;
}

/** Mark first-run seeding as handled so onboarding does not ask again. */
export function markSeeded(cwd?: string): void {
  writeConfig({ ...readConfig(cwd), seeded: true }, cwd);
}

/** The saved default parent directory for new scaffolds, or undefined if unset. */
export function getDefaultTargetDir(cwd?: string): string | undefined {
  return readConfig(cwd).defaultTargetDir;
}

/** Persist the default parent directory so scaffolds stop asking where to create. */
export function setDefaultTargetDir(dir: string, cwd?: string): void {
  writeConfig({ ...readConfig(cwd), defaultTargetDir: dir }, cwd);
}

/** Forget the saved default parent directory (scaffolds will ask again). */
export function clearDefaultTargetDir(cwd?: string): void {
  const cfg = readConfig(cwd);
  delete cfg.defaultTargetDir;
  writeConfig(cfg, cwd);
}
