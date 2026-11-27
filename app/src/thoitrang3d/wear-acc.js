// @ts-nocheck
// wear-acc.js — 28 accessories (bags, jewelry, ties, scarves, wings, tails, held props) with zero floating.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat } from './core.js';
import { M, A, frontTorsoZ } from './wear-helpers.js';

export const ACC_SUB = {
  handbag: 'handR', clutch: 'handR', heart_purse: 'hipBag', backpack: 'back',
  pearls: 'neck', choker: 'neck', gold_chain: 'neck', necktie: 'neck', bowtie: 'neck', scarf: 'neck', khan_ran: 'neck',
  earrings_hoop: 'ears', headphones: 'head',
  fairy_wings: 'back', angel_wings: 'back', bat_wings: 'back',
  cat_tail: 'tail', fox_tail: 'tail', devil_tail: 'tail',
  phone: 'handL', mic: 'handL', folding_fan: 'handL', umbrella: 'handL',
  guitar: 'chestProp', bubble_tea: 'handL', sword: 'handL', wand: 'handL', bouquet: 'handL',
};

export const HELD_KINDS = {
  phone: 'upright', mic: 'upright', folding_fan: 'upright', bubble_tea: 'upright', bouquet: 'upright',
  umbrella: 'umbrella', wand: 'wand', sword: 'sword', guitar: 'guitar',
};

function outerOff(d) {
  return Math.max(d.outerInf || 0, d.topInf || 0.015);
}

function backZ(d) {
  return -(d.T.chest * 0.75 + outerOff(d) + 0.012);
}

function tubePath(pts, rad, segs = 16, rSegs = 8) {
  const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  return new THREE.TubeGeometry(curve, segs, rad, rSegs, false);
}

function starShape(rOut, rIn = rOut * 0.44) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rIn : rOut, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  return sh;
}

