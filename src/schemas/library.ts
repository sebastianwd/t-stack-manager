import { z } from "zod";

/**
 * A curated library recommendation: queryable catalogue metadata, NOT a pinned
 * install. The agent reads these and picks the best fit for the case at hand.
 *
 * No version field on purpose: the version is resolved at install time (to the
 * latest that satisfies the supply-chain freshness policy), never replayed from
 * a stale pin in the note.
 */
export const LibrarySchema = z.object({
  id: z.string().min(1, "library id is required"),
  category: z.string().min(1, "category is required"),
  package: z.string().min(1, "package is required"),
  description: z.string().default(""),
  /** What this library is good for; drives query/selection. */
  use_cases: z.array(z.string()).default([]),
  /** Libraries weighed and not chosen, with the reasoning living in the body. */
  alternatives_considered: z.array(z.string()).default([]),
  when_to_use: z.string().default(""),
  gotchas: z.string().default(""),
  /** Packages that should be installed alongside this one. */
  peer_deps: z.array(z.string()).default([]),
  /** Optional reference to a skill id in the skills store (added in a later slice). */
  skill_ref: z.string().default(""),
  last_reviewed: z.string().default(""),
  license: z.string().default(""),
});

export type Library = z.infer<typeof LibrarySchema>;
