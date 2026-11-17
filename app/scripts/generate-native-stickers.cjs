// Rasterize the web SVGs with Chromium, including their text and color emoji.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { chromium } = require('../../e2e/node_modules/playwright-core');

async function main() {
  const root = path.resolve(__dirname, '..');
  let source = fs.readFileSync(path.join(root, 'src/stickers.ts'), 'utf8');
  source = source.slice(source.indexOf('const CHU_LAY_DEFS:'));
  source = source.slice(0, source.indexOf('const NATIVE_CHU_LAY')) +
    '\nexports.stickers = CHU_LAY_DEFS.map(d => ({ id: d.id, uri: chuLaySvg(d) }));';
  const scope = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, scope);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 160, height: 120 }, deviceScaleFactor: 3 });
    for (const item of scope.exports.stickers) {
      const svg = decodeURIComponent(item.uri.slice(item.uri.indexOf(',') + 1));
      await page.setContent(`<style>html,body{margin:0;background:transparent}</style>${svg}`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(root, `assets/stickers/${item.id}.png`), omitBackground: true });
    }
    console.log(`Generated ${scope.exports.stickers.length} native sticker PNGs.`);
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
