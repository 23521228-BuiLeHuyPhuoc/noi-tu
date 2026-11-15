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

// nạp bằng chuyển khoản đang tạm ngưng: không còn QR, không còn số tài khoản trên web
await an.t('wallet-open').click();
await an.t('topup-paused').waitFor({ timeout: 8000 });
await an.page.screenshot({ path: `${SHOTS}/wallet-paused.png` });
check((await an.page.locator('[data-testid="topup-qr"]').count()) === 0, 'không còn ảnh QR');
check((await an.t('pack-50000').count()) === 0, 'không còn chọn gói nạp');
check(!(await an.page.content()).includes('6353025859'), 'không còn số tài khoản trên trang');
check((await an.t('ruby-balance').count()) === 1, 'vẫn xem được số dư Ruby');

await browser.close();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
