// @ts-nocheck
// wear-parametric.js — 3D Parametric Modifier & Meme-Print Composer.
// Applies real 3D trim, collar, hood, glow, scale, transparency, pattern overrides & CanvasTexture slogan decals
// on top of any of the ~375 bespoke 3D archetype builders so thousands of catalog items each render distinct 3D details!
import * as THREE from 'three';
import { mesh, sph, cyl, box, cone, torus, toon, memePrintTex } from './core.js';
import { A, band, neckBand, frontTorsoZ } from './wear-helpers.js';

export function applyVisualSpec(d, slot, it, spec, baseBuildFn, rawAdd) {
  if (!spec) {
    if (baseBuildFn) baseBuildFn(d, it, rawAdd);
    return;
  }

  const effIt = {
    ...it,
    p: (it.p && it.p !== 'plain') ? it.p : (spec.forcePat || it.p || 'plain'),
  };

  const addedNodes = [];
  const wrappedAdd = (pair) => {
    addedNodes.push(pair);
    rawAdd(pair);
  };

  if (baseBuildFn) baseBuildFn(d, effIt, wrappedAdd);

  // 1. Scale / oversize / giant / crop / glow / alpha material overrides on built meshes
  const sc = spec.scale || (spec.fit === 'giant' ? 1.32 : spec.fit === 'oversize' ? 1.07 : 1);
  if (sc !== 1 && (slot === 'hat' || slot === 'glasses' || slot === 'acc' || slot === 'shoes')) {
    for (const [, obj] of addedNodes) {
      if (obj && obj.scale) obj.scale.multiplyScalar(sc);
    }
  } else if (spec.fit === 'oversize' && (slot === 'top' || slot === 'outer')) {
    for (const [, obj] of addedNodes) {
      if (obj && obj.scale) obj.scale.set(obj.scale.x * 1.06, obj.scale.y, obj.scale.z * 1.06);
    }
  }

  if (spec.glow || (spec.alpha != null && spec.alpha < 1)) {
    for (const [, obj] of addedNodes) {
      if (!obj || !obj.traverse) continue;
      obj.traverse((child) => {
        if (!child.isMesh || !child.material || child.material.side === THREE.BackSide) return;
        const cloned = child.material.clone();
        if (spec.glow && 'emissive' in cloned) {
          cloned.emissive = new THREE.Color(effIt.c2 || effIt.c || '#00e5ff');
          cloned.emissiveIntensity = 0.55;
        }
        if (spec.alpha != null && spec.alpha < 1) {
          cloned.transparent = true;
          cloned.opacity = spec.alpha;
        }
        child.material = cloned;
      });
    }
  }

  // 2. Extra 3D collars / hoods / ruffles / capelet on torso garments
  const Y = d.Y, T = d.T;
  const inf = Math.max(d.outerInf || 0, d.topInf || 0.018) + 0.006;
  if (slot === 'top' || slot === 'outer' || slot === 'dress') {
    if (spec.collar === 'fur') {
      rawAdd([d.j.chest, mesh(torus(T.neckR + 0.056, 0.036, 10, 22).scale(1.12, 0.72, 0.92).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.018, -0.005), A(effIt))]);
    } else if (spec.collar === 'hood') {
      rawAdd([d.j.chest, mesh(torus(T.neckR + 0.048, 0.034, 8, 18).scale(1, 0.65, 1.08).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.024, -0.028), A(effIt))]);
    } else if (spec.collar === 'ruffle') {
      rawAdd([d.j.chest, mesh(torus(T.neckR + 0.046, 0.022, 8, 22).scale(1.08, 0.55, 0.92).rotateX(Math.PI / 2).translate(0, Y.neck - Y.waist - 0.015, 0), A(effIt))]);
    } else if (spec.collar === 'turtle') {
      rawAdd([d.j.chest, neckBand(d, effIt, 0.052, 0.022, A(effIt))]);
    } else if (spec.collar === 'capelet') {
      rawAdd([d.j.chest, mesh(cyl(T.neckR + 0.04, T.sh + 0.08, 0.13, 20, true).scale(1, 1, 0.78).translate(0, Y.shoulder - Y.waist - 0.03, 0), A(effIt, { doubleSide: true }))]);
    }

    // 3. Extra 3D trims: gold bling, neon strips, spikes, giant bow, reflective safety strips, chain, flowers!
    const fz = frontTorsoZ(d, Y.chest, inf);
    if (spec.trim === 'gold') {
      const gm = toon('#ffd56b');
      rawAdd([d.j.chest, neckBand(d, effIt, 0.018, 0.024, gm)]);
      rawAdd([d.j.chest, band(T.waist + inf + 0.006, 0.0, 0.022, effIt, 0.78, gm)]);
    } else if (spec.trim === 'neon') {
      const nm = toon(effIt.c2 || '#00e5ff', 'plain', '#fff', { emissive: effIt.c2 || '#00e5ff', emissiveIntensity: 0.75 });
      rawAdd([d.j.chest, neckBand(d, effIt, 0.014, 0.024, nm)]);
      rawAdd([d.j.chest, band(T.waist + inf + 0.006, 0.0, 0.018, effIt, 0.78, nm)]);
    } else if (spec.trim === 'spikes') {
      const sm = toon('#e6e8ec');
      for (const s of [1, -1]) {
        for (let i = 0; i < 3; i++) {
          rawAdd([d.j.arm[s].sh, mesh(cone(0.014, 0.042, 6).rotateZ(-s * (0.2 + i * 0.25)).translate(s * (0.015 + i * 0.016), 0.048 - i * 0.012, 0), sm)]);
        }
      }
    } else if (spec.trim === 'bow') {
      const bm = A(effIt);
      rawAdd([d.j.chest, mesh(sph(0.022, 0.018, 0.016, 8, 6).translate(0, Y.chest + 0.03 - Y.waist, fz + 0.010), bm)]);
      for (const s of [1, -1]) rawAdd([d.j.chest, mesh(cone(0.028, 0.056, 4).rotateZ(s * Math.PI / 2).translate(s * 0.032, Y.chest + 0.03 - Y.waist, fz + 0.008), bm)]);
    } else if (spec.trim === 'reflective') {
      const ref = toon('#e8f4ff', 'plain', '#fff', { emissive: '#ffffff', emissiveIntensity: 0.55 });
      rawAdd([d.j.chest, band(T.waist + inf + 0.006, 0.01, 0.022, effIt, 0.78, ref)]);
      rawAdd([d.j.chest, band(T.chest + inf + 0.004, Y.chest - Y.waist, 0.020, effIt, 0.78, ref)]);
    } else if (spec.trim === 'chain') {
      const cm = toon('#d9dde6');
      rawAdd([d.j.chest, mesh(torus(T.chest * 0.72, 0.008, 6, 18, Math.PI).rotateZ(Math.PI).translate(0, Y.chest + 0.02 - Y.waist, fz + 0.008), cm, false)]);
    } else if (spec.trim === 'flowers') {
      const fm = A(effIt);
      for (const [fx, fy] of [[-0.05, 0.03], [0.05, -0.02], [0, 0.05]]) {
        rawAdd([d.j.chest, mesh(sph(0.020, 0.020, 0.012, 8, 6).translate(fx, Y.chest + fy - Y.waist, frontTorsoZ(d, Y.chest + fy, inf, fx) + 0.008), fm, false)]);
      }
    }

    // 4. Crisp front-chest meme / slogan graphic print!
    if (spec.print) {
      const decalMat = new THREE.MeshBasicMaterial({ map: memePrintTex(spec.print, '#ffffff', '#15121b') });
      const py = Y.chest - 0.005;
      const pz = frontTorsoZ(d, py, inf) + 0.010;
      rawAdd([d.j.chest, new THREE.Mesh(new THREE.PlaneGeometry(Math.min(0.18, T.chest * 1.25), 0.095).translate(0, py - Y.waist, pz), decalMat)]);
    }
  } else if (slot === 'bottom' && spec.trim === 'chain') {
    const cm = toon('#d9dde6');
    rawAdd([d.j.hips, mesh(torus(0.075, 0.007, 6, 16, Math.PI).rotateZ(Math.PI).translate(d.T.hip * 0.55, 0.02, d.T.hip * 0.72), cm, false)]);
  } else if (slot === 'bottom' && spec.trim === 'neon') {
    const nm = toon(effIt.c2 || '#00e5ff', 'plain', '#fff', { emissive: effIt.c2 || '#00e5ff', emissiveIntensity: 0.75 });
    rawAdd([d.j.hips, band(d.T.waist + 0.020, d.Y.waist - d.Y.hip, 0.020, effIt, 0.78, nm)]);
  }
}
