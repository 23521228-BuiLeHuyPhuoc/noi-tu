/**
 * Hiệu ứng phụ ngẫu nhiên kèm mỗi món chọc (server bốc, xem SCREEN_SIDES / AVATAR_SIDES trong shared/src/pokes.ts).
 * - Avatar (cả phòng thấy): hóa heo, hóa đá, em bé, nhốt lồng, bom hẹn giờ, tên viết ngược.
 * - Màn hình (chỉ người bị chọc): say xỉn, kính nứt, sương mù, đèn chập chờn, đen trắng, né tay, đứng hình, cuộc gọi đến.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { isAvatarSide, type ScreenSide } from '../../../shared/src/pokes';
import type { FunEvent, PublicPlayer } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { setMood, setMorph, setWobble } from '../funState';
import { play } from '../sound';
import { vibrate } from '../web';
import { FONT } from '../theme';
import { useShake } from './Fun';

/** chờ món bay tới avatar rồi mới bật hiệu ứng phụ */
const IMPACT_MS = 650;
const AVATAR_MS = { pig: 12000, baby: 12000, stone: 12000, cage: 12000, bomb: 5000, flipname: 15000 } as const;
const SCREEN_MS: Record<ScreenSide, number> = {
  drunk: 4000, crack: 9000, fog: 9000, flicker: 2600, gray: 5000, dodge: 4000, freeze: 2500, ring: 3800,
};

type Active = { id: number; side: ScreenSide; seed: number; from: string };

/** số ngẫu nhiên 0..1 theo hạt giống (mọi lần vẽ lại ra cùng kết quả) */
const rand = (seed: number, i: number) => {
  const x = Math.sin(seed * 9301 + i * 49297) * 233280;
  return x - Math.floor(x);
};

export function PokeSideLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const shake = useShake();
  const [active, setActive] = useState<Active[]>([]);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  const shakeRef = useRef(shake);
  useEffect(() => { shakeRef.current = shake; }, [shake]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const drop = useCallback((id: number) => setActive((xs) => xs.filter((a) => a.id !== id)), []);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      setGray(false);
    };
  }, []);

  useEffect(() => game.onFun((e: FunEvent) => {
    if (e.kind !== 'poke' || !e.side) return;
    const side = e.side;
    const to = e.to;
    later(IMPACT_MS, () => {
      if (isAvatarSide(side)) {
        setMorph(to, side, AVATAR_MS[side]);
        if (side === 'bomb') {
          later(AVATAR_MS.bomb, () => {
            play('boom');
            setWobble(to, 'shake', 1200);
            setMood(to, 'shock', 2400);
            if (to === game.me) {
              vibrate([150, 50, 200]);
              shakeRef.current('quake');
            }
          });
        }
        return;
      }
      if (to !== game.me || e.soft) return;
      const from = playersRef.current.find((p) => p.id === e.from)?.name ?? '?';
      const id = ++seq.current;
      if (side === 'drunk') shakeRef.current('drunk');
      if (side === 'gray') setGray(true);
      if (side === 'ring') {
        play('siren');
        vibrate([400, 200, 400, 200, 400]);
      }
      if (side === 'crack') play('squash');
      if (side === 'freeze') play('error');
      setActive((xs) => [...xs.filter((a) => a.side !== side), { id, side, seed: e.variant ?? id, from }]);
      later(SCREEN_MS[side], () => {
        if (side === 'gray') setGray(false);
        drop(id);
      });
    });
  }), [game, later, drop]);

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 96 }]}>
      {active.map((a) => {
        const done = () => {
          if (a.side === 'gray') setGray(false);
          drop(a.id);
        };
        if (a.side === 'crack') return <Crack key={a.id} seed={a.seed} onDone={done} />;
        if (a.side === 'fog') return <Fog key={a.id} onDone={done} />;
        if (a.side === 'flicker') return <Flicker key={a.id} seed={a.seed} />;
        if (a.side === 'gray' && Platform.OS !== 'web') return <View key={a.id} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.grayNative]} />;
        if (a.side === 'dodge') return <Dodge key={a.id} onTap={() => shakeRef.current('dodge')} />;
        if (a.side === 'freeze') return <Freeze key={a.id} />;
        if (a.side === 'ring') return <Ring key={a.id} from={a.from} onDone={done} />;
        if (a.side === 'drunk') return <Text key={a.id} pointerEvents="none" style={styles.drunkHint}>🥴 Say quá trời say...</Text>;
        return null;
      })}
    </View>
  );
}

/** đen trắng cả trang (bản web dùng bộ lọc CSS; bản máy dùng lớp phủ xám) */
function setGray(on: boolean) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const el = document.getElementById('root') ?? document.body;
  el.style.filter = on ? 'grayscale(1) contrast(1.15)' : '';
  el.style.transition = 'filter 300ms';
}

