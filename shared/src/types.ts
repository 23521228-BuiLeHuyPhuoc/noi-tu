/** Kiểu dữ liệu và tên sự kiện dùng chung giữa app và server. */

export const MAX_PLAYERS = 6;
export const MAX_NAME = 24;

// ================= Phòng =================

export type GameType = 'wordchain' | 'ludo' | 'baucua';
export type Phase = 'lobby' | 'playing' | 'finished';

export const GAME_INFO: Record<GameType, { name: string; min: number; max: number }> = {
  wordchain: { name: 'Nối từ', min: 1, max: 6 },
  ludo: { name: 'Cờ cá ngựa', min: 2, max: 4 },
  baucua: { name: 'Bầu cua', min: 1, max: 6 },
};

export interface RoomSettings {
  /** số ngựa mỗi người (cờ cá ngựa) */
  ludoPieces: 2 | 4;
}

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  /** chỉ số avatar (thú + màu), không trùng trong phòng */
  avatar: number;
}

export interface RankEntry {
  playerId: string;
  name: string;
  /** dòng mô tả ngắn: "12 từ", "2/4 ngựa về chuồng", "1.250 xu" */
  detail: string;
}

export interface GameResult {
  winnerId: string | null;
  ranking: RankEntry[];
  /** câu tổng kết hiển thị to */
  headline: string;
}

export interface RoomState {
  code: string;
  phase: Phase;
  hostId: string;
  players: PublicPlayer[];
  maxPlayers: number;
  gameType: GameType;
  settings: RoomSettings;
  /** đồng hồ server lúc gửi (ms), để app tự bù lệch giờ */
  serverNow: number;
  game: GameView | null;
  result: GameResult | null;
}

export type GameView = WordChainView | LudoView | BauCuaView;

// ================= Nối từ =================

export const WORD_SYLLABLES = 2;
export const TURN_SECONDS = 30;

export type WordHistoryItem =
  | { kind: 'start'; word: string }
  | { kind: 'word'; word: string; playerId: string; name: string }
  | { kind: 'eliminated'; playerId: string; name: string; reason: 'timeout' | 'left' }
  | { kind: 'newWord'; word: string }
  | { kind: 'hint'; playerId: string; name: string };

export interface WordChainView {
  type: 'wordchain';
  /** thứ tự lượt */
  order: string[];
  eliminated: string[];
  /** số từ mỗi người đã nối */
  words: Record<string, number>;
  hintUsed: string[];
  currentWord: string;
  currentPlayerId: string | null;
  turnEndsAt: number | null;
  turnSeconds: number;
  /** số từ còn có thể nối tiếp từ hiện tại (chưa dùng trong ván) */
  nextCount: number;
  history: WordHistoryItem[];
  totalWords: number;
}

// ================= Cờ cá ngựa =================

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';
export const LUDO_COLORS: LudoColor[] = ['red', 'green', 'yellow', 'blue'];
/** số ô trên đường chạy chung */
export const LUDO_TRACK = 52;
/** vị trí ô xuất phát của từng màu trên đường chạy */
export const LUDO_START: Record<LudoColor, number> = { red: 0, green: 13, yellow: 26, blue: 39 };
/** tiến độ của một con ngựa: -1 = trong chuồng xuất phát, 0..50 = trên đường, 51..55 = đường về đích, 56 = về đích */
export const LUDO_HOME_START = 51;
export const LUDO_FINISH = 56;
export const LUDO_TURN_SECONDS = 15;

export type LudoEvent =
  | { kind: 'exit'; playerId: string }
  | { kind: 'capture'; playerId: string; victimId: string }
  | { kind: 'finish'; playerId: string }
  | { kind: 'noMove'; playerId: string }
  | { kind: 'threeSixes'; playerId: string }
  | { kind: 'left'; playerId: string };

export interface LudoView {
  type: 'ludo';
  /** người chơi theo thứ tự lượt; colors[i] là màu của order[i] */
  order: string[];
  colors: LudoColor[];
  /** pieces[i][k]: tiến độ con ngựa thứ k của người order[i] */
  pieces: number[][];
  left: string[];
  currentPlayerId: string | null;
  step: 'roll' | 'move' | 'wait';
  dice: number | null;
  /** các con ngựa đi được với số vừa đổ */
  legal: number[];
  turnEndsAt: number | null;
  turnSeconds: number;
  /** tăng mỗi lần đổ xúc xắc — để app chạy hiệu ứng lắc */
  rollId: number;
  lastEvent: LudoEvent | null;
  /** tên theo id, giữ cả người đã rời phòng */
  names: Record<string, string>;
}

