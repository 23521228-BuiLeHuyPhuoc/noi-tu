// @ts-nocheck
// wear-unique-v2-gear.js — 64 brand-new 100% unique 3D sculptures (12 shoes, 18 hats, 12 glasses/masks, 22 accessories/props).
// Every builder creates an unmistakably distinct 3D silhouette — ZERO recolor clones!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat, memePrintTex } from './core.js';
import { headFrontZ as _headFrontZ } from './body.js';
import { M, A, frontTorsoZ } from './wear-helpers.js';

function headFrontZ(d, y = 0.02) {
  return _headFrontZ(d.T, 0, y) / (d.T.headRz / 0.165);
}

function footScale(d) {
  return d.T.footS || (d.T.gender === 'm' ? 1.15 : (d.type === 'chibi' ? 0.92 : 1.0));
}

function hatAddV2(d, add, liftY = 0) {
  return (geo, mat, outline = true) => {
    const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
    if (geo && (geo.isMesh || geo.isObject3D)) {
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

function capTop(d) { return Math.max(0.188, Math.min(0.285, d.hairCrownY || 0.212)); }
function closedDy(d) { return Math.max(-0.022, Math.min(0.022, capTop(d) - 0.212)); }
function openTop(d) { return Math.max(0.195, Math.min(0.278, capTop(d))); }

function lhV2(d, rx = 0.68, ry = 0.12, rz = -0.10) {
  const { hand } = d.j.arm[-1], hs = d.T.handS;
  const g = new THREE.Group();
  g.position.set(0.008 * hs, -0.025 * hs, 0.028 * hs);
  g.rotation.set(rx, ry, rz);
  return { hand, hs, g };
}

function backZV2(d) {
  return -(d.T.chest * 0.75 + Math.max(d.outerInf || 0, d.topInf || 0.015) + 0.015);
}

// ======================= 6. SHOES (+12 UNIQUE 3D SHAPES) =======================
export const SHOES_V2 = {
  pointe_ballet: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft, kn = d.j.leg[s].kn;
      add([ft, mesh(sph(0.044 * fs, 0.032 * fs, 0.086 * fs, 14, 10).translate(0, -0.012, 0.028 * fs), M(it))]);
      // Crossed satin ankle ribbons spiraling up calf!
      for (let i = 0; i < 4; i++) {
        add([kn, mesh(torus(d.T.calfR * 0.80 + 0.008, 0.006, 6, 14).rotateX(Math.PI / 2 + (i % 2 === 0 ? 0.25 : -0.25)).translate(0, -d.L.legLo + 0.03 + i * 0.035, 0), A(it), false)]);
      }
    }
  },
  flippers_scuba: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.048 * fs, 0.036 * fs, 0.088 * fs, 12, 8).translate(0, -0.012, 0.025 * fs), A(it))]);
      // Huge wide flat scuba swimming flipper extending forward!
      add([ft, mesh(box(0.115 * fs, 0.014, 0.26 * fs).translate(0, -0.036, 0.16 * fs), M(it))]);
      for (const rx of [-0.045, 0.045]) {
        add([ft, mesh(box(0.014, 0.022, 0.25 * fs).translate(rx * fs, -0.030, 0.16 * fs), A(it), false)]);
      }
    }
  },
  ski_boots: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.095 * fs, 0.095 * fs, 0.15 * fs).translate(0, 0.005, 0.025 * fs), M(it))]);
      // Long downhill skis strapped underneath both boots!
      add([ft, mesh(box(0.062 * fs, 0.012, 0.68 * fs).translate(0, -0.046, 0.08 * fs), A(it))]);
      add([ft, mesh(box(0.062 * fs, 0.012, 0.11 * fs).rotateX(-0.48).translate(0, -0.024, 0.44 * fs), A(it))]);
    }
  },
  spring_jump_boots: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.050 * fs, 0.038 * fs, 0.090 * fs, 12, 8).translate(0, 0.010, 0.028 * fs), M(it))]);
      // Coiled metallic jump springs stacked right under both boots!
      for (let i = 0; i < 4; i++) {
        add([ft, mesh(torus(0.046 * fs, 0.010, 6, 16).rotateX(Math.PI / 2 + 0.14).translate(0, -0.022 - i * 0.024, 0.028 * fs), A(it))]);
      }
      add([ft, mesh(cyl(0.055 * fs, 0.055 * fs, 0.016, 14).translate(0, -0.115, 0.028 * fs), M(it))]);
    }
  },
  tabi_boots: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft, kn = d.j.leg[s].kn;
      add([ft, mesh(sph(0.046 * fs, 0.036 * fs, 0.072 * fs, 12, 8).translate(0, -0.012, 0.012 * fs), M(it))]);
      // Split big-toe / other-toes Japanese Tabi silhouette!
      add([ft, mesh(sph(0.020 * fs, 0.026 * fs, 0.045 * fs, 10, 8).translate(-s * 0.024 * fs, -0.016, 0.086 * fs), M(it))]);
      add([ft, mesh(sph(0.028 * fs, 0.026 * fs, 0.045 * fs, 10, 8).translate(s * 0.018 * fs, -0.016, 0.084 * fs), M(it))]);
      add([kn, mesh(cyl(d.T.calfR * 0.85 + 0.015, d.T.calfR * 0.78 + 0.015, d.L.legLo * 0.5, 14).translate(0, -d.L.legLo * 0.75, 0), M(it))]);
      add([kn, mesh(torus(d.T.calfR * 0.86 + 0.016, 0.008, 6, 14).rotateX(Math.PI / 2).translate(0, -d.L.legLo * 0.52, 0), A(it))]);
    }
  },
  roman_greaves: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft, kn = d.j.leg[s].kn;
      add([ft, mesh(box(0.092 * fs, 0.016, 0.175 * fs).translate(0, -0.040, 0.030 * fs), A(it))]);
      // Sculpted metallic shin armor + kneecap dome!
      add([kn, mesh(new THREE.CylinderGeometry(d.T.calfR + 0.020, d.T.calfR * 0.82 + 0.018, d.L.legLo * 0.82, 16, 1, true, -Math.PI * 0.55, Math.PI * 1.1).translate(0, -d.L.legLo * 0.52, 0.005), M(it, { doubleSide: true }))]);
      add([kn, mesh(sph(0.046, 0.052, 0.036, 10, 8).translate(0, -0.03, d.T.calfR + 0.018), M(it))]);
    }
  },
  high_platform_goth: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft, kn = d.j.leg[s].kn;
      add([ft, mesh(sph(0.050 * fs, 0.040 * fs, 0.090 * fs, 12, 8).translate(0, 0.01, 0.028 * fs), M(it))]);
      // Massive chunky 15cm goth platform sole with buckles!
      add([ft, mesh(box(0.105 * fs, 0.115 * fs, 0.19 * fs).translate(0, -0.068, 0.032 * fs), A(it))]);
      add([kn, mesh(cyl(d.T.calfR + 0.022, d.T.calfR * 0.82 + 0.020, d.L.legLo * 0.72, 14).translate(0, -d.L.legLo * 0.64, 0), M(it))]);
      for (const f of [0.35, 0.55, 0.75]) {
        add([kn, mesh(torus(d.T.calfR + 0.022, 0.007, 6, 14).rotateX(Math.PI / 2).translate(0, -d.L.legLo * f, 0), A(it), false)]);
      }
    }
  },
  pointy_elf_shoes: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.048 * fs, 0.038 * fs, 0.090 * fs, 12, 8).translate(0, -0.010, 0.028 * fs), M(it))]);
      // Curled elf toe tip with dangling gold jingle bell!
      add([ft, mesh(cone(0.030 * fs, 0.11 * fs, 10).rotateX(0.95).translate(0, 0.018, 0.125 * fs), M(it))]);
      add([ft, mesh(sph(0.020 * fs, 0.020 * fs, 0.020 * fs, 8, 6).translate(0, 0.056, 0.165 * fs), A(it))]);
    }
  },
  // --- XÓM LẦY SCULPTED SHOES ---
  tissue_box_shoes: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.115 * fs, 0.075 * fs, 0.22 * fs).translate(0, -0.016, 0.042 * fs), M(it))]);
      // Fluffy white tissue poking out of top slot!
      add([ft, mesh(cone(0.038 * fs, 0.068 * fs, 6).translate(0, 0.045, 0.095 * fs), A(it))]);
    }
  },
  banana_peel_shoes: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(cyl(0.022 * fs, 0.032 * fs, 0.045 * fs, 8).translate(0, -0.018, 0.035 * fs), A(it))]);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        add([ft, mesh(sph(0.024 * fs, 0.012 * fs, 0.095 * fs, 8, 6).rotateY(a).translate(Math.sin(a) * 0.065 * fs, -0.036, 0.035 * fs + Math.cos(a) * 0.065 * fs), M(it))]);
      }
    }
  },
  bread_loaf_shoes: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.062 * fs, 0.046 * fs, 0.145 * fs, 14, 10).translate(0, -0.014, 0.052 * fs), M(it))]);
      for (const dz of [0.02, 0.075, 0.13]) {
        add([ft, mesh(box(0.075 * fs, 0.010, 0.018 * fs).rotateY(0.35).translate(0, 0.025, dz * fs), A(it), false)]);
      }
    }
  },
  brick_stilts: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.115 * fs, 0.092 * fs, 0.21 * fs).translate(0, -0.062, 0.032 * fs), M(it))]);
      add([ft, mesh(torus(0.056 * fs, 0.008, 6, 14).translate(0, -0.012, 0.032 * fs), A(it))]);
    }
  },
};

