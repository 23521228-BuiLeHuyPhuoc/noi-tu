import { chromium } from 'playwright-core';
const [W, H, OUT] = [Number(process.argv[2] ?? 390), Number(process.argv[3] ?? 844), process.argv[4]];
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const mk = async () => { const c = await b.newContext({ viewport: { width: W, height: H }, isMobile: W < 800, hasTouch: true }); const p = await c.newPage(); p.on('pageerror', e => console.log('ERR', e.message)); await p.goto('http://localhost:8398'); return p; };
const a = await mk(), c = await mk();
await a.getByTestId('name-input').fill('An'); await c.getByTestId('name-input').fill('Bình');
await a.getByTestId('create-typhu').click();
const code = (await a.getByTestId('room-code').textContent({ timeout: 15000 })).trim();
await c.getByTestId('code-input').fill(code); await c.getByTestId('join-btn').click();
await c.getByTestId('room-code').waitFor();
await a.getByTestId('start-btn').click();
await a.waitForTimeout(3000);
for (let i = 0; i < 3; i++) {
  await a.screenshot({ path: `${OUT}-view${i}.png` });
  await a.getByTestId('view-mode').click();
  await a.waitForTimeout(700);
}
await a.getByTestId('chat-open').click(); await a.waitForTimeout(500);
const send = a.getByTestId('chat-send');
console.log('chat-send visible', await send.isVisible(), JSON.stringify(await send.boundingBox()));
await a.screenshot({ path: `${OUT}-chat.png` });
await a.mouse.click(5, 5); await a.waitForTimeout(400);
await a.getByTestId('poke-open').click(); await a.waitForTimeout(400);
await a.locator('[data-testid^="poke-pick-"]').first().click(); await a.waitForTimeout(500);
const poke = a.getByTestId('poke-btn');
console.log('poke-btn visible', await poke.isVisible().catch(() => false), JSON.stringify(await poke.boundingBox().catch(() => null)));
await a.screenshot({ path: `${OUT}-throw.png` });
await b.close();
