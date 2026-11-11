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
      wide, header, banner, action, wealth, chips, log,
      cardBig: { x: pad, y: bigY, w: inner, h: Math.max(90, h - pad - bigY) },
      cardDock: { x: pad, y: chips.y + chips.h + gap, w: inner, h: dock - 3 },
      diceSize: Math.round(Math.min(actionH - 20, (inner * 0.52 - 8) / 2, 76)),
      logRows: Math.max(0, Math.min(6, Math.floor(log.h / ROW))),
    };
  }
  // màn ngang: 3 cột — [xúc xắc + nút] [tên game, lượt chơi, diễn biến] [tiền từng người, đất của bạn]
  const c1w = Math.round(w * 0.34);
  const c2x = pad + c1w + gap;
  const c2w = Math.round(w * 0.31);
  const c3x = c2x + c2w + gap;
  const c3w = w - c3x - pad;
  const action: Rect = { x: pad, y: pad, w: c1w, h: h - 2 * pad };
  const header: Rect = { x: c2x, y: pad, w: c2w, h: 26 };
  const banner: Rect = { x: c2x, y: header.y + header.h + gap, w: c2w, h: 50 };
  // ≤3 người: mỗi người một dòng cho đủ chỗ tên; đông hơn thì 2 cột
  const cols = n <= 3 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const cardH = n > 4 ? 32 : n > 3 ? 38 : 36;
  const cardW = (c3w - gap * (cols - 1)) / cols;
  const wealth: Rect[] = Array.from({ length: n }, (_, i) => ({
    x: c3x + (i % cols) * (cardW + gap), y: pad + Math.floor(i / cols) * (cardH + 4), w: cardW, h: cardH,
  }));
  const wealthH = rows * cardH + (rows - 1) * 4;
  const chips: Rect = { x: c3x, y: pad + wealthH + gap, w: c3w, h: Math.max(40, h - 2 * pad - wealthH - gap) };
  const logY = banner.y + banner.h + gap + dock;
  const log: Rect = { x: c2x, y: logY, w: c2w, h: Math.max(0, h - pad - logY) };
  return {
    wide, header, banner, action, wealth, chips, log,
    cardBig: { x: c2x, y: pad, w: w - c2x - pad, h: h - 2 * pad },
    cardDock: { x: c2x, y: banner.y + banner.h + gap, w: c2w, h: dock - 3 },
    diceSize: 0,
    logRows: Math.max(0, Math.min(4, Math.floor(log.h / ROW))),
  };
}
