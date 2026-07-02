import { listLibraries, saveLibrary } from "../lib/libraries.js";
import { emitError, emitJson } from "../lib/output.js";
import type { Library } from "../schemas/library.js";

export interface LibrariesArgs {
  sub: string;
  id?: string;
  category?: string;
  package?: string;
  description?: string;
  useCases?: string;
  alternatives?: string;
  whenToUse?: string;
  gotchas?: string;
  peerDeps?: string;
  skillRef?: string;
  license?: string;
  note?: string;
  force: boolean;
  json: boolean;
}

const splitCsv = (v?: string): string[] =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function runLibraries(args: LibrariesArgs): number {
  switch (args.sub) {
    case "list":
      return listCmd(args);
    case "add":
      return addCmd(args);
    default:
      emitError(args.json, {
        code: "UNKNOWN_SUBCOMMAND",
        message: `Unknown subcommand: libraries ${args.sub}`,
        hint: "Use list or add.",
      });
      return 1;
  }
}

function listCmd(args: LibrariesArgs): number {
  const { libraries, errors } = listLibraries({ category: args.category });
  if (args.json) {
    emitJson({ ok: true, libraries, errors });
  } else if (libraries.length === 0) {
    process.stderr.write(args.category ? `No libraries in category "${args.category}".\n` : "No libraries saved.\n");
  } else {
    for (const l of libraries) {
      process.stderr.write(`${l.id} [${l.category}] ${l.package} - ${l.description}\n`);
    }
  }
  return 0;
}

function addCmd(args: LibrariesArgs): number {
  if (!args.id || !args.category || !args.package) {
    emitError(args.json, {
      code: "MISSING_ARGS",
      message: "--id, --category, and --package are required.",
    });
    return 1;
  }

  const library: Library = {
    id: args.id,
    category: args.category,
    package: args.package,
    description: args.description ?? "",
    use_cases: splitCsv(args.useCases),
    alternatives_considered: splitCsv(args.alternatives),
    when_to_use: args.whenToUse ?? "",
    gotchas: args.gotchas ?? "",
    peer_deps: splitCsv(args.peerDeps),
    skill_ref: args.skillRef ?? "",
    last_reviewed: "",
    license: args.license ?? "",
  };

  const body =
    args.note ??
    `# ${args.id}\n\nWhy ${args.package}, and a starter wiring snippet. Resolve the install version at install time (latest that satisfies the freshness policy); do not pin a stale version here.`;

  const saved = saveLibrary(library, body, { force: args.force });
  if (!saved.ok) {
    emitError(args.json, saved.error);
    return 1;
  }

  if (args.json) {
    emitJson({ ok: true, id: args.id, path: saved.value.path, category: args.category, package: args.package });
  } else {
    process.stderr.write(`Saved library "${args.id}" (${args.category})\n`);
  }
  return 0;
}
