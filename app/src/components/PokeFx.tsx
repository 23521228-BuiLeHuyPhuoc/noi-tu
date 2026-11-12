/**
 * Hiệu ứng kho chọc ghẹo (shared/src/pokes.ts): 10 mẫu vẽ bằng Animated, mỗi món chỉ khác hình, màu, hạt giống.
 * Người bị chọc thấy mẫu "phủ màn hình" (mưa, dính, khổng lồ, đàn) cả màn hình; người khác chỉ thấy thu nhỏ quanh avatar.
 * Mọi vị trí ngẫu nhiên suy ra từ `variant` (hạt giống do server bốc) nên các máy thấy cùng một cảnh.
 */
import { useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactElement } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { pokeItem, type PokeCategory, type PokeItem, type PokeTemplate } from '../../../shared/src/pokes';
import type { FunEvent, PublicPlayer } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { setMood, setWobble } from '../funState';
import { ViewportContext } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT } from '../theme';
import { useFeed } from '../ui';
import { rectOf, useShake, type Rect } from './Fun';
import { PokeImg, usePokeImage } from './PokeImg';

// ---------- tiện ích ----------

type Av = Animated.Value | Animated.AnimatedInterpolation<number>;
type Sfx = Parameters<typeof play>[0];

/** bộ số ngẫu nhiên có hạt giống (mulberry32) */
export function rngOf(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length];

/** đoạn [a,b] của tiến trình t thành 0..1 (có easing) */
const seg = (t: Av, a: number, b: number, easing?: (x: number) => number) =>
  (t as Animated.Value).interpolate({ inputRange: [a, Math.max(b, a + 0.0001)], outputRange: [0, 1], extrapolate: 'clamp', easing });
/** các mốc (vào, ra) */
const kf = (t: Av, ins: number[], outs: number[]) => (t as Animated.Value).interpolate({ inputRange: ins, outputRange: outs, extrapolate: 'clamp' });
const kfs = (t: Av, ins: number[], outs: string[]) => (t as Animated.Value).interpolate({ inputRange: ins, outputRange: outs, extrapolate: 'clamp' });
/** lấy mẫu một hàm theo p 0..1 thành đường cong */
const curve = (t: Av, n: number, f: (p: number) => number) => {
  const ins = Array.from({ length: n + 1 }, (_, i) => i / n);
  return kf(t, ins, ins.map(f));
};
/** như curve nhưng giá trị là số độ */
const curveDeg = (t: Av, n: number, f: (p: number) => number) => {
  const ins = Array.from({ length: n + 1 }, (_, i) => i / n);
  return kfs(t, ins, ins.map((q) => `${f(q)}deg`));
};
const deg = (t: Av, a: number, b: number) => kfs(t, [0, 1], [`${a}deg`, `${b}deg`]);

/** chạy một cảnh `ms` mili giây: trả tiến trình 0..1, gọi `onDone` khi xong */
function useRun(ms: number, onDone?: () => void): Animated.Value {
  const t = useState(() => new Animated.Value(0))[0];
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; });
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => { if (finished) done.current?.(); });
    return () => a.stop();
  }, [t, ms]);
  return t;
}
/** gọi `fn` một lần sau `ms` */
function useLater(ms: number, fn: () => void) {
  const f = useRef(fn);
  useEffect(() => { f.current = fn; });
  useEffect(() => {
    const id = setTimeout(() => f.current(), ms);
    return () => clearTimeout(id);
  }, [ms]);
}

/** màu hạt/vết bẩn theo nhóm */
const PALETTE: Record<PokeCategory, [string, string, string]> = {
  nem: ['#8B5A2B', '#D9A441', '#5C3A1E'],
  doan: ['#E8590C', '#FFC21A', '#C92A2A'],
  dongvat: ['#3E9B4F', '#A9E34B', '#2B6E3A'],
  thoitiet: ['#339AF0', '#A5D8FF', '#FFFFFF'],
  vukhi: ['#E03131', '#FFA94D', '#495057'],
  tinhcam: ['#FF6B9D', '#FFC2D9', '#E64980'],
  bieucam: ['#FFC21A', '#FFE066', '#F08C00'],
  phep: ['#9775FA', '#D0BFFF', '#FFD43B'],
  lehoi: ['#FF6B9D', '#FFD43B', '#4DABF7'],
  xe: ['#4DABF7', '#FFFFFF', '#FFA94D'],
};
const WORDS: Partial<Record<PokeTemplate, { bad: string[]; nice: string[] }>> = {
  throw: { bad: ['BỤP!', 'CHÓC!', 'TÁCH!', 'ĐÙNG!'], nice: ['MWAH!', 'IU QUÁ!', 'DỄ THƯƠNG!'] },
  volley: { bad: ['LIÊN HOÀN!', 'TRÚNG HẾT!'], nice: ['NGẬP TRÀN!', 'IU IU IU!'] },
  rain: { bad: ['MƯA RỒI!', 'CHẠY ĐI!'], nice: ['LÃNG MẠN!', 'LẤP LÁNH!'] },
  giant: { bad: ['BÙM!', 'RẦM!', 'ÁAAA!', 'XUẤT HIỆN!'], nice: ['WOW!', 'TO QUÁ!'] },
  explode: { bad: ['BÙM!', 'ĐÙNG!!', 'NỔ!'], nice: ['LẤP LÁNH!', 'WOW!'] },
  stamp: { bad: ['RẦM!', 'ĐÈ!', 'CỘP!'], nice: ['CHỐT!', 'IU!'] },
  swarm: { bad: ['TẤN CÔNG!', 'CHẠY ĐI!'], nice: ['ĐÔNG VUI!', 'XÔN XAO!'] },
  beam: { bad: ['VÈO!', 'PHÓNG!'], nice: ['VÈO!', 'TỚI NƠI!'] },
};
const DEFAULT_SOUND: Record<PokeTemplate, Sfx> = {
  throw: 'splat', volley: 'splat', rain: 'splat', stick: 'splat', orbit: 'sparkle',
  explode: 'boom', giant: 'boing', swarm: 'pop', stamp: 'stamp', beam: 'whoosh',
};

