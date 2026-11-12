// Chơi thật Cờ tỷ phú (2 người + bot tùy chọn), chụp các bảng thoại, thử chat và chọc ghẹo ngay trong ván.
// WEB=http://localhost:4123 node e2e/typhu-play.mjs <thư-mục-ảnh> [WxH] [pha=play,chat,poke]
// Cần server (ví dụ PORT=4124 node server/dist/server.js) và bản web trỏ về server đó.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { io } from '../server/node_modules/socket.io-client/build/esm/index.js';
import { POKES } from '../shared/src/pokes.ts';

const WEB = process.env.WEB ?? 'http://localhost:4123';
const OUT = process.argv[2] ?? './shots-typhu-play';
const [W, H] = (process.argv[3] ?? '390x844').split('x').map(Number);
const PHASES = (process.argv[4] ?? 'play,chat,poke').split(',');
const BOTS = Number(process.env.BOTS ?? 0);
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const executablePath = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const small = Math.min(W, H) < 500;

async function player(name) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: small, hasTouch: small });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`[${name}] lỗi trang:`, e.message); });
  await page.goto(WEB);
  await page.getByTestId('name-input').fill(name);
  return { name, page, ctx, t: (id) => page.getByTestId(id), shot: (n) => page.screenshot({ path: `${OUT}/${W}x${H}-${n}.png` }) };
}

const SERVER = process.env.SERVER ?? 'http://localhost:4124';
const A = await player('An');
if (process.env.ACCOUNT === '1') {
  // An là tài khoản có 5000 Ruby (cần server chạy ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1) để thử món Ruby
  const boss = io(SERVER, { transports: ['websocket'], reconnection: false });
  await new Promise((res, rej) => { boss.once('connect', res); boss.once('connect_error', rej); });
  const r = await boss.timeout(8000).emitWithAck('auth:register', { username: 'boss', email: 'boss@example.com', password: 'matkhau123', displayName: 'boss' });
  if (!r.ok && r.error === 'username_taken') await boss.timeout(8000).emitWithAck('auth:login', { username: 'boss', password: 'matkhau123' });
  const user = `tp_${Date.now().toString(36)}`;
  await A.t('register-open').click();
  await A.t('auth-username').fill(user);
  await A.t('auth-email').fill(`${user}@example.com`);
  await A.t('auth-password').fill('matkhau123');
  await A.t('auth-password2').fill('matkhau123');
  await A.t('auth-name').fill('An');
  await A.t('auth-submit').click();
  await A.t('profile-card').waitFor({ timeout: 10000 });
  const fund = await boss.timeout(8000).emitWithAck('admin:adjust', { username: user, delta: 5000, reason: 'typhu-play e2e' });
  if (!fund.ok) throw new Error('không nạp được Ruby');
  await A.page.reload();
  await A.t('create-typhu').waitFor({ timeout: 15000 });
}
await A.t('create-typhu').click();
await A.t('room-code').waitFor();
const code = (await A.t('room-code').textContent()).trim();
const B = await player('Bình');
await B.t('code-input').fill(code);
await B.t('join-btn').click();
await B.t('room-code').waitFor();
for (let i = 0; i < BOTS; i++) { await A.t('bot-add').click(); await sleep(200); }
await A.page.waitForFunction((n) => document.querySelectorAll('[data-testid^="avatar-"]').length >= n, 2 + BOTS);
await A.t('start-btn').click();
for (const p of [A, B]) await p.t('cell-0').waitFor();
await sleep(1500);
const ps = [A, B];
if (process.env.SPEED !== '0') for (let i = 0; i < 2; i++) { await A.t('speed-btn').click().catch(() => {}); await sleep(300); }

