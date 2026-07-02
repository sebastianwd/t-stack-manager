---
id: tanstack-query
category: data-fetching
package: "@tanstack/react-query"
description: Async state management, caching, and server-state sync for React
use_cases: [data-fetching, caching, server-state, pagination, infinite-scroll]
alternatives_considered: [swr, rtk-query, apollo-client]
when_to_use: Any app fetching server data. Skip it if you already get typed data + caching from an RPC layer (e.g. oRPC/tRPC integrate with it anyway).
gotchas: This is server state, not client state; do not force UI state into it. Ships its own skills via TanStack Intent.
peer_deps: []
last_reviewed: "2026-06-30"
license: MIT
---

# @tanstack/react-query

The standard for server-state in React: caching, dedup, background refetch,
mutations. Integrates with oRPC/tRPC clients.

Delete this default with `t-stack-manager remove libraries tanstack-query` if you don't want it.
