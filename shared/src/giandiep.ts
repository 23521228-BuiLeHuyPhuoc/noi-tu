/**
 * Kiểu dữ liệu & ngân hàng 320 cặp từ tiếng Việt cho game "Ai Là Gián Điệp" (Undercover / Mr. White, 3–12 người).
 */

export type GianDiepRole = 'dan' | 'giandiep' | 'mrwhite';

export type GianDiepPhase =
  | 'word_reveal'
  | 'clue_turn'
  | 'clue_summary'
  | 'discussion'
  | 'vote'
  | 'defense'
  | 'final_vote'
  | 'mrwhite_guess'
  | 'spy_guess'
  | 'reveal_end';

export interface GianDiepWordPair {
  category: string;
  wordA: string;
  wordB: string;
  cluesA: string[];
  cluesB: string[];
}

export interface GianDiepClue {
  id: number;
  round: number;
  playerId: string;
  name: string;
  text: string;
  at?: number;
}

export type GianDiepFeedKind = 'clue' | 'chat' | 'defense' | 'system' | 'elimination';

export interface GianDiepFeedItem {
  id: number;
  round: number;
  kind: GianDiepFeedKind;
  playerId?: string;
  name?: string;
  role?: GianDiepRole;
  text: string;
  at?: number;
}

export interface GianDiepRevealPlayer {
  id: string;
  name: string;
  role: GianDiepRole;
  word: string | null;
  alive: boolean;
}

export interface GianDiepView {
  type: 'giandiep';
  round: number;
  phase: GianDiepPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  category: string;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  eliminated: { id: string; role: GianDiepRole; round: number; word?: string | null }[];
  currentSpeakerId: string | null;
  speakerOrder: string[];
  clues: GianDiepClue[];
  /** Luồng lịch sử hợp nhất (Miêu tả + Biện minh + Thảo luận + Sự kiện hệ thống) */
  timeline: GianDiepFeedItem[];
  readySkip: string[];
  votes: Record<string, string | 'skip'>;
  /** Danh sách nghi phạm cao phiếu nhất bước vào Pha Biện Minh (`defense`) & Phán Quyết (`final_vote`) */
  defendants: string[];
  /** Phiếu Phán Quyết cuối cùng: 'banish' | 'forgive' (nếu 1 bị cáo) hoặc id bị cáo / 'skip' (nếu nhiều bị cáo đồng phiếu) */
  finalVotes: Record<string, string>;
  /** Danh sách ID người chơi đã sử dụng quyền hòa phiếu phán quyết 1 lần trong ván */
  tiePardonUsed?: string[];
  mrWhiteId: string | null;
  /** Tổng số ký tự chữ/số của từ khóa phe Dân (chỉ gửi trong pha đoán từ, không tiết lộ số tiếng) */
  targetCharCount?: number | null;
  /** Cơ cấu vai diễn toàn ván & số người phe Dân / phe Ẩn danh còn sống */
  roleSummary?: { dan: number; giandiep: number; mrwhite: number };
  aliveCounts?: { dan: number; hidden: number };
  /** Mở toàn bộ vai trò & từ khóa của từng người ở cuối ván (`reveal_end`) để cả phòng đối chiếu */
  revealedAll: GianDiepRevealPlayer[] | null;
  winnerIds?: string[] | null;
  wordPairReveal: { wordA: string; wordB: string; winnerHeadline: string } | null;
  /** Chỉ gửi riêng cho đúng viewerId */
  myRole: GianDiepRole | null;
  myWord: string | null;
}

