import { describe, expect, it } from "vitest";
import { parseBetterTCommand } from "../src/lib/parse-command.js";

describe("parseBetterTCommand - flag form", () => {
  it("parses a full command, strips the project name, pins the version", () => {
    const cmd =
      "npx create-better-t-stack@3.30.3 my-app --frontend tanstack-start --backend hono --runtime workers --database sqlite --orm drizzle --api orpc --package-manager pnpm --db-setup d1 --web-deploy cloudflare --install --git";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.projectName).toBe("my-app");
    expect(result.value.version).toBe("3.30.3");
    expect(result.value.flags.frontend).toEqual(["tanstack-start"]);
    expect(result.value.flags.backend).toBe("hono");
    expect(result.value.flags.packageManager).toBe("pnpm");
    expect(result.value.flags.dbSetup).toBe("d1");
    expect(result.value.flags.webDeploy).toBe("cloudflare");
    expect(result.value.flags.install).toBe(true);
    expect(result.value.flags.git).toBe(true);
  });

  it("does not persist T Stack Manager-owned fields", () => {
    const cmd = "npx create-better-t-stack@3.30.3 my-app --yes --backend hono";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("yes" in result.value.flags).toBe(false);
    expect("projectName" in result.value.flags).toBe(false);
  });

  it("collects multiple values into array flags", () => {
    const cmd = "npx create-better-t-stack@3.30.3 my-app --addons turborepo husky --backend hono";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.flags.addons).toEqual(["turborepo", "husky"]);
  });

  it("supports the --flag=value form and comma-separated arrays", () => {
    const cmd =
      "npx create-better-t-stack@3.30.3 my-app --backend=hono --frontend=tanstack-start,tanstack-router";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.flags.backend).toBe("hono");
    expect(result.value.flags.frontend).toEqual(["tanstack-start", "tanstack-router"]);
  });

  it("treats --no-<bool> as false and --no-<enum> as none", () => {
    const cmd = "npx create-better-t-stack@3.30.3 my-app --no-install --no-git --no-database";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.flags.install).toBe(false);
    expect(result.value.flags.git).toBe(false);
    expect(result.value.flags.database).toBe("none");
  });

  it("leaves version undefined for @latest", () => {
    const cmd = "npx create-better-t-stack@latest my-app --backend hono";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBeUndefined();
  });

  it("rejects an invalid enum value", () => {
    const cmd = "npx create-better-t-stack@3.30.3 my-app --backend not-a-backend";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PARSE_INVALID_FLAGS");
  });

  it("errors on empty input", () => {
    const result = parseBetterTCommand("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PARSE_EMPTY");
  });

  it("round-trips a real better-t-stack reproducible_command", () => {
    // Captured verbatim from a live `scaffold --dry-run` (also the shape
    // better-t-stack.dev emits): scalars, arrays, and a --no-<bool> flag.
    const cmd =
      "npx create-better-t-stack@latest demo-app --frontend tanstack-router --backend none --runtime bun --database none --orm drizzle --api trpc --auth better-auth --payments none --addons turborepo --examples none --db-setup none --web-deploy none --server-deploy none --git --package-manager npm --no-install";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.version).toBeUndefined(); // @latest -> default
    expect(result.value.flags.frontend).toEqual(["tanstack-router"]);
    expect(result.value.flags.addons).toEqual(["turborepo"]);
    expect(result.value.flags.examples).toEqual(["none"]);
    expect(result.value.flags.runtime).toBe("bun");
    expect(result.value.flags.packageManager).toBe("npm");
    expect(result.value.flags.git).toBe(true);
    expect(result.value.flags.install).toBe(false);
  });
});

describe("parseBetterTCommand - create-json form", () => {
  it("parses the agent JSON form and strips owned fields", () => {
    const input = JSON.stringify({
      projectName: "my-app",
      frontend: ["tanstack-start"],
      backend: "hono",
      dryRun: true,
    });
    const cmd = `npx create-better-t-stack@3.30.3 create-json --input '${input}'`;
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.projectName).toBe("my-app");
    expect(result.value.version).toBe("3.30.3");
    expect(result.value.flags.backend).toBe("hono");
    expect("dryRun" in result.value.flags).toBe(false);
  });

  it("errors when create-json has no --input", () => {
    const cmd = "npx create-better-t-stack@3.30.3 create-json";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PARSE_NO_INPUT");
  });

  it("errors on malformed JSON", () => {
    const cmd = "npx create-better-t-stack@3.30.3 create-json --input '{not json}'";
    const result = parseBetterTCommand(cmd);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("PARSE_BAD_JSON");
  });
});
