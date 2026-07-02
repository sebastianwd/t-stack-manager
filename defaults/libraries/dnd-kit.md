---
id: dnd-kit
category: drag-and-drop
package: "@dnd-kit/core"
description: Modern, accessible, hooks-based drag-and-drop toolkit for React (zero deps)
use_cases: [drag and drop, sortable lists, reordering, kanban boards]
alternatives_considered: [react-dnd, react-beautiful-dnd, pragmatic-drag-and-drop]
when_to_use: React drag-and-drop with built-in accessibility and custom collision detection. For desktop/cross-window dragging or HTML5-DnD semantics, consider pragmatic-drag-and-drop or react-dnd.
gotchas: "Built on hooks/context (useDraggable/useDroppable), not the HTML5 DnD API. Pair @dnd-kit/sortable for sortable lists, @dnd-kit/utilities for helpers, @dnd-kit/modifiers for constraints. No desktop cross-window drag."
peer_deps: ["@dnd-kit/sortable", "@dnd-kit/utilities"]
last_reviewed: "2026-06-30"
license: MIT
---

# @dnd-kit/core

A lightweight, accessible drag-and-drop toolkit for React built on hooks and
context. Add `@dnd-kit/sortable` for sortable lists.

Source: https://github.com/clauderic/dnd-kit

Delete this default with `stacksmith remove libraries dnd-kit` if you don't want it.
