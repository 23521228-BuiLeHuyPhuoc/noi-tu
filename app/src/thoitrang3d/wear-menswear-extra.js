// @ts-nocheck
// wear-menswear-extra.js — Full menswear & unisex 3D collection (hair, tops, outerwear, bottoms, full suits, shoes, hats, props)
// so male & unisex styling is equally rich and hilarious alongside womenswear!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, hairMat } from './core.js';
import { M, A, torsoShell, outerShell, sleeve, pelvisShell, legShell, band, waistBand, neckBand, frontTorsoZ, topCovers } from './wear-helpers.js';

function scGeo(g, d) {
  const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
  if (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005) g.scale(sx, sy, sz);
  return g;
}

function makeHairAdd(d, it, add) {
  const H = d.j.head;
  const two = it.twoTone || (it.c2 && it.c2.toLowerCase() !== it.c.toLowerCase() ? 'tips' : 'none');
  const mMain = hairMat(it.c, it.c2, two);
  const mSolid = toon(it.c);
  const put = (geo, mat = mMain, hatHide = false, outline = true) => {
    const o = mesh(scGeo(geo, d), mat, outline);
    if (hatHide) o.userData.hatHide = true;
    add([H, o]);
    return o;
  };
  const tightCap = () => {
    put(new THREE.SphereGeometry(0.181, 20, 10, 0, Math.PI * 2, 0, 1.18).scale(1, 0.97, 0.98).translate(0, 0.025, -0.008), mSolid);
    put(new THREE.SphereGeometry(0.183, 20, 8, Math.PI, Math.PI, 1.14, 0.94).translate(0, 0.025, -0.010), mSolid);
  };
  return { put, tightCap, mMain, mSolid };
}

function footScale(d) {
  return d.T.footS || (d.T.gender === 'm' ? 1.15 : (d.type === 'chibi' ? 0.92 : 1.0));
}

function baseShoeM(d, it, add, { sole = 0.014, heel = 0, toeCap = false, platform = 0 } = {}) {
  const fs = footScale(d);
  for (const s of [1, -1]) {
    const ft = d.j.leg[s].ft;
    add([ft, mesh(sph(0.048 * fs, 0.039 * fs, 0.088 * fs, 14, 10).translate(0, -0.010, 0.030 * fs), M(it))]);
    add([ft, mesh(sph(0.051 * fs, sole + platform + 0.004, 0.092 * fs, 14, 10).translate(0, -0.044 - platform * 0.6, 0.030 * fs), A(it))]);
    if (toeCap) add([ft, mesh(sph(0.039 * fs, 0.026 * fs, 0.035 * fs, 10, 8).translate(0, -0.022, 0.088 * fs), A(it), false)]);
    if (heel > 0) add([ft, mesh(cyl(0.018 * fs, 0.018 * fs, heel + 0.024, 10).translate(0, -0.052, -0.036 * fs), A(it))]);
  }
}

function hatAddM(d, add, liftY = 0) {
  return (geo, mat, outline = true) => {
    const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
    if (geo && geo.isMesh) {
      if (liftY) geo.position.y += liftY * sy;
      geo.scale.set(sx, sy, sz);
      add([d.j.head, geo]);
      return;
    }
    if (liftY) geo.translate(0, liftY, 0);
    if (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005) geo.scale(sx, sy, sz);
    add([d.j.head, mesh(geo, mat, outline)]);
  };
}

function closedDy(d) { return Math.max(-0.022, Math.min(0.022, Math.max(0.188, Math.min(0.285, d.hairCrownY || 0.212)) - 0.212)); }

