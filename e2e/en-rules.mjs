// Chạy: (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:3999 npx expo export -p web --output-dir /tmp/web-dist)
//       (cd /tmp/web-dist && python3 -m http.server 8081) ; (cd server && PORT=3999 node dist/server.js)
//       cd e2e && npm i && CHROME=/usr/bin/google-chrome node en-rules.mjs ../server/data/words-en.txt /tmp/shots
// E2E Nối từ Anh: 2 "điện thoại" chơi thật — gõ Telex có dấu, cứu trợ nối hộ, thời gian lượt giảm dần,
// đổi tên + tải ảnh giữa ván, giới hạn chiêu rung màn hình 3 lần/15 giây và bù giờ khi bị chọc.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8081';
const WORDS_FILE = process.argv[2];
const SHOTS = process.argv[3] ?? '/tmp/shots';
mkdirSync(SHOTS, { recursive: true });

const words = readFileSync(WORDS_FILE, 'utf8').split(/\r?\n/).filter((w) => /^[a-z]{3,8}$/.test(w));
const byFirst = new Map();
for (const w of words) {
  if (!byFirst.has(w[0])) byFirst.set(w[0], []);
  byFirst.get(w[0]).push(w);
}
const used = new Set();

const log = (...a) => console.log('•', ...a);
let failures = 0;
const check = (cond, msg) => {
  if (cond) log('OK  ', msg);
  else {
    failures++;
    console.log('FAIL', msg);
  }
};

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const phones = [];
for (const name of ['An', 'Bình']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log('PAGE ERROR', name, e.message);
  });
  phones.push({ name, page });
}
const [an, binh] = phones;
const tid = (id) => `[data-testid="${id}"]`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(100);
  }
  return null;
}

// ---------- vào phòng ----------
for (const p of phones) {
  await p.page.goto(WEB);
  await p.page.locator(tid('name-input')).fill(p.name);
}
await an.page.locator(tid('create-wordchain_en')).click();
const code = (await an.page.locator(tid('room-code')).textContent({ timeout: 15000 })).trim();
log('mã phòng', code);
await binh.page.locator(tid('code-input')).fill(code);
await binh.page.locator(tid('join-btn')).click();
await binh.page.locator(tid('room-code')).waitFor({ timeout: 10000 });
await an.page.locator(tid('start-btn')).click();
await an.page.locator(tid('current-word')).waitFor({ timeout: 10000 });
await binh.page.locator(tid('current-word')).waitFor({ timeout: 10000 });

async function turnOwner() {
  return waitFor(async () => {
    for (const p of phones) {
      const t = await p.page.locator(tid('turn-label')).textContent();
      if (t?.includes('Tới lượt bạn')) return p;
    }
    return null;
  });
}
const currentWord = async (p) => (await p.page.locator(tid('current-word')).textContent()).trim();
async function lockedLetter(p) {
  return (await p.page.locator(tid('word-prefix')).getAttribute('aria-label')).replace('Chữ đầu: ', '').trim();
}

// ---------- nối vài từ thường, thời gian lượt giảm dần ----------
let cur = await turnOwner();
check(!!cur, 'có người tới lượt');
const progress0 = await cur.page.locator(tid('en-progress')).textContent();
check(/Lượt của bạn: 30s/.test(progress0), `lượt đầu 30 giây (${progress0})`);
for (let i = 0; i < 2; i++) {
  cur = await turnOwner();
  const last = await lockedLetter(cur);
  const w = byFirst.get(last).find((x) => !used.has(x));
  used.add(w);
  await cur.page.locator(tid('word-input')).fill(w.slice(1));
  await cur.page.locator(tid('submit-btn')).click();
  const ok = await waitFor(async () => (await currentWord(an)) === w);
  check(!!ok, `nối được "${w}"`);
}
cur = await turnOwner();
const progress1 = await cur.page.locator(tid('en-progress')).textContent();
check(/29,5s/.test(progress1), `sau 1 từ đúng: 29,5 giây (${progress1})`);

// ---------- gõ bằng bộ gõ Telex: "bus" -> "bú" ----------
{
  const last = await lockedLetter(cur);
  const w = byFirst.get(last).find((x) => !used.has(x) && /^[^aeiouy]*[aeiouy]s$/.test(x.slice(1)));
  if (w) {
    used.add(w);
    const rest = w.slice(1, -1);
    const typed = (rest.slice(0, -1) + rest.slice(-1) + '́').normalize('NFC');
    await cur.page.locator(tid('word-input')).fill(typed);
    await cur.page.locator(tid('submit-btn')).click();
    const ok = await waitFor(async () => (await currentWord(an)) === w);
    check(!!ok, `gõ Telex "${last}${typed}" vẫn hiểu là "${w}"`);
  } else log('bỏ qua kiểm tra Telex (không có từ hợp với chữ', last, ')');
}