// ======================= 7. HATS (+18 UNIQUE 3D SHAPES) =======================
export const CLOSED_HATS_V2 = new Set([
  'pharaoh_nemes', 'pope_mitre', 'roman_galea', 'plague_hat', 'ushanka_bear',
  'turban_jewel', 'bicorne_napoleon', 'cat_ear_helmet', 'water_jug_20l',
  'noodle_bowl_hat', 'tv_head', 'lamp_shade_hat', 'shark_bite_hat', 'durian_helmet',
]);

export const HATS_V2 = {
  pharaoh_nemes: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.20, 0.13, 0.195, 18, 12).translate(0, 0.14, -0.01), M(it));
    for (const s of [1, -1]) {
      put(box(0.11, 0.28, 0.08).rotateZ(s * 0.28).translate(s * 0.21, 0.03, 0.02), M(it));
      for (let i = 0; i < 4; i++) {
        put(box(0.114, 0.024, 0.084).rotateZ(s * 0.28).translate(s * (0.19 + i * 0.014), 0.11 - i * 0.055, 0.02), A(it), false);
      }
    }
    put(cone(0.024, 0.095, 8).translate(0, 0.20, 0.185), toon('#ffd56b'));
  },
  pope_mitre: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(cyl(0.175, 0.182, 0.11, 18).translate(0, 0.185, -0.01), M(it));
    put(cone(0.175, 0.24, 4).scale(1, 1, 0.72).rotateY(Math.PI / 4).translate(0, 0.34, -0.01), M(it));
    put(box(0.028, 0.26, 0.016).translate(0, 0.28, 0.125), A(it), false);
    put(box(0.16, 0.028, 0.016).translate(0, 0.22, 0.125), A(it), false);
  },
  roman_galea: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.195, 0.145, 0.20, 18, 12).translate(0, 0.14, -0.01), M(it));
    // Tall sweeping crimson horsehair plume crest running front-to-back!
    put(torus(0.165, 0.044, 8, 20, Math.PI * 1.15).rotateY(Math.PI / 2).rotateX(-0.2).translate(0, 0.23, -0.01), A(it));
    for (const s of [1, -1]) put(box(0.024, 0.12, 0.08).translate(s * 0.185, 0.02, 0.05), M(it));
  },
  plague_hat: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(cyl(0.34, 0.35, 0.016, 26).translate(0, 0.165, -0.01), M(it));
    put(cyl(0.145, 0.178, 0.18, 20).translate(0, 0.255, -0.01), M(it));
    put(cyl(0.176, 0.179, 0.032, 20).translate(0, 0.182, -0.01), A(it));
    put(box(0.052, 0.044, 0.014).translate(0, 0.185, 0.175), A(it), false);
  },
  ushanka_bear: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.21, 0.16, 0.21, 18, 12).translate(0, 0.15, -0.01), M(it));
    for (const s of [1, -1]) {
      put(sph(0.068, 0.068, 0.052, 12, 8).translate(s * 0.155, 0.275, 0.02), M(it));
      put(sph(0.038, 0.038, 0.032, 10, 8).translate(s * 0.155, 0.275, 0.052), A(it), false);
      put(box(0.065, 0.22, 0.075).translate(s * 0.195, 0.01, 0.02), M(it));
    }
  },
  turban_jewel: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.245, 0.175, 0.235, 18, 12).translate(0, 0.20, -0.01), M(it));
    put(torus(0.205, 0.052, 8, 22).rotateX(Math.PI / 2).translate(0, 0.16, -0.01), M(it));
    put(sph(0.042, 0.052, 0.028, 10, 8).translate(0, 0.21, 0.225), A(it));
    put(cone(0.044, 0.19, 8).rotateX(-0.22).translate(0, 0.34, 0.18), A(it));
  },
  bicorne_napoleon: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    // Classic wide side-to-side Napoleon bicorne!
    put(sph(0.32, 0.175, 0.125, 18, 12).translate(0, 0.23, -0.01), M(it));
    put(torus(0.18, 0.016, 6, 18).rotateX(Math.PI / 2).translate(0, 0.145, -0.01), A(it));
    put(cyl(0.034, 0.034, 0.014, 12).rotateX(Math.PI / 2).translate(0.06, 0.24, 0.115), toon('#c92a46'), false);
  },
  cat_ear_helmet: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.228, 0.225, 0.235, 20, 14).translate(0, 0.05, -0.005), M(it));
    put(new THREE.SphereGeometry(0.232, 16, 10, -Math.PI * 0.34, Math.PI * 0.68, 0.95, 0.85).translate(0, 0.05, 0.01), basicMat(it.c2 || '#ff2e93'), false);
    for (const s of [1, -1]) {
      put(cone(0.058, 0.135, 8).rotateZ(s * -0.26).translate(s * 0.135, 0.28, 0.01), M(it));
      put(cone(0.032, 0.088, 6).rotateZ(s * -0.26).translate(s * 0.135, 0.275, 0.045), A(it), false);
    }
  },
  // --- +10 MŨ SIÊU LẦY 3D ---
  water_jug_20l: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    // Transparent blue 20-liter water dispenser bottle inverted over head!
    const glass = new THREE.MeshToonMaterial({ color: it.c || '#6ec6ff', transparent: true, opacity: 0.48, side: THREE.DoubleSide });
    put(cyl(0.245, 0.245, 0.38, 22).translate(0, 0.14, 0), glass);
    for (const yy of [0.05, 0.18, 0.28]) {
      put(torus(0.248, 0.012, 6, 22).rotateX(Math.PI / 2).translate(0, yy, 0), A(it), false);
    }
    put(cyl(0.065, 0.24, 0.08, 20).translate(0, 0.37, 0), glass);
    put(cyl(0.068, 0.068, 0.045, 16).translate(0, 0.42, 0), A(it));
  },
  noodle_bowl_hat: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    // Upside-down instant noodle bowl on head with dripping yellow noodles + pair of chopsticks!
    put(cyl(0.14, 0.245, 0.17, 22).translate(0, 0.24, -0.01), M(it));
    put(torus(0.245, 0.016, 6, 22).rotateX(Math.PI / 2).translate(0, 0.155, -0.01), A(it));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      put(cyl(0.009, 0.008, 0.12, 6).rotateZ(Math.sin(i) * 0.18).translate(Math.cos(a) * 0.20, 0.10, Math.sin(a) * 0.19), A(it), false);
    }
    put(cyl(0.007, 0.005, 0.38, 6).rotateZ(-0.55).translate(0.14, 0.36, 0.04), toon('#a6774f'));
    put(cyl(0.007, 0.005, 0.38, 6).rotateZ(-0.42).translate(0.12, 0.37, 0.06), toon('#a6774f'));
  },
  toilet_plunger_hat: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.18);
    // Red rubber plunger suction cup stuck directly to top of skull with wooden handle pointing straight up!
    put(cyl(0.055, 0.125, 0.095, 18).translate(0, 0.22, 0), M(it));
    put(cyl(0.018, 0.018, 0.34, 10).translate(0, 0.42, 0), A(it));
  },
  banana_bunch_hat: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.18);
    put(cyl(0.032, 0.042, 0.055, 10).translate(0, 0.30, 0), A(it));
    for (let i = -2; i <= 2; i++) {
      put(torus(0.12, 0.028, 8, 14, Math.PI * 0.72).rotateY(i * 0.35).rotateZ(0.6).translate(i * 0.032, 0.22, 0.01), M(it));
    }
  },
  hen_sitting_hat: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.19);
    // Plump white mother hen sitting comfortably on top of the head with red comb & beak!
    put(sph(0.145, 0.115, 0.165, 16, 12).translate(0, 0.26, -0.01), M(it));
    put(sph(0.072, 0.072, 0.072, 12, 10).translate(0, 0.37, 0.11), M(it));
    put(cone(0.022, 0.055, 6).rotateX(Math.PI / 2).translate(0, 0.365, 0.19), toon('#ffea00'));
    put(sph(0.022, 0.038, 0.042, 8, 6).translate(0, 0.435, 0.11), A(it));
    put(cone(0.065, 0.12, 8).rotateX(-0.7).translate(0, 0.33, -0.17), M(it));
  },
  aquarium_hat: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.18);
    // Transparent round fishbowl on head with bright orange goldfish + green seaweed inside!
    const glass = new THREE.MeshToonMaterial({ color: it.c || '#6ec6ff', transparent: true, opacity: 0.38 });
    put(sph(0.185, 0.165, 0.185, 18, 14).translate(0, 0.34, 0), glass);
    put(torus(0.125, 0.016, 6, 18).rotateX(Math.PI / 2).translate(0, 0.48, 0), toon('#ffffff'));
    put(sph(0.048, 0.032, 0.022, 10, 8).translate(0.04, 0.35, 0.04), A(it), false);
    put(cone(0.026, 0.045, 6).rotateZ(Math.PI / 2).translate(-0.01, 0.35, 0.04), A(it), false);
    put(cyl(0.012, 0.014, 0.11, 6).translate(-0.07, 0.26, -0.02), toon('#1a6b4f'), false);
  },
  tv_head: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    // Retro boxy CRT television replacing the entire head, with glowing cyan screen + rabbit ears!
    put(box(0.42, 0.38, 0.36).translate(0, 0.06, 0), M(it));
    put(box(0.31, 0.26, 0.02).translate(-0.02, 0.06, 0.18), basicMat(it.c2 || '#00e5ff'), false);
    for (const dy of [0.06, -0.02]) {
      put(cyl(0.022, 0.022, 0.022, 10).rotateX(Math.PI / 2).translate(0.165, 0.06 + dy, 0.185), toon('#d9d3cb'), false);
    }
    for (const s of [1, -1]) {
      put(cyl(0.007, 0.007, 0.24, 6).rotateZ(s * -0.45).translate(s * 0.08, 0.34, 0), toon('#d9d3cb'));
    }
  },
  lamp_shade_hat: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    put(cyl(0.16, 0.29, 0.34, 22, true).translate(0, 0.12, 0), M(it, { doubleSide: true }));
    put(torus(0.29, 0.014, 6, 22).rotateX(Math.PI / 2).translate(0, -0.05, 0), A(it));
    put(torus(0.16, 0.014, 6, 22).rotateX(Math.PI / 2).translate(0, 0.29, 0), A(it));
    put(cyl(0.005, 0.005, 0.12, 6).translate(0.18, -0.10, 0.12), A(it), false);
    put(sph(0.018, 0.018, 0.018, 8, 6).translate(0.18, -0.16, 0.12), toon('#ffd56b'), false);
  },
  shark_bite_hat: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    // Giant shark head chomping down with rows of white triangular teeth + tall dorsal fin!
    put(sph(0.24, 0.20, 0.26, 18, 12).translate(0, 0.19, -0.02), M(it));
    put(cone(0.055, 0.18, 8).rotateX(-0.35).translate(0, 0.41, -0.05), M(it));
    put(box(0.26, 0.05, 0.12).translate(0, 0.12, 0.16), A(it), false);
    const toothM = toon('#ffffff');
    for (let i = -3; i <= 3; i++) {
      put(cone(0.018, 0.048, 5).rotateX(Math.PI).translate(i * 0.036, 0.11, 0.215), toothM, false);
    }
  },
  durian_helmet: (d, it, add) => {
    const put = hatAddV2(d, add, closedDy(d));
    put(sph(0.22, 0.18, 0.22, 16, 12).translate(0, 0.16, -0.01), M(it));
    const spM = A(it);
    for (let ring = 0; ring < 3; ring++) {
      const y = 0.14 + ring * 0.085;
      const r = 0.21 - ring * 0.048;
      const n = 10 - ring * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ring * 0.4;
        const sp = mesh(cone(0.026, 0.072, 5), spM, false);
        sp.position.set(Math.cos(a) * r, y, Math.sin(a) * r - 0.01);
        sp.lookAt(Math.cos(a) * r * 3, y + 0.15, Math.sin(a) * r * 3);
        sp.rotateX(Math.PI / 2);
        put(sp);
      }
    }
  },
};

