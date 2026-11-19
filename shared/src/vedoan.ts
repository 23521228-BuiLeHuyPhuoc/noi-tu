/**
 * Kiểu dữ liệu, 1.050+ từ khóa & 120 bộ nét vẽ vector đa sắc cho game Vẽ & Đoán (`ve_doan`).
 */

export type VeDoanPhase = 'pick_word' | 'drawing' | 'round_end';

export type VeDoanTool = 'pen' | 'spray' | 'fill' | 'eraser' | 'line' | 'rect' | 'circle';
export const VE_DOAN_TOOLS: readonly VeDoanTool[] = ['pen', 'spray', 'fill', 'eraser', 'line', 'rect', 'circle'];

export interface VeDoanStroke {
  id?: number;
  tool?: VeDoanTool;
  color: string;
  width: number;
  /** Tọa độ chuẩn hóa [0..1000, 0..1000] */
  points: [number, number][];
  /** Seed ngẫu nhiên tất định cho bình xịt sơn (chỉ có khi tool === 'spray') */
  seed?: number;
  /** Đường SVG path được dựng từ thuật toán Flood-Fill 2D (chỉ có khi tool === 'fill') */
  fillPath?: string;
}

export interface VeDoanGuessEntry {
  id: number;
  playerId: string;
  name: string;
  text: string;
  hit?: boolean;
  close?: boolean;
}

export interface VeDoanView {
  type: 've_doan';
  round: number;
  totalTurns: number;
  turnIndex: number;
  phase: VeDoanPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  drawerId: string;
  order: string[];
  names: Record<string, string>;
  scores: Record<string, number>;
  strokes: VeDoanStroke[];
  maskedWord: string;
  /** Danh sách từng tiếng đã che của từ khóa (giúp hiển thị khoảng cách tách tiếng rõ ràng) */
  maskedWords?: string[];
  wordLength: number;
  guessedIds: string[];
  feed: VeDoanGuessEntry[];
  /** Chỉ hiện cho họa sĩ và ở round_end */
  secretWord?: string | null;
  /** 3 lựa chọn chỉ hiện cho họa sĩ ở pick_word */
  wordOptions?: string[];
}

export const VE_DOAN_COLORS = [
  '#111827', '#E03131', '#F76707', '#F59F00', '#2F9E44',
  '#0CA678', '#1971C2', '#7048E8', '#E64980', '#8B5E34',
  '#38BDF8', '#F472B6', '#FFFFFF',
] as const;

export const VE_DOAN_WIDTHS = [4, 9, 16] as const;

/**
 * Dựng danh sách điểm cho các công cụ hình học (`line`, `rect`, `circle`) trong không gian 0..1000.
 */
export function buildVeDoanShapePoints(
  tool: VeDoanTool,
  start: [number, number],
  end: [number, number],
): [number, number][] {
  const sx = Math.max(0, Math.min(1000, Math.round(start[0])));
  const sy = Math.max(0, Math.min(1000, Math.round(start[1])));
  const ex = Math.max(0, Math.min(1000, Math.round(end[0])));
  const ey = Math.max(0, Math.min(1000, Math.round(end[1])));
  if (tool === 'line') {
    return [[sx, sy], [ex, ey]];
  }
  if (tool === 'rect') {
    const x1 = Math.min(sx, ex);
    const y1 = Math.min(sy, ey);
    const x2 = Math.max(sx, ex);
    const y2 = Math.max(sy, ey);
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]];
  }
  if (tool === 'circle') {
    const cx = (sx + ex) / 2;
    const cy = (sy + ey) / 2;
    const rx = Math.max(8, Math.abs(ex - sx) / 2);
    const ry = Math.max(8, Math.abs(ey - sy) / 2);
    const pts: [number, number][] = [];
    const steps = 28;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pts.push([
        Math.max(0, Math.min(1000, Math.round(cx + Math.cos(a) * rx))),
        Math.max(0, Math.min(1000, Math.round(cy + Math.sin(a) * ry))),
      ]);
    }
    return pts;
  }
  return [[sx, sy], [ex, ey]];
}

const FILL_GRID = 160;

/**
 * Thuật toán Flood-Fill 2D trên lưới ảo 160×160 chuẩn hóa về SVG Path trong không gian 0..1000.
 * Tự động phát hiện biên khép kín từ bút vẽ, hình vuông, hình tròn, đường thẳng, cục tẩy & các lần đổ màu trước!
 */
export function computeFloodFillPath(
  strokes: readonly VeDoanStroke[],
  fx: number,
  fy: number,
): string {
  const G = FILL_GRID;
  const scale = 1000 / G;
  const grid = new Uint16Array(G * G); // 0 = nền trắng (#FFFFFF)
  const colorToId = new Map<string, number>([['#FFFFFF', 0]]);
  const getColorId = (hex: string): number => {
    const norm = hex.toUpperCase();
    const hit = colorToId.get(norm);
    if (hit !== undefined) return hit;
    const next = colorToId.size + 1;
    colorToId.set(norm, next);
    return next;
  };

  const paintCell = (gx: number, gy: number, rad: number, cid: number) => {
    for (let dy = -rad; dy <= rad; dy++) {
      const yy = gy + dy;
      if (yy < 0 || yy >= G) continue;
      for (let dx = -rad; dx <= rad; dx++) {
        const xx = gx + dx;
        if (xx < 0 || xx >= G) continue;
        if (dx * dx + dy * dy <= rad * rad + 0.5) {
          grid[yy * G + xx] = cid;
        }
      }
    }
  };

  const floodGrid = (sx: number, sy: number, cid: number): Uint8Array | null => {
    if (sx < 0 || sx >= G || sy < 0 || sy >= G) return null;
    const target = grid[sy * G + sx];
    if (target === cid) return null;
    const mask = new Uint8Array(G * G);
    const stack: number[] = [sy * G + sx];
    grid[sy * G + sx] = cid;
    mask[sy * G + sx] = 1;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      const x = idx % G;
      const y = (idx - x) / G;
      if (x > 0) {
        const n = idx - 1;
        if (!mask[n] && grid[n] === target) {
          grid[n] = cid;
          mask[n] = 1;
          stack.push(n);
        }
      }
      if (x + 1 < G) {
        const n = idx + 1;
        if (!mask[n] && grid[n] === target) {
          grid[n] = cid;
          mask[n] = 1;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = idx - G;
        if (!mask[n] && grid[n] === target) {
          grid[n] = cid;
          mask[n] = 1;
          stack.push(n);
        }
      }
      if (y + 1 < G) {
        const n = idx + G;
        if (!mask[n] && grid[n] === target) {
          grid[n] = cid;
          mask[n] = 1;
          stack.push(n);
        }
      }
    }
    return mask;
  };

  for (const s of strokes) {
    if (!s.points.length) continue;
    const tool = s.tool ?? 'pen';
    if (tool === 'spray') continue;
    if (tool === 'fill') {
      const [px, py] = s.points[0];
      const gx = Math.max(0, Math.min(G - 1, Math.floor((px / 1000) * G)));
      const gy = Math.max(0, Math.min(G - 1, Math.floor((py / 1000) * G)));
      floodGrid(gx, gy, getColorId(s.color));
      continue;
    }

    const cid = tool === 'eraser' ? 0 : getColorId(s.color);
    const rad = Math.max(1, Math.round(((s.width || 9) * 0.5) / scale));
    if (s.points.length === 1) {
      const gx = Math.max(0, Math.min(G - 1, Math.floor((s.points[0][0] / 1000) * G)));
      const gy = Math.max(0, Math.min(G - 1, Math.floor((s.points[0][1] / 1000) * G)));
      paintCell(gx, gy, rad, cid);
      continue;
    }

    const pts = [...s.points];
    // Nếu người chơi vẽ tự do gần khép kín vòng (< 42 đơn vị), tự khép kín luôn để đổ màu không bị tràn!
    if (tool === 'pen' && pts.length >= 4) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      if (Math.hypot(first[0] - last[0], first[1] - last[1]) <= 42) {
        pts.push(first);
      }
    }

    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const dist = Math.hypot(bx - ax, by - ay);
      const steps = Math.max(1, Math.ceil((dist / scale) * 2.2));
      for (let st = 0; st <= steps; st++) {
        const t = st / steps;
        const x = ax + (bx - ax) * t;
        const y = ay + (by - ay) * t;
        const gx = Math.max(0, Math.min(G - 1, Math.floor((x / 1000) * G)));
        const gy = Math.max(0, Math.min(G - 1, Math.floor((y / 1000) * G)));
        paintCell(gx, gy, rad, cid);
      }
    }
  }

  const sx = Math.max(0, Math.min(G - 1, Math.floor((fx / 1000) * G)));
  const sy = Math.max(0, Math.min(G - 1, Math.floor((fy / 1000) * G)));
  const mask = floodGrid(sx, sy, 65535);
  if (!mask) return '';

  // Gom các ô đã fill thành các hình chữ nhật tối đa theo chiều ngang + chiều dọc để SVG nhẹ & siêu nét
  interface GridRect { x1: number; x2: number; y1: number; y2: number }
  const finishedRects: GridRect[] = [];
  let active = new Map<string, GridRect>();

  for (let y = 0; y < G; y++) {
    const nextActive = new Map<string, GridRect>();
    let x = 0;
    while (x < G) {
      while (x < G && !mask[y * G + x]) x++;
      if (x >= G) break;
      const x1 = x;
      while (x < G && mask[y * G + x]) x++;
      const x2 = x;
      const key = `${x1}:${x2}`;
      const prev = active.get(key);
      if (prev) {
        prev.y2 = y + 1;
        nextActive.set(key, prev);
        active.delete(key);
      } else {
        nextActive.set(key, { x1, x2, y1: y, y2: y + 1 });
      }
    }
    for (const r of active.values()) finishedRects.push(r);
    active = nextActive;
  }
  for (const r of active.values()) finishedRects.push(r);

  if (finishedRects.length === 1 && finishedRects[0].x1 === 0 && finishedRects[0].x2 === G && finishedRects[0].y1 === 0 && finishedRects[0].y2 === G) {
    return 'M0 0H1000V1000H0Z';
  }

  // Giới hạn an toàn và hợp nhất đường SVG
  const parts: string[] = [];
  for (const r of finishedRects) {
    const rx = Math.max(0, Math.round(r.x1 * scale - 1));
    const ry = Math.max(0, Math.round(r.y1 * scale - 1));
    const rx2 = Math.min(1000, Math.round(r.x2 * scale + 1));
    const ry2 = Math.min(1000, Math.round(r.y2 * scale + 1));
    const rw = rx2 - rx;
    const rh = ry2 - ry;
    if (rw > 0 && rh > 0) {
      parts.push(`M${rx} ${ry}h${rw}v${rh}h-${rw}z`);
    }
  }
  return parts.join('');
}

const C = {
  black: '#111827',
  red: '#E03131',
  orange: '#F76707',
  yellow: '#F59F00',
  green: '#2F9E44',
  teal: '#0CA678',
  blue: '#1971C2',
  purple: '#7048E8',
  pink: '#E64980',
  brown: '#8B5E34',
} as const;

function clampCoord(v: number): number {
  return Math.max(20, Math.min(980, Math.round(v)));
}

function arcPts(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startRad: number,
  endRad: number,
  steps = 16,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startRad + ((endRad - startRad) * i) / steps;
    pts.push([clampCoord(cx + Math.cos(a) * rx), clampCoord(cy + Math.sin(a) * ry)]);
  }
  return pts;
}

function circlePts(cx: number, cy: number, r: number, steps = 18): [number, number][] {
  return arcPts(cx, cy, r, r, 0, Math.PI * 2, steps);
}

function ellipsePts(cx: number, cy: number, rx: number, ry: number, steps = 18): [number, number][] {
  return arcPts(cx, cy, rx, ry, 0, Math.PI * 2, steps);
}

function rectPts(x1: number, y1: number, x2: number, y2: number): [number, number][] {
  return [
    [clampCoord(x1), clampCoord(y1)],
    [clampCoord(x2), clampCoord(y1)],
    [clampCoord(x2), clampCoord(y2)],
    [clampCoord(x1), clampCoord(y2)],
    [clampCoord(x1), clampCoord(y1)],
  ];
}

function starPts(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  spikes = 5,
  rot = -Math.PI / 2,
): [number, number][] {
  const pts: [number, number][] = [];
  const total = spikes * 2;
  for (let i = 0; i <= total; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i / total) * Math.PI * 2;
    pts.push([clampCoord(cx + Math.cos(a) * r), clampCoord(cy + Math.sin(a) * r)]);
  }
  return pts;
}

function flowerCrownPts(
  cx: number,
  cy: number,
  baseR: number,
  lobeAmp: number,
  lobes = 6,
  steps = 48,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = baseR + Math.abs(Math.sin((a * lobes) / 2)) * lobeAmp;
    pts.push([clampCoord(cx + Math.cos(a) * r), clampCoord(cy + Math.sin(a) * r)]);
  }
  return pts;
}

function wavePts(
  x1: number,
  x2: number,
  y: number,
  amp: number,
  cycles = 3,
  steps = 24,
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const wy = y + Math.sin(t * Math.PI * 2 * cycles) * amp;
    pts.push([clampCoord(x), clampCoord(wy)]);
  }
  return pts;
}

/**
 * 120 bộ nét vector đa sắc chuẩn hóa [0..1000, 0..1000] (mỗi hình 4–8 nét, >= 2 màu)
 * giúp Bot vẽ từng nét sống động và người chơi nhận diện ngay lập tức.
 */
