// @ts-nocheck
// wear-acc-extra.js — +75 bespoke 3D accessories & hilarious Xóm Lầy props across all 11 accessory sub-slots!
import * as THREE from 'three';
import { mesh, lathe, sph, cyl, box, cone, torus, toon, basicMat, memePrintTex } from './core.js';
import { M, A, band, frontTorsoZ } from './wear-helpers.js';

export const ACC_SUB_EXTRA = {
  // Bags & Right hand
  tote_bag: 'handR', briefcase: 'handR', suitcase: 'handR', plastic_market_bag: 'handR',
  market_basket: 'handR', trash_bag_prop: 'handR',
  // Back
  rice_sack_back: 'back', jetpack: 'back', butterfly_wings: 'back', dragon_wings: 'back',
  cardboard_wings: 'back', shark_fin: 'back', katana_back: 'back', oxygen_tank: 'back',
  fire_extinguisher_back: 'back',
  // Tails
  peacock_tail: 'tail', nine_tails: 'tail', dragon_tail: 'tail', bunny_tail: 'tail',
  // Neck
  stethoscope: 'neck', hawaiian_lei: 'neck', feather_boa: 'neck', camera_neck: 'neck',
  whistle_neck: 'neck', giant_gold_chain: 'neck',
  // Ears & Head
  drop_earrings: 'ears', flower_ear: 'ears', gaming_headset: 'head',
  // Waist (new sub-slot!)
  duck_floatie: 'waist', leather_belt: 'waist', obi_sash: 'waist', fanny_pack: 'waist',
  apron_waist: 'waist', champion_belt: 'waist',
  // Wrists / Hands (new sub-slot!)
  dish_gloves: 'wrists', boxing_gloves: 'wrists', luxury_watch: 'wrists', handcuffs: 'wrists',
  // Left hand held props (Real-world & SIÊU LẦY!)
  frying_pan: 'handL', broom: 'handL', plunger: 'handL', chicken_duster: 'handL',
  banh_mi: 'handL', pho_bowl: 'handL', durian: 'handL', fresh_fish: 'handL',
  rubber_chicken: 'handL', green_onion: 'handL', watermelon: 'handL', drumstick: 'handL',
  red_brick: 'handL', flying_slipper: 'handL', tp_roll: 'handL', money_stack: 'handL',
  so_do: 'handL', trophy_cup: 'handL', megaphone: 'handL', lightsaber: 'handL',
  wizard_staff: 'handL', trident: 'handL', shield_knight: 'handL', star_lantern: 'handL',
  coffee_cup: 'handL', ice_cream: 'handL', pizza_slice: 'handL', laptop_prop: 'handL',
  selfie_stick: 'handL', balloon_prop: 'handL', teddy_bear: 'handL', basketball: 'handL',
  skateboard: 'handL', hair_dryer: 'handL', stop_sign: 'handL', spray_bottle: 'handL',
};

export const HELD_KINDS_EXTRA = {
  frying_pan: 'wand', broom: 'sword', plunger: 'wand', chicken_duster: 'wand',
  banh_mi: 'upright', pho_bowl: 'upright', durian: 'upright', fresh_fish: 'upright',
  rubber_chicken: 'upright', green_onion: 'wand', watermelon: 'upright', drumstick: 'upright',
  red_brick: 'upright', flying_slipper: 'upright', tp_roll: 'upright', money_stack: 'upright',
  so_do: 'upright', trophy_cup: 'upright', megaphone: 'upright', lightsaber: 'sword',
  wizard_staff: 'sword', trident: 'sword', shield_knight: 'upright', star_lantern: 'wand',
  coffee_cup: 'upright', ice_cream: 'upright', pizza_slice: 'upright', laptop_prop: 'upright',
  selfie_stick: 'wand', balloon_prop: 'wand', teddy_bear: 'upright', basketball: 'upright',
  skateboard: 'upright', hair_dryer: 'upright', stop_sign: 'sword', spray_bottle: 'upright',
};

function outerOff(d) { return Math.max(d.outerInf || 0, d.topInf || 0.015); }
function backZ(d) { return -(d.T.chest * 0.75 + outerOff(d) + 0.012); }
function lh(d, rx = 0.68, ry = 0.12, rz = -0.10) {
  const { hand } = d.j.arm[-1], hs = d.T.handS;
  const g = new THREE.Group();
  g.position.set(0.008 * hs, -0.025 * hs, 0.028 * hs);
  g.rotation.set(rx, ry, rz);
  return { hand, hs, g };
}

