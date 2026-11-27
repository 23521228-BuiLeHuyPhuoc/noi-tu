// @ts-nocheck
// wear-tops.js — 24 diverse & distinctive tops adapting parametrically to all 6 body types.
import * as THREE from 'three';
import { mesh, sph, cyl, box, torus, cap, toon } from './core.js';
import { M, A, torsoShell, sleeve, band, neckBand, frontTorsoZ } from './wear-helpers.js';

function buttons(d, add, ys, inf, col = '#ffd56b', r = 0.007) {
  const m = toon(col);
  for (const y of ys) {
    add([d.j.chest, mesh(sph(r, r, r * 0.6, 8, 6).translate(0, y - d.Y.waist, frontTorsoZ(d, y, inf) + 0.004), m, false)]);
  }
}

function shoulderStraps(d, add, mat, r = 0.0085, xScale = 0.56) {
  const Y = d.Y, T = d.T;
  const y0 = Y.chest + (Y.shoulder - Y.chest) * 0.52;
  const y1 = Y.shoulder + 0.012;
  const x = T.sh * xScale;
  const fz = frontTorsoZ(d, (y0 + y1) * 0.5, 0.012, x);
  for (const s of [1, -1]) {
    add([d.j.chest, mesh(cap(r, y1 - y0, 4, 8).rotateZ(s * 0.14).translate(s * x, (y0 + y1) * 0.5 - Y.waist, fz * 0.72), mat)]);
    add([d.j.chest, mesh(cap(r, y1 - y0, 4, 8).rotateZ(s * 0.14).translate(s * x, (y0 + y1) * 0.5 - Y.waist, -fz * 0.68), mat)]);
    add([d.j.chest, mesh(torus(fz * 0.70, r, 6, 12, Math.PI).rotateY(Math.PI / 2).translate(s * (x - 0.006), y1 - Y.waist - 0.01, 0), mat, false)]);
  }
}

