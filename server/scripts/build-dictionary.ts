/**
 * Tạo server/data/words.txt từ các nguồn từ điển mở.
 *
 * Cách dùng:
 *   npm run build:dict -- <Viet74K.txt> <vntk_dictionary.json>
 *
 * Nguồn:
 *   - Viet74K.txt: https://raw.githubusercontent.com/duyet/vietnamese-wordlist/master/Viet74K.txt
 *   - dictionary.json: https://raw.githubusercontent.com/vntk/dictionary/master/data/dictionary.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toSyllables } from '../../shared/src/vi';
import { WORD_SYLLABLES } from '../../shared/src/types';

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

/** Trả về từ đã chuẩn hóa nếu mục này dùng được cho game, ngược lại null. */
export function acceptEntry(entry: string): string | null {
  const e = entry.normalize('NFC').trim();
  if (!e) return null;
  if (e !== e.toLowerCase()) return null; // tên riêng, viết tắt
  if (/[fjwz]/.test(e)) return null; // từ mượn nước ngoài
  const syl = toSyllables(e);
  if (!syl || syl.length !== WORD_SYLLABLES) return null;
  return syl.join(' ');
}

function main() {
  const [viet74kPath, vntkPath] = process.argv.slice(2);
  if (!viet74kPath || !vntkPath) {
    console.error('Cách dùng: npm run build:dict -- <Viet74K.txt> <dictionary.json>');
    process.exit(1);
  }

  const entries: string[] = [];
  entries.push(...readFileSync(viet74kPath, 'utf8').split(/\r?\n/));
  entries.push(...Object.keys(JSON.parse(readFileSync(vntkPath, 'utf8'))));

  const words = new Set<string>();
  for (const e of entries) {
    const w = acceptEntry(e);
    if (w) words.add(w);
  }
  const sorted = [...words].sort((a, b) => a.localeCompare(b, 'vi'));

  // tự kiểm tra
  for (const w of sorted) {
    const parts = w.split(' ');
    if (parts.length !== 2 || w !== w.toLowerCase()) throw new Error(`Từ không hợp lệ: ${w}`);
  }
  if (sorted.length < 10000) throw new Error(`Kho từ quá ít (${sorted.length}), kiểm tra lại file nguồn`);

  writeFileSync(join(DATA_DIR, 'words.txt'), sorted.join('\n') + '\n');

  const header = (title: string) =>
    `# ${title}\n# Mỗi dòng một từ 2 chữ. Dòng bắt đầu bằng # bị bỏ qua. Khởi động lại server để áp dụng.\n`;
  const extra = join(DATA_DIR, 'extra-words.txt');
  const banned = join(DATA_DIR, 'banned-words.txt');
  if (!existsSync(extra)) writeFileSync(extra, header('Từ bổ sung thêm vào kho'));
  if (!existsSync(banned)) writeFileSync(banned, header('Từ bị loại khỏi kho (sai hoặc không muốn dùng)'));

  console.log(`Đã ghi ${sorted.length} từ vào data/words.txt (từ ${entries.length} mục nguồn)`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
