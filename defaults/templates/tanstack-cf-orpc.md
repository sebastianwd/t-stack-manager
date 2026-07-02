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

# TanStack Start + Cloudflare + oRPC

The default full-stack TypeScript starter: TanStack Start on the front, Hono on
Cloudflare Workers on the back, oRPC for type-safe API calls, Drizzle over a D1
(SQLite) database, and better-auth for auth.

## Notes

- `dbSetup: d1` plus `webDeploy: cloudflare` makes better-t-stack add the
  `turborepo` addon automatically, so the output is a monorepo.
- Pinned to better-t-stack 3.30.3. Bump `better-t-stack-version` and re-validate
  the flags whenever you upgrade.
- `install: true` runs the package install during scaffold; `git: true`
  initializes a repo.
