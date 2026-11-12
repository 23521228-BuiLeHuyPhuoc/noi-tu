import { describe, expect, it } from 'vitest';
import { MemoryStore, toPublic, type UserRecord } from '../src/store';

describe('account storage', () => {
  const input = (username: string, email?: string) => ({ username, email, displayName: username, avatar: 0, passHash: 'old', salt: 'salt' });

  it('stores unique emails and usernames and updates credentials', async () => {
    const store = new MemoryStore();
    const an = await store.createUser(input('an', 'an@gmail.com')) as UserRecord;
    await store.createUser(input('binh', 'binh@gmail.com'));
    expect(await store.userByEmail('an@gmail.com')).toEqual(an);
    expect(await store.createUser(input('other', 'an@gmail.com'))).toBe('email_taken');
    expect(await store.createUser(input('an', 'new@gmail.com'))).toBe('username_taken');
    expect(await store.setEmail(an.id, 'binh@gmail.com')).toBe('taken');
    expect(await store.setEmail(an.id, 'new@gmail.com')).toBe('ok');
    expect(toPublic((await store.userById(an.id))!).email).toBe('new@gmail.com');
    expect(await store.userByEmail('an@gmail.com')).toBeNull();
    await store.setPassword(an.id, 'new-hash', 'new-salt');
    expect(await store.userById(an.id)).toMatchObject({ passHash: 'new-hash', salt: 'new-salt' });
  });

  it('revokes other sessions and can revoke all sessions', async () => {
    const store = new MemoryStore();
    const an = await store.createUser(input('an')) as UserRecord;
    const other = await store.createUser(input('other')) as UserRecord;
    const tokens = await Promise.all([store.createSession(an.id), store.createSession(an.id), store.createSession(an.id)]);
    const otherToken = await store.createSession(other.id);
    await store.deleteSessionsExcept(an.id, tokens[1]);
    expect(await Promise.all(tokens.map(t => store.userBySession(t)))).toEqual([null, an, null]);
    expect(await store.userBySession(otherToken)).toEqual(other);
    await store.deleteSessionsExcept(an.id);
    expect(await store.userBySession(tokens[1])).toBeNull();
  });

  it('replaces resets, counts attempts, and atomically consumes a reset once', async () => {
    const store = new MemoryStore();
    const record = { userId: 'an', codeHash: 'hash', expiresAt: new Date(Date.now() + 600000), attempts: 0, sentAt: [new Date()] };
    await store.saveReset(record);
    expect(await store.getReset('an')).toEqual(record);
    expect(await store.bumpResetAttempts('an')).toBe(1);
    expect(await store.bumpResetAttempts('an')).toBe(2);
    expect((await store.getReset('an'))?.attempts).toBe(2);
    await store.saveReset({ ...record, codeHash: 'replacement' });
    expect((await store.getReset('an'))?.codeHash).toBe('replacement');
    expect(await store.deleteReset('an')).toBe(true);
    expect(await store.deleteReset('an')).toBe(false);
    expect(await store.getReset('an')).toBeNull();
  });
});