export const MENSWEAR_HAIR = {
  fade_crop: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(cyl(0.135, 0.145, 0.048, 18).translate(0, 0.178, 0.005), mMain, true);
  },
  two_block: (d, it, add) => {
    const { put, tightCap, mMain, mSolid } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.175, 0.095, 0.175, 18, 12).translate(0, 0.145, 0.008), mMain, true);
    put(sph(0.145, 0.045, 0.062, 14, 10).translate(0, 0.140, 0.118), mSolid);
  },
  comma_hair: (d, it, add) => {
    const { put, tightCap, mMain, mSolid } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.155, 0.075, 0.160, 18, 12).translate(0, 0.155, 0.01), mMain, true);
    put(torus(0.056, 0.022, 8, 14, Math.PI * 1.15).rotateZ(-0.55).translate(0.058, 0.132, 0.128), mSolid);
    put(sph(0.078, 0.038, 0.056, 12, 8).rotateZ(0.28).translate(-0.078, 0.140, 0.106), mSolid);
  },
  crew_cut: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.142, 0.045, 0.148, 16, 10).translate(0, 0.168, 0.015), mMain, true);
  },
  spiky_short: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    for (let i = -2; i <= 2; i++) {
      put(cone(0.042, 0.115, 8).rotateZ(-i * 0.20).rotateX(0.18).translate(i * 0.045, 0.215 - Math.abs(i) * 0.012, 0.045), mMain, true);
    }
  },
  curtain_male: (d, it, add) => {
    const { put, tightCap, mMain, mSolid } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.172, 0.088, 0.168, 18, 12).translate(0, 0.145, -0.005), mMain, true);
    for (const s of [1, -1]) put(sph(0.076, 0.054, 0.058, 12, 8).rotateZ(-s * 0.42).translate(s * 0.082, 0.135, 0.115), mSolid);
  },
  ivy_league: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.148, 0.062, 0.155, 16, 10).rotateZ(-0.14).translate(0.022, 0.166, 0.028), mMain, true);
  },
  french_crop: (d, it, add) => {
    const { put, tightCap, mMain, mSolid } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.156, 0.068, 0.155, 16, 10).translate(0, 0.158, 0.012), mMain, true);
    put(box(0.22, 0.036, 0.055).translate(0, 0.144, 0.128), mSolid);
  },
  mohican: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.062, 0.095, 0.185, 14, 10).translate(0, 0.205, 0.005), mMain, true);
  },
  long_rocker: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(lathe([[0.175, -0.34], [0.21, -0.18], [0.205, 0.0], [0.188, 0.09]], 0.88, 22, 2.38, 2).translate(0, 0, -0.035), mMain);
    put(sph(0.155, 0.058, 0.145, 16, 10).translate(0, 0.165, 0.015), mMain, true);
  },
  dread_fade: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(cyl(0.024, 0.020, 0.15, 8).rotateZ(Math.cos(a) * 0.5).rotateX(Math.sin(a) * 0.5).translate(Math.cos(a) * 0.085, 0.21, Math.sin(a) * 0.085), mMain, true);
    }
  },
  side_swept_men: (d, it, add) => {
    const { put, tightCap, mMain } = makeHairAdd(d, it, add);
    tightCap();
    put(sph(0.155, 0.075, 0.165, 18, 12).rotateZ(-0.26).translate(0.040, 0.168, 0.030), mMain, true);
  },
};

