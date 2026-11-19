/**
 * Ruby: tiền tệ trong game. Nạp bằng chuyển khoản đang tạm ngưng (đã gỡ QR và số tài khoản khỏi web);
 * quản trị vẫn cộng được theo mã nạp. Dùng chung app + server: bảng giá, mã nạp riêng của từng tài khoản.
 * Ruby tách hẳn khỏi xu Bầu cua / Cờ tỷ phú: không cược, không đổi ra xu hay tiền.
 */

/** các gói nạp: số tiền (đồng) -> Ruby nhận; bonus = % tặng thêm để hiện nhãn */
export const RUBY_PACKS: readonly { amount: number; ruby: number; bonus: number }[] = [
  { amount: 10_000, ruby: 100, bonus: 0 },
  { amount: 20_000, ruby: 200, bonus: 0 },
  { amount: 50_000, ruby: 550, bonus: 10 },
  { amount: 100_000, ruby: 1150, bonus: 15 },
  { amount: 200_000, ruby: 2400, bonus: 20 },
  { amount: 500_000, ruby: 6250, bonus: 25 },
];

/** chữ cái của mã nạp: bỏ 0/O, 1/I cho khỏi đọc nhầm */
export const TOPUP_CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const TOPUP_CODE_RE = /XL[0-9A-Z]{6}/;

/**
 * Ruby nhận được cho số tiền quản trị xác nhận: đúng giá một gói -> Ruby của gói;
 * không khớp gói nào -> 1.000đ = 10 Ruby (không thưởng); dưới 1.000đ -> 0. Lần được cộng đầu tiên nhân đôi.
 */
export function rubyForAmount(amount: number, first: boolean): number {
  if (!Number.isFinite(amount) || amount < 1000) return 0;
  const pack = RUBY_PACKS.find((p) => p.amount === amount);
  const ruby = pack ? pack.ruby : Math.floor(amount / 1000) * 10;
  return first ? ruby * 2 : ruby;
}

export function newTopupCode(rand: () => number = Math.random): string {
  let code = 'XL';
  for (let i = 0; i < 6; i++) code += TOPUP_CODE_ALPHABET[Math.floor(rand() * TOPUP_CODE_ALPHABET.length) % TOPUP_CODE_ALPHABET.length];
  return code;
}

/** tìm mã nạp trong nội dung chuyển khoản: in hoa, bỏ khoảng trắng và - . _ */
export function normalizeTopupCode(text: string): string | null {
  const flat = String(text ?? '').toUpperCase().replace(/[\s\-._]/g, '');
  return TOPUP_CODE_RE.exec(flat)?.[0] ?? null;
}

/** Kim cương thưởng khi thắng / trừ khi thua mỗi ván (có thể trừ âm số dư) */
export const GAME_WIN_RUBY = 2000;
export const GAME_LOSS_RUBY = 2000;
/** Tỉ lệ kim cương người nhận quà được hưởng (70% giá trị món quà) */
export const GIFT_RECEIVER_SHARE = 0.7;

export function giftRubyForReceiver(price: number): number {
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.max(0, Math.floor(price * GIFT_RECEIVER_SHARE));
}
