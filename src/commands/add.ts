import { addPack } from "../lib/add.js";
import { emitError, emitJson } from "../lib/output.js";

export interface AddArgs {
  source?: string;
  name?: string;
  force: boolean;
  json: boolean;
}

/** `stacksmith add <source>`: import a whole pack from GitHub or a local dir. */
export async function runAdd(args: AddArgs): Promise<number> {
  if (!args.source) {
    emitError(args.json, {
      code: "MISSING_SOURCE",
      message: "Usage: stacksmith add <github:owner/repo[@ref] | url | ./path>",
    });
    return 1;
  }

  const result = await addPack(args.source, { force: args.force, name: args.name });
  if (!result.ok) {
    emitError(args.json, result.error);
    return 1;
  }

  const { items, pack } = result.value;
  const imported = items.filter((i) => i.status === "imported");
  const skipped = items.filter((i) => i.status === "skipped");
  const invalid = items.filter((i) => i.status === "invalid");

  if (args.json) {
    emitJson({
      ok: true,
      source: result.value.source,
      pack,
      imported: imported.length,
      skipped: skipped.length,
      invalid: invalid.length,
      items,
    });
  } else {
    process.stderr.write(
      `Added pack "${pack}" from ${result.value.source}: ${imported.length} imported, ${skipped.length} skipped, ${invalid.length} invalid.\n`,
    );
    for (const i of invalid) {
      process.stderr.write(`  invalid ${i.store}/${i.id}: ${i.message}\n`);
    }
    if (skipped.length > 0) {
      process.stderr.write("Pass --force to overwrite skipped (already-present) entries.\n");
    }
    process.stderr.write(`Remove it later with: stacksmith remove-pack ${pack}\n`);
  }
  return 0;
}
