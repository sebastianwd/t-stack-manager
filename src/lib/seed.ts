import fs from "node:fs";
import path from "node:path";
import { markSeeded } from "./config.js";
import { STORES, type Store } from "./packs.js";
import {
  bundledLibrariesDir,
  bundledModificationsDir,
  bundledSkillsDir,
  bundledTemplatesDir,
  userLibrariesDir,
  userModificationsDir,
  userSkillsDir,
  userTemplatesDir,
} from "./paths.js";

function bundledDir(store: Store): string {
  switch (store) {
    case "templates":
      return bundledTemplatesDir();
    case "libraries":
      return bundledLibrariesDir();
    case "modifications":
      return bundledModificationsDir();
    case "skills":
      return bundledSkillsDir();
  }
}

export function userStoreDir(store: Store, cwd?: string): string {
  switch (store) {
    case "templates":
      return userTemplatesDir(cwd);
    case "libraries":
      return userLibrariesDir(cwd);
    case "modifications":
      return userModificationsDir(cwd);
    case "skills":
      return userSkillsDir(cwd);
  }
}

export interface SeedResult {
  copied: string[];
  skipped: string[];
}

/**
 * Copy bundled defaults into user storage as real, user-owned files. Skips files
 * that already exist (so it never clobbers user edits) unless `force`. Always
 * marks storage as seeded so first-run onboarding does not ask again.
 */
export function seedDefaults(opts: { stores?: Store[]; force?: boolean; cwd?: string } = {}): SeedResult {
  const stores = opts.stores ?? [...STORES];
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const store of stores) {
    const from = bundledDir(store);
    if (!fs.existsSync(from)) continue;
    const to = userStoreDir(store, opts.cwd);
    fs.mkdirSync(to, { recursive: true });
    for (const file of fs.readdirSync(from).filter((f) => f.endsWith(".md"))) {
      const dest = path.join(to, file);
      if (fs.existsSync(dest) && !opts.force) {
        skipped.push(`${store}/${file}`);
        continue;
      }
      fs.copyFileSync(path.join(from, file), dest);
      copied.push(`${store}/${file}`);
    }
  }

  markSeeded(opts.cwd);
  return { copied, skipped };
}
