// @ts-nocheck
// body.js — 6 unmistakable toon body silhouettes + height slider + shared parametric torso/head contours.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl } from './core.js';

export const BODY_TYPES = [
  ['nu_manh', 'Nữ mảnh mai'],
  ['nu_day', 'Nữ đồng hồ cát'],
  ['nam_thu_sinh', 'Nam thư sinh'],
  ['nam_vam_vo', 'Nam vạm vỡ'],
  ['chibi', 'Nhỏ nhắn Chibi'],
  ['cao_mau', 'Cao người mẫu'],
];

// Each body type's signature default hair & face so types read immediately distinct
export const BODY_DEFAULTS = {
  nu_manh:      { hair: 'long_straight', eyes: 'almond', brows: 'arched',  eyeliner: 'wing',    blush: 'soft', nose: 'button' },
  nu_day:       { hair: 'long_wavy',     eyes: 'doe',    brows: 'arched',  eyeliner: 'classic', blush: 'soft', nose: 'button' },
  nam_thu_sinh: { hair: 'side_part',     eyes: 'almond', brows: 'thick',   eyeliner: 'none',    blush: 'none', nose: 'sharp'  },
  nam_vam_vo:   { hair: 'undercut',      eyes: 'cool',   brows: 'thick',   eyeliner: 'none',    blush: 'none', nose: 'sharp'  },
  chibi:        { hair: 'space_buns',    eyes: 'sparkle',brows: 'short',   eyeliner: 'classic', blush: 'soft', nose: 'cute_dot' },
  cao_mau:      { hair: 'elegant_bun',   eyes: 'cat',    brows: 'sharp',   eyeliner: 'wing',    blush: 'soft', nose: 'slim'   },
};

const BODY_DEFS = {
  nu_manh: {
    Y: { ankle: 0.05, knee: 0.375, hip: 0.70, waist: 0.89, chest: 1.01, shoulder: 1.10, neck: 1.16, head: 1.35 },
    T: {
      sh: 0.125, chest: 0.120, bust: 0.020, pec: 0, trap: 0, waist: 0.092, hip: 0.155,
      neckR: 0.031, armR: 0.034, foreR: 0.026, handS: 0.90, footS: 0.94, legR: 0.050, calfR: 0.035, hipX: 0.064,
      headRx: 0.170, headRy: 0.168, headRz: 0.160, jawSq: 0.0, chinTap: 0.10, sz: 0.75,
      defBrows: 'arched', defLashes: true, gender: 'f',
    },
  },
  nu_day: {
    Y: { ankle: 0.05, knee: 0.37, hip: 0.69, waist: 0.88, chest: 1.005, shoulder: 1.095, neck: 1.155, head: 1.345 },
    T: {
      sh: 0.135, chest: 0.144, bust: 0.044, pec: 0, trap: 0, waist: 0.098, hip: 0.178,
      neckR: 0.034, armR: 0.042, foreR: 0.033, handS: 0.96, footS: 0.98, legR: 0.070, calfR: 0.046, hipX: 0.076,
      headRx: 0.175, headRy: 0.169, headRz: 0.164, jawSq: 0.0, chinTap: 0.04, sz: 0.75,
      defBrows: 'arched', defLashes: true, gender: 'f',
    },
  },
  nam_thu_sinh: {
    Y: { ankle: 0.05, knee: 0.39, hip: 0.72, waist: 0.92, chest: 1.06, shoulder: 1.16, neck: 1.225, head: 1.42 },
    T: {
      sh: 0.165, chest: 0.142, bust: 0, pec: 0.014, trap: 0.35, waist: 0.125, hip: 0.130,
      neckR: 0.042, armR: 0.043, foreR: 0.034, handS: 1.15, footS: 1.15, legR: 0.058, calfR: 0.043, hipX: 0.066,
      headRx: 0.166, headRy: 0.176, headRz: 0.162, jawSq: 0.52, chinTap: 0.0, sz: 0.75,
      defBrows: 'thick', defLashes: false, gender: 'm',
    },
  },
  nam_vam_vo: {
    Y: { ankle: 0.05, knee: 0.39, hip: 0.73, waist: 0.94, chest: 1.10, shoulder: 1.21, neck: 1.285, head: 1.48 },
    T: {
      sh: 0.200, chest: 0.172, bust: 0, pec: 0.034, trap: 1.0, waist: 0.130, hip: 0.135,
      neckR: 0.054, armR: 0.056, foreR: 0.045, handS: 1.22, footS: 1.20, legR: 0.070, calfR: 0.052, hipX: 0.070,
      headRx: 0.168, headRy: 0.175, headRz: 0.164, jawSq: 0.95, chinTap: 0.0, sz: 0.75,
      defBrows: 'thick', defLashes: false, gender: 'm',
    },
  },
  chibi: {
    // Head x1.3, torso and limbs ~75% length, cute round body
    Y: { ankle: 0.045, knee: 0.285, hip: 0.52, waist: 0.66, chest: 0.75, shoulder: 0.82, neck: 0.865, head: 1.095 },
    T: {
      sh: 0.122, chest: 0.126, bust: 0, pec: 0, trap: 0, waist: 0.118, hip: 0.142,
      neckR: 0.035, armR: 0.039, foreR: 0.032, handS: 0.88, footS: 0.92, legR: 0.055, calfR: 0.042, hipX: 0.058,
      headRx: 0.220, headRy: 0.208, headRz: 0.200, jawSq: 0.0, chinTap: 0.0, sz: 0.75,
      defBrows: 'short', defLashes: true, gender: 'n',
    },
  },
  cao_mau: {
    // Legs +14% length (not uniform scale!), slimmer limbs, long graceful neck
    Y: { ankle: 0.05, knee: 0.425, hip: 0.80, waist: 1.00, chest: 1.13, shoulder: 1.23, neck: 1.32, head: 1.545 },
    T: {
      sh: 0.136, chest: 0.124, bust: 0.022, pec: 0, trap: 0, waist: 0.086, hip: 0.148,
      neckR: 0.029, armR: 0.031, foreR: 0.024, handS: 0.94, footS: 0.98, legR: 0.045, calfR: 0.031, hipX: 0.062,
      headRx: 0.154, headRy: 0.166, headRz: 0.150, jawSq: 0.08, chinTap: 0.12, sz: 0.75,
      defBrows: 'sharp', defLashes: true, gender: 'f',
    },
  },
};

