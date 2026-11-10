import { typhuCellPos } from '../../shared/src/typhu';

export interface Rect { x: number; y: number; w: number; h: number }
/** phía của cell hướng vào tâm bàn (nơi đặt dải màu bộ đất) */
export type BandSide = 'top' | 'bottom' | 'left' | 'right' | 'corner';

export interface BoardGeo {
  W: number; H: number; cw: number; ch: number; wm: number; hm: number;
  rect: Rect[];
  center: Rect;
  side: BandSide[];
}

/** Bàn 11×11 nhưng ô góc và ô cạnh khác kích thước: ô cạnh hẹp-cao trên màn dọc, rộng-thấp trên màn ngang. */
export function makeGeo(W: number, H: number): BoardGeo {
  const cw = Math.round(W * 0.13);
  const ch = Math.round(H * 0.17);
  const wm = (W - 2 * cw) / 7;
  const hm = (H - 2 * ch) / 7;
  const colX = (c: number) => (c === 0 ? 0 : c === 8 ? cw + 7 * wm : cw + (c - 1) * wm);
  const colW = (c: number) => (c === 0 || c === 8 ? cw : wm);
  const rowY = (r: number) => (r === 0 ? 0 : r === 8 ? ch + 7 * hm : ch + (r - 1) * hm);
  const rowH = (r: number) => (r === 0 || r === 8 ? ch : hm);
  const rect: Rect[] = [];
  const side: BandSide[] = [];
  for (let i = 0; i < 40; i++) {
    const [r, c] = typhuCellPos(i);
    rect.push({ x: colX(c), y: rowY(r), w: colW(c), h: rowH(r) });
    const corner = (r === 0 || r === 8) && (c === 0 || c === 8);
    side.push(corner ? 'corner' : r === 8 ? 'top' : r === 0 ? 'bottom' : c === 0 ? 'right' : 'left');
  }
  return { W, H, cw, ch, wm, hm, rect, side, center: { x: cw, y: ch, w: 7 * wm, h: 7 * hm } };
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
  const lw = Math.round(w * 0.42);
  const rx = pad + lw + gap;
  const rw = w - rx - pad;
  const header: Rect = { x: pad, y: pad, w: lw, h: 26 };
  const banner: Rect = { x: pad, y: header.y + header.h + gap, w: lw, h: 50 };
  const aY = banner.y + banner.h + gap;
  const action: Rect = { x: pad, y: aY, w: lw, h: Math.max(110, Math.min(170, h - pad - aY)) };
  const rows = Math.ceil(n / 2);
  const cardH = n > 4 ? 36 : 42;
  const cardW = (rw - gap) / 2;
  const wealth: Rect[] = Array.from({ length: n }, (_, i) => ({
    x: rx + (i % 2) * (cardW + gap), y: pad + Math.floor(i / 2) * (cardH + 4), w: cardW, h: cardH,
  }));
  const wealthH = rows * cardH + (rows - 1) * 4;
  const chips: Rect = { x: rx, y: pad + wealthH + gap, w: rw, h: 46 };
  const logY = chips.y + chips.h + gap + dock;
  const log: Rect = { x: rx, y: logY, w: rw, h: Math.max(0, h - pad - logY) };
  return {
    wide, header, banner, action, wealth, chips, log,
    cardBig: { x: rx, y: pad, w: rw, h: h - 2 * pad },
    cardDock: { x: rx, y: chips.y + chips.h + gap, w: rw, h: dock - 3 },
    diceSize: 0,
    logRows: Math.max(0, Math.min(6, Math.floor(log.h / ROW))),
  };
}
