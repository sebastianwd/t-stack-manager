import fs from "node:fs";
import path from "node:path";
import { logDir } from "./paths.js";
import type { ScaffoldLogEntry } from "../types.js";

/** Append one entry to <storage>/log/scaffolds.jsonl (creating dirs as needed). */
export function appendScaffoldLog(entry: ScaffoldLogEntry, cwd?: string): string {
  const dir = logDir(cwd);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "scaffolds.jsonl");
  fs.appendFileSync(file, `${JSON.stringify(entry)}\n`, "utf8");
  return file;
}