// ---------- ngữ cảnh một cảnh ----------

type Ctx = {
  item: PokeItem;
  ok: boolean;
  from: Rect;
  to: Rect;
  w: number;
  h: number;
  seed: number;
  strong: boolean;
  toMe: boolean;
  /** hiệu ứng khi đồ chạm đích (tâm trạng, rung màn hình, tiếng) */
  impact: () => void;
  onDone: () => void;
};
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const unitOf = (c: Ctx) => clamp(Math.min(c.to.w, c.to.h), 40, 84);
const palOf = (c: Ctx) => PALETTE[c.item.category];
const wordOf = (c: Ctx, r: () => number) => {
  const w = WORDS[c.item.template];
  return c.item.text ?? (w ? pick(r, c.item.nice ? w.nice : w.bad) : '');
};

// ---------- khối dựng chung ----------

const OUTLINE = { WebkitTextStroke: `3px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0px 4px 0px ${C.ink}` } as object;

/** chữ truyện tranh bật lên rồi tan; `p` 0..1 */
function Word({ text, p, x, y, size = 34, color = C.gold, rot = -6 }: { text: string; p: Av; x: number; y: number; size?: number; color?: string; rot?: number }) {
  if (!text) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - 170, top: y - size, width: 340, alignItems: 'center', zIndex: 9,
        opacity: kf(p, [0, 0.08, 0.78, 1], [0, 1, 1, 0]),
        transform: [{ rotate: `${rot}deg` }, { scale: kf(p, [0, 0.16, 0.28, 0.8, 1], [0, 1.4, 1, 1.05, 0.9]) }, { translateY: kf(p, [0, 1], [8, -18]) }],
      }}
    >
      <Text style={[{ fontFamily: FONT, fontWeight: '900', fontSize: size, color, letterSpacing: 1, textAlign: 'center' }, OUTLINE]}>{text}</Text>
    </Animated.View>
  );
}

/** vòng sóng xung kích lan ra từ (cx,cy) */
function Ring({ p, cx, cy, size, color = '#fff', width = 6 }: { p: Av; cx: number; cy: number; size: number; color?: string; width?: number }) {
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size, borderRadius: size / 2,
        borderWidth: width, borderColor: color,
        opacity: kf(p, [0, 0.15, 1], [0, 0.95, 0]),
        transform: [{ scale: kf(p, [0, 1], [0.2, 2.6]) }],
      }}
    />
  );
}

/** mảnh vụn / hạt bay tỏa ra từ (cx,cy); `mini` = bản nhỏ của chính món đó */
function Burst({ p, cx, cy, n, colors, seed, dist = [50, 120], size = [6, 12], gravity = 50, mini }: {
  p: Av; cx: number; cy: number; n: number; colors: string[]; seed: number; dist?: [number, number]; size?: [number, number]; gravity?: number; mini?: Ctx;
}) {
  const [parts] = useState(() => {
    const r = rngOf(seed);
    return Array.from({ length: n }, () => {
      const a = r() * Math.PI * 2;
      const d = lerp(dist[0], dist[1], r());
      return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, s: lerp(size[0], size[1], r()), col: pick(r, colors), rot: (r() - 0.5) * 720, round: r() < 0.4 };
    });
  });
  const out = seg(p, 0, 1, Easing.out(Easing.cubic));
  return (
    <>
      {parts.map((q, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute', left: cx - q.s / 2, top: cy - q.s / 2, width: q.s, height: q.s, zIndex: 8,
            opacity: kf(p, [0, 0.7, 1], [1, 1, 0]),
            transform: [
              { translateX: kf(out, [0, 1], [0, q.dx]) },
              { translateY: kf(out, [0, 1], [0, q.dy + gravity]) },
              { rotate: deg(out, 0, q.rot) },
              { scale: kf(p, [0, 0.12, 1], [0.2, 1, 0.4]) },
            ],
          }}
        >
          {mini ? <PokeImg item={mini.item} ok={mini.ok} size={q.s} shadow={false} /> : <View style={{ flex: 1, backgroundColor: q.col, borderRadius: q.round ? q.s : 2, borderWidth: 1.5, borderColor: C.ink }} />}
        </Animated.View>
      ))}
    </>
  );
}

const abs = (x: number, y: number, w: number, h: number) => ({ position: 'absolute', left: x, top: y, width: w, height: h } as const);

// ---------- 1 + 2. ném và loạt ném ----------