// ================= Bầu cua =================

export type BauCuaSymbol = 'bau' | 'cua' | 'tom' | 'ca' | 'ga' | 'nai';
export const BAUCUA_SYMBOLS: BauCuaSymbol[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
export const BAUCUA_START = 1000;
export const BAUCUA_LOAN = 500;
export const BAUCUA_CHIPS = [10, 50, 100, 500] as const;
export const BAUCUA_BET_SECONDS = 20;

export interface BauCuaView {
  type: 'baucua';
  round: number;
  step: 'betting' | 'rolling' | 'result';
  stepEndsAt: number;
  /** chỉ có giá trị ở bước kết quả */
  dice: BauCuaSymbol[] | null;
  balances: Record<string, number>;
  bets: Record<string, Partial<Record<BauCuaSymbol, number>>>;
  /** thắng/thua của ván vừa mở */
  lastDeltas: Record<string, number> | null;
  debts: Record<string, number>;
  /** các lần mở bát gần nhất, mới nhất ở cuối */
  recent: BauCuaSymbol[][];
  names: Record<string, string>;
}

// ================= Hành động trong game =================

export type GameAction =
  | { type: 'submit'; word: string }
  | { type: 'hint' }
  | { type: 'roll' }
  | { type: 'move'; piece: number }
  | { type: 'bet'; symbol: BauCuaSymbol; amount: number }
  | { type: 'clearBets' }
  | { type: 'shake' }
  | { type: 'loan' }
  | { type: 'end' };

export type ActionError =
  // chung
  | 'not_playing'
  | 'not_your_turn'
  | 'bad_action'
  | 'not_host'
  // nối từ
  | 'format'
  | 'chain'
  | 'used'
  | 'not_in_dictionary'
  | 'timeout'
  | 'hint_used'
  | 'no_hint'
  // cờ cá ngựa
  | 'illegal_move'
  // bầu cua
  | 'not_betting'
  | 'insufficient'
  | 'loan_denied';

export type ActionResult = { ok: true; hint?: string } | { ok: false; reason: ActionError };

// ================= Tính năng "lầy" =================

export type ThrowItem = 'dep' | 'cachua' | 'trung' | 'phan' | 'hoa' | 'tim';
export type TauntId = 'nhanh' | 'ga' | 'anmay' | 'run' | 'huhon' | 'gg' | 'cuu' | 'dinh' | 'khoc' | 'denlai';

export type FunSend =
  | { kind: 'throw'; to: string; item: ThrowItem }
  | { kind: 'taunt'; taunt: TauntId }
  | { kind: 'poke'; to: string };

export type FunEvent = FunSend & { id: number; from: string };

// ================= Sự kiện socket =================

export type ErrorCode =
  | 'invalid_name'
  | 'room_not_found'
  | 'room_full'
  | 'room_playing'
  | 'not_host'
  | 'not_in_room'
  | 'too_many_players'
  | 'too_few_players'
  | 'bad_request';

export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

export interface JoinResult {
  code: string;
  playerId: string;
}

export interface ClientToServerEvents {
  'room:create': (
    p: { name: string; playerId?: string; gameType?: GameType },
    ack: (r: Ack<JoinResult>) => void,
  ) => void;
  'room:join': (p: { code: string; name: string; playerId?: string }, ack: (r: Ack<JoinResult>) => void) => void;
  'room:config': (p: { gameType?: GameType; settings?: Partial<RoomSettings> }, ack: (r: Ack) => void) => void;
  'game:start': (ack: (r: Ack) => void) => void;
  'game:action': (a: GameAction, ack: (r: ActionResult) => void) => void;
  'game:restart': (ack: (r: Ack) => void) => void;
  'room:leave': (ack: (r: Ack) => void) => void;
  'fun:send': (f: FunSend, ack: (r: { ok: boolean }) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (s: RoomState) => void;
  'fun:event': (e: FunEvent) => void;
}
