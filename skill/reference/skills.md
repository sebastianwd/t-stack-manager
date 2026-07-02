# skills

Skills are agent instruction assets. Some are **general** (a design system like
impeccable, a code-style guide); some are tied to a library/framework. They are a
peer store to templates/libraries/modifications, because not every skill belongs
to a library.

Install is **not standardized**, so it is stored as an ordered recipe of steps,
not a fixed kind:

- `run` — a shell command (e.g. `npx impeccable install`). The CLI can run it.
- `slash` — a harness command only the agent can run (e.g. `/plugin install x@y`,
  `/plugin marketplace add owner/repo`). The agent runs these in the Claude Code UI.
- `note` — a manual instruction.

**Runner placeholders (portability):** in `run`/`note` steps, use `{{dlx}}` for the
ephemeral package runner and `{{pm}}` for the package manager. T Stack Manager
substitutes them for the target project's manager at plan/install time:
`{{dlx}}` -> `npx` | `pnpm dlx` | `bunx`; `{{pm}}` -> `npm` | `pnpm` | `bun`. So
store `{{dlx}} @tanstack/intent@latest install`, not a hardcoded
`npx ...`, and it adapts to any stack. Example for TanStack Intent:
`--install='[{"run":"{{dlx}} @tanstack/intent@latest install"}]'`.

Order matters: a prerequisite (add a marketplace) is just an earlier step. A skill
also carries a reference `url` (docs/repo) and, when better-t-stack installs it
natively, a `bts_source`.

## List / find skills

```bash
npx t-stack-manager skills list [--category=<cat>] --json
```

## Save a skill to the stack

`--install` is a JSON array of ordered steps. Examples matching real skills:

```bash
# a CLI-installed skill
npx t-stack-manager skills add --id=impeccable --category=design \
  --url="https://impeccable.style" \
  --install='[{"run":"npx impeccable install"}]' --json

# a plugin skill that needs a marketplace added first (order preserved)
npx t-stack-manager skills add --id=orpc-guide --category=framework \
  --url="https://github.com/vcode-sh/vibe-tools" \
  --install='[{"slash":"/plugin marketplace add vcode-sh/vibe-tools"},{"slash":"/plugin install orpc-guide@vibe-tools"}]' --json

# a better-t-stack native skill (no steps; installed at scaffold via flags)
npx t-stack-manager skills add --id=shadcn --category=framework --bts-source="shadcn/ui" --json
```

If the id exists, the CLI returns `SKILL_EXISTS`; confirm before `--force`.

## Install a skill

```bash
# 1. Plan first (does NOT run shell steps): shows the ordered recipe
npx t-stack-manager skills install --id=<id> [--target=<path>] --json

# 2. After showing the user the steps and getting the OK, execute the run steps:
npx t-stack-manager skills install --id=<id> [--target=<path>] --yes --json
```

The result has a per-step `status` and an overall `status`:
- `run` steps execute **only with `--yes`** (the trust gate). Without it they come
  back `needs_consent`, show them to the user first.
- `slash` steps always come back `status: "agent"`, the CLI cannot run them. **You
  run them in the harness** (the Claude Code UI), in order. e.g.
  `/plugin marketplace add owner/repo` then `/plugin install x@y`.
- `note` steps are manual.
- overall: `installed` (all run, succeeded), `needs_consent` (run steps pending),
  `agent_steps` (slash/note remain for you), `failed`, `none`, `error`.

**Trust:** `run: npx <x>` and `slash: /plugin install <x>` both execute third-party
code. Review the steps with the user before running anything from an untrusted
source; that is exactly why `run` steps need `--yes`.

## Linked skills on scaffold

Templates may link `default_skills: [ids]`. On scaffold the CLI reports each as a
plan under `skills` (it does NOT auto-run them). Install them afterwards with
`skills install` per above; `bts_source` skills are handled by better-t-stack via
the template's skills addon.
