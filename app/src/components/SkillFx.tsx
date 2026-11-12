/**
 * Hiệu ứng của kỹ năng chọc trả Ruby, quà tặng và hiệu ứng vào phòng.
 * - sét / băng / bánh kem / nước / chó: phủ lên màn hình người bị chọc (người khác chỉ thấy avatar + thông báo)
 * - tên lửa / hôn gió: bay từ người gửi tới avatar người nhận
 * - quà: hiệu ứng tràn màn hình cho cả phòng, không chặn thao tác
 * - vào phòng: sao rơi + câu "X đã xuất hiện"
 * Chỉ để vui, không ảnh hưởng ván chơi.
 */
import { useCallback, useContext, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { shopItem } from '../../../shared/src/shop';
import type { FunEvent, PublicPlayer } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { ViewportContext } from '../hooks';
import { setMood, setTint, setWobble } from '../funState';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT } from '../theme';
import { T, useFeed } from '../ui';
import { Confetti, rectOf, type Rect } from './Fun';

type Size = { w: number; h: number };
const EASE_IN = Easing.in(Easing.quad);
const EASE_OUT = Easing.out(Easing.quad);
const web = (o: Record<string, unknown>) => o as object;

/** giữ callback mới nhất mà không làm hiệu ứng chạy lại */
function useLatest<T>(v: T) {
  const r = useRef(v);
  useEffect(() => { r.current = v; }, [v]);
  return r;
}

/** chạy một Animated.Value 0 -> 1 trong `ms`, xong thì gọi onDone */
function useRun(ms: number, onDone: () => void, easing: (x: number) => number = Easing.linear) {
  const t = useState(() => new Animated.Value(0))[0];
  const done = useLatest(onDone);
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: ms, easing, useNativeDriver: false });
    a.start(({ finished }) => finished && done.current());
    return () => a.stop();
  }, [t, ms, done, easing]);
  return t;
}

// ---------- phủ lên màn hình người bị chọc ----------

/** sét đánh: chớp trắng nhiều lần */
function LightningFx({ onDone }: { onDone: () => void }) {
  const a = useState(() => new Animated.Value(0))[0];
  const done = useLatest(onDone);
  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 40, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0.05, duration: 90, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0.9, duration: 50, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 140, useNativeDriver: false }),
      Animated.delay(120),
      Animated.timing(a, { toValue: 0.7, duration: 40, useNativeDriver: false }),
      Animated.timing(a, { toValue: 0, duration: 420, useNativeDriver: false }),
    ]);
    seq.start(({ finished }) => finished && done.current());
    return () => seq.stop();
  }, [a, done]);
  return (
    <Animated.View testID="lightning-fx" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#fff', opacity: a, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 120 }}>⚡</Text>
    </Animated.View>
  );
}

/** đóng băng: viền băng phủ mép màn hình 4 giây */
function FreezeFx({ onDone }: { onDone: () => void }) {
  const t = useRun(4000, onDone);
  return (
    <Animated.View
      testID="freeze-fx"
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderWidth: 22, borderColor: 'rgba(176,228,255,0.8)',
          opacity: t.interpolate({ inputRange: [0, 0.08, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        },
        web({ boxShadow: 'inset 0 0 70px 36px rgba(210,242,255,0.95), inset 0 0 160px 60px rgba(120,200,255,0.45)' }),
      ]}
    >
      <Text style={{ position: 'absolute', top: 6, left: 10, fontSize: 34 }}>🧊</Text>
      <Text style={{ position: 'absolute', top: 6, right: 10, fontSize: 34 }}>❄️</Text>
      <Text style={{ position: 'absolute', bottom: 6, left: 10, fontSize: 34 }}>❄️</Text>
      <Text style={{ position: 'absolute', bottom: 6, right: 10, fontSize: 34 }}>🧊</Text>
    </Animated.View>
  );
}

