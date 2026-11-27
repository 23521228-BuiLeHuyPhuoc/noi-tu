// @ts-nocheck
// face.js — 10 eye shapes, 8 brows, 10 mouths, 5 noses, makeup, 6 beards, 14 expressions.
// Every feature projects analytically onto the body's head surface so zero clipping or floating occurs!
import * as THREE from 'three';
import { basicMat, toon, mesh, sph } from './core.js';
import { headFrontZ } from './body.js';

export const FACE_OPTS = {
  eyes: [
    ['round', 'Mắt tròn'], ['almond', 'Hạnh nhân'], ['cat', 'Mắt mèo'], ['smiling', 'Mắt cười'],
    ['sleepy', 'Buồn ngủ'], ['sparkle', 'Lấp lánh'], ['cool', 'Nheo ngầu'], ['doe', 'To long lanh'],
    ['upturned', 'Mắt xếch'], ['gentle', 'Dịu dàng'],
  ],
  brows: [
    ['arched', 'Mày cong'], ['straight', 'Mày ngang'], ['thick', 'Mày rậm'], ['thin', 'Mày mảnh'],
    ['sharp', 'Mày sắc'], ['soft', 'Mày tròn'], ['short', 'Mày ngắn'], ['slit', 'Mày xẻ'],
  ],
  mouths: [
    ['smile', 'Cười nhẹ'], ['big_smile', 'Cười tươi'], ['cat_mouth', 'Miệng mèo :3'], ['pout', 'Chu môi'],
    ['plump', 'Môi đầy'], ['smirk', 'Nhếch mép'], ['neutral', 'Lạnh lùng'], ['open_happy', 'Cười hở miệng'],
    ['tiny_o', 'Môi chữ O'], ['heart_lip', 'Môi tim'],
  ],
  noses: [
    ['button', 'Mũi nút'], ['slim', 'Mũi thẳng'], ['cute_dot', 'Chấm nhỏ'], ['sharp', 'Mũi cao'], ['none', 'Tối giản'],
  ],
  blush: [
    ['soft', 'Má hồng'], ['none', 'Không má'], ['drunk', 'Má say'], ['peach', 'Cam đào'],
    ['anime', 'Gạch ///'], ['heart', 'Dán tim'],
  ],
  eyeliner: [['none', 'Không'], ['classic', 'Cơ bản'], ['wing', 'Kẻ cánh'], ['bold', 'Đậm cá tính']],
  eyeshadow: [['none', 'Không'], ['soft', 'Nhẹ'], ['smoky', 'Mắt khói'], ['glitter', 'Nhũ sáng']],
  beautyMark: [['none', 'Không'], ['under_eye', 'Dưới mắt'], ['cheek', 'Gò má'], ['lip', 'Khóe môi']],
  beard: [
    ['none', 'Không râu'], ['stubble', 'Râu lún phún'], ['moustache', 'Ria mép'],
    ['goatee', 'Râu dê'], ['full_beard', 'Quai nón'], ['handlebar', 'Ria vểnh'],
  ],
};

export const EXPRESSIONS = [
  ['neutral', 'Bình thường'], ['happy', 'Vui vẻ'], ['grin', 'Cười toe'], ['wink', 'Nháy mắt'],
  ['surprised', 'Ngạc nhiên'], ['angry', 'Giận dữ'], ['sad', 'Buồn bã'], ['cry', 'Khóc òa'],
  ['blep', 'Lè lưỡi'], ['kiss', 'Hôn gió'], ['cool', 'Ngầu lòi'], ['shy', 'Ngượng đỏ mặt'],
  ['dizzy', 'Choáng @_@'], ['confident', 'Tự tin'],
];

// Project flat 2D face geometry cleanly onto the front surface of the head
function proj(geo, T, layer = 0.003) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    p.setZ(i, headFrontZ(T, x, y) + layer + z);
  }
  geo.computeVertexNormals();
  return geo;
}

function ovalGeo(cx, cy, rx, ry, rot = 0, segs = 16) {
  const sh = new THREE.Shape();
  sh.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);
  const g = new THREE.ShapeGeometry(sh, segs);
  if (rot) g.rotateZ(rot);
  g.translate(cx, cy, 0);
  return g;
}