function Projectile({ c, delay = 0, dx = 0, dy = 0, size, flyMs, big, first, onDone, tail = 1300 }: {
  c: Ctx; delay?: number; dx?: number; dy?: number; size: number; flyMs: number; big?: boolean; first?: boolean; onDone?: () => void; tail?: number;
}) {
  const total = delay + flyMs + tail;
  const t = useRun(total, onDone);
  const S = center(c.from);
  const E = { x: center(c.to).x + dx, y: center(c.to).y + dy };
  const f0 = delay / total;
  const f1 = (delay + flyMs) / total;
  const p = seg(t, f0, f1, Easing.inOut(Easing.sin));
  const dist = Math.hypot(E.x - S.x, E.y - S.y);
  const arc = clamp(dist * 0.3, 50, 170);
  const pal = palOf(c);
  const turns = useState(() => (rngOf(c.seed + delay)() < 0.5 ? -1 : 1) * (2 + Math.floor(rngOf(c.seed + delay + 1)() * 2)))[0];
  useLater(delay + flyMs, () => { if (first) c.impact(); });
  const land = seg(t, f1, f1 + 0.05, Easing.out(Easing.quad));
  const fade = seg(t, f1 + 0.3, 1);
  const blob = size * (big ? 1.15 : 0.8);
  const burstP = seg(t, f1, Math.min(1, f1 + 0.32));
  const nice = !!c.item.nice;
  const word = useState(() => (first ? wordOf(c, rngOf(c.seed + 7)) : ''))[0];
  return (
    <>
      {/* vết bẩn dính trên avatar */}
      {!nice && (
        <Animated.View
          pointerEvents="none"
          style={{
            ...abs(E.x - blob / 2, E.y + blob * 0.05, blob, blob * 0.7), borderRadius: blob, backgroundColor: pal[0], borderWidth: 2, borderColor: C.ink,
            opacity: kf(t, [0, f1, f1 + 0.01, 0.9, 1], [0, 0, 0.78, 0.78, 0]), transform: [{ scale: kf(land, [0, 1], [0.2, 1]) }, { rotate: `${(dx * 3) % 40}deg` }],
          }}
        />
      )}
      <Animated.View
        pointerEvents="none"
        style={{
          ...abs(0, 0, size, size), zIndex: 7,
          opacity: kf(t, [0, Math.max(f0, 0.0001), f0 + 0.001, 0.85, 1], [0, 0, 1, 1, 0]),
          transform: [
            { translateX: curve(p, 14, (q) => lerp(S.x, E.x, q) - size / 2) },
            { translateY: curve(p, 14, (q) => lerp(S.y, E.y, q) - 4 * arc * q * (1 - q) - size / 2) },
            { rotate: deg(p, 0, turns * 360) },
            { scale: curve(p, 10, (q) => 0.85 + 0.5 * Math.sin(Math.PI * q)) },
            // chạm đích: bẹp xuống rồi trôi nhẹ
            { scaleX: kf(land, [0, 1], [1, nice ? 1.1 : 1.45]) },
            { scaleY: kf(land, [0, 1], [1, nice ? 1.1 : 0.55]) },
            { translateY: nice ? 0 : kf(fade, [0, 1], [0, 26]) },
          ],
        }}
      >
        <PokeImg item={c.item} ok={c.ok} size={size} />
      </Animated.View>
      <Burst p={burstP} cx={E.x} cy={E.y} n={big ? 12 : 6} colors={pal} seed={c.seed + delay} gravity={nice ? -50 : 50} dist={[big ? 40 : 28, big ? 100 : 60]} mini={nice ? c : undefined} />
      {word ? <Word text={word} p={seg(t, f1, Math.min(1, f1 + 0.55))} x={E.x} y={E.y + unitOf(c) * 0.45 + 26} size={26} color={nice ? '#FF6B9D' : C.gold} /> : null}
    </>
  );
}

function ThrowScene({ c }: { c: Ctx }) {
  return <Projectile c={c} size={unitOf(c) * 0.95} flyMs={650} big first onDone={c.onDone} />;
}

function VolleyScene({ c }: { c: Ctx }) {
  const [shots] = useState(() => {
    const r = rngOf(c.seed);
    const n = 5 + Math.floor(r() * 4);
    const u = unitOf(c);
    return Array.from({ length: n }, (_, i) => ({ delay: i * 120, dx: (r() - 0.5) * u * 0.8, dy: (r() - 0.5) * u * 0.7 }));
  });
  const u = unitOf(c) * 0.62;
  return (
    <>
      {shots.map((s, i) => (
        <Projectile key={i} c={c} delay={s.delay} dx={s.dx} dy={s.dy} size={u} flyMs={520} first={i === 0} tail={900} onDone={i === shots.length - 1 ? c.onDone : undefined} />
      ))}
    </>
  );
}

// ---------- 3. mưa ----------

function RainScene({ c }: { c: Ctx }) {
  const strong = c.strong;
  const D = strong ? 4200 : 2600;
  const t = useRun(D, c.onDone);
  const pal = palOf(c);
  const [drops] = useState(() => {
    const r = rngOf(c.seed);
    const n = strong ? 26 + Math.floor(r() * 10) : 9;
    const regionW = strong ? c.w : Math.max(c.to.w * 1.7, 90);
    const x0 = strong ? 0 : center(c.to).x - regionW / 2;
    const y0 = strong ? -90 : c.to.y - 90;
    const y1 = strong ? c.h + 20 : c.to.y + c.to.h * 0.75;
    return Array.from({ length: n }, () => {
      const s = strong ? lerp(34, 78, r()) : lerp(22, 34, r());
      const start = r() * (strong ? 0.5 : 0.45);
      const dur = lerp(strong ? 0.26 : 0.3, strong ? 0.4 : 0.42, r());
      return { x: x0 + r() * (regionW - s), s, start, end: Math.min(1, start + dur), rot: (r() - 0.5) * 540, y0, y1, sway: (r() - 0.5) * 50 };
    });
  });
  useLater(strong ? 350 : 250, c.impact);
  const word = useState(() => wordOf(c, rngOf(c.seed + 3)))[0];
  return (
    <>
      {strong && (
        <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, backgroundColor: pal[1], opacity: kf(t, [0, 0.1, 0.8, 1], [0, 0.16, 0.1, 0]) }} />
      )}
      {drops.map((d, i) => {
        const q = seg(t, d.start, d.end, Easing.in(Easing.quad));
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              ...abs(d.x, 0, d.s, d.s), zIndex: 6,
              opacity: kf(t, [0, d.start, d.start + 0.002, d.end - 0.002, d.end], [0, 0, 1, 1, 0]),
              transform: [{ translateY: kf(q, [0, 1], [d.y0, d.y1]) }, { translateX: kf(q, [0, 1], [0, d.sway]) }, { rotate: deg(q, 0, d.rot) }],
            }}
          >
            <PokeImg item={c.item} ok={c.ok} size={d.s} />
          </Animated.View>
        );
      })}
      <Word text={word} p={seg(t, 0, 0.5)} x={c.w / 2} y={strong ? c.h * 0.46 : c.to.y + c.to.h + 26} size={strong ? 44 : 22} color={pal[1] === '#FFFFFF' ? C.gold : pal[1]} rot={-4} />
    </>
  );
}

