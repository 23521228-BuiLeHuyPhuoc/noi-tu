import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  BAUCUA_CHIPS, BAUCUA_SYMBOLS, type BauCuaSymbol, type BauCuaView, type RoomState,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip, SYMBOL } from '../messages';
import { useOnChange, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';

const fmt = (n: number) => n.toLocaleString('vi-VN');

function Bowl({ shaking, size = 72 }: { shaking: boolean; size?: number }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!shaking) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 90, useNativeDriver: false }),
        Animated.timing(a, { toValue: -1, duration: 90, useNativeDriver: false }),
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
          { rotate: a.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) },
          { translateY: a.interpolate({ inputRange: [-1, 1], outputRange: [-4, 4] }) },
        ],
      }}
    >
      🥣
    </Animated.Text>
  );
}

function DiceFace({ s, i, size = 62 }: { s: BauCuaSymbol; i: number; size?: number }) {
  const a = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    Animated.spring(a, { toValue: 1, delay: i * 180, friction: 5, useNativeDriver: false }).start();
  }, [a, i]);
  return (
    <Animated.View
      testID="bc-die"
      style={[styles.face, sticker(3), { width: size, height: size, backgroundColor: SYMBOL[s].bg, transform: [{ scale: a }] }]}
    >
      <T style={{ fontSize: size * 0.6 }}>{SYMBOL[s].emoji}</T>
    </Animated.View>
  );
}

