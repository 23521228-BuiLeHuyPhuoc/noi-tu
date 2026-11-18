/**
 * Kiểu dữ liệu, 200+ từ khóa & 62 bộ nét vẽ vector đa sắc cho game Vẽ & Đoán (`ve_doan`).
 */

export type VeDoanPhase = 'pick_word' | 'drawing' | 'round_end';

export interface VeDoanStroke {
  color: string;
  width: number;
  /** Tọa độ chuẩn hóa [0..1000, 0..1000] */
  points: [number, number][];
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
] as const;

export const VE_DOAN_WIDTHS = [4, 9, 16] as const;

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
 * 62 bộ nét vector đa sắc chuẩn hóa [0..1000, 0..1000] (mỗi hình 4–8 nét, >= 2 màu)
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
 * - Khớp trực tiếp hoặc qua alias trong 62 hình `BOT_SKETCHES`.
 * - Nếu từ ngoài danh sách sketch, sinh hình đa sắc 5 nét theo nhóm ngữ nghĩa (động vật, đồ ăn, xe cộ, thiên nhiên, đồ vật).
 */
export function getBotSketch(word: string): VeDoanStroke[] {
  const norm = word.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
  if (BOT_SKETCHES[norm]) return BOT_SKETCHES[norm];
  const alias = SKETCH_ALIASES[norm];
  if (alias && BOT_SKETCHES[alias]) return BOT_SKETCHES[alias];

  if (/^(con |chim |cá |hươu )/.test(norm)) {
    return [
      { color: C.brown, width: 16, points: ellipsePts(520, 610, 185, 130, 20) },
      { color: C.orange, width: 16, points: circlePts(320, 455, 105, 18) },
      { color: C.brown, width: 9, points: [[265, 370], [245, 275], [325, 355]] },
      { color: C.black, width: 9, points: [[290, 440], [305, 440]] },
      { color: C.brown, width: 16, points: [[405, 735], [405, 845], [405, 735], [625, 735], [625, 845]] },
    ];
  }
  if (/^(quả |bánh |phở |cơm |lẩu |cà |bắp |ớt |củ |xúc xích|chai |hộp )/.test(norm)) {
    return [
      { color: C.blue, width: 16, points: arcPts(500, 560, 265, 185, 0, Math.PI, 18) },
      { color: C.blue, width: 9, points: ellipsePts(500, 560, 265, 55, 18) },
      { color: C.orange, width: 16, points: arcPts(500, 545, 195, 115, Math.PI, Math.PI * 2, 16) },
      { color: C.green, width: 9, points: [[425, 485], [475, 455], [545, 495]] },
      { color: C.red, width: 9, points: [[460, 345], [440, 265], [475, 205]] },
    ];
  }
  if (/^(xe |tàu |du thuyền|trực thăng|khinh khí cầu)/.test(norm)) {
    return [
      { color: C.blue, width: 16, points: rectPts(205, 385, 795, 625) },
      { color: C.teal, width: 9, points: rectPts(585, 425, 755, 525) },
      { color: C.black, width: 16, points: circlePts(335, 655, 75, 16) },
      { color: C.black, width: 16, points: circlePts(665, 655, 75, 16) },
      { color: C.yellow, width: 16, points: [[785, 555], [825, 555]] },
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
  'bánh mì', 'phở bò', 'con vịt', 'con gà', 'con trâu', 'con bò',
  'con heo', 'con voi', 'con hổ', 'con kiến', 'con ong', 'con muỗi',
  'con nhện', 'con cua', 'con tôm', 'con mực', 'chim cánh cụt', 'chim đại bàng', 'chim cú mèo',
  'hươu cao cổ', 'cá heo', 'cá vàng', 'quả cam', 'quả nho', 'quả dâu',
  'quả xoài', 'quả dứa', 'quả chanh', 'cà rốt', 'bắp cải', 'cà chua', 'ớt đỏ', 'nấm rơm', 'củ hành',
  'bánh chưng', 'bánh bao', 'bánh donut', 'xúc xích', 'cơm tấm', 'lẩu thái',
  'cây dừa', 'chiếc lá', 'hoa sen', 'hoa hồng', 'cỏ bốn lá', 'ngọn núi',
  'bãi biển', 'dòng sông', 'cầu treo', 'biển báo', 'cột điện',
  'lâu đài', 'kim tự tháp', 'tòa nhà cao tầng', 'bệnh viện', 'trường học', 'sân bóng đá', 'xe máy',
  'xe buýt', 'xe cứu hỏa', 'xe tăng', 'tàu hỏa', 'tàu ngầm', 'khinh khí cầu', 'du thuyền', 'trực thăng',
  'ti vi', 'tủ lạnh', 'máy giặt', 'quạt máy', 'điều hòa', 'máy ảnh', 'loa kẹo kéo',
  'tai nghe', 'bàn phím', 'con chuột', 'cục sạc', 'ổ cắm điện', 'bóng đèn', 'đèn pin', 'cây kéo', 'cái búa',
  'cái cưa', 'cái kìm', 'ổ khóa', 'cái xô', 'cây chổi', 'gương soi', 'bàn chải', 'kem đánh răng',
  'chiếc gối', 'cái giường', 'cái ghế', 'cái bàn', 'tủ quần áo', 'cửa sổ', 'cửa ra vào', 'cái bát', 'đôi đũa',
  'cái thìa', 'con dao', 'cái nồi', 'cái ấm trà', 'chai nước', 'hộp sữa', 'áo thun', 'áo dài',
  'quần jean', 'đôi giày', 'đôi dép', 'cái mũ', 'mũ bảo hiểm', 'găng tay', 'tất chân', 'khăn quàng', 'chiếc nhẫn',
  'ba lô', 'va li', 'đàn piano', 'cái trống', 'micro', 'quả bóng', 'vợt cầu lông',
  'ván trượt', 'cung tên', 'cái khiên', 'quả bom', 'nam châm', 'la bàn',
  'bản đồ', 'quyển sách', 'bút chì', 'cục tẩy', 'thước kẻ', 'cặp sách', 'trái đất', 'sao thổ',
  'ông già noel', 'chú hề', 'cướp biển', 'siêu nhân', 'người máy', 'phù thủy', 'ma cà rồng',
];

export const VE_DOAN_WORDS: string[] = Array.from(
  new Set([...Object.keys(BOT_SKETCHES), ...EXTRA_VE_DOAN_WORDS]),
);
