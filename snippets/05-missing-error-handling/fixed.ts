// Loads users from a REST API and builds a display list.

export interface User {
  id: number;
  name: string;
  email: string;
}

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>;

/** Thrown when the server answers with a non-2xx status. Callers can inspect `status`. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string' && typeof v.email === 'string';
}

export async function fetchUser(
  id: number,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 5000,
): Promise<User> {
  // Without a timeout, one stuck connection can hang the caller forever.
  const res = await fetchImpl(`https://api.example.com/users/${id}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new HttpError(res.status, `GET /users/${id} failed with status ${res.status}`);
  }
  const body: unknown = await res.json().catch(() => {
    throw new Error(`GET /users/${id} returned a body that is not valid JSON`);
  });
  // Never trust data from the network: check its shape before using it.
  if (!isUser(body)) {
    throw new Error(`GET /users/${id} returned an unexpected shape`);
  }
  return body;
}

export interface LoadResult {
  names: string[];
  errors: { id: number; reason: string }[];
}

/** One bad user no longer throws away the good ones: we report both. */
export async function loadUserNames(
  ids: number[],
  fetchImpl: FetchLike = fetch,
): Promise<LoadResult> {
  const settled = await Promise.allSettled(ids.map((id) => fetchUser(id, fetchImpl)));
  const result: LoadResult = { names: [], errors: [] };
  settled.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      result.names.push(outcome.value.name.toUpperCase());
    } else {
      const reason =
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
      result.errors.push({ id: ids[index] as number, reason });
    }
  });
  return result;
}

/** Returns the parsed settings, or a clear error that names what went wrong. */
export function parseSettings(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`Settings file is not valid JSON: ${(error as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Settings must be a JSON object');
  }
  return parsed as Record<string, unknown>;
}
