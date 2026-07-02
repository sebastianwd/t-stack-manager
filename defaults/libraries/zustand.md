---
id: zustand
category: state
package: zustand
description: Small, unopinionated client state management for React
use_cases: [client-state, global-state, stores]
alternatives_considered: [jotai, redux-toolkit, valtio]
when_to_use: Shared client-side UI state without boilerplate. Prefer jotai for atomic/bottom-up state; reach for redux-toolkit only when you need its ecosystem.
gotchas: For server data use tanstack-query instead; keep this for genuine client state.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# zustand

A tiny hook-based store. No providers, no boilerplate.

Delete this default with `t-stack-manager remove libraries zustand` if you don't want it.
