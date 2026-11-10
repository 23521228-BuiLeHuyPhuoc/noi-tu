/** Bàn Cờ tỷ phú 28 ô (8×8 viền). Dùng chung cho server (luật) và app (vẽ bàn). */

export type TyPhuGroup = 'nau' | 'troi' | 'hong' | 'cam' | 'do' | 'lam';

export type TyPhuCell =
  | { kind: 'start'; name: string }
  | { kind: 'jail'; name: string }
  | { kind: 'rest'; name: string }
  | { kind: 'gotojail'; name: string }
  | { kind: 'chance'; name: string }
  | { kind: 'tax'; name: string; amount: number }
  | { kind: 'land'; name: string; group: TyPhuGroup; price: number; rent: number };

export const TYPHU_GROUPS: Record<TyPhuGroup, { color: string; house: number; name: string }> = {
  nau: { color: '#9C6644', house: 50, name: 'Miền Tây' },
  troi: { color: '#74C0FC', house: 50, name: 'Sông nước' },
  hong: { color: '#F783AC', house: 100, name: 'Biển miền Trung' },
  cam: { color: '#FF922B', house: 100, name: 'Cố đô' },
  do: { color: '#E03131', house: 150, name: 'Miền Bắc' },
  lam: { color: '#364FC7', house: 150, name: 'Thành phố lớn' },
};

const land = (name: string, group: TyPhuGroup, price: number): TyPhuCell => ({
  kind: 'land', name, group, price, rent: Math.round(price / 10),
});

/** 28 ô theo chiều kim đồng hồ, bắt đầu từ góc dưới-phải */
export const TYPHU_BOARD: TyPhuCell[] = [
  { kind: 'start', name: 'Xuất phát' },
  land('Cà Mau', 'nau', 60),
  { kind: 'chance', name: 'Cơ hội' },
  land('Bạc Liêu', 'nau', 60),
  land('Sóc Trăng', 'nau', 80),
  { kind: 'tax', name: 'Thuế', amount: 100 },
  land('Châu Đốc', 'troi', 100),
  { kind: 'jail', name: 'Nhà tù' },
  land('Cần Thơ', 'troi', 100),
  land('Vĩnh Long', 'troi', 120),
  { kind: 'chance', name: 'Cơ hội' },
  land('Quy Nhơn', 'hong', 140),
  land('Nha Trang', 'hong', 140),
  land('Phan Thiết', 'hong', 160),
  { kind: 'rest', name: 'Nghỉ chân' },
  land('Huế', 'cam', 180),
  land('Hội An', 'cam', 180),
  { kind: 'chance', name: 'Cơ hội' },
  land('Đà Nẵng', 'cam', 200),
  land('Hạ Long', 'do', 220),
  land('Hải Phòng', 'do', 220),
  { kind: 'gotojail', name: 'Vào tù' },
  land('Sa Pa', 'do', 240),
  { kind: 'tax', name: 'Thuế xa xỉ', amount: 150 },
  land('Đà Lạt', 'lam', 280),
  { kind: 'chance', name: 'Cơ hội' },
  land('Hà Nội', 'lam', 300),
  land('Sài Gòn', 'lam', 350),
];

export const TYPHU_SIZE = TYPHU_BOARD.length;
export const TYPHU_JAIL = 7;
export const TYPHU_START_CASH = 1500;
export const TYPHU_PASS_START = 200;
export const TYPHU_JAIL_FINE = 50;
export const TYPHU_MAX_HOUSES = 4; // 4 = khách sạn
export const TYPHU_TURN_SECONDS = 20;
/** hệ số tiền thuê theo số nhà (1..4) */
export const TYPHU_HOUSE_MULT = [5, 15, 30, 45];

export function groupCells(group: TyPhuGroup): number[] {
  return TYPHU_BOARD.flatMap((c, i) => (c.kind === 'land' && c.group === group ? [i] : []));
}

/** Tiền thuê một ô đất (đã biết chủ có đủ bộ màu hay không và số nhà) */
export function rentOf(cell: number, houses: number, fullGroup: boolean): number {
  const c = TYPHU_BOARD[cell];
  if (c.kind !== 'land') return 0;
  if (houses > 0) return c.rent * TYPHU_HOUSE_MULT[houses - 1];
  return fullGroup ? c.rent * 2 : c.rent;
}

/** Toạ độ (hàng, cột) của ô trên lưới 8×8 */
export function typhuCellPos(i: number): [number, number] {
  if (i <= 7) return [7, 7 - i]; // hàng dưới, phải -> trái
  if (i <= 14) return [14 - i, 0]; // cột trái, dưới -> trên
  if (i <= 21) return [0, i - 14]; // hàng trên, trái -> phải
  return [i - 21, 7]; // cột phải, trên -> dưới
}
