// Chụp màn hình các màn chính của cả 3 game để soát giao diện.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const WEB = process.argv[2] ?? 'http://localhost:8081';
const OUT = process.argv[3] ?? '/tmp/vis';
const W = Number(process.argv[4] ?? 390), H = Number(process.argv[5] ?? 844);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function phone(name) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] lỗi trang:`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.log(`[${name}] console:`, m.text().slice(0, 200)));
  await page.goto(WEB);
  await page.getByTestId('name-input').fill(name);
  return { name, page, t: (id) => page.getByTestId(id) };
}
const shot = (p, n) => p.page.screenshot({ path: `${OUT}/${n}.png` });

const a = await phone('Phước');
await a.page.waitForTimeout(500);
await shot(a, '01-home');
await a.t('create-wordchain').click();
await a.t('room-code').waitFor();
const code = (await a.t('room-code').textContent()).trim();
const b = await phone('Nguyễn Thị Phương Thảo');
await b.t('code-input').fill(code);
await b.t('join-btn').click();
await b.t('room-code').waitFor();
const c = await phone('Long');
await c.page.goto(`${WEB}/?room=${code}`);
await c.t('name-input').fill('Long');
await c.t('join-btn').click();
await c.t('room-code').waitFor();
await a.page.waitForTimeout(400);
await shot(a, '02-lobby-host');
await shot(b, '03-lobby-guest');

// ném dép
await b.page.getByTestId(`avatar-${await a.page.evaluate(() => '')}`).count();
const avatars = await b.page.locator('[data-testid^="avatar-"]').all();
await avatars[0].click(); // avatar của chủ phòng (Phước)
await b.t('throw-dep').waitFor();
await shot(b, '04-throw-sheet');
await b.t('throw-dep').click();
await a.page.waitForTimeout(350);
await shot(a, '05-throw-flying');
await a.page.waitForTimeout(700);
await shot(a, '06-throw-hit');

// Nối từ
await a.t('start-btn').click();
for (const p of [a, b, c]) await p.t('current-word').waitFor();
await a.page.waitForTimeout(400);
let cur = null;
for (const p of [a, b, c]) if ((await p.t('turn-label').textContent()).includes('Tới lượt bạn')) cur = p;
await shot(cur, '07-word-myturn');
await shot(cur === a ? b : a, '08-word-other');
await cur.t('word-input').fill('abc xyz');
await cur.t('submit-btn').click();
await cur.t('word-error').waitFor();
await cur.t('hint-btn').click();
await cur.t('hint-word').waitFor();
await shot(cur, '09-word-error-hint');
// taunt
await c.t('chat-open').click();
await c.t('taunt-ga').click();
await a.page.waitForTimeout(300);
await shot(a, '10-taunt-bubble');

// về phòng: rời ván -> không, dùng chủ phòng đổi game sau khi kết thúc. Cho cả 3 thoát ván bằng cách chờ hết giờ là lâu,
// nên chủ phòng tạo phòng mới cho từng game.
async function newRoom(game, n) {
  const ps = [];
  const h = await phone('Phước');
  await h.t(`create-${game}`).click();
  await h.t('room-code').waitFor();
  const code = (await h.t('room-code').textContent()).trim();
  ps.push(h);
  for (const nm of ['Thảo', 'Long', 'Mai'].slice(0, n - 1)) {
    const p = await phone(nm);
    await p.t('code-input').fill(code);
    await p.t('join-btn').click();
    await p.t('room-code').waitFor();
    ps.push(p);
  }
  await h.page.waitForTimeout(300);
  return ps;
}

const L = await newRoom('ludo', 4);
await shot(L[0], '11-ludo-lobby');
await L[0].t('start-btn').click();
for (const p of L) await p.t('dice').waitFor();
await L[0].page.waitForTimeout(400);
let lc = null;
for (const p of L) if (await p.t('roll-btn').count()) lc = p;
await shot(lc, '12-ludo-myturn');
await lc.t('roll-btn').click();
await lc.page.waitForTimeout(700);
await shot(lc, '13-ludo-rolled');
await shot(L.find((p) => p !== lc), '14-ludo-other');

const B = await newRoom('baucua', 3);
await B[0].t('start-btn').click();
for (const p of B) await p.t('sym-cua').waitFor();
await B[1].t('chip-100').click();
await B[1].t('sym-cua').click();
await B[1].t('sym-cua').click();
await B[1].t('sym-ga').click();
await B[2].t('sym-cua').click();
await B[1].page.waitForTimeout(300);
await shot(B[1], '15-baucua-betting');
await B[0].page.getByText('Máy đang lắc bát').waitFor({ timeout: 25000 });
await B[0].page.waitForTimeout(500);
await shot(B[0], '16-baucua-rolling');
await B[1].t('bc-reveal').waitFor({ timeout: 6000 });
await B[1].page.waitForTimeout(1300);
await Promise.all([shot(B[1], '17a-baucua-reveal'), shot(B[0], '17b-baucua-reveal-nobet')]);
await B[1].page.waitForTimeout(1300);
await Promise.all([shot(B[1], '17c-baucua-reveal-fly'), shot(B[2], '17d-baucua-reveal-p3')]);
await B[1].t('bc-delta').waitFor({ timeout: 6000 });
await B[1].page.waitForTimeout(1500);
await shot(B[1], '17-baucua-result');
await B[0].t('end-open').click();
await B[0].t('end-confirm').click();
await B[0].t('result-title').waitFor();
await B[0].page.waitForTimeout(600);
await shot(B[0], '18-result');
await shot(B[1], '19-result-guest');
console.log('xong');
await browser.close();
