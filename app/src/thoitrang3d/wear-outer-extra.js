// @ts-nocheck
// wear-outer-extra.js — 16 additional outerwear pieces (world coats + Ninja Lead, Chăn Con Công, Áo Mưa Nilon!).
import * as THREE from 'three';
import { mesh, sph, cyl, box, cone, torus, toon } from './core.js';
import { M, A, outerShell, sleeve, band, neckBand, torsoRadiusAt, frontTorsoZ } from './wear-helpers.js';

function simpleLapels(d, add, y0, y1, gap, inf, w, mat) {
  const Y = d.Y;
  const h = y1 - y0;
  const ym = (y0 + y1) * 0.5;
  const r = torsoRadiusAt(d, ym) + inf;
  const ex = r * Math.sin(gap * 0.49);
  const fz = frontTorsoZ(d, ym, inf, ex);
  for (const s of [1, -1]) {
    add([d.j.chest, mesh(box(w, h, 0.011).rotateY(s * 0.34).translate(s * ex, ym - Y.waist, fz + 0.006), mat)]);
  }
}

export const OUTER_BUILD_EXTRA = {
  bomber_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.036, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.04, Y.neck, { inf, gap: 0.58, flare: 0.008 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.028, 0.010, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.024, 0.024, A(it))]);
    add([d.j.chest, mesh(cyl(T.waist + inf + 0.010, T.waist + inf + 0.010, 0.026, 22, true, 0.28, Math.PI * 2 - 0.56).scale(1, 1, 0.76).translate(0, -0.036, 0), A(it))]);
  },

  windbreaker: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.01, Y.neck, { inf, gap: 0, flare: 0.012 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.026, 0, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, band(T.chest + inf + 0.008, Y.chest - Y.waist, 0.048, it, 0.78, A(it))]);
    add([d.j.chest, mesh(torus(T.neckR + 0.045, 0.030, 8, 18).scale(1, 0.65, 1.05).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.022, -0.024), A(it))]);
  },

  parka: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.040, (d.topInf || 0.014) + 0.018);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.14, Y.neck, { inf, gap: 0.52, flare: 0.042 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.030, 0.006, { isOuter: true, cuff: true }).forEach(add);
    // Fluffy fur-trimmed hood behind neck!
    add([d.j.chest, mesh(torus(T.neckR + 0.062, 0.042, 10, 22).scale(1.1, 0.75, 1.05).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.018, -0.022), A(it))]);
  },

  peacoat: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.09, Y.neck, { inf, gap: 0.45, flare: 0.028 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
    simpleLapels(d, add, Y.chest - 0.02, Y.neck - 0.01, 0.45, inf, 0.042, A(it));
    for (const s of [1, -1]) for (const by of [Y.waist - 0.03, Y.waist + 0.03, Y.chest + 0.01]) {
      const bx = (torsoRadiusAt(d, by) + inf) * 0.34;
      add([d.j.chest, mesh(sph(0.009, 0.009, 0.006, 8, 6).translate(s * bx, by - Y.waist, frontTorsoZ(d, by, inf, bx) + 0.006), A(it), false)]);
    }
  },

  tailcoat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.032, (d.topInf || 0.014) + 0.014);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.02, Y.neck, { inf, gap: 0.85, flare: 0.010 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.024, 0, { isOuter: true, cuff: true }).forEach(add);
    simpleLapels(d, add, Y.waist, Y.neck - 0.01, 0.85, inf, 0.038, A(it));
    // Long split swallowtails hanging behind knees!
    const tailH = Y.waist - Y.knee;
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(T.hip * 0.68, tailH, 0.014).rotateX(0.14).translate(s * T.hip * 0.44, -tailH * 0.52, -(T.hip * 0.78 + inf + 0.02)), M(it))]);
    }
  },

  wizard_cloak: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.040, (d.topInf || 0.014) + 0.018);
    add([d.j.chest, outerShell(d, it, Y.ankle + 0.06, Y.neck, { inf, gap: 0.95, flare: 0.16 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.028, 0, { isOuter: true, bell: 0.058 }).forEach(add);
    simpleLapels(d, add, Y.ankle + 0.08, Y.neck - 0.01, 0.95, inf, 0.028, A(it));
    add([d.j.chest, mesh(torus(T.neckR + 0.056, 0.036, 10, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.012, -0.02), M(it))]);
  },

  vampire_cape: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.038, (d.topInf || 0.014) + 0.018);
    add([d.j.chest, outerShell(d, it, Y.ankle + 0.08, Y.neck, { inf, gap: Math.PI * 1.15, flare: 0.18 + (d.skirtExtra || 0) * 0.8, noNeckCap: true })]);
    // Tall dramatic Dracula standing collar behind head!
    add([d.j.chest, mesh(cyl(T.neckR + 0.14, T.neckR + 0.06, 0.19, 20, true, Math.PI * 0.65, Math.PI * 1.1).translate(0, Y.neck - Y.waist + 0.085, -0.03), A(it, { doubleSide: true }))]);
  },

  bathrobe: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.038, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, outerShell(d, it, Y.knee + 0.02, Y.neck, { inf, gap: 0.42, flare: 0.055 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.90, 0.028, 0, { isOuter: true, bell: 0.020, cuff: true }).forEach(add);
    simpleLapels(d, add, Y.waist, Y.neck - 0.01, 0.42, inf, 0.044, A(it));
    add([d.j.chest, band(T.waist + inf + 0.012, 0.0, 0.034, it, 0.78, A(it))]);
  },

  grad_gown: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.038, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, outerShell(d, it, Y.knee - 0.05, Y.neck, { inf, gap: 0, flare: 0.12 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.90, 0.028, 0, { isOuter: true, bell: 0.064 }).forEach(add);
    // Colorful academic stole draped around neck & down chest!
    const fz = frontTorsoZ(d, Y.chest, inf + 0.008);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.044, (Y.neck - Y.hip) * 0.95, 0.012).translate(s * 0.052, (Y.chest + Y.waist) * 0.5 - Y.waist, fz + 0.006), A(it))]);
    }
  },

  // ===== SIÊU LẦY LỘI OUTERWEAR (7) =====
  ninja_sun_coat: (d, it, add) => {
    // Áo chống nắng Ninja Lead: kín cổ tới bàn tay + mũ trùm kín gáy!
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.036, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.06, Y.neck, { inf, gap: 0, flare: 0.030 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.99, 0.028, 0, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.085, 0.030, M(it))]);
    add([d.j.chest, mesh(torus(T.neckR + 0.058, 0.038, 10, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist, -0.02), A(it))]);
  },

  plastic_raincoat: (d, it, add) => {
    // Áo mưa cánh dơi nilon 5k trong suốt phồng rộng che cả tay!
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.046, (d.topInf || 0.014) + 0.022);
    const rainM = toon(it.c || '#6ec6ff', it.p || 'plain', it.c2 || '#ffffff', { opacity: 0.58, doubleSide: true });
    add([d.j.chest, outerShell(d, it, Y.knee - 0.04, Y.neck, { inf, gap: 0, flare: 0.22, mat: rainM })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.85, 0.034, 0.016, { isOuter: true, bell: 0.055, mat: rainM }).forEach(add);
    add([d.j.chest, mesh(torus(T.neckR + 0.054, 0.034, 8, 18).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.01, -0.025), rainM)]);
  },

  peacock_blanket: (d, it, add) => {
    // Chăn Con Công dày cộp quấn quanh người lên sàn diễn!
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.050, (d.topInf || 0.014) + 0.026);
    const blkM = toon(it.c || '#c92a46', 'chan_con_cong', it.c2 || '#ffd56b', { doubleSide: true });
    add([d.j.chest, outerShell(d, it, Y.ankle + 0.04, Y.shoulder + 0.02, { inf, gap: 0.45, flare: 0.14, mat: blkM, noNeckCap: true })]);
    add([d.j.chest, mesh(torus(T.sh + 0.05, 0.042, 10, 24).scale(1.05, 0.78, 0.82).rotateX(Math.PI / 2).translate(0, Y.shoulder - Y.waist - 0.01, 0), blkM)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.20);
  },

  tarp_cape: (d, it, add) => {
    // Áo choàng bạt xanh cam công trường buộc dây quanh cổ!
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.040, (d.topInf || 0.014) + 0.018);
    const stripeM = toon(it.c || '#2f6fd6', 'stripe', it.c2 || '#ff9f5a', { doubleSide: true });
    add([d.j.chest, outerShell(d, it, Y.ankle + 0.06, Y.neck, { inf, gap: Math.PI * 1.05, flare: 0.20, mat: stripeM, noNeckCap: true })]);
    add([d.j.chest, neckBand(d, it, 0.020, 0.020, toon('#ff9f5a'))]);
  },

  puffer_vest: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.042, (d.topInf || 0.014) + 0.018);
    add([d.j.chest, outerShell(d, it, Y.hip, Y.shoulder + 0.01, { inf, gap: 0.42, flare: 0.010, noNeckCap: true })]);
    for (const ry of [Y.waist - 0.02, Y.waist + 0.04, Y.chest + 0.02]) {
      const r = torsoRadiusAt(d, ry) + inf + 0.004;
      add([d.j.chest, mesh(torus(r, 0.015, 8, 20, Math.PI * 2 - 0.44).scale(1, 0.82, 0.76).rotateX(Math.PI / 2).rotateZ(0.22).translate(0, ry - Y.waist, 0), M(it), false)]);
    }
  },

  shawl_stole: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.036, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, mesh(torus(T.sh + 0.04, 0.052, 12, 26).scale(1.12, 0.78, 0.78).rotateX(Math.PI / 2).translate(0, Y.shoulder - Y.waist - 0.04, 0), M(it))]);
    const fz = frontTorsoZ(d, Y.chest - 0.02, inf + 0.01);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.048, 0.14, 0.036, 10, 8).translate(s * (T.sh * 0.72), Y.chest - 0.05 - Y.waist, fz * 0.9), A(it))]);
    }
  },

  shipper_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.01, Y.neck, { inf, gap: 0, flare: 0.010 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
    const ref = toon('#ffffff', 'plain', '#fff', { emissive: '#ffffff', emissiveIntensity: 0.45 });
    add([d.j.chest, band(T.chest + inf + 0.008, Y.chest - Y.waist, 0.028, it, 0.78, ref)]);
    add([d.j.chest, neckBand(d, it, 0.026, 0.022, A(it))]);
  },
};
