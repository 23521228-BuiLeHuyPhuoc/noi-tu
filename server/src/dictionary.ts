import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWord, firstSyllable, lastSyllable } from '../../shared/src/vi';
import { type WordDefinition, WORD_SYLLABLES } from '../../shared/src/types';

export type Rng = () => number;

export class Dictionary {
  private readonly definitions = new Map<string, WordDefinition>();
  private readonly words = new Set<string>();
  private readonly byFirst = new Map<string, string[]>();
  /** âm tiết tiếng Việt đã chứng thực trong kho từ lớn (cho phép ghép từ 2 âm tiết hàng chục triệu tổ hợp) */
  private readonly syllables = new Set<string>();
  /** các từ có thể dùng làm từ mở đầu (chữ cuối có ít nhất vài từ nối tiếp) */
  private starters: string[] = [];

  constructor(words: Iterable<string>, private readonly banned: ReadonlySet<string> = new Set(), definitions: Record<string, WordDefinition> = {}) {
    for (const [raw, value] of Object.entries(definitions)) {
      const word = normalizeWord(raw);
      if (word && value && typeof value.text === "string" && value.text.trim() && typeof value.source === "string" && value.source.trim())
        this.definitions.set(word, { text: value.text.trim().slice(0, 400), source: value.source.trim() });
    }
    for (const raw of words) this.insert(raw);
    if (this.words.size >= 10_000) {
      for (const w of this.words) {
        this.syllables.add(firstSyllable(w));
        this.syllables.add(lastSyllable(w));
      }
    }
    this.starters = [...this.words].filter((w) => (this.byFirst.get(lastSyllable(w))?.length ?? 0) >= 3);
  }

  /** Thêm một từ (vd. từ được cả phòng duyệt). Trả về từ đã chuẩn hóa nếu thêm mới, ngược lại null. */
  add(raw: string): string | null {
    const w = this.insert(raw);
    if (w && this.syllables.size > 0) {
      this.syllables.add(firstSyllable(w));
      this.syllables.add(lastSyllable(w));
    }
    return w;
  }

  private insert(raw: string): string | null {
    const w = normalizeWord(raw);
    if (!w || w.split(' ').length !== WORD_SYLLABLES || this.words.has(w) || this.banned.has(w)) return null;
    this.words.add(w);
    const f = firstSyllable(w);
    const list = this.byFirst.get(f);
    if (list) list.push(w);
    else this.byFirst.set(f, [w]);
    return w;
  }

  /** Nạp từ thư mục data: words.txt + extra-words.txt − banned-words.txt */
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
    return new Dictionary([...read('words.txt'), ...read('extra-words.txt')], banned, definitions);
  }

  definition(raw: string): WordDefinition {
    const word = normalizeWord(raw);
    return (word && this.definitions.get(word)) || { text: "Chưa có giải nghĩa", source: null };
  }

  get size(): number {
    if (this.syllables.size > 0) return this.syllables.size * this.syllables.size - this.banned.size;
    return this.words.size;
  }

  /** `word` phải đã được chuẩn hóa */
  has(word: string): boolean {
    if (this.banned.has(word)) return false;
    if (this.words.has(word)) return true;
    if (this.syllables.size > 0) {
      const parts = word.split(' ');
      return parts.length === WORD_SYLLABLES && this.syllables.has(parts[0]) && this.syllables.has(parts[1]);
    }
    return false;
  }

  /** Các từ bắt đầu bằng `syllable` chưa có trong `used` */
  nextOptions(syllable: string, used: ReadonlySet<string> = new Set()): string[] {
    const curated = (this.byFirst.get(syllable) ?? []).filter((w) => !used.has(w));
    if (curated.length > 0 || !this.syllables.has(syllable)) return curated;
    const out: string[] = [];
    for (const s2 of this.syllables) {
      const w = `${syllable} ${s2}`;
      if (!used.has(w) && !this.banned.has(w)) {
        out.push(w);
        if (out.length >= 100) break;
      }
    }
    return out;
  }

  /** Số từ bắt đầu bằng `syllable` chưa có trong `used` */
  countNext(syllable: string, used: ReadonlySet<string>): number {
    if (this.syllables.size > 0) {
      if (!this.syllables.has(syllable)) return 0;
      let n = this.syllables.size;
      for (const u of used) if (firstSyllable(u) === syllable) n--;
      for (const b of this.banned) if (firstSyllable(b) === syllable && !used.has(b)) n--;
      return Math.max(0, n);
    }
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
      const list = this.byFirst.get(lastSyllable(w)) ?? [];
      return list.some((x) => x !== w && !used.has(x));
    };
    const pool = this.starters.length ? this.starters : [...this.words];
    for (let i = 0; i < 100 && pool.length; i++) {
      const w = pool[Math.floor(rng() * pool.length)];
      if (ok(w)) return w;
    }
    for (const w of this.words) if (ok(w)) return w;
    return null;
  }
}
