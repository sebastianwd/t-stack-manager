---
id: tanstack-intent
description: "TanStack Intent: discover and load the SKILL.md that ship inside TanStack packages"
category: tooling
url: https://tanstack.com/intent/latest/docs/getting-started/quick-start-consumers
bts_source: ""
agents: [claude-code, codex]
install:
  - run: "{{dlx}} @tanstack/intent@latest install"
  - note: 'Set package.json#intent.skills to the packages you trust, e.g. ["@tanstack/react-query", "@tanstack/router"]'
license: ""
---

# TanStack Intent

Intent installs a guidance block so your agent discovers per-package skills that
ship with TanStack libraries and loads the matching `SKILL.md` on demand. Link it
as a `default_skill` on TanStack templates. Optionally enable edit-gate hooks with
`{{dlx}} @tanstack/intent@latest hooks install`.

Delete this default with `t-stack-manager remove skills tanstack-intent` if you don't want it.
