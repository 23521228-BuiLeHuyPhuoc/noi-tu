/**
 * Tạo server/data/words.txt bằng cách gộp NHIỀU nguồn mở.
 *
 * Cách dùng:
 *   npm run build:dict -- <thư-mục-nguồn>
 *
 * Thư mục nguồn chứa các file (tải bằng scripts/fetch-sources.sh); thiếu file nào thì bỏ qua nguồn đó:
 *   Viet74K.txt               duyet/vietnamese-wordlist (Hồ Ngọc Đức, GPL)
 *   vntk_dictionary.json      vntk/dictionary (Từ điển tiếng Việt thông dụng)
 *   uts_*.txt                 undertheseanlp/dictionary (Hồ Ngọc Đức + Từ điển TV + Wiktionary, JSONL)
 *   vietphap/vietduc/vietnga/vietnhat/viethan.tab   Việt–Pháp/Đức/Nga/Nhật/Hàn (Việt–Trung không có trên upstream nên bỏ)
 *   phapviet/ducviet/ngaviet/nhatviet/hanviet/trungviet.tab   giải nghĩa Pháp/Đức/Nga/Nhật/Hàn/Trung–Việt
 *   vietviet.tab              catusf/tudien: Từ điển Việt–Việt (StarDict)
 *   vietanh.tab, spdict_vietanh.tab, viettbn.tab, viet_anh.xml   từ điển Việt–Anh / Việt–Tây Ban Nha (mục từ tiếng Việt)
 *   anhviet.tab, anhvietbeta.tab   từ điển Anh–Việt: lấy các cụm 2 chữ đứng riêng trong phần giải nghĩa tiếng Việt
 * Cộng thêm server/data/sources/wiktionary-kaikki.txt (Wiktionary tiếng Việt, kaikki.org) có sẵn trong repo.
 *
 * Nguyên tắc: một cụm 2 chữ được nhận nếu (a) là mục từ của ít nhất một từ điển, hoặc
 * (b) xuất hiện như một lời giải nghĩa độc lập trong từ điển Anh–Việt từ 2 lần trở lên
 * (tức là người soạn từ điển dùng nó như một từ/cụm từ có nghĩa) và không phải cụm hư từ.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSyllables } from '../../shared/src/vi';
import { WORD_SYLLABLES } from '../../shared/src/types';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

/** Trả về từ đã chuẩn hóa nếu mục này dùng được cho game, ngược lại null. */
export function acceptEntry(entry: string): string | null {
  const e = entry.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!e) return null;
  if (e !== e.toLowerCase()) return null; // tên riêng, viết tắt
  if (/[fjwz]/.test(e)) return null; // từ mượn nước ngoài
  const syl = toSyllables(e);
  if (!syl || syl.length !== WORD_SYLLABLES) return null;
  return syl.join(' ');
}

// hư từ: cụm bắt đầu/kết thúc bằng các chữ này thường chỉ là mảnh câu, không phải từ
const BAD_FIRST = new Set('của và các những là thì mà với bởi nếu đã sẽ đang vẫn cũng rất quá hơi tuy song nhưng hay hoặc'.split(' '));
const BAD_SECOND = new Set('của và các những là thì mà với nhé ạ à ư nhỉ chăng hả hay hoặc nhưng'.split(' '));

export function looksLikePhrase(word: string): boolean {
  const [a, b] = word.split(' ');
  return !BAD_FIRST.has(a) && !BAD_SECOND.has(b) && a !== b;
}

type Source = { name: string; entries: string[] };

function lines(path: string): string[] {
  return readFileSync(path, 'utf8').split(/\r?\n/);
}

function headwordsTab(path: string): string[] {
  return lines(path)
    .filter((l) => l && !l.startsWith('##'))
    .map((l) => l.split('\t')[0])
    .flatMap((h) => h.split(/[,;]/));
}

function jsonl(path: string): string[] {
  return lines(path).flatMap((l) => {
    try {
      return [JSON.parse(l).text as string];
    } catch {
      return [];
    }
  });
}

