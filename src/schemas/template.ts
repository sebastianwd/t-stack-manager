import { CreateInputSchema } from "@better-t-stack/types/schemas";
import { z } from "zod";

/**
 * Template flags = the better-t-stack `create` input.
 *
 * We validate against the whole `CreateInputSchema` (it can't be `.omit()`-ed
 * because it carries refinements, and all of its fields are optional anyway).
 * Fields that Stacksmith controls at scaffold time (projectName, dryRun, yes,
 * yolo) are sanitized out by the adapter before spawning.
 *
 * Because the schema is strict, a template referencing a renamed/removed flag
 * fails loudly at read time against the pinned `@better-t-stack/types` version.
 */
export const TemplateFlagsSchema = CreateInputSchema;

export type TemplateFlags = z.infer<typeof TemplateFlagsSchema>;

/** Frontmatter shape of a template markdown file. */
export const TemplateSchema = z.object({
  name: z.string().min(1, "template name is required"),
  description: z.string().default(""),
  "better-t-stack-version": z.string().min(1, "better-t-stack-version is required"),
  flags: TemplateFlagsSchema,
  default_libraries: z.array(z.string()).default([]),
  default_modifications: z.array(z.string()).default([]),
  default_skills: z.array(z.string()).default([]),
});

export type Template = z.infer<typeof TemplateSchema>;
