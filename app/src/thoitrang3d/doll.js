// @ts-nocheck
// doll.js — main Doll orchestrator combining modular body, face, hair, wardrobe, dynamic hat-lift & runway poses.
import * as THREE from 'three';
import {
  gradient, toon, basicMat, countTriangles,
  SKINS, EYECOL, LIPCOL, SHADOWCOL, PALETTE, HAIRCOL, PATTERNS,
} from './core.js';
import { BODY_TYPES, BODY_DEFAULTS, Y, resolveBodyType, buildBody } from './body.js';
import { FACE_OPTS, EXPRESSIONS, buildFace } from './face.js';
import { HAIR_BUILD as HAIR_BASE } from './hair.js';
import { HAIR_BUILD_EXTRA } from './hair-extra.js';
import { TOP_BUILD as TOP_BASE } from './wear-tops.js';
import { TOP_BUILD_EXTRA } from './wear-tops-extra.js';
import { OUTER_BUILD as OUTER_BASE } from './wear-outer.js';
import { OUTER_BUILD_EXTRA } from './wear-outer-extra.js';
import { BOTTOM_BUILD as BOTTOM_BASE } from './wear-bottoms.js';
import { BOTTOM_BUILD_EXTRA } from './wear-bottoms-extra.js';
import { DRESS_BUILD as DRESS_BASE } from './wear-dresses.js';
import { DRESS_BUILD_EXTRA } from './wear-dresses-extra.js';
import { SHOE_BUILD as SHOE_BASE, HAT_BUILD as HAT_BASE, GLASSES_BUILD as GLASSES_BASE, CLOSED_HATS as CLOSED_HATS_BASE } from './wear-shoes-hats.js';
import { SHOE_BUILD_EXTRA, HAT_BUILD_EXTRA, GLASSES_BUILD_EXTRA, CLOSED_HATS_EXTRA } from './wear-shoes-hats-extra.js';
import { ACC_BUILD as ACC_BASE, ACC_SUB as ACC_SUB_BASE, HELD_KINDS as HELD_KINDS_BASE } from './wear-acc.js';
import { ACC_BUILD_EXTRA, ACC_SUB_EXTRA, HELD_KINDS_EXTRA } from './wear-acc-extra.js';
import {
  MENSWEAR_HAIR, MENSWEAR_TOP, MENSWEAR_OUTER, MENSWEAR_BOTTOM,
  MENSWEAR_DRESS, MENSWEAR_SHOES, MENSWEAR_HATS, MENSWEAR_CLOSED_HATS,
  MENSWEAR_ACC, MENSWEAR_ACC_SUB, MENSWEAR_HELD_KINDS,
} from './wear-menswear-extra.js';
import { applyVisualSpec } from './wear-parametric.js';
import { CATALOG, CATALOG_META, getMeta } from './catalog.js';
import { POSES, animate } from './poses.js';

export const CLOSED_HATS = new Set([...CLOSED_HATS_BASE, ...CLOSED_HATS_EXTRA, ...MENSWEAR_CLOSED_HATS]);
export const ACC_SUB = { ...ACC_SUB_BASE, ...ACC_SUB_EXTRA, ...MENSWEAR_ACC_SUB };
export const HELD_KINDS = { ...HELD_KINDS_BASE, ...HELD_KINDS_EXTRA, ...MENSWEAR_HELD_KINDS };

export {
  SKINS, EYECOL, LIPCOL, SHADOWCOL, PALETTE, HAIRCOL, PATTERNS,
  BODY_TYPES, BODY_DEFAULTS, Y, FACE_OPTS, EXPRESSIONS, CATALOG, CATALOG_META, getMeta,
  POSES, animate, toon, countTriangles,
};

export const BUILD = {
  hair: { ...HAIR_BASE, ...HAIR_BUILD_EXTRA, ...MENSWEAR_HAIR },
  bottom: { ...BOTTOM_BASE, ...BOTTOM_BUILD_EXTRA, ...MENSWEAR_BOTTOM },
  top: { ...TOP_BASE, ...TOP_BUILD_EXTRA, ...MENSWEAR_TOP },
  dress: { ...DRESS_BASE, ...DRESS_BUILD_EXTRA, ...MENSWEAR_DRESS },
  outer: { ...OUTER_BASE, ...OUTER_BUILD_EXTRA, ...MENSWEAR_OUTER },
  shoes: { ...SHOE_BASE, ...SHOE_BUILD_EXTRA, ...MENSWEAR_SHOES },
  hat: { ...HAT_BASE, ...HAT_BUILD_EXTRA, ...MENSWEAR_HATS },
  glasses: { ...GLASSES_BASE, ...GLASSES_BUILD_EXTRA },
  acc: { ...ACC_BASE, ...ACC_BUILD_EXTRA, ...MENSWEAR_ACC },
};

const SLOT_ORDER = ['hair', 'bottom', 'top', 'dress', 'outer', 'shoes', 'hat', 'glasses', 'acc'];
const SIL_MAT = basicMat('#261a2e', { doubleSide: true });

export class Doll {
  constructor(opts = {}) {
    this.root = new THREE.Group();
    this.slots = {};
    this.outfit = null;
    this.ghost = !!opts.ghost;
    this.silhouette = !!opts.silhouette;
    this._poseExpr = null;
    this.build(opts.type || 'nu_manh', opts.skin || SKINS[1], opts.height || 1.0);
  }

