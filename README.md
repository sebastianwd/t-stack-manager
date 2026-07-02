# Stacksmith

Stacksmith is your memory for project setups. Paste a
[better-t-stack](https://www.better-t-stack.dev/) command once, save it as a named
template, and replay it forever, with the libraries, post-scaffold tweaks, and
agent skills you always add layered on automatically. A Claude Code skill backed
by a CLI.

It complements better-t-stack rather than replacing it: use better-t-stack to
*design* a stack the first time, then let Stacksmith *remember and reproduce* it
(plus your extras) every time after, no re-deciding.

## Examples

In Claude Code, just say what you want:

```text
"Scaffold a new app from my tanstack-fullstack template into ./my-app"
"Save this better-t-stack command as a template called tanstack-spa"
"What library should I use for forms?"
"Save the changes I made to ./my-app as a modification called auth-wiring"
"Spin up my fullstack starter"   (scaffolds a template + auto-applies your saved mods)
```

Or use the CLI directly:

```bash
stacksmith seed                                   # install the recommended starter set
stacksmith templates list
stacksmith scaffold --template=tanstack-fullstack --target=./my-app --name=my-app
```

## Install

```bash
npm install -g @sebastianwd/stacksmith
# or ad hoc, no install:
npx @sebastianwd/stacksmith status
```

Requires Node >= 20 and a package runner (npm, pnpm, or bun).

Add the skill to Claude Code (after `pnpm build`):

```bash
cp -r dist/claude-code/.claude/* ~/.claude/        # global
cp -r dist/claude-code/.claude your-project/       # or project-scoped
```

The skill calls `npx stacksmith ...`, so the package must be installed (or
reachable via npx) wherever the agent runs.

## What it stores

Four stores, all plain markdown + YAML frontmatter you own:

- **Templates**: a saved better-t-stack config, pinned to a better-t-stack version.
- **Libraries**: a queryable catalogue of trusted libraries (what they're for, when
  to use, alternatives). The agent picks; the version is resolved at install time.
- **Modifications**: reusable post-scaffold changes, captured as a diff. Apply them
  to new scaffolds or existing repos.
- **Skills**: agent instruction assets (general, or tied to a library), with an
  ordered install recipe.

A template can link `default_libraries`, `default_modifications`, and
`default_skills`, so scaffolding it applies the whole stack in one step. Defaults
ship as an opt-in seed, a fresh install is empty until you `stacksmith seed`.

## CLI

All commands accept `--json` (machine output on stdout; human text on stderr).
Failures are always `{ "ok": false, "error": { "code", "message", "hint" } }`.

```bash
# onboarding / storage
stacksmith status [--json]
stacksmith seed [--store=<templates|libraries|modifications|skills>] [--force] [--skip] [--json]
stacksmith remove <store> <id> [--json]

# templates
stacksmith templates list [--json]
stacksmith init --name=<name> --from-command="<better-t-stack command>" [--description=<text>] [--force] [--json]
stacksmith scaffold --template=<name> --target=<path> [--name=<project>] [--dry-run] [--json]
stacksmith log --template=<name> --target=<path> [--ok] [--json]

# libraries
stacksmith libraries list [--category=<cat>] [--json]
stacksmith libraries add --id=<id> --category=<cat> --package=<pkg> [...metadata] [--json]

# modifications
stacksmith modifications list [--json]
stacksmith modifications add --id=<id> --from-project=<path> [--template=<id>] [--as-template=<name>] [--json]
stacksmith modifications apply --id=<id> --target=<path> [--json]

# skills
stacksmith skills list [--category=<cat>] [--json]
stacksmith skills add --id=<id> [--install='<json-steps>'] [--url=<url>] [...] [--json]
stacksmith skills install --id=<id> [--target=<path>] [--yes] [--json]
```

## Storage

Resolved in order:

1. `STACKSMITH_HOME` env var
2. nearest `./.stacksmith/` walking up from the cwd (project-scoped; check it into a
   repo to share a stack with your team)
3. `~/.stacksmith/` (user-scoped default)

Bundled defaults are a seed, not a runtime fixture: `stacksmith seed` copies them
into your storage as normal files you can edit and `remove`.

## Authoring templates

Rather than hand-writing YAML, paste a better-t-stack command:

```bash
stacksmith init --name=tanstack-spa \
  --from-command="npx create-better-t-stack@3.30.3 my-app --frontend tanstack-router --backend none --web-deploy cloudflare --install --git"
```

A template's `flags` are validated against the pinned `@better-t-stack/types` at
read time, so a template referencing a renamed flag fails loudly instead of
producing a broken project.

```yaml
---
name: tanstack-fullstack
description: "TanStack Start fullstack on Cloudflare: self backend, oRPC, Drizzle + Turso, better-auth"
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-start"]
  backend: self
  runtime: none
  api: orpc
  auth: better-auth
  database: sqlite
  orm: drizzle
  dbSetup: turso
  packageManager: pnpm
  webDeploy: cloudflare
  addons: ["mcp", "oxlint", "skills", "turborepo"]
  examples: ["todo"]
  install: true
  git: true
default_libraries: []
default_modifications: []
default_skills: []
---
```

## Skill install recipes

Skills store how they install as an ordered recipe, since the ecosystem is not
standardized. Steps are `run` (a shell command), `slash` (a harness command the
agent runs), or `note` (manual). Use `{{dlx}}` / `{{pm}}` placeholders and
Stacksmith substitutes the project's package manager (`npx` / `pnpm dlx` / `bunx`).

```yaml
install:
  - run: "{{dlx}} @tanstack/intent@latest install"
```

`run` steps only execute with `stacksmith skills install --yes` (they run
third-party code); `slash` steps are surfaced for the agent to run in order.

## Supply-chain safety

When installing a library from the catalogue, Stacksmith resolves the newest
version published at least 7 days ago rather than replaying a pinned version. This
reduces exposure to freshly published malicious releases.

## Develop

```bash
pnpm install
pnpm build        # tsdown -> dist/cli/bin.mjs, then assemble the skill bundle
pnpm dev          # tsdown --watch
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # oxlint
pnpm format       # oxfmt
```

## License

Apache-2.0
