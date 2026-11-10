import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BAUCUA_CHIPS, BAUCUA_LOAN, BAUCUA_SYMBOLS, type BauCuaSymbol, type BauCuaView, type PublicPlayer, type RoomState,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip, SYMBOL } from '../messages';
import { ART } from '../baucuaArt';
import { avatarOf, characterSvgUri, playerColorOf } from '../avatars';
import { useOnChange, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { rectOf, type Rect } from '../components/Fun';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const PAPER = '#F7E7C1';
const shortFmt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : fmt(n));

// ---------------- Bát & xúc xắc nhỏ trên bàn ----------------

function Bowl({ shaking, size = 72 }: { shaking: boolean; size?: number }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!shaking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 80, useNativeDriver: false }),
        Animated.timing(a, { toValue: -1, duration: 80, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shaking, a]);
  return (
    <Animated.Text
      style={{
        fontSize: size,
        transform: [
          { rotate: a.interpolate({ inputRange: [-1, 1], outputRange: ['-16deg', '16deg'] }) },
          { translateY: a.interpolate({ inputRange: [-1, 1], outputRange: [-5, 5] }) },
        ],
      }}
    >
      🥣
    </Animated.Text>
  );
}

function Face({ s, size, testID }: { s: BauCuaSymbol; size: number; testID?: string }) {
  return (
    <View testID={testID} accessibilityLabel={SYMBOL[s].name} style={[styles.face, sticker(3), { width: size, height: size, borderRadius: size * 0.2 }]}>
      <Image source={{ uri: ART[s] }} style={{ width: size * 0.86, height: size * 0.86 }} accessibilityLabel={SYMBOL[s].name} />
    </View>
  );
}

// ---------------- Tiền vun trên ô ----------------

type Stake = { id: string; amount: number; color: string; mine: boolean };

/** số đồng xu trong một chồng, tăng dần theo tiền cược */
const coinsFor = (amount: number) => Math.max(1, Math.min(8, Math.round(Math.log2(amount / 10)) + 1));

function CoinPile({ stakes, total, small }: { stakes: Stake[]; total: number; small: boolean }) {
  const w = small ? 20 : 24;
  const h = small ? 8 : 9;
  const step = small ? 3 : 4;
  return (
    <View pointerEvents="none" style={styles.pileWrap}>
      <T style={styles.pileTotal}>{shortFmt(total)}</T>
      <View style={styles.pileRow}>
        {stakes.map((st, k) => {
          const n = coinsFor(st.amount);
          return (
            <View key={st.id} style={{ width: w, height: h + (n - 1) * step, marginLeft: k === 0 ? 0 : -w * 0.35, zIndex: st.mine ? 10 : k }}>
              {Array.from({ length: n }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.coin,
                    { width: w, height: h, borderRadius: h, bottom: i * step, backgroundColor: st.color },
                    st.mine && { borderColor: '#7A4B00', backgroundColor: C.gold },
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ---------------- Đồng xu bay từ avatar vào ô ----------------

function FlyCoin({ from, to, color, onDone }: { from: Rect; to: Rect; color: string; onDone: () => void }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: false }).start(onDone);
  }, [t, onDone]);
  const fx = from.x + from.w / 2 - 11;
  const fy = from.y + from.h / 2 - 11;
  const tx = to.x + to.w / 2 - 11;
  const ty = to.y + to.h * 0.62 - 11;
  return (
    <Animated.View
      style={[
        styles.flyCoin,
        {
          backgroundColor: color,
          left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
          top: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fy, Math.min(fy, ty) - 50, ty] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.3, 0.7] }) }],
        },
      ]}
    />
  );
}

// ---------------- Mở bát toàn màn hình ----------------

const REVEAL_MS = 3600;
const FLY_AT = 1900;

