// Tạo app/src/typhuIcons.ts (data URI) từ các file SVG Twemoji trong thư mục này: node gen.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.svg')).sort();
let out = `/* Tự sinh bởi app/assets/typhu-icons/gen.mjs. Icon: Twemoji (jdecked/twemoji), CC-BY 4.0, https://github.com/jdecked/twemoji */\n`;
out += 'export const TWEMOJI: Record<string, string> = {\n';
for (const f of files) {
  const b64 = readFileSync(join(dir, f)).toString('base64');
  out += `  '${f.replace('.svg', '')}': 'data:image/svg+xml;base64,${b64}',\n`;
}
out += '};\n';
writeFileSync(join(dir, '../../src/typhuIcons.ts'), out);
console.log(files.length, 'icon');