export const BOT_SKETCHES: Record<string, VeDoanStroke[]> = {
  'mặt trời': [
    { color: C.orange, width: 9, points: starPts(500, 500, 330, 215, 12) },
    { color: C.yellow, width: 16, points: circlePts(500, 500, 180, 24) },
    { color: C.yellow, width: 9, points: circlePts(500, 500, 140, 20) },
    { color: C.black, width: 9, points: arcPts(435, 470, 24, 20, Math.PI, Math.PI * 2, 8) },
    { color: C.black, width: 9, points: arcPts(565, 470, 24, 20, Math.PI, Math.PI * 2, 8) },
    { color: C.red, width: 9, points: arcPts(500, 515, 68, 55, 0.15 * Math.PI, 0.85 * Math.PI, 12) },
    { color: C.pink, width: 16, points: [[395, 520], [412, 520]] },
    { color: C.pink, width: 16, points: [[588, 520], [605, 520]] },
  ],
  'trái tim': [
    { color: C.red, width: 16, points: [[500, 340], [410, 210], [240, 230], [185, 395], [295, 600], [500, 825], [705, 600], [815, 395], [760, 230], [590, 210], [500, 340]] },
    { color: C.pink, width: 9, points: [[500, 395], [425, 290], [295, 305], [260, 415], [350, 575], [500, 735], [650, 575], [740, 415], [705, 305], [575, 290], [500, 395]] },
    { color: C.yellow, width: 9, points: [[320, 345], [355, 315], [395, 325]] },
    { color: C.orange, width: 9, points: starPts(790, 190, 55, 22, 4) },
  ],
  'ngôi sao': [
    { color: C.yellow, width: 16, points: starPts(500, 490, 310, 130, 5) },
    { color: C.orange, width: 9, points: starPts(500, 490, 205, 88, 5) },
    { color: C.black, width: 9, points: [[455, 465], [455, 485]] },
    { color: C.black, width: 9, points: [[545, 465], [545, 485]] },
    { color: C.red, width: 9, points: arcPts(500, 515, 42, 32, 0.15 * Math.PI, 0.85 * Math.PI, 10) },
  ],
  'bông hoa': [
    { color: C.green, width: 16, points: [[500, 510], [490, 680], [505, 870]] },
    { color: C.green, width: 9, points: [[495, 700], [360, 635], [335, 710], [495, 735]] },
    { color: C.green, width: 9, points: [[500, 650], [640, 585], [665, 660], [500, 685]] },
    { color: C.pink, width: 16, points: flowerCrownPts(500, 355, 115, 95, 6, 48) },
    { color: C.purple, width: 9, points: flowerCrownPts(500, 355, 85, 55, 6, 36) },
    { color: C.yellow, width: 16, points: circlePts(500, 355, 62, 16) },
    { color: C.orange, width: 9, points: circlePts(500, 355, 30, 12) },
  ],
  'hoa hướng dương': [
    { color: C.green, width: 16, points: [[500, 540], [500, 880]] },
    { color: C.green, width: 9, points: [[500, 720], [350, 650], [380, 755], [500, 750]] },
    { color: C.green, width: 9, points: [[500, 680], [650, 610], [620, 715], [500, 710]] },
    { color: C.yellow, width: 16, points: starPts(500, 360, 235, 135, 14) },
    { color: C.brown, width: 16, points: circlePts(500, 360, 110, 20) },
    { color: C.orange, width: 4, points: [[430, 330], [570, 330], [570, 390], [430, 390], [430, 330]] },
  ],
  'ngôi nhà': [
    { color: C.blue, width: 9, points: rectPts(260, 450, 740, 830) },
    { color: C.brown, width: 9, points: [[610, 330], [610, 200], [685, 200], [685, 395]] },
    { color: C.black, width: 4, points: [[650, 180], [630, 135], [675, 100], [655, 60]] },
    { color: C.red, width: 16, points: [[200, 450], [500, 185], [800, 450], [200, 450]] },
    { color: C.brown, width: 9, points: [[445, 830], [445, 595], [560, 595], [560, 830]] },
    { color: C.yellow, width: 9, points: [[315, 535], [405, 535], [405, 625], [315, 625], [315, 535]] },
    { color: C.green, width: 16, points: [[140, 835], [860, 835]] },
  ],
  'cái cây': [
    { color: C.brown, width: 16, points: [[455, 860], [470, 520], [530, 520], [545, 860]] },
    { color: C.brown, width: 9, points: [[485, 560], [410, 450], [500, 540], [590, 450]] },
    { color: C.green, width: 16, points: flowerCrownPts(500, 355, 175, 65, 7, 42) },
    { color: C.teal, width: 9, points: arcPts(470, 330, 120, 95, Math.PI * 0.9, Math.PI * 1.9, 14) },
    { color: C.red, width: 16, points: circlePts(410, 340, 22, 10) },
    { color: C.red, width: 16, points: circlePts(575, 310, 22, 10) },
    { color: C.red, width: 16, points: circlePts(520, 425, 22, 10) },
  ],
  'cây thông': [
    { color: C.brown, width: 16, points: rectPts(465, 740, 535, 885) },
    { color: C.green, width: 16, points: [[500, 450], [200, 740], [800, 740], [500, 450]] },
    { color: C.green, width: 16, points: [[500, 300], [255, 565], [745, 565], [500, 300]] },
    { color: C.green, width: 16, points: [[500, 165], [320, 405], [680, 405], [500, 165]] },
    { color: C.yellow, width: 9, points: starPts(500, 125, 58, 25, 5) },
    { color: C.red, width: 9, points: wavePts(315, 685, 635, 22, 2, 16) },
  ],
  'con cá': [
    { color: C.orange, width: 16, points: [[220, 500], [370, 335], [620, 350], [735, 500], [620, 650], [370, 665], [220, 500]] },
    { color: C.orange, width: 9, points: [[735, 500], [895, 345], [855, 500], [895, 655], [735, 500]] },
    { color: C.yellow, width: 9, points: [[430, 345], [520, 240], [585, 355]] },
    { color: C.yellow, width: 9, points: [[460, 520], [555, 480], [540, 575], [460, 520]] },
    { color: C.red, width: 9, points: arcPts(375, 500, 30, 95, -0.45 * Math.PI, 0.45 * Math.PI, 10) },
    { color: C.black, width: 16, points: [[315, 465], [328, 465]] },
    { color: C.blue, width: 9, points: circlePts(155, 385, 24, 10) },
    { color: C.blue, width: 4, points: circlePts(185, 305, 16, 10) },
  ],
  'con mèo': [
    { color: C.orange, width: 9, points: ellipsePts(500, 690, 155, 145, 20) },
    { color: C.orange, width: 9, points: [[645, 745], [775, 725], [820, 610], [775, 545]] },
    { color: C.orange, width: 16, points: circlePts(500, 420, 150, 20) },
    { color: C.orange, width: 9, points: [[375, 325], [345, 175], [465, 275]] },
    { color: C.orange, width: 9, points: [[625, 325], [655, 175], [535, 275]] },
    { color: C.pink, width: 9, points: [[482, 435], [518, 435], [500, 460], [482, 435]] },
    { color: C.black, width: 9, points: [[435, 395], [450, 395]] },
    { color: C.black, width: 9, points: [[550, 395], [565, 395]] },
  ],
  'con chó': [
    { color: C.brown, width: 9, points: ellipsePts(500, 700, 165, 135, 20) },
    { color: C.brown, width: 9, points: [[660, 680], [785, 600], [810, 520]] },
    { color: C.brown, width: 16, points: circlePts(500, 415, 150, 20) },
    { color: C.brown, width: 16, points: [[365, 330], [270, 420], [290, 535], [375, 480]] },
    { color: C.brown, width: 16, points: [[635, 330], [730, 420], [710, 535], [625, 480]] },
    { color: C.black, width: 16, points: ellipsePts(500, 445, 30, 20, 12) },
    { color: C.black, width: 9, points: [[440, 380], [455, 380]] },
    { color: C.red, width: 9, points: [[485, 495], [500, 555], [520, 495]] },
  ],
  'con thỏ': [
    { color: C.pink, width: 9, points: [[430, 370], [395, 130], [445, 115], [475, 365]] },
    { color: C.pink, width: 9, points: [[570, 370], [605, 130], [555, 115], [525, 365]] },
    { color: C.purple, width: 9, points: circlePts(500, 485, 135, 20) },
    { color: C.purple, width: 9, points: ellipsePts(500, 735, 155, 125, 20) },
    { color: C.pink, width: 9, points: circlePts(665, 765, 38, 12) },
    { color: C.black, width: 9, points: [[450, 465], [462, 465]] },
    { color: C.black, width: 9, points: [[538, 465], [550, 465]] },
    { color: C.orange, width: 9, points: [[280, 720], [380, 675], [360, 745], [280, 720]] },
  ],
  'con ếch': [
    { color: C.green, width: 16, points: ellipsePts(500, 565, 230, 175, 22) },
    { color: C.green, width: 16, points: circlePts(380, 375, 68, 14) },
    { color: C.green, width: 16, points: circlePts(620, 375, 68, 14) },
    { color: C.black, width: 16, points: [[380, 375], [392, 375]] },
    { color: C.black, width: 16, points: [[608, 375], [620, 375]] },
    { color: C.red, width: 9, points: arcPts(500, 560, 140, 75, 0.1 * Math.PI, 0.9 * Math.PI, 14) },
    { color: C.teal, width: 9, points: [[275, 675], [195, 760], [320, 760]] },
    { color: C.teal, width: 9, points: [[725, 675], [805, 760], [680, 760]] },
  ],
  'con rùa': [
    { color: C.green, width: 16, points: arcPts(480, 560, 235, 210, Math.PI, Math.PI * 2, 18) },
    { color: C.brown, width: 9, points: [[245, 560], [715, 560]] },
    { color: C.brown, width: 9, points: [[375, 560], [420, 420], [540, 420], [585, 560]] },
    { color: C.teal, width: 16, points: [[715, 520], [835, 465], [855, 520], [795, 565], [715, 545]] },
    { color: C.black, width: 9, points: [[810, 495], [820, 495]] },
    { color: C.green, width: 16, points: [[315, 570], [295, 700], [355, 700], [365, 570]] },
    { color: C.green, width: 16, points: [[595, 570], [605, 700], [665, 700], [645, 570]] },
  ],
  'cá mập': [
    { color: C.blue, width: 16, points: [[150, 520], [340, 400], [470, 400], [540, 220], [585, 410], [760, 460], [875, 355], [830, 515], [875, 645], [755, 550], [420, 610], [150, 520]] },
    { color: C.black, width: 9, points: [[275, 480], [290, 480]] },
    { color: C.red, width: 9, points: [[215, 535], [250, 565], [280, 535], [310, 565], [340, 535]] },
    { color: C.black, width: 4, points: [[415, 475], [405, 535]] },
    { color: C.black, width: 4, points: [[445, 475], [435, 535]] },
    { color: C.teal, width: 9, points: wavePts(120, 880, 740, 28, 3, 24) },
  ],
  'bạch tuộc': [
    { color: C.purple, width: 16, points: arcPts(500, 420, 175, 195, Math.PI * 0.85, Math.PI * 2.15, 20) },
    { color: C.black, width: 9, points: circlePts(440, 395, 22, 10) },
    { color: C.black, width: 9, points: circlePts(560, 395, 22, 10) },
    { color: C.pink, width: 9, points: circlePts(500, 465, 20, 10) },
    { color: C.purple, width: 16, points: [[355, 495], [240, 620], [180, 740], [250, 785], [300, 725]] },
    { color: C.purple, width: 16, points: [[440, 520], [385, 700], [360, 835], [430, 845]] },
    { color: C.purple, width: 16, points: [[560, 520], [615, 700], [640, 835], [570, 845]] },
    { color: C.purple, width: 16, points: [[645, 495], [760, 620], [820, 740], [750, 785], [700, 725]] },
  ],
  'con bướm': [
    { color: C.brown, width: 16, points: [[500, 290], [500, 740]] },
    { color: C.black, width: 4, points: [[440, 185], [500, 285], [560, 185]] },
    { color: C.pink, width: 16, points: [[490, 360], [280, 200], [175, 340], [255, 500], [490, 490]] },
    { color: C.pink, width: 16, points: [[510, 360], [720, 200], [825, 340], [745, 500], [510, 490]] },
    { color: C.purple, width: 9, points: [[490, 505], [260, 555], [295, 740], [490, 665]] },
    { color: C.purple, width: 9, points: [[510, 505], [740, 555], [705, 740], [510, 665]] },
    { color: C.yellow, width: 16, points: circlePts(320, 360, 38, 12) },
    { color: C.yellow, width: 16, points: circlePts(680, 360, 38, 12) },
  ],
  'ô tô': [
    { color: C.red, width: 16, points: [[145, 620], [165, 475], [305, 460], [395, 315], [645, 315], [745, 460], [860, 480], [865, 620], [145, 620]] },
    { color: C.blue, width: 9, points: [[415, 345], [625, 345], [700, 455], [345, 455], [415, 345]] },
    { color: C.black, width: 16, points: circlePts(305, 645, 80, 16) },
    { color: C.black, width: 16, points: circlePts(705, 645, 80, 16) },
    { color: C.yellow, width: 9, points: circlePts(305, 645, 30, 10) },
    { color: C.yellow, width: 9, points: circlePts(705, 645, 30, 10) },
    { color: C.orange, width: 16, points: [[845, 520], [875, 520]] },
  ],
  'xe đạp': [
    { color: C.black, width: 16, points: circlePts(275, 640, 130, 20) },
    { color: C.black, width: 16, points: circlePts(725, 640, 130, 20) },
    { color: C.red, width: 9, points: [[275, 640], [435, 435], [665, 435], [485, 640], [275, 640]] },
    { color: C.red, width: 9, points: [[725, 640], [645, 345], [585, 345]] },
    { color: C.brown, width: 16, points: [[390, 415], [475, 415]] },
    { color: C.yellow, width: 9, points: circlePts(485, 640, 28, 10) },
  ],
  'máy bay': [
    { color: C.blue, width: 16, points: [[140, 505], [765, 505], [875, 455], [775, 405], [185, 405], [140, 505]] },
    { color: C.red, width: 9, points: [[185, 405], [135, 275], [235, 275], [275, 405]] },
    { color: C.blue, width: 9, points: [[420, 405], [340, 195], [435, 195], [565, 405]] },
    { color: C.blue, width: 9, points: [[420, 505], [340, 745], [435, 745], [565, 505]] },
    { color: C.yellow, width: 9, points: [[340, 450], [360, 450]] },
    { color: C.yellow, width: 9, points: [[460, 450], [480, 450]] },
    { color: C.yellow, width: 9, points: [[580, 450], [600, 450]] },
  ],
  'tên lửa': [
    { color: C.blue, width: 9, points: [[395, 340], [395, 685], [605, 685], [605, 340]] },
    { color: C.red, width: 16, points: [[395, 340], [500, 140], [605, 340], [395, 340]] },
    { color: C.red, width: 9, points: [[395, 555], [285, 710], [395, 685]] },
    { color: C.red, width: 9, points: [[605, 555], [715, 710], [605, 685]] },
    { color: C.teal, width: 9, points: circlePts(500, 465, 60, 14) },
    { color: C.orange, width: 16, points: [[425, 700], [500, 895], [575, 700]] },
    { color: C.yellow, width: 9, points: [[460, 700], [500, 825], [540, 700]] },
  ],
  'tàu thủy': [
    { color: C.red, width: 16, points: [[160, 595], [840, 595], [745, 745], [255, 745], [160, 595]] },
    { color: C.blue, width: 9, points: rectPts(285, 445, 695, 595) },
    { color: C.orange, width: 16, points: rectPts(445, 295, 535, 445) },
    { color: C.black, width: 9, points: [[495, 270], [545, 210], [630, 185], [705, 155]] },
    { color: C.yellow, width: 9, points: circlePts(385, 520, 26, 10) },
    { color: C.yellow, width: 9, points: circlePts(595, 520, 26, 10) },
    { color: C.teal, width: 9, points: wavePts(110, 890, 795, 26, 3, 24) },
  ],
  'con thuyền': [
    { color: C.brown, width: 16, points: [[185, 615], [815, 615], [705, 765], [295, 765], [185, 615]] },
    { color: C.black, width: 9, points: [[490, 615], [490, 195]] },
    { color: C.red, width: 16, points: [[490, 210], [745, 555], [490, 555], [490, 210]] },
    { color: C.yellow, width: 9, points: [[470, 255], [265, 555], [470, 555], [470, 255]] },
    { color: C.blue, width: 9, points: wavePts(120, 880, 815, 24, 3, 24) },
  ],
  'đèn giao thông': [
    { color: C.black, width: 16, points: rectPts(355, 145, 645, 705) },
    { color: C.black, width: 16, points: [[500, 705], [500, 885]] },
    { color: C.black, width: 9, points: [[380, 885], [620, 885]] },
    { color: C.red, width: 16, points: circlePts(500, 260, 62, 16) },
    { color: C.yellow, width: 16, points: circlePts(500, 425, 62, 16) },
    { color: C.green, width: 16, points: circlePts(500, 590, 62, 16) },
  ],
  'cầu vồng': [
    { color: C.red, width: 16, points: arcPts(500, 650, 350, 350, Math.PI, Math.PI * 2, 24) },
    { color: C.orange, width: 16, points: arcPts(500, 650, 305, 305, Math.PI, Math.PI * 2, 22) },
    { color: C.yellow, width: 16, points: arcPts(500, 650, 260, 260, Math.PI, Math.PI * 2, 20) },
    { color: C.green, width: 16, points: arcPts(500, 650, 215, 215, Math.PI, Math.PI * 2, 18) },
    { color: C.blue, width: 16, points: arcPts(500, 650, 170, 170, Math.PI, Math.PI * 2, 18) },
    { color: C.purple, width: 9, points: flowerCrownPts(215, 665, 65, 30, 5, 24) },
    { color: C.purple, width: 9, points: flowerCrownPts(785, 665, 65, 30, 5, 24) },
  ],
  'đám mây': [
    { color: C.blue, width: 16, points: [[225, 520], [165, 445], [220, 335], [345, 300], [455, 205], [615, 235], [705, 325], [820, 365], [845, 485], [760, 535], [225, 520]] },
    { color: C.teal, width: 9, points: arcPts(475, 355, 145, 75, Math.PI, Math.PI * 1.9, 12) },
    { color: C.yellow, width: 16, points: [[525, 535], [440, 685], [530, 685], [465, 855]] },
    { color: C.blue, width: 9, points: [[305, 575], [265, 695]] },
    { color: C.blue, width: 9, points: [[655, 575], [615, 695]] },
    { color: C.blue, width: 9, points: [[745, 610], [705, 730]] },
  ],
  'tia chớp': [
    { color: C.blue, width: 16, points: [[250, 330], [200, 250], [300, 165], [470, 130], [650, 165], [760, 255], [720, 335], [250, 330]] },
    { color: C.yellow, width: 16, points: [[545, 335], [345, 575], [505, 575], [395, 880], [665, 520], [510, 520], [545, 335]] },
    { color: C.orange, width: 9, points: [[280, 520], [220, 560]] },
    { color: C.orange, width: 9, points: [[715, 480], [780, 445]] },
  ],
  'mặt trăng': [
    { color: C.yellow, width: 16, points: [[635, 195], [430, 240], [305, 430], [345, 675], [525, 815], [705, 775], [525, 690], [455, 505], [515, 325], [635, 195]] },
    { color: C.orange, width: 9, points: circlePts(405, 545, 28, 10) },
    { color: C.black, width: 9, points: arcPts(410, 445, 22, 16, 0, Math.PI, 8) },
    { color: C.purple, width: 9, points: starPts(740, 340, 55, 22, 5) },
    { color: C.yellow, width: 9, points: starPts(780, 545, 40, 16, 5) },
  ],
  'người tuyết': [
    { color: C.blue, width: 9, points: circlePts(500, 685, 165, 22) },
    { color: C.blue, width: 9, points: circlePts(500, 410, 115, 18) },
    { color: C.black, width: 16, points: [[375, 305], [625, 305], [580, 305], [580, 175], [420, 175], [420, 305]] },
    { color: C.red, width: 16, points: [[405, 515], [595, 515], [565, 625]] },
    { color: C.orange, width: 9, points: [[500, 415], [615, 435], [500, 450]] },
    { color: C.black, width: 9, points: [[460, 375], [472, 375]] },
    { color: C.black, width: 9, points: [[530, 375], [542, 375]] },
    { color: C.brown, width: 9, points: [[340, 635], [200, 545], [340, 635], [660, 635], [800, 545]] },
  ],
  'quả táo': [
    { color: C.red, width: 16, points: [[500, 365], [385, 315], [265, 405], [275, 625], [395, 815], [500, 780], [605, 815], [725, 625], [735, 405], [615, 315], [500, 365]] },
    { color: C.brown, width: 16, points: [[500, 365], [520, 200]] },
    { color: C.green, width: 9, points: [[515, 265], [655, 200], [625, 305], [515, 265]] },
    { color: C.pink, width: 9, points: arcPts(395, 505, 55, 95, Math.PI * 0.85, Math.PI * 1.4, 10) },
  ],
  'quả dưa hấu': [
    { color: C.green, width: 16, points: arcPts(500, 360, 330, 330, 0, Math.PI, 22) },
    { color: C.teal, width: 9, points: arcPts(500, 360, 295, 295, 0.04 * Math.PI, 0.96 * Math.PI, 20) },
    { color: C.red, width: 16, points: [[205, 360], [795, 360], [720, 560], [500, 645], [280, 560], [205, 360]] },
    { color: C.black, width: 16, points: [[400, 455], [408, 470]] },
    { color: C.black, width: 16, points: [[500, 495], [508, 510]] },
    { color: C.black, width: 16, points: [[600, 455], [608, 470]] },
  ],
  'quả chuối': [
    { color: C.yellow, width: 16, points: [[265, 275], [315, 515], [475, 705], [725, 745], [775, 680], [565, 610], [415, 450], [340, 255], [265, 275]] },
    { color: C.orange, width: 9, points: [[315, 300], [390, 500], [545, 645], [735, 705]] },
    { color: C.yellow, width: 9, points: [[340, 255], [485, 395], [670, 495], [795, 495], [775, 435], [595, 375], [385, 235]] },
    { color: C.brown, width: 16, points: [[265, 265], [365, 225]] },
    { color: C.brown, width: 9, points: [[745, 735], [780, 700]] },
  ],
  'cây nấm': [
    { color: C.brown, width: 9, points: [[415, 515], [390, 820], [610, 820], [585, 515]] },
    { color: C.red, width: 16, points: [[195, 515], [235, 315], [385, 200], [615, 200], [765, 315], [805, 515], [195, 515]] },
    { color: C.yellow, width: 16, points: circlePts(365, 365, 42, 12) },
    { color: C.yellow, width: 16, points: circlePts(535, 295, 36, 12) },
    { color: C.yellow, width: 16, points: circlePts(650, 405, 38, 12) },
    { color: C.green, width: 9, points: [[295, 830], [340, 765], [375, 830], [625, 830], [665, 765], [705, 830]] },
  ],
  'cây xương rồng': [
    { color: C.orange, width: 16, points: [[355, 645], [645, 645], [595, 865], [405, 865], [355, 645]] },
    { color: C.brown, width: 9, points: rectPts(330, 595, 670, 645) },
    { color: C.green, width: 16, points: [[445, 595], [445, 245], [500, 195], [555, 245], [555, 595]] },
    { color: C.green, width: 16, points: [[445, 465], [315, 465], [315, 315], [355, 315], [355, 425], [445, 425]] },
    { color: C.green, width: 16, points: [[555, 415], [685, 415], [685, 275], [645, 275], [645, 375], [555, 375]] },
    { color: C.pink, width: 9, points: flowerCrownPts(500, 165, 30, 22, 5, 20) },
  ],
  'bánh pizza': [
    { color: C.orange, width: 16, points: arcPts(500, 815, 560, 560, Math.PI * 1.28, Math.PI * 1.72, 16) },
    { color: C.yellow, width: 9, points: [[235, 325], [500, 825], [765, 325]] },
    { color: C.yellow, width: 9, points: wavePts(260, 740, 355, 18, 3, 18) },
    { color: C.red, width: 16, points: circlePts(435, 465, 42, 12) },
    { color: C.red, width: 16, points: circlePts(575, 485, 40, 12) },
    { color: C.red, width: 16, points: circlePts(495, 625, 38, 12) },
  ],
  'bánh sinh nhật': [
    { color: C.pink, width: 16, points: rectPts(235, 575, 765, 805) },
    { color: C.purple, width: 16, points: rectPts(320, 405, 680, 575) },
    { color: C.yellow, width: 9, points: wavePts(240, 760, 635, 25, 4, 24) },
    { color: C.blue, width: 9, points: [[415, 405], [415, 280]] },
    { color: C.blue, width: 9, points: [[585, 405], [585, 280]] },
    { color: C.orange, width: 16, points: [[415, 250], [400, 200], [415, 170], [430, 200], [415, 250]] },
    { color: C.orange, width: 16, points: [[585, 250], [570, 200], [585, 170], [600, 200], [585, 250]] },
  ],
  'kem ốc quế': [
    { color: C.orange, width: 16, points: [[355, 505], [500, 875], [645, 505], [355, 505]] },
    { color: C.brown, width: 4, points: [[395, 595], [605, 595], [565, 705], [435, 705], [395, 595]] },
    { color: C.pink, width: 16, points: circlePts(500, 425, 130, 18) },
    { color: C.yellow, width: 16, points: circlePts(500, 280, 100, 16) },
    { color: C.red, width: 16, points: circlePts(500, 155, 36, 12) },
    { color: C.green, width: 9, points: [[500, 120], [545, 75]] },
  ],
  'ly trà sữa': [
    { color: C.brown, width: 9, points: [[325, 365], [675, 365], [625, 845], [375, 845], [325, 365]] },
    { color: C.teal, width: 9, points: arcPts(500, 365, 175, 115, Math.PI, Math.PI * 2, 16) },
    { color: C.green, width: 16, points: [[545, 155], [485, 765]] },
    { color: C.orange, width: 9, points: wavePts(345, 655, 495, 16, 2, 16) },
    { color: C.black, width: 16, points: circlePts(425, 790, 22, 10) },
    { color: C.black, width: 16, points: circlePts(505, 795, 22, 10) },
    { color: C.black, width: 16, points: circlePts(580, 785, 22, 10) },
  ],
  'ly cà phê': [
    { color: C.brown, width: 16, points: [[285, 425], [655, 425], [615, 755], [325, 755], [285, 425]] },
    { color: C.brown, width: 16, points: arcPts(655, 575, 95, 85, -0.5 * Math.PI, 0.5 * Math.PI, 12) },
    { color: C.orange, width: 9, points: ellipsePts(470, 425, 185, 35, 16) },
    { color: C.black, width: 9, points: [[215, 785], [725, 785]] },
    { color: C.orange, width: 9, points: [[410, 335], [385, 265], [420, 195]] },
    { color: C.orange, width: 9, points: [[530, 335], [505, 265], [540, 195]] },
  ],
  'trứng ốp la': [
    { color: C.black, width: 16, points: circlePts(465, 520, 260, 24) },
    { color: C.black, width: 16, points: [[705, 620], [895, 725]] },
    { color: C.blue, width: 9, points: flowerCrownPts(465, 520, 145, 45, 5, 30) },
    { color: C.yellow, width: 16, points: circlePts(475, 515, 80, 16) },
    { color: C.orange, width: 9, points: circlePts(475, 515, 50, 12) },
  ],
  'kính mắt': [
    { color: C.black, width: 16, points: circlePts(325, 525, 125, 18) },
    { color: C.black, width: 16, points: circlePts(675, 525, 125, 18) },
    { color: C.black, width: 16, points: arcPts(500, 525, 50, 28, Math.PI, Math.PI * 2, 8) },
    { color: C.blue, width: 9, points: [[200, 510], [115, 385], [155, 365]] },
    { color: C.blue, width: 9, points: [[800, 510], [885, 385], [845, 365]] },
    { color: C.teal, width: 9, points: [[275, 475], [335, 435]] },
  ],
  'vương miện': [
    { color: C.yellow, width: 16, points: [[195, 685], [165, 345], [335, 505], [500, 245], [665, 505], [835, 345], [805, 685], [195, 685]] },
    { color: C.orange, width: 9, points: rectPts(195, 685, 805, 755) },
    { color: C.red, width: 16, points: circlePts(500, 575, 36, 12) },
    { color: C.green, width: 16, points: circlePts(315, 595, 26, 10) },
    { color: C.purple, width: 16, points: circlePts(685, 595, 26, 10) },
    { color: C.yellow, width: 16, points: circlePts(500, 215, 24, 10) },
  ],
  'cây đàn guitar': [
    { color: C.brown, width: 16, points: [[380, 520], [315, 575], [275, 695], [345, 825], [500, 855], [655, 825], [725, 695], [685, 575], [620, 520], [650, 440], [590, 365], [410, 365], [350, 440], [380, 520]] },
    { color: C.orange, width: 16, points: rectPts(465, 130, 535, 380) },
    { color: C.black, width: 16, points: circlePts(500, 595, 62, 16) },
    { color: C.brown, width: 16, points: [[425, 735], [575, 735]] },
    { color: C.yellow, width: 4, points: [[490, 150], [490, 735], [510, 735], [510, 150]] },
  ],
  'điện thoại': [
    { color: C.black, width: 16, points: rectPts(315, 135, 685, 865) },
    { color: C.blue, width: 9, points: rectPts(350, 215, 650, 765) },
    { color: C.black, width: 9, points: [[455, 175], [545, 175]] },
    { color: C.black, width: 9, points: circlePts(500, 815, 24, 10) },
    { color: C.red, width: 16, points: rectPts(395, 285, 465, 355) },
    { color: C.green, width: 16, points: rectPts(535, 285, 605, 355) },
  ],
  'máy tính': [
    { color: C.black, width: 16, points: rectPts(195, 185, 805, 605) },
    { color: C.blue, width: 9, points: rectPts(235, 225, 765, 565) },
    { color: C.black, width: 16, points: [[455, 605], [440, 705], [560, 705], [545, 605]] },
    { color: C.black, width: 9, points: [[225, 745], [725, 745], [765, 835], [185, 835], [225, 745]] },
    { color: C.green, width: 9, points: [[295, 485], [415, 375], [515, 435], [685, 295]] },
    { color: C.orange, width: 9, points: ellipsePts(845, 795, 35, 50, 12) },
  ],
  'đồng hồ': [
    { color: C.yellow, width: 16, points: circlePts(500, 525, 245, 24) },
    { color: C.orange, width: 16, points: arcPts(335, 285, 70, 55, Math.PI * 0.85, Math.PI * 1.95, 10) },
    { color: C.orange, width: 16, points: arcPts(665, 285, 70, 55, Math.PI * 1.05, Math.PI * 2.15, 10) },
    { color: C.black, width: 16, points: [[500, 525], [500, 355]] },
    { color: C.red, width: 9, points: [[500, 525], [645, 525]] },
    { color: C.black, width: 16, points: [[365, 745], [315, 835], [365, 745], [635, 745], [685, 835]] },
  ],
  'cây dù': [
    { color: C.purple, width: 16, points: arcPts(500, 485, 315, 275, Math.PI, Math.PI * 2, 20) },
    { color: C.pink, width: 9, points: [[185, 485], [395, 455], [500, 485], [605, 455], [815, 485]] },
    { color: C.black, width: 16, points: [[500, 175], [500, 775], [450, 840], [395, 785]] },
    { color: C.blue, width: 9, points: [[265, 235], [235, 305]] },
    { color: C.blue, width: 9, points: [[745, 235], [715, 305]] },
  ],
  'bóng bay': [
    { color: C.red, width: 16, points: ellipsePts(355, 345, 115, 145, 18) },
    { color: C.blue, width: 16, points: ellipsePts(645, 365, 115, 145, 18) },
    { color: C.yellow, width: 16, points: ellipsePts(500, 265, 115, 145, 18) },
    { color: C.black, width: 4, points: [[355, 495], [425, 665], [500, 855]] },
    { color: C.black, width: 4, points: [[645, 515], [575, 675], [500, 855]] },
    { color: C.black, width: 4, points: [[500, 415], [500, 855]] },
  ],
  'quả bóng đá': [
    { color: C.black, width: 16, points: circlePts(500, 490, 250, 24) },
    { color: C.black, width: 16, points: starPts(500, 490, 85, 85, 5) },
    { color: C.black, width: 9, points: [[500, 405], [500, 245]] },
    { color: C.black, width: 9, points: [[580, 465], [735, 415]] },
    { color: C.black, width: 9, points: [[420, 465], [265, 415]] },
    { color: C.black, width: 9, points: [[450, 560], [355, 695], [450, 560], [550, 560], [645, 695]] },
    { color: C.green, width: 16, points: [[180, 790], [820, 790]] },
  ],
  'núi lửa': [
    { color: C.brown, width: 16, points: [[145, 835], [385, 405], [615, 405], [855, 835], [145, 835]] },
    { color: C.red, width: 16, points: [[415, 405], [445, 565], [495, 455], [545, 615], [585, 405]] },
    { color: C.orange, width: 16, points: [[455, 395], [355, 225], [440, 285], [500, 155], [560, 285], [645, 225], [545, 395]] },
    { color: C.yellow, width: 9, points: circlePts(365, 175, 20, 8) },
    { color: C.yellow, width: 9, points: circlePts(635, 175, 20, 8) },
    { color: C.black, width: 9, points: [[485, 135], [545, 85], [665, 95], [735, 65]] },
  ],
  'ngọn hải đăng': [
    { color: C.black, width: 9, points: [[380, 795], [425, 315], [575, 315], [620, 795], [380, 795]] },
    { color: C.red, width: 16, points: [[415, 445], [585, 445]] },
    { color: C.red, width: 16, points: [[395, 625], [605, 625]] },
    { color: C.red, width: 16, points: [[405, 315], [500, 175], [595, 315], [405, 315]] },
    { color: C.yellow, width: 9, points: [[575, 265], [875, 175], [875, 345], [575, 285]] },
    { color: C.yellow, width: 9, points: [[425, 265], [125, 175], [125, 345], [425, 285]] },
    { color: C.blue, width: 16, points: wavePts(120, 880, 825, 28, 3, 24) },
  ],
  'diều giấy': [
    { color: C.red, width: 16, points: [[500, 145], [725, 385], [500, 665], [275, 385], [500, 145]] },
    { color: C.yellow, width: 9, points: [[500, 145], [500, 665]] },
    { color: C.blue, width: 9, points: [[275, 385], [725, 385]] },
    { color: C.black, width: 9, points: [[500, 665], [555, 745], [465, 815], [545, 895]] },
    { color: C.pink, width: 9, points: [[525, 735], [585, 715], [585, 765], [525, 735]] },
    { color: C.purple, width: 9, points: [[445, 815], [505, 795], [505, 845], [445, 815]] },
  ],
  'cần câu cá': [
    { color: C.brown, width: 16, points: [[175, 795], [395, 435], [645, 185], [745, 165]] },
    { color: C.yellow, width: 9, points: circlePts(325, 565, 35, 12) },
    { color: C.blue, width: 4, points: [[745, 165], [745, 675]] },
    { color: C.red, width: 16, points: ellipsePts(745, 495, 22, 32, 12) },
    { color: C.black, width: 9, points: [[745, 675], [745, 745], [700, 745], [700, 705]] },
    { color: C.orange, width: 9, points: [[535, 735], [625, 695], [655, 735], [625, 775], [535, 735], [495, 700], [495, 770], [535, 735]] },
  ],
  'kính lúp': [
    { color: C.black, width: 16, points: circlePts(430, 410, 195, 22) },
    { color: C.blue, width: 9, points: circlePts(430, 410, 155, 20) },
    { color: C.teal, width: 9, points: [[345, 345], [425, 285]] },
    { color: C.brown, width: 16, points: [[570, 550], [825, 805], [785, 845], [530, 590]] },
    { color: C.orange, width: 9, points: [[555, 535], [590, 570]] },
  ],
  'chiếc chìa khóa': [
    { color: C.yellow, width: 16, points: circlePts(305, 500, 135, 20) },
    { color: C.orange, width: 9, points: circlePts(305, 500, 58, 14) },
    { color: C.yellow, width: 16, points: [[440, 500], [835, 500]] },
    { color: C.yellow, width: 16, points: [[695, 500], [695, 615], [755, 615], [755, 500], [815, 500], [815, 645]] },
    { color: C.orange, width: 9, points: starPts(645, 320, 45, 18, 4) },
  ],
  'hộp quà': [
    { color: C.red, width: 16, points: rectPts(265, 435, 735, 845) },
    { color: C.red, width: 16, points: rectPts(235, 345, 765, 435) },
    { color: C.yellow, width: 16, points: [[500, 345], [500, 845]] },
    { color: C.yellow, width: 16, points: [[265, 625], [735, 625]] },
    { color: C.orange, width: 9, points: [[500, 345], [355, 205], [315, 295], [500, 345]] },
    { color: C.orange, width: 9, points: [[500, 345], [645, 205], [685, 295], [500, 345]] },
  ],
  'con ma': [
    { color: C.purple, width: 16, points: [[305, 785], [305, 385], [395, 215], [605, 215], [695, 385], [695, 785], [600, 705], [500, 785], [400, 705], [305, 785]] },
    { color: C.purple, width: 9, points: [[305, 485], [205, 435], [305, 535]] },
    { color: C.purple, width: 9, points: [[695, 485], [795, 435], [695, 535]] },
    { color: C.black, width: 16, points: ellipsePts(435, 415, 24, 34, 10) },
    { color: C.black, width: 16, points: ellipsePts(565, 415, 24, 34, 10) },
    { color: C.pink, width: 9, points: ellipsePts(500, 525, 35, 45, 12) },
  ],
  'người ngoài hành tinh': [
    { color: C.teal, width: 9, points: arcPts(500, 415, 155, 145, Math.PI, Math.PI * 2, 16) },
    { color: C.green, width: 9, points: circlePts(500, 355, 48, 12) },
    { color: C.purple, width: 16, points: ellipsePts(500, 455, 315, 85, 22) },
    { color: C.yellow, width: 16, points: [[320, 455], [335, 455]] },
    { color: C.yellow, width: 16, points: [[500, 485], [515, 485]] },
    { color: C.yellow, width: 16, points: [[670, 455], [685, 455]] },
    { color: C.green, width: 9, points: [[395, 540], [265, 855], [735, 855], [605, 540]] },
  ],
  'thanh kiếm': [
    { color: C.blue, width: 16, points: [[465, 625], [465, 215], [500, 125], [535, 215], [535, 625]] },
    { color: C.teal, width: 4, points: [[500, 165], [500, 615]] },
    { color: C.yellow, width: 16, points: [[335, 625], [665, 625]] },
    { color: C.brown, width: 16, points: [[500, 625], [500, 815]] },
    { color: C.red, width: 16, points: circlePts(500, 845, 32, 12) },
  ],
  'cây nến': [
    { color: C.blue, width: 16, points: rectPts(425, 415, 575, 815) },
    { color: C.teal, width: 9, points: [[425, 455], [465, 525], [495, 455], [535, 505], [575, 445]] },
    { color: C.black, width: 9, points: [[500, 415], [500, 365]] },
    { color: C.orange, width: 16, points: [[500, 365], [445, 265], [500, 155], [555, 265], [500, 365]] },
    { color: C.yellow, width: 9, points: [[500, 345], [475, 275], [500, 215], [525, 275], [500, 345]] },
    { color: C.brown, width: 16, points: [[325, 825], [675, 825]] },
  ],
  'chiếc cúp': [
    { color: C.yellow, width: 16, points: [[325, 235], [675, 235], [610, 535], [390, 535], [325, 235]] },
    { color: C.orange, width: 9, points: arcPts(335, 365, 85, 90, Math.PI * 0.55, Math.PI * 1.45, 12) },
    { color: C.orange, width: 9, points: arcPts(665, 365, 85, 90, -Math.PI * 0.45, Math.PI * 0.45, 12) },
    { color: C.yellow, width: 16, points: [[500, 535], [500, 745]] },
    { color: C.brown, width: 16, points: rectPts(355, 745, 645, 835) },
    { color: C.red, width: 9, points: starPts(500, 375, 55, 24, 5) },
  ],
  'nốt nhạc': [
    { color: C.purple, width: 16, points: ellipsePts(315, 715, 75, 55, 14) },
    { color: C.purple, width: 16, points: ellipsePts(645, 655, 75, 55, 14) },
    { color: C.purple, width: 16, points: [[385, 715], [385, 275], [715, 205], [715, 655]] },
    { color: C.pink, width: 9, points: [[385, 355], [715, 285]] },
    { color: C.yellow, width: 9, points: starPts(230, 360, 42, 18, 4) },
  ],
  // +58 bộ nét vẽ mới đa sắc cho Bot (tổng 120 hình)
  'lâu đài': [
    { color: C.blue, width: 16, points: rectPts(280, 420, 720, 810) },
    { color: C.purple, width: 16, points: rectPts(200, 320, 305, 810) },
    { color: C.purple, width: 16, points: rectPts(695, 320, 800, 810) },
    { color: C.red, width: 16, points: [[190, 320], [252, 175], [315, 320]] },
    { color: C.red, width: 16, points: [[685, 320], [748, 175], [810, 320]] },
    { color: C.red, width: 16, points: [[425, 420], [500, 205], [575, 420]] },
    { color: C.brown, width: 16, points: [[420, 810], [420, 610], [500, 560], [580, 610], [580, 810]] },
  ],
  'cối xay gió': [
    { color: C.brown, width: 16, points: [[375, 825], [435, 390], [565, 390], [625, 825], [375, 825]] },
    { color: C.red, width: 16, points: [[420, 390], [500, 270], [580, 390]] },
    { color: C.orange, width: 9, points: [[500, 435], [260, 225], [295, 195], [500, 435]] },
    { color: C.orange, width: 9, points: [[500, 435], [740, 225], [770, 260], [500, 435]] },
    { color: C.orange, width: 9, points: [[500, 435], [260, 645], [295, 680], [500, 435]] },
    { color: C.orange, width: 9, points: [[500, 435], [740, 645], [705, 680], [500, 435]] },
    { color: C.yellow, width: 16, points: circlePts(500, 435, 32, 12) },
  ],
  'kim tự tháp': [
    { color: C.yellow, width: 16, points: [[150, 775], [470, 235], [835, 775], [150, 775]] },
    { color: C.orange, width: 9, points: [[470, 235], [585, 775]] },
    { color: C.brown, width: 9, points: [[245, 615], [550, 615], [745, 615]] },
    { color: C.brown, width: 9, points: [[340, 455], [518, 455], [645, 455]] },
    { color: C.orange, width: 16, points: circlePts(780, 220, 65, 16) },
  ],
  'tàu ngầm': [
    { color: C.yellow, width: 16, points: ellipsePts(500, 560, 315, 130, 24) },
    { color: C.orange, width: 16, points: [[420, 435], [450, 315], [580, 315], [600, 435]] },
    { color: C.black, width: 9, points: [[515, 315], [515, 225], [575, 225]] },
    { color: C.blue, width: 9, points: circlePts(365, 560, 42, 12) },
    { color: C.blue, width: 9, points: circlePts(500, 560, 42, 12) },
    { color: C.blue, width: 9, points: circlePts(635, 560, 42, 12) },
  ],
  'trực thăng': [
    { color: C.teal, width: 16, points: ellipsePts(455, 535, 200, 115, 20) },
    { color: C.teal, width: 16, points: [[645, 515], [845, 495], [845, 535], [645, 550]] },
    { color: C.black, width: 9, points: [[190, 360], [720, 360]] },
    { color: C.black, width: 9, points: [[455, 360], [455, 420]] },
    { color: C.blue, width: 9, points: arcPts(410, 515, 120, 75, Math.PI, Math.PI * 1.75, 12) },
    { color: C.black, width: 9, points: [[315, 705], [615, 705], [565, 650], [365, 650]] },
  ],
  'khinh khí cầu': [
    { color: C.red, width: 16, points: [[305, 425], [270, 290], [350, 165], [500, 135], [650, 165], [730, 290], [695, 425], [575, 610], [425, 610], [305, 425]] },
    { color: C.yellow, width: 9, points: [[500, 135], [440, 365], [465, 610]] },
    { color: C.blue, width: 9, points: [[500, 135], [560, 365], [535, 610]] },
    { color: C.brown, width: 9, points: [[445, 610], [445, 705]] },
    { color: C.brown, width: 9, points: [[555, 610], [555, 705]] },
    { color: C.brown, width: 16, points: rectPts(420, 705, 580, 815) },
  ],
  'xe cứu hỏa': [
    { color: C.red, width: 16, points: [[180, 680], [180, 445], [585, 445], [585, 405], [750, 405], [820, 520], [820, 680], [180, 680]] },
    { color: C.blue, width: 9, points: rectPts(620, 440, 760, 525) },
    { color: C.yellow, width: 16, points: [[220, 390], [560, 325], [560, 370], [220, 430]] },
    { color: C.orange, width: 16, points: circlePts(685, 375, 25, 10) },
    { color: C.black, width: 16, points: circlePts(320, 705, 72, 16) },
    { color: C.black, width: 16, points: circlePts(695, 705, 72, 16) },
  ],
  'xe cảnh sát': [
    { color: C.blue, width: 16, points: [[180, 675], [225, 525], [355, 430], [645, 430], [760, 525], [825, 675], [180, 675]] },
    { color: C.teal, width: 9, points: [[375, 460], [625, 460], [690, 525], [310, 525], [375, 460]] },
    { color: C.red, width: 16, points: [[450, 415], [500, 365], [500, 415]] },
    { color: C.blue, width: 16, points: [[500, 415], [500, 365], [550, 415]] },
    { color: C.black, width: 16, points: circlePts(325, 695, 72, 16) },
    { color: C.black, width: 16, points: circlePts(680, 695, 72, 16) },
  ],
  'xe tải': [
    { color: C.orange, width: 16, points: rectPts(165, 365, 585, 680) },
    { color: C.blue, width: 16, points: [[585, 445], [755, 445], [825, 550], [825, 680], [585, 680]] },
    { color: C.teal, width: 9, points: rectPts(620, 475, 755, 560) },
    { color: C.black, width: 16, points: circlePts(295, 705, 72, 16) },
    { color: C.black, width: 16, points: circlePts(705, 705, 72, 16) },
  ],
  'xe buýt': [
    { color: C.yellow, width: 16, points: [[175, 675], [175, 355], [790, 355], [835, 490], [835, 675], [175, 675]] },
    { color: C.blue, width: 9, points: rectPts(225, 405, 355, 515) },
    { color: C.blue, width: 9, points: rectPts(395, 405, 525, 515) },
    { color: C.blue, width: 9, points: rectPts(565, 405, 745, 515) },
    { color: C.black, width: 16, points: circlePts(320, 700, 72, 16) },
    { color: C.black, width: 16, points: circlePts(695, 700, 72, 16) },
  ],
  'con voi': [
    { color: C.blue, width: 16, points: ellipsePts(550, 560, 210, 145, 22) },
    { color: C.blue, width: 16, points: circlePts(315, 475, 110, 18) },
    { color: C.purple, width: 16, points: ellipsePts(385, 465, 72, 95, 16) },
    { color: C.blue, width: 16, points: [[225, 510], [160, 625], [205, 685], [250, 645]] },
    { color: C.blue, width: 16, points: [[425, 695], [425, 815], [475, 815], [635, 815], [635, 695]] },
    { color: C.black, width: 9, points: [[275, 445], [290, 445]] },
  ],
  'con hổ': [
    { color: C.orange, width: 16, points: circlePts(500, 510, 215, 24) },
    { color: C.orange, width: 16, points: circlePts(330, 325, 55, 12) },
    { color: C.orange, width: 16, points: circlePts(670, 325, 55, 12) },
    { color: C.black, width: 9, points: [[455, 315], [500, 385], [545, 315], [500, 410]] },
    { color: C.black, width: 9, points: [[315, 490], [385, 510], [685, 490], [615, 510]] },
    { color: C.black, width: 9, points: [[425, 470], [440, 470], [560, 470], [575, 470]] },
    { color: C.pink, width: 9, points: [[465, 545], [535, 545], [500, 590], [465, 545]] },
  ],
  'con gà': [
    { color: C.orange, width: 16, points: ellipsePts(510, 595, 180, 145, 22) },
    { color: C.yellow, width: 16, points: circlePts(365, 395, 95, 18) },
    { color: C.red, width: 16, points: [[320, 305], [345, 240], [375, 295], [405, 245], [420, 310]] },
    { color: C.orange, width: 16, points: [[270, 395], [200, 420], [275, 440]] },
    { color: C.red, width: 16, points: [[685, 540], [785, 455], [760, 555], [815, 535]] },
    { color: C.brown, width: 9, points: [[460, 740], [460, 825], [560, 740], [560, 825]] },
  ],
  'con vịt': [
    { color: C.yellow, width: 16, points: ellipsePts(525, 610, 195, 130, 22) },
    { color: C.yellow, width: 16, points: circlePts(365, 395, 95, 18) },
    { color: C.orange, width: 16, points: [[275, 405], [180, 425], [280, 450]] },
    { color: C.black, width: 9, points: [[345, 375], [360, 375]] },
    { color: C.blue, width: 9, points: wavePts(200, 800, 765, 22, 4, 24) },
  ],
  'con heo': [
    { color: C.pink, width: 16, points: circlePts(500, 515, 225, 24) },
    { color: C.pink, width: 16, points: [[315, 365], [260, 235], [395, 305]] },
    { color: C.pink, width: 16, points: [[685, 365], [740, 235], [605, 305]] },
    { color: C.red, width: 9, points: ellipsePts(500, 560, 85, 55, 18) },
    { color: C.black, width: 16, points: [[465, 560], [475, 560], [525, 560], [535, 560]] },
    { color: C.black, width: 9, points: [[410, 445], [425, 445], [575, 445], [590, 445]] },
  ],
  'con ong': [
    { color: C.yellow, width: 16, points: ellipsePts(500, 555, 175, 115, 22) },
    { color: C.black, width: 16, points: [[445, 445], [445, 665]] },
    { color: C.black, width: 16, points: [[545, 445], [545, 665]] },
    { color: C.blue, width: 9, points: ellipsePts(445, 385, 75, 105, 16) },
    { color: C.blue, width: 9, points: ellipsePts(555, 385, 75, 105, 16) },
    { color: C.black, width: 9, points: [[675, 555], [755, 555]] },
  ],
  'con cua': [
    { color: C.red, width: 16, points: ellipsePts(500, 580, 175, 125, 22) },
    { color: C.orange, width: 16, points: arcPts(310, 355, 75, 75, 0.4, Math.PI * 1.65, 14) },
    { color: C.orange, width: 16, points: arcPts(690, 355, 75, 75, -Math.PI * 0.65, Math.PI * 0.6, 14) },
    { color: C.red, width: 9, points: [[325, 565], [200, 595], [325, 615], [205, 665], [340, 665], [235, 735]] },
    { color: C.red, width: 9, points: [[675, 565], [800, 595], [675, 615], [795, 665], [660, 665], [765, 735]] },
    { color: C.black, width: 9, points: [[445, 455], [445, 420], [555, 455], [555, 420]] },
  ],
  'con nhện': [
    { color: C.black, width: 16, points: circlePts(500, 540, 105, 18) },
    { color: C.black, width: 16, points: circlePts(500, 395, 65, 14) },
    { color: C.black, width: 9, points: [[400, 495], [220, 415], [160, 515]] },
    { color: C.black, width: 9, points: [[400, 555], [210, 575], [165, 695]] },
    { color: C.black, width: 9, points: [[600, 495], [780, 415], [840, 515]] },
    { color: C.black, width: 9, points: [[600, 555], [790, 575], [835, 695]] },
    { color: C.red, width: 9, points: [[500, 145], [500, 330]] },
  ],
  'cà rốt': [
    { color: C.orange, width: 16, points: [[375, 360], [625, 360], [500, 845], [375, 360]] },
    { color: C.green, width: 16, points: [[500, 360], [420, 200], [500, 360], [500, 175], [500, 360], [585, 205]] },
    { color: C.red, width: 9, points: [[425, 475], [510, 475]] },
    { color: C.red, width: 9, points: [[460, 610], [545, 610]] },
  ],
  'cà chua': [
    { color: C.red, width: 16, points: ellipsePts(500, 545, 225, 195, 24) },
    { color: C.green, width: 16, points: [[500, 355], [405, 305], [465, 355], [500, 260], [535, 355], [595, 305], [500, 355]] },
    { color: C.orange, width: 9, points: arcPts(380, 475, 55, 65, Math.PI, Math.PI * 1.45, 8) },
    { color: C.green, width: 9, points: [[500, 260], [525, 210]] },
  ],
  'quả dứa': [
    { color: C.yellow, width: 16, points: ellipsePts(500, 600, 175, 215, 24) },
    { color: C.green, width: 16, points: [[425, 395], [355, 225], [465, 375], [500, 175], [535, 375], [645, 225], [575, 395]] },
    { color: C.orange, width: 9, points: [[360, 515], [640, 685]] },
    { color: C.orange, width: 9, points: [[640, 515], [360, 685]] },
    { color: C.orange, width: 9, points: [[405, 425], [600, 775]] },
    { color: C.orange, width: 9, points: [[595, 425], [400, 775]] },
  ],
  'quả dâu': [
    { color: C.red, width: 16, points: [[315, 405], [685, 405], [630, 645], [500, 825], [370, 645], [315, 405]] },
    { color: C.green, width: 16, points: [[365, 395], [435, 330], [500, 385], [565, 330], [635, 395]] },
    { color: C.green, width: 9, points: [[500, 385], [500, 280]] },
    { color: C.yellow, width: 9, points: [[415, 515], [430, 515], [555, 515], [570, 515], [490, 635], [505, 635]] },
  ],
  'quả nho': [
    { color: C.green, width: 16, points: [[500, 225], [500, 335], [585, 275]] },
    { color: C.purple, width: 16, points: circlePts(400, 415, 68, 14) },
    { color: C.purple, width: 16, points: circlePts(525, 415, 68, 14) },
    { color: C.purple, width: 16, points: circlePts(635, 415, 68, 14) },
    { color: C.purple, width: 16, points: circlePts(455, 545, 68, 14) },
    { color: C.purple, width: 16, points: circlePts(575, 545, 68, 14) },
    { color: C.purple, width: 16, points: circlePts(515, 675, 68, 14) },
  ],
  'cây kem': [
    { color: C.pink, width: 16, points: arcPts(500, 445, 165, 185, Math.PI, Math.PI * 2, 18) },
    { color: C.pink, width: 16, points: [[335, 445], [335, 625], [665, 625], [665, 445]] },
    { color: C.brown, width: 16, points: rectPts(465, 625, 535, 845) },
    { color: C.yellow, width: 9, points: [[425, 420], [425, 545], [575, 420], [575, 545]] },
  ],
  'bánh mì': [
    { color: C.orange, width: 16, points: ellipsePts(500, 520, 295, 130, 24) },
    { color: C.brown, width: 9, points: [[345, 455], [400, 535]] },
    { color: C.brown, width: 9, points: [[465, 440], [525, 525]] },
    { color: C.brown, width: 9, points: [[595, 455], [650, 535]] },
  ],
  'hamburger': [
    { color: C.orange, width: 16, points: arcPts(500, 445, 225, 155, Math.PI, Math.PI * 2, 18) },
    { color: C.green, width: 16, points: wavePts(255, 745, 495, 22, 5, 24) },
    { color: C.brown, width: 16, points: rectPts(265, 535, 735, 615) },
    { color: C.yellow, width: 9, points: [[315, 535], [495, 605], [675, 535]] },
    { color: C.orange, width: 16, points: rectPts(275, 635, 725, 725) },
  ],
  'bát phở': [
    { color: C.blue, width: 16, points: arcPts(500, 515, 265, 215, 0, Math.PI, 20) },
    { color: C.blue, width: 9, points: ellipsePts(500, 515, 265, 55, 20) },
    { color: C.brown, width: 16, points: rectPts(395, 725, 605, 795) },
    { color: C.orange, width: 9, points: [[645, 235], [515, 495]] },
    { color: C.orange, width: 9, points: [[720, 275], [555, 505]] },
    { color: C.green, width: 9, points: [[395, 435], [375, 355], [405, 285]] },
  ],
  'chai nước': [
    { color: C.red, width: 16, points: rectPts(440, 175, 560, 255) },
    { color: C.blue, width: 16, points: [[445, 255], [385, 370], [385, 815], [615, 815], [615, 370], [555, 255]] },
    { color: C.teal, width: 9, points: rectPts(385, 495, 615, 665) },
    { color: C.teal, width: 9, points: wavePts(395, 595, 580, 16, 2, 16) },
  ],
  'cốc nước': [
    { color: C.blue, width: 16, points: [[335, 275], [665, 275], [615, 795], [385, 795], [335, 275]] },
    { color: C.teal, width: 9, points: wavePts(360, 640, 480, 18, 2, 18) },
    { color: C.pink, width: 9, points: [[575, 165], [515, 480]] },
  ],
  'ấm trà': [
    { color: C.teal, width: 16, points: ellipsePts(485, 575, 200, 165, 22) },
    { color: C.teal, width: 16, points: arcPts(680, 565, 90, 95, -Math.PI * 0.45, Math.PI * 0.45, 12) },
    { color: C.teal, width: 16, points: [[295, 545], [185, 435], [225, 405], [335, 485]] },
    { color: C.yellow, width: 16, points: circlePts(485, 385, 35, 12) },
  ],
  'cái nồi': [
    { color: C.black, width: 16, points: rectPts(280, 425, 720, 745) },
    { color: C.red, width: 16, points: arcPts(500, 425, 220, 90, Math.PI, Math.PI * 2, 18) },
    { color: C.black, width: 16, points: [[500, 295], [500, 335], [460, 295], [540, 295]] },
    { color: C.orange, width: 9, points: [[200, 500], [280, 500], [720, 500], [800, 500]] },
  ],
  'cái chảo': [
    { color: C.black, width: 16, points: circlePts(395, 515, 205, 24) },
    { color: C.black, width: 16, points: circlePts(395, 515, 145, 20) },
    { color: C.orange, width: 16, points: [[585, 555], [840, 705]] },
    { color: C.yellow, width: 16, points: circlePts(395, 515, 55, 14) },
  ],
  'con dao': [
    { color: C.blue, width: 16, points: [[200, 620], [565, 265], [645, 345], [525, 490], [200, 620]] },
    { color: C.brown, width: 16, points: [[200, 620], [115, 710], [175, 770], [275, 675]] },
    { color: C.teal, width: 9, points: [[280, 580], [555, 305]] },
    { color: C.red, width: 9, points: [[645, 665], [765, 665]] },
  ],
  'cây kéo': [
    { color: C.blue, width: 16, points: [[275, 345], [765, 665]] },
    { color: C.blue, width: 16, points: [[275, 665], [765, 345]] },
    { color: C.red, width: 16, points: circlePts(245, 315, 72, 16) },
    { color: C.red, width: 16, points: circlePts(245, 695, 72, 16) },
  ],
  'cái búa': [
    { color: C.brown, width: 16, points: rectPts(465, 365, 535, 835) },
    { color: C.black, width: 16, points: rectPts(285, 225, 700, 365) },
    { color: C.red, width: 9, points: [[685, 225], [790, 295], [685, 365]] },
    { color: C.orange, width: 9, points: [[465, 665], [535, 665]] },
  ],
  'túi xách': [
    { color: C.pink, width: 16, points: [[250, 405], [750, 405], [795, 795], [205, 795], [250, 405]] },
    { color: C.brown, width: 16, points: arcPts(500, 405, 130, 155, Math.PI, Math.PI * 2, 16) },
    { color: C.yellow, width: 16, points: rectPts(455, 535, 545, 615) },
    { color: C.purple, width: 9, points: [[235, 520], [765, 520]] },
  ],
  'chiếc giày': [
    { color: C.blue, width: 16, points: [[240, 355], [440, 355], [495, 515], [775, 545], [815, 675], [220, 675], [240, 355]] },
    { color: C.black, width: 16, points: [[215, 695], [820, 695]] },
    { color: C.red, width: 9, points: [[475, 445], [535, 445], [505, 495], [565, 495]] },
    { color: C.yellow, width: 9, points: [[260, 565], [425, 565]] },
  ],
  'cái mũ': [
    { color: C.orange, width: 16, points: arcPts(470, 515, 195, 195, Math.PI, Math.PI * 2, 20) },
    { color: C.orange, width: 16, points: [[255, 515], [815, 515], [785, 555], [255, 555]] },
    { color: C.red, width: 16, points: circlePts(470, 305, 32, 10) },
    { color: C.blue, width: 9, points: [[470, 330], [555, 515]] },
  ],
  'chiếc áo': [
    { color: C.teal, width: 16, points: [[340, 260], [660, 260], [800, 415], [715, 505], [635, 415], [635, 795], [365, 795], [365, 415], [285, 505], [200, 415], [340, 260]] },
    { color: C.yellow, width: 9, points: arcPts(500, 260, 75, 55, 0, Math.PI, 12) },
    { color: C.red, width: 9, points: starPts(500, 505, 65, 28, 5) },
    { color: C.blue, width: 9, points: [[365, 745], [635, 745]] },
  ],
  'quyển sách': [
    { color: C.blue, width: 16, points: [[200, 300], [500, 350], [500, 740], [200, 690], [200, 300]] },
    { color: C.blue, width: 16, points: [[800, 300], [500, 350], [500, 740], [800, 690], [800, 300]] },
    { color: C.black, width: 9, points: [[255, 415], [440, 445], [255, 505], [440, 535]] },
    { color: C.black, width: 9, points: [[560, 445], [745, 415], [560, 535], [745, 505]] },
  ],
  'bút chì': [
    { color: C.yellow, width: 16, points: [[275, 745], [675, 345], [745, 415], [345, 815], [275, 745]] },
    { color: C.pink, width: 16, points: [[675, 345], [745, 275], [815, 345], [745, 415]] },
    { color: C.orange, width: 16, points: [[275, 745], [200, 865], [345, 815]] },
    { color: C.black, width: 16, points: [[200, 865], [240, 835]] },
  ],
  'tivi': [
    { color: C.black, width: 16, points: rectPts(200, 315, 800, 705) },
    { color: C.blue, width: 9, points: rectPts(245, 360, 755, 655) },
    { color: C.black, width: 9, points: [[500, 315], [375, 195], [500, 315], [625, 195]] },
    { color: C.black, width: 16, points: [[420, 705], [420, 780], [580, 780], [580, 705]] },
  ],
  'tủ lạnh': [
    { color: C.teal, width: 16, points: rectPts(320, 175, 680, 835) },
    { color: C.black, width: 9, points: [[320, 425], [680, 425]] },
    { color: C.blue, width: 16, points: [[620, 265], [620, 375]] },
    { color: C.blue, width: 16, points: [[620, 495], [620, 695]] },
  ],
  'máy ảnh': [
    { color: C.black, width: 16, points: rectPts(205, 345, 795, 735) },
    { color: C.black, width: 16, points: rectPts(395, 255, 605, 345) },
    { color: C.blue, width: 16, points: circlePts(500, 540, 125, 22) },
    { color: C.teal, width: 9, points: circlePts(500, 540, 68, 16) },
    { color: C.yellow, width: 16, points: [[275, 425], [315, 425]] },
  ],
  'loa': [
    { color: C.black, width: 16, points: rectPts(310, 200, 690, 815) },
    { color: C.blue, width: 16, points: circlePts(500, 345, 65, 16) },
    { color: C.purple, width: 16, points: circlePts(500, 615, 130, 22) },
    { color: C.orange, width: 9, points: circlePts(500, 615, 52, 12) },
  ],
  'micro': [
    { color: C.purple, width: 16, points: ellipsePts(500, 355, 95, 130, 20) },
    { color: C.black, width: 9, points: [[405, 355], [595, 355]] },
    { color: C.black, width: 16, points: [[465, 485], [535, 485], [515, 760], [485, 760], [465, 485]] },
    { color: C.pink, width: 9, points: [[500, 760], [470, 845], [565, 865]] },
  ],
  'đèn pin': [
    { color: C.black, width: 16, points: rectPts(200, 445, 535, 575) },
    { color: C.orange, width: 16, points: [[535, 445], [645, 375], [645, 645], [535, 575]] },
    { color: C.yellow, width: 9, points: [[670, 435], [840, 325], [675, 510], [875, 510], [670, 585], [840, 695]] },
    { color: C.red, width: 16, points: [[345, 445], [385, 445]] },
  ],
  'cái trống': [
    { color: C.red, width: 16, points: [[250, 385], [750, 385], [750, 685], [250, 685], [250, 385]] },
    { color: C.yellow, width: 16, points: ellipsePts(500, 385, 250, 68, 22) },
    { color: C.yellow, width: 9, points: [[250, 415], [385, 685], [500, 415], [615, 685], [750, 415]] },
    { color: C.brown, width: 9, points: [[345, 210], [500, 375], [655, 210], [500, 375]] },
  ],
  'chiếc nhẫn': [
    { color: C.yellow, width: 16, points: circlePts(500, 575, 195, 24) },
    { color: C.yellow, width: 9, points: circlePts(500, 575, 145, 20) },
    { color: C.teal, width: 16, points: [[420, 305], [500, 210], [580, 305], [500, 385], [420, 305]] },
    { color: C.orange, width: 9, points: starPts(655, 215, 42, 18, 4) },
  ],
  'kim cương': [
    { color: C.teal, width: 16, points: [[315, 265], [685, 265], [820, 445], [500, 815], [180, 445], [315, 265]] },
    { color: C.blue, width: 9, points: [[180, 445], [820, 445]] },
    { color: C.blue, width: 9, points: [[395, 265], [355, 445], [500, 815], [645, 445], [605, 265]] },
    { color: C.yellow, width: 9, points: starPts(765, 210, 42, 18, 4) },
  ],
  'con dấu': [
    { color: C.brown, width: 16, points: circlePts(500, 295, 95, 18) },
    { color: C.brown, width: 16, points: [[460, 385], [460, 565], [540, 565], [540, 385]] },
    { color: C.red, width: 16, points: rectPts(280, 565, 720, 680) },
    { color: C.red, width: 16, points: [[245, 735], [755, 735]] },
  ],
  'lá cờ': [
    { color: C.brown, width: 16, points: [[250, 195], [250, 855]] },
    { color: C.red, width: 16, points: rectPts(265, 215, 775, 535) },
    { color: C.yellow, width: 16, points: starPts(520, 375, 105, 44, 5) },
    { color: C.brown, width: 16, points: [[205, 855], [315, 855]] },
  ],
  'bánh chưng': [
    { color: C.green, width: 16, points: rectPts(240, 240, 760, 760) },
    { color: C.orange, width: 9, points: [[500, 240], [500, 760]] },
    { color: C.orange, width: 9, points: [[240, 500], [760, 500]] },
    { color: C.orange, width: 9, points: [[375, 240], [375, 760], [625, 240], [625, 760]] },
  ],
  'hoa sen': [
    { color: C.pink, width: 16, points: [[500, 225], [420, 455], [500, 625], [580, 455], [500, 225]] },
    { color: C.pink, width: 16, points: [[305, 345], [345, 555], [500, 625], [220, 505], [305, 345]] },
    { color: C.pink, width: 16, points: [[695, 345], [655, 555], [500, 625], [780, 505], [695, 345]] },
    { color: C.green, width: 16, points: arcPts(500, 635, 285, 95, 0, Math.PI, 18) },
    { color: C.blue, width: 9, points: wavePts(200, 800, 785, 18, 3, 18) },
  ],
  'pháo hoa': [
    { color: C.red, width: 9, points: [[500, 385], [500, 165], [500, 385], [705, 255], [500, 385], [725, 455]] },
    { color: C.yellow, width: 9, points: [[500, 385], [295, 255], [500, 385], [275, 455], [500, 385], [360, 575]] },
    { color: C.purple, width: 9, points: [[500, 385], [640, 575], [500, 385], [500, 605]] },
    { color: C.orange, width: 9, points: [[500, 560], [500, 825]] },
    { color: C.teal, width: 9, points: starPts(270, 690, 48, 20, 4) },
  ],
  'sóng biển': [
    { color: C.blue, width: 16, points: [[160, 665], [290, 345], [495, 290], [600, 395], [505, 465], [640, 595], [840, 665]] },
    { color: C.teal, width: 9, points: wavePts(160, 840, 745, 28, 3, 24) },
    { color: C.yellow, width: 16, points: circlePts(745, 240, 68, 16) },
    { color: C.blue, width: 9, points: arcPts(545, 370, 75, 60, Math.PI * 0.2, Math.PI * 1.4, 10) },
  ],
  'khủng long': [
    { color: C.green, width: 16, points: [[220, 685], [375, 575], [475, 325], [625, 255], [725, 315], [645, 395], [560, 405], [545, 655], [220, 685]] },
    { color: C.orange, width: 9, points: [[445, 340], [385, 365], [425, 435], [355, 485], [395, 545]] },
    { color: C.green, width: 16, points: [[435, 665], [435, 815], [535, 665], [535, 815]] },
    { color: C.black, width: 9, points: [[620, 295], [635, 295]] },
  ],
  'kỳ lân': [
    { color: C.pink, width: 16, points: circlePts(445, 455, 155, 22) },
    { color: C.yellow, width: 16, points: [[420, 305], [450, 135], [495, 305]] },
    { color: C.purple, width: 16, points: [[340, 355], [285, 265], [375, 315]] },
    { color: C.teal, width: 9, points: [[575, 395], [675, 445], [585, 515], [695, 565]] },
    { color: C.black, width: 9, points: [[400, 445], [420, 445]] },
  ],
  'nàng tiên cá': [
    { color: C.pink, width: 16, points: circlePts(500, 275, 85, 18) },
    { color: C.red, width: 9, points: [[425, 230], [375, 385], [575, 230], [625, 385]] },
    { color: C.teal, width: 16, points: [[445, 520], [555, 520], [525, 725], [415, 835], [500, 775], [585, 835], [525, 725]] },
    { color: C.purple, width: 16, points: [[445, 365], [445, 520], [555, 520], [555, 365]] },
  ],
  'người máy': [
    { color: C.blue, width: 16, points: rectPts(355, 225, 645, 435) },
    { color: C.black, width: 9, points: [[500, 145], [500, 225], [495, 145], [510, 145]] },
    { color: C.yellow, width: 16, points: circlePts(435, 315, 32, 10) },
    { color: C.yellow, width: 16, points: circlePts(565, 315, 32, 10) },
    { color: C.teal, width: 16, points: rectPts(320, 455, 680, 735) },
    { color: C.red, width: 9, points: [[220, 485], [320, 485], [680, 485], [780, 485]] },
  ],
  'phi hành gia': [
    { color: C.blue, width: 16, points: circlePts(500, 325, 140, 22) },
    { color: C.teal, width: 16, points: rectPts(405, 255, 595, 385) },
    { color: C.blue, width: 16, points: rectPts(365, 475, 635, 715) },
    { color: C.orange, width: 9, points: rectPts(435, 535, 565, 625) },
    { color: C.blue, width: 16, points: [[425, 715], [425, 845], [575, 715], [575, 845]] },
  ],
  'ông già noel': [
    { color: C.red, width: 16, points: [[340, 360], [500, 165], [660, 360], [340, 360]] },
    { color: C.pink, width: 16, points: circlePts(500, 485, 155, 22) },
    { color: C.orange, width: 16, points: [[355, 505], [385, 695], [500, 775], [615, 695], [645, 505]] },
    { color: C.black, width: 9, points: [[440, 445], [455, 445], [545, 445], [560, 445]] },
    { color: C.red, width: 16, points: circlePts(500, 505, 32, 10) },
  ],
};

