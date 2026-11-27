// @ts-nocheck
// wear-unique-v2-body.js — 80 brand-new 100% unique 3D sculptures (14 hair, 18 top, 14 outer, 14 bottom, 20 dress/costumes).
// Every builder creates an unmistakably distinct 3D silhouette — ZERO recolor clones!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat, hairMat, memePrintTex } from './core.js';
import {
  M, A, torsoShell as _torsoShell, outerShell as _outerShell, sleeve as _sleeve,
  pelvisShell, legShell, skirt, band, waistBand, neckBand, frontTorsoZ, collarLapels,
} from './wear-helpers.js';

function torsoShell(d, it, y0, y1, inf = 0.014, flareOrOpts = 0, opts = {}) {
  if (flareOrOpts && typeof flareOrOpts === 'object') return _torsoShell(d, it, y0, y1, inf, 0, flareOrOpts);
  return _torsoShell(d, it, y0, y1, inf, flareOrOpts, opts);
}

function outerShell(d, it, y0, y1, infOrOpts = 0.028, opts = {}) {
  if (infOrOpts && typeof infOrOpts === 'object') return _outerShell(d, it, y0, y1, infOrOpts);
  const gap = opts.open ? (opts.openGap ?? 0.92) : (opts.gap ?? 0);
  return _outerShell(d, it, y0, y1, { ...opts, inf: infOrOpts, gap });
}

function sleeve(d, it, s, frac, infOrOpts = 0.012, puff = 0, opts = {}) {
  if (infOrOpts && typeof infOrOpts === 'object') {
    return _sleeve(d, it, s, frac, infOrOpts.inf ?? 0.014, infOrOpts.puff ?? 0, infOrOpts);
  }
  return _sleeve(d, it, s, frac, infOrOpts, puff, opts);
}

function scGeo(g, d) {
  const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
  if (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005) g.scale(sx, sy, sz);
  return g;
}

function makeHairCtx(d, it, add) {
  const H = d.j.head;
  const two = it.twoTone || (it.c2 && it.c2.toLowerCase() !== it.c.toLowerCase() ? 'tips' : 'none');
  const mMain = hairMat(it.c, it.c2, two);
  const mSolid = toon(it.c);
  const mAcc = toon(it.c2 || '#ffd56b');
  const put = (geo, mat = mMain, hatHide = false, outline = true) => {
    const o = mesh(scGeo(geo, d), mat, outline);
    if (hatHide) o.userData.hatHide = true;
    add([H, o]);
    return o;
  };
  const cap = () => {
    put(new THREE.SphereGeometry(0.181, 20, 10, 0, Math.PI * 2, 0, 1.18).scale(1, 0.97, 0.98).translate(0, 0.025, -0.008), mSolid);
    put(new THREE.SphereGeometry(0.183, 20, 8, Math.PI, Math.PI, 1.14, 0.94).translate(0, 0.025, -0.010), mSolid);
  };
  return { put, cap, mMain, mSolid, mAcc };
}

// ======================= 1. HAIR (+14 UNIQUE 3D SHAPES) =======================
export const HAIR_V2 = {
  afro_giant: (d, it, add) => {
    const { put, mMain } = makeHairCtx(d, it, add);
    put(sph(0.32, 0.30, 0.30, 22, 16).translate(0, 0.12, -0.02), mMain, true);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      put(sph(0.11, 0.11, 0.11, 10, 8).translate(Math.cos(a) * 0.24, 0.12 + (i % 2) * 0.08, Math.sin(a) * 0.22 - 0.02), mMain, true, false);
    }
  },
  viking_braids: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairCtx(d, it, add);
    cap();
    for (const s of [1, -1]) {
      for (let i = 0; i < 6; i++) {
        put(sph(0.032 - i * 0.002, 0.034, 0.030, 10, 8).translate(s * (0.165 + i * 0.008), 0.02 - i * 0.055, 0.055), mMain);
        if (i === 1 || i === 4) {
          put(torus(0.033, 0.006, 6, 12).rotateX(Math.PI / 2).translate(s * (0.165 + i * 0.008), 0.02 - i * 0.055, 0.055), mAcc, false, false);
        }
      }
    }
    put(cyl(0.055, 0.042, 0.18, 12).rotateX(0.35).translate(0, -0.06, -0.18), mMain);
  },
  geisha_shimada: (d, it, add) => {
    const { put, cap, mSolid, mAcc } = makeHairCtx(d, it, add);
    cap();
    put(sph(0.22, 0.10, 0.16, 16, 12).translate(0, 0.06, -0.05), mSolid);
    put(sph(0.11, 0.095, 0.10, 16, 12).translate(0, 0.23, -0.02), mSolid, true);
    put(cyl(0.006, 0.006, 0.44, 8).rotateZ(Math.PI / 2 + 0.16).translate(0, 0.23, -0.02), mAcc, true);
    put(cyl(0.006, 0.006, 0.42, 8).rotateZ(Math.PI / 2 - 0.18).translate(0, 0.22, -0.02), mAcc, true);
    for (const s of [1, -1]) {
      put(sph(0.026, 0.026, 0.026, 10, 8).translate(s * 0.21, 0.25, -0.02), mAcc, true);
    }
  },
  anime_ahoge: (d, it, add) => {
    const { put, cap, mMain } = makeHairCtx(d, it, add);
    cap();
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      put(sph(0.026 * (1 - t * 0.55), 0.045, 0.020, 8, 6)
        .rotateZ(-0.2 + t * 0.65)
        .translate(Math.sin(t * 2.2) * 0.055, 0.195 + t * 0.24, 0.02), mMain, true);
    }
    for (const s of [1, -1]) {
      put(cone(0.055, 0.18, 10).rotateZ(s * 0.15).rotateX(Math.PI).translate(s * 0.15, -0.05, 0.04), mMain);
    }
  },
  liberty_spikes: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairCtx(d, it, add);
    cap();
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.38;
      put(cone(0.042, 0.24, 10)
        .rotateZ(-ang)
        .translate(Math.sin(ang) * 0.24, 0.11 + Math.cos(ang) * 0.18, 0.0), i % 2 === 0 ? mMain : mAcc, true);
    }
  },
  princess_hime: (d, it, add) => {
    const { put, cap, mMain } = makeHairCtx(d, it, add);
    cap();
    // Blunt straight fringe + cheek-length hime side blocks + super long straight back
    put(box(0.24, 0.07, 0.045).translate(0, 0.095, 0.16), mMain);
    for (const s of [1, -1]) {
      put(box(0.055, 0.18, 0.065).translate(s * 0.155, -0.02, 0.075), mMain);
    }
    put(cyl(0.18, 0.21, 0.56, 18).scale(1, 1, 0.6).translate(0, -0.22, -0.12), mMain);
  },
  elvis_rockabilly: (d, it, add) => {
    const { put, cap, mSolid } = makeHairCtx(d, it, add);
    cap();
    put(sph(0.145, 0.135, 0.22, 18, 12).rotateX(-0.22).translate(0, 0.205, 0.095), mSolid, true);
    put(torus(0.085, 0.045, 10, 18, Math.PI * 1.4).rotateY(Math.PI / 2).translate(0, 0.23, 0.18), mSolid, true);
    for (const s of [1, -1]) put(box(0.032, 0.12, 0.04).translate(s * 0.165, -0.01, 0.05), mSolid);
  },
  bald_shiny_halo: (d, it, add) => {
    const { put } = makeHairCtx(d, it, add);
    const shiny = basicMat('#ffffff');
    // Glossy specular sparkle spots on bald head + glowing golden aura halo
    put(sph(0.035, 0.022, 0.016, 10, 8).rotateZ(-0.4).translate(0.06, 0.135, 0.115), shiny, false, false);
    put(sph(0.015, 0.015, 0.012, 8, 6).translate(0.095, 0.11, 0.125), shiny, false, false);
    put(torus(0.165, 0.018, 10, 24).rotateX(Math.PI / 2).translate(0, 0.245, 0), basicMat(it.c || '#ffd600'), true, false);
  },
  broccoli_hair: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairCtx(d, it, add);
    const stalk = toon('#5fd3a6');
    put(cyl(0.16, 0.13, 0.07, 16).translate(0, 0.15, -0.005), stalk, true);
    const pts = [
      [0, 0.26, 0.02, 0.125], [-0.12, 0.22, 0.04, 0.105], [0.12, 0.22, 0.04, 0.105],
      [-0.08, 0.24, -0.09, 0.105], [0.08, 0.24, -0.09, 0.105], [0, 0.20, 0.13, 0.095],
      [-0.14, 0.19, -0.04, 0.09], [0.14, 0.19, -0.04, 0.09],
    ];
    for (let i = 0; i < pts.length; i++) {
      const [px, py, pz, r] = pts[i];
      put(sph(r, r * 0.92, r, 12, 10).translate(px, py, pz), i % 3 === 0 ? mAcc : mMain, true);
    }
  },
  noodle_hair: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairCtx(d, it, add);
    put(sph(0.20, 0.11, 0.195, 16, 10).translate(0, 0.16, -0.005), mMain, true);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = 0.175 + (i % 2) * 0.018;
      put(torus(0.028, 0.011, 6, 12).rotateY(a).translate(Math.cos(a) * r, 0.10 - (i % 3) * 0.045, Math.sin(a) * r), i % 4 === 0 ? mAcc : mMain, false, false);
      put(cyl(0.009, 0.009, 0.15, 6).rotateZ(Math.sin(i) * 0.25).translate(Math.cos(a) * r, 0.02, Math.sin(a) * r), mMain, false, false);
    }
  },
  tentacle_hair: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairCtx(d, it, add);
    cap();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const dx = Math.cos(a), dz = Math.sin(a);
      for (let j = 0; j < 5; j++) {
        const rad = 0.036 - j * 0.006;
        const dist = 0.16 + j * 0.038;
        const yy = 0.12 - j * 0.055 + Math.sin(j * 1.1) * 0.025;
        put(sph(rad, rad, rad, 8, 6).translate(dx * dist, yy, dz * dist), mMain);
        if (j >= 1 && j <= 3) put(sph(0.011, 0.011, 0.011, 6, 6).translate(dx * (dist - 0.015), yy - 0.015, dz * (dist - 0.015)), mAcc, false, false);
      }
    }
  },
  flame_hair: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairCtx(d, it, add);
    const hot = basicMat('#ffea00');
    put(sph(0.195, 0.14, 0.19, 16, 10).translate(0, 0.14, -0.005), mMain, true);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const h = 0.22 + (i % 3) * 0.07;
      put(cone(0.055, h, 8).rotateZ(Math.cos(a) * 0.25).translate(Math.cos(a) * 0.11, 0.21 + h * 0.35, Math.sin(a) * 0.10), i % 2 === 0 ? mMain : mAcc, true, false);
    }
    put(cone(0.065, 0.32, 10).translate(0, 0.34, 0), hot, true, false);
  },
  cloud_hair: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairCtx(d, it, add);
    const puffs = [
      [0, 0.23, 0, 0.16], [-0.15, 0.18, 0.02, 0.13], [0.15, 0.18, 0.02, 0.13],
      [-0.10, 0.24, -0.08, 0.12], [0.10, 0.24, -0.08, 0.12], [0, 0.17, 0.13, 0.11],
      [-0.22, 0.14, -0.02, 0.095], [0.22, 0.14, -0.02, 0.095],
    ];
    for (let i = 0; i < puffs.length; i++) {
      const [px, py, pz, r] = puffs[i];
      put(sph(r, r * 0.85, r, 14, 10).translate(px, py, pz), i === 0 ? mMain : (i > 5 ? mAcc : mMain), true);
    }
  },
  cactus_hair: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairCtx(d, it, add);
    put(cyl(0.145, 0.175, 0.22, 14).translate(0, 0.19, 0), mMain, true);
    put(sph(0.145, 0.08, 0.145, 14, 8).translate(0, 0.30, 0), mMain, true);
    // Two cactus arms sticking out left & right!
    for (const s of [1, -1]) {
      put(cyl(0.036, 0.036, 0.11, 10).rotateZ(s * Math.PI / 2).translate(s * 0.17, 0.19, 0), mMain, true);
      put(cyl(0.036, 0.036, 0.12, 10).translate(s * 0.22, 0.25, 0), mMain, true);
    }
    // Pink cactus flower on top
    put(sph(0.048, 0.036, 0.048, 10, 8).translate(0, 0.38, 0.02), mAcc, true);
  },
};

