/**
 * Bộ dữ liệu + bộ chuẩn hóa & đối chiếu ngữ nghĩa tiếng Việt 5 tầng cho Khảo Sát Xóm Lầy (`family_feud`).
 */
import { FAMILY_FEUD_BANK_A } from './familyfeud-bank-a';
import { FAMILY_FEUD_BANK_B } from './familyfeud-bank-b';
import type { FeudAnswer, FeudQuestion } from './familyfeud-types';

export * from './familyfeud-types';
export { FAMILY_FEUD_BANK_A, FAMILY_FEUD_BANK_B };

export const FAMILY_FEUD_BANK: FeudQuestion[] = [
  ...FAMILY_FEUD_BANK_A,
  ...FAMILY_FEUD_BANK_B,
];

const SHORTHAND_MAP: Record<string, string> = {
  ko: 'khong',
  k: 'khong',
  hok: 'khong',
  hong: 'khong',
  kh: 'khong',
  dc: 'duoc',
  dk: 'duoc',
  nyc: 'nguoi yeu cu',
  ny: 'nguoi yeu',
  cr: 'crush',
  dt: 'dien thoai',
  dthoai: 'dien thoai',
  nn: 'nha nghi',
  ks: 'khach san',
  wc: 'nha ve sinh',
  nvs: 'nha ve sinh',
  ck: 'chuyen khoan',
  stk: 'so tai khoan',
  bcs: 'bao cao su',
  cf: 'ca phe',
  ts: 'tra sua',
  nt: 'nhan tin',
  ntin: 'nhan tin',
  vc: 'vo chong',
  fb: 'facebook',
  zl: 'zalo',
  ig: 'instagram',
  ae: 'anh em',
  bn: 'ban',
  mn: 'moi nguoi',
  ng: 'nguoi',
  mk: 'mat khau',
  trc: 'truoc',
  bh: 'bay gio',
  gd: 'gia dinh',
  kt: 'kiem tra',
  bv: 'bao ve',
  csgt: 'cong an',
  ca: 'cong an',
  lx: 'li xi',
};

const FILLER_STOPWORDS = new Set([
  'la', 'bi', 'cua', 'va', 'voi', 'nhu', 'thi', 'ma', 'o', 'trong', 'ra', 'vao',
  'len', 'xuong', 'den', 'toi', 'minh', 'ban', 'no', 'ho', 'cai', 'con', 'vi',
  'tai', 'se', 'da', 'dang', 'rat', 'qua', 'lam', 'roi', 'nhe', 'nha', 'a', 'ah',
  'uh', 'oi', 'troi', 'cho', 'de', 'di', 'hay', 'hoac', 'nhung', 'cac', 'mot',
]);

