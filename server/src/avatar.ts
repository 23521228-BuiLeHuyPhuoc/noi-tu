import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import type { Express, Request } from 'express';
import multer from 'multer';
import type { Auth } from './auth';
import { toPublic, type Store, type UserRecord } from './store';

const MAX_BYTES = 5 * 1024 * 1024;
const UPLOAD_COOLDOWN_MS = 10_000;
const MAX_CONCURRENT_UPLOADS = 6;

export interface AvatarUploader {
  upload(data: Buffer, userId: string): Promise<{ secure_url: string; public_id: string }>;
  destroy?(publicId: string): Promise<void>;
  /** địa chỉ ảnh do chính kho này cấp (để khách gửi lại ảnh cũ khi vào phòng mới) */
  isOwnUrl?(url: string): boolean;
}

export function cloudinaryUploader(env = process.env): AvatarUploader | undefined {
  const { CLOUDINARY_CLOUD_NAME: cloud_name, CLOUDINARY_API_KEY: api_key, CLOUDINARY_API_SECRET: api_secret } = env;
  if (!cloud_name || !api_key || !api_secret) return undefined;
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  return {
    upload: (data, userId) => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: 'xomlay/avatars',
        public_id: userId,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'auto' }],
      }, (error, result) => error || !result ? reject(error ?? new Error('Missing upload result')) : resolve(result));
      stream.end(data);
    }),
    destroy: async (publicId) => {
      await cloudinary.uploader.destroy(publicId, { invalidate: true, resource_type: 'image' });
    },
    isOwnUrl: (url) => url.startsWith(`https://res.cloudinary.com/${cloud_name}/image/upload/`) && url.includes('/xomlay/avatars/'),
  };
}

/** ảnh đại diện của khách: tối đa 400 KB (app đã thu nhỏ về 256x256 trước khi gửi) */
const GUEST_MAX_BYTES = 400 * 1024;
const MEM_MAX_PHOTOS = 100;

/**
 * Ảnh đại diện cho khách (không cần tài khoản), đổi được ở bất cứ đâu kể cả giữa ván.
 * Có Cloudinary thì lưu ở đó (mỗi máy một ô, ghi đè); không có thì giữ tạm trong bộ nhớ server (mất khi khởi động lại).
 */
export class PhotoService {
  private readonly mem = new Map<string, { data: Buffer; type: string }>();
  private readonly issued = new Set<string>();
  constructor(private readonly uploader?: AvatarUploader) {}

  /** giải mã + kiểm tra ảnh base64 (có thể kèm tiền tố data:image/...;base64,) */
  static decode(raw: unknown): { data: Buffer; type: string } | null {
    if (typeof raw !== 'string' || raw.length > GUEST_MAX_BYTES * 1.4 + 100) return null;
    const b64 = raw.replace(/^data:image\/[a-z+]+;base64,/i, '');
    if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
    const data = Buffer.from(b64, 'base64');
    if (data.length < 64 || data.length > GUEST_MAX_BYTES) return null;
    const type = imageType(data);
    return type ? { data, type } : null;
  }

  /**
   * lưu ảnh của khách; `origin` = gốc địa chỉ server (cho ảnh giữ trong bộ nhớ).
   * Mỗi lần tải dùng một tên ngẫu nhiên: mã người chơi lộ trong trạng thái phòng nên không dùng làm tên ảnh
   * (tránh người khác ghi đè ảnh của mình).
   */
  async saveGuest(img: { data: Buffer; type: string }, origin: string): Promise<string> {
    const slot = 'guest-' + randomUUID();
    if (this.uploader) {
      const r = await this.uploader.upload(img.data, slot);
      if (!r.secure_url.startsWith('https://')) throw new Error('Invalid upload URL');
      this.issued.add(r.secure_url);
      return r.secure_url;
    }
    const id = `${slot}-${Date.now().toString(36)}`;
    this.mem.set(id, img);
    while (this.mem.size > MEM_MAX_PHOTOS) this.mem.delete(this.mem.keys().next().value!);
    const url = `${origin.replace(/\/$/, '')}/api/img/${id}`;
    this.issued.add(url);
    return url;
  }

