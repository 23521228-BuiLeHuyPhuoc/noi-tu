/**
 * Mô phỏng vật lý 2 xúc xắc trong khay (viết tay, không phụ thuộc thư viện):
 * - Vật rắn hình lập phương cạnh 1, khối lượng 1, quán tính đẳng hướng I = 1/6.
 * - Va chạm 8 đỉnh với sàn, 4 vách và trần bằng xung lượng tuần tự (đàn hồi + ma sát Coulomb);
 *   hai viên va nhau xấp xỉ bằng hai quả cầu.
 * - Tích phân 120 Hz, ghi lại 30 khung/giây (quaternion + vị trí) cho client phát lại.
 *
 * CÔNG BẰNG: client chỉ gửi hướng + lực (đã bị kẹp). Server cộng thêm nhiễu ngẫu nhiên vào trạng
 * thái đầu (hướng viên xúc xắc "trong tay" ngẫu nhiên hoàn toàn, vận tốc/góc lệch vài %), nên người
 * chơi không thể tính trước mặt nào sẽ ngửa; mặt trên khi cả hai viên nằm yên chính là kết quả.
 * Hàm nhận `rng` để test có thể tiêm nhiễu xác định.
 */
import {
  DICE_FACES, DICE_FPS, DICE_PLAY_FPS, TRAY_HX, TRAY_HZ, sanitizeImpulse, type ThrowImpulse,
} from '../../../shared/src/dice';
import { TYPHU_ROLL_MAX_MS, TYPHU_ROLL_MIN_MS } from '../../../shared/src/typhu';

type V = [number, number, number];
type Q = [number, number, number, number]; // x, y, z, w

interface Body { p: V; v: V; q: Q; w: V }

const H = 0.5;
const GRAVITY = -36;
const DT = 1 / 120;
const STEPS_PER_FRAME = 120 / DICE_FPS;
const INV_I = 6; // 1 / (m * s^2 / 6)
const CORNERS: V[] = [];
for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) CORNERS.push([sx * H, sy * H, sz * H]);
const CEIL = 5;

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a: V) => Math.hypot(a[0], a[1], a[2]);

