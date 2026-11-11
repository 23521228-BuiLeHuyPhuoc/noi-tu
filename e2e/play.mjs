// Chạy: (cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:3999 npx expo export -p web --output-dir /tmp/web-dist)
//       (cd /tmp/web-dist && python3 -m http.server 8081) ; (cd server && PORT=3999 TURN_SECONDS=8 node dist/server.js)
//       cd e2e && npm i && node play.mjs ../server/data/words.txt /tmp/shots
// E2E Nối từ: 3 "điện thoại" (3 context Chrome riêng biệt) chơi một ván thật.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';

const WEB = 'http://localhost:8081';
const WORDS_FILE = process.argv[2];
const SHOTS = process.argv[3] ?? '/tmp/shots';
mkdirSync(SHOTS, { recursive: true });

const words = readFileSync(WORDS_FILE, 'utf8').split('\n').filter(Boolean);
const byFirst = new Map();
for (const w of words) {
  const f = w.split(' ')[0];
  if (!byFirst.has(f)) byFirst.set(f, []);
  byFirst.get(f).push(w);
}

const log = (...a) => console.log('•', ...a);
let failures = 0;
const check = (cond, msg) => {
  if (cond) log('OK  ', msg);
  else {
    failures++;
    console.log('FAIL', msg);
  }
};

const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const phones = [];
for (const name of ['An', 'Bình', 'Chi']) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`[${name}] lỗi trang:`, e.message);
  });
  await page.goto(WEB);
  phones.push({ name, page });
}
const [A, B, C] = phones;
const tid = (p, id) => p.page.getByTestId(id);
const shot = (p, label) => p.page.screenshot({ path: `${SHOTS}/${label}.png` });
const avatarCount = (p) => p.page.locator('[data-testid^="avatar-"]').count();

// ---- Trang chủ ----
await tid(A, 'name-input').fill('An');
await tid(A, 'create-wordchain').click();
await tid(A, 'room-code').waitFor();
const code = (await tid(A, 'room-code').textContent()).trim();
check(/^[A-Z2-9]{6}$/.test(code), `tạo phòng, mã = ${code}`);

// sai mã phòng
await tid(B, 'name-input').fill('Bình');
await tid(B, 'code-input').fill('ZZZZZZ');
await tid(B, 'join-btn').click();
await tid(B, 'home-error').waitFor();
check((await tid(B, 'home-error').textContent()).includes('Không tìm thấy phòng'), 'báo lỗi khi mã phòng sai');

// link mời
await tid(A, 'share-btn').click();
await A.page.getByText('Đã sao chép link mời').waitFor();
const copied = await A.page.evaluate(() => navigator.clipboard.readText());
const link = copied.split('\n').find((l) => l.startsWith('http'));
check(link === `${WEB}/?room=${code}`, `link mời đã sao chép: ${link}`);

await tid(B, 'code-input').fill(code.toLowerCase());
await tid(B, 'join-btn').click();
await tid(B, 'room-code').waitFor();

await C.page.goto(link);
await tid(C, 'invite-hint').waitFor();
check((await tid(C, 'code-input').inputValue()) === code, 'mở link mời: mã phòng tự điền sẵn');
await tid(C, 'name-input').fill(C.name);
await tid(C, 'join-btn').click();
await tid(C, 'room-code').waitFor();
check(!C.page.url().includes('room='), 'vào phòng xong thì link được dọn sạch');

await A.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 3);
check(true, 'cả 3 người vào được phòng chờ');
check((await tid(B, 'start-btn').count()) === 0, 'chỉ chủ phòng thấy nút Bắt đầu');

// tải lại trang (giả lập rớt mạng / mở lại app)
await C.page.reload();
await tid(C, 'room-code').waitFor({ timeout: 10000 });
await A.page.waitForTimeout(500);
check((await avatarCount(A)) === 3, 'tải lại trang vẫn tự vào lại đúng phòng, không bị nhân đôi');

// ---- Chơi ----
await tid(A, 'start-btn').click();
for (const p of phones) await tid(p, 'current-word').waitFor();
check(true, 'ván bắt đầu trên cả 3 máy');

const used = new Set();
async function whoseTurn() {
  for (const p of phones) {
    const t = await tid(p, 'turn-label').textContent();
    if (t.includes('Tới lượt bạn')) return p;
  }
  return null;
}
const currentWord = async (p) => (await tid(p, 'current-word').textContent()).replace(/\s+/g, ' ').trim();

let p = await whoseTurn();
let word = await currentWord(A);
used.add(word);
check(p !== null, `từ mở đầu "${word}", tới lượt ${p?.name}`);
const last0 = word.split(' ')[1];
check(
  (await tid(p, 'word-prefix').textContent()).includes(last0) && (await tid(p, 'word-input').inputValue()) === '',
  'chữ đầu được khóa sẵn, ô nhập chỉ để gõ chữ thứ hai',
);
const shown = Number((await tid(p, 'next-count').textContent()).match(/Còn\s*(\d+)/)[1]);
const expected = (byFirst.get(last0) ?? []).filter((w) => !used.has(w)).length;
check(shown === expected, `hiện "còn ${shown} từ có thể nối" (kho từ: ${expected})`);

await tid(p, 'word-input').fill('xyzt');
await tid(p, 'submit-btn').click();
await tid(p, 'word-error').waitFor();
check(true, `báo lỗi từ sai: "${await tid(p, 'word-error').textContent()}"`);

// cứu trợ: server nối hộ luôn một từ hợp lệ
const beforeHint = await currentWord(p);
await tid(p, 'hint-btn').click();
await p.waitForFunction((w) => document.querySelector('[data-testid="current-word"]')?.textContent.trim() !== w, beforeHint);
const hinted = await currentWord(p);
check(hinted.split(' ')[0] === beforeHint.split(' ')[1], `cứu trợ nối hộ: "${beforeHint}" -> "${hinted}"`);
used.add(hinted);
await shot(p, '3-game-hint');

for (let i = 0; i < 4; i++) {
  p = await whoseTurn();
  word = await currentWord(p);
  const ans = (byFirst.get(word.split(' ')[1]) ?? []).find((w) => !used.has(w));
  if (!ans) break;
  used.add(ans);
  await tid(p, 'word-input').fill(ans.toUpperCase());
  await tid(p, 'submit-btn').click();
  await A.page.waitForFunction(
    (w) => document.querySelector('[data-testid="current-word"]')?.textContent.replace(/\s+/g, ' ').trim() === w,
    ans,
    { timeout: 5000 },
  );
  log(`   ${p.name} nối: ${ans}`);
}
check(true, 'nối đúng nhiều từ, cả 3 máy cập nhật cùng lúc');
await shot(A, '4-game');

// ---- không ai trả lời: lần lượt bị loại (lượt 8s) ----
for (const ph of phones) await tid(ph, 'result-title').waitFor({ timeout: 30000 });
const titles = await Promise.all(phones.map((ph) => tid(ph, 'result-title').textContent()));
check(titles.some((t) => t.includes('Bạn thắng')) && titles.some((t) => t.includes('trụ lại')), `kết thúc ván: ${titles.join(' | ')}`);
await shot(A, '5-result');

await tid(A, 'restart-btn').click();
for (const ph of phones) await tid(ph, 'room-code').waitFor();
check(true, 'chơi lại: cả phòng về phòng chờ');

console.log(failures ? `\n${failures} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
await browser.close();
process.exit(failures ? 1 : 0);