// ======================= 8. GLASSES & MASKS (+12 UNIQUE 3D SHAPES) =======================
export const GLASSES_V2 = {
  plague_doctor_mask: (d, it, add) => {
    const fz = headFrontZ(d, 0.0);
    const put = hatAddV2(d, add, 0);
    put(sph(0.155, 0.145, 0.10, 14, 10).translate(0, -0.01, fz - 0.03), M(it));
    // Long curved bird-beak mask!
    put(cone(0.062, 0.24, 10).rotateX(Math.PI / 2 + 0.22).translate(0, -0.04, fz + 0.12), M(it));
    for (const s of [1, -1]) {
      put(torus(0.038, 0.008, 6, 16).translate(s * 0.062, 0.028, fz + 0.03), A(it), false);
      put(cyl(0.034, 0.034, 0.010, 12).rotateX(Math.PI / 2).translate(s * 0.062, 0.028, fz + 0.028), toon('#ffffff'), false);
    }
  },
  horse_mask: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    // Legendary rubber meme horse head mask covering entire head with protruding horse muzzle + mane!
    put(sph(0.195, 0.20, 0.20, 16, 12).translate(0, 0.02, 0), M(it));
    put(cyl(0.088, 0.115, 0.25, 14).rotateX(Math.PI / 2 + 0.22).translate(0, -0.04, 0.22), M(it));
    put(sph(0.088, 0.080, 0.088, 12, 8).translate(0, -0.065, 0.34), M(it));
    for (const s of [1, -1]) {
      put(cone(0.034, 0.11, 8).rotateZ(s * -0.18).translate(s * 0.10, 0.24, 0.02), M(it));
      put(sph(0.022, 0.022, 0.022, 8, 6).translate(s * 0.115, 0.055, 0.155), toon('#ffffff'), false);
      put(sph(0.011, 0.011, 0.011, 8, 6).translate(s * 0.120, 0.055, 0.172), toon('#15121b'), false);
    }
    put(box(0.045, 0.28, 0.11).translate(0, 0.11, -0.18), A(it));
  },
  clown_nose_glasses: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    // Big shiny red clown nose + bright yellow star frames!
    put(sph(0.044, 0.044, 0.044, 12, 10).translate(0, -0.02, fz + 0.045), M(it));
    for (const s of [1, -1]) {
      put(torus(0.048, 0.010, 6, 5).translate(s * 0.068, 0.028, fz + 0.024), A(it), false);
    }
    put(box(0.045, 0.010, 0.010).translate(0, 0.028, fz + 0.024), A(it), false);
  },
  anime_shimmer_glasses: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    for (const s of [1, -1]) {
      put(box(0.088, 0.052, 0.014).translate(s * 0.068, 0.024, fz + 0.024), M(it));
      put(box(0.076, 0.040, 0.018).translate(s * 0.068, 0.024, fz + 0.026), basicMat('#ffffff'), false);
      // Diagonal glowing glare slash!
      put(box(0.016, 0.062, 0.020).rotateZ(0.55).translate(s * 0.068 + 0.01, 0.024, fz + 0.028), basicMat('#00e5ff'), false);
    }
    put(box(0.055, 0.010, 0.010).translate(0, 0.024, fz + 0.024), M(it), false);
  },
  welding_mask: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    put(new THREE.CylinderGeometry(0.20, 0.19, 0.34, 18, 1, false, -Math.PI * 0.45, Math.PI * 0.90).translate(0, 0.01, 0.04), M(it));
    put(box(0.19, 0.075, 0.032).translate(0, 0.032, 0.235), basicMat(it.c2 || '#00e5ff'), false);
  },
  fencing_mask: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    const meshMat = new THREE.MeshToonMaterial({ color: it.c || '#d9d3cb', transparent: true, opacity: 0.72 });
    put(sph(0.205, 0.215, 0.22, 16, 12).translate(0, 0.01, 0.02), meshMat);
    put(torus(0.185, 0.016, 8, 20).rotateX(Math.PI / 2).translate(0, -0.14, 0.01), A(it));
  },
  scuba_snorkel: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    put(box(0.19, 0.095, 0.042).translate(0, 0.025, fz + 0.022), M(it));
    put(box(0.165, 0.070, 0.048).translate(0, 0.025, fz + 0.024), new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }), false);
    // Tall curved breathing snorkel tube rising up side of head!
    put(cyl(0.018, 0.018, 0.34, 10).translate(0.185, 0.12, 0.05), A(it));
    put(cyl(0.016, 0.016, 0.16, 10).rotateZ(Math.PI / 2).translate(0.10, -0.055, 0.15), A(it));
  },
  blindfold_cloth: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    put(cyl(0.188, 0.188, 0.078, 22).translate(0, 0.024, 0.002), M(it));
    // Two fluttering ribbon tails tied behind head!
    for (const s of [1, -1]) {
      put(box(0.032, 0.16, 0.012).rotateZ(s * 0.32).translate(s * 0.04, -0.03, -0.20), M(it));
    }
  },
  opera_lorgnette: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    for (const s of [1, -1]) {
      put(torus(0.044, 0.009, 6, 18).translate(s * 0.064, 0.024, fz + 0.024), M(it));
    }
    put(box(0.044, 0.009, 0.009).translate(0, 0.024, fz + 0.024), M(it), false);
    // Decorative gold handle sticking down on right side!
    put(cyl(0.008, 0.010, 0.16, 8).rotateZ(0.25).translate(0.125, -0.055, fz + 0.024), M(it));
  },
  giant_eyeballs: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    // Hilarious spring-loaded googly eyeballs popping way out in front of face!
    for (const s of [1, -1]) {
      put(cyl(0.012, 0.012, 0.11, 8).rotateX(Math.PI / 2).translate(s * 0.068, 0.026, fz + 0.06), toon('#7c828f'), false);
      put(sph(0.052, 0.052, 0.052, 12, 10).translate(s * 0.068, 0.026, fz + 0.125), M(it));
      put(sph(0.022, 0.022, 0.022, 8, 6).translate(s * 0.068 + s * 0.01, 0.026, fz + 0.168), A(it), false);
    }
  },
  paper_bag_mask: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    put(box(0.39, 0.42, 0.38).translate(0, 0.05, 0), M(it));
    for (const s of [1, -1]) {
      put(cyl(0.036, 0.036, 0.014, 12).rotateX(Math.PI / 2).translate(s * 0.072, 0.045, 0.192), A(it), false);
    }
    put(box(0.085, 0.016, 0.014).translate(0, -0.055, 0.192), A(it), false);
  },
  pixel_censored_bar: (d, it, add) => {
    const fz = headFrontZ(d, 0.02);
    const put = hatAddV2(d, add, 0);
    put(box(0.28, 0.078, 0.026).translate(0, 0.026, fz + 0.035), M(it));
    const tex = memePrintTex('CENSORED', it.c || '#15121b', it.c2 || '#ff2e93');
    put(new THREE.PlaneGeometry(0.26, 0.068).translate(0, 0.026, fz + 0.050), new THREE.MeshBasicMaterial({ map: tex }), false);
  },
};

