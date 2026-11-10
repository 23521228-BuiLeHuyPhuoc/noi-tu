import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeWord, firstSyllable, lastSyllable } from '../../shared/src/vi';
import { WORD_SYLLABLES } from '../../shared/src/types';

export type Rng = () => number;

export class Dictionary {
  private readonly words = new Set<string>();
  private readonly byFirst = new Map<string, string[]>();
  /** các từ có thể dùng làm từ mở đầu (chữ cuối có ít nhất vài từ nối tiếp) */
  private starters: string[] = [];

  constructor(words: Iterable<string>, private readonly banned: ReadonlySet<string> = new Set()) {
    for (const raw of words) this.insert(raw);
    this.starters = [...this.words].filter((w) => (this.byFirst.get(lastSyllable(w))?.length ?? 0) >= 3);
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
    return new Dictionary([...read('words.txt'), ...read('extra-words.txt')], banned);
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
    const pool = this.starters.length ? this.starters : [...this.words];
    for (let i = 0; i < 100 && pool.length; i++) {
      const w = pool[Math.floor(rng() * pool.length)];
      if (ok(w)) return w;
    }
    for (const w of this.words) if (ok(w)) return w;
    return null;
  }
}
