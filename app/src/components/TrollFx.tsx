/**
 * Sáu chiêu chọc miễn phí kiểu hoạt hình: bom thối, dép liên hoàn, gà mổ, mặt to, vỏ chuối, lật ngược màn hình.
 * Chỉ để vui, không ảnh hưởng ván chơi. Số liệu ngẫu nhiên (biến thể) do server bốc để mọi máy thấy cùng một cảnh.
 */
import { useCallback, useContext, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FunEvent, PublicPlayer } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { quip } from '../messages';
import { setMood, setWobble } from '../funState';
import { ViewportContext } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { FONT } from '../theme';
import { useFeed } from '../ui';
import { rectOf, type Rect } from './Fun';

type Size = { w: number; h: number };
const FART_WORDS = ['PHỤT!', 'PÙ!', 'TÈ TÈ!'];

type Item = { id: number } & (
  | { kind: 'pop'; at: Rect; emoji?: string; text?: string; rise: number; ms: number; font: number }
  | { kind: 'gas'; at: Rect; word: string }
  | { kind: 'haze' }
  | { kind: 'volley'; from: Rect; to: Rect; target: string; toMe: boolean }
  | { kind: 'chicken'; rtl: boolean }
);
type NewItem = Item extends infer T ? (T extends { id: number } ? Omit<T, 'id'> : never) : never;

/** emoji/chữ nảy lên rồi mờ dần ngay trên avatar */
function Pop({ at, emoji, text, rise, ms, font, onDone }: { at: Rect; emoji?: string; text?: string; rise: number; ms: number; font: number; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: false });
    a.start(({ finished }) => finished && onDone());
    return () => a.stop();
  }, [t, ms, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: 140, alignItems: 'center', left: at.x + at.w / 2 - 70, top: at.y + at.h / 2 - font / 2 - 4,
        opacity: t.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, rise] }) },
          { scale: t.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [0.3, 1.5, 1, 1] }) },
          { rotate: t.interpolate({ inputRange: [0, 0.2, 0.4, 1], outputRange: ['-10deg', '8deg', '-4deg', '0deg'] }) },
        ],
      }}
    >
      {emoji ? <Text style={{ fontSize: font }}>{emoji}</Text> : null}
      {text ? <Text style={[styles.word, { fontSize: font * (emoji ? 0.55 : 1) }]}>{text}</Text> : null}
    </Animated.View>
  );
}

/** đám khí xanh phụt ra từ avatar, nở dần rồi tan */
function Gas({ at, word, onDone }: { at: Rect; word: string; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  const [puffs] = useState(() =>
    Array.from({ length: 7 }, (_, i) => ({
      dx: (Math.random() - 0.5) * 120, dy: -30 - Math.random() * 70, r: 26 + Math.random() * 26, delay: 0.02 + i * 0.03,
    })),
  );
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start(({ finished }) => finished && onDone());
    return () => a.stop();
  }, [t, onDone]);
  const cx = at.x + at.w / 2;
  const cy = at.y + at.h / 2;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {puffs.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute', left: cx - p.r, top: cy - p.r, width: p.r * 2, height: p.r * 2, borderRadius: p.r,
            backgroundColor: 'rgba(132,204,22,0.55)', borderWidth: 2, borderColor: 'rgba(77,124,15,0.5)',
            opacity: t.interpolate({ inputRange: [0, p.delay, 0.3, 1], outputRange: [0, 0, 0.9, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
              { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
              { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.8] }) },
            ],
          }}
        >
          <Text style={{ fontSize: p.r, textAlign: 'center' }}>💨</Text>
        </Animated.View>
      ))}
      <Animated.Text
        style={[
          styles.word,
          {
            position: 'absolute', left: cx - 70, width: 140, top: cy - 70, fontSize: 26, color: '#4d7c0f',
            opacity: t.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.15, 0.3, 1], outputRange: [0.3, 1.6, 1.1, 1.2] }) }, { rotate: '-6deg' }],
          },
        ]}
      >
        {word}
      </Animated.Text>
    </View>
  );
}

/** màn hình người bị thả bom ngả màu xanh khói trong chốc lát */
function Haze({ onDone }: { onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: false });
    a.start(({ finished }) => finished && onDone());
    return () => a.stop();
  }, [t, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: 'rgb(132,204,22)', opacity: t.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 0.42, 0.3, 0] }) },
      ]}
    >
      <Animated.Text style={[styles.hazeEmoji, { transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }] }]}>🤢</Animated.Text>
    </Animated.View>
  );
}

