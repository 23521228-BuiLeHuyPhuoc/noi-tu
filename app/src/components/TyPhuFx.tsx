import { Image, StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { T } from '../ui';
import { TYPHU_PASS_START } from '../../../shared/src/typhu';
import { FX_ICON } from '../typhuCellIcons';
import type { Rect } from '../typhuLayout';

export type Fx =
  | { k: 'stamp'; id: number; at: number; cell: number; text: string; color: string }
  | { k: 'build'; id: number; at: number; cell: number; level: number }
  | { k: 'rent'; id: number; at: number; from: Rect; to: Rect; fromId: string; toId: string; amount: number }
  | { k: 'float'; id: number; at: number; at2: Rect; who: string; delta: number }
  | { k: 'start'; id: number; at: number }
  | { k: 'jail'; id: number; at: number; cell: number }
  | { k: 'bankrupt'; id: number; at: number; name: string };

export const FX_MS: Record<Fx['k'], number> = {
  stamp: 1500, build: 1300, rent: 1700, float: 1500, start: 1600, jail: 2200, bankrupt: 3400,
};
export const fxEnd = (f: Fx) => f.at + FX_MS[f.k];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
const rnd = (id: number, i: number) => ((i * 7919 + id * 104729 + 13) % 1000) / 1000;
const fmt = (n: number) => n.toLocaleString('vi-VN');
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

function Stamp({ text, color, cx, cy, p, W, H, w = 100, h = 34, font = 16, icon }: {
  text: string; color: string; cx: number; cy: number; p: number; W: number; H: number;
  w?: number; h?: number; font?: number; icon?: string;
}) {
  const land = Math.min(1, p / 0.16);
  const settle = p > 0.16 && p < 0.3 ? Math.sin(((p - 0.16) / 0.14) * Math.PI) * 0.09 : 0;
  const scale = 1 + (1 - easeOut(land)) * 2.4 + settle;
  const opacity = p < 0.78 ? Math.min(1, p / 0.08) : Math.max(0, (1 - p) / 0.22);
  const x = clamp(cx - w / 2, 3, W - w - 3);
  const y = clamp(cy - h / 2, 3, H - h - 3);
  return (
    <View
      pointerEvents="none"
      style={[styles.stamp, { left: x, top: y, width: w, height: h, borderColor: color, opacity, transform: [{ rotate: '-9deg' }, { scale }] }]}
    >
      {icon && <Image source={{ uri: icon }} style={{ width: font + 4, height: font + 4 }} />}
      <T style={{ color, fontWeight: '900', fontSize: font, letterSpacing: 0.5 }}>{text}</T>
    </View>
  );
}

function Coin({ x, y, s, o = 1, rot = 0 }: { x: number; y: number; s: number; o?: number; rot?: number }) {
  return (
    <Image
      source={{ uri: FX_ICON.coin }}
      style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, opacity: o, transform: [{ rotate: `${rot}deg` }] }}
    />
  );
}

function Label({ text, x, y, color, p, size = 15 }: { text: string; x: number; y: number; color: string; p: number; size?: number }) {
  return (
    <T
      style={{
        position: 'absolute', left: x - 50, width: 100, textAlign: 'center', top: y - 10 - p * 22,
        fontWeight: '900', fontSize: size, color, opacity: p < 0.7 ? 1 : (1 - p) / 0.3,
        textShadowColor: C.ink, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0,
        transform: [{ scale: 1 + (1 - Math.min(1, p / 0.2)) * 0.6 }],
      }}
    >
      {text}
    </T>
  );
}