// ---------- 4. dính màn hình ----------

function StickScene({ c }: { c: Ctx }) {
  const strong = c.strong;
  const D = strong ? 9000 : 3600;
  const t = useRun(D, c.onDone);
  const wipe = useState(() => new Animated.Value(0))[0];
  const [wiped, setWiped] = useState(false);
  const pal = palOf(c);
  const mode: 'drip' | 'crawl' | 'pulse' = c.item.category === 'dongvat' ? 'crawl' : c.item.category === 'tinhcam' ? 'pulse' : 'drip';
  const cfg = useState(() => {
    const r = rngOf(c.seed);
    const s = strong ? 130 + r() * 50 : Math.max(38, c.to.w * 0.85);
    const m = s * 0.75 + 6;
    const cx = strong ? m + r() * Math.max(10, c.w - 2 * m) : center(c.to).x + (r() - 0.5) * c.to.w * 0.25;
    const cy = strong ? s / 2 + 80 + r() * Math.max(10, c.h * 0.6 - s) : center(c.to).y;
    return { s, cx, cy, rot: (r() - 0.5) * 36, drips: [0.2, 0.5, 0.78].map((o) => ({ o, len: s * lerp(0.35, 0.8, r()), w: lerp(7, 12, r()) })), dir: r() < 0.5 ? -1 : 1 };
  })[0];
  useLater(60, c.impact);
  const { s, cx, cy } = cfg;
  const blob = s * 1.15;
  const enter = kf(t, [0, 0.025, 0.045, 0.065], [0.15, 1.3, 0.93, 1]);
  const press = () => {
    if (wiped || !strong) return;
    setWiped(true);
    play('squash');
    Animated.timing(wipe, { toValue: 1, duration: 380, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(() => c.onDone());
  };
  const fade = kf(t, [0, 0.01, 0.93, 1], [0, 1, 1, 0]);
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        ...abs(cx - blob * 0.65, cy - blob * 0.65, blob * 1.3, blob * 1.3 + 40), zIndex: 6,
        opacity: kf(wipe, [0, 1], [1, 0]),
        transform: [{ translateX: kf(wipe, [0, 1], [0, cfg.dir * 120]) }, { rotate: deg(wipe, 0, cfg.dir * 50) }, { scale: kf(wipe, [0, 1], [1, 1.25]) }],
      }}
    >
      <Pressable
        testID="poke-stick"
        accessibilityRole="button"
        accessibilityLabel="Chạm để lau"
        disabled={!strong}
        onPress={press}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', pointerEvents: strong ? 'auto' : 'none' } as object}
      >
        <Animated.View style={{ opacity: fade, width: blob * 1.3, height: blob * 1.3, alignItems: 'center', justifyContent: 'center', transform: [{ scale: enter }, { rotate: `${cfg.rot}deg` }] }}>
          {mode === 'drip' && (
            <>
              <View style={{ ...abs(blob * 0.15, blob * 0.2, blob, blob * 0.85), borderRadius: blob, backgroundColor: pal[0], borderWidth: 2.5, borderColor: C.ink, opacity: 0.86 }} />
              <View style={{ ...abs(blob * 0.1, blob * 0.5, blob * 0.5, blob * 0.45), borderRadius: blob, backgroundColor: pal[0], borderWidth: 2.5, borderColor: C.ink, opacity: 0.86 }} />
              <View style={{ ...abs(blob * 0.55, blob * 0.05, blob * 0.55, blob * 0.5), borderRadius: blob, backgroundColor: pal[1], opacity: 0.55 }} />
              {cfg.drips.map((d, i) => (
                <Animated.View
                  key={i}
                  style={{
                    position: 'absolute', left: blob * 0.2 + d.o * blob * 0.9, top: blob * 0.75, width: d.w, borderRadius: d.w, backgroundColor: pal[0], borderWidth: 2, borderColor: C.ink,
                    height: kf(t, [0.04, 0.55], [0, d.len]),
                  }}
                />
              ))}
            </>
          )}
          <Animated.View
            style={{
              transform: mode === 'crawl'
                ? [{ translateX: curve(t, 40, (q) => Math.sin(q * 50) * s * 0.12) }, { rotate: curveDeg(t, 40, (q) => Math.sin(q * 50) * 14) }]
                : mode === 'pulse'
                  ? [{ scale: curve(t, 40, (q) => 1 + Math.sin(q * 60) * 0.06) }]
                  : [{ rotate: curveDeg(t, 30, (q) => Math.sin(q * 40) * 2) }],
            }}
          >
            <PokeImg item={c.item} ok={c.ok} size={s} />
          </Animated.View>
        </Animated.View>
        {strong && !wiped && (
          <Animated.View style={{ marginTop: -6, opacity: kf(t, [0, 0.05, 0.9, 1], [0, 1, 1, 0]), backgroundColor: C.ink, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: C.gold, fontFamily: FONT, fontWeight: '800', fontSize: 12 }}>Chạm để lau</Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ---------- 5. quay quanh avatar ----------

function OrbitScene({ c }: { c: Ctx }) {
  const D = 3000;
  const t = useRun(D, c.onDone);
  const K = center(c.to);
  const u = unitOf(c);
  const rx = Math.max(u * 0.95, 46);
  const ry = rx * 0.4;
  const size = u * 0.55;
  const pal = palOf(c);
  const [cfg] = useState(() => {
    const r = rngOf(c.seed);
    return { n: 3 + Math.floor(r() * 2), turns: 2 + Math.floor(r() * 2), dir: r() < 0.5 ? 1 : -1, tilt: (r() - 0.5) * 24 };
  });
  useLater(150, c.impact);
  const lift = c.to.h * 0.12;
  return (
    <>
      <Animated.View pointerEvents="none" style={{ ...abs(K.x - rx, K.y + u * 0.2, rx * 2, ry * 1.2), borderRadius: rx, borderWidth: 2, borderColor: pal[1], opacity: kf(t, [0, 0.12, 0.88, 1], [0, 0.45, 0.45, 0]), transform: [{ rotate: `${cfg.tilt}deg` }] }} />
      {Array.from({ length: cfg.n }, (_, i) => {
        const ph = i / cfg.n;
        const ang = (q: number) => (ph + cfg.dir * q * cfg.turns) * Math.PI * 2;
        const N = 24 * cfg.turns;
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              ...abs(0, 0, size, size), zIndex: 7,
              opacity: kf(t, [0, 0.1, 0.88, 1], [0, 1, 1, 0]),
              transform: [
                { translateX: curve(t, N, (q) => K.x + Math.cos(ang(q)) * rx - size / 2) },
                { translateY: curve(t, N, (q) => K.y + lift + Math.sin(ang(q)) * ry - size / 2 - u * 0.1) },
                { scale: curve(t, N, (q) => 0.85 + 0.3 * Math.sin(ang(q))) },
                { rotate: curveDeg(t, N, (q) => Math.cos(ang(q)) * 14) },
              ],
            }}
          >
            <PokeImg item={c.item} ok={c.ok} size={size} />
          </Animated.View>
        );
      })}
      <Burst p={seg(t, 0, 0.3)} cx={K.x} cy={K.y} n={8} colors={[pal[1], pal[2], '#fff']} seed={c.seed} dist={[30, 70]} size={[4, 8]} gravity={-20} />
    </>
  );
}

