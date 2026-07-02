import type { Template } from "./schemas/template.js";

/** Which pack an entry came from (e.g. "default" for your own, or an imported pack name). */
export type TemplateSource = string;

/** Lightweight view of a template for `templates list`. */
export interface TemplateSummary {
  name: string;
  description: string;
  better_t_stack_version: string;
  path: string;
  source: TemplateSource;
}

/** A loaded template plus where it came from on disk. */
export interface LoadedTemplate {
  template: Template;
  path: string;
  source: TemplateSource;
}

/** One line in the scaffold log (JSONL). */
export interface ScaffoldLogEntry {
  timestamp: string;
  template: string;
  target: string;
  better_t_stack_version: string;
  ok: boolean;
}