export function resolveBodyType(type) {
  if (BODY_DEFS[type]) return type;
  if (type === 'girl' || type === 'female') return 'nu_manh';
  if (type === 'curvy') return 'nu_day';
  if (type === 'boy' || type === 'male') return 'nam_thu_sinh';
  return 'nu_manh';
}

export const Y = BODY_DEFS.nu_manh.Y;

export function getBodyMetrics(rawType, height = 1.0) {
  const key = resolveBodyType(rawType);
  const def = BODY_DEFS[key];
  const h = Math.min(1.15, Math.max(0.85, Number(height) || 1.0));
  const bY = def.Y;
  const sc = (y) => bY.ankle + (y - bY.ankle) * h;
  const neckY = sc(bY.neck);
  const headGap = (bY.head - bY.neck) * (1 + (h - 1) * 0.25);
  const mY = {
    ankle: bY.ankle,
    knee: sc(bY.knee),
    hip: sc(bY.hip),
    waist: sc(bY.waist),
    chest: sc(bY.chest),
    shoulder: sc(bY.shoulder),
    neck: neckY,
    head: neckY + headGap,
  };
  const torsoH = mY.shoulder - mY.hip;
  const armFactor = key === 'chibi' ? 0.50 : 0.56;
  const L = {
    legUp: mY.hip - mY.knee,
    legLo: mY.knee - mY.ankle,
    armUp: torsoH * armFactor,
    armLo: torsoH * (armFactor - 0.06),
  };
  return { key, T: { ...def.T }, Y: mY, L, height: h };
}

// Shared torso contour (clear feminine bust / muscular pecs + upper back) — applied identically to skin & garments!
export function applyTorsoContour(geo, T, mY, yOrigin) {
  const bust = T.bust || 0;
  const pec = T.pec || 0;
  if (!bust && !pec) return geo;
  const p = geo.attributes.position;
  const span = Math.max(0.16, mY.shoulder - mY.waist);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const wy = y + yOrigin;
    const r = Math.hypot(x, z);
    if (r < 0.001) continue;
    const dy = (wy - mY.chest) / span;
    let dz = 0;
    if (bust > 0 && z > 0) {
      const front = z / r;
      const t = (dy + 0.04) / 0.30;
      const vBand = Math.exp(-(t * t));
      const hBand = Math.pow(front, 1.45);
      const ax = Math.min(1, Math.abs(x) / Math.max(0.05, T.chest * 0.6));
      const twin = 0.86 + 0.14 * Math.sin(ax * Math.PI);
      dz += bust * vBand * hBand * twin;
    }
    if (pec > 0) {
      const t = (dy - 0.06) / 0.36;
      const vBand = Math.exp(-(t * t));
      if (z > 0) dz += pec * vBand * Math.pow(z / r, 1.10);
      else dz -= pec * 0.60 * vBand * Math.pow(-z / r, 1.30);
    }
    if (dz) p.setZ(i, z + dz);
  }
  geo.computeVertexNormals();
  return geo;
}

