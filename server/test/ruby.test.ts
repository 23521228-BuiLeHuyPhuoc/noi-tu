import { describe, expect, it } from 'vitest';
import { RUBY_PACKS, TOPUP_BANK, newTopupCode, normalizeTopupCode, rubyForAmount, vietQrUrl } from '../../shared/src/ruby';

describe('Ruby: bảng giá, mã nạp, QR', () => {
  it('mỗi gói cho đúng số Ruby', () => {
    expect(RUBY_PACKS.map((p) => [p.amount, p.ruby, p.bonus])).toEqual([
      [10_000, 100, 0], [20_000, 200, 0], [50_000, 550, 10], [100_000, 1150, 15], [200_000, 2400, 20], [500_000, 6250, 25],
    ]);
    for (const p of RUBY_PACKS) expect(rubyForAmount(p.amount, false)).toBe(p.ruby);
  });

  it('lần đầu nhân đôi, số lẻ tính theo tỉ lệ, dưới 1.000đ không cộng', () => {
    expect(rubyForAmount(50_000, true)).toBe(1100);
    expect(rubyForAmount(35_500, false)).toBe(350);
    expect(rubyForAmount(35_500, true)).toBe(700);
    expect(rubyForAmount(999, true)).toBe(0);
    expect(rubyForAmount(-5, false)).toBe(0);
    expect(rubyForAmount(Number.NaN, false)).toBe(0);
  });

  it('mã nạp: XL + 6 ký tự không dễ nhầm', () => {
    for (let i = 0; i < 200; i++) expect(newTopupCode()).toMatch(/^XL[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
  });

  it('tìm mã trong nội dung chuyển khoản dù có khoảng trắng, chữ thường, gạch', () => {
    expect(normalizeTopupCode('chuyen tien xl 8f3-k2q')).toBe('XL8F3K2Q');
    expect(normalizeTopupCode('NAP XL8F3K2Q CAM ON')).toBe('XL8F3K2Q');
    expect(normalizeTopupCode('khong co ma')).toBeNull();
  });

  it('URL QR VietQR điền sẵn BIDV, số tiền, mã và tên chủ tài khoản', () => {
    expect(TOPUP_BANK).toEqual({ bank: 'BIDV', bin: '970418', account: '6353025859', name: 'BUI LE HUY PHUOC' });
    expect(vietQrUrl(50000, 'XL8F3K2Q')).toBe(
      'https://img.vietqr.io/image/970418-6353025859-compact2.png?amount=50000&addInfo=XL8F3K2Q&accountName=BUI%20LE%20HUY%20PHUOC',
    );
    expect(vietQrUrl(null, 'XL 1')).toBe('https://img.vietqr.io/image/970418-6353025859-compact2.png?addInfo=XL%201&accountName=BUI%20LE%20HUY%20PHUOC');
  });
});
