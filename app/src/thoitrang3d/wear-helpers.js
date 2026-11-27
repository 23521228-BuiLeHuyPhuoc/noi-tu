// @ts-nocheck
// wear-helpers.js — parametric garment fitting engine built from each body's own profile (d.T, d.Y, d.L).
// Guarantees all fit rules across all 6 body types + height slider + outer-over-top-over-bottom layering.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, toon } from './core.js';
import { applyTorsoContour } from './body.js';

export const M = (it, opts) => toon(it.c, it.p || 'plain', it.c2 || '#ffffff', opts);
export const A = (it, opts) => toon(it.c2 || '#ffffff', 'plain', '#ffffff', opts);

export const SHORT_TOPS = new Set(['crop', 'crop_top', 'tube_top', 'idol_crop', 'ao_yem', 'crop_hoodie', 'hanbok_jeogori', 'bare_chest_towel', 'dad_beer_belly', 'bolero_shrug', 'sumo_mawashi_top']);

const SLEEVELESS_OUTER = new Set(['royal_cape', 'vampire_cape', 'tarp_cape', 'puffer_vest', 'shawl_stole', 'peacock_blanket', 'fishing_vest_dad', 'angel_feather_cape', 'poncho_fringe', 'fur_stole_wrap', 'astronaut_jet_rig', 'quilt_blanket_wrap', 'bedsheet_toga', 'shower_curtain_cape', 'umbrella_cloak', 'leaf_bush_ghillie']);

export function topCovers(d) {
  const t = d.outfit && d.outfit.top;
  const bid = t && ((t.v3d && t.v3d.base) || t.id);
  return !!(bid && !SHORT_TOPS.has(bid));
}

export function hasOuterSleeves(d) {
  const o = d.outfit && d.outfit.outer;
  const bid = o && ((o.v3d && o.v3d.base) || o.id);
  return !!(bid && !SLEEVELESS_OUTER.has(bid));
}

// Piecewise body torso radius at world height y (including trapezius slope for broad male bodies)
export function torsoRadiusAt(d, y) {
  const T = d.T, Y = d.Y;
  const shH = Y.shoulder - Y.waist;
  const nkH = Y.neck - Y.waist;
  const trap = T.trap || 0;
  const trapR = T.neckR * 1.15 + trap * (T.sh * 0.56 - T.neckR);
  const prof = [
    [T.hip * 0.94, Y.hip - 0.04],
    [T.hip, Y.hip + 0.015],
    [T.hip * 0.91, (Y.hip + Y.waist) * 0.5],
    [T.waist, Y.waist],
    [T.chest, Y.chest],
    [T.sh * (0.98 + trap * 0.04), Y.waist + shH * 0.84],
    [T.sh * (0.72 + trap * 0.14), Y.shoulder],
    [trapR, Y.waist + (shH + nkH) * 0.55],
    [T.neckR * 1.08, Y.neck],
  ];
  if (y <= prof[0][1]) return prof[0][0];
  for (let i = 0; i < prof.length - 1; i++) {
    if (y <= prof[i + 1][1]) {
      const t = (y - prof[i][1]) / Math.max(0.0001, prof[i + 1][1] - prof[i][1]);
      return prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t;
    }
  }
  return prof[prof.length - 1][0];
}

// Exact front surface Z at (x, y) for placing lapels, buttons, ties, necklaces, pockets flush on torso
export function frontTorsoZ(d, y, inf = 0.014, x = 0) {
  const T = d.T, Y = d.Y;
  const r = torsoRadiusAt(d, y) + inf;
  const nx = Math.min(0.95, Math.abs(x) / Math.max(0.02, r));
  let z = Math.sqrt(Math.max(0.02, 1 - nx * nx)) * r * 0.75;
  const span = Math.max(0.18, Y.shoulder - Y.waist);
  const dy = (y - Y.chest) / span;
  const front = Math.sqrt(Math.max(0.02, 1 - nx * nx));
  if (T.bust > 0) {
    const t = (dy + 0.04) / 0.30;
    const vBand = Math.exp(-(t * t));
    const ax = Math.min(1, Math.abs(x) / Math.max(0.05, T.chest * 0.6));
    const twin = 0.88 + 0.12 * Math.sin(ax * Math.PI);
    z += T.bust * vBand * Math.pow(front, 1.55) * twin;
  }
  if (T.pec > 0) {
    const t = (dy - 0.06) / 0.36;
    const vBand = Math.exp(-(t * t));
    z += T.pec * vBand * Math.pow(front, 1.15);
  }
  return z;
}

