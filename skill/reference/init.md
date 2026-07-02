# init

Save a better-t-stack command as a reusable Stacksmith template. Use this when
the user already has a command (built on better-t-stack.dev, copied from shell
history, or the `reproducible_command` from a previous scaffold) and wants to
store that stack so future scaffolds can reuse it.

`init` only writes the template. It does not scaffold. To create a project from
the saved template afterwards, follow `reference/scaffold.md`.

## 1. Get the command and a name

- **Command:** ask the user to paste the full better-t-stack command. Both forms
  work: the flag form (`npx create-better-t-stack@3.30.3 my-app --frontend
  tanstack-start --backend hono ...`) and the agent JSON form (`... create-json
  --input '{...}'`).
- **Template name:** a short kebab-case id (e.g. `tanstack-cf-orpc`). Ask if not
  obvious. This becomes the filename and the `name` in frontmatter.
- **Description (optional):** a one-line summary.

The project name inside the pasted command is ignored (Stacksmith sets it at
scaffold time), so it does not matter what the user named the example project.

## 2. Run init

Pass the command with the `=` form and quote it so the shell keeps it as one
argument:

```bash
npx stacksmith init --name=<name> --from-command="<full command>" --description="<text>" --json
```

If a template with that name already exists, the CLI fails with
`TEMPLATE_EXISTS`. Do not overwrite silently: report it and confirm with the user
before re-running with `--force`.

## 3. Handle the result

- On success the JSON includes `path`, `better_t_stack_version`, `version_source`
  (`command` if the pin came from `@<version>`, `default` if it fell back), and
  the parsed `flags`. Tell the user where it was saved and which version it pinned.
- If `version_source` is `default`, mention that the command had no explicit
  `@<version>` so it pinned the Stacksmith default; offer to re-run with a pinned
  command if they care about reproducibility.
- On `PARSE_INVALID_FLAGS`, surface `error.message` (it lists the offending
  flags) and `error.hint`. The command likely has a typo or targets a different
  better-t-stack version.

## 4. Offer next steps

Offer to scaffold a project from the new template right away (`reference/scaffold.md`),
or to list templates so the user sees it registered.
