// @ts-nocheck
// wear-outer.js — 12 distinctive outerwear pieces (new `outer` slot sitting cleanly over tops & bottoms).
import * as THREE from 'three';
import { mesh, sph, cyl, box, torus, toon } from './core.js';
import { M, A, outerShell, sleeve, band, neckBand, torsoRadiusAt, frontTorsoZ } from './wear-helpers.js';

// Tailored front lapel / edge trim following the exact torso-to-hip curve along open coat edges
function frontLapels(d, add, y0, y1, gap, inf, w, mat, tilt = 0) {
  const Y = d.Y;
  const segs = y0 < Y.waist - 0.03 ? [[Y.waist - 0.01, y1, tilt], [y0, Y.waist + 0.01, -0.06]] : [[y0, y1, tilt]];
  for (const [ya, yb, tl] of segs) {
    const h = yb - ya;
    if (h < 0.03) continue;
    const ym = (ya + yb) * 0.5;
    const r = torsoRadiusAt(d, ym) + inf + (ym < Y.waist ? 0.012 : 0);
    const ex = r * Math.sin(gap * 0.49);
    const fz = frontTorsoZ(d, ym, inf + (ym < Y.waist ? 0.014 : 0), ex);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(w, h, 0.011).rotateZ(-s * tl).rotateY(s * 0.34).translate(s * ex, ym - Y.waist, fz + 0.006), mat)]);
    }
  }
}

function outerPockets(d, add, y, inf, xFrac, w, h, mat) {
  const Y = d.Y, T = d.T;
  const px = T.hip * xFrac;
  const fz = frontTorsoZ(d, y, inf, px);
  for (const s of [1, -1]) {
    add([d.j.chest, mesh(box(w, h, 0.012).rotateY(s * 0.38).translate(s * px, y - Y.waist, fz + 0.004), mat)]);
  }
}

