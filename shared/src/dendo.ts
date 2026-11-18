/**
 * Kiểu dữ liệu & hằng số dùng chung cho trò chơi Đèn Đỏ Đèn Xanh (`den_do`, 2–12 người).
 * Đua nước rút 0 -> 100m cùng Búp Bê Cảnh Sát Giao Thông + Đạo Cụ Bóp Đồng Đội siêu lầy!
 */

export type DenDoLight = 'green' | 'yellow' | 'red';

export type DenDoItem = 'fake_green' | 'banana' | 'shield';

export const DEN_DO_GOAL_METERS = 100;
export const DEN_DO_DEFAULT_ROUNDS = 14;
export const DEN_DO_ROUND_OPTIONS = [10, 14, 18] as const;
export type DenDoRounds = (typeof DEN_DO_ROUND_OPTIONS)[number];

export const DEN_DO_MATCH_MAX_MS = 95_000;
export const DEN_DO_GREEN_MIN_MS = 2600;
export const DEN_DO_GREEN_MAX_MS = 5200;
export const DEN_DO_YELLOW_MS = 550;
export const DEN_DO_RED_MIN_MS = 2200;
export const DEN_DO_RED_MAX_MS = 3600;
export const DEN_DO_RED_GRACE_MS = 180;

export const DEN_DO_MIN_STEP_MS = 110;
export const DEN_DO_GREEN_STEP = 3.5;
export const DEN_DO_YELLOW_STEP = 1;
export const DEN_DO_RED_PENALTY = 28;
export const DEN_DO_BANANA_PENALTY = 12;
export const DEN_DO_SIREN_MS = 2200;

export const DEN_DO_GIFT_CHECKPOINTS = [25, 55, 80] as const;
export const DEN_DO_ITEMS: readonly DenDoItem[] = ['fake_green', 'banana', 'shield'];

export const DEN_DO_ITEM_INFO: Record<DenDoItem, { emoji: string; name: string; desc: string }> = {
  fake_green: {
    emoji: '📣',
    name: 'Còi Giả Đèn Xanh',
    desc: 'Hô giả «Chạy đi kìa!!» lúc Đèn Đỏ dụ đối thủ giật mình bị bắn!',
  },
  banana: {
    emoji: '🍌',
    name: 'Vỏ Chuối Trượt Ngã',
    desc: 'Ném vào người dẫn đầu làm trượt chân tụt lùi -12m!',
  },
  shield: {
    emoji: '🛡️',
    name: 'Áo Tàng Hình',
    desc: 'Chặn 1 lần tia Laser Đèn Đỏ hoặc 1 Vỏ Chuối!',
  },
};

export type DenDoAction =
  | { type: 'dd_step' }
  | { type: 'dd_trick' }
  | { type: 'end' };

export interface DenDoView {
  type: 'den_do';
  light: DenDoLight;
  lightEndsAt: number | null;
  lightSeconds: number;
  round: number;
  maxRounds: number;
  progress: Record<string, number>;
  caughtIds: string[];
  shieldedIds: string[];
  items: Record<string, DenDoItem | null>;
  fakeSirenBy: string | null;
  fakeSirenUntil: number | null;
  finishedOrder: string[];
  lastEvents: string[];
  order: string[];
  names: Record<string, string>;
}