export const MENSWEAR_TOP = {
  dress_shirt_tie: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.015, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.013, 0, { cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.022, 0.016, M(it))]);
    const fz = frontTorsoZ(d, Y.chest + 0.01, 0.018);
    add([d.j.chest, mesh(box(0.026, (Y.neck - Y.waist) * 0.85, 0.010).translate(0, Y.chest - 0.01 - Y.waist, fz + 0.005), A(it))]);
    add([d.j.chest, mesh(sph(0.018, 0.016, 0.012, 8, 6).translate(0, Y.neck - 0.028 - Y.waist, frontTorsoZ(d, Y.neck - 0.028, 0.018) + 0.008), A(it))]);
  },
  henley_shirt: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.015, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.78, 0.013).forEach(add);
    add([d.j.chest, mesh(box(0.022, 0.11, 0.008).translate(0, Y.chest + 0.04 - Y.waist, frontTorsoZ(d, Y.chest + 0.04, 0.017) + 0.003), A(it), false)]);
  },
  muscle_tank: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck - 0.015, 0.012, 0.006, { noNeckCap: true })]);
    add([d.j.chest, band(T.chest + 0.015, Y.chest - Y.waist, 0.032, it, 0.78, A(it))]);
  },
  rugby_shirt: (d, it, add) => {
    const rIt = { ...it, p: it.p === 'plain' ? 'stripe' : it.p };
    add([d.j.chest, torsoShell(d, rIt, d.Y.hip + 0.01, d.Y.neck, 0.018, 0.012)]);
    for (const s of [1, -1]) sleeve(d, rIt, s, 0.94, 0.015, 0, { cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.028, 0.020, toon('#ffffff'))]);
  },
  baseball_jersey: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.018, 0.014)]);
    for (const s of [1, -1]) sleeve(d, { c: it.c2 || '#c92a46', p: 'plain' }, s, 0.36, 0.015).forEach(add);
    const fz = frontTorsoZ(d, Y.chest, 0.020);
    add([d.j.chest, mesh(box(0.016, Y.neck - Y.hip - 0.02, 0.008).translate(0, (Y.neck + Y.hip) * 0.5 - Y.waist, fz + 0.003), A(it), false)]);
  },
  bowling_shirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.017, 0.016)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.36, 0.015, 0, { cuff: true }).forEach(add);
    for (const s of [1, -1]) {
      const px = s * T.chest * 0.45;
      add([d.j.chest, mesh(box(0.036, Y.neck - Y.hip - 0.04, 0.009).translate(px, (Y.neck + Y.hip) * 0.5 - Y.waist, frontTorsoZ(d, Y.chest, 0.019, px) + 0.004), A(it), false)]);
    }
  },
  mens_guayabera: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip, Y.neck, 0.017, 0.016)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.014).forEach(add);
    for (const s of [1, -1]) for (const py of [Y.chest + 0.01, Y.hip + 0.07]) {
      const px = s * T.chest * 0.44;
      add([d.j.chest, mesh(box(0.040, 0.042, 0.009).translate(px, py - Y.waist, frontTorsoZ(d, py, 0.020, px) + 0.004), A(it))]);
    }
  },
  compression_top: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.008, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.008).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.020, 0.010, A(it))]);
  },
  turtleneck_men: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.015, 0.006)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.013).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.062, 0.016, M(it))]);
  },
  ao_ngu_than_nam: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.14, Y.neck, 0.018, 0.032)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.016).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.044, 0.016, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.010, 0.018, A(it))]);
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.021, 0.02);
    add([d.j.chest, mesh(box(0.095, 0.010, 0.008).rotateZ(-0.42).translate(0.02, Y.chest + 0.04 - Y.waist, fz + 0.004), A(it), false)]);
  },
  bare_chest_towel: (d, it, add) => {
    // CỞI TRẦN VẮT KHĂN TẮM QUA VAI TẬP GYM / ĐI BIỂN!
    const Y = d.Y, T = d.T;
    add([d.j.chest, mesh(torus(T.neckR + 0.042, 0.028, 8, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.018, 0), M(it))]);
    for (const s of [1, -1]) {
      const fx = s * T.chest * 0.45;
      add([d.j.chest, mesh(box(0.056, 0.24, 0.018).translate(fx, Y.chest - 0.04 - Y.waist, frontTorsoZ(d, Y.chest, 0.020, fx) + 0.010), M(it))]);
      add([d.j.chest, mesh(box(0.058, 0.024, 0.020).translate(fx, Y.chest - 0.15 - Y.waist, frontTorsoZ(d, Y.chest - 0.12, 0.020, fx) + 0.010), A(it), false)]);
    }
  },
  dad_beer_belly: (d, it, add) => {
    // ÁO THUN NGẮN CĂNG TRÒN BỤNG BIA ÔNG CHÚ XÓM LẦY!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.01, Y.neck, 0.018, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.30, 0.014).forEach(add);
    add([d.j.chest, mesh(sph(T.waist + 0.075, 0.105, T.waist + 0.075, 16, 12).translate(0, -0.02, 0.062), toon(d.skin || '#f7cfb6'))]);
    add([d.j.chest, mesh(sph(0.010, 0.010, 0.010, 6, 6).translate(0, -0.03, T.waist + 0.132), toon('#5a3825'), false)]);
  },
};

