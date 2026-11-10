// Chạy giống play.mjs (server với TURN_SECONDS=8, bản web ở cổng 8081): node games.mjs
// E2E Cờ cá ngựa, Bầu cua và tính năng ném/khịa/hối.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const WEB = process.env.E2E_WEB ?? 'http://localhost:8081';
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
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`[${name}] lỗi trang:`, e.message);
  });
  await page.goto(WEB);
  await page.getByTestId('name-input').fill(name);
  return { name, page, t: (id) => page.getByTestId(id) };
}
async function room(game, names) {
  const ps = [await phone(names[0])];
  await ps[0].t(`create-${game}`).click();
  await ps[0].t('room-code').waitFor();
  const code = (await ps[0].t('room-code').textContent()).trim();
  for (const n of names.slice(1)) {
    const p = await phone(n);
    await p.t('code-input').fill(code);
    await p.t('join-btn').click();
    await p.t('room-code').waitFor();
    ps.push(p);
  }
  await ps[0].page.waitForFunction((n) => document.querySelectorAll('[data-testid^="avatar-"]').length === n, names.length);
  return ps;
}
const feedHas = (p, text) => p.page.getByTestId('feed').filter({ hasText: text }).first().waitFor({ timeout: 4000 }).then(() => true, () => false);

// ---------------- Ném / khịa / hối ----------------
{
  const [a, b] = await room('wordchain', ['An', 'Bình']);
  const aId = (await a.page.locator('[data-testid^="avatar-"]').first().getAttribute('data-testid')).slice(7);
  await b.page.getByTestId(`avatar-${aId}`).click();
  await b.t('throw-cachua').click();
  check(await feedHas(a, 'ném 🍅 vào mặt bạn'), 'bị ném cà chua: người bị ném thấy thông báo');
  await b.t('chat-open').click();
  await b.t('taunt-ga').click();
  await a.page.getByText('Gà quá 🐔').first().waitFor({ timeout: 3000 });
  check(true, 'khịa: bong bóng "Gà quá 🐔" hiện trên màn hình người khác');
  await b.page.getByTestId(`avatar-${aId}`).click();
  await b.t('poke-btn').click();
  check(await feedHas(a, 'đang hối bạn'), 'hối: người bị hối thấy "đang hối bạn"');
  await a.page.context().close();
  await b.page.context().close();
}

// ---------------- Cờ cá ngựa ----------------
{
  const [a, b] = await room('ludo', ['An', 'Bình']);
  await a.t('pieces-2').click();
  await b.page.getByTestId('pieces-2').evaluate((el) => el.getAttribute('aria-disabled')).catch(() => null);
  await a.t('start-btn').click();
  for (const p of [a, b]) await p.t('dice').waitFor();
  check((await a.page.locator('[data-testid^="piece-"]').count()) === 4, 'chọn 2 ngựa: bàn có 2×2 = 4 con ngựa');
  let rolls = 0, moved = false, passed = false;
  for (let i = 0; i < 16 && !(moved && passed); i++) {
    const cur = (await a.t('roll-btn').count()) ? a : (await b.t('roll-btn').count()) ? b : null;
    if (!cur) {
      await a.page.waitForTimeout(300);
      continue;
    }
    await cur.t('roll-btn').click();
    rolls++;
    await cur.page.waitForTimeout(250);
    const status = await cur.t('ludo-status').textContent();
    if (status.includes('Chạm vào con ngựa')) {
      const movable = cur.page.locator('[data-testid^="piece-"][role="button"]');
      const before = await movable.first().boundingBox();
      await movable.first().click();
      await cur.page.waitForTimeout(500);
      moved = true;
      check(true, `chạm ngựa để đi (trước: ${Math.round(before.x)},${Math.round(before.y)})`);
    } else if (status.includes('Đang đi')) {
      moved = true;
      await cur.page.waitForTimeout(1200);
    } else {
      passed = true;
      await cur.page.waitForTimeout(1600);
    }
  }
  check(rolls > 0, `đổ xúc xắc ${rolls} lần`);
  check(moved, 'có ngựa ra quân / di chuyển');
  // người không tới lượt không có nút đổ
  const both = (await a.t('roll-btn').count()) + (await b.t('roll-btn').count());
  check(both <= 1, 'chỉ người tới lượt mới có nút "Đổ xúc xắc"');
  await a.page.context().close();
  await b.page.context().close();
}

// ---------------- Bầu cua ----------------
{
  const [a, b, c] = await room('baucua', ['An', 'Bình', 'Chi']);
  await a.t('rounds-15').click();
  await a.t('start-btn').click();
  for (const p of [a, b, c]) await p.t('sym-cua').waitFor();
  check((await b.t('bc-round').textContent()) === 'Ván 1/15', 'chọn 15 ván: hiện Ván 1/15');
  await b.t('chip-100').click();
  await b.t('sym-cua').click();
  await b.t('sym-cua').click();
  await b.t('chip-50').click();
  await b.t('sym-ga').click();
  await b.page.waitForTimeout(300);
  check((await b.t('mybet-cua').textContent()) === '200', 'đặt cược cộng dồn: Cua 200');
  check((await b.t('mybet-ga').textContent()) === '50', 'đổi chip: Gà 50');
  check(/250|200/.test(await c.t('pile-cua').textContent()), 'người khác thấy tiền vun trên ô Cua');
  check((await a.t('shake-btn').count()) + (await b.t('shake-btn').count()) === 0, 'không còn nút Lắc, máy tự lắc');
  await a.page.getByText('Máy đang lắc bát').waitFor({ timeout: 12000 });
  check(true, 'hết giờ cược: máy tự lắc bát');
  await b.t('bc-reveal').waitFor({ timeout: 6000 });
  check((await b.page.locator('[data-testid="reveal-die"]').count()) === 3, 'mở bát toàn màn hình với 3 con');
  await b.t('bc-delta').waitFor({ timeout: 6000 });
  const delta = await b.t('bc-delta').textContent();
  check(/xu/.test(delta), `mở bát, Bình thấy kết quả: ${delta}`);
  check((await b.page.locator('[data-testid="bc-die"]').count()) === 3, 'mở ra đúng 3 con');
  await a.t('end-open').click();
  await a.t('end-confirm').click();
  for (const p of [a, b, c]) await p.t('result-title').waitFor();
  check(true, 'tổng kết: cả phòng sang màn kết quả');
  await a.t('switch-ludo').click();
  for (const p of [a, b, c]) await p.t('room-code').waitFor();
  check((await b.page.getByText('Cờ cá ngựa').count()) > 0, 'đổi game từ màn kết quả: cả phòng về phòng chờ Cờ cá ngựa');
}

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
