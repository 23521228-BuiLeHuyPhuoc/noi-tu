/**
 * So khớp câu đoán "gần đúng" cho tiếng Việt — hàm thuần, không phụ thuộc gói nào (server lẫn app import được).
 *
 * Chấp nhận khi câu đoán:
 * - khác hoa thường, thừa khoảng trắng / dấu câu, dính liền hay tách tiếng ("wifi" = "wi-fi", "trasua" = "trà sữa");
 * - gõ không dấu ("tra sua"); với từ khóa từ 2 tiếng thì gõ sai dấu tính như 1 lỗi gõ ("trà sửa");
 * - dùng từ Bắc – Nam quen thuộc (heo = lợn, nón = mũ, bắp = ngô, muỗng = thìa, chén = bát…);
 * - với từ khóa từ 2 tiếng: nhầm phụ âm đầu vùng miền (s/x, tr/ch, d/gi/r, k/c, gh/g, ngh/ng)
 *   và gõ sai 1 chữ ở tiếng dài từ 5 chữ cái, tổng số lỗi theo độ dài từ khóa (≤ 5 chữ: 0 · 6–10: 1 · 11–15: 2 · dài hơn: 3);
 * - thừa / thiếu loại từ đứng đầu (con, cái, chiếc, quả, món, tô…);
 * - thiếu tiếng đầu hoặc tiếng cuối khi từ khóa từ 3 tiếng ("bún bò" ~ "Bún bò Huế", "bít tết" ~ "Bò bít tết"),
 *   giữ từ nửa phần đầu khi từ khóa từ 4 tiếng, bỏ đuôi bổ nghĩa quen thuộc ("tivi" ~ "Tivi thông minh");
 * - thừa tiếng bổ nghĩa phía sau: 1 tiếng ("phở bò" ~ "Phở"), 2 tiếng nếu từ khóa từ 2 tiếng.
 *
 * Từ chối khi:
 * - từ khóa 1 tiếng mà gõ khác chữ, hoặc có gõ dấu mà dấu khác ("chuột" ≠ "chuối", "dừa" ≠ "dứa", "sa mạc" ≠ "sả");
 * - phải vừa bỏ / thêm tiếng vừa sai chính tả hay đổi phụ âm cùng lúc;
 * - câu đoán gần một từ khác (vd từ của phe còn lại) bằng hoặc hơn gần từ khóa;
 * - câu đoán "gộp" luôn từ còn lại để ăn may ("phở bún bò", "gà vịt").
 */

interface Tok {
  /** chữ thường, còn dấu (là dạng bỏ dấu nếu tiếng này do từ đồng nghĩa thay vào) */
  raw: string;
  /** bỏ dấu, đ → d */
  fold: string;
  /** bỏ dấu nhưng giữ đ, gộp phụ âm đầu dễ nhầm */
  phon: string;
  /** raw là chữ người chơi gõ / chữ gốc của từ khóa (không phải do từ đồng nghĩa thay vào) */
  genuine: boolean;
}

interface Variant {
  toks: Tok[];
  compact: string;
  /** điểm phạt khi phải bỏ bớt tiếng của từ khóa */
  penalty: number;
  /** cho phép câu đoán thừa tiếng bổ nghĩa phía sau */
  extras: boolean;
  /** cho phép gõ sai chính tả nhẹ */
  typos: boolean;
  /** (câu đoán) có gõ dấu ở đâu đó — tức là có bộ gõ tiếng Việt, tiếng không dấu được hiểu đúng như gõ */
  marked: boolean;
}

const MAX_GUESS_CHARS = 60;
const MAX_GUESS_TOKENS = 8;
/** tiếng phải dài từ ngần này chữ cái mới được gõ sai 1 chữ (tiếng ngắn sai 1 chữ là thành tiếng khác) */
const TYPO_MIN_SYLLABLE = 5;