export const MENSWEAR_OUTER = {
  suit_jacket_men: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.05, Y.neck, { inf, gap: 0.42, flare: 0.014 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.026, 0, { isOuter: true, cuff: true }).forEach(add);
    const gm = toon('#ffd56b');
    for (const s of [1, -1]) for (const by of [Y.waist - 0.02, Y.waist + 0.045]) {
      add([d.j.chest, mesh(sph(0.009, 0.009, 0.006, 8, 6).translate(s * 0.042, by - Y.waist, frontTorsoZ(d, by, inf, 0.042) + 0.006), gm, false)]);
    }
  },
  double_breasted_coat: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.036, (d.topInf || 0.014) + 0.016);
    add([d.j.chest, outerShell(d, it, Y.knee - 0.02, Y.neck, { inf, gap: 0.36, flare: 0.068 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.026, 0, { isOuter: true, cuff: true }).forEach(add);
    for (const s of [1, -1]) for (const by of [Y.waist - 0.04, Y.waist + 0.02, Y.chest + 0.01]) {
      add([d.j.chest, mesh(sph(0.009, 0.009, 0.006, 8, 6).translate(s * 0.045, by - Y.waist, frontTorsoZ(d, by, inf, 0.045) + 0.006), A(it), false)]);
    }
  },
  safari_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip - 0.06, Y.neck, { inf, gap: 0.48, flare: 0.022 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.92, 0.024, 0, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, band(T.waist + inf + 0.010, 0.0, 0.028, it, 0.78, A(it))]);
  },
  harrington_jacket: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.04, Y.neck, { inf, gap: 0.50, flare: 0.008 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.032, 0.024, A(it))]);
  },
  shearling_aviator: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.038, (d.topInf || 0.014) + 0.018);
    add([d.j.chest, outerShell(d, it, Y.waist - 0.04, Y.neck, { inf, gap: 0.62, flare: 0.012 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.028, 0.006, { isOuter: true, cuff: true }).forEach(add);
    add([d.j.chest, mesh(torus(T.neckR + 0.060, 0.038, 10, 22).scale(1.1, 0.72, 0.92).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.02, 0), A(it))]);
  },
  track_jacket: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip, Y.neck, { inf, gap: 0, flare: 0.008 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.025, 0, { isOuter: true, cuff: true }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.014, d.L.armUp * 0.92, 0.018).translate(s * (T.armR + 0.028), -d.L.armUp * 0.45, 0), A(it), false)]);
    }
    add([d.j.chest, neckBand(d, it, 0.040, 0.022, A(it))]);
  },
  fishing_vest_dad: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip + 0.01, Y.shoulder + 0.01, { inf, gap: 0.56, flare: 0.012, noNeckCap: true })]);
    for (const s of [1, -1]) for (const py of [Y.chest, Y.waist - 0.02]) {
      const px = s * T.chest * 0.55;
      add([d.j.chest, mesh(box(0.048, 0.052, 0.022).translate(px, py - Y.waist, frontTorsoZ(d, py, inf, px) + 0.010), A(it))]);
    }
  },
  mechanic_vest: (d, it, add) => {
    const Y = d.Y;
    const inf = Math.max(0.034, (d.topInf || 0.014) + 0.015);
    add([d.j.chest, outerShell(d, it, Y.hip, Y.neck, { inf, gap: 0.65, flare: 0.012 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.36, 0.024, 0, { isOuter: true }).forEach(add);
  },
};

export const MENSWEAR_BOTTOM = {
  chino_pants: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.012, 0.002).forEach(add);
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.024, 0.012, A(it))]);
  },
  dress_trousers: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { highWaist: !topCovers(d) })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.97, 0.013, 0.008).forEach(add);
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.026, 0.012, toon('#15121b'))]);
  },
  board_shorts: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.44, 0.022, 0.012).forEach(add);
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.026, 0.014, A(it))]);
  },
  boxer_shorts_lay: (d, it, add) => {
    const bIt = { ...it, p: it.p === 'plain' ? 'heart' : it.p };
    add([d.j.hips, pelvisShell(d, bIt)]);
    for (const s of [1, -1]) legShell(d, bIt, s, 0.30, 0.020, 0.010).forEach(add);
    add([d.j.hips, waistBand(d, it, 0.028, 0.016, toon('#ffffff'))]);
  },
  basketball_shorts: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.50, 0.026, 0.018).forEach(add);
      add([d.j.leg[s].th, mesh(box(0.010, L.legUp * 0.85, 0.020).translate(s * (T.legR + 0.028), -L.legUp * 0.46, 0), A(it), false)]);
    }
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.028, 0.016, A(it))]);
  },
  denim_shorts_men: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.42, 0.016, 0.006, { cuff: true }).forEach(add);
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.024, 0.012, A(it))]);
  },
  track_pants: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.96, 0.018, 0.006).forEach(add);
      add([d.j.leg[s].th, mesh(box(0.012, L.legUp * 0.88, 0.020).translate(s * (T.legR + 0.019), -L.legUp * 0.48, 0), A(it), false)]);
      add([d.j.leg[s].kn, mesh(box(0.012, L.legLo * 0.85, 0.018).translate(s * (T.calfR + 0.019), -L.legLo * 0.45, 0), A(it), false)]);
    }
    if (!topCovers(d)) add([d.j.hips, waistBand(d, it, 0.026, 0.014, A(it))]);
  },
  saggy_pants: (d, it, add) => {
    // QUẦN TỤT XỆ LỘ CẠP BOXER TRÁI TIM CỰC LẦY!
    const boxIt = { c: it.c2 || '#ff6b8b', c2: '#ffffff', p: 'heart' };
    add([d.j.hips, pelvisShell(d, boxIt, { inf: 0.010, highWaist: true })]);
    add([d.j.hips, band(d.T.hip + 0.022, -0.025, 0.030, it, 0.78, toon('#15121b'))]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.026, 0.024).forEach(add);
  },
};

