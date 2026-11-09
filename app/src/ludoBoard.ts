/**
 * Toạ độ bàn cờ cá ngựa 15×15 (hàng, cột). Chuồng: đỏ trên-trái, xanh lá trên-phải,
 * vàng dưới-phải, xanh dương dưới-trái. Đường chạy 52 ô theo chiều kim đồng hồ.
 */
import { LUDO_FINISH, LUDO_HOME_START, LUDO_START, LUDO_TRACK, type LudoColor } from '../../shared/src/types';

export type Cell = [number, number];

export const TRACK: Cell[] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

/** đường về đích (5 ô) của từng màu, theo thứ tự đi vào */
export const HOME: Record<LudoColor, Cell[]> = {
  red: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  green: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  yellow: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  blue: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
};

/** ô đích (trong tam giác giữa bàn) */
export const FINISH: Record<LudoColor, [number, number]> = {
  red: [7, 6.15],
  green: [6.15, 7],
  yellow: [7, 7.85],
  blue: [7.85, 7],
};

/** góc trên-trái của khu chuồng 6×6 */
export const BASE: Record<LudoColor, Cell> = { red: [0, 0], green: [0, 9], yellow: [9, 9], blue: [9, 0] };

/** vị trí chỗ đứng trong chuồng (tâm, đơn vị ô) */
export function baseSlot(color: LudoColor, k: number): [number, number] {
  const [r, c] = BASE[color];
  const slots: [number, number][] = [[1.9, 1.9], [1.9, 4.1], [4.1, 1.9], [4.1, 4.1]];
  const [dr, dc] = slots[k % 4];
  return [r + dr, c + dc];
}

/** Tâm (hàng, cột) của con ngựa có tiến độ `progress` */
export function piecePos(color: LudoColor, progress: number, k: number): [number, number] {
  if (progress < 0) return baseSlot(color, k);
  if (progress < LUDO_HOME_START) {
    const [r, c] = TRACK[(LUDO_START[color] + progress) % LUDO_TRACK];
    return [r + 0.5, c + 0.5];
  }
  if (progress < LUDO_FINISH) {
    const [r, c] = HOME[color][progress - LUDO_HOME_START];
    return [r + 0.5, c + 0.5];
  }
  const [r, c] = FINISH[color];
  // các con về đích xếp lệch nhau một chút
  return [r + 0.5 + (k % 2) * 0.25 - 0.12, c + 0.5 + (k >> 1) * 0.25 - 0.12];
}

/** màu của các ô đặc biệt (ô xuất phát) */
export const START_CELL: Record<string, LudoColor> = Object.fromEntries(
  (Object.keys(LUDO_START) as LudoColor[]).map((c) => [TRACK[LUDO_START[c]].join(','), c]),
);
