import type { TyPhuMovement } from './typhu';
import type { DiceRollView, ThrowImpulse } from './dice';
/** Kiểu dữ liệu và tên sự kiện dùng chung giữa app và server. */

export const MAX_PLAYERS = 6;
export const MAX_NAME = 24;

// ================= Phòng =================

export type GameType = 'wordchain' | 'wordchain_en' | 'baucua' | 'typhu';
export type Phase = 'lobby' | 'playing' | 'finished';

export const GAME_INFO: Record<GameType, { name: string; min: number; max: number }> = {
  wordchain: { name: 'Nối từ', min: 1, max: 6 },
  wordchain_en: { name: 'Nối từ Anh', min: 1, max: 6 },
  baucua: { name: 'Bầu cua', min: 1, max: 6 },
  typhu: { name: 'Cờ tỷ phú', min: 2, max: 6 },
};

export interface RoomSettings {
  /** số ván chơi bầu cua tới khi tự tổng kết */
  baucuaRounds?: number;
  /** @deprecated tương thích ngược */
  ludoPieces?: 2 | 4;
}

export type CharacterGender = 'nam' | 'nu' | 'khac' | 'lgbt';
export type CharacterAge = 'nhi' | 'tre' | 'trung' | 'lao';
export type CharacterHair =
  | 'ngan' | 'han' | 'xoan' | 'dai' | 'bui' | 'undercut'
  // thêm: đầu đinh, mohican, búi củ hành, xù/afro, mái bằng, highlight, đầu nấm, dài ngang lưng
  | 'dinh' | 'mohican' | 'buicu' | 'afro' | 'maibang' | 'highlight' | 'nam' | 'dailung'
  // thêm: tóc buộc thấp có tóc con, chải ngược phồng cao + lọn xoăn gáy, vuốt lệch phồng trước, rất ngắn dựng chỏm
  | 'buocthap' | 'chaingoc' | 'vuotlech' | 'dungchom';

export const CHARACTER_GENDERS: CharacterGender[] = ['nam', 'nu', 'khac', 'lgbt'];
export const CHARACTER_AGES: CharacterAge[] = ['nhi', 'tre', 'trung', 'lao'];
export const CHARACTER_HAIRS: CharacterHair[] = [
  'ngan', 'han', 'xoan', 'dai', 'bui', 'undercut',
  'dinh', 'mohican', 'buicu', 'afro', 'maibang', 'highlight', 'nam', 'dailung',
  'buocthap', 'chaingoc', 'vuotlech', 'dungchom',
];

/** 11 tông da, từ rất sáng đến nâu sẫm (chỉ số 0..10) */
export const SKIN_TONES = 11;
/** dáng mặt: tròn, oval ngắn đầy, oval, oval dài má đầy, oval pha vuông, trái xoan, dài, vuông/hàm bạnh, bầu má phính, cằm nhọn */
export type CharacterFace = 'tron' | 'ovalngan' | 'oval' | 'ovaldai' | 'ovalvuong' | 'xoan' | 'dai' | 'vuong' | 'bau' | 'nhon';
export const CHARACTER_FACES: CharacterFace[] = ['tron', 'ovalngan', 'oval', 'ovaldai', 'ovalvuong', 'xoan', 'dai', 'vuong', 'bau', 'nhon'];
/** dáng người ở vai: gầy, vừa, mũm mĩm, vai rộng cơ bắp */
export type CharacterBuild = 'gay' | 'vua' | 'mum' | 'khoe';
export const CHARACTER_BUILDS: CharacterBuild[] = ['gay', 'vua', 'mum', 'khoe'];
/** kiểu mắt: mặc định theo giới, híp, to tròn, một mí */
export type CharacterEyes = 'macdinh' | 'hip' | 'to' | 'motmi';
export const CHARACTER_EYES: CharacterEyes[] = ['macdinh', 'hip', 'to', 'motmi'];
/** kiểu lông mày: mặc định, rậm, lá liễu */
export type CharacterBrows = 'macdinh' | 'ray' | 'lieu';
export const CHARACTER_BROWS: CharacterBrows[] = ['macdinh', 'ray', 'lieu'];

/** phụ kiện "lầy" trên mặt nhân vật ('none' = không đeo gì) */
export type CharacterAccessory =
  | 'none' | 'kinhden' | 'raukem' | 'ria' | 'nonla' | 'nonbh' | 'bangdo'
  | 'khautrang' | 'muihe' | 'taitho' | 'bangcanhan' | 'troc' | 'mahong'
  // phụ kiện cầu vồng (LGBT+), ai cũng đeo được: ghim cài áo, cờ, mảng tóc, băng đô
  | 'prideghim' | 'prideco' | 'pridetoc' | 'pridebang';