export const OUTER_BUILD = {
  blazer: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.032, (d.topInf || 0.014) + 0.014);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.03, Y.neck, { inf, gap: 0.78, flare: 0.016 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.024, 0, { isOuter: true, cuff: true }).forEach(add);
    frontLapels(d, add, Y.waist + 0.02, Y.neck - 0.01, 0.78, inf, 0.034, A(it), 0.14);
    // Gold buttons along lapel sides
    const gm = toon('#f2c94c');
    for (const s of [1, -1]) for (const by of [Y.waist - 0.01, Y.waist + 0.045]) {
      const bx = (torsoRadiusAt(d, by) + inf) * 0.42;
      add([d.j.chest, mesh(sph(0.008, 0.008, 0.006, 8, 6).translate(s * bx, by - Y.waist, frontTorsoZ(d, by, inf, bx) + 0.006), gm, false)]);
    }
  },

  trench_coat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    const botY = Y.knee + 0.02;
    add([d.j.chest, outerShell(d, it, botY, Y.neck, { inf, gap: 0.86, flare: 0.075 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
    frontLapels(d, add, Y.chest - 0.04, Y.neck - 0.005, 0.86, inf, 0.040, A(it), 0.18);
    // Double-breasted buttons + trench waist sash around back/sides
    const bm = toon('#3a2a24');
    for (const s of [1, -1]) for (const by of [Y.waist - 0.04, Y.waist + 0.02, Y.chest - 0.01]) {
      const bx = (torsoRadiusAt(d, by) + inf) * 0.48;
      add([d.j.chest, mesh(sph(0.008, 0.008, 0.006, 8, 6).translate(s * bx, by - Y.waist, frontTorsoZ(d, by, inf, bx) + 0.005), bm, false)]);
    }
    add([d.j.chest, mesh(cyl(T.waist + inf + 0.008, T.waist + inf + 0.008, 0.026, 20, true, 0.44, Math.PI * 2 - 0.88).scale(1, 1, 0.75).translate(0, 0.005, 0), A(it))]);
  },

  cardigan: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.030, (d.topInf || 0.014) + 0.013);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.04, Y.neck, { inf, gap: 0.96, flare: 0.018 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.024, 0, { isOuter: true, cuff: true }).forEach(add);
    frontLapels(d, add, Y.hip - 0.03, Y.neck - 0.01, 0.96, inf, 0.022, A(it), 0);
    outerPockets(d, add, Y.hip + 0.03, inf, 0.62, 0.046, 0.048, A(it));
  },

  puffer_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.044, (d.topInf || 0.014) + 0.020);
    // Closed plush puffer coat + signature quilted horizontal torus baffles!
    add([d.j.chest, outerShell(d, it, Y.hip - 0.02, Y.neck, { inf, gap: 0, flare: 0.012 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.032, 0.012, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, mesh(torus(T.neckR + 0.044, 0.034, 10, 20).scale(1, 0.72, 0.92).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.012, -0.005), A(it))]);
    for (const ry of [Y.hip + 0.04, Y.waist + 0.01, Y.chest - 0.01]) {
      const r = torsoRadiusAt(d, ry) + inf + 0.004;
      add([d.j.chest, mesh(torus(r, 0.016, 8, 22).scale(1, 0.85, 0.75).rotateX(Math.PI / 2).translate(0, ry - Y.waist, 0), M(it), false)]);
    }
    // Center front zip line
    const chH = Y.neck - Y.hip - 0.01;
    add([d.j.chest, mesh(box(0.010, chH, 0.010).translate(0, (Y.neck + Y.hip) * 0.5 - Y.waist, frontTorsoZ(d, Y.chest, inf) + 0.006), A(it), false)]);
  },

  leather_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.032, (d.topInf || 0.014) + 0.014);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.05, Y.neck, { inf, gap: 0.72, flare: 0.010 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.024, 0, { isOuter: true }).forEach(add);
    // Bold wide biker lapels + metallic silver hardware + cropped buckle belt!
    const sil = toon('#e4e7ed');
    frontLapels(d, add, Y.chest - 0.03, Y.neck - 0.005, 0.72, inf, 0.048, A(it), 0.24);
    add([d.j.chest, mesh(cyl(T.waist + inf + 0.008, T.waist + inf + 0.008, 0.024, 20, true, 0.36, Math.PI * 2 - 0.72).scale(1, 1, 0.75).translate(0, -0.042, 0), A(it))]);
    for (const s of [1, -1]) {
      const bx = (torsoRadiusAt(d, Y.chest + 0.05) + inf) * 0.45;
      add([d.j.chest, mesh(sph(0.009, 0.009, 0.007, 8, 6).translate(s * bx, Y.chest + 0.05 - Y.waist, frontTorsoZ(d, Y.chest + 0.05, inf, bx) + 0.009), sil, false)]);
      // Metallic zipper cuffs
      add([d.j.arm[s].el, mesh(cyl(T.foreR + 0.028, T.foreR + 0.028, 0.018, 14).translate(0, -d.L.armLo * 0.90, 0), sil, false)]);
    }
  },

  kimono_haori: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.08, Y.neck, { inf, gap: 0.98, flare: 0.042 })]);
    // Signature wide flowing haori bell sleeves + flat rectangular sleeve drop!
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.72, 0.028, 0.012, { isOuter: true, bell: 0.058 }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.024, d.L.armUp * 0.95, 0.14).translate(s * 0.02, -d.L.armUp * 0.65, -0.04), M(it))]);
    }
    frontLapels(d, add, Y.hip - 0.07, Y.neck - 0.005, 0.98, inf, 0.032, A(it), 0);
    // Haori front tie cord (haori-himo)
    const fz = frontTorsoZ(d, Y.chest - 0.03, inf);
    add([d.j.chest, mesh(box(T.chest * 0.85, 0.010, 0.008).translate(0, Y.chest - 0.03 - Y.waist, fz + 0.006), A(it), false)]);
    add([d.j.chest, mesh(sph(0.014, 0.014, 0.010, 8, 6).translate(0, Y.chest - 0.03 - Y.waist, fz + 0.010), A(it), false)]);
  },

  royal_cape: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.038, (d.topInf || 0.014) + 0.018);
    // Sweeping back-only royal mantle flaring cleanly behind any skirt!
    const botY = Y.knee - 0.08;
    const flare = 0.16 + (d.skirtExtra || 0) * 0.85;
    add([d.j.chest, outerShell(d, it, botY, Y.neck, { inf, gap: Math.PI * 1.18, flare, noNeckCap: true })]);
    // Plush regal standing collar + gold clasp chain across front neck!
    add([d.j.chest, mesh(torus(T.neckR + 0.048, 0.028, 10, 22, Math.PI * 1.35).rotateZ(Math.PI * 0.82).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.012, -0.008), A(it))]);
    const gm = toon('#f2c94c');
    const ny = Y.neck - 0.035;
    const fz = frontTorsoZ(d, ny, inf);
    add([d.j.chest, mesh(box(T.neckR * 2.2, 0.010, 0.008).translate(0, ny - Y.waist, fz + 0.005), gm, false)]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.017, 0.017, 0.010, 10, 8).translate(s * (T.neckR + 0.024), ny - Y.waist, fz + 0.006), gm)]);
    }
  },

  varsity_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    // Closed varsity torso in main color + contrasting sleeves in c2 + striped rib bands!
    add([d.j.chest, outerShell(d, it, Y.hip + 0.01, Y.neck, { inf, gap: 0, flare: 0.008 })]);
    const slIt = { c: it.c2 || '#ffffff', c2: it.c, p: 'plain' };
    for (const s of [1, -1]) sleeve(d, slIt, s, 0.94, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.024, 0.022)]);
    add([d.j.hips, band(T.hip + inf + 0.006, 0.015, 0.028, it, 0.75)]);
    // Snap buttons + chest varsity emblem badge
    const bm = toon('#ffffff');
    for (const by of [Y.waist - 0.03, Y.waist + 0.025, Y.chest + 0.01, Y.chest + 0.065]) {
      add([d.j.chest, mesh(sph(0.007, 0.007, 0.005, 8, 6).translate(0, by - Y.waist, frontTorsoZ(d, by, inf) + 0.005), bm, false)]);
    }
    const bx = T.chest * 0.42;
    add([d.j.chest, mesh(box(0.038, 0.042, 0.009).translate(bx, Y.chest + 0.02 - Y.waist, frontTorsoZ(d, Y.chest + 0.02, inf, bx) + 0.005), A(it))]);
  },

  lab_coat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.knee + 0.04, Y.neck, { inf, gap: 0.90, flare: 0.060 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.024, 0, { isOuter: true }).forEach(add);
    frontLapels(d, add, Y.chest - 0.02, Y.neck - 0.005, 0.90, inf, 0.036, A(it), 0.14);
    outerPockets(d, add, Y.hip - 0.02, inf, 0.68, 0.052, 0.056, A(it));
    // Breast pocket + tiny colored pen!
    const px = T.chest * 0.48;
    const pz = frontTorsoZ(d, Y.chest + 0.02, inf, px);
    add([d.j.chest, mesh(box(0.036, 0.038, 0.009).rotateY(0.32).translate(px, Y.chest + 0.02 - Y.waist, pz + 0.004), A(it))]);
    add([d.j.chest, mesh(cyl(0.0035, 0.0035, 0.032, 6).translate(px + 0.006, Y.chest + 0.044 - Y.waist, pz + 0.008), toon('#2f6fd6'), false)]);
  },

  denim_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.032, (d.topInf || 0.014) + 0.014);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.04, Y.neck, { inf, gap: 0.80, flare: 0.010 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.024, 0, { isOuter: true, cuff: true }).forEach(add);
    frontLapels(d, add, Y.waist - 0.03, Y.neck - 0.005, 0.80, inf, 0.026, A(it), 0.04);
    // Chest flap pockets + copper buttons
    const cop = toon('#d9934c');
    for (const s of [1, -1]) {
      const px = T.chest * 0.48;
      const pz = frontTorsoZ(d, Y.chest + 0.01, inf, px);
      add([d.j.chest, mesh(box(0.038, 0.034, 0.010).rotateY(s * 0.34).translate(s * px, Y.chest + 0.01 - Y.waist, pz + 0.004), A(it))]);
      add([d.j.chest, mesh(sph(0.006, 0.006, 0.005, 8, 6).translate(s * px, Y.chest + 0.02 - Y.waist, pz + 0.010), cop, false)]);
    }
  },

  fur_coat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.042, (d.topInf || 0.014) + 0.020);
    const botY = Y.hip - 0.14;
    add([d.j.chest, outerShell(d, it, botY, Y.neck, { inf, gap: 0.82, flare: 0.055 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.94, 0.032, 0.008, { isOuter: true }).forEach(add);
      // Fluffy fur cuffs
      add([d.j.arm[s].el, mesh(torus(T.foreR + 0.032, 0.018, 8, 16).rotateX(Math.PI / 2).translate(0, -d.L.armLo * 0.90, 0), A(it))]);
    }
    // Luxurious plush fur shawl collar
    add([d.j.chest, mesh(torus(T.neckR + 0.062, 0.040, 10, 22).scale(1.12, 0.72, 0.92).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.022, -0.005), A(it))]);
    frontLapels(d, add, botY + 0.02, Y.neck - 0.02, 0.82, inf, 0.038, A(it), 0);
  },

  cyber_cloak: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.036, (d.topInf || 0.014) + 0.016);
    const neon = toon(it.c2 || '#00f0ff', 'plain', '#ffffff', { emissive: it.c2 || '#00f0ff', emissiveIntensity: 0.65 });
    add([d.j.chest, outerShell(d, it, Y.hip - 0.12, Y.neck, { inf, gap: 0.92, flare: 0.048 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.96, 0.026, 0, { isOuter: true }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.058, 0.022, 0.068).rotateZ(-s * 0.25).translate(s * 0.018, 0.048, 0), M(it))]);
      add([d.j.arm[s].sh, mesh(box(0.052, 0.008, 0.072).rotateZ(-s * 0.25).translate(s * 0.018, 0.060, 0), neon, false)]);
    }
    // High futuristic standing tech collar + glowing vertical front strips!
    add([d.j.chest, neckBand(d, it, 0.062, 0.030, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.012, 0.033, neon)]);
    frontLapels(d, add, Y.hip - 0.10, Y.neck - 0.01, 0.92, inf, 0.014, neon, 0);
  },
};
