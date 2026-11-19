import { useMeasuredView, viewRect, targetRect, type WindowRect } from '../viewMeasurements';
import { Image } from './Image';
/**
 * Lớp hiệu ứng "lầy": đồ bay từ người ném tới người bị ném, bong bóng câu khịa,
 * bị hối thì rung máy + lắc màn hình, pháo giấy khi thắng.
 */
import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Dimensions, Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  CHAT_MAX, DOODLE_MS, EMOJIS, MAX_HP, NICK_MS,
  type ChatMsg, type DoodleKind, type FunEvent, type HitMove, type NicknameId, type PublicPlayer, type ThrowItem,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { DOODLE_OPTIONS, HITS, NICK_IDS, nickText, quip, TAUNTS, THROWS } from '../messages';
import { ROACH_URI } from '../avatars';
import { setCharm, setDoodle, setMood, setNick, setWobble } from '../funState';
import { ViewportContext, useKeyboardInset, useOnNew, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { Portrait } from './Avatar';
import { Button, T, useFeed } from '../ui';
import { Sheet, useSheetOpen } from './Sheet';
import { CHU_LAY_STICKERS, STICKERS, stickerOf } from '../stickers';
import { GIFT_IDS, FREE_POKES_PER_DAY, STICKER_PACK_ID, shopItem, SKILL_IDS } from '../../../shared/src/shop';
import { ShopSheet } from './Shop';
import { KickInline } from './RoomTools';
import { PokeGallery } from './PokeGallery';
import { POKES, type PokeItem } from '../../../shared/src/pokes';
import { getSmoothModeSync } from '../smoothMode';
import { chatBubbleStyleOf, chatBubbleTextColorOf } from './Cosmetics';
import confetti from 'canvas-confetti';
import { EmojiIcon, UiIcon, type UiIconName } from './Icons';

const AnimatedImage = Animated.createAnimatedComponent(Image);

// ---------- Lắc & Xoay màn hình ----------

export type ShakeMode = 'normal' | 'quake' | 'spin' | 'mirror' | 'drunk' | 'dodge';
const ShakeCtx = createContext<(mode?: ShakeMode) => void>(() => {});
export const useShake = () => useContext(ShakeCtx);

export function ShakeProvider({ children }: { children: ReactNode }) {
  const [shaking, setShaking] = useState(false);
  const x = useState(() => new Animated.Value(0))[0];
  const y = useState(() => new Animated.Value(0))[0];
  const rot = useState(() => new Animated.Value(0))[0];
  const mirror = useState(() => new Animated.Value(0))[0];
  useEffect(() => () => { mirror.stopAnimation(); }, [mirror]);

  const finishShake = useCallback(({ finished }: { finished: boolean }) => {
    if (finished) {
      x.setValue(0);
      y.setValue(0);
      rot.setValue(0);
      mirror.setValue(0);
      setShaking(false);
    }
  }, [x, y, rot, mirror]);

  const shake = useCallback((mode: ShakeMode = 'normal') => {
    setShaking(true);
    if (mode === 'mirror') {
      mirror.stopAnimation();
      Animated.sequence([
        Animated.timing(mirror, { toValue: 180, duration: 450, useNativeDriver: false }),
        Animated.delay(2500),
        Animated.timing(mirror, { toValue: 0, duration: 450, useNativeDriver: false }),
      ]).start(finishShake);
      return;
    }
    x.stopAnimation();
    y.stopAnimation();
    rot.stopAnimation();
    if (mode === 'drunk') {
      // say xỉn: cả màn hình chao qua chao lại chậm rãi khoảng 4 giây
      const steps: [number, number][] = [[-22, -6], [26, 7], [-28, -7.5], [24, 6.5], [-20, -5.5], [18, 4.5], [-10, -2.5], [0, 0]];
      Animated.sequence(steps.map(([dx, dr]) => Animated.parallel([
        Animated.timing(x, { toValue: dx, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(rot, { toValue: dr, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]))).start(finishShake);
      return;
    }
    if (mode === 'dodge') {
      // né tay: màn hình nhảy vụt sang một chỗ ngẫu nhiên rồi trôi về
      const dx = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 60);
      const dy = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 50);
      Animated.sequence([
        Animated.parallel([
          Animated.timing(x, { toValue: dx, duration: 90, useNativeDriver: false }),
          Animated.timing(y, { toValue: dy, duration: 90, useNativeDriver: false }),
        ]),
        Animated.delay(260),
        Animated.parallel([
          Animated.timing(x, { toValue: 0, duration: 320, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
          Animated.timing(y, { toValue: 0, duration: 320, easing: Easing.out(Easing.back(2)), useNativeDriver: false }),
        ]),
      ]).start(finishShake);
      return;
    }
    if (mode === 'spin') {
      // Xoay qua xoay lại lắc lư rồi lộn vòng 180° -> 360° cực ức chế
      Animated.sequence([
        Animated.timing(rot, { toValue: -28, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(rot, { toValue: 32, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(rot, { toValue: -42, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(rot, { toValue: 180, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.timing(rot, { toValue: 162, duration: 220, useNativeDriver: false }),
        Animated.timing(rot, { toValue: 198, duration: 220, useNativeDriver: false }),
        Animated.timing(rot, { toValue: 180, duration: 200, useNativeDriver: false }),
        Animated.timing(rot, { toValue: 375, duration: 560, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
        Animated.timing(rot, { toValue: 350, duration: 180, useNativeDriver: false }),
        Animated.timing(rot, { toValue: 365, duration: 150, useNativeDriver: false }),
        Animated.timing(rot, { toValue: 360, duration: 120, useNativeDriver: false }),
      ]).start((r) => { rot.setValue(0); finishShake(r); });
      return;
    }
    if (mode === 'quake') {
      // Động đất rung lắc dữ dội cả ngang, dọc và nghiêng màn hình
      const steps: [number, number, number][] = [
        [18, -14, 3.8], [-20, 15, -4.2], [17, 13, 3.5], [-18, -15, -3.8],
        [16, -12, 3.2], [-15, 14, -3.0], [14, -10, 2.6], [-13, 11, -2.4],
        [11, -9, 2.0], [-10, 8, -1.8], [8, -6, 1.4], [-7, 5, -1.1],
        [5, -4, 0.7], [-3, 2, -0.4], [0, 0, 0],
      ];
      Animated.sequence(
        steps.map(([dx, dy, dr]) =>
          Animated.parallel([
            Animated.timing(x, { toValue: dx, duration: 55, useNativeDriver: false }),
            Animated.timing(y, { toValue: dy, duration: 55, useNativeDriver: false }),
            Animated.timing(rot, { toValue: dr, duration: 55, useNativeDriver: false }),
          ]),
        ),
      ).start(finishShake);
      return;
    }
    Animated.sequence(
      [
        [11, -4, 1.2], [-11, 4, -1.2], [9, -3, 0.9], [-9, 3, -0.9], [5, -2, 0.4], [0, 0, 0],
      ].map(([dx, dy, dr]) =>
        Animated.parallel([
          Animated.timing(x, { toValue: dx, duration: 45, useNativeDriver: false }),
          Animated.timing(y, { toValue: dy, duration: 45, useNativeDriver: false }),
          Animated.timing(rot, { toValue: dr, duration: 45, useNativeDriver: false }),
        ]),
      ),
    ).start(finishShake);
  }, [x, y, rot, mirror, finishShake]);

  // Khi đứng yên (99.9% thời gian): dùng View thuần KHÔNG gắn transform để tránh ép GPU tạo offscreen buffer 12MB toàn màn hình!
  if (!shaking) {
    return (
      <ShakeCtx.Provider value={shake}>
        <View style={{ flex: 1 }}>{children}</View>
      </ShakeCtx.Provider>
    );
  }

  const rotateDeg = Animated.add(rot, mirror).interpolate({
    inputRange: [-360, 360],
    outputRange: ['-360deg', '360deg'],
  });

  return (
    <ShakeCtx.Provider value={shake}>
      <Animated.View style={{ flex: 1, transform: [{ translateX: x }, { translateY: y }, { rotate: rotateDeg }] }}>
        {children}
      </Animated.View>
    </ShakeCtx.Provider>
  );
}

// ---------- Vị trí avatar trên màn hình ----------

export type Rect = { x: number; y: number; w: number; h: number };

const rectCache = new Map<string, { at: number; r: WindowRect | null }>();

/** Vị trí phần tử có testID trên màn hình, tính từ góc của `origin` (hỗ trợ cả màn hình xoay ngang 90° bởi Rotator); có cache theo frame chống reflow khi chọc nhiều người */
export function rectOf(testId: string, origin: WindowRect | null, rotated = false): Rect | null {
  if (!origin) return null;
  const now = Date.now();
  let r: WindowRect | null | undefined;
  const hit = rectCache.get(testId);
  if (hit && now - hit.at < 32) {
    r = hit.r;
  } else {
    r = typeof document === 'undefined'
      ? targetRect(testId)
      : document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect() ?? null;
    if (rectCache.size > 48) rectCache.clear();
    rectCache.set(testId, { at: now, r });
  }
  if (!r || r.width === 0) return null;
  if (rotated) {
    return { x: r.top - origin.top, y: origin.right - r.right, w: r.height, h: r.width };
  }
  return { x: r.left - origin.left, y: r.top - origin.top, w: r.width, h: r.height };
}

const emojiOf = (item: ThrowItem) => THROWS.find((t) => t.item === item)?.emoji ?? '🩴';

// ---------- Các hiệu ứng đơn lẻ ----------

function Flying({ emoji, from, to, onDone, fast }: { emoji: string; from: Rect; to: Rect; onDone: () => void; fast?: boolean }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: fast ? 320 : 650, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(onDone);
  }, [t, onDone, fast]);
  const fx = from.x + from.w / 2 - 22;
  const fy = from.y + from.h / 2 - 22;
  const tx = to.x + to.w / 2 - 22;
  const ty = to.y + to.h / 2 - 22;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        zIndex: 90,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
        top: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fy, fast ? (fy + ty) / 2 : Math.min(fy, ty) - 90, ty] }),
        transform: fast
          ? [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }]
          : [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }],
      }}
    >
      <EmojiIcon emoji={emoji} size={44} />
    </Animated.View>
  );
}

function Splat({ emoji, at, onDone }: { emoji: string; at: Rect; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 900, useNativeDriver: false }).start(onDone);
  }, [t, onDone]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        zIndex: 90,
        left: at.x + at.w / 2 - 38,
        top: at.y + at.h / 2 - 38,
        opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.3, 1.35, 1.05] }) }],
      }}
    >
      <EmojiIcon emoji={emoji} size={76} />
    </Animated.View>
  );
}

