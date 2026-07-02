import fs from "node:fs";
import path from "node:path";
import { isSeeded, markSeeded } from "../lib/config.js";
import { listLibraries } from "../lib/libraries.js";
import { listModifications } from "../lib/modifications.js";
import { emitError, emitJson } from "../lib/output.js";
import { resolveStorageDir } from "../lib/paths.js";
import { type Store, STORES, seedDefaults, userStoreDir } from "../lib/seed.js";
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

/** `stacksmith seed`: copy bundled defaults into user storage (opt-in batteries). */
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

/** `stacksmith status`: whether seeded, storage location, and per-store counts. */
export function runStatus(args: { json: boolean }): number {
  const counts = {
    templates: listTemplates().templates.length,
    libraries: listLibraries().libraries.length,
    modifications: listModifications().modifications.length,
    skills: listSkills().skills.length,
  };
  const payload = { ok: true, seeded: isSeeded(), storage: resolveStorageDir(), counts };
  if (args.json) {
    emitJson(payload);
  } else {
    process.stderr.write(
      `seeded=${payload.seeded} storage=${payload.storage}\n` +
        `templates=${counts.templates} libraries=${counts.libraries} modifications=${counts.modifications} skills=${counts.skills}\n`,
    );
  }
  return 0;
}

/** `stacksmith remove <store> <id>`: delete a user-owned entry file. */
export function runRemove(args: { store?: string; id?: string; json: boolean }): number {
  if (!isStore(args.store) || !args.id) {
    emitError(args.json, {
      code: "MISSING_ARGS",
      message: "Usage: stacksmith remove <store> <id>",
      hint: `store is one of: ${STORES.join(", ")}.`,
    });
    return 1;
  }

  const file = path.join(userStoreDir(args.store), `${args.id}.md`);
  if (!fs.existsSync(file)) {
    emitError(args.json, {
      code: "NOT_FOUND",
      message: `No ${args.store} entry "${args.id}" in user storage (${file}).`,
      hint: "Only user-owned entries can be removed; run `stacksmith seed` first if it is an unseeded default.",
    });
    return 1;
  }

  try {
    fs.rmSync(file);
  } catch (cause) {
    emitError(args.json, { code: "REMOVE_FAILED", message: `Could not remove ${file}: ${String(cause)}` });
    return 1;
  }

  if (args.json) emitJson({ ok: true, store: args.store, id: args.id, removed: file });
  else process.stderr.write(`Removed ${args.store}/${args.id}\n`);
  return 0;
}
