/**
 * Sinh atlas icon v4 cho "Sàn Diễn Xóm Lầy" (`app/public/thoitrang/icons.webp` + `icons.json`).
 * Dùng Playwright Chromium + renderer Three.js v4 trong `thoitrang-icons.html` (mannequin mờ, đúng khung v4).
 */
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(APP_DIR, 'public', 'thoitrang');
const MAX_WEBP_BYTES = 590 * 1024;

const req = createRequire(import.meta.url);
const { chromium } = req(path.resolve(APP_DIR, '..', 'e2e', 'node_modules', 'playwright-core'));

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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/favicon.ico') {
        res.writeHead(204);
        res.end();
        return;
      }
      const rel = path.normalize(decodeURIComponent(urlPath)).replace(/^[/\\]+/, '');
      const full = path.join(rootDir, rel);
      if (!full.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      try {
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
      resolve({ server, port: addr.port });
    });
  });
}

async function main() {
  const { server, port } = await startStaticServer(APP_DIR);
  const executablePath = resolveChrome();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(`http://127.0.0.1:${port}/scripts/thoitrang-icons.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => Boolean(window.__THOITRANG_ATLAS__ || window.__THOITRANG_ATLAS_ERROR__),
      { timeout: 120_000 },
    );

    const buildErr = await page.evaluate(() => window.__THOITRANG_ATLAS_ERROR__ || null);
    if (buildErr) throw new Error(`Atlas render error: ${buildErr}`);

    const result = await page.evaluate(async (maxBytes) => {
      const data = window.__THOITRANG_ATLAS__;
      const img = new Image();
      img.src = data.pngDataUrl;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = data.meta.width;
      c.height = data.meta.height;
      c.getContext('2d').drawImage(img, 0, 0);

      let chosen = '';
      let chosenQ = 0.84;
      for (const q of [0.84, 0.78, 0.72, 0.65, 0.58]) {
        const url = c.toDataURL('image/webp', q);
        const estBytes = Math.ceil(((url.length - url.indexOf(',') - 1) * 3) / 4);
        chosen = url;
        chosenQ = q;
        if (estBytes <= maxBytes) break;
      }
      return { meta: data.meta, items: data.items, webpDataUrl: chosen, quality: chosenQ };
    }, MAX_WEBP_BYTES);

    const base64 = result.webpDataUrl.slice(result.webpDataUrl.indexOf(',') + 1);
    const webpBuf = Buffer.from(base64, 'base64');
    await fs.mkdir(OUT_DIR, { recursive: true });
    const webpPath = path.join(OUT_DIR, 'icons.webp');
    const jsonPath = path.join(OUT_DIR, 'icons.json');

    await fs.writeFile(webpPath, webpBuf);
    const manifest = {
      image: '/thoitrang/icons.webp',
      width: result.meta.width,
      height: result.meta.height,
      tile: result.meta.tile,
      cols: result.meta.cols,
      rows: result.meta.rows,
      count: result.meta.count,
      items: result.items,
    };
    await fs.writeFile(jsonPath, JSON.stringify(manifest), 'utf8');

    if (errors.length > 0) {
      throw new Error(`Console/page errors during icon build:\n${errors.join('\n')}`);
    }
    const kb = (webpBuf.length / 1024).toFixed(1);
    console.log(`Built ${result.meta.count} v4 icons -> ${webpPath} (${kb} KB, q=${result.quality}, ${result.meta.width}x${result.meta.height})`);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