/** Cụm từ & tiếng lóng đồng nghĩa sát nghĩa tiếng Việt -> mã khái niệm chung */
const VI_SYNONYM_PHRASES: [string, string][] = [
  // Nhà nghỉ / khách sạn / 18+
  ['nha nghi', 'c_motel'], ['khach san', 'c_motel'], ['hotel', 'c_motel'], ['motel', 'c_motel'], ['thue phong', 'c_motel'], ['vao phong', 'c_motel'],
  ['lam chuyen ay', 'c_sex'], ['chuyen ay', 'c_sex'], ['chuyen nguoi lon', 'c_sex'], ['lam tinh', 'c_sex'], ['quan he', 'c_sex'], ['du nhau', 'c_sex'], ['chich', 'c_sex'], ['xoac', 'c_sex'], ['len giuong', 'c_sex'],
  ['phim den', 'c_porn'], ['phim sex', 'c_porn'], ['phim heo', 'c_porn'], ['phim 18', 'c_porn'], ['phim nong', 'c_porn'], ['web den', 'c_porn'], ['link 18', 'c_porn'],
  ['bao cao su', 'c_condom'], ['ao mua', 'c_condom'], ['ba con soi', 'c_condom'],
  ['khoa than', 'c_naked'], ['o truong', 'c_naked'], ['coi do', 'c_naked'], ['khong mac quan ao', 'c_naked'], ['lo hang', 'c_naked'], ['quen mac quan', 'c_naked'],

  // Toilet / bốc mùi
  ['nha ve sinh', 'c_toilet'], ['toilet', 'c_toilet'], ['di cau', 'c_toilet'], ['di nang', 'c_toilet'], ['di ia', 'c_toilet'], ['di te', 'c_toilet'], ['di dai', 'c_toilet'], ['di ngoai', 'c_toilet'], ['tao thao', 'c_toilet'], ['dau bung', 'c_toilet'], ['tieu chay', 'c_toilet'], ['bon cau', 'c_toilet'], ['tac cau', 'c_toilet'], ['nghet cong', 'c_toilet'],
  ['danh ram', 'c_fart'], ['xi hoi', 'c_fart'], ['danh bom', 'c_fart'], ['thoi', 'c_smell'], ['hoi nach', 'c_smell'], ['hoi mieng', 'c_smell'], ['boc mui', 'c_smell'],

  // Tình yêu / ngoại tình / NYC
  ['nguoi yeu cu', 'c_ex'], ['tinh cu', 'c_ex'], ['bo cu', 'c_ex'],
  ['cam sung', 'c_cheat'], ['ngoai tinh', 'c_cheat'], ['bat ca hai tay', 'c_cheat'], ['tra xanh', 'c_cheat'], ['tieu tam', 'c_cheat'], ['di choi rieng', 'c_cheat'], ['nguoi thu ba', 'c_cheat'],
  ['nguoi yeu', 'c_lover'], ['bo bich', 'c_lover'], ['ban trai', 'c_lover'], ['ban gai', 'c_lover'], ['vo chong', 'c_spouse'],
  ['da dieu', 'c_block'], ['chan so', 'c_block'], ['block', 'c_block'], ['huy ket ban', 'c_block'], ['unfriend', 'c_block'],
  ['xem trom', 'c_stalk'], ['soi facebook', 'c_stalk'], ['luc tin nhan', 'c_stalk'], ['kiem tra dien thoai', 'c_stalk'],

  // Tiền bạc / nợ nần / sống ảo
  ['het tien', 'c_broke'], ['chay tui', 'c_broke'], ['vi rong', 'c_broke'], ['khong co tien', 'c_broke'], ['ngheo', 'c_broke'], ['can tien', 'c_broke'], ['sach tui', 'c_broke'], ['mom', 'c_broke'],
  ['muon tien', 'c_borrow'], ['vay tien', 'c_borrow'], ['xin tien', 'c_borrow'], ['no nan', 'c_debt'], ['xui no', 'c_debt'], ['quyt tien', 'c_debt'], ['bung tien', 'c_debt'], ['doi no', 'c_debt'],
  ['tinh tien', 'c_bill'], ['chia tien', 'c_bill'], ['tra tien', 'c_bill'], ['bill', 'c_bill'], ['hoa don', 'c_bill'],
  ['phong bat', 'c_flex'], ['song ao', 'c_flex'], ['khoe cua', 'c_flex'], ['lam mau', 'c_flex'], ['boc phet', 'c_flex'], ['no to', 'c_flex'],
  ['chuyen khoan', 'c_transfer'], ['tien mat', 'c_cash'],

  // Rượu bia / ăn nhậu
  ['say xin', 'c_drunk'], ['say ruou', 'c_drunk'], ['xin quac can cau', 'c_drunk'], ['say bia', 'c_drunk'], ['nga ngua', 'c_drunk'], ['mat kiem soat', 'c_drunk'],
  ['non oi', 'c_vomit'], ['oi mua', 'c_vomit'], ['choe', 'c_vomit'], ['hue', 'c_vomit'],
  ['uong bia', 'c_alcohol'], ['uong ruou', 'c_alcohol'], ['nhau nhet', 'c_alcohol'], ['nang ly', 'c_alcohol'], ['chen', 'c_alcohol'],

  // Điện thoại / Công nghệ / Game
  ['dien thoai', 'c_phone'], ['iphone', 'c_phone'], ['smartphone', 'c_phone'], ['may tinh', 'c_pc'], ['laptop', 'c_pc'],
  ['het pin', 'c_battery'], ['sap nguon', 'c_battery'], ['tut pin', 'c_battery'],
  ['mat mang', 'c_lag'], ['mat wifi', 'c_lag'], ['rot mang', 'c_lag'], ['lag', 'c_lag'], ['giat lag', 'c_lag'], ['mang yeu', 'c_lag'],
  ['dong doi ngu', 'c_noob'], ['pha game', 'c_noob'], ['op', 'c_noob'], ['feed', 'c_noob'], ['troll', 'c_noob'], ['afk', 'c_afk'], ['treo may', 'c_afk'],
  ['nap game', 'c_topup'], ['nap the', 'c_topup'], ['hien mau', 'c_topup'], ['mua skin', 'c_topup'],

  // Thái độ / Cảm xúc / Hành động chung
  ['noi doi', 'c_lie'], ['xao lon', 'c_lie'], ['boc phet', 'c_lie'], ['bit chuyen', 'c_lie'], ['gia vo', 'c_lie'], ['vien co', 'c_lie'],
  ['di tre', 'c_late'], ['tre gio', 'c_late'], ['ngu quen', 'c_sleep'], ['ngu say', 'c_sleep'], ['ngu gat', 'c_sleep'], ['cup lam', 'c_skip'], ['tron viec', 'c_skip'], ['cup hoc', 'c_skip'],
  ['chui the', 'c_curse'], ['vang tuc', 'c_curse'], ['chui boi', 'c_curse'], ['chui dong doi', 'c_curse'], ['dm', 'c_curse'], ['vcl', 'c_curse'],
  ['khoc loc', 'c_cry'], ['an va', 'c_cry'], ['roi nuoc mat', 'c_cry'],
  ['cuoi ha ha', 'c_laugh'], ['cuoi sac sua', 'c_laugh'], ['mac cuoi', 'c_laugh'], ['cuoi bo', 'c_laugh'],
  ['sep kho', 'c_boss'], ['ong sep', 'c_boss'], ['chu', 'c_boss'], ['giam doc', 'c_boss'],
  ['cong an', 'c_police'], ['csgt', 'c_police'], ['pikachu', 'c_police'], ['bi thoi', 'c_police'],
  ['chay tron', 'c_run'], ['tron mat', 'c_run'], ['bo chay', 'c_run'], ['bien mat', 'c_run'],
  ['bo quen', 'c_forget'], ['quen mat', 'c_forget'], ['mat tri', 'c_forget'], ['khong nho', 'c_forget'],
  ['chup anh', 'c_photo'], ['chup hinh', 'c_photo'], ['quay clip', 'c_photo'], ['quay video', 'c_photo'],
  ['tin nhan', 'c_msg'], ['nhan tin', 'c_msg'], ['rep inbox', 'c_msg'], ['xem khong tra loi', 'c_msg'],
];

