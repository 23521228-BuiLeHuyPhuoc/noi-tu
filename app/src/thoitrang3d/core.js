// @ts-nocheck
// core.js — shared toon shading, patterns, geometry helpers, palettes & triangle budget counter.
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- 3-step toon gradient (approved v4 look) ----------
export const gradient = (() => {
  const d = new Uint8Array([90, 170, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

// ---------- 15 procedural patterns ----------
const patCache = new Map();
export function patternTex(p, c, c2 = '#ffffff') {
  const key = `${p}|${c}|${c2}`;
  if (patCache.has(key)) return patCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = c;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = c2;
  g.strokeStyle = c2;

  if (p === 'stripe') {
    for (let i = 0; i < 8; i++) g.fillRect(0, i * 16, 128, 7);
  } else if (p === 'pinstripe') {
    for (let i = 0; i < 16; i++) g.fillRect(i * 8, 0, 2, 128);
  } else if (p === 'dots' || p === 'polka') {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.beginPath(); g.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 6, 0, Math.PI * 2); g.fill();
    }
  } else if (p === 'check' || p === 'gingham') {
    g.globalAlpha = 0.52;
    for (let i = 0; i < 4; i++) { g.fillRect(i * 32, 0, 14, 128); g.fillRect(0, i * 32, 128, 14); }
    g.globalAlpha = 1;
  } else if (p === 'tartan') {
    g.globalAlpha = 0.45;
    for (let i = 0; i < 2; i++) { g.fillRect(i * 64, 0, 22, 128); g.fillRect(0, i * 64, 128, 22); }
    g.globalAlpha = 0.85; g.fillStyle = '#1b1622';
    for (let i = 0; i < 2; i++) { g.fillRect(i * 64 + 34, 0, 4, 128); g.fillRect(0, i * 64 + 34, 128, 4); }
    g.fillStyle = c2;
    for (let i = 0; i < 2; i++) { g.fillRect(i * 64 + 46, 0, 3, 128); g.fillRect(0, i * 64 + 46, 128, 3); }
    g.globalAlpha = 1;
  } else if (p === 'houndstooth') {
    const s = 32;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const ox = x * s, oy = y * s;
      g.fillRect(ox, oy, s / 2, s / 2);
      g.beginPath(); g.moveTo(ox + s / 2, oy); g.lineTo(ox + s, oy); g.lineTo(ox + s / 2, oy + s / 2); g.fill();
      g.beginPath(); g.moveTo(ox, oy + s / 2); g.lineTo(ox + s / 2, oy + s / 2); g.lineTo(ox, oy + s); g.fill();
    }
  } else if (p === 'heart' || p === 'hearts') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const cx = 22 + x * 42 + (y % 2) * 21, cy = 22 + y * 42;
      g.beginPath(); g.moveTo(cx, cy + 9);
      g.bezierCurveTo(cx - 14, cy - 2, cx - 6, cy - 12, cx, cy - 4);
      g.bezierCurveTo(cx + 6, cy - 12, cx + 14, cy - 2, cx, cy + 9); g.fill();
    }
  } else if (p === 'flower' || p === 'floral') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const cx = 22 + x * 42 + (y % 2) * 21, cy = 22 + y * 42;
      g.fillStyle = c2;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(cx + Math.cos(k * 1.256) * 6, cy + Math.sin(k * 1.256) * 6, 4.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff4b0'; g.beginPath(); g.arc(cx, cy, 3, 0, Math.PI * 2); g.fill();
    }
  } else if (p === 'stars') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const cx = 21 + x * 42 + (y % 2) * 21, cy = 21 + y * 42;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 4 : 10, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        i ? g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r) : g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    }
  } else if (p === 'leopard') {
    const pts = [[18, 20, 12], [62, 16, 10], [104, 28, 13], [36, 62, 13], [88, 66, 11], [16, 104, 11], [66, 106, 12], [110, 96, 10]];
    for (const [cx, cy, r] of pts) {
      g.fillStyle = c2; g.beginPath(); g.arc(cx, cy, r * 0.65, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2d1c16'; g.lineWidth = 4;
      g.beginPath(); g.arc(cx, cy, r * 0.85, 0.3, Math.PI * 1.65); g.stroke();
    }
  } else if (p === 'zebra') {
    g.lineWidth = 10; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const y = i * 22 + 8;
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(42, y - 10, 86, y + 10, 128, y); g.stroke();
    }
  } else if (p === 'camo') {
    const blobs = [[20, 26, 26, 16, c2], [86, 22, 28, 18, '#2b3826'], [56, 64, 34, 20, c2], [108, 86, 26, 18, '#5a523c'], [24, 102, 30, 18, '#2b3826'], [82, 112, 24, 14, c2]];
    for (const [cx, cy, rx, ry, col] of blobs) {
      g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0.4, 0, Math.PI * 2); g.fill();
    }
  } else if (p === 'ombre') {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, c); gr.addColorStop(0.55, c); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else if (p === 'sequin') {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const cx = 8 + x * 16 + (y % 2) * 8, cy = 8 + y * 16;
      g.fillStyle = (x + y) % 3 === 0 ? c2 : '#ffffff';
      g.globalAlpha = (x + y) % 2 === 0 ? 0.55 : 0.25;
      g.beginPath(); g.arc(cx, cy, 5.5, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
  } else if (p === 'argyle') {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const cx = 32 + x * 64, cy = 32 + y * 64;
      g.fillStyle = c2; g.globalAlpha = 0.72;
      g.beginPath(); g.moveTo(cx, cy - 28); g.lineTo(cx + 24, cy); g.lineTo(cx, cy + 28); g.lineTo(cx - 24, cy); g.closePath(); g.fill();
    }
    g.globalAlpha = 0.85; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 128); g.moveTo(128, 0); g.lineTo(0, 128); g.stroke();
    g.globalAlpha = 1;
  } else if (p === 'chevron') {
    g.lineWidth = 10; g.strokeStyle = c2;
    for (let y = -16; y < 144; y += 26) {
      g.beginPath();
      for (let x = 0; x <= 128; x += 32) {
        const py = y + ((x / 32) % 2 === 0 ? 0 : 14);
        x === 0 ? g.moveTo(x, py) : g.lineTo(x, py);
      }
      g.stroke();
    }
  } else if (p === 'paisley') {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) {
      const cx = 20 + x * 42 + (y % 2) * 18, cy = 22 + y * 42;
      g.fillStyle = c2;
      g.beginPath(); g.arc(cx, cy, 10, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx + 8, cy - 6); g.quadraticCurveTo(cx + 18, cy - 16, cx + 6, cy - 20); g.lineTo(cx, cy - 8); g.fill();
      g.fillStyle = c; g.beginPath(); g.arc(cx - 2, cy + 1, 4, 0, Math.PI * 2); g.fill();
    }
  } else if (p === 'tie_dye') {
    const gr = g.createRadialGradient(64, 64, 4, 64, 64, 72);
    gr.addColorStop(0, '#ffd56b'); gr.addColorStop(0.28, c2); gr.addColorStop(0.58, c); gr.addColorStop(0.82, '#6ec6ff'); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  } else if (p === 'denim') {
    g.globalAlpha = 0.22; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
    for (let i = -128; i < 256; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); }
    g.strokeStyle = c2; g.lineWidth = 2; g.globalAlpha = 0.6;
    for (let y = 16; y < 128; y += 32) { g.setLineDash([6, 4]); g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
    g.setLineDash([]); g.globalAlpha = 1;
  } else if (p === 'lace') {
    g.strokeStyle = c2; g.lineWidth = 2;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const cx = 16 + x * 32 + (y % 2) * 16, cy = 16 + y * 32;
      g.beginPath(); g.arc(cx, cy, 12, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, cy, 4, 0, Math.PI * 2); g.fillStyle = c2; g.fill();
    }
  } else if (p === 'brocade') {
    g.strokeStyle = c2; g.lineWidth = 2.5;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      const cx = 32 + x * 64, cy = 32 + y * 64;
      g.beginPath(); g.arc(cx, cy, 22, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        g.beginPath(); g.arc(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 5, 0, Math.PI * 2); g.stroke();
      }
    }
  } else if (p === 'tho_cam') {
    const rows = ['#c92a46', '#ffd56b', '#1a6b4f', '#2f6fd6', '#15121b', '#ffffff'];
    for (let r = 0; r < 8; r++) {
      g.fillStyle = rows[r % rows.length]; g.fillRect(0, r * 16, 128, 16);
      g.fillStyle = rows[(r + 1) % rows.length];
      for (let x = 0; x < 128; x += 16) {
        g.beginPath(); g.moveTo(x + 8, r * 16 + 2); g.lineTo(x + 14, r * 16 + 8); g.lineTo(x + 8, r * 16 + 14); g.lineTo(x + 2, r * 16 + 8); g.closePath(); g.fill();
      }
    }
  } else if (p === 'dragon_scale') {
    g.strokeStyle = c2; g.lineWidth = 2.5;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) {
      const cx = x * 28 + (y % 2) * 14, cy = y * 22;
      g.beginPath(); g.arc(cx, cy, 14, 0, Math.PI); g.stroke();
    }
  } else if (p === 'cow') {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = c === '#ffffff' ? '#1b1518' : c;
    const spots = [[22, 24, 24, 18], [92, 18, 28, 22], [58, 68, 30, 22], [18, 102, 26, 20], [104, 96, 24, 24]];
    for (const [cx, cy, rx, ry] of spots) { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0.5, 0, Math.PI * 2); g.fill(); }
  } else if (p === 'tiger') {
    g.fillStyle = '#1b1518';
    for (let y = 6; y < 128; y += 22) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(48, y + 6); g.lineTo(128, y - 4); g.lineTo(128, y + 6); g.lineTo(52, y + 14); g.lineTo(0, y + 8); g.closePath(); g.fill();
    }
  } else if (p === 'rainbow') {
    const cols = ['#ff3b6b', '#ff9f43', '#ffd56b', '#4cd964', '#38bdf8', '#8b5cf6'];
    const h = 128 / cols.length;
    cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h, 128, h + 1); });
  } else if (p === 'galaxy') {
    const gr = g.createLinearGradient(0, 0, 128, 128);
    gr.addColorStop(0, '#0f0a2a'); gr.addColorStop(0.45, '#4b2d80'); gr.addColorStop(0.75, '#c92a76'); gr.addColorStop(1, '#12224d');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 36; i++) {
      const sx = (i * 37) % 124 + 2, sy = (i * 53) % 124 + 2;
      g.beginPath(); g.arc(sx, sy, (i % 3) * 0.9 + 0.7, 0, Math.PI * 2); g.fill();
    }
  } else if (p === 'flame') {
    const gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, '#ffe66d'); gr.addColorStop(0.4, '#ff6b2b'); gr.addColorStop(0.75, '#c9182b'); gr.addColorStop(1, c);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#fff08a';
    for (let x = 0; x < 128; x += 32) {
      g.beginPath(); g.moveTo(x, 128); g.quadraticCurveTo(x + 16, 42, x + 32, 128); g.fill();
    }
  } else if (p === 'lightning') {
    g.strokeStyle = c2; g.lineWidth = 4;
    for (let x = 20; x < 128; x += 48) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 14, 46); g.lineTo(x + 6, 52); g.lineTo(x - 12, 128); g.stroke();
    }
  } else if (p === 'cyber_grid') {
    g.strokeStyle = c2; g.lineWidth = 2;
    for (let i = 0; i <= 128; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
    }
  } else if (p === 'chan_con_cong') {
    // Họa tiết Chăn Con Công huyền thoại: nền đỏ rực, lá xanh, hoa mẫu đơn hồng-vàng!
    g.fillStyle = '#c91b2b'; g.fillRect(0, 0, 128, 128);
    const leaves = [[16, 20], [54, 16], [100, 32], [24, 78], [76, 86], [110, 108]];
    g.fillStyle = '#1b8a4b';
    for (const [lx, ly] of leaves) { g.beginPath(); g.ellipse(lx, ly, 16, 7, 0.6, 0, Math.PI * 2); g.fill(); }
    const blooms = [[32, 34, '#ff77aa'], [96, 28, '#ffd54f'], [64, 68, '#ff4d88'], [24, 104, '#ffd54f'], [98, 96, '#5fd3a6']];
    for (const [bx, by, bc] of blooms) {
      g.fillStyle = bc;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        g.beginPath(); g.arc(bx + Math.cos(a) * 10, by + Math.sin(a) * 10, 7, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#fff176'; g.beginPath(); g.arc(bx, by, 5, 0, Math.PI * 2); g.fill();
    }
    // Peacock feather eye
    g.fillStyle = '#1976d2'; g.beginPath(); g.ellipse(64, 22, 9, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4dd0e1'; g.beginPath(); g.arc(64, 20, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#15121b'; g.beginPath(); g.arc(64, 19, 2.5, 0, Math.PI * 2); g.fill();
  }

  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(p === 'ombre' || p === 'tie_dye' || p === 'flame' ? 1 : 3, p === 'ombre' || p === 'tie_dye' || p === 'flame' ? 1 : 3);
  t.colorSpace = THREE.SRGBColorSpace;
  if (patCache.size > 380) {
    const first = patCache.keys().next().value;
    if (first) patCache.delete(first);
  }
  patCache.set(key, t);
  return t;
}

// ---------- Meme / slogan chest graphic decal texture ----------
export function memePrintTex(text, bg = '#ffffff', fg = '#15121b') {
  const key = `meme|${text}|${bg}|${fg}`;
  if (patCache.has(key)) return patCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 160;
  const g = cv.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = fg;
  g.lineWidth = 8;
  g.strokeRect(8, 8, 240, 144);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= 11 || !cur) cur = (cur + ' ' + w).trim();
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  const fontSize = lines.length >= 3 ? 30 : lines.length === 2 ? 38 : 44;
  g.font = `900 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const lineH = fontSize * 1.15;
  const startY = 80 - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => g.fillText(ln, 128, startY + i * lineH, 224));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (patCache.size > 380) {
    const first = patCache.keys().next().value;
    if (first) patCache.delete(first);
  }
  patCache.set(key, t);
  return t;
}

// ---------- 2-tone hair gradient / streak texture ----------
export function hairTex(c, c2, mode = 'tips') {
  const key = `hair|${mode}|${c}|${c2}`;
  if (patCache.has(key)) return patCache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  if (mode === 'streaks') {
    g.fillStyle = c; g.fillRect(0, 0, 128, 128);
    g.fillStyle = c2;
    for (let i = 0; i < 6; i++) g.fillRect(i * 22 + 4, 0, 7, 128);
  } else {
    const gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, c); gr.addColorStop(0.52, c); gr.addColorStop(0.85, c2); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  patCache.set(key, t);
  return t;
}

// ---------- cached toon materials + inverted-hull outline ----------
const matCache = new Map();
export function toon(color, pattern = 'plain', c2 = '#ffffff', opts = {}) {
  const p = (!pattern || pattern === 'solid') ? 'plain' : pattern;
  const ds = opts.doubleSide ? 'D' : '';
  const op = opts.opacity != null && opts.opacity < 1 ? `O${opts.opacity}` : '';
  const em = opts.emissive ? `E${opts.emissive}` : '';
  const key = `${color}|${p}|${c2}|${ds}|${op}|${em}`;
  if (matCache.has(key)) return matCache.get(key);
  const cfg = {
    color: p === 'plain' ? color : '#ffffff',
    gradientMap: gradient,
  };
  if (opts.doubleSide) cfg.side = THREE.DoubleSide;
  if (opts.opacity != null && opts.opacity < 1) { cfg.transparent = true; cfg.opacity = opts.opacity; }
  if (opts.emissive) { cfg.emissive = new THREE.Color(opts.emissive); cfg.emissiveIntensity = opts.emissiveIntensity ?? 0.55; }
  const m = new THREE.MeshToonMaterial(cfg);
  if (p !== 'plain') m.map = patternTex(p, color, c2);
  matCache.set(key, m);
  return m;
}

export function hairMat(c, c2, twoTone = 'none') {
  if (!twoTone || twoTone === 'none' || !c2 || c2.toLowerCase() === c.toLowerCase()) return toon(c);
  const key = `hm|${twoTone}|${c}|${c2}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: gradient, map: hairTex(c, c2, twoTone) });
  matCache.set(key, m);
  return m;
}

