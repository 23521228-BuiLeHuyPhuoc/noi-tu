import type { Server, Socket } from 'socket.io';
import type { AuthAck, ClientToServerEvents, GameType, ServerToClientEvents } from '../../shared/src/types';
import type { RoomManager } from './roomManager';
import { ACCOUNT_PREFIX, cleanName, type Room } from './room';
import { cleanFun, RateLimiter } from './fun';
import type { Auth } from './auth';
import type { UserRecord } from './store';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

export function broadcastRoom(io: IO, room: Room): void {
  io.to(room.code).emit('room:state', room.toPublic());
}

let funSeq = 0;

/** Gắn các xử lý sự kiện. Server là trọng tài duy nhất: mọi kiểm tra đều ở đây và trong Room/engine. */
export function attachSocketHandlers(io: IO, manager: RoomManager, auth: Auth): void {
  // socket đang đại diện cho mỗi người chơi ("CODE:playerId" -> socket.id)
  const activeSocket = new Map<string, string>();
  const key = (code: string, playerId: string) => `${code}:${playerId}`;

  io.on('connection', (socket: Sock) => {
    let session: { code: string; playerId: string } | null = null;
    let user: UserRecord | null = null;
    let token: string | null = null;
    const limiter = new RateLimiter();
    const chatLimiter = new RateLimiter(5, 1500);
    const authLimiter = new RateLimiter(6, 4000);

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

    const enter = (room: Room, name: unknown, playerId: unknown) => {
      // đã đăng nhập: luôn dùng id + tên + ảnh của tài khoản
      const wanted = user ? ACCOUNT_PREFIX + user.id : typeof playerId === 'string' ? playerId : undefined;
      const displayName = user ? user.displayName : name;
      // vào socket room trước để nhận được room:state ngay sau khi thêm người chơi
      socket.join(room.code);
      const res = room.addPlayer(displayName, wanted, user ? { avatar: user.avatar, account: true } : undefined);
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
      const res = enter(room, p.name, p.playerId);
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
      ack(enter(room, p.name, p.playerId));
    });

    socket.on('room:config', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      ack(room.configure(session.playerId, p.gameType, p.settings));
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

    // ném dép, khịa, hối, thả emoji, đánh nhau: phát cho cả phòng, có giới hạn tần suất chống spam
    socket.on('fun:send', (raw, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const room = currentRoom();
      const f = cleanFun(raw);
      if (!room || !session || !f) return reply({ ok: false });
      if ('to' in f && (!room.has(f.to) || f.to === session.playerId)) return reply({ ok: false });
      if (!limiter.take()) return reply({ ok: false });
      const extra = f.kind === 'hit' ? room.hp.hit(f.to, f.move) : {};
      io.to(room.code).emit('fun:event', { ...f, ...extra, id: ++funSeq, from: session.playerId });
      reply({ ok: true });
    });

    socket.on('chat:send', (p, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const room = currentRoom();
      if (!room || !session || !p || typeof p !== 'object') return reply({ ok: false });
      if (!chatLimiter.take()) return reply({ ok: false });
      const msg = room.addChat(session.playerId, p.text);
      if (!msg) return reply({ ok: false });
      io.to(room.code).emit('chat:msg', msg);
      reply({ ok: true });
    });

    // ---------- tài khoản ----------

    type AuthResult = { ack: AuthAck; user?: UserRecord };
    const handleAuth = (
      ack: unknown,
      run: () => Promise<AuthResult>,
      after?: (r: AuthResult) => void,
      limited = true,
    ) => {
      if (typeof ack !== 'function') return;
      const reply = ack as (r: AuthAck) => void;
      if (limited && !authLimiter.take()) return reply({ ok: false, error: 'rate_limited' });
      run()
        .then((r) => {
          if (r.ack.ok && r.user) {
            user = r.user;
            token = r.ack.token;
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
          if (r.ack.ok && room && session?.playerId === ACCOUNT_PREFIX + uid) {
            room.updateProfile(session.playerId, r.ack.user.displayName, r.ack.user.avatar);
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

    socket.on('disconnect', () => detach(false));
  });
}