/** Các cụm tiếng Việt đứng riêng trong phần giải nghĩa của từ điển Anh–Việt */
function glossSegments(path: string): string[] {
  const out: string[] = [];
  for (const l of lines(path)) {
    const def = l.split('\t')[1];
    if (!def) continue;
    for (const part of def.split(/<br>|\\n/)) {
      const t = part.trim();
      if (!t.startsWith('-')) continue; // chỉ lấy dòng nghĩa, bỏ ví dụ (=...) và từ loại (*...)
      const clean = t.slice(1).replace(/\([^)]*\)/g, ' ').replace(/\{[^}]*\}/g, ' ');
      for (const seg of clean.split(/[,;:/!?."“”…]/)) out.push(seg);
    }
  }
  return out;
}

function loadSources(dir: string): { headword: Source[]; gloss: Source[] } {
  const headword: Source[] = [];
  const gloss: Source[] = [];
  const has = (f: string) => existsSync(join(dir, f));
  if (has('Viet74K.txt')) headword.push({ name: 'Viet74K', entries: lines(join(dir, 'Viet74K.txt')) });
  if (has('vntk_dictionary.json')) {
    headword.push({ name: 'vntk', entries: Object.keys(JSON.parse(readFileSync(join(dir, 'vntk_dictionary.json'), 'utf8'))) });
  }
  for (const f of readdirSync(dir).filter((x) => /^uts_.*\.txt$/.test(x))) {
    headword.push({ name: `underthesea/${f.slice(4, -4)}`, entries: jsonl(join(dir, f)) });
  }
  for (const [f, name] of [
    ['vietviet.tab', 'Việt–Việt'],
    ['vietanh.tab', 'Việt–Anh'],
    ['spdict_vietanh.tab', 'SPDict Việt–Anh'],
    ['viettbn.tab', 'Việt–TBN'],
    ['vietphap.tab', 'Việt–Pháp'],
    ['vietduc.tab', 'Việt–Đức'],
    ['vietnga.tab', 'Việt–Nga'],
    ['vietnhat.tab', 'Việt–Nhật'],
    ['viethan.tab', 'Việt–Hàn'],
  ] as const) {
    if (has(f)) headword.push({ name, entries: headwordsTab(join(dir, f)) });
  }
  if (has('viet_anh.xml')) {
    const xml = readFileSync(join(dir, 'viet_anh.xml'), 'utf8');
    headword.push({ name: 'OVDP Việt–Anh', entries: [...xml.matchAll(/<word>([^<]*)<\/word>/g)].map((m) => m[1]) });
  }
  const wk = join(DATA_DIR, 'sources', 'wiktionary-kaikki.txt');
  if (existsSync(wk)) headword.push({ name: 'Wiktionary', entries: lines(wk) });
  for (const [f, name] of [
    ['anhviet.tab', 'giải nghĩa Anh–Việt'],
    ['anhvietbeta.tab', 'giải nghĩa Anh–Việt (beta)'],
    ['phapviet.tab', 'giải nghĩa Pháp–Việt'],
    ['ducviet.tab', 'giải nghĩa Đức–Việt'],
    ['ngaviet.tab', 'giải nghĩa Nga–Việt'],
    ['nhatviet.tab', 'giải nghĩa Nhật–Việt'],
    ['hanviet.tab', 'giải nghĩa Hàn–Việt'],
    ['trungviet.tab', 'giải nghĩa Trung–Việt'],
  ] as const) {
    if (has(f)) gloss.push({ name, entries: glossSegments(join(dir, f)) });
  }
  return { headword, gloss };
}

// Retain source text verbatim apart from markup/whitespace; never derive definitions from headwords.
export function extractDefinitions(dir: string): Record<string, { text: string; source: string }> {
  const definitions: Record<string, { text: string; source: string }> = {};
  const add = (raw: string, text: unknown, source: string) => {
    const word = acceptEntry(raw);
    if (!word || typeof text !== 'string') return;
    const clean = text.replace(/<[^>]*>/g, ' ').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean && !definitions[word]) definitions[word] = { text: clean.slice(0, 400), source };
  };
  const tab = join(dir, 'vietviet.tab');
  if (existsSync(tab)) for (const line of lines(tab)) {
    const [word, ...parts] = line.split('\t');
    add(word, parts.join(' '), 'catusf/tudien: vietviet.tab');
  }
  const json = join(dir, 'vntk_dictionary.json');
  if (existsSync(json)) for (const [word, value] of Object.entries(JSON.parse(readFileSync(json, 'utf8')))) {
    if (typeof value === 'string') add(word, value, 'vntk/dictionary');
    else if (Array.isArray(value)) for (const text of value) add(word, text, 'vntk/dictionary');
  }
  return definitions;
}

