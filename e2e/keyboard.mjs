// Bàn phím ảo: khi mở, chỉ hàng ô nhập (Nối từ) / bảng chat nhích lên, phần còn lại của màn hình đứng yên.
// Giả lập: Android = navigator.virtualKeyboard (geometrychange), iOS = visualViewport (resize).
// Chạy: node keyboard.mjs <words.txt> /tmp/fun-shots   (web 8081, server TURN_SECONDS=8)
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';

const WEB = process.env.E2E_WEB ?? 'http://localhost:8081';
const SHOTS = process.argv[3] ?? '/tmp/fun-shots';
mkdirSync(SHOTS, { recursive: true });
let failures = 0;
const check = (c, m) => { console.log(c ? 'OK  ' : 'FAIL', m); if (!c) failures++; };
const executablePath = process.env.E2E_BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

const FAKE = {
  android: () => {
    const vk = new EventTarget();
    vk.boundingRect = { height: 0 };
    vk.overlaysContent = false;
    Object.defineProperty(navigator, 'virtualKeyboard', { value: vk, configurable: true });
    window.__kb = (h) => { vk.boundingRect = { height: h }; vk.dispatchEvent(new Event('geometrychange')); };
  },
  ios: () => {
    const vv = new EventTarget();
    let kb = 0;
    Object.defineProperties(vv, {
      width: { get: () => window.innerWidth, configurable: true },
      height: { get: () => window.innerHeight - kb, configurable: true },
      offsetTop: { value: 0, configurable: true },
      scale: { value: 1, configurable: true },
    });
    Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
    window.__kb = (h) => { kb = h; vv.dispatchEvent(new Event('resize')); };
  },
};

async function phone(name, mode, w = 360, h = 640) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  if (mode) await page.addInitScript(FAKE[mode]);
  page.on('pageerror', (e) => { failures++; console.log(`[${name}] lỗi trang:`, e.message); });
  await page.goto(WEB);
  return { name, page, t: (id) => page.getByTestId(id) };
}
const rects = (p, ids) => p.page.evaluate((ids) => Object.fromEntries(ids.map((id) => {
  const el = document.querySelector(`[data-testid="${id}"]`);
  if (!el) return [id, null];
  const r = el.getBoundingClientRect();
  return [id, { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right) }];
})), ids);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (const mode of ['android', 'ios']) {
  const a = await phone('An', mode);
  await a.t('name-input').fill('An');
  await a.t('create-wordchain').click();
  await a.t('room-code').waitFor();
  const code = (await a.t('room-code').textContent()).trim();
  const b = await phone('Bình', mode);
  await b.t('name-input').fill('Bình');
  await b.t('code-input').fill(code);
  await b.t('join-btn').click();
  await b.t('room-code').waitFor();
  await a.t('start-btn').click();
  await a.t('current-word').waitFor();
  await a.page.waitForTimeout(500);
  // máy nào đang tới lượt thì dùng máy đó để gõ (cả hai đều có giả lập bàn phím)
  await a.page.waitForTimeout(400);
  const me = (await a.t('turn-label').textContent()).includes('Tới lượt bạn') ? a : b;
  check((await me.t('turn-label').textContent()).includes('Tới lượt bạn'), `(${mode}) có máy tới lượt gõ chữ`);
  {
    const ids = ['current-word', 'turn-label', 'word-input'];
    const strip = await me.page.locator('[data-testid^="avatar-"]').evaluateAll((els) => els.map((e) => e.dataset.testid));
    const before = await rects(me, [...ids, ...strip]);
    await me.t('word-input').click();
    await me.page.evaluate(() => window.__kb(300));
    await me.page.waitForTimeout(400);
    const after = await rects(me, [...ids, ...strip]);
    await me.page.screenshot({ path: `${SHOTS}/keyboard-open-${mode}.png` });
    const still = [...ids.filter((i) => i !== 'word-input'), ...strip].every((i) => same(before[i], after[i]));
    check(still, `(${mode}) bàn phím mở: avatar, từ hiện tại, lượt không nhúc nhích`);
    check(after['word-input'].b <= 640 - 300, `(${mode}) ô nhập nằm trên bàn phím (đáy ${after['word-input'].b} <= 340)`);
    check(after['word-input'].t >= 0, `(${mode}) ô nhập vẫn trong màn hình`);
    await me.page.evaluate(() => window.__kb(0));
    await me.page.waitForTimeout(400);
    const closed = await rects(me, ids);
    check(same(closed['word-input'], before['word-input']), `(${mode}) bàn phím đóng: ô nhập về chỗ cũ`);
  }
  // bảng chat
  await a.t('chat-open').click();
  await a.t('chat-input').click();
  await a.page.evaluate(() => window.__kb(300));
  await a.page.waitForTimeout(400);
  const chat = await rects(a, ['chat-input', 'chat-send']);
  await a.page.screenshot({ path: `${SHOTS}/keyboard-chat-${mode}.png` });
  check(chat['chat-input'].b <= 340 && chat['chat-send'].b <= 340, `(${mode}) bảng chat: ô nhập và nút Gửi nằm trên bàn phím`);
  const top = await a.page.evaluate(() => Math.min(...[...document.querySelectorAll('[data-testid="chat-list"]')].map((e) => e.getBoundingClientRect().top)));
  check(top >= 0, `(${mode}) bảng chat không bị đẩy ra khỏi mép trên`);
  for (const p of [a, b]) await p.page.context().close();
}
await browser.close();
console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
process.exit(failures ? 1 : 0);
