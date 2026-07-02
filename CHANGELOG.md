# t-stack-manager

## 0.1.2

### Patch Changes

- 403d3c8: Scaffold now asks for the project name and target directory as plain text instead of a multiple-choice picker (which rejected free-form answers), and offers the current directory as a target option when no default is saved.

## 0.1.1

### Patch Changes

- 73ed726: Scaffolds no longer default to a hardcoded machine path. The skill now asks where to create a project when no default is set, and a new `config` command lets you save a default parent directory (`config set --default-target-dir=<path>`, `config get`, `config unset`) so it stops asking. Also: README now leads with install, uses the hyphenated package name, and shows an npm version badge.