/** Lớp hiệu ứng phủ trên bàn (toạ độ bàn cờ). Chỉ vẽ lại theo nhịp `now`, không đụng tới các ô. */
export function TyPhuFxLayer({ fx, now, cells, W, H, center }: {
  fx: Fx[]; now: number; cells: Rect[]; W: number; H: number; center: Rect;
}) {
  return (
    <View pointerEvents="none" style={styles.layer}>
      {fx.map((f) => {
        const p = (now - f.at) / FX_MS[f.k];
        if (p < 0 || p > 1) return null;
        const key = `${f.k}-${f.id}`;
        switch (f.k) {
          case 'stamp': {
            const r = cells[f.cell];
            const m = mid(r);
            return (
              <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={{ position: 'absolute', left: r.x, top: r.y, width: r.w * Math.min(1, p / 0.22), height: r.h, backgroundColor: f.color, opacity: 0.55 * (1 - p) }} />
                <Stamp text={f.text} color={f.color} cx={m.x} cy={m.y} p={p} W={W} H={H} />
              </View>
            );
          }
          case 'build': {
            const r = cells[f.cell];
            const m = mid(r);
            const sc = p < 0.25 ? (p / 0.25) * 1.6 : p < 0.4 ? 1.6 - ((p - 0.25) / 0.15) * 0.5 : 1.1;
            const size = clamp(Math.min(r.w, r.h) * 0.8, 24, 38);
            const ring = clamp(p / 0.5, 0, 1);
            return (
              <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
                <View style={{ position: 'absolute', left: m.x - 22 * ring - 4, top: m.y - 22 * ring - 4, width: 44 * ring + 8, height: 44 * ring + 8, borderRadius: 40, borderWidth: 3, borderColor: C.gold, opacity: 1 - ring }} />
                <Image
                  source={{ uri: f.level >= 4 ? FX_ICON.hotel : FX_ICON.house }}
                  style={{ position: 'absolute', left: clamp(m.x - size / 2, 0, W - size), top: m.y - size / 2 - p * 16, width: size, height: size, opacity: p < 0.75 ? 1 : (1 - p) / 0.25, transform: [{ scale: sc }] }}
                />
              </View>
            );
          }
          case 'rent': {
            const a = mid(f.from);
            const b = mid(f.to);
            const coins = [];
            for (let k = 0; k < 9; k++) {
              const t = clamp((p - k * 0.05) / 0.5, 0, 1);
              if (t <= 0 || t >= 1) continue;
              const e = easeOut(t);
              const cx = a.x + (b.x - a.x) * e;
              const cy = a.y + (b.y - a.y) * e - Math.sin(e * Math.PI) * 46 + (rnd(f.id, k) - 0.5) * 14;
              coins.push(<Coin key={k} x={cx + (rnd(f.id, k + 9) - 0.5) * 16} y={cy} s={18} rot={t * 360} />);
            }
            return (
              <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
                {coins}
                {p < 0.55 && <Label text={`-${fmt(f.amount)}`} x={a.x} y={a.y} color="#FF6B6B" p={p / 0.55} />}
                {p > 0.3 && <Label text={`+${fmt(f.amount)}`} x={b.x} y={b.y} color="#69DB7C" p={(p - 0.3) / 0.7} />}
              </View>
            );
          }
          case 'float': {
            const m = mid(f.at2);
            return <Label key={key} text={`${f.delta > 0 ? '+' : '-'}${fmt(Math.abs(f.delta))}`} x={m.x} y={m.y} color={f.delta > 0 ? '#69DB7C' : '#FF6B6B'} p={p} />;
          }
          case 'start': {
            const r = cells[0];
            const m = mid(r);
            const e = easeOut(p);
            const coins = [];
            for (let k = 0; k < 10; k++) {
              const ang = (k / 10) * Math.PI * 2 + rnd(f.id, k) * 0.5;
              const d = e * (34 + rnd(f.id, k + 3) * 22);
              coins.push(<Coin key={k} x={clamp(m.x + Math.cos(ang) * d, 8, W - 8)} y={clamp(m.y + Math.sin(ang) * d + p * p * 26, 8, H - 8)} s={16} o={1 - p * p} rot={p * 540} />);
            }
            return (
              <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
                {coins}
                <Stamp text={`+${TYPHU_PASS_START}$`} color="#0B8A5F" cx={m.x - 8} cy={m.y - 30 - p * 24} p={Math.min(0.7, p)} W={W} H={H} w={92} h={38} font={22} icon={FX_ICON.flag} />
              </View>
            );
          }
          case 'jail': {
            const r = cells[f.cell];
            const m = mid(r);
            const slide = easeOut(clamp(p / 0.25, 0, 1));
            const flash = Math.floor(p * 14) % 2 === 0;
            const fade = p > 0.85 ? (1 - p) / 0.15 : 1;
            const bars = [];
            const n = 5;
            for (let k = 0; k < n; k++) {
              bars.push(
                <View key={k} style={{ position: 'absolute', left: r.x + (r.w / n) * (k + 0.5) - 2.5, top: r.y - r.h * (1 - slide), width: 5, height: r.h, backgroundColor: '#3B2A2A', borderRadius: 3, borderWidth: 1, borderColor: '#999' }} />,
              );
            }
            return (
              <View key={key} pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
                <View style={{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, backgroundColor: flash ? 'rgba(255,40,40,0.38)' : 'rgba(40,90,255,0.32)' }} />
                {bars}
                <View style={{ position: 'absolute', left: r.x, top: r.y + r.h * 0.45, width: r.w, height: 5, backgroundColor: '#3B2A2A', opacity: slide }} />
                <Image source={{ uri: FX_ICON.siren }} style={{ position: 'absolute', left: clamp(m.x - 16, 0, W - 32), top: r.y - 30 - (flash ? 3 : 0), width: 32, height: 32, transform: [{ scale: flash ? 1.2 : 0.95 }] }} />
                <Stamp text="VÀO TÙ!" color={C.son} cx={m.x + 30} cy={r.y - 26} p={Math.min(0.75, p)} W={W} H={H} w={96} />
              </View>
            );
          }
          case 'bankrupt': {
            const bills = [];
            for (let k = 0; k < 26; k++) {
              const sp = 0.55 + rnd(f.id, k) * 0.5;
              const t = clamp(p * sp * 1.25 - rnd(f.id, k + 50) * 0.2, 0, 1.2);
              if (t <= 0 || t > 1) continue;
              const x = rnd(f.id, k + 100) * (W - 24) + Math.sin(t * 9 + k) * 14;
              bills.push(
                <Image key={k} source={{ uri: k % 4 === 0 ? FX_ICON.skull : FX_ICON.bill }} style={{ position: 'absolute', left: x, top: -26 + t * (H + 40), width: 24, height: 24, opacity: p > 0.85 ? (1 - p) / 0.15 : 1, transform: [{ rotate: `${t * 720 * (k % 2 ? 1 : -1)}deg` }] }} />,
              );
            }
            const m = mid(center);
            return (
              <View key={key} pointerEvents="none" style={StyleSheet.absoluteFill}>
                {bills}
                <Stamp text="PHÁ SẢN" color="#6B2B2B" cx={m.x} cy={m.y} p={Math.min(0.85, p)} W={W} H={H} w={Math.min(210, center.w - 10)} h={52} font={24} icon={FX_ICON.skull} />
                <T style={{ position: 'absolute', left: m.x - 100, width: 200, top: m.y + 34, textAlign: 'center', fontWeight: '900', color: '#6B2B2B', fontSize: 14, opacity: p < 0.2 ? 0 : p > 0.85 ? (1 - p) / 0.15 : 1 }}>
                  {f.name}
                </T>
              </View>
            );
          }
        }
      })}
    </View>
  );
}