  /** địa chỉ ảnh có phải do server này cấp không (khách gửi lại khi vào phòng khác) */
  trusted(url: unknown): url is string {
    if (typeof url !== 'string' || url.length > 300 || !/^https?:\/\//.test(url)) return false;
    if (this.issued.has(url)) {
      const m = /\/api\/img\/([\w-]+)$/.exec(url);
      return !m || this.mem.has(m[1]);
    }
    return this.uploader?.isOwnUrl?.(url) ?? false;
  }

  attach(app: Express): void {
    app.get('/api/img/:id', (req, res) => {
      const img = this.mem.get(String(req.params.id));
      if (!img) { res.status(404).end(); return; }
      res.setHeader('Content-Type', img.type);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(img.data);
    });
  }
}

function imageType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function bearer(req: Request): string | undefined {
  return /^Bearer ([^ ]+)$/i.exec(req.headers.authorization ?? '')?.[1];
}

export function attachAvatarRoute(app: Express, store: Store, auth: Auth, uploader?: AvatarUploader): void {
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } }).single('avatar');
  const inFlight = new Set<string>();
  const lastAttempt = new Map<string, number>();
  let activeUploads = 0;

  const authenticate = async (req: Request): Promise<UserRecord | null> => {
    const session = await auth.resume(bearer(req));
    return session.user ?? null;
  };

  app.post('/api/avatar', async (req, res) => {
    try {
      const sessionUser = await authenticate(req);
      if (!sessionUser) { res.status(401).json({ ok: false, error: 'session_expired' }); return; }
      if (!uploader) { res.status(503).json({ ok: false, error: 'avatar_unavailable' }); return; }
      const now = Date.now();
      const retryMs = UPLOAD_COOLDOWN_MS - (now - (lastAttempt.get(sessionUser.id) ?? 0));
      if (retryMs > 0 || inFlight.has(sessionUser.id) || activeUploads >= MAX_CONCURRENT_UPLOADS) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(Math.max(retryMs, 1000) / 1000))));
        res.status(429).json({ ok: false, error: 'avatar_rate_limited' });
        return;
      }

      inFlight.add(sessionUser.id);
      activeUploads++;
      lastAttempt.set(sessionUser.id, now);
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        inFlight.delete(sessionUser.id);
        activeUploads--;
      };

      upload(req, res, async (error) => {
        if (error) {
          release();
          res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ ok: false, error: 'invalid_image' });
          return;
        }
        if (!req.file) {
          release();
          res.status(400).json({ ok: false, error: 'invalid_image' });
          return;
        }
        if (imageType(req.file.buffer) !== req.file.mimetype || !['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
          release();
          res.status(415).json({ ok: false, error: 'invalid_image' });
          return;
        }
        try {
          const result = await uploader.upload(req.file.buffer, sessionUser.id);
          if (!result.secure_url.startsWith('https://')) throw new Error('Invalid upload URL');
          const user = await store.updateUser(sessionUser.id, { avatarUrl: result.secure_url, avatarPublicId: result.public_id });
          if (!user) { res.status(401).json({ ok: false, error: 'session_expired' }); return; }
          auth.profiles.emit('updated', user);
          res.json({ ok: true, user: toPublic(user) });
        } catch {
          res.status(502).json({ ok: false, error: 'avatar_upload_failed' });
        } finally {
          release();
        }
      });
    } catch {
      res.status(500).json({ ok: false, error: 'server_error' });
    }
  });

  app.delete('/api/avatar', async (req, res) => {
    let lockedUserId: string | null = null;
    try {
      const sessionUser = await authenticate(req);
      if (!sessionUser) { res.status(401).json({ ok: false, error: 'session_expired' }); return; }
      if (inFlight.has(sessionUser.id)) {
        res.setHeader('Retry-After', '1');
        res.status(429).json({ ok: false, error: 'avatar_busy' });
        return;
      }
      inFlight.add(sessionUser.id);
      lockedUserId = sessionUser.id;
      const user = await store.updateUser(sessionUser.id, { avatarUrl: null, avatarPublicId: null });
      if (!user) { res.status(401).json({ ok: false, error: 'session_expired' }); return; }
      if (sessionUser.avatarPublicId && uploader?.destroy) {
        try { await uploader.destroy(sessionUser.avatarPublicId); } catch { /* The profile no longer references the old asset. */ }
      }
      auth.profiles.emit('updated', user);
      res.json({ ok: true, user: toPublic(user) });
    } catch {
      res.status(500).json({ ok: false, error: 'server_error' });
    } finally {
      if (lockedUserId) inFlight.delete(lockedUserId);
    }
  });
}
