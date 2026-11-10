// Chạy giống play.mjs (server TURN_SECONDS=8, web ở cổng 8081): node social.mjs ../server/data/words.txt /tmp/shots
// E2E: tài khoản (đăng ký, nhớ đăng nhập, đăng nhập máy khác), chữ đầu bị khóa, xin duyệt từ mới,
// trò chuyện, thả emoji, đánh nhau.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const WEB = 'http://localhost:8081';
const words = new Set(readFileSync(process.argv[2], 'utf8').split('\n').filter(Boolean));
const SHOTS = process.argv[3] ?? '/tmp/shots';
mkdirSync(SHOTS, { recursive: true });

let failures = 0;
const check = (cond, msg) => {
  console.log(cond ? 'OK  ' : 'FAIL', msg);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function phone(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`[${name}] lỗi trang:`, e.message);
  });
  await page.goto(WEB);
  return { name, page, t: (id) => page.getByTestId(id) };
}
const shot = (p, label) => p.page.screenshot({ path: `${SHOTS}/${label}.png` });
const feedHas = (p, text) =>
  p.page.getByTestId('feed').filter({ hasText: text }).first().waitFor({ timeout: 5000 }).then(() => true, () => false);

// ---------------- Tài khoản ----------------
const user = `e2e_${Date.now().toString(36)}`;
const a = await phone('An');
await a.t('register-open').click();
await a.t('auth-username').fill(user);
await a.t('auth-password').fill('matkhau123');
await a.t('auth-name').fill('An Béo');
await a.t('avatar-pick-7').click();
await shot(a, 's1-register');
await a.t('auth-submit').click();
await a.t('profile-card').waitFor({ timeout: 5000 });
check((await a.t('profile-card').textContent()).includes('An Béo'), 'đăng ký xong: hiện thẻ hồ sơ với tên hiển thị');
await a.page.reload();
await a.t('profile-card').waitFor({ timeout: 8000 });
check(true, 'tải lại trang vẫn còn đăng nhập');

const c = await phone('Chi');
await c.t('auth-open').click();
await c.t('auth-username').fill(user);
await c.t('auth-password').fill('saimatkhau');
await c.t('auth-submit').click();
await c.t('auth-error').waitFor();
check((await c.t('auth-error').textContent()).includes('Sai'), 'sai mật khẩu thì báo lỗi');
await c.t('auth-password').fill('matkhau123');
await c.t('auth-submit').click();
await c.t('profile-card').waitFor();
check((await c.t('profile-card').textContent()).includes('An Béo'), 'đăng nhập trên máy khác: cùng tài khoản');
await c.page.context().close();

// ---------------- Vào phòng bằng tài khoản ----------------
await a.t('create-wordchain').click();
await a.t('room-code').waitFor();
const code = (await a.t('room-code').textContent()).trim();
const b = await phone('Bình');
await b.t('name-input').fill('Bình');
await b.t('code-input').fill(code);
await b.t('join-btn').click();
await b.t('room-code').waitFor();
await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 2);
check((await b.page.getByText('An Béo').count()) > 0, 'người khác thấy tên theo tài khoản');
const aId = (await a.page.locator('[data-testid^="avatar-u-"]').first().getAttribute('data-testid')).slice(7);
const bId = (await b.page.locator('[data-testid^="avatar-"]:not([data-testid^="avatar-u-"])').first().getAttribute('data-testid')).slice(7);
check(aId.startsWith('u-'), 'người có tài khoản dùng id cố định theo tài khoản');

// ---------------- Trò chuyện, emoji, đánh nhau (ở phòng chờ) ----------------
await b.t('chat-open').click();
await b.t('chat-input').fill('Vô chơi lẹ đi mấy ba');
await b.t('chat-send').click();
await a.page.getByText('Vô chơi lẹ đi mấy ba').first().waitFor({ timeout: 4000 });
check(true, 'tin nhắn hiện thành bong bóng trên máy người khác');
check((await a.t('chat-badge').textContent()) === '1', 'nút trò chuyện hiện 1 tin chưa đọc');
await b.t('emoji-0').click();
await a.page.getByText('😂').first().waitFor({ timeout: 3000 });
check(true, 'thả emoji: bay lên trên máy người khác');
await shot(a, 's2-chat-bubble');
await a.t('chat-open').click();
check((await a.t('chat-list').textContent()).includes('Vô chơi lẹ'), 'mở khung trò chuyện thấy tin nhắn');
check((await a.t('chat-badge').count()) === 0, 'mở ra thì hết đếm chưa đọc');
await a.t('chat-input').fill('Từ từ');
await a.t('chat-input').press('Enter');
await b.page.getByText('Từ từ').first().waitFor({ timeout: 3000 });
await shot(a, 's3-chat-sheet');
await a.page.mouse.click(195, 100);
await b.page.keyboard.press('Escape');
await b.page.mouse.click(195, 100);
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('hit-chuong').click();
check(await feedHas(a, 'máu'), 'đánh nhau: người bị chưởng thấy trừ máu');
await a.page.waitForTimeout(150);
await shot(a, 's4-hit');

// ---------------- Nối từ: chữ đầu khóa + xin duyệt từ ----------------
await a.t('start-btn').click();
for (const p of [a, b]) await p.t('current-word').waitFor();
await a.page.waitForTimeout(300);
const cur = (await a.t('turn-label').textContent()).includes('Tới lượt bạn') ? a : b;
const other = cur === a ? b : a;
const last = (await cur.t('current-word').textContent()).trim().split(/\s+/)[1];
check((await cur.t('word-prefix').textContent()).includes(last), `chữ đầu "${last}" hiện sẵn và bị khóa`);
await cur.t('word-input').click();
for (let i = 0; i < 4; i++) await cur.t('word-input').press('Backspace');
check((await cur.t('word-prefix').textContent()).includes(last), 'bấm xóa không xóa được chữ đầu');
const tries = ['quềnh', 'ngoẳng', 'khuếch', 'nghiếng', 'xoèn', 'ruých', 'thoẹt'];
const second = tries.find((s) => !words.has(`${last} ${s}`));
await cur.t('word-input').fill(second);
await cur.t('submit-btn').click();
await cur.t('appeal-btn').waitFor({ timeout: 3000 });
check((await cur.t('word-error').textContent()).includes('chưa có trong từ điển'), `"${last} ${second}" chưa có trong từ điển`);
await cur.t('appeal-btn').click();
await other.t('vote-card').waitFor({ timeout: 3000 });
await shot(other, 's5-vote');
check((await other.t('vote-card').textContent()).includes(`${last} ${second}`), 'người khác thấy bảng bỏ phiếu');
check((await cur.t('vote-yes').count()) === 0, 'người xin duyệt không tự bỏ phiếu được');
await other.t('vote-yes').click();
await a.page.waitForFunction(
  (w) => document.querySelector('[data-testid="current-word"]')?.textContent.replace(/\s+/g, ' ').trim() === w,
  `${last} ${second}`,
  { timeout: 5000 },
);
check(await feedHas(cur, 'thêm vào từ điển'), 'được duyệt: từ được tính, báo đã thêm vào từ điển');
await shot(cur, 's6-approved');

// ---------------- Đăng xuất ----------------
await a.t('leave-open').click();
await a.t('leave-confirm').click();
await a.t('profile-edit').click();
await a.t('logout-btn').click();
await a.t('name-input').waitFor();
check(true, 'đăng xuất: quay về chơi khách');

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