type BubbleItem = { key: number; from: string; name: string; text: string; at: Rect; chat: boolean; stickerId?: ChatMsg['stickerId']; bubbleFx?: string };
type Placed = { left: number; top: number; w: number; h: number; tailX: number; named: boolean };

/**
 * Xếp bong bóng: mỗi bong bóng nằm giữa dưới avatar người gửi (kẹp trong màn hình, đuôi vẫn chỉ vào avatar);
 * bong bóng của người khác đè lên nhau thì xếp chồng xuống dưới, và hiện thêm tên người nói.
 */
export function layoutBubbles(items: BubbleItem[], width: number): Placed[] {
  const many = items.length > 1;
  const placed: Placed[] = [];
  for (const b of items) {
    const w = b.stickerId ? 150 : Math.min(172, width - 12);
    const h = b.stickerId ? 126 + (many ? 16 : 0) : many ? 68 : 52;
    const cx = b.at.x + b.at.w / 2;
    const left = Math.min(Math.max(6, cx - w / 2), Math.max(6, width - w - 6));
    let top = b.at.y + b.at.h + 22;
    for (let guard = 0; guard < 8; guard++) {
      const hit = placed.find((p) => left < p.left + p.w && p.left < left + w && top < p.top + p.h + 6 && p.top < top + h + 6);
      if (!hit) break;
      top = hit.top + hit.h + 8;
    }
    placed.push({ left, top, w, h, tailX: Math.min(Math.max(cx - left, 16), w - 16), named: many });
  }
  return placed;
}

function Bubble({ item, pos, onDone }: { item: BubbleItem; pos: Placed; onDone: () => void }) {
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const id = setTimeout(() => done.current(), item.chat ? 6000 : 4500);
    return () => clearTimeout(id);
  }, [item.chat, item.key]);
  const asset = item.stickerId ? stickerOf(item.stickerId) : undefined;
  const stacked = pos.top > item.at.y + item.at.h + 24;
  const customStyle = item.chat ? chatBubbleStyleOf(item.bubbleFx) : undefined;
  const customColor = item.chat ? chatBubbleTextColorOf(item.bubbleFx) : undefined;
  return (
    <View
      testID={`bubble-${item.from}`}
      style={[
        styles.bubble,
        sticker(3),
        item.chat && styles.chatBubble,
        customStyle,
        { left: pos.left, top: pos.top, width: pos.w, height: pos.h, zIndex: 90 + item.key % 50 },
      ]}
    >
      {!stacked && <View style={[styles.tail, item.chat && { backgroundColor: C.ink }, { left: pos.tailX - 6 }]} />}
      {pos.named && <Text numberOfLines={2} style={[styles.bubbleName, item.chat && { color: customColor ?? C.onSon }]}>{item.name}</Text>}
      {asset ? <Image source={asset.source} accessibilityLabel={asset.alt} style={styles.bubbleSticker} resizeMode="contain" /> : <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.bubbleText, item.chat && { color: customColor ?? C.gold }]}>{item.text}</Text>}
    </View>
  );
}

/** emoji bay lên từ avatar rồi tan */
function Float({ emoji, at, onDone }: { emoji: string; at: Rect; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  const [dx] = useState(() => (Math.random() - 0.5) * 50);
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const animation = Animated.timing(t, { toValue: 1, duration: 4000, easing: Easing.out(Easing.quad), useNativeDriver: false });
    animation.start(({ finished }) => { if (finished) done.current(); });
    return () => animation.stop();
  }, [t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        zIndex: 92,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [at.x + at.w / 2 - 22, at.x + at.w / 2 - 22 + dx] }),
        top: t.interpolate({ inputRange: [0, 1], outputRange: [at.y, at.y + 160] }),
        opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1.5, 1.1] }) }],
      }}
    >
      <EmojiIcon emoji={emoji} size={42} />
    </Animated.View>
  );
}

/** cú đánh trúng: chữ "BỤP!", sát thương, thanh máu ảo, K.O. */
function Impact({ at, damage, hp, ko, onDone }: { at: Rect; damage: number; hp: number; ko: boolean; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  const [word] = useState(() => (ko ? 'K.O.!' : ['BỤP!', 'BỐP!', 'CHÁT!', 'HỰ!', 'ÚI!'][Math.floor(Math.random() * 5)]));
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: ko ? 2200 : 1400, useNativeDriver: false }).start(onDone);
  }, [t, onDone, ko]);
  const cx = at.x + at.w / 2;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: cx - 70, top: at.y + at.h / 2 - 22, width: 140, alignItems: 'center', zIndex: 95 }}>
      <Animated.Text
        style={[
          styles.pow,
          ko && styles.ko,
          {
            opacity: t.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
            transform: [
              { scale: t.interpolate({ inputRange: [0, 0.12, 0.25, 1], outputRange: [0.2, 1.6, 1, 1] }) },
              { rotate: ko ? '-8deg' : '6deg' },
            ],
          },
        ]}
      >
        {word}
      </Animated.Text>
      <Animated.Text
        style={[
          styles.dmg,
          {
            opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
          },
        ]}
      >
        -{damage}
      </Animated.Text>
      <Animated.View style={[styles.hpTrack, { opacity: t.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }) }]}>
        <View style={[styles.hpFill, { width: `${(hp / MAX_HP) * 100}%`, backgroundColor: hp > 50 ? C.jade : hp > 20 ? C.gold : C.danger }]} />
      </Animated.View>
    </View>
  );
}