// Main torso shell (tops & dress bodices). Enforces fit rules: min inflate & hem flare below waist, sz = 0.75.
export function torsoShell(d, it, y0, y1, inf = 0.013, flare = 0, opts = {}) {
  const Y = d.Y, T = d.T;
  if (y0 < Y.waist - 0.01 && !opts.tight) {
    inf = Math.max(inf, 0.019);
    flare = Math.max(flare, 0.014);
  }
  if (!opts.noRecord) d.topInf = Math.max(d.topInf || 0, inf);

  const steps = opts.steps || 9;
  const P = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    const fl = i === 0 ? flare : flare * Math.max(0, 1 - t * 2.5);
    P.push([torsoRadiusAt(d, y) + inf + fl, y - Y.waist]);
  }
  if (y1 >= Y.neck - 0.012 && !opts.noNeckCap) {
    P.push([T.neckR * 1.06 + inf * 0.45, Y.neck - Y.waist + 0.01]);
  }
  const gap = opts.gap || 0;
  const g = lathe(P, 0.75, opts.segs || 18, gap, 1);
  applyTorsoContour(g, T, Y, Y.waist);
  const mat = opts.mat || M(it, gap > 0 ? { doubleSide: true } : undefined);
  return mesh(g, mat, opts.outline !== false);
}

// Outer layer shell — ALWAYS sits strictly outside top/dress AND bottoms (and flares over skirts!).
export function outerShell(d, it, y0, y1, opts = {}) {
  const Y = d.Y, T = d.T;
  const baseInf = opts.inf ?? 0.032;
  const inf = Math.max(baseInf, (d.topInf || 0.015) + 0.014);
  let flare = opts.flare ?? 0.018;
  if (y0 < Y.hip + 0.02) {
    flare = Math.max(flare, 0.032 + (d.skirtExtra || 0) * 0.65);
  }
  const steps = opts.steps || 8;
  const P = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    const belowWaist = y < Y.waist ? (Y.waist - y) / Math.max(0.12, Y.waist - y0) : 0;
    const fl = belowWaist * flare + (i === 0 ? 0.008 : 0);
    P.push([torsoRadiusAt(d, y) + inf + fl, y - Y.waist]);
  }
  if (y1 >= Y.neck - 0.012 && !opts.noNeckCap) {
    P.push([T.neckR * 1.12 + inf * 0.55, Y.neck - Y.waist + 0.012]);
  }
  const gap = opts.gap ?? 0.92;
  const g = lathe(P, 0.75, opts.segs || 18, gap, 1);
  applyTorsoContour(g, T, Y, Y.waist);
  const mat = opts.mat || M(it, gap > 0 ? { doubleSide: true } : undefined);
  d.outerInf = Math.max(d.outerInf || 0, inf);
  return mesh(g, mat, opts.outline !== false);
}