function Rays({ size }: { size: number }) {
  const spin = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: false }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  const r = size / 2;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size,
        transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
      }}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <View key={i} style={{ position: 'absolute', width: size, height: size, alignItems: 'center', transform: [{ rotate: `${i * 30}deg` }] }}>
          {/* tam giác có đỉnh ở tâm */}
          <View
            style={{
              width: 0, height: 0, borderLeftWidth: r * 0.16, borderRightWidth: r * 0.16, borderTopWidth: r,
              borderLeftColor: 'transparent', borderRightColor: 'transparent',
              borderTopColor: i % 2 ? 'rgba(255,194,26,0.16)' : 'rgba(255,240,180,0.26)',
            }}
          />
        </View>
      ))}
    </Animated.View>
  );
}

function RevealDie({ s, i, x, y, size, target, fade }: {
  s: BauCuaSymbol; i: number; x: number; y: number; size: number; target: Rect | null; fade: boolean;
}) {
  const pop = useState(() => new Animated.Value(0))[0];
  const fly = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.sequence([
      Animated.delay(250 + i * 380),
      Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: false }),
    ]).start();
  }, [pop, i]);
  // vị trí ô đích được đo lúc FLY_AT: bay ngay khi có
  const go = !!target || fade;
  useEffect(() => {
    if (!go) return;
    Animated.sequence([
      Animated.delay(i * 140),
      Animated.timing(fly, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
    ]).start();
  }, [go, fly, i]);
  const tx = target ? target.x + target.w / 2 - size / 2 : x;
  const ty = target ? target.y + target.h / 2 - size / 2 : y;
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: fly.interpolate({ inputRange: [0, 1], outputRange: [x, tx] }),
        top: fly.interpolate({ inputRange: [0, 1], outputRange: [y, ty] }),
        opacity: target ? fly.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }) : fade ? fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) : 1,
        transform: [
          { scale: Animated.multiply(pop, target ? fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) : 1) },
          { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] }) },
        ],
      }}
    >
      <View style={[styles.halo, { width: size * 1.5, height: size * 1.5, borderRadius: size, left: -size * 0.25, top: -size * 0.25 }]} />
      <Face s={s} size={size} testID="reveal-die" />
    </Animated.View>
  );
}

function Rain({ width }: { width: number }) {
  const drops = useState(() => Array.from({ length: 22 }, () => ({ x: Math.random() * width, d: 900 + Math.random() * 700, delay: Math.random() * 900 })))[0];
  return (
    <>
      {drops.map((dr, i) => (
        <Drop key={i} {...dr} />
      ))}
    </>
  );
}

function Drop({ x, d, delay }: { x: number; d: number; delay: number }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: d, easing: Easing.in(Easing.quad), useNativeDriver: false }));
    const id = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(id);
      loop.stop();
    };
  }, [t, d, delay]);
  return (
    <Animated.Text style={{ position: 'absolute', left: x, fontSize: 18, top: t.interpolate({ inputRange: [0, 1], outputRange: [-30, 760] }) }}>
      💧
    </Animated.Text>
  );
}

