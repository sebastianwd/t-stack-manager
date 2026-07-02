# t-stack-manager

[![npm](https://img.shields.io/npm/v/t-stack-manager.svg)](https://www.npmjs.com/package/t-stack-manager)

t-stack-manager is your memory for project setups. Paste a
[better-t-stack](https://www.better-t-stack.dev/) command once, save it as a named
template, and replay it forever, with the libraries, post-scaffold tweaks, and
agent skills you always add layered on automatically. A Claude Code skill backed
by a CLI.

It complements better-t-stack rather than replacing it: use better-t-stack to
*design* a stack the first time, then let t-stack-manager *remember and reproduce* it
(plus your extras) every time after, no re-deciding.

## Install

```bash
npm install -g t-stack-manager
# or ad hoc, no install:
npx t-stack-manager status
```

Requires Node >= 20 and a package runner (npm, pnpm, or bun).

Add the skill to Claude Code with one command:

```bash
npx t-stack-manager install               # global (~/.claude/skills/t-stack-manager)
npx t-stack-manager install --project     # or into the current project's .claude/
```

Reload your agent and it picks up the skill. The skill calls `t-stack-manager ...`, so
keep the package installed (or reachable via npx) wherever the agent runs.

## Using it

You drive it by talking to your agent in Claude Code, not by memorizing commands.
Some things you can say:

**Scaffold a project**
```text
"Spin up a new app from tanstack-fullstack in ./my-app"
"New project like tanstack-fullstack but no auth and no database"
"What templates do I have?"
```

**Save a setup so you never re-decide it**
```text
"Save this as a template called tanstack-spa: pnpm create better-t-stack@latest ..."
"Turn the better-t-stack command I just ran into a template"
```

**Capture your tweaks and replay them**
```text
"Save the changes I made to ./my-app as a modification called auth-wiring"
"Also save it as a starter called my-saas"
"Spin up my-saas"                       (scaffolds the base + auto-applies your mods)
"Apply my auth-wiring modification to this existing repo"
```

**Reach for the right library (your curated taste)**
```text
"What should I use for forms?"
"Best state management library for this?"
"Add react-hook-form to my stack so I remember it next time"
```

**Skills and sharing**
```text
"Install the impeccable skill"
"What skills do I have for design?"
"Import my team's stack from github:acme/stack"
```

On first use it asks once whether to install the recommended starter set, or start clean.

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
ship as an opt-in seed, a fresh install is empty until you `t-stack-manager seed`.

## CLI

The agent runs these for you; you rarely call them by hand. A few you might:

```bash
t-stack-manager install      # deploy the skill into Claude Code
t-stack-manager status       # seeded?, storage location, per-store counts
t-stack-manager seed         # install the recommended starter set
t-stack-manager --help       # full command list
```

Everything else (`templates`, `init`, `scaffold`, `libraries`, `modifications`,
`skills`, `add`, `remove`, `log`) is listed by `--help`. Every command accepts
`--json` (machine output on stdout, human text on stderr); failures are always
`{ "ok": false, "error": { "code", "message", "hint" } }`.

## Storage

Resolved in order:

1. `T_STACK_MANAGER_HOME` env var
2. nearest `./.t-stack-manager/` walking up from the cwd (project-scoped; check it into a
   repo to share a stack with your team)
3. `~/.t-stack-manager/` (user-scoped default)

Bundled defaults are a seed, not a runtime fixture: `t-stack-manager seed` copies them
into your storage as normal files you can edit and `remove`.

## Sharing packs

A pack is just the `templates/libraries/modifications/skills` dirs. Publish them in
a repo and anyone can adopt the whole set in one command:

```bash
t-stack-manager add github:you/my-stack        # or a GitHub URL, or a local ./path
```

`add` only fetches, validates, and writes files, it never executes anything, so
it's safe against untrusted packs. Skill and modification steps still run behind
their own gates (`skills install --yes`, `modifications apply`). No domain or
registry needed: any static host works. Exclude `config.json` and `log/` from a
shared pack (machine/user state).

## Authoring templates

Rather than hand-writing YAML, paste a better-t-stack command:

```bash
t-stack-manager init --name=tanstack-spa \
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
t-stack-manager substitutes the project's package manager (`npx` / `pnpm dlx` / `bunx`).

```yaml
install:
  - run: "{{dlx}} @tanstack/intent@latest install"
```

`run` steps only execute with `t-stack-manager skills install --yes` (they run
third-party code); `slash` steps are surfaced for the agent to run in order.

## Supply-chain safety

When installing a library from the catalogue, t-stack-manager resolves the newest
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
