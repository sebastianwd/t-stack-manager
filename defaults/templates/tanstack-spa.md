---
name: tanstack-spa
description: Frontend-only TanStack Router SPA on Cloudflare, oxlint + turborepo, pnpm
better-t-stack-version: 3.30.3
flags:
  frontend: ["tanstack-router"]
  backend: none
  database: none
  orm: none
  auth: none
  api: none
  addons: ["oxlint", "turborepo"]
  packageManager: pnpm
  webDeploy: cloudflare
  install: true
  git: true
default_libraries: []
default_modifications: []
default_skills: []
---

# TanStack Router SPA

A no-backend single-page app: TanStack Router on the front, deployed to Cloudflare,
with oxlint and a turborepo workspace. A good starting point for client-only apps
or the front half of a stack you wire up later.

## Notes

- No backend/database/API, add them later or start from `tanstack-fullstack` if you
  want the full stack.
- `turborepo` makes the output a monorepo (`apps/web`).
- Delete this default with `stacksmith remove templates tanstack-spa` if you don't want it.
