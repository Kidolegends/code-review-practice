import { describe, expect, it } from 'vitest';
import * as buggy from './buggy';
import * as fixed from './fixed';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const user = (id: number) => ({ id, name: `user${id}`, email: `u${id}@example.com` });

// A fake server: id 2 does not exist, id 3 returns garbage, the rest are fine.
const fakeFetch = async (url: string): Promise<Response> => {
  const id = Number(url.split('/').pop());
  if (id === 2) return json({ error: 'not found' }, 404);
  if (id === 3) return json({ unexpected: true });
  return json(user(id));
};

describe('05 missing error handling: the bug (buggy.ts)', () => {
  it('treats a 404 error body as if it were a user', async () => {
    const result = await buggy.fetchUser(2, fakeFetch);
    expect(result).toEqual({ error: 'not found' }); // typed as User, but it is not one
  });

  it('crashes far away from the cause, with a confusing message', async () => {
    await expect(buggy.loadUserNames([1, 2, 4], fakeFetch)).rejects.toThrow(
      /Cannot read properties of undefined/,
    );
  });

  it('one bad id throws away every good result', async () => {
    let names: string[] | undefined;
    try {
      names = await buggy.loadUserNames([1, 2], fakeFetch);
    } catch {
      names = undefined;
    }
    expect(names).toBeUndefined(); // user1 was loaded fine and is lost
  });

  it('gives no hint where a settings file is broken', () => {
    expect(() => buggy.parseSettings('{oops')).toThrow(SyntaxError);
    expect(buggy.parseSettings('42')).toBe(42); // wrong shape accepted silently
  });
});

describe('05 missing error handling: the fix (fixed.ts)', () => {
  it('turns a 404 into an HttpError with the status', async () => {
    const error = await fixed.fetchUser(2, fakeFetch).catch((e) => e);
    expect(error).toBeInstanceOf(fixed.HttpError);
    expect(error.status).toBe(404);
  });

  it('rejects data with the wrong shape, naming the endpoint', async () => {
    await expect(fixed.fetchUser(3, fakeFetch)).rejects.toThrow(
      /\/users\/3 returned an unexpected shape/,
    );
  });

  it('reports a body that is not JSON', async () => {
    const notJson = async () => new Response('<html>oops</html>', { status: 200 });
    await expect(fixed.fetchUser(1, notJson)).rejects.toThrow(/not valid JSON/);
  });

  it('keeps the good users and lists the failures', async () => {
    const result = await fixed.loadUserNames([1, 2, 3, 4], fakeFetch);
    expect(result.names).toEqual(['USER1', 'USER4']);
    expect(result.errors.map((e) => e.id)).toEqual([2, 3]);
    expect(result.errors[0]?.reason).toMatch(/404/);
  });

  it('gives up on a request that never answers', async () => {
    const neverAnswers = (_url: string, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    await expect(fixed.fetchUser(1, neverAnswers, 20)).rejects.toThrow();
  });

  it('parseSettings explains what is wrong and refuses non-objects', () => {
    expect(() => fixed.parseSettings('{oops')).toThrow(/not valid JSON/);
    expect(() => fixed.parseSettings('42')).toThrow(/must be a JSON object/);
    expect(() => fixed.parseSettings('[1]')).toThrow(/must be a JSON object/);
    expect(fixed.parseSettings('{"theme":"dark"}')).toEqual({ theme: 'dark' });
  });
});
