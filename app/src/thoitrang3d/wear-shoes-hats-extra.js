// @ts-nocheck
// wear-shoes-hats-extra.js — +18 bespoke 3D shoes, +42 bespoke 3D hats (world + Xóm Lầy!), +16 glasses/masks!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat } from './core.js';
import { headFrontZ } from './body.js';
import { M, A, band } from './wear-helpers.js';

function footScale(d) {
  return d.T.footS || (d.T.gender === 'm' ? 1.15 : (d.type === 'chibi' ? 0.92 : 1.0));
}

function baseShoe(d, it, add, { sole = 0.014, heel = 0, toeCap = false, strap = false, open = false, platform = 0 } = {}) {
  const fs = footScale(d);
  for (const s of [1, -1]) {
    const ft = d.j.leg[s].ft;
    if (!open) add([ft, mesh(sph(0.047 * fs, 0.038 * fs, 0.086 * fs, 14, 10).translate(0, -0.010, 0.030 * fs), M(it))]);
    const soleH = sole + platform + 0.004;
    add([ft, mesh(sph(0.050 * fs, soleH, 0.090 * fs, 14, 10).translate(0, -0.044 - platform * 0.6, 0.030 * fs), A(it))]);
    if (toeCap) add([ft, mesh(sph(0.038 * fs, 0.025 * fs, 0.034 * fs, 10, 8).translate(0, -0.022, 0.088 * fs), A(it), false)]);
    if (strap) add([ft, mesh(torus(0.044 * fs, 0.007, 6, 14, Math.PI).translate(0, -0.006, 0.020 * fs), A(it), false)]);
    if (heel > 0) add([ft, mesh(cyl(0.007, 0.011, heel + 0.036, 10).translate(0, -0.056, -0.044 * fs), A(it))]);
  }
}

function bootShaft(d, it, add, topFrac, trim = false) {
  const T = d.T, L = d.L;
  const widePants = (d.legCalfInf || 0) > 0.026;
  const inf = widePants ? 0.010 : Math.max(0.016, (d.legCalfInf || 0) + 0.008);
  const ankleR = Math.max(0.030, T.calfR * 0.74) + inf;
  const topR = (T.calfR * (0.88 + topFrac * 0.20)) + inf + 0.004;
  const topY = -L.legLo * (1 - topFrac);
  for (const s of [1, -1]) {
    const kn = d.j.leg[s].kn;
    add([kn, mesh(lathe([[ankleR, -L.legLo], [(ankleR + topR) * 0.5, (-L.legLo + topY) * 0.5], [topR, topY]], 1, 16, 0, 2), M(it))]);
    if (trim) add([kn, mesh(torus(topR + 0.002, 0.010, 8, 16).rotateX(Math.PI / 2).translate(0, topY - 0.005, 0), A(it))]);
  }
}

