---
id: zod
category: validation
package: zod
description: TypeScript-first schema validation with static type inference
use_cases: [validation, parsing, schema, forms, env-vars]
alternatives_considered: [valibot, yup, arktype]
when_to_use: The default for runtime validation and inferring types from a schema. Reach for valibot if bundle size is critical.
gotchas: Pairs with form/resolver adapters (e.g. @hookform/resolvers) for form validation.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# zod

The de-facto standard for runtime validation in TypeScript. Define a schema once,
get validation and a static type from it.

Delete this default with `t-stack-manager remove libraries zod` if you don't want it.