// ======================= 2. TOPS (+18 UNIQUE 3D SHAPES) =======================
export const TOP_V2 = {
  turtleneck_rib: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck + 0.02, 0.015)]);
    add([d.j.chest, mesh(cyl(T.neckR + 0.014, T.neckR + 0.016, 0.075, 18).translate(0, Y.neck - Y.waist + 0.03, 0), M(it))]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, { inf: 0.012, cuff: true }).forEach(add);
  },
  chainmail_hauberk: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.06, Y.neck, 0.022)]);
    add([d.j.chest, neckBand(d, it, 0.036, 0.020, A(it))]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.85, { inf: 0.020, cuff: true }).forEach(add);
      add([d.j.chest, mesh(sph(0.068, 0.044, 0.068, 12, 8).translate(s * (T.sh + 0.02), Y.shoulder - Y.waist + 0.015, 0), A(it))]);
    }
    add([d.j.chest, mesh(box(0.036, 0.24, 0.014).translate(0, Y.chest - Y.waist, frontTorsoZ(d, Y.chest, 0.028)), A(it))]);
    add([d.j.chest, mesh(box(0.14, 0.036, 0.014).translate(0, Y.chest - Y.waist + 0.04, frontTorsoZ(d, Y.chest, 0.028)), A(it))]);
  },
  cape_blouse: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck - 0.02, 0.016)]);
    // Wide batwing/capelet drape over shoulders
    add([d.j.chest, mesh(lathe([
      [T.sh + 0.14, Y.chest - Y.waist - 0.06],
      [T.sh + 0.11, Y.shoulder - Y.waist - 0.01],
      [T.neckR + 0.02, Y.neck - Y.waist],
    ], 0.78, 22, 0, 2), M(it, { doubleSide: true }))]);
    add([d.j.chest, neckBand(d, it, 0.024, 0.016, A(it))]);
  },
  bustier_lace: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.chest + 0.05, 0.014)]);
    const fz = frontTorsoZ(d, Y.chest, 0.020);
    // Boning vertical ribs + sweetheart bust cups
    for (const x of [-0.06, -0.02, 0.02, 0.06]) {
      add([d.j.chest, mesh(box(0.008, Y.chest - Y.waist + 0.04, 0.008).translate(x, (Y.chest - Y.waist) * 0.5, fz), A(it), false)]);
    }
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(torus(0.042, 0.008, 6, 14, Math.PI).translate(s * 0.045, Y.chest - Y.waist + 0.025, fz), A(it), false)]);
    }
  },
  bolero_shrug: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.chest - 0.02, Y.shoulder + 0.02, 0.018)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.58, { inf: 0.016, puff: 0.032, cuff: true }).forEach(add);
  },
  sumo_mawashi_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Iconic braided Yokozuna sacred sumo rope belt with zigzag white shide paper streamers!
    const r = T.waist + 0.055;
    add([d.j.chest, mesh(torus(r, 0.042, 10, 22).scale(1.04, 1, 0.85).rotateX(Math.PI / 2).translate(0, 0.02, 0), M(it))]);
    add([d.j.chest, mesh(torus(r + 0.008, 0.016, 6, 22).scale(1.04, 1, 0.85).rotateX(Math.PI / 2).translate(0, 0.02, 0), A(it), false)]);
    for (let i = -2; i <= 2; i++) {
      add([d.j.chest, mesh(box(0.032, 0.14, 0.010).rotateZ(i * 0.12).translate(i * 0.052, -0.07, frontTorsoZ(d, Y.waist, 0.07)), M(it))]);
    }
    add([d.j.chest, mesh(sph(0.078, 0.072, 0.068, 12, 8).translate(0, 0.04, -(T.waist * 0.78 + 0.07)), M(it))]);
  },
  barong_tagalog: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.04, Y.neck - 0.01, 0.017)]);
    const fz = frontTorsoZ(d, Y.chest, 0.022);
    // U-shaped embroidered chest bib + mandarin collar
    add([d.j.chest, mesh(box(T.chest * 0.85, Y.shoulder - Y.waist + 0.02, 0.012).translate(0, (Y.shoulder + Y.waist) * 0.5 - Y.waist, fz + 0.004), A(it))]);
    add([d.j.chest, neckBand(d, it, 0.028, 0.015, A(it))]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, { inf: 0.014, cuff: true }).forEach(add);
  },
  traditional_tang: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.03, Y.neck, 0.018)]);
    add([d.j.chest, neckBand(d, it, 0.034, 0.016, A(it))]);
    for (let i = 0; i < 5; i++) {
      const yy = Y.waist + 0.02 + i * ((Y.shoulder - Y.waist) * 0.20);
      const fz = frontTorsoZ(d, yy, 0.022);
      add([d.j.chest, mesh(box(0.068, 0.010, 0.010).translate(0, yy - Y.waist, fz + 0.005), A(it), false)]);
      add([d.j.chest, mesh(sph(0.011, 0.011, 0.011, 8, 6).translate(0, yy - Y.waist, fz + 0.008), A(it), false)]);
    }
    for (const s of [1, -1]) sleeve(d, it, s, 0.92, { inf: 0.016, cuff: true }).forEach(add);
  },
  matador_jacket_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.01, Y.neck - 0.01, 0.020)]);
    // Huge sculpted gold matador epaulets + braided chest frogs!
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.072, 0.042, 0.068, 12, 8).translate(s * (T.sh + 0.025), Y.shoulder - Y.waist + 0.015, 0), A(it))]);
      sleeve(d, it, s, 0.94, { inf: 0.015, cuff: true }).forEach(add);
    }
    for (let i = 0; i < 4; i++) {
      const yy = Y.waist + 0.05 + i * 0.052;
      add([d.j.chest, mesh(box(T.chest * 0.9, 0.012, 0.012).translate(0, yy - Y.waist, frontTorsoZ(d, yy, 0.024)), A(it), false)]);
    }
  },
  football_shoulder_pads: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.03, Y.neck, 0.026)]);
    // MASSIVE American football shoulder pads!
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.115, 0.075, 0.11, 14, 10).translate(s * (T.sh + 0.055), Y.shoulder - Y.waist + 0.025, 0), M(it))]);
      add([d.j.chest, mesh(torus(0.085, 0.014, 6, 16).rotateY(Math.PI / 2).translate(s * (T.sh + 0.06), Y.shoulder - Y.waist + 0.025, 0), A(it))]);
      sleeve(d, it, s, 0.42, { inf: 0.026 }).forEach(add);
    }
    const fz = frontTorsoZ(d, Y.chest, 0.032);
    const numTex = memePrintTex('99', it.c, it.c2 || '#ffffff');
    add([d.j.chest, mesh(new THREE.PlaneGeometry(0.16, 0.16).translate(0, Y.chest - Y.waist, fz + 0.008), new THREE.MeshBasicMaterial({ map: numTex }), false)]);
  },
  // --- XÓM LẦY SCULPTED TOPS ---
  sandwich_board: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.shoulder - Y.hip) + 0.14;
    const cy = (Y.shoulder + Y.hip) * 0.5 - Y.waist;
    const tex = memePrintTex('CẦN VIỆC LÀM', it.c, it.c2 || '#c92a46');
    const faceMat = new THREE.MeshBasicMaterial({ map: tex });
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(T.sh * 2.1, h, 0.026).rotateX(s * -0.14).translate(0, cy, s * (T.chest * 0.85 + 0.075)), M(it))]);
      add([d.j.chest, mesh(new THREE.PlaneGeometry(T.sh * 1.9, h * 0.85).rotateY(s === 1 ? 0 : Math.PI).rotateX(s * -0.14).translate(0, cy, s * (T.chest * 0.85 + 0.090)), faceMat, false)]);
      add([d.j.chest, mesh(box(0.024, 0.016, T.chest * 1.8 + 0.15).translate(s * (T.sh * 0.6), Y.shoulder - Y.waist + 0.04, 0), A(it))]);
    }
  },
  bubble_wrap_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const mat = new THREE.MeshToonMaterial({ color: it.c, transparent: true, opacity: 0.72 });
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.shoulder + 0.01, 0.028, { mat })]);
    const bMat = toon(it.c2 || '#6ec6ff');
    for (let row = 0; row < 5; row++) {
      const yy = Y.waist - 0.01 + row * 0.062;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const r = T.chest + 0.035;
        add([d.j.chest, mesh(sph(0.022, 0.022, 0.022, 8, 6).translate(Math.cos(a) * r, yy - Y.waist, Math.sin(a) * r * 0.78), bMat, false)]);
      }
    }
  },
  newspaper_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.shoulder - Y.hip) + 0.08;
    const tex = memePrintTex('TIN NÓNG XÓM LẦY', it.c || '#d9d3cb', it.c2 || '#15121b');
    add([d.j.chest, mesh(cyl(T.sh * 0.95, T.hip + 0.07, h, 6).scale(1, 1, 0.80).translate(0, (Y.shoulder + Y.hip) * 0.5 - Y.waist, 0), M(it))]);
    const fz = T.chest * 0.82 + 0.045;
    add([d.j.chest, mesh(new THREE.PlaneGeometry(0.20, 0.16).translate(0, Y.chest - Y.waist, fz), new THREE.MeshBasicMaterial({ map: tex }), false)]);
  },
  barrel_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.shoulder - Y.hip) + 0.14;
    const r = Math.max(T.sh, T.hip) + 0.095;
    add([d.j.chest, mesh(lathe([[r * 0.86, -h * 0.52], [r, 0], [r * 0.88, h * 0.48]], 1, 18, 0, 2).translate(0, (Y.chest + Y.hip) * 0.5 - Y.waist, 0), M(it))]);
    for (const dy of [-0.10, 0.10]) {
      add([d.j.chest, mesh(torus(r * 0.96, 0.014, 6, 20).rotateX(Math.PI / 2).translate(0, (Y.chest + Y.hip) * 0.5 - Y.waist + dy, 0), A(it))]);
    }
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cyl(0.012, 0.012, 0.18, 8).translate(s * (T.sh * 0.58), Y.shoulder - Y.waist - 0.01, 0), A(it))]);
    }
  },
  lifebuoy_vest: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.shoulder + 0.02, 0.034)]);
    // Huge puffy horse-collar lifebuoy pillow behind/around neck!
    add([d.j.chest, mesh(torus(T.neckR + 0.10, 0.052, 10, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist + 0.01, -0.02), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.09, 0.18, 0.065).translate(s * (T.chest * 0.46), Y.chest - Y.waist - 0.02, frontTorsoZ(d, Y.chest, 0.04)), M(it))]);
      add([d.j.chest, mesh(box(0.092, 0.024, 0.070).translate(s * (T.chest * 0.46), Y.chest - Y.waist + 0.02, frontTorsoZ(d, Y.chest, 0.042)), A(it), false)]);
    }
  },
  durian_armor_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.shoulder + 0.02, 0.032)]);
    const spM = A(it);
    for (let row = 0; row < 4; row++) {
      const yy = Y.waist - 0.01 + row * 0.078;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + (row % 2) * 0.3;
        const r = T.chest + 0.038;
        const px = Math.cos(a) * r, pz = Math.sin(a) * r * 0.78;
        const sp = mesh(cone(0.022, 0.058, 5), spM, false);
        sp.position.set(px, yy - Y.waist, pz);
        sp.lookAt(px * 3, yy - Y.waist, pz * 3);
        sp.rotateX(Math.PI / 2);
        add([d.j.chest, sp]);
      }
    }
  },
  led_vest_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.shoulder + 0.01, 0.020)]);
    const fz = frontTorsoZ(d, Y.chest, 0.028);
    add([d.j.chest, mesh(box(T.chest * 1.45, 0.14, 0.026).translate(0, Y.chest - Y.waist, fz + 0.008), toon('#15121b'))]);
    const tex = memePrintTex('VIP PRO MAX', '#15121b', it.c2 || '#00e5ff');
    add([d.j.chest, mesh(new THREE.PlaneGeometry(T.chest * 1.32, 0.11).translate(0, Y.chest - Y.waist, fz + 0.022), new THREE.MeshBasicMaterial({ map: tex }), false)]);
    add([d.j.chest, mesh(box(T.chest * 1.50, 0.15, 0.010).translate(0, Y.chest - Y.waist, fz + 0.004), basicMat(it.c2 || '#00e5ff'), false)]);
  },
  pillow_strap_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const fz = frontTorsoZ(d, Y.chest, 0.025);
    // Giant fluffy rectangular pillow strapped right onto the chest with belt!
    add([d.j.chest, mesh(sph(T.sh * 1.15, 0.22, 0.11, 16, 12).translate(0, Y.chest - Y.waist - 0.02, fz + 0.075), M(it))]);
    add([d.j.chest, mesh(torus(T.waist + 0.06, 0.014, 8, 22).scale(1.05, 1, 1.35).rotateX(Math.PI / 2).translate(0, 0.02, 0.04), A(it))]);
    add([d.j.chest, mesh(box(0.045, 0.036, 0.020).translate(0, 0.02, fz + 0.175), toon('#d4af37'))]);
  },
};

