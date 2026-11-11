/**
 * Chuẩn hóa từ tiếng Anh cho game Nối từ Tiếng Anh:
 * - Một từ đơn tiếng Anh gồm ít nhất 2 chữ cái ASCII (a–z), chữ thường, không khoảng trắng.
 * - Nối theo chữ cái cuối của từ trước -> chữ cái đầu của từ sau (vd: art -> tits -> sex).
 */

const EN_WORD_RE = /^[a-z]{2,}$/;

/** Chuẩn hóa một từ đơn tiếng Anh. Trả về null nếu không hợp lệ. */
export function normalizeEnWord(raw: string): string | null {
  const clean = raw.normalize('NFC').trim().toLowerCase();
  if (!EN_WORD_RE.test(clean)) return null;
  return clean;
}

/** Chữ cái đầu tiên của từ tiếng Anh. */
export function firstLetter(word: string): string {
  return word[0] ?? '';
}

/** Chữ cái cuối cùng của từ tiếng Anh. */
export function lastLetter(word: string): string {
  return word[word.length - 1] ?? '';
}
