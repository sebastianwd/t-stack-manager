---
id: add-oxlint-tailwindcss
description: "Install oxlint-tailwindcss and wire its plugin + rules into .oxlintrc.json (Tailwind v4 lint rules on top of oxlint)"
kind: instructions
applies_to:
  - tanstack-fullstack
idempotent: true
source_project_name: ""
version: "1"
license: ""
---

Add [`oxlint-tailwindcss`](https://github.com/sergioazoc/oxlint-tailwindcss) so
oxlint also lints Tailwind v4 class usage (typos, conflicts, sort order, etc.).
Assumes the project already has the `oxlint` addon and Tailwind v4.

1. Install the plugin as a dev dependency with the project's package manager:
   `pnpm add -D oxlint-tailwindcss` (or `npm i -D` / `bun add -d`).

2. Find the Tailwind entry CSS, the file that contains `@import "tailwindcss";`.
   In a better-t-stack TanStack Start app this is usually `src/styles.css` (may
   also be `src/styles/app.css`, `app/globals.css`, etc.). The path to this file
   is required, the plugin reads your design system from it.

3. Merge these keys into `.oxlintrc.json` at the project root (create the file if
   it does not exist; if it does, merge, do not clobber existing keys/rules).
   Set `entryPoint` to the file from step 2:

   ```jsonc
   {
     "jsPlugins": ["oxlint-tailwindcss"],
     "settings": {
       "tailwindcss": {
         "entryPoint": "src/styles.css"
       }
     },
     "rules": {
       "tailwindcss/no-unknown-classes": "error",
       "tailwindcss/no-duplicate-classes": "error",
       "tailwindcss/no-conflicting-classes": "error",
       "tailwindcss/no-deprecated-classes": "error",
       "tailwindcss/no-contradicting-variants": "error",
       "tailwindcss/enforce-sort-order": "warn",
       "tailwindcss/enforce-shorthand": "warn",
       "tailwindcss/consistent-variant-order": "warn",
       "tailwindcss/no-hardcoded-colors": "warn"
     }
   }
   ```

   `settings.tailwindcss.entryPoint` is mandatory. Tune the rules to taste, the
   full set is documented in the repo (correctness / style / complexity /
   restrictions categories).

4. Run the project's lint (`pnpm run check` or `pnpm oxlint`) to confirm the
   plugin loads and the rules resolve.

Idempotent: re-running just re-asserts the same keys. If `jsPlugins` already lists
`oxlint-tailwindcss`, this is already wired, skip.
