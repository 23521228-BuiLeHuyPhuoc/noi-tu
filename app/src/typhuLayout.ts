import { TYPHU_SIZE, typhuCellPos } from '../../shared/src/typhu';

export interface Rect { x: number; y: number; w: number; h: number }
/** phía của cell hướng vào tâm bàn (nơi đặt dải màu bộ đất) */
export type BandSide = 'top' | 'bottom' | 'left' | 'right' | 'corner';

export interface BoardGeo {
  W: number; H: number; cw: number; ch: number; wm: number; hm: number;
  rect: Rect[];
  center: Rect;
  side: BandSide[];
}

/**
 * Bàn 11 × 11 kiểu bàn cờ in: 4 ô góc to, 9 ô mỗi cạnh, các ô sát nhau.
 * Vuông khi H = W; chế độ "2D tràn màn" truyền W ≠ H để bàn giãn kín cả chiều ngang lẫn dọc.
 */
export function makeGeo(W: number, H: number = W): BoardGeo {
  const dx = Math.round(W * 0.135);
  const dy = Math.round(H * 0.135);
  const mx = (W - 2 * dx) / 9;
  const my = (H - 2 * dy) / 9;
  const posX = (k: number) => (k === 0 ? 0 : k === 10 ? dx + 9 * mx : dx + (k - 1) * mx);
  const posY = (k: number) => (k === 0 ? 0 : k === 10 ? dy + 9 * my : dy + (k - 1) * my);
  const lenX = (k: number) => (k === 0 || k === 10 ? dx : mx);
  const lenY = (k: number) => (k === 0 || k === 10 ? dy : my);
  const rect: Rect[] = [];
  const side: BandSide[] = [];
  for (let i = 0; i < TYPHU_SIZE; i++) {
    const [r, c] = typhuCellPos(i);
    rect.push({ x: posX(c), y: posY(r), w: lenX(c), h: lenY(r) });
    const corner = (r === 0 || r === 10) && (c === 0 || c === 10);
    side.push(corner ? 'corner' : r === 10 ? 'top' : r === 0 ? 'bottom' : c === 0 ? 'right' : 'left');
  }
  return { W, H, cw: dx, ch: dy, wm: mx, hm: my, rect, side, center: { x: dx + 3, y: dy + 3, w: 9 * mx - 6, h: 9 * my - 6 } };
}

/** cách xem bàn cờ: nghiêng 3D (mặc định), 2D phẳng vuông, 2D tràn kín màn hình */
export type TyPhuViewMode = 'tilt' | 'flat' | 'fill';
export const TYPHU_VIEW_MODES: TyPhuViewMode[] = ['tilt', 'flat', 'fill'];
export const TYPHU_VIEW_LABEL: Record<TyPhuViewMode, string> = { tilt: '3D nghiêng', flat: '2D phẳng', fill: '2D tràn màn' };
const VIEW_KEY = 'xomlay.typhuView';
export function readViewMode(): TyPhuViewMode {
  try {
    const v = typeof localStorage !== 'undefined' ? localStorage.getItem(VIEW_KEY) : null;
    return (TYPHU_VIEW_MODES as string[]).includes(v ?? '') ? (v as TyPhuViewMode) : 'tilt';
  } catch {
    return 'tilt';
  }
}
export function saveViewMode(m: TyPhuViewMode): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(VIEW_KEY, m);
  } catch { /* bỏ qua */ }
}

export interface CenterLayout {
  wide: boolean;
  header: Rect; banner: Rect; action: Rect;
  wealth: Rect[]; chips: Rect; log: Rect;
  /** hàng nút nhỏ (trò chuyện, âm thanh, tổng kết, rời phòng) */
  tools: Rect;
  /** vùng thẻ Cơ hội/Rủi ro lật to, và chỗ thu nhỏ lại */
  cardBig: Rect; cardDock: Rect;
  diceSize: number;
  logRows: number;
}

/** Bố cục phần giữa bàn (toạ độ tương đối trong khung giữa). Tính tay để hiệu ứng biết vị trí thẻ tài sản. */
export function makeCenterLayout(w: number, h: number, n: number, _hasCard: boolean): CenterLayout {
  // giữa bàn vuông: hàng nút nhỏ trên cùng, khay xúc xắc ở giữa, tiền mọi người bên dưới
  const pad = 4;
  const gap = 5;
  const none: Rect = { x: 0, y: 0, w: 0, h: 0 };
  const inner = w - 2 * pad;
  const tools: Rect = { x: pad, y: pad, w: inner, h: 26 };
  // 2 người: 2 cột; 3 người: 1 hàng 3 cột; 4 người: 2×2; 5-6 người: 3 cột × 2 hàng (khay xúc xắc không bị bóp)
  // bàn quá hẹp (điện thoại nhỏ xoay ngang): tối đa 2 cột cho thẻ đủ chỗ hiện tên và tiền
  const cols = n <= 2 ? Math.max(1, n) : n === 4 || inner < 330 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const cardH = Math.max(32, Math.min(42, (h * 0.34 - 4 * (rows - 1)) / rows));
  const cardW = (inner - gap * (cols - 1)) / cols;
  const wealthH = rows * cardH + (rows - 1) * 4;
  const action: Rect = { x: pad, y: tools.y + tools.h + gap, w: inner, h: h - pad - wealthH - gap - (tools.y + tools.h + gap) };
  const y0 = action.y + action.h + gap;
  const wealth: Rect[] = Array.from({ length: n }, (_, i) => ({
    x: pad + (i % cols) * (cardW + gap), y: y0 + Math.floor(i / cols) * (cardH + 4), w: cardW, h: cardH,
  }));
  return {
    wide: true, header: none, banner: none, action, wealth, chips: none, log: none, tools,
    cardBig: { x: pad, y: pad, w: inner, h: h - 2 * pad },
    cardDock: none,
    diceSize: 0,
    logRows: 0,
  };
}
