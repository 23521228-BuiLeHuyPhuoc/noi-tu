import { useContext, useEffect, useRef } from 'react';
import { ViewportContext } from '../hooks';
import { Platform, View } from 'react-native';
import { DICE_FRAME_STRIDE, TRAY_HX, TRAY_HZ, type DiceRollView, type ThrowImpulse } from '../../../shared/src/dice';
import { TyPhuDie } from './TyPhuFx';

type Q = [number, number, number, number];

/** Mặt xúc xắc theo hướng cục bộ (khớp DICE_FACES): giá trị -> phép biến đổi CSS đặt mặt đó trong khối lập phương */
const FACE_CSS: Record<number, string> = {
  1: '', 6: 'rotateY(180deg)', 3: 'rotateY(90deg)', 4: 'rotateY(-90deg)', 2: 'rotateX(-90deg)', 5: 'rotateX(90deg)',
};
/** pháp tuyến cục bộ của mặt có giá trị v (khớp DICE_FACES) */
const NORMAL: Record<number, [number, number, number]> = {
  1: [0, 1, 0], 6: [0, -1, 0], 3: [1, 0, 0], 4: [-1, 0, 0], 2: [0, 0, 1], 5: [0, 0, -1],
};
const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

const norm = (q: Q): Q => { const l = Math.hypot(...q) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; };
const mulQ = (a: Q, b: Q): Q => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const axisQ = (ax: number, ay: number, az: number, ang: number): Q => { const s = Math.sin(ang / 2); return [ax * s, ay * s, az * s, Math.cos(ang / 2)]; };
/** quaternion đưa pháp tuyến cục bộ n lên trục +y rồi xoay thêm `yaw` quanh y */
function restQuat(value: number, yaw: number): Q {
  const n = NORMAL[value] ?? NORMAL[1];
  const d = n[1];
  let q: Q;
  if (d > 0.9999) q = [0, 0, 0, 1];
  else if (d < -0.9999) q = [1, 0, 0, 0];
  else { const cx = n[2], cz = -n[0]; q = norm([cx, 0, cz, 1 + d]); } // n × y
  return mulQ(axisQ(0, 1, 0, yaw), q);
}

