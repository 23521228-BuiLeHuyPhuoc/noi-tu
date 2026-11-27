// @ts-nocheck
// wear-bottoms-extra.js — 18 additional bespoke 3D bottoms (world pants/skirts + hilarious Xóm Lầy bottoms).
import * as THREE from 'three';
import { mesh, sph, cyl, box, torus, toon } from './core.js';
import { M, A, pelvisShell, legShell, skirt, band, waistBand, topCovers } from './wear-helpers.js';

function maybeWaist(d, it, add, h = 0.024, extra = 0.011, mat = null) {
  if (!topCovers(d)) add([d.j.hips, waistBand(d, it, h, extra, mat)]);
}

export const BOTTOM_BUILD_EXTRA = {
  skinny_jeans: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { inf: 0.006 })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.96, 0.007, -0.004).forEach(add);
    maybeWaist(d, it, add, 0.022, 0.010);
  },

  ripped_jeans: (d, it, add) => {
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.96, 0.012, 0.004).forEach(add);
      // Exposed distressed knee slash patches + white frayed threads!
      add([d.j.leg[s].th, mesh(box(T.legR * 1.3, 0.044, 0.018).translate(0, -L.legUp * 0.92, T.legR * 0.76), toon(d.skin || '#f7cfb6'), false)]);
      for (let i = -1; i <= 1; i++) {
        add([d.j.leg[s].th, mesh(box(T.legR * 1.4, 0.005, 0.020).translate(0, -L.legUp * 0.92 + i * 0.012, T.legR * 0.78), toon('#ffffff'), false)]);
      }
    }
    maybeWaist(d, it, add);
  },

  harem_pants: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { inf: 0.024 })]);
    for (const s of [1, -1]) {
      legShell(d, it, s, 0.95, 0.042, 0.030, { jogger: true, cuff: true }).forEach(add);
    }
    maybeWaist(d, it, add, 0.032, 0.024);
  },

  culottes: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it, { highWaist: !topCovers(d) })]);
    for (const s of [1, -1]) legShell(d, it, s, 0.68, 0.026, 0.048).forEach(add);
    maybeWaist(d, it, add, 0.028, 0.014);
  },

  hakama: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Wide pleated Japanese martial arts Hakama trouser-skirt + wide stiff obi waist!
    add([d.j.hips, skirt(d, it, Y.waist + 0.01, Y.ankle + 0.02, T.hip + 0.16, { pleats: 8 })]);
    add([d.j.hips, waistBand(d, it, 0.048, 0.020, A(it))]);
  },

  kilt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const kIt = { ...it, p: it.p === 'plain' ? 'tartan' : it.p };
    add([d.j.hips, skirt(d, kIt, Y.waist - 0.01, Y.knee + 0.02, T.hip + 0.125, { pleats: 14 })]);
    // Signature Scottish sporran pouch hanging at front!
    const fz = (T.hip + 0.04) * 0.75;
    add([d.j.hips, mesh(sph(0.046, 0.056, 0.024, 10, 8).translate(0, -0.02, fz + 0.014), toon('#5a3825'))]);
    maybeWaist(d, it, add, 0.028, 0.014, toon('#15121b'));
  },

  sarong: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.06, T.hip + 0.065, { gap: 0.42, slitRot: 0.65, poof: 0.004 })]);
    // Side hip knot
    add([d.j.hips, mesh(sph(0.036, 0.028, 0.032, 10, 8).translate(T.hip + 0.02, Y.waist - Y.hip - 0.02, 0.05), A(it))]);
  },

  bubble_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const botY = Y.hip - d.L.legUp * 0.65;
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, botY, T.hip + 0.09, { poof: 0.115, pleats: 10 })]);
    maybeWaist(d, it, add, 0.026, 0.014);
  },

  mermaid_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.01, Math.max(0.30, T.hip + 0.17), { mermaid: true, pleats: 8 })]);
    maybeWaist(d, it, add, 0.024, 0.012);
  },

  high_low_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.hip - d.L.legUp * 0.50, T.hip + 0.095)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.ankle + 0.04, T.hip + 0.175, { gap: Math.PI * 0.95, slitRot: Math.PI })]);
    maybeWaist(d, it, add);
  },

  wrap_skirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.hips, pelvisShell(d, it)]);
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee + 0.02, T.hip + 0.09, { gap: 0.32, slitRot: 0.52 })]);
    add([d.j.hips, mesh(sph(0.032, 0.024, 0.022, 8, 6).translate(T.waist + 0.02, Y.waist - Y.hip - 0.01, 0.06), A(it))]);
    maybeWaist(d, it, add);
  },

  skort: (d, it, add) => {
    add([d.j.hips, pelvisShell(d, it)]);
    for (const s of [1, -1]) legShell(d, it, s, 0.26, 0.013, 0.004).forEach(add);
    add([d.j.hips, skirt(d, it, d.Y.waist - 0.01, d.Y.hip - d.L.legUp * 0.48, d.T.hip + 0.068, { gap: Math.PI * 0.9, slitRot: 0 })]);
    maybeWaist(d, it, add);
  },

  // ===== SIÊU LẦY LỘI BOTTOMS (6) =====
  superhero_briefs: (d, it, add) => {
    // Quần dài bó + QUẦN SỊP SIÊU NHÂN mặc ĐÈ BÊN NGOÀI + thắt lưng vàng!!
    const tights = { c: it.c2 || '#2f6fd6', p: 'plain' };
    add([d.j.hips, pelvisShell(d, tights, { inf: 0.008 })]);
    for (const s of [1, -1]) legShell(d, tights, s, 0.96, 0.009, 0).forEach(add);
    // Bold bright outer superhero briefs!
    add([d.j.hips, pelvisShell(d, it, { inf: 0.020 })]);
    add([d.j.hips, waistBand(d, it, 0.030, 0.024, toon('#ffd56b'))]);
  },

  bath_towel_wrap: (d, it, add) => {
    // Khăn tắm bông quấn vội ngang hông!
    const Y = d.Y, T = d.T;
    add([d.j.hips, skirt(d, it, Y.waist - 0.005, Y.knee + 0.04, T.hip + 0.042, { poof: 0.004 })]);
    add([d.j.hips, band(T.waist + 0.028, Y.waist - Y.hip - 0.012, 0.046, it, 0.78, M(it))]);
    add([d.j.hips, band(T.hip + 0.044, Y.knee + 0.075 - Y.hip, 0.022, it, 0.76, A(it))]);
  },

  giant_diaper: (d, it, add) => {
    // Quần tã bỉm trắng phồng khổng lồ cài kim băng!
    const T = d.T;
    add([d.j.hips, mesh(sph(T.hip + 0.085, 0.145, T.hip * 0.85 + 0.065, 18, 12).translate(0, 0.01, 0), M(it))]);
    add([d.j.hips, waistBand(d, it, 0.030, 0.036, A(it))]);
    // Giant safety pin on right hip!
    add([d.j.hips, mesh(torus(0.024, 0.006, 6, 14).translate(T.hip + 0.072, 0.04, 0.06), toon('#ffd56b'))]);
  },

  trash_bag_skirt: (d, it, add) => {
    // Váy chế từ túi rác đen bóng buộc dây rút đỏ!
    const Y = d.Y, T = d.T;
    const bagM = toon(it.c || '#15121b', it.p || 'plain', it.c2 || '#c92a46', { doubleSide: true });
    add([d.j.hips, skirt(d, it, Y.waist - 0.01, Y.knee - 0.02, T.hip + 0.145, { pleats: 12, poof: 0.045, mat: bagM })]);
    add([d.j.hips, waistBand(d, it, 0.026, 0.022, A(it))]);
  },

  banana_leaf_skirt: (d, it, add) => {
    // Váy lá chuối bộ lạc xếp vòng quanh hông!
    const Y = d.Y, T = d.T;
    const leafM = M(it, { doubleSide: true });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = T.hip + 0.048;
      add([d.j.hips, mesh(sph(0.056, 0.18, 0.016, 10, 8).rotateY(-a + Math.PI / 2).rotateX(0.24).translate(Math.cos(a) * r, -0.08, Math.sin(a) * r * 0.82), leafM)]);
    }
    add([d.j.hips, waistBand(d, it, 0.026, 0.022, A(it))]);
  },

  lantern_pants: (d, it, add) => {
    // Quần bí phồng khổng lồ như hai cái đèn lồng!
    const T = d.T, L = d.L;
    add([d.j.hips, pelvisShell(d, it, { inf: 0.024 })]);
    for (const s of [1, -1]) {
      add([d.j.leg[s].th, mesh(sph(T.legR + 0.082, L.legUp * 0.65, T.legR + 0.075, 16, 12).translate(s * 0.012, -L.legUp * 0.50, 0), M(it))]);
      legShell(d, it, s, 0.94, 0.012, 0, { jogger: true, cuff: true }).forEach(add);
    }
    maybeWaist(d, it, add, 0.028, 0.022);
    d.armSpread = Math.max(d.armSpread || 0, 0.22);
  },
};