// ======================= 3. OUTERWEAR (+14 UNIQUE 3D SHAPES) =======================
export const OUTER_V2 = {
  angel_feather_cape: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Layered feather mantle cape sweeping down the back!
    add([d.j.chest, mesh(torus(T.sh + 0.05, 0.048, 10, 22).scale(1.06, 1, 0.84).rotateX(Math.PI / 2).translate(0, Y.shoulder - Y.waist + 0.01, -0.02), A(it))]);
    const h = Y.shoulder - Y.ankle - 0.08;
    add([d.j.chest, mesh(new THREE.CylinderGeometry(T.sh + 0.05, T.hip + 0.28, h, 20, 1, true, Math.PI * 0.62, Math.PI * 1.76).translate(0, Y.shoulder - Y.waist - h * 0.5, -0.04), M(it, { doubleSide: true }))]);
    for (let i = -3; i <= 3; i++) {
      add([d.j.chest, mesh(sph(0.045, 0.12, 0.024, 8, 6).translate(i * 0.068, Y.shoulder - Y.waist - 0.10, -(T.chest * 0.78 + 0.07)), M(it), false)]);
    }
  },
  poncho_fringe: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, mesh(lathe([
      [T.sh + 0.22, Y.hip - Y.waist - 0.08],
      [T.sh + 0.12, Y.chest - Y.waist],
      [T.neckR + 0.024, Y.neck - Y.waist + 0.01],
    ], 0.80, 24, 0, 2), M(it, { doubleSide: true }))]);
    // Decorative tassel fringe all around bottom edge
    const r = T.sh + 0.22;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      add([d.j.chest, mesh(cyl(0.008, 0.006, 0.055, 6).translate(Math.cos(a) * r, Y.hip - Y.waist - 0.105, Math.sin(a) * r * 0.80), A(it), false)]);
    }
  },
  fur_stole_wrap: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Plush boa wrap draping over both shoulders + long front tails!
    add([d.j.chest, mesh(torus(T.sh + 0.04, 0.055, 10, 24).scale(1.06, 1, 0.82).rotateX(Math.PI / 2).translate(0, Y.shoulder - Y.waist - 0.01, -0.01), M(it))]);
    const fz = frontTorsoZ(d, Y.chest, 0.045);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cyl(0.048, 0.040, 0.34, 12).translate(s * (T.chest * 0.65), Y.chest - Y.waist - 0.12, fz + 0.02), M(it))]);
      add([d.j.chest, mesh(sph(0.045, 0.045, 0.045, 10, 8).translate(s * (T.chest * 0.65), Y.chest - Y.waist - 0.29, fz + 0.02), A(it), false)]);
    }
  },
  duffle_coat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, outerShell(d, it, Y.knee + 0.06, Y.neck, 0.028)]);
    // Hood resting on back + iconic horn toggle buttons!
    add([d.j.chest, mesh(sph(0.115, 0.095, 0.105, 14, 10).translate(0, Y.neck - Y.waist - 0.02, -(T.chest * 0.78 + 0.055)), M(it))]);
    for (let i = 0; i < 4; i++) {
      const yy = Y.hip + 0.04 + i * 0.085;
      add([d.j.chest, mesh(cyl(0.009, 0.011, 0.065, 8).rotateZ(Math.PI / 2).translate(0, yy - Y.waist, frontTorsoZ(d, yy, 0.036)), A(it), false)]);
    }
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, { isOuter: true, inf: 0.024, cuff: true }).forEach(add);
  },
  astronaut_jet_rig: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Sci-fi EVA shoulder thruster frame with joystick arms and glowing thrusters!
    const bz = -(T.chest * 0.75 + 0.10);
    add([d.j.chest, mesh(box(T.sh * 2.1, 0.36, 0.16).translate(0, Y.chest - Y.waist + 0.02, bz), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.065, 0.055, 0.34).translate(s * (T.sh + 0.08), Y.waist - Y.waist + 0.04, 0.04), M(it))]);
      add([d.j.chest, mesh(cyl(0.038, 0.052, 0.12, 12).translate(s * (T.sh * 0.65), Y.chest - Y.waist - 0.20, bz), A(it))]);
      add([d.j.chest, mesh(cone(0.040, 0.12, 10).rotateX(Math.PI).translate(s * (T.sh * 0.65), Y.chest - Y.waist - 0.31, bz), basicMat(it.c2 || '#00e5ff'), false)]);
    }
  },
  baseball_dugout_cape: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, outerShell(d, it, Y.hip - 0.06, Y.neck, 0.032, { open: true, openGap: 0.28 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, { isOuter: true, inf: 0.028, mat: A(it), cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.028, 0.024, A(it))]);
  },
  doctor_lab_coat: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, outerShell(d, it, Y.knee + 0.02, Y.neck - 0.01, 0.024, { open: true, openGap: 0.36 })]);
    collarLapels(d, it, add, 0.028, M(it));
    // Chest pocket with blue & red pens sticking out!
    const fz = frontTorsoZ(d, Y.chest, 0.030);
    add([d.j.chest, mesh(box(0.055, 0.058, 0.010).translate(-T.chest * 0.45, Y.chest - Y.waist - 0.01, fz + 0.006), A(it), false)]);
    add([d.j.chest, mesh(cyl(0.004, 0.004, 0.045, 6).translate(-T.chest * 0.48, Y.chest - Y.waist + 0.026, fz + 0.010), toon('#2f6fd6'), false)]);
    add([d.j.chest, mesh(cyl(0.004, 0.004, 0.042, 6).translate(-T.chest * 0.42, Y.chest - Y.waist + 0.024, fz + 0.010), toon('#c92a46'), false)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, { isOuter: true, inf: 0.020 }).forEach(add);
  },
  judge_robe_outer: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, outerShell(d, it, Y.ankle + 0.08, Y.neck, 0.032)]);
    // White pleated jabot collar bib at throat!
    const fz = frontTorsoZ(d, Y.shoulder - 0.02, 0.038);
    add([d.j.chest, mesh(box(0.088, 0.14, 0.018).translate(0, Y.shoulder - Y.waist - 0.04, fz + 0.006), A(it))]);
    add([d.j.chest, neckBand(d, it, 0.032, 0.026, A(it))]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.92, { isOuter: true, inf: 0.030, bell: 0.055 }).forEach(add);
  },
  // --- XÓM LẦY SCULPTED OUTERWEAR ---
  quilt_blanket_wrap: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Thick bulky puffy winter quilt wrapped like a giant burrito around the whole body!
    add([d.j.chest, mesh(lathe([
      [T.hip + 0.17, Y.ankle + 0.12 - Y.waist],
      [T.hip + 0.16, Y.hip - Y.waist],
      [T.sh + 0.14, Y.shoulder - Y.waist + 0.02],
      [T.neckR + 0.04, Y.neck - Y.waist + 0.04],
    ], 0.85, 22, 0, 2), M(it, { doubleSide: true }))]);
    add([d.j.chest, mesh(torus(T.neckR + 0.12, 0.058, 10, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist + 0.01, -0.02), A(it))]);
  },
  bedsheet_toga: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, outerShell(d, it, Y.knee - 0.10, Y.shoulder + 0.02, 0.026, { open: true, openGap: 0.25 })]);
    // Diagonal draped sash over one shoulder with a giant knot!
    add([d.j.chest, mesh(cyl(0.042, 0.042, 0.56, 12).rotateZ(-0.62).translate(0, Y.chest - Y.waist - 0.06, frontTorsoZ(d, Y.chest, 0.034)), A(it))]);
    add([d.j.chest, mesh(sph(0.055, 0.050, 0.055, 10, 8).translate(T.sh * 0.72, Y.shoulder - Y.waist + 0.02, 0.04), A(it))]);
  },
  shower_curtain_cape: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Transparent shower curtain hanging from a curved metal rod with plastic curtain rings!
    const rodY = Y.neck - Y.waist + 0.02;
    add([d.j.chest, mesh(torus(T.sh + 0.06, 0.010, 8, 22).rotateX(Math.PI / 2).translate(0, rodY, -0.02), toon('#d9d3cb'))]);
    for (let i = 0; i < 10; i++) {
      const a = Math.PI + (i / 9) * Math.PI;
      add([d.j.chest, mesh(torus(0.016, 0.004, 6, 10).translate(Math.cos(a) * (T.sh + 0.06), rodY - 0.012, Math.sin(a) * (T.sh + 0.06) - 0.02), A(it), false)]);
    }
    const mat = new THREE.MeshToonMaterial({ color: it.c, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
    add([d.j.chest, mesh(new THREE.CylinderGeometry(T.sh + 0.06, T.hip + 0.24, Y.neck - Y.ankle - 0.14, 18, 1, true, Math.PI * 0.65, Math.PI * 1.7).translate(0, (Y.neck + Y.ankle + 0.14) * 0.5 - Y.waist, -0.02), mat)]);
  },
  umbrella_cloak: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Actual open umbrella canopy resting directly on the shoulders!
    add([d.j.chest, mesh(cone(T.sh + 0.34, 0.20, 12).translate(0, Y.shoulder - Y.waist + 0.05, 0), M(it, { doubleSide: true }))]);
    add([d.j.chest, mesh(torus(T.sh + 0.34, 0.010, 6, 12).rotateX(Math.PI / 2).translate(0, Y.shoulder - Y.waist - 0.05, 0), A(it))]);
  },
  cardboard_mech_outer: (d, it, add) => {
    const Y = d.Y, T = d.T, L = d.L;
    // Blocky cardboard Gundam-style mech shoulder boxes + box forearms!
    add([d.j.chest, mesh(box(T.sh * 2.1, Y.shoulder - Y.waist + 0.08, T.chest * 1.9).translate(0, (Y.shoulder - Y.waist) * 0.5, 0), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.18, 0.18, 0.18).translate(s * (T.sh + 0.10), Y.shoulder - Y.waist + 0.04, 0), M(it))]);
      add([d.j.chest, mesh(box(0.06, 0.04, 0.19).translate(s * (T.sh + 0.10), Y.shoulder - Y.waist + 0.04, 0), A(it), false)]);
      add([d.j.arm[s].el, mesh(box(0.11, L.armLo * 0.9, 0.11).translate(0, -L.armLo * 0.45, 0), M(it))]);
    }
  },
  leaf_bush_ghillie: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Camo sniper ghillie bush — covered in leafy spheres all over torso & shoulders!
    const m1 = M(it), m2 = A(it);
    for (let row = 0; row < 5; row++) {
      const yy = Y.hip - 0.04 + row * 0.095;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + row * 0.4;
        const r = T.sh + 0.05 - row * 0.008;
        add([d.j.chest, mesh(sph(0.075, 0.065, 0.075, 8, 6).translate(Math.cos(a) * r, yy - Y.waist, Math.sin(a) * r * 0.82), (i + row) % 2 === 0 ? m1 : m2, false)]);
      }
    }
  },
};

