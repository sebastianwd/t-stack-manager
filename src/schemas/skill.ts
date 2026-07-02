import { z } from "zod";

/**
 * One install step. The skill ecosystem is not standardized, so install is an
 * ordered recipe rather than a classified kind:
 * - `run`: a shell command the T Stack Manager CLI can execute (e.g. "npx impeccable install")
 * - `slash`: a harness command only the agent can run (e.g. "/plugin install x@y")
 * - `note`: a manual instruction
 * Order is the array order, so prerequisites are just earlier steps.
 */
export const SkillStepSchema = z.union([
  z.object({ run: z.string().min(1) }).strict(),
  z.object({ slash: z.string().min(1) }).strict(),
  z.object({ note: z.string().min(1) }).strict(),
]);
export type SkillStep = z.infer<typeof SkillStepSchema>;

/** Normalize a terse step to a flat {type, value} for output/consumption. */
export function stepKind(step: SkillStep): { type: "run" | "slash" | "note"; value: string } {
  if ("run" in step) return { type: "run", value: step.run };
  if ("slash" in step) return { type: "slash", value: step.slash };
  return { type: "note", value: step.note };
}

/** Frontmatter shape of a skill markdown file. */
export const SkillSchema = z.object({
  id: z.string().min(1, "skill id is required"),
  description: z.string().default(""),
  /** Free-form grouping (e.g. "design", "framework", "style"); need not tie to a library. */
  category: z.string().default(""),
  /** Reference link: docs / homepage / repo. */
  url: z.string().default(""),
  /** If better-t-stack installs this natively, its source id (e.g. "shadcn/ui"). */
  bts_source: z.string().default(""),
  /** Agents this skill targets; install location is agent-specific. */
  agents: z.array(z.string()).default(["claude-code"]),
  /** Ordered install recipe. Empty when the skill is bts-native or reference-only. */
  install: z.array(SkillStepSchema).default([]),
  license: z.string().default(""),
});

export type Skill = z.infer<typeof SkillSchema>;