export const CHARACTER_ACCESSORIES: CharacterAccessory[] = [
  'none', 'kinhden', 'raukem', 'ria', 'nonla', 'nonbh', 'bangdo',
  'khautrang', 'muihe', 'taitho', 'bangcanhan', 'troc', 'mahong',
  'prideghim', 'prideco', 'pridetoc', 'pridebang',
];

/** chi tiết khuôn mặt: nốt ruồi, tàn nhang, lông mày rậm, răng hô, má lúm */
export type CharacterDetail = 'none' | 'notruoi' | 'tannhang' | 'longmay' | 'ranghe' | 'malum';
export const CHARACTER_DETAILS: CharacterDetail[] = ['none', 'notruoi', 'tannhang', 'longmay', 'ranghe', 'malum'];

/** trang phục vui ('none' = mặc theo độ tuổi như cũ) */
export type CharacterOutfit =
  | 'none' | 'aohoa' | 'dobo' | 'bala' | 'vestbong' | 'aodai' | 'dongphuc' | 'aomua' | 'dayvang'
  // thêm: áo thun cổ tròn, áo trắng cổ đứng bèo, sơ mi trắng mở cổ, ba lỗ đen khoét chữ U
  | 'thun' | 'beo' | 'somi' | 'balden';
export const CHARACTER_OUTFITS: CharacterOutfit[] = [
  'none', 'aohoa', 'dobo', 'bala', 'vestbong', 'aodai', 'dongphuc', 'aomua', 'dayvang',
  'thun', 'beo', 'somi', 'balden',
];

/**
 * Các nét tinh chỉnh khuôn mặt/tóc/râu/trang phục/hình xăm. Mỗi khóa có danh sách giá trị hợp lệ cố định;
 * server chỉ nhận đúng các khóa và giá trị này (xem parseLook). Chân dung chỉ vẽ đầu và vai nên nhẫn, đồng hồ, găng,
 * dáng ngồi được lưu sẵn cho chế độ nửa/toàn thân sau này.
 */
export const LOOK_OPTIONS = {
  // mặt
  jaw: ['mem', 'ro'], chin: ['bo', 'nho', 'rong'], cheek: ['thon', 'day', 'phinh', 'go'], forehead: ['rong', 'vua'],
  neck: ['thon', 'vua', 'day'], nepcuoi: ['khong', 'co'], maphan: ['khong', 'co'], tilt: ['thang', 'trai', 'phai'],
  // mắt & mày
  eyeshape: ['hanhnhan', 'hanhhep', 'nho', 'tron', 'hip'], lid: ['mot', 'hai'], open: ['mo', 'tru', 'nheo'], liner: ['khong', 'co'],
  eyecolor: ['nau', 'den'], gaze: ['thang', 'trai', 'phai'], asym: ['khong', 'co'],
  browshape: ['ngang', 'cong', 'mem', 'gap', 'lieu'], browthick: ['mong', 'vua', 'day'],
  // mũi & miệng
  nose: ['thap', 'vua', 'ro'], nosetip: ['nho', 'tron', 'day'], nostril: ['hep', 'vua', 'rong'],
  lipthick: ['mong', 'duoi', 'day'], lipcolor: ['hongnau', 'cam', 'do'], mouth: ['khep', 'cuoirang', 'cuoitu', 'he'],
  molepos: ['moi', 'ma', 'cam'],
  // tóc
  haircolor: ['den', 'nauden', 'nau', 'highlight'], part: ['lech', 'khong'], volume: ['sat', 'vua', 'cao'], sides: ['gon', 'sat'], babyhair: ['khong', 'co'],
  // râu
  ria: ['khong', 'manh', 'vua'], raucam: ['khong', 'manh', 'vua'], rauham: ['khong', 'manh', 'vua'],
  // trang phục & phụ kiện
  outfitcolor: ['mau', 'xanhrung', 'den', 'trang', 'xam', 'do', 'vang'], earring: ['khong', 'da', 'hoa'],
  ring: ['khong', 'hoa'], watch: ['khong', 'bac', 'toi'], glove: ['khong', 'co'],
  // hình xăm trừu tượng
  tattoo: ['khong', 'co'], tattoosize: ['vai', 'vaibap'], tattooside: ['trai', 'phai'],
  // dáng (lưu cho chế độ nửa/toàn thân)
  pose: ['thang', 'baochan', 'chongcam', 'chumnguc'],
} as const;
export type LookKey = keyof typeof LOOK_OPTIONS;
export type CharacterLook = { [K in LookKey]?: (typeof LOOK_OPTIONS)[K][number] };

