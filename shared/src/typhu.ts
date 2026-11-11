/** Bàn Cờ tỷ phú 32 ô (9×9 viền). Dùng chung cho server (luật) và app (vẽ bàn). */

export type TyPhuGroup = 'nau' | 'troi' | 'hong' | 'cam' | 'do' | 'lam' | 'vang' | 'luc';

export type TyPhuCell =
  | { kind: 'start'; name: string }
  | { kind: 'jail'; name: string }
  | { kind: 'rest'; name: string }
  | { kind: 'gotojail'; name: string }
  | { kind: 'chance'; name: string }
  | { kind: 'community'; name: string }
  | { kind: 'station'; name: string; price: number }
  | { kind: 'utility'; name: string; price: number }
  | { kind: 'tax'; name: string; amount: number }
  | { kind: 'land'; name: string; group: TyPhuGroup; price: number; rent: number };

export const TYPHU_GROUPS: Record<TyPhuGroup, { color: string; house: number; name: string }> = {
  nau: { color: '#9C6644', house: 50, name: 'Miền Tây' },
  troi: { color: '#74C0FC', house: 50, name: 'Biển xanh' },
  hong: { color: '#F783AC', house: 100, name: 'Miền Trung' },
  cam: { color: '#FF922B', house: 100, name: 'Di sản' },
  do: { color: '#E03131', house: 150, name: 'Miền Bắc' },
  vang: { color: '#FCC419', house: 150, name: 'Cao nguyên' },
  luc: { color: '#2F9E44', house: 200, name: 'Đô thị' },
  lam: { color: '#364FC7', house: 150, name: 'Thành phố lớn' },
};

const land = (name: string, group: TyPhuGroup, price: number): TyPhuCell => ({
  // tiền thuê đất trống = 3/4 giá đất (Cần Thơ 60 -> 45, Sài Gòn 400 -> 300): đi vào đất người khác là đau
  kind: 'land', name, group, price, rent: Math.round((price * 3) / 4),
});

/** 40 ô theo chiều kim đồng hồ, bắt đầu từ góc dưới-phải (4 góc + 9 ô mỗi cạnh), thứ tự như bàn cờ in cổ điển. */
export const TYPHU_BOARD: TyPhuCell[] = [
  { kind: 'start', name: 'Xuất phát' },
  land('Cà Mau', 'nau', 60),
  { kind: 'community', name: 'Khí vận' },
  land('Bạc Liêu', 'nau', 60),
  { kind: 'tax', name: 'Thuế thu nhập', amount: 200 },
  { kind: 'station', name: 'Ga miền Tây', price: 200 },
  land('Châu Đốc', 'troi', 100),
  { kind: 'chance', name: 'Cơ hội' },
  land('Cần Thơ', 'troi', 100),
  land('Vĩnh Long', 'troi', 120),
  { kind: 'jail', name: 'Nhà tù' },
  land('Quy Nhơn', 'hong', 140),
  { kind: 'utility', name: 'Công ty điện', price: 150 },
  land('Nha Trang', 'hong', 140),
  land('Phan Thiết', 'hong', 160),
  { kind: 'station', name: 'Ga miền Trung', price: 200 },
  land('Huế', 'cam', 180),
  { kind: 'community', name: 'Khí vận' },
  land('Hội An', 'cam', 180),
  land('Đà Nẵng', 'cam', 200),
  { kind: 'rest', name: 'Nghỉ chân' },
  land('Hạ Long', 'do', 220),
  { kind: 'chance', name: 'Cơ hội' },
  land('Hải Phòng', 'do', 220),
  land('Sa Pa', 'do', 240),
  { kind: 'station', name: 'Ga miền Bắc', price: 200 },
  land('Đà Lạt', 'vang', 260),
  land('Buôn Ma Thuột', 'vang', 260),
  { kind: 'utility', name: 'Công ty nước', price: 150 },
  land('Pleiku', 'vang', 280),
  { kind: 'gotojail', name: 'Vào tù' },
  land('Biên Hòa', 'luc', 300),
  land('Bình Dương', 'luc', 300),
  { kind: 'community', name: 'Khí vận' },
  land('Vũng Tàu', 'luc', 320),
  { kind: 'station', name: 'Ga miền Nam', price: 200 },
  { kind: 'chance', name: 'Cơ hội' },
  land('Hà Nội', 'lam', 350),
  { kind: 'tax', name: 'Thuế xa xỉ', amount: 100 },
  land('Sài Gòn', 'lam', 400),
];

