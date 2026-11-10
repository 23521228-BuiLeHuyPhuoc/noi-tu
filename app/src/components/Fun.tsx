/**
 * Lớp hiệu ứng "lầy": đồ bay từ người ném tới người bị ném, bong bóng câu khịa,
 * bị hối thì rung máy + lắc màn hình, pháo giấy khi thắng.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CHAT_MAX, EMOJIS, MAX_HP, type ChatMsg, type FunEvent, type HitMove, type PublicPlayer, type ThrowItem } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { HITS, TAUNTS, THROWS } from '../messages';
import { useOnNew } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { avatarOf } from '../avatars';
import { Button, T, useFeed } from '../ui';
import { Sheet } from './Sheet';
import { STICKERS, stickerOf } from '../stickers';

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

export type Rect = { x: number; y: number; w: number; h: number };

/** Vị trí phần tử có testID trên màn hình, tính từ góc của `origin` */
export function rectOf(testId: string, origin: DOMRect | null): Rect | null {
  if (typeof document === 'undefined' || !origin) return null;
  const el = document.querySelector(`[data-testid="${testId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0) return null;
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
    <Animated.Text
      style={[
        styles.fly,
        {
          left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
          // bay theo đường vòng cung (cú đấm thì bay thẳng)
          top: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fy, fast ? (fy + ty) / 2 : Math.min(fy, ty) - 90, ty] }),
          transform: fast
            ? [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.6] }) }]
            : [{ rotate: t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '720deg'] }) }],
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

function Bubble({ text, at, onDone, chat, stickerId }: { text: string; at: Rect; onDone: () => void; chat?: boolean; stickerId?: ChatMsg['stickerId'] }) {
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const id = setTimeout(() => done.current(), chat ? 6000 : 4500);
    return () => clearTimeout(id);
  }, [chat]);
  const asset = stickerId ? stickerOf(stickerId) : undefined;
  return (
    <View
      style={[
        styles.bubble,
        sticker(3),
        chat && styles.chatBubble,
        // bong bóng nằm dưới avatar để không bị cắt ở mép trên màn hình
        { left: Math.max(6, at.x + at.w / 2 - 80), top: at.y + at.h + 22 },
      ]}
    >
      <View style={[styles.tail, chat && { backgroundColor: C.ink }]} />
      {asset ? <Image source={asset.source} accessibilityLabel={asset.alt} style={styles.bubbleSticker} resizeMode="contain" /> : <Text numberOfLines={3} style={[styles.bubbleText, chat && { color: C.gold }]}>{text}</Text>}
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
    <Animated.Text
      style={[
        styles.float,
        {
          left: t.interpolate({ inputRange: [0, 1], outputRange: [at.x + at.w / 2 - 22, at.x + at.w / 2 - 22 + dx] }),
          top: t.interpolate({ inputRange: [0, 1], outputRange: [at.y, at.y + 160] }),
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.4, 1.5, 1.1] }) }],
        },
      ]}
    >
      {emoji}
    </Animated.Text>
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
  | { kind: 'bubble'; text: string; at: Rect; chat?: boolean; stickerId?: ChatMsg['stickerId'] }
  | { kind: 'float'; emoji: string; at: Rect }
  | { kind: 'impact'; at: Rect; damage: number; hp: number; ko: boolean };
type Fx = FxIn & { id: number };

export function FunLayer({ game, players, chat }: { game: Game; players: PublicPlayer[]; chat: ChatMsg[] }) {
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
    setFx((xs) => [...xs.slice(-15), { ...f, id: ++seq.current }]);
  }, []);
  const remove = useCallback((id: number) => setFx((xs) => xs.filter((x) => x.id !== id)), []);
  const origin = () => (layer.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;

  // tin nhắn mới: bong bóng dưới avatar người gửi
  useOnNew(chat, (m) => {
    if (m.from !== game.me) play('chat');
    const at = rectOf(`avatar-${m.from}`, origin());
    if (at) add({ kind: 'bubble', text: m.kind === 'sticker' ? (stickerOf(m.stickerId)?.alt ?? 'Nhãn dán') : m.text, stickerId: m.stickerId, at, chat: true });
  });

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
      } else if (e.kind === 'emoji') {
        play('pop');
        if (fromR) add({ kind: 'float', emoji: e.emoji, at: fromR });
        else feed(`${from}: ${e.emoji}`, 'fun');
      } else if (e.kind === 'hit') {
        const move = HITS.find((h) => h.move === e.move) ?? HITS[0];
        const toR = rectOf(`avatar-${e.to}`, origin);
        const damage = e.damage ?? 0;
        const land = () => {
          play(e.ko ? 'ko' : 'punch');
          if (toR) add({ kind: 'impact', at: toR, damage, hp: e.hp ?? 0, ko: !!e.ko });
          if (toMe) {
            vibrate(e.ko ? [200, 80, 300] : 150);
            shake();
          }
          if (e.ko) feed(`💥 ${from} hạ đo ván ${toMe ? 'bạn' : nameOf(e.to)}! (hồi đầy máu)`, toMe ? 'bad' : 'fun');
          else if (toMe) feed(`${from} ${move.name.toLowerCase()} bạn ${move.emoji} -${damage} máu`, 'bad');
        };
        play('whoosh');
        if (fromR && toR) add({ kind: 'fly', emoji: move.emoji, from: fromR, to: toR, after: land, fast: true });
        else land();
      }
    });
  }, [game, add, feed, shake]);

  return (
    <View ref={layer} pointerEvents="none" style={StyleSheet.absoluteFill}>
      {fx.map((f) =>
        f.kind === 'fly' ? (
          <Flying key={f.id} emoji={f.emoji} from={f.from} to={f.to} fast={f.fast} onDone={() => { remove(f.id); f.after?.(); }} />
        ) : f.kind === 'splat' ? (
          <Splat key={f.id} emoji={f.emoji} at={f.at} onDone={() => remove(f.id)} />
        ) : f.kind === 'float' ? (
          <Float key={f.id} emoji={f.emoji} at={f.at} onDone={() => remove(f.id)} />
        ) : f.kind === 'impact' ? (
          <Impact key={f.id} at={f.at} damage={f.damage} hp={f.hp} ko={f.ko} onDone={() => remove(f.id)} />
        ) : (
          <Bubble key={f.id} text={f.text} at={f.at} chat={f.chat} stickerId={f.stickerId} onDone={() => remove(f.id)} />
        ),
      )}
    </View>
  );
}

// ---------- Bảng chọn đồ để ném / hối ----------

export function ThrowSheet({ game, target, onClose }: { game: Game; target: PublicPlayer; onClose: () => void }) {
  const hit = (move: HitMove) => {
    game.sendFun({ kind: 'hit', to: target.id, move });
    onClose();
  };
  return (
    <Sheet title={`Chọc ${target.name}`} onClose={onClose}>
      <T style={styles.sectionLabel}>🥊 Đánh nhau (máu ảo, không ảnh hưởng ván chơi)</T>
      <View style={styles.hits}>
        {HITS.map((h) => (
          <View key={h.move} style={styles.hitCell}>
            <Button testID={`hit-${h.move}`} title={h.emoji} big variant="ink" onPress={() => hit(h.move)} />
            <T style={styles.cellLabel}>{h.name}</T>
          </View>
        ))}
      </View>
      <T style={styles.sectionLabel}>Ném đồ</T>
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

/** Trò chuyện: emoji thả nhanh, câu khịa có sẵn và tin nhắn tự gõ */
export function ChatSheet({ game, players, onClose }: { game: Game; players: PublicPlayer[]; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const me = game.me;
  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      if (await game.sendChat(t)) setText('');
    } finally {
      setSending(false);
    }
  };
  const avatar = (id: string) => avatarOf(players.find((p) => p.id === id)?.avatar ?? 0);
  return (
    <Sheet title="Tám chuyện" onClose={onClose}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.emojiRow}>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.taunts}>
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
      <Button testID="sticker-toggle" title={showStickers ? 'Ẩn nhãn dán Quỳnh Aka' : 'Nhãn dán Quỳnh Aka · 9'} small variant="paper" onPress={() => setShowStickers((v) => !v)} />
      {showStickers && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickerRow}>
        {STICKERS.map((item) => <Pressable key={item.id} testID={`sticker-${item.id}`} accessibilityRole="button" accessibilityLabel={`Gửi nhãn dán ${item.alt}`} disabled={sending} style={[styles.stickerOption, sending && { opacity: 0.5 }]} onPress={async () => {
          if (sending) return;
          setSending(true);
          try { if (await game.sendSticker(item.id)) setShowStickers(false); }
          finally { setSending(false); }
        }}><Image source={item.source} accessibilityLabel={item.alt} style={styles.stickerThumb} resizeMode="contain" /></Pressable>)}
      </ScrollView>}
      <ScrollView
        ref={listRef}
        testID="chat-list"
        style={styles.chatList}
        contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      >
        {game.chat.length === 0 && <T style={styles.empty}>Chưa ai nói gì. Mở hàng đi!</T>}
        {game.chat.map((m) => {
          const mine = m.from === me;
          const a = avatar(m.from);
          const avatarUrl = players.find((p) => p.id === m.from)?.avatarUrl;
          const asset = m.kind === 'sticker' ? stickerOf(m.stickerId) : undefined;
          return (
            <View key={m.id} style={[styles.msgRow, mine && { flexDirection: 'row-reverse' }]}>
              <View style={[styles.msgAvatar, { backgroundColor: a.bg }]}>
                <>{avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} /> : <Text style={{ fontSize: 16 }}>{a.emoji}</Text>}</>
              </View>
              <View style={[styles.msg, mine ? styles.msgMine : null]}>
                {!mine && <T style={styles.msgName}>{m.name}</T>}
                {m.kind === 'sticker' ? (asset ? <Image source={asset.source} accessibilityLabel={asset.alt} style={styles.messageSticker} resizeMode="contain" /> : <T style={[styles.msgText, mine && { color: C.gold }]}>Nhãn dán chưa có trên thiết bị này</T>) : <T style={[styles.msgText, mine && { color: C.gold }]}>{m.text}</T>}
              </View>
            </View>
          );
        })}
      </ScrollView>
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
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <Button testID="chat-send" title="Gửi" small disabled={sending || !text.trim()} onPress={send} style={{ minWidth: 70 }} />
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
  stickerRow: { gap: 8, paddingVertical: 4 },
  stickerOption: { width: 88, height: 92, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper, borderRadius: 12 },
  stickerThumb: { width: 80, height: 84 },
  messageSticker: { width: 130, height: 130 },
  bubbleSticker: { width: 130, height: 110 },
  avatarImage: { width: 25, height: 25, borderRadius: 13 },
  fly: { position: 'absolute', fontSize: 44, zIndex: 90 },
  splat: { position: 'absolute', fontSize: 80, zIndex: 90 },
  bubble: {
    position: 'absolute', backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    width: 160, zIndex: 90,
  },
  bubbleText: { fontFamily: FONT, fontWeight: '800', fontSize: 14, color: C.ink, textAlign: 'center' },
  chatBubble: { backgroundColor: C.ink },
  tail: { position: 'absolute', top: -7, left: 72, width: 12, height: 12, backgroundColor: C.paper, transform: [{ rotate: '45deg' }] },
  float: { position: 'absolute', fontSize: 44, zIndex: 92 },
  pow: {
    fontFamily: FONT, fontSize: 26, fontWeight: '900', color: C.gold, textShadowColor: C.ink,
    textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
  },
  ko: { fontSize: 40, color: C.danger, textShadowColor: '#fff' },
  dmg: { fontFamily: FONT, fontSize: 18, fontWeight: '900', color: '#fff', textShadowColor: C.ink, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 },
  hpTrack: { width: 70, height: 9, borderRadius: 5, borderWidth: 2, borderColor: C.ink, backgroundColor: C.mist, overflow: 'hidden', marginTop: 2 },
  hpFill: { height: '100%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 },
  cell: { width: '31%', alignItems: 'stretch' },
  cellLabel: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: C.muted },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: C.muted, marginBottom: -6 },
  hits: { flexDirection: 'row', justifyContent: 'space-between' },
  hitCell: { width: '23%', alignItems: 'stretch' },
  taunts: { gap: 8, paddingRight: 8 },
  emojiRow: { gap: 6, paddingRight: 8 },
  emojiBtn: { minWidth: 48, paddingHorizontal: 6 },
  chatList: { maxHeight: 230, minHeight: 90, backgroundColor: C.mist, borderRadius: 14, paddingHorizontal: 8 },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 20 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.ink },
  msg: { maxWidth: '78%', backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: C.ink },
  msgMine: { backgroundColor: C.ink },
  msgName: { fontSize: 12, fontWeight: '800', color: C.son },
  msgText: { fontSize: 15, fontWeight: '600' },
  chatInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: {
    flex: 1, minWidth: 0, fontFamily: FONT, backgroundColor: C.mist, borderRadius: 12, paddingHorizontal: 12, height: 46,
    fontSize: 16, color: C.ink, borderWidth: 2, borderColor: C.ink,
  },
});
