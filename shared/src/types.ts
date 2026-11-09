/** Kiểu dữ liệu và tên sự kiện dùng chung giữa app và server. */

export const MAX_PLAYERS = 6;
export const TURN_SECONDS = 30;
export const WORD_SYLLABLES = 2;

export type Phase = 'lobby' | 'playing' | 'finished';

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  eliminated: boolean;
  /** số từ người này đã nối đúng trong ván hiện tại */
  words: number;
}

export type HistoryItem =
  | { kind: 'start'; word: string }
  | { kind: 'word'; word: string; playerId: string }
  | { kind: 'eliminated'; playerId: string; reason: 'timeout' | 'left' }
  | { kind: 'newWord'; word: string };

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string;
  /** trong lúc chơi: theo thứ tự lượt */
  players: PublicPlayer[];
  maxPlayers: number;
  turnSeconds: number;
  currentWord: string | null;
  currentPlayerId: string | null;
  /** mốc thời gian (ms, đồng hồ server) hết lượt */
  turnEndsAt: number | null;
  /** đồng hồ server lúc gửi, để app tự bù lệch giờ */
  serverNow: number;
  /** số từ còn có thể nối tiếp từ hiện tại (chưa dùng trong ván) */
  nextCount: number | null;
  history: HistoryItem[];
  winnerId: string | null;
  /** số từ đã nối đúng trong ván (không tính từ do hệ thống ra) */
  totalWords: number;
}

export type RejectReason =
  | 'format'
  | 'chain'
  | 'used'
  | 'not_in_dictionary'
  | 'not_your_turn'
  | 'not_playing';

export type ErrorCode =
  | 'invalid_name'
  | 'room_not_found'
  | 'room_full'
  | 'room_playing'
  | 'not_host'
  | 'not_in_room'
  | 'bad_request';

export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

export interface JoinResult {
  code: string;
  playerId: string;
}

export interface ClientToServerEvents {
  'room:create': (p: { name: string; playerId?: string }, ack: (r: Ack<JoinResult>) => void) => void;
  'room:join': (p: { code: string; name: string; playerId?: string }, ack: (r: Ack<JoinResult>) => void) => void;
  'game:start': (ack: (r: Ack) => void) => void;
  'word:submit': (p: { word: string }, ack: (r: { ok: true } | { ok: false; reason: RejectReason }) => void) => void;
  'game:restart': (ack: (r: Ack) => void) => void;
  'room:leave': (ack: (r: Ack) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (s: RoomState) => void;
}
