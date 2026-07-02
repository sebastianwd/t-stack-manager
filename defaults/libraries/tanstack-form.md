---
id: tanstack-form
category: forms
package: "@tanstack/react-form"
description: Headless, fully type-safe form state with a framework-agnostic core
use_cases: [forms, type-safe forms, validation-ui, wizards]
alternatives_considered: [react-hook-form, formik]
when_to_use: When you want end-to-end type safety and stack-consistency with the rest of TanStack. Prefer react-hook-form if you want the larger, more battle-tested ecosystem.
gotchas: Newer and smaller ecosystem than react-hook-form. Validates via Standard Schema, so it pairs directly with zod/valibot without a separate resolver.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# @tanstack/react-form

Type-safe, headless form state from the TanStack family. Fully inferred types,
Standard Schema validation (zod/valibot), framework-agnostic core.

The stack-consistent forms pick if you're already on TanStack; see `react-hook-form`
for the more popular alternative.

Delete this default with `stacksmith remove libraries tanstack-form` if you don't want it.
