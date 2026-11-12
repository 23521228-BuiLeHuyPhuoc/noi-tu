import express from 'express';
import { attachAvatarRoute, cloudinaryUploader, PhotoService, type AvatarUploader } from './avatar';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { GAME_INFO, type ClientToServerEvents, type GameType, type ServerToClientEvents } from '../../shared/src/types';
import type { Dictionary } from './dictionary';
import { RoomManager, type RoomManagerOptions } from './roomManager';
import { attachSocketHandlers, broadcastRoom } from './socket';
import { Auth } from './auth';
import { ACCOUNT_PREFIX } from './room';
import { MemoryStore, MongoStore, type Store } from './store';
import { MongoWalletStore, type WalletStore } from './walletStore';
import { WalletEvents } from './wallet';

/** ví Ruby theo nơi lưu tài khoản: MongoDB thì dùng chung kết nối, bộ nhớ thì dùng chung bảng người dùng */
function walletFor(store: Store): WalletStore {
  if (store instanceof MongoStore) {
    const w = new MongoWalletStore(store.database);
    w.init().catch((e) => console.error('wallet indexes', e));
    return w;
  }
  if (store instanceof MemoryStore) return store.wallet();
  throw new Error('Store không hỗ trợ ví Ruby');
}
import { debugMailer, gmailMailer, type Mailer } from './mailer';

export interface GameServer {
  http: HttpServer;
  io: Server<ClientToServerEvents, ServerToClientEvents>;
  manager: RoomManager;
  store: Store;
  /** ví Ruby (dùng chung nơi lưu với tài khoản) */
  wallet: WalletStore;
  close: () => Promise<void>;
}

export interface GameServerOptions extends Omit<RoomManagerOptions, 'onRoomChange'> {
  /** nơi lưu tài khoản và từ mới; mặc định lưu trong bộ nhớ */
  store?: Store;
  avatarUploader?: AvatarUploader;
  mailer?: Mailer | null;
  /** ví Ruby; mặc định theo `store` (bộ nhớ hoặc MongoDB) */
  wallet?: WalletStore;
}

export function createGameServer(dict: Dictionary, opts: GameServerOptions = {}): GameServer {
  const store = opts.store ?? new MemoryStore();
  const wallet: WalletStore = opts.wallet ?? walletFor(store);
  const mailer = opts.mailer === null ? undefined : opts.mailer ?? gmailMailer() ?? debugMailer();
  const logErr = (what: string) => (e: unknown) => console.error(what, e);

  const auth = new Auth(store, mailer);
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
    avatarUploads: !!avatarUploader, photoUploads: true, mail: !!mailer,
  }));
  // sảnh: các phòng công khai đang mở, để vào chơi cùng người khác
  app.get('/api/rooms', (_req, res) => res.json({ ok: true, rooms: manager.listPublic() }));
  // bảng xếp hạng số lần thắng (?game=<loại game> hoặc all)
  app.get('/api/leaderboard', (req, res) => {
    const g = String(req.query.game ?? 'all');
    const game = g === 'all' ? null : (Object.keys(GAME_INFO) as GameType[]).find((x) => x === g);
    if (game === undefined) {
      res.status(400).json({ ok: false });
      return;
    }
    store.leaderboard(game, 20).then(
      (rows) => res.json({ ok: true, rows: rows.map((r, i) => ({ ...r, rank: i + 1 })) }),
      (e) => {
        logErr('leaderboard')(e);
        res.status(500).json({ ok: false });
      },
    );
  });
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
  attachSocketHandlers(io, manager, auth, photos, { wallet, store, events: new WalletEvents() });

  return {
    http,
    io,
    manager,
    store,
    wallet,
    close: () =>
      new Promise((resolve) => {
        manager.dispose();
        io.close(() => resolve());
      }),
  };
}
