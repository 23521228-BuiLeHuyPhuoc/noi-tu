// Chụp ảnh kiểm tra phần "lầy": bong bóng chat, bảng chọc mất dạy, gián, mực, vẽ bậy, biệt danh, tâm trạng, tạo hình nhân vật.
// Chạy: node fun.mjs <words.txt> /tmp/fun-shots   (web ở 9091, server TURN_SECONDS=8)
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.E2E_WEB ?? 'http://localhost:8081';
const SHOTS = process.argv[3] ?? '/tmp/fun-shots';
mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });

async function phone(w, h, name) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`[${name}] lỗi trang:`, e.message); });
  await page.goto(WEB);
  return { name, page, t: (id) => page.getByTestId(id) };
}

for (const [w, h] of [[390, 844], [360, 640]]) {
  const tag = `${w}`;
  const shot = (p, label) => p.page.screenshot({ path: `${SHOTS}/${label}-${tag}.png` });
  const a = await phone(w, h, 'An');
  await a.t('name-input').fill('An Béo');
  await a.t('create-wordchain').click();
  await a.t('room-code').waitFor();
  const code = (await a.t('room-code').textContent()).trim();
  const join = async (name) => {
    const p = await phone(w, h, name);
    await p.t('name-input').fill(name);
    await p.t('code-input').fill(code);
    await p.t('join-btn').click();
    await p.t('room-code').waitFor();
    return p;
  };
  const b = await join('Bình Gold');
  const c = await join('Cường Đô La');
  await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 3);
  const [aId, bId, cId] = await a.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.dataset.testid.slice(7)));

  // tạo hình nhân vật với phụ kiện
  await a.t('char-acc-kinhden').scrollIntoViewIfNeeded();
  await a.t('char-acc-kinhden').click();
  await a.page.waitForTimeout(300);
  await shot(a, 'lobby-customizer');
  await b.t('char-acc-nonla').click();
  await c.t('char-acc-muihe').click();
  await a.page.evaluate(() => window.scrollTo(0, 0));
  await a.page.mouse.wheel(0, -3000);
  await a.page.waitForTimeout(400);

  const say = async (p, text) => {
    await p.t('chat-open').click();
    await p.t('chat-input').fill(text);
    await p.t('chat-send').click();
    await p.page.mouse.click(w / 2, 40);
  };
  await say(b, 'ok chơi luôn');
  await say(c, 'hôm nay ai thua bao trà sữa nha 😂');
  await say(a, 'alo alo');
  await a.page.getByTestId(`bubble-${cId}`).waitFor();
  await a.page.waitForTimeout(300);
  await shot(a, 'bubbles');
  await b.page.waitForTimeout(100);
  await shot(b, 'bubbles-b');
  await a.t('chat-open').click();
  await a.page.waitForTimeout(300);
  await shot(a, 'chat-sheet');
  await a.page.mouse.click(w / 2, 40);

  // bảng chọc mất dạy
  await b.page.getByTestId(`avatar-${aId}`).click();
  await b.page.waitForTimeout(300);
  await shot(b, 'target-sheet');
  await b.t('troll-nick').click();
  await b.page.waitForTimeout(200);
  await shot(b, 'target-nick');
  await b.t('nick-hexe').click();
  await b.page.waitForTimeout(300);
  await c.page.getByTestId(`avatar-${aId}`).click();
  await c.t('troll-doodle').click();
  await c.t('doodle-sung').click();
  await b.page.getByTestId(`avatar-${cId}`).click();
  await b.t('troll-doodle').click();
  await b.t('doodle-mattim').click();
  await a.page.waitForTimeout(500);
  await a.page.mouse.wheel(0, -3000);
  await shot(a, 'doodle-nick');
  // gián
  await c.page.getByTestId(`avatar-${aId}`).click();
  await c.t('troll-roach').click();
  await a.page.getByTestId('roach').first().waitFor();
  await a.page.waitForTimeout(1800);
  await shot(a, 'roach');
  await a.page.waitForTimeout(3600);
  // mực
  await a.page.waitForTimeout(3500);
  await b.page.getByTestId(`avatar-${aId}`).click();
  await b.t('troll-ink').click();
  await a.page.getByTestId('ink-splash').waitFor();
  await a.page.waitForTimeout(500);
  await shot(a, 'ink');
  await a.page.waitForTimeout(3200);
  // tâm trạng: bị chưởng -> choáng; khóc thuê
  await c.page.getByTestId(`avatar-${aId}`).click();
  await c.t('hit-chuong').click();
  await a.page.waitForTimeout(600);
  await shot(a, 'mood-dizzy');
  await b.page.getByTestId(`avatar-${cId}`).click();
  await b.t('troll-cry').click();
  await a.page.waitForTimeout(500);
  await shot(a, 'mood-cry');
  check(true, `chụp xong ${w}x${h}`);
  for (const p of [a, b, c]) await p.page.context().close();
}
await browser.close();
process.exit(failures ? 1 : 0);