const SKETCH_ALIASES: Record<string, string> = {
  'dưa hấu': 'quả dưa hấu',
  'xương rồng': 'cây xương rồng',
  'pizza': 'bánh pizza',
  'que kem': 'kem ốc quế',
  'trà sữa': 'ly trà sữa',
  'cà phê': 'ly cà phê',
  'mắt kính': 'kính mắt',
  'ô che mưa': 'cây dù',
  'chìa khóa': 'chiếc chìa khóa',
  'ma trơi': 'con ma',
  'ufo': 'người ngoài hành tinh',
  'quả bóng': 'quả bóng đá',
  'nấm rơm': 'cây nấm',
};

/**
 * Lấy bộ nét vẽ của Bot cho từ khóa bất kỳ:
 * - Khớp trực tiếp hoặc qua alias trong 120 hình `BOT_SKETCHES`.
 * - Nếu từ ngoài danh sách sketch, sinh hình đa sắc 5 nét theo nhóm ngữ nghĩa (động vật, đồ ăn, xe cộ, thiên nhiên, đồ vật).
 */
export function getBotSketch(word: string): VeDoanStroke[] {
  const norm = word.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  if (BOT_SKETCHES[norm]) return BOT_SKETCHES[norm];
  const alias = SKETCH_ALIASES[norm];
  if (alias && BOT_SKETCHES[alias]) return BOT_SKETCHES[alias];

  if (/^(con |chim |cá |hươu |bò |gà |vịt |chó |mèo |chuột |côn trùng|bướm|ong |nhện)/.test(norm)) {
    return [
      { color: C.brown, width: 16, points: ellipsePts(520, 610, 185, 130, 20) },
      { color: C.orange, width: 16, points: circlePts(320, 455, 105, 18) },
      { color: C.brown, width: 9, points: [[265, 370], [245, 275], [325, 355]] },
      { color: C.black, width: 9, points: [[290, 440], [305, 440]] },
      { color: C.brown, width: 16, points: [[405, 735], [405, 845], [405, 735], [625, 735], [625, 845]] },
    ];
  }
  if (/^(quả |trái |bánh |phở |bún |mì |cơm |cháo |xôi |lẩu |nem |gỏi |chè |trà |nước |kem |cà |bắp |ớt |củ |rau |thịt |xúc xích|chai |hộp |ly |cốc |món )/.test(norm)) {
    return [
      { color: C.blue, width: 16, points: arcPts(500, 560, 265, 185, 0, Math.PI, 18) },
      { color: C.blue, width: 9, points: ellipsePts(500, 560, 265, 55, 18) },
      { color: C.orange, width: 16, points: arcPts(500, 545, 195, 115, Math.PI, Math.PI * 2, 16) },
      { color: C.green, width: 9, points: [[425, 485], [475, 455], [545, 495]] },
      { color: C.red, width: 9, points: [[460, 345], [440, 265], [475, 205]] },
    ];
  }
  if (/^(xe |tàu |thuyền |cano|du thuyền|trực thăng|máy bay|khinh khí cầu|tên lửa)/.test(norm)) {
    return [
      { color: C.blue, width: 16, points: rectPts(205, 385, 795, 625) },
      { color: C.teal, width: 9, points: rectPts(585, 425, 755, 525) },
      { color: C.black, width: 16, points: circlePts(335, 655, 75, 16) },
      { color: C.black, width: 16, points: circlePts(665, 655, 75, 16) },
      { color: C.yellow, width: 16, points: [[785, 555], [825, 555]] },
    ];
  }
  if (/^(cây |hoa |lá |rừng |núi |biển |sông |hồ |thác |mây |sao |mặt )/.test(norm)) {
    return [
      { color: C.brown, width: 16, points: [[470, 520], [470, 820], [530, 820], [530, 520]] },
      { color: C.green, width: 16, points: circlePts(500, 390, 175, 18) },
      { color: C.green, width: 16, points: circlePts(375, 445, 115, 14) },
      { color: C.green, width: 16, points: circlePts(625, 445, 115, 14) },
      { color: C.yellow, width: 9, points: circlePts(780, 195, 62, 12) },
    ];
  }
  if (/^(áo |quần |váy |giày |dép |mũ |nón |kính |túi |cặp )/.test(norm)) {
    return [
      { color: C.purple, width: 16, points: [[340, 260], [660, 260], [770, 410], [695, 470], [635, 390], [635, 760], [365, 760], [365, 390], [305, 470], [230, 410], [340, 260]] },
      { color: C.yellow, width: 9, points: arcPts(500, 260, 65, 45, 0, Math.PI, 10) },
      { color: C.pink, width: 9, points: starPts(500, 490, 55, 25, 5) },
    ];
  }
  return [
    { color: C.blue, width: 16, points: rectPts(285, 265, 715, 735) },
    { color: C.yellow, width: 9, points: circlePts(500, 485, 115, 18) },
    { color: C.red, width: 9, points: starPts(500, 485, 75, 32, 5) },
    { color: C.teal, width: 9, points: [[335, 315], [415, 315]] },
    { color: C.green, width: 9, points: [[335, 685], [665, 685]] },
  ];
}