/** kính nứt: các vết nứt tỏa ra từ chỗ bị trúng; chạm 3 lần để gỡ */
function Crack({ seed, onDone }: { seed: number; onDone: () => void }) {
  const [taps, setTaps] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const cx = box.w * (0.25 + rand(seed, 1) * 0.5);
  const cy = box.h * (0.25 + rand(seed, 2) * 0.5);
  const lines = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2 + rand(seed, i + 3) * 0.4;
    const len = 60 + rand(seed, i + 20) * Math.max(box.w, box.h) * 0.55;
    return { a, len };
  });
  const rings = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + rand(seed, i + 40) * 0.5;
    const r = 34 + rand(seed, i + 60) * 26;
    return { a, r };
  });
  return (
    <Pressable
      testID="side-crack"
      accessibilityLabel="Kính nứt, chạm 3 lần để gỡ"
      style={[StyleSheet.absoluteFill, { opacity: 1 - taps * 0.28 }]}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      onPress={() => (taps >= 2 ? onDone() : setTaps(taps + 1))}
    >
      {box.w > 0 && lines.map(({ a, len }, i) => (
        <View
          key={i}
          style={[styles.crackLine, {
            width: len, left: cx + (Math.cos(a) * len) / 2 - len / 2, top: cy + (Math.sin(a) * len) / 2 - 1,
            transform: [{ rotate: `${a}rad` }],
          }]}
        />
      ))}
      {box.w > 0 && rings.map(({ a, r }, i) => (
        <View
          key={`r${i}`}
          style={[styles.crackLine, {
            width: 26, left: cx + Math.cos(a) * r - 13, top: cy + Math.sin(a) * r - 1,
            transform: [{ rotate: `${a + Math.PI / 2}rad` }],
          }]}
        />
      ))}
      {box.w > 0 && <View style={[styles.crackHole, { left: cx - 9, top: cy - 9 }]} />}
      <Text style={styles.hint}>🔨 Chạm {3 - taps} lần để gỡ kính vỡ</Text>
    </Pressable>
  );
}

/** sương mù: phủ trắng đục, chạm vào chỗ nào thì lau sạch chỗ đó */
function Fog({ onDone }: { onDone: () => void }) {
  const COLS = 5;
  const ROWS = 9;
  const [wiped, setWiped] = useState<Set<number>>(() => new Set());
  const wipe = (i: number) => {
    const next = new Set(wiped);
    const r = Math.floor(i / COLS);
    const c = i % COLS;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) next.add(rr * COLS + cc);
    }
    if (next.size >= COLS * ROWS * 0.8) onDone();
    else setWiped(next);
  };
  return (
    <View testID="side-fog" style={[StyleSheet.absoluteFill, styles.fogGrid]}>
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <Pressable
          key={i}
          onPressIn={() => wipe(i)}
          onHoverIn={() => wiped.size > 0 && wipe(i)}
          style={[styles.fogCell, { width: `${100 / COLS}%`, height: `${100 / ROWS}%` }, wiped.has(i) && styles.fogClear]}
        />
      ))}
      <Text pointerEvents="none" style={[styles.hint, { color: '#5A5A66' }]}>🌫️ Sương mù! Chạm để lau</Text>
    </View>
  );
}

/** đèn chập chờn: tối – sáng không đều khoảng 2,5 giây */
function Flicker({ seed }: { seed: number }) {
  const o = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const steps = Array.from({ length: 12 }, (_, i) => Animated.timing(o, {
      toValue: i === 11 ? 0 : rand(seed, i) < 0.5 ? 0.92 : 0.05,
      duration: 60 + rand(seed, i + 30) * 200,
      useNativeDriver: false,
    }));
    const a = Animated.sequence(steps);
    a.start();
    return () => a.stop();
  }, [o, seed]);
  return <Animated.View testID="side-flicker" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: o }]} />;
}

/** né tay: chạm vào đâu màn hình cũng nhảy đi chỗ khác (lớp trong suốt hứng mọi lần chạm) */
function Dodge({ onTap }: { onTap: () => void }) {
  return (
    <Pressable testID="side-dodge" accessibilityLabel="Màn hình đang né tay" style={StyleSheet.absoluteFill} onPressIn={onTap}>
      <Text style={styles.hint}>😜 Bắt được tui không?</Text>
    </Pressable>
  );
}

/** đứng hình: giả mất kết nối, bấm gì cũng không ăn */
function Freeze() {
  return (
    <View testID="side-freeze" style={[StyleSheet.absoluteFill, styles.freeze]}>
      <ActivityIndicator color="#FFF" size="large" />
      <Text style={styles.freezeText}>📡 Mất kết nối... đang thử lại</Text>
    </View>
  );
}

/** cuộc gọi đến giả: thẻ trên cùng, chạm để tắt */
function Ring({ from, onDone }: { from: string; onDone: () => void }) {
  return (
    <Pressable testID="side-ring" onPress={onDone} style={styles.ring}>
      <Text style={{ fontSize: 30 }}>📞</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.ringTitle}>{from} đang gọi...</Text>
        <Text style={styles.ringSub}>Chạm để tắt máy</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hint: {
    position: 'absolute', alignSelf: 'center', top: '42%', fontFamily: FONT, fontWeight: '900', fontSize: 15,
    color: '#FFF', textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },
  drunkHint: {
    position: 'absolute', alignSelf: 'center', top: '30%', fontFamily: FONT, fontWeight: '900', fontSize: 18,
    color: '#FFE08A', textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 },
  },
  crackLine: {
    position: 'absolute', height: 2, backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 1.5, shadowOffset: { width: 0, height: 1 },
  },
  crackHole: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.75)', borderWidth: 2, borderColor: 'rgba(0,0,0,0.35)' },
  fogGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  fogCell: { backgroundColor: 'rgba(236,238,242,0.93)' },
  fogClear: { backgroundColor: 'transparent' },
  grayNative: { backgroundColor: 'rgba(120,120,120,0.45)' },
  freeze: { backgroundColor: 'rgba(10,10,20,0.62)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  freezeText: { color: '#FFF', fontFamily: FONT, fontWeight: '800', fontSize: 15 },
  ring: {
    position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(25,25,32,0.95)', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 16,
  },
  ringTitle: { color: '#FFF', fontFamily: FONT, fontWeight: '900', fontSize: 16 },
  ringSub: { color: '#9AE6B4', fontFamily: FONT, fontWeight: '700', fontSize: 12 },
});
