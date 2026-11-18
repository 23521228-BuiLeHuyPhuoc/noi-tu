/**
 * 🃏 UNO Tàn Nhẫn — UNO Show 'Em No Mercy (`uno_mercy`, 2–12 người chơi + Bot tàn nhẫn)
 *
 * Phiên bản "Hủy Diệt Tình Bạn" cháy nhất thế giới:
 * 1. Cộng Dồn Không Đáy (+2, +4, +6, +10):
 *    Đang có chồng rút phạt (`drawStack > 0`), người kế tiếp được chồng tiếp bất kỳ lá rút phạt nào
 *    có mức phạt >= lá vừa đánh (`+2` -> `+2/+4/+6/+10`; `+4` -> `+4/+6/+10`; `+6` -> `+6/+10`; `+10` -> `+10`)!
 *    Tổng bài phạt dồn lên +16, +20, +26 lá đổ ập xuống kẻ hết bài đỡ!
 * 2. Luật Nổ Bài (Mercy Rule — >= 25 lá):
 *    Bất cứ ai cầm từ 25 lá trở lên trên tay ở bất kỳ thời điểm nào sẽ bị 💥 CHÁY BÀI — loại trực tiếp khỏi ván ngay lập tức!
 * 3. Luật 7–0 Đảo Ngược Thế Cờ:
 *    - Đánh lá số `7`: Chọn 1 đối thủ bất kỳ còn sống để TRÁO TOÀN BỘ BÀI TRÊN TAY (cướp trắng 1 lá UNO của bạn thân!).
 *    - Đánh lá số `0`: XOAY VÒNG BÀI CẢ BÀN theo chiều đánh hiện tại!
 * 4. Lá Đặc Biệt No Mercy:
 *    - `skip_all` (Bỏ Lượt Tất Cả): Cấm lượt toàn bộ bàn, người vừa đánh được đi tiếp ngay 1 lượt nữa!
 *    - `discard_all` (Xả Hết Cùng Màu): Đánh 1 lá, xả sạch toàn bộ các lá cùng màu đó trên tay xuống chồng bài bỏ!
 *    - `wild_roulette` (Vòng Quay Tử Thần): Chọn 1 màu chỉ định; người kế tiếp phải bốc bài liên tục cho tới khi bốc trúng màu đó (trừ lá Đổi Màu)!
 *    - `wild_reverse_draw4`, `wild_draw6`, `wild_draw10`.
 * 5. Hô "UNO!" & Bắt Lỗi Quên Hô (+2 lá phạt).
 */

export const UNO_MERCY_LIMIT = 25;
export const UNO_HAND_START = 7;
export const UNO_TURN_SECONDS = 20;
export const UNO_SWAP_SECONDS = 12;

export type UnoColor = 'red' | 'blue' | 'green' | 'yellow';
export type UnoCardColor = UnoColor | 'wild';

export const UNO_COLORS: UnoColor[] = ['red', 'blue', 'green', 'yellow'];

export const UNO_COLOR_META: Record<UnoColor, { name: string; hex: string; dark: string; light: string; border: string }> = {
  red: { name: 'Đỏ Lửa', hex: '#EF4444', dark: '#991B1B', light: '#FEE2E2', border: '#FCA5A5' },
  blue: { name: 'Xanh Băng', hex: '#2563EB', dark: '#1E3A8A', light: '#DBEAFE', border: '#93C5FD' },
  green: { name: 'Xanh Ngọc', hex: '#16A34A', dark: '#14532D', light: '#DCFCE7', border: '#86EFAC' },
  yellow: { name: 'Vàng Sét', hex: '#EAB308', dark: '#854D0E', light: '#FEF9C3', border: '#FDE047' },
};

export type UnoCardKind =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | 'skip'
  | 'reverse'
  | 'skip_all'
  | 'discard_all'
  | 'draw2'
  | 'draw4'
  | 'wild_roulette'
  | 'wild_reverse_draw4'
  | 'wild_draw6'
  | 'wild_draw10';

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  kind: UnoCardKind;
}