const EXTRA_VE_DOAN_WORDS: string[] = [
  // 1. Động vật, côn trùng & sinh vật biển (90+ từ)
  'con vịt', 'con gà', 'con gà trống', 'gà con', 'con trâu', 'con bò', 'con bò sữa',
  'con heo', 'con voi', 'con hổ', 'con sư tử', 'con báo', 'con gấu', 'gấu trúc', 'gấu bắc cực',
  'con khỉ', 'tinh tinh', 'con ngựa', 'ngựa vằn', 'con lừa', 'con dê', 'con cừu',
  'con thỏ', 'con sóc', 'con chuột', 'chuột hamster', 'con nhím', 'con dơi', 'con cáo',
  'chó sói', 'lạc đà', 'chuột túi', 'gấu túi koala', 'hà mã', 'tê giác', 'hươu cao cổ',
  'con nai', 'tuần lộc', 'kỳ nhông', 'tắc kè hoa', 'con rắn', 'rắn hổ mang', 'kỳ lân',
  'cá sấu', 'con ếch', 'nòng nọc', 'con rùa', 'ốc sên', 'con kiến', 'con ong', 'bọ rùa',
  'con muỗi', 'con ruồi', 'con gián', 'châu chấu', 'bọ ngựa', 'chuồn chuồn', 'đom đóm',
  'bọ cạp', 'con rết', 'con nhện', 'con tằm', 'con ve sầu', 'chim cánh cụt', 'chim đại bàng',
  'chim cú mèo', 'con công', 'con vẹt', 'chim bồ câu', 'chim sẻ', 'chim gõ kiến',
  'chim hồng hạc', 'thiên nga', 'con cò', 'đà điểu', 'cá heo', 'cá voi', 'cá mập',
  'cá vàng', 'cá chép', 'cá ngựa', 'cá đuối', 'cá nóc', 'cá kiếm', 'con cua', 'con tôm',
  'tôm hùm', 'con mực', 'bạch tuộc', 'sao biển', 'con sứa', 'con sò', 'ngọc trai',

  // 2. Món ăn Việt, quốc tế & đồ uống (95+ từ)
  'bánh mì', 'bánh mì kẹp', 'phở bò', 'bún bò', 'bún chả', 'bún đậu mắm tôm', 'cơm tấm',
  'cơm cuộn sushi', 'cơm rang', 'cơm nắm', 'xôi gấc', 'cháo lòng', 'hủ tiếu', 'mì tôm',
  'mì ý', 'mì cay', 'lẩu thái', 'gỏi cuốn', 'nem rán', 'chả giò', 'bánh xèo', 'bánh khọt',
  'bánh cuốn', 'bánh bèo', 'bánh hỏi', 'bánh chưng', 'bánh tét', 'bánh bao', 'bánh giò',
  'bánh gối', 'bánh rán', 'bánh tiêu', 'bánh quẩy', 'bánh flan', 'bánh quy', 'bánh donut',
  'bánh sừng bò', 'bánh trung thu', 'bánh gạo', 'kẹo mút', 'kẹo dẻo', 'kẹo bông gòn',
  'sô cô la', 'thạch rau câu', 'xúc xích', 'lạp xưởng', 'khoai tây chiên', 'gà rán',
  'hamburger', 'sandwich', 'bít tết', 'trứng cút lộn', 'đậu hũ', 'đậu phộng', 'hạt dẻ',
  'bắp rang bơ', 'mứt gừng', 'hạt hướng dương', 'sinh tố bơ', 'nước mía', 'nước dừa',
  'nước cam', 'chanh muối', 'trà chanh', 'trà đào', 'trà đá', 'nước ngọt', 'bia hơi',
  'rượu vang', 'sữa chua', 'kem ly', 'tương ớt', 'nước mắm', 'mật ong',

  // 3. Trái cây & rau củ (65+ từ)
  'quả cam', 'quả quýt', 'quả bưởi', 'quả chanh', 'quả xoài', 'quả ổi', 'quả cóc',
  'quả mận', 'quả đào', 'quả lê', 'quả táo', 'quả nho', 'quả dâu', 'việt quất',
  'quả dứa', 'quả mít', 'quả sầu riêng', 'quả măng cụt', 'quả chôm chôm', 'quả vải',
  'quả nhãn', 'quả thanh long', 'quả đu đủ', 'quả na', 'quả khế', 'quả bơ', 'quả kiwi',
  'quả dừa', 'quả lựu', 'quả sung', 'quả hồng', 'quả me', 'cà rốt', 'bắp cải',
  'cải thảo', 'rau muống', 'súp lơ', 'cà chua', 'cà tím', 'dưa chuột', 'bí đao',
  'bí ngô', 'khổ qua', 'su hào', 'khoai tây', 'khoai lang', 'bắp ngô', 'ớt đỏ',
  'củ tỏi', 'củ gừng', 'củ hành', 'củ cải trắng', 'nấm rơm', 'măng tre', 'đậu bắp',
  'củ lạc',

  // 4. Thiên nhiên, thời tiết & vũ trụ (55+ từ)
  'bông hoa', 'hoa sen', 'hoa hồng', 'hoa hướng dương', 'hoa cúc', 'hoa mai', 'hoa đào',
  'hoa tulíp', 'hoa bồ công anh', 'cây dừa', 'cây tre', 'cây chuối', 'cây thông',
  'cây phong', 'chiếc lá', 'cỏ bốn lá', 'khúc gỗ', 'gốc cây', 'ngọn núi', 'núi lửa',
  'hang động', 'sa mạc', 'ốc đảo', 'bãi biển', 'hòn đảo', 'đại dương', 'sóng biển',
  'dòng sông', 'thác nước', 'hồ nước', 'cánh đồng', 'khu rừng', 'cầu vồng', 'đám mây',
  'giọt mưa', 'tia chớp', 'cơn bão', 'lốc xoáy', 'bông tuyết', 'cục băng', 'bầu trời',
  'hoàng hôn', 'bình minh', 'trái đất', 'sao thổ', 'mặt trăng', 'vầng trăng', 'dải ngân hà',
  'hố đen vũ trụ', 'sao băng', 'vệ tinh', 'hành tinh',

  // 5. Phương tiện & giao thông (50+ từ)
  'xe máy', 'xe đạp', 'xe đạp điện', 'xích lô', 'xe ba gác', 'xe ô tô', 'xe taxi',
  'xe buýt', 'xe khách', 'xe tải', 'xe ben', 'xe cần cẩu', 'xe lu', 'xe xúc đất',
  'xe cứu thương', 'xe cứu hỏa', 'xe cảnh sát', 'xe tăng', 'xe đua', 'xe trượt tuyết',
  'ván trượt', 'patin', 'tàu hỏa', 'tàu điện ngầm', 'tàu cao tốc', 'tàu ngầm',
  'tàu thủy', 'thuyền buồm', 'ca nô', 'thuyền thúng', 'phà qua sông', 'khinh khí cầu',
  'trực thăng', 'máy bay phản lực', 'tên lửa', 'tàu vũ trụ', 'đèn giao thông', 'biển báo',
  'vạch kẻ đường', 'trạm xăng', 'cầu vượt', 'bến xe', 'sân bay', 'đường ray', 'mỏ neo',

  // 6. Gia dụng, đồ bếp & nội thất (65+ từ)
  'ti vi', 'tủ lạnh', 'máy giặt', 'quạt máy', 'quạt trần', 'điều hòa', 'lò vi sóng',
  'nồi cơm điện', 'ấm siêu tốc', 'máy xay sinh tố', 'máy sấy tóc', 'bàn là', 'máy hút bụi',
  'máy ảnh', 'máy quay phim', 'loa kẹo kéo', 'micro', 'đài radio', 'bóng đèn', 'đèn pin',
  'đèn ngủ', 'đèn chùm', 'nến thơm', 'cục pin', 'cục sạc', 'ổ cắm điện', 'công tắc',
  'cây kéo', 'cái búa', 'cái cưa', 'cái kìm', 'tua vít', 'cờ lê', 'máy khoan',
  'ổ khóa', 'cái thang', 'cái xô', 'cây chổi', 'cây lau nhà', 'thùng rác', 'gương soi',
  'cái lược', 'bàn chải', 'kem đánh răng', 'khăn mặt', 'xà phòng', 'vòi hoa sen', 'bồn tắm',
  'chiếc gối', 'cái chăn', 'cái đệm', 'cái giường', 'cái ghế', 'ghế sofa', 'cái bàn',
  'tủ quần áo', 'bàn trang điểm', 'đồng hồ treo tường', 'đồng hồ báo thức', 'rèm cửa',
  'thảm chùi chân', 'chậu cây', 'bình hoa', 'cái bát', 'đôi đũa', 'cái thìa', 'cái dĩa',
  'con dao', 'cái thớt', 'cái chảo', 'cái nồi', 'cái ấm trà', 'cái phích nước', 'cái rổ',
  'chai nước', 'hộp sữa', 'bình giữ nhiệt', 'hộp cơm',

  // 7. Công nghệ, học đường & văn phòng (55+ từ)
  'máy tính để bàn', 'bàn phím', 'con chuột', 'máy in', 'tai nghe', 'tai nghe bluetooth',
  'đồng hồ thông minh', 'máy tính bảng', 'máy chơi game', 'tay cầm game', 'kính thực tế ảo',
  'cục phát wifi', 'usb', 'thẻ nhớ', 'ổ cứng', 'quyển sách', 'quyển vở', 'bút chì',
  'bút bi', 'bút lông', 'bút dạ quang', 'cục tẩy', 'gọt bút chì', 'hộp bút', 'thước kẻ',
  'ê ke', 'compa', 'cặp sách', 'ba lô', 'bảng đen', 'phấn viết', 'quả địa cầu',
  'kính hiển vi', 'kính lúp', 'kính thiên văn', 'ống nghiệm', 'nam châm', 'la bàn',
  'bản đồ', 'phong bì', 'tem thư', 'con dấu', 'máy tính bỏ túi', 'lịch để bàn',

  // 8. Thời trang, trang sức & làm đẹp (40+ từ)
  'áo thun', 'áo sơ mi', 'áo dài', 'áo khoác', 'áo len', 'áo mưa', 'váy đầm',
  'quần jean', 'quần đùi', 'cà vạt', 'nơ cổ', 'thắt lưng', 'đôi giày', 'giày cao gót',
  'đôi dép', 'dép tông', 'ủng đi mưa', 'đôi tất', 'găng tay', 'khăn quàng cổ',
  'cái mũ', 'mũ lưỡi trai', 'nón lá', 'mũ bảo hiểm', 'mũ len', 'kính râm',
  'chiếc nhẫn', 'vòng cổ', 'vòng tay', 'khuyên tai', 'túi xách', 'ví tiền', 'va li',
  'thỏi son', 'lọ nước hoa', 'sơn móng tay',

  // 9. Công trình, địa danh & đồ vật ngoài trời (40+ từ)
  'lâu đài', 'kim tự tháp', 'tòa nhà cao tầng', 'chung cư', 'nhà sàn', 'lều cắm trại',
  'lều tuyết', 'nhà thờ', 'chùa một cột', 'tháp rùa', 'tháp eiffel', 'cối xay gió',
  'ngọn hải đăng', 'bệnh viện', 'trường học', 'thư viện', 'rạp chiếu phim', 'siêu thị',
  'nhà hàng', 'quán trà sữa', 'sân vận động', 'bể bơi', 'công viên', 'xích đu',
  'cầu trượt', 'bập bênh', 'vòng đu quay', 'cổng chào', 'cột điện', 'cầu treo',
  'hộp thư', 'ghế đá công viên', 'giếng nước', 'bù nhìn rơm',

  // 10. Thể thao, âm nhạc, lễ hội & nhân vật (65+ từ)
  'quả bóng đá', 'quả bóng rổ', 'bóng chuyền', 'bóng bầu dục', 'bóng bàn', 'quả cầu lông',
  'vợt cầu lông', 'vợt tennis', 'gậy bóng chày', 'gậy đánh golf', 'ván lướt sóng',
  'xe trượt ván', 'tạ tay', 'dây nhảy', 'huy chương vàng', 'cúp vô địch', 'ván cờ vua',
  'quân cờ tướng', 'bộ bài tây', 'xúc xắc', 'con quay', 'cái diều', 'đèn lồng',
  'pháo hoa', 'cây thông noel', 'người tuyết', 'bánh gừng', 'cây đàn piano', 'cái trống',
  'đàn bầu', 'đàn vi ô lông', 'kèn saxophone', 'sáo trúc', 'nốt nhạc', 'cung tên',
  'thanh kiếm', 'cái khiên', 'quả bom', 'cái rìu', 'cây đũa thần', 'thảm bay',
  'ông già noel', 'chú hề', 'cướp biển', 'siêu nhân', 'người máy', 'người nhện',
  'phù thủy', 'tiên nữ', 'nàng tiên cá', 'thần đèn', 'ma cà rồng', 'xác ướp',
  'bộ xương', 'bác sĩ', 'y tá', 'chú công an', 'lính cứu hỏa', 'phi hành gia',
  'đầu bếp', 'nông dân', 'thợ lặn', 'nhà ảo thuật', 'vua chúa', 'hoàng hậu',

  // 11. Kho mở rộng V8 (+430 từ khóa đa dạng, dễ vẽ, ít trùng lặp giữa các ván)
  'gấu nâu', 'hổ trắng', 'báo đốm', 'báo đen', 'linh cẩu', 'chồn hương', 'chó đốm', 'chó pug', 'chó shiba',
  'mèo mướp', 'thỏ trắng', 'cừu non', 'dê núi', 'ngựa gỗ', 'ngựa một sừng', 'lợn rừng', 'trâu nước',
  'bò tót', 'tê tê', 'thú mỏ vịt', 'hải ly', 'rái cá', 'cá sấu con', 'rắn lục', 'trăn gấm',
  'rùa biển', 'ếch xanh', 'cóc vàng', 'bọ hung', 'bọ cánh cứng', 'kiến lửa', 'ong vò vẽ', 'ong thợ',
  'bướm đêm', 'sâu róm', 'kén bướm', 'ốc bươu', 'sò huyết', 'trai ngọc', 'tôm tít', 'cua hoàng đế',
  'cá hồi', 'cá thu', 'cá trích', 'cá lóc', 'cá trê', 'cá rô phi', 'lươn đồng', 'cá bống',
  'chim bói cá', 'chim sáo', 'chim họa mi', 'chim chích chòe', 'chim hải âu', 'bồ nông', 'kền kền', 'chim ưng',
  'công xòe đuôi', 'vẹt đuôi dài', 'sếu đầu đỏ', 'vịt trời', 'ngan xám', 'ngỗng trắng', 'chim khướu',

  'bún mắm', 'bún mọc', 'bún thang', 'bún riêu', 'miến lươn', 'miến xào', 'mì quảng', 'cao lầu',
  'phở cuốn', 'phở xào', 'cơm cháy', 'cơm gà hội an', 'cơm niêu', 'xôi xéo', 'xôi đậu đen', 'xôi khúc',
  'bánh tẻ', 'bánh nậm', 'bánh lọc', 'bánh ít', 'bánh cam', 'bánh cống', 'bánh da lợn', 'bánh bò',
  'bánh chuối nướng', 'bánh khoai mì', 'bánh đúc', 'bánh đa', 'bánh pía', 'bánh tráng', 'bánh tráng trộn',
  'bánh tráng nướng', 'bò né', 'bò kho', 'cà ri gà', 'gà nướng', 'vịt quay', 'heo sữa quay', 'chả lụa',
  'nem chua', 'dồi sụn', 'trứng ốp la', 'trứng bắc thảo', 'chả trứng', 'canh chua', 'thịt kho tàu', 'cá kho tộ',
  'tôm rim', 'mực nhồi thịt', 'hàu nướng mỡ hành', 'ốc hương', 'nghêu hấp sả', 'càng cua rang me', 'gỏi ngó sen',
  'nộm đu đủ', 'dưa món', 'củ kiệu', 'cà pháo', 'kim chi', 'kimbap', 'ramen', 'udon', 'takoyaki',
  'dimsum', 'sủi cảo', 'há cảo', 'hoành thánh', 'bánh bao kim sa', 'bánh crepe', 'waffle', 'pancake',
  'tiramisu', 'pudding', 'mochi', 'chân gà sả tắc', 'khô gà lá chanh', 'cá viên chiên', 'bắp xào bơ',
  'chè bưởi', 'chè đậu đen', 'chè khúc bạch', 'chè trôi nước', 'sương sáo', 'trà vải', 'trà đào', 'matcha đá xay',
  'sữa đậu nành', 'sữa bắp', 'sữa tươi trân châu', 'coca cola', 'nước dừa tươi', 'nước ép táo', 'nước ép ổi',

  'quả sấu', 'quả mơ', 'quả nhót', 'quả thị', 'quả hồng xiêm', 'quả vú sữa', 'quả roi', 'quả bòn bon',
  'quả mâm xôi', 'quả phúc bồn tử', 'quả anh đào', 'quả việt quất', 'quả dưa lưới', 'quả dưa gang', 'quả dưa hấu vàng',
  'quả dừa xiêm', 'quả cau', 'quả gấc', 'củ sắn', 'củ từ', 'củ khoai môn', 'củ dền', 'củ đậu',
  'rau dền', 'rau mồng tơi', 'rau ngót', 'rau cải xanh', 'rau xà lách', 'rau cần tây', 'hành tây', 'hành lá',
  'húng quế', 'ngò rí', 'lá lốt', 'tía tô', 'sả cây', 'ớt chuông', 'ớt hiểm', 'đậu cô ve', 'đậu đũa', 'đậu xanh',

  'bàn ăn', 'ghế xoay', 'ghế bành', 'tủ giày', 'giá sách', 'kệ tivi', 'bàn học', 'đèn bàn',
  'đèn lồng giấy', 'đèn dầu', 'lò nướng', 'lò sưởi', 'bếp từ', 'bếp ga', 'máy hút mùi', 'máy rửa bát',
  'máy pha cà phê', 'máy ép trái cây', 'máy làm bánh mì', 'máy lọc nước', 'bình đun nước', 'chảo chống dính',
  'nồi áp suất', 'nồi chiên không dầu', 'nồi lẩu điện', 'vá múc canh', 'sạn xào', 'kẹp gắp đá', 'dụng cụ khui bia',
  'rổ nhựa', 'thau giặt đồ', 'giỏ đựng đồ', 'móc phơi áo', 'kẹp phơi đồ', 'bàn ủi hơi nước', 'cầu là',
  'gối ôm', 'chăn bông', 'màn ngủ', 'chiếu trúc', 'thảm trải sàn', 'rèm cửa sổ', 'chốt cửa', 'chuông cửa',
  'tay nắm cửa', 'gạch bông', 'ngói đỏ', 'ống khói', 'ban công', 'sân thượng', 'hàng rào gỗ', 'cổng sắt',

  'tai nghe chụp tai', 'chuột không dây', 'lót chuột', 'màn hình cong', 'webcam', 'card đồ họa', 'quạt tản nhiệt',
  'loa bluetooth', 'máy chiếu', 'bảng vẽ điện tử', 'bút cảm ứng', 'cáp sạc nhanh', 'ổ điện thông minh',
  'cảm biến khói', 'khóa vân tay', 'camera hành trình', 'flycam', 'tay cầm chơi game', 'ghế gaming',
  'đĩa cd', 'băng cassette', 'đầu đĩa than', 'máy chơi điện tử cầm tay', 'máy in ảnh', 'máy đếm tiền',

  'áo dài cách tân', 'áo bà ba', 'áo tứ thân', 'áo cử nhân', 'áo blu trắng', 'áo giáp sắt', 'áo choàng',
  'váy công chúa', 'váy đuôi cá', 'quần yếm', 'quần âu', 'quần thể thao', 'nơ bướm', 'cài tóc tai thỏ',
  'bờm tóc', 'dây buộc tóc', 'kính bơi', 'kính lặn', 'kính bảo hộ', 'kính thiên thần', 'mặt nạ phòng độc',
  'mặt nạ halloween', 'mũ cao bồi', 'mũ đầu bếp', 'mũ cối', 'mũ phi công', 'mũ phù thủy', 'vương miện hoa hậu',
  'găng tay boxing', 'găng tay len', 'tất giáng sinh', 'dép tổ ong', 'dép lào', 'giày patin', 'giày ba lê',

  'xe điện cân bằng', 'xe scooter', 'xe ô tô mui trần', 'xe bán tải', 'xe bồn', 'xe trộn bê tông', 'xe rác',
  'xe cứu hộ', 'xe bọc thép', 'xe ngựa', 'xe kéo tay', 'xích lô máy', 'tàu điện', 'tàu cánh ngầm',
  'du thuyền', 'ca nô lướt sóng', 'thuyền kayak', 'bè tre', 'phao cứu sinh', 'phao vịt vàng', 'vịnh hạ long',
  'hòn trống mái', 'cầu vàng đà nẵng', 'dinh độc lập', 'chợ bến thành', 'lăng bác', 'văn miếu',
  'vạn lý trường thành', 'đấu trường la mã', 'tượng nữ thần tự do', 'nhà hát con sò', 'tháp nghiêng pisa',

  'quả cầu tuyết', 'lồng đèn trung thu', 'đèn ông sao', 'bánh trôi nước', 'mâm ngũ quả', 'cây mai vàng',
  'cành đào nở hoa', 'bao lì xì đỏ', 'trống múa lân', 'đầu lân sư rồng', 'mặt nạ chú tễu', 'nón quai thao',
  'đàn nhị', 'đàn tranh', 'cồng chiêng', 'kèn trumpet', 'trống cơm', 'khèn mèo', 'thanh la',
  'cờ vua quân mã', 'quân xe cờ tướng', 'bàn cờ vây', 'bàn bi a', 'quả bowling', 'gậy đánh bi a',
  'huy chương đồng', 'đai vô địch', 'băng rôn cổ vũ', 'kèn vuvuzela', 'loa phóng thanh', 'còi trọng tài',
  'bộ sơ cứu', 'ống nghe bác sĩ', 'nhiệt kế', 'ống tiêm', 'chai cồn sát khuẩn', 'cuộn băng gạc', 'nạng gỗ',
  'xe lăn', 'máy đo huyết áp', 'viên thuốc con nhộng', 'hộp khẩu trang', 'bông tăm', 'nhíp nhổ lông',

  'con dấu đỏ', 'kẹp giấy', 'dập ghim', 'băng keo hai mặt', 'băng keo trong', 'giấy note vàng', 'tệp tài liệu',
  'cặp táp', 'va li kéo', 'thẻ căn cước', 'hộ chiếu', 'vé máy bay', 'tem bưu chính', 'hộp thư bưu điện',
  'đồng hồ cát', 'đồng hồ quả lắc', 'chuông báo cháy', 'bình chữa cháy', 'bảng chỉ đường', 'cọc tiêu giao thông',
  'trạm thu phí', 'cây xăng', 'cột thu lôi', 'tuabin gió', 'pin năng lượng mặt trời', 'trạm vũ trụ',
  'tàu con thoi', 'kính viễn vọng', 'thiên thạch', 'ngân hà', 'nhật thực', 'nguyệt thực', 'cực quang',

  'rồng châu á', 'phượng hoàng lửa', 'kỳ lân có cánh', 'bạch mã', 'chó ba đầu', 'người tuyết olaf',
  'người khổng lồ', 'người lùn', 'thủy thủ', 'cao bồi miền tây', 'ninja nhật bản', 'samurai',
  'chiến binh la mã', 'hiệp sĩ trung cổ', 'công chúa', 'hoàng tử', 'thám tử lừng danh', 'nhà khoa học',
  'phi công máy bay', 'tiếp viên hàng không', 'tổng thống', 'ca sĩ thần tượng', 'diễn viên xiếc', 'chú hề tung hứng',
];

