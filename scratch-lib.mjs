import { readFileSync, writeFileSync } from 'node:fs';
export function edit(p, pairs) {
  const raw = readFileSync(p, 'utf8');
  const crlf = raw.includes('\r');
  let s = raw.split('\r').join('');
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(p + ' missing: ' + a.slice(0, 70));
    s = s.replace(a, () => b);
  }
  writeFileSync(p, crlf ? s.split('\n').join('\r\n') : s);
}