export const SHOE_BUILD_EXTRA = {
  // 1. DÉP TỔ ONG HUYỀN THOẠI (có lỗ tròn chi chít trên quai!)
  dep_to_ong: (d, it, add) => {
    const fs = footScale(d);
    const holeM = toon('#2b2533');
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.088 * fs, 0.022, 0.175 * fs).translate(0, -0.042, 0.032 * fs), M(it))]);
      add([ft, mesh(cyl(0.048 * fs, 0.048 * fs, 0.085 * fs, 14, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, -0.028, 0.050 * fs), M(it, { doubleSide: true }))]);
      // Iconic honeycomb holes on strap!
      for (let i = -2; i <= 2; i++) {
        add([ft, mesh(sph(0.0065 * fs, 0.0065 * fs, 0.0065 * fs, 6, 6).translate(i * 0.015 * fs, 0.016, 0.048 * fs), holeM, false)]);
        add([ft, mesh(sph(0.0065 * fs, 0.0065 * fs, 0.0065 * fs, 6, 6).translate(i * 0.014 * fs, 0.008, 0.072 * fs), holeM, false)]);
      }
    }
  },

  // 2. DÉP CON CÁ RÔ PHI SIÊU LẦY!
  fish_slippers: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.056 * fs, 0.038 * fs, 0.105 * fs, 14, 10).translate(0, -0.024, 0.032 * fs), M(it))]);
      // Fish tail fin sticking out back + bulging fish eyes at toe!
      add([ft, mesh(cone(0.048 * fs, 0.065 * fs, 4).rotateX(Math.PI / 2).translate(0, -0.024, -0.078 * fs), A(it))]);
      for (const es of [1, -1]) {
        add([ft, mesh(sph(0.013 * fs, 0.013 * fs, 0.013 * fs, 8, 6).translate(es * 0.038 * fs, -0.005, 0.088 * fs), toon('#ffffff'), false)]);
        add([ft, mesh(sph(0.007 * fs, 0.007 * fs, 0.007 * fs, 6, 6).translate(es * 0.042 * fs, -0.005, 0.096 * fs), toon('#15121b'), false)]);
      }
    }
  },

  // 3. GIÀY CHÚ HỀ SIÊU DÀI MŨI BỰ!
  clown_shoes: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.068 * fs, 0.052 * fs, 0.165 * fs, 14, 10).translate(0, -0.018, 0.088 * fs), M(it))]);
      add([ft, mesh(sph(0.072 * fs, 0.022, 0.170 * fs, 14, 10).translate(0, -0.048, 0.088 * fs), A(it))]);
      add([ft, mesh(sph(0.030 * fs, 0.030 * fs, 0.030 * fs, 8, 6).translate(0, 0.024, 0.16 * fs), A(it))]);
    }
  },

  // 4. DÉP SỤC CROCS GẮN CHARM JIBBITZ!
  crocs: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.020, platform: 0.006 });
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(torus(0.048 * fs, 0.008, 6, 14, Math.PI).rotateX(-0.55).translate(0, -0.012, -0.022 * fs), A(it))]);
      add([ft, mesh(sph(0.012 * fs, 0.012 * fs, 0.012 * fs, 6, 6).translate(0.014 * fs, 0.025, 0.068 * fs), toon('#ffea00'), false)]);
      add([ft, mesh(sph(0.012 * fs, 0.012 * fs, 0.012 * fs, 6, 6).translate(-0.014 * fs, 0.024, 0.048 * fs), toon('#ff6b8b'), false)]);
    }
  },

  // 5. ỦNG CAO SU ĐI MƯA / ĐI CẤY!
  rain_boots: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.020 });
    bootShaft(d, it, add, 0.68, true);
  },

  // 6. BỐT CAO BỒI!
  cowboy_boots: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.014, heel: 0.024, toeCap: true });
    bootShaft(d, it, add, 0.56, true);
  },

  // 7. BỐT LÔNG CỪU UGG MÙA ĐÔNG!
  ugg_boots: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.018, platform: 0.008 });
    bootShaft(d, it, add, 0.44, true);
    const L = d.L;
    for (const s of [1, -1]) {
      add([d.j.leg[s].kn, mesh(torus(d.T.calfR + 0.024, 0.018, 8, 16).rotateX(Math.PI / 2).translate(0, -L.legLo * 0.56, 0), A(it))]);
    }
  },

  // 8. GIÀY TRƯỢT PATIN 4 BÁNH!
  roller_skates: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.016 });
    bootShaft(d, it, add, 0.26, true);
    const fs = footScale(d);
    const wm = toon(it.c2 || '#ff6b8b');
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      for (const wz of [-0.025, 0.082]) for (const wx of [-0.046, 0.046]) {
        add([ft, mesh(cyl(0.022 * fs, 0.022 * fs, 0.018 * fs, 12).rotateZ(Math.PI / 2).translate(wx * fs, -0.068, wz * fs), wm)]);
      }
    }
  },

  // 9. GIÀY TRƯỢT BĂNG LƯỠI SẮT!
  ice_skates: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.012 });
    bootShaft(d, it, add, 0.30, true);
    const fs = footScale(d);
    const blade = toon('#e4e8f0');
    for (const s of [1, -1]) {
      add([d.j.leg[s].ft, mesh(box(0.008, 0.028, 0.19 * fs).translate(0, -0.068, 0.032 * fs), blade)]);
    }
  },

  // 10. GUỐC GỖ GETA 2 RĂNG NHẬT BẢN!
  geta_sandals: (d, it, add) => {
    const fs = footScale(d);
    const wood = toon('#c9955a');
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(box(0.084 * fs, 0.018, 0.175 * fs).translate(0, -0.038, 0.032 * fs), wood)]);
      add([ft, mesh(box(0.082 * fs, 0.038, 0.022).translate(0, -0.065, -0.018 * fs), wood)]);
      add([ft, mesh(box(0.082 * fs, 0.038, 0.022).translate(0, -0.065, 0.072 * fs), wood)]);
      for (const side of [1, -1]) add([ft, mesh(box(0.014, 0.012, 0.078 * fs).rotateY(side * 0.42).translate(side * 0.018 * fs, -0.014, 0.052 * fs), M(it), false)]);
    }
  },

  // 11. HÀI THÊU MŨI CONG CỔ TRANG (Hài Tấm Cám)!
  hai_co_trang: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.012 });
    const fs = footScale(d);
    for (const s of [1, -1]) {
      add([d.j.leg[s].ft, mesh(cone(0.024 * fs, 0.062 * fs, 8).rotateX(0.65).translate(0, 0.004, 0.118 * fs), A(it))]);
    }
  },

  // 12. SANDAL CHIẾN BINH BUỘC DÂY CAO!
  gladiator_sandals: (d, it, add) => {
    baseShoe(d, it, add, { sole: 0.012, open: true });
    const L = d.L, r = d.T.calfR * 0.92 + 0.012;
    for (const s of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        add([d.j.leg[s].kn, mesh(torus(r, 0.007, 6, 14).rotateX(Math.PI / 2).translate(0, -L.legLo * (0.35 + i * 0.18), 0), M(it), false)]);
      }
    }
  },

  // 13. GIÀY ĐẾ XUỒNG WEDGE!
  wedges: (d, it, add) => baseShoe(d, it, add, { sole: 0.022, platform: 0.022, strap: true }),

  // 14. ĐI TẤT CỌC CẠCH (một bên màu chính, một bên màu phụ!)
  socks_only: (d, it, add) => {
    const fs = footScale(d);
    const L = d.L, r = d.T.calfR * 0.88 + 0.008;
    for (const s of [1, -1]) {
      const sm = s === 1 ? M(it) : A(it);
      add([d.j.leg[s].ft, mesh(sph(0.044 * fs, 0.034 * fs, 0.080 * fs, 12, 8).translate(0, -0.014, 0.028 * fs), sm)]);
      add([d.j.leg[s].kn, mesh(cyl(r, r * 0.9, L.legLo * 0.45, 14).translate(0, -L.legLo * 0.78, 0), sm)]);
    }
  },

  // 15. CHÂN ĐẤT NGUYÊN BẢN!
  barefoot: (d, it, add) => {
    // Anklet ring only so barefoot is unmistakable!
    const L = d.L, r = d.T.calfR * 0.76 + 0.008;
    add([d.j.leg[1].kn, mesh(torus(r, 0.005, 6, 14).rotateX(Math.PI / 2).translate(0, -L.legLo * 0.94, 0), A(it), false)]);
  },

  // 16. CỌC CẠCH (Chân trái Sneaker, Chân phải Dép Tổ Ong!!)
  mismatched_shoes: (d, it, add) => {
    const fs = footScale(d);
    // Right foot: sneaker
    add([d.j.leg[1].ft, mesh(sph(0.048 * fs, 0.038 * fs, 0.088 * fs, 12, 8).translate(0, -0.010, 0.030 * fs), M(it))]);
    add([d.j.leg[1].ft, mesh(sph(0.050 * fs, 0.020, 0.092 * fs, 12, 8).translate(0, -0.044, 0.030 * fs), toon('#ffffff'))]);
    // Left foot: dép tổ ong vàng!
    add([d.j.leg[-1].ft, mesh(box(0.088 * fs, 0.022, 0.175 * fs).translate(0, -0.042, 0.032 * fs), A(it))]);
    add([d.j.leg[-1].ft, mesh(cyl(0.048 * fs, 0.048 * fs, 0.082 * fs, 12, true, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(0, -0.028, 0.050 * fs), A(it, { doubleSide: true }))]);
  },

  // 17. BỌC TÚI NILON ĐI MƯA CHỐNG ƯỚT GIÀY!
  plastic_bag_shoes: (d, it, add) => {
    baseShoe(d, { c: '#2b2533', c2: '#ffffff', p: 'plain' }, add, { sole: 0.014 });
    const fs = footScale(d);
    const bagM = toon(it.c || '#ff6b8b', 'plain', '#fff', { opacity: 0.55, doubleSide: true });
    for (const s of [1, -1]) {
      add([d.j.leg[s].ft, mesh(sph(0.068 * fs, 0.056 * fs, 0.112 * fs, 12, 8).translate(0, -0.012, 0.030 * fs), bagM)]);
      add([d.j.leg[s].kn, mesh(cyl(d.T.calfR + 0.030, d.T.calfR + 0.042, d.L.legLo * 0.45, 14).translate(0, -d.L.legLo * 0.78, 0), bagM)]);
    }
  },

  // 18. DÉP BÔNG HÌNH VỊT VÀNG!
  duck_slippers: (d, it, add) => {
    const fs = footScale(d);
    for (const s of [1, -1]) {
      const ft = d.j.leg[s].ft;
      add([ft, mesh(sph(0.062 * fs, 0.048 * fs, 0.105 * fs, 14, 10).translate(0, -0.018, 0.036 * fs), M(it))]);
      add([ft, mesh(box(0.052 * fs, 0.018, 0.048 * fs).translate(0, -0.022, 0.128 * fs), A(it))]);
      for (const es of [1, -1]) add([ft, mesh(sph(0.008 * fs, 0.008 * fs, 0.008 * fs, 6, 6).translate(es * 0.024 * fs, 0.012, 0.105 * fs), toon('#15121b'), false)]);
    }
  },
};