export const VE_DOAN_WORDS: string[] = Array.from(
  new Set(
    [...Object.keys(BOT_SKETCHES), ...EXTRA_VE_DOAN_WORDS].map((w) =>
      w.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim(),
    ),
  ),
);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sinh các hạt sơn tất định `[x, y, r]` trong không gian `0..1000` từ một nét bình xịt `spray`. */
export function generateSprayDots(stroke: VeDoanStroke): [number, number, number][] {
  if (!stroke.points.length) return [];
  const w = stroke.width || 9;
  const R = w <= 4 ? 22 : w <= 9 ? 38 : 58;
  const perPt = w <= 4 ? 12 : w <= 9 ? 18 : 26;
  const maxDotR = w <= 4 ? 1.8 : 2.8;
  const rng = mulberry32(stroke.seed ?? 1337);
  const pts = stroke.points.slice(0, 160);
  const dots: [number, number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i];
    for (let k = 0; k < perPt; k++) {
      const ang = rng() * Math.PI * 2;
      const dist = R * Math.sqrt(rng()) * (0.35 + 0.65 * rng());
      const dx = Math.max(2, Math.min(998, Math.round((px + Math.cos(ang) * dist) * 10) / 10));
      const dy = Math.max(2, Math.min(998, Math.round((py + Math.sin(ang) * dist) * 10) / 10));
      const r = Math.round((1.6 + rng() * maxDotR) * 10) / 10;
      dots.push([dx, dy, r]);
    }
  }
  return dots;
}