export const MENSWEAR_DRESS = {
  tuxedo_men: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.waist - 0.01, Y.neck, 0.012, 0, { tight: true, noRecord: true })]);
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.03, Y.neck, 0.024, 0.014, { gap: 0.82 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.018, 0, { cuff: true }).forEach(add);
    // Satin bowtie + cummerbund + tuxedo slacks!
    const ny = Y.neck - 0.024, fz = frontTorsoZ(d, ny, 0.018);
    for (const s of [1, -1]) add([d.j.chest, mesh(cone(0.020, 0.042, 4).rotateZ(s * Math.PI / 2).translate(s * 0.022, ny - Y.waist, fz + 0.008), A(it))]);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.013, 0.004).forEach(add);
    add([d.j.hips, waistBand(d, it, 0.040, 0.018, A(it))]);
  },

  ao_dai_nam: (d, it, add) => {
    // ÁO DÀI NAM GẤM TRUYỀN THỐNG + QUẦN TÂY!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.018, 0.014)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.015).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.042, 0.016, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.010, 0.018, A(it))]);
    const pants = { c: it.c2 || '#15121b', p: 'plain' };
    add([d.j.hips, pelvisShell(d, pants, { inf: 0.009 })]);
    for (const s of [1, -1]) legShell(d, pants, s, 0.96, 0.014, 0.006).forEach(add);
    // Straight crisp male áo dài front & back panels to knees!
    const botY = Y.knee - 0.02;
    const pMat = M(it, { doubleSide: true });
    for (const rot of [0, Math.PI]) {
      const g = lathe([[T.hip + 0.075, botY - Y.hip], [T.hip + 0.048, (botY + Y.hip) * 0.5 - Y.hip], [T.hip + 0.024, 0.02]], 0.78, 16, Math.PI * 1.18, 2);
      g.rotateY(rot + Math.PI);
      add([d.j.hips, mesh(g, pMat)]);
    }
    add([d.j.chest, mesh(cyl(0.055, 0.055, 0.010, 16).rotateX(Math.PI / 2).translate(0, Y.chest - Y.waist, frontTorsoZ(d, Y.chest, 0.021) + 0.005), A(it), false)]);
  },

  ao_ngu_than_full: (d, it, add) => {
    MENSWEAR_DRESS.ao_dai_nam(d, { ...it, p: it.p === 'plain' ? 'brocade' : it.p }, add);
  },

  tracksuit_full: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.chest, torsoShell(d, it, d.Y.hip, d.Y.neck, 0.022, 0.012)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.016 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.018, 0, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.95, 0.018, 0.006, { jogger: true, cuff: true }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.012, L.armUp * 0.9, 0.018).translate(s * (T.armR + 0.020), -L.armUp * 0.45, 0), A(it), false)]);
      add([d.j.leg[s].th, mesh(box(0.012, L.legUp * 0.88, 0.018).translate(s * (T.legR + 0.020), -L.legUp * 0.48, 0), A(it), false)]);
    }
    add([d.j.chest, neckBand(d, it, 0.036, 0.020, A(it))]);
  },

  police_uniform: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.016, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.36, 0.014).forEach(add);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.014, 0.004).forEach(add);
    add([d.j.hips, waistBand(d, it, 0.032, 0.018, toon('#15121b'))]);
    // Gold badge + epaulettes!
    const px = T.chest * 0.44;
    add([d.j.chest, mesh(sph(0.020, 0.024, 0.010, 8, 6).translate(px, Y.chest + 0.02 - Y.waist, frontTorsoZ(d, Y.chest + 0.02, 0.020, px) + 0.006), toon('#ffd56b'), false)]);
  },

  pilot_uniform: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.hip + 0.01, Y.neck, 0.015, 0.010)]);
    for (const s of [1, -1]) {
      sleeve(d, { c: '#ffffff', p: 'plain' }, s, 0.36, 0.014).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.048, 0.014, 0.032).translate(s * 0.012, 0.042, 0), toon('#15121b'))]);
    }
    add([d.j.chest, mesh(box(0.026, 0.19, 0.010).translate(0, Y.chest - 0.01 - Y.waist, frontTorsoZ(d, Y.chest, 0.018) + 0.006), M(it))]);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.013, 0.004).forEach(add);
  },

  firefighter_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const ref = toon('#ffea00', 'plain', '#fff', { emissive: '#ffea00', emissiveIntensity: 0.5 });
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.06, Y.neck, 0.028, 0.018)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.022 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.022, 0, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.95, 0.022, 0.012, { cuff: true }).forEach(add);
    }
    add([d.j.chest, band(T.waist + 0.034, 0.0, 0.030, it, 0.78, ref)]);
    add([d.j.chest, band(T.chest + 0.032, Y.chest - Y.waist, 0.028, it, 0.78, ref)]);
  },

  football_kit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.018, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.014).forEach(add);
    add([d.j.hips, pelvisShell(d, { c: it.c2 || '#ffffff', p: 'plain' })]);
    for (const s of [1, -1]) legShell(d, { c: it.c2 || '#ffffff', p: 'plain' }, s, 0.38, 0.018, 0.010).forEach(add);
    add([d.j.chest, band(T.chest + 0.020, Y.chest - Y.waist, 0.044, it, 0.78, A(it))]);
  },

  basketball_kit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck - 0.015, 0.018, 0.010, { noNeckCap: true })]);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.48, 0.026, 0.016).forEach(add);
    add([d.j.chest, band(T.chest + 0.020, Y.chest - Y.waist, 0.046, it, 0.78, A(it))]);
  },

  pajama_men_set: (d, it, add) => {
    const pIt = { ...it, p: it.p === 'plain' ? 'pinstripe' : it.p };
    add([d.j.chest, torsoShell(d, pIt, d.Y.hip - 0.03, d.Y.neck, 0.022, 0.018)]);
    add([d.j.hips, pelvisShell(d, pIt, { inf: 0.018 })]);
    for (const s of [1, -1]) {
      sleeve(d, pIt, s, 0.94, 0.018, 0, { cuff: true }).forEach(add);
      legShell(d, pIt, s, 0.95, 0.022, 0.016).forEach(add);
    }
  },

  thailand_shorts_set: (d, it, add) => {
    // COMBO ÁO BA LỖ TRẮNG + QUẦN ĐÙI HOA XÓM LẦY!
    const topIt = { c: '#ffffff', p: 'plain' };
    const botIt = { ...it, p: it.p === 'plain' ? 'flower' : it.p };
    add([d.j.chest, torsoShell(d, topIt, d.Y.hip + 0.02, d.Y.neck - 0.015, 0.014, 0.008, { noNeckCap: true })]);
    add([d.j.hips, pelvisShell(d, botIt)]);
    for (const s of [1, -1]) legShell(d, botIt, s, 0.34, 0.022, 0.012).forEach(add);
  },

  suit_shorts_lay: (d, it, add) => {
    // TRÊN MẶC VEST TỔNG TÀI, DƯỚI MẶC QUẦN ĐÙI HOA HỌP ZOOM!!
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.waist - 0.01, Y.neck, 0.012, 0, { tight: true, noRecord: true })]);
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.024, 0.014, { gap: 0.78 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.018).forEach(add);
    add([d.j.chest, mesh(box(0.024, (Y.shoulder - Y.waist) * 0.65, 0.009).translate(0, Y.chest - 0.01 - Y.waist, frontTorsoZ(d, Y.chest + 0.01, 0.017) + 0.005), toon('#c92a46'))]);
    const shortIt = { c: it.c2 || '#ff6b8b', c2: '#ffd56b', p: 'flower' };
    add([d.j.hips, pelvisShell(d, shortIt)]);
    for (const s of [1, -1]) legShell(d, shortIt, s, 0.32, 0.022, 0.010).forEach(add);
  },
};

