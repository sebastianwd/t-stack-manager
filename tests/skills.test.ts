import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { listSkills, loadSkill, planSkill, saveSkill } from "../src/lib/skills.js";
import type { Skill } from "../src/schemas/skill.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-skill-test-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "skills"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function skill(over: Partial<Skill>): Skill {
  return {
    id: "impeccable",
    description: "design system skill",
    category: "design",
    url: "https://impeccable.style",
    bts_source: "",
    agents: ["claude-code"],
    install: [{ run: "npx impeccable install" }],
    license: "",
    ...over,
  };
}

describe("saveSkill + loadSkill", () => {
  it("round-trips a skill with an install recipe and a url", () => {
    expect(saveSkill(skill({}), "what it teaches").ok).toBe(true);
    const loaded = loadSkill("impeccable");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.skill.url).toBe("https://impeccable.style");
      expect(loaded.value.skill.install).toEqual([{ run: "npx impeccable install" }]);
    }
  });

  it("preserves multi-step ordered installs (marketplace add then plugin install)", () => {
    const orpc = skill({
      id: "orpc-guide",
      category: "framework",
      url: "",
      install: [
        { slash: "/plugin marketplace add vcode-sh/vibe-tools" },
        { slash: "/plugin install orpc-guide@vibe-tools" },
      ],
    });
    saveSkill(orpc, "b");
    const loaded = loadSkill("orpc-guide");
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.skill.install).toEqual([
        { slash: "/plugin marketplace add vcode-sh/vibe-tools" },
        { slash: "/plugin install orpc-guide@vibe-tools" },
      ]);
    }
  });

  it("refuses to overwrite without force", () => {
    saveSkill(skill({}), "b");
    const again = saveSkill(skill({}), "b");
    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("SKILL_EXISTS");
  });
});

describe("listSkills", () => {
  it("filters by category and reports step counts", () => {
    saveSkill(skill({ id: "my-design", category: "design" }), "b");
    saveSkill(skill({ id: "orpc-guide", category: "framework", install: [{ slash: "/x" }, { slash: "/y" }] }), "b");
    // the package also ships bundled default skills, so assert containment
    expect(listSkills({ category: "design" }).skills.map((s) => s.id)).toContain("my-design");
    const orpc = listSkills({ category: "framework" }).skills.find((s) => s.id === "orpc-guide");
    expect(orpc?.install_steps).toBe(2);
  });
});

describe("planSkill", () => {
  it("returns the ordered steps as agent_install", () => {
    saveSkill(
      skill({
        id: "orpc-guide",
        install: [{ slash: "/plugin marketplace add vcode-sh/vibe-tools" }, { slash: "/plugin install orpc-guide@vibe-tools" }],
      }),
      "b",
    );
    const plan = planSkill("orpc-guide");
    expect(plan.action).toBe("agent_install");
    expect(plan.steps).toEqual([
      { type: "slash", value: "/plugin marketplace add vcode-sh/vibe-tools" },
      { type: "slash", value: "/plugin install orpc-guide@vibe-tools" },
    ]);
  });

  it("routes a bts-native skill with no steps to better-t-stack", () => {
    saveSkill(skill({ id: "shadcn", install: [], bts_source: "shadcn/ui" }), "b");
    expect(planSkill("shadcn").action).toBe("via_better_t_stack");
  });

  it("routes a reference-only skill to none, missing to error", () => {
    saveSkill(skill({ id: "ref-only", install: [], url: "https://x" }), "b");
    expect(planSkill("ref-only").action).toBe("none");
    expect(planSkill("ghost").action).toBe("error");
  });
});