// ======================= 4. BOTTOMS (+14 UNIQUE 3D SHAPES) =======================
export const BOTTOM_V2 = {
  merman_tail_bottom: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it, { highWaist: true })]);
    // Sculpted mermaid/merman tail tapering down to ankles + huge sweeping dual caudal fins!
    const h = Y.waist - Y.ankle + 0.06;
    add([d.j.hips, mesh(lathe([
      [0.058, Y.ankle - Y.hip - 0.04],
      [0.088, Y.knee - Y.hip],
      [T.hip + 0.022, 0.01],
      [T.waist + 0.014, Y.waist - Y.hip + 0.02],
    ], 0.78, 20, 0, 1), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.hips, mesh(cone(0.14, 0.34, 8).scale(1, 1, 0.25).rotateZ(s * -0.78).translate(s * 0.16, Y.ankle - Y.hip - 0.08, 0.02), A(it))]);
    }
    add([d.j.hips, waistBand(d, it, 0.032, 0.016, A(it))]);
  },
  dhoti_pants: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it, { inf: 0.024 })]);
    add([d.j.hips, skirt(d, it, Y.waist, Y.knee + 0.04, T.hip + 0.08, { pleats: 10 })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.92, 0.016, -0.008).forEach(add);
    add([d.j.hips, waistBand(d, it, 0.032, 0.018, A(it))]);
  },
  lederhosen: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it, { highWaist: true })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.44, 0.014, 0.008, { cuff: true }).forEach(add);
    // Iconic Bavarian leather suspenders + embroidered front chest cross-bar!
    const fz = frontTorsoZ(d, Y.chest, 0.022);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.026, Y.shoulder - Y.waist + 0.04, 0.012).translate(s * (T.chest * 0.48), (Y.shoulder - Y.waist) * 0.5, fz), M(it))]);
    }
    add([d.j.chest, mesh(box(T.chest * 1.05, 0.042, 0.015).translate(0, Y.chest - Y.waist, fz + 0.004), A(it))]);
  },
  tutu_ballet: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    // Horizontal stiff classical pancake ballet tutu!
    add([d.j.hips, mesh(cyl(T.hip + 0.02, T.hip + 0.24, 0.065, 28).translate(0, Y.waist - Y.hip - 0.04, 0), M(it, { doubleSide: true }))]);
    add([d.j.hips, mesh(torus(T.hip + 0.24, 0.014, 6, 28).rotateX(Math.PI / 2).translate(0, Y.waist - Y.hip - 0.072, 0), A(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.42);
  },
  tiered_ruffle_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    for (let i = 0; i < 4; i++) {
      const top = Y.waist - i * 0.11;
      const bot = top - 0.135;
      add([d.j.hips, skirt(d, it, top, bot, T.hip + 0.08 + i * 0.055, { pleats: 14, mat: i % 2 === 0 ? M(it, { doubleSide: true }) : A(it, { doubleSide: true }) })]);
    }
  },
  hoop_crinoline: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    // Exposed Victorian birdcage hoop skirt skeleton!
    for (let i = 0; i < 5; i++) {
      const yy = Y.waist - Y.hip - 0.06 - i * 0.125;
      const r = T.hip + 0.06 + i * 0.068;
      add([d.j.hips, mesh(torus(r, 0.009, 6, 28).rotateX(Math.PI / 2).translate(0, yy, 0), M(it))]);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add([d.j.hips, mesh(cyl(0.006, 0.006, 0.56, 6).rotateZ(Math.cos(a) * -0.45).rotateX(Math.sin(a) * 0.45).translate(Math.cos(a) * (T.hip + 0.18), Y.waist - Y.hip - 0.31, Math.sin(a) * (T.hip + 0.18)), A(it), false)]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.46);
  },
  cargo_parachute: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { inf: 0.018 })]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.96, 0.034, 0.012, { jogger: true, cuff: true }).forEach(add);
      add([d.j.leg[s].th, mesh(box(0.048, 0.095, 0.075).translate(s * (d.T.legR + 0.042), -d.L.legUp * 0.45, 0), A(it))]);
    }
  },
  chaps_cowboy: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { mat: toon('#2f6fd6') })]);
    add([d.j.hips, waistBand(d, it, 0.036, 0.016, A(it))]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.96, 0.018, 0.014).forEach(add);
      for (let i = 0; i < 7; i++) {
        add([d.j.leg[s].th, mesh(cyl(0.006, 0.004, 0.055, 6).rotateZ(s * 0.55).translate(s * (d.T.legR + 0.038), -0.05 - i * 0.042, 0), A(it), false)]);
      }
    }
  },
  // --- XÓM LẦY SCULPTED BOTTOMS ---
  kiddie_pool_skirt: (d, it, add) => {
    const T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    const r = T.hip + 0.24;
    for (let i = 0; i < 3; i++) {
      add([d.j.hips, mesh(torus(r, 0.045, 10, 28).rotateX(Math.PI / 2).translate(0, 0.02 - i * 0.075, 0), i === 1 ? A(it) : M(it))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.52);
  },
  lamp_shade_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    add([d.j.hips, skirt(d, it, Y.waist + 0.01, Y.knee + 0.02, T.hip + 0.20, { pleats: 18 })]);
    add([d.j.hips, mesh(torus(T.hip + 0.20, 0.012, 6, 26).rotateX(Math.PI / 2).translate(0, Y.knee - Y.hip + 0.02, 0), A(it))]);
    // Hanging pull-chain string with golden bead!
    add([d.j.hips, mesh(cyl(0.005, 0.005, 0.14, 6).translate(T.hip + 0.16, Y.knee - Y.hip - 0.05, 0.08), A(it), false)]);
    add([d.j.hips, mesh(sph(0.018, 0.018, 0.018, 8, 6).translate(T.hip + 0.16, Y.knee - Y.hip - 0.12, 0.08), toon('#ffd56b'), false)]);
  },
  traffic_barrier_skirt: (d, it, add) => {
    const T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    // 4-sided striped construction barrier wrapped around waist!
    const w = T.hip * 2.55;
    for (const s of [1, -1]) {
      add([d.j.hips, mesh(box(w, 0.11, 0.026).translate(0, 0.02, s * (T.hip + 0.10)), M(it))]);
      add([d.j.hips, mesh(box(w, 0.11, 0.026).translate(0, -0.13, s * (T.hip + 0.10)), A(it))]);
      add([d.j.hips, mesh(box(0.032, 0.34, 0.032).translate(s * (w * 0.45), -0.06, T.hip + 0.10), toon('#2b2533'))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.34);
  },
  cardboard_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    const h = Y.waist - Y.knee + 0.04;
    add([d.j.hips, mesh(cyl(T.waist + 0.04, T.hip + 0.18, h, 4).rotateY(Math.PI / 4).translate(0, (Y.waist + Y.knee) * 0.5 - Y.hip, 0), M(it))]);
    const tex = memePrintTex('MÌ TÔM HẢO HẢO', it.c || '#a6774f', it.c2 || '#c92a46');
    add([d.j.hips, mesh(new THREE.PlaneGeometry(0.20, 0.12).translate(0, -0.04, T.hip + 0.09), new THREE.MeshBasicMaterial({ map: tex }), false)]);
  },
  plastic_chair_skirt: (d, it, add) => {
    const T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    // Iconic Vietnamese red plastic stool worn right around the waist with 4 splayed legs!
    const r = T.hip + 0.11;
    add([d.j.hips, mesh(box(r * 2, 0.055, r * 1.9).translate(0, 0.02, 0), M(it))]);
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      add([d.j.hips, mesh(cyl(0.020, 0.015, 0.34, 8).rotateZ(sx * -0.14).rotateX(sz * 0.14).translate(sx * (r * 0.82), -0.15, sz * (r * 0.78)), M(it))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.34);
  },
  cabbage_leaf_skirt: (d, it, add) => {
    const T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    for (let ring = 0; ring < 2; ring++) {
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + ring * 0.35;
        const r = T.hip + 0.06 + ring * 0.065;
        const leaf = mesh(sph(0.095, 0.155, 0.032, 10, 8), ring === 0 ? M(it) : A(it));
        leaf.position.set(Math.cos(a) * r, -0.08 - ring * 0.06, Math.sin(a) * r);
        leaf.rotation.set(0, -a + Math.PI / 2, 0.32 + ring * 0.16);
        add([d.j.hips, leaf]);
      }
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },
};

// ======================= 5. DRESSES & FULL COSTUMES (+20 UNIQUE 3D SHAPES) =======================
export const DRESS_V2 = {
  wedding_train: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.chest + 0.05, 0.014)]);
    add([d.j.hips, skirt(d, it, Y.waist + 0.01, Y.ankle - 0.02, T.hip + 0.28, { poof: 0.04 })]);
    // Sweeping royal wedding train trailing far behind!
    add([d.j.hips, mesh(cone(0.32, 0.85, 16).scale(1.1, 1, 0.35).rotateX(1.12).translate(0, Y.ankle - Y.hip + 0.12, -0.45), M(it, { doubleSide: true }))]);
    add([d.j.hips, waistBand(d, it, 0.028, 0.014, A(it))]);
  },
  ao_giao_linh: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck - 0.01, 0.018)]);
    add([d.j.hips, skirt(d, it, Y.waist, Y.ankle + 0.02, T.hip + 0.15)]);
    // Crossed Y-collar border + long loose sleeves + wide waist sash
    const fz = frontTorsoZ(d, Y.chest, 0.024);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.028, 0.22, 0.012).rotateZ(s * 0.55).translate(s * 0.025, Y.chest - Y.waist + 0.03, fz + 0.004), A(it))]);
      sleeve(d, it, s, 0.94, { inf: 0.024, bell: 0.065 }).forEach(add);
    }
    add([d.j.hips, waistBand(d, it, 0.048, 0.018, A(it))]);
  },
  qilin_hanfu: (d, it, add) => {
    const Y = d.Y, T = d.T, L = d.L;
    add([d.j.chest, torsoShell(d, it, Y.waist, Y.chest + 0.06, 0.016, { mat: A(it) })]);
    add([d.j.hips, skirt(d, it, Y.chest - 0.02, Y.ankle - 0.01, T.hip + 0.22, { pleats: 14 })]);
    // Flowing fairy ribbon loop behind shoulders!
    add([d.j.chest, mesh(torus(T.sh + 0.16, 0.016, 6, 24, Math.PI * 1.25).rotateZ(-0.3).translate(0, Y.shoulder - Y.waist + 0.06, -0.14), A(it))]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.92, { inf: 0.022, bell: 0.085 }).forEach(add);
      add([d.j.arm[s].el, mesh(box(0.06, 0.28, 0.14).translate(0, -L.armLo * 0.8, -0.03), A(it, { doubleSide: true }))]);
    }
  },
  scottish_kilt_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck - 0.01, 0.018, { mat: A(it) })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, { inf: 0.016, mat: A(it) }).forEach(add);
    add([d.j.hips, pelvisShell(d, it)]);
    add([d.j.hips, skirt(d, it, Y.waist, Y.knee + 0.02, T.hip + 0.10, { pleats: 16 })]);
    // Tartan diagonal shoulder plaid + furry sporran pouch!
    add([d.j.chest, mesh(box(0.055, 0.44, 0.018).rotateZ(-0.62).translate(0, Y.chest - Y.waist - 0.02, frontTorsoZ(d, Y.chest, 0.026)), M(it))]);
    add([d.j.hips, mesh(sph(0.058, 0.068, 0.032, 10, 8).translate(0, -0.08, T.hip * 0.78 + 0.032), toon('#f6e7d8'))]);
  },
  matador_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    TOP_V2.matador_jacket_top(d, it, add);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.88, 0.010, -0.005).forEach(add);
    // Red bullfighter cape draped over left arm!
    add([d.j.chest, mesh(cone(0.24, 0.56, 12).scale(0.8, 1, 0.5).rotateZ(0.28).translate(-T.sh - 0.14, Y.hip - Y.waist - 0.06, 0.02), toon('#c92a46', 'plain', '#ffffff', { doubleSide: true }))]);
  },
  scuba_diver: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck, 0.015)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.010 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.94, { inf: 0.012 }).forEach(add);
      legShell(d, it, s, 0.95, 0.011).forEach(add);
    }
    // Dual yellow air tanks on back + weight belt!
    const bz = -(T.chest * 0.75 + 0.075);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cyl(0.044, 0.044, 0.32, 12).translate(s * 0.055, Y.chest - Y.waist - 0.04, bz), A(it))]);
      add([d.j.chest, mesh(sph(0.044, 0.044, 0.044, 10, 8).translate(s * 0.055, Y.chest - Y.waist + 0.12, bz), A(it))]);
    }
    add([d.j.hips, waistBand(d, it, 0.036, 0.018, A(it))]);
  },
  fencing_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.04, Y.neck + 0.02, 0.018)]);
    add([d.j.chest, neckBand(d, it, 0.042, 0.018, M(it))]);
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, { inf: 0.015, cuff: true }).forEach(add);
      legShell(d, it, s, 0.78, 0.014, 0.004, { cuff: true }).forEach(add);
    }
    // Diagonal chest heart guard plastron
    add([d.j.chest, mesh(box(0.04, Y.shoulder - Y.waist + 0.02, 0.014).rotateZ(0.32).translate(0.02, (Y.shoulder - Y.waist) * 0.5, frontTorsoZ(d, Y.chest, 0.024)), A(it))]);
  },
  beekeeper_suit: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck, 0.028)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.024 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.96, { inf: 0.024, cuff: true }).forEach(add);
      legShell(d, it, s, 0.96, 0.024, 0, { jogger: true }).forEach(add);
    }
    // Iconic wide-brim beekeeper hat + translucent black mesh veil over face!
    add([d.j.head, mesh(cyl(0.28, 0.29, 0.016, 22).translate(0, 0.16, 0), M(it))]);
    add([d.j.head, mesh(cyl(0.16, 0.18, 0.11, 18).translate(0, 0.22, 0), M(it))]);
    const veilMat = new THREE.MeshToonMaterial({ color: it.c2 || '#15121b', transparent: true, opacity: 0.45, side: THREE.DoubleSide });
    add([d.j.head, mesh(cyl(0.24, 0.21, 0.34, 20, true).translate(0, -0.01, 0), veilMat)]);
  },
  medieval_jester_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Split left/right harlequin colors + jagged jester collar with bells!
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck - 0.01, 0.018)]);
    add([d.j.hips, pelvisShell(d, it)]);
    sleeve(d, it, 1, 0.94, { inf: 0.016, mat: M(it), cuff: true }).forEach(add);
    sleeve(d, it, -1, 0.94, { inf: 0.016, mat: A(it), cuff: true }).forEach(add);
    legShell(d, it, 1, 0.95, 0.012, 0, { mat: A(it) }).forEach(add);
    legShell(d, it, -1, 0.95, 0.012, 0, { mat: M(it) }).forEach(add);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add([d.j.chest, mesh(cone(0.036, 0.10, 6).rotateX(Math.PI).translate(Math.cos(a) * (T.sh * 0.85), Y.shoulder - Y.waist - 0.02, Math.sin(a) * (T.chest * 0.85)), i % 2 === 0 ? A(it) : M(it))]);
      add([d.j.chest, mesh(sph(0.016, 0.016, 0.016, 8, 6).translate(Math.cos(a) * (T.sh * 0.85), Y.shoulder - Y.waist - 0.075, Math.sin(a) * (T.chest * 0.85)), toon('#ffd56b'), false)]);
    }
  },
  race_driver_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck, 0.020)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.014 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, { inf: 0.018, cuff: true }).forEach(add);
      legShell(d, it, s, 0.96, 0.016).forEach(add);
    }
    const fz = frontTorsoZ(d, Y.chest, 0.026);
    add([d.j.chest, mesh(box(T.chest * 1.5, 0.055, 0.014).translate(0, Y.chest - Y.waist + 0.02, fz + 0.004), A(it), false)]);
    add([d.j.chest, neckBand(d, it, 0.032, 0.018, A(it))]);
    add([d.j.hips, waistBand(d, it, 0.036, 0.018, A(it))]);
  },
  // --- +10 SIÊU LẦY SCULPTED FULL COSTUMES ---
  corn_cob_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.neck - Y.knee) + 0.16;
    const cy = (Y.neck + Y.knee) * 0.5 - Y.waist;
    const r = Math.max(T.sh, T.hip) + 0.085;
    add([d.j.chest, mesh(cyl(r * 0.78, r * 0.92, h, 16).translate(0, cy, 0), M(it))]);
    add([d.j.chest, mesh(sph(r * 0.78, 0.14, r * 0.78, 14, 10).translate(0, cy + h * 0.5, 0), M(it))]);
    // Peeling green corn husks around the bottom!
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const hk = mesh(cone(0.11, 0.42, 8).scale(1, 1, 0.35), A(it));
      hk.position.set(Math.cos(a) * (r * 0.95), cy - h * 0.25, Math.sin(a) * (r * 0.95));
      hk.rotation.set(0, -a + Math.PI / 2, -0.35);
      add([d.j.chest, hk]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.38);
  },
  hotdog_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.neck - Y.knee) + 0.24;
    const cy = (Y.neck + Y.knee) * 0.5 - Y.waist;
    const bunM = toon('#e8b878');
    // Two fluffy hotdog bun halves + giant sausage in middle + zigzag mustard squiggle!
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.115, h * 0.52, 0.16, 14, 12).translate(s * 0.14, cy, -0.01), bunM)]);
    }
    add([d.j.chest, mesh(cyl(0.11, 0.11, h * 0.98, 14).translate(0, cy, 0.05), M(it))]);
    add([d.j.chest, mesh(sph(0.11, 0.11, 0.11, 12, 8).translate(0, cy + h * 0.49, 0.05), M(it))]);
    add([d.j.chest, mesh(sph(0.11, 0.11, 0.11, 12, 8).translate(0, cy - h * 0.49, 0.05), M(it))]);
    for (let i = -3; i <= 3; i++) {
      add([d.j.chest, mesh(box(0.085, 0.018, 0.018).rotateZ(i % 2 === 0 ? 0.55 : -0.55).translate(0, cy + i * 0.09, 0.165), A(it), false)]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },
  carrot_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.neck - Y.ankle) + 0.06;
    const cy = (Y.neck + Y.ankle) * 0.5 - Y.waist;
    const r = Math.max(T.sh, T.hip) + 0.11;
    add([d.j.chest, mesh(cyl(r, r * 0.42, h, 16).translate(0, cy, 0), M(it))]);
    // Leafy green carrot crown sticking out of head!
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      add([d.j.head, mesh(cone(0.048, 0.28, 8).rotateZ(Math.cos(a) * 0.45).rotateX(Math.sin(a) * 0.45).translate(Math.cos(a) * 0.06, 0.28, Math.sin(a) * 0.06), A(it))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },
  avocado_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const h = (Y.neck - Y.knee) + 0.18;
    const cy = (Y.neck + Y.knee) * 0.5 - Y.waist;
    const r = Math.max(T.sh, T.hip) + 0.15;
    // Pear-shaped green avocado half + dark outer rim + BIG 3D BROWN PIT right on the belly!
    add([d.j.chest, mesh(sph(r * 1.06, h * 0.54, 0.18, 18, 14).translate(0, cy, -0.02), toon('#1a6b4f'))]);
    add([d.j.chest, mesh(sph(r * 0.94, h * 0.48, 0.16, 18, 14).translate(0, cy, 0.015), M(it))]);
    add([d.j.chest, mesh(sph(0.135, 0.155, 0.13, 14, 10).translate(0, cy - 0.11, 0.155), A(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.44);
  },
  milk_carton_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const w = Math.max(T.sh, T.hip) * 2.15;
    const h = (Y.shoulder - Y.knee) + 0.14;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(box(w, h, w * 0.85).translate(0, cy, 0), M(it))]);
    // Gabled milk carton roof triangle around shoulders + blue label stripe!
    add([d.j.chest, mesh(cone(w * 0.65, 0.18, 4).rotateY(Math.PI / 4).translate(0, cy + h * 0.5 + 0.08, 0), A(it))]);
    const tex = memePrintTex('SỮA TƯƠI 100%', it.c2 || '#2f6fd6', '#ffffff');
    add([d.j.chest, mesh(new THREE.PlaneGeometry(w * 0.85, 0.22).translate(0, cy + 0.04, w * 0.43), new THREE.MeshBasicMaterial({ map: tex }), false)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.40);
  },
  traffic_light_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const w = Math.max(T.sh, T.hip) * 1.9;
    const h = (Y.neck - Y.knee) + 0.18;
    const cy = (Y.neck + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(box(w, h, 0.26).translate(0, cy, 0), M(it))]);
    const lamps = [['#ff2e4d', 0.22], ['#ffea00', 0.0], ['#00e676', -0.22]];
    for (const [col, dy] of lamps) {
      add([d.j.chest, mesh(cyl(0.082, 0.082, 0.03, 16).rotateX(Math.PI / 2).translate(0, cy + dy, 0.135), basicMat(col), false)]);
      add([d.j.chest, mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.055, 14, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, cy + dy + 0.02, 0.155), M(it))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },
  snowman_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Two giant snowballs stacked for torso & hips + coal buttons + scarf + carrot nose!
    add([d.j.hips, mesh(sph(T.hip + 0.19, 0.27, T.hip + 0.18, 18, 14).translate(0, -0.06, 0), M(it))]);
    add([d.j.chest, mesh(sph(T.sh + 0.11, 0.21, T.sh + 0.10, 18, 14).translate(0, Y.chest - Y.waist, 0), M(it))]);
    const coal = toon('#15121b');
    for (const dy of [-0.04, 0.04, 0.12]) {
      add([d.j.chest, mesh(sph(0.022, 0.022, 0.022, 8, 6).translate(0, Y.chest - Y.waist + dy - 0.06, T.sh + 0.105), coal, false)]);
    }
    add([d.j.chest, mesh(torus(T.neckR + 0.08, 0.032, 8, 18).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.01, 0), toon('#c92a46'))]);
    add([d.j.head, mesh(cone(0.022, 0.12, 8).rotateX(Math.PI / 2).translate(0, -0.01, 0.22), A(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.48);
  },
  cactus_pot_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Terracotta flower pot around hips + ribbed green cactus torso + arms!
    add([d.j.hips, mesh(cyl(T.hip + 0.18, T.hip + 0.11, 0.36, 16).translate(0, -0.08, 0), A(it))]);
    add([d.j.hips, mesh(cyl(T.hip + 0.21, T.hip + 0.20, 0.065, 16).translate(0, 0.10, 0), A(it))]);
    add([d.j.chest, mesh(cyl(T.sh + 0.08, T.hip + 0.10, Y.neck - Y.waist + 0.08, 12).translate(0, (Y.neck - Y.waist) * 0.5, 0), M(it))]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.85, { inf: 0.032 }).forEach(add);
    add([d.j.head, mesh(sph(0.055, 0.042, 0.055, 10, 8).translate(0, 0.21, 0.02), toon('#ff2e93'))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },
  robot_retro_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const w = Math.max(T.sh, T.hip) * 2.05;
    // Classic tin robot square body + chest gauges + accordion tubes + head antenna!
    add([d.j.chest, mesh(box(w, Y.shoulder - Y.waist + 0.12, 0.28).translate(0, (Y.shoulder - Y.waist) * 0.5, 0), M(it))]);
    add([d.j.chest, mesh(box(w * 0.65, 0.12, 0.025).translate(0, Y.chest - Y.waist, 0.15), toon('#15121b'))]);
    for (const x of [-0.07, 0, 0.07]) {
      add([d.j.chest, mesh(sph(0.018, 0.018, 0.018, 8, 6).translate(x, Y.chest - Y.waist, 0.165), basicMat(x === 0 ? '#ffea00' : '#00e5ff'), false)]);
    }
    add([d.j.hips, pelvisShell(d, it, { inf: 0.025 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.92, { inf: 0.026 }).forEach(add);
      legShell(d, it, s, 0.95, 0.026).forEach(add);
    }
    add([d.j.head, mesh(cyl(0.008, 0.008, 0.16, 8).translate(0, 0.24, 0), M(it))]);
    add([d.j.head, mesh(sph(0.028, 0.028, 0.028, 10, 8).translate(0, 0.33, 0), basicMat(it.c2 || '#00e5ff'), false)]);
  },
  fridge_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const w = Math.max(T.sh, T.hip) * 2.15;
    const h = (Y.neck - Y.knee) + 0.24;
    const cy = (Y.neck + Y.knee) * 0.5 - Y.waist;
    // Tall 2-door white refrigerator box with freezer split line + chrome handles + colorful magnets!
    add([d.j.chest, mesh(box(w, h, 0.34).translate(0, cy, 0), M(it))]);
    add([d.j.chest, mesh(box(w + 0.01, 0.012, 0.35).translate(0, cy + h * 0.14, 0), A(it), false)]);
    add([d.j.chest, mesh(box(0.020, 0.14, 0.036).translate(w * 0.36, cy + h * 0.30, 0.18), A(it))]);
    add([d.j.chest, mesh(box(0.020, 0.24, 0.036).translate(w * 0.36, cy - h * 0.08, 0.18), A(it))]);
    const magCols = ['#ff2e93', '#ffea00', '#00e5ff', '#76ff03'];
    for (let i = 0; i < 4; i++) {
      add([d.j.chest, mesh(box(0.036, 0.036, 0.012).translate(-w * 0.28 + i * 0.065, cy + h * 0.28 - (i % 2) * 0.05, 0.175), toon(magCols[i]), false)]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.42);
  },
};