function main() {
  const dir = process.argv[2];
  if (!dir || !existsSync(dir)) {
    console.error('Cách dùng: npm run build:dict -- <thư-mục-nguồn>');
    process.exit(1);
  }
  const { headword, gloss } = loadSources(dir);
  const words = new Set<string>();
  const stats: string[] = [];

  for (const s of headword) {
    const before = words.size;
    let valid = 0;
    for (const e of s.entries) {
      const w = acceptEntry(e);
      if (w) {
        valid++;
        words.add(w);
      }
    }
    stats.push(`${s.name.padEnd(28)} ${String(valid).padStart(7)} cụm 2 chữ, mới thêm ${words.size - before}`);
  }

  // cụm từ trong lời giải nghĩa: đếm tần suất qua mọi nguồn
  const freq = new Map<string, number>();
  for (const s of gloss) {
    for (const e of s.entries) {
      const w = acceptEntry(e);
      if (w && looksLikePhrase(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  const MIN_GLOSS = 2;
  let before = words.size;
  for (const [w, n] of freq) if (n >= MIN_GLOSS) words.add(w);
  stats.push(`${'cụm trong lời giải nghĩa'.padEnd(28)} ${String(freq.size).padStart(7)} cụm, ≥${MIN_GLOSS} lần: mới thêm ${words.size - before}`);

  // lượng từ + danh từ (Wiktionary ghi rõ danh từ nào đi với lượng từ nào: cái bàn, con mèo, quả cam…)
  before = words.size;
  const cls = join(DATA_DIR, 'sources', 'wiktionary-classifiers.txt');
  const clsLines = existsSync(cls) ? lines(cls) : [];
  for (const l of clsLines) {
    const w = acceptEntry(l);
    if (w) words.add(w);
  }
  // lượng từ tương đương thì đổi chỗ cho nhau được: cái ↔ chiếc, quả ↔ trái, quyển ↔ cuốn, bông ↔ đóa, ngôi ↔ căn, hạt ↔ hột
  const SAME: [string, string][] = [
    ['cái', 'chiếc'],
    ['quả', 'trái'],
    ['quyển', 'cuốn'],
    ['bông', 'đóa'],
    ['ngôi', 'căn'],
    ['hạt', 'hột'],
  ];
  for (const w of [...words]) {
    const [a, b] = w.split(' ');
    for (const [x, y] of SAME) {
      if (a === x) words.add(`${y} ${b}`);
      if (a === y) words.add(`${x} ${b}`);
    }
  }
  // mở rộng cụm danh từ/động từ có nghĩa theo đúng nhóm danh từ đã phân loại trong Wiktionary
  const ANIMALS_PRE = ['chú', 'đàn', 'bầy', 'nuôi', 'bắt'];
  const ANIMALS_SUF = ['con', 'mẹ', 'đực', 'cái', 'nhỏ', 'lớn', 'to', 'rừng', 'nhà', 'hoang', 'này', 'kia', 'đó', 'ấy', 'nào', 'khác'];
  const OBJECTS_CLS = new Set(['cái', 'chiếc', 'bộ', 'căn', 'ngôi', 'tờ', 'quyển', 'cuốn', 'bức', 'tấm']);
  const OBJECTS_PRE = ['mua', 'bán', 'sửa', 'dùng'];
  const OBJECTS_SUF = ['mới', 'cũ', 'nhỏ', 'lớn', 'to', 'đẹp', 'tốt', 'hỏng', 'này', 'kia', 'đó', 'ấy', 'nào', 'khác', 'riêng', 'chung'];
  const PLANTS_CLS = new Set(['bông', 'đóa', 'quả', 'trái', 'hạt', 'hột', 'củ', 'cây']);
  const PLANTS_PRE = ['trồng', 'hái', 'mùa', 'vườn', 'mua', 'bán'];
  const PLANTS_SUF = ['tươi', 'khô', 'chín', 'xanh', 'non', 'rừng', 'vườn', 'nhỏ', 'lớn', 'to', 'đẹp', 'thơm', 'này', 'kia', 'đó', 'nào', 'khác'];
  for (const l of clsLines) {
    const w = acceptEntry(l);
    if (!w) continue;
    const [c, n] = w.split(' ');
    if (c === 'con') {
      for (const p of ANIMALS_PRE) if (p !== n) words.add(`${p} ${n}`);
      for (const s of ANIMALS_SUF) if (s !== n) words.add(`${n} ${s}`);
    } else if (OBJECTS_CLS.has(c)) {
      for (const p of OBJECTS_PRE) if (p !== n) words.add(`${p} ${n}`);
      for (const s of OBJECTS_SUF) if (s !== n) words.add(`${n} ${s}`);
    } else if (PLANTS_CLS.has(c)) {
      for (const p of PLANTS_PRE) if (p !== n) words.add(`${p} ${n}`);
      for (const s of PLANTS_SUF) if (s !== n) words.add(`${n} ${s}`);
    }
  }
  stats.push(`${'lượng từ + danh từ'.padEnd(28)} ${''.padStart(7)}       mới thêm ${words.size - before}`);

  // luôn giữ mọi từ đã có giải nghĩa
  before = words.size;
  const defPath = join(DATA_DIR, 'definitions.json');
  if (existsSync(defPath)) {
    for (const k of Object.keys(JSON.parse(readFileSync(defPath, 'utf8')))) {
      const w = acceptEntry(k);
      if (w) words.add(w);
    }
  }
  stats.push(`${'từ có giải nghĩa (giữ lại)'.padEnd(28)} ${''.padStart(7)}       mới thêm ${words.size - before}`);

  const sorted = [...words].sort((a, b) => a.localeCompare(b, 'vi'));
  for (const w of sorted) {
    if (w.split(' ').length !== 2 || w !== w.toLowerCase()) throw new Error(`Từ không hợp lệ: ${w}`);
  }
  if (sorted.length < 40000) throw new Error(`Kho từ quá ít (${sorted.length}), kiểm tra lại thư mục nguồn`);

  writeFileSync(join(DATA_DIR, 'words.txt'), sorted.join('\n') + '\n');
  if (process.argv.includes('--with-defs')) {
    const definitionsPath = join(DATA_DIR, 'definitions.json');
    const previous = existsSync(definitionsPath) ? JSON.parse(readFileSync(definitionsPath, 'utf8')) : {};
    writeFileSync(definitionsPath, JSON.stringify({ ...extractDefinitions(dir), ...previous }, null, 2) + '\n');
  }
  const header = (title: string) =>
    `# ${title}\n# Mỗi dòng một từ 2 chữ. Dòng bắt đầu bằng # bị bỏ qua. Khởi động lại server để áp dụng.\n`;
  const extra = join(DATA_DIR, 'extra-words.txt');
  const banned = join(DATA_DIR, 'banned-words.txt');
  if (!existsSync(extra)) writeFileSync(extra, header('Từ bổ sung thêm vào kho'));
  if (!existsSync(banned)) writeFileSync(banned, header('Từ bị loại khỏi kho (sai hoặc không muốn dùng)'));

  console.log(stats.join('\n'));
  console.log(`\nTổng: ${sorted.length} từ → data/words.txt`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
