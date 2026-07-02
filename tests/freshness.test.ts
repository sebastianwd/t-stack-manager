import { describe, expect, it } from "vitest";
import { pickFreshVersion } from "../src/lib/freshness.js";
import { addCommand } from "../src/lib/install.js";

// Fixed "now" so the policy window is deterministic.
const NOW = Date.parse("2026-06-29T00:00:00Z");
const daysAgo = (n: number): string => new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();

describe("pickFreshVersion", () => {
  it("picks the newest version that is at least 7 days old", () => {
    const times = {
      created: daysAgo(900),
      modified: daysAgo(1),
      "1.0.0": daysAgo(400),
      "1.1.0": daysAgo(30),
      "1.2.0": daysAgo(10),
      "1.3.0": daysAgo(2), // too recent
    };
    expect(pickFreshVersion(times, NOW)).toBe("1.2.0");
  });

  it("ignores the created/modified keys", () => {
    const times = { created: daysAgo(1), modified: daysAgo(1), "2.0.0": daysAgo(20) };
    expect(pickFreshVersion(times, NOW)).toBe("2.0.0");
  });

  it("excludes prereleases", () => {
    const times = {
      "1.0.0": daysAgo(40),
      "2.0.0-beta.1": daysAgo(40),
    };
    expect(pickFreshVersion(times, NOW)).toBe("1.0.0");
  });

  it("returns null when every version is too recent", () => {
    const times = { "1.0.0": daysAgo(3), "1.1.0": daysAgo(1) };
    expect(pickFreshVersion(times, NOW)).toBeNull();
  });

  it("compares versions numerically, not lexically", () => {
    const times = {
      "9.0.0": daysAgo(20),
      "10.0.0": daysAgo(20),
      "2.0.0": daysAgo(20),
    };
    expect(pickFreshVersion(times, NOW)).toBe("10.0.0");
  });
});

describe("addCommand", () => {
  it("builds per package manager", () => {
    expect(addCommand("pnpm", ["zod@3.0.0"])).toEqual({ bin: "pnpm", args: ["add", "zod@3.0.0"] });
    expect(addCommand("npm", ["zod@3.0.0"])).toEqual({ bin: "npm", args: ["install", "zod@3.0.0"] });
    expect(addCommand("bun", ["zod@3.0.0"])).toEqual({ bin: "bun", args: ["add", "zod@3.0.0"] });
  });

  it("defaults unknown managers to pnpm", () => {
    expect(addCommand("weird", ["a@1"]).bin).toBe("pnpm");
  });
});
