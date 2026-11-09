import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types';
import type { Dictionary } from './dictionary';
import { RoomManager, type RoomManagerOptions } from './roomManager';
import { attachSocketHandlers, broadcastRoom } from './socket';

export interface GameServer {
  http: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  manager: RoomManager;
  close: () => Promise<void>;
}

export function createGameServer(dict: Dictionary, opts: Omit<RoomManagerOptions, 'onRoomChange'> = {}): GameServer {
  const http = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, words: dict.size, rooms: manager.size }));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Nối Từ server đang chạy');
  });

  const io: GameServer['io'] = new Server(http, { cors: { origin: '*' } });
  const manager: RoomManager = new RoomManager(dict, { ...opts, onRoomChange: (room) => broadcastRoom(io, room) });
  attachSocketHandlers(io, manager);

  return {
    http,
    io,
    manager,
    close: () =>
      new Promise((resolve) => {
        manager.dispose();
        io.close(() => resolve());
      }),
  };
}
