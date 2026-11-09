import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type {
  Ack, ClientToServerEvents, JoinResult, RejectReason, RoomState, ServerToClientEvents,
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
  createRoom(name: string): Promise<string | null>;
  joinRoom(code: string, name: string): Promise<string | null>;
  start(): Promise<string | null>;
  submit(word: string): Promise<RejectReason | null>;
  restart(): Promise<string | null>;
  leave(): void;
}

export function useGame(): Game {
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [room, setRoom] = useState<RoomState | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const socketRef = useRef<GameSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);

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
      // vào lại phòng đang chơi dở (sau khi rớt mạng hoặc mở lại app)
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

    storage.getPlayerId().then((id) => id && setMe(id));
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [remember, forget]);

  const call = useCallback(async <T,>(fn: (s: GameSocket) => Promise<T>): Promise<T | null> => {
    const s = socketRef.current;
    if (!s || !s.connected) return null;
    try {
      return await fn(s);
    } catch {
      return null;
    }
  }, []);

  const enter = useCallback(
    async (kind: 'create' | 'join', name: string, code = ''): Promise<string | null> => {
      setNotice(null);
      const playerId = (await storage.getPlayerId()) ?? undefined;
      const res = await call<Ack<JoinResult>>((s) =>
        kind === 'create'
          ? s.timeout(ACK_TIMEOUT).emitWithAck('room:create', { name, playerId })
          : s.timeout(ACK_TIMEOUT).emitWithAck('room:join', { code: code.trim().toUpperCase(), name, playerId }),
      );
      if (!res) return 'Không kết nối được tới server, thử lại nhé.';
      if (!res.ok) return errorText[res.error];
      await remember(res.code, res.playerId, name);
      clearInviteParam();
      return null;
    },
    [call, remember],
  );

  const simple = useCallback(
    async (event: 'game:start' | 'game:restart'): Promise<string | null> => {
      const res = await call<Ack>((s) => s.timeout(ACK_TIMEOUT).emitWithAck(event));
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
    createRoom: (name) => enter('create', name),
    joinRoom: (code, name) => enter('join', name, code),
    start: () => simple('game:start'),
    restart: () => simple('game:restart'),
    submit: async (word) => {
      const res = await call((s) => s.timeout(ACK_TIMEOUT).emitWithAck('word:submit', { word }));
      if (!res) return 'not_playing';
      return res.ok ? null : res.reason;
    },
    leave: () => {
      socketRef.current?.emit('room:leave', () => {});
      void forget();
    },
  };
}
