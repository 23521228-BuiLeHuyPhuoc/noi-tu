// @ts-nocheck
// wear-tops-extra.js — 24 additional bespoke 3D tops (world garments, uniforms & hilarious Xóm Lầy tops).
import * as THREE from 'three';
import { mesh, sph, cyl, box, cone, torus, cap, toon, memePrintTex } from './core.js';
import { M, A, torsoShell, sleeve, band, neckBand, frontTorsoZ } from './wear-helpers.js';

export const TOP_BUILD_EXTRA = {
  ao_tu_than_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Inner yếm in c2 + 4-panel tunic sleeves & tied front sashes!
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#c92a46', p: 'plain' }, Y.hip + 0.02, Y.chest + 0.06, 0.012, 0.008, { noRecord: true, noNeckCap: true })]);
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.03, Y.neck, 0.018, 0.026, { gap: 0.72 })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.014).forEach(add);
    add([d.j.chest, band(T.waist + 0.024, 0.004, 0.028, it, 0.76)]);
    const fz = frontTorsoZ(d, Y.waist - 0.04, 0.026);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.034, 0.18, 0.010).rotateZ(s * 0.14).translate(s * 0.022, -0.07, fz + 0.008), A(it))]);
    }
  },

  hanbok_jeogori: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Short Korean Hanbok jacket with iconic curved sleeves + white dongjeong collar + goreum ribbon!
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.045, Y.neck, 0.016, 0.014, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.020, 0.014, { bell: 0.022, cuff: true }).forEach(add);
    const fz = frontTorsoZ(d, Y.chest + 0.03, 0.019);
    add([d.j.chest, mesh(box(0.022, 0.11, 0.009).rotateZ(0.55).translate(-0.01, Y.chest + 0.04 - Y.waist, fz + 0.004), toon('#ffffff'))]);
    add([d.j.chest, mesh(box(0.022, 0.11, 0.009).rotateZ(-0.55).translate(0.01, Y.chest + 0.04 - Y.waist, fz + 0.003), toon('#ffffff'))]);
    add([d.j.chest, mesh(box(0.022, 0.14, 0.009).rotateZ(-0.18).translate(0.032, 0.02, fz + 0.006), A(it))]);
  },

  kimono_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.02, Y.neck, 0.017, 0.022)]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.72, 0.020, 0.010, { bell: 0.055 }).forEach(add);
      add([d.j.arm[s].sh, mesh(box(0.022, d.L.armUp * 0.95, 0.13).translate(s * 0.02, -d.L.armUp * 0.65, -0.035), M(it))]);
    }
    const fz = frontTorsoZ(d, Y.chest + 0.03, 0.020);
    add([d.j.chest, mesh(box(0.026, 0.15, 0.010).rotateZ(0.45).translate(-0.01, Y.chest + 0.02 - Y.waist, fz + 0.004), A(it))]);
    add([d.j.chest, mesh(box(0.024, 0.13, 0.010).rotateZ(-0.45).translate(0.018, Y.chest + 0.03 - Y.waist, fz + 0.003), A(it))]);
    add([d.j.chest, band(T.waist + 0.024, 0.0, 0.048, it, 0.76)]);
  },

  kurta_top: (d, it, add) => {
    const Y = d.Y;
    // Long Indian Kurta tunic reaching mid-thigh + Mandarin collar + gold embroidered front placket
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.14, Y.neck, 0.018, 0.036)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.014, 0, { cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.030, 0.016, A(it))]);
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.021);
    add([d.j.chest, mesh(box(0.038, 0.14, 0.008).translate(0, Y.chest + 0.02 - Y.waist, fz + 0.004), A(it), false)]);
  },

  poncho: (d, it, add) => {
    const Y = d.Y, T = d.T;
    // Wide triangular Mexican Poncho draped over shoulders & elbows with fringe trim!
    const h = (Y.neck - Y.hip) + 0.04;
    add([d.j.chest, mesh(cone(T.sh + 0.19, h, 24).scale(1.08, 1, 0.80).translate(0, Y.neck - Y.waist - h * 0.52, 0), M(it, { doubleSide: true }))]);
    add([d.j.chest, mesh(torus(T.sh + 0.182, 0.014, 6, 24).scale(1.08, 1, 0.80).rotateX(Math.PI / 2).translate(0, Y.hip - Y.waist - 0.02, 0), A(it))]);
    add([d.j.chest, neckBand(d, it, 0.024, 0.018)]);
    d.topInf = Math.max(d.topInf || 0, 0.032);
    d.armSpread = Math.max(d.armSpread || 0, 0.16);
  },

  dashiki: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.06, Y.neck, 0.020, 0.024)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.44, 0.020, 0.012, { bell: 0.022 }).forEach(add);
    // Bold geometric V-embroidery yoke on chest
    const fz = frontTorsoZ(d, Y.chest + 0.03, 0.023);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.034, 0.14, 0.009).rotateZ(-s * 0.48).translate(s * 0.038, Y.chest + 0.03 - Y.waist, fz + 0.005), A(it), false)]);
    }
    add([d.j.chest, mesh(box(0.044, 0.044, 0.009).rotateZ(Math.PI / 4).translate(0, Y.chest - 0.03 - Y.waist, fz + 0.005), A(it), false)]);
  },

  peplum_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.006, Y.neck, 0.013, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.013, 0.014).forEach(add);
    add([d.j.chest, mesh(cyl(T.waist + 0.014, T.hip + 0.068, 0.12, 22, true).scale(1, 1, 0.76).translate(0, -0.055, 0), M(it, { doubleSide: true }))]);
    add([d.j.chest, band(T.waist + 0.018, 0.002, 0.020, it, 0.76)]);
  },

  bodysuit: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.009, 0, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.96, 0.009).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.024, 0.011)]);
  },

  raglan_tee: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.015, 0.012)]);
    const slIt = { c: it.c2 || '#c92a46', c2: it.c, p: 'plain' };
    for (const s of [1, -1]) sleeve(d, slIt, s, 0.65, 0.013).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.018, 0.016, A(it))]);
  },

  knit_vest: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.hip + 0.03, Y.neck, 0.012, 0.004, { tight: true, noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, { c: '#ffffff', p: 'plain' }, s, 0.94, 0.011).forEach(add);
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.015, Y.neck - 0.01, 0.022, 0.010, { noNeckCap: true })]);
    const fz = frontTorsoZ(d, Y.chest + 0.05, 0.025);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.020, 0.10, 0.008).rotateZ(-s * 0.42).translate(s * 0.030, Y.chest + 0.05 - Y.waist, fz + 0.004), A(it), false)]);
  },

  flannel_shirt: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const flIt = { ...it, p: it.p === 'plain' ? 'tartan' : it.p };
    add([d.j.chest, torsoShell(d, flIt, Y.hip + 0.01, Y.neck, 0.016, 0.016)]);
    for (const s of [1, -1]) sleeve(d, flIt, s, 0.72, 0.014, 0, { cuff: true }).forEach(add);
    const fz = frontTorsoZ(d, Y.chest + 0.01, 0.019, T.chest * 0.42);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.036, 0.038, 0.009).rotateY(s * 0.3).translate(s * T.chest * 0.42, Y.chest + 0.01 - Y.waist, fz + 0.004), A(it))]);
    }
  },

  chef_jacket: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.018, 0.014)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.85, 0.015, 0, { cuff: true }).forEach(add);
    add([d.j.chest, neckBand(d, it, 0.026, 0.018, A(it))]);
    const bm = toon('#15121b');
    for (const s of [1, -1]) for (const by of [Y.waist + 0.01, Y.chest - 0.02, Y.chest + 0.04]) {
      add([d.j.chest, mesh(sph(0.008, 0.008, 0.006, 8, 6).translate(s * 0.030, by - Y.waist, frontTorsoZ(d, by, 0.021, 0.030) + 0.004), bm, false)]);
    }
  },

  scrubs_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.neck, 0.017, 0.016)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.34, 0.014).forEach(add);
    const fz = frontTorsoZ(d, Y.chest + 0.05, 0.020);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.016, 0.08, 0.007).rotateZ(-s * 0.45).translate(s * 0.024, Y.chest + 0.05 - Y.waist, fz + 0.003), A(it), false)]);
    const px = T.chest * 0.44;
    add([d.j.chest, mesh(box(0.042, 0.044, 0.009).translate(px, Y.chest - Y.waist, frontTorsoZ(d, Y.chest, 0.020, px) + 0.004), A(it))]);
  },

  high_vis_vest: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: '#2b2533', p: 'plain' }, Y.hip + 0.02, Y.neck, 0.013, 0.008, { noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, { c: '#2b2533', p: 'plain' }, s, 0.30, 0.012).forEach(add);
    const neon = toon(it.c || '#76ff03', 'plain', '#fff', { emissive: it.c || '#76ff03', emissiveIntensity: 0.35 });
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.01, Y.shoulder + 0.01, 0.022, 0.012, { mat: neon, noNeckCap: true })]);
    const ref = toon('#e8eef5', 'plain', '#fff', { emissive: '#ffffff', emissiveIntensity: 0.45 });
    add([d.j.chest, band(T.waist + 0.028, 0.01, 0.024, it, 0.76, ref)]);
    add([d.j.chest, band(T.chest + 0.026, Y.chest - Y.waist, 0.024, it, 0.78, ref)]);
  },

  karate_gi_top: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.04, Y.neck, 0.019, 0.022)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.72, 0.018, 0, { bell: 0.016 }).forEach(add);
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.022);
    add([d.j.chest, mesh(box(0.026, 0.16, 0.010).rotateZ(0.42).translate(-0.01, Y.chest + 0.02 - Y.waist, fz + 0.005), M(it))]);
    // Martial arts black/accent belt + hanging ends!
    add([d.j.chest, band(T.waist + 0.026, 0.0, 0.032, it, 0.76, A(it))]);
    const bfz = frontTorsoZ(d, Y.waist - 0.04, 0.028);
    for (const s of [1, -1]) add([d.j.chest, mesh(box(0.024, 0.14, 0.010).rotateZ(s * 0.22).translate(s * 0.024, -0.065, bfz + 0.008), A(it))]);
  },

  knight_plate: (d, it, add) => {
    const Y = d.Y, T = d.T;
    const met = toon(it.c || '#c9cfd8');
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.03, Y.neck, 0.024, 0.008, { mat: met })]);
    for (const s of [1, -1]) {
      sleeve(d, it, s, 0.88, 0.016, 0, { mat: met }).forEach(add);
      add([d.j.arm[s].sh, mesh(sph(T.armR + 0.034, 0.036, T.armR + 0.030, 12, 8).translate(s * 0.016, 0.036, 0), A(it))]);
    }
    const fz = frontTorsoZ(d, Y.chest, 0.028);
    add([d.j.chest, mesh(box(0.018, 0.15, 0.012).translate(0, Y.chest - Y.waist, fz + 0.006), A(it))]);
    add([d.j.chest, mesh(box(0.11, 0.018, 0.012).translate(0, Y.chest + 0.02 - Y.waist, fz + 0.006), A(it))]);
  },

  tuxedo_shirt: (d, it, add) => {
    const Y = d.Y;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.014, 0.010)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.94, 0.012, 0, { cuff: true }).forEach(add);
    const fz = frontTorsoZ(d, Y.chest + 0.02, 0.017);
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.008, 0.15, 0.008).translate(s * 0.024, Y.chest + 0.01 - Y.waist, fz + 0.003), A(it), false)]);
    }
    // Crisp bowtie built-in
    const ny = Y.neck - 0.024;
    const nfz = frontTorsoZ(d, ny, 0.018);
    for (const s of [1, -1]) add([d.j.chest, mesh(cone(0.018, 0.038, 4).rotateZ(s * Math.PI / 2).translate(s * 0.020, ny - Y.waist, nfz + 0.008), A(it))]);
  },

  crop_hoodie: (d, it, add) => {
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.waist + 0.038, Y.neck, 0.024, 0.004, { tight: true })]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.95, 0.022, 0, { cuff: true }).forEach(add);
    add([d.j.chest, mesh(torus(T.neckR + 0.044, 0.034, 10, 20).scale(1, 0.62, 1.08).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.028, -0.028), M(it))]);
    add([d.j.chest, band(T.waist + 0.024, 0.042, 0.018, it, 0.76)]);
  },

  // ===== SIÊU LẦY LỘI TOPS (6) =====
  cardboard_top: (d, it, add) => {
    // Áo thùng carton vuông vức cắt lỗ chui đầu & dán băng keo vàng!
    const Y = d.Y, T = d.T;
    const h = (Y.shoulder - Y.hip) + 0.04;
    const w = T.sh * 2.15;
    const dep = T.chest * 1.95;
    const cy = (Y.shoulder + Y.hip) * 0.5 - Y.waist;
    add([d.j.chest, mesh(box(w, h, dep).translate(0, cy, 0), M(it))]);
    // Packing tape stripes + Fragile sticker!
    add([d.j.chest, mesh(box(w + 0.008, 0.032, dep + 0.008).translate(0, cy + h * 0.36, 0), A(it), false)]);
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('HÀNG DỄ VỠ', '#fff4cc', '#c92a46') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(w * 0.72, 0.095).translate(0, cy, dep * 0.5 + 0.004), decal)]);
    d.topInf = Math.max(d.topInf || 0, 0.035);
    d.armSpread = Math.max(d.armSpread || 0, 0.14);
  },

  rice_sack_top: (d, it, add) => {
    // Áo bao tải gạo 50kg thắt dây thừng ngang bụng!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip - 0.05, Y.neck, 0.032, 0.022)]);
    add([d.j.chest, band(T.waist + 0.038, 0.0, 0.022, it, 0.78, toon('#a6774f'))]);
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('GẠO ST25 50KG', '#ffffff', '#1a6b4f') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(T.chest * 1.4, 0.09).translate(0, Y.chest - Y.waist, frontTorsoZ(d, Y.chest, 0.036) + 0.006), decal)]);
  },

  fake_abs_shirt: (d, it, add) => {
    // Áo màu da vẽ 6 múi bụng nổi 3D giả trân cực lầy!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, it, Y.hip + 0.02, Y.neck, 0.014, 0.008)]);
    for (const s of [1, -1]) sleeve(d, it, s, 0.28, 0.012).forEach(add);
    const absM = toon(it.c2 || '#b3744f');
    for (const s of [1, -1]) {
      // 2 fake giant pecs + 6-pack abs bumps!
      add([d.j.chest, mesh(sph(0.044, 0.032, 0.020, 10, 8).translate(s * 0.048, Y.chest + 0.01 - Y.waist, frontTorsoZ(d, Y.chest + 0.01, 0.016, 0.048) + 0.004), absM)]);
      for (let i = 0; i < 3; i++) {
        const ay = Y.waist + 0.065 - i * 0.044;
        add([d.j.chest, mesh(sph(0.026, 0.018, 0.014, 8, 6).translate(s * 0.028, ay - Y.waist, frontTorsoZ(d, ay, 0.016, 0.028) + 0.004), absM)]);
      }
    }
  },

  life_jacket: (d, it, add) => {
    // Áo phao cứu sinh dày cộp cam chói + 2 đai khóa đen!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: '#ffffff', p: 'plain' }, Y.hip + 0.02, Y.neck, 0.012, 0.006, { noRecord: true })]);
    add([d.j.chest, torsoShell(d, it, Y.waist - 0.02, Y.shoulder + 0.015, 0.044, 0.008, { noNeckCap: true })]);
    add([d.j.chest, mesh(torus(T.neckR + 0.056, 0.036, 10, 18).scale(1, 0.72, 1.1).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.012, -0.028), M(it))]);
    const strap = toon('#15121b');
    for (const sy of [Y.waist + 0.01, Y.chest - 0.02]) {
      add([d.j.chest, band(torsoRadiusAtApprox(d, sy) + 0.048, sy - Y.waist, 0.022, it, 0.78, strap)]);
    }
  },

  banana_leaf_top: (d, it, add) => {
    // Áo lá chuối xanh nguyên thủy ghép từng tàu lá!
    const Y = d.Y, T = d.T;
    const leafM = M(it, { doubleSide: true });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = T.chest + 0.024;
      add([d.j.chest, mesh(sph(0.068, 0.14, 0.016, 10, 8).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * r, Y.chest - 0.02 - Y.waist, Math.sin(a) * r * 0.78), leafM)]);
    }
    add([d.j.chest, neckBand(d, it, 0.016, 0.016, A(it))]);
  },

  pot_armor_top: (d, it, add) => {
    // Áo giáp úp 2 nắp vung nồi inox trước & sau ngực + dây buộc!
    const Y = d.Y, T = d.T;
    add([d.j.chest, torsoShell(d, { c: it.c2 || '#2b2533', p: 'plain' }, Y.hip + 0.02, Y.neck, 0.013, 0.008, { noRecord: true })]);
    for (const s of [1, -1]) sleeve(d, { c: it.c2 || '#2b2533', p: 'plain' }, s, 0.30, 0.012).forEach(add);
    const lidM = toon(it.c || '#d9dde6');
    const knobM = toon('#15121b');
    const fz = frontTorsoZ(d, Y.chest, 0.018);
    add([d.j.chest, mesh(cyl(0.115, 0.125, 0.024, 22).rotateX(Math.PI / 2).translate(0, Y.chest - Y.waist, fz + 0.014), lidM)]);
    add([d.j.chest, mesh(sph(0.022, 0.022, 0.020, 10, 8).translate(0, Y.chest - Y.waist, fz + 0.036), knobM)]);
    add([d.j.chest, mesh(cyl(0.115, 0.125, 0.024, 22).rotateX(Math.PI / 2).translate(0, Y.chest - Y.waist, -(T.chest * 0.78 + 0.028)), lidM)]);
  },
};

function torsoRadiusAtApprox(d, y) {
  return y > d.Y.waist + 0.05 ? d.T.chest : d.T.waist;
}