/** Kiểm tra nghiêm ngặt: đúng đối tượng, chỉ khóa/giá trị trong LOOK_OPTIONS. Trả về bản sạch hoặc null. */
export function parseLook(raw: unknown): CharacterLook | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const allowed = (LOOK_OPTIONS as Record<string, readonly string[]>)[k];
    if (!Object.prototype.hasOwnProperty.call(LOOK_OPTIONS, k) || !allowed || typeof v !== 'string' || !allowed.includes(v)) return null;
    out[k] = v;
  }
  return out as CharacterLook;
}

/** biểu cảm trên chân dung, đổi theo sự kiện trong ván */
export type Mood = 'normal' | 'smug' | 'cry' | 'angry' | 'shock' | 'dizzy';
export const MOODS: Mood[] = ['normal', 'smug', 'cry', 'angry', 'shock', 'dizzy'];

export const PLAYER_COLORS = [
  { id: 0, hex: '#E5383B', light: '#FFE3E3', name: 'Đỏ Sơn' },
  { id: 1, hex: '#1D6FE8', light: '#D8ECFF', name: 'Xanh Dương' },
  { id: 2, hex: '#1F9D55', light: '#D8F8E3', name: 'Xanh Ngọc' },
  { id: 3, hex: '#F59F00', light: '#FFF3BF', name: 'Vàng Hoàng Gia' },
  { id: 4, hex: '#8E3CCB', light: '#F3D9FA', name: 'Tím Huế' },
  { id: 5, hex: '#F76707', light: '#FFE8CC', name: 'Cam Lửa' },
  { id: 6, hex: '#0CA678', light: '#C3FAE8', name: 'Ngọc Lam' },
  { id: 7, hex: '#D6336C', light: '#FCC2D7', name: 'Hồng Sen' },
] as const;

export interface CharacterConfig {
  gender: CharacterGender;
  age: CharacterAge;
  hair: CharacterHair;
  /** chỉ số màu trong PLAYER_COLORS (0..7), không trùng trong phòng */
  color: number;
  /** phụ kiện (tùy chọn; thiếu = không đeo) */
  accessory?: CharacterAccessory;
  detail?: CharacterDetail;
  outfit?: CharacterOutfit;
  /** tông da 0..SKIN_TONES-1 (thiếu = theo kiểu cũ) */
  skin?: number;
  face?: CharacterFace;
  build?: CharacterBuild;
  eyes?: CharacterEyes;
  brows?: CharacterBrows;
  /** các nét tinh chỉnh thêm (xem LOOK_OPTIONS); thiếu = mặc định */
  look?: CharacterLook;
}

export interface PublicPlayer {
  id: string;
  name: string;
  connected: boolean;
  /** chỉ số avatar (thú + màu), không trùng trong phòng */
  avatar: number;
  avatarUrl?: string;
  /** hình tượng nhân vật tùy chỉnh (tóc tai, độ tuổi, giới tính, màu sắc không trùng) */
  character?: CharacterConfig;
  /** vào phòng khi ván đang diễn ra: chỉ xem, chờ ván kế tiếp mới tham gia */
  spectator?: boolean;
  /** đã đăng nhập tài khoản (có lưu thành tích) */
  account?: boolean;
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
  /** phòng công khai hiện trong sảnh "Phòng đang mở"; riêng tư thì chỉ vào được bằng mã hoặc link mời */
  isPublic: boolean;
}

/** Một phòng công khai trong sảnh */
export interface RoomSummary {
  code: string;
  gameType: GameType;
  phase: Phase;
  hostName: string;
  hostAvatar: number;
  hostAvatarUrl?: string;
  players: number;
  maxPlayers: number;
  /** tên những người đang trong phòng */
  names: string[];
}

/** Một dòng bảng xếp hạng (chỉ người chơi có tài khoản mới được lưu thành tích) */
export interface LeaderRow {
  rank: number;
  id: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  won: number;
  played: number;
}

export type GameView = WordChainView | BauCuaView | TyPhuView;

// ================= Nối từ =================