/** bánh kem dính ở một góc; chạm để lau, tự trôi sau ~7 giây */
function CakeFx({ corner, size, onDone }: { corner: number; size: Size; onDone: () => void }) {
  const wipe = useState(() => new Animated.Value(1))[0];
  const t = useRun(7000, onDone);
  const done = useLatest(onDone);
  const right = corner % 2 === 1;
  const bottom = corner >= 2;
  const S = Math.min(170, size.w * 0.44);
  const blobs: [number, number, number, string][] = [
    [0.5, 0.5, 0.7, '#FFF4E0'], [0.3, 0.62, 0.42, '#FFE3EC'], [0.72, 0.32, 0.46, '#FFF9EE'], [0.28, 0.28, 0.3, '#FFD6E5'], [0.76, 0.74, 0.3, '#FFE9B8'],
  ];
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', width: S, height: S,
        [right ? 'right' : 'left']: -S * 0.1,
        ...(bottom ? { bottom: Math.min(150, size.h * 0.22) } : { top: 150 }),
        opacity: Animated.multiply(wipe, t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] })),
      }}
    >
      <Pressable
        testID="cake-fx"
        accessibilityRole="button"
        accessibilityLabel="Lau bánh kem"
        style={{ width: S, height: S }}
        onPress={() => {
          play('pop');
          Animated.timing(wipe, { toValue: 0, duration: 180, useNativeDriver: false }).start(() => done.current());
        }}
      >
        {blobs.map(([x, y, r, col], i) => (
          <View key={i} style={{ position: 'absolute', width: S * r, height: S * r, borderRadius: S * r, backgroundColor: col, left: S * x - (S * r) / 2, top: S * y - (S * r) / 2, borderWidth: 2, borderColor: '#E9B8A0' }} />
        ))}
        <Text style={{ position: 'absolute', left: S * 0.3, top: S * 0.2, fontSize: S * 0.28 }}>🍓</Text>
        <Text style={{ position: 'absolute', left: S * 0.55, top: S * 0.5, fontSize: S * 0.22 }}>🎂</Text>
        <Text style={styles.hint}>lau đi 🧽</Text>
      </Pressable>
    </Animated.View>
  );
}

/** tạt nước: giọt nước chảy dọc màn hình 3 giây */
function WaterFx({ size, onDone }: { size: Size; onDone: () => void }) {
  const t = useRun(3200, onDone);
  const [drops] = useState(() => Array.from({ length: 16 }, (_, i) => ({
    x: Math.random() * Math.max(40, size.w - 30),
    delay: Math.random() * 0.35,
    len: 0.5 + Math.random() * 0.35,
    size: 22 + Math.random() * 18,
    i,
  })));
  return (
    <Animated.View
      testID="water-fx"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(80,160,255,0.16)', opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }) }]}
    >
      {drops.map((d) => (
        <Animated.Text
          key={d.i}
          style={{
            position: 'absolute', left: d.x, fontSize: d.size,
            top: t.interpolate({ inputRange: [d.delay, Math.min(1, d.delay + d.len)], outputRange: [-40, size.h + 20], extrapolate: 'clamp' }),
          }}
        >
          💧
        </Animated.Text>
      ))}
    </Animated.View>
  );
}

/** thả chó: chú chó chạy ngang màn hình, nhún nhảy */
function DogFx({ flip, size, onDone }: { flip: boolean; size: Size; onDone: () => void }) {
  const t = useRun(2600, onDone);
  const y = Math.max(140, size.h * 0.55);
  const from = flip ? size.w + 80 : -90;
  const to = flip ? -90 : size.w + 80;
  return (
    <Animated.Text
      testID="dog-fx"
      pointerEvents="none"
      style={{
        position: 'absolute', fontSize: 72, top: y,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [from, to] }),
        transform: [
          { scaleX: flip ? 1 : -1 },
          { translateY: t.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1], outputRange: [0, -22, 0, -22, 0, -22, 0, -22, 0, -22, 0] }) },
        ],
      }}
    >
      🐕
    </Animated.Text>
  );
}

