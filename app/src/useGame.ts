import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack, ActionResult, AuthAck, ChatMsg, ClientToServerEvents, FunEvent, FunSend, GameAction, GameType, JoinResult,
  PublicUser, RoomSettings, RoomState, ServerToClientEvents, StickerId,
} from '../../shared/src/types';
import { SERVER_URL } from './config';
import { storage } from './storage';
import { authText, errorText } from './messages';
import { clearInviteParam } from './web';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnStatus = 'connecting' | 'online' | 'offline';

const ACK_TIMEOUT = 8000;

export interface AvatarUploadAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  /** Expo ImagePicker provides this on web. */
  file?: Blob;
}

export interface Game {
  status: ConnStatus;
  room: RoomState | null;
  me: string | null;
  /** thông báo hiển thị ở trang chủ (ví dụ phòng không còn) */
  notice: string | null;
  /** chênh lệch đồng hồ server - máy (ms) */
  clockOffset: number;
  createRoom(name: string, gameType: GameType): Promise<string | null>;
  joinRoom(code: string, name: string): Promise<string | null>;
  configure(p: { gameType?: GameType; settings?: Partial<RoomSettings> }): Promise<string | null>;
  start(): Promise<string | null>;
  act(a: GameAction): Promise<ActionResult>;
  restart(): Promise<string | null>;
  leave(): void;
  sendFun(f: FunSend): void;
  /** đăng ký nghe sự kiện ném/khịa/hối; trả về hàm hủy */
  onFun(cb: (e: FunEvent) => void): () => void;
  /** tài khoản đang đăng nhập (null = chơi khách) */
  user: PublicUser | null;
  /** đã thử khôi phục phiên đăng nhập xong chưa */
  authReady: boolean;
  register(p: { username: string; password: string; displayName: string; avatar?: number }): Promise<string | null>;
  login(username: string, password: string): Promise<string | null>;
  updateProfile(p: { displayName?: string; avatar?: number }): Promise<string | null>;
  uploadAvatar(asset: AvatarUploadAsset): Promise<string | null>;
  removeAvatar(): Promise<string | null>;
  logout(): Promise<void>;
  /** tin nhắn trong phòng */
  chat: ChatMsg[];
  sendChat(text: string): Promise<boolean>;
  sendSticker(stickerId: StickerId): Promise<boolean>;
}