/** Biên dịch nét bình xịt `spray` thành một chuỗi SVG `<path d="...">` nhẹ và đồng bộ Web/Native. */
export function sprayStrokeToPath(stroke: VeDoanStroke): string {
  const dots = generateSprayDots(stroke);
  if (!dots.length) return '';
  return dots
    .map(([x, y, r]) => {
      const startX = Math.round((x - r) * 10) / 10;
      const d = Math.round(r * 2 * 10) / 10;
      return `M${startX} ${y}a${r} ${r} 0 1 0 ${d} 0a${r} ${r} 0 1 0 ${-d} 0`;
    })
    .join('');
}

function pointToSegDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function hitFloodFillPath(fillPath: string, x: number, y: number): boolean {
  if (!fillPath) return false;
  if (fillPath === 'M0 0H1000V1000H0Z') {
    return x >= 0 && x <= 1000 && y >= 0 && y <= 1000;
  }
  const re = /M(\d+)\s+(\d+)h(\d+)v(\d+)h-\d+z/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fillPath)) !== null) {
    const rx = Number(m[1]);
    const ry = Number(m[2]);
    const rw = Number(m[3]);
    const rh = Number(m[4]);
    if (x >= rx - 2 && x <= rx + rw + 2 && y >= ry - 2 && y <= ry + rh + 2) {
      return true;
    }
  }
  return false;
}

