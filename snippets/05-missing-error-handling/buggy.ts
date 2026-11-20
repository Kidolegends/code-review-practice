// Loads users from a REST API and builds a display list.

export interface User {
  id: number;
  name: string;
  email: string;
}

type FetchLike = (url: string) => Promise<Response>;

export async function fetchUser(id: number, fetchImpl: FetchLike = fetch): Promise<User> {
  const res = await fetchImpl(`https://api.example.com/users/${id}`);
  return res.json();
}

export async function loadUserNames(
  ids: number[],
  fetchImpl: FetchLike = fetch,
): Promise<string[]> {
  const names: string[] = [];
  for (const id of ids) {
    const user = await fetchUser(id, fetchImpl);
    names.push(user.name.toUpperCase());
  }
  return names;
}

export function parseSettings(text: string): Record<string, unknown> {
  return JSON.parse(text);
}
