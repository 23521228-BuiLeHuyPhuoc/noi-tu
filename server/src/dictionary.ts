import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWord, firstSyllable, lastSyllable } from '../../shared/src/vi';
import { normalizeEnWord, firstLetter, lastLetter } from '../../shared/src/en';
import { type WordDefinition, WORD_SYLLABLES } from '../../shared/src/types';

export type Rng = () => number;
export type DictLang = 'vi' | 'en';

const DEFAULT_EN_SOURCE = 'Từ điển Anh–Việt (StarDict) & Wiktionary tiếng Việt · CC BY-SA 4.0';

/** Giải nghĩa dùng được: không phải tham chiếu chéo ("Xem ...") và không quá ngắn */
export function usableDefinition(text: string): boolean {
  const t = text.trim();
  return t.length >= 4 && !/^[Xx]em /.test(t);
}

function stripIpa(text: string): string {
  return text.replace(/^\/[^/]+\/\s*/, '').trim();
}

export class Dictionary {
  private readonly definitions = new Map<string, WordDefinition>();
  private readonly words = new Set<string>();
  private readonly byFirst = new Map<string, string[]>();
  /** các từ có thể dùng làm từ mở đầu (chữ cuối có ít nhất vài từ nối tiếp) */
  private starters: string[] = [];
  /** như `starters` nhưng chỉ gồm từ có giải nghĩa dùng được */
  private definedStarters: string[] = [];
  /** từ điển tiếng Anh đi kèm (khi nạp từ thư mục data hoặc gán trong test) */
  en?: Dictionary;

  constructor(
    words: Iterable<string>,
    private readonly banned: ReadonlySet<string> = new Set(),
    definitions: Record<string, WordDefinition | string> = {},
    readonly lang: DictLang = 'vi',
  ) {
    for (const [raw, value] of Object.entries(definitions)) {
      const word = this.norm(raw);
      if (!word || !value) continue;
      if (typeof value === 'string') {
        if (usableDefinition(value)) {
          this.definitions.set(word, { text: value.trim().slice(0, 400), source: DEFAULT_EN_SOURCE });
        }
      } else if (
        typeof value.text === 'string' &&
        typeof value.source === 'string' &&
        value.source.trim() &&
        usableDefinition(value.text)
      ) {
        this.definitions.set(word, { text: value.text.trim().slice(0, 400), source: value.source.trim() });
      }
    }
    for (const raw of words) this.insert(raw);
    this.starters = [...this.words].filter((w) => (this.byFirst.get(this.lastUnit(w))?.length ?? 0) >= 3);
    const allDefined = this.starters.filter((w) => this.definitions.has(w));
    if (this.lang === 'en') {
      const concise = allDefined.filter((w) => w.length >= 3 && w.length <= 7 && !w.endsWith('s'));
      this.definedStarters = concise.length >= 50 ? concise : allDefined;
    } else {
      this.definedStarters = allDefined;
    }
  }

  private norm(raw: string): string | null {
    if (this.lang === 'en') return normalizeEnWord(raw);
    const w = normalizeWord(raw);
    return w && w.split(' ').length === WORD_SYLLABLES ? w : null;
  }

  private firstUnit(word: string): string {
    return this.lang === 'en' ? firstLetter(word) : firstSyllable(word);
  }

  private lastUnit(word: string): string {
    return this.lang === 'en' ? lastLetter(word) : lastSyllable(word);
  }

  /** Thêm một từ (vd. từ được cả phòng duyệt). Trả về từ đã chuẩn hóa nếu thêm mới, ngược lại null. */
  add(raw: string): string | null {
    return this.insert(raw);
  }

  private insert(raw: string): string | null {
    const w = this.norm(raw);
    if (!w || this.words.has(w) || this.banned.has(w)) return null;
    this.words.add(w);
    const f = this.firstUnit(w);
    const list = this.byFirst.get(f);
    if (list) list.push(w);
    else this.byFirst.set(f, [w]);
    return w;
  }

