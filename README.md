# Stacksmith

Scaffold new coding projects from saved [better-t-stack](https://www.better-t-stack.dev/)
templates. A Claude Code / Cursor skill backed by a small TypeScript CLI.

Stacksmith stores reusable stack configurations as plain markdown files, then
drives better-t-stack to scaffold a project from any of them. The CLI does the
deterministic work; the skill lets your AI agent pick the right template and run
the flow.

> **Status:** Phase 1. Scaffold from saved templates. Library recommendations
> and post-scaffold modifications are coming in Phase 2.

## Install

```bash
npm install -g @sebastianwd/stacksmith
# or use it ad hoc via npx (no install)
npx @sebastianwd/stacksmith templates list
```

### Add the skill to your agent

After building (`pnpm build`), copy the skill bundle:

```bash
# Claude Code, global (recommended for personal use)
cp -r dist/claude-code/.claude/* ~/.claude/

# Claude Code, project-scoped (recommended when collaborating)
cp -r dist/claude-code/.claude your-project/
```

The skill calls `npx stacksmith ...`, so the npm package must be installed (or
reachable via npx) wherever the agent runs.

## CLI

All commands accept `--json` (machine output on stdout; human text on stderr).

```bash
# list available templates (bundled + your own)
stacksmith templates list [--json]

# scaffold a project from a template
stacksmith scaffold --template=<name> --target=<path> [--name=<project>] [--dry-run] [--json]

# record a scaffold in the log
stacksmith log --template=<name> --target=<path> [--version=<v>] [--ok] [--json]
```

## Templates

Templates are markdown files with YAML frontmatter. Bundled defaults live in the
package; your own live in storage.

**Storage resolution:**

1. `STACKSMITH_HOME` env var
2. nearest `./.stacksmith/` walking up from the cwd (project-scoped)
3. `~/.stacksmith/` (user-scoped default)

A template's `flags` are validated against the pinned `@better-t-stack/types`
version at read time, so a template that references a renamed flag fails loudly
instead of producing a broken project.

```yaml
---
name: tanstack-cf-orpc
description: TanStack Start on Cloudflare Workers with oRPC, Drizzle, and D1
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-start"]
  backend: hono
  runtime: workers
  database: sqlite
  orm: drizzle
  auth: better-auth
  api: orpc
  packageManager: pnpm
  dbSetup: d1
  webDeploy: cloudflare
  install: true
  git: true
default_libraries: []
default_modifications: []
---
```

## Develop

```bash
pnpm install
pnpm build        # tsdown -> dist/cli, then assemble the skill bundle
pnpm test         # vitest
pnpm typecheck    # tsc --noEmit
pnpm lint         # oxlint
```

## License

Apache-2.0
