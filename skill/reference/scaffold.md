# scaffold

Scaffold a new project from a saved template. Follow these steps in order.

## 1. List templates

```bash
npx t-stack-manager templates list --json
```

Parse the `templates` array. If it is empty, tell the user there are no
templates and stop. If there is more than one, ask which to use with a
fixed-option / multiple-choice question (this is a discrete choice, so the
question tool fits): one option per template, labelled with its name and a short
line from its description + pinned version. If there is exactly one and the
user's request clearly matches it, you may proceed without asking.

## 2. Resolve project name and target

Ask for these as plain conversational text. The fixed-option / multiple-choice
question tool is great for discrete choices (like the template in step 1), but do
NOT use it for the project name or a filesystem path, those are free-form and the
tool will reject them (it requires 2-4 discrete options). Ask for name and path in prose.

- **Project name:** from the user's request, or ask. Lowercase kebab-case; it becomes
  the folder name and the package name.
- **Target directory:** where the project folder should be created. Resolve it like this:
  1. Run `npx t-stack-manager config get --json` and read `defaultTargetDir`.
  2. If it is set, use `<defaultTargetDir>/<project-name>`, state the full path, and proceed.
  3. If it is `null`, ask where to create it. Never assume a path. Offer both:
     - **the current directory** -> pass `--target=./<project-name>`, which creates
       `<cwd>/<project-name>`, or
     - **a path they give** -> `<their-path>/<project-name>`.

     Then, once, offer to remember it:
     > "Want me to save a default parent directory so I stop asking next time? I'll run
     > `t-stack-manager config set --default-target-dir=<parent>`."

     If they agree, run `npx t-stack-manager config set --default-target-dir=<parent> --json`
     with the parent directory (not the project folder). They can change it later with
     the same command, or clear it with `config unset`. Do not offer to save a default
     when they picked the current directory unless they ask.

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