/** loại từ / từ chỉ đơn vị đứng đầu (so khớp cả dấu để không nhầm "bộ" với "bò", "quả" với "quà") */
const LEAD_CLASSIFIERS = new Set([
  'con', 'cái', 'chiếc', 'quả', 'trái', 'cây', 'món', 'một', 'những', 'các', 'tô', 'chén', 'bát',
  'ly', 'cốc', 'đĩa', 'dĩa', 'đôi', 'bộ', 'cuốn', 'quyển', 'tờ', 'tấm', 'viên', 'sợi', 'miếng',
  'lát', 'củ', 'chim', 'mạng',
]);
/** cùng danh sách nhưng bỏ dấu — chỉ dùng cho câu đoán gõ không dấu */
const LEAD_CLASSIFIERS_FOLDED = new Set([...LEAD_CLASSIFIERS].map(foldVi));

/** tiếng quá chung, không đủ để tự mình đại diện cho từ khóa khi bỏ bớt tiếng */
const GENERIC = new Set([
  'banh', 'nuoc', 'ca', 'thit', 'xe', 'may', 'cay', 'hoa', 'la', 'com', 'bun', 'che', 'mon', 'do',
  'nha', 'phong', 'an', 'uong', 'choi', 'con', 'cai', 'nguoi', 'bo', 'ga', 'tra', 'keo', 'kem',
  'sua', 'rau', 'qua', 'trai', 'ao', 'quan', 'giay', 'mu', 'tui', 'hop', 'chai', 'dong', 'ho',
  'den', 'tien', 'the', 'bai', 'tro', 'game', 'phim', 'nhac', 'ban', 'ghe', 'tu', 'cua', 'o',
  'duong', 'cho', 'song', 'nui', 'bien', 'mot', 'va', 'voi', 'lam', 'di', 've', 'ra',
]);

/** đuôi bổ nghĩa hay gặp, bỏ đi vẫn hiểu là từ khóa ("Tivi thông minh" → "tivi") */
const TRAILING_QUALIFIERS: string[][] = [
  ['thong', 'minh'], ['khong', 'day'], ['deo', 'tay'], ['dien', 'tu'], ['di', 'dong'], ['cam', 'tay'],
  ['tu', 'dong'], ['mini'],
];

/** đồng nghĩa Bắc – Nam / cách viết khác (giữ nguyên số tiếng hoặc chỉ tách thêm), áp dụng trên chuỗi đã bỏ dấu */
const PHRASE_SYNONYMS: [RegExp, string][] = [
  [/\bxe hoi\b/g, 'o to'],
  [/\b(cafe|caphe|coffee|ca fe)\b/g, 'ca phe'],
  [/\b(tv|ti vi)\b/g, 'tivi'],
  [/\bnon\b/g, 'mu'],
  [/\bmuong\b/g, 'thia'],
  [/\bheo\b/g, 'lon'],
  [/\bbap\b/g, 'ngo'],
  [/\bkieng\b/g, 'kinh'],
  [/\bchen\b/g, 'bat'],
  [/\bmen\b/g, 'chan'],
  [/\bmy\b/g, 'mi'],
  [/\bdua chuot\b/g, 'dua leo'],
  [/\bdau phu\b/g, 'dau hu'],
  [/\bbi ngo\b/g, 'bi do'],
  [/\bkho qua\b/g, 'muop dang'],
  [/\bxa bong\b/g, 'xa phong'],
  [/\bban la\b/g, 'ban ui'],
  [/\bday nit\b/g, 'that lung'],
];

/** đồng nghĩa chỉ khi cả cụm đứng một mình (tránh "lạc đà" thành "đậu phộng đà") */
const WHOLE_SYNONYMS: Record<string, string> = {
  du: 'o',
  'o che mua': 'o',
  'du che mua': 'o',
  lac: 'dau phong',
};

