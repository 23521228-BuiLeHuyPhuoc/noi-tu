/**
 * Kiểu dữ liệu, 180+ từ khóa & 35+ bộ nét vẽ vector mẫu cho game Vẽ & Đoán (`ve_doan`).
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

function circlePts(cx: number, cy: number, r: number, steps = 16): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push([Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r)]);
  }
  return pts;
}

/** Bộ nét vector chuẩn hóa 0..1000 để Bot vẽ được hình nhận diện rõ ràng */
export const BOT_SKETCHES: Record<string, VeDoanStroke[]> = {
  'mặt trời': [
    { color: '#F59F00', width: 9, points: circlePts(500, 500, 180) },
    { color: '#F76707', width: 6, points: [[500, 260], [500, 140]] },
    { color: '#F76707', width: 6, points: [[500, 740], [500, 860]] },
    { color: '#F76707', width: 6, points: [[260, 500], [140, 500]] },
    { color: '#F76707', width: 6, points: [[740, 500], [860, 500]] },
    { color: '#F76707', width: 6, points: [[330, 330], [230, 230]] },
    { color: '#F76707', width: 6, points: [[670, 330], [770, 230]] },
    { color: '#F76707', width: 6, points: [[330, 670], [230, 770]] },
    { color: '#F76707', width: 6, points: [[670, 670], [770, 770]] },
  ],
  'ngôi nhà': [
    { color: '#E03131', width: 9, points: [[220, 440], [500, 180], [780, 440], [220, 440]] },
    { color: '#1971C2', width: 9, points: [[270, 440], [270, 820], [730, 820], [730, 440]] },
    { color: '#8B5E34', width: 9, points: [[440, 820], [440, 590], [560, 590], [560, 820]] },
    { color: '#F59F00', width: 6, points: [[330, 540], [400, 540], [400, 620], [330, 620], [330, 540]] },
  ],
  'trái tim': [
    { color: '#E03131', width: 12, points: [[500, 360], [420, 240], [260, 250], [210, 400], [320, 600], [500, 810], [680, 600], [790, 400], [740, 250], [580, 240], [500, 360]] },
  ],
  'con cá': [
    { color: '#1971C2', width: 9, points: [[250, 500], [420, 340], [670, 360], [740, 500], [670, 640], [420, 660], [250, 500]] },
    { color: '#1971C2', width: 9, points: [[740, 500], [890, 340], [890, 660], [740, 500]] },
    { color: '#111827', width: 10, points: [[340, 470], [355, 470]] },
  ],
  'cây thông': [
    { color: '#2F9E44', width: 10, points: [[500, 140], [320, 400], [680, 400], [500, 140]] },
    { color: '#2F9E44', width: 10, points: [[500, 300], [250, 580], [750, 580], [500, 300]] },
    { color: '#2F9E44', width: 10, points: [[500, 460], [200, 740], [800, 740], [500, 460]] },
    { color: '#8B5E34', width: 14, points: [[500, 740], [500, 880]] },
  ],
  'bông hoa': [
    { color: '#F59F00', width: 12, points: circlePts(500, 370, 70) },
    { color: '#E64980', width: 9, points: circlePts(500, 220, 70) },
    { color: '#E64980', width: 9, points: circlePts(650, 350, 70) },
    { color: '#E64980', width: 9, points: circlePts(350, 350, 70) },
    { color: '#E64980', width: 9, points: circlePts(410, 490, 70) },
    { color: '#E64980', width: 9, points: circlePts(590, 490, 70) },
    { color: '#2F9E44', width: 10, points: [[500, 540], [500, 860]] },
  ],
  'ô tô': [
    { color: '#E03131', width: 9, points: [[160, 620], [180, 470], [320, 460], [410, 320], [640, 320], [740, 460], [850, 480], [860, 620], [160, 620]] },
    { color: '#111827', width: 10, points: circlePts(310, 650, 75) },
    { color: '#111827', width: 10, points: circlePts(700, 650, 75) },
  ],
  'ngôi sao': [
    { color: '#F59F00', width: 10, points: [[500, 150], [590, 400], [850, 400], [640, 560], [720, 830], [500, 670], [280, 830], [360, 560], [150, 400], [410, 400], [500, 150]] },
  ],
  'mặt trăng': [
    { color: '#F59F00', width: 12, points: [[620, 210], [430, 260], [320, 440], [360, 670], [530, 800], [690, 770], [520, 690], [460, 510], [510, 330], [620, 210]] },
  ],
  'quả táo': [
    { color: '#E03131', width: 12, points: circlePts(500, 560, 210) },
    { color: '#8B5E34', width: 9, points: [[500, 350], [520, 220]] },
    { color: '#2F9E44', width: 9, points: [[520, 270], [640, 210], [600, 310], [520, 270]] },
  ],
  'kính mắt': [
    { color: '#111827', width: 9, points: circlePts(330, 520, 120) },
    { color: '#111827', width: 9, points: circlePts(670, 520, 120) },
    { color: '#111827', width: 9, points: [[450, 520], [550, 520]] },
    { color: '#111827', width: 8, points: [[210, 520], [110, 420]] },
    { color: '#111827', width: 8, points: [[790, 520], [890, 420]] },
  ],
  'kem ốc quế': [
    { color: '#F76707', width: 9, points: [[370, 480], [500, 860], [630, 480], [370, 480]] },
    { color: '#E64980', width: 10, points: circlePts(500, 390, 140) },
    { color: '#E03131', width: 12, points: circlePts(500, 220, 45) },
  ],
  'đám mây': [
    { color: '#1971C2', width: 10, points: [[240, 620], [170, 540], [230, 420], [350, 380], [450, 280], [610, 310], [700, 410], [810, 450], [840, 580], [750, 640], [240, 620]] },
  ],
  'cây dù': [
    { color: '#7048E8', width: 10, points: [[200, 480], [290, 280], [500, 210], [710, 280], [800, 480], [200, 480]] },
    { color: '#111827', width: 10, points: [[500, 210], [500, 790], [440, 840], [380, 790]] },
  ],
  'con thuyền': [
    { color: '#8B5E34', width: 10, points: [[190, 600], [810, 600], [700, 760], [300, 760], [190, 600]] },
    { color: '#111827', width: 9, points: [[500, 600], [500, 210]] },
    { color: '#E03131', width: 9, points: [[500, 220], [720, 520], [500, 520]] },
  ],
  'máy bay': [
    { color: '#1971C2', width: 10, points: [[150, 500], [780, 500], [870, 450], [780, 410], [190, 410], [150, 500]] },
    { color: '#1971C2', width: 10, points: [[410, 410], [550, 200], [610, 200], [540, 410]] },
    { color: '#1971C2', width: 10, points: [[410, 500], [550, 760], [610, 760], [540, 500]] },
  ],
  'bánh sinh nhật': [
    { color: '#E64980', width: 10, points: [[240, 760], [240, 500], [760, 500], [760, 760], [240, 760]] },
    { color: '#F59F00', width: 9, points: [[380, 500], [380, 350]] },
    { color: '#F59F00', width: 9, points: [[500, 500], [500, 350]] },
    { color: '#F59F00', width: 9, points: [[620, 500], [620, 350]] },
    { color: '#E03131', width: 12, points: [[380, 310], [380, 270]] },
    { color: '#E03131', width: 12, points: [[500, 310], [500, 270]] },
    { color: '#E03131', width: 12, points: [[620, 310], [620, 270]] },
  ],
  'tia chớp': [
    { color: '#F59F00', width: 14, points: [[580, 140], [330, 500], [510, 500], [400, 860], [690, 440], [510, 440], [580, 140]] },
  ],
  'đồng hồ': [
    { color: '#111827', width: 10, points: circlePts(500, 500, 240) },
    { color: '#111827', width: 10, points: [[500, 500], [500, 320]] },
    { color: '#E03131', width: 8, points: [[500, 500], [640, 500]] },
  ],
  'con mèo': [
    { color: '#111827', width: 10, points: circlePts(500, 540, 190) },
    { color: '#111827', width: 10, points: [[340, 420], [320, 220], [450, 360]] },
    { color: '#111827', width: 10, points: [[660, 420], [680, 220], [550, 360]] },
    { color: '#E64980', width: 10, points: [[490, 560], [510, 560]] },
    { color: '#111827', width: 6, points: [[220, 520], [370, 540]] },
    { color: '#111827', width: 6, points: [[780, 520], [630, 540]] },
  ],
  'tên lửa': [
    { color: '#E03131', width: 10, points: [[500, 150], [390, 360], [390, 700], [610, 700], [610, 360], [500, 150]] },
    { color: '#1971C2', width: 9, points: circlePts(500, 460, 55) },
    { color: '#F76707', width: 12, points: [[440, 720], [500, 880], [560, 720]] },
  ],
  'con ma': [
    { color: '#7048E8', width: 10, points: [[320, 760], [320, 380], [410, 230], [590, 230], [680, 380], [680, 760], [590, 680], [500, 760], [410, 680], [320, 760]] },
    { color: '#111827', width: 12, points: [[420, 430], [430, 430]] },
    { color: '#111827', width: 12, points: [[570, 430], [580, 430]] },
  ],
  'cây nến': [
    { color: '#1971C2', width: 10, points: [[430, 820], [430, 400], [570, 400], [570, 820], [430, 820]] },
    { color: '#F59F00', width: 12, points: [[500, 370], [460, 270], [500, 170], [540, 270], [500, 370]] },
  ],
  'chiếc cúp': [
    { color: '#F59F00', width: 10, points: [[320, 240], [680, 240], [600, 540], [400, 540], [320, 240]] },
    { color: '#F59F00', width: 12, points: [[500, 540], [500, 760]] },
    { color: '#F59F00', width: 12, points: [[350, 780], [650, 780]] },
  ],
  'nốt nhạc': [
    { color: '#7048E8', width: 12, points: circlePts(360, 720, 80) },
    { color: '#7048E8', width: 10, points: [[440, 720], [440, 240], [720, 320]] },
  ],
};

