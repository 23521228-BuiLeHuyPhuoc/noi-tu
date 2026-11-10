import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BAUCUA_CHIPS, BAUCUA_SYMBOLS, type BauCuaSymbol, type BauCuaView, type PublicPlayer, type RoomState,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip, SYMBOL } from '../messages';
import { ART, CARD_FRAME } from '../baucuaArt';
import { BowlStage, useReducedMotion } from '../components/BowlStage';
import { avatarOf } from '../avatars';
import { useOnChange, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { rectOf, type Rect } from '../components/Fun';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const PAPER = '#F7E7C1';
const shortFmt = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}k` : fmt(n));

// ---------------- Tiền vun trên ô ----------------

type Stake = { id: string; amount: number; color: string; mine: boolean };

const DENOMINATIONS = [500, 100, 50, 10] as const;
const coinPalette = { 500: ['#CB7740', '#F8C383'], 100: ['#A78137', '#FFE5A1'], 50: ['#999D9A', '#E8E8DC'], 10: ['#A26943', '#E6B17B'] } as const;

function CoinPile({ stakes, total, small }: { stakes: Stake[]; total: number; small: boolean }) {
  type Coin = { denomination: typeof DENOMINATIONS[number]; owner: string; mine: boolean };
  const groups: Coin[][] = [];
  let count = 0;
  for (const stake of [...stakes].sort((a, b) => Number(b.mine) - Number(a.mine))) {
    const group: Coin[] = [];
    let remainder = stake.amount;
    for (const denomination of DENOMINATIONS) {
      const quantity = Math.floor(remainder / denomination);
      count += quantity;
      for (let i = 0; i < Math.min(quantity, 6); i++) group.push({ denomination, owner: stake.color, mine: stake.mine });
      remainder %= denomination;
    }
    groups.push(group);
  }
  // Interleave owners so one large wager cannot hide everyone else's accent.
  const shown = Array.from({ length: 6 }, (_, depth) => groups.flatMap((group) => group[depth] ? [group[depth]] : [])).flat().slice(0, 6);
  const w = small ? 22 : 25;
  return <View pointerEvents="none" style={styles.pileWrap} accessibilityLabel={fmt(total) + ' xu'}>
    <View style={[styles.pileRow, { width: w * 2.4, height: 31 }]}>
      {shown.map((coin, i) => <View key={i} style={[styles.coin, {
        width: w, height: 13, borderRadius: 30, left: (i % 3) * (w * 0.7), bottom: Math.floor(i / 3) * 6,
        backgroundColor: coinPalette[coin.denomination][0], borderColor: '#735025', borderBottomWidth: 4,
        zIndex: i + 1,
      }]}>
        <View style={{ position: 'absolute', left: 1, right: 1, top: 0, height: 8, borderRadius: 20, backgroundColor: coinPalette[coin.denomination][1], borderWidth: 1, borderColor: '#916C3D', alignItems: 'center', justifyContent: 'center' }}>
          <T style={{ fontSize: 6, lineHeight: 7, color: '#654520', fontWeight: '900' }}>{coin.denomination}</T>
        </View>
        <View style={{ position: 'absolute', width: 5, height: 5, borderRadius: 3, backgroundColor: coin.owner, borderWidth: 1, borderColor: coin.mine ? '#FFF5CB' : '#5D3927', right: -1, bottom: -3 }} />
      </View>)}
      {count > shown.length && <T style={styles.coinMore}>+{count - shown.length}</T>}
    </View>
    <T style={styles.pileTotal}>{shortFmt(total)}</T>
  </View>;
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

// ---------------- Ô con vật ----------------

function Tile({ s, chip, step, hits, mine, stakes, total, glow, compact, onPress }: {
  s: BauCuaSymbol; chip: number; step: BauCuaView['step']; hits: number; mine: number;
  stakes: Stake[]; total: number; glow: boolean; compact: boolean; onPress: () => void;
}) {
  const pulse = useState(() => new Animated.Value(0))[0];
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!glow) return;
    if (reduced) { pulse.setValue(0.7); return; }
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
  }, [glow, pulse, reduced]);
  const result = step === 'result';
  return (
    <Pressable
      testID={`sym-${s}`}
      accessibilityRole="button"
      accessibilityLabel={`Đặt ${chip} xu vào ${SYMBOL[s].name}`}
      disabled={step !== 'betting'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        compact && styles.tileCompact,
        { borderWidth: 2, borderColor: '#E0AB59', boxShadow: pressed ? '0px 1px 0px #511A16' : '0px 4px 0px #511A16' },
        pressed && { transform: [{ translateY: 3 }] },
        result && hits === 0 && { opacity: 0.68 },
        result && hits > 0 && !glow && { borderColor: C.jade, borderWidth: 4 },
      ]}
    >
      <Image pointerEvents="none" source={{ uri: CARD_FRAME }} style={StyleSheet.absoluteFill} resizeMode="stretch" />
      {glow && <Animated.View pointerEvents="none" style={[styles.tileGlow, { opacity: pulse }]} />}
      <View style={styles.tileInner}>
        <Image source={{ uri: ART[s] }} style={styles.tileArt} resizeMode="contain" />
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
  // cược của mình ở ván vừa mở bát (server xóa cược khi mở bát nên phải nhớ lại)
  const [resultBets, setResultBets] = useState<{ round: number; bets: Partial<Record<BauCuaSymbol, number>> }>({ round: 0, bets: {} });
  const lastBets = useRef<Partial<Record<BauCuaSymbol, number>>>({});
  const [flies, setFlies] = useState<Fly[]>([]);
  const fxRoot = useRef<ComponentRef<typeof View>>(null);
  const flySeq = useRef(0);
  const left = useSecondsLeft(g.stepEndsAt, game.clockOffset);
  // màn hình thấp (điện thoại nhỏ / bàn phím mở): thu gọn để thấy cả bát lẫn chiếu
  const compact = useWindowDimensions().height < 880;
  const reduced = useReducedMotion();

  const myBets = g.bets[me] ?? {};
  const staked = Object.values(myBets).reduce((s, v) => s + (v ?? 0), 0);
  const balance = g.balances[me] ?? 0;
  const available = balance - staked;
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');
  const playerOf = (id: string): PublicPlayer | undefined => room.players.find((p) => p.id === id);
  const colorOf = (id: string) => avatarOf(playerOf(id)?.avatar ?? 0).bg;

  useOnChange(g.step, (step) => {
    if (step === 'rolling') play('dice');
    if (step === 'betting') play('pop');
    if (step === 'result' && g.dice) {
      setResultBets({ round: g.round, bets: lastBets.current });
      play('reveal');
      if ((g.lastDeltas?.[me] ?? 0) > 0) { play('win'); vibrate(80); }
      else if ((g.lastDeltas?.[me] ?? 0) < 0) { play('sad'); vibrate([60, 80, 60]); }
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
    if (g.step !== 'betting' || reduced) return;
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
    if (g.step !== 'betting') return;
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
        sub: (p) => (p.id in g.balances ? `${fmt(g.balances[p.id])} xu${g.debts[p.id] ? ' 💸' : ''}` : undefined),
      }}
      overlay={
        <>
          <View ref={fxRoot} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 65 }]}>
            {flies.map((f) => (
              <FlyCoin key={f.id} from={f.from} to={f.to} color={f.color} onDone={() => dropFly(f.id)} />
            ))}
          </View>
        </>
      }
      bottom={
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
      }
    >
      <Card style={[styles.table, compact && { paddingVertical: 8 }]}>
        <View style={styles.tableHead}>
          <T style={styles.round}>Ván {g.round}</T>
          <T testID="bc-step" numberOfLines={1} adjustsFontSizeToFit style={styles.step}>{stepText}</T>
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
        <BowlStage step={g.step} dice={g.step === 'result' ? g.dice : null} compact={compact} />
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
        <T style={styles.wallet}>
          Ví: <T style={{ fontWeight: '900' }}>{fmt(balance)} xu</T>
          {staked > 0 ? `, đang cược ${fmt(staked)}` : ''}
          {g.debts[me] ? `, nợ ${g.debts[me]} lần` : ''}
        </T>
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
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'stretch' },
  round: { fontWeight: '900', fontSize: 13, color: C.muted },
  step: { flex: 1, fontWeight: '900', fontSize: 14, textAlign: 'center' },
  endLink: { color: C.son, fontWeight: '800', textDecorationLine: 'underline', fontSize: 13 },
  timeTrack: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: C.mist, overflow: 'hidden', borderWidth: 1.5, borderColor: C.ink },
  timeFill: { height: '100%', backgroundColor: C.jade },
  plate: {
    flexDirection: 'row', gap: 10, height: 86, minWidth: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.mist, borderRadius: 60, paddingHorizontal: 18, borderWidth: 2.5, borderColor: C.ink,
  },
  face: { backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' },
  delta: { fontSize: 20, fontWeight: '900' },
  wallet: { color: C.muted, fontSize: 14, textAlign: 'center' },
  // chiếu bầu cua: khung đỏ son, 6 ô giấy dó
  board: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, padding: 8,
    backgroundColor: '#74231E', borderRadius: 12, borderColor: '#D8A34E', borderWidth: 2,
  },
  tile: { width: '32%', aspectRatio: 0.71, borderRadius: 8, backgroundColor: '#A83025', padding: 4, overflow: 'visible' },
  tileCompact: { aspectRatio: 0.76 },
  tileInner: {
    flex: 1, borderWidth: 1, borderColor: '#DCA653', borderRadius: 4, alignItems: 'center', justifyContent: 'flex-start',
    paddingTop: 2, overflow: 'hidden',
  },
  tileArt: { width: '96%', aspectRatio: 1, flexShrink: 0 },
  tileGlow: {
    position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 16, borderWidth: 4, borderColor: C.gold,
    backgroundColor: 'rgba(255,214,80,0.35)', shadowColor: '#FFD650', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
    zIndex: -1,
  },
  banner: { position: 'absolute', left: 0, right: 0, bottom: 1, paddingVertical: 1, borderTopWidth: 1, borderTopColor: '#DCA653' },
  bannerText: { color: PAPER, fontWeight: '900', fontSize: 14, textAlign: 'center', letterSpacing: 1 },
  pileAnchor: { position: 'absolute', left: 0, right: 0, bottom: 25, height: 38, alignItems: 'center' },
  pileWrap: { alignItems: 'center' },
  pileTotal: {
    fontSize: 11, fontWeight: '900', color: '#fff', backgroundColor: 'rgba(42,10,16,0.82)', paddingHorizontal: 6,
    borderRadius: 8, overflow: 'hidden', marginTop: -2, lineHeight: 13,
  },
  pileRow: { flexDirection: 'row', alignItems: 'flex-end' },
  coin: { position: 'absolute', borderWidth: 1, boxShadow: '1px 2px 2px #3B1D1740' },
  coinMore: { position: 'absolute', right: -9, top: -4, color: '#FFF1C5', backgroundColor: '#5E201B', borderRadius: 5, fontSize: 8, fontWeight: '900', paddingHorizontal: 2, zIndex: 10 },
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
});
