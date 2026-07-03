---
name: tanstack-fullstack
description: "TanStack Start fullstack on Cloudflare: self backend, oRPC, Drizzle + D1, better-auth, mcp + oxlint + skills + turborepo, todo example"
better-t-stack-version: 3.30.3
flags:
  frontend:
    - tanstack-start
  backend: self
  runtime: none
  api: orpc
  auth: better-auth
  payments: none
  database: sqlite
  orm: drizzle
  dbSetup: d1
  packageManager: pnpm
  webDeploy: cloudflare
  serverDeploy: none
  addons:
    - mcp
    - oxlint
    - skills
    - turborepo
  examples:
    - todo
  git: true
  install: true
default_libraries: []
default_modifications:
  - add-oxlint-tailwindcss
default_skills: []
---

# TanStack Start fullstack

The batteries-included default: TanStack Start with a `self` backend (server code
lives in the app, no separate server), oRPC for type-safe calls, Drizzle over a
Cloudflare D1 (SQLite) database, and better-auth. Ships the `mcp`, `oxlint`, and `skills`
addons and a turborepo workspace, with a `todo` example to show the wiring.

## Notes

- `backend: self` + `runtime: none`: TanStack Start serves its own server code, so
  there's no separate backend app or runtime to pick.
- `dbSetup: d1` provisions a Cloudflare D1 (SQLite) database, which pairs with the
  `webDeploy: cloudflare` target (one platform for app + data).
- `turborepo` makes the output a monorepo.
- Pinned to better-t-stack 3.30.3. Bump `better-t-stack-version` and re-validate
  the flags when you upgrade.
- Delete this default with `t-stack-manager remove templates tanstack-fullstack` if you don't want it.
