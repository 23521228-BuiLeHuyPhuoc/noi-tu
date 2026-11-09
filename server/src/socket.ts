import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types';
import type { RoomManager } from './roomManager';
import { cleanName, type Room } from './room';

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

export function broadcastRoom(io: IO, room: Room): void {
  io.to(room.code).emit('room:state', room.toPublic());
}

/** Gắn các xử lý sự kiện. Server là trọng tài duy nhất: mọi kiểm tra đều ở đây và trong Room. */
export function attachSocketHandlers(io: IO, manager: RoomManager): void {
  // socket đang đại diện cho mỗi người chơi ("CODE:playerId" -> socket.id)
  const activeSocket = new Map<string, string>();
  const key = (code: string, playerId: string) => `${code}:${playerId}`;

  io.on('connection', (socket: Sock) => {
    let session: { code: string; playerId: string } | null = null;

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
      if (!room) return;
      if (remove) room.removePlayer(playerId);
      else if (activeSocket.get(key(code, playerId)) === socket.id) room.setConnected(playerId, false);
      if (activeSocket.get(key(code, playerId)) === socket.id) activeSocket.delete(key(code, playerId));
    };

    const enter = (room: Room, name: unknown, playerId: unknown) => {
      const wanted = typeof playerId === 'string' ? playerId : undefined;
      // vào socket room trước để nhận được room:state ngay sau khi thêm người chơi
      socket.join(room.code);
      const res = room.addPlayer(name, wanted);
      if (!res.ok) {
        socket.leave(room.code);
        return res;
      }
      session = { code: room.code, playerId: res.playerId };
      activeSocket.set(key(room.code, res.playerId), socket.id);
      // gửi riêng trạng thái hiện tại (trường hợp vào lại mà trạng thái không đổi)
      socket.emit('room:state', room.toPublic());
      return { ok: true as const, code: room.code, playerId: res.playerId };
    };

    socket.on('room:create', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      if (!cleanName(p.name)) return ack({ ok: false, error: 'invalid_name' });
      detach(true);
      ack(enter(manager.create(), p.name, p.playerId));
    });

    socket.on('room:join', (p, ack) => {
      if (typeof ack !== 'function') return;
      if (!p || typeof p !== 'object') return ack({ ok: false, error: 'bad_request' });
      const room = manager.get(p.code);
      if (!room) return ack({ ok: false, error: 'room_not_found' });
      if (session && (session.code !== room.code || session.playerId !== p.playerId)) detach(true);
      ack(enter(room, p.name, p.playerId));
    });

    socket.on('game:start', (ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, error: 'not_in_room' });
      ack(room.start(session.playerId));
    });

    socket.on('word:submit', (p, ack) => {
      if (typeof ack !== 'function') return;
      const room = currentRoom();
      if (!room || !session) return ack({ ok: false, reason: 'not_playing' });
      ack(room.submit(session.playerId, p?.word));
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

    socket.on('disconnect', () => detach(false));
  });
}
