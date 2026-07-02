export interface TStackManagerError {
  code: string;
  message: string;
  hint?: string;
}

export type Result<T, E = TStackManagerError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const fail = (
  code: string,
  message: string,
  hint?: string,
): Result<never, TStackManagerError> => ({
  ok: false,
  error: hint ? { code, message, hint } : { code, message },
});