/** Chuẩn hóa chuỗi tiếng Việt: bỏ dấu, chuyển đ -> d, bung viết tắt phổ biến */
export function normalizeFeudText(raw: string): string {
  const base = raw
    .normalize('NFC')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!base) return '';
  return base
    .split(' ')
    .map((tok) => SHORTHAND_MAP[tok] ?? tok)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(norm: string): string[] {
  return norm
    .split(' ')
    .filter((t) => t.length >= 2 && !FILLER_STOPWORDS.has(t));
}

function extractConceptTags(norm: string): Set<string> {
  const tags = new Set<string>();
  const padded = ` ${norm} `;
  for (const [phrase, tag] of VI_SYNONYM_PHRASES) {
    if (padded.includes(` ${phrase} `)) tags.add(tag);
  }
  return tags;
}

function containsWholePhrase(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (n === 0) return m;
  if (m === 0) return n;
  const prev = new Array<number>(m + 1);
  const curr = new Array<number>(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;
  for (let i = 1; i <= n; i++) {
    curr[0] = i;
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= m; j++) prev[j] = curr[j];
  }
  return prev[m];
}

function charSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

function scoreGuessAgainstAnswer(guessNorm: string, ans: FeudAnswer): number {
  const guessTokens = contentTokens(guessNorm);
  const guessConcepts = extractConceptTags(guessNorm);
  const candidates = [ans.text, ...ans.aliases].map(normalizeFeudText).filter(Boolean);
  const kwNorms = ans.keywords.map(normalizeFeudText).filter(Boolean);

  let best = 0;

  for (const cand of candidates) {
    // Tầng 1: Khớp chính xác chuỗi chuẩn hóa
    if (guessNorm === cand) return 1.0;

    // Tầng 2: Cụm từ nguyên vẹn chứa nhau (ví dụ: "bị tắc bồn cầu" <-> "tac bon cau")
    if (cand.length >= 4 && containsWholePhrase(guessNorm, cand)) {
      best = Math.max(best, 0.94);
    } else if (guessNorm.length >= 4 && containsWholePhrase(cand, guessNorm) && guessTokens.length >= 2) {
      best = Math.max(best, 0.9);
    }

    // Tầng 3: Trùng lặp token + khái niệm đồng nghĩa
    const candTokens = contentTokens(cand);
    if (guessTokens.length > 0 && candTokens.length > 0) {
      let overlap = 0;
      for (const gt of guessTokens) {
        if (candTokens.includes(gt)) {
          overlap += 1;
        } else if (gt.length >= 4 && candTokens.some((ct) => ct.length >= 4 && levenshtein(gt, ct) <= 1)) {
          overlap += 0.85;
        }
      }
      const coverageCand = overlap / candTokens.length;
      const coverageGuess = overlap / guessTokens.length;
      const harmonic = overlap > 0 ? (2 * coverageCand * coverageGuess) / (coverageCand + coverageGuess) : 0;
      if (coverageCand >= 0.72 || harmonic >= 0.68) {
        best = Math.max(best, Math.min(0.91, 0.72 + harmonic * 0.2));
      }
    }

    // Đồng nghĩa cụm từ sát nghĩa (ví dụ "vào motel" <-> "di nha nghi")
    if (guessConcepts.size > 0) {
      const candConcepts = extractConceptTags(cand);
      let conceptHits = 0;
      for (const tag of guessConcepts) {
        if (candConcepts.has(tag)) conceptHits += 1;
      }
      if (conceptHits > 0) {
        const ratio = conceptHits / Math.max(candConcepts.size || 1, 1);
        if (ratio >= 0.5) {
          best = Math.max(best, Math.min(0.89, 0.78 + ratio * 0.1));
        }
      }
    }

    // Tầng 5: Chính tả / gõ sai nhẹ trên toàn chuỗi (>= 4 ký tự)
    if (guessNorm.length >= 4 && cand.length >= 4) {
      const sim = charSimilarity(guessNorm, cand);
      if (sim >= 0.8) best = Math.max(best, Math.min(0.86, sim));
    }
  }

  // Tầng 4: Khớp trực tiếp theo cụm keyword + khái niệm keyword
  let kwHits = 0;
  for (const kw of kwNorms) {
    if (kw.length >= 3 && containsWholePhrase(guessNorm, kw)) {
      best = Math.max(best, kw.includes(' ') ? 0.87 : 0.8);
      kwHits += 1;
    } else if (guessTokens.includes(kw)) {
      kwHits += 1;
    }
  }
  if (kwNorms.length > 0 && kwHits >= Math.min(2, kwNorms.length)) {
    best = Math.max(best, 0.85);
  } else if (guessConcepts.size > 0 && kwNorms.length > 0) {
    const kwTags = new Set<string>();
    for (const kw of kwNorms) {
      for (const t of extractConceptTags(kw)) kwTags.add(t);
    }
    for (const tag of guessConcepts) {
      if (kwTags.has(tag)) best = Math.max(best, 0.84);
    }
  }

  return best;
}

