// Smoke test giao diện mới: điểm danh, cửa hàng, bot, bảng chọc, sticker khóa, Tỷ phú.
// Chạy: (server: ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1 PORT=4330 node dist/server.js)
//       (app: EXPO_PUBLIC_SERVER_URL=http://localhost:4330 npx expo export -p web --output-dir <dir>; python -m http.server 8399)
//       cd e2e && WEB=http://localhost:8399 CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node smoke-new.mjs <shots-dir>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8399';
const SHOTS = process.argv[2] ?? './shots';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => { if (!cond) failures++; console.log(cond ? '• OK  ' : '• FAIL', msg); };

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
async function open(w = 390, h = 844) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log('PAGE ERROR', e.message); });
  await page.goto(WEB);
  return { page, ctx, t: (id) => page.getByTestId(id), shot: (n) => page.screenshot({ path: `${SHOTS}/${n}.png` }) };
}
const has = async (loc, ms = 4000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);
async function register(p, username, name = username) {
  await p.t('register-open').click();
  await p.t('auth-username').fill(username);
  await p.t('auth-email').fill(`${username}@example.com`);
  await p.t('auth-password').fill('matkhau123');
  await p.t('auth-password2').fill('matkhau123');
  await p.t('auth-name').fill(name);
  await p.t('auth-submit').click();
  await p.t('profile-card').waitFor({ timeout: 8000 });
}
const rubyOf = async (p) => Number(((await p.t('home-ruby').innerText()).match(/[\d.]+/)?.[0] ?? '').replace(/\./g, ''));
const closeSheet = async (p) => {
  await p.page.locator('[aria-label="Đóng"]').first().click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {});
  await sleep(700);
};

const id = Date.now().toString(36);
const A = await open();
const nameA = `sa_${id}`;
await register(A, nameA);
const boss = await open();
await boss.t('register-open').click();
await boss.t('auth-username').fill('boss');
await boss.t('auth-email').fill(`boss_${id}@example.com`);
await boss.t('auth-password').fill('matkhau123');
await boss.t('auth-password2').fill('matkhau123');
await boss.t('auth-name').fill('Boss');
await boss.t('auth-submit').click();
if (!(await has(boss.t('profile-card')))) {
  await boss.t('auth-tab-login').click();
  await boss.t('auth-username').fill('boss');
  await boss.t('auth-password').fill('matkhau123');
  await boss.t('auth-submit').click();
  await boss.t('profile-card').waitFor({ timeout: 8000 });
}

// ---- điểm danh
const r0 = await rubyOf(A);
await A.shot('01-home');
await A.t('checkin-open').click();
check(await has(A.t('checkin-claim')), 'điểm danh: sheet 7 ngày mở, có nút nhận');
check((await A.page.locator('[data-testid^="checkin-day-"]').count()) === 7, 'điểm danh: đủ 7 ô ngày');
await A.shot('02-checkin');
await A.t('checkin-claim').click();
check(await has(A.t('checkin-won')), 'điểm danh: hiện +N 💎');
check(await has(A.t('checkin-done')), 'điểm danh: sau khi nhận hiện "đã điểm danh"');
check((await A.t('checkin-claim').count()) === 0, 'điểm danh: không nhận lại được');
await A.shot('03-checkin-done');
await closeSheet(A);
const r1 = await rubyOf(A);
check(r1 === r0 + 5, `điểm danh: số dư ${r0} -> ${r1} (+5)`);

// ---- cấp Ruby qua quản trị
await boss.t('admin-open-home').click();
await boss.t('admin-tab-adjust').click();
await boss.t('admin-adjust-user').fill(nameA);
await boss.t('admin-adjust-delta').fill('1000');
await boss.t('admin-adjust-reason').fill('smoke');
await boss.t('admin-adjust-save').click();
await sleep(2000);
await boss.shot('04-admin-adjust');
const r2 = await rubyOf(A);
check(r2 === r1 + 1000, `Ruby từ quản trị: ${r1} -> ${r2}`);