// ---------- 6. bay tới rồi nổ ----------

function ExplodeScene({ c }: { c: Ctx }) {
  const D = 2100;
  const f1 = 0.3;
  const t = useRun(D, c.onDone);
  const S = center(c.from);
  const E = center(c.to);
  const size = unitOf(c) * 0.95;
  const pal = palOf(c);
  const p = seg(t, 0, f1, Easing.in(Easing.quad));
  const dist = Math.hypot(E.x - S.x, E.y - S.y);
  const arc = clamp(dist * 0.18, 20, 90);
  const boom = seg(t, f1, 1);
  const word = useState(() => wordOf(c, rngOf(c.seed + 2)))[0];
  useLater(D * f1, c.impact);
  const nice = !!c.item.nice;
  const flashStrong = c.strong && !nice;
  const pos = (lag: number) => {
    const q = seg(t, lag, f1 + lag * 0.5, Easing.in(Easing.quad));
    return [
      { translateX: curve(q, 12, (k) => lerp(S.x, E.x, k) - size / 2) },
      { translateY: curve(q, 12, (k) => lerp(S.y, E.y, k) - 4 * arc * k * (1 - k) - size / 2) },
    ];
  };
  return (
    <>
      {[0.07, 0.04, 0.02].map((lag, i) => (
        <Animated.View key={i} pointerEvents="none" style={{ ...abs(0, 0, size, size), opacity: kf(t, [0, 0.01, f1 + lag, f1 + lag + 0.01], [0, 0.4 - i * 0.1, 0.3, 0]), transform: [...pos(lag), { scale: 0.9 - i * 0.12 }] }}>
          <PokeImg item={c.item} ok={c.ok} size={size} shadow={false} />
        </Animated.View>
      ))}
      <Animated.View
        pointerEvents="none"
        style={{ ...abs(0, 0, size, size), zIndex: 7, opacity: kf(t, [0, 0.005, f1, f1 + 0.01], [0, 1, 1, 0]), transform: [...pos(0), { rotate: deg(p, 0, 540) }, { scale: curve(p, 8, (k) => 0.8 + 0.5 * k) }] }}
      >
        <PokeImg item={c.item} ok={c.ok} size={size} />
      </Animated.View>
      {/* nổ */}
      <Animated.View pointerEvents="none" style={{ ...abs(E.x - 45, E.y - 45, 90, 90), borderRadius: 45, backgroundColor: '#FFF6C9', opacity: kf(boom, [0, 0.04, 0.3], [0, 1, 0]), transform: [{ scale: kf(boom, [0, 0.3], [0.3, 3.4]) }] }} />
      <Ring p={seg(boom, 0, 0.5)} cx={E.x} cy={E.y} size={70} color={pal[1]} />
      <Ring p={seg(boom, 0.05, 0.6)} cx={E.x} cy={E.y} size={50} color={pal[0]} width={4} />
      <Burst p={seg(boom, 0, 0.55)} cx={E.x} cy={E.y} n={22} colors={[...pal, '#fff']} seed={c.seed} dist={[70, 170]} size={[6, 14]} gravity={60} />
      <Burst p={seg(boom, 0, 0.7)} cx={E.x} cy={E.y} n={6} colors={pal} seed={c.seed + 9} dist={[50, 120]} size={[16, 26]} gravity={70} mini={c} />
      <Word text={word} p={seg(boom, 0, 0.75)} x={E.x} y={E.y + unitOf(c) * 0.5 + 34} size={34} color={nice ? '#FF6B9D' : C.gold} rot={-8} />
      {flashStrong && <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, backgroundColor: '#fff', opacity: kf(boom, [0, 0.03, 0.2], [0, 0.65, 0]) }} />}
    </>
  );
}

