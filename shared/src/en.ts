/**
 * Chuẩn hóa từ tiếng Anh cho game Nối từ Tiếng Anh:
 * - Một từ đơn tiếng Anh gồm ít nhất 2 chữ cái ASCII (a–z), chữ thường, không khoảng trắng.
 * - Nối theo chữ cái cuối của từ trước -> chữ cái đầu của từ sau (vd: art -> tits -> sex).
 * - Bỏ qua gạch nối và dấu nháy (x-ray = xray, o'clock = oclock).
 * - Người chơi quên tắt bộ gõ tiếng Việt: Telex biến "box" thành "bõ", "xmas" thành "xmá"…
 *   `enCandidates` đoán lại các cách gõ gốc để server thử từng cách với từ điển.
 */

const EN_WORD_RE = /^[a-z]{2,}$/;
/** gạch nối, dấu nháy thẳng/cong: bỏ đi khi chuẩn hóa */
const JOINERS_RE = /[-‐‑‒–—'’‘`´.]/g;

/** Chuẩn hóa một từ đơn tiếng Anh. Trả về null nếu không hợp lệ. */
export function normalizeEnWord(raw: string): string | null {
  const clean = raw.normalize('NFC').trim().toLowerCase().replace(JOINERS_RE, '');
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

/** dấu thanh (dạng tổ hợp sau NFD) -> phím Telex đã gõ */
const TONE_KEY: Record<string, string> = { '́': 's', '̀': 'f', '̉': 'r', '̃': 'x', '̣': 'j' };
const CIRCUMFLEX = '̂';
const BREVE = '̆';
const HORN = '̛';
const MAX_CANDIDATES = 200;

/** chuỗi có dấu tiếng Việt (bộ gõ đang bật) */
export function hasVietMarks(raw: string): boolean {
  return /[đĐ]/.test(raw) || /[̀-̛ͯ]/.test(raw.normalize('NFD'));
}

/**
 * Các cách đọc có thể của chuỗi người chơi gõ, theo thứ tự nên thử:
 * - chuỗi a–z bình thường: chỉ một cách;
 * - chuỗi bị bộ gõ Telex/VNI thêm dấu: dịch ngược (â→aa, ơ→ow, ư→uw/w, đ→dd, dấu sắc→s, huyền→f, hỏi→r, ngã→x, nặng→j),
 *   phím dấu đặt ngay sau nguyên âm trước rồi mới tới các vị trí sau; cuối cùng là bản bỏ hết dấu.
 * Trả về [] nếu có ký tự không phải chữ cái.
 */
export function enCandidates(raw: string): string[] {
  const clean = raw.normalize('NFC').trim().toLowerCase().replace(JOINERS_RE, '');
  if (EN_WORD_RE.test(clean)) return [clean];
  if (!clean || clean.length > 40) return [];
  // mỗi ký tự -> các chuỗi gốc có thể + phím dấu thanh (nếu có)
  const units: { opts: string[]; tone: string | null }[] = [];
  for (const ch of clean) {
    if (ch === 'đ') {
      units.push({ opts: ['dd', 'd'], tone: null });
      continue;
    }
    const d = ch.normalize('NFD');
    const base = d[0];
    if (!/[a-z]/.test(base)) return [];
    const marks = d.slice(1);
    let tone: string | null = null;
    let opts = [base];
    for (const m of marks) {
      if (TONE_KEY[m]) tone = TONE_KEY[m];
      else if (m === CIRCUMFLEX) opts = [base + base, base];
      else if (m === BREVE) opts = [base + 'w', base];
      else if (m === HORN) opts = base === 'u' ? ['uw', 'w', 'u'] : [base + 'w', base];
      else return [];
    }
    units.push({ opts, tone });
  }
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (w: string) => {
    if (out.length < MAX_CANDIDATES && EN_WORD_RE.test(w) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  };
  // duyệt mọi tổ hợp chữ gốc; mỗi phím dấu được chèn từ ngay sau ký tự mang dấu tới cuối từ
  const walk = (i: number, parts: string[], pending: string[]) => {
    if (out.length >= MAX_CANDIDATES) return;
    if (i === units.length) {
      const body = parts.join('');
      if (pending.length === 0) return push(body);
      // các vị trí chèn phím dấu: sau mỗi ký tự kể từ ký tự mang dấu
      const tone = pending[0];
      return placeTone(parts, tone, pending.slice(1));
    }
    const u = units[i];
    for (const o of u.opts) {
      walk(i + 1, [...parts, o], u.tone ? [...pending, `${i}:${u.tone}`] : pending);
    }
  };
  const placeTone = (parts: string[], spec: string, rest: string[]) => {
    const [idxStr, key] = spec.split(':');
    const from = Number(idxStr);
    for (let pos = from; pos < parts.length; pos++) {
      const next = parts.map((p, k) => (k === pos ? p + key : p));
      if (rest.length === 0) push(next.join(''));
      else placeTone(next, rest[0], rest.slice(1));
    }
  };
  walk(0, [], []);
  // bản bỏ hết dấu (bộ gõ tự thêm dấu nhưng không nuốt chữ nào)
  push(units.map((u) => u.opts[u.opts.length - 1]).join(''));
  return out;
}
