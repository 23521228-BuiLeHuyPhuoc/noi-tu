/**
 * E2E toàn luồng cho "Sàn Diễn Xóm Lầy" (`thoitrang`, thiết kế v4):
 * - Tự chạy `server/dist/server.js` (cổng 3000) + static server cho `app/dist/` (cổng ngẫu nhiên) và dọn sạch khi xong.
 * - Chạy đồng thời Desktop (1280×860) + Mobile (390×844) + 1 Bot.
 * - Kiểm tra 0 console/page error, 0 tràn ngang, tải đủ 245 icon v4, phối đồ (outer/face/body/acc),
 *   11 dáng sàn diễn (không có spin), chấm 4,5★, bật mí Giám khảo Máy, và chụp `ingame-*.png`.
 */
import { spawn } from 'node:child_process';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

function resolveChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    (() => { try { return chromium.executablePath(); } catch { return ''; } })(),
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  return candidates.find((p) => fsSync.existsSync(p));
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const APP_DIST = path.join(ROOT, 'app', 'dist');
const SHOT_DIR = 'E:\\baitap\\_thoitrang-design\\v4';
const API_PORT = Number(process.env.TT_API_PORT || 3000);
const API_URL = `http://127.0.0.1:${API_PORT}`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

function waitForHttp(url, timeoutMs = 20_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else retry();
      });
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) reject(new Error(`Timeout waiting for ${url}`));
      else setTimeout(ping, 250);
    };
    ping();
  });
}

function startStaticWeb(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/favicon.ico') { res.writeHead(204); res.end(); return; }
      const rel = path.normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
      let full = path.join(rootDir, rel || 'index.html');
      if (!full.startsWith(rootDir)) { res.writeHead(403); res.end('Forbidden'); return; }
      try {
        const st = await fs.stat(full).catch(() => null);
        if (!st || st.isDirectory()) full = path.join(rootDir, 'index.html');
        const data = await fs.readFile(full);
        const ext = path.extname(full).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      } catch {
        res.writeHead(404);
        res.end('Not found');
      }
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, url: `http://127.0.0.1:${addr.port}` });
    });
  });
}

