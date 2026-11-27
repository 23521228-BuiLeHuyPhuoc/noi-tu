// @ts-nocheck
// wear-shoes-hats.js — 15 shoes, 20 hats/headwear (with closed-hat tracking), and 10 glasses.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat } from './core.js';
import { headFrontZ } from './body.js';
import { M, A, band } from './wear-helpers.js';

function footScale(d) {
  return d.T.footS || (d.T.gender === 'm' ? 1.15 : (d.type === 'chibi' ? 0.92 : 1.0));
}

function baseShoe(d, it, add, { sole = 0.014, heel = 0, toeCap = false, strap = false, open = false, platform = 0 } = {}) {
  const fs = footScale(d);
  for (const s of [1, -1]) {
    const ft = d.j.leg[s].ft;
    if (!open) add([ft, mesh(sph(0.047 * fs, 0.038 * fs, 0.086 * fs, 14, 10).translate(0, -0.010, 0.030 * fs), M(it))]);
    const soleH = sole + platform + 0.004;
    add([ft, mesh(sph(0.050 * fs, soleH, 0.090 * fs, 14, 10).translate(0, -0.044 - platform * 0.6, 0.030 * fs), A(it))]);
    if (toeCap) add([ft, mesh(sph(0.038 * fs, 0.025 * fs, 0.034 * fs, 10, 8).translate(0, -0.022, 0.088 * fs), A(it), false)]);
    if (strap) add([ft, mesh(torus(0.044 * fs, 0.007, 6, 14, Math.PI).translate(0, -0.006, 0.020 * fs), A(it), false)]);
    if (heel > 0) add([ft, mesh(cyl(0.007, 0.011, heel + 0.036, 10).translate(0, -0.056, -0.044 * fs), A(it))]);
  }
}

function bootShaft(d, it, add, topFrac, trim = false, neon = false) {
  const T = d.T, L = d.L;
  const widePants = (d.legCalfInf || 0) > 0.026;
  const inf = widePants ? 0.010 : Math.max(0.016, (d.legCalfInf || 0) + 0.008);
  const ankleR = Math.max(0.030, T.calfR * 0.74) + inf;
  const topR = (T.calfR * (0.88 + topFrac * 0.20)) + inf + 0.004;
  const topY = -L.legLo * (1 - topFrac);
  const trMat = neon ? toon(it.c2 || '#00f0ff', 'plain', '#fff', { emissive: it.c2 || '#00f0ff', emissiveIntensity: 0.7 }) : A(it);
  for (const s of [1, -1]) {
    const kn = d.j.leg[s].kn;
    add([kn, mesh(lathe([[ankleR, -L.legLo], [(ankleR + topR) * 0.5, (-L.legLo + topY) * 0.5], [topR, topY]], 1, 16, 0, 2), M(it))]);
    if (trim) add([kn, mesh(torus(topR + 0.002, 0.009, 8, 16).rotateX(Math.PI / 2).translate(0, topY - 0.005, 0), trMat, !neon)]);
  }
}