export const ACC_BUILD = {
  // ===== BAGS (4) =====
  handbag: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.044, 0.11, 0.14).translate(0.020 * hs, -0.135 * hs, 0), M(it))]);
    add([hand, mesh(torus(0.044, 0.007, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(0.020 * hs, -0.075 * hs, 0), A(it))]);
    add([hand, mesh(sph(0.009, 0.009, 0.009, 8, 6).translate(0.044 * hs, -0.115 * hs, 0), toon('#f2c94c'), false)]);
  },

  clutch: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.032, 0.078, 0.145).translate(0.022 * hs, -0.048 * hs, 0.015), M(it))]);
    add([hand, mesh(box(0.036, 0.016, 0.038).translate(0.022 * hs, -0.028 * hs, 0.015), toon('#f2c94c'), false)]);
  },

  backpack: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const bz = backZ(d) - 0.048;
    const cy = Y.chest - 0.02 - Y.waist;
    add([d.j.chest, mesh(box(T.chest * 1.15, 0.19, 0.095).translate(0, cy, bz), M(it))]);
    add([d.j.chest, mesh(box(T.chest * 0.85, 0.085, 0.028).translate(0, cy - 0.042, bz - 0.056), A(it))]);
    add([d.j.chest, mesh(torus(0.032, 0.007, 6, 14, Math.PI).translate(0, cy + 0.098, bz), A(it))]);
  },

  heart_purse: (d, it, add) => {
    const T = d.T, Y = d.Y;
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.068); sh.bezierCurveTo(-0.102, 0.0, -0.058, 0.082, 0, 0.038);
    sh.bezierCurveTo(0.058, 0.082, 0.102, 0.0, 0, -0.068);
    const px = -(T.hip + 0.048);
    add([d.j.hips, mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.036, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(px, -0.02, 0.018), M(it))]);
    const fz = frontTorsoZ(d, Y.chest, outerOff(d) + 0.010);
    add([d.j.chest, mesh(box(0.015, (Y.shoulder - Y.hip) * 1.05, 0.008).rotateZ(-0.50).translate(0.005, (Y.chest + Y.waist) * 0.5 - Y.waist, fz + 0.006), A(it), false)]);
  },

  // ===== JEWELRY, TIES & SCARVES (7) =====
  pearls: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const r = T.neckR + 0.032 + outerOff(d) * 0.4;
    const ny = Y.neck - Y.waist - 0.025;
    const pm = toon(it.c || '#fff8f2');
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * 0.14 + (i / 13) * Math.PI * 0.72;
      add([d.j.chest, mesh(sph(0.0095, 0.0095, 0.0095, 8, 6).translate(Math.cos(a) * r, ny - Math.sin(a) * 0.032, Math.sin(a) * (r * 0.92)), pm, false)]);
    }
  },

  choker: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const ny = Y.neck - Y.waist + 0.005;
    add([d.j.chest, mesh(cyl(T.neckR + 0.011, T.neckR + 0.011, 0.020, 18, true).translate(0, ny, 0), M(it))]);
    add([d.j.chest, mesh(sph(0.014, 0.014, 0.008, 8, 6).translate(0, ny - 0.016, T.neckR + 0.018), A(it))]);
  },

  gold_chain: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = outerOff(d) + 0.008;
    const gm = toon(it.c || '#f2c94c');
    const r = T.neckR + 0.042;
    const ny = Y.neck - Y.waist - 0.022;
    for (let i = 0; i < 12; i++) {
      const a = Math.PI * 0.16 + (i / 11) * Math.PI * 0.68;
      add([d.j.chest, mesh(torus(0.010, 0.004, 6, 10).translate(Math.cos(a) * r, ny - Math.sin(a) * 0.068, Math.sin(a) * (frontTorsoZ(d, Y.chest + 0.04, inf) * 0.96)), gm, false)]);
    }
    const mz = frontTorsoZ(d, Y.chest + 0.01, inf);
    add([d.j.chest, mesh(cyl(0.026, 0.026, 0.009, 14).rotateX(Math.PI / 2).translate(0, Y.chest + 0.01 - Y.waist, mz + 0.008), A(it))]);
  },

  necktie: (d, it, add) => {
    const Y = d.Y;
    const inf = outerOff(d) + 0.008;
    const ny = Y.neck - 0.028;
    const by = Y.waist + 0.02;
    const h = ny - by;
    const fzTop = frontTorsoZ(d, ny, inf);
    const fzMid = frontTorsoZ(d, (ny + by) * 0.5, inf);
    add([d.j.chest, mesh(sph(0.018, 0.016, 0.012, 8, 6).translate(0, ny - Y.waist, fzTop + 0.008), A(it))]);
    add([d.j.chest, mesh(box(0.024, h * 0.85, 0.009).translate(0, (ny + by) * 0.5 - Y.waist, fzMid + 0.006), M(it))]);
    add([d.j.chest, mesh(cone(0.018, 0.036, 4).rotateY(Math.PI / 4).rotateX(Math.PI).translate(0, by - Y.waist, frontTorsoZ(d, by, inf) + 0.006), M(it))]);
  },

  bowtie: (d, it, add) => {
    const Y = d.Y;
    const ny = Y.neck - 0.022;
    const fz = frontTorsoZ(d, ny, outerOff(d) + 0.008);
    add([d.j.chest, mesh(sph(0.013, 0.012, 0.010, 8, 6).translate(0, ny - Y.waist, fz + 0.010), A(it))]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cone(0.022, 0.044, 4).rotateZ(s * Math.PI / 2).translate(s * 0.024, ny - Y.waist, fz + 0.008), M(it))]);
    }
  },

  scarf: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = outerOff(d) + 0.008;
    add([d.j.chest, mesh(torus(T.neckR + 0.036, 0.030, 10, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.015, 0), M(it))]);
    const fz = frontTorsoZ(d, Y.chest, inf, 0.038);
    add([d.j.chest, mesh(box(0.050, 0.175, 0.018).rotateZ(-0.08).translate(0.038, Y.chest - 0.01 - Y.waist, fz + 0.012), M(it))]);
    add([d.j.chest, mesh(box(0.052, 0.022, 0.020).rotateZ(-0.08).translate(0.045, Y.chest - 0.10 - Y.waist, fz + 0.012), A(it), false)]);
  },

  khan_ran: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const inf = outerOff(d) + 0.008;
    const checkM = toon(it.c || '#1b1820', 'check', it.c2 || '#ffffff');
    add([d.j.chest, mesh(torus(T.neckR + 0.034, 0.022, 8, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.016, 0), checkM)]);
    for (const s of [1, -1]) {
      const fx = s * 0.038;
      const fz = frontTorsoZ(d, Y.chest - 0.01, inf, fx);
      add([d.j.chest, mesh(box(0.042, 0.17, 0.014).rotateZ(-s * 0.12).translate(fx, Y.chest - 0.01 - Y.waist, fz + 0.010), checkM)]);
    }
  },

  // ===== EARS & HEAD (2) =====
  earrings_hoop: (d, it, add) => {
    const H = d.j.head, T = d.T;
    const em = toon(it.c || '#f2c94c');
    for (const s of [1, -1]) {
      add([H, mesh(torus(0.024, 0.0045, 6, 16).rotateY(Math.PI / 2).translate(s * (T.headRx + 0.014), -0.048, -0.004), em, false)]);
      add([H, mesh(sph(0.008, 0.008, 0.008, 8, 6).translate(s * (T.headRx + 0.014), -0.072, -0.004), A(it), false)]);
    }
  },

  headphones: (d, it, add) => {
    const H = d.j.head, T = d.T;
    const sx = T.headRx / 0.175, sy = T.headRy / 0.170;
    add([H, mesh(torus(0.195 * sx, 0.016, 8, 22, Math.PI).scale(1, sy / sx, 1).translate(0, 0.025, -0.005), M(it))]);
    for (const s of [1, -1]) {
      add([H, mesh(cyl(0.048, 0.048, 0.032, 14).rotateZ(Math.PI / 2).translate(s * (T.headRx + 0.022), -0.005, -0.005), M(it))]);
      add([H, mesh(torus(0.044, 0.011, 6, 14).rotateY(Math.PI / 2).translate(s * (T.headRx + 0.008), -0.005, -0.005), A(it), false)]);
    }
  },

  // ===== WINGS (3) =====
  fairy_wings: (d, it, add) => {
    const wm = toon(it.c, 'plain', '#fff', { opacity: 0.78, doubleSide: true });
    const bz = backZ(d) - 0.004;
    const cy = d.Y.chest - d.Y.waist;
    for (const s of [1, -1]) {
      const up = new THREE.Shape();
      up.moveTo(0, 0); up.bezierCurveTo(0.14 * s, 0.28, 0.36 * s, 0.24, 0.34 * s, 0.04); up.bezierCurveTo(0.24 * s, -0.06, 0.08 * s, -0.04, 0, 0);
      add([d.j.chest, mesh(new THREE.ShapeGeometry(up, 14).rotateY(s * 0.42).translate(0, cy + 0.02, bz), wm)]);
      const lo = new THREE.Shape();
      lo.moveTo(0, 0); lo.bezierCurveTo(0.18 * s, -0.02, 0.26 * s, -0.18, 0.16 * s, -0.24); lo.bezierCurveTo(0.06 * s, -0.22, 0.02 * s, -0.08, 0, 0);
      add([d.j.chest, mesh(new THREE.ShapeGeometry(lo, 12).rotateY(s * 0.46).translate(0, cy - 0.01, bz), toon(it.c2 || it.c, 'plain', '#fff', { opacity: 0.72, doubleSide: true }))]);
    }
  },

  angel_wings: (d, it, add) => {
    const bz = backZ(d) - 0.006;
    const cy = d.Y.chest - d.Y.waist + 0.04;
    for (const s of [1, -1]) {
      for (let i = 0; i < 6; i++) {
        const len = 0.34 - i * 0.036;
        const ang = 0.42 - i * 0.24;
        add([d.j.chest, mesh(sph(len * 0.58, 0.052, 0.018, 10, 8).rotateZ(s * ang).rotateY(s * 0.32).translate(s * (0.10 + len * 0.42), cy + 0.10 - i * 0.052, bz - 0.035 - i * 0.006), i === 0 ? A(it) : M(it))]);
      }
    }
  },

  bat_wings: (d, it, add) => {
    const wm = toon(it.c, 'plain', '#fff', { doubleSide: true });
    const bz = backZ(d) - 0.006;
    const cy = d.Y.chest - d.Y.waist + 0.02;
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.02); sh.lineTo(0.18 * s, 0.22); sh.lineTo(0.38 * s, 0.16);
      sh.quadraticCurveTo(0.28 * s, 0.04, 0.28 * s, -0.08);
      sh.quadraticCurveTo(0.18 * s, -0.02, 0.14 * s, -0.14);
      sh.quadraticCurveTo(0.06 * s, -0.04, 0, -0.08); sh.closePath();
      add([d.j.chest, mesh(new THREE.ShapeGeometry(sh, 10).rotateY(s * 0.40).translate(0, cy, bz), wm)]);
    }
  },

  // ===== TAILS (3) =====
  cat_tail: (d, it, add) => {
    const z0 = -(d.T.hip * 0.75 + 0.015);
    const pts = [[0, -0.01, z0], [0.02, -0.05, z0 - 0.12], [0.08, 0.03, z0 - 0.22], [0.11, 0.17, z0 - 0.24], [0.07, 0.24, z0 - 0.20]];
    add([d.j.hips, mesh(tubePath(pts, 0.022, 16, 8), M(it))]);
    add([d.j.hips, mesh(sph(0.024, 0.024, 0.024, 8, 6).translate(0.07, 0.24, z0 - 0.20), A(it))]);
  },

  fox_tail: (d, it, add) => {
    const z0 = -(d.T.hip * 0.75 + 0.015);
    const g = lathe([[0.012, 0], [0.062, 0.08], [0.092, 0.19], [0.074, 0.30], [0.020, 0.38]], 1, 16, 0, 2);
    g.rotateX(-1.15).rotateZ(-0.22).translate(0.02, -0.01, z0);
    add([d.j.hips, mesh(g, M(it))]);
    add([d.j.hips, mesh(sph(0.048, 0.064, 0.048, 10, 8).rotateX(-1.15).translate(0.09, 0.13, z0 - 0.32), A(it))]);
  },

  devil_tail: (d, it, add) => {
    const z0 = -(d.T.hip * 0.75 + 0.015);
    const pts = [[0, -0.01, z0], [-0.03, -0.06, z0 - 0.14], [-0.11, 0.02, z0 - 0.24], [-0.15, 0.15, z0 - 0.22]];
    add([d.j.hips, mesh(tubePath(pts, 0.012, 14, 8), M(it))]);
    add([d.j.hips, mesh(cone(0.032, 0.062, 4).rotateZ(0.4).translate(-0.16, 0.175, z0 - 0.22), A(it))]);
  },

  // ===== HELD PROPS (9 — calibrated to natural bent-elbow grip in idle & mid-catwalk!) =====
  phone: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const pg = new THREE.Group();
    pg.position.set(0.008 * hs, -0.025 * hs, 0.028 * hs);
    pg.rotation.set(0.72, 0.25, 0.08);
    pg.add(mesh(box(0.056, 0.105, 0.012), M(it)));
    pg.add(mesh(box(0.046, 0.086, 0.004).translate(0, 0, 0.006), basicMat('#a8e6ff'), false));
    pg.add(mesh(sph(0.008, 0.008, 0.004, 6, 6).translate(-0.014, 0.032, -0.007), toon('#15121b'), false));
    add([hand, pg]);
  },

  mic: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const mg = new THREE.Group();
    mg.position.set(0.004 * hs, -0.022 * hs, 0.024 * hs);
    mg.rotation.set(0.60, 0, -0.18);
    mg.add(mesh(cyl(0.014, 0.011, 0.16, 10).translate(0, 0.03, 0), M(it)));
    mg.add(mesh(sph(0.032, 0.032, 0.032, 12, 8).translate(0, 0.125, 0), A(it)));
    mg.add(mesh(torus(0.031, 0.004, 6, 14).rotateX(Math.PI / 2).translate(0, 0.125, 0), toon('#15121b'), false));
    add([hand, mg]);
  },

  folding_fan: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const fg = new THREE.Group();
    fg.position.set(0.006 * hs, -0.022 * hs, 0.026 * hs);
    fg.rotation.set(0.82, 0.22, -0.14);
    fg.add(mesh(new THREE.CircleGeometry(0.165, 16, 0.22, Math.PI - 0.44), M(it, { doubleSide: true })));
    fg.add(mesh(cyl(0.008, 0.008, 0.042, 8).translate(0, -0.012, 0), A(it), false));
    add([hand, fg]);
  },

  umbrella: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const poleH = (d.Y.head - d.Y.waist) + 0.56;
    const ug = new THREE.Group();
    ug.position.set(-0.022 * hs, -0.026 * hs, 0.026 * hs);
    ug.rotation.set(0.68, 0, 0.08);
    const domeY = poleH - 0.12;
    ug.add(mesh(cyl(0.008, 0.008, poleH, 8).translate(0, poleH * 0.48, 0), A(it)));
    ug.add(mesh(torus(0.024, 0.008, 6, 12, Math.PI).rotateZ(Math.PI).translate(0.024, -0.02, 0), A(it), false));
    ug.add(mesh(new THREE.SphereGeometry(0.36, 18, 10, 0, Math.PI * 2, 0, 1.05).scale(1, 0.55, 1).translate(0.08, domeY, 0), M(it, { doubleSide: true })));
    ug.add(mesh(torus(0.312, 0.008, 6, 20).rotateX(Math.PI / 2).translate(0.08, domeY + 0.098, 0), A(it), false));
    add([hand, ug]);
  },

  guitar: (d, it, add) => {
    // Strapped diagonally across torso: sculpted double-cutaway body at RIGHT hip, neck angled UP-LEFT!
    const Y = d.Y, T = d.T;
    const inf = outerOff(d) + 0.026;
    const gy = Y.waist - 0.05;
    const gz = frontTorsoZ(d, Y.chest, inf) + 0.022;
    const gGrp = new THREE.Group();
    // Place center right at front waist-hip, angled cleanly neck up-left (rotateZ +0.72 -> +Y points up-left, -Y points right-hip!)
    gGrp.position.set(0.02, gy - Y.waist, gz);
    gGrp.rotation.set(-0.08, 0.10, 0.72);

    // Authentic double-cutaway electric guitar silhouette (body at -Y = right hip!)
    const sh = new THREE.Shape();
    sh.moveTo(0, -0.26);
    sh.bezierCurveTo(0.13, -0.26, 0.14, -0.14, 0.085, -0.08);
    sh.bezierCurveTo(0.11, -0.02, 0.115, 0.06, 0.068, 0.075);
    sh.bezierCurveTo(0.048, 0.08, 0.032, 0.04, 0.022, 0.03);
    sh.lineTo(-0.022, 0.03);
    sh.bezierCurveTo(-0.032, 0.04, -0.052, 0.09, -0.076, 0.082);
    sh.bezierCurveTo(-0.125, 0.06, -0.115, -0.02, -0.088, -0.08);
    sh.bezierCurveTo(-0.145, -0.14, -0.135, -0.26, 0, -0.26);
    gGrp.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.026, bevelEnabled: false }).translate(0, 0, -0.013), M(it)));
    // Pickguard, pickups, bridge & knobs
    gGrp.add(mesh(sph(0.062, 0.082, 0.006, 10, 8).translate(0.015, -0.11, 0.015), A(it), false));
    gGrp.add(mesh(box(0.056, 0.016, 0.008).translate(0, -0.14, 0.017), toon('#1d1924'), false));
    gGrp.add(mesh(box(0.056, 0.016, 0.008).translate(0, -0.07, 0.017), toon('#1d1924'), false));
    gGrp.add(mesh(box(0.060, 0.014, 0.008).translate(0, -0.19, 0.017), toon('#d9dde6'), false));
    // Fretted neck + headstock extending up-left!
    gGrp.add(mesh(box(0.032, 0.36, 0.016).translate(0, 0.20, 0.002), toon('#5a3825')));
    gGrp.add(mesh(box(0.050, 0.082, 0.016).rotateZ(-0.12).translate(-0.005, 0.41, 0.002), M(it)));
    for (let i = 0; i < 4; i++) {
      gGrp.add(mesh(sph(0.006, 0.006, 0.006, 6, 6).translate(-0.034, 0.382 + i * 0.018, 0.002), toon('#e6e8ec'), false));
    }
    add([d.j.chest, gGrp]);
    // Diagonal guitar shoulder strap over left shoulder down to body
    add([d.j.chest, mesh(box(0.022, (Y.shoulder - Y.hip) * 1.02, 0.010).rotateZ(0.42).translate(-0.01, (Y.chest + Y.waist) * 0.5 - Y.waist, frontTorsoZ(d, Y.chest, inf - 0.008) + 0.004), toon('#1b1722'), false)]);
  },

  bubble_tea: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const bg = new THREE.Group();
    bg.position.set(0.006 * hs, -0.026 * hs, 0.028 * hs);
    bg.rotation.set(0.82, 0, 0);
    bg.add(mesh(cyl(0.038, 0.026, 0.115, 14), M(it)));
    bg.add(mesh(sph(0.038, 0.022, 0.038, 12, 8).translate(0, 0.058, 0), basicMat('#ffffff', { opacity: 0.65 }), false));
    bg.add(mesh(cyl(0.0065, 0.0065, 0.095, 8).rotateZ(-0.12).translate(0.005, 0.092, 0), A(it)));
    const bm = toon('#241820');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bg.add(mesh(sph(0.008, 0.008, 0.008, 6, 6).translate(Math.cos(a) * 0.021, -0.040, Math.sin(a) * 0.021), bm, false));
    }
    add([hand, bg]);
  },

  sword: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const sg = new THREE.Group();
    sg.position.set(-0.014 * hs, -0.024 * hs, 0.024 * hs);
    sg.rotation.set(0.38, 0, 0.24);
    sg.add(mesh(cyl(0.010, 0.010, 0.11, 8), toon('#4d2e22')));
    sg.add(mesh(box(0.115, 0.020, 0.022).translate(0, 0.055, 0), A(it)));
    sg.add(mesh(box(0.028, 0.42, 0.010).translate(0, 0.275, 0), toon(it.c || '#e8edf5')));
    sg.add(mesh(cone(0.020, 0.075, 4).rotateY(Math.PI / 4).translate(0, 0.52, 0), toon(it.c || '#e8edf5')));
    add([hand, sg]);
  },

  wand: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const wg = new THREE.Group();
    wg.position.set(0.004 * hs, -0.024 * hs, 0.024 * hs);
    wg.rotation.set(0.45, 0, -0.18);
    wg.add(mesh(cyl(0.007, 0.007, 0.30, 8).translate(0, 0.10, 0), A(it)));
    wg.add(mesh(new THREE.ExtrudeGeometry(starShape(0.052), { depth: 0.014, bevelEnabled: false }).translate(0, 0.265, -0.007), M(it)));
    add([hand, wg]);
  },

  bouquet: (d, it, add) => {
    const { hand } = d.j.arm[-1], hs = d.T.handS;
    const bg = new THREE.Group();
    bg.position.set(0.010 * hs, -0.022 * hs, 0.028 * hs);
    bg.rotation.set(0.62, 0, -0.16);
    bg.add(mesh(cone(0.058, 0.16, 12).rotateX(Math.PI).translate(0, 0.02, 0), A(it)));
    const leafM = toon('#4fa86c');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      bg.add(mesh(sph(0.024, 0.024, 0.024, 8, 6).translate(Math.cos(a) * 0.042, 0.115, Math.sin(a) * 0.042), i % 2 ? M(it) : toon('#ff8fb0')));
      bg.add(mesh(sph(0.018, 0.012, 0.028, 6, 6).translate(Math.cos(a + 0.5) * 0.056, 0.095, Math.sin(a + 0.5) * 0.056), leafM, false));
    }
    bg.add(mesh(sph(0.028, 0.028, 0.028, 8, 6).translate(0, 0.132, 0), M(it)));
    add([hand, bg]);
  },
};

// Back-compat aliases from v4
ACC_BUILD.bag = ACC_BUILD.handbag;
ACC_BUILD.wings = ACC_BUILD.fairy_wings;
ACC_BUILD.star = ACC_BUILD.wand;
