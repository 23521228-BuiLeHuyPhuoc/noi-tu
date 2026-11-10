// Chạy giống play.mjs (server với TURN_SECONDS=8, bản web ở cổng 8081): node typhu.mjs [thư-mục-ảnh]
// E2E Cờ tỷ phú: 3 người chơi vài vòng (đổ xúc xắc, mua đất, xong lượt), xem chi tiết ô, tổng kết.
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const WEB = process.env.E2E_WEB ?? 'http://localhost:8081';
const SHOTS = process.argv[2] ?? '/tmp/typhu';
mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (cond, msg) => {
  console.log(cond ? 'OK  ' : 'FAIL', msg);
  if (!cond) failures++;
};

const executablePath = process.env.E2E_BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
async function phone(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`[${name}] lỗi trang:`, e.message);
  });
  await page.goto(WEB);
  await page.getByTestId('name-input').fill(name);
  return { name, page, t: (id) => page.getByTestId(id) };
}

const ps = [await phone('An')];
await ps[0].t('create-typhu').click();
await ps[0].t('room-code').waitFor();
const code = (await ps[0].t('room-code').textContent()).trim();
for (const n of ['Bình', 'Chi']) {
  const p = await phone(n);
  await p.t('code-input').fill(code);
  await p.t('join-btn').click();
  await p.t('room-code').waitFor();
  ps.push(p);
}
await ps[0].page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 3);
await ps[0].page.screenshot({ path: `${SHOTS}/1-lobby.png` });
await ps[0].t('start-btn').click();
for (const p of ps) await p.t('cell-0').waitFor();
check((await ps[0].page.locator('[data-testid^="cell-"]').count()) === 40, 'bàn cờ có 40 ô');
check((await ps[0].page.locator('[data-testid^="token-"]').count()) === 3, '3 quân cờ ở ô Xuất phát');
await ps[0].page.screenshot({ path: `${SHOTS}/2-start.png` });

let rolls = 0, bought = 0, ended = 0, skipped = 0;
for (let i = 0; i < 40 && rolls < 6; i++) {
  let acted = false;
  for (const p of ps) {
    if (await p.t('buy-btn').count()) {
      if (bought < 2) {
        await p.t('buy-btn').click();
        bought++;
      } else {
        await p.t('skip-btn').click();
        skipped++;
      }
      acted = true;
    } else if (await p.t('end-turn').count()) {
      await p.t('end-turn').click();
      ended++;
      acted = true;
    } else if (await p.t('roll-btn').count()) {
      await p.t('roll-btn').click();
      rolls++;
      acted = true;
      if (rolls === 1) {
        await p.page.waitForTimeout(600);
        await p.page.screenshot({ path: `${SHOTS}/3-rolled.png` });
      }
    }
    if (acted) break;
  }
  await ps[0].page.waitForTimeout(acted ? 500 : 400);
}
check(rolls >= 3, `đổ xúc xắc ${rolls} lần, qua nhiều lượt`);
check(bought >= 1, `mua được ${bought} miếng đất (bỏ qua ${skipped})`);
const owned = await ps[0].page.evaluate(() =>
  [...document.querySelectorAll('[data-testid^="cell-"]')].filter((el) => getComputedStyle(el).backgroundColor !== 'rgb(255, 255, 255)').length,
);
check(owned >= 1, `bàn cờ tô màu chủ đất (${owned} ô)`);
await ps[1].page.screenshot({ path: `${SHOTS}/4-board.png` });

// xem chi tiết một ô đất
await ps[2].t('cell-39').click();
await ps[2].page.getByText('Thành phố lớn').waitFor();
check((await ps[2].page.getByText('Khách sạn').count()) > 0, 'chạm ô Sài Gòn: hiện bảng giá thuê đến khách sạn');
await ps[2].page.screenshot({ path: `${SHOTS}/5-detail.png` });

// chủ phòng tổng kết
await ps[0].t('end-open').click();
await ps[0].t('end-confirm').click();
for (const p of ps) await p.t('result-title').waitFor();
const title = await ps[1].t('result-title').textContent();
check(/tỷ phú|thắng/.test(title), `tổng kết: "${title}"`);
await ps[0].page.screenshot({ path: `${SHOTS}/6-result.png` });

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
