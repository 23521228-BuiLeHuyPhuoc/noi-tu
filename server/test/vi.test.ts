import { describe, expect, it } from 'vitest';
import { normalizeSyllable, normalizeWord, toSyllables } from '../../shared/src/vi';

describe('normalizeSyllable', () => {
  it('đưa hai kiểu đặt dấu về một dạng', () => {
    expect(normalizeSyllable('hoà')).toBe(normalizeSyllable('hòa'));
    expect(normalizeSyllable('thuỷ')).toBe(normalizeSyllable('thủy'));
    expect(normalizeSyllable('hoè')).toBe(normalizeSyllable('hòe'));
    expect(normalizeSyllable('xoá')).toBe('xóa');
    expect(normalizeSyllable('khoẻ')).toBe('khỏe');
  });

  it('giữ đúng vị trí dấu cho các vần thường gặp', () => {
    const cases: Record<string, string> = {
      'người': 'người', 'quá': 'quá', 'quyển': 'quyển', 'giường': 'giường',
      'gì': 'gì', 'già': 'già', 'khoái': 'khoái', 'toán': 'toán', 'thuở': 'thuở',
      'mía': 'mía', 'múa': 'múa', 'cái': 'cái', 'khuỷu': 'khuỷu', 'đường': 'đường',
      'tiếng': 'tiếng', 'việt': 'việt', 'quý': 'quý', 'hoàng': 'hoàng',
    };
    for (const [input, expected] of Object.entries(cases)) {
      expect(normalizeSyllable(input), input).toBe(expected);
    }
  });

  it('không phân biệt hoa thường và dạng Unicode tổ hợp', () => {
    expect(normalizeSyllable('ĐƯỜNG')).toBe('đường');
    expect(normalizeSyllable('đường'.normalize('NFD'))).toBe('đường');
  });

  it('từ chối ký tự không phải chữ tiếng Việt', () => {
    expect(normalizeSyllable('abc1')).toBeNull();
    expect(normalizeSyllable('a-b')).toBeNull();
    expect(normalizeSyllable('ngh')).toBeNull();
  });

  it('từ chối âm tiết không đúng cấu trúc tiếng Việt', () => {
    for (const s of ['acid', 'ad', 'posteriori', 'priori', 'nitric', 'amin']) {
      expect(normalizeSyllable(s), s).toBeNull();
    }
    for (const s of ['xít', 'xoong', 'nghiêng', 'khuya', 'quyết', 'giặt', 'ạch', 'ngoằn']) {
      expect(normalizeSyllable(s), s).not.toBeNull();
    }
  });
});

describe('normalizeWord / toSyllables', () => {
  it('gộp khoảng trắng thừa', () => {
    expect(normalizeWord('  Con   Mèo ')).toBe('con mèo');
    expect(toSyllables('mèo mướp')).toEqual(['mèo', 'mướp']);
  });
  it('trả về null khi có âm tiết sai', () => {
    expect(normalizeWord('con m3o')).toBeNull();
    expect(normalizeWord('   ')).toBeNull();
  });
});