// kiểm tra nút điều khiển có bị lớp nào đè lên không
const blockedSeen = new Set();
async function probe(p, tag) {
  const r = await p.page.evaluate(() => {
    const out = [];
    for (const id of ['roll-btn', 'chat-open', 'poke-open', 'view-mode', 'buy-btn', 'skip-btn', 'build-btn']) {
      const e = document.querySelector(`[data-testid="${id}"]`);
      if (!e) continue;
      const b = e.getBoundingClientRect();
      if (!b.width) continue;
      const x = b.left + b.width / 2, y = b.top + b.height / 2;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) { out.push(`${id}:offscreen`); continue; }
      const top = document.elementFromPoint(x, y);
      if (top && !e.contains(top)) out.push(`${id}:covered-by:${(top.closest('[data-testid]')?.getAttribute('data-testid')) ?? top.className.toString().slice(0, 30)}`);
    }
    return out;
  });
  for (const x of r) { const k = `${p.name}:${x}`; if (!blockedSeen.has(k)) { blockedSeen.add(k); console.log('CHẶN', tag, k); await p.shot(`blocked-${p.name}-${x.replace(/[^a-z-]/gi, '_')}`); } }
}


const INTEREST = ['roll-btn', 'buy-btn', 'build-btn', 'skip-btn', 'stay-jail', 'pay-jail', 'use-ticket', 'open-sell', 'sell-picker', 'jail-card', 'ticket-card', 'upgrade-card', 'end-confirm', 'sell-lot'];
const sig = (p) => p.page.evaluate((ids) => ids.filter((i) => document.querySelector(`[data-testid="${i}"]`)).join('+'), INTEREST);
async function step(p) {
  for (const id of ['buy-btn', 'build-btn', 'pay-jail', 'roll-btn', 'skip-btn', 'stay-jail']) {
    const b = p.t(id);
    if (await b.count()) {
      if (await b.first().isEnabled().catch(() => false)) { await b.first().click({ timeout: 800 }).catch(() => {}); return id; }
    }
  }
  // nợ: mở bảng bán rồi bán
  if (await p.t('open-sell').count()) { await p.t('open-sell').click({ timeout: 800 }).catch(() => {}); return 'open-sell'; }
  if (await p.t('sell-lot').count()) { await p.t('sell-lot').click({ timeout: 800 }).catch(() => {}); return 'sell-lot'; }
  return null;
}

if (PHASES.includes('play')) {
  const seen = new Map();
  const turns = Number(process.env.TURNS ?? 60);
  for (let i = 0; i < turns * 4; i++) {
    for (const p of ps) {
      const s = await sig(p);
      if (s && !seen.has(`${p.name}:${s}`) && seen.size < 60) {
        seen.set(`${p.name}:${s}`, 1);
        await sleep(500);
        await p.shot(`play-${p.name}-${s.replace(/[^a-z+-]/g, '')}`);
      }
      for (const k of ['buy', 'reward', 'loss', 'build', 'bankrupt']) {
        if (!seen.has(`${p.name}:announce-${k}`) && (await p.t(`announce-${k}`).count())) {
          seen.set(`${p.name}:announce-${k}`, 1);
          await sleep(250);
          await p.shot(`play-${p.name}-announce-${k}`);
        }
      }
      await step(p);
      await probe(p, 'play');
    }
    if (await A.t('result-title').count()) break;
    await sleep(150);
  }
  console.log('đã gặp:', [...seen.keys()].join(' | '));
  for (const p of ps) await p.shot(`play-end-${p.name}`);
}

async function waitMyTurn(p, ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.t('roll-btn').count()) return true;
    for (const q of ps) await step(q);
    await sleep(400);
  }
  return false;
}
const dismiss = async (p) => { await p.page.mouse.click(W > H ? W / 2 : W - 3, W > H ? 3 : H / 2); await sleep(300); };

