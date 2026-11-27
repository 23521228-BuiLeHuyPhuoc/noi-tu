// @ts-nocheck
// doll.js — main Doll orchestrator combining modular body, face, hair, wardrobe, dynamic hat-lift & runway poses.
import * as THREE from 'three';
import {
  gradient, toon, basicMat, countTriangles,
  SKINS, EYECOL, LIPCOL, SHADOWCOL, PALETTE, HAIRCOL, PATTERNS,
} from './core.js';
import { BODY_TYPES, BODY_DEFAULTS, Y, resolveBodyType, buildBody } from './body.js';
import { FACE_OPTS, EXPRESSIONS, buildFace } from './face.js';
import { HAIR_BUILD } from './hair.js';
import { TOP_BUILD } from './wear-tops.js';
import { OUTER_BUILD } from './wear-outer.js';
import { BOTTOM_BUILD } from './wear-bottoms.js';
import { DRESS_BUILD } from './wear-dresses.js';
import { SHOE_BUILD, HAT_BUILD, GLASSES_BUILD, CLOSED_HATS } from './wear-shoes-hats.js';
import { ACC_BUILD, ACC_SUB, HELD_KINDS } from './wear-acc.js';
import { CATALOG, CATALOG_META, getMeta } from './catalog.js';
import { POSES, animate } from './poses.js';

export {
  SKINS, EYECOL, LIPCOL, SHADOWCOL, PALETTE, HAIRCOL, PATTERNS,
  BODY_TYPES, BODY_DEFAULTS, Y, FACE_OPTS, EXPRESSIONS, CATALOG, CATALOG_META, getMeta,
  POSES, ACC_SUB, CLOSED_HATS, animate, toon, countTriangles,
};

const BUILD = {
  hair: HAIR_BUILD,
  bottom: BOTTOM_BUILD,
  top: TOP_BUILD,
  dress: DRESS_BUILD,
  outer: OUTER_BUILD,
  shoes: SHOE_BUILD,
  hat: HAT_BUILD,
  glasses: GLASSES_BUILD,
  acc: ACC_BUILD,
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
        if (o.hat && o.hat.id && CLOSED_HATS.has(o.hat.id)) {
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
        if (slot === 'acc' && HELD_KINDS[it.id]) this.heldLeftKind = HELD_KINDS[it.id];
        const fn = BUILD[slot][it.id];
        if (fn) fn(this, it, (pair) => this.put(slot, pair[0], pair[1]));
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
