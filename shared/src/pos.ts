/**
 * Cấu hình Độ Khó & Luật Từ Loại / Thử Thách cho Nối Từ Tiếng Việt (`wordchain`) và Tiếng Anh (`wordchain_en`).
 * Dùng chung giữa server (kiểm tra hợp lệ + chọn từ cho Bot/Cứu trợ) và app (hiển thị huy hiệu luật).
 */

export type WordChainDifficulty = 'easy' | 'normal' | 'hard' | 'hell';
export type WordChainRule = 'free' | 'noun' | 'verb' | 'adj' | 'no_repeat';

export interface WordChainDifficultyMeta {
  id: WordChainDifficulty;
  name: string;
  emoji: string;
  baseSec: number;
  minSec: number;
  rampWords: number;
  bonusHints: number;
  desc: string;
}

export const WORDCHAIN_DIFFICULTIES: Record<WordChainDifficulty, WordChainDifficultyMeta> = {
  easy: {
    id: 'easy',
    name: 'Thư Giãn',
    emoji: '🌱',
    baseSec: 40,
    minSec: 25,
    rampWords: 40,
    bonusHints: 2,
    desc: '40s/lượt + tặng thêm 2 lượt Cứu trợ',
  },
  normal: {
    id: 'normal',
    name: 'Chuẩn',
    emoji: '⚡',
    baseSec: 30,
    minSec: 15,
    rampWords: 30,
    bonusHints: 0,
    desc: '30s/lượt truyền thống cân bằng',
  },
  hard: {
    id: 'hard',
    name: 'Cao Thủ',
    emoji: '🔥',
    baseSec: 15,
    minSec: 6,
    rampWords: 18,
    bonusHints: 0,
    desc: 'Khởi điểm 15s, tụt dốc còn 6s nghẹt thở!',
  },
  hell: {
    id: 'hell',
    name: 'Địa Ngục 4s',
    emoji: '💀',
    baseSec: 8,
    minSec: 4,
    rampWords: 10,
    bonusHints: 0,
    desc: 'Tử chiến siêu tốc 8s -> 4s phản xạ thần sầu!',
  },
};

export interface WordChainRuleMeta {
  id: WordChainRule;
  name: string;
  emoji: string;
  desc: string;
}

export const WORDCHAIN_RULES: Record<WordChainRule, WordChainRuleMeta> = {
  free: { id: 'free', name: 'Tự Do', emoji: '✨', desc: 'Mọi từ trong từ điển đều hợp lệ' },
  noun: { id: 'noun', name: 'Chỉ Danh Từ', emoji: '🏛️', desc: 'Bắt buộc nối Danh từ (tự nới nếu âm cạn từ)' },
  verb: { id: 'verb', name: 'Chỉ Động Từ', emoji: '🏃', desc: 'Bắt buộc nối Động từ (tự nới nếu âm cạn từ)' },
  adj: { id: 'adj', name: 'Chỉ Tính Từ', emoji: '🎨', desc: 'Bắt buộc nối Tính từ (tự nới nếu âm cạn từ)' },
  no_repeat: { id: 'no_repeat', name: 'Cấm Điệp Âm', emoji: '🚫', desc: 'Cấm 2 âm tiết trùng chữ cái đầu (vd: lung linh)' },
};