/** năm chiếc dép bay liên tiếp từ người ném tới avatar; mỗi cú trúng làm avatar lắc */
function Volley({ from, to, onHit, onDone }: { from: Rect; to: Rect; onHit: (i: number) => void; onDone: () => void }) {
  const ts = useState(() => Array.from({ length: 5 }, () => new Animated.Value(0)))[0];
  const hit = useRef(onHit);
  const done = useRef(onDone);
  useEffect(() => {
    hit.current = onHit;
    done.current = onDone;
  }, [onHit, onDone]);
  useEffect(() => {
    const anims = ts.map((t, i) =>
      Animated.sequence([
        Animated.delay(i * 130),
        Animated.timing(t, { toValue: 1, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: false }),
      ]),
    );
    anims.forEach((a, i) =>
      a.start(({ finished }) => {
        if (!finished) return;
        hit.current(i);
        if (i === ts.length - 1) done.current();
      }),
    );
    return () => anims.forEach((a) => a.stop());
  }, [ts]);
  const fx = from.x + from.w / 2 - 20;
  const fy = from.y + from.h / 2 - 20;
  const tx = to.x + to.w / 2 - 20;
  const ty = to.y + to.h / 2 - 20;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {ts.map((t, i) => (
        <Animated.Text
          key={i}
          style={{
            position: 'absolute', fontSize: 36, left: fx, top: fy,
            opacity: t.interpolate({ inputRange: [0, 0.02, 0.97, 1], outputRange: [0, 1, 1, 0] }),
            transform: [
              { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, tx - fx + (i - 2) * 9] }) },
              { translateY: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, (ty - fy) / 2 - 40 - (i % 2) * 20, ty - fy] }) },
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', i % 2 ? '900deg' : '-900deg'] }) },
            ],
          }}
        >
          🩴
        </Animated.Text>
      ))}
    </View>
  );
}

