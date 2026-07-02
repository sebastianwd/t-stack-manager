import fs from "node:fs";
import path from "node:path";
import { isSeeded, markSeeded } from "../lib/config.js";
import { listLibraries } from "../lib/libraries.js";
import { listModifications } from "../lib/modifications.js";
import { emitError, emitJson } from "../lib/output.js";
import { DEFAULT_PACK, type Store, STORES, listPacks, packStoreDir, packsRoot } from "../lib/packs.js";
import { resolveStorageDir } from "../lib/paths.js";
import { seedDefaults } from "../lib/seed.js";
import { listSkills } from "../lib/skills.js";
import { listTemplates } from "../lib/storage.js";

function isStore(s: string | undefined): s is Store {
  return s !== undefined && (STORES as readonly string[]).includes(s);
}

export interface SeedArgs {
  store?: string;
  force: boolean;
  skip: boolean;
  json: boolean;
}

/** `t-stack-manager seed`: copy bundled defaults into user storage (opt-in batteries). */
export function runSeed(args: SeedArgs): number {
  if (args.store && !isStore(args.store)) {
    emitError(args.json, {
      code: "BAD_STORE",
      message: `Unknown store "${args.store}".`,
      hint: `Use one of: ${STORES.join(", ")}.`,
    });
    return 1;
  }

  if (args.skip) {
    markSeeded();
    if (args.json) emitJson({ ok: true, skipped: true, copied: [] });
    else process.stderr.write("Skipped seeding defaults (marked as handled).\n");
    return 0;
  }

  const stores = args.store && isStore(args.store) ? [args.store] : undefined;
  const result = seedDefaults({ stores, force: args.force });
  if (args.json) {
    emitJson({ ok: true, copied: result.copied, skipped: result.skipped });
  } else {
    process.stderr.write(`Seeded ${result.copied.length} file(s); skipped ${result.skipped.length} existing.\n`);
  }
  return 0;
}

/** `t-stack-manager status`: whether seeded, storage location, and per-store counts. */
export function runStatus(args: { json: boolean }): number {
  const counts = {
    templates: listTemplates().templates.length,
    libraries: listLibraries().libraries.length,
    modifications: listModifications().modifications.length,
    skills: listSkills().skills.length,
  };
  const packs = listPacks();
  const payload = { ok: true, seeded: isSeeded(), storage: resolveStorageDir(), packs, counts };
  if (args.json) {
    emitJson(payload);
  } else {
    process.stderr.write(
      `seeded=${payload.seeded} storage=${payload.storage}\n` +
        `packs=[${packs.join(", ")}]\n` +
        `templates=${counts.templates} libraries=${counts.libraries} modifications=${counts.modifications} skills=${counts.skills}\n`,
    );
  }
  return 0;
}

/** `t-stack-manager remove <store> <id> [--pack=<name>]`: delete an entry (default pack). */
export function runRemove(args: { store?: string; id?: string; pack?: string; json: boolean }): number {
  if (!isStore(args.store) || !args.id) {
    emitError(args.json, {
      code: "MISSING_ARGS",
      message: "Usage: t-stack-manager remove <store> <id> [--pack=<name>]",
      hint: `store is one of: ${STORES.join(", ")}.`,
    });
    return 1;
  }

  const pack = args.pack ?? DEFAULT_PACK;
  const file = path.join(packStoreDir(pack, args.store), `${args.id}.md`);
  if (!fs.existsSync(file)) {
    emitError(args.json, {
      code: "NOT_FOUND",
      message: `No ${args.store} entry "${args.id}" in pack "${pack}" (${file}).`,
      hint: "Check --pack, or run `t-stack-manager seed` if it is an unseeded default. To drop a whole imported pack use `remove-pack`.",
    });
    return 1;
  }

  try {
    fs.rmSync(file);
  } catch (cause) {
    emitError(args.json, { code: "REMOVE_FAILED", message: `Could not remove ${file}: ${String(cause)}` });
    return 1;
  }

  if (args.json) emitJson({ ok: true, store: args.store, id: args.id, pack, removed: file });
  else process.stderr.write(`Removed ${pack}/${args.store}/${args.id}\n`);
  return 0;
}

/** `t-stack-manager remove-pack <name>`: uninstall a whole imported pack. */
export function runRemovePack(args: { name?: string; json: boolean }): number {
  if (!args.name) {
    emitError(args.json, { code: "MISSING_ARGS", message: "Usage: t-stack-manager remove-pack <name>" });
    return 1;
  }
  if (args.name === DEFAULT_PACK) {
    emitError(args.json, {
      code: "CANNOT_REMOVE_DEFAULT",
      message: `Refusing to remove the "${DEFAULT_PACK}" pack (it holds your own entries).`,
      hint: "Remove individual entries with `t-stack-manager remove <store> <id>`, or re-seed.",
    });
    return 1;
  }

  const dir = path.join(packsRoot(), args.name);
  if (!fs.existsSync(dir)) {
    emitError(args.json, { code: "NOT_FOUND", message: `No installed pack "${args.name}".` });
    return 1;
  }

  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (cause) {
    emitError(args.json, { code: "REMOVE_FAILED", message: `Could not remove pack "${args.name}": ${String(cause)}` });
    return 1;
  }

  if (args.json) emitJson({ ok: true, pack: args.name, removed: dir });
  else process.stderr.write(`Removed pack "${args.name}"\n`);
  return 0;
}
