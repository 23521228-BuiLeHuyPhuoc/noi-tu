/**
 * Lớp hiệu ứng "lầy": đồ bay từ người ném tới người bị ném, bong bóng câu khịa,
 * bị hối thì rung máy + lắc màn hình, pháo giấy khi thắng.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import type { FunEvent, PublicPlayer, ThrowItem } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { TAUNTS, THROWS } from '../messages';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Sheet } from './Sheet';

// ---------- Lắc màn hình ----------

const ShakeCtx = createContext<() => void>(() => {});
export const useShake = () => useContext(ShakeCtx);

export function ShakeProvider({ children }: { children: ReactNode }) {
  const x = useState(() => new Animated.Value(0))[0];
  const shake = useCallback(() => {
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: false })),
    ).start();
  }, [x]);
  return (
    <ShakeCtx.Provider value={shake}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: x }] }}>{children}</Animated.View>
    </ShakeCtx.Provider>
  );
}

// ---------- Vị trí avatar trên màn hình ----------

type Rect = { x: number; y: number; w: number; h: number };

function rectOf(testId: string, origin: DOMRect | null): Rect | null {
  if (typeof document === 'undefined' || !origin) return null;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

const emojiOf = (item: ThrowItem) => THROWS.find((t) => t.item === item)?.emoji ?? '🩴';

// ---------- Các hiệu ứng đơn lẻ ----------

function Flying({ emoji, from, to, onDone }: { emoji: string; from: Rect; to: Rect; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(onDone);
  }, [t, onDone]);
  const fx = from.x + from.w / 2 - 22;
  const fy = from.y + from.h / 2 - 22;
  const tx = to.x + to.w / 2 - 22;
  const ty = to.y + to.h / 2 - 22;
  return (
    <Animated.Text
      style={[
        styles.fly,
        {
          left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
          // bay theo đường vòng cung
          top: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fy, Math.min(fy, ty) - 90, ty] }),
          transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

function Splat({ emoji, at, onDone }: { emoji: string; at: Rect; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 900, useNativeDriver: false }).start(onDone);
  }, [t, onDone]);
  return (
    <Animated.Text
      style={[
        styles.splat,
        {
          left: at.x + at.w / 2 - 40,
          top: at.y + at.h / 2 - 40,
          opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.4, 1.1] }) }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
  );
}

function Bubble({ text, at, onDone }: { text: string; at: Rect; onDone: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2600);
    return () => clearTimeout(id);
  }, [onDone]);
  return (
    <View style={[styles.bubble, sticker(3), { left: Math.max(6, at.x + at.w / 2 - 80), top: Math.max(4, at.y - 48) }]}>
      <Text numberOfLines={2} style={styles.bubbleText}>{text}</Text>
    </View>
  );
}

// ---------- Lớp hiệu ứng ----------

type FxIn =
  | { kind: 'fly'; emoji: string; from: Rect; to: Rect; after?: () => void }
  | { kind: 'splat'; emoji: string; at: Rect }
  | { kind: 'bubble'; text: string; at: Rect };
type Fx = FxIn & { id: number };

export function FunLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const [fx, setFx] = useState<Fx[]>([]);
  const layer = useRef<ComponentRef<typeof View>>(null);
  const seq = useRef(0);
  const feed = useFeed();
  const shake = useShake();
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const add = useCallback((f: FxIn) => {
    setFx((xs) => [...xs.slice(-12), { ...f, id: ++seq.current }]);
  }, []);
  const remove = useCallback((id: number) => setFx((xs) => xs.filter((x) => x.id !== id)), []);

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      const origin = (layer.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      const fromR = rectOf(`avatar-${e.from}`, origin);
      const toMe = 'to' in e && e.to === game.me;
      const from = nameOf(e.from);
      if (e.kind === 'throw') {
        const emoji = emojiOf(e.item);
        const toR = rectOf(`avatar-${e.to}`, origin);
        const nice = e.item === 'hoa' || e.item === 'tim';
        const hit = () => {
          play(nice ? 'coin' : 'splat');
          if (toR) add({ kind: 'splat', emoji, at: toR });
          if (toMe) {
            vibrate(nice ? 60 : 200);
            if (!nice) shake();
            feed(`${from} ${nice ? 'tặng' : 'ném'} ${emoji} vào mặt bạn!`, nice ? 'fun' : 'bad');
          }
        };
        play('whoosh');
        if (fromR && toR) add({ kind: 'fly', emoji, from: fromR, to: toR, after: hit });
        else {
          hit();
          if (!toMe) feed(`${from} ${nice ? 'tặng' : 'ném'} ${emoji} vào ${nameOf(e.to)}`, 'fun');
        }
      } else if (e.kind === 'taunt') {
        const text = TAUNTS.find((t) => t.id === e.taunt)?.text ?? '';
        play('pop');
        if (fromR) add({ kind: 'bubble', text, at: fromR });
        else feed(`${from}: ${text}`, 'fun');
      } else if (e.kind === 'poke') {
        if (toMe) {
          vibrate(400);
          shake();
          play('turn');
          feed(`⏰ ${from} đang hối bạn đó!`, 'bad');
        } else feed(`⏰ ${from} đang hối ${nameOf(e.to)}`, 'fun');
      }
    });
  }, [game, add, feed, shake]);

  return (
    <View ref={layer} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {fx.map((f) =>
        f.kind === 'fly' ? (
          <Flying key={f.id} emoji={f.emoji} from={f.from} to={f.to} onDone={() => { remove(f.id); f.after?.(); }} />
        ) : f.kind === 'splat' ? (
          <Splat key={f.id} emoji={f.emoji} at={f.at} onDone={() => remove(f.id)} />
        ) : (
          <Bubble key={f.id} text={f.text} at={f.at} onDone={() => remove(f.id)} />
        ),
      )}
    </View>
  );
}

// ---------- Bảng chọn đồ để ném / hối ----------

export function ThrowSheet({ game, target, onClose }: { game: Game; target: PublicPlayer; onClose: () => void }) {
  return (
    <Sheet title={`Chọc ${target.name}`} onClose={onClose}>
      <View style={styles.grid}>
        {THROWS.map((t) => (
          <View key={t.item} style={styles.cell}>
            <Button
              testID={`throw-${t.item}`}
              title={t.emoji}
              big
              variant="paper"
              onPress={() => {
                game.sendFun({ kind: 'throw', to: target.id, item: t.item });
                onClose();
              }}
            />
            <T style={styles.cellLabel}>{t.name}</T>
          </View>
        ))}
      </View>
      <Button
        testID="poke-btn"
        icon="⏰"
        title={`Hối ${target.name}`}
        variant="ink"
        onPress={() => {
          game.sendFun({ kind: 'poke', to: target.id });
          onClose();
        }}
      />
    </Sheet>
  );
}

export function TauntSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  return (
    <Sheet title="Nói gì đó cho cả phòng" onClose={onClose}>
      <View style={styles.taunts}>
        {TAUNTS.map((t) => (
          <Button
            key={t.id}
            testID={`taunt-${t.id}`}
            small
            variant="paper"
            title={t.text}
            style={styles.taunt}
            onPress={() => {
              game.sendFun({ kind: 'taunt', taunt: t.id });
              onClose();
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

// ---------- Pháo giấy ----------

const CONFETTI_COLORS = [C.gold, '#fff', C.lotus, C.jade, '#2F7DE1'];

function Piece({ i, width }: { i: number; width: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  const [cfg] = useState(() => ({
    x: Math.random() * width,
    delay: Math.random() * 600,
    dur: 2200 + Math.random() * 1800,
    drift: (Math.random() - 0.5) * 120,
    spin: Math.random() > 0.5 ? '540deg' : '-540deg',
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    w: 6 + Math.random() * 6,
  }));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: cfg.dur, delay: cfg.delay, easing: Easing.linear, useNativeDriver: false }).start();
  }, [t, cfg]);
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: cfg.w,
        height: cfg.w * 1.6,
        backgroundColor: cfg.color,
        borderRadius: 2,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [cfg.x, cfg.x + cfg.drift] }),
        top: t.interpolate({ inputRange: [0, 1], outputRange: [-30, 900] }),
        transform: [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', cfg.spin] }) }],
      }}
    />
  );
}

export function Confetti() {
  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth, 520) : 400;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 60 }]}>
      {Array.from({ length: 70 }, (_, i) => (
        <Piece key={i} i={i} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fly: { position: 'absolute', fontSize: 44, zIndex: 90 },
  splat: { position: 'absolute', fontSize: 80, zIndex: 90 },
  bubble: {
    position: 'absolute', backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    width: 160, zIndex: 90,
  },
  bubbleText: { fontFamily: FONT, fontWeight: '800', fontSize: 14, color: C.ink, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  cell: { width: '31%', alignItems: 'stretch' },
  cellLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: C.muted },
  taunts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  taunt: { flexGrow: 1 },
});