// ---------- 7. khổng lồ ----------

function GiantScene({ c }: { c: Ctx }) {
  const strong = c.strong;
  const D = strong ? 3400 : 2400;
  const t = useRun(D, c.onDone);
  const pal = palOf(c);
  const K = strong ? { x: c.w / 2, y: c.h * 0.46 } : { x: center(c.to).x, y: Math.max(center(c.to).y - 30, 70) };
  const S = strong ? Math.min(c.w * 0.9, c.h * 0.5) : clamp(c.w * 0.42, 110, 170);
  const word = useState(() => wordOf(c, rngOf(c.seed + 5)))[0];
  const rot = useState(() => (rngOf(c.seed + 11)() - 0.5) * 16)[0];
  useLater(D * 0.1, c.impact);
  const appear = seg(t, 0, 0.14, Easing.out(Easing.back(2.4)));
  const life = kf(t, [0, 0.03, 0.8, 0.95], [0, 1, 1, 0]);
  const nice = !!c.item.nice;
  return (
    <>
      {strong && <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, backgroundColor: '#1a0508', opacity: kf(t, [0, 0.08, 0.8, 0.95], [0, 0.45, 0.45, 0]) }} />}
      {/* tia sáng */}
      <Animated.View pointerEvents="none" style={{ ...abs(K.x, K.y, 0, 0), opacity: kf(t, [0, 0.06, 0.7, 0.9], [0, 0.85, 0.5, 0]), transform: [{ rotate: deg(t, 0, 50) }] }}>
        {Array.from({ length: 14 }, (_, i) => (
          <View key={i} style={{ position: 'absolute', left: -7, top: -S * 0.9, width: 14, height: S * 0.9, backgroundColor: i % 2 ? pal[1] : pal[0], opacity: 0.55, borderRadius: 7, transform: [{ rotate: `${(i * 360) / 14}deg` }], transformOrigin: '50% 100%' } as object} />
        ))}
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ ...abs(K.x - S * 0.4, K.y + S * 0.42, S * 0.8, S * 0.14), borderRadius: S, backgroundColor: '#000', opacity: kf(t, [0, 0.14, 0.8, 0.95], [0, 0.28, 0.28, 0]) }} />
      <Animated.View
        pointerEvents="none"
        style={{
          ...abs(K.x - S / 2, K.y - S / 2, S, S), zIndex: 7, opacity: life,
          transform: [
            { translateY: curve(t, 40, (q) => Math.sin(q * 26) * 6) },
            { rotate: curveDeg(t, 40, (q) => rot + Math.sin(q * 22) * 3) },
            { scale: kf(appear, [0, 1], [0.05, 1]) },
            { scale: kf(t, [0.8, 0.95], [1, 1.3]) },
          ],
        }}
      >
        <PokeImg item={c.item} ok={c.ok} size={S} />
      </Animated.View>
      <Ring p={seg(t, 0.08, 0.4)} cx={K.x} cy={K.y} size={S * 0.7} color={pal[1]} width={8} />
      <Burst p={seg(t, 0.08, 0.45)} cx={K.x} cy={K.y} n={16} colors={[...pal, '#fff']} seed={c.seed} dist={[S * 0.4, S * 0.8]} size={[8, 16]} gravity={30} />
      <Word text={word} p={seg(t, 0.08, 0.85)} x={K.x} y={K.y + S * 0.5} size={strong ? 52 : 28} color={nice ? '#FF6B9D' : C.gold} rot={-7} />
    </>
  );
}

// ---------- 8. đàn đi qua ----------

function SwarmScene({ c }: { c: Ctx }) {
  const strong = c.strong;
  const D = strong ? 5200 : 2800;
  const t = useRun(D, c.onDone);
  const [crowd] = useState(() => {
    const r = rngOf(c.seed);
    const n = strong ? 9 + Math.floor(r() * 5) : 4;
    const groupDir = r() < 0.5 ? 1 : -1;
    const lanes = strong ? { y0: 90, y1: c.h - 150 } : { y0: c.to.y - 4, y1: c.to.y + c.to.h - 24 };
    const span = strong ? { x0: -80, x1: c.w + 80 } : { x0: c.to.x - 56, x1: c.to.x + c.to.w + 56 };
    return Array.from({ length: n }, () => {
      const s = strong ? lerp(40, 66, r()) : lerp(26, 36, r());
      const dir = r() < 0.15 ? -groupDir : groupDir;
      const start = r() * (strong ? 0.42 : 0.3);
      const dur = lerp(strong ? 0.38 : 0.5, strong ? 0.5 : 0.62, r());
      return {
        s, dir, start, end: Math.min(1, start + dur), y: lerp(lanes.y0, lanes.y1, r()), amp: lerp(6, strong ? 22 : 8, r()), freq: lerp(8, 16, r()),
        x0: dir > 0 ? span.x0 : span.x1, x1: dir > 0 ? span.x1 : span.x0, ph: r() * 6,
      };
    });
  });
  useLater(300, c.impact);
  const word = useState(() => wordOf(c, rngOf(c.seed + 4)))[0];
  const pal = palOf(c);
  return (
    <>
      {strong && <Animated.View pointerEvents="none" style={{ ...StyleSheet.absoluteFill, backgroundColor: pal[1], opacity: kf(t, [0, 0.1, 0.85, 1], [0, 0.1, 0.07, 0]) }} />}
      {crowd.map((m, i) => {
        const q = seg(t, m.start, m.end);
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              ...abs(0, 0, m.s, m.s), zIndex: 6,
              opacity: kf(t, [0, m.start, m.start + 0.002, m.end - 0.002, m.end], [0, 0, 1, 1, 0]),
              transform: [
                { translateX: kf(q, [0, 1], [m.x0 - m.s / 2, m.x1 - m.s / 2]) },
                { translateY: curve(q, 24, (k) => m.y + Math.sin(k * m.freq + m.ph) * m.amp) },
                { rotate: curveDeg(q, 24, (k) => Math.sin(k * m.freq * 1.4 + m.ph) * 12) },
                { scaleX: m.dir },
              ],
            }}
          >
            <PokeImg item={c.item} ok={c.ok} size={m.s} />
          </Animated.View>
        );
      })}
      <Word text={word} p={seg(t, 0, 0.45)} x={strong ? c.w / 2 : center(c.to).x} y={strong ? c.h * 0.46 : c.to.y + c.to.h + 22} size={strong ? 40 : 20} color={C.gold} rot={5} />
    </>
  );
}