// ---------- chuỗi có dấu không đoán ra: nhắc tắt bộ gõ ----------
cur = await turnOwner();
await cur.page.locator(tid('word-input')).fill('ẽẽẽ');
await cur.page.locator(tid('submit-btn')).click();
const err = await waitFor(async () => cur.page.locator(tid('word-error')).textContent());
check(/bộ gõ tiếng Việt/.test(err ?? ''), `nhắc tắt bộ gõ tiếng Việt (${err})`);
await cur.page.locator(tid('word-input')).fill('');

// ---------- cứu trợ: nối hộ luôn ----------
{
  const before = await currentWord(an);
  await cur.page.locator(tid('hint-btn')).click();
  const after = await waitFor(async () => {
    const w = await currentWord(an);
    return w !== before ? w : null;
  });
  check(!!after, `cứu trợ nối hộ luôn từ "${after}"`);
  if (after) used.add(after);
  check((await cur.page.locator(tid('hint-btn')).count()) === 0 || !(await cur.page.locator(tid('turn-label')).textContent()).includes('Tới lượt bạn'), 'hết lượt cứu trợ / đã chuyển lượt');
}

/** người đang tới lượt nối một từ để mở lượt mới (còn ~30 giây) trước các bước chậm, tránh ván hết giờ giữa chừng */
async function freshTurn() {
  const p = await turnOwner();
  if (!p) return;
  const last = await lockedLetter(p);
  const w = byFirst.get(last).find((x) => !used.has(x));
  used.add(w);
  await p.page.locator(tid('word-input')).fill(w.slice(1));
  await p.page.locator(tid('submit-btn')).click();
  await waitFor(async () => (await currentWord(an)) === w);
}

// ---------- đổi tên giữa ván: tên dài hiện đầy đủ ----------
await freshTurn();
const longName = 'Nguyễn Thị Phương Thảo';
await binh.page.locator(tid('profile-open')).click();
await binh.page.locator(tid('profile-name')).fill(longName);
await binh.page.locator(tid('profile-save')).click();
const seen = await waitFor(async () => (await an.page.getByText(longName, { exact: false }).count()) > 0);
check(!!seen, 'đổi tên giữa ván: người khác thấy tên mới đầy đủ');
await an.page.screenshot({ path: `${SHOTS}/en-rename.png` });

// ---------- tải ảnh giữa ván (khách) ----------
await freshTurn();
{
  // PNG 2x2 đỏ
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');
  await binh.page.locator(tid('profile-open')).click();
  const [chooser] = await Promise.all([binh.page.waitForEvent('filechooser', { timeout: 8000 }), binh.page.locator(tid('avatar-upload')).click()]);
  await chooser.setFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  const note = await waitFor(async () => binh.page.locator(tid('profile-note')).textContent(), 15000);
  check(/Đã đổi ảnh/.test(note ?? ''), `tải ảnh giữa ván (${note ?? (await binh.page.locator(tid('profile-error')).textContent().catch(() => ''))})`);
  const img = await waitFor(async () => (await an.page.locator('img[src*="/api/img/"]').count()) > 0, 8000);
  check(!!img, 'người khác thấy ảnh mới');
  await binh.page.keyboard.press('Escape');
  const close = binh.page.getByRole('button', { name: /Đóng/ });
  if (await close.count()) await close.first().click().catch(() => {});
}

// ---------- chọc: tối đa 3 lần rung màn hình / 15 giây, bù giờ khi đang tới lượt ----------
await freshTurn();
{
  cur = await turnOwner();
  const victim = cur;
  const attacker = cur === an ? binh : an;
  const victimId = await victim.page.evaluate(() => localStorage.getItem('noitu.playerId'));
  const bonusBefore = await victim.page.locator(tid('turn-bonus')).count();
  const results = [];
  for (let i = 0; i < 4; i++) {
    await attacker.page.locator(tid(`avatar-${victimId}`)).click();
    await attacker.page.locator(tid(i === 0 ? 'troll-blackout' : 'troll-quake')).click();
    await sleep(400);
    results.push(await attacker.page.getByText(/chờ \d+ giây nữa/).count());
  }
  check(results.slice(0, 3).every((x) => x === 0) && results[3] > 0, `chiêu thứ 4 trong 15 giây bị chặn (${results})`);
  const bonus = await waitFor(async () => victim.page.locator(tid('turn-bonus')).textContent());
  check(bonusBefore === 0 && /Được bù/.test(bonus ?? ''), `người đang tới lượt được bù giờ (${bonus})`);
  const recover = victim.page.locator(tid('blackout-recover'));
  if (await recover.count()) await recover.click().catch(() => {});
  await victim.page.screenshot({ path: `${SHOTS}/en-bonus.png` });
}

await an.page.screenshot({ path: `${SHOTS}/en-an.png` });
await binh.page.screenshot({ path: `${SHOTS}/en-binh.png` });
await browser.close();
console.log(failures ? `\n${failures} lỗi` : '\nTất cả OK');
process.exit(failures ? 1 : 0);
