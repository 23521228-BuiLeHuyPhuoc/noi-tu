// Chạy giống play.mjs (server với TURN_SECONDS=8, bản web ở cổng 8081): node edge.mjs
// E2E các tình huống đặc biệt: chơi một mình, tải lại giữa ván, thoát giữa ván, đồng hồ đếm ngược.
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
  page.on('pageerror', (e) => console.log(`[${name}] lỗi trang:`, e.message));
  await page.goto(WEB);
  await page.getByTestId('name-input').fill(name);
  return { name, page, t: (id) => page.getByTestId(id) };
}

// ---- 1. Chơi một mình ----
{
  const s = await phone('Solo');
  await s.t('create-btn').click();
  await s.page.getByText('Chơi một mình').click();
  await s.t('current-word').waitFor();
  const t1 = Number((await s.t('seconds-left').textContent()).replace('s', ''));
  await s.page.waitForTimeout(2200);
  const t2 = Number((await s.t('seconds-left').textContent()).replace('s', ''));
  check(t1 - t2 >= 2, `đồng hồ đếm ngược chạy (${t1}s → ${t2}s)`);
  await s.t('result-title').waitFor({ timeout: 15000 });
  const title = await s.t('result-title').textContent();
  check(title.includes('Bạn nối được 0 từ'), `chơi một mình kết thúc: "${title}"`);
  await s.page.context().close();
}

// ---- 2. Tải lại giữa ván + thoát giữa ván ----
{
  const [a, b, c] = [await phone('An'), await phone('Bình'), await phone('Chi')];
  await a.t('create-btn').click();
  const code = (await a.t('room-code').textContent()).trim();
  for (const p of [b, c]) {
    await p.t('code-input').fill(code);
    await p.t('join-btn').click();
    await p.t('room-code').waitFor();
  }
  await a.page.getByText('Người chơi (3/6)').waitFor();
  await a.t('start-btn').click();
  for (const p of [a, b, c]) await p.t('current-word').waitFor();
  const word = await a.t('current-word').textContent();

  // B tải lại trang giữa ván -> phải quay lại đúng màn chơi, cùng từ hiện tại
  await b.page.reload();
  await b.t('current-word').waitFor({ timeout: 10000 });
  check((await b.t('current-word').textContent()) === word, 'tải lại giữa ván: vào lại đúng ván, đúng từ đang chơi');

  // C bấm thoát ván -> những người còn lại thấy "đã rời phòng"
  await c.page.getByText('Thoát ván').click();
  await c.t('create-btn').waitFor();
  check(true, 'người thoát quay về trang chủ');
  await a.page.getByText('Chi đã rời phòng').waitFor({ timeout: 5000 });
  check(true, 'người còn lại thấy thông báo "Chi đã rời phòng"');

  // C thử vào lại phòng đang chơi -> bị từ chối
  await c.t('code-input').fill(code);
  await c.t('join-btn').click();
  await c.t('home-error').waitFor();
  check((await c.t('home-error').textContent()).includes('đang chơi'), 'vào phòng đang chơi bị từ chối');

  // không ai trả lời -> còn 1 người thắng
  for (const p of [a, b]) await p.t('result-title').waitFor({ timeout: 30000 });
  check((await a.t('result-title').textContent()).includes('thắng'), 'ván 2 người còn lại kết thúc có người thắng');
}

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
