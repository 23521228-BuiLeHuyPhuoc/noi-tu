// @ts-nocheck
// poses.js — 11 active runway poses (+ idle), NO 360° spin, each auto-triggering its matching facial expression.

export const POSES = [
  { id: 'catwalk',   emoji: '👠', name: 'Catwalk',       expr: 'confident' },
  { id: 'finale',    emoji: '✨', name: 'Chốt dáng',     expr: 'wink' },
  { id: 'blow_kiss', emoji: '💋', name: 'Hôn gió',       expr: 'kiss' },
  { id: 'flex',      emoji: '💪', name: 'Gồng cơ',       expr: 'confident' },
  { id: 'selfie',    emoji: '🤳', name: 'Selfie lầy',    expr: 'blep' },
  { id: 'trip',      emoji: '🌀', name: 'Vấp té',        expr: 'dizzy' },
  { id: 'dance',     emoji: '💃', name: 'Nhảy',          expr: 'grin' },
  { id: 'wave',      emoji: '👋', name: 'Vẫy tay',       expr: 'happy' },
  { id: 'superhero', emoji: '🦸', name: 'Siêu anh hùng', expr: 'cool' },
  { id: 'shy_pose',  emoji: '🙈', name: 'Ngại ngùng',    expr: 'shy' },
  { id: 'dramatic',  emoji: '😱', name: 'Kịch tính',     expr: 'surprised' },
];

export const POSE_EXPR = Object.fromEntries(POSES.map((p) => [p.id, p.expr]));

function applyPropGrip(d, Ar, sp, isWalk, swing) {
  const k = d.heldLeftKind;
  if (!k) return;
  if (k === 'guitar') {
    // Natural rock-star hand placement: left hand near fretboard, right hand poised near strings
    Ar[-1].sh.rotation.set(-0.35 + (isWalk ? -0.10 * swing : 0), 0.18, -(sp + 0.14));
    Ar[-1].el.rotation.set(-0.78, 0, 0.35);
    Ar[1].sh.rotation.set(-0.22 + (isWalk ? 0.10 * swing : 0), -0.18, sp + 0.12);
    Ar[1].el.rotation.set(-0.62, 0, -0.35);
    return;
  }
  const elBend = k === 'upright' ? -0.82 : (k === 'umbrella' ? -0.68 : (k === 'wand' ? -0.60 : -0.45));
  Ar[-1].sh.rotation.x = isWalk ? -0.14 * swing : 0.02;
  Ar[-1].el.rotation.x = elBend;
}

