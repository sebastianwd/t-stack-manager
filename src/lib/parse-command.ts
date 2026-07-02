import { type TemplateFlags, TemplateFlagsSchema } from "../schemas/template.js";
import { fail, ok, type Result } from "./result.js";

/**
 * Parse a better-t-stack command (or its `create-json --input` form) into
 * validated template flags. This is the heart of `stacksmith init`: rather than
 * rebuilding better-t-stack's option wizard, we consume the canonical command it
 * (or better-t-stack.dev) already produces.
 *
 * Pure and side-effect free so it can be unit-tested in isolation.
 */

export interface ParsedCommand {
  /** Project name positional, if present. Stripped from flags (set at scaffold time). */
  projectName?: string;
  /** Version pinned via `@<version>` on the package spec, if any (never "latest"/"next"). */
  version?: string;
  /** Validated better-t-stack create input, minus Stacksmith-owned fields. */
  flags: TemplateFlags;
}

/** Flags that take no value (bare `--git`, or `--no-git` for false). */
const BOOLEAN_FLAGS = new Set([
  "git",
  "install",
  "yes",
  "yolo",
  "dryRun",
  "verbose",
  "renderTitle",
  "disableAnalytics",
  "manualDb",
]);

/** Flags that accumulate multiple values (`--addons turborepo husky`). */
const ARRAY_FLAGS = new Set(["frontend", "addons", "examples"]);

/** Fields Stacksmith owns at scaffold time; never persisted in a template. */
const OWNED_FIELDS = ["projectName", "yes", "yolo", "dryRun"];

const toCamel = (s: string): string => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

/** Split a shell-ish command into tokens, honoring single and double quotes. */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let started = false;

  for (const ch of input) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      started = true;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      if (started) {
        tokens.push(cur);
        cur = "";
        started = false;
      }
      continue;
    }
    cur += ch;
    started = true;
  }
  if (started) tokens.push(cur);
  return tokens;
}

/** Locate the `create-better-t-stack@x` / `better-t-stack@x` package spec token. */
function findSpecIndex(tokens: string[]): number {
  return tokens.findIndex((t) => /better-t-stack(@.+)?$/.test(t));
}

function extractVersion(specToken: string | undefined): string | undefined {
  const m = specToken?.match(/better-t-stack@([^\s]+)$/);
  const v = m?.[1];
  if (!v || v === "latest" || v === "next") return undefined;
  return v;
}

function isFlag(token: string | undefined): boolean {
  return token !== undefined && token.startsWith("--");
}

/** Build the raw flag map from the flag/value tokens (everything after the project name). */
function parseFlagTokens(parts: string[]): Record<string, unknown> {
  const raw: Record<string, unknown> = {};

  for (let i = 0; i < parts.length; i++) {
    const tok = parts[i];
    if (tok === undefined || !tok.startsWith("--")) continue;

    let key = tok.slice(2);
    let inlineVal: string | undefined;
    const eq = key.indexOf("=");
    if (eq !== -1) {
      inlineVal = key.slice(eq + 1);
      key = key.slice(0, eq);
    }

    let negated = false;
    if (key.startsWith("no-")) {
      negated = true;
      key = key.slice(3);
    }
    const camel = toCamel(key);

    if (negated) {
      // `--no-git` -> false; `--no-database` -> "none" (let zod reject if invalid)
      raw[camel] = BOOLEAN_FLAGS.has(camel) ? false : "none";
      continue;
    }

    if (inlineVal !== undefined) {
      if (ARRAY_FLAGS.has(camel)) {
        const arr = (raw[camel] as string[]) ?? [];
        arr.push(...inlineVal.split(",").filter(Boolean));
        raw[camel] = arr;
      } else if (BOOLEAN_FLAGS.has(camel)) {
        raw[camel] = inlineVal === "true";
      } else {
        raw[camel] = inlineVal;
      }
      continue;
    }

    if (BOOLEAN_FLAGS.has(camel)) {
      raw[camel] = true;
      continue;
    }

    if (ARRAY_FLAGS.has(camel)) {
      const arr = (raw[camel] as string[]) ?? [];
      while (i + 1 < parts.length && !isFlag(parts[i + 1])) {
        arr.push(parts[++i] as string);
      }
      raw[camel] = arr;
      continue;
    }

    // scalar: take the single following value, else mark present (zod will flag)
    if (i + 1 < parts.length && !isFlag(parts[i + 1])) {
      raw[camel] = parts[++i];
    } else {
      raw[camel] = true;
    }
  }

  return raw;
}

function stripOwned(flags: Record<string, unknown>): Record<string, unknown> {
  const out = { ...flags };
  for (const k of OWNED_FIELDS) delete out[k];
  return out;
}

function validate(rawFlags: Record<string, unknown>): Result<TemplateFlags> {
  const parsed = TemplateFlagsSchema.safeParse(stripOwned(rawFlags));
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((iss) => `  - ${iss.path.join(".") || "(root)"}: ${iss.message}`)
      .join("\n");
    return fail(
      "PARSE_INVALID_FLAGS",
      `Parsed flags failed better-t-stack validation:\n${issues}`,
      "Check the command for typos, or that it targets the better-t-stack version Stacksmith was built against.",
    );
  }
  return ok(parsed.data);
}

/** Parse the agent-friendly `create-json --input '<json>'` form. */
function parseJsonForm(tokens: string[], version: string | undefined): Result<ParsedCommand> {
  let jsonStr: string | undefined;
  const idx = tokens.indexOf("--input");
  if (idx !== -1 && tokens[idx + 1] !== undefined) {
    jsonStr = tokens[idx + 1];
  } else {
    const inline = tokens.find((t) => t.startsWith("--input="));
    if (inline) jsonStr = inline.slice("--input=".length);
  }

  if (jsonStr === undefined) {
    return fail(
      "PARSE_NO_INPUT",
      "Found `create-json` but no `--input <json>` payload.",
      "Paste the full command including the --input argument.",
    );
  }

  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(jsonStr) as Record<string, unknown>;
  } catch (cause) {
    return fail("PARSE_BAD_JSON", `Could not parse --input JSON: ${String(cause)}`);
  }

  const projectName = typeof obj.projectName === "string" ? obj.projectName : undefined;
  const validated = validate(obj);
  if (!validated.ok) return validated;
  return ok({ projectName, version, flags: validated.value });
}

/**
 * Parse a pasted better-t-stack command into a validated, template-ready config.
 * Accepts both the flag form (`npx create-better-t-stack@x my-app --frontend ...`)
 * and the JSON form (`... create-json --input '{...}'`).
 */
export function parseBetterTCommand(input: string): Result<ParsedCommand> {
  const trimmed = input.trim();
  if (!trimmed) {
    return fail("PARSE_EMPTY", "No command provided.", "Pass the command via --from-command.");
  }

  const tokens = tokenize(trimmed);
  const specIdx = findSpecIndex(tokens);
  const version = extractVersion(specIdx === -1 ? undefined : tokens[specIdx]);

  // Tokens after the package spec (or all tokens if no spec was recognized).
  const rest = specIdx === -1 ? tokens : tokens.slice(specIdx + 1);

  if (rest.includes("create-json")) {
    return parseJsonForm(rest, version);
  }

  // Flag form: a leading non-flag token is the project name.
  let projectName: string | undefined;
  let flagParts = rest;
  if (rest.length > 0 && !isFlag(rest[0])) {
    projectName = rest[0];
    flagParts = rest.slice(1);
  }

  const validated = validate(parseFlagTokens(flagParts));
  if (!validated.ok) return validated;
  return ok({ projectName, version, flags: validated.value });
}