/** Bỏ dấu tiếng Việt, đ → d, chữ thường. */
export function foldVi(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/** Chuẩn hóa để so sánh: bỏ dấu, chữ thường, dấu câu thành khoảng trắng, gộp khoảng trắng. */
export function normalizeGuess(s: string): string {
  return foldVi(s.normalize('NFC'))
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function rawTokens(s: string): string[] {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function isMarked(raw: string): boolean {
  return raw !== foldVi(raw);
}

/** gộp phụ âm đầu dễ nhầm theo vùng miền; giữ "đ" riêng vì "đ" khác hẳn "d/gi/r" */
function phonKey(raw: string): string {
  const s = raw.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return s
    .replace(/^ngh/, 'ng')
    .replace(/^gh/, 'g')
    .replace(/^gi(?=[aeiouy])/, 'd')
    .replace(/^tr/, 'ch')
    .replace(/^r/, 'd')
    .replace(/^s/, 'x')
    .replace(/^k(?!h)/, 'c')
    .replace(/^([bcdghklmnpqrstvxđ]+)y$/, '$1i');
}

function makeVariant(raws: string[], penalty: number, extras: boolean, typos: boolean): Variant | null {
  if (raws.length === 0) return null;
  let folded = raws.map(foldVi).join(' ');
  for (const [re, to] of PHRASE_SYNONYMS) folded = folded.replace(re, to);
  folded = folded.replace(/\s+/g, ' ').trim();
  folded = WHOLE_SYNONYMS[folded] ?? folded;
  const foldToks = folded.split(' ').filter(Boolean);
  if (foldToks.length === 0) return null;
  const sameCount = foldToks.length === raws.length;
  const toks = foldToks.map((fold, i) => {
    const genuine = sameCount && fold === foldVi(raws[i]);
    const raw = genuine ? raws[i] : fold;
    return { raw, fold, phon: phonKey(raw), genuine };
  });
  return { toks, compact: foldToks.join(''), penalty, extras, typos, marked: raws.some(isMarked) };
}

function isClassifier(raw: string, forGuess: boolean): boolean {
  if (LEAD_CLASSIFIERS.has(raw)) return true;
  // người chơi gõ không dấu: "con meo", "qua tao"
  return forGuess && !isMarked(raw) && LEAD_CLASSIFIERS_FOLDED.has(raw);
}

function stripLead(raws: string[], forGuess: boolean): string[] {
  let i = 0;
  while (raws.length - i > 1 && isClassifier(raws[i], forGuess)) i++;
  return raws.slice(i);
}

/** phần còn lại sau khi bỏ bớt tiếng có đủ "chất" để đại diện từ khóa không: từ 2 tiếng là đủ, 1 tiếng thì phải không quá chung */
function canStandAlone(folds: string[]): boolean {
  if (folds.length >= 2) return true;
  return folds.length === 1 && folds[0].length >= 3 && !GENERIC.has(folds[0]);
}

function targetVariants(target: string): Variant[] {
  const all = rawTokens(target);
  if (all.length === 0) return [];
  const core = stripLead(all, false);
  // chỉ dạng đã bỏ loại từ mới được thừa tiếng bổ nghĩa phía sau
  const out: (Variant | null)[] = [makeVariant(all, 0, core.length === all.length, true)];
  if (core.length !== all.length) out.push(makeVariant(core, 0, true, true));
  const coreFold = core.map(foldVi);
  const partial = (rest: string[]) => {
    if (canStandAlone(rest.map(foldVi))) out.push(makeVariant(rest, 1, false, false));
  };

  for (const q of TRAILING_QUALIFIERS) {
    const n = core.length - q.length;
    if (n >= 1 && q.every((w, i) => coreFold[n + i] === w)) partial(core.slice(0, n));
  }
  // thiếu tiếng đầu hoặc tiếng cuối (từ khóa từ 3 tiếng trở lên)
  if (core.length >= 3) {
    partial(core.slice(1));
    partial(core.slice(0, -1));
  }
  // giữ phần đầu từ một nửa trở lên (từ khóa dài từ 4 tiếng): "điện thoại" ~ "điện thoại thông minh"
  if (core.length >= 4) {
    for (let m = Math.max(2, Math.ceil(core.length / 2)); m <= core.length - 2; m++) partial(core.slice(0, m));
  }
  return out.filter((v): v is Variant => v !== null);
}

function guessVariants(guess: string): Variant[] {
  const all = rawTokens(guess);
  if (all.length === 0 || all.length > MAX_GUESS_TOKENS) return [];
  const out: (Variant | null)[] = [makeVariant(all, 0, false, false)];
  const core = stripLead(all, true);
  if (core.length !== all.length) out.push(makeVariant(core, 0, false, false));
  return out.filter((v): v is Variant => v !== null);
}

/** Khoảng cách Levenshtein (chèn / xóa / thay 1 ký tự). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** số lỗi gõ cho phép theo độ dài (chữ cái, không tính khoảng trắng) của từ khóa */
export function typoBudget(letters: number): number {
  if (letters <= 5) return 0;
  if (letters <= 10) return 1;
  if (letters <= 15) return 2;
  return 3;
}

interface AlignOpts {
  typos: boolean;
  phon: boolean;
  /** câu đoán có gõ dấu ở đâu đó */
  guessMarked: boolean;
}

/** so một tiếng: 0 = khớp, 1 = sai chính tả nhẹ, null = khác hẳn */
function syllableCost(g: Tok, t: Tok, multi: boolean, opts: AlignOpts): number | null {
  if (g.fold === t.fold) {
    // từ khóa 1 tiếng: người có gõ dấu thì dấu phải đúng ("dừa" không ăn "dứa", "sa mạc" không ăn "sả");
    // gõ hoàn toàn không dấu thì bỏ qua dấu
    if (!multi && g.genuine && t.genuine && g.raw !== t.raw && (opts.guessMarked || isMarked(g.raw))) return null;
    // từ khóa nhiều tiếng: gõ sai dấu ("trà sửa") tính là 1 lỗi gõ; gõ thiếu dấu thì không tính
    if (multi && g.genuine && t.genuine && isMarked(g.raw) && g.raw !== t.raw) return opts.typos ? 1 : null;
    return 0;
  }
  if (!multi) return null;
  if (opts.phon && g.phon === t.phon) return 0;
  if (opts.typos && t.fold.length >= TYPO_MIN_SYLLABLE && levenshtein(g.fold, t.fold) <= 1) return 1;
  return null;
}

/** so từng tiếng theo vị trí; trả về số lỗi gõ hoặc null nếu lệch quá */
function alignedCost(g: Tok[], t: Tok[], compactLen: number, opts: AlignOpts): number | null {
  const multi = t.length >= 2;
  let cost = 0;
  for (let i = 0; i < t.length; i++) {
    const c = syllableCost(g[i], t[i], multi, opts);
    if (c === null) return null;
    cost += c;
  }
  return cost <= typoBudget(compactLen) ? cost : null;
}

function variantScore(g: Variant, t: Variant): number | null {
  const n = t.toks.length;
  // gõ dính liền / tách tiếng khác đi ("wifi" = "wi fi") chỉ tính với nguyên từ khóa
  if (t.penalty === 0 && g.toks.length !== n && g.compact === t.compact) return 0;
  if (g.toks.length === n) {
    // đã phải bỏ bớt tiếng thì phần còn lại phải đúng chữ (chỉ bỏ qua dấu)
    const full = t.penalty === 0;
    const c = alignedCost(g.toks, t.toks, t.compact.length, { typos: t.typos, phon: full, guessMarked: g.marked });
    return c === null ? null : c + t.penalty;
  }
  if (g.toks.length > n && t.extras) {
    const allowed = n >= 2 ? 2 : t.compact.length >= 2 ? 1 : 0;
    const extra = g.toks.length - n;
    if (extra > allowed) return null;
    // thừa tiếng thì phần đầu phải đúng chữ (không cộng thêm lỗi chính tả hay đổi phụ âm)
    const c = alignedCost(g.toks.slice(0, n), t.toks, t.compact.length, { typos: false, phon: false, guessMarked: g.marked });
    return c === null ? null : extra + t.penalty;
  }
  return null;
}

/**
 * Điểm gần đúng của câu đoán so với một từ khóa: 0 = khớp hoàn toàn, số càng lớn càng "hơi khớp".
 * Trả về null nếu không đủ gần để tính là trúng.
 */
export function guessScore(guess: string, target: string): number | null {
  if (!guess || guess.length > MAX_GUESS_CHARS) return null;
  const gs = guessVariants(guess);
  const ts = targetVariants(target);
  let best: number | null = null;
  for (const g of gs) {
    for (const t of ts) {
      const s = variantScore(g, t);
      if (s !== null && (best === null || s < best)) best = s;
    }
  }
  return best;
}

function coreFolds(s: string, forGuess: boolean): string[] {
  const v = makeVariant(stripLead(rawTokens(s), forGuess), 0, false, false);
  return v ? v.toks.map((t) => t.fold) : [];
}

function containsRun(needle: string[], hay: string[]): boolean {
  if (needle.length === 0 || needle.length > hay.length) return false;
  for (let i = 0; i + needle.length <= hay.length; i++) {
    if (needle.every((w, j) => hay[i + j] === w)) return true;
  }
  return false;
}

/** câu đoán "gộp" luôn từ còn lại để ăn may ("gà vịt", "phở bún bò") */
function hedgesOther(guess: string, target: string, other: string): boolean {
  const o = coreFolds(other, false);
  return containsRun(o, coreFolds(guess, true)) && !containsRun(o, coreFolds(target, false));
}

/**
 * Câu đoán có được tính là trúng `target` không.
 * `others`: các từ dễ nhầm (vd từ của phe còn lại) — đoán gần chúng bằng hoặc hơn từ khóa thì không tính.
 */
export function matchGuess(guess: string, target: string, others: readonly string[] = []): boolean {
  const score = guessScore(guess, target);
  if (score === null) return false;
  const targetNorm = normalizeGuess(target);
  for (const other of others) {
    if (!other || normalizeGuess(other) === targetNorm) continue;
    const otherScore = guessScore(guess, other);
    if (otherScore !== null && otherScore <= score) return false;
    if (hedgesOther(guess, target, other)) return false;
  }
  return true;
}

/**
 * Câu chữ có nhắc thẳng tới từ khóa không (để chặn lộ từ khi gợi ý / chat).
 * So theo nguyên tiếng chứ không theo chuỗi con ("ô" không chặn "cho", "gà" không chặn "gần").
 * Tiếng có gõ dấu phải đúng dấu; tiếng gõ không dấu thì so bỏ dấu — trừ khi từ khóa chỉ 1 tiếng mà
 * câu có gõ dấu ở chỗ khác (người gõ có bộ gõ tiếng Việt, "cho" không dấu là "cho" chứ không phải "chó").
 * Từ khóa nhiều tiếng viết dính liền ("trasua") cũng bị chặn.
 */
export function mentionsWord(text: string, word: string): boolean {
  const w = rawTokens(word);
  const t = rawTokens(text);
  if (w.length === 0 || t.length === 0) return false;
  const textHasMarks = t.some(isMarked);
  const strictUnmarked = w.length === 1 && textHasMarks;
  const same = (tt: string, wt: string) => {
    if (isMarked(tt) || strictUnmarked) return tt === wt;
    return foldVi(tt) === foldVi(wt);
  };
  for (let i = 0; i + w.length <= t.length; i++) {
    if (w.every((wt, j) => same(t[i + j], wt))) return true;
  }
  if (w.length >= 2) {
    const compact = w.map(foldVi).join('');
    if (compact.length >= 4 && t.some((tt) => foldVi(tt) === compact)) return true;
  }
  return false;
}
