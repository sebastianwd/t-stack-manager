import { execa } from "execa";
import { fail, ok, type Result } from "./result.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function semverParts(v: string): [number, number, number] {
  const p = v.split(".");
  return [
    Number.parseInt(p[0] ?? "0", 10) || 0,
    Number.parseInt(p[1] ?? "0", 10) || 0,
    Number.parseInt(p[2] ?? "0", 10) || 0,
  ];
}

/** Descending by major.minor.patch (build metadata ignored). */
function compareSemverDesc(a: string, b: string): number {
  const pa = semverParts(a);
  const pb = semverParts(b);
  for (let i = 0; i < 3; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Pick the newest stable version that was published at least `minAgeDays` ago,
 * from an `npm view <pkg> time` map (version -> ISO timestamp, plus
 * created/modified keys). Prereleases are excluded. Returns null when every
 * version is too recent (supply-chain freshness policy).
 *
 * Pure and time-injectable, so it is unit-testable without the network.
 */
export function pickFreshVersion(
  times: Record<string, string>,
  now: number,
  minAgeDays = 7,
): string | null {
  const cutoff = now - minAgeDays * DAY_MS;
  const candidates = Object.entries(times)
    .filter(([v]) => v !== "created" && v !== "modified")
    .filter(([v]) => !v.includes("-")) // drop prereleases (1.0.0-beta.1)
    .filter(([, ts]) => {
      const t = Date.parse(ts);
      return Number.isFinite(t) && t <= cutoff;
    })
    .map(([v]) => v);

  if (candidates.length === 0) return null;
  candidates.sort(compareSemverDesc);
  return candidates[0] ?? null;
}

export interface FreshVersion {
  package: string;
  version: string;
}

/**
 * Resolve a package to the newest version that satisfies the freshness policy,
 * by querying the npm registry's publish times. `now` is injectable for tests.
 */
export async function resolveFreshVersion(
  pkg: string,
  now: number = Date.now(),
  minAgeDays = 7,
): Promise<Result<FreshVersion>> {
  let raw: string;
  try {
    const r = await execa("npm", ["view", pkg, "time", "--json"]);
    raw = r.stdout;
  } catch (cause) {
    return fail(
      "FRESH_RESOLVE_FAILED",
      `Could not query the registry for "${pkg}": ${String(cause)}`,
      "Check the package name and network connectivity.",
    );
  }

  let times: Record<string, string>;
  try {
    times = JSON.parse(raw) as Record<string, string>;
  } catch (cause) {
    return fail("FRESH_BAD_REGISTRY", `Unexpected registry output for "${pkg}": ${String(cause)}`);
  }

  const version = pickFreshVersion(times, now, minAgeDays);
  if (!version) {
    return fail(
      "FRESH_NONE",
      `No version of "${pkg}" is at least ${minAgeDays} days old.`,
      "Every published version is too recent; surface this to the user rather than installing an unvetted release.",
    );
  }
  return ok({ package: pkg, version });
}
