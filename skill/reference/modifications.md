# modifications

Capture and apply reusable **post-scaffold** changes. A modification is the delta
on top of a template's output (file edits, added deps, wiring), the part
better-t-stack can't express. Saving modifications never creates or edits a
template: a template is just better-t-stack flags. The recipe is template + mod;
the scaffolded project is the dish.

## List

```bash
npx t-stack-manager modifications list --json
```

Present `id`, `kind`, and `description`. `kind` is one of `patch` (a captured
diff), `script` (executable), or `instructions` (prose steps).

## Save the changes in a project ("save my modifications")

The user scaffolded a project, edited it by hand, and wants to keep those edits.

1. Get: the **project path** (`--from-project`), an **id** for the mod, and the
   **base template id** it came from (`--template`, if known). Optionally a
   **description**.
2. Run:

```bash
npx t-stack-manager modifications add --id=<id> --from-project=<path> --template=<base-template> --description="<text>" --json
```

This diffs the working tree against the project's initial git commit (the pristine
scaffold) and saves the delta as a `kind: patch` modification. On success the JSON
has `path` and `baseline`.

The capture **automatically excludes** lockfiles (`pnpm-lock.yaml`, `package-lock.json`,
`yarn.lock`, `bun.lock*`), `node_modules`, and `.git`, and records the source
project's name so it can be rewritten on apply (name-agnostic). Do NOT tell the
user the mod contains the lockfile, it does not. It DOES include every other
changed file since the baseline, which can sweep in incidental formatter reorders;
skim the saved diff and describe only the meaningful changes.

3. **Optional bundle ("spin up my fullstack starter"):** if the user wants a named
   starter that reproduces base + these changes, add `--as-template=<name>`. This
   writes a thin template reusing the base flags with the mod linked via
   `default_modifications`, so scaffolding `<name>` applies the mod automatically.
   `--as-template` requires `--template`.

If the id already exists, the CLI returns `MODIFICATION_EXISTS`; confirm before
re-running with `--force`.

## Apply a saved modification to a project

```bash
npx t-stack-manager modifications apply --id=<id> --target=<path> --json
```

- `kind: patch` → applied with `git apply`. **If it does not apply cleanly**
  (`APPLY_PATCH_FAILED`), the JSON includes `action: "agent_apply"` and the raw
  `diff`. Do not give up: read the diff as *intent* and apply the equivalent
  changes by hand, adapting paths and structure to this project. This is expected
  when applying a mod to a different template than it was captured from.
- `kind: instructions` → JSON has `action: "agent_apply"` and `steps`; follow them
  with judgment.
- `kind: script` → the CLI runs it; just report the result.

## Trust note

`kind: script` modifications execute code. For mods authored locally by the user
that is fine. Be cautious applying a `script` mod that came from an untrusted
source; show the user what it will do first.