export const TOP_BUILD = {
  tee: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.014, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.30, 0.012).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.016, 0.016)]);
  },

  crop_top: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.042, Y.neck, 0.013, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.26, 0.012).forEach(add);
    add([d.j.chest, band(d.T.waist + 0.018, 0.044, 0.016, it, 0.75)]);
  },

  tank: (d, it, add) => {
    const Y = d.Y;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.52;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.03, topY, 0.012, 0.010, { noNeckCap: true })]);
    shoulderStraps(d, add, M(it), 0.0075, 0.54);
  },

  tank_sport: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.62;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.025, topY, 0.013, 0.008, { noNeckCap: true })]);
    shoulderStraps(d, add, A(it), 0.014, 0.50);
    // Athletic chest bar
    const fz = frontTorsoZ(d, Y.chest + 0.01, 0.016);
    add([d.j.chest, mesh(box(T.chest * 1.15, 0.026, 0.012).translate(0, Y.chest + 0.01 - Y.waist, fz + 0.002), A(it), false)]);
  },

  blouse: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.014, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.012, 0, { cuff: true }).forEach(add);
    // Crisp shirt collar + button placket
    const ny = Y.neck - Y.waist - 0.016;
    const fz = frontTorsoZ(d, Y.neck - 0.02, 0.016);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.044, 0.028, 0.010).rotateZ(s * 0.35).translate(s * 0.028, ny, fz + 0.012), A(it))]);
    }
    const chH = Y.neck - Y.waist - 0.04;
    add([d.j.chest, mesh(box(0.018, chH, 0.008).translate(0, chH * 0.5 - 0.02, frontTorsoZ(d, Y.chest, 0.016) + 0.002), A(it), false)]);
    buttons(d, add, [Y.waist + 0.03, Y.chest - 0.01, Y.chest + 0.06], 0.018, it.c2 || '#ffffff', 0.006);
  },

  puff_blouse: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.03, Y.neck, 0.014, 0.024)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.014, 0.026).forEach(add);
    // Peter Pan collar + cute bow
    const ny = Y.neck - Y.waist - 0.018;
    const fz = frontTorsoZ(d, Y.neck - 0.025, 0.016);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.042, 0.010, 0.036, 12, 8).rotateZ(s * 0.42).translate(s * 0.036, ny, fz + 0.006), A(it))]);
      add([d.j.chest, mesh(sph(0.020, 0.012, 0.008, 8, 6).rotateZ(s * 0.3).translate(s * 0.018, ny - 0.020, fz + 0.016), A(it))]);
    }
  },

  hoodie: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.024, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.020, 0, { cuff: true }).forEach(add);
    // Cozy hood resting behind neck + front kangaroo pocket + drawstrings
    add([d.j.chest, mesh(torus(T.neckR + 0.042, 0.034, 10, 20).scale(1, 0.62, 1.08).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.028, -0.028), M(it))]);
    const pfz = frontTorsoZ(d, Y.waist - 0.02, 0.026);
    add([d.j.chest, mesh(box(T.waist * 1.12, 0.072, 0.018).translate(0, -0.025, pfz + 0.004), A(it))]);
    const dfz = frontTorsoZ(d, Y.chest + 0.03, 0.026);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cyl(0.004, 0.004, 0.09, 6).translate(s * 0.024, Y.chest + 0.035 - Y.waist, dfz + 0.006), A(it), false)]);
    }
  },

  sweater: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.neck, 0.022, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.018, 0, { cuff: true }).forEach(add);
    // High cozy turtleneck + bottom ribbed band sitting cleanly outside hem
    add([d.j.chest, neckBand(d, it, 0.054, 0.018)]);
    add([d.j.chest, band(T.hip + 0.036, Y.hip - 0.004 - Y.waist, 0.030, it, 0.75)]);
  },

  corset_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.38;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.04, topY, 0.014, 0.008, { noNeckCap: true })]);
    add([d.j.chest, band(T.chest + 0.016, topY - Y.waist - 0.008, 0.016, it, 0.78)]);
    // Front corset boning & criss-cross laces
    const lm = A(it);
    for (let i = 0; i < 4; i++) {
      const ly = Y.waist - 0.01 + i * 0.034;
      const fz = frontTorsoZ(d, ly, 0.016);
      for (const s of [1, -1]) {
        add([d.j.chest, mesh(box(0.032, 0.005, 0.006).rotateZ(s * 0.45).translate(0, ly - Y.waist, fz + 0.004), lm, false)]);
      }
    }
  },

  off_shoulder: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.42;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.03, topY, 0.013, 0.018, { noNeckCap: true })]);
    // Signature off-shoulder ruffled horizontal band
    add([d.j.chest, mesh(torus(T.sh * 0.88, 0.026, 10, 24).scale(1.12, 0.85, 0.72).rotateX(Math.PI / 2).translate(0, topY - Y.waist - 0.006, 0), A(it))]);
    for (const s of [1, -1]) {
      const { sh } = d.j.arm[s];
      add([sh, mesh(cyl(T.armR + 0.016, T.armR + 0.028, d.L.armUp * 0.65, 14).translate(0, -d.L.armUp * 0.48, 0), M(it))]);
    }
  },

  halter_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.56;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.03, topY, 0.013, 0.012, { noNeckCap: true })]);
    add([d.j.chest, neckBand(d, it, 0.020, 0.014)]);
    const midY = (topY + Y.neck) * 0.5;
    const fz = frontTorsoZ(d, midY, 0.014, 0.025);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cap(0.009, Y.neck - topY + 0.02, 4, 8).rotateZ(-s * 0.36).translate(s * T.chest * 0.24, midY - Y.waist, fz * 0.92), A(it))]);
    }
  },

  polo_shirt: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.015, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.32, 0.013).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.022, 0.018)]);
    const ny = Y.neck - Y.waist - 0.02;
    const fz = frontTorsoZ(d, Y.neck - 0.025, 0.016);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.040, 0.024, 0.010).rotateZ(s * 0.30).translate(s * 0.028, ny, fz + 0.010), A(it))]);
    add([d.j.chest, mesh(box(0.022, 0.095, 0.008).translate(0, Y.chest + 0.04 - Y.waist, frontTorsoZ(d, Y.chest + 0.04, 0.016) + 0.003), A(it), false)]);
    buttons(d, add, [Y.chest + 0.06, Y.chest + 0.02], 0.018, '#ffffff', 0.0055);
  },

  vest_gilet: (d, it, add) => {
    const Y = d.Y;
    // White inner dress shirt (tight=true so vest sits strictly outside with ZERO z-fighting!)
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.hip + 0.03, Y.neck, 0.012, 0.002, { tight: true, noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, { c: '#ffffff', p: 'plain' }, s, 0.92, 0.011).forEach(add);
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.015, Y.shoulder + 0.01, 0.024, 0.014, { noNeckCap: true })]);
    // White V-shirt triangle + double buttons
    const v = new THREE.Shape();
    v.moveTo(-0.044, 0.092); v.lineTo(0.044, 0.092); v.lineTo(0, -0.028); v.closePath();
    const fz = frontTorsoZ(d, Y.chest + 0.03, 0.026);
    add([d.j.chest, mesh(new THREE.ShapeGeometry(v).translate(0, Y.chest + 0.01 - Y.waist, fz + 0.005), toon('#ffffff'), false)]);
    buttons(d, add, [Y.waist + 0.01, Y.waist + 0.055, Y.waist + 0.10], 0.027, it.c2 || '#ffd56b', 0.007);
  },

  pirate_shirt: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.016, 0.022)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.016, 0.026, { bell: 0.018, cuff: true }).forEach(add);
    // Ruffled pirate jabot + crossed laces
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.018);
    for (let i = 0; i < 3; i++) {
      add([d.j.chest, mesh(sph(0.034 - i * 0.005, 0.016, 0.014, 10, 8).translate(0, Y.chest + 0.065 - i * 0.028 - Y.waist, fz + 0.008), A(it))]);
    }
  },

  cyber_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.016, 0.008)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.014).forEach(add);
    const neon = toon(it.c2 || '#00f0ff', 'plain', '#ffffff', { emissive: it.c2 || '#00f0ff', emissiveIntensity: 0.6 });
    add([d.j.chest, neckBand(d, it, 0.044, 0.018, M(it))]);
    add([d.j.chest, neckBand(d, it, 0.012, 0.021, neon)]);
    // Shoulder pauldrons + glowing chest chevron
    for (const s of [1, -1]) {
      add([d.j.arm[s].sh, mesh(sph(T.armR + 0.024, 0.026, T.armR + 0.022, 12, 8).translate(s * 0.012, 0.032, 0), M(it))]);
      add([d.j.chest, mesh(box(0.068, 0.011, 0.010).rotateZ(s * 0.45).translate(s * 0.028, Y.chest + 0.01 - Y.waist, frontTorsoZ(d, Y.chest + 0.01, 0.019) + 0.004), neon, false)]);
    }
  },

  jersey: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.neck, 0.020, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.016).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.018, 0.017)]);
    // Sporty chest stripe + badge
    const fz = frontTorsoZ(d, Y.chest, 0.022);
    add([d.j.chest, mesh(box(T.chest * 1.45, 0.042, 0.010).translate(0, Y.chest - Y.waist, fz + 0.002), A(it), false)]);
    add([d.j.chest, mesh(box(0.038, 0.048, 0.012).translate(0, Y.chest - Y.waist, fz + 0.006), M(it), false)]);
  },

  sailor_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.015, 0.014)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.014, 0, { cuff: true }).forEach(add);
    // Iconic square back sailor flap + front V-collar + ribbon bow!
    const colM = A(it);
    const shY = Y.shoulder - Y.waist;
    add([d.j.chest, mesh(box(T.sh * 1.45, 0.11, 0.012).translate(0, shY - 0.04, -T.chest * 0.76 - 0.024), colM)]);
    const fz = frontTorsoZ(d, Y.chest + 0.04, 0.018);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.032, 0.11, 0.010).rotateZ(-s * 0.38).translate(s * 0.036, Y.chest + 0.045 - Y.waist, fz + 0.006), colM)]);
    }
    const bowM = toon('#e8436b');
    add([d.j.chest, mesh(sph(0.018, 0.014, 0.012, 8, 6).translate(0, Y.chest - 0.005 - Y.waist, frontTorsoZ(d, Y.chest, 0.020) + 0.008), bowM)]);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.014, 0.056, 0.006).rotateZ(s * 0.22).translate(s * 0.012, Y.chest - 0.035 - Y.waist, frontTorsoZ(d, Y.chest - 0.03, 0.020) + 0.006), bowM)]);
    }
  },

  ao_ba_ba: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Traditional Southern Vietnamese tunic: hip-length split hem, round collar, center buttons, 2 lower pockets!
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.04, Y.neck, 0.018, 0.024)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.014).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.016, 0.016, M(it))]);
    buttons(d, add, [Y.hip + 0.06, Y.waist + 0.01, Y.chest - 0.02, Y.chest + 0.05], 0.022, it.c2 || '#f6e7d8', 0.0065);
    const py = Y.hip + 0.045;
    for (const s of [1, -1]) {
      const px = s * T.hip * 0.44;
      add([d.j.chest, mesh(box(0.046, 0.050, 0.012).rotateY(s * 0.36).translate(px, py - Y.waist, frontTorsoZ(d, py, 0.028, px) + 0.008), A(it))]);
    }
  },

  ao_yem: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Iconic traditional Vietnamese diamond-cut front apron sculpted onto curvy torso grid (ZERO skin poking!)
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.56;
    const botY = Y.waist - 0.015;
    const h = topY - botY;
    const cy = (topY + botY) * 0.5;
    const wMax = T.chest * 1.48;
    const g = new THREE.PlaneGeometry(1, 1, 8, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i), v = p.getY(i); // [-0.5, 0.5]
      // Diamond silhouette: narrow peak at top (v=0.5), widest at chest (v=0.05), gently tapered at waist (v=-0.5)
      const widthFrac = v > 0.05 ? Math.max(0.14, 1 - ((v - 0.05) / 0.45) * 0.86) : (0.76 + (v + 0.5) / 0.55 * 0.24);
      const vx = u * wMax * widthFrac;
      const vy = v * h;
      const vz = frontTorsoZ(d, cy + vy, 0.018, vx) + 0.004;
      p.setXYZ(i, vx, vy + cy - Y.waist, vz);
    }
    g.computeVertexNormals();
    add([d.j.chest, mesh(g, M(it, { doubleSide: true }))]);
    add([d.j.chest, neckBand(d, it, 0.012, 0.014)]);
    add([d.j.chest, band(T.waist + 0.015, 0.002, 0.012, it, 0.76)]);
  },

  tube_top: (d, it, add) => {
    const Y = d.Y;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.34;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.045, topY, 0.013, 0, { tight: true, noNeckCap: true })]);
    add([d.j.chest, band(d.T.chest + 0.015, topY - Y.waist - 0.006, 0.014, it, 0.78)]);
  },

  hanfu_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.016, 0.020)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.018, 0, { bell: 0.048, cuff: true }).forEach(add);
    // Crossed Y-collar (giao lĩnh) + silk waist tie
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.018);
    add([d.j.chest, mesh(box(0.026, 0.16, 0.010).rotateZ(0.42).translate(-0.012, Y.chest + 0.02 - Y.waist, fz + 0.005), A(it))]);
    add([d.j.chest, mesh(box(0.024, 0.14, 0.010).rotateZ(-0.42).translate(0.018, Y.chest + 0.03 - Y.waist, fz + 0.003), A(it))]);
    add([d.j.chest, band(T.waist + 0.022, 0.005, 0.024, it, 0.76)]);
  },

  idol_crop: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.44;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.045, topY, 0.013, 0, { tight: true, noNeckCap: true })]);
    // Asymmetric single shoulder strap + glittery star buckle + detached forearm warmers!
    const x = T.sh * 0.52;
    const fz = frontTorsoZ(d, (topY + Y.shoulder) * 0.5, 0.012, x);
    add([d.j.chest, mesh(cap(0.010, Y.shoulder - topY + 0.01, 4, 8).rotateZ(0.14).translate(x, (topY + Y.shoulder) * 0.5 - Y.waist, fz * 0.72), A(it))]);
    add([d.j.chest, mesh(cap(0.010, Y.shoulder - topY + 0.01, 4, 8).rotateZ(0.14).translate(x, (topY + Y.shoulder) * 0.5 - Y.waist, -fz * 0.68), A(it))]);
    add([d.j.chest, mesh(sph(0.022, 0.022, 0.010, 8, 6).translate(0, 0.052, frontTorsoZ(d, Y.waist + 0.052, 0.016) + 0.006), A(it))]);
    for (const s of [1, -1]) {
      const { el } = d.j.arm[s];
      add([el, mesh(cyl(T.foreR + 0.012, T.foreR + 0.016, d.L.armLo * 0.78, 14).translate(0, -d.L.armLo * 0.45, 0), A(it))]);
    }
  },

  hawaiian_shirt: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.018, 0.022)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.36, 0.016, 0.006).forEach(add);
    // Open camp collar lapels
    const ny = Y.neck - Y.waist - 0.026;
    const fz = frontTorsoZ(d, Y.neck - 0.03, 0.020);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.044, 0.046, 0.010).rotateZ(s * 0.52).translate(s * 0.036, ny, fz + 0.008), A(it))]);
    }
    buttons(d, add, [Y.waist + 0.01, Y.chest - 0.03, Y.chest + 0.03], 0.021, '#f6e7d8', 0.006);
  },

  goth_mesh: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.014, 0.012)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.013, 0, { bell: 0.036 }).forEach(add);
    // High lace choker + harness X-straps across chest
    add([d.j.chest, neckBand(d, it, 0.032, 0.014)]);
    const fz = frontTorsoZ(d, Y.chest, 0.017);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.014, 0.16, 0.008).rotateZ(s * 0.55).translate(0, Y.chest - Y.waist, fz + 0.005), A(it), false)]);
    }
    add([d.j.chest, mesh(torus(0.018, 0.005, 6, 14).translate(0, Y.chest - Y.waist, fz + 0.010), toon('#e6e8ec'), false)]);
  },
};

// Back-compat aliases from v4
TOP_BUILD.crop = TOP_BUILD.crop_top;
TOP_BUILD.blazer = TOP_BUILD.vest_gilet;