function qMul(a: Q, b: Q): Q {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
function qNorm(q: Q): Q {
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}
function qRot(q: Q, v: V): V {
  // v' = v + 2w(u×v) + 2u×(u×v)
  const u: V = [q[0], q[1], q[2]];
  const t = mul(cross(u, v), 2);
  return add(add(v, mul(t, q[3])), cross(u, t));
}
function qAxisAngle(axis: V, angle: number): Q {
  const l = len(axis) || 1;
  const s = Math.sin(angle / 2) / l;
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}
/** quaternion xoay ngắn nhất đưa hướng đơn vị a về b */
function qFromTo(a: V, b: V): Q {
  const d = dot(a, b);
  if (d < -0.999999) return qAxisAngle(Math.abs(a[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1], Math.PI);
  const c = cross(a, b);
  return qNorm([c[0], c[1], c[2], 1 + d]);
}
function qSlerpish(a: Q, b: Q, t: number): Q {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const s = d < 0 ? -1 : 1;
  return qNorm([a[0] + (s * b[0] - a[0]) * t, a[1] + (s * b[1] - a[1]) * t, a[2] + (s * b[2] - a[2]) * t, a[3] + (s * b[3] - a[3]) * t]);
}

interface Plane { n: V; d: number; e: number }
/** các mặt phẳng: n·x >= d là phía trong khay */
const PLANES: Plane[] = [
  { n: [0, 1, 0], d: 0, e: 0.38 },
  { n: [1, 0, 0], d: -TRAY_HX, e: 0.55 },
  { n: [-1, 0, 0], d: -TRAY_HX, e: 0.55 },
  { n: [0, 0, 1], d: -TRAY_HZ, e: 0.55 },
  { n: [0, 0, -1], d: -TRAY_HZ, e: 0.55 },
  { n: [0, -1, 0], d: -CEIL, e: 0.4 },
];
const MU = 0.5;

function solvePlanes(b: Body): void {
  for (let it = 0; it < 4; it++) {
    for (const pl of PLANES) {
      let deepest = 0;
      for (const c of CORNERS) {
        const r = qRot(b.q, c);
        const wp = add(b.p, r);
        const dist = dot(pl.n, wp) - pl.d;
        if (dist >= 0) continue;
        deepest = Math.min(deepest, dist);
        const vp = add(b.v, cross(b.w, r));
        const vn = dot(vp, pl.n);
        if (vn >= 0) continue;
        const rn = cross(r, pl.n);
        const denom = 1 + INV_I * dot(rn, rn);
        const e = -vn > 1.2 ? pl.e : 0;
        const j = (-(1 + e) * vn) / denom;
        const imp = mul(pl.n, j);
        b.v = add(b.v, imp);
        b.w = add(b.w, mul(cross(r, imp), INV_I));
        // ma sát
        const vp2 = add(b.v, cross(b.w, r));
        const vt = sub(vp2, mul(pl.n, dot(vp2, pl.n)));
        const vtl = len(vt);
        if (vtl > 1e-6) {
          const t = mul(vt, 1 / vtl);
          const rt = cross(r, t);
          const dt = 1 + INV_I * dot(rt, rt);
          const jt = Math.min(vtl / dt, MU * j);
          const fimp = mul(t, -jt);
          b.v = add(b.v, fimp);
          b.w = add(b.w, mul(cross(r, fimp), INV_I));
        }
      }
      if (deepest < 0) b.p = add(b.p, mul(pl.n, -deepest));
    }
  }
}

function solvePair(a: Body, b: Body): void {
  const d = sub(b.p, a.p);
  const dist = len(d);
  const R = 1.18; // bán kính "cầu" xấp xỉ khối
  if (dist < R && dist >= 1e-6) {
    const n = mul(d, 1 / dist);
    const push = (R - dist) / 2;
    a.p = sub(a.p, mul(n, push));
    b.p = add(b.p, mul(n, push));
    const vn = dot(sub(b.v, a.v), n);
    if (vn < 0) {
      const j = (-(1 + 0.35) * vn) / 2;
      a.v = sub(a.v, mul(n, j));
      b.v = add(b.v, mul(n, j));
    }
  }
  // tránh hai viên chồng lên nhau theo phương ngang (x, z) làm che khuất mặt chấm
  const hx = b.p[0] - a.p[0];
  const hz = b.p[2] - a.p[2];
  const hDist = Math.hypot(hx, hz);
  const minH = 1.28;
  if (hDist < minH && Math.abs(b.p[1] - a.p[1]) < 1.1) {
    const ux = hDist > 1e-4 ? hx / hDist : 1;
    const uz = hDist > 1e-4 ? hz / hDist : 0;
    const hPush = (minH - hDist) * 0.5;
    a.p[0] -= ux * hPush;
    a.p[2] -= uz * hPush;
    b.p[0] += ux * hPush;
    b.p[2] += uz * hPush;
  }
}

/** Mặt ngửa của một viên theo quaternion hiện tại: chỉ số trong DICE_FACES */
function topFace(q: Q): number {
  let best = 0;
  let by = -2;
  DICE_FACES.forEach((f, i) => {
    const y = qRot(q, f.n)[1];
    if (y > by) { by = y; best = i; }
  });
  return best;
}

export interface ThrowResult {
  dice: [number, number];
  frames: number[];
  ms: number;
  fps: number;
}

export type DiceRoller = (impulse: ThrowImpulse, rng: () => number) => ThrowResult;

const q3 = (n: number) => Math.round(n * 1000) / 1000;

export function simulateThrow(input: ThrowImpulse, rng: () => number): ThrowResult {
  const imp = sanitizeImpulse(input);
  const jit = (s: number) => (rng() - 0.5) * 2 * s;
  const speed = 6.5 + 7.5 * imp.p;
  const dir: V = [imp.x, 0, imp.z];
  const bodies: Body[] = [0, 1].map((i) => {
    // viên xúc xắc "trong tay": hướng hoàn toàn ngẫu nhiên (người chơi không nhìn thấy/chọn được)
    const q = qNorm([rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5]);
    const spread = i === 0 ? -0.5 : 0.5;
    const side = cross([0, 1, 0], dir);
    const p: V = [
      -dir[0] * 1.6 + side[0] * spread + jit(0.06),
      1.7 + i * 0.25,
      -dir[2] * 0.7 + side[2] * spread + jit(0.06),
    ];
    const v: V = [dir[0] * speed * (1 + jit(0.04)), 3.2 + 2.6 * imp.p + jit(0.15), dir[2] * speed * (1 + jit(0.04))];
    // quay quanh trục vuông góc hướng bay (lăn tới), cộng xoay ngang theo lực
    const spin = 9 + 12 * imp.p;
    const w: V = [dir[2] * spin * (1 + jit(0.05)) + jit(0.4), (spread * 6) + jit(0.5), -dir[0] * spin * (1 + jit(0.05)) + jit(0.4)];
    return { p, v, q, w };
  });
  // đặt vị trí xuất phát trong khay (kẹp để không nằm ngoài vách)
  for (const b of bodies) {
    b.p[0] = Math.max(-TRAY_HX + 0.9, Math.min(TRAY_HX - 0.9, b.p[0]));
    b.p[2] = Math.max(-TRAY_HZ + 0.9, Math.min(TRAY_HZ - 0.9, b.p[2]));
  }

  const frames: number[] = [];
  const record = () => {
    for (const b of bodies) frames.push(q3(b.p[0]), q3(b.p[1]), q3(b.p[2]), q3(b.q[0]), q3(b.q[1]), q3(b.q[2]), q3(b.q[3]));
  };
  record();
  const maxFrames = Math.round((TYPHU_ROLL_MAX_MS / 1000) * DICE_PLAY_FPS) - 6;
  let calm = 0;
  let nFrames = 1;
  let restFrame = -1;
  for (let step = 1; nFrames < maxFrames; step++) {
    const t = step * DT;
    // sau ~0,9s tăng dần ma sát để chắc chắn đứng yên trong thời gian cho phép (~1,6-2 s)
    const extra = t > 0.55 ? Math.min(16, (t - 0.55) * 16) : 0;
    for (const b of bodies) {
      b.v = [b.v[0] * (1 - 0.15 * DT), b.v[1] + GRAVITY * DT, b.v[2] * (1 - 0.15 * DT)];
      const damp = 1 - (0.6 + extra) * DT;
      b.w = mul(b.w, damp);
      if (extra > 0) b.v = [b.v[0] * (1 - extra * 0.5 * DT), b.v[1], b.v[2] * (1 - extra * 0.5 * DT)];
      // khi viên xúc xắc đã chạm sàn và chậm dần, kéo nhẹ về mặt gần nhất để không bị kẹt nghiêng trên cạnh
      if (t > 0.45 && b.p[1] < 0.78) {
        const up = qRot(b.q, DICE_FACES[topFace(b.q)].n);
        const align = cross(up, [0, 1, 0]);
        b.w = add(b.w, mul(align, 18 * DT));
      }
      b.p = add(b.p, mul(b.v, DT));
      const dq = qMul([b.w[0] * DT * 0.5, b.w[1] * DT * 0.5, b.w[2] * DT * 0.5, 0], b.q);
      b.q = qNorm([b.q[0] + dq[0], b.q[1] + dq[1], b.q[2] + dq[2], b.q[3] + dq[3]]);
    }
    solvePair(bodies[0], bodies[1]);
    for (const b of bodies) solvePlanes(b);
    if (step % STEPS_PER_FRAME === 0) {
      record();
      nFrames++;
      const still = bodies.every((b) => len(b.v) < 0.12 && len(b.w) < 0.6 && b.p[1] < 0.58 && qRot(b.q, DICE_FACES[topFace(b.q)].n)[1] > 0.92);
      calm = still ? calm + 1 : 0;
      if (calm >= 6) { restFrame = nFrames; break; }
    }
  }
  if (restFrame < 0) restFrame = nFrames;

  // chốt kết quả: mặt trên của mỗi viên, rồi xoay nhẹ cho nằm phẳng đúng mặt đó ở vài khung cuối
  const faces = bodies.map((b) => topFace(b.q));
  const SNAP = 6;
  const flat = bodies.map((b, i) => {
    const up = qRot(b.q, DICE_FACES[faces[i]].n);
    return qNorm(qMul(qFromTo(up, [0, 1, 0]), b.q));
  });
  const stride = 14;
  const total = frames.length / stride;
  for (let f = Math.max(0, total - SNAP); f < total; f++) {
    const s = (f - (total - SNAP) + 1) / SNAP;
    bodies.forEach((_, i) => {
      const o = f * stride + i * 7;
      const q = qSlerpish([frames[o + 3], frames[o + 4], frames[o + 5], frames[o + 6]], flat[i], s);
      frames[o + 1] = q3(frames[o + 1] + (H - frames[o + 1]) * s);
      frames[o + 3] = q3(q[0]); frames[o + 4] = q3(q[1]); frames[o + 5] = q3(q[2]); frames[o + 6] = q3(q[3]);
    });
  }
  // giữ khung cuối nằm yên hoàn toàn ít nhất 6 khung (~300ms) và tổng thời lượng ≥ TYPHU_ROLL_MIN_MS
  const minFrames = Math.max(total + 6, Math.round((TYPHU_ROLL_MIN_MS / 1000) * DICE_PLAY_FPS));
  const lastFrame = frames.slice(frames.length - stride);
  while (frames.length / stride < minFrames) frames.push(...lastFrame);
  const ms = Math.round((frames.length / stride / DICE_PLAY_FPS) * 1000);
  return { dice: [DICE_FACES[faces[0]].v, DICE_FACES[faces[1]].v], frames, ms, fps: DICE_PLAY_FPS };
}