export type UnoMercyPhase = 'playing' | 'choose_swap';

export interface UnoLogEntry {
  id: number;
  text: string;
  tone: 'normal' | 'stack' | 'mercy' | 'swap' | 'uno' | 'wild';
}

export interface UnoMercyEffectBanner {
  id: number;
  kind: 'stack' | 'mercy_ko' | 'swap_7' | 'rotate_0' | 'discard_all' | 'skip_all' | 'roulette' | 'uno_catch';
  headline: string;
  subtext?: string;
  actorId?: string;
  targetId?: string;
}

export interface UnoMercyView {
  type: 'uno_mercy';
  phase: UnoMercyPhase;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  eliminated: { id: string; reason: 'mercy_25' | 'left'; peakCards: number }[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  turnEndsAt: number | null;
  turnSeconds: number;
  topCard: UnoCard;
  activeColor: UnoColor;
  /** Tổng số lá phạt đang cộng dồn chờ giáng xuống */
  drawStack: number;
  /** Mức rút tối thiểu (2 | 4 | 6 | 10) để được phép chồng tiếp lên drawStack hiện tại */
  drawMinValue: 0 | 2 | 4 | 6 | 10;
  /** Đang chờ người kế tiếp bốc Vòng Quay Tử Thần cho tới khi ra `activeColor` */
  roulettePending: boolean;
  /** Người chơi vừa đánh bài trong lượt hiện tại đã rút 1 lá có thể đánh (được phép đánh lá đó hoặc Bỏ qua `um_pass`) */
  drewThisTurn: boolean;
  /** Số lá trên tay mỗi người chơi (công khai cho cả bàn hồi hộp đếm tới mốc 25!) */
  handCounts: Record<string, number>;
  /** Những ai đang cầm đúng 1 lá và đã hô UNO an toàn */
  unoSafeIds: string[];
  /** Người vừa xuống còn 1 lá nhưng CHƯA bấm Hô UNO -> bất kỳ ai bấm Bắt Lỗi sẽ phạt +2 lá! */
  unoVulnerableId: string | null;
  /** Số bài còn trong nọc */
  deckCount: number;
  /** Chỉ gửi riêng cho đúng `viewerId` — người khác nhận mảng rỗng */
  myHand: UnoCard[];
  /** Hiệu ứng chấn động gần nhất để màn hình bung animation khổng lồ */
  lastBanner: UnoMercyEffectBanner | null;
  /** Lịch sử diễn biến bàn chơi */
  log: UnoLogEntry[];
}

export type UnoMercyAction =
  | { type: 'um_play'; cardId: string; chosenColor?: UnoColor; swapTargetId?: string }
  | { type: 'um_pick_swap'; targetId: string }
  | { type: 'um_draw' }
  | { type: 'um_pass' }
  | { type: 'um_shout_uno' }
  | { type: 'um_catch_uno'; targetId: string };

/** Giá trị cộng dồn của các lá rút phạt (0 nếu không phải lá cộng dồn). */
export function getUnoDrawValue(kind: UnoCardKind): 0 | 2 | 4 | 6 | 10 {
  switch (kind) {
    case 'draw2':
      return 2;
    case 'draw4':
    case 'wild_reverse_draw4':
      return 4;
    case 'wild_draw6':
      return 6;
    case 'wild_draw10':
      return 10;
    default:
      return 0;
  }
}

export function isUnoWild(card: UnoCard): boolean {
  return card.color === 'wild';
}

/** Kiểm tra 1 lá bài có hợp lệ để đánh ngay lúc này hay không (dùng chung cho cả Server và Client highlight bài!). */
export function canPlayUnoCard(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: UnoColor,
  drawStack: number,
  drawMinValue: number,
  roulettePending: boolean,
): boolean {
  // Đang dính Vòng Quay Tử Thần: bắt buộc bấm Rút Vòng Quay, không được đánh bài đè
  if (roulettePending) return false;

  // Đang có chồng bài phạt (+2/+4/+6/+10): chỉ được chồng lá rút phạt có giá trị >= drawMinValue!
  if (drawStack > 0) {
    const val = getUnoDrawValue(card.kind);
    return val > 0 && val >= drawMinValue;
  }

  // Lá Đổi Màu (Wild) luôn đánh được khi không bị khóa chồng phạt
  if (card.color === 'wild') return true;

  // Cùng màu đang hiệu lực hoặc cùng ký hiệu/số với lá trên đỉnh bàn
  if (card.color === activeColor) return true;
  if (card.kind === topCard.kind) return true;
  return false;
}

/** Nhãn hiển thị ngắn gọn trên mặt lá bài UNO Tàn Nhẫn */
export function getUnoCardLabel(kind: UnoCardKind): { symbol: string; title: string; subtitle?: string } {
  switch (kind) {
    case '0':
      return { symbol: '0', title: 'Số 0 · Xoay Bài', subtitle: 'Đổi bài cả bàn!' };
    case '7':
      return { symbol: '7', title: 'Số 7 · Cướp Bài', subtitle: 'Tráo bài 1 người!' };
    case '1':
    case '2':
    case '3':
    case '4':
    case '5':
    case '6':
    case '8':
    case '9':
      return { symbol: kind, title: `Số ${kind}` };
    case 'skip':
      return { symbol: '🚫', title: 'Cấm Lượt' };
    case 'reverse':
      return { symbol: '🔄', title: 'Đảo Chiều' };
    case 'skip_all':
      return { symbol: '⏭️', title: 'Bỏ Tất Cả', subtitle: 'Đánh tiếp lượt!' };
    case 'discard_all':
      return { symbol: '🌪️', title: 'Xả Cùng Màu', subtitle: 'Xả sạch màu này!' };
    case 'draw2':
      return { symbol: '+2', title: 'Rút +2' };
    case 'draw4':
      return { symbol: '+4', title: 'Rút +4 Màu' };
    case 'wild_roulette':
      return { symbol: '🎰', title: 'Vòng Quay Màu', subtitle: 'Bốc tới khi trúng!' };
    case 'wild_reverse_draw4':
      return { symbol: '🔄+4', title: 'Đảo Chiều +4' };
    case 'wild_draw6':
      return { symbol: '+6', title: 'Siêu Phạt +6' };
    case 'wild_draw10':
      return { symbol: '+10', title: 'Hủy Diệt +10' };
  }
}

const UNO_KIND_SORT_ORDER: Record<UnoCardKind, number> = {
  '0': 0,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  skip: 10,
  reverse: 11,
  skip_all: 12,
  discard_all: 13,
  draw2: 14,
  draw4: 15,
  wild_roulette: 16,
  wild_reverse_draw4: 17,
  wild_draw6: 18,
  wild_draw10: 19,
};

/** Sắp xếp bài trên tay gọn theo nhóm màu (ưu tiên màu đang hiệu lực lên đầu, lá Wild để cuối dễ bấm). */
export function sortUnoHand(cards: readonly UnoCard[], activeColor?: UnoColor): UnoCard[] {
  const colorRank = (c: UnoCardColor): number => {
    if (c === 'wild') return 10;
    if (activeColor && c === activeColor) return 0;
    switch (c) {
      case 'red':
        return 1;
      case 'blue':
        return 2;
      case 'green':
        return 3;
      case 'yellow':
        return 4;
    }
  };
  return [...cards].sort((a, b) => {
    const dc = colorRank(a.color) - colorRank(b.color);
    if (dc !== 0) return dc;
    const dk = UNO_KIND_SORT_ORDER[a.kind] - UNO_KIND_SORT_ORDER[b.kind];
    if (dk !== 0) return dk;
    return a.id.localeCompare(b.id);
  });
}
