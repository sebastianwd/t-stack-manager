import { z } from "zod";

/**
 * How a modification is applied. Also the trust boundary for sharing:
 * `script` is executable (untrusted when fetched remotely); `patch` and
 * `instructions` are inspectable.
 */
export const ModificationKindSchema = z.enum(["script", "patch", "instructions"]);
export type ModificationKind = z.infer<typeof ModificationKindSchema>;

/** Frontmatter shape of a modification markdown file. */
export const ModificationSchema = z.object({
  id: z.string().min(1, "modification id is required"),
  description: z.string().default(""),
  kind: ModificationKindSchema,
  /** Template ids/globs this modification was authored against (informational). */
  applies_to: z.array(z.string()).default([]),
  /** Whether re-applying is safe. One-shot mods must say so. */
  idempotent: z.boolean().default(false),
  /**
   * For captured `patch` mods: the source project's name. At apply time it is
   * rewritten to the target project's name so the patch is project-name-agnostic
   * (a reuse on a different name/path applies cleanly).
   */
  source_project_name: z.string().default(""),
  version: z.string().default("1"),
  license: z.string().default(""),
});

export type Modification = z.infer<typeof ModificationSchema>;
