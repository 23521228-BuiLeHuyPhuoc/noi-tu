import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Dictionary } from '../src/dictionary';
import { smallDict } from './helpers';

describe('Dictionary', () => {
  it('chuẩn hóa khi nạp và khi tra', () => {
    const d = new Dictionary(['Hoà Bình', 'thuỷ thủ', 'một', 'ba chữ luôn']);
    expect(d.size).toBe(2);
    expect(d.has('hòa bình')).toBe(true);
    expect(d.has('thủy thủ')).toBe(true);
  });

  it('đếm số từ còn nối được, trừ các từ đã dùng', () => {
    const d = smallDict();
    expect(d.countNext('đồ', new Set())).toBe(2);
    expect(d.countNext('đồ', new Set(['đồ đạc']))).toBe(1);
    expect(d.countNext('lủn', new Set())).toBe(0);
  });

  it('randomStart không chọn từ ngõ cụt hoặc từ đã dùng', () => {
    const d = new Dictionary(['cụt lủn', 'a b', 'b c', 'c d']);
    for (let i = 0; i < 50; i++) {
      const w = d.randomStart(new Set(['a b']));
      expect(w).not.toBe('cụt lủn');
      expect(w).not.toBe('a b');
      expect(w).not.toBe('c d'); // không có từ bắt đầu bằng "d"
    }
  });

  it('randomStart trả về null khi hết từ', () => {
    const d = new Dictionary(['cụt lủn']);
    expect(d.randomStart(new Set())).toBeNull();
  });

  it('randomStart ưu tiên từ có giải nghĩa', () => {
    const words = ['ăn cơm', 'cơm nếp', 'cơm tấm', 'cơm hến', 'hến ăn', 'bàn cơm', 'bàn ghế'];
    const d = new Dictionary(words, new Set(), { 'bàn cơm': { text: 'nghĩa hợp lệ', source: 't' } });
    for (let i = 0; i < 50; i++) expect(d.randomStart(new Set())).toBe('bàn cơm');
    // từ có nghĩa đã dùng hết thì quay về kho thường
    expect(d.randomStart(new Set(['bàn cơm']))).not.toBeNull();
  });

  it('randomStart quay về kho thường khi không có giải nghĩa nào', () => {
    const d = new Dictionary(['ăn cơm', 'cơm nếp', 'cơm tấm', 'cơm hến']);
    expect(d.randomStart(new Set())).toBe('ăn cơm');
  });

  it('bỏ giải nghĩa tham chiếu "Xem ..." hoặc quá ngắn', () => {
    const src = (text: string) => ({ text, source: 't' });
    const d = new Dictionary(['cái bàn', 'con mèo', 'quả cam', 'bàn ghế', 'mèo con'], new Set(), {
      'cái bàn': src('Xem Hòn Chông'),
      'con mèo': src('  xem mèo mướp'),
      'quả cam': src('abc'),
      'bàn ghế': src('Xemloa là một từ'),
      'mèo con': src('Con mèo nhỏ'),
    });
    expect(d.definition('cái bàn').source).toBeNull();
    expect(d.definition('con mèo').source).toBeNull();
    expect(d.definition('quả cam').source).toBeNull();
    expect(d.definition('bàn ghế').source).toBe('t');
    expect(d.definition('mèo con').text).toBe('Con mèo nhỏ');
  });

  it('load: words.txt + extra − banned, bỏ dòng chú thích', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dict-'));
    writeFileSync(join(dir, 'words.txt'), 'con mèo\nđồ đạc\nđồ vật\n');
    writeFileSync(join(dir, 'extra-words.txt'), '# chú thích\ncon chó\n');
    writeFileSync(join(dir, 'banned-words.txt'), '# chú thích\nĐồ  Đạc\n');
    const d = Dictionary.load(dir);
    expect(d.has('con chó')).toBe(true);
    expect(d.has('đồ đạc')).toBe(false);
    expect(d.size).toBe(3);
  });

  it('kho từ lớn (server/data): chỉ nhận từ có nghĩa trong từ điển, từ vô nghĩa bị từ chối', () => {
    const d = Dictionary.load(join(__dirname, '..', 'data'));
    expect(d.size).toBeGreaterThan(80_000);
    expect(d.has('học sinh')).toBe(true);
    expect(d.has('mèo mướp')).toBe(true);
    expect(d.has('mèo bàn')).toBe(false);
  });
});
