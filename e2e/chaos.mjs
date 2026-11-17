// Nút 🌪️ "Chọc loạn xạ" (chỉ admin): admin thấy nút trên thanh trên (trước ✏️), bấm là cả phòng dính món ngẫu nhiên.
// Cần server chạy ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1 và bản web trỏ về server đó:
//   (cd server && npm run build && ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1 PORT=4330 node dist/server.js)
//   (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:4330 npx expo export -p web --output-dir <thư-mục-web>) rồi phục vụ thư mục đó
//   SERVER=http://localhost:4330 WEB=http://localhost:<cổng-web> node e2e/chaos.mjs <thư-mục-ảnh>
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { io } from '../server/node_modules/socket.io-client/build/esm/index.js';

const WEB = process.env.WEB ?? 'http://localhost:8396';
const SERVER = process.env.SERVER ?? 'http://localhost:4330';
const OUT = process.argv[2] ?? './shots-chaos';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const executablePath = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

async function phone(w = 390, h = 844) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log('LỖI TRANG', e.message); });
  await page.goto(WEB);
  return { page, ctx, t: (id) => page.getByTestId(id) };
}
/** chiều cao dòng chữ mã phòng trên thanh trên (một dòng ≈ 20px, hai dòng ≈ 40px) */
const chipTextH = (p) => p.page.evaluate(() => {
  const ts = document.querySelectorAll('[data-testid="room-chip"] [dir="auto"]');
  return ts.length ? ts[ts.length - 1].getBoundingClientRect().height : 0;
});
const topOf = async (p, id) => (await p.t(id).first().boundingBox({ timeout: 3000 }).catch(() => null))?.x ?? -1;

// tài khoản boss (admin) có sẵn 500 Ruby
const sock = io(SERVER, { transports: ['websocket'], reconnection: false });
await new Promise((res, rej) => { sock.once('connect', res); sock.once('connect_error', rej); });
const reg = await sock.timeout(8000).emitWithAck('auth:register', { username: 'boss', email: 'boss@example.com', password: 'matkhau123', displayName: 'Boss' });
if (!reg.ok) await sock.timeout(8000).emitWithAck('auth:login', { username: 'boss', password: 'matkhau123' });
const before = await sock.timeout(8000).emitWithAck('wallet:get');
if ((before.ruby ?? 0) < 500) await sock.timeout(8000).emitWithAck('admin:adjust', { username: 'boss', delta: 500, reason: 'chaos e2e' });
const ruby0 = (await sock.timeout(8000).emitWithAck('wallet:get')).ruby;

const boss = await phone();
await boss.t('register-open').click();
await boss.t('auth-tab-login').click();
await boss.t('auth-username').fill('boss');
await boss.t('auth-password').fill('matkhau123');
await boss.t('auth-submit').click();
await boss.t('profile-card').waitFor({ timeout: 10000 });

// Nối từ: boss tạo phòng, hai khách vào
await boss.t('create-wordchain').click();
await boss.t('room-code').waitFor();
const code = (await boss.t('room-code').textContent()).trim();
const guests = [];
for (const name of ['An', 'Binh']) {
  const g = await phone();
  await g.t('name-input').fill(name);
  await g.t('code-input').fill(code);
  await g.t('join-btn').click();
  await g.t('room-code').waitFor();
  guests.push(g);
}
const [an] = guests;
await sleep(500);

check((await boss.t('chaos-btn').count()) === 1, 'admin thấy nút 🌪️');
check((await an.t('chaos-btn').count()) === 0, 'khách không thấy nút 🌪️');
const xChaos = await topOf(boss, 'chaos-btn');
check(xChaos >= 0 && xChaos < (await topOf(boss, 'profile-open')) && xChaos < (await topOf(boss, 'leave-open')), 'nút 🌪️ nằm trước ✏️ và xa 🚪');
await boss.page.screenshot({ path: `${OUT}/boss-390x844.png` });
check((await chipTextH(boss)) < 28, 'màn 390×844: mã phòng nằm trên một dòng');