export const WORD_SYLLABLES = 2;
export const TURN_SECONDS = 30;

/**
 * Nối từ Anh: thời gian mỗi lượt của từng người giảm tuyến tính từ 30 giây xuống 15 giây
 * khi người đó tự nối đúng được 30 từ (mỗi từ đúng bớt 0,5 giây), sau đó giữ ở 15 giây.
 */
export const EN_TURN_MIN_RATIO = 0.5;
export const EN_RAMP_WORDS = 30;
/** Nối từ Anh: cứ mỗi 30 từ tự nối đúng được thêm 1 lượt cứu trợ */
export const EN_HINT_EVERY = 30;

/** Thời gian lượt (ms) của một người chơi Nối từ Anh đã tự nối đúng `correct` từ. `baseMs` = thời gian gốc (30 giây). */
export function enTurnMs(baseMs: number, correct: number): number {
  const k = Math.min(Math.max(0, correct), EN_RAMP_WORDS) / EN_RAMP_WORDS;
  return Math.round(baseMs * (1 - (1 - EN_TURN_MIN_RATIO) * k));
}

/** Số lượt cứu trợ tối đa đã mở khóa (chưa trừ số lần đã dùng) */
export function hintAllowance(lang: 'vi' | 'en', correct: number): number {
  return lang === 'en' ? 1 + Math.floor(Math.max(0, correct) / EN_HINT_EVERY) : 1;
}

export interface WordDefinition { text: string; source: string | null }

export type WordHistoryItem =
  | { kind: 'start'; word: string; definition?: WordDefinition }
  | { kind: 'word'; word: string; playerId: string; name: string; definition?: WordDefinition; /** từ do quyền cứu trợ nối hộ */ hint?: boolean }
  | { kind: 'eliminated'; playerId: string; name: string; reason: 'timeout' | 'left' }
  | { kind: 'newWord'; word: string; definition?: WordDefinition }
  | { kind: 'hint'; playerId: string; name: string }
  | { kind: 'vote'; word: string; playerId: string; name: string; approved: boolean; definition?: WordDefinition };

export interface WordChainView {
  type: 'wordchain' | 'wordchain_en';
  /** thứ tự lượt */
  order: string[];
  eliminated: string[];
  /** số từ mỗi người đã nối */
  words: Record<string, number>;
  /** những người đã hết quyền cứu trợ (giữ để tương thích) */
  hintUsed: string[];
  /** số lượt cứu trợ còn lại của mỗi người */
  hintsLeft?: Record<string, number>;
  /** số từ mỗi người tự nối đúng (không tính từ nhờ cứu trợ): dùng tính thời gian lượt và thưởng cứu trợ */
  correct?: Record<string, number>;
  currentWord: string;
  currentDefinition?: WordDefinition;
  currentPlayerId: string | null;
  turnEndsAt: number | null;
  /** độ dài lượt hiện tại (giây, có thể lẻ): Nối từ Anh giảm dần theo số từ đúng của người đang tới lượt */
  turnSeconds: number;
  /** số mili giây đã bù cho người đang tới lượt vì bị chọc (rung, sụp nguồn…) trong lượt này */
  turnBonusMs?: number;
  /** số từ còn có thể nối tiếp từ hiện tại (chưa dùng trong ván) */
  nextCount: number;
  history: WordHistoryItem[];
  totalWords: number;
  /** đang xin cả phòng duyệt một từ chưa có trong từ điển */
  vote: WordVote | null;
}

export const VOTE_SECONDS = 12;

export interface WordVote {
  word: string;
  byId: string;
  byName: string;
  /** những người được bỏ phiếu */
  voters: string[];
  yes: string[];
  no: string[];
  endsAt: number;
}

// ================= Bầu cua =================

export type BauCuaSymbol = 'bau' | 'cua' | 'tom' | 'ca' | 'ga' | 'nai';
export const BAUCUA_SYMBOLS: BauCuaSymbol[] = ['nai', 'bau', 'ga', 'ca', 'cua', 'tom'];
export const BAUCUA_START = 1000;
export const BAUCUA_LOAN = 500;
export const BAUCUA_CHIPS = [10, 50, 100, 500] as const;
export const BAUCUA_BET_SECONDS = 20;
/** thời gian hiện kết quả (gồm hiệu ứng mở bát) */
export const BAUCUA_RESULT_SECONDS = 7;
export const BAUCUA_ROUND_OPTIONS = [10, 15, 20, 25, 30] as const;
export type BauCuaRounds = (typeof BAUCUA_ROUND_OPTIONS)[number];
export const BAUCUA_DEFAULT_ROUNDS: BauCuaRounds = 10;