  /** Nạp từ thư mục data: words.txt + extra-words.txt − banned-words.txt (và kèm từ điển tiếng Anh nếu có) */
  static load(dataDir: string): Dictionary {
    const read = (name: string) => {
      const p = join(dataDir, name);
      if (!existsSync(p)) return [];
      return readFileSync(p, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
    };
    const banned = new Set(read('banned-words.txt').map((w) => normalizeWord(w)).filter((w): w is string => !!w));
    const path = join(dataDir, 'definitions.json');
    const definitions = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    const dict = new Dictionary([...read('words.txt'), ...read('extra-words.txt')], banned, definitions, 'vi');
    if (existsSync(join(dataDir, 'words-en.txt'))) {
      dict.en = Dictionary.loadEn(dataDir);
    }
    return dict;
  }

  /** Nạp từ điển tiếng Anh từ thư mục data: words-en.txt + extra-words-en.txt − banned-words-en.txt */
  static loadEn(dataDir: string): Dictionary {
    const read = (name: string) => {
      const p = join(dataDir, name);
      if (!existsSync(p)) return [];
      return readFileSync(p, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
    };
    const banned = new Set(read('banned-words-en.txt').map((w) => normalizeEnWord(w)).filter((w): w is string => !!w));
    const path = join(dataDir, 'definitions-en.json');
    const definitions = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {};
    return new Dictionary([...read('words-en.txt'), ...read('extra-words-en.txt')], banned, definitions, 'en');
  }

  /** Nghĩa của từ; không có thì trả undefined (client ẩn khung giải nghĩa). */
  definition(raw: string): WordDefinition | undefined {
    const word = this.norm(raw);
    if (!word) return undefined;
    const direct = this.definitions.get(word);
    if (direct) return direct;
    if (this.lang === 'en') return this.inflectedDefinition(word);
    return undefined;
  }

  private inflectedDefinition(word: string): WordDefinition | undefined {
    const candidates: [string, string][] = [];
    if (word.endsWith('ies') && word.length > 4) candidates.push(['số nhiều/chia của', word.slice(0, -3) + 'y']);
    if (word.endsWith('ves') && word.length > 4) {
      candidates.push(['số nhiều của', word.slice(0, -3) + 'f']);
      candidates.push(['số nhiều của', word.slice(0, -3) + 'fe']);
    }
    if (word.endsWith('es') && word.length > 3) {
      candidates.push(['số nhiều/chia của', word.slice(0, -2)]);
      candidates.push(['số nhiều/chia của', word.slice(0, -1)]);
    }
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 2) {
      candidates.push(['số nhiều/chia của', word.slice(0, -1)]);
    }
    if (word.endsWith('ied') && word.length > 4) candidates.push(['quá khứ của', word.slice(0, -3) + 'y']);
    if (word.endsWith('ed') && word.length > 3) {
      const base = word.slice(0, -2);
      candidates.push(['quá khứ của', base]);
      candidates.push(['quá khứ của', word.slice(0, -1)]);
      if (base.length >= 3 && base.at(-1) === base.at(-2)) candidates.push(['quá khứ của', base.slice(0, -1)]);
    }
    if (word.endsWith('ing') && word.length > 4) {
      const base = word.slice(0, -3);
      candidates.push(['dạng V-ing của', base]);
      candidates.push(['dạng V-ing của', base + 'e']);
      if (base.length >= 3 && base.at(-1) === base.at(-2)) candidates.push(['dạng V-ing của', base.slice(0, -1)]);
    }
    if (word.endsWith('ier') && word.length > 4) candidates.push(['so sánh hơn của', word.slice(0, -3) + 'y']);
    if (word.endsWith('er') && word.length > 3) {
      const base = word.slice(0, -2);
      candidates.push(['so sánh hơn/danh từ của', base]);
      candidates.push(['so sánh hơn/danh từ của', word.slice(0, -1)]);
      if (base.length >= 3 && base.at(-1) === base.at(-2)) candidates.push(['so sánh hơn của', base.slice(0, -1)]);
    }
    if (word.endsWith('iest') && word.length > 5) candidates.push(['so sánh nhất của', word.slice(0, -4) + 'y']);
    if (word.endsWith('est') && word.length > 4) {
      const base = word.slice(0, -3);
      candidates.push(['so sánh nhất của', base]);
      candidates.push(['so sánh nhất của', word.slice(0, -2)]);
      if (base.length >= 3 && base.at(-1) === base.at(-2)) candidates.push(['so sánh nhất của', base.slice(0, -1)]);
    }
    if (word.endsWith('ly') && word.length > 3) {
      candidates.push(['trạng từ của', word.slice(0, -2)]);
      if (word.endsWith('ily') && word.length > 4) candidates.push(['trạng từ của', word.slice(0, -3) + 'y']);
    }
    for (const [label, base] of candidates) {
      const def = this.definitions.get(base);
      if (def) {
        return { text: `(${label} ${base}) ${stripIpa(def.text)}`.slice(0, 400), source: def.source };
      }
    }
    return undefined;
  }

  get size(): number {
    return this.words.size;
  }

  /** `word` phải đã được chuẩn hóa */
  has(word: string): boolean {
    return this.words.has(word);
  }

  /** Các từ bắt đầu bằng `syllable` (hoặc chữ cái đầu với tiếng Anh) chưa có trong `used` */
  nextOptions(syllable: string, used: ReadonlySet<string> = new Set()): string[] {
    return (this.byFirst.get(syllable) ?? []).filter((w) => !used.has(w));
  }

  /** Số từ bắt đầu bằng `syllable` (hoặc chữ cái đầu với tiếng Anh) chưa có trong `used` */
  countNext(syllable: string, used: ReadonlySet<string>): number {
    const list = this.byFirst.get(syllable);
    if (!list) return 0;
    let n = 0;
    for (const w of list) if (!used.has(w)) n++;
    return n;
  }

  /** Chọn ngẫu nhiên một từ chưa dùng mà sau đó vẫn còn từ để nối */
  randomStart(used: ReadonlySet<string>, rng: Rng = Math.random): string | null {
    const ok = (w: string) => {
      if (used.has(w)) return false;
      const list = this.byFirst.get(this.lastUnit(w)) ?? [];
      return list.some((x) => x !== w && !used.has(x));
    };
    // ưu tiên từ có giải nghĩa; hết cách mới dùng kho thường
    const pools = [this.definedStarters, this.starters.length ? this.starters : [...this.words]];
    for (const pool of pools) {
      for (let i = 0; i < 100 && pool.length; i++) {
        const w = pool[Math.floor(rng() * pool.length)];
        if (ok(w)) return w;
      }
      for (const w of pool) if (ok(w)) return w;
    }
    for (const w of this.words) if (ok(w)) return w;
    return null;
  }
}
