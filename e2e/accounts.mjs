// Chạy: (cd server && npm run build && MAIL_DEBUG=1 PORT=4320 node dist/server.js > /tmp/server.log)
//       (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:4320 npx expo export -p web --output-dir /tmp/web-acc)
//       (cd /tmp/web-acc && python3 -m http.server 8395)
//       cd e2e && WEB=http://localhost:8395 CHROME=/usr/bin/google-chrome node accounts.mjs /tmp/server.log /tmp/shots
// E2E tài khoản: nút Đăng nhập/Đăng ký ở đầu trang, ô nhập lại mật khẩu, quên mật khẩu bằng mã OTP (đọc mã từ log
// của server chạy MAIL_DEBUG=1 — chỉ dùng trên máy, không bao giờ đặt trên Render), đăng nhập bằng email.
import { chromium } from 'playwright-core';
import { mkdirSync, readFileSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8395';
const LOG = process.argv[2];
const SHOTS = process.argv[3] ?? '/tmp/shots';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (cond, msg) => {
  if (cond) console.log('• OK  ', msg);
  else {
    failures++;
    console.log('• FAIL', msg);
  }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => {
  failures++;
  console.log('PAGE ERROR', e.message);
});
const t = (id) => page.getByTestId(id);

const user = `acc_${Date.now().toString(36)}`;
const email = `${user}@example.com`;

await page.goto(WEB);
await t('auth-buttons').waitFor({ timeout: 15000 });
check((await t('auth-open').count()) === 1 && (await t('register-open').count()) === 1, 'trang chủ có nút Đăng nhập và Đăng ký ở đầu trang');
await page.screenshot({ path: `${SHOTS}/acc-home.png` });

// đăng ký: hai mật khẩu khác nhau thì báo và khóa nút
await t('register-open').click();
await t('auth-username').fill(user);
await t('auth-email').fill(email);
await t('auth-password').fill('matkhau123');
await t('auth-password2').fill('matkhau12');
await t('auth-name').fill('Người Thử');
check((await t('auth-mismatch').count()) === 1, 'hai mật khẩu khác nhau: hiện "Hai mật khẩu chưa khớp"');
check(await t('auth-submit').isDisabled(), 'hai mật khẩu khác nhau: nút Tạo tài khoản bị khóa');
await page.screenshot({ path: `${SHOTS}/acc-mismatch.png` });
await t('auth-password2').fill('matkhau123');
await t('auth-submit').click();
await t('profile-card').waitFor({ timeout: 8000 });
check(true, 'đăng ký có email thành công');

// đăng xuất
await t('profile-edit').click();
await t('logout-btn').click();
await t('auth-buttons').waitFor({ timeout: 8000 });

// quên mật khẩu bằng email
const before = LOG ? readFileSync(LOG, 'utf8').length : 0;
await t('auth-open').click();
await t('forgot-link').click();
await t('forgot-who').fill(email);
await t('forgot-send').click();
await t('forgot-sent').waitFor({ timeout: 8000 });
let code = null;
for (let i = 0; i < 50 && !code; i++) {
  await sleep(200);
  const m = /Mã đặt lại mật khẩu Xóm Lầy: (\d{6})/.exec(readFileSync(LOG, 'utf8').slice(before));
  code = m?.[1] ?? null;
}
check(!!code, `server gửi thư có mã 6 số (${code})`);
await t('forgot-code').fill(code ?? '000000');
await t('forgot-password').fill('matkhaumoi9');
await t('forgot-password2').fill('matkhaumoi9');
await page.screenshot({ path: `${SHOTS}/acc-forgot.png` });
await t('forgot-submit').click();
await t('profile-card').waitFor({ timeout: 8000 });
check(true, 'đặt lại mật khẩu xong thì tự đăng nhập');

// đăng nhập bằng email + mật khẩu mới
await t('profile-edit').click();
await t('logout-btn').click();
await t('auth-open').click();
await t('auth-username').fill(email);
await t('auth-password').fill('matkhaumoi9');
await t('auth-submit').click();
await t('profile-card').waitFor({ timeout: 8000 });
check(true, 'đăng nhập bằng email với mật khẩu mới');

await browser.close();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
