---
id: add-shadcn-utils
description: "Install shadcn's Tailwind v4 CSS utilities (scroll-fade and more) and wire the import"
kind: instructions
applies_to: []
idempotent: true
source_project_name: ""
version: "1"
license: ""
---

Add shadcn's CSS utilities (e.g. `scroll-fade`, scroll-aware edge fade masks in
pure CSS) to a Tailwind v4 project:

1. Install the `shadcn` package with the project's package manager, e.g.
   `pnpm add shadcn` (or `npm install shadcn`, `bun add shadcn`).
2. In the global stylesheet, after `@import "tailwindcss";`, add:
   `@import "shadcn/tailwind.css";`
3. Utilities like `scroll-fade` are now available as classes.

If the project was created with `npx shadcn@latest init`, this is already set up,
skip it (idempotent: adding the import twice is harmless, just avoid duplicates).

Source: https://ui.shadcn.com/docs/utils/scroll-fade