// ======================= 9. ACCESSORIES & PROPS (+22 UNIQUE 3D SHAPES) =======================
export const ACC_SUB_V2 = {
  red_plastic_stool: 'handL', woven_hand_fan: 'handL', badminton_racket: 'handL',
  electric_mosquito_swatter: 'handL', rice_cooker_bag: 'handR', electric_fan_prop: 'handL',
  mop_bucket_prop: 'handL', keyboard_weapon: 'handL', giant_spoon: 'handL', bubble_wand: 'handL',
  magic_carpet_back: 'back', giant_bow_back: 'back', surfboard_back: 'back', coffin_back: 'back',
  angel_halo_floating: 'head', rain_cloud_head: 'head', mini_ufo_pet: 'head',
  shoulder_parrot: 'neck', shoulder_cat: 'neck', sash_miss_world: 'chestProp',
  giant_bowtie_neck: 'neck', floatie_flamingo: 'waist',
};

export const HELD_KINDS_V2 = {
  red_plastic_stool: 'upright', woven_hand_fan: 'wand', badminton_racket: 'wand',
  electric_mosquito_swatter: 'wand', electric_fan_prop: 'upright', mop_bucket_prop: 'sword',
  keyboard_weapon: 'upright', giant_spoon: 'sword', bubble_wand: 'wand',
};

