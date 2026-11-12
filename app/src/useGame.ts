import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack, ActionResult, AuthAck, CharacterConfig, ChatMsg, ClientToServerEvents, FunAck, FunEvent, FunSend, GameAction, GameType, JoinResult,
  LeaderRow, PublicUser, RoomSettings, RoomState, RoomSummary, RubyLedgerRow, ServerToClientEvents, StickerId, TopupRequest,
  WalletError, WalletInfo,
} from '../../shared/src/types';
import { SERVER_URL } from './config';
import { storage } from './storage';
import { authText, errorText, walletText } from './messages';
import { clearInviteParam, squareJpeg } from './web';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnStatus = 'connecting' | 'online' | 'offline';

const ACK_TIMEOUT = 8000;

export interface AvatarUploadAsset {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  /** Expo ImagePicker provides this on web. */
  file?: Blob;
  /** ảnh dạng base64 (ImagePicker với base64: true, dùng khi không thu nhỏ được trên máy) */
  base64?: string | null;
}

/** hồ sơ khách lưu trên máy: mặt đại diện có sẵn và ảnh đã tải lên */
export interface GuestProfile {
  avatar?: number;
  avatarUrl?: string;
}

/** sự kiện ví hiện thành thông báo ở mọi màn: +Ruby khi được duyệt, hoặc yêu cầu bị từ chối */
export type WalletNotice = { kind: 'update'; ruby: number; delta: number; reason: string } | { kind: 'rejected'; amount: number };
/** kết quả lệnh ví: dữ liệu, hoặc câu báo lỗi tiếng Việt */
export type WalletResult<T> = { ok: true; data: T } | { ok: false; error: string };

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
  customize(p: Partial<CharacterConfig>): Promise<string | null>;
  /** chủ phòng thêm / bỏ máy chơi cùng (phòng chờ) */
  addBot(): Promise<string | null>;
  removeBot(id: string): Promise<string | null>;
  start(): Promise<string | null>;
  act(a: GameAction): Promise<ActionResult>;
  restart(): Promise<string | null>;
  leave(): void;
  /** chủ phòng mời một người ra khỏi phòng */
  kick(playerId: string): Promise<string | null>;
  /** chủ phòng đổi phòng thành công khai / riêng tư */
  setPublic(value: boolean): Promise<string | null>;
  /** các phòng công khai đang mở (null = không tải được) */
  listRooms(): Promise<RoomSummary[] | null>;
  /** bảng xếp hạng số lần thắng của một game hoặc mọi game (null = không tải được) */
  leaderboard(game: GameType | 'all'): Promise<LeaderRow[] | null>;
  /** gửi chiêu ném/khịa/hối…; kết quả cho biết có bị giới hạn không */
  sendFun(f: FunSend): Promise<FunAck>;
  /** đăng ký nghe sự kiện ném/khịa/hối; trả về hàm hủy */
  onFun(cb: (e: FunEvent) => void): () => void;
  /** tài khoản đang đăng nhập (null = chơi khách) */
  user: PublicUser | null;
  /** đã thử khôi phục phiên đăng nhập xong chưa */
  authReady: boolean;
  register(p: { username: string; email: string; password: string; displayName: string; avatar?: number }): Promise<string | null>;
  /** gửi mã đặt lại mật khẩu tới email của tài khoản (luôn báo thành công nếu đúng dạng) */
  forgotPassword(who: string): Promise<string | null>;
  /** đặt mật khẩu mới bằng mã trong thư; thành công thì đăng nhập luôn */
  resetPassword(who: string, code: string, password: string): Promise<string | null>;
  /** đã có email thì phải kèm mật khẩu hiện tại */
  setEmail(email: string, password?: string): Promise<string | null>;
  changePassword(oldPassword: string, password: string): Promise<string | null>;
  login(username: string, password: string): Promise<string | null>;
  updateProfile(p: { displayName?: string; avatar?: number }): Promise<string | null>;
  uploadAvatar(asset: AvatarUploadAsset): Promise<string | null>;
  removeAvatar(): Promise<string | null>;
  /** hồ sơ khách (không đăng nhập) */
  guest: GuestProfile;
  /** đổi tên / mặt đại diện ở bất cứ đâu (trang chủ, phòng chờ, giữa ván) — tài khoản hay khách đều được */
  saveProfile(p: { name?: string; avatar?: number }): Promise<string | null>;
  /** đổi ảnh đại diện ở bất cứ đâu; `persist`: tài khoản có kho ảnh lâu dài thì lưu vào tài khoản */
  changePhoto(asset: AvatarUploadAsset): Promise<string | null>;
  removePhoto(): Promise<string | null>;
  /** server có kho ảnh lâu dài (Cloudinary) cho tài khoản không */
  photoPersist: boolean;
  logout(): Promise<void>;
  /** tin nhắn trong phòng */
  chat: ChatMsg[];
  /** ví Ruby của tài khoản đang đăng nhập (null khi chưa tải hoặc là khách) */
  wallet: WalletInfo | null;
  loadWallet(): Promise<string | null>;
  requestTopup(amount: number): Promise<string | null>;
  rubyHistory(): Promise<WalletResult<RubyLedgerRow[]>>;
  onWallet(cb: (n: WalletNotice) => void): () => void;
  adminRequests(status: TopupRequest['status']): Promise<WalletResult<TopupRequest[]>>;
  adminApprove(id: string, amount?: number): Promise<WalletResult<{ ruby: number; balance: number }>>;
  adminReject(id: string): Promise<WalletResult<TopupRequest>>;
  /** nonce: giữ nguyên khi bấm lại cùng một lần cộng để server không cộng trùng */
  adminCreditCode(code: string, amount: number, nonce: string): Promise<WalletResult<{ ruby: number; balance: number; request: TopupRequest }>>;
  adminAdjust(username: string, delta: number, reason: string): Promise<WalletResult<{ balance: number }>>;
  adminRevenue(): Promise<WalletResult<{ today: number; month: number; total: number }>>;
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
  const [guest, setGuest] = useState<GuestProfile>({});
  const guestRef = useRef<GuestProfile>({});
  const [photoPersist, setPhotoPersist] = useState(true);
  const socketRef = useRef<GameSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const funListeners = useRef(new Set<(e: FunEvent) => void>());
  const walletListeners = useRef(new Set<(n: WalletNotice) => void>());
  // ví gắn với tài khoản đang đăng nhập: đổi tài khoản thì ví cũ tự bỏ
  const [walletState, setWalletState] = useState<{ uid: string; info: WalletInfo } | null>(null);
  const reloadWallet = useRef<() => void>(() => {});
  const userIdRef = useRef<string | null>(null);

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

  const updateGuest = useCallback((patch: GuestProfile) => {
    guestRef.current = { ...guestRef.current, ...patch };
    setGuest(guestRef.current);
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all([storage.getAvatar(), storage.getPhoto()]).then(([avatar, avatarUrl]) => {
      if (!alive) return;
      updateGuest({ avatar: avatar ?? undefined, avatarUrl: avatarUrl ?? undefined });
    });
    fetch(`${SERVER_URL}/health`)
      .then((r) => r.json())
      .then((j: { avatarUploads?: unknown }) => alive && setPhotoPersist(j.avatarUploads !== false))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [updateGuest]);

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
        const res: Ack<JoinResult> = await socket.timeout(ACK_TIMEOUT).emitWithAck('room:join', { code, name, playerId, ...guestRef.current });
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
    // bị chủ phòng mời ra: về trang chủ, không tự vào lại phòng đó nữa
    socket.on('room:kicked', (p) => {
      if (roomCodeRef.current !== p.code) return;
      setNotice('Bạn đã bị chủ phòng mời ra khỏi phòng.');
      void forget();
    });
    socket.on('chat:msg', (m) => setChat((xs) => [...xs.slice(-79), m]));
    // ví: số dư mới do quản trị duyệt / cộng-trừ; yêu cầu bị từ chối
    socket.on('wallet:update', (p) => {
      setUser((u) => (u ? { ...u, ruby: p.ruby } : u));
      setWalletState((w) => (w ? { ...w, info: { ...w.info, ruby: p.ruby } } : w));
      reloadWallet.current();
      for (const cb of walletListeners.current) cb({ kind: 'update', ...p });
    });
    // mật khẩu vừa đổi / đặt lại ở máy khác: máy này bị đăng xuất
    socket.on('auth:revoked', () => {
      setUser(null);
      void storage.setToken(null);
      void forget();
      setNotice('Mật khẩu tài khoản vừa được đổi ở máy khác, hãy đăng nhập lại.');
    });
    socket.on('wallet:rejected', (p) => {
      reloadWallet.current();
      for (const cb of walletListeners.current) cb({ kind: 'rejected', amount: p.amount });
    });

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
      // khách mang theo mặt đại diện + ảnh đã chọn (server chỉ nhận ảnh do chính nó cấp)
      const profile = guestRef.current;
      const res = await call<Ack<JoinResult>>((s) =>
        kind === 'create'
          ? s.timeout(ACK_TIMEOUT).emitWithAck('room:create', { name, playerId, gameType, ...profile })
          : s.timeout(ACK_TIMEOUT).emitWithAck('room:join', { code: code.trim().toUpperCase(), name, playerId, ...profile }),
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

  const inRoom = () => !!roomCodeRef.current;

  const listRooms = useCallback(async (): Promise<RoomSummary[] | null> => {
    try {
      const r = await fetch(`${SERVER_URL.replace(/\/$/, '')}/api/rooms`);
      const j = (await r.json()) as { ok?: boolean; rooms?: RoomSummary[] };
      return j.ok && Array.isArray(j.rooms) ? j.rooms : null;
    } catch {
      return null;
    }
  }, []);

  const leaderboard = useCallback(async (g: GameType | 'all'): Promise<LeaderRow[] | null> => {
    try {
      const r = await fetch(`${SERVER_URL.replace(/\/$/, '')}/api/leaderboard?game=${encodeURIComponent(g)}`);
      const j = (await r.json()) as { ok?: boolean; rows?: LeaderRow[] };
      return j.ok && Array.isArray(j.rows) ? j.rows : null;
    } catch {
      return null;
    }
  }, []);

  const saveProfile = useCallback(async (p: { name?: string; avatar?: number }): Promise<string | null> => {
    const name = p.name?.normalize('NFC').replace(/\s+/g, ' ').trim();
    if (p.name !== undefined && !name) return 'Tên không được để trống.';
    if (user) {
      const patch: { displayName?: string; avatar?: number } = {};
      if (name !== undefined && name !== user.displayName) patch.displayName = name;
      if (p.avatar !== undefined) patch.avatar = p.avatar;
      if (Object.keys(patch).length === 0) return null;
      return authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:update', patch));
    }
    if (name !== undefined) await storage.setName(name);
    if (p.avatar !== undefined) {
      await storage.setAvatar(p.avatar);
      updateGuest({ avatar: p.avatar });
    }
    if (!inRoom()) return null;
    return simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('player:profile', { ...(name !== undefined ? { name } : {}), ...(p.avatar !== undefined ? { avatar: p.avatar } : {}) }));
  }, [user, authCall, simple, updateGuest]);

  const changePhoto = useCallback(async (asset: AvatarUploadAsset): Promise<string | null> => {
    // tài khoản + server có kho ảnh lâu dài: lưu vào tài khoản (dùng được ở mọi máy)
    if (user && photoPersist) return uploadAvatar(asset);
    const data = (await squareJpeg(asset.file ?? asset.uri)) ?? (asset.base64 ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}` : null);
    if (!data) return 'Không đọc được ảnh này, thử ảnh khác nhé.';
    const res = await call((s) => s.timeout(15_000).emitWithAck('player:photo', { data }));
    if (!res) return 'Chưa kết nối được tới server, thử lại nhé.';
    if (!res.ok) {
      if (res.error === 'rate_limited') return 'Bạn vừa đổi ảnh; chờ vài giây rồi thử lại nhé.';
      if (res.error === 'invalid_image') return 'Ảnh không hợp lệ hoặc lớn quá (chọn ảnh JPG/PNG/WebP).';
      return 'Tải ảnh chưa thành công, thử lại nhé.';
    }
    const url = 'avatarUrl' in res ? res.avatarUrl : undefined;
    if (!user && url) {
      await storage.setPhoto(url);
      updateGuest({ avatarUrl: url });
    }
    return null;
  }, [user, photoPersist, uploadAvatar, call, updateGuest]);

  const removePhoto = useCallback(async (): Promise<string | null> => {
    if (user && photoPersist && user.avatarUrl) return removeAvatar();
    await storage.setPhoto(null);
    updateGuest({ avatarUrl: undefined });
    if (!inRoom()) return null;
    const res = await call((s) => s.timeout(ACK_TIMEOUT).emitWithAck('player:photo', { remove: true }));
    return res?.ok ? null : 'Không bỏ được ảnh, thử lại nhé.';
  }, [user, photoPersist, removeAvatar, call, updateGuest]);

  // ---------- ví Ruby ----------
  const walletCall = useCallback(
    async <T,>(fn: (s: GameSocket) => Promise<({ ok: true } & T) | { ok: false; error: WalletError }>): Promise<WalletResult<T>> => {
      const res = await call(fn);
      if (!res) return { ok: false, error: 'Chưa kết nối được tới server, thử lại nhé.' };
      if (!res.ok) return { ok: false, error: walletText[res.error] };
      const { ok: _ok, ...data } = res;
      return { ok: true, data: data as unknown as T };
    },
    [call],
  );

  const loadWallet = useCallback(async (): Promise<string | null> => {
    const r = await walletCall<WalletInfo>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('wallet:get'));
    if (!r.ok) return r.error;
    const uid = userIdRef.current;
    if (uid) setWalletState({ uid, info: r.data });
    setUser((u) => (u ? { ...u, ruby: r.data.ruby } : u));
    return null;
  }, [walletCall]);
  useEffect(() => {
    reloadWallet.current = () => void loadWallet();
  }, [loadWallet]);
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);
  const wallet = walletState && walletState.uid === user?.id ? walletState.info : null;

  return {
    status,
    room,
    me,
    notice,
    clockOffset,
    createRoom: (name, gameType) => enter('create', name, '', gameType),
    joinRoom: (code, name) => enter('join', name, code),
    configure: (p) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:config', p)),
    customize: (p) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('player:customize', p)),
    addBot: () => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:addBot')),
    removeBot: (id) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:removeBot', { id })),
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
    kick: (playerId) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:kick', { playerId })),
    setPublic: (value) => simple((s) => s.timeout(ACK_TIMEOUT).emitWithAck('room:visibility', { public: value })),
    listRooms,
    leaderboard,
    sendFun: async (f) => {
      const res = await call<FunAck>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('fun:send', f));
      return res ?? { ok: false };
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
    forgotPassword: async (who) => {
      const res = await call<{ ok: true } | { ok: false; error: 'mail_disabled' | 'invalid_username' | 'rate_limited' }>((s) =>
        s.timeout(ACK_TIMEOUT).emitWithAck('auth:forgot', { who: who.trim() }));
      if (!res) return 'Chưa kết nối được tới server, thử lại nhé.';
      return res.ok ? null : authText[res.error];
    },
    resetPassword: (who, code, password) =>
      authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:reset', { who: who.trim(), code: code.trim(), password })),
    setEmail: (email, password) =>
      authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:setEmail', password === undefined ? { email: email.trim() } : { email: email.trim(), password })),
    changePassword: (oldPassword, password) =>
      authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:changePassword', { oldPassword, password })),
    updateProfile: (p) => authCall((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:update', p)),
    uploadAvatar,
    removeAvatar,
    guest,
    saveProfile,
    changePhoto,
    removePhoto,
    photoPersist,
    logout: async () => {
      await call((s) => s.timeout(ACK_TIMEOUT).emitWithAck('auth:logout'));
      setUser(null);
      await storage.setToken(null);
      await forget();
    },
    chat,
    wallet,
    loadWallet,
    requestTopup: async (amount) => {
      const r = await walletCall<{ request: TopupRequest }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('wallet:request', { amount }));
      if (!r.ok) return r.error;
      await loadWallet();
      return null;
    },
    rubyHistory: async () => {
      const r = await walletCall<{ rows: RubyLedgerRow[] }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('wallet:history'));
      return r.ok ? { ok: true, data: r.data.rows } : r;
    },
    onWallet: (cb) => {
      walletListeners.current.add(cb);
      return () => {
        walletListeners.current.delete(cb);
      };
    },
    adminRequests: async (status) => {
      const r = await walletCall<{ requests: TopupRequest[] }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:requests', { status }));
      return r.ok ? { ok: true, data: r.data.requests } : r;
    },
    adminApprove: (id, amount) =>
      walletCall<{ ruby: number; balance: number }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:approve', amount === undefined ? { id } : { id, amount })),
    adminReject: async (id) => {
      const r = await walletCall<{ request: TopupRequest }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:reject', { id }));
      return r.ok ? { ok: true, data: r.data.request } : r;
    },
    adminCreditCode: (code, amount, nonce) =>
      walletCall<{ ruby: number; balance: number; request: TopupRequest }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:creditCode', { code, amount, nonce })),
    adminAdjust: (username, delta, reason) =>
      walletCall<{ balance: number }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:adjust', { username, delta, reason })),
    adminRevenue: () => walletCall<{ today: number; month: number; total: number }>((s) => s.timeout(ACK_TIMEOUT).emitWithAck('admin:revenue')),
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
