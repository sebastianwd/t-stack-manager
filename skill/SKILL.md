---
name: t-stack-manager
description: "Use when the user wants to scaffold a new coding project, reuse a saved project template, save a better-t-stack command as a reusable template, or list available project templates. Wraps better-t-stack with saved configurations. Trigger phrases: 'scaffold a project', 'new project from a template', 'spin up a new app', 'save this as a template', 't-stack-manager'."
argument-hint: "[scaffold|init|templates] [name] [target]"
user-invocable: true
allowed-tools:
  - Bash(npx t-stack-manager *)
  - Bash(t-stack-manager *)
license: Apache-2.0
---

T Stack Manager scaffolds new coding projects from saved better-t-stack templates.
The CLI does the deterministic work (reading templates, running better-t-stack,
logging). Your job is to drive the interview and pick the right template.

## First run (onboarding)

Before the first real task in a session, run `npx t-stack-manager status --json`. If
`seeded` is `false`, the user's storage is empty (clean install). Ask them once:

> "T Stack Manager ships recommended starter templates, libraries, and skills. Install
> them now? You can edit or `remove` any of them later, or skip and start clean."

- **Yes** → `npx t-stack-manager seed --json` (copies the defaults into their storage as
  editable files).
- **No** → `npx t-stack-manager seed --skip --json` (marks onboarding done so this is
  not asked again; storage stays empty).

If `seeded` is already `true`, skip this and proceed. Do not seed without asking.

## Dispatch

Look at how the skill was invoked:

1. **`scaffold` (or a freeform "make me a new <thing>" request):** load
   [reference/scaffold.md](reference/scaffold.md) and follow it exactly.
2. **`init` (or "save this as a template", "turn this command into a template"):**
   load [reference/init.md](reference/init.md) and follow it. Use this when the
   user has a better-t-stack command (from better-t-stack.dev or their shell) they
   want to store as a reusable template.
3. **`modifications` (or "save my changes / my modifications", "apply <mod> to this project"):**
   load [reference/modifications.md](reference/modifications.md) and follow it.
   Use this to capture the hand-made changes in a scaffolded project as a reusable
   modification, or to apply a saved modification to a project.
4. **`libraries` (or "what library should I use for X", "best lib for <case>",
   "save this library to my stack"):** load [reference/libraries.md](reference/libraries.md)
   and follow it. The CLI returns the catalogue; you pick the best fit and resolve
   the install version at install time.
5. **`skills` (or "save this skill to my stack", "what skills do I have for X",
   "install <skill>"):** load [reference/skills.md](reference/skills.md) and follow
   it. Skills are agent instruction assets (general like a design system, or tied to
   a library); install is an ordered recipe of `run`/`slash`/`note` steps.
6. **`templates`:** run `npx t-stack-manager templates list --json`, then present the
   templates to the user in a short readable list (name, description, pinned
   better-t-stack version).
7. **Anything else / no argument:** treat it as a scaffold request. Ask for the
   project name and target directory if they are not obvious, then follow
   `reference/scaffold.md`.

## CLI contract

Every command accepts `--json` and prints machine JSON to stdout. Always pass
`--json` and parse stdout. Human-readable progress goes to stderr. A failure is
always shaped `{ "ok": false, "error": { "code", "message", "hint" } }`; surface
the `message` and `hint` to the user rather than guessing.

Never hand-edit the scaffolded project's config to fake a template. If a needed
template does not exist, say so and offer to scaffold from the closest match.
