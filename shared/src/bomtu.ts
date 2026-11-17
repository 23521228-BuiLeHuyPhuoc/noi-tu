/**
 * Kiểu dữ liệu & danh sách từ dự phòng cho game Bom Chữ (`bom_tu`, 2–12 người).
 */

export interface BomTuLogEntry {
  id: number;
  playerId: string;
  name: string;
  word: string;
  boom?: boolean;
}

export interface BomTuView {
  type: 'bom_tu';
  round: number;
  bombSyllable: string;
  holderId: string | null;
  fuseEndsAt: number | null;
  fuseSeconds: number;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  hearts: Record<string, number>;
  usedCount: number;
  recent: BomTuLogEntry[];
  lastBoom?: { playerId: string; name: string; syllable: string } | null;
}

export const BOM_TU_MAX_HEARTS = 3;

/** Danh sách từ mở rộng khi chạy với từ điển tối giản trong môi trường test */
export const BOM_TU_FALLBACK_WORDS: string[] = [
  'con mèo', 'mèo mướp', 'con chó', 'chó mực', 'con cá', 'cá chép', 'cá vàng', 'cá thu',
  'hoa hồng', 'hoa mai', 'hoa đào', 'hoa sen', 'hoa cúc', 'hoa lan', 'hoa hướng dương',
  'nhà cửa', 'cửa sổ', 'sổ sách', 'sách vở', 'bàn ghế', 'ghế đá', 'đá bóng', 'bóng đèn',
  'đèn pin', 'đèn ngủ', 'điện thoại', 'máy tính', 'tính toán', 'toán học', 'học sinh', 'sinh viên',
  'giáo viên', 'bác sĩ', 'công an', 'nông dân', 'ngư dân', 'thợ xây', 'ca sĩ', 'nhạc sĩ',
  'bánh mì', 'bánh chưng', 'bánh xèo', 'bánh bao', 'bánh kem', 'bánh cuốn', 'bánh đa',
  'nước mắm', 'nước ngọt', 'nước dừa', 'nước mía', 'trà sữa', 'cà phê', 'phở bò', 'bún bò',
  'mặt trời', 'mặt trăng', 'trăng tròn', 'ngôi sao', 'ngôi nhà', 'nhà hàng', 'hàng xóm',
  'biển xanh', 'xanh lá', 'lá cây', 'cây thông', 'cây dừa', 'cây bàng', 'quả táo', 'quả cam',
  'áo dài', 'áo mưa', 'áo phao', 'mũ bảo hiểm', 'giày dép', 'dép lê', 'kính mắt', 'kính râm',
  'thời tiết', 'tiết trời', 'trời mưa', 'mưa rào', 'cầu vồng', 'đám mây', 'gió mùa', 'bão lớn',
  'xe máy', 'xe đạp', 'xe buýt', 'xe tải', 'tàu hỏa', 'máy bay', 'con thuyền', 'sân bay',
  'bệnh viện', 'trường học', 'công viên', 'siêu thị', 'chợ đêm', 'thư viện', 'rạp phim',
  'tình bạn', 'bạn bè', 'gia đình', 'đồng hồ', 'đồng đội', 'hạnh phúc', 'vui vẻ', 'tuyệt vời',
];
