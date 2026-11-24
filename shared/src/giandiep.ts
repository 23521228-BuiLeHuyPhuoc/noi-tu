import { matchGuess } from './fuzzyGuess';

/**
 * Kiểu dữ liệu & luật so khớp cho game "Ai Là Gián Điệp" (Undercover / Mr. White, 3–12 người).
 * Ngân hàng cặp từ nằm ở giandiep-words.ts.
 */

export type GianDiepRole = 'dan' | 'giandiep' | 'mrwhite';

export type GianDiepPhase =
  | 'word_reveal'
  | 'clue_turn'
  | 'clue_summary'
  | 'discussion'
  | 'vote'
  | 'defense'
  | 'final_vote'
  | 'mrwhite_guess'
  | 'spy_guess'
  | 'reveal_end';

export interface GianDiepWordPair {
  category: string;
  wordA: string;
  wordB: string;
  cluesA: string[];
  cluesB: string[];
}

export interface GianDiepClue {
  id: number;
  round: number;
  playerId: string;
  name: string;
  text: string;
  at?: number;
}

export type GianDiepFeedKind = 'clue' | 'chat' | 'defense' | 'system' | 'elimination';

export interface GianDiepFeedItem {
  id: number;
  round: number;
  kind: GianDiepFeedKind;
  playerId?: string;
  name?: string;
  role?: GianDiepRole;
  text: string;
  at?: number;
}

export interface GianDiepRevealPlayer {
  id: string;
  name: string;
  role: GianDiepRole;
  word: string | null;
  alive: boolean;
}

export interface GianDiepView {
  type: 'giandiep';
  round: number;
  phase: GianDiepPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  category: string;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  eliminated: { id: string; role: GianDiepRole; round: number; word?: string | null }[];
  currentSpeakerId: string | null;
  speakerOrder: string[];
  clues: GianDiepClue[];
  /** Luồng lịch sử hợp nhất (Miêu tả + Biện minh + Thảo luận + Sự kiện hệ thống) */
  timeline: GianDiepFeedItem[];
  readySkip: string[];
  votes: Record<string, string | 'skip'>;
  /** Danh sách nghi phạm cao phiếu nhất bước vào Pha Biện Minh (`defense`) & Phán Quyết (`final_vote`) */
  defendants: string[];
  /** Phiếu Phán Quyết cuối cùng: 'banish' | 'forgive' (nếu 1 bị cáo) hoặc id bị cáo / 'skip' (nếu nhiều bị cáo đồng phiếu) */
  finalVotes: Record<string, string>;
  /** Danh sách ID người chơi đã sử dụng quyền hòa phiếu phán quyết 1 lần trong ván */
  tiePardonUsed?: string[];
  mrWhiteId: string | null;
  /** Tổng số ký tự chữ/số của từ khóa phe Dân (chỉ gửi trong pha đoán từ, không tiết lộ số tiếng) */
  targetCharCount?: number | null;
  /** Cơ cấu vai diễn toàn ván & số người phe Dân / phe Ẩn danh còn sống */
  roleSummary?: { dan: number; giandiep: number; mrwhite: number };
  aliveCounts?: { dan: number; hidden: number };
  /** Mở toàn bộ vai trò & từ khóa của từng người ở cuối ván (`reveal_end`) để cả phòng đối chiếu */
  revealedAll: GianDiepRevealPlayer[] | null;
  winnerIds?: string[] | null;
  wordPairReveal: { wordA: string; wordB: string; winnerHeadline: string } | null;
  /** Chỉ gửi riêng cho đúng viewerId */
  myRole: GianDiepRole | null;
  myWord: string | null;
}

/** Đếm số ký tự chữ cái / chữ số của từ khóa (bỏ khoảng trắng và dấu câu, không tiết lộ số tiếng). */
export function countWordChars(word: string): number {
  return Array.from(word.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')).length;
}

function slashVariants(word: string): string[] {
  const out = [word];
  const slashIdx = word.indexOf('/');
  if (slashIdx < 0) return out;
  const before = word.slice(0, slashIdx).trim();
  const afterPart = word.slice(slashIdx + 1).trim();
  const prefixTokens = before.split(/\s+/);
  if (before) out.push(before);
  if (afterPart) out.push(prefixTokens.length > 1 ? `${prefixTokens.slice(0, -1).join(' ')} ${afterPart}` : afterPart);
  return out;
}

/**
 * Gián Điệp / Mr. White đoán từ khóa phe Dân: chấp nhận đoán "hơi khớp" (xem `matchGuess` ở fuzzyGuess.ts)
 * — không phân biệt hoa thường, có/không dấu, thừa dấu câu, sai chính tả nhẹ, thừa/thiếu loại từ
 * hay một tiếng phụ — nhưng từ chối khi câu đoán nghiêng về từ của phe còn lại.
 */
export function matchGianDiepGuess(guess: string, target: string, otherWord?: string): boolean {
  const others = otherWord ? slashVariants(otherWord) : [];
  return slashVariants(target).some((v) => matchGuess(guess, v, others));
}

export const GIAN_DIEP_ROLE_META: Record<GianDiepRole, { name: string; emoji: string; color: string; desc: string }> = {
  dan: {
    name: 'Dân Thường',
    emoji: '🧑',
    color: '#2B8A3E',
    desc: 'Mô tả từ khóa khéo léo để đồng đội nhận ra nhau nhưng đừng quá lộ!',
  },
  giandiep: {
    name: 'Gián Điệp',
    emoji: '🕵️',
    color: '#D9480F',
    desc: 'Từ của bạn hơi khác đa số! Hãy lắng nghe, trà trộn và trụ tới cuối.',
  },
  mrwhite: {
    name: 'Mr. White',
    emoji: '🤍',
    color: '#495057',
    desc: 'Bạn KHÔNG có từ khóa! Nghe lỏm để chém gió và đoán đúng từ nếu bị loại.',
  },
};

export const MR_WHITE_GENERIC_CLUES = [
  'Món này quen lắm luôn á',
  'Hồi nhỏ hay gặp cái này',
  'Nhiều người thích lắm nè',
  'Để mô tả sao cho khỏi lộ đây ta',
  'Nhắc tới là thấy quen thuộc ghê',
  'Tùy người thích hoặc không thích',
  'Gần gũi với đời sống hằng ngày',
  'Ở đâu cũng có thể bắt gặp',
];

export { GIAN_DIEP_WORDS } from './giandiep-words';

/** tên bộ bốc thăm cặp từ Gián điệp trong kho "khóa đã dùng" của server */
export const GIAN_DIEP_DECK = 'giandiep';

/** khóa ổn định của một cặp từ (nhớ cặp đã chơi theo nội dung, không theo vị trí trong ngân hàng) */
export function gianDiepPairKey(pair: Pick<GianDiepWordPair, 'wordA' | 'wordB'>): string {
  return `${pair.wordA}|${pair.wordB}`.normalize('NFC').toLowerCase();
}
