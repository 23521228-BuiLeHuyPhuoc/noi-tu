import { EventEmitter } from 'node:events';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { AuthAck, AuthError } from '../../shared/src/types';
import { AVATAR_PRESETS } from '../../shared/src/avatars';
import { cleanName } from './room';
import { toPublic, type Store, type UserRecord } from './store';

const KEYLEN = 64;

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, KEYLEN, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<{ passHash: string; salt: string }> {
  const salt = randomBytes(16).toString('hex');
  return { passHash: (await scryptAsync(password, salt)).toString('hex'), salt };
}

export async function verifyPassword(password: string, u: Pick<UserRecord, 'passHash' | 'salt'>): Promise<boolean> {
  const got = await scryptAsync(password, u.salt);
  const want = Buffer.from(u.passHash, 'hex');
  return want.length === got.length && timingSafeEqual(got, want);
}

export function cleanUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const u = raw.trim().toLowerCase();
  return /^[a-z0-9_.]{3,20}$/.test(u) ? u : null;
}

const okPassword = (p: unknown): p is string => typeof p === 'string' && p.length >= 6 && p.length <= 72;
const okAvatar = (a: unknown): a is number => Number.isInteger(a) && (a as number) >= 0 && (a as number) < AVATAR_PRESETS.length;

const fail = (error: AuthError): AuthAck => ({ ok: false, error });

/** Các thao tác tài khoản; trả về kết quả gửi cho app kèm bản ghi người dùng (nếu thành công) */
export class Auth {
  readonly profiles = new EventEmitter().setMaxListeners(0);
  constructor(private readonly store: Store) {}

  async register(p: { username?: unknown; password?: unknown; displayName?: unknown; avatar?: unknown }) {
    const username = cleanUsername(p.username);
    if (!username) return { ack: fail('invalid_username') };
    if (!okPassword(p.password)) return { ack: fail('invalid_password') };
    const displayName = cleanName(p.displayName);
    if (!displayName) return { ack: fail('invalid_name') };
    const avatar = okAvatar(p.avatar) ? p.avatar : Math.floor(Math.random() * 16);
    const user = await this.store.createUser({ username, displayName, avatar, ...(await hashPassword(p.password)) });
    if (!user) return { ack: fail('username_taken') };
    return this.session(user);
  }

  async login(p: { username?: unknown; password?: unknown }) {
    const username = cleanUsername(p.username);
    if (!username || typeof p.password !== 'string') return { ack: fail('wrong_credentials') };
    const user = await this.store.userByName(username);
    if (!user || !(await verifyPassword(p.password, user))) return { ack: fail('wrong_credentials') };
    return this.session(user);
  }

  async resume(token: unknown) {
    if (typeof token !== 'string' || token.length < 32) return { ack: fail('session_expired') };
    const user = await this.store.userBySession(token);
    if (!user) return { ack: fail('session_expired') };
    return { ack: { ok: true, token, user: toPublic(user) } as AuthAck, user };
  }

  async update(userId: string, token: string, p: { displayName?: unknown; avatar?: unknown }) {
    const patch: { displayName?: string; avatar?: number } = {};
    if (p.displayName !== undefined) {
      const n = cleanName(p.displayName);
      if (!n) return { ack: fail('invalid_name') };
      patch.displayName = n;
    }
    if (p.avatar !== undefined) {
      if (!okAvatar(p.avatar)) return { ack: fail('server_error') };
      patch.avatar = p.avatar;
    }
    const user = await this.store.updateUser(userId, patch);
    if (!user) return { ack: fail('session_expired') };
    return { ack: { ok: true, token, user: toPublic(user) } as AuthAck, user };
  }

  logout(token: string) {
    return this.store.deleteSession(token);
  }

  private async session(user: UserRecord) {
    const token = await this.store.createSession(user.id);
    return { ack: { ok: true, token, user: toPublic(user) } as AuthAck, user };
  }
}
