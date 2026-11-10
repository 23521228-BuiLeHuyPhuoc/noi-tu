// Run against the current app/server: E2E_WEB=http://localhost:8081 node e2e/v2.mjs
// TURN_SECONDS=20 gives enough time for the word and board assertions.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const web = process.env.E2E_WEB ?? 'http://localhost:8081';
const executablePath = process.env.E2E_BROWSER ?? [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].find(existsSync);
assert.ok(executablePath, 'Set E2E_BROWSER to a Chromium executable');
const definitions = JSON.parse(readFileSync(new URL('../server/data/definitions.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const pageErrors = [];
let failed = 0;

async function player(name) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`));
  page.setDefaultTimeout(10000);
  await page.goto(web, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByTestId('name-input').fill(name);
  return { page, context, t: (id) => page.getByTestId(id) };
}

async function room(game, test) {
  const a = await player('E2E An');
  const b = await player('E2E Binh');
  try {
    await a.t(`create-${game}`).click();
    const code = (await a.t('room-code').textContent()).trim();
    await b.t('code-input').fill(code);
    await b.t('join-btn').click();
    await b.t('room-code').waitFor();
    await a.page.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length === 2);
    await test(a, b, code);
  } finally {
    await Promise.all([a.context.close(), b.context.close()]);
  }
}

async function suite(name, run) {
  try { await run(); console.log(`PASS ${name}`); }
  catch (error) { failed++; console.error(`FAIL ${name}\n${error.stack}`); }
}

async function definitionMatches(p) {
  const word = (await p.t('current-word').textContent()).trim();
  const expected = definitions[word];
  const text = (await p.t('current-definition').textContent()).trim();
  if (expected?.text) {
    assert.ok(text.includes(expected.text.trim().slice(0, 400)), `Definition belongs to ${word}`);
    assert.ok(text.includes(`Nguồn: ${expected.source.trim()}`), 'Definition credits its source');
  } else assert.equal(text, 'Chưa có giải nghĩa');
  return { word, text };
}

try {
  await suite('Word current/history definitions', () => room('wordchain', async (a, b) => {
    await a.t('start-btn').click();
    await a.t('current-word').waitFor();
    const initial = await definitionMatches(a);
    assert.equal((await b.t('current-definition').textContent()).trim(), initial.text);
    assert.equal((await a.t('history-definition').first().textContent()).trim(), initial.text);
    const active = (await a.t('turn-label').textContent()).includes('Tới lượt bạn') ? a : b;
    await active.t('hint-btn').click();
    await active.t('hint-word').click();
    const suffix = await active.t('word-input').inputValue();
    const next = `${initial.word.split(/\s+/).at(-1)} ${suffix}`;
    await active.t('submit-btn').click();
    await a.page.waitForFunction((word) => document.querySelector('[data-testid="current-word"]')?.textContent.trim() === word, next);
    const accepted = await definitionMatches(a);
    assert.equal(accepted.word, next);
    const history = await a.t('history-definition').allTextContents();
    assert.ok(history.includes(initial.text), 'Earlier word keeps its definition');
    assert.ok(history.includes(accepted.text), 'Accepted word carries definition into history');
    assert.ok(history.length >= 2);
  }));

  await suite('Nine Quynh Aka stickers and rejoin history', () => room('wordchain', async (a, b, code) => {
    await a.t('chat-open').click();
    await a.t('chat-input').fill('E2E persistent message');
    await a.t('chat-send').click();
    await a.t('sticker-toggle').click();
    assert.equal(await a.page.locator('[data-testid^="sticker-quynh-"]').count(), 9);
    const labels = [];
    for (let i = 1; i <= 9; i++) {
      // Token bucket: burst 5 (the text above + 4 stickers), then refills 1 token per 1.5 seconds.
      if (i >= 5) await a.page.waitForTimeout(1550);
      const id = `sticker-quynh-${String(i).padStart(2, '0')}`;
      const option = a.t(id);
      labels.push((await option.getAttribute('aria-label')).replace('Gửi nhãn dán ', ''));
      await option.click();
      await option.waitFor({ state: 'detached' });
      if (i < 9) await a.t('sticker-toggle').click();
    }
    await b.t('chat-open').click();
    await b.t('chat-list').getByText('E2E persistent message', { exact: true }).waitFor();
    for (const label of labels) await b.t('chat-list').getByRole('img', { name: label, exact: true }).waitFor();
    const c = await player('E2E Late');
    try {
      await c.t('code-input').fill(code);
      await c.t('join-btn').click();
      await c.t('room-code').waitFor();
      await c.t('chat-open').click();
      await c.t('chat-list').getByText('E2E persistent message', { exact: true }).waitFor();
      for (const label of labels) await c.t('chat-list').getByRole('img', { name: label, exact: true }).waitFor();
    } finally { await c.context.close(); }
  }));

  await suite('Bau Cua covered bowl opens on table', () => room('baucua', async (a, b) => {
    await a.t('start-btn').click();
    await b.t('bc-bowl-stage').waitFor();
    assert.equal(await b.t('bc-bowl-stage').getAttribute('aria-label'), 'Bát úp kín ba xúc xắc');
    assert.equal(await b.t('bc-die').count(), 0, 'Covered bowl exposes no result faces');
    await b.t('chip-50').click();
    await b.t('sym-cua').click();
    await b.t('mybet-cua').waitFor();
    await b.t('bc-step').filter({ hasText: 'Máy đang lắc bát' }).waitFor({ timeout: 35000 });
    assert.equal(await b.t('bc-die').count(), 0, 'Shaking still hides result faces');
    await b.page.waitForFunction(() => document.querySelector('[data-testid="bc-bowl-stage"]')?.getAttribute('aria-label') === 'Bát đã mở, ba xúc xắc trên đĩa');
    assert.equal(await b.t('bc-bowl-stage').getByTestId('bc-die').count(), 3);
    assert.equal(await b.t('bc-reveal').count(), 0, 'No fullscreen reveal overlay');
    await b.t('bc-delta').waitFor();
    for (const die of await b.t('bc-die').all()) assert.ok(await die.getAttribute('aria-label'));
  }));

  await suite('Ty Phu 40 cells, dice and movement lock', () => room('typhu', async (a, b) => {
    await a.t('start-btn').click();
    await a.t('cell-39').waitFor();
    assert.equal(await a.page.locator('[data-testid^="cell-"]').count(), 40);
    assert.equal(await a.page.locator('[data-testid^="token-"]').count(), 2);
    const active = await a.t('roll-btn').count() ? a : b;
    const other = active === a ? b : a;
    assert.equal(await other.t('roll-btn').count(), 0);
    // Observe phases in the DOM before clicking, so short animation phases are not missed by polling.
    await active.page.evaluate(() => {
      window.__v2Phases = [];
      window.__v2Locks = [];
      window.__v2Observer = new MutationObserver(() => {
        const phase = document.querySelector('[data-testid^="dice-phase-"]')?.getAttribute('data-testid');
        if (phase && window.__v2Phases.at(-1) !== phase) window.__v2Phases.push(phase);
        const status = document.querySelector('[data-testid="typhu-status"]')?.textContent ?? '';
        if (/đang đổ|đang di chuyển/.test(status)) window.__v2Locks.push(!document.querySelector('[data-testid="roll-btn"], [data-testid="buy-btn"], [data-testid="skip-btn"], [data-testid="end-turn"]'));
      });
      window.__v2Observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    });
    await active.t('roll-btn').click();
    await active.page.waitForFunction(() => (window.__v2Phases ?? []).includes('dice-phase-roll'));
    await active.page.waitForFunction(() => !/đang đổ|đang di chuyển/.test(document.querySelector('[data-testid="typhu-status"]')?.textContent ?? ''), null, { timeout: 10000 });
    const observed = await active.page.evaluate(() => { window.__v2Observer.disconnect(); return { phases: window.__v2Phases, locks: window.__v2Locks }; });
    for (const phase of ['roll', 'bounce', 'reveal']) assert.ok(observed.phases.includes(`dice-phase-${phase}`), phase);
    assert.ok(observed.locks.length > 0 && observed.locks.every(Boolean), 'All actions stay locked during movement');
    for (const id of ['die-1', 'die-2']) assert.match(await active.t(id).getAttribute('aria-label'), /^Xúc xắc ra [1-6]$/);
    assert.equal(await other.t('buy-btn').count(), 0);
    const buy = active.t('buy-btn');
    if (await buy.count()) await buy.click();
    if (await active.t('end-turn').count()) await active.t('end-turn').click();
    assert.equal(await a.page.locator('[data-testid^="cell-"]').count(), 40);
  }));
  assert.deepEqual(pageErrors, [], 'No browser runtime errors');
} catch (error) { failed++; console.error(error); }
finally { await browser.close(); }
process.exitCode = failed ? 1 : 0;
