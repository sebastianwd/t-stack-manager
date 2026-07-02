import fs from "node:fs";
import path from "node:path";
import { resolveStorageDir } from "./paths.js";

export const STORES = ["templates", "libraries", "modifications", "skills"] as const;
export type Store = (typeof STORES)[number];

/** The built-in pack: seed target, and where the user's own authored entries go. */
export const DEFAULT_PACK = "default";

export function packsRoot(cwd?: string): string {
  return path.join(resolveStorageDir(cwd), "packs");
}

export function packStoreDir(pack: string, store: Store, cwd?: string): string {
  return path.join(packsRoot(cwd), pack, store);
}

/** Installed pack names, `default` first then the rest alphabetically. */
export function listPacks(cwd?: string): string[] {
  const root = packsRoot(cwd);
  if (!fs.existsSync(root)) return [];
  const names = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const rest = names.filter((n) => n !== DEFAULT_PACK).toSorted();
  return names.includes(DEFAULT_PACK) ? [DEFAULT_PACK, ...rest] : rest;
}

/**
 * Discover a store's files across all installed packs. The `default` pack is
 * scanned first and wins on id collision (your own entries are authoritative),
 * so importing packs never shadows what you authored.
 */
export function discoverStoreFiles(
  store: Store,
  cwd?: string,
): Map<string, { file: string; pack: string }> {
  const result = new Map<string, { file: string; pack: string }>();
  for (const pack of listPacks(cwd)) {
    const dir = packStoreDir(pack, store, cwd);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".md")) continue;
      const id = path.basename(f, ".md");
      if (!result.has(id)) result.set(id, { file: path.join(dir, f), pack });
    }
  }
  return result;
}