/** Quân cờ: ghim tròn mang mặt người chơi, viền màu riêng, bóng đổ; nhảy vòm khi di chuyển. */
export function Pawn({ testID, label, uri, color, light, x, y, size, hop, active, moving }: {
  testID: string; label: string; uri: string; color: string; light: string;
  x: number; y: number; size: number; hop: number; active: boolean; moving: boolean;
}) {
  const lift = Math.min(1, hop / 14);
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityLabel={label}
      style={{ position: 'absolute', left: x - size / 2, top: y - size * 0.74 - hop, width: size, height: size * 1.25, zIndex: moving ? 16 : active ? 13 : 10 }}
    >
      {/* bóng dưới chân */}
      <View
        style={{
          position: 'absolute', left: size * 0.12 + lift * size * 0.1, width: size * 0.76 - lift * size * 0.2, height: size * 0.2,
          top: size * 1.2 + hop, borderRadius: size, backgroundColor: 'rgba(0,0,0,0.3)', opacity: 1 - lift * 0.5,
        }}
      />
      {/* đuôi nhọn */}
      <View style={{ position: 'absolute', left: size * 0.5 - size * 0.17, top: size * 0.82, width: size * 0.34, height: size * 0.34, backgroundColor: color, transform: [{ rotate: '45deg' }], borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.ink }} />
      <View
        style={{
          width: size, height: size, borderRadius: size / 2, backgroundColor: light, borderWidth: Math.max(3, size * 0.12), borderColor: color,
          overflow: 'hidden', shadowColor: active ? C.gold : C.ink, shadowOffset: { width: 0, height: active ? 0 : 2 }, shadowOpacity: active ? 1 : 0.55, shadowRadius: active ? 7 : 2,
          boxShadow: `0 0 0 1.5px ${C.ink}${active ? `, 0 0 0 4px ${C.gold}` : ''}`,
        } as object}
      >
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      </View>
    </View>
  );
}

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]], 6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/** Xúc xắc to: lăn xoay -> nảy lên -> đáp xuống. Mọi chuyển động tính theo `elapsed` nên không cần Animated. */
export function TyPhuDie({ testID, value, size, phase, elapsed, seed }: {
  testID: string; value: number | null; size: number; phase: 'roll' | 'bounce' | 'reveal'; elapsed: number; seed: number;
}) {
  let rot = 0; let ty = 0; let tx = 0; let sc = 1; let shadow = 1;
  if (phase === 'roll') {
    rot = elapsed * (seed ? 1.5 : -1.3) * (seed ? 1 : 1);
    tx = Math.sin(elapsed / 38 + seed) * 4;
    ty = -Math.abs(Math.sin(elapsed / 90 + seed)) * 14;
    sc = 1.08;
    shadow = 0.7;
  } else if (phase === 'bounce') {
    const t = clamp((elapsed - 400) / 140, 0, 1);
    ty = -Math.sin(t * Math.PI) * size * 0.35;
    rot = (1 - t) * 20 * (seed ? 1 : -1);
    sc = 1 + Math.sin(t * Math.PI) * 0.1;
    shadow = 1 - Math.sin(t * Math.PI) * 0.4;
  }
  const pip = size / 6;
  const face = value ? PIPS[value] : [];
  return (
    <View style={{ width: size + 6, height: size + 14, alignItems: 'center' }}>
      <View style={{ position: 'absolute', bottom: 1, width: size * 0.8 * shadow, height: size * 0.14, borderRadius: size, backgroundColor: 'rgba(42,10,16,0.28)' }} />
      <View
        testID={testID}
        accessibilityLabel={value ? `Xúc xắc ra ${value}` : 'Xúc xắc'}
        style={{
          marginTop: 2, width: size, height: size, borderRadius: size * 0.22, backgroundColor: C.paper,
          borderWidth: 3, borderColor: C.ink, shadowColor: C.ink, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
          transform: [{ translateX: tx }, { translateY: ty }, { rotate: `${rot}deg` }, { scale: sc }],
        }}
      >
        {face.map(([r, c], i) => (
          <View
            key={i}
            style={{
              position: 'absolute', width: pip * 1.15, height: pip * 1.15, borderRadius: pip, backgroundColor: value === 1 ? C.son : C.ink,
              top: (size - 6) * (0.2 + 0.3 * r) - pip * 0.575, left: (size - 6) * (0.2 + 0.3 * c) - pip * 0.575,
            }}
          />
        ))}
        {!value && <Image source={{ uri: FX_ICON.dice }} style={{ width: size * 0.6, height: size * 0.6, margin: size * 0.14 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30 },
  stamp: {
    position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 3.5, borderRadius: 8,
    shadowColor: C.ink, shadowOffset: { width: 2, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
  },
});
