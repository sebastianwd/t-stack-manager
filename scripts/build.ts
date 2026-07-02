/**
 * Assembles the per-harness skill bundle from skill/ + defaults/.
 * Run after `tsdown` (which compiles the CLI into dist/cli/).
 *
 * Phase 1: Claude Code only. Cursor output is added in Phase 3.
 *
 * Note: the `stacksmith` CLI and its bundled templates ship via the npm
 * package. The skill bundle only needs SKILL.md + reference/; it calls
 * `npx stacksmith`. The defaults are copied in for reference/visibility.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const claudeSkillDir = path.join(root, "dist", "claude-code", ".claude", "skills", "stacksmith");

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function main(): void {
  fs.rmSync(claudeSkillDir, { recursive: true, force: true });
  fs.mkdirSync(claudeSkillDir, { recursive: true });

  // SKILL.md
  fs.copyFileSync(path.join(root, "skill", "SKILL.md"), path.join(claudeSkillDir, "SKILL.md"));

  // reference/
  copyDir(path.join(root, "skill", "reference"), path.join(claudeSkillDir, "reference"));

  // defaults/ (reference copy; the CLI reads its own bundled defaults from the npm package)
  copyDir(path.join(root, "defaults"), path.join(claudeSkillDir, "defaults"));

  process.stderr.write(`Built Claude Code skill bundle at ${claudeSkillDir}\n`);
}

main();