// ---------- bay từ người gửi tới người nhận ----------

type Flight = { id: number; emoji: string; from: Rect; to: Rect; ms: number; arc: boolean; after?: () => void };

function FlightFx({ f, onDone }: { f: Flight; onDone: () => void }) {
  const finish = useCallback(() => {
    f.after?.();
    onDone();
  }, [f, onDone]);
  const t = useRun(f.ms, finish, EASE_IN);
  const fx = f.from.x + f.from.w / 2 - 22;
  const fy = f.from.y + f.from.h / 2 - 22;
  const tx = f.to.x + f.to.w / 2 - 22;
  const ty = f.to.y + f.to.h / 2 - 22;
  // biểu tượng hướng lên (🚀 chếch 45°): quay về hướng bay
  const ang = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI + 45;
  return (
    <Animated.Text
      style={{
        position: 'absolute', fontSize: 44, zIndex: 90,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
        top: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fy, f.arc ? Math.min(fy, ty) - 70 : (fy + ty) / 2, ty] }),
        transform: f.arc ? [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] : [{ rotate: `${ang}deg` }],
      }}
    >
      {f.emoji}
    </Animated.Text>
  );
}

/** nổ / tim bay lên tại avatar */
function Burst({ emoji, at, big, onDone }: { emoji: string; at: Rect; big?: boolean; onDone: () => void }) {
  const t = useRun(big ? 1100 : 1800, onDone, EASE_OUT);
  return (
    <Animated.Text
      style={{
        position: 'absolute', fontSize: big ? 84 : 40, zIndex: 92,
        left: at.x + at.w / 2 - (big ? 42 : 20),
        top: t.interpolate({ inputRange: [0, 1], outputRange: [at.y + at.h / 2 - (big ? 42 : 20), at.y + at.h / 2 - (big ? 60 : 110)] }),
        opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1.4, big ? 1.8 : 1.1] }) }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// ---------- quà tặng ----------

type GiftShow = { id: number; gift: string; from: string; to: string };

const GIFT_MS: Record<string, number> = { gift_rose: 3200, gift_cake: 4000, gift_car: 3600, gift_yacht: 4600, gift_castle: 5200 };