// ===== +42 BESPOKE 3D HATS & HEADWEAR =====
export const CLOSED_HATS_EXTRA = new Set([
  'cowboy_hat', 'sombrero', 'ushanka', 'grad_cap', 'hard_hat', 'moto_helmet', 'mu_coi',
  'non_quai_thao', 'mu_trang_nguyen', 'mu_phuong', 'viking_helmet', 'knight_helmet',
  'samurai_kabuto', 'turban', 'santa_hat', 'jester_hat', 'party_hat', 'sailor_cap',
  'captain_hat', 'police_cap', 'fez_hat', 'rice_cooker_hat', 'traffic_cone_hat',
  'bucket_head', 'box_head', 'sheep_towel', 'propeller_cap', 'mushroom_hat',
  'duck_head_hat', 'frog_hat', 'shark_hat',
]);

function scH(g, d) {
  const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
  if (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005 || Math.abs(sz - 1) > 0.005) g.scale(sx, sy, sz);
  return g;
}

function hatAdd(d, add, liftY = 0) {
  return (geo, mat, outline = true) => {
    const sx = d.T.headRx / 0.175, sy = d.T.headRy / 0.170, sz = d.T.headRz / 0.165;
    if (geo && geo.isMesh) {
      if (liftY) geo.position.y += liftY * sy;
      geo.scale.set(sx, sy, sz);
      add([d.j.head, geo]);
      return;
    }
    if (liftY) geo.translate(0, liftY, 0);
    add([d.j.head, mesh(scH(geo, d), mat, outline)]);
  };
}

function capTop(d) { return Math.max(0.188, Math.min(0.285, d.hairCrownY || 0.212)); }
function closedDy(d) { return Math.max(-0.022, Math.min(0.022, capTop(d) - 0.212)); }
function openTop(d) { return Math.max(0.195, Math.min(0.278, capTop(d))); }