// Danh sách tiền tố / hậu tố chỉ loại phổ biến trong tiếng Việt 2 âm tiết
const VI_NOUN_HEADS = new Set([
  'nhà', 'người', 'máy', 'xe', 'cây', 'con', 'quả', 'trái', 'hoa', 'bông', 'bánh', 'nước', 'đất', 'trời',
  'biển', 'sông', 'núi', 'đồi', 'rừng', 'đường', 'phố', 'làng', 'xóm', 'trường', 'lớp', 'sách', 'báo',
  'bàn', 'ghế', 'giường', 'tủ', 'áo', 'quần', 'giày', 'dép', 'mũ', 'nón', 'cửa', 'phòng', 'tiền', 'vàng',
  'bạc', 'đồng', 'sắt', 'thép', 'đá', 'gỗ', 'lửa', 'gió', 'mây', 'mưa', 'nắng', 'sương', 'chim', 'cá',
  'gà', 'vịt', 'chó', 'mèo', 'trâu', 'bò', 'ngựa', 'heo', 'lợn', 'voi', 'hổ', 'rắn', 'rồng', 'ếch',
  'tâm', 'tình', 'lòng', 'đời', 'nghề', 'thợ', 'sự', 'cuộc', 'việc', 'niềm', 'nỗi', 'cơn', 'trận',
  'mùa', 'ngày', 'đêm', 'sáng', 'chiều', 'tối', 'năm', 'tháng', 'tuần', 'buổi', 'giờ', 'phút', 'hội',
  'đoàn', 'đội', 'quân', 'dân', 'vua', 'quan', 'thầy', 'cô', 'bạn', 'anh', 'em', 'mẹ', 'cha', 'ông', 'bà',
  'thịt', 'cơm', 'cháo', 'phở', 'bún', 'rau', 'củ', 'hạt', 'lá', 'cành', 'rễ', 'mắt', 'mũi', 'miệng', 'tay', 'chân', 'đầu', 'tim',
]);

const VI_VERB_HEADS = new Set([
  'đi', 'đứng', 'chạy', 'nhảy', 'bay', 'bơi', 'bò', 'trèo', 'leo', 'ăn', 'uống', 'ngủ', 'nghỉ', 'thức',
  'làm', 'chơi', 'học', 'đọc', 'viết', 'vẽ', 'nói', 'nghe', 'nhìn', 'xem', 'ngắm', 'thấy', 'biết', 'hiểu',
  'yêu', 'ghét', 'thương', 'nhớ', 'quên', 'giận', 'hờn', 'cười', 'khóc', 'hát', 'múa', 'đàn', 'đánh', 'đập',
  'đấm', 'đá', 'tát', 'cắt', 'chặt', 'chém', 'gọt', 'kéo', 'đẩy', 'nâng', 'hạ', 'mang', 'vác', 'khiêng',
  'cầm', 'nắm', 'giữ', 'buông', 'thả', 'bắt', 'trói', 'mở', 'đóng', 'khóa', 'xây', 'dựng', 'phá', 'mua',
  'bán', 'đổi', 'trao', 'tặng', 'biếu', 'cho', 'vay', 'trả', 'gửi', 'nhận', 'tìm', 'kiếm', 'chọn', 'lựa',
  'nuôi', 'trồng', 'cấy', 'gặt', 'nấu', 'nướng', 'luộc', 'chiên', 'xào', ' kho', 'giặt', 'rửa', 'quét', 'lau',
  'chùi', 'sửa', 'chữa', 'khám', 'cứu', 'giúp', 'dạy', 'bảo', 'khuyên', 'hỏi', 'đáp', 'kể', 'bàn', 'tính',
  'lo', 'nghĩ', 'mong', 'chờ', 'đợi', 'ngóng', 'chúc', 'mừng', 'khen', 'chê', 'trách', 'mắng', 'xin', 'cầu',
]);

