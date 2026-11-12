import { EventEmitter } from 'node:events';
import { randomBytes, randomInt, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import type { AuthAck, AuthError } from '../../shared/src/types';
import { resetMail, type Mailer } from './mailer';
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

export function cleanEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const email = raw.trim().toLowerCase();
  return email.length >= 6 && email.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null;
}
const payload = (raw: unknown): Record<string, unknown> => raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
const codeHash = (id: string, code: string) => createHash('sha256').update(id + ':' + code).digest();
const okPassword = (p: unknown): p is string => typeof p === 'string' && p.length >= 6 && p.length <= 72;
const okAvatar = (a: unknown): a is number => Number.isInteger(a) && (a as number) >= 0 && (a as number) < AVATAR_PRESETS.length;

const fail = (error: AuthError): AuthAck => ({ ok: false, error });

/** Các thao tác tài khoản; trả về kết quả gửi cho app kèm bản ghi người dùng (nếu thành công) */
export class Auth {
  readonly profiles = new EventEmitter().setMaxListeners(0);
  constructor(private readonly store: Store, private readonly mailer?: Mailer) {}

  async register(raw: unknown) {
    const p = payload(raw);
    const username = cleanUsername(p.username);
    if (!username) return { ack: fail('invalid_username') };
    if (!okPassword(p.password)) return { ack: fail('invalid_password') };
    const displayName = cleanName(p.displayName);
    if (!displayName) return { ack: fail('invalid_name') };
    const email = cleanEmail(p.email);
    if (!email) return { ack: fail('invalid_email') };
    const avatar = okAvatar(p.avatar) ? p.avatar : Math.floor(Math.random() * 16);
    const user = await this.store.createUser({ username, email, displayName, avatar, ...(await hashPassword(p.password)) });
    if (typeof user === 'string') return { ack: fail(user) };
    return this.session(user);
  }

  async login(raw: unknown) {
    const p = payload(raw);
    const username = typeof p.username === 'string' && p.username.includes('@') ? cleanEmail(p.username) : cleanUsername(p.username);
    if (!username || typeof p.password !== 'string') return { ack: fail('wrong_credentials') };
    const user = await (username.includes('@') ? this.store.userByEmail(username) : this.store.userByName(username));
    if (!user || !(await verifyPassword(p.password, user))) return { ack: fail('wrong_credentials') };
    return this.session(user);
  }

  async resume(token: unknown) {
    if (typeof token !== 'string' || token.length < 32) return { ack: fail('session_expired') };
    const user = await this.store.userBySession(token);
    if (!user) return { ack: fail('session_expired') };
    return { ack: { ok: true, token, user: toPublic(user) } as AuthAck, user };
  }

  async update(userId: string, token: string, raw: unknown) {
    if ((await this.store.userBySession(token))?.id !== userId) return { ack: fail('session_expired') };
    const p = payload(raw);
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

  private async find(who: unknown) {
    const name = typeof who === 'string' && who.includes('@') ? cleanEmail(who) : cleanUsername(who);
    if (!name) return undefined;
    return name.includes('@') ? this.store.userByEmail(name) : this.store.userByName(name);
  }

  async forgot(raw: unknown): Promise<{ ack: { ok: true } | { ok: false; error: 'mail_disabled' | 'invalid_username' } }> {
    if (!this.mailer) return { ack: { ok: false, error: 'mail_disabled' } };
    const user = await this.find(payload(raw).who);
    if (user === undefined) return { ack: { ok: false, error: 'invalid_username' } };
    if (user?.email) {
      const now = new Date();
      const sentAt = await this.store.reserveResetSend(user.id, now);
      if (sentAt) {
        const code = randomInt(1000000).toString().padStart(6, '0');
        await this.store.saveReset({ userId: user.id, generation: randomBytes(16).toString('hex'), codeHash: codeHash(user.id, code).toString('hex'), expiresAt: new Date(+now + 600000), attempts: 0, sentAt });
        const mail = resetMail(user.displayName, code);
        void Promise.resolve().then(() => this.mailer!.send(user.email!, mail.subject, mail.text, mail.html)).catch(console.error);
      }
    }
    return { ack: { ok: true } };
  }

  async reset(raw: unknown) {
    const p = payload(raw);
    if (!okPassword(p.password)) return { ack: fail('invalid_password') };
    const user = await this.find(p.who);
    if (!user) return { ack: fail('code_expired') };
    const reset = await this.store.getReset(user.id);
    if (!reset || !reset.generation) return { ack: fail('code_expired') };
    if (+reset.expiresAt <= Date.now()) { await this.store.deleteReset(user.id, reset.generation); return { ack: fail('code_expired') }; }
    if (typeof p.code !== 'string' || !/^\d{6}$/.test(p.code) || !timingSafeEqual(codeHash(user.id, p.code), Buffer.from(reset.codeHash, 'hex'))) {
      const attempts = await this.store.bumpResetAttempts(user.id, reset.generation, new Date());
      if (attempts >= 5 || attempts === 0) { await this.store.deleteReset(user.id, reset.generation); return { ack: fail('code_expired') }; }
      return { ack: fail('bad_code') };
    }
    // Chỉ dùng đúng thế hệ đã đọc, còn hạn và chưa đủ năm lần sai.
    if (!(await this.store.consumeReset(user.id, reset.generation, new Date()))) return { ack: fail('code_expired') };
    const hash = await hashPassword(p.password);
    await this.store.setPassword(user.id, hash.passHash, hash.salt);
    await this.store.deleteSessionsExcept(user.id);
    return this.session({ ...user, ...hash });
  }

  async setEmail(id: string, token: string, raw: unknown) {
    if ((await this.store.userBySession(token))?.id !== id) return { ack: fail('session_expired') };
    const email = cleanEmail(payload(raw).email);
    if (!email) return { ack: fail('invalid_email') };
    if (await this.store.setEmail(id, email) === 'taken') return { ack: fail('email_taken') };
    const user = (await this.store.userById(id))!;
    return { ack: { ok: true, token, user: toPublic(user) } as AuthAck, user };
  }

  async changePassword(id: string, token: string, raw: unknown) {
    const user = await this.store.userBySession(token);
    if (!user || user.id !== id) return { ack: fail('session_expired') };
    const p = payload(raw);
    if (!okPassword(p.password)) return { ack: fail('invalid_password') };
    if (typeof p.oldPassword !== 'string' || !(await verifyPassword(p.oldPassword, user))) return { ack: fail('wrong_credentials') };
    const hash = await hashPassword(p.password);
    await this.store.setPassword(id, hash.passHash, hash.salt);
    await this.store.deleteReset(id);
    await this.store.deleteSessionsExcept(id, token);
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