// Shared head jaw shape (wide square male jaw / tapered female chin) + exact analytical front Z
export function headScaleAt(T, uy) {
  let sx = 1, sz = 1;
  if (uy < 0) {
    if (T.jawSq > 0) {
      const jt = (uy + 0.56) / 0.30;
      const jb = Math.exp(-(jt * jt));
      sx *= 1 + T.jawSq * 0.20 * jb;
      sz *= 1 + T.jawSq * 0.06 * jb;
    }
    if (T.chinTap > 0) {
      sx *= 1 - T.chinTap * Math.pow(-uy, 1.35);
    }
  }
  return [sx, sz];
}

export function buildHeadGeo(T) {
  const g = new THREE.SphereGeometry(1, 20, 14);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const ux = p.getX(i), uy = p.getY(i), uz = p.getZ(i);
    const [sx, sz] = headScaleAt(T, uy);
    let y = uy * T.headRy;
    if (T.jawSq > 0.3 && uy < -0.76) y = (-0.76 + (uy + 0.76) * (1 - T.jawSq * 0.26)) * T.headRy;
    p.setXYZ(i, ux * T.headRx * sx, y, uz * T.headRz * sz);
  }
  g.computeVertexNormals();
  return g;
}

export function headFrontZ(T, x, y) {
  const uy = Math.max(-0.96, Math.min(0.96, y / T.headRy));
  const [sx, sz] = headScaleAt(T, uy);
  const ux = x / (T.headRx * sx);
  const rem = 1 - ux * ux - uy * uy;
  return Math.sqrt(Math.max(0.01, rem)) * T.headRz * sz;
}

