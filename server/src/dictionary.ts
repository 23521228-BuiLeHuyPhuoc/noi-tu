import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWord, firstSyllable, lastSyllable } from '../../shared/src/vi';
import { type WordDefinition, WORD_SYLLABLES } from '../../shared/src/types';

export type Rng = () => number;

/** Giải nghĩa dùng được: không phải tham chiếu chéo ("Xem ...") và không quá ngắn */
export function usableDefinition(text: string): boolean {
  const t = text.trim();
  return t.length >= 4 && !/^[Xx]em /.test(t);
}

export class Dictionary {
  private readonly definitions = new Map<string, WordDefinition>();
  private readonly words = new Set<string>();
  private readonly byFirst = new Map<string, string[]>();
  /** các từ có thể dùng làm từ mở đầu (chữ cuối có ít nhất vài từ nối tiếp) */
  private starters: string[] = [];
  /** như `starters` nhưng chỉ gồm từ có giải nghĩa dùng được */
  private definedStarters: string[] = [];

  constructor(words: Iterable<string>, private readonly banned: ReadonlySet<string> = new Set(), definitions: Record<string, WordDefinition> = {}) {
    for (const [raw, value] of Object.entries(definitions)) {
      const word = normalizeWord(raw);
      if (word && value && typeof value.text === "string" && typeof value.source === "string" && value.source.trim() && usableDefinition(value.text))
        this.definitions.set(word, { text: value.text.trim().slice(0, 400), source: value.source.trim() });
    }
    for (const raw of words) this.insert(raw);
    this.starters = [...this.words].filter((w) => (this.byFirst.get(lastSyllable(w))?.length ?? 0) >= 3);
    this.definedStarters = this.starters.filter((w) => this.definitions.has(w));
  }

  /** Thêm một từ (vd. từ được cả phòng duyệt). Trả về từ đã chuẩn hóa nếu thêm mới, ngược lại null. */
  add(raw: string): string | null {
    return this.insert(raw);
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
    return this.words.size;
  }

  /** `word` phải đã được chuẩn hóa */
  has(word: string): boolean {
    return this.words.has(word);
  }

  /** Các từ bắt đầu bằng `syllable` chưa có trong `used` */
  nextOptions(syllable: string, used: ReadonlySet<string> = new Set()): string[] {
    return (this.byFirst.get(syllable) ?? []).filter((w) => !used.has(w));
  }

  /** Số từ bắt đầu bằng `syllable` chưa có trong `used` */
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
      const list = this.byFirst.get(lastSyllable(w)) ?? [];
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
