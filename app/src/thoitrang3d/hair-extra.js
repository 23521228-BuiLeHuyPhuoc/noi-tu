// @ts-nocheck
// hair-extra.js — 24 additional hairstyles (world classics + hilarious Xóm Lầy hairdos) fitting all 6 bodies.
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, hairMat } from './core.js';

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

export const HAIR_BUILD_EXTRA = {
  // 1. Trọc lóc bóng loáng (vệt bóng sáng trên đỉnh đầu!)
  bald: (d, it, add) => {
    const { put } = makeHairAdd(d, it, add);
    put(sph(0.036, 0.018, 0.022, 10, 8).rotateZ(-0.35).translate(0.052, 0.148, 0.072), toon('#ffffff', 'plain', '#fff', { opacity: 0.65 }), true, false);
  },

  // 2. Hói đỉnh hai bên còn tóc (ông chú trung niên!)
  balding_m: (d, it, add) => {
    const { put, mSolid } = makeHairAdd(d, it, add);
    for (const s of [1, -1]) {
      for (let i = 0; i < 4; i++) {
        const a = 0.25 + i * 0.35;
        put(sph(0.048, 0.044, 0.048, 10, 8).translate(s * Math.cos(a) * 0.174, 0.015 - i * 0.008, -Math.sin(a) * 0.165), mSolid);
      }
    }
    put(sph(0.145, 0.055, 0.065, 12, 8).translate(0, -0.005, -0.152), mSolid);
    put(sph(0.030, 0.014, 0.020, 8, 6).translate(0.04, 0.156, 0.06), toon('#ffffff', 'plain', '#fff', { opacity: 0.6 }), true, false);
  },

  // 3. Đầu nấm úp tô (Bowl Cut)
  bowl_cut: (d, it, add) => {
    const { put, mMain, mSolid } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.198, 22, 12, 0, Math.PI * 2, 0, 1.38).translate(0, 0.048, -0.006), mMain);
    put(cyl(0.195, 0.198, 0.038, 24).translate(0, 0.068, -0.006), mSolid);
  },

  // 4. Tóc Mullet cá đối
  mullet: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.008, 0.99);
    put(sph(0.145, 0.058, 0.125, 16, 10).translate(0, 0.162, 0.045), mSolid, true);
    put(lathe([[0.15, -0.34], [0.195, -0.20], [0.188, -0.04], [0.175, 0.06]], 0.85, 20, 3.0, 2).translate(0, 0, -0.042), mMain);
    for (let i = -2; i <= 2; i++) {
      put(cone(0.034, 0.12, 8).rotateX(Math.PI + 0.2).translate(i * 0.048, -0.30, -0.165), mMain);
    }
  },

  // 5. Tóc Rasta Dreadlocks
  dreadlocks: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.01);
    for (let i = 0; i < 16; i++) {
      const a = Math.PI * 0.22 + (i / 15) * Math.PI * 1.56;
      const x = Math.cos(a) * 0.185, z = Math.sin(a) * 0.175 - 0.015;
      const len = 0.34 + (i % 3) * 0.05;
      put(cyl(0.022, 0.019, len, 8).translate(x, 0.04 - len * 0.5, z), mMain);
      if (i % 4 === 0) put(torus(0.024, 0.006, 6, 10).rotateX(Math.PI / 2).translate(x, -0.14, z), mAcc, false, false);
    }
  },

  // 6. Tóc tết sát da đầu Cornrows
  cornrows: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.002, 0.975);
    for (let i = -3; i <= 3; i++) {
      const x = i * 0.042;
      put(torus(0.182 - Math.abs(i) * 0.012, 0.014, 6, 18, Math.PI * 1.15).rotateY(Math.PI / 2).translate(x, 0.02, -0.01), mMain);
      put(cyl(0.014, 0.012, 0.18, 6).translate(x, -0.10, -0.172), mMain);
      if (Math.abs(i) % 2 === 1) put(sph(0.015, 0.015, 0.015, 6, 6).translate(x, -0.19, -0.172), mAcc, false, false);
    }
  },

  // 7. Tóc tổ ong 60s Beehive siêu cao
  beehive: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.006);
    put(lathe([[0.155, 0.0], [0.165, 0.10], [0.135, 0.22], [0.075, 0.32], [0.01, 0.36]], 0.92, 20, 0, 2).translate(0, 0.135, -0.025), mMain, true);
    put(torus(0.158, 0.016, 8, 22).rotateX(Math.PI / 2 - 0.12).translate(0, 0.165, -0.015), mAcc, true);
    bangs(0, 0.142, 0.108, 0.148, 0.038, 0.052, 0);
  },

  // 8. Tóc dựng ngược Siêu Xayda (Super Saiyan!)
  super_saiyan: (d, it, add) => {
    const { put, cap, mMain } = makeHairAdd(d, it, add);
    cap(0.01);
    const spikes = [
      [0, 0.34, 0.02, 0.085, 0.30, 0, 0],
      [-0.12, 0.29, 0.01, 0.072, 0.25, 0.48, 0],
      [0.12, 0.29, 0.01, 0.072, 0.25, -0.48, 0],
      [-0.17, 0.20, -0.03, 0.064, 0.22, 0.92, -0.2],
      [0.17, 0.20, -0.03, 0.064, 0.22, -0.92, -0.2],
      [0, 0.28, -0.12, 0.075, 0.25, 0, -0.45],
      [-0.08, 0.26, 0.11, 0.052, 0.18, 0.35, 0.35],
      [0.08, 0.26, 0.11, 0.052, 0.18, -0.35, 0.35],
    ];
    for (const [x, y, z, r, h, rz, rx] of spikes) {
      put(cone(r, h, 8).rotateZ(rz).rotateX(rx).translate(x, y, z), mMain, true);
    }
  },

  // 9. Tóc dựng bị điện giật!
  electrocuted: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.012);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const tilt = 0.65 + (i % 3) * 0.28;
      put(cone(0.036, 0.20 + (i % 2) * 0.06, 6).rotateZ(Math.cos(a) * tilt).rotateX(Math.sin(a) * tilt).translate(Math.cos(a) * 0.19, 0.15 + (i % 3) * 0.05, Math.sin(a) * 0.17 - 0.02), mMain, true);
    }
    put(cone(0.042, 0.24, 6).translate(0, 0.30, -0.01), mMain, true);
    // Tiny electric spark bolts!
    put(box(0.012, 0.06, 0.012).rotateZ(0.5).translate(0.24, 0.26, 0.04), toon('#ffea00', 'plain', '#fff', { emissive: '#ffea00', emissiveIntensity: 0.8 }), true, false);
    put(box(0.012, 0.06, 0.012).rotateZ(-0.5).translate(-0.23, 0.28, 0.02), toon('#00e5ff', 'plain', '#fff', { emissive: '#00e5ff', emissiveIntensity: 0.8 }), true, false);
  },

  // 10. Tóc cuốn 8 lô uốn tóc đi chợ (Bà thím Xóm Lầy!)
  hair_rollers: (d, it, add) => {
    const { put, cap, mSolid, mAcc } = makeHairAdd(d, it, add);
    cap(0.006);
    const cols = [it.c2 || '#ff6b8b', '#6ec6ff', '#ffd56b', '#5fd3a6'];
    const pos = [
      [0, 0.21, 0.08, 0], [-0.14, 0.16, 0.05, 0.5], [0.14, 0.16, 0.05, -0.5],
      [-0.18, 0.06, -0.02, 0.9], [0.18, 0.06, -0.02, -0.9],
      [-0.12, 0.18, -0.10, 0.4], [0.12, 0.18, -0.10, -0.4], [0, 0.22, -0.09, 0],
    ];
    pos.forEach(([x, y, z, rz], idx) => {
      put(cyl(0.036, 0.036, 0.088, 12).rotateZ(Math.PI / 2 + rz).translate(x, y, z), toon(cols[idx % cols.length]), true);
      put(cyl(0.039, 0.039, 0.026, 12).rotateZ(Math.PI / 2 + rz).translate(x, y, z), mSolid, true, false);
    });
  },

  // 11. Tóc khoan đôi Anime (Twin Drills)
  twin_drills: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (const s of [1, -1]) {
      put(sph(0.034, 0.024, 0.024, 10, 8).translate(s * 0.185, 0.10, -0.02), mAcc);
      for (let i = 0; i < 6; i++) {
        const r = 0.062 - i * 0.008;
        put(torus(r, 0.018, 8, 16).rotateX(Math.PI / 2 + 0.16).translate(s * (0.205 + i * 0.006), 0.04 - i * 0.058, -0.015), mMain);
      }
      put(cone(0.024, 0.065, 8).rotateX(Math.PI).translate(s * 0.24, -0.32, -0.015), mMain);
    }
    bangs(0, 0.142, 0.108, 0.150, 0.040, 0.056, 0);
  },

  // 12. Tóc 3 chỏm đào trẻ con Việt Nam!
  chom_dao: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairAdd(d, it, add);
    const tufts = [[0, 0.195, 0.075], [-0.125, 0.165, 0.01], [0.125, 0.165, 0.01]];
    for (const [x, y, z] of tufts) {
      put(cyl(0.048, 0.054, 0.024, 14).translate(x, y - 0.012, z), mMain, true);
      put(torus(0.026, 0.009, 6, 12).rotateX(Math.PI / 2).translate(x, y + 0.012, z), mAcc, true);
      put(cone(0.034, 0.075, 10).translate(x, y + 0.048, z), mMain, true);
    }
  },

  // 13. Tóc đuôi sam nhà Thanh (nửa đầu trọc + bím dài sau lưng!)
  qing_queue: (d, it, add) => {
    const { put, mMain, mAcc } = makeHairAdd(d, it, add);
    put(new THREE.SphereGeometry(0.186, 18, 10, Math.PI * 0.72, Math.PI * 1.56, 0.35, 1.5).translate(0, 0.02, -0.015), mMain);
    for (let i = 0; i < 8; i++) {
      put(sph(0.028 - i * 0.0018, 0.034, 0.028 - i * 0.0018, 8, 6).translate(0, -0.06 - i * 0.055, -0.185 - i * 0.004), mMain);
    }
    put(torus(0.024, 0.008, 6, 10).rotateX(Math.PI / 2).translate(0, -0.49, -0.215), mAcc);
  },

  // 14. Tóc Pompadour Elvis cao vút
  pompadour: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.006, 0.985);
    put(sph(0.125, 0.115, 0.195, 18, 12).rotateX(-0.24).translate(0, 0.205, 0.078), mMain, true);
    put(cyl(0.095, 0.088, 0.14, 16).rotateZ(Math.PI / 2).translate(0, 0.215, 0.185), mSolid, true);
  },

  // 15. Tóc mái ngố răng cưa Maruko
  bob_maruko: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap();
    put(lathe([[0.198, -0.11], [0.214, -0.02], [0.195, 0.07]], 0.98, 22, 2.25, 2).translate(0, 0, -0.018), mMain);
    for (let i = -3; i <= 3; i++) {
      put(cone(0.026, 0.068, 6).rotateX(Math.PI).translate(i * 0.036, 0.126, 0.145 - Math.abs(i) * 0.012), mSolid);
    }
  },

  // 16. Búi củ hành khổng lồ trên đỉnh (Onion Bun)
  onion_bun: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.005);
    put(torus(0.056, 0.016, 8, 16).rotateX(Math.PI / 2).translate(0, 0.21, -0.01), mAcc, true);
    put(lathe([[0.05, 0], [0.095, 0.06], [0.082, 0.14], [0.022, 0.21], [0.004, 0.25]], 1, 16, 0, 2).translate(0, 0.21, -0.01), mMain, true);
    bangs(0, 0.144, 0.108, 0.145, 0.04, 0.054, 0);
  },

  // 17. Tóc ổ quạ mới ngủ dậy (Bedhead)
  messy_bedhead: (d, it, add) => {
    const { put, cap, mMain, mSolid } = makeHairAdd(d, it, add);
    cap(0.01);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      put(cone(0.044, 0.14, 7).rotateZ(Math.cos(a) * 0.85).rotateX(Math.sin(a) * 0.65).translate(Math.cos(a) * 0.15, 0.14 + (i % 3) * 0.04, Math.sin(a) * 0.14 - 0.01), i % 2 ? mMain : mSolid, true);
    }
    put(torus(0.042, 0.010, 6, 12, Math.PI * 1.4).rotateZ(0.4).translate(0.02, 0.255, 0.02), mMain, true);
  },

  // 18. Tết bím lệch vai Elsa
  braid_side: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (let i = 0; i < 7; i++) {
      const r = 0.044 - i * 0.003;
      put(sph(r, r * 1.15, r * 0.95, 10, 8).translate(0.155 - i * 0.008, -0.01 - i * 0.064, 0.03 + i * 0.014), mMain);
    }
    put(sph(0.028, 0.020, 0.028, 10, 8).translate(0.105, -0.44, 0.125), mAcc);
    put(cone(0.026, 0.06, 8).rotateX(Math.PI).translate(0.105, -0.48, 0.125), mMain);
    bangs(-0.025, 0.145, 0.108, 0.148, 0.040, 0.056, 0.18);
  },

  // 19. Bím vòng đôi cổ điển
  twin_braid_loops: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (const s of [1, -1]) {
      put(torus(0.078, 0.024, 8, 16).scale(0.82, 1.32, 0.72).translate(s * 0.185, -0.06, -0.01), mMain);
      put(sph(0.026, 0.022, 0.022, 8, 6).translate(s * 0.175, 0.04, 0.015), mAcc);
    }
    bangs(0, 0.142, 0.108, 0.15, 0.04, 0.054, 0);
  },

  // 20. Tóc chôm chôm Punk Gai
  spiky_punk: (d, it, add) => {
    const { put, cap, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.006, 0.99);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      put(cone(0.038, 0.16, 6).rotateZ(Math.cos(a) * 0.9).rotateX(Math.sin(a) * 0.9).translate(Math.cos(a) * 0.16, 0.14, Math.sin(a) * 0.15 - 0.01), i % 3 === 0 ? mAcc : mMain, true);
    }
  },

  // 21. Tóc bờm sư tử siêu xù khổng lồ
  lion_mane: (d, it, add) => {
    const { put, cap, mMain } = makeHairAdd(d, it, add);
    cap(0.015);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      put(sph(0.095, 0.095, 0.088, 10, 8).translate(Math.cos(a) * 0.215, 0.04 + Math.sin(a) * 0.195, -0.055), mMain, Math.sin(a) > 0.35);
    }
  },

  // 22. Tóc buộc nửa đầu tiểu thư (Half-Up)
  half_up: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    put(lathe([[0.17, -0.42], [0.205, -0.22], [0.206, -0.04], [0.192, 0.075]], 0.84, 22, 2.38, 2).translate(0, 0, -0.044), mMain);
    put(sph(0.068, 0.056, 0.062, 12, 8).translate(0, 0.165, -0.152), mMain, true);
    put(box(0.095, 0.028, 0.022).translate(0, 0.145, -0.175), mAcc, true);
    bangs(0, 0.144, 0.108, 0.148, 0.040, 0.056, 0);
  },

  // 23. 3 búi bánh trôi (Triple Dango)
  dango_triple: (d, it, add) => {
    const { put, cap, bangs, mMain, mAcc } = makeHairAdd(d, it, add);
    cap(0.004);
    for (const [x, y] of [[0, 0.245], [-0.155, 0.185], [0.155, 0.185]]) {
      put(torus(0.050, 0.011, 6, 14).rotateX(Math.PI / 2).translate(x, y - 0.022, -0.02), mAcc, true);
      put(sph(0.068, 0.068, 0.068, 12, 8).translate(x, y, -0.02), mMain, true);
    }
    bangs(0, 0.142, 0.108, 0.148, 0.04, 0.054, 0);
  },

  // 24. Tóc bết 3 ngày không gội rẽ 2 mái ép sát!
  greasy_flat: (d, it, add) => {
    const { put, cap, mSolid } = makeHairAdd(d, it, add);
    cap(-0.004, 0.985);
    for (const s of [1, -1]) {
      put(cyl(0.022, 0.014, 0.24, 8).rotateZ(s * 0.08).translate(s * 0.145, -0.02, 0.085), mSolid);
      put(cyl(0.018, 0.010, 0.22, 8).rotateZ(s * 0.12).translate(s * 0.105, 0.02, 0.125), mSolid);
    }
  },
};