/** ma trận CSS (đã đổi hệ trục sim y-lên → CSS z hướng về người xem) cho vị trí/hướng một viên */
function matrixOf(S: number, x: number, yRaw: number, z: number, q: Q): string {
  // giới hạn độ cao hiển thị để viên xúc xắc không bay khuất khỏi khay
  const y = Math.min(yRaw, 1.8);
  const [qx, qy, qz, qw] = q;
  const r = [
    [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
    [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
    [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
  ];
  const P = [0, 2, 1];
  const c = (i: number, j: number) => r[P[i]][P[j]];
  const f = (n: number) => n.toFixed(4);
  return `matrix3d(${f(c(0, 0))},${f(c(1, 0))},${f(c(2, 0))},0,${f(c(0, 1))},${f(c(1, 1))},${f(c(2, 1))},0,${f(c(0, 2))},${f(c(1, 2))},${f(c(2, 2))},0,${f(x * S)},${f(z * S)},${f(y * S)},1)`;
}

/** đặt vị trí/hướng một viên (và bóng của nó) trong khay; chỉ gọi từ effect hoặc sự kiện, không gọi lúc render */
function setPoseOn(root: HTMLElement | null, S: number, i: number, x: number, y: number, z: number, q: Q): void {
  if (!root) return;
  const el = root.querySelector<HTMLElement>(`[data-die="${i}"]`);
  if (el) el.style.transform = matrixOf(S, x, y, z, q);
  const sh = root.querySelector<HTMLElement>(`[data-shadow="${i}"]`);
  if (sh) {
    sh.style.transform = `translate3d(${(x * S).toFixed(1)}px,${(z * S).toFixed(1)}px,1px) scale(${(0.9 + (y - 0.5) * 0.12).toFixed(3)})`;
    sh.style.opacity = String(Math.max(0.25, 1 - (y - 0.5) * 0.35) * 0.55);
  }
}
function restPoseOn(root: HTMLElement | null, S: number, v: [number, number] | null): void {
  const vals = v ?? [1, 1];
  [0, 1].forEach((i) => setPoseOn(root, S, i, i ? 0.95 : -0.95, 0.5, i ? 0.15 : -0.1, restQuat(vals[i], i ? 0.5 : -0.4)));
}

function Cube({ S, i, label }: { S: number; i: number; label: string }) {
  return (
    <div
      data-die={i}
      data-testid={`die-${i + 1}`}
      aria-label={label}
      role="img"
      style={{ position: 'absolute', left: -S / 2, top: -S / 2, width: S, height: S, transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <div
          key={v}
          style={{
            position: 'absolute', left: 0, top: 0, width: S, height: S, boxSizing: 'border-box', background: 'linear-gradient(145deg,#ffffff,#efe6e0)',
            border: `${Math.max(2, S * 0.05)}px solid #2A0A10`, borderRadius: S * 0.2, backfaceVisibility: 'hidden',
            transform: `${FACE_CSS[v]} translateZ(${S / 2}px)`,
          }}
        >
          {PIPS[v].map(([r, cc], k) => (
            <div
              key={k}
              style={{
                position: 'absolute', width: S * 0.19, height: S * 0.19, borderRadius: '50%', background: v === 1 ? '#B5121B' : '#2A0A10',
                left: `${[22, 50, 78][cc]}%`, top: `${[22, 50, 78][r]}%`, marginLeft: -S * 0.095, marginTop: -S * 0.095,
                boxShadow: 'inset 0 -2px 0 rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Khay xúc xắc 3D (chỉ web, dùng CSS 3D). Phát lại các khung hình mô phỏng của server nên mọi người thấy cùng một cú lăn.
 * Người chơi có thể vuốt trong khay: hướng + tốc độ vuốt thành xung lượng gửi lên server; chạm đơn = cú mặc định.
 */
export function TyPhuDice3D({ width, height, roll, clockOffset, values, canThrow, onThrow }: {
  width: number; height: number;
  /** cú lăn đang/vừa phát (giữ lại tới cú sau để viên xúc xắc nằm yên đúng chỗ) */
  roll: DiceRollView | null;
  clockOffset: number;
  values: [number, number] | null;
  canThrow: boolean;
  onThrow: (impulse?: ThrowImpulse) => void;
}) {
  const S = Math.max(24, Math.min(width / (2 * TRAY_HX + 1.2), height / 2.9));
  const rotated = useContext(ViewportContext)?.rotated ?? false;
  /** vector vuốt theo màn hình -> khung đã xoay 90° của giao diện */
  const toLocal = (dx: number, dy: number): [number, number] => (rotated ? [dy, -dx] : [dx, dy]);
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; y0: number; pts: { x: number; y: number; t: number }[] } | null>(null);
  const live = useRef({ offset: clockOffset, canThrow, onThrow, values });
  useEffect(() => { live.current = { offset: clockOffset, canThrow, onThrow, values }; });

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = root.current;
    if (!roll || !roll.frames.length) { restPoseOn(el, S, live.current.values); return; }
    const n = roll.frames.length / DICE_FRAME_STRIDE;
    const f = roll.frames;
    let raf = 0;
    const at = (idx: number, i: number): [number, number, number, Q] => {
      const o = idx * DICE_FRAME_STRIDE + i * 7;
      return [f[o], f[o + 1], f[o + 2], [f[o + 3], f[o + 4], f[o + 5], f[o + 6]]];
    };
    const tick = () => {
      const t = ((Date.now() + live.current.offset - roll.startedAt) / 1000) * roll.fps;
      const k = Math.max(0, Math.min(n - 1, t));
      const a = Math.floor(k);
      const b = Math.min(n - 1, a + 1);
      const u = k - a;
      for (let i = 0; i < 2; i++) {
        const A = at(a, i);
        const B = at(b, i);
        const sgn = A[3][0] * B[3][0] + A[3][1] * B[3][1] + A[3][2] * B[3][2] + A[3][3] * B[3][3] < 0 ? -1 : 1;
        const q = norm([0, 1, 2, 3].map((j) => A[3][j] + (sgn * B[3][j] - A[3][j]) * u) as Q);
        setPoseOn(el, S, i, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u, q);
      }
      if (t < n - 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [roll, S]);

  const v0 = values?.[0];
  const v1 = values?.[1];
  useEffect(() => {
    if (Platform.OS !== 'web' || roll) return;
    restPoseOn(root.current, S, v0 && v1 ? [v0, v1] : null);
  }, [v0, v1, roll, S]);

  if (Platform.OS !== 'web') {
    return (
      <View style={{ width, height, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
        {[0, 1].map((k) => <TyPhuDie key={k} testID={`die-${k + 1}`} size={Math.min(56, height - 24)} phase="reveal" elapsed={0} seed={k} value={values?.[k] ?? null} />)}
      </View>
    );
  }

  const hold = (dx: number, dz: number) => {
    const vals = live.current.values;
    [0, 1].forEach((i) => setPoseOn(root.current, S, i, (i ? 0.45 : -0.45) - 1.2 + dx, 1.5, dz + (i ? 0.2 : -0.2), restQuat(vals?.[i] ?? 1, (i ? 0.8 : -0.6) + dx * 0.5)));
  };
  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!live.current.canThrow) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { x0: e.clientX, y0: e.clientY, pts: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }] };
    hold(0, 0); // nhấc hai viên lên khỏi mặt khay như đang cầm trong tay
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.pts.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (d.pts.length > 8) d.pts.shift();
    const [lx, ly] = toLocal(e.clientX - d.x0, e.clientY - d.y0);
    hold(Math.max(-1.5, Math.min(1.5, lx / S)), Math.max(-0.8, Math.min(0.8, ly / S)));
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (!d || !live.current.canThrow) return;
    const total = Math.hypot(e.clientX - d.x0, e.clientY - d.y0);
    const first = d.pts[0];
    const last = d.pts[d.pts.length - 1];
    const dt = Math.max(16, last.t - first.t);
    const [vx, vy] = toLocal(last.x - first.x, last.y - first.y);
    const speed = Math.hypot(vx, vy) / dt; // px/ms
    if (total < 14 || speed < 0.05) return live.current.onThrow(undefined);
    const l = Math.hypot(vx, vy) || 1;
    live.current.onThrow({ x: vx / l, z: vy / l, p: Math.max(0.3, Math.min(1, speed / 1.6)) });
  };

  return (
    <div
      ref={root}
      data-testid="dice-tray"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => { drag.current = null; restPoseOn(root.current, S, live.current.values); }}
      style={{
        position: 'relative', width, height, perspective: `${Math.round(width * 2.4)}px`, perspectiveOrigin: '50% 20%',
        touchAction: 'none', userSelect: 'none', cursor: canThrow ? 'grab' : 'default',
      }}
    >
      <div style={{ position: 'absolute', left: '50%', top: '60%', width: 0, height: 0, transformStyle: 'preserve-3d', transform: 'rotateX(46deg)' }}>
        <div
          style={{
            position: 'absolute', left: -TRAY_HX * S - 6, top: -TRAY_HZ * S - 6, width: 2 * TRAY_HX * S + 12, height: 2 * TRAY_HZ * S + 12, boxSizing: 'border-box',
            background: 'radial-gradient(ellipse at 50% 40%, #1FA37F 0%, #0B6E54 100%)', border: '6px solid #8A4B2A', borderRadius: 18,
            boxShadow: '0 0 0 2px #2A0A10, inset 0 4px 14px rgba(0,0,0,0.45)',
          }}
        />
        {[0, 1].map((i) => (
          <div
            key={`s${i}`}
            data-shadow={i}
            style={{ position: 'absolute', left: -S * 0.55, top: -S * 0.55, width: S * 1.1, height: S * 1.1, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 70%)' }}
          />
        ))}
        {[0, 1].map((i) => <Cube key={`d${i}`} S={S} i={i} label={values ? `Xúc xắc ra ${values[i]}` : 'Xúc xắc'} />)}
      </div>
    </div>
  );
}
