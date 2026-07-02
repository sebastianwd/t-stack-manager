import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installSkill } from "../src/lib/skill-install.js";
import { saveSkill } from "../src/lib/skills.js";
import type { Skill } from "../src/schemas/skill.js";

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "stacksmith-skillinstall-"));
  fs.mkdirSync(path.join(tmp, ".stacksmith", "skills"), { recursive: true });
  process.env.STACKSMITH_HOME = path.join(tmp, ".stacksmith");
});

afterEach(() => {
  delete process.env.STACKSMITH_HOME;
  fs.rmSync(tmp, { recursive: true, force: true });
});

function skill(over: Partial<Skill>): Skill {
  return {
    id: "s",
    description: "",
    category: "",
    url: "",
    bts_source: "",
    agents: ["claude-code"],
    install: [],
    license: "",
    ...over,
  };
}

describe("installSkill", () => {
  it("does not run shell steps without execute (needs_consent, trust gate)", async () => {
    saveSkill(skill({ id: "imp", install: [{ run: "node --version" }] }), "b");
    const result = await installSkill("imp");
    expect(result.status).toBe("needs_consent");
    expect(result.steps[0]?.status).toBe("needs_consent");
  });

  it("runs a shell step when execute is true", async () => {
    saveSkill(skill({ id: "imp", install: [{ run: "node --version" }] }), "b");
    const result = await installSkill("imp", { execute: true });
    expect(result.status).toBe("installed");
    expect(result.steps[0]?.status).toBe("ran");
  });

  it("reports a failed shell step", async () => {
    saveSkill(skill({ id: "boom", install: [{ run: "node -e \"process.exit(1)\"" }] }), "b");
    const result = await installSkill("boom", { execute: true });
    expect(result.status).toBe("failed");
    expect(result.steps[0]?.status).toBe("failed");
  });

  it("surfaces slash/note steps for the agent, never runs them", async () => {
    saveSkill(
      skill({
        id: "orpc",
        install: [
          { slash: "/plugin marketplace add vcode-sh/vibe-tools" },
          { slash: "/plugin install orpc-guide@vibe-tools" },
        ],
      }),
      "b",
    );
    const result = await installSkill("orpc", { execute: true });
    expect(result.status).toBe("agent_steps");
    expect(result.steps.every((s) => s.status === "agent")).toBe(true);
  });

  it("stops running after a failure and flags the rest for consent", async () => {
    saveSkill(
      skill({ id: "seq", install: [{ run: "node -e \"process.exit(1)\"" }, { run: "node --version" }] }),
      "b",
    );
    const result = await installSkill("seq", { execute: true });
    expect(result.status).toBe("failed");
    expect(result.steps[0]?.status).toBe("failed");
    expect(result.steps[1]?.status).toBe("needs_consent");
  });

  it("substitutes {{dlx}} for the package manager (portable recipe)", async () => {
    saveSkill(skill({ id: "intent", install: [{ run: "{{dlx}} @tanstack/intent@latest install" }] }), "b");
    const plan = await installSkill("intent", { packageManager: "pnpm" });
    expect(plan.status).toBe("needs_consent");
    expect(plan.steps[0]?.value).toBe("pnpm dlx @tanstack/intent@latest install");
  });

  it("returns none for a bts-native / reference-only skill, error for missing", async () => {
    saveSkill(skill({ id: "shadcn", bts_source: "shadcn/ui" }), "b");
    expect((await installSkill("shadcn")).status).toBe("none");
    expect((await installSkill("ghost")).status).toBe("error");
  });
});
