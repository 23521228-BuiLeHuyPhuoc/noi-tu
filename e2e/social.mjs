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
await a.t('auth-email').fill(`${user}@example.com`);
await a.t('auth-password').fill('matkhau123');
await a.t('auth-password2').fill('matkhau123');
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

// ---------------- Bong bóng chat dưới đúng avatar, chọc mất dạy (3 người) ----------------
await b.page.keyboard.press('Escape');
const cc = await phone('Cường');
await cc.t('name-input').fill('Cường');
await cc.t('code-input').fill(code);
await cc.t('join-btn').click();
await cc.t('room-code').waitFor();
await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 3);
const ids3 = await a.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(7)));
const cId = ids3[2];
check(ids3[0] === aId && ids3[1] === bId, 'ba người trong phòng, đúng thứ tự avatar');
// đóng mọi sheet đang mở trên máy a và b
for (const p of [a, b]) {
  await p.page.mouse.click(195, 60);
  await p.page.waitForTimeout(100);
}
const sendChat = async (p, text) => {
  await p.t('chat-open').click();
  await p.t('chat-input').fill(text);
  await p.t('chat-send').click();
  await p.page.mouse.click(195, 60); // bấm nền để đóng sheet
};
await sendChat(b, 'Bình nói một câu khá là dài để thử cắt hai dòng nhé cả nhà ơi');
await sendChat(cc, 'Cường đây, vô lẹ đi!');
await a.page.getByTestId(`bubble-${bId}`).waitFor({ timeout: 4000 });
await a.page.getByTestId(`bubble-${cId}`).waitFor({ timeout: 4000 });
await a.page.waitForTimeout(250);
const geo = await a.page.evaluate(({ bId, cId, aId }) => {
  const box = (id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: (r.left + r.right) / 2 };
  };
  return { bb: box(`bubble-${bId}`), cb: box(`bubble-${cId}`), ba: box(`avatar-${bId}`), ca: box(`avatar-${cId}`), vw: window.innerWidth, nb: document.querySelectorAll(`[data-testid="bubble-${bId}"]`).length, nc: document.querySelectorAll(`[data-testid="bubble-${cId}"]`).length };
}, { bId, cId, aId });
const inside = (x) => x.l >= 0 && x.r <= geo.vw;
const near = (bub, av) => bub.l - 1 <= av.cx && av.cx <= bub.r + 1 && bub.t >= av.b - 2;
check(geo.nb === 1 && geo.nc === 1, 'mỗi người gửi chỉ có một bong bóng');
check(inside(geo.bb) && inside(geo.cb), 'bong bóng không bị cắt ở mép màn hình');
check(near(geo.bb, geo.ba) && near(geo.cb, geo.ca), 'bong bóng nằm dưới đúng avatar người gửi (phủ tâm avatar)');
const overlap = !(geo.bb.r <= geo.cb.l || geo.cb.r <= geo.bb.l || geo.bb.b <= geo.cb.t || geo.cb.b <= geo.bb.t);
check(!overlap, 'bong bóng của hai người không đè lên nhau');
await shot(a, 's2b-bubbles-3');
await sendChat(b, 'Tin mới thay tin cũ');
await a.page.getByTestId(`bubble-${bId}`).getByText('Tin mới thay tin cũ').waitFor({ timeout: 4000 });
check((await a.page.locator(`[data-testid="bubble-${bId}"]`).count()) === 1, 'tin mới của cùng người thay bong bóng cũ');

// vẽ bậy: người thứ ba cũng thấy hình vẽ trên avatar của a
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-doodle').click();
await shot(b, 's7-target-sheet');
await b.t('doodle-ria').click();
await cc.page.getByTestId(`doodle-${aId}`).waitFor({ timeout: 4000 });
check(true, 'vẽ bậy: người khác thấy ria vẽ lên avatar của người bị chọc');
await shot(cc, 's8-doodle');
// biệt danh
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-nick').click();
await b.t('nick-game').click();
await cc.page.getByTestId(`nick-${aId}`).waitFor({ timeout: 4000 });
check((await cc.page.getByTestId(`nick-${aId}`).textContent()).includes('Gà Mờ'), 'biệt danh hiện dưới avatar cho mọi người');
// thả gián: hiện trên màn hình người bị chọc
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-roach').click();
await a.page.getByTestId('roach').first().waitFor({ timeout: 4000 });
await a.page.waitForTimeout(500);
const roaches = await a.page.getByTestId('roach').count();
check(roaches >= 2, `thả gián: ${roaches} con bò trên màn hình người bị chọc`);
check((await cc.page.getByTestId('roach').count()) === 0, 'người khác không thấy gián trên màn hình của họ');
check(await feedHas(cc, 'thả gián'), 'người khác thấy thông báo thả gián');
await shot(a, 's9-roach');
await a.page.getByTestId('roach').first().click({ force: true });
await a.page.waitForTimeout(200);
check((await a.page.getByTestId('roach').count()) < roaches, 'chạm vào gián để đập');
// gián/mực bị giới hạn: chiêu phủ màn hình thứ hai ngay sau đó bị chặn
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-ink').click();
await a.page.waitForTimeout(600);
check((await a.page.getByTestId('ink-splash').count()) === 0, 'tạt mực ngay sau gián bị chặn (1 lần / 8 giây mỗi người)');
await a.page.waitForTimeout(8200);
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-ink').click();
await a.page.getByTestId('ink-splash').waitFor({ timeout: 4000 });
await a.page.waitForTimeout(300);
const ink = await a.page.getByTestId('ink-splash').boundingBox();
check(ink.x + ink.width < 180 || ink.x > 210, 'vệt mực ở góc, không che giữa màn hình');
await shot(a, 's10-ink');
await a.page.getByTestId('ink-splash').click({ force: true });
await a.page.waitForFunction(() => document.querySelectorAll('[data-testid="ink-splash"]').length === 0, null, { timeout: 2000 });
check(true, 'chạm để lau mực');
// bật loa
await b.page.getByTestId(`avatar-${aId}`).click();
await b.t('troll-honk').click();
check(await feedHas(a, 'bật loa'), 'bật loa: người bị chọc nhận thông báo');
await cc.t('leave-open').click();
await cc.t('leave-confirm').click();
await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 2);

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