// ---------- Lớp hiệu ứng ----------

type FxIn =
  | { kind: 'fly'; emoji: string; from: Rect; to: Rect; after?: () => void; fast?: boolean }
  | { kind: 'splat'; emoji: string; at: Rect }
  | { kind: 'float'; emoji: string; at: Rect }
  | { kind: 'impact'; at: Rect; damage: number; hp: number; ko: boolean };
type Fx = FxIn & { id: number };

export function FunLayer({ game, players, chat }: { game: Game; players: PublicPlayer[]; chat: ChatMsg[] }) {
  const [fx, setFx] = useState<Fx[]>([]);
  const [bubbles, setBubbles] = useState<BubbleItem[]>([]);
  const [combo, setCombo] = useState<number>(0);
  const comboRef = useRef<{ count: number; until: number; timer?: ReturnType<typeof setTimeout> }>({ count: 0, until: 0 });
  const [layerW, setLayerW] = useState(() => (Math.min(Dimensions.get('window').width, 520)));
  const layer = useMeasuredView();
  const seq = useRef(0);
  const feed = useFeed();
  const shake = useShake();
  const vp = useContext(ViewportContext);
  const rotated = !!vp?.rotated;
  const rotatedRef = useRef(rotated);
  useEffect(() => {
    rotatedRef.current = rotated;
  }, [rotated]);
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  const add = useCallback((f: FxIn) => {
    setFx((xs) => [...xs.slice(-15), { ...f, id: ++seq.current }]);
  }, []);
  const remove = useCallback((id: number) => setFx((xs) => xs.filter((x) => x.id !== id)), []);
  // mỗi người chỉ có một bong bóng: câu mới thay câu cũ
  const say = useCallback((b: Omit<BubbleItem, 'key'>) => {
    setBubbles((xs) => [...xs.filter((x) => x.from !== b.from), { ...b, key: ++seq.current }].slice(-6));
  }, []);
  const unsay = useCallback((key: number) => setBubbles((xs) => xs.filter((x) => x.key !== key)), []);
  const origin = () => viewRect(layer.current);

  // tin nhắn mới: bong bóng dưới avatar người gửi
  useOnNew(chat, (m) => {
    if (m.from !== game.me) play('chat');
    const at = rectOf(`avatar-${m.from}`, origin(), rotatedRef.current);
    const bubbleFx = playersRef.current.find((p) => p.id === m.from)?.cosmetics?.chatBubble;
    if (at) say({ from: m.from, name: m.from === game.me ? 'Bạn' : m.name, text: m.kind === 'sticker' ? (stickerOf(m.stickerId)?.alt ?? 'Nhãn dán') : m.text, stickerId: m.stickerId, at, chat: true, bubbleFx });
  });

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      if (e.kind !== 'emoji' && e.kind !== 'taunt' && e.kind !== 'entrance') {
        const now = Date.now();
        const cur = comboRef.current;
        const nextCount = now <= cur.until ? cur.count + 1 : 1;
        cur.count = nextCount;
        cur.until = now + 4000;
        if (cur.timer) clearTimeout(cur.timer);
        cur.timer = setTimeout(() => {
          comboRef.current.count = 0;
          setCombo(0);
        }, 4000);
        if (nextCount >= 2) setCombo(nextCount);
      }
      const origin = viewRect(layer.current);
      const rot = rotatedRef.current;
      const fromR = rectOf(`avatar-${e.from}`, origin, rot);
      const toMe = 'to' in e && e.to === game.me;
      const from = nameOf(e.from);
      if (e.kind === 'throw') {
        const emoji = emojiOf(e.item);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        const nice = e.item === 'hoa' || e.item === 'tim';
        const hit = () => {
          setMood(e.to, nice ? 'smug' : 'shock', 2200);
          if (!nice) setWobble(e.to, 'shake', 1400);
          play(nice ? 'coin' : 'splat');
          if (toR) add({ kind: 'splat', emoji, at: toR });
          if (toMe) {
            // quá 3 lần rung màn hình trong 15 giây (soft): chỉ hiện trên avatar, không rung máy
            if (!e.soft) {
              vibrate(nice ? 60 : 200);
              if (!nice) shake();
            }
            feed(`${from} ${nice ? 'tặng' : 'ném'} ${emoji} vào mặt bạn`, nice ? 'fun' : 'bad');
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
        if (fromR) say({ from: e.from, name: from === 'bạn' ? 'Bạn' : from, text, at: fromR, chat: false });
        else feed(`${from}: ${text}`, 'fun');
      } else if (e.kind === 'poke' && !e.poke) {
        setMood(e.to, 'angry', 2500);
        setWobble(e.to, 'shake', 1800);
        if (toMe) {
          vibrate(400);
          shake();
          play('turn');
          feed(`${from} đang hối bạn`, 'bad');
        } else feed(`${from} đang hối ${nameOf(e.to)}`, 'fun');
        playMemePool('chat_hype', { cooldownMs: 2800 });
      } else if (e.kind === 'emoji') {
        play('pop');
        playMemePool('chat_hype', { cooldownMs: 2800 });
        if (fromR) add({ kind: 'float', emoji: e.emoji, at: fromR });
        else feed(`${from}: ${e.emoji}`, 'fun');
      } else if (e.kind === 'hit') {
        const move = HITS.find((h) => h.move === e.move) ?? HITS[0];
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        const damage = e.damage ?? 0;
        const land = () => {
          setMood(e.to, 'dizzy', 3000);
          setWobble(e.to, e.ko || e.move === 'chuong' ? 'spin' : 'shake', e.ko ? 2800 : 1800);
          play(e.ko ? 'ko' : 'punch');
          playMemePool(e.ko ? 'eliminated' : 'troll', { cooldownMs: 1600 });
          if (toR) add({ kind: 'impact', at: toR, damage, hp: e.hp ?? 0, ko: !!e.ko });
          if (toMe && !e.soft) {
            vibrate(e.ko ? [200, 80, 300] : 150);
            shake(e.ko ? 'quake' : 'normal');
          }
          if (e.ko) feed(`${from} hạ đo ván ${toMe ? 'bạn' : nameOf(e.to)} (hồi đầy máu)`, toMe ? 'bad' : 'fun');
          else if (toMe) feed(`${from} ${move.name.toLowerCase()} bạn ${move.emoji} -${damage} máu`, 'bad');
        };
        play('whoosh');
        if (fromR && toR) add({ kind: 'fly', emoji: move.emoji, from: fromR, to: toR, after: land, fast: true });
        else land();
      } else if (e.kind === 'doodle') {
        setDoodle(e.to, e.doodle, DOODLE_MS);
        const what = DOODLE_OPTIONS.find((d) => d.doodle === e.doodle)?.name.toLowerCase().replace('vẽ ', '') ?? 'bậy';
        play('pop');
        playMemePool('chat_hype', { cooldownMs: 2800 });
        feed(quip.doodle(from, toMe ? 'bạn' : nameOf(e.to), what), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'nick') {
        setNick(e.to, e.nick, NICK_MS);
        play('pop');
        playMemePool('chat_hype', { cooldownMs: 2800 });
        feed(quip.nick(from, toMe ? 'bạn' : nameOf(e.to), nickText(e.nick)), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'honk') {
        setWobble(e.to, 'shake', 1400);
        if (toMe) {
          play(['honk', 'fart', 'boing'][e.variant ?? 0] as 'honk' | 'fart' | 'boing');
          vibrate(120);
        }
        playMemePool('troll', { cooldownMs: 1600 });
        feed(quip.honk(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'cry') {
        setMood(e.to, 'cry', 6000);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        if (toR) add({ kind: 'float', emoji: '😭', at: toR });
        play('sad');
        feed(quip.cry(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'charm') {
        setCharm(e.from, 20_000);
        setMood(e.from, 'smug', 4000);
        if (fromR) add({ kind: 'float', emoji: '✨', at: fromR });
        play('sparkle');
        feed(quip.charm(from === 'bạn' ? 'Bạn' : from), 'fun');
      } else if (e.kind === 'spin') {
        setMood(e.to, 'dizzy', 3600);
        setWobble(e.to, 'spin', 3600);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        if (toR) add({ kind: 'float', emoji: '🌀', at: toR });
        play('spin');
        if (toMe) {
          vibrate([120, 60, 180, 60, 140]);
          shake('spin');
        }
        feed(quip.spin(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'quake') {
        setMood(e.to, 'shock', 2800);
        setWobble(e.to, 'shake', 2800);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        if (toR) add({ kind: 'float', emoji: '🌋', at: toR });
        play('quake');
        if (toMe) {
          vibrate([180, 50, 220, 50, 180]);
          shake('quake');
        }
        feed(quip.quake(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
      } else if (e.kind === 'blackout') {
        setMood(e.to, 'shock', 4200);
        setWobble(e.to, 'blackout', 4200);
      }
      // bị chọc đúng lúc đang tới lượt Nối từ: server bù lại thời gian
      if (toMe && e.pausedMs) feed(`Bị chọc nên được bù +${(e.pausedMs / 1000).toLocaleString('vi-VN')} giây vào lượt`, 'good');
    });
  }, [game, add, feed, shake, say, layer]);

  const sheetOpen = useSheetOpen();
  const placed = layoutBubbles(bubbles, layerW);
  return (
    <View ref={layer} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setLayerW(e.nativeEvent.layout.width)}>
      {fx.map((f) =>
        f.kind === 'fly' ? (
          <Flying key={f.id} emoji={f.emoji} from={f.from} to={f.to} fast={f.fast} onDone={() => { remove(f.id); f.after?.(); }} />
        ) : f.kind === 'splat' ? (
          <Splat key={f.id} emoji={f.emoji} at={f.at} onDone={() => remove(f.id)} />
        ) : f.kind === 'float' ? (
          <Float key={f.id} emoji={f.emoji} at={f.at} onDone={() => remove(f.id)} />
        ) : (
          <Impact key={f.id} at={f.at} damage={f.damage} hp={f.hp} ko={f.ko} onDone={() => remove(f.id)} />
        ),
      )}
      {!sheetOpen && bubbles.map((b, i) => (
        <Bubble key={b.key} item={b} pos={placed[i]} onDone={() => unsay(b.key)} />
      ))}
      {combo >= 2 && (
        <View testID="poke-combo" style={[styles.comboBadge, sticker(2)]}>
          <UiIcon name={combo >= 7 ? 'Zap' : combo >= 4 ? 'Flame' : 'Sparkles'} size={14} color={C.gold} />
          <Text style={styles.comboText}>
            {combo >= 7 ? `Siêu bão Xóm Lầy ×${combo}` : combo >= 4 ? `Liên hoàn ×${combo}` : `Combo ×${combo}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ---------- Gián và mực trên màn hình người bị chọc ----------

type Size = { w: number; h: number };

/** con gián bò từ mép này sang mép kia ~5 giây; chạm vào để đập */
function Roach({ size, onDone: finish }: { size: Size; onDone: () => void }) {
  const doneRef = useRef(finish);
  useEffect(() => { doneRef.current = finish; }, [finish]);
  const onDone = useCallback(() => doneRef.current(), []);
  const t = useState(() => new Animated.Value(0))[0];
  const [squashed, setSquashed] = useState(false);
  const [path] = useState(() => {
    const horizontal = Math.random() < 0.5;
    const flip = Math.random() < 0.5;
    const along = horizontal ? size.w : size.h;
    const across = horizontal ? size.h : size.w;
    const a0 = flip ? along + 40 : -60;
    const a1 = flip ? -60 : along + 40;
    const lane = 80 + Math.random() * Math.max(60, across - 200);
    const pts = [0, 1, 2, 3, 4].map((i) => ({
      a: a0 + ((a1 - a0) * i) / 4,
      c: Math.min(across - 70, Math.max(30, lane + (i === 0 || i === 4 ? 0 : (Math.random() - 0.5) * 150))),
    }));
    const xy = pts.map((p) => (horizontal ? { x: p.a, y: p.c } : { x: p.c, y: p.a }));
    // đầu con gián hướng lên (0deg) => quay theo hướng bò
    const heading = horizontal ? (flip ? -90 : 90) : flip ? 0 : 180;
    return { xy, heading };
  });
  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 4800 + Math.random() * 600, easing: Easing.linear, useNativeDriver: false });
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [t, onDone]);
  const range = [0, 0.25, 0.5, 0.75, 1];
  const squash = () => {
    if (squashed) return;
    setSquashed(true);
    play('squash');
    vibrate(40);
    setTimeout(onDone, 450);
  };
  return (
    <Animated.View
      style={{
        position: 'absolute', width: 44, height: 58,
        left: t.interpolate({ inputRange: range, outputRange: path.xy.map((p) => p.x) }),
        top: t.interpolate({ inputRange: range, outputRange: path.xy.map((p) => p.y) }),
      }}
    >
      <Pressable testID={squashed ? 'roach-squashed' : 'roach'} accessibilityRole="button" accessibilityLabel="Đập gián" hitSlop={16} onPress={squash} style={{ width: 44, height: 58 }}>
        {squashed ? (
          <View style={{ width: 44, height: 58, alignItems: 'center', justifyContent: 'center' }}>
            <EmojiIcon emoji="💥" size={38} />
          </View>
        ) : (
          <AnimatedImage
            source={{ uri: ROACH_URI }}
            style={{
              width: 44, height: 58,
              transform: [{ rotate: t.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, 10, -10, 10, -10, 0].map((d) => `${path.heading + d}deg`) }) }],
            }}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

/** vệt mực loang ở một góc (không che giữa màn hình/nút hành động), mờ dần sau ~3 giây, chạm để lau */
function InkSplash({ corner, size, onDone: finish }: { corner: number; size: Size; onDone: () => void }) {
  const doneRef = useRef(finish);
  useEffect(() => { doneRef.current = finish; }, [finish]);
  const onDone = useCallback(() => doneRef.current(), []);
  const t = useState(() => new Animated.Value(0))[0];
  const wipe = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 3200, easing: Easing.in(Easing.quad), useNativeDriver: false });
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [t, onDone]);
  const right = corner % 2 === 1;
  const bottom = corner >= 2;
  const S = Math.min(160, size.w * 0.42);
  const blobs: [number, number, number][] = [[0.5, 0.5, 0.62], [0.28, 0.62, 0.38], [0.7, 0.3, 0.42], [0.3, 0.25, 0.3], [0.75, 0.72, 0.28], [0.12, 0.4, 0.14], [0.9, 0.5, 0.12]];
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute', width: S, height: S,
        [right ? 'right' : 'left']: -S * 0.12,
        ...(bottom ? { bottom: Math.min(150, size.h * 0.22) } : { top: 150 }),
        opacity: Animated.multiply(wipe, t.interpolate({ inputRange: [0, 0.45, 1], outputRange: [1, 0.95, 0] })),
      }}
    >
      <Pressable
        testID="ink-splash"
        accessibilityRole="button"
        accessibilityLabel="Lau mực"
        style={{ width: S, height: S }}
        onPress={() => {
          play('pop');
          Animated.timing(wipe, { toValue: 0, duration: 180, useNativeDriver: false }).start(onDone);
        }}
      >
        {blobs.map(([x, y, r], i) => (
          <View
            key={i}
            style={{
              position: 'absolute', width: S * r, height: S * r, borderRadius: S * r, backgroundColor: '#1B1240',
              left: S * x - (S * r) / 2, top: S * y - (S * r) / 2, borderWidth: 2, borderColor: '#0C0722',
            }}
          />
        ))}
        <View style={{ position: 'absolute', left: S * 0.36, top: S * 0.3, width: S * 0.14, height: S * 0.08, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', transform: [{ rotate: '-25deg' }] }} />
        <Text style={styles.inkHint}>Chạm để lau</Text>
      </Pressable>
    </Animated.View>
  );
}

/** Sụp nguồn sáng (cúp điện): nhấp nháy bóng đèn rồi tối sầm màn hình ~4 giây, bấm bật cầu dao để sáng ngay */
function BlackoutSplash({ onDone: finish }: { onDone: () => void }) {
  const doneRef = useRef(finish);
  useEffect(() => { doneRef.current = finish; }, [finish]);
  const onDone = useCallback(() => doneRef.current(), []);
  const alpha = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(alpha, { toValue: 0.92, duration: 70, useNativeDriver: false }),
      Animated.timing(alpha, { toValue: 0.25, duration: 65, useNativeDriver: false }),
      Animated.timing(alpha, { toValue: 0.97, duration: 80, useNativeDriver: false }),
      Animated.timing(alpha, { toValue: 0.4, duration: 60, useNativeDriver: false }),
      Animated.timing(alpha, { toValue: 0.96, duration: 110, useNativeDriver: false }),
      Animated.delay(3200),
      Animated.timing(alpha, { toValue: 0, duration: 420, useNativeDriver: false }),
    ]);
    anim.start(({ finished }) => finished && onDone());
    return () => anim.stop();
  }, [alpha, onDone]);
  return (
    <Animated.View
      testID="blackout-splash"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: 'rgba(17, 20, 28, 0.96)',
          opacity: alpha,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          gap: 12,
        },
      ]}
    >
      <UiIcon name="Zap" size={44} color={C.gold} />
      <T style={{ color: C.darkText, fontSize: 19, fontWeight: '600', textAlign: 'center' }}>Sụp nguồn sáng</T>
      <T style={{ color: C.darkMuted, fontSize: 14, fontWeight: '400', textAlign: 'center' }}>Ai đó vừa giật cầu dao làm tối màn hình của bạn</T>
      <Pressable
        testID="blackout-recover"
        accessibilityRole="button"
        accessibilityLabel="Bật lại cầu dao"
        onPress={() => {
          play('pop');
          Animated.timing(alpha, { toValue: 0, duration: 160, useNativeDriver: false }).start(onDone);
        }}
        style={{
          marginTop: 6, backgroundColor: C.gold, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
          borderWidth: 1, borderColor: C.goldDeep, flexDirection: 'row', alignItems: 'center', gap: 8,
        }}
      >
        <UiIcon name="Zap" size={16} color={C.ink} />
        <T style={{ color: C.ink, fontWeight: '600', fontSize: 14 }}>Bật lại cầu dao</T>
      </Pressable>
    </Animated.View>
  );
}

type Troll = { id: number } & ({ kind: 'roach' } | { kind: 'ink'; corner: number } | { kind: 'blackout' });

/** hiệu ứng gián/mực/sụp nguồn trên máy người bị chọc; người khác chỉ thấy thông báo nhỏ */
export function TrollLayer({ game, players }: { game: Game; players: PublicPlayer[] }) {
  const [items, setItems] = useState<Troll[]>([]);
  const [size, setSize] = useState<Size>(() => ({
    w: Math.min(Dimensions.get('window').width, 520),
    h: Dimensions.get('window').height,
  }));
  const seq = useRef(0);
  const feed = useFeed();
  const playersRef = useRef(players);
  useEffect(() => {
    playersRef.current = players;
  }, [players]);
  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);
  const drop = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  useEffect(() => {
    const nameOf = (id: string) => (id === game.me ? 'bạn' : playersRef.current.find((p) => p.id === id)?.name ?? '?');
    return game.onFun((e: FunEvent) => {
      if (e.kind !== 'roach' && e.kind !== 'ink' && e.kind !== 'blackout') return;
      const toMe = e.to === game.me;
      const from = nameOf(e.from);
      if (e.kind === 'roach') {
        feed(quip.roach(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
        if (toMe) {
          vibrate([60, 40, 60]);
          const n = e.count ?? 2;
          setItems((xs) => [...xs, ...Array.from({ length: n }, () => ({ id: ++seq.current, kind: 'roach' as const }))]);
        }
      } else if (e.kind === 'ink') {
        feed(quip.ink(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
        if (toMe) {
          play('inksplash');
          vibrate(120);
          setItems((xs) => [...xs, { id: ++seq.current, kind: 'ink', corner: e.corner ?? 0 }]);
        }
      } else {
        feed(quip.blackout(from, toMe ? 'bạn' : nameOf(e.to)), toMe ? 'bad' : 'fun');
        if (toMe) {
          play('blackout');
          vibrate([100, 50, 220]);
          setItems((xs) => [...xs.filter((x) => x.kind !== 'blackout'), { id: ++seq.current, kind: 'blackout' }]);
        }
      }
    });
  }, [game, feed]);

  if (items.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={styles.trollLayer} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {items.map((it) =>
        it.kind === 'roach' ? (
          <Roach key={it.id} size={size} onDone={() => drop(it.id)} />
        ) : it.kind === 'ink' ? (
          <InkSplash key={it.id} corner={it.corner} size={size} onDone={() => drop(it.id)} />
        ) : (
          <BlackoutSplash key={it.id} onDone={() => drop(it.id)} />
        ),
      )}
    </View>
  );
}

// ---------- Bảng chọn đồ để ném / hối ----------

type ThrowFilter = 'all' | 'skill' | 'gift' | 'troll' | 'hit';
const THROW_FILTERS: { id: ThrowFilter; icon: UiIconName; label: string }[] = [
  { id: 'all', icon: 'Layers', label: 'Tất cả' },
  { id: 'skill', icon: 'Zap', label: 'Kỹ năng VIP' },
  { id: 'gift', icon: 'Gift', label: 'Quà đại gia' },
  { id: 'troll', icon: 'Smile', label: 'Chọc vui' },
  { id: 'hit', icon: 'Swords', label: 'Đánh & Ném' },
];

export function ThrowSheet({ game, target, onClose }: { game: Game; target: PublicPlayer; onClose: () => void }) {
  const [pane, setPane] = useState<'doodle' | 'nick' | null>(null);
  const [filter, setFilter] = useState<ThrowFilter>('all');
  const [shopOpen, setShopOpen] = useState(false);
  const [kho, setKho] = useState(false);
  const [quota, setQuota] = useState<{ free: number; left: number } | null>(null);
  const feed = useFeed();
  const { funQuota } = game;
  useEffect(() => {
    void funQuota().then(setQuota);
  }, [funQuota]);
  const send = (f: Parameters<Game['sendFun']>[0]) => {
    onClose();
    void game.sendFun(f).then((r) => {
      if (!r.ok && r.reason === 'quota') {
        feed(game.user ? `Hết ${FREE_POKES_PER_DAY} lượt chọc miễn phí hôm nay — nạp Ruby để chọc tiếp` : `Hết ${FREE_POKES_PER_DAY} lượt chọc miễn phí hôm nay — đăng ký tài khoản và nạp Ruby để chọc tiếp`, 'info');
      } else if (!r.ok && r.reason === 'need_ruby') feed('Không đủ Ruby cho chiêu này, vào Cửa hàng để nạp thêm', 'info');
      else if (!r.ok && r.reason === 'need_account') feed('Cần đăng nhập tài khoản để dùng kỹ năng và tặng quà', 'info');
      // mỗi người chỉ bị rung/sụp nguồn/gián/mực tối đa 3 lần mỗi 15 giây
      if (!r.ok && r.reason === 'limited') {
        feed(`${target.name} bị chọc đủ rồi, chờ ${Math.ceil((r.retryMs ?? 1000) / 1000)} giây nữa nhé (tối đa 3 lần/15 giây)`, 'info');
      } else if (!r.ok && r.reason === 'busy') feed('Chọc chậm thôi, từ từ nào', 'info');
    });
  };
  const hit = (move: HitMove) => send({ kind: 'hit', to: target.id, move });
  if (shopOpen) return <ShopSheet game={game} onClose={() => setShopOpen(false)} />;
  const show = (sec: Exclude<ThrowFilter, 'all'>) => filter === 'all' || filter === sec;
  return (
    <Sheet title={`Chọc ${target.name}`} onClose={onClose}>
      {quota && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -4 }}>
          <UiIcon name="Zap" size={14} color={C.goldDeep} />
          <T testID="poke-quota" style={[styles.quota, { marginTop: 0 }]}>
            Còn {quota.left}/{quota.free} lượt chọc miễn phí hôm nay (hết thì 1 Ruby / lần)
          </T>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6, paddingBottom: 2 }}>
        {THROW_FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable
              key={f.id}
              testID={`poke-filter-${f.id}`}
              onPress={() => setFilter(f.id)}
              style={[styles.filterPill, on && styles.filterPillOn]}
            >
              <UiIcon name={f.icon} size={13} color={on ? C.onSon : C.secondary} />
              <T style={[styles.filterPillTxt, on && { color: C.onSon }]}>{f.label}</T>
            </Pressable>
          );
        })}
      </ScrollView>
      <Button
        testID="poke-kho-open"
        variant={kho ? 'ink' : 'gold'}
        iconNode={<UiIcon name="Gift" size={15} color={kho ? C.onSon : C.ink} />}
        title={kho ? 'Đóng kho chọc ghẹo' : `Kho chọc ghẹo · ${POKES.length} món`}
        onPress={() => setKho((v) => !v)}
      />
      {kho && <PokeGallery onPick={(p: PokeItem) => send({ kind: 'poke', to: target.id, poke: p.id })} />}
      {show('hit') && (
        <>
          <View style={styles.secHeadingRow}>
            <UiIcon name="Swords" size={15} color={C.secondary} />
            <T style={styles.sectionLabel}>Đánh nhau (máu ảo, không ảnh hưởng ván chơi)</T>
          </View>
          <View style={styles.hits}>
            {HITS.map((h) => (
              <View key={h.move} style={styles.hitCell}>
                <Button testID={`hit-${h.move}`} title={h.emoji} big variant="ink" onPress={() => hit(h.move)} />
                <T style={styles.cellLabel}>{h.name}</T>
              </View>
            ))}
          </View>
        </>
      )}

      {show('troll') && (
        <>
          <View style={styles.secHeadingRow}>
            <UiIcon name="Smile" size={15} color={C.secondary} />
            <T style={styles.sectionLabel}>Chọc lầy giải trí</T>
          </View>
          <T style={styles.limitNote}>Rung, xoay, sụp nguồn, gián, mực, hối: mỗi người chỉ dính tối đa 3 lần mỗi 15 giây. Đang tới lượt nối từ thì được bù lại thời gian.</T>
          {pane ? (
            <>
              {pane === 'doodle' && (
                <View testID="doodle-pane" style={styles.pane}>
                  <T style={styles.paneTitle}>Vẽ gì lên mặt {target.name}? (20 giây)</T>
                  <View style={styles.paneRow}>
                    {DOODLE_OPTIONS.map((d) => (
                      <Button key={d.doodle} testID={`doodle-${d.doodle}`} small variant="paper" icon={d.emoji} title={d.name} style={styles.paneBtn} onPress={() => send({ kind: 'doodle', to: target.id, doodle: d.doodle as DoodleKind })} />
                    ))}
                  </View>
                </View>
              )}
              {pane === 'nick' && (
                <View testID="nick-pane" style={styles.pane}>
                  <T style={styles.paneTitle}>Gắn biệt danh cho {target.name} (60 giây)</T>
                  <View style={styles.paneRow}>
                    {NICK_IDS.map((n) => (
                      <Button key={n} testID={`nick-${n}`} small variant="paper" title={nickText(n)} style={styles.paneBtn} onPress={() => send({ kind: 'nick', to: target.id, nick: n as NicknameId })} />
                    ))}
                  </View>
                </View>
              )}
              <Button testID="troll-back" small variant="paper" title="‹ Quay lại" style={{ alignSelf: 'flex-start' }} onPress={() => setPane(null)} />
            </>
          ) : (
            <View style={styles.trolls}>
              <Button testID="troll-doodle" title="Vẽ bậy" variant={pane === 'doodle' ? 'ink' : 'gold'} style={styles.troll} onPress={() => setPane(pane === 'doodle' ? null : 'doodle')} />
              <Button testID="troll-roach" title="Thả gián" variant="gold" style={styles.troll} onPress={() => send({ kind: 'roach', to: target.id })} />
              <Button testID="troll-ink" title="Tạt mực" variant="gold" style={styles.troll} onPress={() => send({ kind: 'ink', to: target.id })} />
              <Button testID="troll-nick" title="Biệt danh" variant={pane === 'nick' ? 'ink' : 'gold'} style={styles.troll} onPress={() => setPane(pane === 'nick' ? null : 'nick')} />
              <Button testID="troll-honk" title="Bật loa" variant="gold" style={styles.troll} onPress={() => send({ kind: 'honk', to: target.id })} />
              <Button testID="troll-cry" title="Khóc thuê" variant="gold" style={styles.troll} onPress={() => send({ kind: 'cry', to: target.id })} />
              <Button testID="troll-blackout" title="Sụp nguồn sáng" variant="gold" style={styles.troll} onPress={() => send({ kind: 'blackout', to: target.id })} />
              <Button testID="troll-spin" title="Xoay màn hình" variant="gold" style={styles.troll} onPress={() => send({ kind: 'spin', to: target.id })} />
              <Button testID="troll-quake" title="Rung động đất" variant="gold" style={styles.troll} onPress={() => send({ kind: 'quake', to: target.id })} />
              <Button testID="troll-fart" title="Thả bom thối" variant="gold" style={styles.troll} onPress={() => send({ kind: 'fart', to: target.id })} />
              <Button testID="troll-slipper" title="Dép bay liên hoàn" variant="gold" style={styles.troll} onPress={() => send({ kind: 'slipper', to: target.id })} />
              <Button testID="troll-chicken" title="Gà mổ" variant="gold" style={styles.troll} onPress={() => send({ kind: 'chicken', to: target.id })} />
              <Button testID="troll-bigface" title="Mặt to" variant="gold" style={styles.troll} onPress={() => send({ kind: 'bigface', to: target.id })} />
              <Button testID="troll-banana" title="Vỏ chuối" variant="gold" style={styles.troll} onPress={() => send({ kind: 'banana', to: target.id })} />
              <Button testID="troll-mirror" title="Lật ngược màn hình" variant="gold" style={styles.troll} onPress={() => send({ kind: 'mirror', to: target.id })} />
              <Button testID="troll-charm" title="Xin vía cho mình" variant="paper" style={styles.troll} onPress={() => send({ kind: 'charm' })} />
            </View>
          )}
        </>
      )}

      {show('skill') && (
        <>
          <View style={styles.secHeadingRow}>
            <UiIcon name="Zap" size={15} color={C.secondary} />
            <T style={styles.sectionLabel}>Kỹ năng VIP trả Ruby</T>
          </View>
          <View style={styles.trolls}>
            {SKILL_IDS.map((id) => {
              const it = shopItem(id)!;
              const mythic = it.price >= 50;
              return (
                <Button
                  key={id}
                  testID={`skill-${id}`}
                  title={`${it.name} · ${it.price} Ruby`}
                  small
                  variant={mythic ? 'gold' : 'ink'}
                  style={styles.troll}
                  onPress={() => send({ kind: id, to: target.id } as Parameters<typeof send>[0])}
                />
              );
            })}
          </View>
        </>
      )}

      {show('gift') && (
        <>
          <View style={styles.secHeadingRow}>
            <UiIcon name="Gift" size={15} color={C.secondary} />
            <T style={styles.sectionLabel}>Tặng quà Phú Hào (người nhận hưởng 70% Ruby & điểm quà)</T>
          </View>
          <View style={styles.trolls}>
            {GIFT_IDS.map((id) => {
              const it = shopItem(id)!;
              const mega = it.price >= 500;
              return (
                <Button
                  key={id}
                  testID={`gift-${id}`}
                  title={`${it.name} · ${it.price} Ruby`}
                  small
                  variant={mega ? 'gold' : 'jade'}
                  style={styles.troll}
                  onPress={() => send({ kind: 'gift', to: target.id, gift: id })}
                />
              );
            })}
          </View>
        </>
      )}

      <Button
        testID="shop-open-throw"
        small
        variant="paper"
        iconNode={<UiIcon name="ShoppingBag" size={14} color={C.ink} />}
        title="Cửa hàng VIP"
        style={{ alignSelf: 'flex-start' }}
        onPress={() => setShopOpen(true)}
      />

      {show('hit') && (
        <>
          <T style={styles.sectionLabel}>Ném đồ</T>
          <View style={styles.grid}>
            {THROWS.map((t) => (
              <View key={t.item} style={styles.cell}>
                <Button
                  testID={`throw-${t.item}`}
                  title={t.emoji}
                  big
                  variant="paper"
                  onPress={() => send({ kind: 'throw', to: target.id, item: t.item })}
                />
                <T style={styles.cellLabel}>{t.name}</T>
              </View>
            ))}
          </View>
        </>
      )}
      <Button
        testID="poke-btn"
        iconNode={<UiIcon name="Timer" size={15} color={C.onSon} />}
        title={`Hối ${target.name}`}
        variant="ink"
        onPress={() => send({ kind: 'poke', to: target.id })}
      />
      <KickInline game={game} player={target} onDone={onClose} />
    </Sheet>
  );
}

const FALLBACK_CHAT_AVATAR = { avatar: 0 } as const;

const ChatInputBar = memo(function ChatInputBar({
  onSend,
}: {
  onSend: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      if (await onSend(clean)) setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.chatInputRow}>
      <TextInput
        testID="chat-input"
        style={styles.chatInput}
        value={text}
        onChangeText={setText}
        placeholder="Nhắn gì đó…"
        placeholderTextColor={C.muted}
        maxLength={CHAT_MAX}
        returnKeyType="send"
        onSubmitEditing={() => void submit()}
        blurOnSubmit={false}
      />
      <Button
        testID="chat-send"
        title="Gửi"
        small
        disabled={sending || !text.trim()}
        onPress={() => void submit()}
        style={{ minWidth: 70 }}
      />
    </View>
  );
});

const ChatMessageList = memo(function ChatMessageList({
  chat,
  me,
  playerMap,
  compact,
}: {
  chat: ChatMsg[];
  me: string | null;
  playerMap: Map<string, PublicPlayer>;
  compact: boolean;
}) {
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const anim = mountedRef.current;
    mountedRef.current = true;
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: anim }), 20);
    return () => clearTimeout(t);
  }, [chat.length]);

  return (
    <ScrollView
      ref={listRef}
      testID="chat-list"
      style={[styles.chatList, compact && { maxHeight: 145 }]}
      contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
      keyboardShouldPersistTaps="handled"
    >
      {chat.length === 0 && <T style={styles.empty}>Chưa có tin nhắn nào. Mở hàng câu chuyện đi.</T>}
      {chat.map((m) => {
        const mine = m.from === me;
        const pl = playerMap.get(m.from);
        const asset = m.kind === 'sticker' ? stickerOf(m.stickerId) : undefined;
        const bStyle = chatBubbleStyleOf(pl?.cosmetics?.chatBubble);
        const bColor = chatBubbleTextColorOf(pl?.cosmetics?.chatBubble);
        return (
          <View key={m.id} style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }]}>
            {/* Không gắn frame xoay/glow trong danh sách chat popup để tránh overdraw GPU trên mobile */}
            <Portrait p={pl ?? FALLBACK_CHAT_AVATAR} size={24} border={1} />
            <View style={[styles.msg, mine ? styles.msgMine : null, bStyle]}>
              {!mine && <T style={[styles.msgName, bColor ? { color: bColor } : null]}>{m.name}</T>}
              {m.kind === 'sticker' ? (
                asset ? (
                  <Image source={asset.source} accessibilityLabel={asset.alt} style={styles.messageSticker} resizeMode="contain" />
                ) : (
                  <T style={[styles.msgText, mine && { color: C.onSon }, bColor ? { color: bColor } : null]}>
                    Nhãn dán chưa có trên thiết bị này
                  </T>
                )
              ) : (
                <T style={[styles.msgText, mine && { color: C.onSon }, bColor ? { color: bColor } : null]}>{m.text}</T>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
});

/** Trò chuyện: ô nhập tách riêng + danh sách memo hóa mượt mà trên mobile */
export function ChatSheet({ game, players, onClose }: { game: Game; players: PublicPlayer[]; onClose: () => void }) {
  const [sendingSticker, setSendingSticker] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const feed = useFeed();
  const ownsPack = !!game.user?.owned?.includes(STICKER_PACK_ID);
  const shortScreen = useStableWindow().height < 520;
  const kb = useKeyboardInset() > 0;

  const playerMap = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const handleSendChat = useCallback((msg: string) => game.sendChat(msg), [game]);

  if (shopOpen) return <ShopSheet game={game} initialTab="sticker" onClose={() => setShopOpen(false)} />;
  return (
    <Sheet
      title="Tám chuyện"
      onClose={onClose}
      scroll={false}
      stickyBottom={<ChatInputBar onSend={handleSendChat} />}
    >
      <ChatMessageList chat={game.chat} me={game.me} playerMap={playerMap} compact={kb || shortScreen} />
      {!kb && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.emojiRow}>
          {EMOJIS.map((e, i) => (
            <Button
              key={e}
              testID={`emoji-${i}`}
              title={e}
              small
              variant="paper"
              style={styles.emojiBtn}
              onPress={() => game.sendFun({ kind: 'emoji', emoji: e })}
            />
          ))}
        </ScrollView>
      )}
      {!kb && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.taunts}>
          {TAUNTS.map((t) => (
            <Button
              key={t.id}
              testID={`taunt-${t.id}`}
              small
              variant="paper"
              title={t.text}
              onPress={() => {
                game.sendFun({ kind: 'taunt', taunt: t.id });
                onClose();
              }}
            />
          ))}
        </ScrollView>
      )}
      {!kb && (
        <Button
          testID="sticker-toggle"
          title={showStickers ? 'Ẩn nhãn dán' : 'Nhãn dán · 21 (12 bộ Chữ Lầy mua bằng Ruby)'}
          small
          variant="paper"
          onPress={() => setShowStickers((v) => !v)}
        />
      )}
      {showStickers && !kb && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={styles.stickerRow}>
          {STICKERS.map((item) => (
            <Pressable
              key={item.id}
              testID={`sticker-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Gửi nhãn dán ${item.alt}`}
              disabled={sendingSticker}
              style={[styles.stickerOption, sendingSticker && { opacity: 0.5 }]}
              onPress={async () => {
                if (sendingSticker) return;
                setSendingSticker(true);
                try { if (await game.sendSticker(item.id)) setShowStickers(false); }
                finally { setSendingSticker(false); }
              }}
            >
              <Image source={item.source} accessibilityLabel={item.alt} style={styles.stickerThumb} resizeMode="contain" />
            </Pressable>
          ))}
          {CHU_LAY_STICKERS.map((item) => (
            <Pressable
              key={item.id}
              testID={`sticker-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={ownsPack ? `Gửi nhãn dán ${item.alt}` : `${item.alt} (khóa, mua bộ Chữ Lầy trong Cửa hàng)`}
              disabled={sendingSticker}
              style={[styles.stickerOption, sendingSticker && { opacity: 0.5 }]}
              onPress={async () => {
                if (!ownsPack) {
                  feed(game.user ? 'Bộ Chữ Lầy đang khóa — mua 100 Ruby trong Cửa hàng để dùng' : 'Bộ Chữ Lầy cần tài khoản và 100 Ruby để mở khóa', 'info');
                  if (game.user) setShopOpen(true);
                  return;
                }
                if (sendingSticker) return;
                setSendingSticker(true);
                try { if (await game.sendSticker(item.id)) setShowStickers(false); }
                finally { setSendingSticker(false); }
              }}
            >
              <Image source={item.source} accessibilityLabel={item.alt} style={[styles.stickerThumb, !ownsPack && { opacity: 0.45 }]} resizeMode="contain" />
              {!ownsPack && (
                <View style={styles.stickerLockPill}>
                  <UiIcon name="Lock" size={12} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const smooth = getSmoothModeSync();
    let cancelled = false;
    const fire = () => {
      if (cancelled) return;
      try {
        void confetti({
          particleCount: smooth ? 28 : 80,
          spread: 78,
          origin: { y: 0.62 },
          colors: CONFETTI_COLORS,
          disableForReducedMotion: smooth,
        });
        if (!smooth) {
          setTimeout(() => {
            if (cancelled) return;
            try {
              void confetti({ particleCount: 45, angle: 60, spread: 55, origin: { x: 0.08, y: 0.68 }, colors: CONFETTI_COLORS });
              void confetti({ particleCount: 45, angle: 120, spread: 55, origin: { x: 0.92, y: 0.68 }, colors: CONFETTI_COLORS });
            } catch { /* bỏ qua trên headless thiếu 2D context */ }
          }, 180);
        }
      } catch { /* bỏ qua trên headless thiếu 2D context */ }
    };
    fire();
    return () => { cancelled = true; };
  }, []);

  const width = Math.min(Dimensions.get('window').width, 520);
  if (Platform.OS === 'web') return null;
  const count = getSmoothModeSync() ? 22 : 70;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden', zIndex: 60 }]}>
      {Array.from({ length: count }, (_, i) => (
        <Piece key={i} i={i} width={width} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  quota: { fontSize: 12.5, fontWeight: '600', color: C.jadeDeep, fontVariant: ['tabular-nums'] },
  stickerLockPill: {
    position: 'absolute', right: 4, top: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: C.darkBg, alignItems: 'center', justifyContent: 'center',
  },
  limitNote: { fontSize: 11, color: C.muted, lineHeight: 15, marginTop: -4, fontWeight: '400' },
  stickerRow: { gap: 8, paddingVertical: 4 },
  stickerOption: { width: 88, height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderRadius: 11, borderWidth: 1, borderColor: C.borderSubtle },
  stickerThumb: { width: 80, height: 84 },
  messageSticker: { width: 130, height: 130 },
  bubbleSticker: { width: 130, height: 104 },
  avatarImage: { width: 25, height: 25, borderRadius: 13 },
  fly: { position: 'absolute', fontSize: 44, zIndex: 90 },
  splat: { position: 'absolute', fontSize: 80, zIndex: 90 },
  bubble: {
    position: 'absolute', backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: C.borderSubtle,
    justifyContent: 'center', alignItems: 'center', zIndex: 90,
  },
  bubbleName: { fontFamily: FONT, fontSize: 11, fontWeight: '600', color: C.son, alignSelf: 'stretch', textAlign: 'center' },
  bubbleText: { fontFamily: FONT, fontWeight: '500', fontSize: 13.5, color: C.ink, textAlign: 'center' },
  chatBubble: { backgroundColor: C.ink },
  tail: { position: 'absolute', top: -7, width: 12, height: 12, backgroundColor: C.paper, transform: [{ rotate: '45deg' }] },
  float: { position: 'absolute', fontSize: 44, zIndex: 92 },
  pow: {
    fontFamily: FONT, fontSize: 24, fontWeight: '600', color: C.gold, textShadowColor: C.ink,
    textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  ko: { fontSize: 36, color: C.danger, textShadowColor: '#fff' },
  dmg: { fontFamily: FONT, fontSize: 17, fontWeight: '600', color: '#fff', textShadowColor: C.ink, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
  hpTrack: { width: 70, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: C.ink, backgroundColor: C.mist, overflow: 'hidden', marginTop: 2 },
  hpFill: { height: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  cell: { width: '31%', alignItems: 'stretch' },
  cellLabel: { textAlign: 'center', fontSize: 12.5, fontWeight: '500', color: C.muted },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: C.secondary },
  secHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -4 },
  hits: { flexDirection: 'row', justifyContent: 'space-between' },
  trollLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 85, overflow: 'hidden' },
  squashed: { fontSize: 40, textAlign: 'center' },
  inkHint: { position: 'absolute', alignSelf: 'center', top: '44%', fontFamily: FONT, fontWeight: '600', fontSize: 12.5, color: 'rgba(255,255,255,0.68)' },
  trolls: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  troll: { width: '48.5%', minHeight: 50, paddingHorizontal: 8 },
  trollWide: { width: '100%' },
  pane: { backgroundColor: C.parchment, borderRadius: 12, padding: 10, gap: 8, borderWidth: 1, borderColor: C.borderSubtle },
  paneTitle: { fontSize: 13, fontWeight: '600', color: C.secondary },
  paneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paneBtn: { flexGrow: 1 },
  hitCell: { width: '23%', alignItems: 'stretch' },
  taunts: { gap: 8, paddingRight: 8 },
  emojiRow: { gap: 6, paddingRight: 8 },
  emojiBtn: { minWidth: 48, paddingHorizontal: 6 },
  chatList: { flexShrink: 1, maxHeight: 240, minHeight: 72, backgroundColor: C.parchment, borderRadius: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: C.borderSubtle },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 20, fontSize: 13, fontWeight: '400' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderSubtle },
  msg: { maxWidth: '78%', backgroundColor: C.paper, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: C.borderSubtle },
  msgMine: { backgroundColor: C.ink, borderColor: C.ink },
  msgName: { fontSize: 11.5, fontWeight: '600', color: C.son },
  msgText: { fontSize: 14, fontWeight: '400', color: C.ink },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: {
    flex: 1, minWidth: 0, fontFamily: FONT, backgroundColor: C.paper, borderRadius: 11, paddingHorizontal: 12, height: 44,
    fontSize: 14.5, color: C.ink, borderWidth: 1, borderColor: C.borderStrong, fontWeight: '400',
  },
  comboBadge: {
    position: 'absolute',
    top: 86,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.darkBg,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 5,
    zIndex: 98,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  comboText: {
    fontFamily: FONT,
    fontSize: 12.5,
    fontWeight: '600',
    color: C.gold,
    fontVariant: ['tabular-nums'],
  },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99,
    backgroundColor: C.mist, borderWidth: 1, borderColor: C.borderSubtle,
  },
  filterPillOn: { backgroundColor: C.ink, borderColor: C.ink },
  filterPillTxt: { fontSize: 12, fontWeight: '500', color: C.secondary },
});
