import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execa } from "execa";
import type { ModificationKind } from "../schemas/modification.js";
import { readProjectName } from "./capture.js";
import { extractPayload, loadModification } from "./modifications.js";

/** A name distinctive enough to safely find-and-replace across a patch. */
function isDistinctive(name: string): boolean {
  return name.length >= 4 || /[-_0-9]/.test(name);
}

/**
 * Rewrite occurrences of the source project's name to the target's, so a patch
 * captured from one project applies cleanly to another with a different name.
 * No-op when names are missing/equal or the source name is too generic to be safe.
 */
export function normalizeProjectName(patch: string, from: string, to: string): string {
  if (!from || !to || from === to || !isDistinctive(from)) return patch;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = /^[\w-]+$/.test(from) ? `\\b${escaped}\\b` : escaped;
  return patch.replace(new RegExp(pattern, "g"), to);
}

export interface ApplyResult {
  id: string;
  kind?: ModificationKind;
  /**
   * - `patched` / `script_ran`: applied automatically.
   * - `agent_apply`: the agent must finish it (instructions to follow, or a
   *   patch that did not apply cleanly, see `diff`).
   * - `error`: could not be applied at all.
   */
  status: "patched" | "script_ran" | "agent_apply" | "error";
  /** Prose steps (instructions kind) for the agent to follow. */
  steps?: string;
  /** Raw diff surfaced when a patch failed to apply, so the agent can adapt it. */
  diff?: string;
  message?: string;
}

/**
 * Apply a saved modification to a target directory. Shared by
 * `t-stack-manager modifications apply` and the scaffold flow's `default_modifications`.
 * Pure-ish: returns a structured result; never emits or exits.
 */
export async function applyModification(
  id: string,
  targetDir: string,
  cwd?: string,
): Promise<ApplyResult> {
  const loaded = loadModification(id, cwd);
  if (!loaded.ok) return { id, status: "error", message: loaded.error.message };

  const resolved = path.resolve(targetDir);
  if (!fs.existsSync(resolved)) {
    return { id, status: "error", message: `Target ${resolved} does not exist.` };
  }

  const { kind } = loaded.value.modification;
  const payload = extractPayload(kind, loaded.value.body);
  if (payload === null) {
    return { id, kind, status: "error", message: `Modification "${id}" (${kind}) has no payload.` };
  }

  if (kind === "instructions") {
    return { id, kind, status: "agent_apply", steps: payload };
  }

  if (kind === "patch") {
    // Make the patch project-name-agnostic before applying.
    const src = loaded.value.modification.source_project_name;
    const patchText = src ? normalizeProjectName(payload, src, readProjectName(resolved)) : payload;

    const tmp = path.join(os.tmpdir(), `t-stack-manager-${id}.patch`);
    fs.writeFileSync(tmp, patchText.endsWith("\n") ? patchText : `${patchText}\n`, "utf8");
    try {
      await execa("git", ["-C", resolved, "apply", "--whitespace=nowarn", tmp]);
      fs.rmSync(tmp, { force: true });
      return { id, kind, status: "patched" };
    } catch (cause) {
      fs.rmSync(tmp, { force: true });
      return {
        id,
        kind,
        status: "agent_apply",
        diff: patchText,
        message: `Patch did not apply cleanly: ${String(cause)}`,
      };
    }
  }

  // kind === "script"
  const tmp = path.join(os.tmpdir(), `t-stack-manager-${id}.mjs`);
  fs.writeFileSync(tmp, payload, "utf8");
  try {
    await execa("node", [tmp], { cwd: resolved, stdio: ["inherit", "inherit", "inherit"] });
    fs.rmSync(tmp, { force: true });
    return { id, kind, status: "script_ran" };
  } catch (cause) {
    fs.rmSync(tmp, { force: true });
    return { id, kind, status: "error", message: `Script failed: ${String(cause)}` };
  }
}
