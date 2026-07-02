---
"t-stack-manager": patch
---

Scaffolds no longer default to a hardcoded machine path. The skill now asks where to create a project when no default is set, and a new `config` command lets you save a default parent directory (`config set --default-target-dir=<path>`, `config get`, `config unset`) so it stops asking. Also: README now leads with install, uses the hyphenated package name, and shows an npm version badge.
