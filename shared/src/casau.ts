/**
 * Kiểu dữ liệu & hằng số dùng chung cho trò chơi Khám Răng Cá Sấu (`ca_sau`, 2–12 người).
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export type CaSauPhase = 'pressing' | 'bite_reveal';

export type CaSauToothState = 'intact' | 'safe' | 'gold' | 'reverse' | 'trap';

export const CA_SAU_DEFAULT_ROUNDS = 4;
export const CA_SAU_ROUND_OPTIONS = [3, 4, 6] as const;
export type CaSauRounds = (typeof CA_SAU_ROUND_OPTIONS)[number];

export const CA_SAU_TURN_SECONDS = 9;
export const CA_SAU_REVEAL_MS = 3200;
export const CA_SAU_MAX_LIVES = 3;

export const CA_SAU_SAFE_BASE_PTS = 15;
export const CA_SAU_SAFE_STEP_PTS = 3;
export const CA_SAU_GOLD_PTS = 40;
export const CA_SAU_BITE_PENALTY = 25;

/**
 * Tính tổng số răng cá sấu theo số người chơi (luôn chẵn từ 14 đến 24 để chia đều hàm trên & hàm dưới đối xứng).
 */
export function computeCaSauTeethCount(playerCount: number): number {
  const n = Math.max(2, Math.floor(playerCount));
  const raw = Math.min(24, Math.max(14, n * 2 + 8));
  return raw % 2 === 0 ? raw : raw + 1;
}

export type CaSauAction =
  | { type: 'cs_press'; tooth: number }
  | { type: 'end' };

export interface CaSauView {
  type: 'ca_sau';
  round: number;
  maxRounds: number;
  phase: CaSauPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  order: string[];
  names: Record<string, string>;
  currentPlayerId: string | null;
  direction: 1 | -1;
  totalTeeth: number;
  teeth: CaSauToothState[];
  pressedBy: Record<number, string>;
  scores: Record<string, number>;
  bites: Record<string, number>;
  lastActionText: string | null;
  bittenPlayerId: string | null;
  trapTooth: number | null;
  /** Số tim gan dạ còn lại của mỗi người (bắt đầu 3 tim; hết tim vẫn chơi tiếp mọi hiệp, không ai phải ngồi xem) */
  lives?: Record<string, number>;
}