const VI_ADJ_HEADS = new Set([
  'đẹp', 'xấu', 'tốt', 'tồi', 'hiền', 'dữ', 'ác', 'lành', 'khôn', 'dại', 'ngu', 'ngoan', 'hư', 'giỏi',
  'kém', 'dở', 'nhanh', 'chậm', 'mau', 'lâu', 'cao', 'thấp', 'lùn', 'dài', 'ngắn', 'rộng', 'hẹp', 'chật',
  'to', 'nhỏ', 'lớn', 'bé', 'khổng', 'tí', 'nặng', 'nhẹ', 'dày', 'mỏng', 'sâu', 'nông', 'cứng', 'mềm',
  'dẻo', 'giòn', 'dai', 'nóng', 'lạnh', 'ấm', 'mát', 'rét', 'buốt', 'sáng', 'tối', 'mờ', 'rõ', 'trong',
  'đục', 'sạch', 'bẩn', 'dơ', 'mới', 'cũ', 'trẻ', 'già', 'tươi', 'héo', 'khô', 'ướt', 'ẩm', 'vui', 'buồn',
  'khổ', 'sướng', 'nhàn', 'bận', 'giàu', 'nghèo', 'sang', 'hèn', 'đỏ', 'xanh', 'vàng', 'trắng', 'đen',
  'tím', 'hồng', 'nâu', 'xám', 'ngọt', 'chua', 'cay', 'đắng', 'mặn', 'nhạt', 'bùi', 'béo', 'ngậy', 'thơm',
  'hôi', 'tanh', 'êm', 'ồn', 'tĩnh', 'lặng', 'vắng', 'đông', 'thưa', 'khó', 'dễ', 'gần', 'xa', 'thẳng', 'cong', 'tròn', 'vuông', 'méo',
]);

/**
 * Kiểm tra từ `word` có thỏa luật `rule` hay không.
 * `defText` là chuỗi giải nghĩa (nếu có trong `definitions.json` / `definitions-en.json`).
 */
export function matchesWordRule(
  word: string,
  lang: 'vi' | 'en',
  rule: WordChainRule,
  defText?: string,
): boolean {
  if (!rule || rule === 'free') return true;
  const w = word.trim().toLowerCase();

  if (rule === 'no_repeat') {
    if (lang === 'vi') {
      const parts = w.split(/\s+/);
      if (parts.length < 2) return true;
      // Cấm 2 âm tiết mở đầu cùng ký tự cái đầu (vd: lung linh, xinh xắn)
      return parts[0][0] !== parts[1][0];
    }
    // Tiếng Anh: cấm chữ cái đầu trùng chữ cái cuối (vd: window, level)
    return w.length >= 2 && w[0] !== w[w.length - 1];
  }

  const d = (defText ?? '').toLowerCase();

  if (lang === 'en') {
    if (rule === 'noun') {
      if (d.includes('danh từ')) return true;
      if (d && !d.includes('danh từ') && (d.includes('động từ') || d.includes('tính từ') || d.includes('phó từ'))) return false;
      return /(tion|sion|ment|ness|ity|ship|ance|ence|ist|er|or|ism|dom|hood|logy)$/.test(w);
    }
    if (rule === 'verb') {
      if (d.includes('động từ')) return true;
      if (d && !d.includes('động từ')) return false;
      return /(ize|ise|ate|ify|en)$/.test(w);
    }
    if (rule === 'adj') {
      if (d.includes('tính từ')) return true;
      if (d && !d.includes('tính từ')) return false;
      return /(ous|ful|less|able|ible|ive|ic|al|ish|ary)$/.test(w);
    }
    return true;
  }

  // Tiếng Việt 2 âm tiết
  const [s1 = '', s2 = ''] = w.split(/\s+/);
  if (rule === 'noun') {
    if (d.includes('danh từ') || /^(người|vật|đồ |loài |cây |con |nơi |món |chất |khí |cơ quan|hiện tượng|tập hợp|sự |cuộc )/i.test(d.trim())) {
      return true;
    }
    return VI_NOUN_HEADS.has(s1);
  }
  if (rule === 'verb') {
    if (d.includes('động từ') || /^(làm cho|thực hiện|di chuyển|tác động|dùng |đưa |chuyển |biểu thị hành động|nói |ăn |đánh )/i.test(d.trim())) {
      return true;
    }
    return VI_VERB_HEADS.has(s1) || VI_VERB_HEADS.has(s2);
  }
  if (rule === 'adj') {
    if (d.includes('tính từ') || /^(có tính chất|ở trạng thái|có vẻ|rất |hơi |mang tính|chỉ mức độ|có màu)/i.test(d.trim())) {
      return true;
    }
    return VI_ADJ_HEADS.has(s1) || VI_ADJ_HEADS.has(s2);
  }
  return true;
}