/** con gà đi ngang màn hình, cúi xuống mổ liên tục; chạm vào thì nó bỏ chạy */
function Chicken({ size, rtl, onDone: finish }: { size: Size; rtl: boolean; onDone: () => void }) {
  const doneRef = useRef(finish);
  useEffect(() => { doneRef.current = finish; }, [finish]);
  const onDone = useCallback(() => doneRef.current(), []);
  const x = useState(() => new Animated.Value(rtl ? size.w + 20 : -70))[0];
  const peck = useState(() => new Animated.Value(0))[0];
  const [fled, setFled] = useState(false);
  const [lane] = useState(() => 110 + Math.random() * Math.max(60, size.h - 330));
  const end = rtl ? -80 : size.w + 30;
  useEffect(() => {
    const walk = Animated.timing(x, { toValue: end, duration: 7500, easing: Easing.linear, useNativeDriver: false });
    walk.start(({ finished }) => finished && onDone());
    const pk = Animated.loop(
      Animated.sequence([
        Animated.timing(peck, { toValue: 1, duration: 170, useNativeDriver: false }),
        Animated.timing(peck, { toValue: 0, duration: 230, useNativeDriver: false }),
        Animated.delay(220),
      ]),
    );
    pk.start();
    return () => {
      walk.stop();
      pk.stop();
    };
  }, [x, peck, end, onDone]);
  const flee = () => {
    if (fled) return;
    setFled(true);
    x.stopAnimation();
    play('boing');
    vibrate(40);
    // bỏ chạy cùng chiều đang đi, nhanh gấp bội
    Animated.timing(x, { toValue: end, duration: 520, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(onDone);
  };
  return (
    <Animated.View style={{ position: 'absolute', top: lane, left: x, width: 58, height: 64 }}>
      <Pressable testID="chicken" accessibilityRole="button" accessibilityLabel="Đuổi gà" hitSlop={18} onPress={flee} style={{ width: 58, height: 64, alignItems: 'center' }}>
        <Text style={[styles.fledWord, !fled && { opacity: 0 }]}>CỤC TÁC!</Text>
        <Animated.Text
          style={{
            fontSize: 44,
            transform: [
              { scaleX: rtl ? 1 : -1 },
              { translateY: peck.interpolate({ inputRange: [0, 1], outputRange: [0, fled ? 0 : 12] }) },
              { rotate: peck.interpolate({ inputRange: [0, 1], outputRange: ['0deg', fled ? '0deg' : rtl ? '-28deg' : '28deg'] }) },
            ],
          }}
        >
          🐔
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
}

/** Lật ngược cả trang (chỉ trên web); chạm vẫn đúng vì trình duyệt tự xoay theo */
function flipPage(ms: number, timer: { current: ReturnType<typeof setTimeout> | null }) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('root') ?? document.body;
  if (timer.current) clearTimeout(timer.current);
  el.style.transition = 'transform 0.45s ease-in-out';
  el.style.transform = 'rotate(180deg)';
  timer.current = setTimeout(() => {
    el.style.transform = '';
    timer.current = setTimeout(() => {
      el.style.transition = '';
      timer.current = null;
    }, 520);
  }, ms);
}

export function TrollFxLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [size, setSize] = useState<Size>(() => ({
    w: typeof window === 'undefined' ? 390 : Math.min(window.innerWidth, 520),
    h: typeof window === 'undefined' ? 844 : window.innerHeight,
  }));
  const layer = useRef<ComponentRef<typeof View>>(null);
  const seq = useRef(0);
  const feed = useFeed();
  const vp = useContext(ViewportContext);
  const rotatedRef = useRef(!!vp?.rotated);
  useEffect(() => { rotatedRef.current = !!vp?.rotated; }, [vp?.rotated]);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  const sizeRef = useRef(size);
  useEffect(() => { sizeRef.current = size; }, [size]);
  const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const pending = timers.current;
    const flip = flipTimer;
    return () => {
      pending.forEach(clearTimeout);
      if (flip.current) clearTimeout(flip.current);
      if (typeof document !== 'undefined') {
        const el = document.getElementById('root') ?? document.body;
        el.style.transform = '';
        el.style.transition = '';
      }
    };
  }, []);

  const add = useCallback((it: NewItem) => {
    setItems((xs) => [...xs.slice(-12), { ...it, id: ++seq.current } as Item]);
  }, []);
  const drop = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      if (e.kind !== 'fart' && e.kind !== 'slipper' && e.kind !== 'chicken' && e.kind !== 'bigface' && e.kind !== 'banana' && e.kind !== 'mirror') return;
      const origin = (layer.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      const rot = rotatedRef.current;
      const toMe = e.to === game.me;
      const from = nameOf(e.from);
      const to = toMe ? 'bạn' : nameOf(e.to);
      const toR = rectOf(`avatar-${e.to}`, origin, rot);
      const fromR = rectOf(`avatar-${e.from}`, origin, rot);
      feed(quip[e.kind](from, to), toMe ? 'bad' : 'fun');

      if (e.kind === 'fart') {
        setMood(e.to, 'shock', 2200);
        setWobble(e.to, 'shake', 700);
        const word = FART_WORDS[e.variant ?? 0] ?? FART_WORDS[0];
        if (toR) add({ kind: 'gas', at: toR, word });
        if (toMe) {
          play('fart');
          vibrate([80, 40, 120]);
          add({ kind: 'haze' });
        }
      } else if (e.kind === 'slipper') {
        play('whoosh');
        if (fromR && toR) {
          add({ kind: 'volley', from: fromR, to: toR, target: e.to, toMe });
        } else {
          setWobble(e.to, 'shake', 900);
          setMood(e.to, 'dizzy', 2000);
        }
      } else if (e.kind === 'chicken') {
        if (toR) add({ kind: 'pop', at: toR, emoji: '🐔', text: 'CỤC CỤC', rise: -50, ms: 1500, font: 38 });
        if (toMe) {
          play('boing');
          add({ kind: 'chicken', rtl: (e.variant ?? 0) === 1 });
        }
      } else if (e.kind === 'bigface') {
        setWobble(e.to, 'big', 4000);
        setMood(e.to, 'smug', 4000);
        play('boing');
        if (toR) add({ kind: 'pop', at: toR, emoji: '🤪', rise: -60, ms: 1600, font: 40 });
        if (toMe) vibrate([60, 40, 60]);
      } else if (e.kind === 'banana') {
        if (toR) add({ kind: 'pop', at: { ...toR, y: toR.y + toR.h * 0.55 }, emoji: '🍌', rise: 0, ms: 2200, font: 34 });
        play('whoosh');
        later(500, () => {
          setMood(e.to, 'shock', 1800);
          setWobble(e.to, 'slip', 1900);
          play('boing');
        });
        later(950, () => {
          play('punch');
          if (toMe) vibrate(160);
          if (toR) add({ kind: 'pop', at: toR, text: 'BỊCH!', rise: -36, ms: 1300, font: 32 });
        });
      } else {
        setMood(e.to, 'dizzy', 2500);
        add({ kind: 'pop', at: toR ?? { x: sizeRef.current.w / 2, y: 120, w: 0, h: 0 }, emoji: '🪞', rise: -30, ms: 1500, font: 36 });
        play('flip');
        if (toMe) {
          vibrate([80, 50, 80]);
          flipPage(2500, flipTimer);
        }
      }
    });
  }, [game, feed, add, later]);

  return (
    <View ref={layer} pointerEvents="box-none" style={styles.layer} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {items.map((it) =>
        it.kind === 'pop' ? (
          <Pop key={it.id} at={it.at} emoji={it.emoji} text={it.text} rise={it.rise} ms={it.ms} font={it.font} onDone={() => drop(it.id)} />
        ) : it.kind === 'gas' ? (
          <Gas key={it.id} at={it.at} word={it.word} onDone={() => drop(it.id)} />
        ) : it.kind === 'haze' ? (
          <Haze key={it.id} onDone={() => drop(it.id)} />
        ) : it.kind === 'volley' ? (
          <Volley
            key={it.id}
            from={it.from}
            to={it.to}
            onHit={() => {
              setWobble(it.target, 'shake', 420);
              setMood(it.target, 'shock', 1200);
              play('splat');
              if (it.toMe) vibrate(35);
            }}
            onDone={() => drop(it.id)}
          />
        ) : (
          <Chicken key={it.id} size={size} rtl={it.rtl} onDone={() => drop(it.id)} />
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 86, overflow: 'hidden' },
  word: {
    fontFamily: FONT, fontWeight: '900', color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3,
  },
  hazeEmoji: { position: 'absolute', alignSelf: 'center', top: '38%', fontSize: 90, opacity: 0.85 },
  fledWord: { position: 'absolute', top: -16, width: 110, textAlign: 'center', fontFamily: FONT, fontWeight: '900', fontSize: 13, color: '#b45309' },
});