// bấm liên tục 3 lần
for (let i = 0; i < 3; i++) { await boss.t('chaos-btn').click(); await sleep(120); }
check(await boss.t('chaos-float').first().waitFor({ timeout: 1500 }).then(() => true, () => false), 'hiện chữ -💎20 khi bấm');
await sleep(700);
await an.page.screenshot({ path: `${OUT}/an-bi-choc.png` });
check(((await an.page.content()).match(/🌪️/g) ?? []).length >= 1, 'người bị chọc thấy thông báo 🌪️');
await sleep(800);
const ruby1 = (await sock.timeout(8000).emitWithAck('wallet:get')).ruby;
check(ruby0 - ruby1 === 60, `trừ đúng 3 × 20 Ruby (${ruby0} → ${ruby1})`);
check((await boss.t('room-code').count()) === 1, 'admin vẫn ở trong phòng (không bấm nhầm rời phòng)');

// màn nhỏ 360×640: nút vẫn vừa thanh trên
await boss.page.setViewportSize({ width: 360, height: 640 });
await sleep(400);
const box = await boss.t('chaos-btn').boundingBox();
check(!!box && box.x + box.width <= 360, 'màn 360×640: nút 🌪️ không tràn');
check((await chipTextH(boss)) < 28, 'màn 360×640: mã phòng nằm trên một dòng');
await boss.page.screenshot({ path: `${OUT}/boss-360x640.png` });

// Tỷ phú: không có thanh trên, nút 🌪️ nằm trong hàng nút nhỏ ngay sau 😈
await boss.page.setViewportSize({ width: 390, height: 844 });
await boss.t('leave-open').click();
await boss.t('leave-confirm').click();
await boss.t('create-typhu').click();
await boss.t('room-code').waitFor();
const tpCode = (await boss.t('room-code').textContent()).trim();
const cu = await phone();
await cu.t('name-input').fill('Cu');
await cu.t('code-input').fill(tpCode);
await cu.t('join-btn').click();
await cu.t('room-code').waitFor();
await boss.t('start-btn').click();
await boss.t('cell-0').waitFor();
await sleep(1200);
const boxes = {};
for (const id of ['poke-open', 'chaos-btn', 'leave-open']) boxes[id] = await boss.t(id).first().boundingBox({ timeout: 3000 }).catch(() => null);
check(!!boxes['chaos-btn'], 'Tỷ phú: admin thấy nút 🌪️ trong hàng nút nhỏ');
// màn dọc xoay bàn cờ 90°: hàng nút có thể chạy dọc, nên so khoảng cách thay vì so trục x
const overlap = (a, b) => !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const [bp, bc, bl] = [boxes['poke-open'], boxes['chaos-btn'], boxes['leave-open']];
check(!!bp && !!bc && !!bl && !overlap(bc, bp) && !overlap(bc, bl), 'Tỷ phú: 🌪️ không đè 😈 hay 🚪');
check(!!bp && !!bc && !!bl && dist(bc, bp) < dist(bc, bl), 'Tỷ phú: 🌪️ nằm cạnh 😈, xa 🚪');
check(!!boxes['chaos-btn'] && boxes['chaos-btn'].x + boxes['chaos-btn'].width <= 390, 'Tỷ phú: 🌪️ không tràn màn hình');
check((await cu.t('chaos-btn').count()) === 0, 'Tỷ phú: khách không thấy nút 🌪️');
await boss.t('chaos-btn').click();
check(await boss.t('chaos-float').first().waitFor({ timeout: 1500 }).then(() => true, () => false), 'Tỷ phú: hiện chữ -💎20 khi bấm');
const fb = await boss.t('chaos-float').first().boundingBox().catch(() => null);
check(!!fb && !!bc && dist(fb, bc) < 80, 'Tỷ phú: chữ -💎20 hiện ngay cạnh nút');
await sleep(400);
await boss.page.screenshot({ path: `${OUT}/typhu-boss.png` });
await cu.page.screenshot({ path: `${OUT}/typhu-cu.png` });

await browser.close();
sock.disconnect();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
