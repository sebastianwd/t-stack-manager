---
id: shadcn
description: "shadcn/ui project-aware skill: reads your components.json to generate correct component code"
category: ui
url: https://ui.shadcn.com/docs/skills
bts_source: "shadcn/ui"
agents: [claude-code]
install:
  - run: "{{dlx}} skills add shadcn/ui"
license: ""
---

# shadcn/ui skill

Teaches the agent your specific shadcn/ui setup (framework, Tailwind version,
aliases, installed components) so it generates correct code the first time.
Activates when a `components.json` is present, so use it on a shadcn/ui project.

Also installable by better-t-stack via its skills addon (`bts_source: shadcn/ui`).

Delete this default with `t-stack-manager remove skills shadcn` if you don't want it.