if (PHASES.includes('chat')) {
  check(await waitMyTurn(A), 'tới lượt An (nút Đổ hiện)');
  await A.shot('chat-0-turn');
  const box0 = await A.t('roll-btn').boundingBox();
  await A.t('chat-open').click(); await sleep(500);
  await A.shot('chat-1-open');
  await A.t('chat-input').fill('Tin nhắn rất dài để thử xuống dòng trong khung trò chuyện, khung này không được làm vỡ bố cục của bàn cờ khi mở ra lúc đang chơi nhé các bạn ơi, dài nữa dài mãi dài mãi');
  await A.t('chat-send').click(); await sleep(500);
  await A.t('chat-input').fill('ngắn'); await A.t('chat-send').click(); await sleep(600);
  await A.shot('chat-2-sent');
  await B.shot('chat-3-receiver');
  await dismiss(A);
  await A.shot('chat-4-closed');
  const box1 = await A.t('roll-btn').boundingBox().catch(() => null);
  check(box1 && box0 && Math.abs(box1.y - box0.y) < 3 && Math.abs(box1.x - box0.x) < 3, 'nút Đổ không xê dịch sau khi chat');
  check(!(await A.t('chat-input').count()), 'chat đã đóng');
  // mở chat khi đang có bảng thoại mua đất / nâng cấp / ở tù: bảng không bị chat che, chat đóng xong bảng còn nguyên
  for (let round = 0; round < 12; round++) {
    await waitMyTurn(A, 40000);
    await A.t('roll-btn').click().catch(() => {});
    let dlg = null;
    for (let i = 0; i < 60 && !dlg; i++) {
      for (const id of ['buy-btn', 'build-btn', 'stay-jail', 'roll-btn']) if (id !== 'roll-btn' && (await A.t(id).count())) dlg = id;
      if (!dlg) { await step(B); await sleep(300); }
    }
    if (!dlg) continue;
    await sleep(700);
    await A.shot(`chat-5-dialog-${dlg}`);
    const chatBtn = (await A.t('chat-open-dialog').count()) ? 'chat-open-dialog' : 'chat-open';
    if (await A.t(chatBtn).count()) {
      await A.t(chatBtn).click({ timeout: 3000 }).catch(() => { failures++; console.log('FAIL không bấm được chat-open khi có bảng', dlg); });
      await sleep(500); await A.shot(`chat-6-dialog-chat-${dlg}`);
      await A.t('chat-input').fill('đang cân nhắc mua đất đây, chờ tí nha').catch(() => {});
      await A.t('chat-send').click().catch(() => {}); await sleep(500);
      await dismiss(A);
      await A.shot(`chat-7-dialog-closed-${dlg}`);
      check((await A.t(dlg).count()) > 0, `bảng ${dlg} còn nguyên sau khi chat`);
    }
    await step(A);
    if (['buy-btn', 'build-btn', 'stay-jail'].includes(dlg) && round > 2) break;
  }
}

if (PHASES.includes('poke')) {
  const free = {};
  for (const p of POKES) if ((process.env.ACCOUNT === '1' || p.tier === 'free') && !free[p.template]) free[p.template] = p;
  console.log('mẫu miễn phí:', Object.entries(free).map(([k, v]) => `${k}=${v.id}`).join(' '));
  const wait = { throw: 700, volley: 800, rain: 1500, stick: 1600, orbit: 1200, explode: 900, giant: 900, swarm: 1800, stamp: 520, beam: 800 };
  let first = true;
  for (const [tpl, item] of Object.entries(free)) {
    await waitMyTurn(A, 25000).catch(() => {});
    await A.t('poke-open').click();
    await A.page.locator('[data-testid^="poke-pick-"]').first().click();
    await A.t('poke-kho-open').click();
    if (first) {
      first = false;
      await sleep(1000);
      await A.shot('poke-gallery-in-game');
      await A.t('poke-tab-ruby').click().catch(() => {}); await sleep(700); await A.shot('poke-gallery-ruby-guest');
    }
    await A.t('poke-search').fill(item.name);
    await A.t(`poke-item-${item.id}`).waitFor({ timeout: 4000 });
    await A.t(`poke-item-${item.id}`).click();
    await sleep(wait[tpl] ?? 800);
    await Promise.all([A.shot(`poke-${tpl}-gui`), B.shot(`poke-${tpl}-bi`)]);
    if (tpl === 'stick') {
      await sleep(600);
      await B.t('poke-stick').click({ force: true }).catch(() => {});
      await sleep(700);
      check((await B.t('poke-stick').count()) === 0, 'chạm lau sạch món dính trong ván');
    }
    await sleep(5500);
    for (const p of ps) await step(p);
  }
  await sleep(9000);
  await Promise.all([A.shot('poke-after-gui'), B.shot('poke-after-bi')]);
  check(!(await B.t('poke-stick').count()), 'không kẹt lớp phủ dính');
  check((await waitMyTurn(A, 40000)) || (await waitMyTurn(B, 40000)), 'ván vẫn tiếp tục sau khi chọc');
}
await browser.close();
console.log(failures ? `${failures} lỗi` : 'xong');
process.exit(failures ? 1 : 0);
