// Chụp ảnh kho chọc ghẹo: mỗi mẫu hiệu ứng ít nhất 2 món, chụp màn hình người gửi và người bị chọc giữa lúc đang chạy.
// Server: ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1 PORT=4341 node server/dist/server.js
// Web: expo export (EXPO_PUBLIC_SERVER_URL=http://localhost:4341) rồi python -m http.server 8403
// Chạy: node e2e/poke-gallery.mjs [thư-mục-ảnh]   (WEB, SERVER, CHROME đổi được bằng biến môi trường)
import { chromium } from 'playwright-core';
import { io } from '../server/node_modules/socket.io-client/build/esm/index.js';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { POKES, pokeImageUrl, pokeItem } from '../shared/src/pokes.ts';

const WEB = process.env.WEB ?? 'http://localhost:8403';
const SERVER = process.env.SERVER ?? 'http://localhost:4341';
const SHOTS = process.argv[2] ?? './shots-poke';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });

async function admin() {
  const s = io(SERVER, { transports: ['websocket'], reconnection: false });
  await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  const r = await s.timeout(8000).emitWithAck('auth:register', { username: 'boss', email: 'boss@example.com', password: 'matkhau123', displayName: 'boss' });
  if (!r.ok && r.error === 'username_taken') await s.timeout(8000).emitWithAck('auth:login', { username: 'boss', password: 'matkhau123' });
  return s;
}

async function phone(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => { failures++; console.log(`[${name}] lỗi trang:`, e.message); });
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(WEB);
  return { name, page, errs, t: (id) => page.getByTestId(id) };
}

// món cần chụp: [id, ms chụp sau khi bấm]. Mỗi mẫu 2 món (một "xấu", một dễ thương hoặc kiểu khác).
const PLAN = [
  ['poo', 420], ['poo', 950], ['heart', 950],
  ['football', 700], ['volley_heart', 700],
  ['rain_poo', 1500], ['rain_heart', 1500],
  ['stick_cake', 1600], ['stick_cockroach', 1600],
  ['cat', 1200], ['beatheart', 1200],
  ['bomb', 950], ['boom_rocket', 950],
  ['giant_dragon', 900], ['giant_heart', 900],
  ['swarm_frog', 1900], ['swarm_butterfly', 1900],
  ['elephant', 520], ['lol', 520],
  ['bicycle', 800], ['beam_ufo', 800],
];