export const MENSWEAR_SHOES = {
  derby_shoes: (d, it, add) => baseShoeM(d, it, add, { sole: 0.013, heel: 0.014 }),
  chelsea_boots: (d, it, add) => {
    baseShoeM(d, it, add, { sole: 0.014, heel: 0.014 });
    const L = d.L, r = d.T.calfR * 0.88 + 0.014;
    for (const s of [1, -1]) add([d.j.leg[s].kn, mesh(cyl(r, r * 0.94, L.legLo * 0.36, 14).translate(0, -L.legLo * 0.82, 0), M(it))]);
  },
  timberland_boots: (d, it, add) => {
    baseShoeM(d, it, add, { sole: 0.022, platform: 0.010 });
    const L = d.L, r = d.T.calfR * 0.94 + 0.018;
    for (const s of [1, -1]) {
      add([d.j.leg[s].kn, mesh(cyl(r, r * 0.92, L.legLo * 0.38, 14).translate(0, -L.legLo * 0.81, 0), M(it))]);
      add([d.j.leg[s].kn, mesh(torus(r, 0.016, 8, 16).rotateX(Math.PI / 2).translate(0, -L.legLo * 0.62, 0), A(it))]);
    }
  },
  brogues: (d, it, add) => baseShoeM(d, it, add, { sole: 0.012, heel: 0.012, toeCap: true }),
  football_cleats: (d, it, add) => {
    baseShoeM(d, it, add, { sole: 0.014, toeCap: true });
    const fs = footScale(d);
    for (const s of [1, -1]) for (const cz of [-0.03, 0.03, 0.08]) {
      add([d.j.leg[s].ft, mesh(cyl(0.008, 0.005, 0.018, 6).translate(0, -0.062, cz * fs), toon('#ffffff'), false)]);
    }
  },
  basketball_shoes: (d, it, add) => {
    baseShoeM(d, it, add, { sole: 0.020, platform: 0.010, toeCap: true });
    const L = d.L, r = d.T.calfR * 0.92 + 0.016;
    for (const s of [1, -1]) add([d.j.leg[s].kn, mesh(cyl(r, r * 0.94, L.legLo * 0.28, 14).translate(0, -L.legLo * 0.86, 0), M(it))]);
  },
  boat_shoes: (d, it, add) => baseShoeM(d, it, add, { sole: 0.012 }),
  dad_sandals_socks: (d, it, add) => {
    // DÉP QUAI HẬU ĐI KÈM TẤT TRẮNG CHUẨN ÔNG CHÚ!
    const fs = footScale(d), L = d.L, r = d.T.calfR * 0.84 + 0.008;
    const sockM = toon('#ffffff');
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.044 * fs, 0.034 * fs, 0.082 * fs, 12, 8).translate(0, -0.012, 0.030 * fs), sockM)]);
      add([d.j.leg[s].kn, mesh(cyl(r, r * 0.90, L.legLo * 0.42, 14).translate(0, -L.legLo * 0.79, 0), sockM)]);
      add([ft, mesh(sph(0.052 * fs, 0.018, 0.094 * fs, 14, 10).translate(0, -0.046, 0.030 * fs), M(it))]);
      add([ft, mesh(torus(0.048 * fs, 0.010, 6, 14, Math.PI).translate(0, -0.012, 0.052 * fs), M(it))]);
      add([ft, mesh(torus(0.046 * fs, 0.010, 6, 14, Math.PI).translate(0, -0.002, 0.012 * fs), A(it))]);
    }
  },
};

