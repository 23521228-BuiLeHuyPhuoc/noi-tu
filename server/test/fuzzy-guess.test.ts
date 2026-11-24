import { describe, expect, it } from 'vitest';
import {
  GIAN_DIEP_WORDS,
  matchGianDiepGuess,
} from '../../shared/src/giandiep';
import {
  guessScore,
  levenshtein,
  matchGuess,
  mentionsWord,
  normalizeGuess,
  typoBudget,
} from '../../shared/src/fuzzyGuess';

/** [câu đoán, từ khóa, từ phe còn lại] */
type Case = [string, string, string];

describe('Đoán từ gần đúng (fuzzyGuess)', () => {
  it('chuẩn hóa, Levenshtein và ngân sách lỗi gõ', () => {
    expect(normalizeGuess('  Trà   SỮA!! ')).toBe('tra sua');
    expect(normalizeGuess('Đường-đèo')).toBe('duong deo');
    expect(levenshtein('rieng', 'rien')).toBe(1);
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect([5, 6, 10, 11, 15, 16].map(typoBudget)).toEqual([0, 1, 1, 2, 2, 3]);
  });

  it('chấp nhận đoán hơi khớp: hoa thường, dấu, dấu câu, chính tả nhẹ, loại từ, thừa/thiếu tiếng phụ, từ Bắc – Nam', () => {
    const hits: Case[] = [
      // hoa thường, khoảng trắng, dấu câu, không dấu, dính liền
      ['  TRÀ   SỮA!! ', 'Trà sữa', 'Trà đào'],
      ['tra sua', 'Trà sữa', 'Trà đào'],
      ['trasua', 'Trà sữa', 'Trà đào'],
      ['wi-fi', 'Wifi', '4G'],
      ['chuoi', 'Chuối', 'Đu đủ'],
      // sai dấu 1 tiếng, nhầm phụ âm vùng miền, sai 1 chữ ở tiếng dài
      ['trà sửa', 'Trà sữa', 'Trà đào'],
      ['chà xữa', 'Trà sữa', 'Trà đào'],
      ['xầu riêng', 'Sầu riêng', 'Mít'],
      ['sầu riên', 'Sầu riêng', 'Mít'],
      ['bánh sèo', 'Bánh xèo', 'Bánh khọt'],
      // loại từ đứng đầu
      ['con mèo', 'Mèo', 'Chó'],
      ['qua chuoi', 'Chuối', 'Đu đủ'],
      ['đôi đũa', 'Đũa', 'Thìa'],
      // thừa tiếng bổ nghĩa phía sau / thiếu tiếng đầu hoặc cuối / đuôi bổ nghĩa
      ['phở bò', 'Phở', 'Hủ tiếu'],
      ['con sư tử châu phi', 'Con sư tử', 'Con hổ'],
      ['bún bò', 'Bún bò Huế', 'Bún mọc'],
      ['bít tết', 'Bò bít tết', 'Bò né'],
      ['vịt lộn', 'Hột vịt lộn', 'Trứng cút'],
      ['điện thoại', 'Điện thoại thông minh', 'Máy tính bảng'],
      ['tivi', 'Tivi thông minh', 'Máy chiếu'],
      // từ Bắc – Nam / cách viết khác
      ['heo quay', 'Lợn quay', 'Vịt quay'],
      ['nón bảo hiểm', 'Mũ bảo hiểm', 'Mũ lưỡi trai'],
      ['chén', 'Bát', 'Đĩa'],
      ['cây dù', 'Ô', 'Áo mưa'],
      ['lạc', 'Đậu phộng', 'Hạt điều'],
      ['dưa chuột', 'Dưa leo', 'Bí đao'],
      ['cafe sữa', 'Cà phê sữa', 'Bạc xỉu'],
    ];
    for (const [g, t, o] of hits) expect(matchGuess(g, t, [o]), `${g} → ${t}`).toBe(true);
  });

  it('không dễ tới mức đoán bừa cũng trúng', () => {
    const misses: Case[] = [
      // đoán đúng từ phe còn lại, hoặc gõ sai nhẹ từ phe còn lại
      ['trà đào', 'Trà sữa', 'Trà đào'],
      ['tra dao', 'Trà sữa', 'Trà đào'],
      ['bánh khột', 'Bánh xèo', 'Bánh khọt'],
      // chỉ nói phần chung chung
      ['trà', 'Trà sữa', 'Trà đào'],
      ['bánh', 'Bánh xèo', 'Bánh khọt'],
      ['con', 'Con sư tử', 'Con hổ'],
      ['bún', 'Bún bò Huế', 'Bún mọc'],
      // từ 1 tiếng: khác chữ, hoặc có gõ dấu mà dấu sai
      ['chuột', 'Chuối', 'Đu đủ'],
      ['dừa', 'Dứa', 'Thanh long'],
      ['nhẫn', 'Nhãn', 'Măng cụt'],
      ['sa mạc', 'Sả', 'Lá chanh'],
      // sai 1 chữ ở tiếng ngắn là ra món khác
      ['bánh bèo', 'Bánh xèo', 'Bánh khọt'],
      ['gà tần', 'Gà rán', 'Gà nướng'],
      ['bánh căn', 'Bánh canh', 'Miến'],
      // sai dấu cả hai tiếng
      ['bành xẹo', 'Bánh xèo', 'Bánh khọt'],
      // bỏ tiếng giữa, hoặc vừa bỏ tiếng vừa đổi phụ âm
      ['bún huế', 'Bún bò Huế', 'Bún mọc'],
      ['bánh kem', 'Bánh su kem', 'Bánh tiramisu'],
      ['bánh chưng', 'Bánh trung thu', 'Bánh pía'],
      // đoán gộp cả từ còn lại, hoặc thừa quá nhiều tiếng
      ['gà vịt', 'Gà', 'Vịt'],
      ['phở hủ tiếu', 'Phở', 'Hủ tiếu'],
      ['con sư tử và con hổ', 'Con sư tử', 'Con hổ'],
      ['bánh mì phở', 'Phở', 'Hủ tiếu'],
      ['ô tô', 'Ô', 'Áo mưa'],
      // gõ bừa
      ['zzzz', 'Cá heo', 'Cá voi'],
      ['', 'Cá heo', 'Cá voi'],
      ['   ', 'Cá heo', 'Cá voi'],
      ['cá '.repeat(30), 'Cá heo', 'Cá voi'],
    ];
    for (const [g, t, o] of misses) expect(matchGuess(g, t, [o]), `${g} ↛ ${t}`).toBe(false);
  });

  it('điểm gần đúng: khớp hẳn = 0, càng "hơi khớp" điểm càng cao', () => {
    expect(guessScore('Trà sữa', 'Trà sữa')).toBe(0);
    expect(guessScore('tra sua', 'Trà sữa')).toBe(0);
    expect(guessScore('sầu riên', 'Sầu riêng')).toBe(1);
    expect(guessScore('phở bò', 'Phở')).toBe(1);
    expect(guessScore('bún bò', 'Bún bò Huế')).toBe(1);
    expect(guessScore('trà', 'Trà sữa')).toBeNull();
  });

  it('chặn lộ từ theo nguyên tiếng, có xét dấu (không chặn oan câu chat thường)', () => {
    // không chặn oan: từ ngắn nằm trong chữ khác, hoặc chữ không dấu mà người gõ có dùng bộ gõ
    expect(mentionsWord('cho tôi ở đây nha', 'Ô')).toBe(false);
    expect(mentionsWord('gần nhà mình có quán', 'Gà')).toBe(false);
    expect(mentionsWord('cho mình hỏi cái này', 'Chó')).toBe(false);
    expect(mentionsWord('nó hơi ngọt', 'Mít')).toBe(false);
    // chặn khi nhắc thẳng từ khóa
    expect(mentionsWord('nhà mình nuôi con gà', 'Gà')).toBe(true);
    expect(mentionsWord('GÀ!!!', 'Gà')).toBe(true);
    expect(mentionsWord('con cho nha minh', 'Chó')).toBe(true);
    expect(mentionsWord('uống trà sữa không', 'Trà sữa')).toBe(true);
    expect(mentionsWord('uong tra sua khong', 'Trà sữa')).toBe(true);
    expect(mentionsWord('uống tra sua không', 'Trà sữa')).toBe(true);
    expect(mentionsWord('đi mua trasua đi', 'Trà sữa')).toBe(true);
    expect(mentionsWord('', 'Trà sữa')).toBe(false);
  });

  it('toàn bộ ngân hàng: đoán đúng (kể cả gõ thường không dấu) là trúng, đoán từ phe kia hay chỉ loại từ thì trượt', () => {
    const bare = ['con', 'chim', 'quả', 'bánh', 'nước', 'máy', 'xe', 'đàn', 'mạng'];
    for (const p of GIAN_DIEP_WORDS) {
      for (const [mine, other] of [[p.wordA, p.wordB], [p.wordB, p.wordA]]) {
        expect(matchGianDiepGuess(mine, mine, other), mine).toBe(true);
        expect(matchGianDiepGuess(normalizeGuess(mine), mine, other), `${mine} không dấu`).toBe(true);
        expect(matchGianDiepGuess(other, mine, other), `${other} ↛ ${mine}`).toBe(false);
        for (const b of bare) expect(matchGianDiepGuess(b, mine, other), `${b} ↛ ${mine}`).toBe(false);
      }
    }
  });
});