export interface FeudMatchResult {
  status: 'hit' | 'already_revealed' | 'miss';
  index: number | null;
  score: number;
}

const THRESHOLD = 0.76;

/**
 * Đối chiếu câu trả lời người chơi với 6 đáp án khảo sát (ưu tiên khớp cao nhất và sát nghĩa).
 */
export function matchFamilyFeudAnswer(
  guess: string,
  answers: FeudAnswer[],
  revealed: Set<number>,
): FeudMatchResult {
  const norm = normalizeFeudText(guess);
  const tokens = contentTokens(norm);
  if (norm.length < 2 || (tokens.length === 0 && extractConceptTags(norm).size === 0)) {
    return { status: 'miss', index: null, score: 0 };
  }

  let bestIdx: number | null = null;
  let bestScore = 0;

  for (let i = 0; i < answers.length; i++) {
    const sc = scoreGuessAgainstAnswer(norm, answers[i]);
    if (sc > bestScore) {
      bestScore = sc;
      bestIdx = i;
    }
  }

  if (bestIdx === null || bestScore < THRESHOLD) {
    return { status: 'miss', index: null, score: bestScore };
  }

  if (revealed.has(bestIdx)) {
    return { status: 'already_revealed', index: bestIdx, score: bestScore };
  }

  return { status: 'hit', index: bestIdx, score: bestScore };
}