function GiftFx({ g, size, onDone }: { g: GiftShow; size: Size; onDone: () => void }) {
  const item = shopItem(g.gift);
  const ms = GIFT_MS[g.gift] ?? 3500;
  const t = useRun(ms, onDone);
  const emoji = item?.emoji ?? '🎁';
  const big = g.gift === 'gift_car' || g.gift === 'gift_yacht' || g.gift === 'gift_castle';
  const [hearts] = useState(() => Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * Math.max(40, size.w - 40), d: Math.random() * 0.4, s: 24 + Math.random() * 22, e: i % 3 === 0 ? '🌹' : '❤️', i })));
  const banner = (
    <Animated.View
      style={[styles.giftBanner, { opacity: t.interpolate({ inputRange: [0, 0.08, 0.85, 1], outputRange: [0, 1, 1, 0] }), transform: [{ scale: t.interpolate({ inputRange: [0, 0.1, 1], outputRange: [0.6, 1.08, 1] }) }] }]}
    >
      <T style={styles.giftText}>{g.from} tặng {g.to} {emoji} {item?.name ?? 'quà'}</T>
    </Animated.View>
  );
  return (
    <View testID={`gift-fx-${g.gift}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {g.gift === 'gift_rose' &&
        hearts.map((h) => (
          <Animated.Text
            key={h.i}
            style={{
              position: 'absolute', left: h.x, fontSize: h.s,
              top: t.interpolate({ inputRange: [h.d, 1], outputRange: [size.h + 20, -50], extrapolate: 'clamp' }),
              opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            }}
          >
            {h.e}
          </Animated.Text>
        ))}
      {g.gift === 'gift_cake' && (
        <>
          <Confetti />
          <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: size.h * 0.3, alignItems: 'center', transform: [{ scale: t.interpolate({ inputRange: [0, 0.15, 0.5, 1], outputRange: [0.2, 1.2, 1, 1.05] }) }], opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) }}>
            <Text style={{ fontSize: 110 }}>🎂</Text>
            <Text style={{ fontSize: 40, marginTop: -150, marginLeft: 6 }}>🕯️</Text>
          </Animated.View>
        </>
      )}
      {big && (
        <>
          {g.gift === 'gift_castle' && <Confetti />}
          <Animated.Text
            style={{
              position: 'absolute', fontSize: g.gift === 'gift_castle' ? 150 : 130, top: size.h * 0.34,
              left: t.interpolate({ inputRange: [0, 1], outputRange: [g.gift === 'gift_castle' ? size.w * 0.12 : -200, g.gift === 'gift_castle' ? size.w * 0.12 : size.w + 60] }),
              opacity: g.gift === 'gift_castle' ? t.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }) : 1,
              transform: g.gift === 'gift_castle' ? [{ scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.15, 1] }) }] : [],
            }}
          >
            {emoji}
          </Animated.Text>
          {[0, 1, 2, 3].map((k) => (
            <Animated.Text
              key={k}
              style={{
                position: 'absolute', fontSize: 28, top: size.h * 0.34 + 20 + (k % 2) * 70,
                left: t.interpolate({ inputRange: [0, 1], outputRange: [-200 - k * 40, size.w + 60 - k * 40] }),
                opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 1, 0.2] }),
              }}
            >
              ✨
            </Animated.Text>
          ))}
        </>
      )}
      {banner}
    </View>
  );
}

/** sao rơi + "X đã xuất hiện" khi người có hiệu ứng vào phòng */
function EntranceFx({ name, size, onDone }: { name: string; size: Size; onDone: () => void }) {
  const t = useRun(3200, onDone);
  const [stars] = useState(() => Array.from({ length: 16 }, (_, i) => ({ x: Math.random() * Math.max(40, size.w - 30), d: Math.random() * 0.4, s: 22 + Math.random() * 20, i })));
  return (
    <View testID="entrance-fx" pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((s) => (
        <Animated.Text
          key={s.i}
          style={{
            position: 'absolute', left: s.x, fontSize: s.s,
            top: t.interpolate({ inputRange: [s.d, Math.min(1, s.d + 0.55)], outputRange: [-40, size.h * 0.7], extrapolate: 'clamp' }),
            opacity: t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
          }}
        >
          {s.i % 2 ? '⭐' : '🌟'}
        </Animated.Text>
      ))}
      <Animated.View style={[styles.giftBanner, { top: size.h * 0.22, opacity: t.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] }) }]}>
        <T style={styles.giftText}>🌟 {name} đã xuất hiện!</T>
      </Animated.View>
    </View>
  );
}

// ---------- lớp gắn vào Shell ----------

type Screen =
  | { id: number; kind: 'lightning' }
  | { id: number; kind: 'freeze' }
  | { id: number; kind: 'cake'; corner: number }
  | { id: number; kind: 'water' }
  | { id: number; kind: 'dog'; flip: boolean };
type Show = { id: number; kind: 'gift'; g: GiftShow } | { id: number; kind: 'entrance'; name: string };

const SKILL_LINE: Record<string, (from: string, to: string) => string> = {
  lightning: (a, b) => `⚡ ${a} đánh sét ${b}!`,
  freeze: (a, b) => `🧊 ${a} đóng băng ${b}!`,
  cake: (a, b) => `🎂 ${a} úp bánh kem vào mặt ${b}!`,
  water: (a, b) => `💦 ${a} tạt nước ${b}!`,
  dog: (a, b) => `🐕 ${a} thả chó đuổi ${b}!`,
  rocket: (a, b) => `🚀 ${a} bắn tên lửa vào ${b}!`,
  kiss: (a, b) => `😘 ${a} gửi nụ hôn gió cho ${b}`,
};

export function SkillLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bursts, setBursts] = useState<{ id: number; emoji: string; at: Rect; big?: boolean }[]>([]);
  const [size, setSize] = useState<Size>(() => ({
    w: typeof window === 'undefined' ? 390 : Math.min(window.innerWidth, 520),
    h: typeof window === 'undefined' ? 844 : window.innerHeight,
  }));
  const layer = useRef<ComponentRef<typeof View>>(null);
  const seq = useRef(0);
  const feed = useFeed();
  const vp = useContext(ViewportContext);
  const rotatedRef = useLatest(!!vp?.rotated);
  const playersRef = useLatest(players);

  const dropScreen = useCallback((id: number) => setScreens((xs) => xs.filter((x) => x.id !== id)), []);
  const dropShow = useCallback((id: number) => setShows((xs) => xs.filter((x) => x.id !== id)), []);
  const dropFlight = useCallback((id: number) => setFlights((xs) => xs.filter((x) => x.id !== id)), []);
  const dropBurst = useCallback((id: number) => setBursts((xs) => xs.filter((x) => x.id !== id)), []);

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      const origin = (layer.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      const rot = rotatedRef.current;
      if (e.kind === 'entrance') {
        play('sparkle');
        setShows((xs) => [...xs.slice(-2), { id: ++seq.current, kind: 'entrance', name: nameOf(e.from) === 'bạn' ? 'Bạn' : nameOf(e.from) }]);
        return;
      }
      if (e.kind === 'gift') {
        const item = shopItem(e.gift);
        const toMe = e.to === game.me;
        play(e.gift === 'gift_rose' ? 'sparkle' : 'win');
        if (toMe) vibrate([60, 40, 120]);
        setShows((xs) => [...xs.slice(-2), { id: ++seq.current, kind: 'gift', g: { id: 0, gift: e.gift, from: e.from === game.me ? 'Bạn' : nameOf(e.from), to: toMe ? 'bạn' : nameOf(e.to) } }]);
        feed(`🎁 ${e.from === game.me ? 'Bạn' : nameOf(e.from)} tặng ${toMe ? 'bạn' : nameOf(e.to)} ${item?.emoji ?? ''} ${item?.name ?? 'quà'}`, toMe ? 'good' : 'fun');
        return;
      }
      if (!('to' in e)) return;
      const k = e.kind;
      if (!(k in SKILL_LINE)) return;
      const toMe = e.to === game.me;
      const from = nameOf(e.from);
      feed(SKILL_LINE[k](from === 'bạn' ? 'Bạn' : from, toMe ? 'bạn' : nameOf(e.to)), toMe && k !== 'kiss' ? 'bad' : 'fun');
      if (k === 'lightning') {
        setTint(e.to, 'burnt', 5000);
        setMood(e.to, 'shock', 3000);
        setWobble(e.to, 'shake', 1200);
        play('zap');
        if (toMe && !e.soft) {
          vibrate([60, 30, 200]);
          setScreens((xs) => [...xs, { id: ++seq.current, kind: 'lightning' }]);
        }
      } else if (k === 'freeze') {
        setTint(e.to, 'ice', 4000);
        setMood(e.to, 'shock', 2500);
        play('sad');
        if (toMe && !e.soft) {
          vibrate(150);
          setScreens((xs) => [...xs.filter((x) => x.kind !== 'freeze'), { id: ++seq.current, kind: 'freeze' }]);
        }
      } else if (k === 'cake') {
        setMood(e.to, 'shock', 3000);
        play('splat');
        if (toMe && !e.soft) {
          vibrate(100);
          setScreens((xs) => [...xs, { id: ++seq.current, kind: 'cake', corner: e.corner ?? 0 }]);
        }
      } else if (k === 'water') {
        setMood(e.to, 'shock', 2500);
        play('splat');
        if (toMe && !e.soft) setScreens((xs) => [...xs.filter((x) => x.kind !== 'water'), { id: ++seq.current, kind: 'water' }]);
      } else if (k === 'dog') {
        setMood(e.to, 'shock', 2500);
        play('bark');
        if (toMe && !e.soft) {
          vibrate([80, 60, 80]);
          setScreens((xs) => [...xs, { id: ++seq.current, kind: 'dog', flip: (e.variant ?? 0) === 1 }]);
        }
      } else if (k === 'rocket' || k === 'kiss') {
        const fromR = rectOf(`avatar-${e.from}`, origin, rot);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        const rocket = k === 'rocket';
        const land = () => {
          if (rocket) {
            setMood(e.to, 'dizzy', 3000);
            setWobble(e.to, 'shake', 1500);
            play('boom');
            if (toMe) vibrate([120, 50, 200]);
          } else {
            setTint(e.to, 'blush', 3000);
            setMood(e.to, 'smug', 3000);
            play('sparkle');
          }
          if (toR) setBursts((xs) => [...xs.slice(-6), { id: ++seq.current, emoji: rocket ? '💥' : '❤️', at: toR, big: rocket }]);
        };
        play(rocket ? 'rocket' : 'whoosh');
        if (fromR && toR) setFlights((xs) => [...xs.slice(-6), { id: ++seq.current, emoji: rocket ? '🚀' : '😘', from: fromR, to: toR, ms: rocket ? 900 : 700, arc: !rocket, after: land }]);
        else land();
      }
    });
  }, [game, feed, playersRef, rotatedRef]);

  return (
    <>
      {/* bay / nổ: nằm trên cùng, không bắt chạm */}
      <View ref={layer} pointerEvents="none" style={StyleSheet.absoluteFill}>
        {flights.map((f) => <FlightFx key={f.id} f={f} onDone={() => dropFlight(f.id)} />)}
        {bursts.map((b) => <Burst key={b.id} emoji={b.emoji} at={b.at} big={b.big} onDone={() => dropBurst(b.id)} />)}
      </View>
      {shows.length > 0 && (
        <View pointerEvents="none" style={styles.layer}>
          {shows.map((s) => s.kind === 'gift'
            ? <GiftFx key={s.id} g={s.g} size={size} onDone={() => dropShow(s.id)} />
            : <EntranceFx key={s.id} name={s.name} size={size} onDone={() => dropShow(s.id)} />)}
        </View>
      )}
      {screens.length > 0 && (
        <View pointerEvents="box-none" style={styles.layer} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
          {screens.map((s) =>
            s.kind === 'lightning' ? <LightningFx key={s.id} onDone={() => dropScreen(s.id)} />
            : s.kind === 'freeze' ? <FreezeFx key={s.id} onDone={() => dropScreen(s.id)} />
            : s.kind === 'cake' ? <CakeFx key={s.id} corner={s.corner} size={size} onDone={() => dropScreen(s.id)} />
            : s.kind === 'water' ? <WaterFx key={s.id} size={size} onDone={() => dropScreen(s.id)} />
            : <DogFx key={s.id} flip={s.flip} size={size} onDone={() => dropScreen(s.id)} />)}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 86, overflow: 'hidden' },
  hint: { position: 'absolute', alignSelf: 'center', top: '44%', fontFamily: FONT, fontWeight: '900', fontSize: 13, color: 'rgba(60,40,30,0.6)' },
  giftBanner: {
    position: 'absolute', top: '12%', alignSelf: 'center', maxWidth: '92%', backgroundColor: 'rgba(30,10,10,0.82)', borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 10, borderWidth: 3, borderColor: C.gold,
  },
  giftText: { color: C.gold, fontSize: 20, fontWeight: '900', textAlign: 'center' },
});