/**
 * Tìm nét hoặc vùng tô (line, rect, circle, pen, spray, fill) nằm dưới điểm `(x, y)` từ trên xuống dưới.
 * Bỏ qua nét tẩy pixel (`eraser`) để thao tác tẩy đối tượng đánh trúng thẳng nét/vùng sơn bên dưới.
 */
export function findHitStrokeIndex(
  strokes: readonly VeDoanStroke[],
  x: number,
  y: number,
  hitRadius = 18,
): number {
  for (let i = strokes.length - 1; i >= 0; i--) {
    const s = strokes[i];
    if (!s.points.length) continue;
    const tool = s.tool ?? 'pen';
    if (tool === 'eraser') continue;

    if (tool === 'fill') {
      const pathStr = s.fillPath || computeFloodFillPath(strokes.slice(0, i), s.points[0][0], s.points[0][1]);
      if (hitFloodFillPath(pathStr, x, y)) return i;
      continue;
    }

    if (tool === 'spray') {
      const w = s.width || 9;
      const sprayRad = (w <= 4 ? 22 : w <= 9 ? 38 : 58) + hitRadius * 0.4;
      if (s.points.length === 1) {
        if (Math.hypot(x - s.points[0][0], y - s.points[0][1]) <= sprayRad) return i;
      } else {
        for (let k = 0; k < s.points.length - 1; k++) {
          if (pointToSegDist(x, y, s.points[k][0], s.points[k][1], s.points[k + 1][0], s.points[k + 1][1]) <= sprayRad) {
            return i;
          }
        }
      }
      continue;
    }

    const thresh = hitRadius + Math.max(6, (s.width || 9) * 0.65);
    if (s.points.length === 1) {
      if (Math.hypot(x - s.points[0][0], y - s.points[0][1]) <= thresh) return i;
      continue;
    }
    for (let k = 0; k < s.points.length - 1; k++) {
      if (pointToSegDist(x, y, s.points[k][0], s.points[k][1], s.points[k + 1][0], s.points[k + 1][1]) <= thresh) {
        return i;
      }
    }
  }
  return -1;
}

function stripVdAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

function normVdBase(s: string): string {
  return s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

const VD_SYNONYMS_ACC: readonly [string, string][] = [
  ['xe hơi', 'ô tô'],
  ['xe ô tô', 'ô tô'],
  ['bánh pizza', 'pizza'],
  ['ti vi', 'tivi'],
  ['tv', 'tivi'],
  ['ba lô', 'balo'],
  ['va li', 'vali'],
  ['cafe', 'cà phê'],
  ['bánh mỳ', 'bánh mì'],
  ['mỳ tôm', 'mì tôm'],
  ['nón', 'mũ'],
  ['muỗng', 'thìa'],
  ['ô che mưa', 'dù'],
  ['cây dù', 'dù'],
  ['cái dù', 'dù'],
  ['cây ô', 'dù'],
  ['cái ô', 'dù'],
];

const VD_SYNONYMS_NOACC: readonly [string, string][] = [
  ['xe hoi', 'o to'],
  ['xe o to', 'o to'],
  ['banh pizza', 'pizza'],
  ['ti vi', 'tivi'],
  ['tv', 'tivi'],
  ['ba lo', 'balo'],
  ['va li', 'vali'],
  ['cafe', 'ca phe'],
  ['banh my', 'banh mi'],
  ['my tom', 'mi tom'],
  ['non', 'mu'],
  ['muong', 'thia'],
  ['o che mua', 'du'],
  ['cay du', 'du'],
  ['cai du', 'du'],
  ['cay o', 'du'],
  ['cai o', 'du'],
];

function replaceVdPhrases(s: string, pairs: readonly [string, string][]): string {
  let padded = ` ${s} `;
  for (const [from, to] of pairs) {
    padded = padded.split(` ${from} `).join(` ${to} `);
  }
  return padded.replace(/\s+/g, ' ').trim();
}

function applyVdSynonymsAccented(s: string): string {
  return replaceVdPhrases(s, VD_SYNONYMS_ACC);
}

function applyVdSynonymsNoAccents(s: string): string {
  return replaceVdPhrases(s, VD_SYNONYMS_NOACC);
}

const SIMPLE_CLASSIFIERS_ACC = new Set([
  'quả', 'cái', 'chiếc', 'đôi', 'quyển', 'cuốn', 'củ', 'ly', 'cốc',
  'thanh', 'ngọn', 'đám', 'hòn', 'dòng', 'khu', 'cơn', 'vầng',
]);
const SIMPLE_CLASSIFIERS_NOACC = new Set([
  'qua', 'cai', 'chiec', 'doi', 'quyen', 'cuon', 'cu', 'ly', 'coc',
  'thanh', 'ngon', 'dam', 'hon', 'dong', 'khu', 'con', 'vang',
]);
const AMBIGUOUS_TREES_ACC = new Set(['dừa', 'chuối', 'tre', 'thông', 'phong']);
const AMBIGUOUS_TREES_NOACC = new Set(['dua', 'chuoi', 'tre', 'thong', 'phong']);

function stripVdClassifiers(
  tokens: string[],
  fromGuess: boolean,
  accented: boolean,
): string[] {
  const cur = [...tokens];
  const simple = accented ? SIMPLE_CLASSIFIERS_ACC : SIMPLE_CLASSIFIERS_NOACC;
  const trees = accented ? AMBIGUOUS_TREES_ACC : AMBIGUOUS_TREES_NOACC;
  const wCon = 'con';
  const wTrai = accented ? 'trái' : 'trai';
  const wCay = accented ? 'cây' : 'cay';
  const wDan = accented ? 'đàn' : 'dan';
  const wChim = 'chim';
  const wBong = accented ? 'bông' : 'bong';
  const wHoa = 'hoa';
  const wCuc = accented ? 'cục' : 'cuc';
  const wChu = accented ? 'chú' : 'chu';
  const wMot = accented ? 'một' : 'mot';

  // Bỏ tối đa 1 từ số đếm "một" ở đầu câu đoán (vd: "một con mèo" -> "con mèo")
  if (fromGuess && cur.length > 1 && cur[0] === wMot) {
    cur.shift();
  }
  // Cụm 2 từ "cây đàn" (vd: "cây đàn guitar" -> "guitar")
  if (cur.length >= 3 && cur[0] === wCay && cur[1] === wDan) {
    cur.splice(0, 2);
    return cur;
  }
  if (cur.length <= 1) return cur;

  const head = cur[0];
  const rest = cur.slice(1);
  const restJoined = rest.join(' ');

  if (head === wCon) {
    if (restJoined === 'dấu' || restJoined === 'dau' || restJoined === 'quay') return cur;
    cur.shift();
    return cur;
  }
  if (head === wTrai) {
    if (restJoined === 'đất' || restJoined === 'dat' || restJoined === 'tim') return cur;
    cur.shift();
    return cur;
  }
  if (head === wCay) {
    if ((rest.length === 1 && trees.has(rest[0])) || restJoined === 'lau nhà' || restJoined === 'lau nha') {
      return cur;
    }
    cur.shift();
    return cur;
  }
  if (head === wDan && (restJoined === 'guitar' || restJoined === 'piano')) {
    cur.shift();
    return cur;
  }
  if (head === wChim && rest.length >= 2) {
    cur.shift();
    return cur;
  }
  if (head === wBong && restJoined === wHoa) {
    cur.shift();
    return cur;
  }
  if (head === wCuc && (restJoined === 'pin' || restJoined === 'sạc' || restJoined === 'sac' || restJoined === 'tẩy' || restJoined === 'tay')) {
    cur.shift();
    return cur;
  }
  if (head === wChu && rest.length >= 2) {
    cur.shift();
    return cur;
  }
  if (simple.has(head)) {
    cur.shift();
  }
  return cur;
}

function vdLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

/**
 * So khớp từ đoán Vẽ & Đoán dựa theo từ khóa cốt lõi:
 * - Bỏ qua tiền tố loại từ ("quả bóng đá" <-> "bóng đá", "con chó" <-> "chó"), đồng thời từ chối đoán bare ("con", "quả", "diều" với "diều giấy").
 * - Chấp nhận gõ không dấu toàn phần ("bong da" -> "quả bóng đá"), nhưng chặn sai dấu thanh rõ ràng ("bò" không trúng "quả bơ").
 */
export function matchVeDoanGuess(
  guess: string,
  secretWord: string,
): { hit: boolean; close: boolean; accentHint: boolean } {
  const gNorm = normVdBase(guess);
  const tNorm = normVdBase(secretWord);
  if (!gNorm || !tNorm) return { hit: false, close: false, accentHint: false };

  const gAccFull = applyVdSynonymsAccented(gNorm);
  const tAccFull = applyVdSynonymsAccented(tNorm);
  const gNoAccFull = applyVdSynonymsNoAccents(stripVdAccents(gNorm));
  const tNoAccFull = applyVdSynonymsNoAccents(stripVdAccents(tNorm));
  const guessHasNoAccents = gNorm === stripVdAccents(gNorm);

  // 1. Khớp chính xác nguyên cụm trước khi tách loại từ (đảm bảo mọi từ trong bộ đều tự khớp chính nó)
  if (gAccFull === tAccFull) {
    return { hit: true, close: false, accentHint: false };
  }
  if (guessHasNoAccents && gNoAccFull === tNoAccFull) {
    return { hit: true, close: false, accentHint: false };
  }

  const gAccTokens = gAccFull.split(' ').filter(Boolean);
  const tAccTokens = tAccFull.split(' ').filter(Boolean);
  const gNoAccTokens = gNoAccFull.split(' ').filter(Boolean);
  const tNoAccTokens = tNoAccFull.split(' ').filter(Boolean);

  if (gAccTokens.length > tAccTokens.length + 2) {
    return { hit: false, close: false, accentHint: false };
  }

  const gCoreAcc = stripVdClassifiers(gAccTokens, true, true);
  const gCoreNoAcc = stripVdClassifiers(gNoAccTokens, true, false);
  const tCoreAcc = stripVdClassifiers(tAccTokens, false, true);
  const tCoreNoAcc = stripVdClassifiers(tNoAccTokens, false, false);

  // 2. Khớp lõi có dấu sau khi bỏ loại từ
  if (gCoreAcc.join(' ') === tCoreAcc.join(' ')) {
    return { hit: true, close: false, accentHint: false };
  }

  // 3. Người chơi gõ hoàn toàn không dấu -> chấp nhận khớp lõi không dấu
  if (guessHasNoAccents && gCoreNoAcc.join(' ') === tCoreNoAcc.join(' ')) {
    return { hit: true, close: false, accentHint: false };
  }

  // 4. Có gõ dấu nhưng sai thanh/vần (vd: "bò" vs "quả bơ", "chợ" vs "con chó") -> không tính đúng, báo gợi ý nhẹ
  if (gCoreNoAcc.join(' ') === tCoreNoAcc.join(' ')) {
    return { hit: false, close: true, accentHint: true };
  }

  // 5. Lệch tối đa 1 ký tự với cụm từ >= 4 ký tự không dấu
  const gStr = gCoreNoAcc.join(' ');
  const tStr = tCoreNoAcc.join(' ');
  const close = tStr.length >= 4 && vdLevenshtein(gStr, tStr) <= 1;
  return { hit: false, close, accentHint: false };
}
