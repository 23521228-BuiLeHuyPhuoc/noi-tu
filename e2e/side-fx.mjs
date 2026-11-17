// Hiệu ứng phụ của món chọc: chèn sự kiện fun:event giả (đủ 14 hiệu ứng) vào kết nối socket của máy bị chọc,
// kiểm tra từng hiệu ứng hiện đúng chỗ và chụp ảnh. Lần cuối gửi chọc thật qua server để thấy có `side`.
//   (cd server && npm run build && PORT=4330 node dist/server.js)
//   (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:4330 npx expo export -p web --output-dir <thư-mục-web>) rồi phục vụ thư mục đó
//   WEB=http://localhost:<cổng-web> node e2e/side-fx.mjs <thư-mục-ảnh>
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8397';
const OUT = process.argv[2] ?? './shots-side-fx';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const executablePath = process.env.CHROME ?? ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

async function phone(name, spy = false) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { failures++; console.log(`[${name}] LỖI TRANG`, e.message); });
  const p = { page, t: (id) => page.getByTestId(id), ws: null };
  if (spy) {
    // giữ đường socket tới trình duyệt để chèn sự kiện giả; mọi khung khác đi thẳng tới server
    await page.routeWebSocket(/socket\.io/, (ws) => {
      ws.connectToServer();
      p.ws = ws;
    });
  }
  await page.goto(WEB);
  await p.t('name-input').fill(name);
  return p;
}

const an = await phone('An');
await an.t('create-wordchain').click();
await an.t('room-code').waitFor();
const code = (await an.t('room-code').textContent()).trim();
const bi = await phone('Binh', true);
await bi.t('code-input').fill(code);
await bi.t('join-btn').click();
await bi.t('room-code').waitFor();
await sleep(600);
const ids = await bi.page.evaluate(() => [...document.querySelectorAll('[data-testid^="avatar-name-"]')].map((e) => e.getAttribute('data-testid').slice('avatar-name-'.length)));
// người có chữ "(bạn)" trên màn Bình là Bình
const meId = await bi.page.evaluate(() => {
  for (const e of document.querySelectorAll('[data-testid^="avatar-name-"]')) if (e.textContent.includes('(bạn)')) return e.getAttribute('data-testid').slice('avatar-name-'.length);
  return null;
});
const anId = ids.find((x) => x !== meId);
check(!!meId && !!anId && !!bi.ws, 'tìm được id hai người và đường socket của Bình');

let seq = 900000;
const inject = (side, extra = {}) => bi.ws.send('42' + JSON.stringify(['fun:event', {
  kind: 'poke', to: meId, poke: 'poo', from: anId, variant: 4242, side, id: ++seq, ...extra,
}]));

const SCREEN = {
  crack: 'side-crack', fog: 'side-fog', flicker: 'side-flicker', dodge: 'side-dodge', freeze: 'side-freeze', ring: 'side-ring',
};
for (const [side, id] of Object.entries(SCREEN)) {
  inject(side);
  const seen = await bi.t(id).waitFor({ timeout: 2500 }).then(() => true, () => false);
  await sleep(side === 'flicker' ? 250 : 500);
  await bi.page.screenshot({ path: `${OUT}/screen-${side}.png` });
  check(seen, `màn hình: ${side}`);
  check((await an.t(id).count()) === 0, `màn hình: ${side} không hiện cho người khác`);
  // dọn trước khi thử cái sau
  if (side === 'crack') for (let i = 0; i < 3; i++) await bi.t(id).click().catch(() => {});
  if (side === 'ring') await bi.t(id).click().catch(() => {});
  if (side === 'dodge') {
    await bi.t(id).click({ force: true }).catch(() => {});
    await sleep(120);
    await bi.page.screenshot({ path: `${OUT}/screen-dodge-jump.png` });
  }
  await bi.t(id).waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
}

inject('drunk');
check(await bi.page.getByText('Say quá trời say').waitFor({ timeout: 2500 }).then(() => true, () => false), 'màn hình: drunk');
await sleep(900);
await bi.page.screenshot({ path: `${OUT}/screen-drunk.png` });
await sleep(3500);

inject('gray');
await sleep(1100);
const filter = await bi.page.evaluate(() => (document.getElementById('root') ?? document.body).style.filter);
check(filter.includes('grayscale'), 'màn hình: gray (đen trắng)');
await bi.page.screenshot({ path: `${OUT}/screen-gray.png` });
await sleep(5000);
check(!(await bi.page.evaluate(() => (document.getElementById('root') ?? document.body).style.filter)).includes('grayscale'), 'màn hình: gray tự hết');

// soft: không có hiệu ứng màn hình
inject('freeze', { soft: true });
await sleep(1100);
check((await bi.t('side-freeze').count()) === 0, 'người đã chạm giới hạn (soft) không bị hiệu ứng màn hình');

// avatar (chèn ở máy Bình, kiểm tra trên máy Bình; cả phòng thấy vì server phát cho mọi máy)
for (const side of ['pig', 'stone', 'baby', 'cage', 'bomb']) {
  inject(side);
  const seen = side === 'bomb'
    ? await bi.page.getByText('💣').first().waitFor({ timeout: 2500 }).then(() => true, () => false)
    : await bi.t(`morph-${meId}`).waitFor({ timeout: 2500 }).then(() => true, () => false);
  // chờ món chọc bay qua hết rồi mới chụp phần biến hình
  await sleep(2600);
  await bi.page.screenshot({ path: `${OUT}/avatar-${side}.png`, clip: { x: 0, y: 0, width: 390, height: 200 } });
  check(seen, `avatar: ${side}`);
  await sleep(side === 'bomb' ? 2800 : 200);
}
inject('flipname');
await sleep(1000);
const nm = await bi.t(`avatar-name-${meId}`).textContent();
check(nm.startsWith('hniB'), `avatar: tên ngược (${nm})`);
await bi.page.screenshot({ path: `${OUT}/avatar-flipname.png`, clip: { x: 0, y: 0, width: 390, height: 200 } });

await browser.close();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
