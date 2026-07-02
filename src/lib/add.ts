import fs from "node:fs";
import path from "node:path";
import { LibrarySchema } from "../schemas/library.js";
import { ModificationSchema } from "../schemas/modification.js";
import { SkillSchema } from "../schemas/skill.js";
import { TemplateSchema } from "../schemas/template.js";
import { packStoreDir, type Store } from "./packs.js";
import { fail, ok, type Result } from "./result.js";
import { parseFrontmatter } from "./storage.js";

const SCHEMAS = {
  templates: TemplateSchema,
  libraries: LibrarySchema,
  modifications: ModificationSchema,
  skills: SkillSchema,
} as const;

export interface ImportItem {
  store: Store;
  id: string;
  status: "imported" | "skipped" | "invalid";
  message?: string;
}

export interface AddResult {
  source: string;
  /** The pack the entries were imported into (a namespace, not merged with your own). */
  pack: string;
  items: ImportItem[];
}

type PackFile = { store: Store; filename: string; fetch: () => Promise<string> };

type Source =
  | { kind: "github"; owner: string; repo: string; ref: string }
  | { kind: "local"; dir: string };

/** A store markdown file at the pack root or under `.stacksmith/` (not nested elsewhere). */
function storeOfPath(p: string): Store | null {
  const m = p.match(/^(?:\.stacksmith\/)?(templates|libraries|modifications|skills)\/[^/]+\.md$/);
  return m ? (m[1] as Store) : null;
}

export function parseSource(source: string): Source | null {
  // github:owner/repo[@ref]
  const short = source.match(/^github:([^/]+)\/([^@/]+)(?:@(.+))?$/);
  if (short?.[1] && short[2]) {
    return { kind: "github", owner: short[1], repo: short[2], ref: short[3] ?? "main" };
  }

  // Normal GitHub URLs, including the browser /tree/<branch> form, optional .git,
  // an @ref suffix, and trailing slash / query / hash.
  const url = source.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/@]+?)(?:\.git)?(?:\/tree\/([^/?#]+))?(?:@(.+?))?\/?(?:[?#].*)?$/,
  );
  if (url?.[1] && url[2]) {
    return { kind: "github", owner: url[1], repo: url[2], ref: url[3] ?? url[4] ?? "main" };
  }

  if (fs.existsSync(source) && fs.statSync(source).isDirectory()) {
    return { kind: "local", dir: path.resolve(source) };
  }
  return null;
}

function localPackFiles(dir: string): PackFile[] {
  const files: PackFile[] = [];
  const bases = [dir, path.join(dir, ".stacksmith")];
  for (const base of bases) {
    for (const store of ["templates", "libraries", "modifications", "skills"] as const) {
      const sdir = path.join(base, store);
      if (!fs.existsSync(sdir)) continue;
      for (const f of fs.readdirSync(sdir).filter((x) => x.endsWith(".md"))) {
        const full = path.join(sdir, f);
        files.push({ store, filename: f, fetch: () => Promise.resolve(fs.readFileSync(full, "utf8")) });
      }
    }
  }
  return files;
}

async function githubPackFiles(owner: string, repo: string, ref: string): Promise<Result<PackFile[]>> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "stacksmith", Accept: "application/vnd.github+json" },
    });
  } catch (cause) {
    return fail("ADD_FETCH_FAILED", `Could not reach GitHub for ${owner}/${repo}: ${String(cause)}`);
  }
  if (!res.ok) {
    return fail(
      "ADD_FETCH_FAILED",
      `GitHub tree ${owner}/${repo}@${ref}: HTTP ${res.status}.`,
      "Check the owner/repo/ref (default ref is main; pass @master or @<branch> if different).",
    );
  }

  const data = (await res.json()) as { tree?: Array<{ path: string; type: string }> };
  const files: PackFile[] = [];
  for (const node of data.tree ?? []) {
    if (node.type !== "blob") continue;
    const store = storeOfPath(node.path);
    if (!store) continue;
    const filename = node.path.split("/").pop() ?? node.path;
    const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${node.path}`;
    files.push({
      store,
      filename,
      fetch: async () => {
        const r = await fetch(raw, { headers: { "User-Agent": "stacksmith" } });
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${raw}`);
        return r.text();
      },
    });
  }
  return ok(files);
}

function importEntry(
  file: PackFile,
  raw: string,
  pack: string,
  force: boolean,
  cwd?: string,
): ImportItem {
  const fallbackId = file.filename.replace(/\.md$/, "");
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    return { store: file.store, id: fallbackId, status: "invalid", message: "no YAML frontmatter" };
  }

  const validated = SCHEMAS[file.store].safeParse(parsed.frontmatter);
  if (!validated.success) {
    const message = validated.error.issues.map((i) => i.message).join("; ");
    return { store: file.store, id: fallbackId, status: "invalid", message };
  }

  const data = validated.data as { id?: string; name?: string };
  const id = data.id ?? data.name ?? fallbackId;
  const dest = path.join(packStoreDir(pack, file.store, cwd), `${id}.md`);
  if (fs.existsSync(dest) && !force) {
    return { store: file.store, id, status: "skipped" };
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, raw, "utf8");
  return { store: file.store, id, status: "imported" };
}

/** A safe pack folder name derived from the source (repo or dir basename). */
function defaultPackName(parsed: Source): string {
  const raw = parsed.kind === "github" ? parsed.repo : path.basename(parsed.dir);
  return raw.replace(/[^a-zA-Z0-9._-]/g, "-") || "imported";
}

/**
 * Fetch a whole pack (a set of store dirs) from a GitHub repo or local directory
 * and import its entries into user storage. Only fetches and writes files; it
 * never executes skill/modification steps, so it is safe against untrusted packs.
 */
export async function addPack(
  source: string,
  opts: { force?: boolean; name?: string; cwd?: string } = {},
): Promise<Result<AddResult>> {
  const parsed = parseSource(source);
  if (!parsed) {
    return fail(
      "ADD_BAD_SOURCE",
      `Unrecognized source "${source}".`,
      "Use github:owner/repo[@ref], a GitHub URL, or a local directory path.",
    );
  }

  let files: PackFile[];
  if (parsed.kind === "local") {
    files = localPackFiles(parsed.dir);
  } else {
    const found = await githubPackFiles(parsed.owner, parsed.repo, parsed.ref);
    if (!found.ok) return found;
    files = found.value;
  }

  if (files.length === 0) {
    return fail(
      "ADD_EMPTY",
      `No pack entries found at "${source}".`,
      "A pack has templates/libraries/modifications/skills dirs at its root or under .stacksmith/.",
    );
  }

  // Import into a named pack namespace, never merged with the default pack.
  const pack = opts.name ?? defaultPackName(parsed);
  const items: ImportItem[] = [];
  for (const file of files) {
    let raw: string;
    try {
      raw = await file.fetch();
    } catch (cause) {
      items.push({
        store: file.store,
        id: file.filename.replace(/\.md$/, ""),
        status: "invalid",
        message: `fetch failed: ${String(cause)}`,
      });
      continue;
    }
    items.push(importEntry(file, raw, pack, opts.force ?? false, opts.cwd));
  }

  return ok({ source, pack, items });
}