export const SHOE_BUILD = {
  sneaker: (d, it, add) => baseShoe(d, it, add, { sole: 0.016, toeCap: true }),
  high_top: (d, it, add) => { baseShoe(d, it, add, { sole: 0.018, toeCap: true }); bootShaft(d, it, add, 0.24, true); },
  platform: (d, it, add) => baseShoe(d, it, add, { sole: 0.016, platform: 0.024, toeCap: true }),
  stiletto: (d, it, add) => baseShoe(d, it, add, { sole: 0.008, heel: 0.038 }),
  mary_jane: (d, it, add) => baseShoe(d, it, add, { sole: 0.012, strap: true }),
  ankle_boots: (d, it, add) => { baseShoe(d, it, add, { sole: 0.015 }); bootShaft(d, it, add, 0.34, true); },
  knee_boots: (d, it, add) => { baseShoe(d, it, add, { sole: 0.014, heel: 0.022 }); bootShaft(d, it, add, 0.84, true); },
  combat_boots: (d, it, add) => { baseShoe(d, it, add, { sole: 0.020, platform: 0.014 }); bootShaft(d, it, add, 0.48, true); },
  loafer: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.010 });
    const fs = footScale(d);
    for (const s of [1, -1]) add([d.j.leg[s].ft, mesh(box(0.034 * fs, 0.010, 0.016).translate(0, 0.024, 0.044 * fs), toon('#f2c94c'), false)]);
  },
  oxford: (d, it, add) => baseShoe(d, it, add, { sole: 0.011, heel: 0.012, toeCap: true }),
  sandals: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.012, open: true });
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(torus(0.044 * fs, 0.007, 6, 14, Math.PI).translate(0, -0.020, 0.058 * fs), M(it), false)]);
      add([ft, mesh(torus(0.042 * fs, 0.007, 6, 14, Math.PI).translate(0, -0.006, 0.016 * fs), M(it), false)]);
    }
  },
  flip_flops: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.017, open: true });
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      for (const side of [1, -1]) add([ft, mesh(box(0.011, 0.010, 0.072 * fs).rotateY(side * 0.42).translate(side * 0.018 * fs, -0.004, 0.052 * fs), M(it), false)]);
    }
  },
  ballet: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.006, strap: true });
    const L = d.L, r = d.T.calfR * 0.78 + 0.010;
    for (const s of [1, -1]) {
      const kn = d.j.leg[s].kn;
      add([kn, mesh(torus(r, 0.005, 6, 14).rotateX(Math.PI / 2 + 0.25).translate(0, -L.legLo * 0.85, 0), A(it), false)]);
      add([kn, mesh(torus(r, 0.005, 6, 14).rotateX(Math.PI / 2 - 0.25).translate(0, -L.legLo * 0.76, 0), A(it), false)]);
    }
  },
  cyber_boots: (d, it, add) => { baseShoe(d, it, add, { sole: 0.016, platform: 0.014 }); bootShaft(d, it, add, 0.62, true, true); },
  wooden_clogs: (d, it, add) => {
    const fs = footScale(d);
    const wood = toon('#b87a46');
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.078 * fs, 0.028, 0.165 * fs).translate(0, -0.044, 0.030 * fs), wood)]);
      add([ft, mesh(torus(0.044 * fs, 0.012, 8, 14, Math.PI).translate(0, -0.018, 0.044 * fs), M(it))]);
    }
  },
};
SHOE_BUILD.boots = SHOE_BUILD.ankle_boots;
SHOE_BUILD.heels = SHOE_BUILD.stiletto;

// ===== HATS & HEADWEAR (20) =====
export const CLOSED_HATS = new Set([
  'non_la', 'chef_hat', 'pirate_hat', 'helmet', 'beret', 'cap',
  'bucket_hat', 'sunhat', 'witch', 'fedora', 'top_hat', 'beanie', 'khan_dong',
]);

function scH(g, d) {
  const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
  if (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005) g.scale(sx, sy, sz);
  return g;
}

function hatAdd(d, add, liftY = 0) {
  return (geo, mat, outline = true) => {
    const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
    if (geo && geo.isMesh) {
      if (liftY) geo.position.y += liftY * sy;
      geo.scale.set(sx, sy, sz);
      add([d.j.head, geo]);
      return;
    }
    if (liftY) geo.translate(0, liftY, 0);
    add([d.j.head, mesh(scH(geo, d), mat, outline)]);
  };
}

// Compute real vertical hat lift from visible hair crown top (measured in doll.js AFTER closed-hat hiding!)
function capTop(d) { return Math.max(0.188, Math.min(0.285, d.hairCrownY || 0.212)); }
function closedDy(d) { return Math.max(-0.022, Math.min(0.022, capTop(d) - 0.212)); }
function openTop(d) { return Math.max(0.195, Math.min(0.278, capTop(d))); }