// Smooth thick curved stroke in 2D face plane (quad ribbon)
function ribbonGeo(pts, w0, w1 = w0) {
  const pos = [], idx = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const [nx, ny] = pts[Math.min(n - 1, i + 1)];
    let dx = nx - px, dy = ny - py;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const w = w0 + (w1 - w0) * (i / Math.max(1, n - 1));
    pos.push(x - dy * w, y + dx * w, 0, x + dy * w, y - dx * w, 0);
    if (i < n - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

function arcPts(cx, cy, rx, ry, a0, a1, steps = 10) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

function addFlat(parent, geo, T, layer, mat) {
  const m = new THREE.Mesh(proj(geo, T, layer), mat);
  parent.add(m);
  return m;
}

function heart2D(cx, cy, sc) {
  const sh = new THREE.Shape();
  sh.moveTo(0, -sc);
  sh.bezierCurveTo(-sc * 1.4, -sc * 0.1, -sc * 0.8, sc * 0.9, 0, sc * 0.3);
  sh.bezierCurveTo(sc * 0.8, sc * 0.9, sc * 1.4, -sc * 0.1, 0, -sc);
  return new THREE.ShapeGeometry(sh, 10).translate(cx, cy, 0);
}

function star2D(cx, cy, r) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const rad = i % 2 ? r * 0.36 : r, a = (i / 8) * Math.PI * 2;
    i ? sh.lineTo(Math.cos(a) * rad, Math.sin(a) * rad) : sh.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
  }
  sh.closePath();
  return new THREE.ShapeGeometry(sh, 1).translate(cx, cy, 0);
}

