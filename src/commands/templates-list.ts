import { listTemplates } from "../lib/storage.js";
import { emitJson } from "../lib/output.js";

export function runTemplatesList(opts: { json: boolean }): number {
  const { templates, errors } = listTemplates();

  if (opts.json) {
    emitJson({ ok: true, templates, errors });
    return 0;
  }

  if (templates.length === 0) {
    process.stderr.write("No templates found.\n");
  } else {
    for (const t of templates) {
      process.stderr.write(
        `${t.name}  [${t.source}, better-t-stack ${t.better_t_stack_version}]\n` +
          (t.description ? `  ${t.description}\n` : ""),
      );
    }
  }
  for (const e of errors) {
    process.stderr.write(`! skipped ${e.name}: ${e.message}\n`);
  }
  return 0;
}
