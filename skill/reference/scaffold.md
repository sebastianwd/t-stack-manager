# scaffold

Scaffold a new project from a saved template. Follow these steps in order.

## 1. List templates

```bash
npx t-stack-manager templates list --json
```

Parse the `templates` array. If it is empty, tell the user there are no
templates and stop. If there is more than one, present each template's name,
description, and pinned version, then ask which to use. If there is exactly one
and the user's request clearly matches it, you may proceed without asking.

## 2. Resolve project name and target

- **Project name:** from the user's request, or ask.
- **Target directory:** where the project folder should be created. Resolve it like this:
  1. Run `npx t-stack-manager config get --json` and read `defaultTargetDir`.
  2. If it is set, use `<defaultTargetDir>/<project-name>`. State the full path and
     proceed (no need to ask again).
  3. If it is `null`, **ask the user** where to create the project. Never assume a
     path. Once they answer, tell them once:
     > "Tip: I can remember a default parent directory so I stop asking. Want me to
     > save it? I'll run `t-stack-manager config set --default-target-dir=<parent>`."

     If they agree, run `npx t-stack-manager config set --default-target-dir=<parent> --json`
     with the parent of the path they just chose (they can change it later with the
     same command, or clear it with `config unset`).

  Always confirm the final full path before running anything destructive.

## 3. Dry run first

Validate the configuration without writing files:

```bash
npx t-stack-manager scaffold --template=<name> --target=<path> --name=<project-name> --dry-run --json
```

If `ok` is false, surface `error.message` and `error.hint`. Do not continue.

## 4. Scaffold for real

```bash
npx t-stack-manager scaffold --template=<name> --target=<path> --name=<project-name> --json
```

This streams better-t-stack progress to the terminal and installs dependencies
if the template sets `install: true`. On success the JSON includes `target`
(the created project dir) and `reproducible_command`.

## 5. Log it

```bash
npx t-stack-manager log --template=<name> --target=<path> --ok --json
```

## 6. Report

Tell the user where the project was created and suggest next steps: `cd` into the
directory, open it in their editor, and (for Cloudflare templates) wire up the D1
binding before deploying. If anything failed, report the exact error rather than
retrying blindly.