// Parametric sleeve adapting to every body's arm thickness & deltoid shoulder sphere (frac: 0..1 of full arm)
export function sleeve(d, it, s, frac, inf = 0.012, puff = 0, opts = {}) {
  const { sh, el } = d.j.arm[s];
  const T = d.T, L = d.L;
  const isOuter = !!opts.isOuter;
  let effInf = isOuter ? Math.max(inf, (d.topSleeveInf || 0.013) + 0.011) : inf;
  let effPuff = (!isOuter && hasOuterSleeves(d)) ? puff * 0.2 : puff;
  if (!isOuter) d.topSleeveInf = Math.max(d.topSleeveInf || 0, effInf + effPuff * 0.35);

  const totalLen = L.armUp + L.armLo;
  const len = Math.min(totalLen * 0.98, frac * totalLen);
  const upLen = Math.min(len, L.armUp);
  const mat = opts.mat || M(it, opts.bell ? { doubleSide: true } : undefined);
  const bell = opts.bell || 0;
  const out = [];

  const deltoid = T.armR * ((T.trap || 0) > 0.5 ? 1.12 : 1.04);
  const rCap = deltoid + effInf;
  const rMid = T.armR * ((T.trap || 0) > 0.5 ? 1.06 : 0.98) + effInf + effPuff;
  const rBot = T.foreR * 1.06 + effInf + effPuff * 0.5 + (len <= L.armUp ? bell : 0);

  out.push([sh, mesh(lathe([
    [rBot, -upLen],
    [rMid, -upLen * 0.46],
    [rCap + effPuff * 0.45, 0.0],
    [rCap * 0.90 + effPuff * 0.20, deltoid * 0.34],
    [rCap * 0.64, deltoid * 0.80 + effInf * 0.25],
    [0.008, deltoid * 1.03 + effInf * 0.48],
  ], 1, 14, 0, 1), mat)]);

  if (len > L.armUp + 0.01) {
    const loLen = len - L.armUp;
    const fTop = T.foreR * 1.06 + effInf;
    const fMid = T.foreR * 0.98 + effInf + bell * 0.35;
    const fBot = T.foreR * 0.85 + effInf + 0.004 + bell;
    out.push([el, mesh(lathe([
      [fBot, -loLen],
      [fMid, -loLen * 0.45],
      [fTop, 0.018],
    ], 1, 14, 0, 1), mat)]);
    if (opts.cuff) {
      out.push([el, mesh(cyl(fBot + 0.003, fBot + 0.003, 0.026, 14).translate(0, -loLen + 0.013, 0), A(it))]);
    }
  }
  return out;
}

// Pelvis / hip brief shell for pants & shorts — extends to -0.092 + inner bridge so ZERO crotch skin pokes through!
export function pelvisShell(d, it, opts = {}) {
  const T = d.T, Y = d.Y;
  const wh = Y.waist - Y.hip;
  const inf = opts.inf ?? 0.008;
  const topY = opts.highWaist ? wh + 0.025 : wh;
  const mat = opts.mat || M(it);
  const g = lathe([
    [Math.max(0.055, T.hip * 0.56), -0.092],
    [T.hip * 0.96 + inf, -0.044],
    [T.hip + inf, 0.016],
    [T.hip * 0.92 + inf, wh * 0.52],
    [T.waist + inf, topY],
  ], 0.75, 18, 0, 1);
  const grp = new THREE.Group();
  grp.add(mesh(g, mat));
  grp.add(mesh(sph(T.hipX * 0.92, 0.048, T.hip * 0.54, 10, 7).translate(0, -0.052, 0), mat, false));
  return grp;
}

// Parametric leg shell adapting to body's thigh/calf thickness & leg length (frac: 0..1)
export function legShell(d, it, s, frac, inf = 0.011, flare = 0, opts = {}) {
  const { th, kn } = d.j.leg[s];
  const T = d.T, L = d.L;
  const totalLen = L.legUp + L.legLo;
  const len = Math.min(totalLen * 0.98, frac * totalLen);
  const upLen = Math.min(len, L.legUp);
  const mat = opts.mat || M(it);
  const out = [];

  out.push([th, mesh(lathe([
    [T.legR * 0.74 + inf + (len <= L.legUp ? flare * 0.35 : 0), -upLen],
    [T.legR * 0.90 + inf, -upLen * 0.55],
    [T.legR + inf, -upLen * 0.14],
    [T.legR + inf * 0.65, 0.048],
  ], 1, 14, 0, 1), mat)]);

  if (len > L.legUp + 0.01) {
    const loLen = len - L.legUp;
    const ankleR = Math.max(0.028, T.calfR * 0.72);
    const botR = opts.jogger ? ankleR + 0.008 : ankleR + inf + flare;
    const midR = opts.bell ? T.calfR * 0.96 + inf + flare * 0.18 : T.calfR * 0.95 + inf + flare * 0.45;
    out.push([kn, mesh(lathe([
      [botR, -loLen],
      [midR, -loLen * 0.52],
      [T.calfR * 1.06 + inf + (opts.bell ? 0 : flare * 0.2), -loLen * 0.15],
      [T.calfR + inf, 0.028],
    ], 1, 14, 0, 1), mat)]);
    if (opts.cuff) {
      out.push([kn, mesh(cyl(botR + 0.003, botR + 0.003, 0.028, 14).translate(0, -loLen + 0.014, 0), A(it))]);
    }
    d.legCalfInf = Math.max(d.legCalfInf || 0, inf + flare * 0.45);
    d.legFrac = Math.max(d.legFrac || 0, frac);
  }
  return out;
}