// ---------- 9. đóng dấu đè avatar ----------

function StampScene({ c }: { c: Ctx }) {
  const D = 2000;
  const f1 = 0.2;
  const t = useRun(D, c.onDone);
  const K = center(c.to);
  const u = unitOf(c);
  const S = u * 1.7;
  const pal = palOf(c);
  const rot = useState(() => (rngOf(c.seed)() - 0.5) * 24)[0];
  const word = useState(() => wordOf(c, rngOf(c.seed + 6)))[0];
  useLater(D * f1, c.impact);
  const fall = seg(t, 0, f1, Easing.in(Easing.cubic));
  const after = seg(t, f1, 1);
  const dust = seg(t, f1, f1 + 0.3);
  return (
    <>
      <Animated.View pointerEvents="none" style={{ ...abs(K.x - S * 0.5, K.y + S * 0.15, S, S * 0.36), borderRadius: S, backgroundColor: '#000', opacity: kf(t, [0, f1, f1 + 0.01, 0.8, 0.95], [0, 0.3, 0.32, 0.25, 0]), transform: [{ scale: kf(fall, [0, 1], [1.6, 1]) }] }} />
      <Animated.View
        pointerEvents="none"
        style={{
          ...abs(K.x - S / 2, K.y - S / 2, S, S), zIndex: 7,
          opacity: kf(t, [0, 0.01, 0.78, 0.95], [0, 1, 1, 0]),
          transform: [
            { translateY: kf(fall, [0, 1], [-170, 0]) },
            { scale: kf(fall, [0, 1], [2.5, 1]) },
            { rotate: `${rot}deg` },
            { scaleY: curve(after, 12, (k) => 1 - 0.22 * Math.exp(-k * 9) * Math.cos(k * 20)) },
            { scaleX: curve(after, 12, (k) => 1 + 0.12 * Math.exp(-k * 9) * Math.cos(k * 20)) },
          ],
        }}
      >
        <PokeImg item={c.item} ok={c.ok} size={S} />
      </Animated.View>
      <Ring p={dust} cx={K.x} cy={K.y + S * 0.3} size={S * 0.7} color={pal[1]} />
      <Burst p={seg(t, f1, f1 + 0.35)} cx={K.x} cy={K.y + S * 0.3} n={12} colors={['#E9D8C2', '#fff', pal[0]]} seed={c.seed} dist={[40, 95]} size={[10, 20]} gravity={-8} />
      <Word text={word} p={seg(t, f1, 0.95)} x={K.x} y={K.y + u * 0.5 + 30} size={30} color={c.item.nice ? '#FF6B9D' : C.gold} rot={-9} />
    </>
  );
}

// ---------- 10. tia / phóng thẳng ----------

function BeamScene({ c }: { c: Ctx }) {
  const D = 1900;
  const f1 = 0.4;
  const t = useRun(D, c.onDone);
  const S = center(c.from);
  const E = center(c.to);
  const size = unitOf(c) * 0.9;
  const pal = palOf(c);
  const dx = E.x - S.x;
  const dy = E.y - S.y;
  const len = Math.max(20, Math.hypot(dx, dy));
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
  const p = seg(t, 0, f1, Easing.in(Easing.cubic));
  const boom = seg(t, f1, 1);
  const word = useState(() => wordOf(c, rngOf(c.seed + 8)))[0];
  useLater(D * f1, c.impact);
  const at = (q: Av) => [{ translateX: kf(q, [0, 1], [S.x - size / 2, E.x - size / 2]) }, { translateY: kf(q, [0, 1], [S.y - size / 2, E.y - size / 2]) }];
  return (
    <>
      {/* vệt sáng */}
      <Animated.View pointerEvents="none" style={{ ...abs(S.x, S.y - 7, len, 14), opacity: kf(t, [0, 0.02, f1, 0.7], [0, 0.85, 0.7, 0]), transform: [{ rotate: `${ang}deg` }, { scaleX: kf(p, [0, 1], [0.001, 1]) }], transformOrigin: '0% 50%' } as object}>
        <View style={{ flex: 1, borderRadius: 8, backgroundColor: pal[1], borderWidth: 2, borderColor: pal[0], boxShadow: `0px 0px 14px ${pal[0]}` } as object} />
      </Animated.View>
      {[0.06, 0.12, 0.18, 0.24].map((lag, i) => {
        const q = seg(t, 0, f1, Easing.in(Easing.cubic));
        const qq = kf(q, [0, lag, 1], [0, 0, 1 - lag * 0.4]);
        return (
          <Animated.View key={i} pointerEvents="none" style={{ ...abs(0, 0, size, size), opacity: kf(t, [0, 0.02, f1, f1 + 0.05], [0, 0.5 - i * 0.1, 0.4 - i * 0.08, 0]), transform: [...at(qq), { scale: 0.9 - i * 0.1 }] }}>
            <PokeImg item={c.item} ok={c.ok} size={size} shadow={false} />
          </Animated.View>
        );
      })}
      <Animated.View pointerEvents="none" style={{ ...abs(0, 0, size, size), zIndex: 7, opacity: kf(t, [0, 0.005, f1, f1 + 0.04], [0, 1, 1, 0]), transform: [...at(p), { scale: curve(p, 8, (k) => 0.9 + 0.35 * k) }] }}>
        <PokeImg item={c.item} ok={c.ok} size={size} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={{ ...abs(E.x - 36, E.y - 36, 72, 72), borderRadius: 36, backgroundColor: pal[1], opacity: kf(boom, [0, 0.05, 0.4], [0, 0.95, 0]), transform: [{ scale: kf(boom, [0, 0.4], [0.3, 2.4]) }] }} />
      <Ring p={seg(boom, 0, 0.5)} cx={E.x} cy={E.y} size={60} color={pal[0]} />
      <Burst p={seg(boom, 0, 0.55)} cx={E.x} cy={E.y} n={14} colors={[...pal, '#fff']} seed={c.seed} dist={[40, 105]} size={[5, 11]} gravity={20} />
      <Word text={word} p={seg(boom, 0, 0.7)} x={E.x} y={E.y + unitOf(c) * 0.5 + 26} size={26} color={c.item.nice ? '#FF6B9D' : C.gold} rot={-6} />
    </>
  );
}

