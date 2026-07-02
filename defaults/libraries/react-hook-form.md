---
id: react-hook-form
category: forms
package: react-hook-form
description: Performant, uncontrolled-first form state for React
use_cases: [forms, validation-ui, wizards]
alternatives_considered: [tanstack-form, formik, react-final-form]
when_to_use: Complex or large forms where re-render cost matters. Consider tanstack-form for a framework-agnostic, fully type-safe option.
gotchas: Use @hookform/resolvers to plug in a zod/valibot schema.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# react-hook-form

Minimal re-renders, small API, integrates with schema validators via resolvers.

Delete this default with `t-stack-manager remove libraries react-hook-form` if you don't want it.