// Parametric skirt — hugs down to hip then flares, sz = 0.75, auto-computes armSpread for ALL body types!
export function skirt(d, it, topY, botY, rBot, opts = {}) {
  const T = d.T, Y = d.Y;
  const wh = Y.waist - Y.hip;
  const cov = topCovers(d) ? 0.0 : 0.004;
  const pleats = opts.pleats || 0;
  const gap = opts.gap || 0;
  const segs = pleats ? 30 : 20;

  let prof;
  if (opts.mermaid) {
    const kneeH = Y.knee - Y.hip;
    prof = [
      [rBot, botY - Y.hip],
      [(rBot + T.hip * 0.88) * 0.5, (botY + Y.knee) * 0.5 - Y.hip],
      [T.hip * 0.86 + 0.014, kneeH + 0.02],
      [T.hip + 0.011, 0.015],
      [T.hip * 0.91 + 0.011, wh * 0.52],
      [T.waist + 0.007 + cov, topY - Y.hip],
    ];
  } else {
    const midY = (botY + Y.hip) * 0.5 - Y.hip;
    const midR = (rBot + T.hip + 0.012) * 0.5 + (opts.poof || 0.010);
    prof = [
      [rBot, botY - Y.hip],
      [midR, midY],
      [T.hip + 0.010, 0.015],
      [T.hip * 0.91 + 0.011, wh * 0.52],
      [T.waist + 0.007 + cov, topY - Y.hip],
    ];
  }

  const g = lathe(prof, 0.75, segs, gap, 2);
  if (opts.slitRot) g.rotateY(opts.slitRot);
  if (pleats) {
    const p = g.attributes.position;
    const span = Math.max(0.08, topY - botY);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(z, x);
      const k = Math.max(0, (topY - Y.hip - y) / span);
      const dd = 0.011 * Math.abs(Math.sin(a * pleats)) * k;
      p.setXYZ(i, x + Math.cos(a) * dd, y, z + Math.sin(a) * dd);
    }
    g.computeVertexNormals();
  }

  // Fit rule: armSpread ensures arms clear wide skirts on EVERY body type (even broad nam_vam_vo!)
  const armLen = d.L.armUp + d.L.armLo;
  const handY = Y.shoulder - armLen;
  const tHand = Math.max(0, Math.min(1, (Y.hip - handY) / Math.max(0.12, Y.hip - botY)));
  const rAtHand = (T.hip + 0.015) + (rBot - T.hip) * Math.min(1, tHand * 1.15);
  const clearance = rAtHand + T.armR + 0.042 - T.sh;
  if (clearance > 0.04) {
    const needed = Math.asin(Math.min(0.68, clearance / Math.max(0.2, armLen))) - 0.10;
    d.armSpread = Math.max(d.armSpread || 0, Math.min(0.56, Math.max(0, needed)));
  }
  d.skirtExtra = Math.max(d.skirtExtra || 0, Math.max(0, rBot - T.hip - 0.04));

  const mat = opts.mat || M(it, { doubleSide: true });
  return mesh(g, mat);
}

export function band(r, y, h, it, sz = 0.75, mat = null) {
  return mesh(cyl(r, r, h, 24, true).scale(1, 1, sz).translate(0, y, 0), mat || A(it));
}

export function waistBand(d, it, h = 0.024, extra = 0.012, mat = null) {
  return band(d.T.waist + extra, d.Y.waist - d.Y.hip - 0.006, h, it, 0.75, mat);
}

export function neckBand(d, it, h = 0.022, extra = 0.014, mat = null) {
  return band(d.T.neckR + extra, d.Y.neck - d.Y.waist - 0.002, h, it, 0.78, mat);
}

export function collarLapels(d, it, add, zOff = 0.020, cMat = null) {
  const Y = d.Y, T = d.T;
  const cy = (Y.chest + Y.shoulder) * 0.5;
  const fz = frontTorsoZ(d, cy, zOff);
  const lm = cMat || A(it);
  for (const s of [1, -1]) {
    add([d.j.chest, mesh(new THREE.BoxGeometry(0.026, (Y.shoulder - Y.waist) * 0.65, 0.009)
      .rotateZ(-s * 0.28)
      .translate(s * (T.chest * 0.25), cy - Y.waist, fz + 0.006), lm)]);
  }
}