export const MENSWEAR_CLOSED_HATS = new Set(['newsboy_cap', 'trucker_cap', 'bowler_hat', 'panama_hat']);

export const MENSWEAR_HATS = {
  newsboy_cap: (d, it, add) => {
    const put = hatAddM(d, add, closedDy(d));
    put(sph(0.215, 0.082, 0.225, 18, 12).translate(0, 0.165, 0.005), M(it));
    put(new THREE.CylinderGeometry(0.115, 0.118, 0.014, 18, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.132, 0.135), A(it));
  },
  trucker_cap: (d, it, add) => {
    const put = hatAddM(d, add, closedDy(d));
    put(cyl(0.185, 0.195, 0.125, 20).translate(0, 0.175, -0.01), M(it));
    put(new THREE.CylinderGeometry(0.118, 0.122, 0.014, 18, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.3).translate(0, 0.132, 0.138), A(it));
  },
  bowler_hat: (d, it, add) => {
    const put = hatAddM(d, add, closedDy(d));
    put(torus(0.215, 0.018, 8, 24).rotateX(Math.PI / 2).translate(0, 0.155, -0.01), M(it));
    put(sph(0.175, 0.145, 0.175, 18, 12).translate(0, 0.215, -0.01), M(it));
    put(band(0.178, 0.172, 0.028, it, 1, A(it)));
  },
  panama_hat: (d, it, add) => {
    const put = hatAddM(d, add, closedDy(d));
    put(cyl(0.255, 0.270, 0.014, 24).translate(0, 0.155, -0.01), M(it));
    put(cyl(0.155, 0.182, 0.125, 20).translate(0, 0.215, -0.01), M(it));
    put(band(0.180, 0.178, 0.032, it, 1, A(it)));
  },
};