try {
  assert.equal(PLAN.length > 0, true);
  for (const [id] of PLAN) assert.ok(pokeItem(id), `thiếu món ${id}`);
  const boss = await admin();
  const A = await phone('Gửi');
  const user = `pg_${Date.now().toString(36)}`;
  const a = A.t;
  await a('register-open').click();
  await a('auth-username').fill(user);
  await a('auth-email').fill(`${user}@example.com`);
  await a('auth-password').fill('matkhau123');
  await a('auth-password2').fill('matkhau123');
  await a('auth-name').fill('Người Gửi');
  await a('auth-submit').click();
  await a('profile-card').waitFor({ timeout: 10000 });
  const fund = await boss.timeout(8000).emitWithAck('admin:adjust', { username: user, delta: 5000, reason: 'poke gallery e2e' });
  assert.equal(fund.ok, true);
  await A.page.reload();
  await a('create-wordchain').waitFor({ timeout: 15000 });
  await a('create-wordchain').click();
  await a('room-code').waitFor();
  const code = (await a('room-code').textContent()).trim();
  const B = await phone('Bị chọc');
  await B.t('name-input').fill('Bị Chọc');
  await B.t('code-input').fill(code);
  await B.t('join-btn').click();
  await B.t('room-code').waitFor();
  await A.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length >= 2);
  const ids = await A.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(7)).filter((x) => !x.startsWith('name') && !x.startsWith('edit')));
  console.log('avatar ids', ids);

  // tải sẵn hình để ảnh chụp không phụ thuộc mạng
  const urls = [...new Set(PLAN.map(([id]) => pokeImageUrl(pokeItem(id))))];
  for (const p of [A, B]) await p.page.evaluate((us) => Promise.all(us.map((u) => new Promise((r) => { const i = new Image(); i.onload = i.onerror = r; i.src = u; }))), urls);
  check(true, `đã tải sẵn ${urls.length} hình`);

  // người gửi là tài khoản (id bắt đầu bằng u-), người bị chọc là khách
  const bAvatar = ids.find((x) => !x.startsWith('u-')) ?? ids[1];

  const openKho = async () => {
    await A.page.getByTestId(`avatar-${bAvatar}`).click();
    await a('poke-kho-open').waitFor({ timeout: 5000 });
    await a('poke-kho-open').click();
    await a('poke-gallery').waitFor();
  };
  const closeSheet = async () => {
    const x = A.page.getByLabel('Đóng').first();
    if (await x.count()) await x.click().catch(() => {});
  };

  // 1. thư viện: ảnh các nhóm
  await openKho();
  await sleep(1200);
  await A.page.screenshot({ path: `${SHOTS}/00-gallery-nem.png` });
  for (const tab of ['doan', 'dongvat', 'bieucam', 'ruby']) {
    await a(`poke-tab-${tab}`).click();
    await sleep(900);
    await A.page.screenshot({ path: `${SHOTS}/00-gallery-${tab}.png` });
  }
  const broken = await A.page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length);
  check(broken === 0, `không có ảnh hỏng trong lưới (hỏng: ${broken})`);
  check((await A.page.locator('[data-testid^="poke-item-"]').count()) > 0, 'lưới có món');
  await a('poke-search').fill('phan');
  await sleep(300);
  check((await a('poke-item-poo').count()) === 1, 'tìm "phan" ra "Bom phân" (không dấu)');
  await A.page.keyboard.press('Escape');
  await closeSheet();
  await sleep(300);

  // 2. từng món
  let n = 0;
  for (const [id, wait] of PLAN) {
    const item = pokeItem(id);
    if (!(await a('poke-gallery').count())) await openKho();
    await a('poke-search').fill(item.name);
    await a(`poke-item-${id}`).waitFor({ timeout: 4000 });
    await a(`poke-item-${id}`).click();
    await sleep(wait);
    n++;
    const tag = `${String(n).padStart(2, '0')}-${item.template}-${id}`;
    await Promise.all([
      A.page.screenshot({ path: `${SHOTS}/${tag}-gui.png` }),
      B.page.screenshot({ path: `${SHOTS}/${tag}-bi.png` }),
    ]);
    // mọi món rung/phủ màn hình tính chung 3 lần / 15 giây mỗi người bị chọc nên cách nhau ~5 giây
    await sleep(5300);
  }
  // mọi cảnh phải tan hết, không kẹt lớp phủ
  await sleep(9500);
  const stuck = await B.page.evaluate(() => document.querySelectorAll('[data-testid="poke-stick"]').length);
  check(stuck === 0, 'không còn món dính màn hình sau khi hết giờ');
  await Promise.all([A.page.screenshot({ path: `${SHOTS}/99-after-gui.png` }), B.page.screenshot({ path: `${SHOTS}/99-after-bi.png` })]);

  // 3. chạm để lau
  await a('poke-kho-open').count().then(async (c) => { if (!c) await openKho(); });
  await a('poke-search').fill('Bánh kem dính');
  await a('poke-item-stick_cake').click();
  await B.t('poke-stick').waitFor({ timeout: 6000 });
  await sleep(900);
  await B.t('poke-stick').click({ force: true });
  await sleep(700);
  check((await B.t('poke-stick').count()) === 0, 'chạm vào món dính thì lau sạch');

  // 4. mạng chặn jsDelivr: hiện emoji gốc, không ô trống
  const Cc = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await Cc.route(/cdn\.jsdelivr\.net/, (r) => r.abort());
  const cp = await Cc.newPage();
  await cp.goto(WEB);
  await cp.getByTestId('name-input').fill('Mất Mạng');
  await cp.getByTestId('code-input').fill(code);
  await cp.getByTestId('join-btn').click();
  await cp.getByTestId('room-code').waitFor();
  await A.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length >= 3);
  const ids3 = await A.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(7)).filter((x) => !x.startsWith('name') && !x.startsWith('edit')));
  const cId = ids3.find((x) => !x.startsWith('u-') && x !== bAvatar);
  await A.page.getByTestId(`avatar-${cId}`).click();
  await a('poke-kho-open').click();
  await a('poke-search').fill('Mặt hề khổng lồ');
  await a('poke-item-giant_clown').click();
  await sleep(1300);
  await cp.screenshot({ path: `${SHOTS}/98-fallback-emoji.png` });
  check(await cp.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.includes('jsdelivr')).length === 0 && [...document.querySelectorAll('*')].some((e) => e.children.length === 0 && e.textContent === '🤡')), 'không có hình mạng thì dùng emoji gốc 🤡 (không còn thẻ ảnh, không ô trống)');
  await Cc.close();

  for (const p of [A, B]) {
    const bad = p.errs.filter((e) => /fluentui|jsdelivr|Failed to load resource/.test(e));
    check(bad.length === 0, `[${p.name}] không lỗi tải hình (${bad.slice(0, 2).join(' | ')})`);
  }
  console.log(`catalog: ${POKES.length} món`);
} catch (e) {
  failures++;
  console.log('LỖI', e);
} finally {
  await browser.close();
  process.exit(failures ? 1 : 0);
}