export const HAT_BUILD = {
  non_la: (d, it, add) => {
    // Sit the hollow conical nón lá snugly ON the hair cap (rim rests right above forehead, zero floating!)
    const topY = capTop(d);
    const rimY = topY - 0.102;
    const put = hatAdd(d, add, 0);
    put(cone(0.36, 0.21, 28).translate(0, rimY + 0.105, -0.01), M(it, { doubleSide: true }));
    put(torus(0.356, 0.008, 6, 28).rotateX(Math.PI / 2).translate(0, rimY + 0.002, -0.01), A(it), false);
    // Silk chin ribbon connecting cleanly from inner rim under chin
    put(torus(0.174, 0.0065, 6, 22, Math.PI).rotateZ(Math.PI).translate(0, rimY - 0.072, 0.018), A(it), false);
  },

  tiara: (d, it, add) => {
    const dy = openTop(d) - 0.212;
    const put = hatAdd(d, add, dy);
    const gm = toon('#f2c94c');
    put(torus(0.155, 0.008, 8, 22, Math.PI).rotateX(Math.PI / 2 - 0.16).translate(0, 0.165, 0.015), gm);
    for (let i = -2; i <= 2; i++) {
      const h = 0.046 - Math.abs(i) * 0.009;
      put(cone(0.012, h, 6).translate(i * 0.034, 0.185 + h * 0.4, 0.155 - Math.abs(i) * 0.02), gm);
    }
    put(sph(0.015, 0.018, 0.010, 8, 6).translate(0, 0.199, 0.162), M(it), false);
  },

  crown: (d, it, add) => {
    const topY = openTop(d);
    const baseY = topY + 0.006;
    const put = hatAdd(d, add, 0);
    const gm = toon('#f2c94c');
    put(cyl(0.098, 0.090, 0.050, 20, true).translate(0, baseY, -0.01), gm);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(cone(0.020, 0.050, 6).translate(Math.cos(a) * 0.094, baseY + 0.046, Math.sin(a) * 0.094 - 0.01), gm);
    }
    put(sph(0.016, 0.016, 0.010, 8, 6).translate(0, baseY, 0.090), M(it), false);
  },

  chef_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.165, 0.182, 0.11, 20).translate(0, 0.195, -0.01), M(it));
    put(band(0.184, 0.152, 0.028, it, 1), A(it));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(sph(0.088, 0.082, 0.088, 12, 8).translate(Math.cos(a) * 0.095, 0.275, Math.sin(a) * 0.095 - 0.01), M(it));
    }
    put(sph(0.105, 0.090, 0.105, 12, 8).translate(0, 0.300, -0.01), M(it));
  },

  pirate_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.188, 0.11, 0.188, 18, 12).translate(0, 0.155, -0.01), M(it));
    for (const s of [1, -1]) {
      put(box(0.24, 0.12, 0.024).rotateY(s * 0.55).rotateZ(s * 0.12).translate(s * 0.12, 0.205, 0.09), M(it));
    }
    put(box(0.32, 0.13, 0.024).translate(0, 0.215, -0.15), M(it));
    put(sph(0.026, 0.024, 0.014, 10, 8).translate(0, 0.215, 0.165), toon('#ffffff'), false);
    put(sph(0.025, 0.11, 0.018, 10, 8).rotateZ(-0.45).translate(0.17, 0.285, -0.02), A(it));
  },

  helmet: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    put(new THREE.SphereGeometry(0.224, 20, 12, 0, Math.PI * 2, 0, 1.50).translate(0, 0.036, 0.002), M(it));
    put(new THREE.SphereGeometry(0.224, 20, 10, Math.PI, Math.PI, 1.40, 1.18).translate(0, 0.036, -0.006), M(it));
    put(box(0.030, 0.042, 0.28).translate(0, 0.250, -0.005), A(it));
    const visM = basicMat(it.c2 || '#56d8ff', { opacity: 0.45, doubleSide: true });
    put(new THREE.CylinderGeometry(0.214, 0.214, 0.092, 18, 1, true, -0.95, 1.90).translate(0, 0.030, 0.012), visM, false);
  },

  cat_ears: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    put(torus(0.186, 0.011, 8, 22, Math.PI).translate(0, 0.035, -0.012), M(it));
    for (const s of [1, -1]) {
      put(cone(0.056, 0.11, 4).rotateZ(-s * 0.28).translate(s * 0.11, 0.24, -0.01), M(it));
      put(cone(0.034, 0.068, 4).rotateZ(-s * 0.28).translate(s * 0.11, 0.235, 0.012), A(it), false);
    }
  },

  bunny_ears: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    put(torus(0.186, 0.011, 8, 22, Math.PI).translate(0, 0.035, -0.012), M(it));
    for (const s of [1, -1]) {
      put(sph(0.036, 0.125, 0.022, 12, 8).rotateZ(-s * 0.18).translate(s * 0.072, 0.31, -0.015), M(it));
      put(sph(0.020, 0.078, 0.012, 10, 8).rotateZ(-s * 0.18).translate(s * 0.072, 0.31, 0.002), A(it), false);
    }
  },

  demon_horns: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    for (const s of [1, -1]) {
      put(lathe([[0.042, 0], [0.032, 0.06], [0.018, 0.11], [0.004, 0.15]], 1, 12, 0, 2).rotateZ(-s * 0.45).rotateX(0.18).translate(s * 0.105, 0.175, 0.02), M(it));
      put(torus(0.044, 0.008, 6, 12).rotateX(Math.PI / 2).rotateZ(-s * 0.45).translate(s * 0.105, 0.178, 0.02), A(it), false);
    }
  },

  angel_halo: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const glow = toon(it.c || '#ffe270', 'plain', '#fff', { emissive: it.c || '#ffe270', emissiveIntensity: 0.65 });
    put(torus(0.135, 0.015, 10, 24).rotateX(Math.PI / 2 - 0.10).translate(0, 0.305, -0.01), glow);
  },

  beret: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.21, 0.068, 0.20, 18, 12).rotateZ(0.24).translate(0.032, 0.198, -0.012), M(it));
    put(cyl(0.008, 0.010, 0.034, 8).rotateZ(0.24).translate(0.012, 0.268, -0.012), A(it));
  },

  cap: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.194, 0.125, 0.194, 20, 12).translate(0, 0.124, -0.010), M(it));
    put(new THREE.CylinderGeometry(0.115, 0.118, 0.014, 20, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.25).translate(0, 0.132, 0.135), A(it));
    put(sph(0.014, 0.010, 0.014, 8, 6).translate(0, 0.250, -0.01), A(it), false);
  },

  bucket_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.165, 0.195, 0.115, 22).translate(0, 0.190, -0.01), M(it));
    put(cyl(0.195, 0.275, 0.065, 24, true).translate(0, 0.135, -0.01), M(it, { doubleSide: true }));
    put(band(0.194, 0.165, 0.022, it, 1), A(it));
  },

  sunhat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.31, 0.34, 0.014, 28).translate(0, 0.158, -0.01), M(it));
    put(sph(0.178, 0.115, 0.178, 18, 12).translate(0, 0.193, -0.01), M(it));
    put(band(0.180, 0.183, 0.032, it, 1), A(it));
  },

  witch: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.30, 0.31, 0.014, 26).translate(0, 0.152, -0.01), M(it));
    put(cone(0.155, 0.37, 20).translate(0, 0.335, -0.01).rotateZ(-0.12), M(it));
    put(band(0.152, 0.182, 0.042, it, 1), A(it));
    put(box(0.044, 0.042, 0.012).translate(0, 0.182, 0.148), toon('#f2c94c'), false);
  },

  fedora: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.24, 0.255, 0.014, 24).translate(0, 0.155, -0.01), M(it));
    put(cyl(0.148, 0.182, 0.125, 20).translate(0, 0.215, -0.01), M(it));
    put(band(0.178, 0.178, 0.030, it, 1), A(it));
  },

  top_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.24, 0.25, 0.014, 24).translate(0, 0.152, -0.01), M(it));
    put(cyl(0.168, 0.154, 0.24, 20).translate(0, 0.272, -0.01), M(it));
    put(band(0.160, 0.182, 0.036, it, 1), A(it));
  },

  beanie: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.198, 0.152, 0.198, 20, 12).translate(0, 0.132, -0.012), M(it));
    put(torus(0.186, 0.026, 8, 22).rotateX(Math.PI / 2).translate(0, 0.122, -0.012), A(it));
    put(sph(0.054, 0.054, 0.054, 12, 8).translate(0, 0.290, -0.018), A(it));
  },

  khan_dong: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    for (let i = 0; i < 3; i++) {
      put(torus(0.172 + i * 0.014, 0.024, 8, 22).rotateX(Math.PI / 2 - 0.16).translate(0, 0.145 + i * 0.022, -0.012), M(it));
    }
    put(torus(0.192, 0.010, 8, 22).rotateX(Math.PI / 2 - 0.16).translate(0, 0.182, -0.010), A(it));
    put(sph(0.020, 0.020, 0.012, 10, 8).translate(0, 0.188, 0.185), toon('#f2c94c'), false);
  },

  bridal_veil: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const veilM = toon(it.c || '#ffffff', 'plain', '#fff', { opacity: 0.62, doubleSide: true });
    put(torus(0.14, 0.010, 8, 20, Math.PI).rotateX(Math.PI / 2 - 0.2).translate(0, 0.185, -0.02), A(it));
    put(lathe([[0.28, -0.45], [0.24, -0.22], [0.18, 0.02], [0.12, 0.18]], 0.85, 20, 2.75, 2).translate(0, 0.02, -0.06), veilM, false);
  },
};
HAT_BUILD.bunny = HAT_BUILD.bunny_ears;

