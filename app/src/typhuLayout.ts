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

/** Bàn vuông 11 × 11 kiểu bàn cờ in: 4 ô góc vuông to, 9 ô mỗi cạnh, các ô sát nhau. */
export function makeGeo(S: number): BoardGeo {
  const d = Math.round(S * 0.135);
  const m = (S - 2 * d) / 9;
  const pos = (k: number) => (k === 0 ? 0 : k === 10 ? d + 9 * m : d + (k - 1) * m);
  const len = (k: number) => (k === 0 || k === 10 ? d : m);
  const rect: Rect[] = [];
  const side: BandSide[] = [];
  for (let i = 0; i < TYPHU_SIZE; i++) {
    const [r, c] = typhuCellPos(i);
    rect.push({ x: pos(c), y: pos(r), w: len(c), h: len(r) });
    const corner = (r === 0 || r === 10) && (c === 0 || c === 10);
    side.push(corner ? 'corner' : r === 10 ? 'top' : r === 0 ? 'bottom' : c === 0 ? 'right' : 'left');
  }
  return { W: S, H: S, cw: d, ch: d, wm: m, hm: m, rect, side, center: { x: d + 3, y: d + 3, w: 9 * m - 6, h: 9 * m - 6 } };
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
  const cols = n <= 2 ? Math.max(1, n) : n === 4 ? 2 : 3;
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
