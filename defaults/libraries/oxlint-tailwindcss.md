---
id: oxlint-tailwindcss
category: linting
package: oxlint-tailwindcss
description: 23 Tailwind CSS v4 lint rules for oxlint (invalid/conflicting/deprecated classes, sort order), read from your design system
use_cases: [tailwind linting, class validation, class sort order, design-system enforcement]
alternatives_considered: [eslint-plugin-tailwindcss, prettier-plugin-tailwindcss]
when_to_use: Projects using oxlint + Tailwind CSS v4 that want class-level linting (invalid/conflicting/deprecated classes, canonical sort order).
gotchas: "Dev dependency: install with -D. Needs oxlint >= 1.43.0 and Tailwind v4; pulls @tailwindcss/node + tailwindcss. Wire via .oxlintrc.json jsPlugins + settings.tailwindcss.entryPoint (path to the CSS with @import \"tailwindcss\")."
peer_deps: [oxlint, tailwindcss]
last_reviewed: "2026-06-30"
license: MIT
---

# oxlint-tailwindcss

An oxlint plugin that lints Tailwind CSS v4 classes against your actual design
system (`@theme` tokens, shadcn variables, plugins): catches invalid, conflicting,
and deprecated classes and enforces sort order.

Install as a dev dependency and wire it into `.oxlintrc.json`:

```json
{
  "jsPlugins": ["oxlint-tailwindcss"],
  "settings": {
    "tailwindcss": {
      "entryPoint": "src/styles.css"
    }
  }
}
```

Source: https://github.com/sergioazoc/oxlint-tailwindcss

Delete this default with `t-stack-manager remove libraries oxlint-tailwindcss` if you don't want it.