// ===== GLASSES (10) =====
function makeGlasses(d, it, add, kind) {
  const H = d.j.head, T = d.T;
  const scX = T.headRx / 0.172, scY = T.headRy / 0.168;
  const ex = 0.058 * scX, ey = -0.002 * scY;
  const gz = headFrontZ(T, ex, ey) + 0.026;
  const bz = headFrontZ(T, 0, ey) + 0.022;
  const frame = toon(it.c);
  const darkLens = basicMat(it.c2 || '#231c2e', { opacity: 0.88, doubleSide: true });
  const clearLens = basicMat('#ffffff', { opacity: 0.24, doubleSide: true });

  if (kind === 'cyber_visor') {
    const neon = toon(it.c2 || '#00f0ff', 'plain', '#fff', { emissive: it.c2 || '#00f0ff', emissiveIntensity: 0.72, opacity: 0.85, doubleSide: true });
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.026, T.headRx + 0.026, 0.058 * scY, 20, 1, true, -0.95, 1.90).translate(0, ey, 0.008), neon, false)]);
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.028, T.headRx + 0.028, 0.010, 20, 1, true, -0.98, 1.96).translate(0, ey + 0.030 * scY, 0.008), frame, false)]);
    return;
  }

  if (kind === 'eye_patch') {
    add([H, mesh(sph(0.038 * scX, 0.034 * scY, 0.012, 12, 8).translate(ex, ey, gz), frame)]);
    add([H, mesh(torus(T.headRx + 0.010, 0.006, 6, 24).rotateX(Math.PI / 2).rotateZ(-0.22).translate(0, ey + 0.022, -0.004), frame, false)]);
    return;
  }

  if (kind === 'monocle') {
    add([H, mesh(torus(0.036 * scX, 0.0055, 8, 22).translate(ex, ey, gz), frame, false)]);
    add([H, new THREE.Mesh(new THREE.CircleGeometry(0.034 * scX, 18).translate(ex, ey, gz + 0.001), clearLens)]);
    add([H, mesh(cyl(0.0022, 0.0022, 0.11, 6).rotateZ(-0.18).translate(ex + 0.042 * scX, ey - 0.055 * scY, gz - 0.010), frame, false)]);
    return;
  }

  const sides = [1, -1];
  for (const s of sides) {
    if (kind === 'heart') {
      const sh = new THREE.Shape();
      sh.moveTo(0, -0.032); sh.bezierCurveTo(-0.050, 0.0, -0.026, 0.042, 0, 0.018); sh.bezierCurveTo(0.026, 0.042, 0.050, 0.0, 0, -0.032);
      add([H, mesh(new THREE.ShapeGeometry(sh, 10).scale(scX, scY, 1).translate(s * ex, ey, gz), toon(it.c2 || '#ff5c8a'))]);
    } else if (kind === 'star_shades') {
      const sh = new THREE.Shape();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.018 : 0.042, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
        i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      add([H, mesh(new THREE.ShapeGeometry(sh, 1).scale(scX, scY, 1).translate(s * ex, ey, gz), toon(it.c2 || '#ffd56b'))]);
    } else if (kind === 'square_geek') {
      add([H, mesh(box(0.072 * scX, 0.052 * scY, 0.008).translate(s * ex, ey, gz), frame, false)]);
      add([H, new THREE.Mesh(new THREE.PlaneGeometry(0.058 * scX, 0.038 * scY).translate(s * ex, ey, gz + 0.005), clearLens)]);
    } else if (kind === 'cat_eye') {
      add([H, mesh(torus(0.036 * scX, 0.0065, 8, 22).scale(1.18, 0.72, 1).rotateZ(s * 0.24).translate(s * ex, ey + 0.003, gz), frame, false)]);
      add([H, new THREE.Mesh(new THREE.CircleGeometry(0.034 * scX, 18).scale(1.14, 0.68, 1).rotateZ(s * 0.24).translate(s * ex, ey + 0.003, gz + 0.001), darkLens)]);
    } else if (kind === 'aviator') {
      add([H, mesh(torus(0.038 * scX, 0.0045, 8, 22).scale(1.06, 0.92, 1).rotateZ(-s * 0.14).translate(s * ex, ey - 0.004, gz), frame, false)]);
      add([H, new THREE.Mesh(new THREE.CircleGeometry(0.036 * scX, 18).scale(1.04, 0.90, 1).rotateZ(-s * 0.14).translate(s * ex, ey - 0.004, gz + 0.001), darkLens)]);
    } else {
      const r = kind === 'round' ? 0.035 : 0.039;
      const sy = kind === 'round' ? 1 : 0.76;
      add([H, mesh(torus(r * scX, 0.0055, 8, 22).scale(1, sy, 1).translate(s * ex, ey, gz), frame, false)]);
      add([H, new THREE.Mesh(new THREE.CircleGeometry((r - 0.002) * scX, 18).scale(1, sy, 1).translate(s * ex, ey, gz + 0.001), kind === 'round' ? clearLens : darkLens)]);
    }
  }
  // Bridge bar (and double brow bar for aviator)
  add([H, mesh(cyl(0.0038, 0.0038, ex * 0.85, 6).rotateZ(Math.PI / 2).translate(0, ey + 0.006, bz), frame, false)]);
  if (kind === 'aviator') add([H, mesh(cyl(0.0032, 0.0032, ex * 1.4, 6).rotateZ(Math.PI / 2).translate(0, ey + 0.026, bz), frame, false)]);
}

export const GLASSES_BUILD = {
  round: (d, it, add) => makeGlasses(d, it, add, 'round'),
  shades: (d, it, add) => makeGlasses(d, it, add, 'shades'),
  heart: (d, it, add) => makeGlasses(d, it, add, 'heart'),
  cat_eye: (d, it, add) => makeGlasses(d, it, add, 'cat_eye'),
  aviator: (d, it, add) => makeGlasses(d, it, add, 'aviator'),
  cyber_visor: (d, it, add) => makeGlasses(d, it, add, 'cyber_visor'),
  monocle: (d, it, add) => makeGlasses(d, it, add, 'monocle'),
  star_shades: (d, it, add) => makeGlasses(d, it, add, 'star_shades'),
  square_geek: (d, it, add) => makeGlasses(d, it, add, 'square_geek'),
  eye_patch: (d, it, add) => makeGlasses(d, it, add, 'eye_patch'),
};