export function animate(d, rawMode, t = 0) {
  const mode = rawMode === 'walk' ? 'catwalk' : (rawMode === 'pose' ? 'finale' : (rawMode || 'idle'));
  const j = d.j, L = j.leg, Ar = j.arm;
  const sp = 0.12 + (d.armSpread || 0);

  // Sync matching pose facial expression only when changed
  const wantExpr = mode === 'idle' ? null : (POSE_EXPR[mode] || null);
  if (d.setPoseExpression) d.setPoseExpression(wantExpr);

  // Clean reset
  for (const s of [1, -1]) {
    L[s].th.rotation.set(0, 0, 0);
    L[s].kn.rotation.set(0, 0, 0);
    L[s].ft.rotation.set(0, 0, 0);
    Ar[s].sh.rotation.set(0, 0, s * sp);
    Ar[s].el.rotation.set(-0.08, 0, -s * (d.armSpread || 0) * 0.35);
    Ar[s].hand.rotation.set(0, 0, 0);
  }
  j.hips.rotation.set(0, 0, 0);
  j.chest.rotation.set(0, 0, 0);
  j.neck.rotation.set(0, 0, 0);
  j.head.rotation.set(0, 0, 0);
  d.root.position.y = 0;

  if (mode === 'idle') {
    const b = Math.sin(t * 2);
    j.chest.rotation.z = 0.014 * b;
    j.head.rotation.z = 0.028 * Math.sin(t * 1.3);
    j.hips.rotation.y = 0.038 * Math.sin(t * 0.7);
    Ar[1].sh.rotation.z = sp + 0.018 * b;
    Ar[-1].sh.rotation.z = -sp - 0.018 * b;
    applyPropGrip(d, Ar, sp, false, 0);
    return;
  }

  if (mode === 'catwalk') {
    const p = t * 6.5, s = Math.sin(p), c = Math.cos(p);
    L[1].th.rotation.x = -0.44 * s; L[-1].th.rotation.x = 0.44 * s;
    L[1].kn.rotation.x = 0.58 * Math.max(0, c); L[-1].kn.rotation.x = 0.58 * Math.max(0, -c);
    Ar[1].sh.rotation.x = 0.38 * s; Ar[-1].sh.rotation.x = -0.38 * s;
    j.hips.rotation.y = 0.13 * s; j.hips.rotation.z = 0.05 * s;
    j.chest.rotation.y = -0.14 * s;
    d.root.position.y = 0.012 * Math.abs(c);
    applyPropGrip(d, Ar, sp, true, s);
    return;
  }

  if (mode === 'finale') {
    const sw = Math.sin(t * 2.5) * 0.04;
    Ar[1].sh.rotation.set(0, 0, Math.max(0.55, sp + 0.25));
    Ar[1].el.rotation.set(-0.2, 0, -1.55);
    Ar[-1].sh.rotation.set(-0.25, 0, -2.55 + sw);
    Ar[-1].el.rotation.set(-0.2, 0, -0.45);
    j.hips.rotation.set(0, 0.16, -0.09);
    j.chest.rotation.set(0, -0.10, 0.05);
    j.head.rotation.set(0.04, -0.10, 0.16);
    L[-1].th.rotation.set(-0.18, 0, -0.08);
    L[-1].kn.rotation.set(0.28, 0, 0);
    return;
  }

  if (mode === 'blow_kiss') {
    const k = Math.sin(t * 4.0) * 0.5 + 0.5;
    Ar[1].sh.rotation.set(-1.35 + k * 0.35, -0.25, 0.52 + k * 0.28);
    Ar[1].el.rotation.set(-1.15 + k * 0.65, 0, -0.35);
    Ar[-1].sh.rotation.set(0, 0, -Math.max(0.52, sp + 0.22));
    Ar[-1].el.rotation.set(-0.15, 0, 1.45);
    j.hips.rotation.set(0, -0.12, 0.08);
    j.head.rotation.set(-0.04, 0.08, -0.14);
    L[1].th.rotation.set(-0.14, 0, 0.06);
    L[1].kn.rotation.set(0.22, 0, 0);
    return;
  }

  if (mode === 'flex') {
    const p = Math.sin(t * 5) * 0.06;
    for (const s of [1, -1]) {
      Ar[s].sh.rotation.set(-0.25, 0, s * (1.42 + p));
      Ar[s].el.rotation.set(-0.35, 0, s * (1.65 + p));
      L[s].th.rotation.set(0, 0, s * 0.14);
    }
    j.chest.rotation.set(-0.08, 0, 0);
    j.head.rotation.set(0.05, 0.08, -0.04);
    return;
  }

  if (mode === 'selfie') {
    const w = Math.sin(t * 3) * 0.05;
    // Left arm extended forward/up snapping selfie, right arm framing cheek!
    Ar[-1].sh.rotation.set(-1.55, 0.22, -0.42 + w);
    Ar[-1].el.rotation.set(-0.28, 0, 0.15);
    Ar[1].sh.rotation.set(-0.95, -0.2, 0.85);
    Ar[1].el.rotation.set(-1.45, 0, -0.55);
    j.hips.rotation.set(0, 0.18, -0.07);
    j.head.rotation.set(0.05, -0.12, 0.22);
    L[1].th.rotation.set(-0.14, 0, 0.08);
    L[1].kn.rotation.set(0.24, 0, 0);
    return;
  }

  if (mode === 'trip') {
    const w = Math.sin(t * 9) * 0.14;
    j.hips.rotation.set(0.28, 0.12, 0.18);
    j.chest.rotation.set(0.22, -0.15, 0.10);
    j.head.rotation.set(-0.18, 0.15, -0.28);
    Ar[1].sh.rotation.set(-0.85 + w, 0, 1.55);
    Ar[1].el.rotation.set(-0.4, 0, 0.2);
    Ar[-1].sh.rotation.set(0.55 - w, 0, -1.65);
    Ar[-1].el.rotation.set(-0.5, 0, -0.3);
    L[1].th.rotation.set(-0.48, 0, 0.12); L[1].kn.rotation.set(0.75, 0, 0);
    L[-1].th.rotation.set(0.42, 0, -0.16); L[-1].kn.rotation.set(0.45, 0, 0);
    d.root.position.y = -0.04;
    return;
  }

  if (mode === 'dance') {
    const p = t * 7.0, s = Math.sin(p), c = Math.cos(p);
    j.hips.rotation.set(0, 0.22 * s, 0.11 * s);
    j.chest.rotation.set(0, -0.18 * s, -0.07 * s);
    j.head.rotation.set(0, 0.10 * s, 0.12 * c);
    Ar[1].sh.rotation.set(-0.6 + 0.55 * s, 0, 1.35 + 0.55 * c);
    Ar[1].el.rotation.set(-0.7, 0, 0.65 * s);
    Ar[-1].sh.rotation.set(-0.6 - 0.55 * s, 0, -1.35 - 0.55 * c);
    Ar[-1].el.rotation.set(-0.7, 0, -0.65 * s);
    L[1].th.rotation.set(-0.22 * Math.max(0, s), 0, 0.08);
    L[1].kn.rotation.set(0.38 * Math.max(0, s), 0, 0);
    L[-1].th.rotation.set(-0.22 * Math.max(0, -s), 0, -0.08);
    L[-1].kn.rotation.set(0.38 * Math.max(0, -s), 0, 0);
    d.root.position.y = 0.025 * Math.abs(c);
    return;
  }

  if (mode === 'wave') {
    const w = Math.sin(t * 7.5);
    Ar[1].sh.rotation.set(-0.18, 0, 2.35 + 0.24 * w);
    Ar[1].el.rotation.set(-0.25, 0, 0.42 + 0.35 * w);
    Ar[-1].sh.rotation.set(0, 0, -Math.max(0.48, sp + 0.20));
    Ar[-1].el.rotation.set(-0.15, 0, 1.35);
    j.hips.rotation.set(0, -0.08, 0.06);
    j.head.rotation.set(0, 0.06, -0.12 + 0.04 * w);
    return;
  }

  if (mode === 'superhero') {
    for (const s of [1, -1]) {
      Ar[s].sh.rotation.set(0.08, 0, s * Math.max(0.62, sp + 0.28));
      Ar[s].el.rotation.set(-0.22, 0, -s * 1.50);
      L[s].th.rotation.set(0, 0, s * 0.16);
    }
    j.chest.rotation.set(-0.10, 0, 0);
    j.head.rotation.set(-0.08, -0.08, 0.04);
    return;
  }

  if (mode === 'shy_pose') {
    const b = Math.sin(t * 3.0) * 0.04;
    for (const s of [1, -1]) {
      Ar[s].sh.rotation.set(-0.85, -s * 0.25, s * (0.48 + b));
      Ar[s].el.rotation.set(-1.35, 0, -s * 0.35);
      L[s].th.rotation.set(-0.08, -s * 0.18, -s * 0.04);
      L[s].kn.rotation.set(0.14, 0, 0);
    }
    j.chest.rotation.set(0.08, 0, 0.06);
    j.head.rotation.set(0.12, -0.14, 0.18);
    return;
  }

  if (mode === 'dramatic') {
    const sh = Math.sin(t * 8) * 0.06;
    for (const s of [1, -1]) {
      Ar[s].sh.rotation.set(-0.95, 0, s * (1.28 + sh));
      Ar[s].el.rotation.set(-1.10, 0, -s * 0.28);
      L[s].th.rotation.set(-0.22, 0, s * 0.12);
      L[s].kn.rotation.set(0.32, 0, 0);
    }
    j.chest.rotation.set(-0.14, 0, 0);
    j.head.rotation.set(-0.12, 0, 0.10);
    d.root.position.y = -0.02;
  }
}