/** Đếm số ký tự chữ cái / chữ số của từ khóa (bỏ khoảng trắng và dấu câu, không tiết lộ số tiếng). */
export function countWordChars(word: string): number {
  return Array.from(word.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')).length;
}

function stripVnAccents(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function normClean(s: string): string {
  return stripVnAccents(s)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normNoHyphen(s: string): string {
  return stripVnAccents(s)
    .replace(/[-–—]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applySynonyms(s: string): string {
  return s
    .replace(/\bxe hoi\b/g, 'o to')
    .replace(/\bbalo\b/g, 'ba lo')
    .replace(/\bvali\b/g, 'va li')
    .replace(/\bcafe\b/g, 'ca phe')
    .replace(/\btv\b/g, 'tivi')
    .replace(/\bnon\b/g, 'mu')
    .replace(/\bmuong\b/g, 'thia')
    .replace(/\bmy\b/g, 'mi')
    .replace(/\b(cay |cai )?du che mua\b/g, 'o che mua')
    .replace(/\b(cay |cai )du\b/g, 'o che mua')
    .replace(/\s+/g, ' ')
    .trim();
}

const STRICT_MULTI_PREFIXES: readonly string[][] = [
  ['trinh', 'duyet'],
  ['xep', 'hinh'],
  ['ung', 'dung'],
  ['chup', 'anh'],
  ['danh', 'bai'],
  ['cay', 'dan'],
  ['nha', 'ga'],
  ['pho', 'co'],
];

const STRICT_SINGLE_PREFIXES = new Set([
  'con', 'cai', 'chiec', 'qua', 'trai', 'chim', 'quan', 'tiem',
  'truong', 'nui', 'le', 'mang', 'di', 'dan', 'quay',
]);

const GUESS_EXTRA_PREFIXES = new Set([
  'mot', 'xe', 'cay', 'mon', 'to', 'ly', 'coc', 'chen', 'bat', 'dia',
  'doi', 'bo', 'nghe', 'tro', 'choi', 'game', 'loai', 'chu', 'cu',
  'bong', 'doa', 'goi', 'tui', 'hop', 'chai', 'lon', 'phim',
]);

const TRAILING_QUALIFIERS = [
  'thong minh',
  'deo tay',
  'danh rang',
  'chai dau',
  'quet nha',
  'khong day',
  'che mua',
  'ha noi',
  'hue',
  'mtp',
  'soi',
  'to nu',
  'xanh',
];

const GENERIC_STOPWORDS = new Set([
  'con', 'cai', 'chiec', 'qua', 'trai', 'chim', 'quan', 'tiem', 'truong',
  'nui', 'pho', 'co', 'le', 'mang', 'o', 'di', 'dan', 'quay', 'phong',
  'may', 'banh', 'nuoc', 'bai', 'xe', 'bui', 'bu',
  'the', 'nguoi', 'thit', 'bo', 'ga', 'ca', 'anh', 'video', 'hinh', 'do',
  'mon', 'tieng', 'nha', 'san', 'hat', 'choi', 'cay', 'la', 'hoa',
  'an', 'uong', 'lam', 'xem', 'chay', 'bay', 'soi', 'lau', 'com',
  'bun', 'tra', 'kem', 'mu', 'kinh', 'giay', 'ao', 'tui',
  'tinh', 'thong', 'minh', 'khong', 'day', 'tu',
  'dong', 'tien', 'mat', 'tay', 'chan', 'dau', 'toc',
]);

function stripLeadingPrefixes(tokens: string[], allowEmpty: boolean, includeExtra: boolean): string[] {
  const cur = [...tokens];
  const canStrip = (n: number) => (allowEmpty ? cur.length >= n : cur.length > n);
  let changed = true;
  while (changed && cur.length > 0) {
    changed = false;
    for (const mp of STRICT_MULTI_PREFIXES) {
      if (canStrip(mp.length) && mp.every((w, i) => cur[i] === w)) {
        cur.splice(0, mp.length);
        changed = true;
        break;
      }
    }
    if (changed) continue;
    const head = cur[0];
    if (STRICT_SINGLE_PREFIXES.has(head) && canStrip(1)) {
      cur.shift();
      changed = true;
      continue;
    }
    // Strip 'phong' except for 'Phòng khách' where remaining tokens === ['khach']
    if (head === 'phong' && canStrip(1)) {
      const rest = cur.slice(1);
      if (!(rest.length === 1 && rest[0] === 'khach')) {
        cur.shift();
        changed = true;
        continue;
      }
    }
    // Strip 'o' specifically when followed by 'khach ...' (e.g. 'Ở khách sạn' -> 'khach san')
    if (head === 'o' && cur.length >= 3 && cur[1] === 'khach') {
      cur.shift();
      changed = true;
      continue;
    }
    if (includeExtra && canStrip(1)) {
      if (cur.length >= 2 && cur[0] === 'tro' && cur[1] === 'choi' && (allowEmpty ? cur.length >= 2 : cur.length > 2)) {
        cur.splice(0, 2);
        changed = true;
        continue;
      }
      if (GUESS_EXTRA_PREFIXES.has(head)) {
        cur.shift();
        changed = true;
      }
    }
  }
  return cur;
}

function isContiguousSubseq(needle: string[], haystack: string[]): boolean {
  if (needle.length === 0 || needle.length > haystack.length) return false;
  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let ok = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function matchSingleTarget(guess: string, target: string, otherWord?: string): boolean {
  const gClean = normClean(guess);
  const tClean = normClean(target);
  if (!gClean || !tClean) return false;

  const gSyn = applySynonyms(normNoHyphen(guess));
  const tSyn = applySynonyms(normNoHyphen(target));
  if (!gSyn || !tSyn) return false;

  if (gClean === tClean || gSyn === tSyn) return true;

  const oClean = otherWord ? normClean(otherWord) : '';
  const oSyn = otherWord ? applySynonyms(normNoHyphen(otherWord)) : '';
  if (oClean && (gClean === oClean || gSyn === oSyn)) return false;

  const gTokens = gSyn.split(' ').filter(Boolean);
  const tTokens = tSyn.split(' ').filter(Boolean);
  const oTokens = oSyn ? oSyn.split(' ').filter(Boolean) : [];

  const gCore = stripLeadingPrefixes(gTokens, true, true);
  if (gCore.length === 0) return false;

  const tCore = stripLeadingPrefixes(tTokens, false, false);
  const oCore = oTokens.length > 0 ? stripLeadingPrefixes(oTokens, false, false) : [];

  // Special case for 'Ô che mưa': accept 'o', 'cay o', 'cai o', 'du', 'cay du', 'cai du', 'o che mua'
  if (tCore.join(' ') === 'o che mua') {
    const allowedUmbrella = new Set(['o', 'cay o', 'cai o', 'du', 'cay du', 'cai du', 'o che mua']);
    const gRawNoHyphen = normNoHyphen(guess);
    if (allowedUmbrella.has(gRawNoHyphen) || allowedUmbrella.has(gSyn)) return true;
  }

  if (oCore.length > 0 && gCore.join(' ') === oCore.join(' ')) return false;

  if (gCore.join(' ') === tCore.join(' ')) return true;
  if (gCore.join('') === tCore.join('') && (tCore.length >= 2 || tCore.join('').length >= 3)) return true;

  // Trailing-qualifier base (e.g. 'Điện thoại thông minh' -> 'dien thoai', 'Đồng hồ đeo tay' -> 'dong ho')
  const tJoined = tCore.join(' ');
  let tBase: string[] = [];
  for (const q of TRAILING_QUALIFIERS) {
    if (tJoined.endsWith(` ${q}`)) {
      const candidate = tJoined.slice(0, -(q.length + 1)).split(' ').filter(Boolean);
      if (candidate.length >= 1) {
        tBase = candidate;
        break;
      }
    }
  }
  if (
    tBase.length > 0 &&
    tBase.join('').length >= 2 &&
    !tBase.every((t) => GENERIC_STOPWORDS.has(t)) &&
    !(oTokens.length > 0 && tBase.every((t) => oTokens.includes(t)))
  ) {
    if (gCore.join(' ') === tBase.join(' ') || (tBase.length >= 2 && gCore.join('') === tBase.join(''))) {
      return true;
    }
  }

  // Multi-token prefix keyword match (e.g. 'sư tử' vs 'Con sư tử', 'ổ cứng' vs 'Ổ cứng di động')
  if (
    gCore.length >= 2 &&
    gCore.length <= tCore.length &&
    gCore.length >= Math.ceil(tCore.length * 0.5) &&
    tCore.slice(0, gCore.length).every((w, i) => gCore[i] === w) &&
    gCore.some((t) => !oTokens.includes(t) && !GENERIC_STOPWORDS.has(t))
  ) {
    return true;
  }

  // Multi-token distinctive contiguous sub-phrase (e.g. 'bít tết' for 'Bò bít tết' vs 'Bò né')
  if (
    gCore.length >= 2 &&
    gCore.length >= Math.ceil(tCore.length * 0.6) &&
    isContiguousSubseq(gCore, tCore) &&
    gCore.every((t) => !oTokens.includes(t)) &&
    gCore.some((t) => !GENERIC_STOPWORDS.has(t)) &&
    !TRAILING_QUALIFIERS.includes(gCore.join(' '))
  ) {
    return true;
  }

  // Superset match: user typed 1-2 extra descriptive words around target core (e.g. 'con sư tử châu phi', 'bánh mì thịt')
  const oDistinctive = new Set(oCore.filter((t) => !tCore.includes(t) && !GENERIC_STOPWORDS.has(t)));
  if (
    gCore.length > tCore.length &&
    gCore.length <= tCore.length + 2 &&
    isContiguousSubseq(tCore, gCore) &&
    (tCore.length >= 2 || !GENERIC_STOPWORDS.has(tCore[0])) &&
    !gCore.some((t) => oDistinctive.has(t))
  ) {
    return true;
  }

  return false;
}

/**
 * So khớp từ khóa Gián Điệp / Mr. White đoán theo từ khóa cốt lõi:
 * - Chấp nhận biến thể bỏ tiền tố loại từ (vd: "sư tử" khớp "Con sư tử", "đại bàng" khớp "Chim đại bàng")
 * - Từ chối từ chung chung / chỉ tiền tố loại từ (vd: "con", "chim", "bánh") hoặc khớp nhầm sang từ phe còn lại.
 */
export function matchGianDiepGuess(guess: string, target: string, otherWord?: string): boolean {
  const variants = [target];
  if (target.includes('/')) {
    const slashIdx = target.indexOf('/');
    const before = target.slice(0, slashIdx).trim();
    const afterPart = target.slice(slashIdx + 1).trim();
    const prefixTokens = before.split(/\s+/);
    if (before) variants.push(before);
    if (afterPart) {
      if (prefixTokens.length > 1) {
        variants.push(`${prefixTokens.slice(0, -1).join(' ')} ${afterPart}`);
      } else {
        variants.push(afterPart);
      }
    }
  }
  return variants.some((v) => matchSingleTarget(guess, v, otherWord));
}

export const GIAN_DIEP_ROLE_META: Record<GianDiepRole, { name: string; emoji: string; color: string; desc: string }> = {
  dan: {
    name: 'Dân Thường',
    emoji: '🧑',
    color: '#2B8A3E',
    desc: 'Mô tả từ khóa khéo léo để đồng đội nhận ra nhau nhưng đừng quá lộ!',
  },
  giandiep: {
    name: 'Gián Điệp',
    emoji: '🕵️',
    color: '#D9480F',
    desc: 'Từ của bạn hơi khác đa số! Hãy lắng nghe, trà trộn và trụ tới cuối.',
  },
  mrwhite: {
    name: 'Mr. White',
    emoji: '🤍',
    color: '#495057',
    desc: 'Bạn KHÔNG có từ khóa! Nghe lỏm để chém gió và đoán đúng từ nếu bị loại.',
  },
};

export const MR_WHITE_GENERIC_CLUES = [
  'Món này quen lắm luôn á',
  'Hồi nhỏ hay gặp cái này',
  'Nhiều người thích lắm nè',
  'Để mô tả sao cho khỏi lộ đây ta',
  'Nhắc tới là thấy quen thuộc ghê',
  'Tùy người thích hoặc không thích',
  'Gần gũi với đời sống hằng ngày',
  'Ở đâu cũng có thể bắt gặp',
];

type CompactPair = [string, string, string, string, string, string];

function pack(category: string, rows: CompactPair[]): GianDiepWordPair[] {
  return rows.map(([wordA, wordB, cA1, cA2, cB1, cB2]) => ({
    category,
    wordA,
    wordB,
    cluesA: [cA1, cA2, `Thường thấy ở ngoài đời`, `Ai cũng từng nghe qua`],
    cluesB: [cB1, cB2, `Khá phổ biến ở Việt Nam`, `Có nét riêng khá đặc trưng`],
  }));
}

export const GIAN_DIEP_WORDS: GianDiepWordPair[] = [
  ...pack('Ẩm thực', [
    ['Phở bò', 'Bún bò Huế', 'Nước dùng thanh ngọt mùi quế hồi', 'Sợi dẹt trắng ăn kèm quẩy', 'Cay nồng mùi mắm ruốc sả ớt', 'Có chân giò chả cua sợi tròn to'],
    ['Trà sữa', 'Cà phê sữa đá', 'Có trân châu dai dai uống ống hút to', 'Giới trẻ rất mê chiều chiều hay order', 'Đắng nhẹ thơm béo giúp tỉnh táo', 'Pha phin hoặc máy thêm đá mát lạnh'],
    ['Bánh mì', 'Xôi mặn', 'Vỏ giòn rụm kẹp pate dưa leo', 'Món ăn sáng quốc dân cầm tay', 'Hạt nếp dẻo thơm hành phi lạp xưởng', 'Gói lá chuối ăn rất chắc bụng'],
    ['Bánh chưng', 'Bánh tét', 'Hình vuông gói lá dong ngày Tết', 'Có nhân đậu xanh thịt mỡ', 'Hình trụ tròn cắt khoanh miền Nam', 'Luộc nhiều tiếng lửa củi thơm lừng'],
    ['Bún đậu mắm tôm', 'Bún chả Hà Nội', 'Chấm mắm tím đánh bông sủi bọt', 'Có đậu rán giòn chả cốm nem chua', 'Thịt nướng than thơm lừng nước mắm chua ngọt', 'Ăn cùng rau sống bún lá'],
    ['Cơm tấm', 'Cơm rang dưa bò', 'Hạt gạo vỡ ăn với sườn nướng bì chả', 'Chan nước mắm kẹo đồ chua', 'Xào nóng trên chảo với dưa cải chua', 'Có thịt bò xào thơm mùi hành'],
    ['Lẩu Thái', 'Lẩu riêu cua', 'Vị chua cay thơm lá chanh sả', 'Nhúng hải sản tôm mực nấm kim châm', 'Nước dùng gạch cua đồng ngọt thanh', 'Nhúng đậu phụ bắp bò mùng tơi'],
    ['Mì tôm', 'Phở ăn liền', 'Chế nước sôi ba phút là ăn đêm', 'Sợi vàng xoăn quen thuộc sinh viên', 'Gói tiện lợi sợi trắng mùi bò gà', 'Cũng pha nhanh khi lười nấu'],
    ['Gỏi cuốn', 'Chả giò', 'Bánh tráng mỏng cuốn tôm thịt sống', 'Chấm tương đen hoặc mắm nêm', 'Cuốn xong đem chiên giòn rụm', 'Bên trong có miến mộc nhĩ thịt băm'],
    ['Sầu riêng', 'Mít tố nữ', 'Vỏ đầy gai nhọn mùi nồng đặc trưng', 'Cơm vàng béo ngậy như bơ', 'Gai mềm hơn múi nhỏ ngọt thơm', 'Bóc múi ăn tới đâu hết tới đó'],
    ['Xoài xanh', 'Quả cóc', 'Vị chua giòn chấm muối ớt Tây Ninh', 'Quả to da trơn hay lắc bò khô', 'Quả nhỏ tròn hạt có xơ nhiều', 'Gọt vỏ ăn cả chùm giòn tan'],
    ['Bánh xèo', 'Bánh khọt', 'Chảo lớn đổ bột nghệ giòn rìa', 'Cuốn rau cải chấm mắm chua ngọt', 'Đổ khuôn nhỏ tròn từng cái một', 'Ở Vũng Tàu có con tôm trên mặt'],
    ['Chè thái', 'Tào phớ', 'Ngọt mát nhiều thạch mít sầu riêng', 'Ăn bằng ly đá bào béo nước cốt dừa', 'Mềm mịn tan trong miệng nước đường gừng', 'Thường ăn chén nóng hoặc đá'],
    ['Kem ốc quế', 'Bánh flan', 'Lạnh buốt ăn nhanh kẻo tan chảy', 'Vỏ nón giòn cầm trên tay', 'Mềm mịn vị trứng sữa caramen đắng nhẹ', 'Để trong hũ nhỏ úp ra dĩa'],
    ['Bò bít tết', 'Bò né', 'Thịt áp chảo cắt dao nĩa sang trọng', 'Ăn kèm khoai tây nghiền hoặc sốt tiêu', 'Dọn trên chảo gang xèo xèo nóng hổi', 'Có trứng ốp la pate chấm bánh mì'],
    ['Nước mía', 'Nước dừa', 'Ép từ cây thân đốt ngọt lịm', 'Hay cho thêm lát tắc cho thơm', 'Uống trực tiếp từ trái chặt vỏ', 'Mát lành có cả cùi trắng nạo'],
    ['Pizza', 'Bánh bao', 'Đế tròn nướng lò phủ phô mai kéo sợi', 'Cắt từng miếng tam giác chia nhau', 'Hấp nóng vỏ trắng xốp nhân thịt trứng cút', 'Cầm một chiếc ăn lót dạ rất tiện'],
    ['Bánh trung thu', 'Bánh pía', 'Vỏ nướng hoa văn nhân thập cẩm trứng muối', 'Hay tặng nhau dịp rằm tháng tám', 'Vỏ nhiều lớp mỏng Sóc Trăng sầu riêng', 'Ăn với trà nóng cực kỳ hợp vị'],
    ['Hủ tiếu', 'Miến gà', 'Nước ngọt xương ống có tóp mỡ hẹ', 'Ăn khô hay nước đều ngon lành', 'Sợi trong dai nấu nước luộc gà', 'Thêm măng khô hành phi thơm nức'],
    ['Bia', 'Rượu vang', 'Uống lạnh bật nắp cụng ly zô', 'Có bọt trắng sủi tăm vị đắng nhẹ', 'Ủ từ nho đỏ rót ly chân cao', 'Uống nhâm nhi kèm thịt đỏ sang chảnh'],
  ]),
  ...pack('Động vật', [
    ['Con chó', 'Con mèo', 'Trung thành hay vẫy đuôi giữ nhà', 'Thích gặm xương sủa gâu gâu', 'Chảnh chọe thích ngủ nắng bắt chuột', 'Kêu meo meo hay cào ghế'],
    ['Con hổ', 'Con sư tử', 'Chúa sơn lâm bộ lông vằn cam đen', 'Săn mồi đơn độc trong rừng sâu', 'Có bờm rậm quanh cổ sống theo đàn', 'Biểu tượng vua thảo nguyên châu Phi'],
    ['Con trâu', 'Con bò', 'Sức kéo khỏe cày ruộng sừng cong dài', 'Hay đằm mình dưới bùn ao quê', 'Hiền lành cho sữa hoặc kéo xe', 'Lông vàng hoặc khoang đen trắng'],
    ['Cá heo', 'Cá voi', 'Thông minh thân thiện hay biểu diễn nhào lộn', 'Sống theo bầy phát sóng âm dưới biển', 'Kích thước khổng lồ to nhất đại dương', 'Phun cột nước lớn trên đỉnh đầu'],
    ['Con vịt', 'Con ngan', 'Bơi giỏi dưới ao kêu cạp cạp', 'Món quay hay nấu cháo rất nổi', 'Thân nặng hơn có mào thịt đỏ quanh mắt', 'Ít kêu to hơn nhưng bay khỏe hơn'],
    ['Con bướm', 'Chuồn chuồn', 'Cánh sặc sỡ hút mật hoa mùa xuân', 'Biến hình từ kén sâu bướm', 'Thân dài mảnh hay bay là là mặt nước', 'Dân gian bảo bay thấp thì mưa'],
    ['Con muỗi', 'Con ruồi', 'Hút máu vo ve ban đêm truyền sốt xuất huyết', 'Thích núp góc tối làm ngứa da', 'Hay bu thức ăn đập rất khó trúng', 'Mắt kép to vo ve quanh bàn ăn'],
    ['Chim đại bàng', 'Chim cú mèo', 'Chúa bầu trời sải cánh lớn mắt tinh', 'Săn mồi ban ngày mỏ quặp sắc bén', 'Thức suốt đêm đầu xoay gần trọn vòng', 'Mắt tròn to kêu trong rừng khuya'],
    ['Con gấu trúc', 'Gấu Bắc Cực', 'Lông hai màu đen trắng mê ăn trúc', 'Dễ thương chậm chạp biểu tượng Trung Quốc', 'Lông trắng muốt sống nơi băng tuyết lạnh', 'Bơi giỏi săn hải cẩu trên băng'],
    ['Con kiến', 'Con ong', 'Chăm chỉ làm việc theo bầy dưới đất', 'Khiêng mồi nặng gấp nhiều lần cơ thể', 'Hút mật làm tổ sáp có ngòi châm đau', 'Siêng năng suốt ngày bay quanh hoa'],
    ['Con ếch', 'Con cóc', 'Da trơn láng sống cả dưới nước lẫn bờ', 'Trời mưa kêu ộp ộp inh ỏi', 'Da sần sùi tiết nhựa độc tự vệ', 'Nghiến răng báo hiệu trời sắp mưa'],
    ['Con tôm', 'Con cua', 'Thân cong nhiều đốt bật nhảy tanh tách', 'Luộc lên chuyển màu đỏ cam cong veo', 'Đi ngang có hai chiếc càng cứng cáp', 'Mai cứng sống vùng nước mặn lợ'],
    ['Con thỏ', 'Chuột hamster', 'Tai dài vểnh thích gặm cà rốt nhảy lò cò', 'Lông mềm mượt mắt đỏ hoặc đen', 'Nhỏ xíu nằm gọn trong lòng bàn tay', 'Thích chạy vòng xoay trong lồng kính'],
    ['Con rùa', 'Con ba ba', 'Mang chiếc mai cứng đi lại chậm chạp', 'Rút đầu vào trong khi gặp nguy hiểm', 'Mai mềm dẹt hơn hay sống sông bùn', 'Tích cực ẩn dưới nước ít bò lên cạn'],
    ['Ngựa vằn', 'Hươu cao cổ', 'Lông sọc trắng đen độc nhất vô nhị', 'Chạy nhanh theo bầy tránh thú dữ', 'Chiếc cổ dài vươn tới ngọn cây cao', 'Lông đốm vàng nâu trên thảo nguyên'],
    ['Khỉ', 'Đười ươi', 'Leo trèo chuyền cành láu lỉnh thích chuối', 'Hay bắt chước hành động con người', 'Thân hình to lớn cánh tay rất dài', 'Thông minh sống sâu trong rừng rậm nhiệt đới'],
    ['Cá sấu', 'Thằn lằn', 'Sống đầm lầy hàm răng nhọn lực cắn khủng', 'Nằm bất động ngụy trang như khúc gỗ', 'Nhỏ bé hay bò trên tường rình côn trùng', 'Đứt đuôi vẫn mọc lại được'],
    ['Chim cánh cụt', 'Hải cẩu', 'Chim không biết bay đi lạch bạch trên băng', 'Mặc bộ vest đen trắng đáng yêu', 'Không có cánh dùng vây bơi lội điêu luyện', 'Hay nằm phơi mình trên tảng băng trôi'],
    ['Con dơi', 'Chim én', 'Động vật có vú biết bay treo ngược ngủ', 'Hoạt động về đêm định vị bằng sóng âm', 'Báo hiệu mùa xuân làm tổ bằng nước bọt', 'Đuôi chẻ hình kéo bay lượn cực nhanh'],
    ['Bạch tuộc', 'Con mực', 'Có tám xúc tu giác hút không xương sống', 'Ngụy trang đổi màu phun mực trốn chạy', 'Thân hình thuôn có vây đuôi hay nướng ăn', 'Có mai cứng trắng bên trong thân'],
  ]),
  ...pack('Địa điểm', [
    ['Biển', 'Hồ bơi', 'Nước mặn có sóng vỗ rì rào cát vàng', 'Đi ngắm bình minh ăn hải sản', 'Nước ngọt mùi clo chia làn rõ ràng', 'Nhảy ùm tập bơi không lo bị cuốn'],
    ['Siêu thị', 'Chợ truyền thống', 'Điều hòa mát lạnh xếp hàng tính tiền quầy', 'Đồ niêm yết giá đẩy xe đi lựa', 'Nhộn nhịp sáng sớm mặc cả từng ngàn', 'Bán đồ tươi sống ngay sạp ngoài trời'],
    ['Rạp chiếu phim', 'Sân khấu kịch', 'Màn hình khổng lồ tắt đèn ăn bắp rang', 'Ngồi ghế dốc xem bom tấn mới ra rạp', 'Diễn viên diễn trực tiếp ngay trước mắt', 'Hết vở có màn cúi chào khán giả vỗ tay'],
    ['Thư viện', 'Quán cà phê', 'Im phăng phắc toàn kệ sách tra cứu', 'Mượn đọc học bài miễn phí có thẻ', 'Mở nhạc nhẹ vừa uống nước vừa làm việc', 'Chỗ hẹn tụ tập bạn bè cuối tuần'],
    ['Sân bay', 'Nhà ga tàu hỏa', 'Kiểm tra an ninh soi hành lý lên máy bay', 'Có cổng chờ quốc tế nội địa rộng lớn', 'Có đường ray sắt tiếng còi xình xịch', 'Mua vé lên toa nằm xuyên Việt ngắm cảnh'],
    ['Bệnh viện', 'Hiệu thuốc', 'Có bác sĩ y tá phòng cấp cứu nội trú', 'Mùi thuốc sát trùng khám chữa bệnh nặng', 'Mua đơn nhỏ lẻ viên cảm hạ sốt nhanh', 'Quầy nhỏ mặt phố không cần nằm giường'],
    ['Trường đại học', 'Trường mẫu giáo', 'Sinh viên tự học nghiên cứu chạy deadline', 'Giảng đường rộng tự do chọn tín chỉ', 'Các bé ngủ trưa múa hát cô dỗ ăn', 'Cổng trường chiều chiều phụ huynh đón bé'],
    ['Công viên', 'Sở thú', 'Nhiều cây xanh ghế đá đi bộ hít thở', 'Miễn phí vào cổng tập thể dục sáng chiều', 'Có chuồng nuôi voi hổ hươu cao cổ', 'Trẻ em cực thích cuối tuần vào ngắm thú'],
    ['Quán karaoke', 'Quán bar', 'Phòng riêng cầm mic hát hò chọn bài trên màn', 'Tụ tập sinh nhật hát khản cả cổ', 'Nhạc DJ xập xình đèn chớp pha chế cocktail', 'Đứng nhún nhảy sôi động tới khuya'],
    ['Núi Đà Lạt', 'Phố cổ Hội An', 'Sương mù thông reo mặc áo lạnh uống sữa đậu', 'Thung lũng hoa quanh năm khí hậu mát dịu', 'Đèn lồng rực rỡ thả hoa đăng sông Hoài', 'Nhà mái ngói tường vàng cổ kính'],
    ['Phòng gym', 'Sân bóng đá', 'Nhiều tạ sắt máy chạy bộ tập cơ bắp', 'Soi gương đếm set gập bụng trong nhà', 'Mặt cỏ xanh rộng chia đội sút vào khung thành', 'Chạy hết sân chín mươi phút thở dốc'],
    ['Tiệm cắt tóc', 'Tiệm spa', 'Ngồi ghế soi gương nghe tiếng kéo tông đơ', 'Tỉa gọn tạo kiểu gội đầu nhanh chóng', 'Ánh đèn dịu nhẹ mùi tinh dầu thư giãn', 'Đắp mặt nạ bấm huyệt chăm sóc cơ thể'],
    ['Bảo tàng', 'Đền chùa', 'Trưng bày hiện vật lịch sử cổ vật quý giá', 'Đi tham quan tìm hiểu quá khứ dân tộc', 'Thắp hương cầu bình an không gian trang nghiêm', 'Kiến trúc tâm linh mái cong chuông đồng'],
    ['Cắm trại', 'Ở khách sạn', 'Dựng lều giữa rừng nhóm lửa nướng thịt đêm', 'Gần thiên nhiên tự chuẩn bị đồ ăn ngủ', 'Phòng máy lạnh nệm êm có lễ tân phục vụ', 'Sáng dậy có buffet sẵn tiện nghi đầy đủ'],
    ['Nhà bếp', 'Phòng khách', 'Có bếp ga tủ lạnh bồn rửa xoong nồi', 'Nơi nấu nướng bay mùi thức ăn thơm lừng', 'Có sofa tivi bàn trà tiếp bạn bè tới chơi', 'Không gian sinh hoạt chung đầu tiên khi mở cửa'],
    ['Thang máy', 'Thang cuốn', 'Hộp kín bấm số tầng đứng chờ cửa mở', 'Di chuyển thẳng đứng rất nhanh nhà cao tầng', 'Bậc di chuyển liên tục đứng yên trôi lên', 'Hay gặp ngay sảnh trung tâm thương mại'],
    ['Cây xăng', 'Trạm thu phí', 'Bơm nhiên liệu không hút thuốc gây cháy nổ', 'Đổ đầy bình chạy xe tiếp đường dài', 'Cửa chắn barie trên cao tốc kiểm soát xe qua', 'Đóng tiền vé qua tuyến đường mới'],
    ['Bãi giữ xe', 'Sửa xe', 'Lấy thẻ bấm giữ an toàn khi đi ăn chơi', 'Xếp hàng ngay ngắn không lo mất cắp', 'Thay nhớt vá lốp cân chỉnh phanh xích', 'Thợ mặc đồ dính dầu mỡ loay hoay tua vít'],
    ['Hiệu sách', 'Tiệm tạp hóa', 'Bán vở bút tiểu thuyết truyện tranh thơm mùi giấy', 'Ngồi đọc ké hàng giờ rất yên tĩnh', 'Bán đủ thứ muối đường bánh kẹo nước ngọt', 'Mở ngay đầu ngõ tiện gì mua nấy'],
    ['Sân thượng', 'Tầng hầm', 'Cao nhất tòa nhà lộng gió phơi đồ trồng cây', 'Nhìn xuống đường phố lung linh ban đêm', 'Nằm sâu dưới mặt đất tối mát hay đậu xe', 'Mạng điện thoại xuống đây hay bị yếu'],
  ]),
  ...pack('Đồ vật', [
    ['Ô tô', 'Xe máy', 'Bốn bánh có mui che nắng mưa điều hòa mát', 'Vô lăng ngồi trong cabin an toàn đường dài', 'Hai bánh luồn lách ngõ nhỏ đội nón bảo hiểm', 'Phương tiện phổ biến nhất Việt Nam'],
    ['Tủ lạnh', 'Máy lạnh', 'Bảo quản rau thịt làm đá mát đồ uống', 'Mở cửa ra thấy hơi lạnh phả thức ăn', 'Treo trên tường làm mát cả căn phòng ngủ', 'Dùng remote chỉnh nhiệt độ khi trời nóng'],
    ['Bàn chải đánh răng', 'Lược chải đầu', 'Có lông nhỏ mềm dùng kem bọt mỗi sáng tối', 'Giúp răng trắng sạch thơm miệng trước khi ngủ', 'Răng lược gỡ rối tóc trước khi ra ngoài', 'Đặt cạnh gương soi làm đẹp mỗi ngày'],
    ['Ô che mưa', 'Áo mưa', 'Cầm tay bung tán tròn gấp gọn cho vào túi', 'Dùng được cả lúc nắng gắt lẫn mưa nhỏ', 'Trùm kín người mặc khi chạy xe trời bão', 'Mặc vào hơi vướng nhưng đỡ ướt ống quần'],
    ['Kính cận', 'Kính râm', 'Đeo giúp nhìn rõ chữ bảng đen không bị mờ', 'Tròng trong suốt đo độ theo mắt mỗi người', 'Tròng tối màu chống chói nắng đi biển cực ngầu', 'Không có độ chủ yếu bảo vệ mắt và thời trang'],
    ['Chăn', 'Gối', 'Đắp lên người giữ ấm khi ngủ bật điều hòa', 'Trải rộng che phủ toàn thân mùa đông', 'Kê dưới đầu cho êm cổ ngủ sâu giấc', 'Ôm gọn một chiếc ngủ mới yên tâm'],
    ['Đồng hồ đeo tay', 'Nhẫn', 'Xem giờ trên cổ tay phụ kiện lịch lãm', 'Có kim quay hoặc mặt điện tử tiện lợi', 'Đeo trên ngón tay hay gắn liền chuyện đính hôn', 'Nhỏ xíu sáng lấp lánh biểu tượng gắn kết'],
    ['Nồi cơm điện', 'Ấm siêu tốc', 'Cắm điện nấu hạt gạo chín dẻo thơm cho bữa cơm', 'Nấu xong tự bật nút giữ ấm chờ ăn', 'Đun nước sôi sùng sục trong hai phút pha trà', 'Chỉ nấu nước sôi không nấu đồ ăn được'],
    ['Máy giặt', 'Máy hút bụi', 'Quay lồng vắt khô quần áo bẩn hằng tuần', 'Đổ nước xả vải vô rồi bấm nút ngồi chơi', 'Hút sạch tóc bụi li ti trên sàn thảm sofa', 'Cầm tay đẩy khắp phòng phát tiếng rì rì'],
    ['Thìa', 'Đũa', 'Múc canh xúp cơm chan dễ dàng cho trẻ nhỏ', 'Làm bằng inox đầu tròn lõm sâu', 'Hai que dài cầm một tay gắp đồ khéo léo', 'Văn hóa bàn ăn đặc trưng châu Á'],
    ['Bút bi', 'Bút chì', 'Mực xanh đen viết rõ nét ký giấy tờ', 'Bấm cạch cạch hết mực thì thay ruột', 'Ngòi than viết sai dùng gôm tẩy sạch dễ dàng', 'Hay dùng vẽ phác thảo tô đáp án trắc nghiệm'],
    ['Sạc dự phòng', 'Ổ cắm điện', 'Mang theo balo cứu nguy điện thoại sập nguồn', 'Cần nạp pin trước khi đi du lịch xa', 'Cắm trực tiếp nguồn tường chia nhiều lỗ nối', 'Nằm cố định một chỗ không tích điện sẵn'],
    ['Giày thể thao', 'Dép lê', 'Buộc dây êm gót chạy bộ leo núi cực bền', 'Mang kèm tất bảo vệ ngón chân kín đáo', 'Xỏ chân cái một đi trong nhà ra ngõ tiện lợi', 'Thoáng mát nhưng chạy nhanh dễ tuột'],
    ['Mũ bảo hiểm', 'Mũ lưỡi trai', 'Vỏ cứng xốp dày bắt buộc đội khi chạy xe', 'Cài quai chắc chắn bảo vệ đầu khi va chạm', 'Vải nhẹ đội che nắng thời trang năng động', 'Hay đội ngược ra sau nhìn rất trẻ trung'],
    ['Chổi quét nhà', 'Cây lau nhà', 'Quét gom rác bụi khô lại một góc để hốt', 'Cần thêm ki hốt rác đi cặp mới xong việc', 'Nhúng nước vắt khô lau bóng sàn gạch sạch kin kít', 'Sau khi quét xong mới tới lượt nó ra tay'],
    ['Ba lô', 'Va li', 'Đeo hai vai gọn gàng đi học đi làm hàng ngày', 'Đựng laptop sách vở vừa vặn trên lưng', 'Có bánh xe tay kéo đi du lịch dài ngày', 'Đựng nhiều bộ đồ nặng kéo sàn lọc cọc'],
    ['Gương soi', 'Cửa sổ', 'Phản chiếu rõ khuôn mặt giúp chỉnh đầu tóc trang điểm', 'Vỡ ra người ta hay kiêng kỵ điều xui', 'Mở ra cho gió trời ánh nắng tràn vào phòng', 'Nhìn xuyên qua ngắm mưa nắng bên ngoài'],
    ['Khẩu trang', 'Khăn giấy', 'Đeo che mũi miệng chống bụi mịn vi khuẩn ra đường', 'Có dây quai đeo hai bên tai rất quen thuộc', 'Lau tay lau miệng sau khi ăn xong bỏ thùng rác', 'Mềm mịn thấm nước nhanh chóng'],
    ['Quạt máy', 'Quạt giấy', 'Cắm điện quay cánh vù vù thổi gió mát mùa hè', 'Xoay trái phải đều khắp phòng khi cúp nóng', 'Xếp nếp cầm tay phe phẩy khi mất điện', 'Gấp gọn nhét túi không tốn chút điện nào'],
    ['Cây đàn guitar', 'Đàn piano', 'Sáu dây gảy đệm hát bên đống lửa trại cực chill', 'Ôm gọn trước ngực bấm hợp âm bằng ngón tay', 'Phím trắng đen xếp hàng dài âm thanh sang trọng', 'Ngồi ghế đánh bằng cả hai bàn tay'],
  ]),
  ...pack('Nghề nghiệp', [
    ['Bác sĩ', 'Dược sĩ', 'Khám bệnh kê toa phẫu thuật mặc áo blouse trắng', 'Làm việc tại bệnh viện trực ca cấp cứu', 'Am hiểu thành phần thuốc bán theo đơn tại quầy', 'Tư vấn liều uống sáng chiều cho khách mua thuốc'],
    ['Giáo viên', 'Gia sư', 'Đứng lớp giảng bài cho hàng chục học sinh chấm thi', 'Gắn bó phấn trắng bảng đen cả năm học', 'Dạy kèm một một tại nhà ôn bài riêng từng em', 'Linh hoạt giờ giấc hay là sinh viên đi dạy thêm'],
    ['Ca sĩ', 'Nhạc sĩ', 'Cầm micro đứng sân khấu hát trước hàng ngàn fan', 'Luyện thanh giữ giọng rất kỹ trước show diễn', 'Ngồi viết giai điệu phối khí sáng tác bài hit', 'Thường đứng sau cánh gà ít khi hát trực tiếp'],
    ['Đầu bếp', 'Phục vụ bàn', 'Đội mũ cao nêm nếm đứng bếp lửa suốt buổi', 'Sáng tạo món ngon bày đĩa thật đẹp mắt', 'Ghi order bưng đồ ăn lên dọn dẹp tận tình', 'Luôn mỉm cười chào khách khi bước vào quán'],
    ['Công an', 'Bảo vệ', 'Giữ gìn an ninh điều tiết giao thông bắt tội phạm', 'Mặc sắc phục uy nghiêm làm việc cho nhà nước', 'Trông xe kiểm soát người ra vào cổng công ty', 'Ngồi bốt trực ca đêm quanh khu vực được thuê'],
    ['Lập trình viên', 'Thiết kế đồ họa', 'Gõ code sửa bug uống cà phê thâu đêm', 'Xây dựng website ứng dụng cho máy tính điện thoại', 'Chọn bảng màu vẽ logo poster cực kỳ thẩm mỹ', 'Sống cùng Photoshop Figma canh từng pixel'],
    ['Phi công', 'Tiếp viên hàng không', 'Ngồi buồng lái điều khiển máy bay cất hạ cánh', 'Chịu trách nhiệm toàn bộ đường bay trên trời', 'Chăm sóc hành khách phát suất ăn hướng dẫn an toàn', 'Nụ cười rạng rỡ đứng chào ngay cửa khoang'],
    ['Nhiếp ảnh gia', 'Người mẫu', 'Cầm máy ảnh bắt góc sáng tìm khoảnh khắc đẹp', 'Chỉnh đèn hậu kỳ ảnh cưới kỷ yếu nghệ thuật', 'Tạo dáng thần thái trước ống kính catwalk thời trang', 'Luôn giữ dáng chuẩn mặc đẹp thử bộ sưu tập mới'],
    ['Shipper', 'Tài xế công nghệ', 'Chở thùng hàng gọi điện giao tận cửa mọi thời tiết', 'Chạy khắp ngõ hẻm giao đồ ăn trà sữa hỏa tốc', 'Chở khách qua app tính cước theo cây số trên bản đồ', 'Luôn hỏi anh chị đang đứng ở đầu hẻm nào'],
    ['Kế toán', 'Thủ quỹ', 'Làm sổ sách thuế má cân đối bảng Excel mỗi cuối tháng', 'Sai một con số là ngồi dò tới tối mịt', 'Trực tiếp cầm giữ tiền mặt chi trả thu nộp thực tế', 'Quản lý két sắt phiếu thu phiếu chi hằng ngày'],
    ['Nông dân', 'Ngư dân', 'Chân lấm tay bùn cày cấy trồng lúa vườn cây ăn trái', 'Mong mưa thuận gió hòa tới mùa thu hoạch', 'Ra khơi đánh bắt tôm cá lênh đênh sóng biển', 'Đọc con nước dự báo gió bão ngoài đảo xa'],
    ['Streamer', 'YouTuber', 'Bật cam trò chuyện chơi game trực tiếp cùng người xem', 'Nhận donate đọc tên cảm ơn ngay trên sóng', 'Quay dựng video chỉnh sửa kỹ càng đăng kênh kiếm view', 'Viết kịch bản hậu kỳ mất mấy ngày mới lên clip'],
    ['Thợ điện', 'Thợ sửa ống nước', 'Kiểm tra dây pha aptomat nối điện khi bị chập cháy', 'Luôn đi giày cách điện dùng bút thử cẩn thận', 'Thông tắc bồn rửa hàn ống rò rỉ nước dưới sàn', 'Mang kìm cờ lê chui gầm tủ vặn van'],
    ['Luật sư', 'Thẩm phán', 'Nghiên cứu hồ sơ bào chữa bảo vệ quyền lợi cho thân chủ', 'Tranh luận sắc bén từng điều khoản trước tòa', 'Người cầm cân nảy mực gõ búa tuyên án cuối cùng', 'Ngồi vị trí cao nhất trong phòng xử án công minh'],
    ['Huấn luyện viên', 'Cầu thủ', 'Đứng ngoài đường biên vạch chiến thuật hò hét chỉ đạo', 'Chịu áp lực thành tích của cả đội bóng', 'Trực tiếp chạy trên sân sút bóng ghi bàn tranh cúp', 'Tập luyện thể lực hàng ngày dễ gặp chấn thương'],
    ['Thủ thư', 'Nhà văn', 'Sắp xếp mã sách giữ trật tự hướng dẫn người mượn', 'Biết rõ từng cuốn sách nằm ở kệ nào khu nào', 'Tự tưởng tượng viết nên tiểu thuyết truyện dài kỳ', 'Hay tìm cảm hứng ở những quán nhỏ yên tĩnh'],
    ['Chủ tịch', 'Thư ký', 'Người đứng đầu ra quyết định chiến lược lớn tập đoàn', 'Ký duyệt dự án ngân sách hàng trăm tỷ', 'Sắp xếp lịch họp nhắc việc soạn văn bản cho sếp', 'Theo sát hỗ trợ mọi chuyến công tác quan trọng'],
    ['Thợ kim hoàn', 'Thợ may', 'Chế tác nhẫn vàng cắt gọt đá quý tỉ mỉ từng ly', 'Làm việc với kính lúp đèn sáng rực đồ trang sức', 'Đo số cắt vải đạp máy khâu nên áo dài bộ vest', 'Xung quanh toàn thước dây phấn vẽ mẫu vải'],
    ['Diễn viên hài', 'Ảo thuật gia', 'Kể chuyện tấu mảng miếng khiến khán giả cười nghiêng ngả', 'Biểu cảm duyên dáng hóa thân đủ dạng vai lầy lội', 'Biến chim bồ câu xào bài khiến người xem tròn mắt', 'Luôn giữ bí mật mánh khóe sau màn trình diễn'],
    ['Kiến trúc sư', 'Thợ xây', 'Vẽ bản thiết kế 3D phối cảnh biệt thự công trình đẹp', 'Tính ánh sáng công năng trước khi khởi công', 'Trực tiếp trộn vữa xây gạch dựng tường ngoài nắng gió', 'Đội nón bảo hộ leo giàn giáo cả ngày vất vả'],
  ]),
  ...pack('Giải trí', [
    ['TikTok', 'YouTube', 'Video ngắn lướt dọc mười lăm giây gây nghiện cực nhanh', 'Hay tạo trend nhảy nhót nhạc remix bắt tai', 'Video dài xem hướng dẫn vlog nghe nhạc giải trí', 'Nền tảng video lớn lâu đời màn hình ngang'],
    ['Cờ vua', 'Cờ tướng', 'Quân vua hậu mã xe tượng trên bàn 64 ô đen trắng', 'Chiếu bí kiểu quốc tế rất hay thi Olympic', 'Tướng sĩ tượng pháo mã đặt trên giao điểm có sông', 'Chơi ngay vỉa hè trà đá cực kỳ đông người xem'],
    ['Ma Sói', 'Among Us', 'Đêm nhắm mắt nghe quản trò dẫn chuyện tìm Sói ẩn thân', 'Trò chơi giao tiếp suy luận quanh vòng tròn', 'Làm nhiệm vụ trên tàu vũ trụ tìm kẻ giả mạo đâm lén', 'Bấm chuông họp khẩn đẩy người nghi ngờ ra ngoài không gian'],
    ['Liên Quân', 'Free Fire', 'Phá trụ 5 đấu 5 chọn tướng chia đường Rừng Mid AD', 'Combat tổng cuối game tranh Caesar rất căng', 'Nhảy dù nhặt súng bo thu hẹp sinh tồn một trăm người', 'Chạy bo bắn tỉa ai sống cuối cùng là thắng'],
    ['Doraemon', 'Conan', 'Mèo máy túi thần kỳ bảo bối giúp cậu bạn hậu đậu', 'Bánh rán bảo bối chong chóng tre tuổi thơ ai cũng mê', 'Thám tử teo nhỏ phá án mạng gay cấn bằng nơ đổi giọng', 'Mỗi tập đều có hung thủ bất ngờ sau cánh cửa'],
    ['Harry Potter', 'Tây Du Ký', 'Phù thủy cưỡi chổi trường Hogwarts đũa phép đấu Chúa tể', 'Thư cú gửi nhập học chia bốn nhà phép thuật', 'Bốn thầy trò vượt tám mươi mốt kiếp nạn đi thỉnh kinh', 'Tôn Ngộ Không gậy Như Ý bảy mươi hai phép thần thông'],
    ['Sơn Tùng M-TP', 'Đen Vâu', 'Ca sĩ Thái Bình nổi tiếng Lạc Trôi Cơn Mưa Ngang Qua', 'Gu thời trang cá tính lượng fan Sky hùng hậu', 'Rapper viết lời mộc mạc chill chill đi trốn mang tiền về cho mẹ', 'Mỗi câu rap hay thành status triết lý mạng xã hội'],
    ['Bóng đá', 'Bóng rổ', 'Dùng chân chuyền sút lưới mười một người mỗi đội', 'Giải Ngoại hạng World Cup cả xóm thức đêm xem', 'Dùng tay dẫn đập bóng ném vào rổ treo cao', 'Ưu thế chiều cao bật nhảy úp rổ cực ngầu'],
    ['Cầu lông', 'Bóng bàn', 'Cầm vợt nhẹ đánh quả cầu lông vũ qua lưới cao', 'Đánh sân phong trào buổi chiều rất phổ biến', 'Đánh trái bóng nhựa nhỏ xíu nảy liên hồi trên mặt bàn', 'Phản xạ cực nhanh sát mặt bàn gỗ xanh'],
    ['Bơi lội', 'Chạy bộ', 'Vận động dưới nước sải bướm ếch ngửa mát rượi', 'Tốt cho cột sống chiều cao không ra mồ hôi rít', 'Mang giày sải bước ngoài công viên máy chạy', 'Đo cự ly năm cây mười cây marathon cuối tuần'],
    ['Lô tô', 'Xổ số kiến thiết', 'Vừa rao câu hát vè vừa dò số chờ hô Kinh cả hội chợ', 'Cuộc vui tụ tập Tết càng đông người dò càng vui', 'Mua tờ giấy dò chiều bốn giờ mười lăm chờ quay thưởng', 'Trúng giải độc đắc đổi đời ngay lập tức'],
    ['Nhảy dây', 'Đá cầu', 'Quay sợi dây vút qua chân nhảy nhịp đều giảm cân', 'Tập một mình hay nhiều người cùng nhảy đều được', 'Tâng quả cầu có cánh lông bằng mu bàn chân gót gối', 'Chơi vòng tròn ngoài sân trường giờ ra chơi'],
    ['Chụp ảnh selfie', 'Quay vlog', 'Giơ cam trước tạo dáng cười tươi đăng ngay story', 'Góc nghiêng thần thánh chỉnh filter mịn da', 'Kể chuyện dẫn dắt hành trình ăn chơi thành video dài', 'Hay nói câu chào các bạn đã quay trở lại kênh'],
    ['Netflix', 'Spotify', 'Cày phim bộ dài tập có phụ đề độ phân giải 4K', 'Cuối tuần trùm chăn xem nguyên mùa không chán', 'Nghe nhạc podcast danh sách phát cả ngày khi làm việc', 'Không có hình phim ảnh chỉ tập trung âm thanh'],
    ['Lego', 'Xếp hình Rubik', 'Lắp ghép hàng trăm mảnh nhựa thành lâu đài siêu xe', 'Đạp phải một mảnh nhỏ là thốn tận óc', 'Xoay sáu mặt khối vuông sao cho mỗi mặt đúng một màu', 'Cao thủ giải nhanh chỉ trong vài giây đồng hồ'],
    ['Tết Nguyên Đán', 'Lễ Giáng Sinh', 'Gói bánh nhận lì xì dọn nhà thăm họ hàng đầu năm', 'Hoa đào hoa mai pháo hoa giao thừa ấm cúng', 'Cây thông đèn nhấp nháy ông già mặc đồ đỏ phát quà', 'Trời se lạnh cuối năm vang nhạc Jingle Bells'],
    ['Đi phượt', 'Đi tour du lịch', 'Tự chạy xe máy đổ đèo khám phá cung đường bụi bặm', 'Tự do dừng chụp cảnh đẹp không gò bó giờ giấc', 'Có hướng dẫn viên lo sẵn xe khách sạn theo đoàn', 'Nhàn hạ lên xe xuống điểm chụp hình đúng lịch'],
    ['Bi-a', 'Bowling', 'Cầm cây cơ chọc bi vào lỗ trên bàn nỉ xanh', 'Nghe tiếng lách cách tính góc băng cực kỳ cân não', 'Ôm quả bóng nặng ném lăn trên sàn gỗ đổ hết pin', 'Xỏ đôi giày riêng của khu vui chơi để ném'],
    ['Hát xẩm', 'Cải lương', 'Nghệ thuật dân gian mộc mạc đàn nhị hát kể chuyện đời', 'Nghe mang đậm hồn quê Bắc Bộ xưa', 'Điệu vọng cổ mùi mẫn diễn tích tuồng sân khấu miền Nam', 'Ngân dài luyến láy sâu lắng dễ rơi nước mắt'],
    ['Đánh bài Tiến lên', 'Xì dách', 'Chặt heo tứ quý đôi thông ai hết trước là nhất', 'Sát phạt vui ngày lễ từng lá bài đánh theo vòng', 'Rút thêm bài sao cho tổng điểm gần hai mươi mốt nhất', 'Quá hai mươi mốt điểm là quắc thua ngay'],
  ]),
  ...pack('Đời sống', [
    ['Áo dài', 'Áo bà ba', 'Trang phục truyền thống thướt tha hai tà xẻ tà chụp Tết', 'Tôn dáng duyên dáng nữ sinh lễ cưới Việt Nam', 'Áo cổ tròn nút cài giản dị gắn với sông nước miền Tây', 'Mặc đi làm vườn chèo xuồng rất thoải mái'],
    ['Mưa rào', 'Bão lớn', 'Đổ xuống bất chợt chiều hè rồi tạnh nhanh có cầu vồng', 'Không khí dịu mát sau cơn mưa nhẹ', 'Gió giật mạnh cây đổ ngập đường phải đóng kín cửa', 'Theo dõi dự báo cấp gió tránh ra khỏi nhà'],
    ['Cơn buồn ngủ', 'Cơn đói bụng', 'Mắt díp lại ngáp ngắn ngáp dài sau bữa trưa', 'Chỉ muốn ngả lưng nhắm mắt mười lăm phút', 'Bụng réo ọc ọc tay chân bủn rủn mất sức', 'Nghĩ tới tô cơm hay ly trà sữa là chảy nước miếng'],
    ['Bình minh', 'Hoàng hôn', 'Mặt trời ló rạng phía đông trời sáng dần đón ngày mới', 'Sương sớm tinh khôi người dậy sớm mới ngắm được', 'Ánh nắng đỏ rực lặn dần phía tây cuối buổi chiều', 'Khoảnh khắc lãng mạn hay chụp ngược sáng trên cầu'],
    ['Nước mắm', 'Nước tương', 'Màu cánh gián vị đậm đà ủ từ cá biển mặn mà', 'Không thể thiếu trong mâm cơm gia đình Việt', 'Màu đen làm từ đậu nành ăn chay rất hợp', 'Hay chan cơm hoặc chấm đậu chiên dimsum'],
    ['Lì xì', 'Tiền lương', 'Phong bao đỏ may mắn trao tay dịp đầu xuân mới', 'Chúc nhau câu khỏe mạnh công danh nhận ngay tại chỗ', 'Chờ tin nhắn ting ting mỗi tháng sau bao ngày cày cuốc', 'Về tay một hôm xong trả hết tiền nhà tiền ăn'],
    ['Đám cưới', 'Sinh nhật', 'Cô dâu chú rể trao nhẫn mời tiệc họ hàng hai bên', 'Chuẩn bị thiệp hồng tiền mừng đi ăn cỗ lớn', 'Thổi nến cắt bánh kem nhận quà chúc tuổi mới', 'Tổ chức vui vẻ gọn nhẹ cùng nhóm bạn thân'],
    ['Tắc đường', 'Trễ giờ làm', 'Xe cộ nối đuôi nhích từng cen-ti-mét giờ tan tầm', 'Kẹt cứng ngã tư hít khói bấm còi inh ỏi', 'Chạy vội quẹt thẻ vân tay tim đập thình thịch', 'Sợ sếp nhìn đồng hồ nhắc nhở ngay cửa'],
    ['Cúp điện', 'Mất mạng Wi-Fi', 'Cả xóm tối om quạt đứng im nóng bức lục tìm đèn pin', 'Chờ điện lực khắc phục ngồi ra hiên hóng gió', 'Có đèn vẫn sáng nhưng không tải nổi tin nhắn video', 'Quay vòng loading phát cáu tắt router bật lại'],
    ['Học thuộc lòng', 'Học vẹt', 'Ghi nhớ kỹ kiến thức công thức chuẩn bị kiểm tra', 'Đọc đi đọc lại nhiều lần cho chắc chắn', 'Đọc làu làu nhưng hỏi hiểu gì không thì bó tay', 'Quên sạch sành sanh ngay sau khi bước ra khỏi phòng thi'],
    ['Mùa đông', 'Mùa thu', 'Lạnh buốt co ro áo phao khăn quàng chỉ muốn ôm chăn', 'Thở ra khói thích ăn đồ nướng lẩu nghi ngút', 'Trời se lạnh nắng vàng hanh lá rụng lãng mạn', 'Thời tiết dễ chịu nhất năm để đi dạo uống trà'],
    ['Nói dối', 'Nói đùa', 'Che giấu sự thật làm người khác hiểu sai vấn đề', 'Có thể gây mất lòng tin nếu bị phát hiện', 'Chọc cho mọi người cười vui rồi giải thích ngay', 'Không có ác ý chủ yếu tạo không khí hài hước'],
    ['Tình yêu', 'Tình bạn', 'Rung động ghen tuông nhớ nhung muốn gắn bó suốt đời', 'Thường có những buổi hẹn hò nắm tay lãng mạn', 'Vô tư thân thiết cà khịa thoải mái không ràng buộc', 'Giúp đỡ nhau vượt khó không cần danh phận đôi lứa'],
    ['Giấc mơ', 'Ác mộng', 'Cảnh tượng kỳ lạ hiện lên lúc đang ngủ say', 'Sáng dậy cố nhớ lại mà chẳng đầu chẳng đuôi', 'Cảm giác sợ hãi bị rượt đuổi giật mình tỉnh giấc giữa đêm', 'Tim đập nhanh toát mồ hôi không dám ngủ lại'],
    ['Tiết kiệm', 'Keo kiệt', 'Chi tiêu hợp lý để dành tiền cho tương lai phòng thân', 'Không mua đồ phung phí nhưng vẫn tử tế với bạn bè', 'Tính toán từng đồng không dám chi ngay cả cho bản thân', 'Đi ăn nhóm hay trốn trả tiền khiến mọi người ngại'],
    ['Bí mật', 'Tin đồn', 'Điều riêng tư giữ kín chỉ mình hoặc vài người tin tưởng biết', 'Lộ ra là coi như mất luôn lòng tin', 'Chuyện truyền tai chưa kiểm chứng lan khắp xóm nhanh như gió', 'Càng kể qua nhiều người càng thêm mắm dặm muối'],
    ['Thức khuya', 'Dậy sớm', 'Quá hai giờ sáng vẫn ôm điện thoại mắt thâm quầng', 'Hôm sau ngái ngủ lờ đờ cả buổi sáng', 'Năm giờ chuông reo đã bật dậy chạy bộ pha cà phê', 'Thói quen lành mạnh đón ngày mới nhiều năng lượng'],
    ['Ăn kiêng', 'Nhịn ăn sáng', 'Kiểm soát calo ăn nhiều rau ức gà để giữ dáng khỏe mạnh', 'Vẫn ăn đủ chất chỉ cắt giảm đường dầu mỡ', 'Vội quá bỏ bữa sáng dễ đau dạ dày tụt huyết áp', 'Trưa tới ăn bù gấp đôi lại càng mệt hơn'],
    ['Đèn đỏ', 'Vạch kẻ đường', 'Bắt buộc dừng xe lại chờ đủ giây mới được đi tiếp', 'Vượt qua là dễ bị phạt nặng cực kỳ nguy hiểm', 'Sơn trắng trên mặt đường dành cho người đi bộ băng qua', 'Thấy nó thì xe cộ phải giảm tốc nhường đường'],
    ['Bản đồ giấy', 'La bàn', 'Trải rộng khổ lớn tìm đường sông núi tên địa danh', 'Gấp lại hơi lỉnh kỉnh nhưng không sợ hết pin', 'Kim nam châm nhỏ chỉ đúng hướng Bắc Nam mọi nơi', 'Đi rừng lạc đường dùng kết hợp xác định phương hướng'],
  ]),
  ...pack('Công nghệ', [
    ['Điện thoại thông minh', 'Máy tính bảng', 'Nhét túi quần gọi điện nhắn tin màn hình nhỏ gọn', 'Đi đâu cũng cầm kè kè bấm suốt ngày', 'Màn hình to xem phim vẽ vời đọc tài liệu rất đã', 'Nhét túi quần không vừa phải cho vào túi xách'],
    ['Laptop', 'Máy tính bàn', 'Gập lại mang ra quán cà phê chạy deadline linh hoạt', 'Có sẵn pin bàn phím touchpad liền thân', 'Cắm dây cố định màn hình lớn tản nhiệt khỏe cày game', 'Cúp điện một phát là tắt phụt nếu không có lưu điện'],
    ['Tai nghe không dây', 'Loa Bluetooth', 'Đeo gọn hai bên tai nghe riêng tư trên xe buýt đi học', 'Có hộp sạc nhỏ xinh nhét gọn lòng bàn tay', 'Phát nhạc âm lượng lớn cho cả nhóm quẩy chung tiệc', 'Đặt giữa phòng vang âm bass ầm ầm'],
    ['Chuột máy tính', 'Touchpad', 'Cầm vừa tay rê trên lót chuột click cực nhanh chơi game', 'Có con lăn cuộn trang rất mượt', 'Bàn rê cảm ứng tích hợp sẵn dưới bàn phím laptop', 'Chữa cháy khi quên mang phụ kiện rời'],
    ['Mạng Wi-Fi', 'Mạng 4G/5G', 'Bắt sóng từ cục phát cố định ở nhà hay quán xá không giới hạn', 'Quên mật khẩu là đi xin chủ quán', 'Gắn SIM nhà mạng ra đường vẫn vào mạng phà phà', 'Hết dung lượng tốc độ cao là quay như rùa'],
    ['USB', 'Ổ cứng di động', 'Nhỏ xíu như ngón tay móc chìa khóa chép file thuyết trình', 'Dung lượng vừa phải hay bị bỏ quên ở quán in', 'Hộp to nặng chứa cả terabyte phim ảnh sao lưu nặng', 'Cắm dây cáp riêng truyền dữ liệu dung lượng lớn'],
    ['ChatGPT', 'Google Search', 'Trò chuyện hỏi đáp viết code làm thơ như trợ lý ảo', 'Trả lời tổng hợp thành đoạn văn ngay lập tức', 'Gõ từ khóa trả về hàng loạt trang web nguồn tự đọc chọn', 'Công cụ tìm đường tra cứu tin tức kinh điển nhất'],
    ['Mã QR', 'Mã vạch', 'Hình vuông chấm đen quét camera chuyển khoản kết bạn siêu nhanh', 'Dán đầy quầy thu ngân trà sữa quán ăn', 'Các sọc đứng dài ngắn in sau bao bì sản phẩm siêu thị', 'Thu ngân cầm máy chiếu tia đỏ quét tít tít tính tiền'],
    ['Mật khẩu', 'Vân tay', 'Gõ chuỗi ký tự chữ số bí mật để mở khóa tài khoản', 'Quên hoài phải bấm nút gửi mã khôi phục', 'Chạm đầu ngón tay một giây là mở khóa siêu tiện', 'Không cần nhớ dãy ký tự dài nhưng tay ướt hay lỗi'],
    ['Bluetooth', 'AirDrop', 'Kết nối không dây với tai nghe đồng hồ bàn phím loa', 'Bật lên ghép đôi thiết bị xung quanh', 'Bắn ảnh gốc tốc độ cao giữa điện thoại máy tính cùng hệ sinh thái', 'Không cần internet gửi vài chục ảnh chỉ mất vài giây'],
    ['Ảnh chụp màn hình', 'Tải ảnh về', 'Bấm tổ hợp nút lưu đúng những gì đang hiện trên máy', 'Hay dùng để lưu tin nhắn phốt hay bằng chứng nhanh', 'Nhấn giữ lưu file gốc sắc nét từ mạng về thư viện', 'Không dính thanh pin giờ giấc trên viền màn hình'],
    ['Cáp sạc', 'Củ sạc', 'Sợi dây dài nối truyền điện truyền dữ liệu hay bị gãy đầu', 'Hay quấn rối tung trong balo hoặc bị chó cắn đứt', 'Khối vuông cắm thẳng ổ điện chuyển dòng điện an toàn', 'Có loại công suất lớn hỗ trợ sạc siêu nhanh'],
    ['Smartwatch', 'Vòng tay đếm bước', 'Nghe gọi nhận thông báo màn hình đẹp như đồng hồ thật', 'Giá cao cài thêm được nhiều ứng dụng nhỏ', 'Nhẹ tênh pin cả tuần chủ yếu đo nhịp tim bước chân', 'Màn hình hẹp giá rẻ rất hợp tập thể dục'],
    ['Camera an ninh', 'Máy ảnh cơ', 'Treo góc nhà quan sát ghi hình 24/7 xem qua điện thoại', 'Phát hiện chuyển động chống trộm theo dõi thú cưng', 'Cầm tay thay ống kính bấm tách xóa phông nghệ thuật', 'Chuyên chụp chân dung phong cảnh độ nét cực cao'],
    ['Email', 'Tin nhắn SMS', 'Gửi thư công việc trang trọng đính kèm CV hợp đồng PDF', 'Có tiêu đề cc bcc lịch sự chuyên nghiệp', 'Tin nhắn ngắn theo số điện thoại tốn cước hoặc nhận mã OTP', 'Ít ai nhắn tâm sự dài trên đây nữa nhưng vẫn cần nhận code'],
    ['YouTube Shorts', 'Instagram Reels', 'Mục clip ngắn dọc nằm ngay trong ứng dụng xem video đỏ', 'Kéo xuống xem tiếp hết clip này tới clip khác', 'Clip ngắn nhiều filter đẹp nằm trong app mạng xã hội ảnh', 'Người trẻ hay đăng khoảnh khắc du lịch ăn uống bắt trend'],
    ['Pin tiểu', 'Pin điện thoại', 'Lắp vào điều khiển tivi đồ chơi hết thì vứt thay viên mới', 'Mua từng vỉ ngoài tiệm tạp hóa', 'Pin lithium liền khối sạc đi sạc lại hàng trăm lần', 'Chai pin thì phải mang ra tiệm tháo máy thay'],
    ['Máy in', 'Máy scan', 'Phun mực lên giấy trắng cho ra tài liệu bài tập hợp đồng', 'Hay kẹt giấy hết mực đúng lúc cần nộp gấp', 'Quét tờ giấy có sẵn đưa ngược thành file ảnh PDF vào máy', 'Không tốn giấy mới dùng để số hóa giấy tờ cũ'],
    ['Tivi thông minh', 'Máy chiếu', 'Màn hình lớn đặt phòng khách kết nối mạng xem đá bóng', 'Sáng rõ cả ban ngày điều khiển giọng nói tiện lợi', 'Chiếu hình khổng lồ lên tường trắng cảm giác như rạp phim', 'Phải tắt bớt đèn phòng tối mới nhìn rõ đẹp'],
    ['Trình duyệt Chrome', 'Ứng dụng Facebook', 'Dùng lướt đủ mọi trang web tìm kiếm mở hàng chục tab', 'Ăn RAM hơi mạnh nhưng tiện ích mở rộng cực nhiều', 'Vào xem bài đăng bạn bè bình luận kết bạn lướt bảng tin', 'Mỗi ngày mở ra lướt cả tiếng không hay'],
  ]),
  ...pack('Ẩm thực đường phố & Đồ uống', [
    ['Bánh tráng trộn', 'Bánh tráng nướng', 'Xé sợi trộn xoài bào rau răm khô bò muối tôm', 'Ngồi vỉa hè cổng trường nhai mỏi miệng cực cuốn', 'Nướng trên than hồng kẹp trứng cút hành phi giòn rụm', 'Người ta hay ví nó như pizza phiên bản Việt'],
    ['Trà đào cam sả', 'Trà vải hoa hồng', 'Vị thanh mát có mấy miếng đào giòn sần sật', 'Mở nắp ly là thấy mùi thơm dịu của sả', 'Có mấy trái vải trắng ngọt lịm ngâm trong ly', 'Uống mùa hè thơm thoảng hương hoa nhẹ nhàng'],
    ['Bún thịt nướng', 'Bánh hỏi thịt heo', 'Chan nước mắm tỏi ớt thêm đậu phộng mỡ hành', 'Thịt xiên nướng cháy cạnh thơm phức trên than', 'Từng miếng bột đan lưới mỏng xếp lớp đều tăm tắp', 'Ăn kèm heo quay da giòn cuốn bánh tráng rau sống'],
    ['Cá viên chiên', 'Bắp xào bơ', 'Xâu que chấm tương ớt đen đỏ trước cổng trường chiều tan học', 'Chiên phồng vàng ươm ăn kèm đậu bắp đậu hũ', 'Hạt ngô ngọt xào nóng cùng tép khô thơm nức mùi bơ', 'Múc từng hộp nhỏ xúc thìa ăn lúc trời se lạnh'],
    ['Cháo lòng', 'Cháo sườn', 'Ăn sáng nóng hổi rắc tiêu quẩy giòn thêm tiết gan dồi', 'Hay ăn kèm giá đỗ rau thơm gừng thái sợi', 'Cháo xay nhuyễn sánh mịn hợp cho người ốm và trẻ nhỏ', 'Đổ thêm ruốc thịt bông quẩy cắt khúc rất dễ nuốt'],
    ['Bánh cuốn nóng', 'Bánh giò', 'Tráng mỏng trên nồi hơi cuốn nhân mộc nhĩ thịt băm', 'Rắc hành phi ăn cùng chả lụa chấm nước mắm ấm', 'Gói lá chuối hình chóp nhọn bên ngoài bột dẻo mềm', 'Bóc lớp lá ra khói bốc nghi ngút nhân thịt ở giữa'],
    ['Sữa chua dẻo', 'Tàu hũ đá', 'Cắt khối vuông phủ bột ca cao hoặc trái cây xắt hạt lựu', 'Ăn dẻo mịn mát lạnh ít chảy nhanh như kem', 'Trân châu đường đen chan nước cốt dừa thơm béo', 'Thường múc bát nhỏ ăn tráng miệng buổi tối'],
    ['Xúc xích nướng đá', 'Nem chua rán', 'Nướng lăn trên sỏi đen nóng hổi quét sốt ớt cay nồng', 'Món ăn vặt hot trend vỏ hơi dai thơm mùi khói', 'Lớp vỏ chiên xù giòn rụm bên trong hồng nhạt mềm dai', 'Chấm tương ớt ngồi vỉa hè ăn mấy chục cái vẫn thèm'],
    ['Sinh tố bơ', 'Nước ép dưa hấu', 'Xay đặc sánh màu xanh nhạt thêm sữa đặc béo ngậy', 'Uống no căng bụng như ăn một bữa nhẹ giàu dinh dưỡng', 'Ép lấy nước trong màu đỏ tươi thanh mát giải nhiệt', 'Ít béo hầu như toàn nước ngọt dịu mùa nắng nóng'],
    ['Gà rán giòn', 'Khoai tây chiên', 'Lớp bột vảy giòn rụm cắn ngập răng thịt đùi mọng nước', 'Combo quen thuộc trong tiệm đồ ăn nhanh cuối tuần', 'Thái que dài vàng ươm rắc muối chấm tương cà', 'Bắt buộc phải có trên khay làm món ăn kèm'],
    ['Cơm lam', 'Gà nướng ống tre', 'Gạo nếp dẻo nướng trong ống nứa thơm mùi tre non', 'Tách lớp vỏ cháy đen ăn với muối vừng vùng cao', 'Thịt gà ướp lá mắc mật nướng trực tiếp trong lóng nứa', 'Chặt ống ra nước thịt ngọt thơm đặc sản Tây Nguyên'],
    ['Matcha đá xay', 'Bạc xỉu', 'Màu xanh lá của bột trà Nhật phủ kem tươi phía trên', 'Vị hơi chát nhẹ thơm dịu mùi trà xanh mát lạnh', 'Nhiều sữa đặc ít cà phê hợp người sợ say đắng', 'Ly hai ba tầng ngọt béo rất dễ uống'],
    ['Ốc hương xào bơ tỏi', 'Nghêu hấp sả', 'Vỏ lốm đốm nâu mùi thơm nức béo ngậy chấm bánh mì', 'Nhể từng con nhỏ mà giá hơi đau ví dân nhậu', 'Nước hấp ngọt thanh cay nhẹ vị ớt sả thơm lừng', 'Húp nước trong vỏ nóng hổi cực kỳ giải cảm'],
    ['Bò kho', 'Cà ri gà', 'Nước sốt sánh đỏ thơm hoa hồi quế hầm gân mềm rục', 'Chấm bánh mì giòn hoặc chan hủ tiếu buổi sáng', 'Màu vàng nghệ thơm nồng nước cốt dừa khoai lang bùi', 'Thường nấu nồi lớn đãi khách dịp giỗ tiệc miền Tây'],
    ['Mì quảng', 'Cao lầu', 'Sợi vàng to bản nước dùng xăm xắp ăn cùng bánh đa', 'Đĩa rau sống chuối bào kèm con tôm quả trứng cút', 'Sợi mì dai sậm màu ăn với thịt xá xíu da heo chiên giòn', 'Đặc sản gắn liền phố cổ có nguồn nước giếng riêng'],
    ['Bánh đa cua', 'Bún riêu cua', 'Sợi dẹt màu nâu sẫm chả lá lốt đặc sản đất Cảng', 'Có gạch cua rau muống chần thêm chút giấm bỗng', 'Sợi trắng tròn nước dùng chua thanh cà chua đậu rán', 'Hay ăn kèm mắm tôm rau kinh giới thái nhỏ'],
    ['Chè khúc bạch', 'Chè trôi nước', 'Những viên thạch sữa béo cắt vuông ngâm nước đường nhãn', 'Rắc hạnh nhân lát rang thơm mát thanh dịu', 'Viên bột nếp tròn dẻo nhân đậu xanh chan nước gừng nóng', 'Thường nấu cúng rằm hay ăn lúc trời mưa lạnh'],
    ['Bò lá lốt', 'Chả cá Lã Vọng', 'Cuốn thịt băm trong lá xanh nướng trên bếp than thơm nức', 'Cuốn bánh tráng bún rau chấm mắm nêm đậm đà', 'Phi lê cá ướp nghệ chiên ngập chảo cùng thì là hành lá', 'Ăn nóng tại bàn kèm bún rối lạc rang mắm tôm'],
    ['Bánh tiêu', 'Bánh quẩy', 'Bột chiên phồng rỗng ruột phủ mè trắng thơm lừng', 'Sáng hay kẹp thêm miếng bánh bò xốp ngọt ở giữa', 'Bột xoắn đôi chiên vàng ăn kèm cháo nóng phở bò', 'Xé nhúng nước dùng hút xì xụp rất đã'],
    ['Cút lộn xào me', 'Bạch tuộc nướng sa tế', 'Trứng nhỏ xào sốt chua ngọt rắc rau răm đậu phộng', 'Gõ nhẹ vỏ ăn hàng xóm túm tụm tối khuya', 'Râu giòn sần sật ướp ớt đỏ nướng xèo xèo trên vỉ', 'Chấm muối ớt xanh cay xè lưỡi bên vỉa hè'],
  ]),
  ...pack('Thể thao & Sức khỏe', [
    ['Quần vợt', 'Bóng chuyền', 'Cầm vợt vung tay đánh trái banh nỉ qua lưới sân cứng', 'Hay thấy tay vợt hét lớn khi giao bóng tốc độ cao', 'Đội sáu người chuyền đập bóng bằng tay không qua lưới cao', 'Có pha cứu bóng bay người chạm sát mặt sân'],
    ['Yoga', 'Tập tạ Gym', 'Kéo giãn cơ thể hít thở sâu giữ thăng bằng trên thảm', 'Phòng tập yên tĩnh nhạc thiền giúp dẻo dai bớt đau lưng', 'Nâng thanh đòn nặng đổ mồ hôi đầm đìa trước gương', 'Mục tiêu tăng cơ săn chắc rõ từng nhóm cơ bắp'],
    ['Đạp xe', 'Leo núi', 'Chân đạp pê-đan lướt gió trên cung đường bằng hoặc dốc', 'Mang bình nước nón bảo hiểm chuyên dụng dọc bờ hồ', 'Bám vách đá mang balo chinh phục đỉnh cao sương mù', 'Cảm giác vỡ òa khi chạm mốc đỉnh trong mây'],
    ['Nhảy xa', 'Nhảy cao', 'Chạy đà hết tốc lực rồi bật người bay xuống hố cát', 'Thước đo tính từ ván giậm nhảy tới vết chạm cát gần nhất', 'Chạy vòng cung bật ngửa lưng vượt qua thanh xà ngang', 'Thanh xà không rơi xuống là tính thành công'],
    ['Trượt băng nghệ thuật', 'Trượt ván', 'Mang giày lưỡi thép xoay nhiều vòng uyển chuyển trên mặt băng', 'Diễn viên mặc trang phục lấp lánh biểu diễn theo nhạc', 'Đứng trên tấm ván bốn bánh lướt phố bốc đầu bay qua bậc thang', 'Thường chơi ở quảng trường hoặc công viên bê tông'],
    ['Cử tạ', 'Đấu vật', 'Một mình gồng hết sức giật và đẩy tạ sắt qua đầu', 'Đếm cân nặng từng kilogram thi đấu trên bục gỗ', 'Hai võ sĩ ôm ghì quật ngã khóa đè vai đối thủ xuống thảm', 'Thi đấu đối kháng trực tiếp theo hạng cân trên sàn'],
    ['Boxing', 'Karate', 'Đeo đôi găng dày to đấm né linh hoạt trong võ đài dây', 'Chỉ dùng tay ra đòn tuyệt đối không dùng chân đá', 'Mặc võ phục trắng thắt đai màu vừa đấm vừa tung cú đá', 'Luyện quyền bài bản và hô lớn dứt khoát khi ra đòn'],
    ['Bắn cung', 'Ném phi tiêu', 'Kéo căng dây cung ngắm mục tiêu cách xa hàng chục mét', 'Phải nín thở giữ tay thật vững trước khi buông mũi tên', 'Phóng từng mũi nhỏ bằng tay vào bảng tròn treo tường quán pub', 'Tính điểm từng vòng đồng tâm nhỏ xíu ngay trước mặt'],
    ['Chèo thuyền Kayak', 'Lướt sóng', 'Ngồi khoang nhỏ hẹp dùng mái chèo hai đầu khua nước vượt ghềnh', 'Áo phao buộc chặt mặc khi qua dòng sông chảy xiết', 'Đứng thăng bằng trên tấm ván lao theo ngọn sóng biển lớn', 'Phải chớp đúng khoảnh khắc con sóng cuốn lên cao'],
    ['Golf', 'Bóng chày', 'Dùng gậy gạt bóng nhỏ xíu rơi trúng lỗ trên bãi cỏ rộng', 'Môn thể thao yên tĩnh cần tính kiên nhẫn chuẩn từng cú vung', 'Cầu thủ cầm gậy đập mạnh quả bóng bay xa rồi chạy bốn chốt', 'Đội phòng thủ đeo găng bắt bóng sống cực nhanh'],
    ['Ngủ trưa', 'Thiền định', 'Nhắm mắt chợp mắt hai mươi phút cho tỉnh táo buổi chiều', 'Kéo rèm tắt đèn văn phòng tránh mệt mỏi đầu óc', 'Ngồi xếp bằng giữ lưng thẳng tập trung đếm nhịp thở', 'Không nằm ngủ mà rèn sự tĩnh lặng giữa tâm trí'],
    ['Đo huyết áp', 'Thử thị lực', 'Quấn vòng bít quanh bắp tay máy bơm chặt rồi xả ra đọc số', 'Xem chỉ số tâm thu tâm trương phòng cao huyết áp', 'Che một bên mắt đọc bảng chữ cái to nhỏ dần từ xa', 'Kiểm tra cận loạn trước khi cắt kính mới'],
    ['Châm cứu', 'Xoa bóp bấm huyệt', 'Dùng kim mảnh châm đúng huyệt đạo giúp lưu thông khí huyết', 'Nhìn hơi rợn người nhưng giảm đau mỏi cổ vai gáy', 'Thầy thuốc dùng lực ngón tay day ấn dọc lưng thư giãn cơ', 'Không dùng kim nên ít ai sợ đau'],
    ['Vitamin C', 'Nước điện giải', 'Vị chua ngọt viên sủi cam uống buổi sáng tăng sức đề kháng', 'Giúp nhanh lành vết thương đỡ chảy máu chân răng', 'Bù muối khoáng tức thì sau khi chạy bộ đổ mồ hôi nhiều', 'Hay uống lúc bị mất nước tiêu chảy sốt cao'],
    ['Nhổ răng khôn', 'Lấy cao răng', 'Tiểu phẫu rạch lợi nghe tiếng kìm bẩy xong sưng một bên má', 'Ăn cháo nguội mấy ngày kiêng đồ cứng đồ cay', 'Đầu máy rung nhẹ phun tia nước làm sạch mảng bám quanh nướu', 'Xong rất nhanh chỉ hơi ê nhẹ chứ không đau sưng'],
    ['Đi bộ', 'Chạy nước rút', 'Sải bước nhẹ nhàng nói chuyện thoải mái quanh công viên', 'Hầu như ai cũng duy trì được cả tiếng không hụt hơi', 'Bứt tốc hết cỡ trong vài chục mét tim đập thình thịch', 'Dốc toàn bộ sức lực trong mười mấy giây ngắn ngủi'],
    ['Sốt xuất huyết', 'Cảm cúm thông thường', 'Sốt cao đột ngột nổi ban đỏ giảm tiểu cầu dễ mệt lả', 'Truyền từ vết đốt ban đêm phải theo dõi sát bác sĩ', 'Sổ mũi hắt hơi đau họng nhẹ uống nghỉ vài hôm là khỏi', 'Lây qua đường hô hấp khi thời tiết giao mùa'],
    ['Đánh cầu mây', 'Nhảy sạp', 'Đá trái cầu đan bằng mây qua lưới cao có cú tung người lộn vòng', 'Môn thế mạnh của Đông Nam Á với những pha móc chân điêu luyện', 'Bước chân nhảy nhịp nhàng tránh bị kẹp giữa hai thanh tre gõ', 'Điệu múa vui nhộn đặc trưng lễ hội Tây Bắc'],
    ['Chống đẩy', 'Đu xà đơn', 'Úp sấp mặt sàn gập duỗi hai cánh tay nâng cả thân người', 'Bài tập cơ ngực tay sau làm được ở bất kỳ đâu', 'Hai tay nắm thanh ngang treo lơ lửng kéo cằm vượt qua thanh', 'Tập lưng xô và giúp kéo giãn cột sống hiệu quả'],
    ['Khám tổng quát', 'Hiến máu tình nguyện', 'Xét nghiệm máu siêu âm chụp phim kiểm tra sức khỏe định kỳ', 'Thường phải nhịn ăn sáng từ đêm trước khi đi kiểm tra', 'Lấy một túi máu trao tặng kèm phần bánh sữa giấy chứng nhận', 'Sau khi xong được dặn nghỉ tại chỗ uống nước đường'],
  ]),
  ...pack('Học đường & Văn phòng', [
    ['Bài kiểm tra 15 phút', 'Thi học kỳ', 'Bất chợt đầu tiết thầy cô bảo cất hết sách vở lấy giấy đôi', 'Làm nhanh gọn trong nửa đầu tiết rồi tiếp tục học bài mới', 'Cả tháng trước ôn tập thức đêm lịch thi dán kín phòng', 'Điểm số nhân hệ số cao quyết định kết quả cả kỳ'],
    ['Chép phao', 'Hỏi bài bạn bên cạnh', 'Viết chữ li ti ra mảnh giấy giấu kỹ dưới gầm bàn ngăn cặp', 'Tim đập thình thịch mỗi lần giám thị đi lướt ngang', 'Nháy mắt thì thầm liếc nhẹ sang tờ giấy bàn kế bên', 'Không cần chuẩn bị sẵn nhưng dễ bị nhắc ngồi thẳng'],
    ['Nghỉ hè', 'Nghỉ Tết', 'Ba tháng dài đóng sách đi chơi về quê nóng rực tiếng ve kêu', 'Chia tay bạn bè lưu bút chờ lên lớp mới cuối năm', 'Chỉ nghỉ khoảng một hai tuần nhưng được mặc đồ mới nhận bao đỏ', 'Trời se lạnh dọn nhà chuẩn bị mâm cỗ đoàn viên'],
    ['Họp phụ huynh', 'Bế giảng năm học', 'Ba mẹ lên trường nghe cô chủ nhiệm báo điểm rồi về nhà xử lý', 'Hôm đó cả lớp hồi hộp ngồi đợi tin nhắn ở nhà', 'Sân trường rợp cờ hoa nhận giấy khen chụp ảnh chia tay', 'Không khí rộn ràng chuẩn bị bước vào kỳ nghỉ dài'],
    ['Hồ sơ xin việc CV', 'Đơn xin nghỉ phép', 'Liệt kê kinh nghiệm học vấn gửi nhà tuyển dụng mong được gọi phỏng vấn', 'Trình bày sạch đẹp xuất file PDF gửi kèm thư giới thiệu', 'Viết ngắn gọn trình bày lý do ốm hoặc việc nhà xin vắng mặt', 'Gửi sếp duyệt trước khi tắt chuông ngủ nướng'],
    ['Chạy deadline', 'Tăng ca OT', 'Nhìn đồng hồ đếm ngược tới nửa đêm gõ phím điên cuồng cho kịp nộp', 'Cà phê đặc uống liền tay mắt dán chặt thanh tiến độ', 'Ở lại văn phòng tới tối muộn giải quyết việc tính thêm lương giờ', 'Chờ đồng nghiệp về hết vẫn còn ánh đèn góc bàn'],
    ['Họp trực tuyến Zoom', 'Thuyết trình trước lớp', 'Bật cam ngồi trước màn hình nhiều ô vuông dễ lén mặc quần đùi', 'Hay nghe câu anh chị ơi tắt mic dùm em nói bị vọng', 'Đứng trên bục giảng vừa chiếu slide vừa nhìn ánh mắt cả lớp', 'Run tay cầm micro sợ thầy cô hỏi vặn câu cuối'],
    ['Bảng điểm', 'Giấy khen', 'Liệt kê chi tiết con số từng môn nhìn vào là thấy môn nào kéo tụt', 'Có thể khiến mặt tái mét nếu trượt chuẩn học bổng', 'Tờ giấy đóng khung có dấu đỏ vinh danh thành tích xuất sắc', 'Ba mẹ hay treo trang trọng ngay phòng khách'],
    ['Đồng phục thể dục', 'Áo dài trắng đồng phục', 'Quần rộng áo thun thoáng mát mặc những hôm chạy sân nắng', 'Thoải mái chạy nhảy đá cầu không sợ nhăn nhàu', 'Trang phục thướt tha mặc đầu tuần chào cờ rất dễ vướng xích xe', 'Trời mưa đi học về gấu quần áo hay dính vệt bùn'],
    ['Lương tháng 13', 'Thưởng nóng doanh số', 'Khoản tiền mong chờ nhất mỗi dịp cuối năm để sắm Tết', 'Thường cộng đều dựa theo số tháng gắn bó cả năm qua', 'Sếp thưởng liền tay ngay lúc vừa chốt được hợp đồng lớn', 'Nhận bất ngờ giữa tháng khiến cả nhóm kéo nhau đi liên hoan'],
    ['Sổ đầu bài', 'Thẻ sinh viên', 'Cuốn sổ đặt góc bàn giáo viên ghi tên học sinh mất trật tự', 'Ai bị ghi tên vào cuối tuần thế nào cũng đứng trước cờ', 'Tấm thẻ nhựa có ảnh đeo dây quẹt vào thư viện thi cử', 'Mất thẻ này là khỏi mượn sách hay thi cuối kỳ'],
    ['Phòng thí nghiệm', 'Phòng tin học', 'Mặc áo choàng kính bảo hộ ngửi mùi hóa chất ống nghiệm thủy tinh', 'Đo nồng độ đun nóng quan sát đổi màu dung dịch', 'Hàng chục màn hình xếp dãy bắt buộc đi dép riêng phòng bụi', 'Thầy bấm khóa máy chiếu cả lớp hết trộm mở game'],
    ['Gọt bút chì', 'Bút xóa nước', 'Xoay đầu gỗ làm rơi từng dải vỏ mỏng thơm mùi gỗ tuyết tùng', 'Chẳng may gãy ngòi lại phải vặn thêm mấy vòng mới viết tiếp', 'Lắc lắc kêu lạch cạch rồi chấm mực trắng che dòng viết sai', 'Chờ mấy giây cho khô mặt giấy mới đè chữ mới lên'],
    ['Ký túc xá', 'Phòng trọ sinh viên', 'Giờ giới nghiêm đóng cổng tối giường tầng ở chung đông vui', 'Điện nước rẻ bất ngờ nhưng thiếu không gian riêng tư', 'Tự thuê nhà dân nấu ăn thoải mái giờ giấc đi về không ai cấm', 'Cuối tháng tự tính tiền điện nước cao ngất mỗi mùa nóng'],
    ['Thực tập sinh', 'Nhân viên chính thức', 'Mới chân ướt chân ráo làm quen việc lương hỗ trợ đôi khi không lương', 'Ghi chép từng li từng tí mong hết kỳ được giữ lại', 'Qua thử việc đóng bảo hiểm đầy đủ hưởng nguyên lương thưởng', 'Có tiếng nói hơn trong cuộc họp nhóm hằng tuần'],
    ['Cặp lồng cơm trưa', 'Đặt cơm hộp văn phòng', 'Mang sẵn đồ nấu ở nhà vừa sạch vừa tiết kiệm tiền mỗi trưa', 'Mở nắp hâm nóng lò vi sóng thơm lừng cả phòng ăn', 'Cả nhóm lướt app chọn quán giảm giá đặt giao tới sảnh tòa nhà', 'Tốn tiền hơn chút nhưng đổi món mỗi ngày không cần rửa hộp'],
    ['Bảng đen phấn trắng', 'Bảng trắng bút lông', 'Viết xong gõ giẻ lau bụi bay mù mịt lên bục đầu bàn', 'Thỉnh thoảng gãy khúc phấn kêu rít rít rợn gai ốc', 'Viết bằng mực mùi cồn xóa sạch bằng bông lau rất ít bụi', 'Quên đóng nắp một lúc là đầu ngòi khô queo hết mực'],
    ['Giờ ra chơi', 'Giờ tan học', 'Chuông reo mười lăm phút ùa xuống căn tin mua bánh tráng đá cầu', 'Tranh thủ chép vội nốt bài tập trước khi chuông vào lớp', 'Xách cặp ào ra cổng gặp phụ huynh hoặc rủ nhau đi trà sữa', 'Kết thúc một ngày dài không còn tiết nào phía sau'],
    ['Khóa luận tốt nghiệp', 'Bài tập nhóm', 'Đề tài dày hàng trăm trang làm suốt mấy tháng bảo vệ trước hội đồng', 'In bìa cứng mạ chữ vàng quyết định tấm bằng ra trường', 'Chia phần cho bốn năm bạn nhưng thường một hai người gánh hết', 'Sắp tới hạn nộp mới réo tên từng đứa trong nhóm chat'],
    ['Thước kẻ', 'Compa', 'Thanh nhựa thẳng chia vạch mi-li-mét để gạch chân kẻ bảng', 'Thỉnh thoảng học sinh lén lấy gõ nhịp trên mặt bàn', 'Hai chân kim nhọn một đầu gắn chì quay thành hình tròn chuẩn', 'Hay bỏ trong hộp dụng cụ hình học môn toán'],
  ]),
  ...pack('Mạng xã hội & Gen Z', [
    ['Livestream bán hàng', 'Review quán ăn', 'Bật đèn vòng đọc bình luận giơ váy áo chốt mã giảm giá', 'Mỗi lần nói lớn chốt đơn người xem lại thả tim lia lịa', 'Quay cận cảnh món dọn trên bàn nhận xét ngon dở giá tiền', 'Đăng clip gắn vị trí khiến quán hôm sau xếp hàng dài'],
    ['Thả thính', 'Block thẳng tay', 'Nhắn tin ngọt ngào đăng status ẩn ý cho ai kia tự hiểu', 'Tung câu mồi nhẹ xem đối phương có bật đèn xanh không', 'Chặn vĩnh viễn không thấy tin nhắn bình luận trang cá nhân nữa', 'Dứt khoát cắt liên lạc ngay khi hết duyên hoặc gặp biến'],
    ['Flex nhẹ', 'Than nghèo kể khổ', 'Chụp ảnh góc đồng hồ vô lăng kèm câu caption giả bộ khiêm tốn', 'Cố tình để lộ hóa đơn hay nhà đẹp trong khung hình', 'Lương về mấy chục triệu nhưng mở miệng là kêu hết tiền ăn mì', 'Hay thả bình luận xin vía hoặc đòi lì xì giữa đám bạn'],
    ['Lót dép hóng drama', 'Tạo content bắt trend', 'Ngồi yên cầm điện thoại kéo bình luận đọc từng ảnh chụp phốt', 'Đêm khuya mắt vẫn sáng rực hóng tập tiếp theo chưa ngủ', 'Nhảy múa quay theo nhạc hot mới nổi để kéo lượt xem kênh', 'Thấy âm thanh nào viral là dựng clip theo ngay trong ngày'],
    ['Check-in sống ảo', 'Chụp ảnh thẻ', 'Tạo đủ trăm dáng ở góc quán đẹp chọn lọc cả tiếng mới đăng một tấm', 'Chỉnh màu xóa người phía sau cho bức hình thật nghệ', 'Ngồi thẳng lưng nhìn thẳng ống kính không cười vén tóc rõ hai tai', 'Mặt nghiêm nghị phông xanh trắng in kèm hồ sơ giấy tờ'],
    ['Gửi meme hài', 'Nhắn toàn văn dài lê thê', 'Trả lời tin nhắn bằng tấm ảnh chế biểu cảm cực lầy khỏi cần gõ chữ', 'Mỗi tình huống trong nhóm đều có ảnh đúng tâm trạng', 'Viết một mạch cả ngàn chữ kể rành rọt từng chi tiết đầu đuôi', 'Người đọc mở khung chat thấy màn hình kín đặc chữ là choáng'],
    ['Spam tin nhắn', 'Seen không rep', 'Gõ từng chữ một bấm gửi liên tục làm điện thoại rung như động đất', 'Hối bạn dậy đi chơi bằng mười lăm tin nhắn gọi tên', 'Hiện đã xem xong lặng im mất hút cả ngày trời không trả lời', 'Gây ức chế nhất cho người đang ngóng chờ kết quả'],
    ['Avatar mặc định', 'Tài khoản clone', 'Hình người xám trơn chưa thèm đổi ảnh đại diện từ lúc tạo nick', 'Nhìn vào dễ tưởng tài khoản ít dùng hoặc mới lập', 'Nick phụ không tên thật chuyên đi soi story hoặc bình luận dạo', 'Rất hiếm khi kết bạn với người quen ngoài đời'],
    ['Flash sale nửa đêm', 'Đặt hàng COD', 'Canh đúng 0 giờ bấm nút mua nhanh kẻo hết mã giảm giá sốc', 'Thức tới khuya mắt díu chỉ chờ giỏ hàng nhảy giá rẻ', 'Chọn thanh toán tiền mặt khi anh giao hàng mang tới tận cửa', 'Hôm nào quên mang tiền mặt là chạy vội đi chuyển khoản'],
    ['Podcast tâm sự', 'Nhạc remix quẩy', 'Giọng nói trầm ấm trò chuyện chia sẻ bài học cuộc sống chữa lành', 'Nghe trước khi đi ngủ hoặc lúc lái xe một mình yên tĩnh', 'Nhịp bass dập căng cực mạnh đẩy năng lượng tỉnh ngủ ngay lập tức', 'Nghe trong quán cà phê đêm hay lúc dọn nhà cho hăng'],
    ['Gacha quay thưởng', 'Cày rank xếp hạng', 'Tích vé hoặc kim cương bấm quay cầu nguyện ra nhân vật hiếm', 'Lần nào lệch tỷ lệ vàng cũng ôm mặt tiếc đứt ruột', 'Căng não từng trận thắng lên sao thua tụt bậc tức nổ đom đóm', 'Bạn bè rủ ghép đội leo bậc xuyên đêm cuối tuần'],
    ['Sticker chat', 'Icon cảm xúc nhỏ', 'Hình vẽ nhân vật ngộ nghĩnh kích thước to biểu cảm động đậy', 'Thả một cái chiếm nửa màn hình khung trò chuyện', 'Biểu tượng mặt cười tim lửa nhỏ xíu gắn ngay cuối câu chữ', 'Dùng nhanh ngay bàn phím hoặc thả tương tác thẳng vào tin nhắn'],
    ['Cài báo thức chục cái', 'Bật chế độ không làm phiền', 'Đặt cách nhau từng năm phút từ sáu giờ rưỡi tới bảy giờ hơn', 'Chuông reo liên hồi nhưng vẫn tắt nhắm mắt ngủ tiếp', 'Tắt toàn bộ chuông thông báo cuộc gọi khi cần tập trung hoặc ngủ', 'Ai gọi khẩn cấp cũng thấy im re không rung chút nào'],
    ['Bình chọn poll nhóm', 'Ghim tin nhắn đầu nhóm', 'Tạo danh sách nhiều lựa chọn để cả hội bấm chọn quán ăn giờ hẹn', 'Nhìn số phiếu biết ngay kèo có thành hay hủy', 'Cố định nội dung quan trọng số tài khoản lịch trình lên đầu chat', 'Ai vào sau cũng bấm một chạm là xem được ngay'],
    ['Tag tên @mọi người', 'Nhắn riêng inbox', 'Kêu réo toàn bộ thành viên trong nhóm khiến điện thoại ai cũng báo', 'Thường dùng lúc báo kèo gấp hoặc thu tiền quỹ lớp', 'Mở khung trò chuyện hai người kín đáo không cho cả xóm đọc ké', 'Chuyện tế nhị hay bí mật mới đem vào đây nói nhỏ'],
    ['Kính lọc làm đẹp filter', 'Chế độ camera thường', 'Lên ảnh da láng mịn mắt to má hồng tự nhiên không cần trang điểm', 'Quay video đổi luôn kiểu tóc đeo thêm tai mèo vui nhộn', 'Chụp chân thực từng lỗ chân lông vết thâm ánh sáng thực tế', 'Ít ai dám dùng chụp cận mặt khi chưa chỉnh ánh sáng'],
    ['Sạc ngược không dây', 'Cắm sạc dự phòng công cộng', 'Đặt lưng hai chiếc điện thoại áp vào nhau chia sẻ vài phần trăm pin', 'Cứu nguy giữa buổi tụ tập khi một máy gần sập nguồn', 'Tìm trạm cho thuê ngoài trung tâm thương mại quét mã lấy cục pin', 'Dùng xong mang trả lại trạm khác tính tiền theo giờ'],
    ['Đăng story 24 giờ', 'Viết bài ghim tường', 'Ảnh video ngắn tự biến mất sau đúng một ngày không lưu trên trang chính', 'Thích hợp đăng khoảnh khắc ngẫu hứng ăn uống đi đường', 'Bài đăng dài kèm album ảnh nằm vĩnh viễn ai vào trang cũng thấy', 'Lưu lại kỷ niệm lớn đám cưới tốt nghiệp hay chuyến đi dài'],
    ['Hủy kết bạn', 'Ẩn nhật ký người lạ', 'Cắt đứt luôn khỏi danh sách bạn bè muốn liên hệ phải gửi lời mời lại', 'Không thấy bài viết riêng tư lẫn danh sách chia sẻ bạn bè', 'Vẫn giữ kết bạn lịch sự nhưng chặn người kia xem bài mình đăng', 'Tránh phiền phức với đồng nghiệp cũ hoặc họ hàng hay soi'],
    ['Nghe nhạc tốc độ x2', 'Bật phụ đề song ngữ', 'Tăng tốc giọng nói cho qua nhanh đoạn dài tiết kiệm thời gian', 'Nghe quen rồi quay lại tốc độ thường thấy nói chậm rì', 'Hiện cả tiếng Việt lẫn tiếng nước ngoài chạy phía dưới màn hình', 'Vừa giải trí xem phim vừa học thêm từ vựng mới'],
  ]),
  ...pack('Lễ hội & Văn hóa Việt', [
    ['Múa lân sư rồng', 'Bắn pháo hoa', 'Tiếng trống thùng thình ông Địa cầm quạt dẫn đoàn nhảy bục cao', 'Hay diễn trước cửa hàng khai trương và đêm hội rằm trăng tròn', 'Ánh sáng rực rỡ nở bung thành bông hoa lửa giữa bầu trời đêm', 'Cả đám đông ngửa cổ đếm ngược khoảnh khắc chuyển giao'],
    ['Mâm ngũ quả', 'Cây nêu ngày Tết', 'Bày năm loại trái nhiều màu trên bàn thờ gia tiên cuối năm', 'Miền Nam hay chọn mãng cầu dừa đủ xoài gửi gắm ước mong', 'Dựng cây tre cao vút trước sân treo khánh đất lá dứa trừ tà', 'Thường thấy ở sân đình làng quê truyền thống dịp đầu xuân'],
    ['Đèn ông sao', 'Mặt nạ giấy bồi', 'Khung tre bọc giấy bóng kính đỏ vàng có nến sáng giữa đêm trăng', 'Trẻ con cầm đi rước quanh xóm hát vang đêm rằm tháng tám', 'Sơn vẽ hình chú Tễu Chí Phèo Tôn Ngộ Không cứng cáp màu tươi', 'Đeo trước mặt đi hội rằm nghe mùi hồ dán giấy thân quen'],
    ['Áo tứ thân', 'Nón quai thao', 'Trang phục cổ truyền miền Bắc gồm nhiều vạt kết hợp thắt lưng dải lụa', 'Hay thấy liền chị liền anh mặc hát quan họ trên thuyền', 'Chiếc vành rộng phẳng bản to kèm dải tua rua mềm mại dưới cằm', 'Đội che nắng kết hợp làm đạo cụ múa hát dân ca Kinh Bắc'],
    ['Tò he', 'Tranh Đông Hồ', 'Bột gạo pha màu nặn thành Tôn Ngộ Không bông hoa cắm trên que tre', 'Món đồ chơi dân gian sắc màu trẻ em hay xin mua ở hội chợ', 'In mộc bản trên giấy điệp lấp lánh vẽ đàn gà lợn đám cưới chuột', 'Nét vẽ dân gian mộc mạc treo trang trí trong nhà dịp đầu năm'],
    ['Đua thuyền rồng', 'Đấu vật lễ hội', 'Chục tay chèo ngồi thành hàng nhịp trống dồn dập rẽ sóng về đích', 'Lễ hội sông nước náo nhiệt cổ vũ rợp hai bên bờ', 'Hai đô vật đóng khố cởi trần so sức trên sới đất tròn giữa sân đình', 'Khán giả vây kín reo hò khi một người bị nhấc bổng chân khỏi đất'],
    ['Cồng chiêng Tây Nguyên', 'Đàn bầu', 'Bộ nhạc cụ đồng vang vọng giữa núi rừng quanh ánh lửa nhà rông', 'Đánh thành dàn nhiều người hòa âm nhịp điệu sử thi hùng tráng', 'Nhạc cụ dân tộc Việt chỉ có duy nhất một dây mà ngân nga da diết', 'Tay gảy que tre tay kia uốn cần tạo tiếng ngân buồn man mác'],
    ['Hội Lim', 'Lễ hội Chùa Hương', 'Hát đối đáp giao duyên trên đồi và thuyền rồng đất Bắc Ninh', 'Trai thanh nữ tú mời trầu cánh phượng ngọt ngào thắm đượm', 'Ngồi đò suối Yến rồi leo núi vào động hành hương cầu an đầu năm', 'Khách thập phương tấp nập đi từ sáng sớm mờ sương tháng giêng'],
    ['Múa rối nước', 'Hát tuồng cổ', 'Nghệ nhân đứng sau buồng trò ngập nước điều khiển chú Tễu bằng sào dây', 'Sân khấu thủy đình lấp lánh pháo hoa khói nước truyền thống', 'Diễn viên vẽ mặt đậm rực rỡ mặc giáp mão bước đi ước lệ oai phong', 'Tiếng trống chiến rộn rã kể tích lịch sử trung hiếu'],
    ['Xông đất đầu năm', 'Tảo mộ cuối năm', 'Vị khách hợp tuổi bước chân đầu tiên vào nhà sau giao thừa', 'Chủ nhà rất coi trọng chọn người xởi lởi mang lộc may mắn', 'Con cháu tụ họp phát cỏ quét dọn thắp hương phần mộ tổ tiên', 'Nghi thức sum họp tưởng nhớ cội nguồn những ngày cận Tết'],
    ['Gói bánh chưng bếp củi', 'Đi chợ hoa xuân', 'Cả nhà ngồi quây quần trông nồi luộc suốt đêm canh lửa kể chuyện', 'Sáng hôm sau vớt ra ép nặng cho ráo nước săn rền', 'Dạo giữa rừng quất mai đào chật kín đường phố giáp Tết', 'Trả giá chọn một chậu cây dáng đẹp chở sau yên xe máy về'],
    ['Cúng ông Công ông Táo', 'Cúng rằm tháng Bảy', 'Chuẩn bị mũ hài vàng mã thả cá chép vàng ra sông hồ ngày 23 chạp', 'Tin rằng cá hóa rồng đưa Táo quân lên chầu báo cáo cả năm', 'Thắp hương vu lan báo hiếu cha mẹ kết hợp cúng cô hồn cháo loãng', 'Nhiều nơi trẻ con xóm tụ tập đợi giật lộc vui rộn ràng'],
    ['Bánh trôi bánh chay', 'Chè đậu xanh hoa cau', 'Viên bột nếp nhân đường phèn luộc nổi lên mặt nước rồi vớt ra đĩa', 'Đặc trưng Tết Hàn Thực mùng ba tháng ba rắc thêm vừng rang', 'Hạt đậu vàng mềm quyện bột sắn dây sóng sánh mùi hoa bưởi', 'Thường nấu đĩa nhỏ trang trọng dâng cúng ngày giỗ chạp'],
    ['Ném còn', 'Kéo co', 'Quả vải nhiều màu buộc dải tua tung cao qua vòng tròn đỉnh cột tre', 'Trò chơi giao duyên hội xuân vùng núi phía Bắc cực vui', 'Hai đội nắm chặt sợi dây thừng dài gồng chân kéo qua vạch giữa sân', 'Khán giả gào khản cổ cổ vũ nhịp một hai ba hò dô'],
    ['Đình làng cây đa', 'Bến nước con đò', 'Nơi họp việc làng bóng mát rợp sân gạch cổ mái ngói cong rêu phong', 'Gắn liền ký ức giếng nước sân đình bao thế hệ miền quê Việt', 'Khúc sông lặng có bậc thang đá người dân ra giặt giũ chờ qua sông', 'Gợi cảm giác êm ả bình dị trong thơ ca quê hương'],
    ['Chùa Một Cột', 'Hồ Hoàn Kiếm', 'Kiến trúc gỗ độc đáo dựng trên một trụ đá giữa hồ như bông sen nở', 'Biểu tượng văn hóa nổi tiếng nằm giữa lòng thủ đô Hà Nội', 'Mặt nước xanh giữa phố cổ có tháp nhỏ giữa hồ và cầu đỏ cong cong', 'Buổi cuối tuần cấm xe thành phố đi bộ cực kỳ đông vui'],
    ['Làng gốm Bát Tràng', 'Làng nón Tây Hồ', 'Du khách tự tay xoay bàn xoay nặn đất sét rồi nung tô men nhiều màu', 'Ngõ nhỏ chất đầy bình lọ bát đĩa gốm sứ tinh xảo', 'Tỉ mỉ chuốt vành nứa xếp lá cọ trắng khâu từng mũi kim lồng bài thơ', 'Sản phẩm thủ công che nắng mưa dịu dàng nét truyền thống'],
    ['Trầu cau têm cánh phượng', 'Chè sen long nhãn', 'Miếng cau chẻ nhỏ gói gọn lá xanh thêm vôi chấm xuất hiện trong lễ ăn hỏi', 'Nghi thức truyền thống mở đầu câu chuyện cưới xin trân trọng', 'Hạt sen bùi lồng trong cùi nhãn ngọt giòn ngâm nước đường mát thanh', 'Món quà cung đình thanh tao hay đãi khách quý'],
    ['Cây quất cảnh', 'Cành đào phai', 'Chậu cây chi chít trái vàng trái xanh đủ hoa lộc ngày đầu xuân', 'Chọn cây sum suê tán tròn mang ý nghĩa sung túc quanh năm', 'Nhành cây khẳng khiu nở hoa hồng nhạt báo hiệu mùa xuân miền Bắc', 'Cắm bình gốm đặt giữa phòng khách ấm áp không khí Tết'],
    ['Hội chọi trâu', 'Lễ hội Ok Om Bok', 'Hai chú trâu to khỏe lao vào húc sừng giữa tiếng trống chiêng reo hò', 'Truyền thống gắn liền lễ cầu mưa thuận gió hòa miền biển', 'Cúng trăng dâng cốm dẹp và thả đèn nước lung linh của đồng bào Khmer', 'Gắn với đua ghe ngo sôi động khắp dòng sông miền Tây'],
  ]),
  ...pack('Thiên nhiên & Khí hậu', [
    ['Sấm sét', 'Mưa đá', 'Tia sáng lóe rạch ngang bầu trời đen kịt kèm tiếng nổ vang rền', 'Thấy chớp sáng là vài giây sau nghe tiếng ầm ầm rung cửa kính', 'Từng viên băng nhỏ cứng từ trên trời rơi lộp độp gãy lá cây vỡ kính', 'Hiện tượng thời tiết cực đoan hiếm gặp vào chiều chuyển mùa'],
    ['Cầu vồng', 'Cực quang', 'Dải bảy sắc cong cong hiện lên sau cơn mưa lúc có ánh nắng chiếu', 'Trẻ con hay chỉ tay đếm đủ đỏ cam vàng lục lam chàm tím', 'Dải ánh sáng xanh tím uốn lượn kỳ ảo trên bầu trời đêm vùng cực', 'Phải đi tận vùng giá lạnh gần Bắc Cực mới ngắm được'],
    ['Sương mù', 'Sương muối', 'Lớp hơi nước trắng xóa dày đặc che mờ tầm nhìn sáng sớm miền núi', 'Đèn xe phải bật vàng rọi sát mặt đường mới thấy lối đi', 'Nhiệt độ xuống gần không độ đóng thành lớp trắng xóa dễ làm táp lá cây', 'Nông dân vùng cao rất sợ làm hỏng rau màu mùa đông'],
    ['Thác nước', 'Suối nước nóng', 'Dòng nước từ vách núi cao đổ ào ạt tung bọt trắng xóa vang cả rừng', 'Ngồi gần đã thấy hơi nước mát lạnh phả rát mặt', 'Mạch nước ngầm tự nhiên bốc khói ấm áp rất hợp ngâm mình mùa đông', 'Có mùi lưu huỳnh nhẹ giúp thư giãn gân cốt giải tỏa mệt mỏi'],
    ['Núi lửa', 'Động đất', 'Miệng núi phun trào dung nham nóng đỏ cột tro bụi đen ngòm lên trời', 'Đất đá chảy thành dòng nung chảy mọi thứ dọc sườn dốc', 'Mặt đất đột ngột rung chuyển mạnh làm nhà cửa đồ đạc rơi vỡ rung lắc', 'Không có dung nham phun ra nhưng gây sụp đổ trong vài giây'],
    ['Sa mạc', 'Băng hà vùng cực', 'Biển cát vàng mênh mông ban ngày nóng cháy da ban đêm lạnh thấu xương', 'Hiếm mưa chỉ thấy cây xương rồng gai góc và lạc đà đi ngang', 'Lớp băng tuyết vĩnh cửu phủ trắng xóa hàng ngàn cây số quanh năm', 'Mặt trời có khi sáng nửa năm liên tiếp nhiệt độ âm sâu'],
    ['Rừng ngập mặn', 'Rạn san hô', 'Cây đước cây mắm mọc chằng chịt rễ đan nhau ngay vùng cửa biển nước lợ', 'Nơi trú ngụ sinh sản của cua cá còng và bảo vệ đê chắn sóng', 'Thành phố rực rỡ sắc màu sống dưới làn nước biển trong vắt', 'Đeo ống thở lặn ngắm từng đàn cá nhỏ bơi lượn quanh'],
    ['Thủy triều lên', 'Sóng thần', 'Nước biển dâng cao ngập bãi cát theo chu kỳ mặt trăng hằng ngày', 'Người dân vùng biển quen giờ nước ròng nước lớn ra bắt ngao ốc', 'Bức tường nước khổng lồ lao từ ngoài khơi vào bờ sau chấn động ngầm', 'Cảnh báo còi hú khẩn cấp yêu cầu chạy ngay lên vùng đất cao'],
    ['Nhật thực', 'Nguyệt thực', 'Ban ngày bỗng nhiên tối sầm lại vì mặt trăng che khuất ánh mặt trời', 'Phải đeo kính lọc chuyên dụng nhìn lên mới không hại mắt', 'Buổi đêm trăng tròn từ từ tối đi rồi chuyển sang màu đỏ đồng kỳ lạ', 'Có thể ngắm thoải mái bằng mắt thường không cần kính bảo vệ'],
    ['Lũ quét', 'Hạn hán', 'Mưa lớn đầu nguồn khiến dòng nước bùn đá cuồn cuộn đổ xuống bất ngờ', 'Sức công phá khủng khiếp cuốn trôi cầu cống hoa màu vùng thung lũng', 'Nắng kéo dài hàng tháng trời nứt nẻ ruộng đồng sông suối cạn trơ đáy', 'Cây cối héo rũ thiếu nước sinh hoạt nghiêm trọng'],
    ['Lá rụng mùa thu', 'Hoa nở mùa xuân', 'Từng chiếc lá vàng đỏ lìa cành bay lả tả phủ kín lối đi công viên', 'Khung cảnh hơi man mác buồn chuẩn bị sang mùa lạnh buốt', 'Chồi non mơn mởn cùng muôn hoa bung cánh đua nở sau chuỗi ngày rét', 'Bướm ong rộn ràng báo hiệu một vòng đời mới tràn sức sống'],
    ['Đom đóm', 'Sao băng', 'Chấm sáng xanh nhỏ xíu nhấp nháy bay lượn trong bụi cỏ đồng quê tối', 'Hồi nhỏ hay đuổi bắt bỏ vào lọ thủy tinh ngắm trước khi thả ra', 'Vệt sáng xẹt nhanh ngang bầu trời đêm rồi tắt lịm trong tích tắc', 'Ai kịp nhìn thấy hay nhắm mắt ước một điều thầm kín'],
    ['Hồ nước ngọt', 'Đầm phá nước lợ', 'Vùng nước đứng nằm sâu trong đất liền do sông suối hay miệng núi tạo thành', 'Không có vị mặn hay dùng nuôi cá nước ngọt hoặc chèo thuyền', 'Nằm sát biển ngăn bởi dải cát nơi nước sông hòa lẫn nước biển', 'Đặc sản tôm cua cá sống ở vùng nước pha vừa mặn vừa ngọt'],
    ['Bụi mịn không khí', 'Mưa axit', 'Hạt siêu nhỏ lơ lửng khiến bầu trời mờ đục hại phổi khi hít thở', 'Mọi người phải xem chỉ số màu tím cam trên app và đóng kín cửa', 'Nước mưa hòa khí thải công nghiệp làm ăn mòn tượng đá hại lá cây', 'Thường xảy ra quanh vùng nhiều nhà máy khói bụi nặng'],
    ['Rừng trúc', 'Vườn hoa hướng dương', 'Thân cây thẳng tắp xanh mướt cao vút gió thổi xào xạc mát rượi', 'Cảnh tượng bình yên thanh tịnh hay xuất hiện trong phim kiếm hiệp', 'Cả cánh đồng rực rỡ sắc vàng đồng loạt quay mặt đón ánh nắng mặt trời', 'Đi giữa luống hoa cao quá vai chụp ảnh cực kỳ nổi bật'],
    ['Đảo san hô nhỏ', 'Bán đảo', 'Mảnh đất nổi tách biệt giữa biển khơi bốn phía đều là sóng nước', 'Muốn đặt chân tới chỉ có cách đi tàu thuyền hoặc máy bay', 'Phần đất liền nhô hẳn ra biển nhưng vẫn còn một cạnh nối với đất lớn', 'Chạy ô tô đi đường bộ một mạch ra ngắm biển ba mặt được luôn'],
    ['Bình minh trên biển', 'Đêm trăng rằm', 'Ánh cam hồng nhuộm chân trời lúc tàu cá cập bến sáng sớm tinh mơ', 'Gió biển mát lạnh mặt trời từ từ nhô lên khỏi mặt nước', 'Trời tối nhưng ngoài sân sáng vằng vặc thấy rõ cả bóng cây in xuống đất', 'Ánh trăng tròn vành vạnh treo lơ lửng giữa nền trời sao'],
    ['Ốc đảo giữa sa mạc', 'Hang động thạch nhũ', 'Vùng xanh có hồ nước bóng cọ hiếm hoi cứu sống đoàn lữ hành khát khô', 'Xung quanh bốn bề toàn đồi cát trắng xóa mênh mông', 'Đi sâu vào lòng núi đá vôi mát lạnh ngắm nhũ đá lung linh hàng triệu năm', 'Đèn rọi lên vách hang lộ ra đủ hình thù kỳ vĩ'],
    ['Cơn gió Lào', 'Gió mùa Đông Bắc', 'Luồng gió khô nóng hầm hập thổi rát mặt vào mùa hè miền Trung', 'Phơi quần áo buổi sáng trưa đã khô giòn tan', 'Đợt gió lạnh tràn về khiến tối đang nóng sáng đã vội lôi áo khoác dày', 'Kèm mưa phùn lất phất báo hiệu mùa rét chính thức tới'],
    ['Cây cổ thụ nghìn năm', 'Đồi chè xanh', 'Thân cây to mấy người ôm không xuể rễ phụ chằng chịt bóng râm rộng cả sân', 'Người dân hay lập miếu nhỏ dưới gốc tôn kính linh thiêng', 'Những luống cây cắt tỉa tròn đều uốn lượn dọc sườn đồi xanh ngát', 'Sáng sớm hái búp non còn đọng sương đem sao thơm mùi trà'],
  ]),
  ...pack('Thời trang & Làm đẹp', [
    ['Váy cưới trắng', 'Áo vest chú rể', 'Tùng xòe lộng lẫy đuôi dài thướt tha kèm khăn voan cài đầu', 'Cô dâu thử đi thử lại cả tháng chờ ngày bước vào lễ đường', 'Bộ âu phục cắt may vừa vặn vai đứng kèm nơ cổ hoặc cà vạt lịch lãm', 'Đứng đợi đầu thảm đỏ cài thêm bông hoa nhỏ trước ngực'],
    ['Dây chuyền vàng', 'Đồng hồ cơ dây da', 'Món trang sức đeo quanh cổ tỏa sáng lấp lánh ngay xương quai xanh', 'Dễ bị vướng tóc hoặc giật nếu không cài khóa cẩn thận', 'Phụ kiện cổ tay có kim trôi chuyển động bằng bánh răng không cần pin', 'Nghe ghé tai nghe tiếng tích tắc đều đặn cực kỳ nam tính'],
    ['Kem chống nắng', 'Sữa rửa mặt', 'Bôi trước khi ra đường hai mươi phút tránh tia UV sạm nám da', 'Thoa kỹ mặt cổ vẫn phải dặm lại sau vài tiếng ngoài trời', 'Tạo bọt mịn xoa tròn rồi xả sạch nước cuốn trôi bụi dầu thừa', 'Dùng ngay bước đầu tiên sáng ngủ dậy và tối trước khi đi ngủ'],
    ['Nhuộm tóc', 'Uốn tóc xoăn', 'Đổi màu sang nâu tây bạch kim khói nhìn khác hẳn bản gốc', 'Lâu ngày chân tóc mọc đen ra phải đi chấm chân lại', 'Cuốn lô trục nhiệt làm từng lọn gợn sóng bồng bềnh mềm mại', 'Gội xong phải bóp thêm dầu dưỡng tránh tóc duỗi thẳng hoặc xù'],
    ['Sơn móng tay', 'Đắp mặt nạ giấy', 'Chổi nhỏ quét từng lớp màu bóng rồi hơ đèn UV khô cứng ngay', 'Muốn đổi màu mới phải thấm dung dịch tẩy lau sạch từng ngón', 'Đắp miếng vải thấm tinh chất lên mặt nằm thư giãn mười lăm phút', 'Mát lạnh mùa hè nhưng hễ cười lớn là miếng giấy lại xô lệch'],
    ['Quần ống rộng', 'Chân váy xếp ly', 'Dáng suông dài che khuyết điểm đôi chân đi đứng cực kỳ bay bổng', 'Phối áo croptop nhìn cao ráo thanh lịch đi làm lẫn đi chơi', 'Từng nếp gấp đều tăm tắp xòe nhẹ mỗi bước chân chạy nhảy trẻ trung', 'Rất hợp phong cách nữ sinh năng động mặc kèm áo polo'],
    ['Thắt lưng da', 'Kẹp tóc càng cua', 'Luồn qua đỉa quần siết gọn vòng eo khóa kim loại sáng bóng', 'Quên mang ra ngoài mà quần hơi rộng là phải kéo tay liên tục', 'Kẹp nhựa có răng nắm gọn cả búi tóc lên sau gáy trong ba giây', 'Mùa hè ở nhà con gái gần như ai cũng gắn một chiếc sau đầu'],
    ['Nước hoa', 'Lăn khử mùi', 'Xịt sương mỏng lên cổ tay sau tai lưu hương thơm sang trọng suốt tiệc', 'Vỏ chai thủy tinh nhỏ xinh giá vài triệu đến hàng chục triệu', 'Thoa trực tiếp vùng dưới cánh tay ngăn mùi mồ hôi giữ áo khô thoáng', 'Đồ dùng thiết yếu hằng ngày giá rẻ dễ mang đi tập gym'],
    ['Áo hoodie nỉ', 'Áo khoác jean', 'Mũ trùm đầu to dày túi trước bụng mặc ấm sụ mùa gió lạnh', 'Kéo mũ trùm kín mặt là ngủ ngon lành trên xe khách', 'Chất vải bò bụi bặm cúc đồng cứng cáp mặc lên cực kỳ cá tính', 'Càng mặc lâu hơi bạc màu lại càng nhìn chất chơi hơn'],
    ['Giày cao gót', 'Bốt cổ cao', 'Mũi nhọn nâng chiều cao bước đi uyển chuyển nhưng đi lâu đau mũi chân', 'Nghe tiếng gõ cộp cộp rõ mồn một dọc hành lang văn phòng', 'Ôm gọn cổ chân tới gần bắp chân đi mùa đông cực ấm và sang', 'Khóa kéo bên hông phối áo măng tô nhìn như diễn viên hàn'],
    ['Khuyên tai ngọc trai', 'Vòng lắc chân', 'Đôi hạt tròn trắng nhỏ nhắn cài ở dái tai tôn nét dịu dàng thanh tú', 'Dễ tháo lắp hợp trang phục công sở lẫn dự tiệc cưới', 'Sợi dây mảnh gắn chuông nhỏ đeo sát mắt cá chân kêu leng keng', 'Đi sandal mùa hè bước một bước lại nghe tiếng nhỏ vui tai'],
    ['Kẻ mắt eyeliner', 'Chì kẻ chân mày', 'Đường nét đen mảnh sát mi tạo đuôi sắc sảo cho đôi mắt to cuốn hút', 'Tay hơi run một chút là hai bên mắt lệch hẳn nhìn phát cáu', 'Gẩy từng sợi mỏng tạo dáng cong sắc nét cho khung lông mày cân đối', 'Không có bước này nhìn gương mặt nhợt nhạt thiếu thần thái'],
    ['Túi tote vải', 'Ví cầm tay clutch', 'Túi vải bố nhẹ tênh đeo vai đựng được cả laptop sách vở đi học', 'Giặt thoải mái in đủ hình minh họa trẻ trung sinh viên rất chuộng', 'Ví nhỏ cứng cáp không dây cầm gọn trên bàn tay dự tiệc tối', 'Chỉ bỏ vừa thỏi son điện thoại tiền mặt chứ không nhét nổi chai nước'],
    ['Áo chống nắng', 'Găng tay da lái xe', 'Khoác kín từ đầu mũ trùm tới bàn tay che gắt giữa trưa bốn mươi độ', 'Mặc xong nhìn ai chạy xe ngoài đường cũng giống hệt nhau', 'Bao gọn năm ngón cản gió lạnh hoặc ma sát tay lái đường dài', 'Giữ bàn tay không chai sần và không bị cháy đen phần mu tay'],
    ['Băng đô cài tóc', 'Khăn turban lụa', 'Vành nhựa hoặc vải ôm đỉnh đầu giữ tóc mái không rơi xuống mặt', 'Thường dùng lúc rửa mặt hoặc phối đồ dễ thương đi cà phê', 'Mảnh vải vuông tam giác buộc đầu cổ túi xách nhiều họa tiết sặc sỡ', 'Biến tấu đủ kiểu vừa che nắng vừa tạo điểm nhấn cá tính'],
    ['Sáp vuốt tóc', 'Máy kẹp thẳng tóc', 'Xoa tan trên lòng bàn tay rồi vuốt dựng tạo nếp cứng giữ cả ngày', 'Gội đầu buổi tối phải xả kỹ kẻo bết dính gối ngủ', 'Hai bản nhiệt nóng kẹp trượt từ chân tới ngọn cho mái tóc suôn mượt', 'Bật quá nóng dễ làm xơ cháy phần đuôi tóc nếu quên xịt dưỡng'],
    ['Pyjama đồ ngủ', 'Áo choàng tắm', 'Bộ quần áo lụa cotton mềm mỏng cài cúc mặc thư giãn trên giường', 'Họa tiết kẻ caro gấu thỏ mặc ở nhà cực kỳ thoải mái dễ chịu', 'Vải bông dày thấm nước thắt dây đai quanh eo vừa bước ra khỏi phòng tắm', 'Thường thấy treo sẵn trong tủ đồ khách sạn xịn'],
    ['Tất vớ cổ cao', 'Miếng lót giày êm', 'Kéo lên quá mắt cá sọc thể thao ấm chân khi đi giày sneaker', 'Dễ bị mất một chiếc lẻ đôi mỗi lần rút đồ khỏi máy giặt', 'Miếng đệm xốp đặt trong lòng giày giúp giảm đau gót lúc đứng lâu', 'Tháo rời ra phơi nắng để hút ẩm khử mùi bàn chân'],
    ['Phấn phủ kiềm dầu', 'Son dưỡng môi', 'Dặm bông mềm cho vùng trán mũi hết bóng nhờn giữ lớp trang điểm lâu', 'Hộp tròn nhỏ luôn nằm trong túi xách soi gương lại giữa buổi', 'Thoa lớp mỏng không màu chống khô nứt nẻ môi khi ngồi điều hòa', 'Con trai lẫn con gái mùa hanh khô ai cũng nên thủ sẵn một thỏi'],
    ['Áo len cổ lọ', 'Khăn len quàng cổ', 'Ôm sát phần cổ dài giữ ấm tuyệt đối khỏi gió lùa lúc rét đậm', 'Phối ngoài áo khoác dạ nhìn cực kỳ ấm áp sang trọng', 'Dải vải dài đan mũi to quấn mấy vòng che kín cổ họng trước ngực', 'Bước vào phòng ấm tháo ra cất túi dễ dàng hơn thay cả áo'],
  ]),
  ...pack('Phim ảnh & Nghệ thuật', [
    ['Mắt Biếc', 'Bố Già', 'Chuyện tình đơn phương chàng Ngạn cô gái mắt đẹp ở làng Đo Đo', 'Nhạc phim Có Chàng Trai Viết Lên Cây vang lên làm rưng rưng', 'Câu chuyện xóm lao động Sài Gòn tình cha con cãi vã rồi ôm nhau khóc', 'Thu âm tiếng đời thường phá kỷ lục phòng vé Việt lúc ra mắt'],
    ['Thám Tử Conan', 'Siêu Nhân Gao', 'Cậu học sinh trung học uống thuốc độc teo nhỏ phá án khắp Nhật Bản', 'Nơ đỏ đổi giọng giả bác thám tử ngủ gật vạch mặt hung thủ', 'Năm chiến binh màu đỏ vàng xanh đen trắng triệu hồi thú máy hợp thể', 'Tuổi thơ chiều nào cũng ngồi hóng ghép rô-bốt đánh quái vật'],
    ['Squid Game', 'One Piece', 'Hàng trăm người nợ nần mặc đồ xanh chơi trò trẻ con thua bị bắn', 'Búp bê quay đầu đèn xanh đèn đỏ tách kẹo đường sống còn', 'Thuyền trưởng đội mũ rơm ăn trái ác quỷ cao su đi tìm kho báu vĩ đại', 'Băng hải tặc dong buồm qua đại hải trình hơn nghìn tập chưa hết'],
    ['Kinh dị ma quỷ', 'Hài hước gia đình', 'Nhạc rùng rợn bất thình lình giật mình che mắt qua kẽ tay', 'Xem ban đêm một mình xong đi vệ sinh cũng rón rén nhìn quanh', 'Cả rạp cười nghiêng ngả với mấy pha hiểu lầm tình huống oái oăm', 'Rất hợp cả nhà dẫn nhau đi xem giải trí ngày mùng một Tết'],
    ['Nhạc Bolero', 'Nhạc Rap', 'Giai điệu chậm rãi trữ tình ngân nga câu chữ sâu lắng nỗi lòng', 'Chú bác trung niên cực mê hát karaoke cuối tuần bên ly trà', 'Nhịp beat dồn dập đọc vần đôi vần ba tốc độ nhanh đầy khí chất', 'Thường thể hiện cái tôi gai góc kể chuyện đời trên sân khấu'],
    ['Vẽ sơn dầu', 'Nặn tượng đất sét', 'Dùng cọ bảng pha màu dày cộp lên toan vải chờ nhiều ngày mới khô', 'Tác phẩm có chiều sâu nổi khối cọ giá trị treo triển lãm', 'Nhào nặn khối đất mềm trên bàn xoay tạo hình người bình con thú ba chiều', 'Cầm tay cảm nhận trực tiếp hình khối trước khi đem đi nung'],
    ['Trà đạo Nhật Bản', 'Hát Quan họ Bắc Ninh', 'Pha trà xanh bằng chổi tre nghi thức tĩnh lặng từng động tác trân quý', 'Khách ngồi chiếu tatami cúi chào thưởng thức bánh ngọt nhỏ xinh', 'Liền anh liền chị mặc áo dài cầm nón hát giao duyên mộc mạc vang sông', 'Có nét văn hóa mời trầu têm cánh phượng trước khi cất lời'],
    ['Ảo thuật bài tây', 'Xiếc tung hứng', 'Xào bài nhanh thoăn thoắt đoán trúng quân khán giả giấu kỹ trong tay', 'Mánh khóe đánh lạc hướng tinh vi ngay sát mắt người xem', 'Ném năm sáu quả bóng chày dao lửa lên không bắt nhịp không rơi quả nào', 'Biểu diễn dưới mái vòm rạp lớn giữa tiếng trống hồi hộp'],
    ['Thư pháp chữ Việt', 'Ký họa chân dung', 'Mực tàu đen thẫm nét phượng múa rồng bay viết chữ Phúc Tâm trên giấy đỏ', 'Đầu xuân hay xin ông đồ già ngồi bên vỉa hè phố cổ', 'Chỉ dùng cây bút chì hoặc than thảo nhanh gương mặt khách ngồi làm mẫu', 'Vài phút lướt nét sống động là ra ngay bức tranh kỷ niệm'],
    ['Rạp phim IMAX', 'Phòng chiếu 4D', 'Màn hình khổng lồ cong tràn tầm nhìn âm thanh vòm rung chuyển cả rạp', 'Không có ghế lắc hay phun nước nhưng hình ảnh nét choáng ngợp', 'Ghế tự rung nghiêng ngả kèm tia nước gió thổi mùi khói theo cảnh phim', 'Ngồi xem cảnh rượt đuổi mà như đang tự lái xe bay trên không'],
    ['Nhân vật phản diện', 'Diễn viên đóng thế', 'Vai ác mưu mô hay phá đám nhân vật chính tạo kịch tính cao trào cho phim', 'Đôi khi quá ngầu và có quá khứ thương tâm nên khán giả lại thương', 'Người chấp nhận nhảy lầu đâm xe đánh võ nguy hiểm thay ngôi sao chính', 'Ít khi được quay cận mặt rõ nét nhưng chịu mọi pha đau đớn nhất'],
    ['Album ảnh kỷ yếu', 'Tượng sáp bảo tàng', 'Cả lớp mặc đồng phục vest áo dài chụp tập thể cuối cấp giữ thanh xuân', 'Tung mũ cử nhân ném bột màu ghi dấu trước ngày chia tay', 'Mô hình tạc giống hệt người nổi tiếng tỷ lệ một một đứng sau dây chắn', 'Du khách thích đứng cạnh tạo dáng chụp hình tưởng gặp idol thật'],
    ['Truyện tranh Manga', 'Tiểu thuyết ngôn tình', 'Đọc từ phải sang trái nét vẽ đen trắng khung cảnh hành động kịch tính', 'Bìa màu bắt mắt bên trong phân ô thoại biểu cảm cực mạnh', 'Chỉ toàn trang chữ kể chuyện tình cảm ngọt sâu lắng dễ rơi nước mắt', 'Không có khung hình minh họa khiến người đọc tự tưởng tượng toàn bộ'],
    ['Hòa nhạc giao hưởng', 'Đại nhạc hội EDM', 'Cả trăm nhạc công mặc vest chơi violin kèn đồng theo đũa chỉ huy im ắng', 'Khán giả ăn mặc trang trọng ngồi yên vỗ tay khi kết thúc chương nhạc', 'Hàng vạn bạn trẻ nhảy cuồng nhiệt dưới sân khấu laser pháo khói rực rỡ', 'Nhạc DJ đánh căng rung ngực tới khuya không ai chịu ngồi xuống'],
    ['Tô màu theo số', 'Ghép tranh 1000 mảnh', 'Trên vải vẽ sẵn ô đánh số khớp đúng hũ màu đặt bên cạnh', 'Không cần năng khiếu hội họa vẫn tự hoàn thành bức tranh treo tường', 'Đổ cả rổ chi tiết nhỏ xíu tìm từng góc cạnh khớp lại thành bức phong cảnh', 'Làm mất đúng một mảnh cuối cùng là tức điên suốt cả tuần'],
    ['Cảnh after credit', 'Đoạn trailer nhá hàng', 'Khán giả nán lại cuối phim khi chữ danh sách chạy hết để xem hé lộ phần sau', 'Ai vội đứng dậy ra sớm thế nào cũng bị bạn kể lại tiếc hùi hụi', 'Clip cắt ghép hai phút tung lên mạng vài tháng trước khi phim chính thức chiếu', 'Chọn toàn cảnh cháy nổ cao trào khiến fan đứng ngồi không yên'],
    ['Phim tài liệu thiên nhiên', 'Chương trình truyền hình thực tế', 'Giọng đọc trầm ấm theo chân đàn sư tử chim cánh cụt suốt bốn mùa hoang dã', 'Quay chậm từng giọt sương hay cảnh săn mồi thật ngoài tự nhiên', 'Thả nghệ sĩ hoặc người chơi thật vào thử thách sinh tồn tự phát không kịch bản kín', 'Hay có cảnh cãi vã bật khóc hoặc tấu hài cực mặn giữ rating'],
    ['Đạo diễn trường quay', 'Biên kịch', 'Cầm loa đứng sau máy quay hô diễn cắt điều phối ánh sáng diễn viên', 'Chịu trách nhiệm góc máy cảm xúc khung hình cuối cùng trên màn ảnh', 'Người ngồi hàng tháng trời nghĩ cốt truyện xây dựng lời thoại nhân vật', 'Ý tưởng nằm trên giấy trước khi cả đoàn phim bấm máy'],
    ['Chụp ảnh film cổ điển', 'Quay flycam trên cao', 'Máy cơ lắp cuộn nhựa tối đa ba mươi sáu kiểu hồi hộp chờ ngày đi tráng rửa', 'Màu ảnh hơi nhiễu hạt ấm áp hoài niệm không xem trước được ngay', 'Thiết bị bốn cánh quạt bay tít lên trời thu trọn núi non thành phố từ đỉnh', 'Góc nhìn chim bay cực choáng ngợp nhưng sợ nhất là đâm trúng cây mất sóng'],
    ['Búp bê Barbie', 'Mô hình Gundam', 'Nàng công chúa tóc vàng mắt xanh cả tủ váy áo giày túi xách thay mỗi ngày', 'Bé gái thích chải tóc sắm nhà búp bê đóng vai gia đình', 'Bộ lắp ráp từng chi tiết nhựa không cần keo thành chiến binh giáp thép khổng lồ', 'Dân chơi tỉ mỉ cắt gọt kẻ lằn dán decal mất hàng tuần mới xong một con'],
  ]),
  ...pack('Giao thông & Du lịch', [
    ['Hộ chiếu Passport', 'Căn cước công dân', 'Cuốn sổ nhỏ đóng dấu xuất nhập cảnh mỗi lần bay ra khỏi biên giới', 'Quên mang ra sân bay quốc tế là coi như đứng nhìn máy bay cất cánh', 'Tấm thẻ gắn chip xác minh danh tính làm thủ tục trong nước ngân hàng', 'Gọn lỏn trong ví tiền dùng thay đổi vé máy bay nội địa cũng được'],
    ['Đặt vé khứ hồi', 'Nâng hạng thương gia', 'Mua sẵn cả chiều đi lẫn chiều về cho khỏi lo kẹt ở điểm du lịch', 'Giá thường lợi hơn mua lẻ từng chặng và giữ chỗ chắc chắn', 'Ngồi khoang rộng ngả phẳng lưng thành giường ăn đồ gốm sứ trên mây', 'Được vào phòng chờ VIP và đi lối ưu tiên không cần xếp hàng dài'],
    ['Say tàu xe', 'Lạc đường', 'Ngồi ghế sau ngửi mùi xăng điều hòa là chóng mặt buồn nôn tái mét mặt', 'Thường thủ sẵn vỏ cam kẹo gừng và chọn hàng ghế đầu gần tài xế', 'Đi mãi một hồi thấy cảnh vật lạ hoắc nhìn lại bản đồ mới biết rẽ nhầm', 'Hỏi thăm người dân ven đường rồi quay đầu đi ngược lại mất cả tiếng'],
    ['Cáp treo lên đỉnh núi', 'Du thuyền trên vịnh', 'Ngồi cabin kính lơ lửng trên dây cáp xuyên qua tầng mây ngắm rừng xanh', 'Lên tới đỉnh trong mười lăm phút thay vì leo bộ mất nửa ngày trời', 'Con tàu nhiều tầng sang trọng lướt êm giữa hàng ngàn đảo đá vôi mặt biển', 'Ngủ qua đêm trên sông nước ăn hải sản ngắm sao giữa vịnh tĩnh lặng'],
    ['Đường cao tốc', 'Đường đèo dốc', 'Làn xe chạy trăm cây số một giờ không đèn đỏ không ngã tư giao cắt', 'Xe máy bị cấm vào chỉ dành cho ô tô chạy thông suốt liên tỉnh', 'Khúc cua tay áo uốn lượn liên tục một bên vách đá một bên vực sâu', 'Tài xế non tay lái đổ dốc liên tục rà phanh khét lẹt cực kỳ nguy hiểm'],
    ['Đèn xi nhan', 'Còi xe', 'Nhấp nháy vàng trái phải báo hiệu hướng rẽ cho xe sau kịp né tránh', 'Chạy qua góc cua mà quên bật hay bị phạt lỗi hoặc gây va quẹt', 'Bấm kêu inh ỏi cảnh báo người đi trước khi vượt hoặc thấy nguy hiểm', 'Vào khu đông dân ban đêm cấm bấm to gây ồn ào mất ngủ'],
    ['Chợ nổi trên sông', 'Phố đi bộ', 'Tấp nập ghe xuồng chở đầy dưa hấu bưởi dứa treo cây bẹo chào khách sáng sớm', 'Ngồi thuyền bồng bềnh ăn tô hủ tiếu lắc lư giữa sông nước miền Tây', 'Đoạn đường trung tâm rào chắn xe cộ tối cuối tuần cho người dạo mát', 'Đầy nghệ sĩ đường phố nhảy múa trẻ em chạy nhảy quanh đài phun nước'],
    ['Lều chữ A', 'Túi ngủ', 'Mái vải căng cọc chống dây tránh gió mưa sương đêm giữa bãi cỏ rừng', 'Mùa mưa phải đào rãnh nhỏ xung quanh không nước tràn vào ướt sũng', 'Chui tọt vào kéo khóa kín mít tới cổ giữ thân nhiệt ấm áp trong lều', 'Không cần vác chăn đệm cồng kềnh cuộn tròn gọn nhẹ trong balo'],
    ['Thẻ lên tàu Boarding Pass', 'Hành lý ký gửi', 'Tờ giấy in số ghế cửa khởi hành và giờ lên máy bay ở quầy thủ tục', 'Qua cửa kiểm soát nhân viên quét mã vạch rồi xé giữ một phần', 'Vali to nặng hơn bảy ký phải cân dán tem gửi xuống bụng máy bay', 'Xuống sân bay phải đứng quanh băng chuyền chờ nó chạy ra lấy về'],
    ['Xe buýt hai tầng', 'Tàu điện trên cao', 'Mở mui trần tầng trên chạy vòng quanh phố cổ cho khách du lịch ngắm cảnh', 'Ngồi trên cao hóng gió chụp hình dinh thự nhà thờ cực kỳ thoáng', 'Chạy trên cầu ray bê tông cao vút vượt khỏi cảnh kẹt xe bên dưới phố', 'Ngừng đúng từng trạm cố định đóng mở cửa tự động đúng giờ từng phút'],
    ['Trạm dừng chân', 'Bến phà', 'Chỗ nghỉ dọc đường dài bán bánh đặc sản đi vệ sinh rửa mặt đổ xăng', 'Tài xế xe khách dừng ba mươi phút cho hành khách ăn bát mì uống cà phê', 'Cầu dẫn rộng cho ô tô xe máy chạy xuống boong tàu lớn chở qua sông rộng', 'Ngồi trên xe ngắm nước chảy gió thổi hóng tới bờ bên kia'],
    ['Homestay nhà gỗ', 'Resort ven biển', 'Không gian nhỏ xinh ấm cúng phong cách bản địa chủ nhà nhiệt tình như người thân', 'Thường nằm trong hẻm đồi thông sân vườn nhỏ để nướng BBQ tối', 'Khu nghỉ dưỡng rộng thênh thang hồ bơi vô cực sát bãi cát trắng riêng tư', 'Xe điện chở tận phòng dịch vụ trọn gói từ spa tới nhà hàng sang trọng'],
    ['Áo phao cứu sinh', 'Dây an toàn ô tô', 'Đai cam sặc sỡ mặc vào người nổi bồng bềnh khi tàu gặp sự cố trên nước', 'Có kèm còi nhỏ gắn trên ngực để thổi gọi cứu hộ từ xa', 'Dây chéo qua vai khóa cạch giữ chặt người vào ghế lúc xe phanh gấp', 'Không cài lên xe đi là hệ thống báo tít tít điếc tai không ngừng'],
    ['Lịch trình tự túc', 'Combo du lịch trọn gói', 'Tự săn vé đặt phòng lên Google Maps tự mò đường từng quán ngon địa phương', 'Chủ động thay đổi giờ giấc thích ngủ nướng tới trưa cũng chẳng sao', 'Đại lý lo sẵn vé máy bay kèm phòng khách sạn hai ba đêm giá tiết kiệm', 'Chỉ việc vác vali đi đúng ngày khỏi nhức đầu canh đặt từng mục'],
    ['Bản đồ vệ tinh GPS', 'Biển chỉ dẫn km', 'Giọng chị chỉ đường rẽ trái sau ba trăm mét bám sát vị trí chấm xanh', 'Báo luôn đoạn nào đang kẹt xe đỏ lòm để tài xế đổi hướng tránh trước', 'Tấm bảng xanh trắng cắm bên đường ghi tên tỉnh thành cùng khoảng cách số cây', 'Đứng sừng sững ngoài nắng mưa không bao giờ sợ sập nguồn mất sóng'],
    ['Chuyến bay đêm', 'Chuyến tàu xuyên đêm', 'Cất cánh lúc nửa đêm tới nơi sáng tinh mơ tiết kiệm trọn một ngày chơi', 'Ngủ gật trên ghế chật hơi mỏi cổ nhưng giá vé thường rẻ hơn ban ngày', 'Nằm giường êm tầng dưới nghe tiếng ray xình xịch suốt đêm tới phố biển', 'Sáng kéo rèm cửa sổ thấy ruộng đồng đồi núi lướt qua đẹp như tranh'],
    ['Quà lưu niệm móc khóa', 'Đặc sản bánh kẹo mang về', 'Món nhỏ xinh khắc tên địa danh để gắn balo trưng bàn làm việc lâu dài', 'Nhẹ gọn bỏ túi thoải mái làm kỷ niệm từng vùng đất đã đặt chân', 'Cả thùng kẹo dừa bánh đậu xanh mực một nắng chia cho đồng nghiệp hàng xóm', 'Ăn vèo vài hôm là hết nhưng cả phòng ai cũng nhắc nhớ tới chuyến đi'],
    ['Phí quá cân hành lý', 'Đổi ngoại tệ trước chuyến đi', 'Nhân viên chỉ bảng cân báo dư năm ký bắt mở vali hoặc đóng thêm tiền phạt', 'Khách vội vàng mặc chồng ba bốn cái áo khoác lên người để qua cửa', 'Ra ngân hàng tiệm vàng đổi tiền Việt sang tờ tiền giấy nước bạn sắp tới', 'Cần chuẩn bị ít tiền lẻ trước phòng khi sân bay không quẹt được thẻ'],
    ['Gương cầu lồi góc cua', 'Gờ giảm tốc', 'Tấm gương tròn lồi gắn ven núi giúp nhìn thấy xe ngược chiều khuất tầm mắt', 'Hay xuất hiện ngay góc cua chữ U khuất tán cây đường đèo hoặc hầm xe', 'Hàng vạch vàng cao su gồ lên trên đường rung bần bật bắt buộc xe chạy chậm', 'Đặt dày trước cổng trường học giao lộ nhiều người qua lại'],
    ['Kẹt giờ cao điểm', 'Bão lớn hoãn chuyến bay', 'Sáng tám giờ chiều năm rưỡi đường kẹt cứng tiếng còi xe máy ô tô ken đặc', 'Đi đoạn đường ba cây số mà mất gần một tiếng mới thoát ra nổi', 'Bảng điện tử sân bay hiện chữ Delay đỏ chót hành khách ngồi chờ la liệt', 'Cả buổi chiều nằm ghế phòng chờ lướt điện thoại ngóng trời tạnh gió'],
  ]),
];

