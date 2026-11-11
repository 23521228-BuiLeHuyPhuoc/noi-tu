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

/** Bàn chữ nhật 11 cột × 7 hàng cho màn ngang: ô góc to, 9 ô trên/dưới, 5 ô mỗi bên; giữa các ô có khe nhỏ. */
export function makeGeo(W: number, H: number): BoardGeo {
  const cw = Math.round(W * 0.115);
  const ch = Math.round(H * 0.2);
  const wm = (W - 2 * cw) / 9;
  const hm = (H - 2 * ch) / 5;
  const colX = (c: number) => (c === 0 ? 0 : c === 10 ? cw + 9 * wm : cw + (c - 1) * wm);
  const colW = (c: number) => (c === 0 || c === 10 ? cw : wm);
  const rowY = (r: number) => (r === 0 ? 0 : r === 6 ? ch + 5 * hm : ch + (r - 1) * hm);
  const rowH = (r: number) => (r === 0 || r === 6 ? ch : hm);
  const G = 2; // khe giữa các ô
  const rect: Rect[] = [];
  const side: BandSide[] = [];
  for (let i = 0; i < TYPHU_SIZE; i++) {
    const [r, c] = typhuCellPos(i);
    rect.push({ x: colX(c) + G / 2, y: rowY(r) + G / 2, w: colW(c) - G, h: rowH(r) - G });
    const corner = (r === 0 || r === 6) && (c === 0 || c === 10);
    side.push(corner ? 'corner' : r === 6 ? 'top' : r === 0 ? 'bottom' : c === 0 ? 'right' : 'left');
  }
  return { W, H, cw, ch, wm, hm, rect, side, center: { x: cw + 3, y: ch + 3, w: 9 * wm - 6, h: 5 * hm - 6 } };
}

export interface CenterLayout {
  wide: boolean;
  header: Rect; banner: Rect; action: Rect;
  wealth: Rect[]; chips: Rect; log: Rect;
  /** hàng nút nhỏ (trò chuyện, âm thanh, tổng kết, rời phòng) */
  tools: Rect;
  /** vùng thẻ Cơ hội/Khí vận lật to, và chỗ thu nhỏ lại */
  cardBig: Rect; cardDock: Rect;
  diceSize: number;
  logRows: number;
}

/** Bố cục phần giữa bàn (toạ độ tương đối trong khung giữa). Tính tay để hiệu ứng biết vị trí thẻ tài sản. */
export function makeCenterLayout(w: number, h: number, n: number, hasCard: boolean): CenterLayout {
  const pad = 6;
  const gap = 5;
  const wide = w > h * 1.3;
  const dock = hasCard ? 30 : 0;
  const ROW = 26; // chiều cao một dòng log
  if (!wide) {
    const inner = w - 2 * pad;
    const header: Rect = { x: pad, y: pad, w: inner, h: 26 };
    const banner: Rect = { x: pad, y: header.y + header.h + gap, w: inner, h: 52 };
    const rows = Math.ceil(n / 2);
    const baseCard = n > 4 ? 40 : 46;
    const chipsH = 48;
    const base = pad * 2 + header.h + banner.h + gap * 4 + 150 + rows * baseCard + (rows - 1) * 4 + chipsH + ROW * 4 + dock;
    const spare = Math.max(0, h - base);
    const cardH = baseCard + Math.min(8, spare * 0.08);
    const wealthH = rows * cardH + (rows - 1) * 4;
    const actionH = 150 + Math.min(40, spare * 0.4);
    const action: Rect = { x: pad, y: banner.y + banner.h + gap, w: inner, h: actionH };
    const cardW = (inner - gap) / 2;
    const wealth: Rect[] = Array.from({ length: n }, (_, i) => ({
      x: pad + (i % 2) * (cardW + gap), y: action.y + action.h + gap + Math.floor(i / 2) * (cardH + 4), w: cardW, h: cardH,
    }));
    const chips: Rect = { x: pad, y: action.y + action.h + gap + wealthH + gap, w: inner, h: chipsH };
    const logY = chips.y + chips.h + gap + dock;
    const log: Rect = { x: pad, y: logY, w: inner, h: Math.max(0, h - pad - logY) };
    const bigY = action.y + action.h + gap;
    return {
      wide, header, banner, action, wealth, chips, log, tools: { x: pad, y: pad, w: inner, h: 0 },
      cardBig: { x: pad, y: bigY, w: inner, h: Math.max(90, h - pad - bigY) },
      cardDock: { x: pad, y: chips.y + chips.h + gap, w: inner, h: dock - 3 },
      diceSize: Math.round(Math.min(actionH - 20, (inner * 0.52 - 8) / 2, 76)),
      logRows: Math.max(0, Math.min(6, Math.floor(log.h / ROW))),
    };
  }
  // màn ngang: giữa bàn chỉ có khay xúc xắc (trái) + tiền mọi người (phải); hàng nút nhỏ ở góc trên phải
  const none: Rect = { x: 0, y: 0, w: 0, h: 0 };
  const lw = Math.round(w * 0.5);
  const action: Rect = { x: pad, y: pad, w: lw, h: h - 2 * pad };
  const rx = pad + lw + gap * 2;
  const rw = w - rx - pad;
  const tools: Rect = { x: rx, y: pad, w: rw, h: 30 };
  const top = tools.y + tools.h + gap;
  const cols = n <= 3 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const cardH = Math.min(50, (h - pad - top - 4 * (rows - 1)) / rows);
  const cardW = (rw - gap * (cols - 1)) / cols;
  const blockH = rows * cardH + (rows - 1) * 4;
  const y0 = top + Math.max(0, (h - pad - top - blockH) / 2);
  const wealth: Rect[] = Array.from({ length: n }, (_, i) => ({
    x: rx + (i % cols) * (cardW + gap), y: y0 + Math.floor(i / cols) * (cardH + 4), w: cardW, h: cardH,
  }));
  return {
    wide, header: none, banner: none, action, wealth, chips: none, log: none, tools,
    cardBig: { x: pad, y: pad, w: w - 2 * pad, h: h - 2 * pad },
    cardDock: none,
    diceSize: 0,
    logRows: 0,
  };
}