export interface TyPhuMovement {
  id: number;
  playerId: string;
  from: number;
  to: number;
  path: number[];
  startedAt: number;
  endsAt: number;
  /** thời gian xúc xắc lăn trước khi quân cờ bắt đầu đi (ms) */
  delay: number;
  kind: 'roll' | 'card' | 'jail';
}
/** mỗi ô quân cờ đi mất ~300ms (chia cho tốc độ x2, x3); xúc xắc lăn 1,6-2,1s tuỳ mô phỏng vật lý */
export const TYPHU_MOVE_STEP_MS = 300;
export const TYPHU_ROLL_MIN_MS = 1600;
export const TYPHU_ROLL_MAX_MS = 2100;
export function isTyPhuProperty(cell: TyPhuCell): cell is Extract<TyPhuCell, { price: number }> {
  return cell.kind === 'land' || cell.kind === 'station' || cell.kind === 'utility';
}
export function stationRent(count: number): number { return count > 0 ? 50 * 2 ** (count - 1) : 0; }
export function utilityRent(count: number, diceTotal: number): number { return count > 0 ? diceTotal * (count >= 2 ? 20 : 8) : 0; }

export const TYPHU_SIZE = TYPHU_BOARD.length;
export const TYPHU_JAIL = 10;
/** bàn vuông 11 × 11: 4 góc + 9 ô mỗi cạnh */
export const TYPHU_COLS = 11;
export const TYPHU_ROWS = 11;
export const TYPHU_START_CASH = 1500;
export const TYPHU_PASS_START = 200;
export const TYPHU_JAIL_FINE = 50;
export const TYPHU_MAX_HOUSES = 4; // 4 = khách sạn
export const TYPHU_TURN_SECONDS = 20;
export const TYPHU_SPEEDS = [1, 2, 3] as const;
/** hệ số tiền thuê theo số nhà (1..4) */
export const TYPHU_HOUSE_MULT = [2, 4, 6, 9];

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

export interface TyPhuSaleItem {
  cell: number;
  kind: 'house' | 'property';
  name: string;
  refund: number;
  houses: number;
  suggested: boolean;
}

/** Tổng số tiền thu được nếu người chơi bán hết nhà và đất cho ngân hàng (nửa giá), có thể trừ ra 1 ô đang xét nâng cấp. */
export function liquidValueOf(
  playerId: string,
  owners: Record<number, string>,
  houses: Record<number, number>,
  excludeCell?: number,
): number {
  let v = 0;
  for (const [k, owner] of Object.entries(owners)) {
    const i = Number(k);
    if (owner !== playerId || i === excludeCell) continue;
    const c = TYPHU_BOARD[i];
    if (!c || !isTyPhuProperty(c)) continue;
    v += c.price / 2;
    if (c.kind === 'land') v += ((houses[i] ?? 0) * TYPHU_GROUPS[c.group].house) / 2;
  }
  return v;
}

/** Danh sách tài sản có thể bán của người chơi (kèm đánh dấu những ô hệ thống đề xuất bán trước để đủ `needTotal` xu). */
export function suggestSales(
  playerId: string,
  needTotal: number,
  cash: number,
  owners: Record<number, string>,
  houses: Record<number, number>,
  excludeCell?: number,
): TyPhuSaleItem[] {
  const mine = TYPHU_BOARD.flatMap((c, i) => (isTyPhuProperty(c) && owners[i] === playerId && i !== excludeCell ? [i] : []));
  const byValue = (i: number) => (TYPHU_BOARD[i] as { price: number }).price;
  const sorted = [...mine].sort((a, b) => byValue(a) - byValue(b));

  let simCash = cash;
  const simHouses: Record<number, number> = { ...houses };
  const suggestedCells = new Set<number>();

  for (const i of sorted) {
    while (simCash < needTotal && (simHouses[i] ?? 0) > 0) {
      const c = TYPHU_BOARD[i] as Extract<TyPhuCell, { kind: 'land' }>;
      simHouses[i]--;
      simCash += TYPHU_GROUPS[c.group].house / 2;
      suggestedCells.add(i);
    }
  }
  for (const i of sorted) {
    if (simCash >= needTotal) break;
    if ((simHouses[i] ?? 0) > 0) continue;
    simCash += byValue(i) / 2;
    suggestedCells.add(i);
  }

  const items: TyPhuSaleItem[] = sorted.map((i) => {
    const c = TYPHU_BOARD[i] as Extract<TyPhuCell, { price: number }>;
    const h = houses[i] ?? 0;
    if (h > 0 && c.kind === 'land') {
      return {
        cell: i,
        kind: 'house',
        name: c.name,
        refund: TYPHU_GROUPS[c.group].house / 2,
        houses: h,
        suggested: suggestedCells.has(i),
      };
    }
    return {
      cell: i,
      kind: 'property',
      name: c.name,
      refund: c.price / 2,
      houses: 0,
      suggested: suggestedCells.has(i),
    };
  });

  return items.sort((a, b) => (a.suggested === b.suggested ? 0 : a.suggested ? -1 : 1));
}

/** Toạ độ (hàng, cột) trên lưới 9×9. */
export function typhuCellPos(i: number): [number, number] {
  if (i <= 10) return [10, 10 - i];
  if (i <= 19) return [20 - i, 0];
  if (i <= 30) return [0, i - 20];
  return [i - 30, 10];
}
