/**
 * Chuẩn hóa từ tiếng Việt để so sánh:
 * - NFC, chữ thường, gộp khoảng trắng
 * - Đưa vị trí dấu thanh về một kiểu thống nhất (kiểu truyền thống: hòa, thủy, hòe),
 *   nên người chơi gõ "hoà" hay "hòa" đều ra cùng một từ.
 */

// Dấu thanh (combining marks): huyền, sắc, ngã, hỏi, nặng
const TONE_MARKS = ['̀', '́', '̃', '̉', '̣'] as const;
const TONE_SET = new Set<string>(TONE_MARKS);

const VOWELS = new Set('aăâeêioôơuưy'.split(''));
const MODIFIED_VOWELS = new Set('ăâêôơư'.split(''));

/**
 * Cấu trúc âm tiết tiếng Việt (sau khi bỏ dấu thanh): [phụ âm đầu][vần][phụ âm cuối].
 * Dùng để loại các từ nước ngoài như "acid", "ad hoc", "posteriori".
 */
const INITIALS = 'ngh|ng|nh|ch|gh|gi|kh|ph|qu|th|tr|b|c|d|đ|g|h|k|l|m|n|p|r|s|t|v|x';
const NUCLEI = [
  'uyê', 'iêu', 'yêu', 'oai', 'oay', 'oeo', 'uây', 'uôi', 'ươi', 'ươu', 'uya', 'uyu',
  'ai', 'ao', 'au', 'ay', 'âu', 'ây', 'eo', 'êu', 'ia', 'iê', 'iu', 'oa', 'oă', 'oe', 'oi', 'ôi',
  'ơi', 'oo', 'ua', 'uâ', 'uê', 'ui', 'uô', 'uơ', 'uy', 'ưa', 'ưi', 'ươ', 'ưu', 'yê',
  'a', 'ă', 'â', 'e', 'ê', 'i', 'o', 'ô', 'ơ', 'u', 'ư', 'y',
].join('|');
const FINALS = 'ch|ng|nh|c|m|n|p|t';
const SYLLABLE_RE = new RegExp(`^(?:${INITIALS})?(?:${NUCLEI})(?:${FINALS})?$`);

function stripTone(syllable: string): { base: string; tone: string | null } {
  let tone: string | null = null;
  let base = '';
  for (const ch of syllable.normalize('NFD')) {
    if (TONE_SET.has(ch)) tone = ch;
    else base += ch;
  }
  return { base: base.normalize('NFC'), tone };
}

/** Vị trí (index trong base) của nguyên âm sẽ mang dấu thanh. */
function tonePosition(base: string): number {
  let start = 0;
  // "qu" và "gi" (khi theo sau là nguyên âm): u/i đóng vai trò phụ âm
  if (base.startsWith('qu')) start = 2;
  else if (base.startsWith('gi') && base.length > 2 && VOWELS.has(base[2])) start = 2;

  // tìm cụm nguyên âm đầu tiên kể từ start
  let i = start;
  while (i < base.length && !VOWELS.has(base[i])) i++;
  const vStart = i;
  while (i < base.length && VOWELS.has(base[i])) i++;
  const vEnd = i; // exclusive
  if (vStart === vEnd) {
    // không có nguyên âm sau "gi"/"qu" -> ví dụ "gì": i là nguyên âm
    if (start === 2) return 1;
    return -1;
  }
  const hasFinalConsonant = vEnd < base.length;

  // 1) ưu tiên nguyên âm có mũ/móc/trăng (lấy cái cuối: "ươ" -> ơ)
  let modified = -1;
  for (let k = vStart; k < vEnd; k++) if (MODIFIED_VOWELS.has(base[k])) modified = k;
  if (modified >= 0) return modified;

  const len = vEnd - vStart;
  if (len === 1) return vStart;
  // 2) 3 nguyên âm, hoặc 2 nguyên âm + phụ âm cuối -> nguyên âm thứ hai
  if (len >= 3 || hasFinalConsonant) return vStart + 1;
  // 3) 2 nguyên âm, không có phụ âm cuối -> nguyên âm đầu (hòa, thủy, mía, cái)
  return vStart;
}

/** Chuẩn hóa một âm tiết. Trả về null nếu không phải âm tiết tiếng Việt hợp lệ. */
export function normalizeSyllable(raw: string): string | null {
  const lower = raw.normalize('NFC').toLowerCase();
  const { base, tone } = stripTone(lower);
  if (!SYLLABLE_RE.test(base)) return null;
  const pos = tonePosition(base);
  if (pos < 0) return null;
  if (!tone) return base;
  return (base.slice(0, pos + 1) + tone + base.slice(pos + 1)).normalize('NFC');
}

/** Tách và chuẩn hóa một cụm từ thành các âm tiết. Trả về null nếu có âm tiết không hợp lệ. */
export function toSyllables(raw: string): string[] | null {
  const parts = raw.normalize('NFC').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const out: string[] = [];
  for (const p of parts) {
    const s = normalizeSyllable(p);
    if (!s) return null;
    out.push(s);
  }
  return out;
}

/** Chuẩn hóa cả từ (nối các âm tiết bằng một khoảng trắng). */
export function normalizeWord(raw: string): string | null {
  const s = toSyllables(raw);
  return s ? s.join(' ') : null;
}

export function firstSyllable(word: string): string {
  return word.split(' ')[0];
}

export function lastSyllable(word: string): string {
  const parts = word.split(' ');
  return parts[parts.length - 1];
}
