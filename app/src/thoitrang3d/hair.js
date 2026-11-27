// @ts-nocheck
// hair.js — 24 distinctive hairstyles (masculine, feminine, neutral & themed) + 2-tone tips/streaks.
// Follows approved fit rules: open-front hairCap, high bangs never covering eyes/brows, hatHide tags for closed hats.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, cone, torus, toon, hairMat } from './core.js';

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
  const mAcc = toon(it.c2 || '#ff6b8b');
  const put = (geo, mat = mMain, hatHide = false, outline = true) => {
    const o = mesh(scGeo(geo, d), mat, outline);
    if (hatHide) o.userData.hatHide = true;
    add([H, o]);
    return o;
  };
  const cap = (lift = 0, tight = 1) => {
    put(new THREE.SphereGeometry(0.188 * tight, 18, 10, 0, Math.PI * 2, 0, 1.24).scale(1, 0.97, 0.98).translate(0, 0.032 + lift, -0.012), mSolid);
    put(new THREE.SphereGeometry(0.191 * tight, 18, 8, Math.PI, Math.PI, 1.18, 1.08).translate(0, 0.032 + lift, -0.014), mSolid);
  };
  const bangs = (x = 0, y = 0.145, z = 0.108, rx = 0.15, ry = 0.042, rz = 0.056, rotZ = 0) => {
    put(sph(rx, ry, rz, 16, 10).rotateZ(rotZ).translate(x, y, z), mSolid);
  };
  return { put, cap, bangs, mMain, mSolid, mAcc };
}