export const HAT_BUILD_EXTRA = {
  // ===== WORLD HEADWEAR (24) =====
  cowboy_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.29, 0.30, 0.014, 26).scale(1.08, 1, 0.92).translate(0, 0.162, -0.01), M(it));
    put(cyl(0.155, 0.178, 0.135, 20).translate(0, 0.228, -0.01), M(it));
    put(band(0.174, 0.182, 0.028, it, 1), A(it));
  },

  sombrero: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.45, 0.47, 0.018, 28).translate(0, 0.158, -0.01), M(it));
    put(torus(0.455, 0.016, 8, 28).rotateX(Math.PI / 2).translate(0, 0.168, -0.01), A(it));
    put(cone(0.175, 0.26, 20).translate(0, 0.285, -0.01), M(it));
  },

  ushanka: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.21, 0.155, 0.21, 18, 12).translate(0, 0.145, -0.01), M(it));
    put(box(0.22, 0.10, 0.055).translate(0, 0.175, 0.175), A(it));
    for (const s of [1, -1]) put(box(0.068, 0.22, 0.11).translate(s * 0.205, 0.015, -0.01), M(it));
  },

  grad_cap: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.175, 0.188, 0.085, 20).translate(0, 0.175, -0.01), M(it));
    put(box(0.36, 0.018, 0.36).rotateY(Math.PI / 4).translate(0, 0.225, -0.01), M(it));
    put(cyl(0.008, 0.008, 0.18, 8).translate(0.18, 0.14, 0.06), A(it));
    put(cone(0.024, 0.045, 8).translate(0.18, 0.055, 0.06), A(it));
  },

  hard_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(new THREE.SphereGeometry(0.212, 20, 12, 0, Math.PI * 2, 0, 1.55).translate(0, 0.085, -0.01), M(it));
    put(cyl(0.225, 0.245, 0.018, 22).translate(0, 0.115, 0.01), M(it));
    put(box(0.042, 0.045, 0.26).translate(0, 0.285, -0.01), A(it));
  },

  moto_helmet: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    put(new THREE.SphereGeometry(0.232, 20, 12, 0, Math.PI * 2, 0, 1.72).translate(0, 0.045, -0.005), M(it));
    put(new THREE.CylinderGeometry(0.225, 0.225, 0.105, 18, 1, true, -0.95, 1.90).translate(0, 0.020, 0.015), basicMat(it.c2 || '#15121b', { opacity: 0.72, doubleSide: true }), false);
  },

  mu_coi: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(new THREE.SphereGeometry(0.205, 20, 12, 0, Math.PI * 2, 0, 1.48).translate(0, 0.095, -0.01), M(it));
    put(cyl(0.205, 0.275, 0.042, 24).translate(0, 0.125, -0.01), M(it));
    put(sph(0.024, 0.024, 0.012, 8, 6).translate(0, 0.175, 0.195), toon('#ffd56b'), false);
  },

  non_quai_thao: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.38, 0.39, 0.022, 30).translate(0, 0.185, -0.01), M(it));
    put(cyl(0.38, 0.38, 0.075, 30, true).translate(0, 0.150, -0.01), M(it, { doubleSide: true }));
    put(torus(0.185, 0.012, 6, 20, Math.PI).rotateZ(Math.PI).translate(0, 0.045, 0.02), A(it));
  },

  mu_trang_nguyen: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.178, 0.188, 0.12, 20).translate(0, 0.175, -0.01), M(it));
    put(sph(0.12, 0.12, 0.10, 14, 10).translate(0, 0.255, -0.04), M(it));
    // Iconic horizontal dragonfly wings (cánh chuồn) on both sides!
    for (const s of [1, -1]) {
      put(box(0.28, 0.068, 0.012).translate(s * 0.27, 0.195, -0.02), A(it));
    }
    put(sph(0.028, 0.028, 0.014, 8, 6).translate(0, 0.205, 0.182), toon('#ffd56b'), false);
  },

  mu_phuong: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const gm = toon('#ffd56b');
    put(cyl(0.165, 0.178, 0.075, 20).translate(0, 0.195, -0.01), M(it));
    for (let i = -3; i <= 3; i++) {
      put(sph(0.032, 0.055, 0.016, 10, 8).rotateZ(-i * 0.18).translate(i * 0.055, 0.275 - Math.abs(i) * 0.015, 0.04), gm);
    }
    put(sph(0.026, 0.026, 0.018, 10, 8).translate(0, 0.245, 0.16), A(it));
  },

  viking_helmet: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(new THREE.SphereGeometry(0.208, 20, 12, 0, Math.PI * 2, 0, 1.52).translate(0, 0.095, -0.01), M(it));
    put(band(0.212, 0.115, 0.032, it, 1), A(it));
    const hornM = toon('#f6e7d8');
    for (const s of [1, -1]) {
      put(lathe([[0.042, 0], [0.034, 0.09], [0.020, 0.17], [0.004, 0.24]], 1, 12, 0, 2).rotateZ(-s * 1.05).translate(s * 0.19, 0.175, -0.01), hornM);
    }
  },

  knight_helmet: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.5);
    put(cyl(0.22, 0.22, 0.34, 20).translate(0, 0.05, -0.005), M(it));
    put(sph(0.22, 0.11, 0.22, 18, 10).translate(0, 0.22, -0.005), M(it));
    put(box(0.24, 0.024, 0.04).translate(0, 0.05, 0.215), toon('#15121b'), false);
    put(sph(0.035, 0.12, 0.18, 12, 8).translate(0, 0.34, -0.02), A(it));
  },

  samurai_kabuto: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(new THREE.SphereGeometry(0.215, 20, 12, 0, Math.PI * 2, 0, 1.50).translate(0, 0.095, -0.01), M(it));
    put(cyl(0.22, 0.28, 0.12, 20, true, Math.PI * 0.55, Math.PI * 1.9).translate(0, 0.05, -0.02), M(it, { doubleSide: true }));
    // Iconic golden crescent moon crest (Kuwagata)!
    put(torus(0.115, 0.014, 8, 20, Math.PI * 1.25).rotateZ(Math.PI * 0.88).translate(0, 0.265, 0.175), toon('#ffd56b'));
  },

  turban: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    for (let i = 0; i < 4; i++) {
      put(torus(0.195 - i * 0.012, 0.038, 10, 22).rotateX(Math.PI / 2 + (i % 2 ? 0.15 : -0.15)).translate(0, 0.145 + i * 0.032, -0.01), M(it));
    }
    put(sph(0.030, 0.038, 0.018, 10, 8).translate(0, 0.20, 0.205), A(it));
  },

  flower_crown: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(torus(0.192, 0.012, 6, 24).rotateX(Math.PI / 2 - 0.14).translate(0, 0.145, -0.01), toon('#4fa86c'));
    const cols = [it.c || '#ff6b8b', it.c2 || '#ffd56b', '#ffffff', '#c79bff'];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      put(sph(0.034, 0.034, 0.024, 8, 6).translate(Math.cos(a) * 0.198, 0.155 + Math.sin(a) * 0.02, Math.sin(a) * 0.195 - 0.01), toon(cols[i % cols.length]));
    }
  },

  laurel_wreath: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const gm = toon(it.c || '#d4af37');
    put(torus(0.192, 0.010, 6, 24, Math.PI * 1.6).rotateX(Math.PI / 2).rotateZ(Math.PI * 0.7).translate(0, 0.14, -0.01), gm);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI * 0.8 + (i / 11) * Math.PI * 1.6;
      put(sph(0.018, 0.044, 0.008, 6, 6).rotateY(-a).rotateZ(0.4).translate(Math.cos(a) * 0.20, 0.16, Math.sin(a) * 0.195 - 0.01), gm);
    }
  },

  santa_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(torus(0.192, 0.036, 10, 22).rotateX(Math.PI / 2).translate(0, 0.135, -0.01), A(it));
    put(cone(0.185, 0.34, 18).rotateZ(-0.32).translate(0.045, 0.295, -0.01), M(it));
    put(sph(0.052, 0.052, 0.052, 12, 8).translate(0.135, 0.445, -0.01), A(it));
  },

  jester_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.192, 0.125, 0.192, 16, 10).translate(0, 0.135, -0.01), M(it));
    for (const [s, rz, rx, col] of [[1, -0.85, 0, M(it)], [-1, 0.85, 0, A(it)], [0, 0, -0.65, M(it)]]) {
      put(cone(0.078, 0.32, 10).rotateZ(rz).rotateX(rx).translate(s * 0.17, 0.28, rx ? -0.14 : -0.01), col);
      put(sph(0.032, 0.032, 0.032, 8, 6).translate(s * 0.29, rx ? 0.40 : 0.38, rx ? -0.25 : -0.01), toon('#ffd56b'));
    }
  },

  party_hat: (d, it, add) => {
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(cone(0.125, 0.29, 18).rotateZ(-0.10).translate(0.01, 0.30, -0.01), M(it));
    put(sph(0.036, 0.036, 0.036, 10, 8).translate(0.025, 0.45, -0.01), A(it));
  },

  sailor_cap: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.195, 0.185, 0.085, 22).translate(0, 0.185, -0.01), M(it));
    put(torus(0.192, 0.022, 8, 22).rotateX(Math.PI / 2).translate(0, 0.145, -0.01), A(it));
  },

  captain_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.225, 0.185, 0.105, 22).translate(0, 0.205, -0.01), M(it));
    put(band(0.190, 0.155, 0.036, it, 1, A(it)));
    put(new THREE.CylinderGeometry(0.12, 0.125, 0.014, 18, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.142, 0.135), toon('#15121b'));
    put(sph(0.026, 0.026, 0.014, 8, 6).translate(0, 0.205, 0.21), toon('#ffd56b'), false);
  },

  police_cap: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.215, 0.182, 0.095, 22).translate(0, 0.198, -0.01), M(it));
    put(band(0.186, 0.152, 0.032, it, 1, A(it)));
    put(new THREE.CylinderGeometry(0.12, 0.125, 0.014, 18, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.138, 0.135), toon('#15121b'));
    put(sph(0.024, 0.028, 0.012, 8, 6).translate(0, 0.198, 0.205), toon('#ffd56b'), false);
  },

  fez_hat: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.125, 0.158, 0.165, 20).translate(0, 0.225, -0.01), M(it));
    put(cyl(0.008, 0.008, 0.16, 8).rotateZ(0.28).translate(0.155, 0.225, -0.01), A(it));
  },

  bandana_head: (d, it, add) => {
    const put = hatAdd(d, add, closedDy(d) * 0.4);
    put(cyl(0.192, 0.192, 0.056, 24, true).translate(0, 0.115, -0.006), M(it, { doubleSide: true }));
    for (const s of [1, -1]) put(box(0.026, 0.14, 0.010).rotateZ(s * 0.35).translate(s * 0.04, 0.06, -0.205), A(it));
  },

  // ===== SIÊU LẦY LỘI HATS (18!) =====
  rice_cooker_hat: (d, it, add) => {
    // NỒI CƠM ĐIỆN / XOONG INOX ÚP LÊN ĐẦU (có 2 quai nồi + vung!)
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.225, 0.232, 0.22, 24).translate(0, 0.215, -0.01), M(it));
    put(torus(0.236, 0.016, 8, 24).rotateX(Math.PI / 2).translate(0, 0.115, -0.01), A(it));
    for (const s of [1, -1]) {
      put(torus(0.046, 0.012, 6, 14, Math.PI).rotateZ(s * -Math.PI / 2).translate(s * 0.232, 0.22, -0.01), toon('#15121b'));
    }
    put(box(0.09, 0.055, 0.025).translate(0, 0.20, 0.225), A(it));
  },

  traffic_cone_hat: (d, it, add) => {
    // NÓN GIAO THÔNG CÔNG TRƯỜNG ĐỘI LÊN ĐẦU!
    const put = hatAdd(d, add, closedDy(d));
    put(box(0.36, 0.028, 0.36).translate(0, 0.165, -0.01), M(it));
    put(cone(0.145, 0.44, 20).translate(0, 0.385, -0.01), M(it));
    put(cyl(0.068, 0.095, 0.075, 20).translate(0, 0.38, -0.01), toon('#ffffff', 'plain', '#fff', { emissive: '#ffffff', emissiveIntensity: 0.35 }));
  },

  bucket_head: (d, it, add) => {
    // XÔ NHỰA ÚP ĐẦU (có quai xô rủ xuống!)
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.185, 0.235, 0.25, 22).translate(0, 0.205, -0.01), M(it));
    put(torus(0.238, 0.016, 8, 24).rotateX(Math.PI / 2).translate(0, 0.088, -0.01), A(it));
    put(torus(0.245, 0.009, 6, 22, Math.PI).rotateX(Math.PI * 0.65).translate(0, 0.12, -0.01), toon('#d9dde6'));
  },

  box_head: (d, it, add) => {
    // THÙNG CARTON VẼ MẶT CƯỜI ĐỘI KÍN ĐẦU!
    const put = hatAdd(d, add, 0);
    put(box(0.42, 0.42, 0.42).translate(0, 0.04, 0), M(it));
    const bk = toon('#15121b');
    for (const s of [1, -1]) put(sph(0.032, 0.032, 0.012, 8, 6).translate(s * 0.085, 0.08, 0.215), bk, false);
    put(torus(0.062, 0.012, 6, 16, Math.PI).rotateZ(Math.PI).translate(0, 0.01, 0.215), bk, false);
  },

  poop_hat: (d, it, add) => {
    // MŨ CỤC PHÂN VÀNG QUÝ TỘC 3 TẦNG XOẮN!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(torus(0.135, 0.048, 10, 22).rotateX(Math.PI / 2).translate(0, 0.225, -0.01), M(it));
    put(torus(0.095, 0.042, 10, 20).rotateX(Math.PI / 2).translate(0, 0.285, -0.01), M(it));
    put(torus(0.055, 0.036, 10, 18).rotateX(Math.PI / 2).translate(0, 0.340, -0.01), M(it));
    put(cone(0.048, 0.085, 12).rotateZ(-0.22).translate(0.01, 0.405, -0.01), M(it));
    // Cute eyes on poop!
    for (const s of [1, -1]) put(sph(0.018, 0.022, 0.014, 8, 6).translate(s * 0.042, 0.275, 0.132), toon('#ffffff'), false);
    for (const s of [1, -1]) put(sph(0.010, 0.012, 0.012, 6, 6).translate(s * 0.042, 0.275, 0.144), toon('#15121b'), false);
  },

  sprout_head: (d, it, add) => {
    // CÂY CHỒI NON MỌC THẲNG TRÊN ĐỈNH ĐẦU!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(cyl(0.012, 0.014, 0.17, 8).translate(0, 0.265, -0.01), M(it));
    for (const s of [1, -1]) {
      put(sph(0.068, 0.032, 0.014, 10, 8).rotateZ(s * 0.42).translate(s * 0.065, 0.365, -0.01), A(it));
    }
  },

  alien_antenna: (d, it, add) => {
    // ĂNG-TEN NGƯỜI NGOÀI HÀNH TINH PHÁT SÁNG!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const glow = toon(it.c2 || '#76ff03', 'plain', '#fff', { emissive: it.c2 || '#76ff03', emissiveIntensity: 0.7 });
    put(torus(0.185, 0.012, 8, 22, Math.PI).translate(0, 0.04, -0.01), M(it));
    for (const s of [1, -1]) {
      put(cyl(0.008, 0.008, 0.22, 8).rotateZ(-s * 0.30).translate(s * 0.10, 0.29, -0.01), M(it));
      put(sph(0.036, 0.036, 0.036, 10, 8).translate(s * 0.135, 0.405, -0.01), glow);
    }
  },

  beer_helmet: (d, it, add) => {
    // MŨ GẮN 2 LON NƯỚC HAI BÊN CÓ ỐNG HÚT!
    const put = hatAdd(d, add, closedDy(d));
    put(new THREE.SphereGeometry(0.21, 20, 12, 0, Math.PI * 2, 0, 1.52).translate(0, 0.09, -0.01), M(it));
    for (const s of [1, -1]) {
      put(cyl(0.042, 0.042, 0.13, 14).translate(s * 0.245, 0.165, -0.01), A(it));
      put(torus(0.12, 0.008, 6, 16, Math.PI).rotateY(s * 0.5).translate(s * 0.13, 0.14, 0.09), toon('#ffffff'), false);
    }
  },

  sheep_towel: (d, it, add) => {
    // KHĂN MẶT QUẤN ĐẦU CỪU PHÒNG XÔNG HƠI HÀN QUỐC!
    const put = hatAdd(d, add, closedDy(d));
    put(cyl(0.195, 0.198, 0.11, 22).translate(0, 0.155, -0.01), M(it));
    for (const s of [1, -1]) {
      put(sph(0.088, 0.092, 0.088, 14, 10).translate(s * 0.225, 0.115, -0.01), M(it));
      put(torus(0.068, 0.014, 6, 14).rotateY(Math.PI / 2).translate(s * 0.295, 0.115, -0.01), A(it));
    }
  },

  bird_nest_hat: (d, it, add) => {
    // TỔ CHIM CÓ 2 QUẢ TRỨNG TRÊN ĐỈNH ĐẦU!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(torus(0.145, 0.044, 10, 22).rotateX(Math.PI / 2).translate(0, 0.235, -0.01), M(it));
    put(cyl(0.14, 0.12, 0.045, 18).translate(0, 0.215, -0.01), M(it));
    for (const s of [1, -1]) put(sph(0.044, 0.056, 0.044, 10, 8).rotateZ(s * 0.22).translate(s * 0.048, 0.268, -0.01), A(it));
  },

  cake_hat: (d, it, add) => {
    // BÁNH SINH NHẬT 2 TẦNG CẮM NẾN CHÁY TRÊN ĐẦU!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(cyl(0.165, 0.165, 0.11, 22).translate(0, 0.245, -0.01), M(it));
    put(cyl(0.115, 0.115, 0.085, 20).translate(0, 0.34, -0.01), A(it));
    put(cyl(0.014, 0.014, 0.085, 8).translate(0, 0.42, -0.01), toon('#ff6b8b'));
    put(cone(0.022, 0.055, 8).translate(0, 0.485, -0.01), toon('#ffea00', 'plain', '#fff', { emissive: '#ff9f5a', emissiveIntensity: 0.85 }), false);
  },

  pineapple_hat: (d, it, add) => {
    // QUẢ DỨA / TRÁI CÂY KHỔNG LỒ ĐỘI ĐẦU!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    put(sph(0.145, 0.185, 0.145, 16, 12).translate(0, 0.32, -0.01), M(it));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(cone(0.036, 0.15, 6).rotateZ(Math.cos(a) * 0.5).rotateX(Math.sin(a) * 0.5).translate(Math.cos(a) * 0.04, 0.52, Math.sin(a) * 0.04 - 0.01), A(it));
    }
  },

  ufo_hat: (d, it, add) => {
    // ĐĨA BAY UFO LƠ LỬNG PHÁT SÁNG TRÊN ĐẦU!
    const put = hatAdd(d, add, openTop(d) - 0.212);
    const glow = toon(it.c2 || '#00e5ff', 'plain', '#fff', { emissive: it.c2 || '#00e5ff', emissiveIntensity: 0.75 });
    put(cyl(0.14, 0.28, 0.06, 24).translate(0, 0.36, -0.01), M(it));
    put(sph(0.115, 0.085, 0.115, 16, 10).translate(0, 0.41, -0.01), glow);
    put(cone(0.19, 0.22, 18).translate(0, 0.23, -0.01), basicMat(it.c2 || '#00e5ff', { opacity: 0.24, doubleSide: true }), false);
  },

  propeller_cap: (d, it, add) => {
    // MŨ CHONG CHÓNG TRE CẦU VỒNG!
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.195, 0.125, 0.195, 20, 12).translate(0, 0.124, -0.01), M(it));
    put(new THREE.CylinderGeometry(0.115, 0.118, 0.014, 18, 1, false, -Math.PI / 2, Math.PI).translate(0, 0.132, 0.135), A(it));
    put(cyl(0.010, 0.010, 0.065, 8).translate(0, 0.275, -0.01), toon('#ffd56b'));
    put(box(0.24, 0.012, 0.036).translate(0, 0.312, -0.01), toon('#ff3b6b'));
  },

  mushroom_hat: (d, it, add) => {
    // MŨ NẤM KHỔNG LỒ TOAD CHẤM BI!
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.32, 0.21, 0.32, 22, 14).translate(0, 0.255, -0.01), M(it));
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      put(sph(0.068, 0.068, 0.042, 10, 8).translate(Math.cos(a) * 0.26, 0.265, Math.sin(a) * 0.26 - 0.01), A(it), false);
    }
    put(sph(0.075, 0.045, 0.075, 10, 8).translate(0, 0.445, -0.01), A(it), false);
  },

  duck_head_hat: (d, it, add) => {
    // MŨ ĐẦU VỊT VÀNG MỎ CAM KHỔNG LỒ!
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.225, 0.185, 0.225, 20, 12).translate(0, 0.165, -0.01), M(it));
    put(box(0.14, 0.042, 0.12).translate(0, 0.155, 0.235), A(it));
    for (const s of [1, -1]) put(sph(0.026, 0.026, 0.016, 8, 6).translate(s * 0.088, 0.215, 0.205), toon('#15121b'), false);
  },

  frog_hat: (d, it, add) => {
    // MŨ ẾCH XANH 2 MẮT LỒI!
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.215, 0.145, 0.215, 20, 12).translate(0, 0.145, -0.01), M(it));
    for (const s of [1, -1]) {
      put(sph(0.068, 0.068, 0.068, 12, 8).translate(s * 0.125, 0.265, 0.055), M(it));
      put(sph(0.042, 0.042, 0.024, 10, 8).translate(s * 0.125, 0.265, 0.115), toon('#ffffff'), false);
      put(sph(0.022, 0.022, 0.016, 8, 6).translate(s * 0.125, 0.265, 0.132), toon('#15121b'), false);
    }
  },

  shark_hat: (d, it, add) => {
    // MŨ CÁ MẬP NGOẠM ĐẦU CÓ RĂNG NHỌN!
    const put = hatAdd(d, add, closedDy(d));
    put(sph(0.225, 0.175, 0.245, 20, 12).translate(0, 0.165, -0.01), M(it));
    put(cone(0.075, 0.19, 8).rotateX(-0.35).translate(0, 0.365, -0.03), M(it));
    for (let i = -3; i <= 3; i++) {
      put(cone(0.018, 0.042, 4).rotateX(Math.PI).translate(i * 0.044, 0.125, 0.215 - Math.abs(i) * 0.015), toon('#ffffff'), false);
    }
  },
};