// Build complete articulated doll body
export function buildBody(doll, rawType, skin, height = 1.0) {
  const { key, T, Y: mY, L, height: h } = getBodyMetrics(rawType, height);
  doll.type = key;
  doll.skin = skin;
  doll.height = h;
  doll.T = T;
  doll.Y = mY;
  doll.L = L;

  doll.root.clear();
  const S = doll.skinMat(skin);
  doll.skinM = S;
  const out = !doll.ghost && !doll.silhouette;
  const r = doll.root;

  // Pivots
  const hips = new THREE.Group(); hips.position.y = mY.hip; r.add(hips);
  const chest = new THREE.Group(); chest.position.y = mY.waist - mY.hip; hips.add(chest);
  const neck = new THREE.Group(); neck.position.y = mY.neck - mY.waist; chest.add(neck);
  const head = new THREE.Group(); head.position.y = mY.head - mY.neck; neck.add(head);
  doll.j = { hips, chest, neck, head, arm: {}, leg: {} };

  const wh = mY.waist - mY.hip;
  const shH = mY.shoulder - mY.waist;
  const nkH = mY.neck - mY.waist;
  const chH = mY.chest - mY.waist;
  const trap = T.trap || 0;

  // Lower torso (hips -> waist)
  const hipGeo = lathe([
    [Math.max(0.05, T.hip * 0.44), -0.078],
    [T.hip * 0.94, -0.036],
    [T.hip, 0.018],
    [T.hip * 0.90, wh * 0.52],
    [T.waist, wh],
    [T.waist * 0.98, wh + 0.018],
  ], 0.74, 18, 0, 2);
  hips.add(mesh(hipGeo, S, out));

  // Upper torso (waist -> chest -> V-taper shoulders -> trapezius slope -> neck)
  const trapR = T.neckR * 1.15 + trap * (T.sh * 0.56 - T.neckR);
  const chestGeo = lathe([
    [T.waist * 0.98, -0.02],
    [T.waist + (T.chest - T.waist) * 0.35, chH * 0.42],
    [T.chest, chH],
    [T.sh * (0.98 + trap * 0.04), shH * 0.84],
    [T.sh * (0.72 + trap * 0.14), shH * 1.02],
    [trapR, (shH + nkH) * 0.55],
    [T.neckR * 1.08, nkH - 0.008],
    [T.neckR * 0.96, nkH + 0.012],
  ], 0.74, 18, 0, 2);
  applyTorsoContour(chestGeo, T, mY, mY.waist);
  chest.add(mesh(chestGeo, S, out));

  // Neck (tall slender on cao_mau, thick sturdy on nam_vam_vo)
  const neckLen = Math.max(0.08, (mY.head - mY.neck) * 0.84);
  neck.add(mesh(cyl(T.neckR * 0.93, T.neckR * 1.08, neckLen, 12).translate(0, neckLen * 0.30, 0), S, out));

  // Head + ears
  head.add(mesh(buildHeadGeo(T), S, out));
  const earS = T.headRx / 0.172;
  for (const s of [1, -1]) {
    head.add(mesh(sph(0.026 * earS, 0.036 * earS, 0.019 * earS, 10, 7).translate(s * (T.headRx - 0.003), -0.01, -0.005), S, out));
  }
  doll.face = new THREE.Group();
  head.add(doll.face);

  // Arms — tucked cleanly into the shoulder line with natural muscular/slim deltoids
  const deltoid = T.armR * (trap > 0.5 ? 1.12 : 1.04);
  for (const s of [1, -1]) {
    const sh = new THREE.Group();
    sh.position.set(s * (T.sh - T.armR * 0.04), shH - 0.004, 0);
    chest.add(sh);
    sh.add(mesh(sph(deltoid, deltoid * 1.02, deltoid * 0.94, 10, 8), S, out));
    sh.add(mesh(lathe([
      [T.foreR * 1.04, -L.armUp],
      [T.armR * (trap > 0.5 ? 1.06 : 0.96), -L.armUp * 0.46],
      [T.armR * 1.04, -0.01],
      [T.armR * 0.65, 0.025],
    ], 1, 12, 0, 1), S, out));

    const el = new THREE.Group();
    el.position.y = -L.armUp;
    sh.add(el);
    el.add(mesh(lathe([
      [T.foreR * 0.78, -L.armLo],
      [T.foreR * 0.98, -L.armLo * 0.42],
      [T.foreR * 1.04, 0.0],
      [T.foreR * 0.62, 0.022],
    ], 1, 12, 0, 1), S, out));

    const hand = new THREE.Group();
    hand.position.y = -L.armLo - 0.006;
    el.add(hand);
    const hs = T.handS;
    hand.add(mesh(sph(0.032 * hs, 0.045 * hs, 0.024 * hs, 10, 7).translate(0, -0.028 * hs, 0.004), S, out));
    hand.add(mesh(sph(0.011 * hs, 0.020 * hs, 0.011 * hs, 8, 6).translate(-s * 0.024 * hs, -0.018 * hs, 0.014 * hs).rotateZ(s * 0.4), S, out));
    doll.j.arm[s] = { sh, el, hand };
  }

  // Legs
  for (const s of [1, -1]) {
    const th = new THREE.Group();
    th.position.set(s * T.hipX, -0.018, 0);
    hips.add(th);
    th.add(mesh(lathe([
      [T.legR * 0.72, -L.legUp],
      [T.legR * 0.88, -L.legUp * 0.58],
      [T.legR, -L.legUp * 0.14],
      [T.legR * 0.68, 0.04],
    ], 1, 14, 0, 1), S, out));

    const kn = new THREE.Group();
    kn.position.y = -L.legUp;
    th.add(kn);
    const ankleR = Math.max(0.024, T.calfR * 0.70);
    kn.add(mesh(lathe([
      [ankleR, -L.legLo],
      [T.calfR * 0.92, -L.legLo * 0.60],
      [T.calfR * 1.06, -L.legLo * 0.22],
      [T.calfR * 0.98, 0.015],
      [T.calfR * 0.68, 0.035],
    ], 1, 14, 0, 1), S, out));

    const ft = new THREE.Group();
    ft.position.y = -L.legLo;
    kn.add(ft);
    const fs = T.footS || 1.0;
    ft.add(mesh(sph(0.038 * fs, 0.028 * fs, 0.072 * fs, 10, 8).translate(0, -0.020, 0.028 * fs), S, out));
    doll.j.leg[s] = { th, kn, ft };
  }
}