function Reveal({ dice, myBets, delta, onDone }: {
  dice: BauCuaSymbol[];
  myBets: Partial<Record<BauCuaSymbol, number>>;
  delta: number | undefined;
  onDone: () => void;
}) {
  const root = useRef<ComponentRef<typeof View>>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [targets, setTargets] = useState<(Rect | null)[] | null>(null);
  const [phase, setPhase] = useState<'show' | 'after'>('show');
  const fade = useState(() => new Animated.Value(0))[0];
  const sad = useState(() => new Animated.Value(0))[0];
  const betOn = (s: BauCuaSymbol) => (myBets[s] ?? 0) > 0;
  const anyBet = BAUCUA_SYMBOLS.some(betOn);
  const lost = anyBet && !dice.some(betOn);

  useEffect(() => {
    play('reveal');
    Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: false }).start();
    const t1 = setTimeout(() => {
      // con nào trúng ô mình đặt thì bay vào ô đó
      const origin = (root.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      setTargets(dice.map((s) => (betOn(s) ? rectOf(`sym-${s}`, origin) : null)));
      setPhase('after');
      if (lost) {
        play('sad');
        vibrate([60, 80, 60]);
        Animated.timing(sad, { toValue: 1, duration: 400, useNativeDriver: false }).start();
      } else if ((delta ?? 0) > 0) {
        play('win');
        vibrate(80);
      }
    }, FLY_AT);
    const t2 = setTimeout(() => Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: false }).start(onDone), REVEAL_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // chỉ chạy một lần cho mỗi lần mở bát
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const size = box ? Math.min(104, (box.w - 60) / 3) : 90;
  const gap = 14;
  const cy = box ? box.h * 0.36 : 0;

  return (
    <Animated.View
      testID="bc-reveal"
      pointerEvents="none"
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={[StyleSheet.absoluteFill, { zIndex: 70, opacity: fade, overflow: 'hidden' }]}
    >
      {/* View thường (không phải Animated) để đo vị trí trên web */}
      <View ref={root} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(42,10,16,0.84)' }]} />
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(38,40,52,0.9)', opacity: sad }]} />
      {box && (
        <>
          {!lost && (
            <View style={{ position: 'absolute', left: box.w / 2 - box.w, top: cy - box.w, width: box.w * 2, height: box.w * 2, alignItems: 'center', justifyContent: 'center' }}>
              <Rays size={box.w * 2} />
              <View style={styles.glow} />
            </View>
          )}
          <T style={[styles.revealTitle, { top: cy - size - 40 }]}>{lost && phase === 'after' ? '' : 'MỞ BÁT!'}</T>
          {dice.map((s, i) => (
            <RevealDie
              key={i}
              s={s}
              i={i}
              size={size}
              x={box.w / 2 + (i - 1) * (size + gap) - size / 2}
              y={cy - size / 2}
              target={targets?.[i] ?? null}
              fade={targets !== null && !targets[i] && anyBet}
            />
          ))}
          {phase === 'after' && (
            <View style={[styles.revealMsg, { top: cy + size / 2 + 26 }]}>
              {lost ? (
                <View testID="bc-sad" style={{ alignItems: 'center' }}>
                  <T style={{ fontSize: 64 }}>😭</T>
                  <T style={styles.sadText}>Trật lất hết rồi…</T>
                </View>
              ) : delta && delta > 0 ? (
                <T style={styles.winText}>Trúng rồi! +{fmt(delta)} xu 🤑</T>
              ) : delta && delta < 0 ? (
                <T style={styles.meh}>Trúng mà vẫn lỗ {fmt(-delta)} xu 😅</T>
              ) : anyBet && delta === 0 ? (
                <T style={styles.meh}>Huề vốn 😌</T>
              ) : !anyBet ? (
                <T style={styles.meh}>Bạn không cược ván này</T>
              ) : null}
            </View>
          )}
          {lost && phase === 'after' && <Rain width={box.w} />}
        </>
      )}
    </Animated.View>
  );
}

// ---------------- Ô con vật ----------------

function Tile({ s, chip, step, hits, mine, stakes, total, glow, compact, disabled, onPress }: {
  s: BauCuaSymbol; chip: number; step: BauCuaView['step']; hits: number; mine: number;
  stakes: Stake[]; total: number; glow: boolean; compact: boolean; disabled?: boolean; onPress: () => void;
}) {
  const pulse = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!glow) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.35, duration: 420, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      pulse.setValue(0);
    };
  }, [glow, pulse]);
  const result = step === 'result';
  return (
    <Pressable
      testID={`sym-${s}`}
      accessibilityRole="button"
      accessibilityLabel={`Đặt ${chip} xu vào ${SYMBOL[s].name}`}
      disabled={step !== 'betting' || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        compact && styles.tileCompact,
        sticker(pressed ? 1 : 4),
        pressed && { transform: [{ translateY: 3 }] },
        result && hits === 0 && { opacity: 0.4 },
        result && hits > 0 && !glow && { borderColor: C.jade, borderWidth: 4 },
      ]}
    >
      {glow && <Animated.View pointerEvents="none" style={[styles.tileGlow, { opacity: pulse }]} />}
      <View style={styles.tileInner}>
        <Image source={{ uri: ART[s] }} style={[styles.tileArt, compact && { width: '62%' }]} resizeMode="contain" />
        <View style={styles.banner}>
          <T style={styles.bannerText}>{SYMBOL[s].name}</T>
        </View>
      </View>
      {stakes.length > 0 && (
        <View testID={`pile-${s}`} pointerEvents="none" style={styles.pileAnchor}>
          <CoinPile stakes={stakes} total={total} small={compact} />
        </View>
      )}
      {mine > 0 && <T testID={`mybet-${s}`} style={styles.mine}>{fmt(mine)}</T>}
      {result && hits > 0 && <T style={[styles.hit, glow && { backgroundColor: C.gold, color: C.ink }]}>×{hits}</T>}
    </Pressable>
  );
}