export function basicMat(color, opts = {}) {
  const key = `B|${color}|${opts.opacity ?? 1}|${opts.doubleSide ? 1 : 0}`;
  if (matCache.has(key)) return matCache.get(key);
  const cfg = { color };
  if (opts.opacity != null && opts.opacity < 1) { cfg.transparent = true; cfg.opacity = opts.opacity; }
  if (opts.doubleSide) cfg.side = THREE.DoubleSide;
  const m = new THREE.MeshBasicMaterial(cfg);
  matCache.set(key, m);
  return m;
}

export const outlineMat = new THREE.MeshBasicMaterial({ color: 0x3b2a3f, side: THREE.BackSide });
outlineMat.onBeforeCompile = (s) => {
  s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0052;');
};

export function mesh(geo, mat, outline = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.raycast = () => {};
    m.add(o);
  }
  return m;
}

// ---------- lightweight cached / smooth geometry builders ----------
export function lathe(prof, sz = 1, segs = 22, gap = 0, sub = 3) {
  const pts = new THREE.SplineCurve(prof.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y))).getPoints(Math.max(4, prof.length * sub));
  const g = new THREE.LatheGeometry(pts, segs, gap / 2, Math.PI * 2 - gap);
  if (sz !== 1) g.scale(1, 1, sz);
  g.computeVertexNormals();
  return g;
}