export function buildFace(doll, cfg = {}, exprOverride = null) {
  const f = doll.face;
  f.clear();
  if (doll.ghost) return;

  const T = doll.T;
  const scX = T.headRx / 0.172;
  const scY = T.headRy / 0.168;
  const expr = exprOverride || cfg.expression || 'neutral';

  const eyeShape = cfg.eyes || (T.gender === 'm' ? 'almond' : 'round');
  const browShape = cfg.brows || T.defBrows || 'arched';
  const mouthShape = cfg.mouth || 'smile';
  const noseShape = cfg.nose || (T.gender === 'm' ? 'sharp' : 'button');
  const blushStyle = cfg.blush ?? (T.gender === 'm' ? 'none' : 'soft');
  const eyeliner = cfg.eyeliner || (T.defLashes ? 'classic' : 'none');
  const eyeshadow = cfg.eyeshadow || 'none';
  const shadowColor = cfg.eyeshadowColor || '#f2a6c2';
  const beautyMark = cfg.beautyMark || 'none';
  const beard = cfg.beard || 'none';
  const freckles = !!cfg.freckles;

  const eyeCol = cfg.eyeColor || '#4a2d24';
  const lipCol = cfg.lipColor || '#e0707a';
  const hairCol = cfg.hairColor || '#33211b';
  const ink = basicMat('#241826', { doubleSide: true });
  const irisM = basicMat(eyeCol, { doubleSide: true });
  const whiteM = basicMat('#ffffff', { doubleSide: true });
  const lipM = basicMat(lipCol, { doubleSide: true });
  const browM = basicMat(hairCol, { doubleSide: true });
  const skinM = basicMat(doll.skin, { doubleSide: true });

  const ex = 0.058 * scX;
  const ey = -0.004 * scY;

  // ---------- 1. Eyeshadow ----------
  if (eyeshadow !== 'none' && !['cry', 'dizzy', 'grin'].includes(expr)) {
    const op = eyeshadow === 'smoky' ? 0.55 : (eyeshadow === 'glitter' ? 0.48 : 0.34);
    const shM = basicMat(shadowColor, { opacity: op, doubleSide: true });
    for (const s of [1, -1]) {
      const rx = (eyeshadow === 'smoky' ? 0.036 : 0.030) * scX;
      const ry = (eyeshadow === 'smoky' ? 0.022 : 0.015) * scY;
      addFlat(f, ovalGeo(s * (ex + 0.003 * scX), ey + 0.022 * scY, rx, ry, -s * 0.12, 14), T, 0.0014, shM);
      if (eyeshadow === 'glitter') {
        addFlat(f, star2D(s * (ex + 0.016 * scX), ey + 0.027 * scY, 0.0065), T, 0.0020, whiteM);
      }
    }
  }

  // ---------- 2. Blush + Freckles + Beauty Mark ----------
  const effBlush = expr === 'shy' ? 'anime' : (expr === 'angry' ? 'none' : blushStyle);
  if (effBlush && effBlush !== 'none') {
    const bCol = effBlush === 'peach' ? '#ff9e7d' : (effBlush === 'drunk' ? '#ff6f91' : '#ff8fa8');
    const bOp = expr === 'shy' ? 0.65 : (effBlush === 'drunk' ? 0.52 : 0.42);
    const bM = basicMat(bCol, { opacity: bOp, doubleSide: true });
    for (const s of [1, -1]) {
      addFlat(f, ovalGeo(s * 0.088 * scX, -0.048 * scY, 0.027 * scX, 0.014 * scY, 0, 14), T, 0.0018, bM);
      if (effBlush === 'anime') {
        const lm = basicMat('#ff5c8a', { opacity: 0.78, doubleSide: true });
        for (let k = -1; k <= 1; k++) {
          const bx = s * 0.086 * scX + k * 0.010 * scX;
          addFlat(f, ribbonGeo([[bx - 0.003, -0.056 * scY], [bx + 0.004, -0.040 * scY]], 0.0018), T, 0.0024, lm);
        }
      } else if (effBlush === 'heart') {
        addFlat(f, heart2D(s * 0.092 * scX, -0.048 * scY, 0.0085), T, 0.0025, basicMat('#ff5c8a', { doubleSide: true }));
      }
    }
    if (effBlush === 'drunk') {
      addFlat(f, ovalGeo(0, -0.042 * scY, 0.042 * scX, 0.012 * scY, 0, 14), T, 0.0018, bM);
    }
  }
  if (freckles) {
    const fm = basicMat('#9e6045', { opacity: 0.65, doubleSide: true });
    const fPts = [[-0.085, -0.045], [-0.072, -0.052], [-0.062, -0.042], [-0.022, -0.038], [0.022, -0.038], [0.062, -0.042], [0.072, -0.052], [0.085, -0.045]];
    for (const [fx, fy] of fPts) addFlat(f, ovalGeo(fx * scX, fy * scY, 0.0024, 0.0024, 0, 6), T, 0.0022, fm);
  }
  if (beautyMark !== 'none') {
    const pos = beautyMark === 'under_eye' ? [0.066, -0.036] : (beautyMark === 'lip' ? [0.028, -0.080] : [-0.082, -0.042]);
    addFlat(f, ovalGeo(pos[0] * scX, pos[1] * scY, 0.0030, 0.0030, 0, 8), T, 0.0026, ink);
  }

  // ---------- 3. Eyes (10 shapes + 14 expression overrides) ----------
  for (const s of [1, -1]) {
    const cx = s * ex;
    const isRight = s > 0;
    // Expression special eye overrides
    if (expr === 'grin' || (expr === 'kiss' && !isRight) || (expr === 'wink' && isRight) || (expr === 'blep' && isRight)) {
      const pts = (expr === 'wink' || expr === 'blep')
        ? [[cx - s * 0.022, ey + 0.012], [cx + s * 0.012, ey], [cx - s * 0.022, ey - 0.012]]
        : arcPts(cx, ey - 0.006, 0.024 * scX, 0.020 * scY, 0.15, Math.PI - 0.15, 8);
      addFlat(f, ribbonGeo(pts, 0.0046), T, 0.0048, ink);
      continue;
    }
    if (expr === 'kiss' && isRight) {
      addFlat(f, ribbonGeo(arcPts(cx, ey - 0.005, 0.022 * scX, 0.018 * scY, 0.15, Math.PI - 0.15, 8), 0.0044), T, 0.0048, ink);
      continue;
    }
    if (expr === 'cry') {
      const pts = [[cx - s * 0.020, ey + 0.014], [cx + s * 0.014, ey], [cx - s * 0.020, ey - 0.014]];
      addFlat(f, ribbonGeo(pts, 0.0048), T, 0.0048, ink);
      // Twin bright blue teardrop streams!
      const tearM = basicMat('#69c8ff', { opacity: 0.88, doubleSide: true });
      addFlat(f, ribbonGeo([[cx, ey - 0.015], [cx + s * 0.005, ey - 0.068]], 0.007, 0.011), T, 0.0038, tearM);
      addFlat(f, ovalGeo(cx + s * 0.006, ey - 0.075, 0.009, 0.011, 0, 8), T, 0.0040, tearM);
      continue;
    }
    if (expr === 'dizzy') {
      // Spiral @_@ eyes!
      const pts = [];
      for (let i = 0; i <= 22; i++) {
        const a = i * 0.52, r = (0.004 + i * 0.0011) * scX;
        pts.push([cx + Math.cos(a * s) * r, ey + Math.sin(a * s) * r]);
      }
      addFlat(f, ribbonGeo(pts, 0.0030), T, 0.0048, ink);
      continue;
    }
    if (expr === 'surprised') {
      addFlat(f, ovalGeo(cx, ey, 0.028 * scX, 0.036 * scY, 0, 16), T, 0.0032, whiteM);
      addFlat(f, ribbonGeo(arcPts(cx, ey, 0.029 * scX, 0.037 * scY, 0, Math.PI * 2, 16), 0.0028), T, 0.0042, ink);
      addFlat(f, ovalGeo(cx, ey, 0.012 * scX, 0.014 * scY, 0, 12), T, 0.0040, irisM);
      addFlat(f, ovalGeo(cx + 0.004, ey + 0.006, 0.0045, 0.0045, 0, 8), T, 0.0048, whiteM);
      continue;
    }
    if (eyeShape === 'smiling' && expr === 'neutral') {
      addFlat(f, ribbonGeo(arcPts(cx, ey - 0.006, 0.024 * scX, 0.019 * scY, 0.15, Math.PI - 0.15, 8), 0.0046), T, 0.0048, ink);
      continue;
    }

    // Standard sculpted toon eyes (10 distinctive shapes)
    const spec = {
      round:    { rx: 0.024, ry: 0.033, tilt: 0,     lid: 0,    low: 0,    glint: 2 },
      almond:   { rx: 0.026, ry: 0.027, tilt: -0.10, lid: 0.08, low: 0,    glint: 2 },
      cat:      { rx: 0.028, ry: 0.025, tilt: 0.24,  lid: 0.14, low: 0,    glint: 2, wing: true },
      smiling:  { rx: 0.024, ry: 0.028, tilt: 0,     lid: 0,    low: 0.35, glint: 2 },
      sleepy:   { rx: 0.025, ry: 0.027, tilt: -0.16, lid: 0.42, low: 0,    glint: 1 },
      sparkle:  { rx: 0.027, ry: 0.036, tilt: 0,     lid: 0,    low: 0,    glint: 3 },
      cool:     { rx: 0.027, ry: 0.021, tilt: 0.12,  lid: 0.38, low: 0.12, glint: 1 },
      doe:      { rx: 0.029, ry: 0.040, tilt: -0.05, lid: 0,    low: 0,    glint: 3 },
      upturned: { rx: 0.027, ry: 0.027, tilt: 0.28,  lid: 0.10, low: 0,    glint: 2 },
      gentle:   { rx: 0.025, ry: 0.031, tilt: -0.22, lid: 0.06, low: 0,    glint: 2 },
    }[eyeShape] || { rx: 0.024, ry: 0.033, tilt: 0, lid: 0, low: 0, glint: 2 };

    let rx = spec.rx * scX, ry = spec.ry * scY;
    let tilt = s * spec.tilt;
    let lid = spec.lid;
    let lookX = 0, lookY = 0;

    if (expr === 'angry') { lid = Math.max(lid, 0.34); tilt = s * 0.24; }
    else if (expr === 'cool') { lid = Math.max(lid, 0.44); }
    else if (expr === 'confident') { lid = Math.max(lid, 0.24); }
    else if (expr === 'sad') { tilt = -s * 0.24; lookY = -0.004; }
    else if (expr === 'shy') { lookX = 0.007 * scX; }
    else if (expr === 'happy') { ry *= 1.04; }

    // Subtle white sclera outer rim + rich iris + deep pupil
    addFlat(f, ovalGeo(cx, ey, rx * 1.08, ry * 1.03, tilt, 14), T, 0.0028, whiteM);
    addFlat(f, ovalGeo(cx + lookX, ey + lookY, rx * 0.90, ry * 0.92, tilt, 14), T, 0.0036, irisM);
    addFlat(f, ovalGeo(cx + lookX, ey + lookY - 0.001, rx * 0.50, ry * 0.56, tilt, 12), T, 0.0042, ink);

    // Highlights
    addFlat(f, ovalGeo(cx + lookX + 0.007 * scX, ey + lookY + ry * 0.34, rx * 0.30, ry * 0.28, 0, 8), T, 0.0049, whiteM);
    if (spec.glint >= 2) {
      addFlat(f, ovalGeo(cx + lookX - 0.006 * scX, ey + lookY - ry * 0.42, rx * 0.16, ry * 0.15, 0, 8), T, 0.0049, whiteM);
    }
    if (spec.glint >= 3 || expr === 'happy') {
      addFlat(f, star2D(cx + lookX + 0.002, ey + lookY + ry * 0.10, rx * 0.34), T, 0.0051, whiteM);
    }

    // Half-lid cover for sleepy / cool / angry
    if (lid > 0.05) {
      const ly = ey + ry * (1.0 - lid);
      const lidH = ry * (lid + 0.35);
      addFlat(f, ovalGeo(cx, ly + lidH * 0.48, rx * 1.25, lidH * 0.65, tilt, 10), T, 0.0053, skinM);
      addFlat(f, ribbonGeo([[cx - rx * 1.12, ly], [cx, ly + 0.003], [cx + rx * 1.12, ly]], 0.0034), T, 0.0057, ink);
    }
    // Lower smile cheek lift
    if (spec.low > 0.1) {
      addFlat(f, ovalGeo(cx, ey - ry * (1.05 - spec.low * 0.3), rx * 1.15, ry * 0.35, 0, 10), T, 0.0053, skinM);
    }

    // Upper lash line / eyeliner
    const showLash = eyeliner !== 'none' || T.defLashes || spec.wing;
    if (showLash) {
      const thick = eyeliner === 'bold' ? 0.0052 : (eyeliner === 'none' ? 0.0030 : 0.0040);
      const lPts = arcPts(cx, ey + 0.002, rx * 1.10, ry * 1.06, Math.PI * 0.12, Math.PI * 0.88, 8);
      if (eyeliner === 'wing' || eyeliner === 'bold' || spec.wing) {
        if (s > 0) lPts.unshift([cx + rx * 1.48, ey + ry * 0.56]);
        else lPts.push([cx - rx * 1.48, ey + ry * 0.56]);
      }
      addFlat(f, ribbonGeo(lPts, thick), T, 0.0056, ink);
    }

    // Teardrop gleam for sad expression
    if (expr === 'sad') {
      const tearM = basicMat('#7fd2ff', { opacity: 0.88, doubleSide: true });
      addFlat(f, ovalGeo(cx + s * 0.012, ey - ry * 0.82, 0.006, 0.008, 0, 8), T, 0.0058, tearM);
    }
  }

  // ---------- 4. Brows (8 shapes + expression posing) ----------
  for (const s of [1, -1]) {
    const bx = s * 0.060 * scX;
    let by = 0.056 * scY;
    let tilt = -s * 0.08;
    let arch = 0.006 * scY;
    let w = 0.0042;
    let halfLen = 0.024 * scX;

    if (browShape === 'straight') { arch = 0.001; tilt = 0; w = 0.0048; }
    else if (browShape === 'thick') { arch = 0.002; tilt = s * 0.04; w = 0.0074; halfLen = 0.027 * scX; }
    else if (browShape === 'thin') { arch = 0.008 * scY; w = 0.0025; }
    else if (browShape === 'sharp') { arch = 0.009 * scY; tilt = s * 0.16; w = 0.0044; }
    else if (browShape === 'soft') { arch = 0.007 * scY; tilt = -s * 0.14; w = 0.0042; }
    else if (browShape === 'short') { arch = 0.004 * scY; halfLen = 0.016 * scX; w = 0.0054; }
    else if (browShape === 'slit') { arch = 0.003 * scY; tilt = s * 0.08; w = 0.0062; }

    // Expression overrides (positive s*tilt = inner lower = angry V; negative s*tilt = outer lower = sad / \)
    if (expr === 'angry') { by -= 0.010 * scY; tilt = s * 0.36; arch = 0; }
    else if (expr === 'sad' || expr === 'cry' || expr === 'shy') { by += 0.004 * scY; tilt = -s * 0.34; arch = 0.002; }
    else if (expr === 'surprised') { by += 0.015 * scY; arch = 0.012 * scY; }
    else if (expr === 'cool') { by += (s > 0 ? 0.012 : -0.004) * scY; tilt = s * (s > 0 ? 0.10 : 0.18); arch = s > 0 ? 0.011 * scY : 0; }
    else if (expr === 'confident') { by += 0.006 * scY; tilt = s * 0.16; arch = 0.008 * scY; }
    else if (expr === 'dizzy') { by += (s > 0 ? 0.008 : -0.006) * scY; tilt = -s * 0.25; }

    const dx = halfLen * Math.cos(tilt), dy = halfLen * Math.sin(tilt);
    const pts = [[bx - dx, by - dy], [bx, by + arch], [bx + dx, by + dy]];
    addFlat(f, ribbonGeo(pts, w, w * 0.8), T, 0.0056, browM);
    if (browShape === 'slit' && s > 0) {
      addFlat(f, ribbonGeo([[bx + 0.010, by - 0.009], [bx + 0.014, by + 0.012]], 0.0028), T, 0.0060, skinM);
    }
  }

  // ---------- 5. Nose (5 shapes) ----------
  if (noseShape !== 'none') {
    const ny = -0.034 * scY;
    const nCol = new THREE.Color(doll.skin).multiplyScalar(0.86);
    const nMat = toon('#' + nCol.getHexString());
    if (noseShape === 'button') {
      const m = mesh(sph(0.010, 0.008, 0.010, 10, 8), nMat, false);
      m.position.set(0, ny, headFrontZ(T, 0, ny) + 0.002);
      f.add(m);
    } else if (noseShape === 'cute_dot') {
      addFlat(f, ovalGeo(0, ny, 0.0045, 0.0032, 0, 8), T, 0.0044, basicMat('#9e6b58', { opacity: 0.7, doubleSide: true }));
    } else if (noseShape === 'slim') {
      addFlat(f, ribbonGeo([[0, ny + 0.016], [0, ny - 0.004], [0.004, ny - 0.006]], 0.0020), T, 0.0046, basicMat('#9e6b58', { opacity: 0.65, doubleSide: true }));
    } else if (noseShape === 'sharp') {
      const g = new THREE.ConeGeometry(0.011, 0.032, 4).rotateY(Math.PI / 4).scale(0.8, 1, 0.85);
      const m = mesh(g, nMat, false);
      m.position.set(0, ny + 0.004, headFrontZ(T, 0, ny) + 0.004);
      f.add(m);
    }
  }

  // ---------- 6. Mouth (10 shapes + 14 expression overrides) ----------
  const my = -0.078 * scY;
  const darkMouth = basicMat('#5c2032', { doubleSide: true });
  const tongueM = basicMat('#ff7a98', { doubleSide: true });
  const mType = {
    neutral: mouthShape,
    happy: 'big_smile',
    grin: 'open_happy',
    wink: 'smile',
    surprised: 'tiny_o',
    angry: 'angry_m',
    sad: 'frown',
    cry: 'wail',
    blep: 'blep_m',
    kiss: 'kiss_m',
    cool: 'smirk',
    shy: 'wavy',
    dizzy: 'wavy',
    confident: 'smirk_big',
  }[expr] || mouthShape;

  if (mType === 'smile') {
    addFlat(f, ribbonGeo(arcPts(0, my + 0.008, 0.019 * scX, 0.012 * scY, Math.PI * 1.15, Math.PI * 1.85, 8), 0.0036), T, 0.0054, lipM);
  } else if (mType === 'big_smile') {
    addFlat(f, ribbonGeo(arcPts(0, my + 0.012, 0.028 * scX, 0.018 * scY, Math.PI * 1.1, Math.PI * 1.9, 10), 0.0042), T, 0.0054, lipM);
  } else if (mType === 'open_happy') {
    const sh = new THREE.Shape();
    sh.moveTo(-0.028 * scX, my + 0.006); sh.lineTo(0.028 * scX, my + 0.006);
    sh.quadraticCurveTo(0, my - 0.032 * scY, -0.028 * scX, my + 0.006);
    addFlat(f, new THREE.ShapeGeometry(sh, 10), T, 0.0050, darkMouth);
    addFlat(f, ovalGeo(0, my - 0.010 * scY, 0.015 * scX, 0.008 * scY, 0, 10), T, 0.0054, tongueM);
    addFlat(f, ribbonGeo([[-0.026 * scX, my + 0.004], [0.026 * scX, my + 0.004]], 0.0032), T, 0.0056, whiteM);
  } else if (mType === 'cat_mouth') {
    addFlat(f, ribbonGeo(arcPts(-0.011 * scX, my + 0.004, 0.011 * scX, 0.009 * scY, Math.PI * 1.1, Math.PI * 1.95, 7), 0.0034), T, 0.0054, lipM);
    addFlat(f, ribbonGeo(arcPts(0.011 * scX, my + 0.004, 0.011 * scX, 0.009 * scY, Math.PI * 1.05, Math.PI * 1.9, 7), 0.0034), T, 0.0054, lipM);
  } else if (mType === 'pout') {
    addFlat(f, ovalGeo(0, my, 0.015 * scX, 0.009 * scY, 0, 12), T, 0.0052, lipM);
    addFlat(f, ribbonGeo([[-0.013 * scX, my + 0.001], [0, my + 0.004], [0.013 * scX, my + 0.001]], 0.0018), T, 0.0057, darkMouth);
  } else if (mType === 'plump' || mType === 'heart_lip') {
    const w = mType === 'heart_lip' ? 0.018 : 0.024;
    addFlat(f, ovalGeo(-0.006 * scX, my + 0.004, w * 0.55 * scX, 0.0065 * scY, 0.15, 10), T, 0.0052, lipM);
    addFlat(f, ovalGeo(0.006 * scX, my + 0.004, w * 0.55 * scX, 0.0065 * scY, -0.15, 10), T, 0.0052, lipM);
    addFlat(f, ovalGeo(0, my - 0.004, w * 0.82 * scX, 0.0085 * scY, 0, 12), T, 0.0052, lipM);
    addFlat(f, ribbonGeo([[-w * 0.85 * scX, my + 0.001], [0, my - 0.001], [w * 0.85 * scX, my + 0.001]], 0.0016), T, 0.0057, darkMouth);
  } else if (mType === 'smirk' || mType === 'smirk_big') {
    const ext = mType === 'smirk_big' ? 1.3 : 1.0;
    addFlat(f, ribbonGeo([[-0.018 * ext * scX, my - 0.002], [0.004 * scX, my], [0.025 * ext * scX, my + 0.010]], 0.0038), T, 0.0054, lipM);
  } else if (mType === 'neutral') {
    addFlat(f, ribbonGeo([[-0.018 * scX, my], [0.018 * scX, my]], 0.0034), T, 0.0054, lipM);
  } else if (mType === 'tiny_o') {
    addFlat(f, ovalGeo(0, my - 0.002, 0.012 * scX, 0.016 * scY, 0, 12), T, 0.0052, darkMouth);
    addFlat(f, ribbonGeo(arcPts(0, my - 0.002, 0.013 * scX, 0.017 * scY, 0, Math.PI * 2, 12), 0.0026), T, 0.0056, lipM);
  } else if (mType === 'frown') {
    addFlat(f, ribbonGeo(arcPts(0, my - 0.012, 0.020 * scX, 0.012 * scY, 0.2, Math.PI - 0.2, 8), 0.0038), T, 0.0054, lipM);
  } else if (mType === 'angry_m') {
    addFlat(f, ribbonGeo([[-0.024 * scX, my - 0.007], [-0.008 * scX, my + 0.004], [0.008 * scX, my + 0.004], [0.024 * scX, my - 0.007]], 0.0042), T, 0.0054, darkMouth);
  } else if (mType === 'wail') {
    addFlat(f, ovalGeo(0, my - 0.004, 0.024 * scX, 0.020 * scY, 0, 14), T, 0.0050, darkMouth);
    addFlat(f, ovalGeo(0, my - 0.012, 0.013 * scX, 0.008 * scY, 0, 10), T, 0.0054, tongueM);
  } else if (mType === 'blep_m') {
    addFlat(f, ribbonGeo(arcPts(0, my + 0.010, 0.023 * scX, 0.012 * scY, Math.PI * 1.12, Math.PI * 1.88, 8), 0.0038), T, 0.0054, darkMouth);
    addFlat(f, ovalGeo(0.006 * scX, my - 0.011 * scY, 0.011 * scX, 0.014 * scY, 0.12, 10), T, 0.0058, tongueM);
    addFlat(f, ribbonGeo([[0.005 * scX, my - 0.003], [0.007 * scX, my - 0.017]], 0.0014), T, 0.0062, darkMouth);
  } else if (mType === 'kiss_m') {
    addFlat(f, ovalGeo(0, my + 0.005, 0.011 * scX, 0.008 * scY, 0, 10), T, 0.0054, lipM);
    addFlat(f, ovalGeo(0, my - 0.005, 0.011 * scX, 0.008 * scY, 0, 10), T, 0.0054, lipM);
    // Cute little kiss heart floating beside cheek!
    const hMesh = mesh(heart2D(0, 0, 0.018), basicMat('#ff5c8a', { doubleSide: true }), false);
    hMesh.position.set(0.056 * scX, my + 0.008, T.headRz + 0.036);
    hMesh.rotation.z = -0.22;
    f.add(hMesh);
  } else if (mType === 'wavy') {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push([(-0.022 + t * 0.044) * scX, my + Math.sin(t * Math.PI * 3) * 0.0045]);
    }
    addFlat(f, ribbonGeo(pts, 0.0036), T, 0.0054, lipM);
  }

  // ---------- 7. Beards & Moustaches (6 options) ----------
  if (beard && beard !== 'none') {
    const bMat = toon(hairCol);
    const flatB = basicMat(hairCol, { opacity: beard === 'stubble' ? 0.22 : 0.92, doubleSide: true });
    if (beard === 'stubble') {
      addFlat(f, ovalGeo(0, -0.105 * scY, 0.072 * scX, 0.036 * scY, 0, 14), T, 0.0018, flatB);
      const dotM = basicMat(hairCol, { opacity: 0.55, doubleSide: true });
      for (const [dx, dy] of [[-0.055, -0.092], [-0.038, -0.108], [-0.016, -0.116], [0, -0.108], [0.016, -0.116], [0.038, -0.108], [0.055, -0.092], [-0.024, -0.060], [0.024, -0.060]]) {
        addFlat(f, ovalGeo(dx * scX, dy * scY, 0.0022, 0.0022, 0, 6), T, 0.0022, dotM);
      }
    } else if (beard === 'moustache') {
      for (const s of [1, -1]) {
        addFlat(f, ribbonGeo([[0, -0.058 * scY], [s * 0.018 * scX, -0.056 * scY], [s * 0.042 * scX, -0.066 * scY]], 0.0075, 0.0035), T, 0.0062, flatB);
      }
    } else if (beard === 'handlebar') {
      for (const s of [1, -1]) {
        const pts = [[0, -0.058 * scY], [s * 0.022 * scX, -0.056 * scY], [s * 0.048 * scX, -0.064 * scY], [s * 0.064 * scX, -0.054 * scY], [s * 0.060 * scX, -0.044 * scY]];
        addFlat(f, ribbonGeo(pts, 0.0072, 0.0026), T, 0.0065, flatB);
      }
    } else if (beard === 'goatee') {
      for (const s of [1, -1]) {
        addFlat(f, ribbonGeo([[0, -0.058 * scY], [s * 0.030 * scX, -0.064 * scY]], 0.0065, 0.004), T, 0.0060, flatB);
      }
      const chin = mesh(sph(0.036 * scX, 0.030 * scY, 0.020, 10, 8), bMat, false);
      chin.position.set(0, -0.118 * scY, headFrontZ(T, 0, -0.112 * scY) + 0.004);
      f.add(chin);
    } else if (beard === 'full_beard') {
      // Sculpted jawline + chin beard leaving mouth cleanly visible!
      const sh = new THREE.SphereGeometry(1, 16, 10, -Math.PI * 0.06, Math.PI * 1.12, Math.PI * 0.72, Math.PI * 0.28);
      sh.scale(T.headRx * 1.08, T.headRy * 1.09, T.headRz * 1.07);
      const bMesh = mesh(sh, bMat, true);
      bMesh.position.set(0, -0.010, 0.004);
      f.add(bMesh);
      for (const s of [1, -1]) {
        // Sideburns down cheeks into jawbeard + moustache framing lips
        addFlat(f, ribbonGeo([[s * 0.125 * scX, -0.020 * scY], [s * 0.105 * scX, -0.075 * scY], [s * 0.055 * scX, -0.112 * scY], [0, -0.122 * scY]], 0.015, 0.018), T, 0.0038, flatB);
        addFlat(f, ribbonGeo([[0, -0.058 * scY], [s * 0.036 * scX, -0.066 * scY], [s * 0.048 * scX, -0.095 * scY]], 0.0075, 0.0065), T, 0.0062, flatB);
      }
    }
  }
}