export const VE_DOAN_WORDS: string[] = [
  ...Object.keys(BOT_SKETCHES),
  'cầu vồng', 'ly trà sữa', 'bánh mì', 'phở bò', 'con chó', 'con vịt', 'con gà', 'con trâu', 'con bò',
  'con heo', 'con voi', 'con hổ', 'con thỏ', 'con rùa', 'con kiến', 'con ong', 'con bướm', 'con muỗi',
  'con nhện', 'con cua', 'con tôm', 'con mực', 'con ếch', 'chim cánh cụt', 'chim đại bàng', 'chim cú mèo',
  'hươu cao cổ', 'cá heo', 'cá mập', 'cá vàng', 'quả chuối', 'quả cam', 'quả dưa hấu', 'quả nho', 'quả dâu',
  'quả xoài', 'quả dứa', 'quả chanh', 'cà rốt', 'bắp cải', 'cà chua', 'ớt đỏ', 'nấm rơm', 'củ hành',
  'bánh chưng', 'bánh pizza', 'bánh bao', 'bánh donut', 'xúc xích', 'trứng ốp la', 'cơm tấm', 'lẩu thái',
  'cây dừa', 'cây xương rồng', 'chiếc lá', 'hoa hướng dương', 'hoa sen', 'hoa hồng', 'cỏ bốn lá', 'ngọn núi',
  'núi lửa', 'bãi biển', 'dòng sông', 'cầu treo', 'đèn giao thông', 'biển báo', 'cột điện', 'ngọn hải đăng',
  'lâu đài', 'kim tự tháp', 'tòa nhà cao tầng', 'bệnh viện', 'trường học', 'sân bóng đá', 'xe đạp', 'xe máy',
  'xe buýt', 'xe cứu hỏa', 'xe tăng', 'tàu hỏa', 'tàu ngầm', 'khinh khí cầu', 'du thuyền', 'trực thăng',
  'điện thoại', 'máy tính', 'ti vi', 'tủ lạnh', 'máy giặt', 'quạt máy', 'điều hòa', 'máy ảnh', 'loa kẹo kéo',
  'tai nghe', 'bàn phím', 'con chuột', 'cục sạc', 'ổ cắm điện', 'bóng đèn', 'đèn pin', 'cây kéo', 'cái búa',
  'cái cưa', 'cái kìm', 'chiếc chìa khóa', 'ổ khóa', 'cái xô', 'cây chổi', 'gương soi', 'bàn chải', 'kem đánh răng',
  'chiếc gối', 'cái giường', 'cái ghế', 'cái bàn', 'tủ quần áo', 'cửa sổ', 'cửa ra vào', 'cái bát', 'đôi đũa',
  'cái thìa', 'con dao', 'cái nồi', 'cái ấm trà', 'ly cà phê', 'chai nước', 'hộp sữa', 'áo thun', 'áo dài',
  'quần jean', 'đôi giày', 'đôi dép', 'cái mũ', 'mũ bảo hiểm', 'găng tay', 'tất chân', 'khăn quàng', 'chiếc nhẫn',
  'vương miện', 'ba lô', 'va li', 'cây đàn guitar', 'đàn piano', 'cái trống', 'micro', 'quả bóng', 'vợt cầu lông',
  'ván trượt', 'cần câu cá', 'cung tên', 'thanh kiếm', 'cái khiên', 'quả bom', 'nam châm', 'kính lúp', 'la bàn',
  'bản đồ', 'quyển sách', 'bút chì', 'cục tẩy', 'thước kẻ', 'cặp sách', 'trái đất', 'sao thổ', 'người tuyết',
  'ông già noel', 'chú hề', 'cướp biển', 'siêu nhân', 'người máy', 'người ngoài hành tinh', 'phù thủy', 'ma cà rồng',
];