export const ACC_V2 = {
  red_plastic_stool: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.55, 0.25, 0.2);
    // Iconic Vietnamese red plastic tea-stall stool held by its top!
    g.add(mesh(box(0.22, 0.036, 0.22).translate(0, 0.14, 0), M(it)));
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      g.add(mesh(cyl(0.016, 0.012, 0.28, 8).rotateZ(sx * -0.12).rotateX(sz * 0.12).translate(sx * 0.09, 0.0, sz * 0.09), M(it)));
    }
    add([hand, g]);
  },
  woven_hand_fan: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.72, 0.2, -0.15);
    g.add(mesh(cyl(0.010, 0.010, 0.18, 8).translate(0, 0.06, 0), A(it)));
    g.add(mesh(cyl(0.14, 0.14, 0.014, 16).rotateX(Math.PI / 2).translate(0, 0.22, 0), M(it)));
    g.add(mesh(torus(0.14, 0.010, 6, 18).translate(0, 0.22, 0), A(it), false));
    add([hand, g]);
  },
  badminton_racket: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.65, 0.15, -0.1);
    g.add(mesh(cyl(0.012, 0.014, 0.12, 8).translate(0, 0.04, 0), toon('#15121b')));
    g.add(mesh(cyl(0.005, 0.005, 0.20, 6).translate(0, 0.19, 0), M(it)));
    g.add(mesh(torus(0.095, 0.009, 6, 18).scale(0.82, 1.15, 1).translate(0, 0.39, 0), M(it)));
    g.add(mesh(cyl(0.075, 0.075, 0.004, 14).scale(1, 1, 1.35).rotateX(Math.PI / 2).translate(0, 0.39, 0), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.45 }), false));
    // Shuttlecock attached near net!
    g.add(mesh(cone(0.026, 0.055, 8).rotateX(Math.PI / 2).translate(0.02, 0.41, 0.04), A(it)));
    add([hand, g]);
  },
  electric_mosquito_swatter: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.68, 0.15, -0.1);
    g.add(mesh(cyl(0.018, 0.022, 0.16, 10).translate(0, 0.06, 0), M(it)));
    g.add(mesh(torus(0.105, 0.016, 8, 18).scale(0.85, 1.15, 1).translate(0, 0.26, 0), M(it)));
    g.add(mesh(cyl(0.088, 0.088, 0.006, 14).scale(1, 1, 1.3).rotateX(Math.PI / 2).translate(0, 0.26, 0), basicMat(it.c2 || '#ffea00'), false));
    add([hand, g]);
  },
  rice_cooker_bag: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    const g = new THREE.Group();
    g.position.set(-0.015 * hs, -0.04 * hs, 0.01 * hs);
    // Carrying a whole electric rice cooker by its top swing handle!
    g.add(mesh(torus(0.085, 0.010, 6, 14, Math.PI).translate(0, -0.06, 0), toon('#2b2533')));
    g.add(mesh(cyl(0.115, 0.110, 0.17, 18).translate(0, -0.15, 0), M(it)));
    g.add(mesh(cyl(0.120, 0.120, 0.024, 18).translate(0, -0.065, 0), A(it)));
    g.add(mesh(box(0.055, 0.038, 0.016).translate(0, -0.15, 0.112), A(it), false));
    add([hand, g]);
  },
  electric_fan_prop: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.45, 0.15, -0.08);
    // Carrying an entire standing pedestal electric fan!
    g.add(mesh(cyl(0.095, 0.105, 0.032, 16).translate(0, -0.16, 0), M(it)));
    g.add(mesh(cyl(0.016, 0.020, 0.42, 10).translate(0, 0.06, 0), A(it)));
    g.add(mesh(torus(0.145, 0.012, 8, 20).translate(0, 0.34, 0), A(it)));
    for (let i = 0; i < 3; i++) {
      g.add(mesh(box(0.042, 0.115, 0.010).rotateZ((i / 3) * Math.PI * 2).translate(0, 0.34, 0), M(it), false));
    }
    add([hand, g]);
  },
  mop_bucket_prop: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.35, 0.1, -0.06);
    g.add(mesh(cyl(0.013, 0.013, 0.88, 8).translate(0, 0.24, 0), M(it)));
    g.add(mesh(sph(0.095, 0.082, 0.095, 12, 8).translate(0, -0.22, 0), A(it)));
    add([hand, g]);
  },
  keyboard_weapon: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.52, 0.18, -0.12);
    // RGB mechanical gaming keyboard wielded like a battle axe!
    g.add(mesh(box(0.36, 0.028, 0.135).translate(0.08, 0.06, 0), M(it)));
    g.add(mesh(box(0.33, 0.014, 0.110).translate(0.08, 0.078, 0), basicMat(it.c2 || '#00e5ff'), false));
    add([hand, g]);
  },
  giant_spoon: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.32, 0.1, -0.06);
    // Comically oversized giant stainless steel spoon taller than the character!
    g.add(mesh(cyl(0.016, 0.020, 0.92, 10).translate(0, 0.22, 0), M(it)));
    g.add(mesh(sph(0.11, 0.165, 0.042, 14, 10).translate(0, 0.74, 0.012), M(it)));
    add([hand, g]);
  },
  bubble_wand: (d, it, add) => {
    const { hand, g } = lhV2(d, 0.65, 0.12, -0.1);
    g.add(mesh(cyl(0.010, 0.010, 0.26, 8).translate(0, 0.10, 0), M(it)));
    g.add(mesh(torus(0.062, 0.010, 6, 16).translate(0, 0.28, 0), M(it)));
    const bMat = new THREE.MeshToonMaterial({ color: it.c2 || '#00e5ff', transparent: true, opacity: 0.52 });
    g.add(mesh(sph(0.048, 0.048, 0.048, 12, 10).translate(0.06, 0.38, 0.05), bMat, false));
    g.add(mesh(sph(0.032, 0.032, 0.032, 10, 8).translate(-0.04, 0.46, 0.02), bMat, false));
    add([hand, g]);
  },
  // --- BACK PROPS ---
  magic_carpet_back: (d, it, add) => {
    const bz = backZV2(d) - 0.05;
    add([d.j.chest, mesh(cyl(0.062, 0.062, 0.62, 14).rotateZ(0.65).translate(0, d.Y.chest - d.Y.waist, bz), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(torus(0.064, 0.010, 6, 14).rotateZ(0.65).translate(s * 0.18, d.Y.chest - d.Y.waist - s * 0.14, bz), A(it), false)]);
    }
  },
  giant_bow_back: (d, it, add) => {
    const bz = backZV2(d) - 0.04;
    const cy = d.Y.waist - d.Y.hip + 0.04;
    add([d.j.hips, mesh(sph(0.055, 0.055, 0.045, 10, 8).translate(0, cy, bz), A(it))]);
    for (const s of [1, -1]) {
      add([d.j.hips, mesh(cone(0.14, 0.26, 10).scale(1, 1, 0.42).rotateZ(s * Math.PI / 2).translate(s * 0.15, cy + 0.02, bz - 0.02), M(it))]);
      add([d.j.hips, mesh(box(0.075, 0.34, 0.018).rotateZ(s * -0.22).translate(s * 0.08, cy - 0.18, bz - 0.02), M(it))]);
    }
  },
  surfboard_back: (d, it, add) => {
    const bz = backZV2(d) - 0.04;
    add([d.j.chest, mesh(sph(0.185, 0.62, 0.028, 16, 12).rotateZ(-0.22).translate(0, d.Y.chest - d.Y.waist + 0.06, bz), M(it))]);
    add([d.j.chest, mesh(box(0.055, 1.12, 0.032).rotateZ(-0.22).translate(0, d.Y.chest - d.Y.waist + 0.06, bz), A(it), false)]);
  },
  coffin_back: (d, it, add) => {
    const bz = backZV2(d) - 0.085;
    const cy = d.Y.chest - d.Y.waist - 0.02;
    add([d.j.chest, mesh(cyl(0.145, 0.115, 0.64, 6).scale(1.15, 1, 0.55).translate(0, cy, bz), M(it))]);
    add([d.j.chest, mesh(box(0.028, 0.22, 0.016).translate(0, cy + 0.06, bz - 0.08), A(it), false)]);
    add([d.j.chest, mesh(box(0.14, 0.028, 0.016).translate(0, cy + 0.10, bz - 0.08), A(it), false)]);
  },
  // --- HEAD FLOATING PROPS ---
  angel_halo_floating: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.18);
    put(torus(0.155, 0.018, 10, 24).rotateX(Math.PI / 2).translate(0, 0.32, 0), basicMat(it.c || '#ffea00'), false);
  },
  rain_cloud_head: (d, it, add) => {
    const put = hatAddV2(d, add, openTop(d) - 0.18);
    // Stormy gray cloud floating above head with yellow lightning bolt + blue raindrops!
    const puffs = [[0, 0.38, 0, 0.11], [-0.09, 0.36, 0.02, 0.085], [0.09, 0.36, 0.02, 0.085], [0, 0.37, -0.06, 0.08]];
    for (const [px, py, pz, r] of puffs) put(sph(r, r * 0.78, r, 10, 8).translate(px, py, pz), M(it));
    put(cone(0.024, 0.11, 4).rotateZ(0.28).rotateX(Math.PI).translate(0, 0.28, 0.03), basicMat(it.c2 || '#ffea00'), false);
    for (const x of [-0.07, 0.07]) put(cone(0.012, 0.035, 6).translate(x, 0.27, 0.04), toon('#6ec6ff'), false);
  },
  mini_ufo_pet: (d, it, add) => {
    const put = hatAddV2(d, add, 0);
    // Tiny flying saucer hovering beside the head with glowing tractor beam!
    put(sph(0.115, 0.032, 0.115, 16, 10).translate(0.29, 0.24, 0.04), M(it));
    put(sph(0.055, 0.042, 0.055, 12, 8).translate(0.29, 0.268, 0.04), basicMat(it.c2 || '#76ff03'), false);
    const beam = new THREE.MeshBasicMaterial({ color: it.c2 || '#76ff03', transparent: true, opacity: 0.32, side: THREE.DoubleSide });
    put(new THREE.ConeGeometry(0.075, 0.16, 14, 1, true).translate(0.29, 0.15, 0.04), beam, false);
  },
  // --- NECK / SHOULDER / CHEST / WAIST PROPS ---
  shoulder_parrot: (d, it, add) => {
    const sx = d.T.sh + 0.02, sy = d.Y.shoulder - d.Y.waist + 0.06;
    // Colorful pirate parrot perched right on the right shoulder!
    add([d.j.chest, mesh(sph(0.055, 0.082, 0.062, 12, 10).translate(sx, sy + 0.04, 0.02), M(it))]);
    add([d.j.chest, mesh(sph(0.045, 0.045, 0.045, 12, 8).translate(sx, sy + 0.135, 0.035), M(it))]);
    add([d.j.chest, mesh(cone(0.018, 0.045, 6).rotateX(Math.PI / 2 + 0.3).translate(sx, sy + 0.13, 0.09), A(it))]);
    add([d.j.chest, mesh(cone(0.028, 0.14, 6).rotateX(-0.45).translate(sx, sy - 0.04, -0.05), A(it))]);
  },
  shoulder_cat: (d, it, add) => {
    const sx = -(d.T.sh + 0.01), sy = d.Y.shoulder - d.Y.waist + 0.05;
    // Cute chubby tabby cat sleeping curled on the left shoulder!
    add([d.j.chest, mesh(sph(0.068, 0.052, 0.095, 12, 10).translate(sx, sy + 0.02, 0.01), M(it))]);
    add([d.j.chest, mesh(sph(0.048, 0.045, 0.048, 12, 8).translate(sx, sy + 0.055, 0.095), M(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cone(0.016, 0.034, 6).translate(sx + s * 0.028, sy + 0.105, 0.095), M(it))]);
    }
    add([d.j.chest, mesh(cyl(0.012, 0.010, 0.12, 8).rotateX(-0.9).translate(sx, sy + 0.02, -0.10), A(it))]);
  },
  sash_miss_world: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const fz = frontTorsoZ(d, Y.chest, 0.030);
    const tex = memePrintTex('HOA HẬU XÓM LẦY', it.c || '#ffffff', it.c2 || '#d4af37');
    add([d.j.chest, mesh(box(0.075, 0.46, 0.016).rotateZ(-0.62).translate(0, Y.chest - Y.waist - 0.03, fz), M(it))]);
    add([d.j.chest, mesh(new THREE.PlaneGeometry(0.068, 0.34).rotateZ(-0.62).translate(0, Y.chest - Y.waist - 0.03, fz + 0.010), new THREE.MeshBasicMaterial({ map: tex }), false)]);
  },
  giant_bowtie_neck: (d, it, add) => {
    const fz = frontTorsoZ(d, d.Y.neck - 0.03, 0.034);
    const cy = d.Y.neck - d.Y.waist - 0.03;
    add([d.j.chest, mesh(sph(0.042, 0.042, 0.036, 10, 8).translate(0, cy, fz), A(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cone(0.088, 0.18, 8).scale(1, 1, 0.42).rotateZ(s * Math.PI / 2).translate(s * 0.10, cy, fz), M(it))]);
    }
  },
  floatie_flamingo: (d, it, add) => {
    const r = d.T.hip + 0.14;
    add([d.j.hips, mesh(torus(r, 0.056, 12, 24).rotateX(Math.PI / 2).translate(0, 0.03, 0), M(it))]);
    // Tall graceful pink flamingo neck & curved black-tipped beak rising at front!
    add([d.j.hips, mesh(cyl(0.026, 0.032, 0.28, 10).rotateX(-0.18).translate(0, 0.19, r + 0.01), M(it))]);
    add([d.j.hips, mesh(sph(0.048, 0.044, 0.054, 12, 8).translate(0, 0.33, r + 0.035), M(it))]);
    add([d.j.hips, mesh(cone(0.020, 0.065, 8).rotateX(Math.PI * 0.72).translate(0, 0.31, r + 0.095), A(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.42);
  },
};
