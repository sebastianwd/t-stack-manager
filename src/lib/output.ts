import type { TStackManagerError } from "./result.js";

/** Machine JSON goes to stdout; human text goes to stderr. */
export function emitJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export function emitError(json: boolean, error: TStackManagerError): void {
  if (json) {
    emitJson({ ok: false, error });
    return;
  }
  process.stderr.write(`Error [${error.code}]: ${error.message}\n`);
  if (error.hint) process.stderr.write(`Hint: ${error.hint}\n`);
}