// ---------------- Màn hình ----------------

type Fly = { id: number; from: Rect; to: Rect; color: string };

export function BauCuaScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as BauCuaView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const feed = useFeed();
  const [chip, setChip] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [reveal, setReveal] = useState<number | null>(null);
  // cược của mình ở ván vừa mở bát (server xóa cược khi mở bát nên phải nhớ lại)
  const [resultBets, setResultBets] = useState<{ round: number; bets: Partial<Record<BauCuaSymbol, number>> }>({ round: 0, bets: {} });
  const lastBets = useRef<Partial<Record<BauCuaSymbol, number>>>({});
  const [flies, setFlies] = useState<Fly[]>([]);
  const fxRoot = useRef<ComponentRef<typeof View>>(null);
  const flySeq = useRef(0);
  const left = useSecondsLeft(g.stepEndsAt, game.clockOffset);
  // màn hình thấp (điện thoại nhỏ / bàn phím mở): thu gọn để thấy cả bát lẫn chiếu
  const compact = useWindowDimensions().height < 740;

  const isSpectator = !(me in g.balances);
  const myBets = g.bets[me] ?? {};
  const staked = Object.values(myBets).reduce((s, v) => s + (v ?? 0), 0);
  const balance = g.balances[me] ?? 0;
  const available = balance - staked;
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');
  const playerOf = (id: string): PublicPlayer | undefined => room.players.find((p) => p.id === id);
  const colorOf = (id: string) => {
    const p = playerOf(id);
    if (p?.character) return playerColorOf(p.character).light;
    return avatarOf(p?.avatar ?? 0).bg;
  };
  const borderColorOf = (id: string) => {
    const p = playerOf(id);
    if (p?.character) return playerColorOf(p.character).hex;
    return C.ink;
  };
  const portraitOf = (id: string) => {
    const p = playerOf(id);
    if (p?.avatarUrl) return p.avatarUrl;
    if (p?.character) return characterSvgUri(p.character);
    return undefined;
  };

  // Xếp hạng xu liên tục theo xu thực có (xu trong ví trừ tiền vay nóng)
  const netOf = (id: string) => (g.balances[id] ?? 0) - (g.debts[id] ?? 0) * BAUCUA_LOAN;
  const rankedIds = Object.keys(g.balances).sort(
    (a, b) => netOf(b) - netOf(a) || (g.balances[b] ?? 0) - (g.balances[a] ?? 0),
  );
  const rankOf = (id: string) => rankedIds.indexOf(id) + 1;
  const rankBadge = (rank: number) => (rank === 1 ? '🥇#1' : rank === 2 ? '🥈#2' : rank === 3 ? '🥉#3' : `#${rank}`);

  useOnChange(g.step, (step) => {
    if (step === 'rolling') play('dice');
    if (step === 'betting') play('pop');
    if (step === 'result' && g.dice) {
      setResultBets({ round: g.round, bets: lastBets.current });
      setReveal(g.round);
      if (g.lastDeltas) {
        for (const [id, d] of Object.entries(g.lastDeltas)) {
          if (d >= 300) feed(quip.bigWin(nameOf(id), fmt(d)), 'good');
          else if (d < 0 && (g.balances[id] ?? 0) <= 0) feed(quip.broke(nameOf(id)), 'bad');
        }
      }
    }
  });

  // tiền cược tăng: đồng xu bay từ avatar người đặt vào ô
  const prevBets = useRef(g.bets);
  const betsKey = JSON.stringify(g.bets);
  useEffect(() => {
    const prev = prevBets.current;
    prevBets.current = g.bets;
    if (g.step !== 'result') lastBets.current = g.bets[me] ?? {};
    if (g.step !== 'betting') return;
    const bets = g.bets;
    // đo vị trí ở khung hình kế tiếp (sau khi bố cục đã cập nhật)
    requestAnimationFrame(() => {
      const origin = (fxRoot.current as unknown as HTMLElement | null)?.getBoundingClientRect() ?? null;
      const add: Fly[] = [];
      for (const [id, mine] of Object.entries(bets)) {
        for (const s of BAUCUA_SYMBOLS) {
          if ((mine[s] ?? 0) > (prev[id]?.[s] ?? 0)) {
            const from = rectOf(`avatar-${id}`, origin);
            const to = rectOf(`sym-${s}`, origin);
            if (from && to) add.push({ id: ++flySeq.current, from, to, color: id === me ? C.gold : colorOf(id) });
            if (id !== me) play('coin');
          }
        }
      }
      if (add.length) setFlies((xs) => [...xs.slice(-10), ...add]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [betsKey]);
  const dropFly = useCallback((id: number) => setFlies((xs) => xs.filter((f) => f.id !== id)), []);

  const debtsKey = JSON.stringify(g.debts);
  const prevDebts = useRef(g.debts);
  useEffect(() => {
    for (const [id, n] of Object.entries(g.debts)) {
      if (n > (prevDebts.current[id] ?? 0)) feed(quip.loan(nameOf(id)), 'fun');
    }
    prevDebts.current = g.debts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtsKey]);

  const act = async (a: Parameters<Game['act']>[0]) => {
    const r = await game.act(a);
    if (!r.ok) {
      setError(actionText[r.reason]);
      play('error');
    } else setError(null);
    return r.ok;
  };

  const bet = async (s: BauCuaSymbol) => {
    if (g.step !== 'betting' || isSpectator) return;
    if (await act({ type: 'bet', symbol: s, amount: Math.min(chip, available) || chip })) play('coin');
  };

  // tiền cả phòng trên từng ô, theo từng người
  const stakesOf = (s: BauCuaSymbol): Stake[] =>
    Object.entries(g.bets)
      .filter(([, b]) => (b[s] ?? 0) > 0)
      .map(([id, b]) => ({ id, amount: b[s] ?? 0, color: colorOf(id), mine: id === me }))
      .sort((a, b) => Number(a.mine) - Number(b.mine));
  const hits = (s: BauCuaSymbol) => (g.dice ?? []).filter((x) => x === s).length;
  const myDelta = g.lastDeltas?.[me];
  const roundBets = resultBets.round === g.round ? resultBets.bets : {};
  const wonOn = (s: BauCuaSymbol) => g.step === 'result' && hits(s) > 0 && (roundBets[s] ?? 0) > 0;

  const stepText =
    g.step === 'betting' ? `Đặt cược đi! Máy lắc sau ${left}s` : g.step === 'rolling' ? 'Máy đang lắc bát…' : 'Mở bát!';

  return (
    <Shell
      game={game}
      room={room}
      strip={{
        order: rankedIds,
        sub: (p) =>
          p.id in g.balances
            ? `${rankBadge(rankOf(p.id))} · ${fmt(g.balances[p.id])} xu${g.debts[p.id] ? ' 💸' : ''}`
            : '👀 Đang xem',
      }}
      overlay={
        <>
          <View ref={fxRoot} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 65 }]}>
            {flies.map((f) => (
              <FlyCoin key={f.id} from={f.from} to={f.to} color={f.color} onDone={() => dropFly(f.id)} />
            ))}
          </View>
          {reveal === g.round && g.step === 'result' && g.dice && (
            <Reveal key={reveal} dice={g.dice} myBets={roundBets} delta={myDelta} onDone={() => setReveal(null)} />
          )}
        </>
      }
      bottom={
        isSpectator ? (
          <T testID="bc-spectator" style={styles.spectatorNote}>
            👀 Bạn đang ở chế độ xem — chờ hết ván này để vào sòng đặt cược nhé!
          </T>
        ) : (
          <>
            <View style={styles.chips}>
              {BAUCUA_CHIPS.map((v) => (
                <Pressable
                  key={v}
                  testID={`chip-${v}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: chip === v }}
                  onPress={() => setChip(v)}
                  style={[styles.chip, sticker(chip === v ? 4 : 2), chip === v && styles.chipOn]}
                >
                  <View style={styles.chipRing}>
                    <T style={styles.chipText}>{v}</T>
                  </View>
                </Pressable>
              ))}
            </View>
            <View style={styles.row}>
              {available < 10 && staked === 0 ? (
                <Button testID="loan-btn" small icon="💸" title="Vay nóng 500 xu" variant="ink" style={{ flex: 1 }} onPress={() => act({ type: 'loan' })} />
              ) : (
                <Button
                  testID="clear-bets"
                  small
                  title={staked > 0 ? `Rút cược (${fmt(staked)})` : 'Chưa cược'}
                  variant="paper"
                  disabled={staked === 0 || g.step !== 'betting'}
                  style={{ flex: 1 }}
                  onPress={() => act({ type: 'clearBets' })}
                />
              )}
            </View>
            {error && <T style={styles.error}>{error}</T>}
          </>
        )
      }
    >
      <Card style={[styles.table, compact && { paddingVertical: 8 }]}>
        <View style={styles.tableHead}>
          <T testID="bc-round" style={styles.round}>Ván {g.round}/{g.maxRounds}</T>
          <T testID="bc-step" style={styles.step}>{stepText}</T>
          {isHost && (
            <Pressable testID="end-open" onPress={() => setEnding(true)} hitSlop={8}>
              <T style={styles.endLink}>Tổng kết</T>
            </Pressable>
          )}
        </View>
        {g.step === 'betting' && (
          <View style={styles.timeTrack}>
            <View style={[styles.timeFill, { width: `${Math.min(100, (left / 20) * 100)}%` }, left <= 5 && { backgroundColor: C.danger }]} />
          </View>
        )}
        <View style={[styles.plate, compact && { height: 64 }]}>
          {g.step === 'result' && g.dice ? (
            g.dice.map((s, i) => <Face key={`${g.round}-${i}`} s={s} size={compact ? 46 : 58} testID="bc-die" />)
          ) : (
            <Bowl shaking={g.step === 'rolling'} size={compact ? 46 : 64} />
          )}
        </View>
        {g.step === 'result' && myDelta !== undefined && (
          <T testID="bc-delta" style={[styles.delta, { color: myDelta > 0 ? C.jade : myDelta < 0 ? C.danger : C.muted }]}>
            {myDelta > 0
              ? `+${fmt(myDelta)} xu 🤑`
              : myDelta < 0
                ? `${fmt(myDelta)} xu 😭`
                : Object.values(roundBets).some((v) => (v ?? 0) > 0)
                  ? 'Huề vốn 😌'
                  : 'Không cược ván này'}
          </T>
        )}
        {!isSpectator && (
          <T style={styles.wallet}>
            Hạng <T style={{ fontWeight: '900', color: C.son }}>{rankBadge(rankOf(me))}/{rankedIds.length}</T> · Ví:{' '}
            <T style={{ fontWeight: '900' }}>{fmt(balance)} xu</T>
            {staked > 0 ? `, đang cược ${fmt(staked)}` : ''}
            {g.debts[me] ? `, nợ ${g.debts[me]} lần` : ''}
          </T>
        )}
      </Card>

      <Card style={styles.rankCard}>
        <View testID="bc-leaderboard" style={{ gap: 6 }}>
          <T style={styles.rankTitle}>🏆 Bảng xếp hạng xu (cập nhật liên tục)</T>
          {rankedIds.map((id, idx) => {
            const rank = idx + 1;
            const pStaked = Object.values(g.bets[id] ?? {}).reduce((s, v) => s + (v ?? 0), 0);
            const pDelta = g.step === 'result' ? g.lastDeltas?.[id] : undefined;
            const pUri = portraitOf(id);
            const pDebt = g.debts[id] ?? 0;
            return (
              <View
                key={id}
                testID={`bc-rank-${rank}`}
                style={[
                  styles.rankRow,
                  { borderLeftColor: borderColorOf(id) },
                  id === me && styles.rankRowMe,
                ]}
              >
                <T style={styles.rankMedal}>{rankBadge(rank)}</T>
                <View style={[styles.rankAvatar, { backgroundColor: colorOf(id), borderColor: borderColorOf(id) }]}>
                  {pUri ? (
                    <Image source={{ uri: pUri }} style={{ width: '100%', height: '100%', borderRadius: 12 }} />
                  ) : (
                    <T style={{ fontSize: 13 }}>{avatarOf(playerOf(id)?.avatar ?? 0).emoji}</T>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={styles.rankName}>
                    {nameOf(id)}
                  </T>
                  {(pStaked > 0 || pDebt > 0) && (
                    <T numberOfLines={1} style={styles.rankSub}>
                      {pStaked > 0 ? `Đang cược ${fmt(pStaked)}` : ''}
                      {pStaked > 0 && pDebt > 0 ? ' · ' : ''}
                      {pDebt > 0 ? `Nợ ${pDebt} lần (thực: ${fmt(netOf(id))})` : ''}
                    </T>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T style={styles.rankXu}>{fmt(g.balances[id] ?? 0)} xu</T>
                  {pDelta !== undefined && pDelta !== 0 && (
                    <T style={[styles.rankDelta, { color: pDelta > 0 ? C.jade : C.danger }]}>
                      {pDelta > 0 ? `+${fmt(pDelta)}` : fmt(pDelta)}
                    </T>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <View style={[styles.board, sticker(5)]}>
        {BAUCUA_SYMBOLS.map((s) => {
          const stakes = stakesOf(s);
          return (
            <Tile
              key={s}
              s={s}
              chip={chip}
              step={g.step}
              hits={hits(s)}
              mine={myBets[s] ?? 0}
              stakes={stakes}
              total={stakes.reduce((t, x) => t + x.amount, 0)}
              glow={wonOn(s)}
              compact={compact}
              disabled={isSpectator}
              onPress={() => bet(s)}
            />
          );
        })}
      </View>

      {g.recent.length > 0 && (
        <View style={styles.recent}>
          <T style={styles.recentLabel}>Mấy ván trước</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[...g.recent].reverse().slice(0, 6).map((r, i) => (
              <View key={i} style={styles.recentItem}>
                {r.map((s, j) => (
                  <Image key={j} source={{ uri: ART[s] }} style={{ width: 22, height: 22 }} />
                ))}
              </View>
            ))}
          </View>
        </View>
      )}

      {ending && (
        <Sheet title="Tổng kết sòng?" onClose={() => setEnding(false)}>
          <T style={{ color: C.muted }}>Ván sẽ dừng lại và xếp hạng mọi người theo số xu (trừ tiền nợ).</T>
          <Button testID="end-confirm" title="Tổng kết" variant="ink" onPress={() => act({ type: 'end' })} />
          <Button title="Chơi tiếp" variant="paper" onPress={() => setEnding(false)} />
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  table: { gap: 6, alignItems: 'center' },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  round: { fontWeight: '900', fontSize: 14, color: C.muted },
  step: { flex: 1, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  endLink: { color: C.son, fontWeight: '800', textDecorationLine: 'underline', fontSize: 14 },
  timeTrack: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: C.mist, overflow: 'hidden', borderWidth: 1.5, borderColor: C.ink },
  timeFill: { height: '100%', backgroundColor: C.jade },
  plate: {
    flexDirection: 'row', gap: 10, height: 86, minWidth: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.mist, borderRadius: 60, paddingHorizontal: 18, borderWidth: 2.5, borderColor: C.ink,
  },
  face: { backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' },
  delta: { fontSize: 20, fontWeight: '900' },
  wallet: { color: C.muted, fontSize: 14, textAlign: 'center' },
  rankCard: { paddingVertical: 10, paddingHorizontal: 12 },
  rankTitle: { fontSize: 14, fontWeight: '900', color: C.son },
  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingHorizontal: 8,
    backgroundColor: C.mist, borderRadius: 10, borderLeftWidth: 4,
  },
  rankRowMe: { backgroundColor: '#FFF3BF' },
  rankMedal: { fontWeight: '900', fontSize: 13, minWidth: 36 },
  rankAvatar: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  rankName: { fontWeight: '800', fontSize: 14 },
  rankSub: { fontSize: 11, color: C.muted, fontWeight: '600' },
  rankXu: { fontWeight: '900', fontSize: 14, color: C.ink },
  rankDelta: { fontWeight: '800', fontSize: 11 },
  spectatorNote: { color: C.gold, fontWeight: '800', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
  // chiếu bầu cua: khung đỏ son, 6 ô giấy dó
  board: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, padding: 8,
    backgroundColor: '#8E0D14', borderRadius: 18,
  },
  tile: { width: '32%', aspectRatio: 0.82, borderRadius: 12, backgroundColor: PAPER, padding: 4, overflow: 'visible' },
  tileCompact: { aspectRatio: 1.05 },
  tileInner: {
    flex: 1, borderWidth: 1.5, borderColor: C.son, borderRadius: 8, alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 2, overflow: 'hidden',
  },
  tileArt: { width: '88%', aspectRatio: 1, flexShrink: 1 },
  tileGlow: {
    position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 16, borderWidth: 4, borderColor: C.gold,
    backgroundColor: 'rgba(255,214,80,0.35)', shadowColor: '#FFD650', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
    zIndex: -1,
  },
  banner: { alignSelf: 'stretch', backgroundColor: C.son, paddingVertical: 1 },
  bannerText: { color: PAPER, fontWeight: '900', fontSize: 14, textAlign: 'center', letterSpacing: 1 },
  pileAnchor: { position: 'absolute', left: 0, right: 0, bottom: 22, alignItems: 'center' },
  pileWrap: { alignItems: 'center' },
  pileTotal: {
    fontSize: 11, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(42,10,16,0.82)', paddingHorizontal: 6,
    borderRadius: 8, overflow: 'hidden', marginBottom: 2,
  },
  pileRow: { flexDirection: 'row', alignItems: 'flex-end' },
  coin: { position: 'absolute', left: 0, borderWidth: 1.5, borderColor: C.ink },
  flyCoin: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.ink },
  mine: {
    position: 'absolute', top: -10, right: -6, backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink,
    borderRadius: 14, paddingHorizontal: 8, paddingVertical: 1, fontWeight: '900', fontSize: 13, overflow: 'hidden',
  },
  hit: {
    position: 'absolute', top: -10, left: -6, backgroundColor: C.jade, color: '#fff', borderWidth: 2, borderColor: C.ink,
    borderRadius: 14, paddingHorizontal: 8, fontWeight: '900', fontSize: 15, overflow: 'hidden',
  },
  recent: { gap: 6 },
  recentLabel: { color: C.onSon, fontWeight: '700', fontSize: 13 },
  recentItem: { flexDirection: 'row', backgroundColor: PAPER, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 8, borderWidth: 1.5, borderColor: C.ink },
  chips: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  chip: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  chipRing: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: C.son,
    alignItems: 'center', justifyContent: 'center',
  },
  chipOn: { backgroundColor: C.gold, transform: [{ translateY: -4 }] },
  chipText: { fontWeight: '900', fontSize: 15 },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 6, borderRadius: 8, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  // mở bát
  halo: { position: 'absolute', backgroundColor: 'rgba(255,214,80,0.5)', shadowColor: '#FFD650', shadowOpacity: 1, shadowRadius: 30, shadowOffset: { width: 0, height: 0 } },
  glow: {
    width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,194,26,0.28)',
    shadowColor: '#FFC21A', shadowOpacity: 0.9, shadowRadius: 70, shadowOffset: { width: 0, height: 0 },
  },
  revealTitle: {
    position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 34, fontWeight: '900', color: C.gold,
    letterSpacing: 2, fontFamily: FONT,
  },
  revealMsg: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  winText: { fontSize: 26, fontWeight: '900', color: C.gold, textAlign: 'center' },
  sadText: { fontSize: 22, fontWeight: '900', color: '#C9D1E0', textAlign: 'center' },
  meh: { fontSize: 20, fontWeight: '800', color: C.onSon, textAlign: 'center' },
});
