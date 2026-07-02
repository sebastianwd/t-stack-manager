---
id: neverthrow
category: error-handling
package: neverthrow
description: Type-safe errors for TypeScript via Result / ResultAsync (no throwing)
use_cases: [error handling, typed errors, result types, railway-oriented programming]
alternatives_considered: [ts-results, true-myth, effect]
when_to_use: When you want failures encoded in the type system (Result<T, E>) and composed with map/andThen/match, instead of throwing. Reach for effect if you want a full effect system, not just Result.
gotchas: A companion ESLint plugin (eslint-plugin-neverthrow) enforces that Results are handled. Use fromThrowable/fromPromise/safeTry to bridge exception-based code.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# neverthrow

`Result<T, E>` and `ResultAsync` types that make failure explicit and composable,
so errors are values you handle, not exceptions you hope to catch.

Source: https://github.com/supermacro/neverthrow

Delete this default with `t-stack-manager remove libraries neverthrow` if you don't want it.
