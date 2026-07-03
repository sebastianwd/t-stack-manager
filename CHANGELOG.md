# t-stack-manager

## 0.1.5

### Patch Changes

- 9a762b2: Add a bundled `add-oxlint-tailwindcss` modification that installs `oxlint-tailwindcss` and wires its plugin, mandatory `entryPoint`, and rules into `.oxlintrc.json`. Linked as a default modification on the `tanstack-fullstack` template so it applies automatically on scaffold.

## 0.1.4

### Patch Changes

- a5f88ff: Scaffold now uses a multiple-choice picker to select the template (a discrete choice), while keeping the project name and target path as plain-text questions. Clarifies the earlier guidance that had the agent avoiding the picker everywhere.

## 0.1.3

### Patch Changes

- 86bd99b: The bundled `tanstack-fullstack` template now uses Cloudflare D1 (`dbSetup: d1`) instead of Turso, matching its Cloudflare web deploy so app and database live on one platform.

## 0.1.2

### Patch Changes

- 403d3c8: Scaffold now asks for the project name and target directory as plain text instead of a multiple-choice picker (which rejected free-form answers), and offers the current directory as a target option when no default is saved.

## 0.1.1

### Patch Changes

- 73ed726: Scaffolds no longer default to a hardcoded machine path. The skill now asks where to create a project when no default is set, and a new `config` command lets you save a default parent directory (`config set --default-target-dir=<path>`, `config get`, `config unset`) so it stops asking. Also: README now leads with install, uses the hyphenated package name, and shows an npm version badge.
