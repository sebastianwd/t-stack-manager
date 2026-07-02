import path from "node:path";
import { execa } from "execa";
import { stepKind } from "../schemas/skill.js";
import { detectPackageManager, substituteRunner } from "./runner.js";
import { loadSkill } from "./skills.js";

export interface SkillStepResult {
  type: "run" | "slash" | "note";
  value: string;
  /**
   * - `ran`/`failed`: a `run` step the CLI executed.
   * - `needs_consent`: a `run` step not executed (no --yes), or skipped after a failure.
   * - `agent`: a `slash`/`note` step the CLI cannot run; the agent must.
   */
  status: "ran" | "failed" | "needs_consent" | "agent";
  message?: string;
}

export interface SkillInstallResult {
  id: string;
  /**
   * - `installed`: all steps were `run` and succeeded.
   * - `needs_consent`: `run` steps remain to execute (re-run with --yes after showing the user).
   * - `agent_steps`: `slash`/`note` steps remain for the agent.
   * - `failed`: a `run` step errored.
   * - `none`: nothing to install (bts-native or reference-only).
   * - `error`: the skill could not be loaded.
   */
  status: "installed" | "needs_consent" | "agent_steps" | "failed" | "none" | "error";
  steps: SkillStepResult[];
  message?: string;
}

function computeStatus(steps: SkillStepResult[]): SkillInstallResult["status"] {
  if (steps.some((s) => s.status === "failed")) return "failed";
  if (steps.some((s) => s.status === "needs_consent")) return "needs_consent";
  if (steps.some((s) => s.status === "agent")) return "agent_steps";
  return "installed";
}

/**
 * Execute a skill's install recipe. `run` (shell) steps run ONLY when
 * `execute` is true (the trust gate: they execute third-party code). `slash`
 * and `note` steps are always surfaced for the agent, the CLI cannot run them.
 */
export async function installSkill(
  id: string,
  opts: { targetDir?: string; execute?: boolean; packageManager?: string; cwd?: string } = {},
): Promise<SkillInstallResult> {
  const loaded = loadSkill(id, opts.cwd);
  if (!loaded.ok) return { id, status: "error", steps: [], message: loaded.error.message };

  const targetDir = opts.targetDir ? path.resolve(opts.targetDir) : process.cwd();
  // Adapt portable {{dlx}}/{{pm}} placeholders to this project's package manager.
  const pm = opts.packageManager ?? detectPackageManager(targetDir);
  const steps = loaded.value.skill.install.map(stepKind).map((s) => ({
    ...s,
    value: substituteRunner(s.value, pm),
  }));
  if (steps.length === 0) {
    const bts = loaded.value.skill.bts_source;
    return {
      id,
      status: "none",
      steps: [],
      message: bts
        ? `bts-native skill; encode "${bts}" in the template's better-t-stack skills addon.`
        : "No install steps (reference-only).",
    };
  }

  const results: SkillStepResult[] = [];
  let failed = false;

  for (const step of steps) {
    if (step.type === "slash" || step.type === "note") {
      results.push({ ...step, status: "agent" });
      continue;
    }
    // run step
    if (!opts.execute) {
      results.push({ ...step, status: "needs_consent" });
      continue;
    }
    if (failed) {
      results.push({ ...step, status: "needs_consent", message: "skipped after an earlier failure" });
      continue;
    }
    try {
      await execa(step.value, { cwd: targetDir, shell: true, stdio: ["inherit", "inherit", "inherit"] });
      results.push({ ...step, status: "ran" });
    } catch (cause) {
      failed = true;
      results.push({ ...step, status: "failed", message: String(cause) });
    }
  }

  return { id, status: computeStatus(results), steps: results };
}