export interface BauCuaView {
  type: 'baucua';
  round: number;
  maxRounds: number;
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

// ================= Cờ tỷ phú =================

export type TyPhuLogKind = 'buy' | 'rent' | 'jail' | 'card' | 'bankrupt' | 'start' | 'build' | 'tax' | 'info';

export interface TyPhuView {
  type: 'typhu';
  movement: TyPhuMovement | null;
  order: string[];
  names: Record<string, string>;
  cash: Record<string, number>;
  pos: Record<string, number>;
  /** số lượt đã ngồi tù (chỉ có khi đang ở tù) */
  jail: Record<string, number>;
  bankrupt: string[];
  /** chủ của từng ô đất (theo chỉ số ô) */
  owners: Record<number, string>;
  houses: Record<number, number>;
  currentPlayerId: string | null;
  /**
   * upgrade: vừa dừng ở đất/ga của mình, được chọn nâng cấp ngay tại ô đó; debt: thiếu tiền, phải tự chọn bán nhà đất;
   * ticket: rút được thẻ Cơ hội "vé ra tù", chọn mua hay không.
   * Đang ở tù mà tới lượt (step roll): phải trả tiền / dùng vé ra tù mới được đổ, hoặc chọn ở lại.
   */
  step: 'roll' | 'buy' | 'upgrade' | 'manage' | 'wait' | 'debt' | 'ticket';
  dice: [number, number] | null;
  rollId: number;
  /** ô đang chờ quyết định mua (step buy) hoặc nâng cấp (step upgrade) */
  pendingBuy: number | null;
  /** số vé ra tù mỗi người đang cất trong túi */
  tickets?: Record<string, number>;
  /** khoản người đang tới lượt phải trả mà chưa đủ tiền mặt (step debt): tự bán nhà đất từng ô cho tới khi đủ */
  debt?: { amount: number; to: string | null; why: string } | null;
  turnEndsAt: number | null;
  turnSeconds: number;
  /** các dòng diễn biến gần nhất, mới nhất ở cuối */
  log: { id: number; kind: TyPhuLogKind; text: string }[];
  /** thẻ vừa rút: good = thẻ Cơ hội (luôn tốt), không thì thẻ Rủi ro (luôn xấu) */
  card: { id: number; text: string; good?: boolean } | null;
  /** các khung hình mô phỏng cú lăn xúc xắc đang diễn ra (null khi đã xong) */
  roll: DiceRollView | null;
  /** tốc độ chơi (1, 2, 3): rút ngắn thời gian đi quân, chờ và thông báo */
  speed?: number;
  /** người đang tới lượt vừa đổ đôi nên được tung tiếp */
  extraRoll?: boolean;
}

// ================= Hành động trong game =================

export type GameAction =
  | { type: 'submit'; word: string }
  | { type: 'hint' }
  | { type: 'appeal'; word: string }
  | { type: 'vote'; yes: boolean }
  | { type: 'roll'; impulse?: ThrowImpulse }
  | { type: 'move'; piece: number }
  | { type: 'bet'; symbol: BauCuaSymbol; amount: number }
  | { type: 'clearBets' }
  | { type: 'loan' }
  | { type: 'buy' }
  | { type: 'skip' }
  | { type: 'build'; cell: number; levels?: number }
  /** bán ở ô `cell`: `levels` = bán bớt chừng này cấp nhà/sao; `land` = bán cả lô (đất + nhà); không có gì = bán 1 lần (1 cấp, hết nhà thì bán đất) */
  | { type: 'sell'; cell: number; levels?: number; land?: boolean }
  | { type: 'endTurn' }
  | { type: 'payJail' }
  | { type: 'useTicket' }
  | { type: 'stayJail' }
  | { type: 'speed'; value: number }
  | { type: 'end' };

export type ActionError =
  // chung
  | 'not_playing'
  | 'spectating'
  | 'not_your_turn'
  | 'bad_action'
  | 'not_host'
  // nối từ
  | 'format'
  | 'chain'
  | 'used'
  | 'not_in_dictionary'
  /** chuỗi có dấu tiếng Việt (bộ gõ Telex/VNI đang bật) và không đoán ra từ tiếng Anh nào */
  | 'vi_keyboard'
  | 'timeout'
  | 'hint_used'
  | 'no_hint'
  | 'cannot_appeal'
  | 'no_voters'
  | 'not_voting'
  // cờ cá ngựa
  | 'illegal_move'
  // bầu cua
  | 'not_betting'
  | 'insufficient'
  | 'loan_denied'
  // cờ tỷ phú
  | 'cannot_build'
  | 'no_money';

/** `word`: từ server đã hiểu (sau khi chuẩn hóa / dịch ngược bộ gõ) — app dùng để hiện và xin duyệt đúng từ */
export type ActionResult = { ok: true; hint?: string; word?: string } | { ok: false; reason: ActionError; word?: string };

// ================= Tính năng "lầy" =================

export type ThrowItem = 'dep' | 'cachua' | 'trung' | 'phan' | 'hoa' | 'tim';
export type TauntId = 'nhanh' | 'ga' | 'anmay' | 'run' | 'huhon' | 'gg' | 'cuu' | 'dinh' | 'khoc' | 'denlai'
  | 'xiu' | 'bayma' | 'tuoi' | 'ngoan' | 'chaybai' | 'hetthuoc';

export const EMOJIS = ['😂', '🤣', '😍', '😎', '🤡', '😡', '😭', '💀', '🔥', '👏', '🙏', '🤝', '💯', '🎉'] as const;
export type Emoji = (typeof EMOJIS)[number];
export type HitMove = 'dam' | 'da' | 'tat' | 'chuong';
export const MAX_HP = 100;

/** hình vẽ bậy lên mặt bạn bè (hiện ~20 giây) */
export const DOODLES = ['ria', 'sung', 'muihe', 'mattim'] as const;
export type DoodleKind = (typeof DOODLES)[number];
/** biệt danh tạm thời (60 giây) chọn từ danh sách có sẵn, vui và vô hại */
export const NICKNAMES = [
  'game', 'nho', 'lidon', 'hexe', 'amvon', 'anhoi', 'ruabo', 'ngugat', 'khocnhe', 'angian', 'nhaybom', 'tuonglai',
] as const;
export type NicknameId = (typeof NICKNAMES)[number];
export const DOODLE_MS = 20_000;
export const NICK_MS = 60_000;

export type FunSend =
  | { kind: 'throw'; to: string; item: ThrowItem }
  | { kind: 'taunt'; taunt: TauntId }
  | { kind: 'poke'; to: string }
  | { kind: 'emoji'; emoji: Emoji }
  | { kind: 'hit'; to: string; move: HitMove }
  // "chọc mất dạy": chỉ để vui, không bao giờ ảnh hưởng kết quả ván
  | { kind: 'doodle'; to: string; doodle: DoodleKind }
  | { kind: 'roach'; to: string }
  | { kind: 'ink'; to: string }
  | { kind: 'nick'; to: string; nick: NicknameId }
  | { kind: 'honk'; to: string }
  | { kind: 'cry'; to: string }
  | { kind: 'blackout'; to: string }
  | { kind: 'spin'; to: string }
  | { kind: 'quake'; to: string }
  | { kind: 'charm' };

/**
 * sự kiện phát cho cả phòng; đánh nhau thì kèm sát thương và máu còn lại (máu ảo, không ảnh hưởng game).
 * `count` (số gián 2–3), `corner` (góc mực 0–3), `variant` (kiểu tiếng loa 0–2) do server bốc để mọi máy giống nhau.
 */
export type FunEvent = FunSend & {
  id: number; from: string; damage?: number; hp?: number; ko?: boolean;
  count?: number; corner?: number; variant?: number;
  /** người bị chọc đã nhận quá DISRUPT_LIMIT chiêu rung/lắc gần đây: chỉ hiện trên avatar, không rung màn hình họ */
  soft?: boolean;
  /** số mili giây được bù vào đồng hồ lượt của người bị chọc (đang tới lượt Nối từ) */
  pausedMs?: number;
};

/** Các chiêu làm rung/lắc/xoay/che màn hình người bị chọc: mỗi người chỉ nhận tối đa DISRUPT_LIMIT lần mỗi DISRUPT_WINDOW_MS */
export const DISRUPT_LIMIT = 3;
export const DISRUPT_WINDOW_MS = 15_000;
/** chiêu chỉ có tác dụng làm phiền màn hình: quá giới hạn thì bị chặn hẳn */
export const HARD_DISRUPT_KINDS = ['quake', 'spin', 'blackout', 'roach', 'ink', 'poke'] as const;
/** thời gian (ms) được bù vào lượt Nối từ khi người đang tới lượt dính chiêu */
export const DISRUPT_PAUSE_MS: Partial<Record<FunSend['kind'], number>> = {
  blackout: 4500, spin: 3500, roach: 3000, ink: 2000, quake: 1500, poke: 1000, hit: 1000, throw: 1000,
};
/** tổng thời gian bù tối đa trong một lượt */
export const DISRUPT_MAX_BONUS_MS = 15_000;
export type FunAck = { ok: boolean; /** bị giới hạn: thử lại sau chừng này ms */ retryMs?: number; reason?: 'limited' | 'busy' };

export const STICKER_IDS = [
  'quynh-01', 'quynh-02', 'quynh-03', 'quynh-04', 'quynh-05',
  'quynh-06', 'quynh-07', 'quynh-08', 'quynh-09',
] as const;
export type StickerId = (typeof STICKER_IDS)[number];
export type ChatSend = { kind?: 'text'; text: string } | { kind: 'sticker'; stickerId: StickerId };
export type ChatMsg = { id: number; from: string; name: string; at: number } & (
  | { kind?: 'text'; text: string; stickerId?: never }
  | { kind: 'sticker'; stickerId: StickerId; text?: never }
);
export const CHAT_MAX = 200;

// ================= Tài khoản =================

export interface GameStat {
  played: number;
  won: number;
}

export interface PublicUser {
  id: string;
  username: string;
  email?: string;
  displayName: string;
  avatar: number;
  avatarUrl?: string;
  stats: Partial<Record<GameType, GameStat>>;
  /** số dư Ruby (chỉ trả cho chính chủ) */
  ruby: number;
  /** tài khoản quản trị (ADMIN_USERNAMES) */
  admin?: true;
}

/** yêu cầu nạp Ruby chờ quản trị duyệt (thời gian: ms) */
export interface TopupRequest {
  id: string;
  userId: string;
  username: string;
  code: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  handledAt?: number;
  handledBy?: string;
  ruby?: number;
}

export type WalletError = 'need_account' | 'bad_request' | 'too_many' | 'forbidden' | 'not_found' | 'already_handled' | 'insufficient' | 'rate_limited';
/** ack của lệnh ví / quản trị */
export type WalletAck<T = {}> = (r: ({ ok: true } & T) | { ok: false; error: WalletError }) => void;
export interface WalletInfo { ruby: number; topupCode: string; firstTopupDone: boolean; pending: TopupRequest[] }
export interface WalletUpdate { ruby: number; delta: number; reason: string }

/** một dòng sổ Ruby */
export interface RubyLedgerRow {
  delta: number;
  balance: number;
  reason: string;
  ref?: string;
  at: number;
}

export type AuthError =
  | 'invalid_email'
  | 'email_taken'
  | 'bad_code'
  | 'code_expired'
  | 'mail_disabled'
  | 'invalid_username'
  | 'invalid_password'
  | 'invalid_name'
  | 'username_taken'
  | 'wrong_credentials'
  | 'session_expired'
  | 'rate_limited'
  | 'server_error';

export type AuthAck = { ok: true; token: string; user: PublicUser } | { ok: false; error: AuthError };

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
  | 'color_taken'
  /** đã bị chủ phòng mời ra: không vào lại được phòng đó */
  | 'kicked'
  | 'bad_request';

export type Ack<T = {}> = ({ ok: true } & T) | { ok: false; error: ErrorCode };

export interface JoinResult {
  code: string;
  playerId: string;
}

export interface ClientToServerEvents {
  'room:create': (
    p: { name: string; playerId?: string; gameType?: GameType; avatar?: number; avatarUrl?: string },
    ack: (r: Ack<JoinResult>) => void,
  ) => void;
  'room:join': (p: { code: string; name: string; playerId?: string; avatar?: number; avatarUrl?: string }, ack: (r: Ack<JoinResult>) => void) => void;
  'room:config': (p: { gameType?: GameType; settings?: Partial<RoomSettings> }, ack: (r: Ack) => void) => void;
  'player:customize': (p: Partial<CharacterConfig>, ack: (r: Ack) => void) => void;
  'game:start': (ack: (r: Ack) => void) => void;
  'game:action': (a: GameAction, ack: (r: ActionResult) => void) => void;
  'game:restart': (ack: (r: Ack) => void) => void;
  'room:leave': (ack: (r: Ack) => void) => void;
  /** chủ phòng đổi phòng thành công khai / riêng tư */
  'room:visibility': (p: { public: boolean }, ack: (r: Ack) => void) => void;
  /** chủ phòng mời một người ra khỏi phòng */
  'room:kick': (p: { playerId: string }, ack: (r: Ack) => void) => void;
  'fun:send': (f: FunSend, ack: (r: FunAck) => void) => void;
  /** đổi tên / mặt đại diện có sẵn ngay trong phòng (khách; người có tài khoản dùng auth:update) — được cả lúc đang chơi */
  'player:profile': (p: { name?: string; avatar?: number }, ack: (r: Ack) => void) => void;
  /** ảnh đại diện của khách: ảnh JPG/PNG/WebP đã thu nhỏ (base64), hoặc remove để bỏ ảnh */
  'player:photo': (p: { data?: string; remove?: boolean }, ack: (r: Ack<{ avatarUrl?: string }> | { ok: false; error: 'avatar_unavailable' | 'invalid_image' | 'rate_limited' | 'not_in_room' }) => void) => void;
  'chat:send': (p: ChatSend, ack: (r: { ok: boolean }) => void) => void;
  'auth:register': (p: { email: string; username: string; password: string; displayName: string; avatar?: number }, ack: (r: AuthAck) => void) => void;
  'auth:login': (p: { username: string; password: string }, ack: (r: AuthAck) => void) => void;
  'auth:forgot': (p: { who: string }, ack: (r: { ok: true } | { ok: false; error: 'mail_disabled' | 'invalid_username' | 'rate_limited' }) => void) => void;
  'auth:reset': (p: { who: string; code: string; password: string }, ack: (r: AuthAck) => void) => void;
  /** đã có email thì phải kèm mật khẩu hiện tại */
  'auth:setEmail': (p: { email: string; password?: string }, ack: (r: AuthAck) => void) => void;
  'auth:changePassword': (p: { oldPassword: string; password: string }, ack: (r: AuthAck) => void) => void;
  'auth:resume': (p: { token: string }, ack: (r: AuthAck) => void) => void;
  'auth:update': (p: { displayName?: string; avatar?: number }, ack: (r: AuthAck) => void) => void;
  'auth:logout': (ack: (r: { ok: boolean }) => void) => void;
  // ví Ruby (chỉ tài khoản)
  'wallet:get': (ack: WalletAck<WalletInfo>) => void;
  'wallet:request': (p: { amount: number }, ack: WalletAck<{ request: TopupRequest }>) => void;
  'wallet:history': (ack: WalletAck<{ rows: RubyLedgerRow[] }>) => void;
  // quản trị (ADMIN_USERNAMES)
  'admin:requests': (p: { status: TopupRequest['status'] }, ack: WalletAck<{ requests: TopupRequest[] }>) => void;
  'admin:approve': (p: { id: string; amount?: number }, ack: WalletAck<{ request: TopupRequest; ruby: number; balance: number }>) => void;
  'admin:reject': (p: { id: string }, ack: WalletAck<{ request: TopupRequest }>) => void;
  /** nonce: mã ngẫu nhiên của một lần bấm, gửi lại y nguyên khi thử lại để server không cộng trùng */
  'admin:creditCode': (p: { code: string; amount: number; nonce: string }, ack: WalletAck<{ request: TopupRequest; ruby: number; balance: number }>) => void;
  'admin:adjust': (p: { username: string; delta: number; reason: string }, ack: WalletAck<{ balance: number }>) => void;
  'admin:revenue': (ack: WalletAck<{ today: number; month: number; total: number }>) => void;
}

export interface ServerToClientEvents {
  'room:state': (s: RoomState) => void;
  'fun:event': (e: FunEvent) => void;
  'chat:msg': (m: ChatMsg) => void;
  'chat:history': (ms: ChatMsg[]) => void;
  /** bạn vừa bị chủ phòng mời ra khỏi phòng */
  'room:kicked': (p: { code: string }) => void;
  /** số dư Ruby vừa đổi (quản trị duyệt nạp, cộng/trừ tay) */
  'wallet:update': (p: WalletUpdate) => void;
  /** yêu cầu nạp bị từ chối */
  'wallet:rejected': (p: { amount: number }) => void;
  /** phiên đăng nhập trên máy này bị thu hồi (mật khẩu vừa được đặt lại / đổi ở máy khác) */
  'auth:revoked': () => void;
}
