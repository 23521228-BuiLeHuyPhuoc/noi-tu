// @ts-nocheck
// wear-bottoms.js — 18 diverse bottoms (9 pants/shorts + 9 distinctive skirts) following all fit rules.
import { mesh, sph, cyl, box, toon } from './core.js';
import { M, A, pelvisShell, legShell, skirt, band, waistBand, topCovers } from './wear-helpers.js';

function maybeWaist(d, it, add, h = 0.024, extra = 0.011, mat = null) {
  if (!topCovers(d)) add([d.j.hips, waistBand(d, it, h, extra, mat)]);
}

function addBeltBuckle(d, it, add) {
  if (topCovers(d)) return;
  const wy = d.Y.waist - d.Y.hip - 0.006;
  const fz = (d.T.waist + 0.013) * 0.75;
  add([d.j.hips, mesh(box(0.030, 0.024, 0.010).translate(0, wy, fz + 0.004), toon('#f2c94c'), false)]);
}

export const BOTTOM_BUILD = {
  // ===== PANTS & SHORTS (9) =====
  jeans: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.011, 0.002).forEach(add);
    maybeWaist(d, it, add, 0.024, 0.011);
    addBeltBuckle(d, it, add);
  },

  wide_trousers: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { highWaist: !topCovers(d) })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.97, 0.022, 0.036).forEach(add);
    maybeWaist(d, it, add, 0.028, 0.012);
  },

  cargo_pants: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.96, 0.018, 0.012, { cuff: true }).forEach(add);
      // Chunky 3D side thigh cargo pockets + flaps
      const { th } = d.j.leg[s];
      add([th, mesh(box(0.024, 0.088, 0.068).translate(s * (T.legR + 0.020), -L.legUp * 0.56, 0.005), A(it))]);
      add([th, mesh(box(0.028, 0.020, 0.072).translate(s * (T.legR + 0.022), -L.legUp * 0.42, 0.005), M(it))]);
    }
    maybeWaist(d, it, add, 0.026, 0.012);
    addBeltBuckle(d, it, add);
  },

  tailored_slacks: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.94, 0.009, -0.002).forEach(add);
    maybeWaist(d, it, add, 0.022, 0.010);
    addBeltBuckle(d, it, add);
  },

  shorts: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.28, 0.016, 0.005).forEach(add);
      const r = T.legR * 0.92 + 0.020;
      add([d.j.leg[s].th, mesh(cyl(r, r, 0.020, 18).translate(0, -L.legUp * 0.52, 0), A(it))]);
    }
    maybeWaist(d, it, add, 0.024, 0.011);
  },

  biker_shorts: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it, { highWaist: !topCovers(d) })]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.42, 0.009, 0).forEach(add);
      // Sporty side racing stripe
      add([d.j.leg[s].th, mesh(box(0.008, L.legUp * 0.72, 0.016).translate(s * (T.legR + 0.010), -L.legUp * 0.44, 0), A(it), false)]);
    }
    maybeWaist(d, it, add, 0.026, 0.011);
  },

  joggers: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.95, 0.020, 0.008, { jogger: true, cuff: true }).forEach(add);
      add([d.j.leg[s].th, mesh(box(0.008, L.legUp * 0.88, 0.015).translate(s * (T.legR + 0.020), -L.legUp * 0.48, 0), A(it), false)]);
      add([d.j.leg[s].kn, mesh(box(0.008, L.legLo * 0.80, 0.014).translate(s * (T.calfR + 0.020), -L.legLo * 0.44, 0), A(it), false)]);
    }
    maybeWaist(d, it, add, 0.026, 0.012);
  },

  bell_bottoms: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.97, 0.011, 0.062, { bell: true }).forEach(add);
    maybeWaist(d, it, add, 0.026, 0.011);
  },

  bermuda: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.50, 0.016, 0.006).forEach(add);
      const r = T.legR * 0.78 + 0.020;
      add([d.j.leg[s].th, mesh(cyl(r, r, 0.018, 18).translate(0, -L.legUp * 0.94, 0), A(it))]);
    }
    maybeWaist(d, it, add, 0.024, 0.011);
  },

  // ===== SKIRTS (9) =====
  mini_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.hip - d.L.legUp * 0.54;
    const rBot = T.hip + 0.072;
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, botY, rBot)]);
    add([d.j.hips, mesh(cyl(rBot - 0.004, rBot + 0.005, 0.018, 22, true).scale(1, 1, 0.75).translate(0, botY - Y.hip + 0.010, 0), A(it))]);
    maybeWaist(d, it, add, 0.022, 0.011);
  },

  pleated_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.knee + 0.03;
    const rBot = T.hip + 0.125;
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, botY, rBot, { pleats: 14 })]);
    maybeWaist(d, it, add, 0.024, 0.011);
  },

  pencil_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.knee - 0.01;
    // Sleek narrow tailored silhouette tapering slightly toward knee
    add([d.j.hips, skirt(d, it, Y.waist - 0.010, botY, T.hip * 0.88 + 0.012, { poof: 0.002 })]);
    maybeWaist(d, it, add, 0.024, 0.011);
    addBeltBuckle(d, it, add);
  },

  aline_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.knee + 0.01;
    const rBot = T.hip + 0.105;
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, botY, rBot)]);
    maybeWaist(d, it, add, 0.024, 0.011);
    // Decorative front button line
    const bm = A(it);
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      const by = (Y.waist - 0.04) * (1 - f) + (botY + 0.05) * f;
      const r = (T.hip + 0.016) * (1 - f) + rBot * f;
      add([d.j.hips, mesh(sph(0.008, 0.008, 0.006, 8, 6).translate(0, by - Y.hip, r * 0.75 + 0.004), bm, false)]);
    }
  },

  maxi_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.ankle + 0.03;
    const rBot = T.hip + 0.165;
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, botY, rBot)]);
    add([d.j.hips, mesh(cyl(rBot - 0.004, rBot + 0.005, 0.024, 24, true).scale(1, 1, 0.75).translate(0, botY - Y.hip + 0.014, 0), A(it))]);
    maybeWaist(d, it, add, 0.024, 0.011);
  },

  tutu_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const midY = Y.hip - d.L.legUp * 0.44;
    const rOuter = T.hip + 0.175;
    // Two cascading ruffled ballet tutu tiers with clean clearance (zero z-fighting!)
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, midY - 0.04, rOuter, { pleats: 18, poof: 0.032 })]);
    add([d.j.hips, skirt(d, { ...it, c: it.c2 || '#ffffff', p: 'plain' }, Y.waist - 0.022, midY + 0.035, rOuter + 0.024, { pleats: 16, poof: 0.058 })]);
    maybeWaist(d, it, add, 0.028, 0.016);
  },

  tiered_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.knee - d.L.legLo * 0.35;
    const y1 = Y.hip - d.L.legUp * 0.38;
    const y2 = Y.knee + 0.01;
    // 3 stepped ruffled tiers with accent lace bands
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, y1, T.hip + 0.085, { pleats: 10 })]);
    add([d.j.hips, skirt(d, it, y1 + 0.03, y2, T.hip + 0.145, { pleats: 12 })]);
    add([d.j.hips, skirt(d, it, y2 + 0.03, botY, T.hip + 0.195, { pleats: 14 })]);
    add([d.j.hips, band(T.hip + 0.088, y1 - Y.hip + 0.01, 0.014, it, 0.75)]);
    add([d.j.hips, band(T.hip + 0.148, y2 - Y.hip + 0.01, 0.014, it, 0.75)]);
    add([d.j.hips, band(T.hip + 0.198, botY - Y.hip + 0.012, 0.016, it, 0.75)]);
    maybeWaist(d, it, add, 0.024, 0.011);
  },

  slit_maxi: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.ankle + 0.03;
    // High-slit evening maxi skirt (slit open on left side revealing leg cleanly!)
    add([d.j.hips, pelvisShell(d, it)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.012, botY, T.hip + 0.115, { gap: 0.78, slitRot: 1.05 })]);
    maybeWaist(d, it, add, 0.026, 0.011);
  },

  silk_pants: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { highWaist: !topCovers(d) })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.98, 0.026, 0.048).forEach(add);
    maybeWaist(d, it, add, 0.024, 0.011);
  },
};

// Back-compat aliases from v4
BOTTOM_BUILD.wide = BOTTOM_BUILD.wide_trousers;
BOTTOM_BUILD.mini = BOTTOM_BUILD.mini_skirt;
BOTTOM_BUILD.pleated = BOTTOM_BUILD.pleated_skirt;
BOTTOM_BUILD.maxi = BOTTOM_BUILD.maxi_skirt;
