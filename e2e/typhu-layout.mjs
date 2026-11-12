// Chụp bố cục Cờ tỷ phú ở nhiều cỡ màn hình / số người / chế độ xem.
// node typhu-layout.mjs <thư-mục-ảnh> [vp=390x844,844x390,...] [players=2,4,6]
// Cần server (mặc định E2E_WEB=http://localhost:8402). Mỗi cặp (khung, số người) mở một ván mới.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const WEB = process.env.E2E_WEB ?? 'http://localhost:8402';
const OUT = process.argv[2] ?? '/tmp/typhu-layout';
const VPS = (process.argv[3] ?? '390x844,844x390,915x412,1024x768,1366x768,1920x1080').split(',').map((s) => s.split('x').map(Number));
const COUNTS = (process.argv[4] ?? '2,4,6').split(',').map(Number);
const FULL = process.env.FULL !== '0';
mkdirSync(OUT, { recursive: true });
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
let problems = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function tap(loc) {
  for (let k = 0; k < 12; k++) {
    try { await loc.click({ timeout: 1200 }); return true; } catch { await sleep(900); }
  }
  console.log('không bấm được', String(loc));
  return false;
}

for (const [W, H] of VPS) for (const n of COUNTS) {
  const tag = `${W}x${H}-p${n}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: Math.min(W, H) < 500, hasTouch: Math.min(W, H) < 500 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { problems++; console.log(`[${tag}] lỗi trang:`, e.message); });
  const t = (id) => page.getByTestId(id);
  await page.goto(WEB);
  await t('name-input').fill('An Nguyen Van Dai Ca');
  await t('create-typhu').click();
  await t('room-code').waitFor();
  for (let i = 1; i < n; i++) { await t('bot-add').click(); await sleep(150); }
  await t('start-btn').click();
  await t('cell-0').waitFor();
  await sleep(1200);
  // chơi vài lượt cho có đất, nhà
  const seen = new Set();
  const turns = Number(process.env.TURNS ?? 14);
  for (let i = 0; i < turns * 6; i++) {
    for (const id of ['roll-btn', 'buy-btn', 'build-btn', 'skip-btn', 'stay-jail']) {
      const b = t(id);
      if (await b.count() && ['buy-btn', 'build-btn', 'stay-jail'].includes(id) && !seen.has(id)) {
        seen.add(id); await sleep(700); await page.screenshot({ path: `${OUT}/${tag}-dlg-${id}.png` });
      }
      if (await b.count()) { if (await b.first().isEnabled().catch(() => false)) await b.first().click({ timeout: 800 }).catch(() => {}); break; }
    }
    await sleep(350);
  }
  await sleep(2500);
  const shot = async (name) => page.screenshot({ path: `${OUT}/${tag}-${name}.png` });
  for (let m = 0; m < 3; m++) {
    await sleep(400);
    await shot(`mode${m}`);
    if (FULL && m === 0 || FULL && m === 2) {
      // kiểm tra tràn ô: chữ/ảnh trong ô vượt khỏi ô
      const bad = await page.evaluate(() => {
        const out = [];
        document.querySelectorAll('[data-testid^="cell-"]').forEach((c) => {
          const r = c.getBoundingClientRect();
          c.querySelectorAll('*').forEach((e) => {
            const b = e.getBoundingClientRect();
            if (b.width && (b.right > r.right + 1.5 || b.bottom > r.bottom + 1.5 || b.left < r.left - 1.5 || b.top < r.top - 1.5)) out.push(c.getAttribute('data-testid'));
            if (e.scrollHeight > e.clientHeight + 2 && e.children.length === 0 && getComputedStyle(e).overflow !== 'visible') out.push(`${c.getAttribute('data-testid')}:clip`);
          });
        });
        return [...new Set(out)];
      });
      if (bad.length) { problems++; console.log(`[${tag}] mode${m} tràn ô:`, bad.join(',')); }
    }
    await tap(t('view-mode'));
  }
  if (FULL) {
    // chat
    await tap(t('chat-open')); await sleep(400);
    await page.getByTestId('chat-input').fill('Tin nhắn rất dài để thử xuống dòng trong khung trò chuyện, khung này không được làm vỡ bố cục của bàn cờ khi mở ra lúc đang chơi nhé các bạn ơi');
    await shot('chat');
    if (await t('chat-send').isVisible().catch(() => false)) await tap(t('chat-send')); else { problems++; console.log(`[${tag}] chat-send không thấy`); }
    await sleep(500); await shot('chat-sent');
    await page.keyboard.press('Escape'); await page.mouse.click(4, 4); await sleep(400);
    // chọc
    if (await t('poke-open').count()) {
      await tap(t('poke-open')); await sleep(400); await shot('poke');
      await tap(page.locator('[data-testid^="poke-pick-"]').first()); await sleep(500); await shot('throw');
      await page.mouse.click(4, 4); await sleep(400);
    }
    await tap(t('rules-open')); await sleep(400); await shot('rules');
    await page.mouse.click(4, 4); await sleep(400);
    await tap(t('cell-1')); await sleep(500); await shot('detail');
    await page.mouse.click(4, 4); await sleep(400);
    await tap(t('cell-39')); await sleep(500); await shot('detail39');
  }
  await ctx.close();
}
await browser.close();
console.log(problems ? `${problems} vấn đề` : 'xong');