// ---- cửa hàng (người chưa có Ruby: B)
const B = await open();
const nameB = `sb_${id}`;
await register(B, nameB);
await B.t('shop-open').click();
check(await has(B.t('shop-balance')), 'cửa hàng (B): mở được, có số dư');
await B.t('shop-tab-deco').click().catch(() => {});
await sleep(500);
await B.shot('05-shop-B-frames');
const lack = B.page.getByText(/Thiếu 100/);
check(await has(lack, 3000), 'cửa hàng (B): thiếu Ruby hiện "Thiếu 100 · Nạp thêm" thay nút mua');
await lack.first().click().catch(() => {});
await sleep(800);
await B.shot('06-shop-B-error');

// ---- cửa hàng (A có Ruby)
await A.t('shop-open').click();
await A.t('shop-balance').waitFor({ timeout: 5000 });
console.log('  tabs:', await A.page.locator('[data-testid^="shop-tab-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid'))));
for (const tab of await A.page.locator('[data-testid^="shop-tab-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))) {
  await A.t(tab).click(); await sleep(300); await A.shot(`07-${tab}`);
}
await A.t('shop-tab-deco').click();
await A.t('buy-frame_gold').click();
await has(A.t('equip-frame_gold'));
check((await A.t('equip-frame_gold').count()) === 1, 'cửa hàng (A): mua viền vàng xong hiện nút Trang bị');
await A.t('equip-frame_gold').click();
check(await has(A.t('unequip-frame_gold')), 'cửa hàng (A): trang bị xong hiện nút Gỡ');
await A.shot('08-shop-A-equipped');
await closeSheet(A);
await A.shot('09-home-after-shop');

// ---- phòng Nối từ + bot
await A.t('create-wordchain').click();
await A.t('room-code').waitFor({ timeout: 8000 });
await A.t('bot-add').click();
await sleep(1000);
await A.shot('10-lobby-bot');
console.log('  avatars:', await A.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid'))));
await A.t('start-btn').click();
await sleep(1500);
await A.shot('11-game-start');
// tới lượt mình: dùng "Cứu trợ" nối hộ một từ, rồi xem máy có tự đánh trong ~4s không
const wordOf = async () => (await A.t('current-word').innerText().catch(() => '')).replace(/\s+/g, ' ');
const w0 = await wordOf();
await A.page.getByText(/Cứu trợ: nối hộ/).click();
await sleep(800);
const w1 = await wordOf();
console.log('  từ:', w0, '->', w1);
let botPlayed = false;
for (let i = 0; i < 14 && !botPlayed; i++) {
  await sleep(500);
  const w = await wordOf();
  if (w && w !== w1) botPlayed = true;
}
await A.shot('12-game-bot-played');
check(botPlayed, 'máy Nối từ tự đánh một từ trong ~7s sau khi tới lượt');

// bảng chọc: chạm avatar của máy
const botId = (await A.page.locator('[data-testid^="avatar-bot-"]').first().getAttribute('data-testid')).replace('avatar-', '');
await A.page.locator(`[data-testid="avatar-${botId}"]`).click();
check(await has(A.t('poke-quota'), 4000), 'bảng chọc: hiện số lượt chọc miễn phí');
console.log('  quota:', await A.t('poke-quota').innerText().catch(() => '?'));
await A.shot('13-poke-sheet');
const txt = await A.page.locator('body').innerText();
for (const k of ['Sét đánh', 'Đóng băng', 'Úp bánh kem', 'Tạt nước', 'Thả chó', 'Tên lửa', 'Hôn gió', 'Hoa hồng', 'Siêu xe', 'Lâu đài']) check(txt.includes(k), `bảng chọc có "${k}"`);
await A.page.evaluate(() => { document.querySelectorAll('[data-testid="poke-quota"]').forEach((e) => e.scrollIntoView()); });
// cuộn tới quà và gửi hoa hồng
const gift = A.t('gift-gift_rose');
if (await gift.count()) {
  await gift.scrollIntoViewIfNeeded();
  await A.shot('14-poke-gifts');
  await gift.click();
  await sleep(700);
  await A.shot('15-gift-fx');
  check((await A.page.locator('[data-testid^="gift-fx-"]').count()) >= 1, 'gửi quà: hiện hiệu ứng toàn màn hình');
} else check(false, 'bảng chọc: không có nút quà gift-gift_rose');
await sleep(2500);
await A.shot('16-after-gift');
// một kỹ năng trả phí: sét
const lt = A.t('skill-lightning');
if (await lt.count()) { await lt.scrollIntoViewIfNeeded(); await lt.click(); await sleep(600); await A.shot('17-lightning'); } else console.log('  (không thấy skill-lightning)');
await A.page.locator('[aria-label="Đóng"]').first().click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {});
await sleep(600);

// chat: sticker Chữ Lầy bị khóa
await A.t('chat-open').click();
await A.t('chat-input').waitFor({ timeout: 4000 });
const tog = A.t('sticker-toggle');
if (await tog.count()) await tog.click();
await sleep(500);
await A.shot('18-chat-stickers');
const locked = await A.page.locator('[data-testid^="sticker-chu-"]').count();
check(locked >= 1, `chat: có ${locked} sticker Chữ Lầy (khóa) hiện ra`);
const chuFirst = A.page.locator('[data-testid^="sticker-chu-"]').first();
if (locked) console.log('  sticker khóa disabled?', await chuFirst.getAttribute('aria-disabled'), (await chuFirst.innerText()).slice(0, 20));
await A.page.locator('[aria-label="Đóng"]').first().click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {});