export const HAIR_BUILD = {
  // ===== MASCULINE / SHORT (9) =====
  undercut: (d, it, add) => {
    const { put, mMain, mSolid } = makeHairAdd(d, it, add);
    // Close shaved sides/back + sculpted swept top
    put(new THREE.SphereGeometry(0.181, 22, 12, 0, Math.PI * 2, 0, 1.20).scale(1, 0.97, 0.98).translate(0, 0.025, -0.008), mSolid);
    put(new THREE.SphereGeometry(0.183, 22, 10, Math.PI, Math.PI, 1.15, 0.95).translate(0, 0.025, -0.010), mSolid);
    put(sph(0.145, 0.072, 0.155, 18, 12).rotateZ(-0.18).translate(0.028, 0.165, 0.015), mMain, true);
    put(sph(0.11, 0.045, 0.085, 14, 10).rotateZ(-0.24).translate(0.052, 0.155, 0.095), mMain, true);
  },

  quiff: (d, it, add) => {
    const { put, mMain, mSolid } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.183, 22, 12, 0, Math.PI * 2, 0, 1.22).scale(1, 0.97, 0.98).translate(0, 0.026, -0.010), mSolid);
    put(new THREE.SphereGeometry(0.185, 22, 10, Math.PI, Math.PI, 1.15, 0.95).translate(0, 0.026, -0.012), mSolid);
    // Tall swept pompadour wave
    put(sph(0.135, 0.095, 0.155, 18, 12).rotateX(-0.22).rotateZ(-0.12).translate(0.015, 0.185, 0.042), mMain, true);
    put(sph(0.095, 0.055, 0.075, 14, 10).rotateX(-0.35).translate(0.025, 0.175, 0.125), mMain, true);
  },

  buzz: (d, it, add) => {
    const { put, mSolid } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.179, 22, 12, 0, Math.PI * 2, 0, 1.20).scale(1, 0.98, 0.99).translate(0, 0.020, -0.008), mSolid);
    put(new THREE.SphereGeometry(0.180, 22, 10, Math.PI, Math.PI, 1.14, 0.92).translate(0, 0.020, -0.010), mSolid);
  },

  mohawk: (d, it, add) => {
    const { put, mMain, mSolid } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.179, 20, 10, 0, Math.PI * 2, 0, 1.15).scale(1, 0.97, 0.98).translate(0, 0.018, -0.008), mSolid);
    for (let i = 0; i < 6; i++) {
      const a = -0.55 + i * 0.34;
      const g = cone(0.046, 0.135, 10).rotateX(a).translate(0, 0.21 * Math.cos(a) + 0.04, 0.21 * Math.sin(a) - 0.01);
      put(g, mMain, true);
    }
  },

  man_bun: (d, it, add) => {
    const { put, mMain, mSolid, mAcc } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.182, 22, 12, 0, Math.PI * 2, 0, 1.20).scale(1, 0.97, 0.98).translate(0, 0.026, -0.010), mSolid);
    put(new THREE.SphereGeometry(0.183, 22, 10, Math.PI, Math.PI, 1.15, 0.95).translate(0, 0.026, -0.012), mSolid);
    put(sph(0.13, 0.048, 0.14, 16, 10).translate(0, 0.165, -0.02), mSolid, true);
    put(torus(0.044, 0.012, 8, 16).rotateX(Math.PI / 2 - 0.5).translate(0, 0.185, -0.145), mAcc, true);
    put(sph(0.068, 0.062, 0.068, 14, 10).translate(0, 0.205, -0.168), mMain, true);
  },

  wolf_cut: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.010);
    put(lathe([[0.175, -0.20], [0.215, -0.10], [0.205, 0.02], [0.188, 0.09]], 0.92, 22, 2.35, 2).translate(0, -0.01, -0.028), mMain);
    // Layered spiky tips framing jaw + forehead
    for (const s of [1, -1]) {
      put(cone(0.042, 0.14, 8).rotateZ(s * 0.25).rotateX(Math.PI).translate(s * 0.165, -0.08, 0.045), mMain);
      put(cone(0.038, 0.11, 8).rotateZ(-s * 0.35).rotateX(Math.PI).translate(s * 0.085, 0.135, 0.125), mSolid);
    }
    put(sph(0.135, 0.046, 0.062, 14, 10).translate(0, 0.155, 0.105), mSolid, true);
  },

  slick_back: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.006, 0.985);
    for (let i = -2; i <= 2; i++) {
      put(sph(0.042, 0.036, 0.155, 12, 8).rotateX(-0.18).translate(i * 0.042, 0.168 - Math.abs(i) * 0.012, -0.01), i % 2 === 0 ? mSolid : mMain, true);
    }
  },

  curly_fro: (d, it, add) => {
    const { put, cap, mMain } = makeHairAdd(d, it, add);
    cap(0.014);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.sin(a) > 0.38) continue;
      const y = 0.055 + 0.055 * Math.sin(i * 1.9);
      put(sph(0.072, 0.072, 0.072, 12, 8).translate(Math.cos(a) * 0.168, y, Math.sin(a) * 0.158 - 0.018), mMain, y > 0.035);
    }
    // Crown curls hidden cleanly under closed hats
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      put(sph(0.068, 0.064, 0.068, 12, 8).translate(Math.cos(a) * 0.095, 0.175 + (i % 2) * 0.025, Math.sin(a) * 0.095 - 0.012), mMain, true);
    }
    put(sph(0.075, 0.068, 0.075, 12, 8).translate(0, 0.205, -0.01), mMain, true);
  },

  side_part: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.008, 0.99);
    put(sph(0.115, 0.050, 0.095, 16, 10).rotateZ(-0.22).translate(0.048, 0.158, 0.088), mMain, true);
    put(sph(0.072, 0.040, 0.078, 14, 10).rotateZ(0.28).translate(-0.088, 0.148, 0.082), mSolid, true);
  },

  // ===== FEMININE / NEUTRAL / STYLED (15) =====
  bob: (d, it, add) => {
    const { put, cap, bangs, mMain } = makeHairAdd(d, it, add);
    cap();
    put(lathe([[0.188, -0.13], [0.208, -0.03], [0.194, 0.065]], 0.98, 24, 2.25, 2).translate(0, 0, -0.018), mMain);
    bangs(0, 0.142, 0.108, 0.152, 0.042, 0.058, 0);
  },

  lob: (d, it, add) => {
    const { put, cap, bangs, mMain } = makeHairAdd(d, it, add);
    cap();
    put(lathe([[0.195, -0.25], [0.204, -0.12], [0.202, 0.0], [0.192, 0.07]], 0.88, 24, 2.35, 2).translate(0, 0, -0.030), mMain);
    bangs(0.025, 0.145, 0.106, 0.145, 0.040, 0.055, -0.14);
  },

  long_straight: (d, it, add) => {
    const { put, cap, bangs, mMain } = makeHairAdd(d, it, add);
    cap();
    put(lathe([[0.155, -0.46], [0.195, -0.28], [0.205, -0.08], [0.192, 0.075]], 0.80, 24, 2.42, 2).translate(0, 0, -0.048), mMain);
    bangs(0.018, 0.144, 0.108, 0.150, 0.042, 0.056, -0.10);
  },

  long_wavy: (d, it, add) => {
    const { put, cap, bangs, mMain } = makeHairAdd(d, it, add);
    cap();
    put(lathe([[0.185, -0.45], [0.228, -0.34], [0.195, -0.22], [0.225, -0.10], [0.192, 0.07]], 0.84, 24, 2.40, 3).translate(0, 0, -0.045), mMain);
    for (const s of [1, -1]) {
      put(lathe([[0.016, -0.34], [0.048, -0.24], [0.036, -0.14], [0.048, -0.04], [0.032, 0.04]], 1, 14, 0, 2).translate(s * 0.172, -0.02, 0.035), mMain);
    }
    bangs(-0.02, 0.145, 0.108, 0.148, 0.042, 0.056, 0.14);
  },

  high_ponytail: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    put(torus(0.048, 0.016, 8, 16).rotateX(Math.PI / 2 - 0.35).translate(0, 0.135, -0.155), mAcc, true);
    put(lathe([[0.012, -0.38], [0.068, -0.24], [0.076, -0.10], [0.050, 0.0]], 1, 18, 0, 2).translate(0, 0.10, -0.205).rotateX(-0.28), mMain, true);
    bangs(-0.025, 0.144, 0.108, 0.145, 0.040, 0.056, 0.15);
  },

  low_ponytail: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.002);
    put(torus(0.044, 0.014, 8, 16).rotateX(Math.PI / 2 + 0.2).translate(0, -0.095, -0.165), mAcc);
    put(lathe([[0.014, -0.32], [0.060, -0.20], [0.066, -0.08], [0.044, 0.0]], 1, 16, 0, 2).translate(0, -0.10, -0.185).rotateX(-0.14), mMain);
    bangs(0.022, 0.144, 0.108, 0.145, 0.040, 0.056, -0.14);
  },

  elegant_bun: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.005);
    put(torus(0.068, 0.014, 8, 18).rotateX(Math.PI / 2).translate(0, 0.215, -0.045), mAcc, true);
    put(sph(0.085, 0.072, 0.085, 16, 12).translate(0, 0.255, -0.048), mMain, true);
    bangs(0, 0.146, 0.105, 0.142, 0.038, 0.052, 0);
  },

  space_buns: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (const s of [1, -1]) {
      put(torus(0.058, 0.012, 8, 16).rotateX(Math.PI / 2).rotateZ(-s * 0.55).translate(s * 0.135, 0.165, -0.028), mAcc, true);
      put(sph(0.078, 0.078, 0.078, 14, 10).translate(s * 0.155, 0.185, -0.032), mMain, true);
    }
    bangs(0, 0.142, 0.108, 0.150, 0.040, 0.056, 0);
  },

  twin_tails: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (const s of [1, -1]) {
      put(sph(0.034, 0.024, 0.024, 10, 8).translate(s * 0.185, 0.10, -0.032), mAcc);
      put(lathe([[0.012, -0.42], [0.064, -0.26], [0.070, -0.08], [0.042, 0.0]], 1, 16, 0, 2).translate(s * 0.20, 0.085, -0.04).rotateZ(s * 0.16), mMain);
    }
    bangs(0, 0.142, 0.108, 0.150, 0.040, 0.056, 0);
  },

  braids: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.003);
    for (const s of [1, -1]) {
      for (let i = 0; i < 6; i++) {
        const y = -0.02 - i * 0.062;
        const r = 0.036 - i * 0.003;
        put(sph(r, r * 1.15, r * 0.95, 10, 8).translate(s * (0.165 - i * 0.006), y, 0.03 + i * 0.008), mMain);
      }
      put(sph(0.026, 0.018, 0.026, 10, 8).translate(s * 0.130, -0.37, 0.076), mAcc);
      put(cone(0.024, 0.055, 8).rotateX(Math.PI).translate(s * 0.130, -0.405, 0.076), mMain);
    }
    bangs(0, 0.142, 0.108, 0.150, 0.040, 0.056, 0);
  },

  hime_cut: (d, it, add) => {
    const { put, cap, mMain, mSolid, mAcc } = makeHairAdd(d, it, add);
    cap(0.002);
    put(lathe([[0.158, -0.48], [0.195, -0.28], [0.205, -0.06], [0.192, 0.075]], 0.80, 24, 2.42, 2).translate(0, 0, -0.048), mMain);
    // Sleek straight high bangs + signature cheek-length hime locks
    put(sph(0.148, 0.036, 0.056, 14, 10).translate(0, 0.142, 0.112), mSolid);
    for (const s of [1, -1]) {
      put(cyl(0.030, 0.032, 0.22, 12).scale(0.85, 1, 0.72).translate(s * 0.152, -0.02, 0.075), mMain);
      put(sph(0.022, 0.016, 0.018, 8, 6).translate(s * 0.152, -0.11, 0.088), mAcc);
    }
  },

  pixie: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.008, 0.99);
    put(sph(0.145, 0.044, 0.065, 16, 10).rotateZ(-0.24).translate(0.032, 0.148, 0.102), mMain);
    for (const s of [1, -1]) {
      put(cone(0.030, 0.085, 8).rotateZ(s * 0.25).rotateX(Math.PI).translate(s * 0.168, 0.015, 0.038), mSolid);
    }
  },

  curtain_bangs: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.004);
    put(lathe([[0.175, -0.32], [0.205, -0.15], [0.204, 0.0], [0.192, 0.075]], 0.85, 24, 2.40, 2).translate(0, 0, -0.042), mMain);
    // Soft parted curtain fringes sweeping out to the temples (clear of eyes!)
    for (const s of [1, -1]) {
      put(sph(0.088, 0.042, 0.056, 14, 10).rotateZ(-s * 0.36).translate(s * 0.084, 0.138, 0.112), mSolid);
      put(sph(0.036, 0.095, 0.038, 12, 8).rotateZ(s * 0.14).translate(s * 0.158, 0.035, 0.076), mMain);
    }
  },

  imperial_updo: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.006);
    // Double royal loops + central top chignon + crossed trâm cài (hairpins)
    put(sph(0.088, 0.082, 0.078, 16, 10).translate(0, 0.248, -0.025), mMain, true);
    for (const s of [1, -1]) {
      put(torus(0.068, 0.024, 8, 16).scale(1.15, 0.85, 0.65).rotateZ(s * 0.35).translate(s * 0.125, 0.215, -0.035), mMain, true);
      put(cyl(0.006, 0.004, 0.30, 8).rotateZ(s * 1.15).translate(0, 0.245, -0.020), mAcc, true);
      put(sph(0.018, 0.018, 0.018, 10, 8).translate(s * 0.135, 0.295, -0.020), mAcc, true);
    }
    put(lathe([[0.15, -0.34], [0.185, -0.16], [0.188, 0.04]], 0.78, 20, 2.55, 2).translate(0, 0, -0.055), mMain);
    bangs(0, 0.146, 0.106, 0.145, 0.038, 0.052, 0);
  },

  braid_crown: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.006);
    put(lathe([[0.175, -0.32], [0.205, -0.16], [0.195, 0.05]], 0.84, 22, 2.40, 2).translate(0, 0, -0.045), mMain);
    // Braided halo crown around upper head + accent blossoms
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(sph(0.034, 0.028, 0.034, 10, 8).translate(Math.cos(a) * 0.165, 0.155, Math.sin(a) * 0.155 - 0.01), mMain, true);
      if (i % 3 === 0) {
        put(sph(0.016, 0.016, 0.016, 8, 6).translate(Math.cos(a) * 0.185, 0.168, Math.sin(a) * 0.175 - 0.01), mAcc, true, false);
      }
    }
    bangs(0, 0.142, 0.108, 0.145, 0.038, 0.052, 0);
  },
};

// Back-compat aliases from v4
HAIR_BUILD.long = HAIR_BUILD.long_straight;
HAIR_BUILD.ponytail = HAIR_BUILD.high_ponytail;
HAIR_BUILD.buns = HAIR_BUILD.space_buns;
HAIR_BUILD.twintails = HAIR_BUILD.twin_tails;
HAIR_BUILD.short = HAIR_BUILD.side_part;
HAIR_BUILD.curly = HAIR_BUILD.curly_fro;
