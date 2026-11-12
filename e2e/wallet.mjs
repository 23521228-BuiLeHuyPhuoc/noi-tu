// Chạy: (cd server && npm run build && ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1 MAIL_DEBUG=1 PORT=4320 node dist/server.js)
//       (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:4320 npx expo export -p web --output-dir /tmp/web-w)
//       (cd /tmp/web-w && python3 -m http.server 8396)
//       cd e2e && WEB=http://localhost:8396 CHROME=/usr/bin/google-chrome node wallet.mjs /tmp/shots
// E2E Ví Ruby: người chơi chọn gói 50.000đ, thấy QR + mã nạp, bấm "Tôi đã chuyển khoản";
// quản trị (boss) duyệt trong game; người chơi thấy +1.100 💎 (lần đầu nhân đôi) và số dư mới.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8396';
const SHOTS = process.argv[2] ?? '/tmp/shots';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log('• OK  ', msg);
  else {
    failures++;
    console.log('• FAIL', msg);
  }
};

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function phone() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log('PAGE ERROR', e.message);
  });
  await page.goto(WEB);
  return { page, t: (id) => page.getByTestId(id) };
}
async function register(p, username) {
  await p.t('register-open').click();
  await p.t('auth-username').fill(username);
  await p.t('auth-email').fill(`${username}@example.com`);
  await p.t('auth-password').fill('matkhau123');
  await p.t('auth-password2').fill('matkhau123');
  await p.t('auth-name').fill(username);
  await p.t('auth-submit').click();
  await p.t('profile-card').waitFor({ timeout: 8000 });
}

const player = `vi_${Date.now().toString(36)}`;
const an = await phone();
const boss = await phone();
await register(an, player);
// tài khoản quản trị: tạo mới nếu chưa có, có rồi thì đăng nhập
await boss.t('register-open').click();
await boss.t('auth-username').fill('boss');
await boss.t('auth-email').fill(`boss_${Date.now().toString(36)}@example.com`);
await boss.t('auth-password').fill('matkhau123');
await boss.t('auth-password2').fill('matkhau123');
await boss.t('auth-name').fill('Boss');
await boss.t('auth-submit').click();
if (!(await boss.t('profile-card').waitFor({ timeout: 4000 }).then(() => true, () => false))) {
  await boss.t('auth-tab-login').click();
  await boss.t('auth-username').fill('boss');
  await boss.t('auth-password').fill('matkhau123');
  await boss.t('auth-submit').click();
  await boss.t('profile-card').waitFor({ timeout: 8000 });
}
check((await boss.t('admin-open-home').count()) === 1, 'tài khoản boss thấy nút Quản trị');
check((await an.t('admin-open-home').count()) === 0, 'người chơi thường không thấy nút Quản trị');

// người chơi nạp gói 50.000đ
await an.t('wallet-open').click();
await an.t('pack-50000').waitFor({ timeout: 8000 });
await an.page.screenshot({ path: `${SHOTS}/wallet-packs.png` });
await an.t('pack-50000').click();
// RN Web vẽ ảnh bằng một <img> bên trong khối có testID; chờ ảnh QR tải xong (mạng chậm)
const qrImg = an.page.locator('[data-testid="topup-qr"] img').first();
const qr = await qrImg.getAttribute('src', { timeout: 8000 }).catch(() => null);
const qrLoaded = await an.page
  .waitForFunction(() => {
    const img = document.querySelector('[data-testid="topup-qr"] img');
    return !!img && img.complete && img.naturalWidth > 0;
  }, null, { timeout: 20000 })
  .then(() => true, () => false);
const code = (await an.t('topup-code').textContent()).trim();
check(/^XL[0-9A-Z]{6}$/.test(code), `có mã nạp riêng (${code})`);
check(!!qr && qr.includes('970418-6353025859') && qr.includes('amount=50000') && qr.includes(`addInfo=${code}`), 'QR VietQR đúng BIDV, số tiền và mã');
check(qrLoaded, 'ảnh QR tải được từ img.vietqr.io');
await an.page.screenshot({ path: `${SHOTS}/wallet-qr.png` });
await an.t('topup-sent').click();
await an.t('topup-pending').waitFor({ timeout: 8000 });
check(true, 'bấm "Tôi đã chuyển khoản" thì hiện yêu cầu chờ duyệt');

// quản trị duyệt
await boss.t('admin-open-home').click();
const approve = boss.page.locator('[data-testid^="admin-approve-"]').first();
await approve.waitFor({ timeout: 8000 });
await boss.page.screenshot({ path: `${SHOTS}/wallet-admin.png` });
await approve.click();
await boss.t('admin-msg').waitFor({ timeout: 8000 });
check((await boss.t('admin-msg').textContent()).includes('1.100'), 'quản trị duyệt: cộng 1.100 Ruby (gói 50k lần đầu x2)');

// người chơi thấy thông báo và số dư
await an.t('ruby-toast').waitFor({ timeout: 8000 });
check((await an.t('ruby-toast').textContent()).includes('1.100'), 'người chơi thấy thông báo +1.100 💎');
await an.page.screenshot({ path: `${SHOTS}/wallet-toast.png` });
check((await an.t('ruby-balance').textContent()).includes('1.100'), 'số dư trong bảng nạp cập nhật 1.100');

await browser.close();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