// ---- Tỷ phú ngang 844x390: chat, chế độ xem, bảng chọc
const T = await open(844, 390);
await T.t('name-input').fill('Tycoon');
await T.t('create-typhu').click();
await T.t('room-code').waitFor({ timeout: 8000 });
await T.t('bot-add').click();
await sleep(800);
await T.t('start-btn').click();
await T.t('cell-0').waitFor({ timeout: 8000 });
await sleep(800);
await T.shot('20-typhu-board');
const vm = T.t('view-mode');
check(await has(vm, 3000), 'Tỷ phú: có nút chế độ xem');
const labels = [];
for (let i = 0; i < 3; i++) {
  labels.push(await vm.getAttribute('aria-label'));
  await T.shot(`21-typhu-view${i}`);
  await vm.click();
  await sleep(700);
}
console.log('  chế độ xem:', labels);
check(new Set(labels).size === 3, 'Tỷ phú: nút 🔲 đổi qua 3 chế độ khác nhau');
await T.t('poke-open').click();
await sleep(800);
await T.shot('22-typhu-poke');
const picks = await T.page.locator('[data-testid^="poke-pick-"]').count();
check(picks >= 1, `Tỷ phú: bảng chọn đối thủ có ${picks} đối thủ`);
const pick = T.page.locator('[data-testid^="poke-pick-"]').first();
await pick.click({ timeout: 4000 }).catch((e) => console.log('  pick click lỗi:', String(e).slice(0, 200)));
check(await has(T.t('poke-quota'), 3000), 'Tỷ phú: chạm đối thủ mở bảng chọc (có số lượt miễn phí)');
await T.shot('22b-typhu-poke-target');
await T.page.locator('[aria-label="Đóng"]').first().click({ position: { x: 5, y: 5 }, timeout: 2000 }).catch(() => {});
await sleep(500);
await T.t('chat-open').click();
await sleep(800);
await T.shot('23-typhu-chat');
const inp = T.t('chat-input');
const box = await inp.boundingBox();
check(!!box && box.y >= 0 && box.y + box.height <= 390, `Tỷ phú: ô chat nằm trong màn hình (${box ? Math.round(box.y) + '+' + Math.round(box.height) : 'không thấy'} / 390)`);

console.log(failures ? "FAILURES: " + failures : "ALL OK");
await browser.close();
