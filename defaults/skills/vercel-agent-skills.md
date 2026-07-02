---
id: vercel-agent-skills
description: "Vercel Labs agent skills: a modular collection (deploy, review, optimize) the agent uses when relevant"
category: tooling
url: https://github.com/vercel-labs/agent-skills
bts_source: "vercel-labs/agent-skills"
agents: [claude-code]
install:
  - run: "{{dlx}} skills add vercel-labs/agent-skills"
license: ""
---

# Vercel Labs agent skills

A collection of agent skills in the Agent Skills format (each with a SKILL.md,
optional scripts and references). Once installed the agent uses them automatically
when a matching task shows up.

Also installable by better-t-stack via its skills addon (`bts_source: vercel-labs/agent-skills`).

Delete this default with `t-stack-manager remove skills vercel-agent-skills` if you don't want it.