export const sph = (rx, ry, rz, w = 16, h = 11) => new THREE.SphereGeometry(1, w, h).scale(rx, ry, rz);
export const cyl = (rt, rb, h, s = 16, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open);
export const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);
export const torus = (r, t, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
export const cap = (r, l, cs = 4, rs = 10) => new THREE.CapsuleGeometry(r, l, cs, rs);

export function countTriangles(root) {
  let tris = 0;
  root.traverse((obj) => {
    if (!obj.visible || !obj.isMesh || !obj.geometry) return;
    const g = obj.geometry;
    tris += g.index ? g.index.count / 3 : (g.attributes.position ? g.attributes.position.count / 3 : 0);
  });
  return Math.round(tris);
}

// ---------- shared palettes ----------
export const SKINS = ['#fce4d4', '#f7cfb6', '#eab08e', '#d69772', '#b3744f', '#845034', '#593523'];
export const EYECOL = ['#4a2d24', '#221d26', '#7a5230', '#3d7d5a', '#2f6fd6', '#56b4d3', '#8a5cc9', '#d14b7a', '#c98b2c', '#828b99'];
export const LIPCOL = ['#e0707a', '#c94c5b', '#9e263c', '#f09aad', '#d97a5d', '#b85b7e', '#752d40', '#c78c7d', '#542633', '#f5b8c2'];
export const SHADOWCOL = ['#f2a6c2', '#b990e8', '#7bb7eb', '#e8b974', '#5c4d66', '#72c9a6', '#d96b6b', '#ffffff'];

export const PALETTE = [
  '#ffffff', '#d9d3cb', '#7c828f', '#2b2533', '#15121b',
  '#ff6b8b', '#ff9ec4', '#ffb3c7', '#c92a46', '#781d32',
  '#c79bff', '#7c5cff', '#4b2d80',
  '#6ec6ff', '#2f6fd6', '#1c3568',
  '#5fd3a6', '#1a6b4f', '#ffd56b', '#ff9f5a', '#c95e2f', '#a6774f', '#f6e7d8',
  '#ff2e93', '#ff5722', '#ffea00', '#76ff03', '#00e5ff', '#18ffff',
  '#e040fb', '#556b2f', '#008080', '#d4af37', '#5a3825', '#c98b2c',
];

export const HAIRCOL = [
  '#1b1518', '#33211b', '#5a3825', '#875331', '#ba7e43', '#e8c47a', '#f5e6c4', '#c9c5c0',
  '#a62936', '#e85f8c', '#ff9ec4', '#a98bff', '#6242b8', '#4285d6', '#52c4bd', '#4f9460',
  '#ff2e93', '#ff6d00', '#ffd600', '#76ff03', '#00e5ff', '#f8fafc', '#7f1d1d', '#1e3a8a',
];

export const PATTERNS = [
  ['plain', 'Trơn'], ['stripe', 'Sọc ngang'], ['pinstripe', 'Sọc dọc'], ['dots', 'Chấm bi'],
  ['check', 'Caro nhỏ'], ['tartan', 'Caro Tartan'], ['houndstooth', 'Răng sói'], ['heart', 'Trái tim'],
  ['flower', 'Hoa nhí'], ['stars', 'Ngôi sao'], ['leopard', 'Da báo'], ['zebra', 'Ngựa vằn'],
  ['camo', 'Rằn ri'], ['ombre', 'Ombre'], ['sequin', 'Kim sa'],
  ['argyle', 'Quả trám'], ['chevron', 'Zíc zắc'], ['paisley', 'Paisley'], ['tie_dye', 'Tie-Dye'],
  ['denim', 'Vải bò'], ['lace', 'Ren lưới'], ['brocade', 'Gấm cung đình'], ['tho_cam', 'Thổ cẩm'],
  ['dragon_scale', 'Vảy rồng'], ['cow', 'Bò sữa'], ['tiger', 'Vằn hổ'], ['rainbow', 'Cầu vồng'],
  ['galaxy', 'Vũ trụ'], ['flame', 'Ngọn lửa'], ['lightning', 'Sấm sét'], ['cyber_grid', 'Lưới Neon'],
  ['chan_con_cong', 'Chăn con công'],
];