  skinMat(c) {
    if (this.silhouette) return SIL_MAT;
    if (this.ghost) {
      return new THREE.MeshToonMaterial({ color: '#e9e3f0', gradientMap: gradient, transparent: true, opacity: 0.55 });
    }
    return toon(c);
  }

  build(type, skin, height = 1.0) {
    buildBody(this, type, skin, height);
    if (!this.ghost && !this.silhouette) this._renderFace();
    if (this.outfit) this.apply(this.outfit);
  }

  _faceCfg() {
    const o = this.outfit || {};
    const f = o.face || {};
    return {
      ...f,
      eyeColor: f.eyeColor || o.eye || '#4a2d24',
      lipColor: f.lipColor || o.lip || '#e0707a',
      hairColor: f.hairColor || (o.hair && o.hair.c) || '#33211b',
    };
  }

  _renderFace() {
    if (this.ghost || this.silhouette) { this.face.clear(); return; }
    buildFace(this, this._faceCfg(), this._poseExpr);
  }

  setPoseExpression(expr) {
    const next = expr || null;
    if (this._poseExpr === next) return;
    this._poseExpr = next;
    this._renderFace();
  }

  setSilhouette(on) {
    const flag = !!on;
    if (this.silhouette === flag) return;
    this.silhouette = flag;
    if (this.outfit) {
      const keep = this.outfit;
      this.outfit = null;
      this.build(keep.type || this.type, keep.skin || this.skin, keep.height || this.height);
      this.apply(keep);
    }
  }

  clear(slot) {
    const g = this.slots[slot];
    if (g) g.forEach((m) => m.parent && m.parent.remove(m));
    this.slots[slot] = [];
  }

  put(slot, parent, m) {
    parent.add(m);
    this.slots[slot].push(m);
    return m;
  }

  // Measure real top Y of visible hair over the crown in normalized head units (sy=1)
  _measureHairCrownY() {
    const sx = this.T.headRx / 0.175, sy = this.T.headRy / 0.170, sz = this.T.headRz / 0.165;
    let maxY = 0.174; // bare head top
    for (const m of this.slots.hair || []) {
      if (!m.visible || !m.geometry) continue;
      const p = m.geometry.attributes.position;
      if (!p) continue;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i) / sx, vy = p.getY(i) / sy, vz = p.getZ(i) / sz;
        // Sample the crown region above the head (ignoring far-back ponytails/man-buns & far-side space buns)
        if (Math.abs(vx) < 0.115 && vz > -0.105 && vz < 0.135 && vy > maxY) maxY = vy;
      }
    }
    return maxY;
  }

  apply(o) {
    this.outfit = JSON.parse(JSON.stringify(o));
    this.armSpread = 0;
    this.topInf = 0;
    this.topSleeveInf = 0;
    this.outerInf = 0;
    this.skirtExtra = 0;
    this.legCalfInf = 0;
    this.legFrac = 0;
    this.heldLeftKind = null;
    this.hairCrownY = 0.210;

    const wantType = resolveBodyType(o.type || 'nu_manh');
    const wantSkin = o.skin || this.skin || SKINS[1];
    const wantH = Math.min(1.15, Math.max(0.85, Number(o.height) || 1.0));
    if (wantType !== this.type || wantSkin !== this.skin || Math.abs(wantH - this.height) > 0.001) {
      const keep = this.outfit;
      this.outfit = null;
      this.build(wantType, wantSkin, wantH);
      this.outfit = keep;
    }

    if (!this.ghost) this._renderFace();

    for (const slot of SLOT_ORDER) {
      this.clear(slot);

      // Right before building `hat`: hide closed-hat hair volume FIRST, then measure REAL hair crown top!
      if (slot === 'hat') {
        const hatBase = o.hat && ((o.hat.v3d && o.hat.v3d.base) || o.hat.id);
        if (hatBase && CLOSED_HATS.has(hatBase)) {
          const sy = this.T.headRy / 0.170;
          for (const m of this.slots.hair || []) {
            if (m.userData && m.userData.hatHide) { m.visible = false; continue; }
            if (m.geometry) {
              m.geometry.computeBoundingSphere();
              const bs = m.geometry.boundingSphere;
              if (bs && bs.center.y > 0.135 * sy && bs.radius < 0.115 * sy) m.visible = false;
            }
          }
        }
        this.hairCrownY = this._measureHairCrownY();
      }

      const raw = o[slot];
      if (!raw) continue;
      if (slot === 'dress' && (o.top || o.bottom)) continue;

      const list = Array.isArray(raw) ? raw : [raw];
      for (const it of list) {
        if (!it || !it.id) continue;
        const baseId = (it.v3d && it.v3d.base) || it.id;
        if (slot === 'acc' && HELD_KINDS[baseId]) this.heldLeftKind = HELD_KINDS[baseId];
        const fn = BUILD[slot][baseId] || BUILD[slot][it.id];
        if (fn) applyVisualSpec(this, slot, it, it.v3d || null, fn, (pair) => this.put(slot, pair[0], pair[1]));
      }
    }

    // Flat dark silhouette rendering mode (used in sheet-bodies.png silhouette row!)
    if (this.silhouette) {
      this.root.traverse((obj) => {
        if (!obj.isMesh) return;
        if (obj.material && obj.material.side === THREE.BackSide) { obj.visible = false; return; }
        obj.material = SIL_MAT;
      });
    }
  }

  triangles() {
    return countTriangles(this.root);
  }
}