export function BauCuaScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as BauCuaView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const feed = useFeed();
  const [chip, setChip] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const left = useSecondsLeft(g.stepEndsAt, game.clockOffset);
  // màn hình thấp (điện thoại nhỏ / bàn phím mở): thu gọn để thấy cả bát lẫn chiếu
  const compact = useWindowDimensions().height < 740;

  const myBets = g.bets[me] ?? {};
  const staked = Object.values(myBets).reduce((s, v) => s + (v ?? 0), 0);
  const balance = g.balances[me] ?? 0;
  const available = balance - staked;
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');

  useOnChange(g.step, (step) => {
    if (step === 'rolling') play('dice');
    if (step === 'betting') play('pop');
    if (step === 'result' && g.lastDeltas) {
      const mine = g.lastDeltas[me] ?? 0;
      if (mine > 0) {
        play('win');
        vibrate(80);
      } else if (mine < 0) play('lose');
      for (const [id, d] of Object.entries(g.lastDeltas)) {
        if (d >= 300) feed(quip.bigWin(nameOf(id), fmt(d)), 'good');
        else if (d < 0 && (g.balances[id] ?? 0) <= 0) feed(quip.broke(nameOf(id)), 'bad');
      }
    }
  });
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

  // tổng cược của mọi người theo từng con
  const totals: Record<string, number> = {};
  for (const bets of Object.values(g.bets)) for (const [s, v] of Object.entries(bets)) totals[s] = (totals[s] ?? 0) + (v ?? 0);
  const hits = (s: BauCuaSymbol) => (g.dice ?? []).filter((x) => x === s).length;
  const myDelta = g.lastDeltas?.[me];

  const stepText =
    g.step === 'betting' ? `Đặt cược đi! Còn ${left}s` : g.step === 'rolling' ? 'Đang lắc bát…' : 'Mở bát!';

  return (
    <Shell
      game={game}
      room={room}
      strip={{
        sub: (p) => (p.id in g.balances ? `${fmt(g.balances[p.id])} xu${g.debts[p.id] ? ' 💸' : ''}` : undefined),
      }}
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
                <T style={styles.chipText}>{v}</T>
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
                title="Xóa cược"
                variant="paper"
                disabled={staked === 0 || g.step !== 'betting'}
                style={{ flex: 1 }}
                onPress={() => act({ type: 'clearBets' })}
              />
            )}
            {isHost && (
              <Button
                testID="shake-btn"
                small
                icon="🥣"
                title="Lắc!"
                disabled={g.step !== 'betting'}
                style={{ flex: 1 }}
                onPress={() => act({ type: 'shake' })}
              />
            )}
          </View>
          {error && <T style={styles.error}>{error}</T>}
        </>
      }
    >
      <Card style={styles.table}>
        <View style={styles.tableHead}>
          <T style={styles.round}>Ván {g.round}</T>
          <T testID="bc-step" style={styles.step}>{stepText}</T>
          {isHost && (
            <Pressable testID="end-open" onPress={() => setEnding(true)} hitSlop={8}>
              <T style={styles.endLink}>Tổng kết</T>
            </Pressable>
          )}
        </View>
        <View style={[styles.plate, compact && { height: 70 }]}>
          {g.step === 'result' && g.dice ? (
            g.dice.map((s, i) => <DiceFace key={`${g.round}-${i}`} s={s} i={i} size={compact ? 48 : 62} />)
          ) : (
            <Bowl shaking={g.step === 'rolling'} size={compact ? 50 : 72} />
          )}
        </View>
        {g.step === 'result' && myDelta !== undefined && (
          <T testID="bc-delta" style={[styles.delta, { color: myDelta > 0 ? C.jade : myDelta < 0 ? C.danger : C.muted }]}>
            {myDelta > 0 ? `+${fmt(myDelta)} xu 🤑` : myDelta < 0 ? `${fmt(myDelta)} xu 😭` : 'Không cược ván này'}
          </T>
        )}
        <T style={styles.wallet}>
          Ví của bạn: <T style={{ fontWeight: '900' }}>{fmt(balance)} xu</T>
          {staked > 0 ? `, đang cược ${fmt(staked)}` : ''}
          {g.debts[me] ? `, nợ ${g.debts[me]} lần` : ''}
        </T>
      </Card>

      <View style={styles.board}>
        {BAUCUA_SYMBOLS.map((s) => {
          const h = hits(s);
          const mine = myBets[s] ?? 0;
          return (
            <Pressable
              key={s}
              testID={`sym-${s}`}
              accessibilityRole="button"
              accessibilityLabel={`Đặt ${chip} xu vào ${SYMBOL[s].name}`}
              disabled={g.step !== 'betting'}
              onPress={() => bet(s)}
              style={({ pressed }) => [
                styles.tile,
                compact && styles.tileCompact,
                sticker(pressed ? 1 : 4),
                { backgroundColor: SYMBOL[s].bg },
                pressed && { transform: [{ translateY: 3 }] },
                g.step === 'result' && h > 0 && styles.tileHit,
                g.step === 'result' && h === 0 && { opacity: 0.45 },
              ]}
            >
              <T style={[styles.tileEmoji, compact && { fontSize: 34 }]}>{SYMBOL[s].emoji}</T>
              <T style={styles.tileName}>{SYMBOL[s].name}</T>
              {totals[s] ? <T style={styles.tileTotal}>Cả phòng: {fmt(totals[s])}</T> : null}
              {mine > 0 && <T testID={`mybet-${s}`} style={styles.mine}>{fmt(mine)}</T>}
              {g.step === 'result' && h > 0 && <T style={styles.hit}>×{h}</T>}
            </Pressable>
          );
        })}
      </View>

      {g.recent.length > 0 && (
        <View style={styles.recent}>
          <T style={styles.recentLabel}>Mấy ván trước</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {[...g.recent].reverse().slice(0, 6).map((r, i) => (
              <T key={i} style={styles.recentItem}>{r.map((s) => SYMBOL[s].emoji).join('')}</T>
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
  table: { gap: 8, alignItems: 'center' },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  round: { fontWeight: '900', fontSize: 15, color: C.muted },
  step: { flex: 1, fontWeight: '900', fontSize: 18, textAlign: 'center' },
  endLink: { color: C.son, fontWeight: '800', textDecorationLine: 'underline', fontSize: 14 },
  plate: {
    flexDirection: 'row', gap: 10, height: 96, minWidth: 220, alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.mist, borderRadius: 60, paddingHorizontal: 18, borderWidth: 2.5, borderColor: C.ink,
  },
  face: { width: 62, height: 62, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  delta: { fontSize: 22, fontWeight: '900' },
  wallet: { color: C.muted, fontSize: 14, textAlign: 'center' },
  board: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: { width: '31.5%', aspectRatio: 0.9, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 4 },
  tileCompact: { aspectRatio: 1.25 },
  tileHit: { borderColor: C.jade, borderWidth: 4 },
  tileEmoji: { fontSize: 46 },
  tileName: { fontWeight: '900', fontSize: 16 },
  tileTotal: { fontSize: 11, color: C.muted, fontWeight: '700' },
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
  recentItem: { backgroundColor: C.sonDark, color: C.paper, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, fontSize: 16, overflow: 'hidden' },
  chips: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  chip: { width: 62, height: 46, borderRadius: 23, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: C.gold, transform: [{ translateY: -3 }] },
  chipText: { fontWeight: '900', fontSize: 16 },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 6, borderRadius: 8, fontWeight: '700', fontSize: 13, textAlign: 'center' },
});
