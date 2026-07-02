# libraries

A curated, queryable catalogue of trusted libraries. The CLI returns candidates;
**you (the agent) pick the best fit** for the case at hand. "Best library for X"
is judgment, not a CLI command.

## Recommend a library ("what should I use for forms / validation / X")

1. Get the catalogue, filtered by category when the ask maps to one:

```bash
npx t-stack-manager libraries list --category=<cat> --json
# or the whole catalogue:
npx t-stack-manager libraries list --json
```

2. Reason over the entries (`description`, `use_cases`, `when_to_use`,
   `alternatives_considered`, `gotchas`) and recommend the best fit for the user's
   actual situation. Explain why over the alternatives.
3. **If you install it:** resolve the version at install time to the latest that
   has been published at least 7 days ago (supply-chain freshness). Never pin a
   stale version from the catalogue entry, the entry stores the package and the
   rationale, not a version. Install peer_deps alongside.

If the catalogue is empty or has nothing fitting, say so and offer to add an entry.

## Save a library to the stack ("remember this lib", "add X to my stack")

```bash
npx t-stack-manager libraries add \
  --id=<id> --category=<cat> --package=<pkg> \
  --description="<one line>" \
  --use-cases="a,b" \
  --alternatives="x,y" \
  --when-to-use="<when this beats the alternatives>" \
  --gotchas="<sharp edges>" \
  --peer-deps="zod" \
  --note="<body: why, wiring snippet>" \
  --json
```

Capture the *decision*, not just the name: why this over the alternatives, when to
reach for it, what to watch out for. That metadata is what makes the catalogue
worth querying later. If the id exists, the CLI returns `LIBRARY_EXISTS`; confirm
before re-running with `--force`.
