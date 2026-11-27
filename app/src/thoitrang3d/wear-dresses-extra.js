// @ts-nocheck
// wear-dresses-extra.js — 36 additional bespoke 3D dresses, world cultural costumes & hilarious Xóm Lầy full-body suits!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, cap, toon, basicMat, memePrintTex } from './core.js';
import { M, A, torsoShell, sleeve, pelvisShell, legShell, skirt, band, waistBand, neckBand, frontTorsoZ } from './wear-helpers.js';

export const DRESS_BUILD_EXTRA = {
  // ===== WORLD CULTURAL & ICONIC DRESSES / UNIFORMS (20) =====
  ao_nhat_binh: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Áo Nhật Bình cung đình Huế: cổ chữ nhật lớn, tay rộng ngũ sắc, tà dài uy nghi!
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.018, 0.028)]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.96, 0.024, 0, { bell: 0.056 }).forEach(add);
      // Ngũ sắc rainbow cuff stripes
      const el = d.j.arm[s].el;
      ['#c92a46', '#ffd56b', '#5fd3a6', '#2f6fd6'].forEach((col, idx) => {
        add([el, mesh(cyl(T.foreR + 0.064, T.foreR + 0.068, 0.018, 16).translate(0, -d.L.armLo * (0.68 + idx * 0.08), 0), toon(col), false)]);
      });
    }
    const fz = frontTorsoZ(d, Y.chest + 0.03, 0.021);
    add([d.j.chest, mesh(box(0.11, 0.14, 0.010).translate(0, Y.chest + 0.03 - Y.waist, fz + 0.004), A(it))]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.02, T.hip + 0.16, { pleats: 10 })]);
  },

  ao_tu_than: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#c92a46', p: 'plain' }, Y.waist, Y.chest + 0.06, 0.012, 0, { tight: true, noNeckCap: true })]);
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.neck, 0.017, 0.016, { gap: 0.72 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.013).forEach(add);
    add([d.j.hips, skirt(d, { c: '#15121b', p: 'plain' }, Y.waist - 0.01, Y.ankle + 0.02, T.hip + 0.15)]);
    add([d.j.hips, waistBand(d, it, 0.036, 0.020, A(it))]);
    const fz = frontTorsoZ(d, Y.hip, 0.030);
    for (const s of [1, -1]) {
      add([d.j.hips, mesh(box(0.055, 0.38, 0.010).rotateZ(s * 0.08).translate(s * 0.048, -0.14, fz + 0.012), M(it))]);
    }
  },

  kimono_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.017, 0, { tight: true })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.74, 0.022, 0.008, { bell: 0.058 }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.022, d.L.armUp * 1.15, 0.15).translate(s * 0.022, -d.L.armUp * 0.72, -0.04), M(it))]);
    }
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.01, T.hip + 0.065, { poof: 0.002 })]);
    // Wide stiff Obi sash + iconic rear bow!
    add([d.j.hips, band(T.waist + 0.030, Y.waist - Y.hip + 0.01, 0.095, it, 0.78, A(it))]);
    add([d.j.hips, mesh(box(0.16, 0.12, 0.055).translate(0, Y.waist - Y.hip + 0.01, -(T.waist * 0.78 + 0.055)), A(it))]);
  },

  hanbok_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Short Jeogori bodice in c2 + grand billowing high-waisted Chima skirt in c!
    const topIt = { c: it.c2 || '#ffffff', p: 'plain' };
    add([d.j.chest, torsoShell(d, topIt, Y.chest - 0.02, Y.neck, 0.016, 0.008, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, topIt, s, 0.94, 0.022, 0.014, { bell: 0.022 }).forEach(add);
    add([d.j.hips, skirt(d, it, Y.chest - 0.01, Y.ankle - 0.01, Math.max(0.40, T.hip + 0.26), { pleats: 14, poof: 0.048 })]);
    const fz = frontTorsoZ(d, Y.chest, 0.022);
    add([d.j.chest, mesh(box(0.026, 0.18, 0.010).rotateZ(-0.14).translate(0.03, -0.02, fz + 0.006), M(it))]);
  },

  sari_full: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#ffd56b', p: 'plain' }, Y.waist + 0.035, Y.neck, 0.013, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, { c: it.c2 || '#ffd56b', p: 'plain' }, s, 0.28, 0.012).forEach(add);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.01, T.hip + 0.135, { pleats: 10 })]);
    // Diagonal draped Sari Pallu sash across torso & over left shoulder!
    const fz = frontTorsoZ(d, Y.chest, 0.022);
    add([d.j.chest, mesh(box(0.075, (Y.shoulder - Y.hip) * 1.15, 0.014).rotateZ(0.44).translate(0, 0.06, fz + 0.006), M(it))]);
    add([d.j.chest, mesh(box(0.016, (Y.shoulder - Y.hip) * 1.15, 0.016).rotateZ(0.44).translate(0.028, 0.06, fz + 0.008), A(it), false)]);
  },

  dirndl: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.waist, Y.neck, 0.012, 0, { tight: true, noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, { c: '#ffffff', p: 'plain' }, s, 0.30, 0.016, 0.028).forEach(add);
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.chest + 0.05, 0.017, 0, { tight: true, noNeckCap: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee - 0.01, T.hip + 0.16, { pleats: 14 })]);
    // Front Dirndl apron in c2!
    add([d.j.hips, skirt(d, { c: it.c2 || '#ffffff', p: 'plain' }, Y.waist - 0.01, Y.knee + 0.02, T.hip + 0.168, { gap: Math.PI * 1.15, slitRot: Math.PI })]);
    add([d.j.hips, waistBand(d, it, 0.028, 0.020, A(it))]);
  },

  flamenco_dress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.chest + 0.06, 0.013, 0, { tight: true, noNeckCap: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee, T.hip + 0.035, { poof: 0.002 })]);
    // 3 dramatic cascading flamenco ruffles at knee to ankle!
    add([d.j.hips, skirt(d, it, Y.knee + 0.06, Y.knee - 0.06, T.hip + 0.16, { pleats: 18, poof: 0.03 })]);
    add([d.j.hips, skirt(d, { ...it, c: it.c2 || '#15121b' }, Y.knee - 0.03, Y.ankle + 0.08, T.hip + 0.21, { pleats: 20, poof: 0.03 })]);
    add([d.j.hips, skirt(d, it, Y.ankle + 0.10, Y.ankle - 0.01, T.hip + 0.26, { pleats: 22, poof: 0.03 })]);
  },

  toga_roman: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.chest + 0.06, 0.016, 0.010, { noNeckCap: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.03, T.hip + 0.13, { pleats: 12 })]);
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.022);
    add([d.j.chest, mesh(box(0.085, (Y.shoulder - Y.hip) * 1.08, 0.016).rotateZ(-0.46).translate(0, 0.05, fz + 0.006), A(it))]);
    add([d.j.hips, waistBand(d, it, 0.024, 0.018, toon('#d4af37'))]);
  },

  pharaoh_robe: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.015, 0, { tight: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.02, T.hip + 0.11, { pleats: 12 })]);
    // Broad Egyptian golden Usekh collar + central royal apron tab!
    const gm = toon('#d4af37');
    add([d.j.chest, mesh(torus(T.neckR + 0.075, 0.026, 8, 22).scale(1.15, 0.55, 0.85).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.032, 0), gm)]);
    add([d.j.hips, waistBand(d, it, 0.038, 0.020, gm)]);
    add([d.j.hips, mesh(box(0.082, 0.34, 0.014).translate(0, -0.14, (T.hip + 0.036) * 0.78), A(it))]);
  },

  samurai_armor: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.028, 0.012)]);
    for (const s of [1, -1]) {
      sleeve(d, { c: '#15121b', p: 'plain' }, s, 0.92, 0.014).forEach(add);
      // Iconic square Samurai Sode shoulder plates!
      add([d.j.arm[s].sh, mesh(box(0.024, 0.13, 0.11).rotateZ(s * 0.18).translate(s * (T.armR + 0.036), -0.02, 0), A(it))]);
    }
    // Segmented Kusazuri skirt plates + dark hakama legs
    add([d.j.hips, pelvisShell(d, { c: '#15121b', p: 'plain' })]);
    for (const s of [1, -1]) legShell(d, { c: '#15121b', p: 'plain' }, s, 0.94, 0.020, 0.018).forEach(add);
    add([d.j.hips, skirt(d, it, Y.waist, Y.hip - d.L.legUp * 0.52, T.hip + 0.085, { pleats: 6 })]);
    add([d.j.hips, waistBand(d, it, 0.036, 0.028, A(it))]);
  },

  knight_armor: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const met = toon(it.c || '#c9cfd8');
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.028, 0.010, { mat: met })]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.018, mat: met })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.94, 0.018, 0, { mat: met }).forEach(add);
      legShell(d, it, s, 0.95, 0.018, 0, { mat: met }).forEach(add);
      add([d.j.arm[s].sh, mesh(sph(T.armR + 0.036, 0.038, T.armR + 0.032, 12, 8).translate(s * 0.016, 0.036, 0), A(it))]);
    }
    add([d.j.hips, waistBand(d, it, 0.030, 0.024, A(it))]);
  },

  astronaut_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.neck, 0.036, 0.012)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.028 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.028, 0.008, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.95, 0.028, 0.008, { jogger: true, cuff: true }).forEach(add);
    }
    // Chest control box + neck ring + backpack life support!
    const fz = frontTorsoZ(d, Y.chest, 0.038);
    add([d.j.chest, mesh(box(0.12, 0.095, 0.034).translate(0, Y.chest - Y.waist, fz + 0.014), A(it))]);
    add([d.j.chest, mesh(box(0.18, 0.24, 0.10).translate(0, Y.chest - 0.02 - Y.waist, -(T.chest * 0.78 + 0.08)), M(it))]);
    add([d.j.chest, neckBand(d, it, 0.032, 0.032, A(it))]);
  },

  hazmat_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.01, Y.neck, 0.032, 0.012)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.024 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.96, 0.026, 0, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.96, 0.024, 0.006, { jogger: true, cuff: true }).forEach(add);
    }
    add([d.j.chest, band(T.waist + 0.036, 0, 0.026, it, 0.78, A(it))]);
    add([d.j.chest, mesh(torus(T.neckR + 0.052, 0.034, 8, 18).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.01, -0.02), M(it))]);
  },

  prisoner_suit: (d, it, add) => {
    const pIt = { ...it, p: 'stripe' };
    add([d.j.chest, torsoShell(d, pIt, d.Y.hip, d.Y.neck, 0.020, 0.012)]);
    add([d.j.hips, pelvisShell(d, pIt, { inf: 0.014 })]);
    for (const s of [1, -1]) {
      sleeve(d, pIt, s, 0.94, 0.016).forEach(add);
      legShell(d, pIt, s, 0.95, 0.016, 0.006).forEach(add);
    }
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('TÙ NHÂN #999', '#ffffff', '#15121b') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.055).translate(0, d.Y.chest - d.Y.waist, frontTorsoZ(d, d.Y.chest, 0.024) + 0.005), decal)]);
  },

  maid_dress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, Y.neck, 0.014, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.30, 0.016, 0.026).forEach(add);
    const fz = frontTorsoZ(d, Y.chest, 0.017);
    add([d.j.chest, mesh(box(T.chest * 0.82, (Y.shoulder - Y.waist) * 0.78, 0.010).translate(0, Y.chest - Y.waist, fz + 0.006), A(it))]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee + 0.02, T.hip + 0.165, { pleats: 14, poof: 0.032 })]);
    add([d.j.hips, skirt(d, { c: it.c2 || '#ffffff', p: 'plain' }, Y.waist - 0.01, Y.knee + 0.05, T.hip + 0.172, { gap: Math.PI * 1.15, slitRot: Math.PI })]);
    // Big cute bow at back waist!
    add([d.j.hips, mesh(box(0.14, 0.075, 0.036).translate(0, Y.waist - Y.hip, -(T.waist * 0.78 + 0.038)), A(it))]);
  },

  santa_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.04, Y.neck, 0.032, 0.024)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.024, 0, { cuff: true }).forEach(add);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.018 })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.94, 0.018, 0.006, { cuff: true }).forEach(add);
    // Fluffy white fur vertical trim + black Santa belt with gold buckle!
    add([d.j.chest, mesh(box(0.038, Y.neck - Y.hip, 0.016).translate(0, (Y.neck + Y.hip) * 0.5 - Y.waist, frontTorsoZ(d, Y.chest, 0.034) + 0.006), A(it))]);
    add([d.j.chest, band(T.waist + 0.038, 0.0, 0.036, it, 0.78, toon('#15121b'))]);
    add([d.j.chest, mesh(box(0.052, 0.044, 0.014).translate(0, 0.0, frontTorsoZ(d, Y.waist, 0.042) + 0.006), toon('#ffd56b'))]);
  },

  clown_suit: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const cIt = { ...it, p: it.p === 'plain' ? 'dots' : it.p };
    add([d.j.chest, torsoShell(d, cIt, Y.hip - 0.02, Y.neck, 0.034, 0.022)]);
    add([d.j.hips, pelvisShell(d, cIt, { inf: 0.028 })]);
    for (const s of [1, -1]) {
      sleeve(d, cIt, s, 0.95, 0.028, 0.016, { cuff: true }).forEach(add);
      legShell(d, cIt, s, 0.95, 0.032, 0.018, { jogger: true, cuff: true }).forEach(add);
    }
    // Giant ruffled clown collar + 3 colorful giant pom-poms!
    add([d.j.chest, mesh(torus(T.neckR + 0.075, 0.034, 10, 22).scale(1.1, 0.6, 1.0).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.018, 0), A(it))]);
    ['#ff3b6b', '#ffd56b', '#00e5ff'].forEach((col, i) => {
      const py = Y.chest + 0.03 - i * 0.075;
      add([d.j.chest, mesh(sph(0.026, 0.026, 0.022, 10, 8).translate(0, py - Y.waist, frontTorsoZ(d, py, 0.036) + 0.014), toon(col))]);
    });
  },

  bikini_set: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const fz = frontTorsoZ(d, Y.chest, 0.014);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.056, 0.050, 0.034, 12, 8).translate(s * (T.chest * 0.44), Y.chest - Y.waist, fz * 0.88), M(it))]);
    }
    add([d.j.chest, band(T.chest + 0.014, Y.chest - 0.012 - Y.waist, 0.014, it, 0.78, A(it))]);
    add([d.j.chest, neckBand(d, it, 0.010, 0.012, A(it))]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.008 })]);
  },

  swimsuit_onepiece: (d, it, add) => {
    const Y = d.Y;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.50;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, topY, 0.009, 0, { tight: true, noNeckCap: true })]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.008 })]);
    add([d.j.chest, band(d.T.waist + 0.012, 0.0, 0.016, it, 0.76, A(it))]);
  },

  slip_dress: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const topY = Y.chest + (Y.shoulder - Y.chest) * 0.46;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.01, topY, 0.011, 0, { tight: true, noNeckCap: true })]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee - 0.06, T.hip + 0.058, { poof: 0.004 })]);
  },

  // ===== ULTIMATE XÓM LẦY FULL-BODY COSTUMES (16) =====
  banana_suit: (d, it, add) => {
    // Bộ đồ quả chuối vàng khổng lồ cong vút ôm trọn thân!
    const Y = d.Y;
    const h = Y.head - Y.knee + 0.45;
    const g = lathe([
      [0.015, 0], [0.16, h * 0.14], [0.24, h * 0.36], [0.25, h * 0.58], [0.19, h * 0.80], [0.055, h * 0.96], [0.025, h],
    ], 0.92, 18, 0, 2);
    g.translate(0, Y.knee - Y.waist - 0.06, -0.02);
    add([d.j.chest, mesh(g, M(it))]);
    // Brown banana stem & tip!
    add([d.j.chest, mesh(cyl(0.026, 0.036, 0.07, 10).translate(0, Y.head - Y.waist + 0.38, -0.02), toon('#5a3825'))]);
    add([d.j.chest, mesh(sph(0.034, 0.034, 0.034, 8, 6).translate(0, Y.knee - Y.waist - 0.06, -0.02), toon('#5a3825'))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.34);
  },

  dino_inflatable: (d, it, add) => {
    // Bộ đồ khủng long T-Rex bơm hơi mập ú + đuôi bự + bụng vàng!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.05, Y.neck, 0.065, 0.055)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.055 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.65, 0.032, 0.012).forEach(add);
      legShell(d, it, s, 0.95, 0.042, 0.018).forEach(add);
    }
    // Giant inflated dino belly + massive tail behind hips + dorsal spikes!
    add([d.j.chest, mesh(sph(T.chest + 0.055, 0.24, 0.11, 14, 10).translate(0, -0.02, frontTorsoZ(d, Y.waist, 0.055)), A(it))]);
    add([d.j.hips, mesh(cone(0.14, 0.62, 14).rotateX(-1.32).translate(0, -0.04, -(T.hip + 0.28)), M(it))]);
    for (let i = 0; i < 5; i++) {
      add([d.j.chest, mesh(cone(0.028, 0.068, 6).rotateX(-Math.PI / 2).translate(0, Y.chest + 0.08 - i * 0.08 - Y.waist, -(T.chest + 0.085)), A(it))]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.30);
  },

  frog_suit: (d, it, add) => {
    // Bộ đồ ếch xanh Xóm Lầy bụng kem + 2 mắt ếch lồi trên vai!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.042, 0.024)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.032 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.95, 0.026, 0.008, { cuff: true }).forEach(add);
      legShell(d, it, s, 0.95, 0.026, 0.008, { jogger: true, cuff: true }).forEach(add);
    }
    add([d.j.chest, mesh(sph(T.chest * 0.85, 0.18, 0.055, 12, 8).translate(0, 0.0, frontTorsoZ(d, Y.waist + 0.04, 0.038)), A(it))]);
    // Cute frog hood bumps behind neck
    for (const s of [1, -1]) {
      add([d.j.head, mesh(sph(0.052, 0.052, 0.052, 12, 8).translate(s * 0.105, 0.195, 0.04), M(it))]);
      add([d.j.head, mesh(sph(0.030, 0.030, 0.022, 10, 8).translate(s * 0.105, 0.195, 0.082), toon('#ffffff'), false)]);
      add([d.j.head, mesh(sph(0.016, 0.016, 0.014, 8, 6).translate(s * 0.105, 0.195, 0.098), toon('#15121b'), false)]);
    }
  },

  shark_suit: (d, it, add) => {
    // Bộ đồ cá mập há miệng + vây lưng + đuôi cá mập!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.040, 0.020)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.030 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.88, 0.026, 0.012).forEach(add);
      legShell(d, it, s, 0.95, 0.026, 0.008).forEach(add);
    }
    add([d.j.chest, mesh(sph(T.chest * 0.82, 0.19, 0.045, 12, 8).translate(0, 0.0, frontTorsoZ(d, Y.waist + 0.04, 0.036)), A(it))]);
    // Big dorsal shark fin on back!
    const fin = new THREE.Shape();
    fin.moveTo(0, 0); fin.quadraticCurveTo(0.06, 0.18, 0.22, 0.24); fin.quadraticCurveTo(0.14, 0.08, 0.18, -0.06); fin.closePath();
    add([d.j.chest, mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.026, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.013, 0.04, -(T.chest * 0.78 + 0.045)), M(it))]);
  },

  duck_suit: (d, it, add) => {
    // Bộ đồ vịt vàng mũm mĩm có 2 cánh vịt + đuôi vểnh!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.03, Y.neck, 0.052, 0.042)]);
    add([d.j.hips, pelvisShell(d, it, { inf: 0.042 })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.70, 0.028, 0.018).forEach(add);
      legShell(d, { c: it.c2 || '#ff9f5a', p: 'plain' }, s, 0.94, 0.016, 0).forEach(add);
    }
    add([d.j.hips, mesh(cone(0.085, 0.16, 10).rotateX(-1.15).translate(0, 0.02, -(T.hip + 0.12)), M(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.26);
  },

  banh_mi_suit: (d, it, add) => {
    // Bộ đồ Ổ BÁNH MÌ VIỆT NAM kẹp rau ngò & dưa leo nguyên người!
    const Y = d.Y;
    const h = (Y.shoulder - Y.knee) + 0.22;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist + 0.04;
    add([d.j.chest, mesh(sph(0.24, h * 0.56, 0.18, 18, 12).translate(0, cy, 0), M(it))]);
    // Green lettuce/cilantro & red chili peeking out the side seam!
    add([d.j.chest, mesh(box(0.045, h * 0.72, 0.20).translate(0, cy, 0.08), toon('#4cd964'))]);
    add([d.j.chest, mesh(box(0.022, h * 0.65, 0.21).translate(0.015, cy, 0.085), toon('#c92a46'), false)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },

  boba_suit: (d, it, add) => {
    // Bộ đồ Ly Trà Sữa Trân Châu khổng lồ có nắp vòm & ống hút khổng lồ trên vai!
    const Y = d.Y;
    const h = (Y.shoulder - Y.knee) + 0.16;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(cyl(0.27, 0.20, h, 22).translate(0, cy, 0), M(it))]);
    add([d.j.chest, mesh(cyl(0.285, 0.285, 0.026, 22).translate(0, cy + h * 0.5, 0), toon('#ffffff'))]);
    // Giant straw sticking out up beside head!
    add([d.j.chest, mesh(cyl(0.026, 0.026, 0.42, 10).rotateZ(-0.22).translate(0.14, cy + h * 0.5 + 0.16, 0.02), A(it))]);
    // Giant boba pearls at bottom!
    const bm = toon('#1b1518');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      add([d.j.chest, mesh(sph(0.036, 0.036, 0.036, 8, 6).translate(Math.cos(a) * 0.19, cy - h * 0.36, Math.sin(a) * 0.19), bm, false)]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.38);
  },

  noodle_pack_suit: (d, it, add) => {
    // Bộ đồ Gói Mì Tôm Hảo Hảo vuông phồng!
    const Y = d.Y;
    const h = (Y.shoulder - Y.knee) + 0.14;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(box(0.46, h, 0.24).translate(0, cy, 0), M(it))]);
    // Crimped top & bottom foil edges
    add([d.j.chest, mesh(box(0.49, 0.035, 0.05).translate(0, cy + h * 0.5, 0), A(it))]);
    add([d.j.chest, mesh(box(0.49, 0.035, 0.05).translate(0, cy - h * 0.5, 0), A(it))]);
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('MÌ TÔM CHUA CAY', it.c2 || '#ffd56b', '#c92a46') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24).translate(0, cy + 0.02, 0.124), decal)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },

  tp_roll_suit: (d, it, add) => {
    // Bộ đồ Cuộn Giấy Vệ Sinh khổng lồ trắng muốt!
    const Y = d.Y;
    const h = (Y.shoulder - Y.knee) + 0.12;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(cyl(0.25, 0.25, h, 24).translate(0, cy, 0), M(it))]);
    // Inner brown cardboard tube visible at top rim + dangling sheet flap!
    add([d.j.chest, mesh(cyl(0.11, 0.11, 0.03, 18).translate(0, cy + h * 0.505, 0), toon('#a6774f'), false)]);
    add([d.j.chest, mesh(box(0.18, h * 0.78, 0.012).rotateY(0.4).translate(0.22, cy - 0.05, 0.12), M(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },

  cardboard_box_suit: (d, it, add) => {
    // Bộ đồ Thùng Carton Giao Hàng Siêu Tốc full thân!
    const Y = d.Y;
    const h = (Y.shoulder - Y.knee) + 0.16;
    const cy = (Y.shoulder + Y.knee) * 0.5 - Y.waist;
    add([d.j.chest, mesh(box(0.46, h, 0.40).translate(0, cy, 0), M(it))]);
    add([d.j.chest, mesh(box(0.48, 0.04, 0.42).translate(0, cy + h * 0.42, 0), A(it), false)]);
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('GIAO HÀNG HỎA TỐC', '#ffffff', '#ff5722') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22).translate(0, cy + 0.04, 0.204), decal)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.38);
  },

  ghost_sheet: (d, it, add) => {
    // Ma trùm mền trắng đục 2 lỗ mắt đen thui bay lơ lửng!
    const Y = d.Y;
    const g = lathe([
      [0.34, Y.ankle - Y.waist],
      [0.30, Y.knee - Y.waist],
      [0.26, 0.0],
      [0.24, Y.shoulder - Y.waist],
      [0.22, Y.head - Y.waist + 0.02],
      [0.16, Y.head - Y.waist + 0.18],
      [0.01, Y.head - Y.waist + 0.24],
    ], 0.90, 24, 0, 2);
    add([d.j.chest, mesh(g, M(it, { doubleSide: true }))]);
    // 2 spooky black eye holes + O mouth!
    const bk = toon('#15121b');
    const ey = Y.head - Y.waist + 0.02;
    for (const s of [1, -1]) add([d.j.chest, mesh(sph(0.032, 0.044, 0.012, 10, 8).translate(s * 0.068, ey, 0.20), bk, false)]);
    add([d.j.chest, mesh(sph(0.026, 0.036, 0.012, 10, 8).translate(0, ey - 0.075, 0.205), bk, false)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.28);
  },

  mummy_suit: (d, it, add) => {
    // Xác ướp quấn băng trắng kín mít + dải băng lơ lửng!
    const mIt = { ...it, p: 'stripe' };
    add([d.j.chest, torsoShell(d, mIt, d.Y.hip, d.Y.neck, 0.022, 0.010)]);
    add([d.j.hips, pelvisShell(d, mIt, { inf: 0.016 })]);
    for (const s of [1, -1]) {
      sleeve(d, mIt, s, 0.95, 0.018).forEach(add);
      legShell(d, mIt, s, 0.95, 0.018, 0).forEach(add);
    }
    // Loose hanging bandage strips
    add([d.j.arm[1].el, mesh(box(0.026, 0.22, 0.008).translate(0.03, -0.18, 0.03), M(it))]);
    add([d.j.hips, mesh(box(0.030, 0.26, 0.008).translate(-0.14, -0.16, 0.08), M(it))]);
  },

  xmas_tree_suit: (d, it, add) => {
    // Bộ đồ Cây Thông Noel 3 tầng + quả châu lấp lánh + ngôi sao trên đầu!
    const Y = d.Y;
    add([d.j.chest, mesh(cone(0.36, 0.42, 18).translate(0, Y.knee - Y.waist + 0.14, 0), M(it))]);
    add([d.j.chest, mesh(cone(0.30, 0.38, 18).translate(0, Y.hip - Y.waist + 0.14, 0), M(it))]);
    add([d.j.chest, mesh(cone(0.24, 0.34, 18).translate(0, Y.chest - Y.waist + 0.08, 0), M(it))]);
    const cols = ['#ff3b6b', '#ffd56b', '#00e5ff', '#e040fb'];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tier = i % 3;
      const r = 0.26 - tier * 0.05;
      const y = (Y.knee + 0.05 + tier * 0.26) - Y.waist;
      add([d.j.chest, mesh(sph(0.028, 0.028, 0.028, 8, 6).translate(Math.cos(a) * r, y, Math.sin(a) * r), toon(cols[i % cols.length]), false)]);
    }
    d.armSpread = Math.max(d.armSpread || 0, 0.36);
  },

  toilet_suit: (d, it, add) => {
    // Bộ đồ Bồn Cầu Di Động trắng sứ + bệ ngồi + két nước sau lưng!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#6ec6ff', p: 'plain' }, Y.hip, Y.neck, 0.014, 0.008)]);
    // White toilet bowl encircling hips & waist!
    add([d.j.hips, mesh(lathe([[0.15, -0.26], [0.22, -0.14], [0.27, 0.04], [0.25, 0.09]], 1.12, 22, 0, 2), M(it))]);
    add([d.j.hips, mesh(torus(0.26, 0.032, 10, 22).scale(1, 1.12, 1).rotateX(Math.PI / 2).translate(0, 0.09, 0.02), A(it))]);
    // Flush tank behind back + silver flush lever!
    add([d.j.chest, mesh(box(0.32, 0.34, 0.14).translate(0, 0.10, -(T.chest + 0.14)), M(it))]);
    add([d.j.chest, mesh(box(0.06, 0.014, 0.018).translate(0.18, 0.22, -(T.chest + 0.10)), toon('#d9dde6'))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.32);
  },

  sumo_suit: (d, it, add) => {
    // Bộ đồ Đô Vật Sumo bụng tròn khổng lồ + đai khố Mawashi!
    const Y = d.Y, T = d.T;
    const sk = toon(d.skin || '#f7cfb6');
    add([d.j.chest, mesh(sph(T.chest + 0.11, 0.28, T.chest + 0.10, 18, 12).translate(0, -0.02, 0.02), sk)]);
    add([d.j.hips, mesh(sph(T.hip + 0.11, 0.20, T.hip + 0.09, 18, 12).translate(0, -0.02, 0), sk)]);
    add([d.j.hips, band(T.hip + 0.118, 0.04, 0.085, it, 0.92, M(it))]);
    add([d.j.hips, mesh(box(0.12, 0.24, 0.03).translate(0, -0.08, T.hip + 0.095), M(it))]);
    add([d.j.hips, mesh(box(0.18, 0.12, 0.05).translate(0, 0.04, -(T.hip + 0.115)), A(it))]);
    d.armSpread = Math.max(d.armSpread || 0, 0.32);
  },

  ninja_lead_full: (d, it, add) => {
    // Combo Ninja Lead huyền thoại: áo chống nắng kín mít + váy chống nắng quây dài chấm gót + mũ trùm!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.024, 0.018)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.99, 0.022, 0, { cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.085, 0.024, M(it))]);
    add([d.j.hips, skirt(d, { ...it, c: it.c2 || it.c }, Y.waist, Y.ankle + 0.01, T.hip + 0.155, { poof: 0.012 })]);
    add([d.j.hips, waistBand(d, it, 0.032, 0.020, M(it))]);
  },
};
