// Server local: ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1. WEB + SERVER + CHROME.
import { chromium } from 'playwright-core';
import { io } from '../server/node_modules/socket.io-client/build/esm/index.js';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const WEB = process.env.WEB ?? 'http://localhost:8395';
const SERVER = process.env.SERVER ?? 'http://localhost:4320';
const SHOTS = process.argv[2] ?? './shots-effects';
mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sockets = [];
const errors = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
async function connect() {
  const s = io(SERVER, { transports: ['websocket'], reconnection: false });
  sockets.push(s);
  await new Promise((resolve, reject) => { s.once('connect', resolve); s.once('connect_error', reject); });
  return s;
}
async function call(s, event, ...args) {
  return s.timeout(8000).emitWithAck(event, ...args);
}
async function register(s, username) {
  const r = await call(s, 'auth:register', { username, email: `${username}@example.com`, password: 'matkhau123', displayName: username });
  if (!r.ok && r.error === 'username_taken') return call(s, 'auth:login', { username, password: 'matkhau123' });
  return r;
}
try {
  const admin = await connect();
  assert.equal((await register(admin, 'boss')).ok, true);
  const sender = await connect();
  const username = `fx_${Date.now().toString(36)}`;
  assert.equal((await register(sender, username)).ok, true);
  assert.equal((await call(admin, 'admin:adjust', { username, delta: 1000, reason: 'Local effects E2E' })).ok, true);
  let state;
  sender.on('room:state', (r) => { state = r; });

  for (const [width, height, reduced] of [[390, 844, false], [360, 640, false], [1280, 800, true]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(WEB);
    await page.getByTestId('name-input').fill(`Nhan${width}`);
    await page.getByTestId('create-wordchain').click();
    const code = (await page.getByTestId('room-code').innerText()).trim();
    const join = await call(sender, 'room:join', { code });
    assert.equal(join.ok, true);
    const receiver = state.players.find((p) => p.id !== join.playerId);
    assert.ok(receiver);
    // Danh mục mới phải có thật trong bảng chọc, không chỉ tồn tại trong renderer.
    await page.getByTestId(`avatar-${join.playerId}`).click();
    for (const kind of ['duck', 'ufo', 'disco', 'money']) assert.equal(await page.getByTestId(`skill-${kind}`).count(), 1);
    await page.getByLabel('Đóng', { exact: true }).first().click({ position: { x: 5, y: 5 } });

    const scenes = reduced ? ['ufo'] : width === 390 ? ['duck', 'ufo', 'disco', 'money', 'freeze', 'cake', 'water', 'dog', 'lightning', 'rocket', 'kiss'] : ['duck', 'ufo', 'disco', 'money'];
    for (const kind of scenes) {
      let result;
      for (let retry = 0; retry < 4; retry++) {
        result = await call(sender, 'fun:send', { kind, to: receiver.id });
        if (result.ok) break;
        assert.ok(['limited', 'busy'].includes(result.reason), JSON.stringify(result));
        await sleep((result.retryMs ?? 1500) + 100);
      }
      assert.equal(result.ok, true, `${kind} accepted`);
      const root = page.getByTestId(kind === 'cake' ? 'cake-scene' : `${kind}-fx`);
      if (!['rocket', 'kiss'].includes(kind)) {
        await root.waitFor({ state: 'visible', timeout: 2500 });
        const box = await root.boundingBox();
        assert.ok(box && box.x >= -1 && box.y >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `${kind} within viewport`);
      }
      if (reduced) await page.getByTestId('reduced-motion-fx').waitFor({ timeout: 1000 });
      else {
        const button = { duck: 'duck-tap-0', ufo: 'ufo-rescue', disco: 'disco-dance', money: 'money-tap-0', freeze: 'freeze-crack-0', cake: 'cake-fx' }[kind];
        if (button) {
          // Sprite đang chuyển động: click vào tâm đang thấy, không đợi đứng yên.
          const target = page.getByTestId(button);
          await target.waitFor({ state: 'visible' });
          await target.click({ force: true });
          const response = { duck: /Đã đuổi/, ufo: /Đã cứu/, disco: /Vũ công/, money: /BIÊN LAI/ }[kind];
          if (response) await page.getByText(response).first().waitFor({ timeout: 1000 });
        }
      }
      await page.screenshot({ path: `${SHOTS}/${width}-${kind}${reduced ? '-reduced' : ''}.png` });
      if (!['rocket', 'kiss'].includes(kind)) await root.waitFor({ state: 'detached', timeout: 8500 });
      else await sleep(2000);
      console.log(`OK ${width}x${height}: ${kind}${reduced ? ' reduced motion' : ''}, interaction/cleanup`);
    }
    // Sau các cảnh phủ vẫn mở được chat và nhập liệu bình thường.
    await page.getByTestId('chat-open').click();
    await page.getByTestId('chat-input').fill('Vẫn chơi được nhé!');
    await page.getByTestId('chat-send').click();
    await page.getByText('Vẫn chơi được nhé!', { exact: true }).first().waitFor();
    await call(sender, 'room:leave');
    await context.close();
  }
  assert.deepEqual(errors, [], 'browser runtime errors');
  console.log('Tất cả OK — hiệu ứng, tương tác, cleanup, mobile và reduced motion');
} finally {
  for (const s of sockets) s.disconnect();
  await browser.close();
}