const SCENES: Record<PokeTemplate, (p: { c: Ctx }) => ReactElement> = {
  throw: ThrowScene, volley: VolleyScene, rain: RainScene, stick: StickScene, orbit: OrbitScene,
  explode: ExplodeScene, giant: GiantScene, swarm: SwarmScene, stamp: StampScene, beam: BeamScene,
};

// ---------- lớp hiệu ứng ----------

type SceneData = {
  id: number;
  item: PokeItem;
  from: Rect | null;
  to: Rect | null;
  seed: number;
  strong: boolean;
  toMe: boolean;
  toId: string;
};

function Scene({ s, w, h, onDone, impact }: { s: SceneData; w: number; h: number; onDone: (id: number) => void; impact: (s: SceneData) => void }) {
  const st = usePokeImage(s.item);
  const idRef = useRef(s.id);
  const done = useCallback(() => onDone(idRef.current), [onDone]);
  const hit = useCallback(() => impact(s), [impact, s]);
  // chờ hình tải xong (tối đa vài giây, lỗi thì dùng emoji) rồi mới chạy để không bay một khoảng trống
  if (st === undefined) return null;
  const from = s.from ?? { x: w / 2 - 32, y: h - 130, w: 64, h: 64 };
  const to = s.to ?? { x: w / 2 - 32, y: h * 0.3, w: 64, h: 64 };
  const c: Ctx = { item: s.item, ok: st === 'ok', from, to, w, h, seed: s.seed, strong: s.strong, toMe: s.toMe, impact: hit, onDone: done };
  const Comp = SCENES[s.item.template];
  return <Comp c={c} />;
}

export function PokeLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [size, setSize] = useState(() => ({
    w: typeof window === 'undefined' ? 390 : Math.min(window.innerWidth, 520),
    h: typeof window === 'undefined' ? 844 : window.innerHeight,
  }));
  const layer = useRef<ComponentRef<typeof View>>(null);
  const seq = useRef(0);
  const feed = useFeed();
  const shake = useShake();
  const vp = useContext(ViewportContext);
  const rotatedRef = useRef(!!vp?.rotated);
  useEffect(() => { rotatedRef.current = !!vp?.rotated; }, [vp?.rotated]);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  const shakeRef = useRef(shake);
  useEffect(() => { shakeRef.current = shake; }, [shake]);

  const drop = useCallback((id: number) => setScenes((xs) => xs.filter((x) => x.id !== id)), []);

  const impact = useCallback((s: SceneData) => {
    const { item } = s;
    setMood(s.toId, item.nice ? 'smug' : 'shock', 2400);
    if (!item.nice && item.template !== 'orbit') setWobble(s.toId, 'shake', 1200);
    play((item.sound as Sfx | undefined) ?? DEFAULT_SOUND[item.template]);
    if (s.toMe && s.strong && !item.nice) {
      vibrate(item.template === 'giant' || item.template === 'explode' ? [120, 40, 160] : 120);
      shakeRef.current(item.template === 'giant' ? 'quake' : 'normal');
    }
  }, []);

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      if (e.kind !== 'poke' || !e.poke) return;
      const item = pokeItem(e.poke);
      if (!item) return;
      const origin = (layer.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      const rot = rotatedRef.current;
      const toMe = e.to === game.me;
      const from = nameOf(e.from);
      const to = toMe ? 'bạn' : nameOf(e.to);
      play(item.template === 'throw' || item.template === 'volley' || item.template === 'explode' ? 'whoosh' : 'pop');
      setScenes((xs) => [
        ...xs.slice(-7),
        {
          id: ++seq.current, item, seed: e.variant ?? 1, toId: e.to, toMe,
          from: rectOf(`avatar-${e.from}`, origin, rot),
          to: rectOf(`avatar-${e.to}`, origin, rot),
          strong: toMe && !e.soft,
        },
      ]);
      feed(`${item.emoji} ${from === 'bạn' ? 'Bạn' : from} → ${to}: ${item.name}!`, toMe ? (item.nice ? 'good' : 'bad') : 'fun');
      if (toMe && e.pausedMs) feed(`⏸ Bị chọc nên được bù +${(e.pausedMs / 1000).toLocaleString('vi-VN')} giây vào lượt`, 'good');
    });
  }, [game, feed]);

  return (
    <View
      ref={layer}
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {scenes.map((s) => (
        <Scene key={s.id} s={s} w={size.w} h={size.h} onDone={drop} impact={impact} />
      ))}
    </View>
  );
}
