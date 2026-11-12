import type { Server, Socket } from 'socket.io';
import type { AuthAck, ClientToServerEvents, GameType, ServerToClientEvents } from '../../shared/src/types';
import type { RoomManager } from './roomManager';
import { ACCOUNT_PREFIX, cleanName, type Room } from './room';
import { cleanFun, isDisruptive, isHardDisrupt, isScreenTroll, isTroll, pauseMsOf, RateLimiter, trollExtras, WindowLimiter } from './fun';
import type { Auth } from './auth';
import { PhotoService } from './avatar';
import { attachWalletHandlers, type WalletContext } from './wallet';
import { AVATAR_PRESETS } from '../../shared/src/avatars';
import type { UserRecord } from './store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

export function broadcastRoom(io: IO, room: Room): void {
  io.to(room.code).emit('room:state', room.toPublic());
}

let funSeq = 0;

/** Gắn các xử lý sự kiện. Server là trọng tài duy nhất: mọi kiểm tra đều ở đây và trong Room/engine. */
export function attachSocketHandlers(io: IO, manager: RoomManager, auth: Auth, photos: PhotoService = new PhotoService(), walletCtx?: WalletContext): void {
  // socket đang đại diện cho mỗi người chơi ("CODE:playerId" -> socket.id)
  const activeSocket = new Map<string, string>();
  const key = (code: string, playerId: string) => `${code}:${playerId}`;

  io.on('connection', (socket: Sock) => {
    let session: { code: string; playerId: string } | null = null;
    let user: UserRecord | null = null;
    let token: string | null = null;
    const limiter = new RateLimiter();
    const chatLimiter = new RateLimiter(5, 1500);
    // chọc mất dạy: tối đa 4 lần liền, hồi 1 lần mỗi 3 giây
    const trollLimiter = new RateLimiter(4, 3000);
    // chiêu rung/xoay/sụp nguồn/gián/mực/hối: mỗi người gửi tối đa 3 lần mỗi 15 giây
    const disruptSender = new WindowLimiter();
    const authLimiter = new RateLimiter(6, 4000);
    const photoLimiter = new RateLimiter(2, 8000);
    const profileLimiter = new RateLimiter(8, 2000);
    /** gốc địa chỉ server (cho ảnh khách giữ trong bộ nhớ) */
    const origin = () => {
      const h = socket.handshake.headers;
      const proto = String(h['x-forwarded-proto'] ?? '').split(',')[0].trim() || (socket.handshake.secure ? 'https' : 'http');
      return `${proto}://${h.host ?? 'localhost'}`;
    };

    const currentRoom = (): Room | undefined => {
      if (!session) return undefined;
      const room = manager.get(session.code);
      return room && room.has(session.playerId) ? room : undefined;
    };

    const detach = (remove: boolean) => {
      if (!session) return;
      const { code, playerId } = session;
      socket.leave(code);
      session = null;
      const room = manager.get(code);
      const mine = activeSocket.get(key(code, playerId)) === socket.id;
      if (mine) activeSocket.delete(key(code, playerId));
      if (!room) return;
      if (remove) room.removePlayer(playerId);
      else if (mine) room.setConnected(playerId, false);
    };

    const enter = (room: Room, name: unknown, playerId: unknown, guest: { avatar?: unknown; avatarUrl?: unknown } = {}) => {
      // đã đăng nhập: luôn dùng id + tên + ảnh của tài khoản
      const wanted = user ? ACCOUNT_PREFIX + user.id : typeof playerId === 'string' ? playerId : undefined;
      const displayName = user ? user.displayName : name;
      // khách: mặt đại diện đã chọn và ảnh đã tải lên trước đó (chỉ nhận ảnh do server này cấp)
      const guestAvatar = Number.isInteger(guest.avatar) && (guest.avatar as number) >= 0 && (guest.avatar as number) < AVATAR_PRESETS.length
        ? (guest.avatar as number) : undefined;
      const guestUrl = photos.trusted(guest.avatarUrl) ? guest.avatarUrl : undefined;
      // vào socket room trước để nhận được room:state ngay sau khi thêm người chơi
      socket.join(room.code);
      const res = room.addPlayer(displayName, wanted, user
        ? { avatar: user.avatar, avatarUrl: user.avatarUrl, account: true }
        : { avatar: guestAvatar, avatarUrl: guestUrl });
      if (!res.ok) {
        socket.leave(room.code);
        return res;
      }
      session = { code: room.code, playerId: res.playerId };
      activeSocket.set(key(room.code, res.playerId), socket.id);
      socket.emit('room:state', room.toPublic());
      socket.emit('chat:history', room.chatLog);
      return { ok: true as const, code: room.code, playerId: res.playerId };
    };

    socket.on('room:create', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      if (!user && !cleanName(p.name)) return ack({ ok: false, error: 'invalid_name' });
      detach(true);
      const room = manager.create();
      const res = enter(room, p.name, p.playerId, p);
      if (res.ok && p.gameType) room.configure(res.playerId, p.gameType as GameType);
      ack(res);
    });

    socket.on('room:join', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      const room = manager.get(p.code);
      if (!room) return ack({ ok: false, error: 'room_not_found' });
      const me = user ? ACCOUNT_PREFIX + user.id : p.playerId;
      if (session && (session.code !== room.code || session.playerId !== me)) detach(true);
      ack(enter(room, p.name, p.playerId, p));
    });

    // đổi tên / mặt đại diện ngay trong phòng (khách) — được cả khi đang chơi
    socket.on('player:profile', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      if (!p || typeof p !== 'object' || user) return ack({ ok: false, error: 'bad_request' });
      if (!profileLimiter.take()) return ack({ ok: false, error: 'bad_request' });
      const avatar = Number.isInteger(p.avatar) && p.avatar! >= 0 && p.avatar! < AVATAR_PRESETS.length ? p.avatar : undefined;
      if (p.avatar !== undefined && avatar === undefined) return ack({ ok: false, error: 'bad_request' });
      const ok = room.patchProfile(session.playerId, { name: p.name, avatar, explicit: avatar !== undefined });
      ack(ok ? { ok: true } : { ok: false, error: 'invalid_name' });
    });

    // ảnh đại diện của khách (hoặc tài khoản khi server chưa có kho ảnh lâu dài): tải ở trang chủ hay giữa ván đều được
    socket.on('player:photo', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'invalid_image' });
      const room = currentRoom();
      const playerId = session?.playerId;
      if (p.remove === true) {
        if (room && playerId) room.patchProfile(playerId, { avatarUrl: null });
        return ack({ ok: true });
      }
      if (!photoLimiter.take()) return ack({ ok: false, error: 'rate_limited' });
      const img = PhotoService.decode(p.data);
      if (!img) return ack({ ok: false, error: 'invalid_image' });
      photos.saveGuest(img, origin()).then(
        (avatarUrl) => {
          if (room && playerId) manager.get(room.code)?.patchProfile(playerId, { avatarUrl });
          ack({ ok: true, avatarUrl });
        },
        () => ack({ ok: false, error: 'avatar_unavailable' }),
      );
    });

    socket.on('room:config', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      ack(room.configure(session.playerId, p.gameType, p.settings));
    });

    socket.on('player:customize', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      ack(room.customize(session.playerId, p));
    });

    socket.on('game:start', (ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      ack(room.start(session.playerId));
    });

    socket.on('game:action', (a, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, reason: 'not_playing' });
      ack(room.action(session.playerId, a));
    });

    socket.on('game:restart', (ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      ack(room.restart(session.playerId));
    });

    socket.on('room:leave', (ack) => {
      detach(true);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('room:visibility', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      ack(room.setPublic(session.playerId, p && typeof p === 'object' ? p.public : undefined));
    });

    // chủ phòng mời một người ra: báo riêng cho máy người đó rồi cho rời kênh của phòng
    socket.on('room:kick', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      const target = p && typeof p === 'object' ? p.playerId : undefined;
      const res = room.kick(session.playerId, target);
      if (res.ok && typeof target === 'string') {
        const k = key(room.code, target);
        const sid = activeSocket.get(k);
        activeSocket.delete(k);
        const s = sid ? io.sockets.sockets.get(sid) : undefined;
        if (s) {
          s.emit('room:kicked', { code: room.code });
          s.leave(room.code);
        }
      }
      ack(res);
    });

    // ném dép, khịa, hối, thả emoji, đánh nhau: phát cho cả phòng, có giới hạn tần suất chống spam
    socket.on('fun:send', (raw, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const room = currentRoom();
      const f = cleanFun(raw);
      if (!room || !session || !f || room.isSpectator(session.playerId)) return reply({ ok: false });
      if ('to' in f && (!room.has(f.to) || f.to === session.playerId)) return reply({ ok: false });
      if (!limiter.take()) return reply({ ok: false, reason: 'busy' });
      // chiêu làm rung/lắc/che màn hình: mỗi người chỉ nhận 3 lần mỗi 15 giây, mỗi người gửi 3 lần mỗi 15 giây.
      // Quá giới hạn: chiêu chỉ để phá (rung, xoay, sụp nguồn, gián, mực, hối) bị chặn; đánh/ném vẫn bay tới avatar nhưng không rung màn hình.
      const target = 'to' in f ? f.to : null;
      const disruptive = target !== null && isDisruptive(f);
      const hard = isHardDisrupt(f.kind);
      let soft = false;
      if (disruptive) {
        const wait = room.disruptLimiter.wait(target);
        if (hard) {
          const retryMs = Math.max(wait, disruptSender.wait('me'));
          if (retryMs > 0) return reply({ ok: false, reason: 'limited', retryMs });
        } else soft = wait > 0;
      }
      if (isTroll(f.kind)) {
        if (!trollLimiter.take()) return reply({ ok: false, reason: 'busy' });
        if (isScreenTroll(f.kind) && target && !room.screenCooldown.take(target)) return reply({ ok: false, reason: 'busy' });
      }
      if (disruptive && !soft) {
        room.disruptLimiter.take(target);
        if (hard) disruptSender.take('me');
      }
      const extra = f.kind === 'hit' ? room.hp.hit(f.to, f.move) : trollExtras(f);
      // người đang tới lượt Nối từ được bù lại thời gian bị phá
      const pausedMs = disruptive && !soft ? room.disrupt(target, pauseMsOf(f, extra)) : 0;
      io.to(room.code).emit('fun:event', {
        ...f, ...extra, ...(soft ? { soft: true } : {}), ...(pausedMs ? { pausedMs } : {}), id: ++funSeq, from: session.playerId,
      });
      reply({ ok: true });
    });

    socket.on('chat:send', (p, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const room = currentRoom();
      if (!room || !session || !p || typeof p !== 'object' || room.isSpectator(session.playerId)) return reply({ ok: false });
      if (!chatLimiter.take()) return reply({ ok: false });
      const msg = room.addChat(session.playerId, p);
      if (!msg) return reply({ ok: false });
      io.to(room.code).emit('chat:msg', msg);
      reply({ ok: true });
    });

    // ---------- tài khoản ----------

    type AuthResult = { ack: AuthAck | { ok: true }; user?: UserRecord };
    const handleAuth = (
      ack: unknown,
      run: () => Promise<AuthResult>,
      after?: (r: AuthResult) => void,
      limited = true,
    ) => {
      if (typeof ack !== 'function') return;
      const reply = ack as (r: AuthResult['ack']) => void;
      if (limited && !authLimiter.take()) return reply({ ok: false, error: 'rate_limited' });
      run()
        .then((r) => {
          if (r.ack.ok && r.user) {
            user = r.user;
            token = 'token' in r.ack ? r.ack.token : token;
          }
          after?.(r);
          reply(r.ack);
        })
        .catch((e) => {
          console.error('auth error', e);
          reply({ ok: false, error: 'server_error' });
        });
    };

    socket.on('auth:register', (p, ack) => handleAuth(ack, () => auth.register(p ?? {})));
    socket.on('auth:forgot', (p, ack) => handleAuth(ack, () => auth.forgot(p)));
    socket.on('auth:reset', (p, ack) => handleAuth(ack, () => auth.reset(p)));
    socket.on('auth:setEmail', (p, ack) => handleAuth(ack, () => user && token ? auth.setEmail(user.id, token, p) : Promise.resolve({ ack: { ok: false, error: 'session_expired' } })));
    socket.on('auth:changePassword', (p, ack) => handleAuth(ack, () => user && token ? auth.changePassword(user.id, token, p) : Promise.resolve({ ack: { ok: false, error: 'session_expired' } })));
    socket.on('auth:login', (p, ack) => handleAuth(ack, () => auth.login(p ?? {})));
    socket.on('auth:resume', (p, ack) => handleAuth(ack, () => auth.resume(p?.token), undefined, false));

    socket.on('auth:update', (p, ack) => {
      if (!user || !token) {
        if (typeof ack === 'function') ack({ ok: false, error: 'session_expired' });
        return;
      }
      const uid = user.id;
      const tk = token;
      handleAuth(
        ack,
        () => auth.update(uid, tk, p ?? {}),
        (r) => {
          const room = currentRoom();
          if (r.ack.ok && 'user' in r.ack && room && session?.playerId === ACCOUNT_PREFIX + uid) {
            // chính người chơi vừa chọn mặt mới: áp nhân vật theo mặt đó ngay (kể cả đang chơi)
            room.updateProfile(session.playerId, r.ack.user.displayName, r.ack.user.avatar, r.ack.user.avatarUrl, p?.avatar !== undefined);
          }
        },
      );
    });

    socket.on('auth:logout', (ack) => {
      const tk = token;
      user = null;
      token = null;
      // đăng xuất thì rời phòng (id người chơi gắn với tài khoản)
      detach(true);
      const done = () => typeof ack === 'function' && ack({ ok: true });
      if (tk) auth.logout(tk).then(done, done);
      else done();
    });

    const profileChanged = (updated: UserRecord) => {
      if (user?.id !== updated.id) return;
      user = updated;
      const room = currentRoom();
      if (room && session?.playerId === ACCOUNT_PREFIX + updated.id)
        room.updateProfile(session.playerId, updated.displayName, updated.avatar, updated.avatarUrl);
    };
    auth.profiles.on('updated', profileChanged);
    // ví Ruby + quản trị
    const detachWallet = walletCtx ? attachWalletHandlers(socket, walletCtx, () => user) : () => {};
    socket.on('disconnect', () => { auth.profiles.off('updated', profileChanged); detachWallet(); detach(false); });
  });
}