export const MENSWEAR_ACC_SUB = {
  barbell_prop: 'handL', fishing_rod: 'handL', soccer_ball: 'handL', toolbox_prop: 'handR', tennis_racket: 'handL',
};

export const MENSWEAR_HELD_KINDS = {
  barbell_prop: 'upright', fishing_rod: 'sword', soccer_ball: 'upright', tennis_racket: 'wand',
};

export const MENSWEAR_ACC = {
  barbell_prop: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const g = new THREE.Group();
    g.position.set(0.008 * hs, -0.025 * hs, 0.028 * hs);
    g.rotation.set(0.75, 0, Math.PI / 2);
    g.add(mesh(cyl(0.014, 0.014, 0.28, 8), toon('#9ca3af')));
    for (const s of [1, -1]) g.add(mesh(cyl(0.062, 0.062, 0.042, 16).translate(0, s * 0.12, 0), M(it)));
    add([hand, g]);
  },
  fishing_rod: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const g = new THREE.Group();
    g.position.set(0.006 * hs, -0.024 * hs, 0.028 * hs);
    g.rotation.set(0.38, 0, 0.14);
    g.add(mesh(cyl(0.006, 0.014, 1.05, 8).translate(0, 0.42, 0), M(it)));
    g.add(mesh(cyl(0.026, 0.026, 0.022, 12).rotateZ(Math.PI / 2).translate(0.028, 0.08, 0), A(it)));
    add([hand, g]);
  },
  soccer_ball: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    add([hand, mesh(sph(0.115, 0.115, 0.115, 16, 12).translate(0.01 * hs, -0.03 * hs, 0.07 * hs), toon('#ffffff', 'dots', '#15121b'))]);
  },
  toolbox_prop: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.095, 0.125, 0.22).translate(0.045 * hs, -0.15 * hs, 0), M(it))]);
    add([hand, mesh(torus(0.045, 0.009, 6, 14, Math.PI).rotateY(Math.PI / 2).translate(0.045 * hs, -0.08 * hs, 0), toon('#15121b'))]);
  },
  tennis_racket: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const g = new THREE.Group();
    g.position.set(0.008 * hs, -0.024 * hs, 0.028 * hs);
    g.rotation.set(0.55, 0.1, -0.15);
    g.add(mesh(cyl(0.012, 0.012, 0.22, 8).translate(0, 0.06, 0), A(it)));
    g.add(mesh(torus(0.11, 0.012, 8, 22).scale(0.82, 1.15, 1).translate(0, 0.30, 0), M(it)));
    add([hand, g]);
  },
};
