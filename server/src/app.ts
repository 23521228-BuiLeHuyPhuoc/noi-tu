import express from 'express';
import { attachAvatarRoute, cloudinaryUploader, PhotoService, type AvatarUploader } from './avatar';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/src/types';
import type { Dictionary } from './dictionary';
import { RoomManager, type RoomManagerOptions } from './roomManager';
import { attachSocketHandlers, broadcastRoom } from './socket';
import { Auth } from './auth';
import { ACCOUNT_PREFIX } from './room';
import { MemoryStore, type Store } from './store';

export interface GameServer {
  http: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  manager: RoomManager;
  store: Store;
  close: () => Promise<void>;
}

export interface GameServerOptions extends Omit<RoomManagerOptions, 'onRoomChange'> {
  /** nơi lưu tài khoản và từ mới; mặc định lưu trong bộ nhớ */
  store?: Store;
  avatarUploader?: AvatarUploader;
}

export function createGameServer(dict: Dictionary, opts: GameServerOptions = {}): GameServer {
  const store = opts.store ?? new MemoryStore();
  const logErr = (what: string) => (e: unknown) => console.error(what, e);

  const auth = new Auth(store);
  const app = express();
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  const avatarUploader = opts.avatarUploader ?? cloudinaryUploader();
  attachAvatarRoute(app, store, auth, avatarUploader);
  const photos = new PhotoService(avatarUploader);
  photos.attach(app);
  app.get('/health', (_req, res) => res.json({
    ok: true, words: dict.size, wordsEn: dict.en?.size ?? 0, rooms: manager.size, db: store.kind,
    // avatarUploads: ảnh tài khoản lưu lâu dài (Cloudinary); photoUploads: khách tải ảnh được (bộ nhớ tạm nếu thiếu Cloudinary)
    avatarUploads: !!avatarUploader, photoUploads: true,
  }));
  app.get('/', (_req, res) => res.type('text').send('Nối Từ server đang chạy'));
  const http = createServer(app);

  const io: GameServer['io'] = new Server(http, { cors: { origin: '*' } });
  const manager: RoomManager = new RoomManager(dict, {
    ...opts,
    room: {
      ...opts.room,
      // cộng thành tích cho người chơi có tài khoản
      onFinish: ({ gameType, participants, winnerId }) => {
        const ids = participants.filter((id) => id.startsWith(ACCOUNT_PREFIX)).map((id) => id.slice(ACCOUNT_PREFIX.length));
        const winner = winnerId?.startsWith(ACCOUNT_PREFIX) ? winnerId.slice(ACCOUNT_PREFIX.length) : null;
        if (ids.length) store.recordGame(ids, gameType, winner).catch(logErr('recordGame'));
      },
      // từ được cả phòng duyệt: dùng được ngay và lưu vào CSDL
      learnWord: (word, byName) => {
        const w = dict.add(word) ?? dict.en?.add(word) ?? null;
        if (w) store.addWord(w, byName).catch(logErr('addWord'));
      },
    },
    onRoomChange: (room) => broadcastRoom(io, room),
  });
  attachSocketHandlers(io, manager, auth, photos);

  return {
    http,
    io,
    manager,
    store,
    close: () =>
      new Promise((resolve) => {
        manager.dispose();
        io.close(() => resolve());
      }),
  };
}