async function startGameServer() {
  const entry = path.join(ROOT, 'server', 'dist', 'server.js');
  const proc = spawn(process.execPath, [entry], {
    cwd: path.join(ROOT, 'server'),
    env: { ...process.env, PORT: String(API_PORT), KEEP_ALIVE: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  proc.stdout.on('data', (d) => { logs += d.toString(); });
  proc.stderr.on('data', (d) => { logs += d.toString(); });
  try {
    await waitForHttp(`${API_URL}/health`, 20_000);
  } catch (err) {
    proc.kill();
    throw new Error(`${err.message}\nServer logs:\n${logs}`);
  }
  return proc;
}

async function assertNoOverflow(page, label) {
  const info = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
  if (info.sw > info.iw + 1) {
    throw new Error(`Horizontal overflow on ${label}: scrollWidth=${info.sw} > innerWidth=${info.iw}`);
  }
}

function attachErrorCollectors(page, tag, errors) {
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${tag}] console.error: ${msg.text()}`);
  });
}

async function run() {
  await fs.mkdir(SHOT_DIR, { recursive: true }).catch(() => {});
  const gameProc = await startGameServer();
  const { server: webServer, url: WEB_URL } = await startStaticWeb(APP_DIST);
  const executablePath = resolveChrome();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [];

  try {
    const ctxDesktop = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    const ctxMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const desktop = await ctxDesktop.newPage();
    const mobile = await ctxMobile.newPage();
    attachErrorCollectors(desktop, 'desktop', errors);
    attachErrorCollectors(mobile, 'mobile', errors);

    // 1. Verify v5 icon manifest & webp asset served cleanly
    const iconJsonRes = await desktop.request.get(`${WEB_URL}/thoitrang/icons.json`);
    if (!iconJsonRes.ok()) throw new Error(`icons.json failed: ${iconJsonRes.status()}`);
    const manifest = await iconJsonRes.json();
    if (manifest.count < 500) throw new Error(`Expected >= 500 v5 icons, got ${manifest.count}`);
    const iconWebpRes = await desktop.request.get(`${WEB_URL}/thoitrang/icons.webp`);
    if (!iconWebpRes.ok()) throw new Error(`icons.webp failed: ${iconWebpRes.status()}`);

    // 2. Host creates ThoiTrang room, Mobile joins via invite link, Host adds 1 bot & starts
    await desktop.goto(WEB_URL, { waitUntil: 'networkidle' });
    await desktop.getByTestId('name-input').fill('Lan Xóm Lầy');
    await desktop.getByTestId('create-thoitrang').click();
    await desktop.getByTestId('room-code').waitFor({ state: 'visible', timeout: 15_000 });
    const code = ((await desktop.getByTestId('room-code').textContent()) || '').trim();
    if (!/^[A-Z2-9]{6}$/.test(code)) throw new Error(`Unexpected room code: "${code}"`);

    await mobile.goto(`${WEB_URL}/?room=${code}`, { waitUntil: 'networkidle' });
    await mobile.getByTestId('name-input').fill('Minh Mobile');
    await mobile.getByTestId('join-btn').click();
    await mobile.getByTestId('room-code').waitFor({ state: 'visible', timeout: 15_000 });

    await desktop.getByTestId('bot-add').click();
    await desktop.waitForFunction(() => document.querySelectorAll('[data-testid^="avatar-"]').length >= 3, { timeout: 10_000 });
    await desktop.getByTestId('start-btn').click();

    // 3. Wait past 6s theme_reveal into dressing room on BOTH desktop & mobile
    await desktop.getByTestId('tt-dressing').waitFor({ state: 'visible', timeout: 20_000 });
    await mobile.getByTestId('tt-dressing').waitFor({ state: 'visible', timeout: 20_000 });
    await assertNoOverflow(desktop, 'desktop-dressing-initial');
    await assertNoOverflow(mobile, 'mobile-dressing-initial');

    // 4. Desktop styles across top, bottom, outer, hat, acc (matching v4 hero look!)
    await desktop.getByTestId('tt-tab-hair').click();
    await desktop.getByTestId('tt-item-hair-high_ponytail').click();
    await desktop.getByTestId('tt-tab-top').click();
    await desktop.getByTestId('tt-item-top-puff_blouse').click();
    await desktop.getByTestId('tt-tab-bottom').click();
    await desktop.getByTestId('tt-item-bottom-pleated_skirt').click();
    await desktop.getByTestId('tt-pat-check').click();
    await desktop.getByTestId('tt-tab-shoes').click();
    await desktop.getByTestId('tt-item-shoes-mary_jane').click();
    await desktop.getByTestId('tt-tab-hat').click();
    await desktop.getByTestId('tt-item-hat-beret').click();
    await desktop.getByTestId('tt-tab-acc').click();
    await desktop.getByTestId('tt-item-acc-handbag').click();
    await desktop.getByTestId('tt-tab-outer').click();
    await desktop.getByTestId('tt-item-outer-cardigan').click();
    await desktop.getByTestId('tt-tab-top').click();

    // Mobile dresses up with dress + hat + returns to top tab
    await mobile.getByTestId('tt-tab-dress').click();
    await mobile.getByTestId('tt-item-dress-ballgown').click();
    await mobile.getByTestId('tt-tab-top').click();
    await desktop.waitForTimeout(1500); // allow live room portraits to render

    await assertNoOverflow(desktop, 'desktop-dressing-styled');
    await assertNoOverflow(mobile, 'mobile-dressing-styled');
    await desktop.screenshot({ path: path.join(SHOT_DIR, 'ingame-desktop-dressing.png') });
    await mobile.screenshot({ path: path.join(SHOT_DIR, 'ingame-mobile-dressing.png') });

    // Capture desktop Face tab + expression change
    await desktop.getByTestId('tt-tab-face').click();
    await desktop.getByTestId('tt-face-expr-wink').click();
    await desktop.waitForTimeout(450);
    await desktop.screenshot({ path: path.join(SHOT_DIR, 'ingame-desktop-face.png') });

    // Verify theme-match filter & badge are COMPLETELY REMOVED, and neutral search + type filters work!
    await desktop.getByTestId('tt-tab-top').click();
    if (await desktop.locator('[data-testid="tt-filter-match"]').count()) {
      throw new Error('Forbidden theme-match filter (tt-filter-match) is still present!');
    }
    await desktop.getByTestId('tt-sub-nam').click();
    await desktop.waitForTimeout(150);
    await desktop.getByTestId('tt-sub-lay').click();
    await desktop.waitForTimeout(150);
    await desktop.getByTestId('tt-sub-all').click();

    // Test accent-insensitive Vietnamese search & equip a new Xóm Lầy 3D item
    await desktop.getByTestId('tt-tab-shoes').click();
    await desktop.getByTestId('tt-search').fill('dep to ong');
    await desktop.getByTestId('tt-item-shoes-dep_to_ong').waitFor({ state: 'visible', timeout: 5_000 });
    await desktop.getByTestId('tt-item-shoes-dep_to_ong').click();
    await desktop.getByTestId('tt-search').fill('');

    await desktop.getByTestId('tt-tab-hat').click();
    await desktop.getByTestId('tt-search').fill('noi com');
    await desktop.getByTestId('tt-item-hat-rice_cooker_hat').waitFor({ state: 'visible', timeout: 5_000 });
    await desktop.getByTestId('tt-item-hat-rice_cooker_hat').click();
    await desktop.getByTestId('tt-search').fill('');

    // 5. Both humans click Xong! -> 5s shorten -> Runway
    await desktop.getByTestId('tt-ready-btn').click();
    await mobile.getByTestId('tt-ready-btn').click();
    await desktop.getByTestId('tt-runway').waitFor({ state: 'visible', timeout: 25_000 });
    await mobile.getByTestId('tt-runway').waitFor({ state: 'visible', timeout: 25_000 });
    await assertNoOverflow(desktop, 'desktop-runway');
    await assertNoOverflow(mobile, 'mobile-runway');

    // Verify runway live countdown is visible and > 0s!
    await desktop.getByTestId('tt-runway-countdown').waitFor({ state: 'visible', timeout: 5_000 });
    const cdTxt = ((await desktop.getByTestId('tt-runway-countdown').textContent()) || '').trim();
    const cdMatch = cdTxt.match(/(\d+)\s*s/);
    if (!cdMatch || Number(cdMatch[1]) <= 0) {
      throw new Error(`Expected live positive runway countdown, got: "${cdTxt}"`);
    }

    // 6. Walk through all runway turns: pose (no spin!), rate 4.5★ & cheer
    let shotRunwayDesktop = false;
    let shotRunwayPoses = false;
    let shotRunwayMobile = false;
    let posedOnce = false;
    let ratedOnce = false;
    const deadline = Date.now() + 110_000;
    while (Date.now() < deadline) {
      if (await desktop.getByTestId('tt-reveal').isVisible().catch(() => false)) break;

      for (const [tag, pg] of [['desktop', desktop], ['mobile', mobile]]) {
        if (await pg.getByTestId('tt-pose-blow_kiss').isVisible().catch(() => false)) {
          if (await pg.locator('[data-testid="tt-pose-spin"]').count()) {
            throw new Error('Forbidden spin pose rendered!');
          }
          await pg.getByTestId('tt-pose-blow_kiss').click({ timeout: 2500 }).then(() => { posedOnce = true; }).catch(() => {});
          if (tag === 'desktop' && !shotRunwayPoses) {
            await pg.waitForTimeout(450);
            await pg.screenshot({ path: path.join(SHOT_DIR, 'ingame-desktop-runway-poses.png') });
            shotRunwayPoses = true;
          }
        }
        if (await pg.getByTestId('tt-rate-9').isVisible().catch(() => false)) {
          const curTxt = (await pg.getByTestId('tt-my-rating').textContent({ timeout: 1500 }).catch(() => '')) || '';
          if (!curTxt.includes('4,5')) {
            await pg.getByTestId('tt-rate-9').click({ timeout: 2500 }).then(() => { ratedOnce = true; }).catch(() => {});
            await pg.getByTestId('tt-cheer-0').click({ timeout: 1500 }).catch(() => {});
          } else {
            ratedOnce = true;
          }
          if (tag === 'desktop' && !shotRunwayDesktop) {
            await pg.waitForTimeout(1800);
            await pg.screenshot({ path: path.join(SHOT_DIR, 'ingame-desktop-runway.png') });
            shotRunwayDesktop = true;
          }
          if (tag === 'mobile' && !shotRunwayMobile) {
            await pg.waitForTimeout(500);
            await pg.screenshot({ path: path.join(SHOT_DIR, 'ingame-mobile-runway.png') });
            shotRunwayMobile = true;
          }
        }
      }
      await desktop.waitForTimeout(500);
    }
    if (!posedOnce) throw new Error('Expected walker to trigger at least one runway pose');
    if (!ratedOnce) throw new Error('Expected audience to submit 4,5★ half-star rating');

    // 7. Reveal screen: machine judge visible, skip to ResultScreen
    await desktop.getByTestId('tt-reveal').waitFor({ state: 'visible', timeout: 20_000 });
    await assertNoOverflow(desktop, 'desktop-reveal');
    await assertNoOverflow(mobile, 'mobile-reveal');
    const machineCount = await desktop.locator('[data-testid^="tt-machine-judge-"]').count();
    if (machineCount < 3) throw new Error(`Expected >= 3 machine judge rows, got ${machineCount}`);

    await desktop.getByTestId('tt-skip-reveal').click();
    await desktop.getByText(/Chơi lại|Về sảnh|Quán quân|đăng quang/i).first().waitFor({ state: 'visible', timeout: 15_000 });

    if (errors.length > 0) {
      throw new Error(`Console/page errors detected:\n${errors.join('\n')}`);
    }
    console.log('E2E PASS: desktop (1280x860) + mobile (390x844), 0 console/page errors, 0 overflow, screenshots saved.');
  } finally {
    await browser.close();
    webServer.close();
    gameProc.kill();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
