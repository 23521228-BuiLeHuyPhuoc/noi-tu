/**
 * Kiểu dữ liệu, hằng số & bộ chiến lợi phẩm cho game Chia Chác Giang Hồ (`cashnguns` — Cash 'n Guns Edition).
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export const CG_MAX_ROUNDS = 8;
export const CG_START_HP = 3;
export const CG_CLIP_CLICK = 5;
export const CG_CLIP_BANG = 3;
export const CG_LOOT_PER_ROUND = 8;
export const CG_DIAMOND_BONUS = 60_000;

export type CgBullet = 'click' | 'bang';
export type CgPhase = 'plan' | 'standoff' | 'resolve';

export type CgLootKind =
  | 'cash_5k'
  | 'cash_10k'
  | 'cash_20k'
  | 'diamond_1k'
  | 'diamond_5k'
  | 'diamond_10k'
  | 'medkit'
  | 'godfather';

export interface CgLootCard {
  id: string;
  kind: CgLootKind;
  label: string;
  value: number;
  emoji: string;
}

export interface CgShotResult {
  fromId: string;
  toId: string;
  bullet: CgBullet;
  dodged: boolean;
  blocked?: boolean;
}

export interface CashGunsView {
  type: 'cashnguns';
  round: number;
  maxRounds: number;
  phase: CgPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  order: string[];
  names: Record<string, string>;
  hp: Record<string, number>;
  alive: string[];
  cash: Record<string, number>;
  diamonds: Record<string, number>;
  godfatherId: string;
  tableLoot: CgLootCard[];
  plannedIds: string[];
  /** chỉ hiện từ phase 'standoff' trở đi: ai đang chĩa súng vào ai */
  aims: Record<string, string | null>;
  /** những ai đã bấm Đầu hàng (nằm xuống) trong pha standoff */
  surrendered: string[];
  /** người Bố Già ép đổi mục tiêu trong pha standoff */
  redirectedByGodfather?: { targetId: string; oldAim: string; newAim: string } | null;
  /** kết quả nổ súng & chia chiến lợi phẩm ở pha 'resolve' */
  lastShots: CgShotResult[];
  lastLootGains: Record<string, string[]>;
  /** riêng theo người xem (perPlayerView) */
  myClip: CgBullet[];
  myPickedBulletIndex: number | null;
  myAimTarget: string | null;
}

interface LootRecipe {
  kind: CgLootKind;
  count: number;
  label: string;
  value: number;
  emoji: string;
}

const LOOT_RECIPES: readonly LootRecipe[] = [
  { kind: 'cash_5k', count: 15, label: 'Cọc $5,000', value: 5_000, emoji: '💵' },
  { kind: 'cash_10k', count: 18, label: 'Cọc $10,000', value: 10_000, emoji: '💴' },
  { kind: 'cash_20k', count: 12, label: 'Va-li $20,000', value: 20_000, emoji: '💰' },
  { kind: 'diamond_1k', count: 9, label: 'Kim cương $1,000', value: 1_000, emoji: '💎' },
  { kind: 'diamond_5k', count: 5, label: 'Kim cương $5,000', value: 5_000, emoji: '💎' },
  { kind: 'diamond_10k', count: 1, label: 'Kim cương Hoàng Gia $10,000', value: 10_000, emoji: '💎' },
  { kind: 'medkit', count: 3, label: 'Hộp Cứu Thương (Hồi đầy 3 tim)', value: 0, emoji: '🩹' },
  { kind: 'godfather', count: 1, label: 'Quyền Trượng Bố Già', value: 0, emoji: '🎩' },
];

/**
 * Tạo bộ bài 64 lá chiến lợi phẩm cân bằng cho 8 vòng × 8 lá:
 * - 45 tờ tiền mặt ($5k, $10k, $20k)
 * - 15 viên kim cương ($1k, $5k, $10k) — nhiều kim cương nhất cuối ván ẵm thưởng Vua Kim Cương +$60,000!
 * - 3 Hộp Cứu Thương (hồi đầy 3 HP)
 * - 1 Quyền Trượng Bố Già (chiếm ngôi Bố Già từ vòng kế)
 */
export function buildCgLootDeck(): CgLootCard[] {
  const deck: CgLootCard[] = [];
  let seq = 1;
  for (const r of LOOT_RECIPES) {
    for (let i = 0; i < r.count; i++) {
      deck.push({
        id: `cg_loot_${String(seq++).padStart(2, '0')}`,
        kind: r.kind,
        label: r.label,
        value: r.value,
        emoji: r.emoji,
      });
    }
  }
  return deck;
}

/**
 * Tính tổng tài sản cuối ván:
 * - Người chơi đã ngã xuống (`!alive.has(id)`) không được chia phần cuối ván (`totals[id] = 0`).
 * - Trong số những người còn sống, người sở hữu nhiều viên kim cương nhất (tối thiểu >= 1 viên)
 *   nhận danh hiệu Vua Kim Cương kèm tiền thưởng `$60,000`.
 */
export function cgTotalWealth(
  cash: Record<string, number>,
  diamonds: Record<string, number>,
  alive: ReadonlySet<string>,
): { totals: Record<string, number>; diamondKingIds: string[] } {
  const allIds = new Set<string>([
    ...Object.keys(cash),
    ...Object.keys(diamonds),
    ...alive,
  ]);

  let maxDiamonds = 0;
  for (const id of alive) {
    const count = diamonds[id] ?? 0;
    if (count > maxDiamonds) {
      maxDiamonds = count;
    }
  }

  const diamondKingIds: string[] = [];
  if (maxDiamonds >= 1) {
    for (const id of alive) {
      if ((diamonds[id] ?? 0) === maxDiamonds) {
        diamondKingIds.push(id);
      }
    }
  }
  const kingSet = new Set(diamondKingIds);

  const totals: Record<string, number> = {};
  for (const id of allIds) {
    if (!alive.has(id)) {
      totals[id] = 0;
      continue;
    }
    const base = cash[id] ?? 0;
    totals[id] = base + (kingSet.has(id) ? CG_DIAMOND_BONUS : 0);
  }

  return { totals, diamondKingIds };
}
