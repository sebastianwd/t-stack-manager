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
- **Target directory:** the full path where the project folder should be created.
  Default to `D:\dev\<project-name>` unless the user says otherwise. Confirm the
  path before running anything destructive.

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
