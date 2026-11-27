// @ts-nocheck
// wear-dresses.js — 16 iconic dresses & one-pieces adapting parametrically to all 6 body types.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, torus, cap, toon } from './core.js';
import { M, A, torsoShell, sleeve, pelvisShell, legShell, skirt, band, waistBand, neckBand, frontTorsoZ } from './wear-helpers.js';

function straps(d, add, mat, r = 0.0075) {
  const Y = d.Y, T = d.T;
  const y0 = Y.chest + (Y.shoulder - Y.chest) * 0.48;
  const y1 = Y.shoulder + 0.012;
  const x = T.sh * 0.54;
  const fz = frontTorsoZ(d, (y0 + y1) * 0.5, 0.012, x);
  for (const s of [1, -1]) {
    add([d.j.chest, mesh(cap(r, y1 - y0, 4, 8).rotateZ(s * 0.14).translate(s * x, (y0 + y1) * 0.5 - Y.waist, fz * 0.72), mat)]);
    add([d.j.chest, mesh(cap(r, y1 - y0, 4, 8).rotateZ(s * 0.14).translate(s * x, (y0 + y1) * 0.5 - Y.waist, -fz * 0.68), mat)]);
  }
}

export const DRESS_BUILD = {
  aodai: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Standing Mandarin collar + fitted bodice + long sleeves
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.014, 0.008)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.012).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.042, 0.014, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.010, 0.016, A(it))]);
    // Flowing wide Vietnamese silk pants in c2 underneath
    const pants = { c: it.c2 || '#ffffff', p: 'plain' };
    add([d.j.hips, pelvisShell(d, pants, { inf: 0.007 })]);
    for (const s of [1, -1]) legShell(d, pants, s, 0.97, 0.022, 0.032).forEach(add);
    // Graceful curved front & back split tà áo dài sitting cleanly outside the silk pants!
    const botY = Y.ankle + 0.07;
    const panelProf = [
      [T.hip + 0.115, botY - Y.hip],
      [T.hip + 0.072, (botY + Y.hip) * 0.5 - Y.hip],
      [T.hip + 0.026, 0.02],
    ];
    const pMat = M(it, { doubleSide: true });
    for (const rot of [0, Math.PI]) {
      const g = lathe(panelProf, 0.78, 16, Math.PI * 1.22, 2);
      g.rotateY(rot + Math.PI);
      add([d.j.hips, mesh(g, pMat)]);
    }
    // Delicate diagonal clasp trim on upper chest
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.016, 0.02);
    add([d.j.chest, mesh(box(0.085, 0.008, 0.008).rotateZ(-0.42).translate(0.02, Y.chest + 0.04 - Y.waist, fz + 0.004), A(it), false)]);
  },

  ballgown: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.42;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, topY, 0.013, 0, { tight: true, noNeckCap: true })]);
    add([d.j.chest, band(T.chest + 0.016, topY - Y.waist - 0.006, 0.016, it, 0.78)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, Y.ankle - 0.02, Math.max(0.38, T.hip + 0.25), { pleats: 10, poof: 0.025 })]);
    add([d.j.hips, waistBand(d, it, 0.030, 0.024)]);
  },

  qipao: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.013, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.24, 0.011).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.038, 0.014, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.009, 0.016, A(it))]);
    // Fitted sheath midi skirt with stylish side slit
    add([d.j.hips, pelvisShell(d, it)]);
    const botY = Y.knee - 0.04;
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, botY, T.hip * 0.90 + 0.016, { gap: 0.52, slitRot: 1.12, poof: 0.002 })]);
    // Signature diagonal chest frog-clasp border
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.015, 0.025);
    add([d.j.chest, mesh(box(0.095, 0.010, 0.008).rotateZ(-0.46).translate(0.018, Y.chest + 0.04 - Y.waist, fz + 0.004), A(it), false)]);
    for (let i = 0; i < 3; i++) {
      add([d.j.chest, mesh(sph(0.007, 0.005, 0.006, 8, 6).translate(0.042 - i * 0.012, Y.chest + 0.025 + i * 0.016 - Y.waist, fz + 0.007), toon('#f2c94c'), false)]);
    }
  },

  overall: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Crisp inner tee in c2 + denim overalls over it!
    const teeIt = { c: it.c2 || '#ffffff', p: 'plain' };
    add([d.j.chest, torsoShell(d, teeIt, Y.hip + 0.02, Y.neck, 0.012, 0.008, { noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, teeIt, s, 0.30, 0.011).forEach(add);
    // Jeans lower half
    add([d.j.hips, pelvisShell(d, it, { inf: 0.014, highWaist: true })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.015, 0.008).forEach(add);
    // Front overall bib + chest pocket + copper buttons + over-shoulder straps
    const bibH = (Y.chest + 0.04) - (Y.waist - 0.02);
    const bibY = (Y.chest + 0.04 + Y.waist - 0.02) * 0.5;
    const fz = frontTorsoZ(d, bibY, 0.018);
    add([d.j.chest, mesh(box(T.chest * 1.12, bibH, 0.016).translate(0, bibY - Y.waist, fz + 0.003), M(it))]);
    add([d.j.chest, mesh(box(T.chest * 0.55, bibH * 0.42, 0.010).translate(0, bibY - Y.waist, fz + 0.011), A(it))]);
    const cop = toon('#e6a84c');
    for (const s of [1, -1]) {
      const sx = T.chest * 0.46;
      add([d.j.chest, mesh(cap(0.012, Y.shoulder - Y.chest + 0.02, 4, 8).translate(s * sx, (Y.shoulder + Y.chest) * 0.5 - Y.waist, fz * 0.85), M(it))]);
      add([d.j.chest, mesh(cap(0.012, Y.shoulder - Y.waist + 0.01, 4, 8).translate(s * sx, (Y.shoulder + Y.waist) * 0.5 - Y.waist, -fz * 0.78), M(it))]);
      add([d.j.chest, mesh(sph(0.009, 0.009, 0.006, 8, 6).translate(s * sx, Y.chest + 0.03 - Y.waist, fz + 0.013), cop, false)]);
    }
  },

  jumpsuit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.014, 0, { tight: true })]);
    add([d.j.hips, pelvisShell(d, it, { highWaist: true })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.97, 0.020, 0.032).forEach(add);
    add([d.j.hips, waistBand(d, it, 0.030, 0.016)]);
    add([d.j.hips, mesh(box(0.034, 0.028, 0.010).translate(0, Y.waist - Y.hip - 0.006, (T.waist + 0.018) * 0.75 + 0.005), toon('#f2c94c'), false)]);
  },

  wedding_gown: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.44;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, topY, 0.014, 0, { tight: true, noNeckCap: true })]);
    // Delicate off-shoulder lace sleeves + pearl waist belt + grand multi-tier bridal skirt!
    add([d.j.chest, mesh(torus(T.sh * 0.86, 0.022, 10, 22).scale(1.10, 0.78, 0.72).rotateX(Math.PI / 2).translate(0, topY - Y.waist - 0.006, 0), A(it))]);
    const rMax = Math.max(0.42, T.hip + 0.28);
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, Y.ankle - 0.02, rMax, { pleats: 14, poof: 0.024 })]);
    add([d.j.hips, skirt(d, { ...it, c: it.c2 || '#fff4f8', p: 'plain' }, Y.waist - 0.020, Y.knee + 0.04, rMax * 0.78, { pleats: 10, poof: 0.062 })]);
    // Pearl waist trim
    const pm = toon('#fff9f5');
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      add([d.j.hips, mesh(sph(0.010, 0.010, 0.010, 8, 6).translate(Math.cos(a) * (T.waist + 0.022), Y.waist - Y.hip, Math.sin(a) * (T.waist + 0.022) * 0.76), pm, false)]);
    }
  },

  school_uniform: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Crisp white sailor shirt + colored sailor collar & pleated school skirt!
    const white = { c: '#ffffff', c2: it.c, p: 'plain' };
    add([d.j.chest, torsoShell(d, white, Y.waist - 0.01, Y.neck, 0.014, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, white, s, 0.34, 0.013, 0, { cuff: true }).forEach(add);
    add([d.j.chest, mesh(box(T.sh * 1.42, 0.11, 0.012).translate(0, Y.shoulder - Y.waist - 0.04, -T.chest * 0.76 - 0.022), M(it))]);
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.016);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.030, 0.105, 0.009).rotateZ(-s * 0.38).translate(s * 0.035, Y.chest + 0.045 - Y.waist, fz + 0.005), M(it))]);
    // Red/accent necktie bow
    add([d.j.chest, mesh(sph(0.018, 0.014, 0.012, 8, 6).translate(0, Y.chest - 0.006 - Y.waist, frontTorsoZ(d, Y.chest, 0.018) + 0.008), A(it))]);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.014, 0.056, 0.006).rotateZ(s * 0.22).translate(s * 0.012, Y.chest - 0.036 - Y.waist, frontTorsoZ(d, Y.chest - 0.03, 0.018) + 0.006), A(it))]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, Y.knee + 0.04, T.hip + 0.125, { pleats: 14 })]);
    add([d.j.hips, waistBand(d, it, 0.024, 0.014)]);
  },

  sundress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.50;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, topY, 0.012, 0, { tight: true, noNeckCap: true })]);
    straps(d, add, M(it), 0.0075);
    add([d.j.hips, skirt(d, it, Y.waist - 0.005, Y.knee - 0.02, T.hip + 0.140)]);
    add([d.j.hips, waistBand(d, it, 0.022, 0.014)]);
  },

  minidress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, Y.neck, 0.013, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.30, 0.014, 0.024).forEach(add);
    add([d.j.hips, skirt(d, it, Y.waist - 0.006, Y.hip - d.L.legUp * 0.56, T.hip + 0.095, { pleats: 10 })]);
    add([d.j.hips, waistBand(d, it, 0.024, 0.015)]);
  },

  mermaid_gown: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.42;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, topY, 0.013, 0, { tight: true, noNeckCap: true })]);
    add([d.j.chest, band(T.chest + 0.015, topY - Y.waist - 0.006, 0.015, it, 0.78)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, Y.ankle - 0.01, Math.max(0.32, T.hip + 0.18), { mermaid: true, pleats: 8 })]);
    add([d.j.hips, waistBand(d, it, 0.024, 0.014)]);
  },

  hanfu_gown: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, Y.neck, 0.015, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.018, 0, { bell: 0.055, cuff: true }).forEach(add);
    // Crossed collar + high-waisted flowing pleated robe + celestial floating silk ribbon (phi bạch)!
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.017);
    add([d.j.chest, mesh(box(0.026, 0.15, 0.010).rotateZ(0.42).translate(-0.012, Y.chest + 0.02 - Y.waist, fz + 0.005), A(it))]);
    add([d.j.chest, mesh(box(0.024, 0.13, 0.010).rotateZ(-0.42).translate(0.018, Y.chest + 0.03 - Y.waist, fz + 0.003), A(it))]);
    add([d.j.hips, skirt(d, it, Y.waist + 0.02, Y.ankle - 0.01, T.hip + 0.195, { pleats: 14 })]);
    add([d.j.hips, band(T.waist + 0.028, Y.waist - Y.hip + 0.02, 0.036, it, 0.76)]);
    // Floating silk halo ribbon arching behind shoulders
    add([d.j.chest, mesh(torus(T.sh + 0.10, 0.012, 6, 20, Math.PI * 1.15).rotateZ(-0.18).translate(0, Y.shoulder - Y.waist - 0.04, -0.10), A(it))]);
  },

  gothic_lolita: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.008, Y.neck, 0.014, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.015, 0.028).forEach(add);
    // White lace apron pinafore bib + big bow + fluffy layered lolita skirt!
    const fz = frontTorsoZ(d, Y.chest, 0.016);
    add([d.j.chest, mesh(box(T.chest * 0.78, (Y.shoulder - Y.waist) * 0.80, 0.010).translate(0, Y.chest - Y.waist, fz + 0.008), A(it))]);
    add([d.j.chest, mesh(sph(0.026, 0.016, 0.012, 10, 8).translate(0, Y.chest + 0.04 - Y.waist, fz + 0.014), M(it))]);
    const botY = Y.knee + 0.01;
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, botY, T.hip + 0.185, { pleats: 16, poof: 0.042 })]);
    add([d.j.hips, mesh(cyl(T.hip + 0.180, T.hip + 0.194, 0.020, 24, true).scale(1, 1, 0.75).translate(0, botY - Y.hip + 0.012, 0), A(it))]);
    add([d.j.hips, waistBand(d, it, 0.028, 0.024)]);
  },

  pirate_dress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.44;
    // White billowy off-shoulder blouse + dark corset waist + layered pirate skirt!
    const white = { c: '#f6e7d8', p: 'plain' };
    add([d.j.chest, torsoShell(d, white, Y.waist - 0.008, topY, 0.013, 0, { tight: true, noNeckCap: true })]);
    for (const s of [1, -1]) sleeve(d, white, s, 0.88, 0.016, 0.024, { bell: 0.018 }).forEach(add);
    // Corset cincher band
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#2b2533', p: 'plain' }, Y.waist - 0.01, Y.chest + 0.01, 0.017, 0, { tight: true, noNeckCap: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.008, Y.knee - 0.04, T.hip + 0.165, { pleats: 10, gap: 0.58, slitRot: 0.55 })]);
    add([d.j.hips, skirt(d, { c: it.c2 || '#2b2533', p: 'plain' }, Y.waist - 0.008, Y.hip - d.L.legUp * 0.45, T.hip + 0.125, { pleats: 8 })]);
  },

  cyber_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const neon = toon(it.c2 || '#00f0ff', 'plain', '#ffffff', { emissive: it.c2 || '#00f0ff', emissiveIntensity: 0.65 });
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.015, 0, { tight: true })]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.012 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.96, 0.014).forEach(add);
      legShell(d, it, s, 0.96, 0.013, 0).forEach(add);
      add([d.j.arm[s].sh, mesh(sph(T.armR + 0.022, 0.024, T.armR + 0.020, 12, 8).translate(s * 0.010, 0.032, 0), M(it))]);
      // Neon thigh stripe
      add([d.j.leg[s].th, mesh(box(0.010, d.L.legUp * 0.78, 0.016).translate(s * (T.legR + 0.015), -d.L.legUp * 0.46, 0), neon, false)]);
    }
    add([d.j.chest, neckBand(d, it, 0.046, 0.018, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.010, 0.021, neon)]);
    add([d.j.hips, waistBand(d, it, 0.022, 0.016, neon)]);
    add([d.j.chest, mesh(sph(0.020, 0.020, 0.010, 10, 8).translate(0, Y.chest + 0.01 - Y.waist, frontTorsoZ(d, Y.chest + 0.01, 0.018) + 0.005), neon, false)]);
  },

  suit_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Full tailored dress suit: crisp white dress shirt + necktie + structured jacket + matching slacks!
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.waist - 0.01, Y.neck, 0.012, 0, { tight: true, noRecord: true })]);
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.024, 0.014, { gap: 0.78 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.018).forEach(add);
    // Tie + lapels cleanly outside open suit front
    const fz = frontTorsoZ(d, Y.chest + 0.01, 0.016);
    add([d.j.chest, mesh(box(0.022, (Y.shoulder - Y.waist) * 0.65, 0.008).translate(0, Y.chest - 0.01 - Y.waist, fz + 0.005), A(it))]);
    const lfz = frontTorsoZ(d, Y.chest + 0.02, 0.026, T.chest * 0.36);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.028, (Y.shoulder - Y.waist) * 0.66, 0.011).rotateZ(-s * 0.22).rotateY(s * 0.30).translate(s * T.chest * 0.38, Y.chest + 0.02 - Y.waist, lfz + 0.008), M(it))]);
    }
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.012, 0.004).forEach(add);
  },

  onesie: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Cozy full-body animal plush onesie + belly oval + hood ring + cute round puff tail!
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.neck, 0.028, 0.010)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.022 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.022, 0.006, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.95, 0.022, 0.006, { jogger: true, cuff: true }).forEach(add);
    }
    add([d.j.chest, mesh(torus(T.neckR + 0.044, 0.032, 10, 20).scale(1, 0.65, 1.05).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.024, -0.024), M(it))]);
    const by = (Y.waist + Y.chest) * 0.48;
    add([d.j.chest, mesh(sph(T.chest * 0.68, (Y.chest - Y.hip) * 0.48, 0.024, 14, 10).translate(0, by - Y.waist, frontTorsoZ(d, by, 0.026) - 0.004), A(it), false)]);
    // Adorable round puff tail on back of hips!
    add([d.j.hips, mesh(sph(0.056, 0.056, 0.056, 12, 8).translate(0, -0.01, -(T.hip * 0.75 + 0.055)), A(it))]);
  },
};
