import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack, ActionResult, ClientToServerEvents, FunEvent, FunSend, GameAction, GameType, JoinResult,
  RoomSettings, RoomState, ServerToClientEvents,
} from '../../shared/src/types';
import { SERVER_URL } from './config';
import { storage } from './storage';
import { errorText } from './messages';
import { clearInviteParam } from './web';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
export type ConnStatus = 'connecting' | 'online' | 'offline';

const ACK_TIMEOUT = 8000;

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
}

export function useGame(): Game {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
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
    await storage.setRoom(null);
  }, []);

  useEffect(() => {
    const socket: GameSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', async () => {
      setStatus('online');
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

  const simple = useCallback(
    async (fn: (s: GameSocket) => Promise<Ack>): Promise<string | null> => {
      const res = await call<Ack>(fn);
      if (!res) return 'Mất kết nối, thử lại nhé.';
      return res.ok ? null : errorText[res.error];
    },
    [call],
  );

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
  };
}