export const ACC_BUILD_EXTRA = {
  // ===== BAGS (6) =====
  tote_bag: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.042, 0.165, 0.155).translate(0.022 * hs, -0.175 * hs, 0), M(it))]);
    add([hand, mesh(torus(0.056, 0.007, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(0.022 * hs, -0.090 * hs, 0), A(it))]);
  },

  briefcase: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.052, 0.145, 0.215).translate(0.024 * hs, -0.145 * hs, 0), M(it))]);
    add([hand, mesh(torus(0.036, 0.008, 6, 14, Math.PI).rotateY(Math.PI / 2).translate(0.024 * hs, -0.068 * hs, 0), A(it))]);
    add([hand, mesh(box(0.058, 0.018, 0.036).translate(0.024 * hs, -0.095 * hs, 0), toon('#ffd56b'), false)]);
  },

  suitcase: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(box(0.115, 0.28, 0.20).translate(0.055 * hs, -0.34 * hs, 0), M(it))]);
    add([hand, mesh(box(0.020, 0.16, 0.065).translate(0.055 * hs, -0.14 * hs, 0), toon('#7c828f'))]);
    for (const wz of [-0.07, 0.07]) add([hand, mesh(cyl(0.022, 0.022, 0.026, 10).rotateZ(Math.PI / 2).translate(0.055 * hs, -0.49 * hs, wz), toon('#15121b'))]);
  },

  plastic_market_bag: (d, it, add) => {
    // TÚI NILON CHỢ MÀU ĐỎ/HỒNG ĐỰNG HÀNH LÁ!
    const { hand } = d.j.arm[1], hs = d.T.handS;
    const bagM = toon(it.c || '#ff2e93', 'plain', '#fff', { opacity: 0.72, doubleSide: true });
    add([hand, mesh(sph(0.072, 0.105, 0.078, 12, 8).translate(0.025 * hs, -0.165 * hs, 0), bagM)]);
    add([hand, mesh(torus(0.048, 0.008, 6, 14, Math.PI).rotateY(Math.PI / 2).translate(0.025 * hs, -0.072 * hs, 0), bagM)]);
    // Green scallion stalks poking out!
    add([hand, mesh(cyl(0.008, 0.010, 0.18, 6).rotateZ(-0.22).translate(0.04 * hs, -0.08 * hs, 0.02), toon('#4cd964'))]);
  },

  market_basket: (d, it, add) => {
    // LÀN NHỰA ĐI CHỢ CỦA MẸ!
    const { hand } = d.j.arm[1], hs = d.T.handS;
    const bm = toon(it.c || '#ff6b8b', 'cyber_grid', it.c2 || '#ffffff');
    add([hand, mesh(cyl(0.115, 0.085, 0.16, 14).scale(0.75, 1, 1.2).translate(0.045 * hs, -0.17 * hs, 0), bm)]);
    add([hand, mesh(torus(0.085, 0.010, 6, 16, Math.PI).rotateY(Math.PI / 2).translate(0.045 * hs, -0.09 * hs, 0), A(it))]);
  },

  trash_bag_prop: (d, it, add) => {
    const { hand } = d.j.arm[1], hs = d.T.handS;
    add([hand, mesh(sph(0.115, 0.135, 0.115, 14, 10).translate(0.045 * hs, -0.19 * hs, 0), M(it))]);
    add([hand, mesh(cone(0.055, 0.085, 10).rotateX(Math.PI).translate(0.045 * hs, -0.065 * hs, 0), M(it))]);
    add([hand, mesh(torus(0.032, 0.009, 6, 12).rotateX(Math.PI / 2).translate(0.045 * hs, -0.082 * hs, 0), A(it))]);
  },

  // ===== BACK PROPS (9) =====
  rice_sack_back: (d, it, add) => {
    // BAO TẢI GẠO 50KG VÁC SAU LƯNG!
    const bz = backZ(d) - 0.095;
    add([d.j.chest, mesh(sph(0.175, 0.245, 0.115, 16, 10).translate(0, 0.02, bz), M(it))]);
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('GẠO 50KG', '#ffffff', '#c92a46') });
    add([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.11).rotateY(Math.PI).translate(0, 0.02, bz - 0.118), decal)]);
  },

  jetpack: (d, it, add) => {
    const bz = backZ(d) - 0.062;
    const flame = toon('#ff9f5a', 'plain', '#fff', { emissive: '#ffea00', emissiveIntensity: 0.85 });
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(cyl(0.048, 0.048, 0.26, 14).translate(s * 0.068, 0.02, bz), M(it))]);
      add([d.j.chest, mesh(sph(0.048, 0.042, 0.048, 10, 8).translate(s * 0.068, 0.15, bz), A(it))]);
      add([d.j.chest, mesh(cone(0.036, 0.12, 10).rotateX(Math.PI).translate(s * 0.068, -0.17, bz), flame, false)]);
    }
  },

  butterfly_wings: (d, it, add) => {
    const bz = backZ(d) - 0.005, cy = d.Y.chest - d.Y.waist + 0.02;
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(sph(0.22, 0.17, 0.014, 14, 10).rotateZ(s * 0.28).rotateY(s * 0.35).translate(s * 0.22, cy + 0.10, bz - 0.06), M(it))]);
      add([d.j.chest, mesh(sph(0.15, 0.14, 0.014, 12, 8).rotateZ(-s * 0.22).rotateY(s * 0.38).translate(s * 0.15, cy - 0.12, bz - 0.05), A(it))]);
    }
  },

  dragon_wings: (d, it, add) => {
    const bz = backZ(d) - 0.006, cy = d.Y.chest - d.Y.waist + 0.04;
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(0.24 * s, 0.32); sh.lineTo(0.48 * s, 0.24);
      sh.lineTo(0.36 * s, -0.08); sh.lineTo(0.18 * s, -0.18); sh.closePath();
      add([d.j.chest, mesh(new THREE.ShapeGeometry(sh, 8).rotateY(s * 0.42).translate(0, cy, bz), M(it, { doubleSide: true }))]);
      add([d.j.chest, mesh(cyl(0.012, 0.010, 0.38, 8).rotateZ(-s * 0.72).translate(s * 0.13, cy + 0.14, bz - 0.02), A(it))]);
    }
  },

  cardboard_wings: (d, it, add) => {
    // CÁNH TỰ CẮT TỪ BÌA CARTON DÁN BĂNG KEO!
    const bz = backZ(d) - 0.012, cy = d.Y.chest - d.Y.waist;
    for (const s of [1, -1]) {
      add([d.j.chest, mesh(box(0.34, 0.22, 0.016).rotateZ(s * 0.18).rotateY(s * 0.30).translate(s * 0.19, cy + 0.04, bz - 0.04), M(it))]);
      add([d.j.chest, mesh(box(0.04, 0.18, 0.020).rotateZ(s * 0.45).translate(s * 0.06, cy + 0.02, bz - 0.02), A(it), false)]);
    }
  },

  shark_fin: (d, it, add) => {
    const bz = backZ(d) - 0.010;
    const sh = new THREE.Shape();
    sh.moveTo(0, 0); sh.quadraticCurveTo(0.08, 0.20, 0.26, 0.28); sh.quadraticCurveTo(0.16, 0.08, 0.22, -0.08); sh.closePath();
    add([d.j.chest, mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.028, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.014, 0.02, bz), M(it))]);
  },

  katana_back: (d, it, add) => {
    const bz = backZ(d) - 0.028;
    const kg = new THREE.Group();
    kg.position.set(0, 0.04, bz);
    kg.rotation.set(0, 0, -0.58);
    kg.add(mesh(cyl(0.016, 0.014, 0.68, 10), M(it)));
    kg.add(mesh(cyl(0.042, 0.042, 0.014, 14).translate(0, 0.34, 0), toon('#ffd56b')));
    kg.add(mesh(cyl(0.015, 0.015, 0.20, 10).translate(0, 0.45, 0), A(it)));
    add([d.j.chest, kg]);
  },

  oxygen_tank: (d, it, add) => {
    const bz = backZ(d) - 0.065;
    add([d.j.chest, mesh(cyl(0.068, 0.068, 0.32, 16).translate(0, 0.01, bz), M(it))]);
    add([d.j.chest, mesh(sph(0.068, 0.055, 0.068, 12, 8).translate(0, 0.17, bz), A(it))]);
    add([d.j.chest, mesh(cyl(0.018, 0.018, 0.05, 8).translate(0, 0.23, bz), toon('#15121b'))]);
  },

  fire_extinguisher_back: (d, it, add) => {
    const bz = backZ(d) - 0.068;
    add([d.j.chest, mesh(cyl(0.072, 0.072, 0.34, 16).translate(0, 0.01, bz), M(it))]);
    add([d.j.chest, mesh(cone(0.036, 0.11, 10).rotateZ(0.6).translate(0.09, 0.16, bz), toon('#15121b'))]);
  },

  // ===== TAILS (4) =====
  peacock_tail: (d, it, add) => {
    const z0 = -(d.T.hip * 0.78 + 0.045);
    for (let i = -3; i <= 3; i++) {
      const a = i * 0.34;
      add([d.j.hips, mesh(sph(0.068, 0.32, 0.014, 10, 8).rotateZ(-a).translate(Math.sin(a) * 0.30, 0.22 + Math.cos(a) * 0.14, z0 - 0.06), M(it))]);
      add([d.j.hips, mesh(sph(0.034, 0.044, 0.018, 8, 6).translate(Math.sin(a) * 0.44, 0.34 + Math.cos(a) * 0.22, z0 - 0.05), A(it), false)]);
    }
  },

  nine_tails: (d, it, add) => {
    const z0 = -(d.T.hip * 0.78 + 0.04);
    for (let i = -4; i <= 4; i++) {
      const a = i * 0.26;
      const g = lathe([[0.012, 0], [0.052, 0.10], [0.075, 0.22], [0.055, 0.34], [0.014, 0.42]], 1, 12, 0, 2);
      g.rotateX(-1.12).rotateZ(-a).translate(Math.sin(a) * 0.08, 0.02, z0);
      add([d.j.hips, mesh(g, i % 2 === 0 ? M(it) : A(it))]);
    }
  },

  dragon_tail: (d, it, add) => {
    const z0 = -(d.T.hip * 0.78 + 0.02);
    add([d.j.hips, mesh(cone(0.068, 0.56, 12).rotateX(-1.28).translate(0, -0.08, z0 - 0.24), M(it))]);
    for (let i = 0; i < 4; i++) add([d.j.hips, mesh(cone(0.020, 0.048, 4).translate(0, -0.02 - i * 0.04, z0 - 0.10 - i * 0.11), A(it))]);
  },

  bunny_tail: (d, it, add) => {
    add([d.j.hips, mesh(sph(0.076, 0.076, 0.076, 12, 10).translate(0, -0.01, -(d.T.hip * 0.78 + 0.065)), M(it))]);
  },

  // ===== NECK (6) =====
  stethoscope: (d, it, add) => {
    const Y = d.Y, T = d.T, inf = outerOff(d) + 0.008;
    add([d.j.chest, mesh(torus(T.neckR + 0.036, 0.010, 8, 20).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.018, 0), M(it))]);
    const fz = frontTorsoZ(d, Y.chest, inf);
    add([d.j.chest, mesh(cyl(0.006, 0.006, 0.14, 8).translate(-0.045, Y.chest - Y.waist, fz + 0.008), M(it))]);
    add([d.j.chest, mesh(cyl(0.026, 0.026, 0.012, 14).rotateX(Math.PI / 2).translate(-0.045, Y.chest - 0.075 - Y.waist, fz + 0.012), A(it))]);
  },

  hawaiian_lei: (d, it, add) => {
    const Y = d.Y, T = d.T, inf = outerOff(d) + 0.010;
    const cols = [it.c || '#ff6b8b', it.c2 || '#ffd56b', '#5fd3a6', '#ffffff'];
    for (let i = 0; i < 14; i++) {
      const a = Math.PI * 0.12 + (i / 13) * Math.PI * 0.76;
      const r = T.neckR + 0.065;
      add([d.j.chest, mesh(sph(0.022, 0.022, 0.018, 8, 6).translate(Math.cos(a) * r, Y.neck - Y.waist - 0.02 - Math.sin(a) * 0.11, Math.sin(a) * (frontTorsoZ(d, Y.chest + 0.02, inf) + 0.015)), toon(cols[i % cols.length]), false)]);
    }
  },

  feather_boa: (d, it, add) => {
    const Y = d.Y, T = d.T, inf = outerOff(d) + 0.014;
    add([d.j.chest, mesh(torus(T.neckR + 0.065, 0.048, 10, 22).scale(1.15, 0.72, 0.95).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.025, 0), M(it))]);
    const fz = frontTorsoZ(d, Y.chest - 0.02, inf);
    for (const s of [1, -1]) add([d.j.chest, mesh(sph(0.045, 0.145, 0.042, 10, 8).translate(s * 0.065, Y.chest - 0.04 - Y.waist, fz + 0.02), A(it))]);
  },

  camera_neck: (d, it, add) => {
    const Y = d.Y, fz = frontTorsoZ(d, Y.chest - 0.02, outerOff(d) + 0.014);
    add([d.j.chest, mesh(box(0.115, 0.072, 0.048).translate(0, Y.chest - 0.02 - Y.waist, fz + 0.026), M(it))]);
    add([d.j.chest, mesh(cyl(0.028, 0.032, 0.045, 14).rotateX(Math.PI / 2).translate(0, Y.chest - 0.02 - Y.waist, fz + 0.062), A(it))]);
  },

  whistle_neck: (d, it, add) => {
    const Y = d.Y, fz = frontTorsoZ(d, Y.chest, outerOff(d) + 0.012);
    add([d.j.chest, mesh(cyl(0.018, 0.018, 0.042, 12).rotateZ(Math.PI / 2).translate(0, Y.chest - 0.03 - Y.waist, fz + 0.018), M(it))]);
    add([d.j.chest, mesh(box(0.012, 0.14, 0.006).translate(0, Y.chest + 0.04 - Y.waist, fz + 0.008), A(it), false)]);
  },

  giant_gold_chain: (d, it, add) => {
    // DÂY XÍCH VÀNG 10 CÂY ĐẠI GIA XÓM LẦY!
    const Y = d.Y, T = d.T, inf = outerOff(d) + 0.014;
    const gm = toon(it.c || '#ffd56b');
    for (let i = 0; i < 10; i++) {
      const a = Math.PI * 0.15 + (i / 9) * Math.PI * 0.70;
      add([d.j.chest, mesh(torus(0.022, 0.009, 6, 12).translate(Math.cos(a) * (T.neckR + 0.065), Y.neck - Y.waist - 0.03 - Math.sin(a) * 0.105, Math.sin(a) * (frontTorsoZ(d, Y.chest, inf) + 0.014)), gm)]);
    }
    const fz = frontTorsoZ(d, Y.chest - 0.04, inf);
    add([d.j.chest, mesh(cyl(0.056, 0.056, 0.016, 16).rotateX(Math.PI / 2).translate(0, Y.chest - 0.04 - Y.waist, fz + 0.022), A(it))]);
  },

  // ===== EARS & HEAD (3) =====
  drop_earrings: (d, it, add) => {
    const H = d.j.head, T = d.T;
    for (const s of [1, -1]) {
      add([H, mesh(cyl(0.004, 0.004, 0.048, 6).translate(s * (T.headRx + 0.012), -0.055, -0.004), toon('#ffd56b'), false)]);
      add([H, mesh(sph(0.018, 0.026, 0.014, 10, 8).translate(s * (T.headRx + 0.012), -0.088, -0.004), M(it))]);
    }
  },

  flower_ear: (d, it, add) => {
    const H = d.j.head, T = d.T;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      add([H, mesh(sph(0.024, 0.024, 0.014, 8, 6).translate(T.headRx + 0.018, 0.03 + Math.cos(a) * 0.026, 0.02 + Math.sin(a) * 0.026), M(it))]);
    }
    add([H, mesh(sph(0.016, 0.016, 0.016, 8, 6).translate(T.headRx + 0.024, 0.03, 0.02), A(it), false)]);
  },

  gaming_headset: (d, it, add) => {
    const H = d.j.head, T = d.T;
    const sx = T.headRx / 0.175, sy = T.headRy / 0.170;
    const glow = toon(it.c2 || '#00e5ff', 'plain', '#fff', { emissive: it.c2 || '#00e5ff', emissiveIntensity: 0.7 });
    add([H, mesh(torus(0.198 * sx, 0.018, 8, 22, Math.PI).scale(1, sy / sx, 1).translate(0, 0.025, -0.005), M(it))]);
    for (const s of [1, -1]) {
      add([H, mesh(cyl(0.052, 0.052, 0.036, 14).rotateZ(Math.PI / 2).translate(s * (T.headRx + 0.024), -0.005, -0.005), M(it))]);
      add([H, mesh(torus(0.044, 0.009, 6, 14).rotateY(Math.PI / 2).translate(s * (T.headRx + 0.042), -0.005, -0.005), glow, false)]);
      add([H, mesh(cone(0.042, 0.082, 4).rotateZ(-s * 0.25).translate(s * 0.115 * sx, 0.245 * sy, -0.01), glow)]);
    }
  },

  // ===== WAIST SUB-SLOT (6!) =====
  duck_floatie: (d, it, add) => {
    // PHAO BƠI CON VỊT VÀNG ĐEO QUANH EO!
    const T = d.T;
    add([d.j.hips, mesh(torus(T.hip + 0.115, 0.072, 12, 26).rotateX(Math.PI / 2).translate(0, 0.06, 0), M(it))]);
    // Duck head + orange beak at front!
    add([d.j.hips, mesh(sph(0.072, 0.078, 0.072, 12, 8).translate(0, 0.175, T.hip + 0.135), M(it))]);
    add([d.j.hips, mesh(box(0.062, 0.024, 0.062).translate(0, 0.165, T.hip + 0.215), A(it))]);
    for (const s of [1, -1]) add([d.j.hips, mesh(sph(0.012, 0.012, 0.012, 6, 6).translate(s * 0.032, 0.195, T.hip + 0.195), toon('#15121b'), false)]);
    d.armSpread = Math.max(d.armSpread || 0, 0.34);
  },

  leather_belt: (d, it, add) => {
    const wy = d.Y.waist - d.Y.hip;
    add([d.j.hips, band(d.T.waist + outerOff(d) + 0.016, wy, 0.034, it, 0.78, M(it))]);
    add([d.j.hips, mesh(box(0.048, 0.042, 0.014).translate(0, wy, (d.T.waist + outerOff(d) + 0.020) * 0.78 + 0.006), A(it))]);
  },

  obi_sash: (d, it, add) => {
    const wy = d.Y.waist - d.Y.hip;
    add([d.j.hips, band(d.T.waist + outerOff(d) + 0.020, wy, 0.088, it, 0.78, M(it))]);
    add([d.j.hips, mesh(box(0.16, 0.11, 0.048).translate(0, wy, -(d.T.waist * 0.78 + 0.06)), A(it))]);
  },

  fanny_pack: (d, it, add) => {
    const wy = d.Y.waist - d.Y.hip;
    const fz = (d.T.waist + outerOff(d) + 0.020) * 0.78;
    add([d.j.hips, band(d.T.waist + outerOff(d) + 0.016, wy, 0.022, it, 0.78, toon('#15121b'))]);
    add([d.j.hips, mesh(box(0.155, 0.072, 0.062).translate(0.02, wy - 0.01, fz + 0.028), M(it))]);
  },

  apron_waist: (d, it, add) => {
    const wy = d.Y.waist - d.Y.hip;
    const fz = (d.T.hip + 0.025) * 0.78;
    add([d.j.hips, band(d.T.waist + outerOff(d) + 0.018, wy, 0.026, it, 0.78, A(it))]);
    add([d.j.hips, mesh(box(d.T.hip * 1.45, 0.30, 0.012).translate(0, wy - 0.16, fz + 0.012), M(it))]);
  },

  champion_belt: (d, it, add) => {
    // ĐAI VÔ ĐỊCH WWE VÀNG CHÓI!
    const wy = d.Y.waist - d.Y.hip;
    const fz = (d.T.waist + outerOff(d) + 0.022) * 0.78;
    add([d.j.hips, band(d.T.waist + outerOff(d) + 0.020, wy, 0.056, it, 0.78, M(it))]);
    add([d.j.hips, mesh(sph(0.068, 0.056, 0.016, 12, 8).translate(0, wy, fz + 0.012), A(it))]);
  },

  // ===== WRISTS / HANDS SUB-SLOT (4!) =====
  dish_gloves: (d, it, add) => {
    // GĂNG TAY RỬA BÁT CAO SU VÀNG DÀI TỚI KHUỶU!
    const T = d.T, L = d.L;
    for (const s of [1, -1]) {
      const { el, hand } = d.j.arm[s];
      add([el, mesh(cyl(T.foreR + 0.018, T.foreR + 0.014, L.armLo * 0.78, 14).translate(0, -L.armLo * 0.60, 0), M(it))]);
      add([hand, mesh(sph(0.040 * T.handS, 0.054 * T.handS, 0.032 * T.handS, 10, 8).translate(0, -0.028 * T.handS, 0.004), M(it))]);
    }
  },

  boxing_gloves: (d, it, add) => {
    // GĂNG TAY ĐẤM BỐC KHỔNG LỒ!
    for (const s of [1, -1]) {
      const { hand } = d.j.arm[s], hs = d.T.handS;
      add([hand, mesh(sph(0.088 * hs, 0.095 * hs, 0.088 * hs, 14, 10).translate(0, -0.048 * hs, 0.01), M(it))]);
      add([hand, mesh(cyl(0.046 * hs, 0.046 * hs, 0.052 * hs, 12).translate(0, 0.025 * hs, 0), A(it))]);
    }
  },

  luxury_watch: (d, it, add) => {
    const { el } = d.j.arm[-1], T = d.T, L = d.L;
    add([el, mesh(torus(T.foreR + 0.008, 0.008, 6, 16).rotateX(Math.PI / 2).translate(0, -L.armLo * 0.90, 0), M(it))]);
    add([el, mesh(cyl(0.018, 0.018, 0.010, 12).rotateZ(Math.PI / 2).translate(-(T.foreR + 0.012), -L.armLo * 0.90, 0), A(it))]);
  },

  handcuffs: (d, it, add) => {
    const T = d.T, L = d.L, sm = toon(it.c || '#d9dde6');
    for (const s of [1, -1]) {
      add([d.j.arm[s].el, mesh(torus(T.foreR + 0.014, 0.009, 6, 16).rotateX(Math.PI / 2).translate(0, -L.armLo * 0.90, 0), sm)]);
    }
  },

  // ===== HELD PROPS — REAL-WORLD & SIÊU LẦY LỘI (36!) =====
  frying_pan: (d, it, add) => {
    // CHẢO CHỐNG DÍNH PUBG!
    const { hand, g } = lh(d, 0.52, 0.10, -0.18);
    g.add(mesh(cyl(0.014, 0.014, 0.18, 8).translate(0, 0.06, 0), toon('#33211b')));
    g.add(mesh(cyl(0.135, 0.125, 0.038, 22).rotateX(Math.PI / 2).translate(0, 0.27, 0), M(it)));
    g.add(mesh(sph(0.052, 0.052, 0.010, 10, 8).translate(0.01, 0.27, 0.022), toon('#ffffff'), false));
    g.add(mesh(sph(0.024, 0.024, 0.014, 8, 6).translate(0.01, 0.27, 0.028), toon('#ffd56b'), false));
    add([hand, g]);
  },

  broom: (d, it, add) => {
    const { hand, g } = lh(d, 0.42, 0, 0.16);
    g.add(mesh(cyl(0.014, 0.014, 0.92, 8).translate(0, 0.16, 0), toon('#a6774f')));
    g.add(mesh(cone(0.125, 0.26, 14).translate(0, -0.34, 0), M(it)));
    add([hand, g]);
  },

  plunger: (d, it, add) => {
    // CÂY THÔNG BỒN CẦU QUYỀN LỰC!
    const { hand, g } = lh(d, 0.48, 0, -0.14);
    g.add(mesh(cyl(0.013, 0.013, 0.56, 8).translate(0, 0.18, 0), toon('#c9955a')));
    g.add(mesh(new THREE.SphereGeometry(0.088, 16, 10, 0, Math.PI * 2, 0, 1.55).rotateX(Math.PI).translate(0, 0.50, 0), M(it, { doubleSide: true })));
    add([hand, g]);
  },

  chicken_duster: (d, it, add) => {
    // CHỔI LÔNG GÀ HUYỀN THOẠI CỦA MẸ!
    const { hand, g } = lh(d, 0.48, 0, -0.16);
    g.add(mesh(cyl(0.010, 0.010, 0.26, 8).translate(0, 0.08, 0), toon('#a6774f')));
    g.add(mesh(sph(0.075, 0.15, 0.075, 12, 8).translate(0, 0.30, 0), M(it)));
    g.add(mesh(sph(0.062, 0.12, 0.062, 10, 8).translate(0, 0.36, 0), A(it)));
    add([hand, g]);
  },

  banh_mi: (d, it, add) => {
    const { hand, g } = lh(d, 0.72, 0.25, -0.2);
    g.add(mesh(sph(0.048, 0.135, 0.042, 14, 10).translate(0, 0.04, 0), M(it)));
    g.add(mesh(box(0.022, 0.20, 0.048).translate(0.015, 0.04, 0.01), toon('#4cd964'), false));
    add([hand, g]);
  },

  pho_bowl: (d, it, add) => {
    const { hand, g } = lh(d, 0.85, 0, 0);
    g.add(mesh(new THREE.SphereGeometry(0.105, 18, 10, 0, Math.PI * 2, 1.45, 1.65).translate(0, 0.07, 0.04), M(it, { doubleSide: true })));
    g.add(mesh(cyl(0.098, 0.098, 0.01, 16).translate(0, 0.075, 0.04), toon('#f6e7d8'), false));
    g.add(mesh(cyl(0.005, 0.005, 0.20, 6).rotateZ(-0.4).translate(0.06, 0.13, 0.04), toon('#a6774f')));
    add([hand, g]);
  },

  durian: (d, it, add) => {
    // QUẢ SẦU RIÊNG GAI GÓC!
    const { hand, g } = lh(d, 0.76, 0, 0);
    g.add(mesh(sph(0.105, 0.125, 0.105, 14, 10).translate(0, 0.06, 0.02), M(it)));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.add(mesh(cone(0.022, 0.048, 5).rotateZ(Math.cos(a) * 1.3).rotateX(Math.sin(a) * 1.3).translate(Math.cos(a) * 0.11, 0.06 + (i % 3 - 1) * 0.045, Math.sin(a) * 0.11 + 0.02), M(it), false));
    }
    add([hand, g]);
  },

  fresh_fish: (d, it, add) => {
    // CON CÁ TƯƠI CẦM ĐUÔI VỪA ĐI CHỢ VỀ!
    const { hand, g } = lh(d, 0.78, 0.2, 0);
    g.add(mesh(sph(0.062, 0.165, 0.034, 14, 10).translate(0, -0.14, 0.02), M(it)));
    g.add(mesh(cone(0.056, 0.075, 4).rotateX(Math.PI).translate(0, 0.04, 0.02), A(it)));
    g.add(mesh(sph(0.014, 0.014, 0.014, 8, 6).translate(0.022, -0.23, 0.044), toon('#ffffff'), false));
    add([hand, g]);
  },

  rubber_chicken: (d, it, add) => {
    // CON GÀ CAO SU LA HÉT MÀU VÀNG!
    const { hand, g } = lh(d, 0.65, 0.1, -0.1);
    g.add(mesh(sph(0.055, 0.082, 0.048, 12, 8).translate(0, -0.05, 0), M(it)));
    g.add(mesh(cyl(0.016, 0.020, 0.18, 10).translate(0, 0.10, 0), M(it)));
    g.add(mesh(sph(0.042, 0.042, 0.042, 10, 8).translate(0, 0.21, 0), M(it)));
    g.add(mesh(cone(0.022, 0.048, 6).rotateX(Math.PI / 2).translate(0, 0.20, 0.052), toon('#c92a46')));
    add([hand, g]);
  },

  green_onion: (d, it, add) => {
    const { hand, g } = lh(d, 0.56, 0, -0.14);
    for (let i = -1; i <= 1; i++) {
      g.add(mesh(cyl(0.010, 0.014, 0.14, 8).translate(i * 0.016, 0.02, 0), toon('#ffffff')));
      g.add(mesh(cyl(0.008, 0.012, 0.34, 8).rotateZ(i * 0.10).translate(i * 0.028, 0.24, 0), M(it)));
    }
    add([hand, g]);
  },

  watermelon: (d, it, add) => {
    const { hand, g } = lh(d, 0.80, 0, 0);
    g.add(mesh(sph(0.125, 0.145, 0.125, 16, 12).translate(0, 0.05, 0.03), toon(it.c || '#1a6b4f', 'pinstripe', '#15121b')));
    add([hand, g]);
  },

  drumstick: (d, it, add) => {
    const { hand, g } = lh(d, 0.65, 0, -0.1);
    g.add(mesh(cyl(0.014, 0.014, 0.12, 8).translate(0, 0.02, 0), toon('#f6e7d8')));
    g.add(mesh(sph(0.068, 0.098, 0.062, 12, 8).translate(0, 0.14, 0), M(it)));
    add([hand, g]);
  },

  red_brick: (d, it, add) => {
    // CỤC GẠCH ĐỎ XÓM LẦY!
    const { hand, g } = lh(d, 0.72, 0.2, 0);
    g.add(mesh(box(0.088, 0.062, 0.165).translate(0, 0.03, 0.03), M(it)));
    add([hand, g]);
  },

  flying_slipper: (d, it, add) => {
    // CHIẾC DÉP TỔ ONG CẦM SẴN TRÊN TAY!
    const { hand, g } = lh(d, 0.55, 0.15, -0.15);
    g.add(mesh(box(0.095, 0.21, 0.026).translate(0, 0.11, 0), M(it)));
    g.add(mesh(torus(0.044, 0.014, 6, 12, Math.PI).translate(0, 0.14, 0.012), A(it)));
    add([hand, g]);
  },

  tp_roll: (d, it, add) => {
    const { hand, g } = lh(d, 0.74, 0, 0);
    g.add(mesh(cyl(0.062, 0.062, 0.105, 16).translate(0, 0.05, 0.02), M(it)));
    g.add(mesh(cyl(0.024, 0.024, 0.108, 10).translate(0, 0.05, 0.02), toon('#a6774f'), false));
    add([hand, g]);
  },

  money_stack: (d, it, add) => {
    const { hand, g } = lh(d, 0.76, 0.2, 0);
    g.add(mesh(box(0.125, 0.056, 0.068).translate(0, 0.03, 0.02), M(it)));
    g.add(mesh(box(0.030, 0.058, 0.072).translate(0, 0.03, 0.02), A(it), false));
    add([hand, g]);
  },

  so_do: (d, it, add) => {
    // CUỐN SỔ ĐỎ NHÀ ĐẤT QUYỀN LỰC!
    const { hand, g } = lh(d, 0.74, 0.25, -0.12);
    g.add(mesh(box(0.135, 0.185, 0.018).translate(0, 0.09, 0.02), M(it)));
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('SỔ ĐỎ', it.c || '#c92a46', '#ffd56b') });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.115, 0.14).translate(0, 0.09, 0.031), decal));
    add([hand, g]);
  },

  trophy_cup: (d, it, add) => {
    const { hand, g } = lh(d, 0.72, 0, -0.1);
    const gm = toon(it.c || '#ffd56b');
    g.add(mesh(cyl(0.048, 0.056, 0.035, 14).translate(0, -0.01, 0), toon('#2b2533')));
    g.add(mesh(cyl(0.018, 0.024, 0.075, 10).translate(0, 0.045, 0), gm));
    g.add(mesh(cyl(0.072, 0.036, 0.115, 16).translate(0, 0.135, 0), gm));
    for (const s of [1, -1]) g.add(mesh(torus(0.036, 0.008, 6, 12).translate(s * 0.075, 0.145, 0), gm));
    add([hand, g]);
  },

  megaphone: (d, it, add) => {
    const { hand, g } = lh(d, 0.68, 0.1, -0.1);
    g.add(mesh(cyl(0.015, 0.015, 0.10, 8).translate(0, 0.01, 0), A(it)));
    g.add(mesh(cone(0.095, 0.22, 16).rotateX(-Math.PI / 2).translate(0, 0.09, 0.09), M(it)));
    add([hand, g]);
  },

  lightsaber: (d, it, add) => {
    const { hand, g } = lh(d, 0.40, 0, 0.22);
    const blade = toon(it.c || '#00e5ff', 'plain', '#fff', { emissive: it.c || '#00e5ff', emissiveIntensity: 0.9 });
    g.add(mesh(cyl(0.016, 0.016, 0.16, 10).translate(0, 0.01, 0), toon('#2b2533')));
    g.add(mesh(cyl(0.014, 0.014, 0.68, 10).translate(0, 0.43, 0), blade, false));
    add([hand, g]);
  },

  wizard_staff: (d, it, add) => {
    const { hand, g } = lh(d, 0.42, 0, 0.14);
    g.add(mesh(cyl(0.016, 0.014, 1.05, 8).translate(0, 0.22, 0), toon('#5a3825')));
    g.add(mesh(sph(0.056, 0.056, 0.056, 12, 8).translate(0, 0.78, 0), toon(it.c || '#c79bff', 'plain', '#fff', { emissive: it.c || '#c79bff', emissiveIntensity: 0.7 })));
    add([hand, g]);
  },

  trident: (d, it, add) => {
    const { hand, g } = lh(d, 0.40, 0, 0.16);
    const gm = toon(it.c || '#ffd56b');
    g.add(mesh(cyl(0.014, 0.014, 0.98, 8).translate(0, 0.22, 0), gm));
    g.add(mesh(box(0.18, 0.022, 0.018).translate(0, 0.70, 0), gm));
    for (const x of [-0.08, 0, 0.08]) g.add(mesh(cone(0.016, 0.18, 6).translate(x, 0.80, 0), gm));
    add([hand, g]);
  },

  shield_knight: (d, it, add) => {
    const { hand, g } = lh(d, 0.72, 0.35, 0);
    g.add(mesh(cyl(0.185, 0.185, 0.026, 18).rotateX(Math.PI / 2).translate(-0.04, 0.04, 0.04), M(it)));
    g.add(mesh(sph(0.055, 0.055, 0.028, 10, 8).translate(-0.04, 0.04, 0.062), A(it)));
    add([hand, g]);
  },

  star_lantern: (d, it, add) => {
    // ĐÈN ÔNG SAO TRUNG THU PHÁT SÁNG!
    const { hand, g } = lh(d, 0.50, 0, -0.12);
    g.add(mesh(cyl(0.008, 0.008, 0.36, 8).translate(0, 0.12, 0), toon('#a6774f')));
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.048 : 0.125, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    sh.closePath();
    g.add(mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.028, bevelEnabled: false }).translate(0, 0.38, -0.014), toon(it.c || '#ff3b6b', 'plain', '#fff', { emissive: it.c || '#ff3b6b', emissiveIntensity: 0.45 })));
    g.add(mesh(torus(0.125, 0.008, 6, 20).translate(0, 0.38, 0), A(it)));
    add([hand, g]);
  },

  coffee_cup: (d, it, add) => {
    const { hand, g } = lh(d, 0.80, 0, 0);
    g.add(mesh(cyl(0.036, 0.026, 0.105, 14).translate(0, 0.04, 0.02), M(it)));
    g.add(mesh(cyl(0.040, 0.040, 0.016, 14).translate(0, 0.095, 0.02), A(it)));
    add([hand, g]);
  },

  ice_cream: (d, it, add) => {
    const { hand, g } = lh(d, 0.72, 0, -0.1);
    g.add(mesh(cone(0.038, 0.115, 12).rotateX(Math.PI).translate(0, 0.03, 0.02), toon('#d9934c')));
    g.add(mesh(sph(0.044, 0.042, 0.044, 10, 8).translate(0, 0.105, 0.02), M(it)));
    g.add(mesh(sph(0.036, 0.034, 0.036, 10, 8).translate(0, 0.152, 0.02), A(it)));
    add([hand, g]);
  },

  pizza_slice: (d, it, add) => {
    const { hand, g } = lh(d, 0.78, 0.2, 0);
    g.add(mesh(cone(0.088, 0.165, 3).scale(1, 1, 0.22).translate(0, 0.08, 0.02), toon('#ffd56b')));
    g.add(mesh(box(0.15, 0.024, 0.026).translate(0, -0.005, 0.02), toon('#c97a3a')));
    g.add(mesh(sph(0.016, 0.016, 0.008, 8, 6).translate(0, 0.06, 0.035), toon('#c92a46'), false));
    add([hand, g]);
  },

  laptop_prop: (d, it, add) => {
    const { hand, g } = lh(d, 0.85, 0.15, 0);
    g.add(mesh(box(0.22, 0.012, 0.15).translate(0, 0.02, 0.06), M(it)));
    g.add(mesh(box(0.22, 0.145, 0.010).rotateX(-0.22).translate(0, 0.095, -0.01), M(it)));
    g.add(mesh(box(0.195, 0.120, 0.004).rotateX(-0.22).translate(0, 0.095, -0.002), basicMat('#6ec6ff'), false));
    add([hand, g]);
  },

  selfie_stick: (d, it, add) => {
    const { hand, g } = lh(d, 0.48, 0, -0.14);
    g.add(mesh(cyl(0.007, 0.009, 0.56, 8).translate(0, 0.22, 0), toon('#2b2533')));
    g.add(mesh(box(0.072, 0.115, 0.014).translate(0, 0.52, 0), M(it)));
    add([hand, g]);
  },

  balloon_prop: (d, it, add) => {
    const { hand, g } = lh(d, 0.50, 0, -0.06);
    g.add(mesh(cyl(0.004, 0.004, 0.44, 6).translate(0, 0.20, 0), toon('#ffffff'), false));
    g.add(mesh(sph(0.115, 0.140, 0.115, 14, 10).translate(0, 0.52, 0), M(it)));
    add([hand, g]);
  },

  teddy_bear: (d, it, add) => {
    const { hand, g } = lh(d, 0.78, 0.2, 0);
    g.add(mesh(sph(0.072, 0.088, 0.065, 12, 8).translate(0, 0.02, 0.02), M(it)));
    g.add(mesh(sph(0.062, 0.058, 0.058, 12, 8).translate(0, 0.135, 0.02), M(it)));
    for (const s of [1, -1]) g.add(mesh(sph(0.024, 0.024, 0.018, 8, 6).translate(s * 0.048, 0.185, 0.02), M(it)));
    g.add(mesh(sph(0.024, 0.018, 0.022, 8, 6).translate(0, 0.125, 0.072), A(it)));
    add([hand, g]);
  },

  basketball: (d, it, add) => {
    const { hand, g } = lh(d, 0.80, 0, 0);
    g.add(mesh(sph(0.115, 0.115, 0.115, 16, 12).translate(0, 0.04, 0.03), M(it)));
    g.add(mesh(torus(0.116, 0.005, 6, 20).translate(0, 0.04, 0.03), toon('#15121b'), false));
    add([hand, g]);
  },

  skateboard: (d, it, add) => {
    const { hand, g } = lh(d, 0.74, 0.35, 0);
    g.add(mesh(box(0.16, 0.48, 0.022).translate(-0.02, -0.02, 0.02), M(it)));
    for (const y of [-0.14, 0.12]) for (const x of [-0.07, 0.03]) {
      g.add(mesh(cyl(0.024, 0.024, 0.020, 10).rotateZ(Math.PI / 2).translate(x, y, 0.048), A(it)));
    }
    add([hand, g]);
  },

  hair_dryer: (d, it, add) => {
    const { hand, g } = lh(d, 0.66, 0, -0.1);
    g.add(mesh(cyl(0.016, 0.014, 0.11, 8).translate(0, 0.01, 0), M(it)));
    g.add(mesh(cyl(0.036, 0.028, 0.14, 12).rotateX(Math.PI / 2).translate(0, 0.075, 0.045), M(it)));
    g.add(mesh(cyl(0.026, 0.026, 0.025, 12).rotateX(Math.PI / 2).translate(0, 0.075, 0.12), A(it)));
    add([hand, g]);
  },

  stop_sign: (d, it, add) => {
    // BIỂN BÁO STOP NHỔ NGOÀI ĐƯỜNG CẦM ĐI CATWALK!
    const { hand, g } = lh(d, 0.42, 0, 0.16);
    g.add(mesh(cyl(0.014, 0.014, 0.92, 8).translate(0, 0.18, 0), toon('#9ca3af')));
    g.add(mesh(cyl(0.145, 0.145, 0.016, 8).rotateX(Math.PI / 2).translate(0, 0.68, 0), M(it)));
    const decal = new THREE.MeshBasicMaterial({ map: memePrintTex('STOP', it.c || '#c92a46', '#ffffff') });
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.10).translate(0, 0.68, 0.012), decal));
    add([hand, g]);
  },

  spray_bottle: (d, it, add) => {
    const { hand, g } = lh(d, 0.72, 0, -0.1);
    g.add(mesh(cyl(0.036, 0.044, 0.14, 14).translate(0, 0.02, 0.02), M(it)));
    g.add(mesh(box(0.028, 0.040, 0.078).translate(0, 0.11, 0.038), A(it)));
    add([hand, g]);
  },
};
