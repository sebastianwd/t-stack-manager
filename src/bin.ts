#!/usr/bin/env node
import { runAdd } from "./commands/add.js";
import { runInit } from "./commands/init.js";
import { runInstall } from "./commands/install.js";
import { runLibraries } from "./commands/libraries.js";
import { runLog } from "./commands/log.js";
import { runModifications } from "./commands/modifications.js";
import { runRemove, runRemovePack, runSeed, runStatus } from "./commands/manage.js";
import { runScaffold } from "./commands/scaffold.js";
import { runSkills } from "./commands/skills.js";
import { runTemplatesList } from "./commands/templates-list.js";
import { emitError } from "./lib/output.js";

interface ParsedArgs {
  positionals: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const key = arg.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

function str(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

const USAGE = `t-stack-manager - scaffold projects from saved better-t-stack templates

Usage:
  t-stack-manager install [--project[=<path>]] [--json]
  t-stack-manager templates list [--json]
  t-stack-manager init --name=<name> --from-command=<cmd> [--description=<text>] [--force] [--json]
  t-stack-manager scaffold --template=<name> --target=<path> [--name=<project>] [--dry-run] [--json]
  t-stack-manager modifications list [--json]
  t-stack-manager modifications add --id=<id> --from-project=<path> [--template=<id>] [--as-template=<name>] [--description=<text>] [--force] [--json]
  t-stack-manager modifications apply --id=<id> --target=<path> [--json]
  t-stack-manager libraries list [--category=<cat>] [--json]
  t-stack-manager libraries add --id=<id> --category=<cat> --package=<pkg> [--description=<text>] [--use-cases=<csv>] [--alternatives=<csv>] [--when-to-use=<text>] [--gotchas=<text>] [--peer-deps=<csv>] [--skill-ref=<id>] [--license=<id>] [--note=<text>] [--force] [--json]
  t-stack-manager skills list [--category=<cat>] [--json]
  t-stack-manager skills add --id=<id> [--install=<json-steps>] [--url=<url>] [--bts-source=<id>] [--agents=<csv>] [--category=<cat>] [--description=<text>] [--license=<id>] [--note=<text>] [--force] [--json]
  t-stack-manager skills install --id=<id> [--target=<path>] [--package-manager=<pm>] [--yes] [--json]
  t-stack-manager status [--json]
  t-stack-manager seed [--store=<templates|libraries|modifications|skills>] [--force] [--skip] [--json]
  t-stack-manager add <github:owner/repo[@ref] | url | ./path> [--name=<pack>] [--force] [--json]
  t-stack-manager remove <templates|libraries|modifications|skills> <id> [--pack=<name>] [--json]
  t-stack-manager remove-pack <name> [--json]
  t-stack-manager log --template=<name> --target=<path> [--version=<v>] [--ok] [--json]
`;

async function main(): Promise<number> {
  const { positionals, flags } = parseArgs(process.argv.slice(2));
  const json = flags.json === true || flags.json === "true";
  const command = positionals[0];

  if (!command || flags.help === true || command === "help") {
    process.stderr.write(USAGE);
    return command ? 0 : 1;
  }

  switch (command) {
    case "install": {
      const proj = flags.project;
      return runInstall({ project: proj === true ? "." : str(proj), json });
    }

    case "templates": {
      const sub = positionals[1] ?? "list";
      if (sub !== "list") {
        emitError(json, { code: "UNKNOWN_SUBCOMMAND", message: `Unknown: templates ${sub}` });
        return 1;
      }
      return runTemplatesList({ json });
    }

    case "init": {
      return runInit({
        name: str(flags.name) ?? positionals[1] ?? "",
        fromCommand: str(flags["from-command"]) ?? "",
        description: str(flags.description),
        force: flags.force === true || flags.force === "true",
        json,
      });
    }

    case "scaffold": {
      return runScaffold({
        template: str(flags.template) ?? positionals[1] ?? "",
        target: str(flags.target) ?? "",
        name: str(flags.name),
        dryRun: flags["dry-run"] === true || flags["dry-run"] === "true",
        json,
      });
    }

    case "modifications": {
      return runModifications({
        sub: positionals[1] ?? "list",
        id: str(flags.id),
        fromProject: str(flags["from-project"]),
        template: str(flags.template),
        asTemplate: str(flags["as-template"]),
        description: str(flags.description),
        target: str(flags.target),
        force: flags.force === true || flags.force === "true",
        json,
      });
    }

    case "libraries": {
      return runLibraries({
        sub: positionals[1] ?? "list",
        id: str(flags.id),
        category: str(flags.category),
        package: str(flags.package),
        description: str(flags.description),
        useCases: str(flags["use-cases"]),
        alternatives: str(flags.alternatives),
        whenToUse: str(flags["when-to-use"]),
        gotchas: str(flags.gotchas),
        peerDeps: str(flags["peer-deps"]),
        skillRef: str(flags["skill-ref"]),
        license: str(flags.license),
        note: str(flags.note),
        force: flags.force === true || flags.force === "true",
        json,
      });
    }

    case "skills": {
      return runSkills({
        sub: positionals[1] ?? "list",
        id: str(flags.id),
        install: str(flags.install),
        url: str(flags.url),
        btsSource: str(flags["bts-source"]),
        agents: str(flags.agents),
        category: str(flags.category),
        description: str(flags.description),
        license: str(flags.license),
        note: str(flags.note),
        target: str(flags.target),
        packageManager: str(flags["package-manager"]),
        yes: flags.yes === true || flags.yes === "true",
        force: flags.force === true || flags.force === "true",
        json,
      });
    }

    case "status": {
      return runStatus({ json });
    }

    case "seed": {
      return runSeed({
        store: str(flags.store),
        force: flags.force === true || flags.force === "true",
        skip: flags.skip === true || flags.skip === "true",
        json,
      });
    }

    case "add": {
      return runAdd({
        source: positionals[1],
        name: str(flags.name),
        force: flags.force === true || flags.force === "true",
        json,
      });
    }

    case "remove": {
      return runRemove({
        store: positionals[1],
        id: positionals[2],
        pack: str(flags.pack),
        json,
      });
    }

    case "remove-pack": {
      return runRemovePack({ name: positionals[1], json });
    }

    case "log": {
      return runLog({
        template: str(flags.template) ?? "",
        target: str(flags.target) ?? "",
        version: str(flags.version),
        ok: flags.ok === true || flags.ok === "true",
        json,
      });
    }

    default: {
      emitError(json, { code: "UNKNOWN_COMMAND", message: `Unknown command: ${command}` });
      process.stderr.write(`\n${USAGE}`);
      return 1;
    }
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    process.stderr.write(`Fatal: ${String(cause)}\n`);
    process.exitCode = 1;
  });
