// Chạy giống play.mjs (server với TURN_SECONDS=8, bản web ở cổng 8081): node edge.mjs
// E2E tình huống đặc biệt: chơi một mình, tải lại giữa ván, thoát giữa ván, đồng hồ đếm ngược.
import { chromium } from 'playwright-core';

const WEB = 'http://localhost:8081';
let failures = 0;
const check = (cond, msg) => {
  console.log(cond ? 'OK  ' : 'FAIL', msg);
  if (!cond) failures++;
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
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
const secs = async (p) => Number((await p.t('seconds-left').textContent()).replace('s', ''));

// ---- 1. Chơi một mình ----
{
  const s = await phone('Solo');
  await s.t('create-wordchain').click();
  await s.page.getByText('Chơi một mình').click();
  await s.t('current-word').waitFor();
  const t1 = await secs(s);
  await s.page.waitForTimeout(2200);
  const t2 = await secs(s);
  check(t1 - t2 >= 2, `đồng hồ đếm ngược chạy (${t1}s → ${t2}s)`);
  await s.t('result-title').waitFor({ timeout: 15000 });
  const title = await s.t('result-title').textContent();
  check(title.includes('Bạn nối được 0 từ'), `chơi một mình kết thúc: "${title}"`);
  await s.page.context().close();
}

// ---- 2. Tải lại giữa ván + thoát giữa ván ----
{
  const [a, b, c] = [await phone('An'), await phone('Bình'), await phone('Chi')];
  await a.t('create-wordchain').click();
  const code = (await a.t('room-code').textContent()).trim();
  for (const p of [b, c]) {
    await p.t('code-input').fill(code);
    await p.t('join-btn').click();
    await p.t('room-code').waitFor();
  }
  await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 3);
  await a.t('start-btn').click();
  for (const p of [a, b, c]) await p.t('current-word').waitFor();
  const word = await a.t('current-word').textContent();

  await b.page.reload();
  await b.t('current-word').waitFor({ timeout: 10000 });
  check((await b.t('current-word').textContent()) === word, 'tải lại giữa ván: vào lại đúng ván, đúng từ đang chơi');

  await c.t('leave-open').click();
  await c.t('leave-confirm').click();
  await c.t('create-wordchain').waitFor();
  check(true, 'người thoát (có hỏi xác nhận) quay về trang chủ');
  await a.page.getByText('Chi đã rời phòng').waitFor({ timeout: 5000 });
  check(true, 'người còn lại thấy "Chi đã rời phòng" trong lịch sử');

  // người lạ vào giữa ván: vào được với tư cách người xem (banner chế độ xem)
  const d = await phone('Dũng');
  await d.t('code-input').fill(code);
  await d.t('join-btn').click();
  await d.t('spectator-banner').waitFor();
  check(true, 'người mới vào phòng đang chơi: thành người xem, có banner chế độ xem');
  check((await d.page.getByText('Bạn đang xem').count()) === 1, 'thông báo chế độ xem chỉ hiện một lần');

  for (const p of [a, b]) await p.t('result-title').waitFor({ timeout: 30000 });
  check(true, 'ván 2 người còn lại kết thúc');
}

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