// ===== +16 BESPOKE 3D GLASSES & FACE MASKS =====
function faceBase(d) {
  const T = d.T;
  const scX = T.headRx / 0.172, scY = T.headRy / 0.168;
  const ex = 0.058 * scX, ey = -0.002 * scY;
  const gz = headFrontZ(T, ex, ey) + 0.026;
  const bz = headFrontZ(T, 0, ey) + 0.022;
  return { H: d.j.head, T, scX, scY, ex, ey, gz, bz };
}

export const GLASSES_BUILD_EXTRA = {
  deal_with_it: (d, it, add) => {
    // KÍNH 8-BIT PIXEL DEAL WITH IT THUG LIFE!
    const { H, scX, scY, ex, ey, gz } = faceBase(d);
    const bk = toon(it.c || '#15121b');
    const wh = toon(it.c2 || '#ffffff');
    add([H, mesh(box(0.22 * scX, 0.020 * scY, 0.010).translate(0, ey + 0.016 * scY, gz), bk, false)]);
    for (const s of [1, -1]) {
      add([H, mesh(box(0.074 * scX, 0.036 * scY, 0.010).translate(s * ex, ey - 0.004 * scY, gz), bk, false)]);
      add([H, mesh(box(0.014 * scX, 0.012 * scY, 0.012).translate(s * ex - 0.012 * scX, ey + 0.004 * scY, gz + 0.003), wh, false)]);
      add([H, mesh(box(0.014 * scX, 0.012 * scY, 0.012).translate(s * ex + 0.004 * scX, ey - 0.008 * scY, gz + 0.003), wh, false)]);
    }
  },

  spiral_glasses: (d, it, add) => {
    // KÍNH XOẮN ỐC THÔI MIÊN!
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    for (const s of [1, -1]) {
      add([H, mesh(torus(0.042 * scX, 0.007, 8, 20).translate(s * ex, ey, gz), M(it), false)]);
      add([H, mesh(torus(0.026 * scX, 0.006, 6, 16).translate(s * ex, ey, gz + 0.004), A(it), false)]);
      add([H, mesh(sph(0.012 * scX, 0.012 * scY, 0.008, 8, 6).translate(s * ex, ey, gz + 0.006), M(it), false)]);
    }
    add([H, mesh(cyl(0.004, 0.004, ex * 0.9, 6).rotateZ(Math.PI / 2).translate(0, ey + 0.006, bz), M(it), false)]);
  },

  dollar_glasses: (d, it, add) => {
    // KÍNH TRÒNG ĐỒNG TIỀN $ ĐẠI GIA!
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    const gm = toon(it.c || '#ffd56b');
    for (const s of [1, -1]) {
      add([H, mesh(torus(0.040 * scX, 0.008, 8, 18).translate(s * ex, ey, gz), gm, false)]);
      add([H, mesh(box(0.010 * scX, 0.072 * scY, 0.012).translate(s * ex, ey, gz + 0.004), A(it), false)]);
      add([H, mesh(box(0.044 * scX, 0.012 * scY, 0.012).translate(s * ex, ey + 0.016 * scY, gz + 0.004), A(it), false)]);
      add([H, mesh(box(0.044 * scX, 0.012 * scY, 0.012).translate(s * ex, ey - 0.016 * scY, gz + 0.004), A(it), false)]);
    }
    add([H, mesh(cyl(0.004, 0.004, ex * 0.9, 6).rotateZ(Math.PI / 2).translate(0, ey + 0.006, bz), gm, false)]);
  },

  cucumber_eyes: (d, it, add) => {
    // ĐẮP 2 LÁT DƯA CHUỘT SPA LÊN MẮT!
    const { H, scX, scY, ex, ey, gz } = faceBase(d);
    for (const s of [1, -1]) {
      add([H, mesh(cyl(0.044 * scX, 0.044 * scX, 0.014, 18).rotateX(Math.PI / 2).translate(s * ex, ey, gz), toon(it.c || '#1a6b4f'))]);
      add([H, mesh(cyl(0.036 * scX, 0.036 * scX, 0.016, 16).rotateX(Math.PI / 2).translate(s * ex, ey, gz + 0.001), toon(it.c2 || '#b8f2a6'), false)]);
    }
  },

  groucho_glasses: (d, it, add) => {
    // KÍNH MŨI GIẢ + RIA MÉP CHÚ HỀ GROUCHO!
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    const bk = toon(it.c || '#15121b');
    for (const s of [1, -1]) {
      add([H, mesh(torus(0.036 * scX, 0.007, 8, 18).translate(s * ex, ey, gz), bk, false)]);
      add([H, mesh(box(0.056 * scX, 0.016 * scY, 0.014).translate(s * ex, ey + 0.044 * scY, gz), bk, false)]);
    }
    // Giant fake nose + bushy moustache!
    add([H, mesh(sph(0.034 * scX, 0.042 * scY, 0.042, 12, 8).translate(0, ey - 0.025 * scY, bz + 0.026), toon(it.c2 || '#ff8fa3'))]);
    add([H, mesh(box(0.115 * scX, 0.028 * scY, 0.020).translate(0, ey - 0.068 * scY, bz + 0.014), bk)]);
  },

  vr_headset: (d, it, add) => {
    const { H, T, scX, scY, ey, bz } = faceBase(d);
    add([H, mesh(box(0.22 * scX, 0.095 * scY, 0.105).translate(0, ey + 0.005, bz + 0.022), M(it))]);
    add([H, mesh(box(0.19 * scX, 0.065 * scY, 0.015).translate(0, ey + 0.005, bz + 0.072), toon(it.c2 || '#00e5ff', 'plain', '#fff', { emissive: it.c2 || '#00e5ff', emissiveIntensity: 0.65 }), false)]);
    add([H, mesh(torus(T.headRx + 0.012, 0.016, 8, 24).rotateX(Math.PI / 2).translate(0, ey + 0.01, -0.005), M(it), false)]);
  },

  ski_goggles: (d, it, add) => {
    const { H, T, scX, scY, ey, bz } = faceBase(d);
    add([H, mesh(box(0.21 * scX, 0.078 * scY, 0.048).translate(0, ey + 0.004, bz + 0.014), M(it))]);
    add([H, mesh(box(0.18 * scX, 0.056 * scY, 0.014).translate(0, ey + 0.004, bz + 0.038), toon(it.c2 || '#ff9f5a', 'plain', '#fff', { emissive: it.c2 || '#ff9f5a', emissiveIntensity: 0.4 }), false)]);
    add([H, mesh(torus(T.headRx + 0.010, 0.014, 6, 24).rotateX(Math.PI / 2).translate(0, ey + 0.004, -0.005), M(it), false)]);
  },

  steampunk_goggles: (d, it, add) => {
    const { H, T, scX, scY, ex, ey, gz, bz } = faceBase(d);
    const br = toon(it.c || '#c98b2c');
    for (const s of [1, -1]) {
      add([H, mesh(cyl(0.042 * scX, 0.042 * scX, 0.042, 16).rotateX(Math.PI / 2).translate(s * ex, ey, gz + 0.004), br)]);
      add([H, mesh(cyl(0.032 * scX, 0.032 * scX, 0.046, 14).rotateX(Math.PI / 2).translate(s * ex, ey, gz + 0.006), basicMat(it.c2 || '#6ec6ff', { opacity: 0.72 }), false)]);
    }
    add([H, mesh(torus(T.headRx + 0.010, 0.012, 6, 24).rotateX(Math.PI / 2).translate(0, ey, -0.005), toon('#5a3825'), false)]);
  },

  cinema_3d: (d, it, add) => {
    // KÍNH 3D RẠP PHIM 1 BÊN ĐỎ 1 BÊN XANH!
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    const fr = toon('#ffffff');
    add([H, mesh(box(0.072 * scX, 0.050 * scY, 0.008).translate(-ex, ey, gz), fr, false)]);
    add([H, mesh(box(0.072 * scX, 0.050 * scY, 0.008).translate(ex, ey, gz), fr, false)]);
    add([H, new THREE.Mesh(new THREE.PlaneGeometry(0.058 * scX, 0.038 * scY).translate(-ex, ey, gz + 0.005), basicMat('#ff2e4c', { opacity: 0.78 }))]);
    add([H, new THREE.Mesh(new THREE.PlaneGeometry(0.058 * scX, 0.038 * scY).translate(ex, ey, gz + 0.005), basicMat('#00e5ff', { opacity: 0.78 }))]);
    add([H, mesh(box(ex * 1.1, 0.014 * scY, 0.008).translate(0, ey + 0.012 * scY, bz), fr, false)]);
  },

  venetian_mask: (d, it, add) => {
    const { H, T, scX, scY, ey, bz } = faceBase(d);
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.018, T.headRx + 0.018, 0.088 * scY, 22, 1, true, -0.92, 1.84).translate(0, ey + 0.008 * scY, 0.006), M(it, { doubleSide: true }))]);
    add([H, mesh(sph(0.022 * scX, 0.068 * scY, 0.012, 8, 6).rotateZ(-0.4).translate(0.11 * scX, ey + 0.068 * scY, bz + 0.005), A(it))]);
  },

  medical_mask: (d, it, add) => {
    const { H, T, scY, ey } = faceBase(d);
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.014, T.headRx * 0.92 + 0.014, 0.095 * scY, 18, 1, true, -0.82, 1.64).translate(0, ey - 0.068 * scY, 0.010), M(it, { doubleSide: true }))]);
  },

  ninja_mask: (d, it, add) => {
    const { H, T, scY, ey } = faceBase(d);
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.016, T.headRx * 0.95 + 0.016, 0.135 * scY, 20, 1, true, -1.15, 2.30).translate(0, ey - 0.062 * scY, 0.006), M(it, { doubleSide: true }))]);
  },

  gas_mask: (d, it, add) => {
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    for (const s of [1, -1]) add([H, mesh(cyl(0.038 * scX, 0.038 * scX, 0.032, 14).rotateX(Math.PI / 2).translate(s * ex, ey, gz), M(it))]);
    add([H, mesh(cyl(0.048 * scX, 0.056 * scX, 0.075, 16).rotateX(Math.PI / 2).translate(0, ey - 0.065 * scY, bz + 0.042), A(it))]);
  },

  sleep_mask: (d, it, add) => {
    const { H, T, scX, scY, ey, bz } = faceBase(d);
    add([H, mesh(box(0.20 * scX, 0.072 * scY, 0.022).translate(0, ey + 0.006, bz + 0.012), M(it))]);
    add([H, mesh(torus(T.headRx + 0.008, 0.008, 6, 22).rotateX(Math.PI / 2).translate(0, ey + 0.006, -0.005), A(it), false)]);
  },

  sheet_mask: (d, it, add) => {
    // MẶT NẠ GIẤY DƯỠNG DA TRẮNG TINH ĐẮP KÍN MẶT!
    const { H, T, scY, ey } = faceBase(d);
    add([H, mesh(new THREE.CylinderGeometry(T.headRx + 0.012, T.headRx * 0.94 + 0.012, 0.21 * scY, 20, 1, true, -0.88, 1.76).translate(0, ey - 0.012 * scY, 0.010), M(it, { doubleSide: true }))]);
  },

  thick_nerd: (d, it, add) => {
    // KÍNH CẬN ĐÁY CHAI DÀY CỘP DÁN BĂNG KEO TRẮNG Ở GIỮA!
    const { H, scX, scY, ex, ey, gz, bz } = faceBase(d);
    const bk = toon(it.c || '#15121b');
    for (const s of [1, -1]) {
      add([H, mesh(box(0.078 * scX, 0.058 * scY, 0.022).translate(s * ex, ey, gz + 0.004), bk)]);
      add([H, mesh(box(0.058 * scX, 0.040 * scY, 0.026).translate(s * ex, ey, gz + 0.004), basicMat('#d8f3ff', { opacity: 0.62 }), false)]);
    }
    // White tape wrapped around nose bridge!
    add([H, mesh(box(0.040 * scX, 0.026 * scY, 0.026).translate(0, ey + 0.006, bz + 0.008), toon('#ffffff'))]);
  },
};