export function useGame(): Game {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const socketRef = useRef<GameSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const funListeners = useRef(new Set<(e: FunEvent) => void>());

  const remember = useCallback(async (code: string, playerId: string, name: string) => {
    roomCodeRef.current = code;
    setMe(playerId);
    await Promise.all([storage.setRoom(code), storage.setPlayerId(playerId), storage.setName(name)]);
  }, []);

  const forget = useCallback(async () => {
    roomCodeRef.current = null;
    setRoom(null);
    setChat([]);
    await storage.setRoom(null);
  }, []);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', async () => {
      setStatus('online');
      // khôi phục đăng nhập trước, để vào lại phòng bằng đúng tài khoản
      const token = await storage.getToken();
      if (token) {
        try {
          const r: AuthAck = await socket.timeout(ACK_TIMEOUT).emitWithAck('auth:resume', { token });
          if (r.ok) setUser(r.user);
          else if (r.error === 'session_expired') {
            setUser(null);
            await storage.setToken(null);
          }
        } catch {
          // server chậm: giữ nguyên, lần kết nối sau thử lại
        }
      }
      setAuthReady(true);
      // vào lại phòng đang chơi dở (sau khi rớt mạng hoặc mở lại trang)
      const code = roomCodeRef.current ?? (await storage.getRoom());
      const playerId = await storage.getPlayerId();
      const name = (await storage.getName()) ?? 'Người chơi';
      if (!code || !playerId) return;
      try {
        const res: Ack<JoinResult> = await socket.timeout(ACK_TIMEOUT).emitWithAck('room:join', { code, name, playerId });
        if (res.ok) await remember(res.code, res.playerId, name);
        else {
          if (roomCodeRef.current) setNotice('Phòng cũ không còn nữa. ' + errorText[res.error]);
          await forget();
        }
      } catch {
        // hết thời gian chờ: lần kết nối sau sẽ thử lại
      }
    });
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus((s) => (s === 'online' ? 'offline' : s)));
    socket.on('room:state', (state) => {
      if (roomCodeRef.current && state.code !== roomCodeRef.current) return;
      setClockOffset(state.serverNow - Date.now());
      setRoom(state);
    });
    socket.on('fun:event', (e) => {
      for (const cb of funListeners.current) cb(e);
    });
    socket.on('chat:history', (ms) => setChat(ms));
    socket.on('chat:msg', (m) => setChat((xs) => [...xs.slice(-79), m]));

    storage.getPlayerId().then((id) => id && setMe(id));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [remember, forget]);

  const call = useCallback(async <R,>(fn: (s: GameSocket) => Promise<R>): Promise<R | null> => {
    const s = socketRef.current;
    if (!s || !s.connected) return null;
    try {
      return await fn(s);
    } catch {
      return null;
    }
  }, []);

  const enter = useCallback(
    async (kind: 'create' | 'join', name: string, code = '', gameType?: GameType): Promise<string | null> => {
      setNotice(null);
      const playerId = (await storage.getPlayerId()) ?? undefined;
      const res = await call<Ack<JoinResult>>((s) =>
        kind === 'create'
          ? s.timeout(ACK_TIMEOUT).emitWithAck('room:create', { name, playerId, gameType })
          : s.timeout(ACK_TIMEOUT).emitWithAck('room:join', { code: code.trim().toUpperCase(), name, playerId }),
      );
      if (!res) return 'Chưa kết nối được tới server, thử lại nhé.';
      if (!res.ok) return errorText[res.error];
      await remember(res.code, res.playerId, name);
      clearInviteParam();
      return null;
    },
    [call, remember],
  );

  const authCall = useCallback(
    async (fn: (s: GameSocket) => Promise<AuthAck>): Promise<string | null> => {
      const res = await call<AuthAck>(fn);
      if (!res) return 'Chưa kết nối được tới server, thử lại nhé.';
      if (!res.ok) return authText[res.error];
      setUser(res.user);
      await storage.setToken(res.token);
      if (res.user.displayName) await storage.setName(res.user.displayName);
      return null;
    },
    [call],
  );

  const simple = useCallback(
    async (fn: (s: GameSocket) => Promise<Ack>): Promise<string | null> => {
      const res = await call<Ack>(fn);
      if (!res) return 'Mất kết nối, thử lại nhé.';
      return res.ok ? null : errorText[res.error];
    },
    [call],
  );

  const uploadAvatar = useCallback(async (asset: AvatarUploadAsset): Promise<string | null> => {
    const token = await storage.getToken();
    if (!token) return 'Bạn cần đăng nhập trước khi tải ảnh đại diện.';
    const form = new FormData();
    if (asset.file) form.append('avatar', asset.file, asset.fileName ?? 'avatar.jpg');
    else {
      form.append('avatar', {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
    }
    try {
      const response = await fetch(`${SERVER_URL.replace(/\/$/, '')}/api/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; user?: PublicUser; error?: string } | null;
      if (response.ok && payload?.ok && payload.user) {
        if ((await storage.getToken()) !== token) return 'Phiên đăng nhập đã thay đổi; ảnh đã lưu vào tài khoản trước đó.';
        setUser(payload.user);
        return null;
      }
      if (response.status === 413) return 'Ảnh lớn quá, hãy chọn ảnh dưới 5 MB.';
      if (response.status === 415) return 'Chỉ nhận ảnh JPG, PNG hoặc WebP.';
      if (response.status === 503) return 'Máy chủ chưa cấu hình kho ảnh Cloudinary.';
      if (response.status === 429) return 'Bạn vừa tải ảnh lên; chờ vài giây rồi thử lại nhé.';
      if (response.status === 401) return 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.';
      return payload?.error === 'avatar_upload_failed' ? 'Tải ảnh chưa thành công, thử lại nhé.' : 'Không lưu được ảnh đại diện.';
    } catch {
      return 'Không kết nối được máy chủ để tải ảnh.';
    }
  }, []);

  const removeAvatar = useCallback(async (): Promise<string | null> => {
    const token = await storage.getToken();
    if (!token) return 'Bạn cần đăng nhập trước khi đổi ảnh đại diện.';
    try {
      const response = await fetch(`${SERVER_URL.replace(/\/$/, '')}/api/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = (await response.json().catch(() => null)) as { ok?: boolean; user?: PublicUser } | null;
      if (response.ok && payload?.ok && payload.user) {
        if ((await storage.getToken()) !== token) return 'Phiên đăng nhập đã thay đổi.';
        setUser(payload.user);
        return null;
      }
      if (response.status === 401) return 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại.';
      if (response.status === 429) return 'Ảnh đang được xử lý; chờ một chút rồi thử lại nhé.';
      return 'Không bỏ được ảnh đại diện, thử lại nhé.';
    } catch {
      return 'Không kết nối được máy chủ để đổi ảnh đại diện.';
    }
  }, []);

  return {
    status,
    room,
    me,
    notice,
    clockOffset,
    createRoom: (name, gameType) => enter('create', name, '', gameType),
    joinRoom: (code, name) => enter('join', name, code),
    configure: (p) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:config', p)),
    start: () => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('game:start')),
    restart: () => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('game:restart')),
    act: async (a) => {
      const res = await call<ActionResult>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('game:action', a));
      return res ?? { ok: false, reason: 'not_playing' };
    },
    leave: () => {
      socketRef.current?.emit('room:leave', () => {});
      void forget();
    },
    sendFun: (f) => {
      socketRef.current?.emit('fun:send', f, () => {});
    },
    onFun: (cb) => {
      funListeners.current.add(cb);
      return () => {
        funListeners.current.delete(cb);
      };
    },
    user,
    authReady,
    register: (p) => authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:register', p)),
    login: (username, password) => authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:login', { username, password })),
    updateProfile: (p) => authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:update', p)),
    uploadAvatar,
    removeAvatar,
    logout: async () => {
      await call((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:logout'));
      setUser(null);
      await storage.setToken(null);
      await forget();
    },
    chat,
    sendChat: async (text) => {
      const res = await call<{ ok: boolean }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('chat:send', { text }));
      return !!res?.ok;
    },
    sendSticker: async (stickerId) => {
      const res = await call<{ ok: boolean }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('chat:send', { kind: 'sticker', stickerId }));
      return !!res?.ok;
    },
  };
}
