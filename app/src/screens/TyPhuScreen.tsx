import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { RoomState, TyPhuView } from '../../../shared/src/types';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_HOUSE_MULT, TYPHU_JAIL_FINE, TYPHU_MAX_HOUSES, groupCells, rentOf, typhuCellPos,
} from '../../../shared/src/typhu';
import type { Game } from '../useGame';
import { actionText } from '../messages';
import { avatarOf } from '../avatars';
import { useOnChange, useOnNew, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, sticker } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { TimerBar } from '../components/TimerBar';
import { Dice } from '../components/Dice';
import { useShake } from '../components/Fun';

/** màu quân cờ theo thứ tự lượt */
export const TOKEN_COLORS = ['#E5383B', '#2F7DE1', '#2BB673', '#FFC21A', '#9C36B5', '#F76707'];
const CORNER_ICON: Record<string, string> = { start: '🏁', jail: '🚔', rest: '☕', gotojail: '👮', chance: '❓', tax: '💸' };
const fmt = (n: number) => n.toLocaleString('vi-VN');

export function TyPhuScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as TyPhuView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const { width, height } = useWindowDimensions();
  const feed = useFeed();
  const shake = useShake();
  const [detail, setDetail] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);

  const myTurn = g.currentPlayerId === me;
  const colorOf = (id: string) => TOKEN_COLORS[g.order.indexOf(id) % TOKEN_COLORS.length];
  const avatarById = new Map(room.players.map((p) => [p.id, p.avatar]));
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');
  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const inJail = me in g.jail;

  const boardSize = Math.floor(Math.min(width - 24, 520, Math.max(300, height - 300)));
  const cell = boardSize / 8;

  useOnChange(g.rollId, () => play('dice'));
  useOnChange(myTurn && g.step === 'roll', (now) => {
    if (now) {
      play('turn');
      vibrate();
    }
  });
  useOnNew(g.log, (l) => {
    const mine = l.text.startsWith(g.names[me] ?? '\u0000');
    if (l.kind === 'buy' || l.kind === 'start') play('coin');
    if (l.kind === 'rent') {
      play(mine ? 'lose' : 'coin');
      if (!mine) feed(l.text, 'fun');
    }
    if (l.kind === 'jail' && l.text.includes('vào tù')) {
      play('error');
      feed(l.text, 'bad');
      if (mine) shake();
    }
    if (l.kind === 'bankrupt') {
      play('lose');
      feed(l.text, 'bad');
    }
    if (l.kind === 'build' && !mine) feed(l.text, 'info');
  });
  useOnChange(g.card?.id, (id) => id && play('pop'));

  const act = async (a: Parameters<Game['act']>[0]) => {
    const r = await game.act(a);
    if (!r.ok) {
      setError(actionText[r.reason]);
      play('error');
    } else setError(null);
    return r.ok;
  };

  const ownsGroup = (id: string, i: number) => {
    const c = TYPHU_BOARD[i];
    return c.kind === 'land' && groupCells(c.group).every((x) => g.owners[x] === id);
  };
  const canBuild = (i: number) => {
    const c = TYPHU_BOARD[i];
    return (
      myTurn && (g.step === 'roll' || g.step === 'manage') && c.kind === 'land' && g.owners[i] === me &&
      ownsGroup(me, i) && (g.houses[i] ?? 0) < TYPHU_MAX_HOUSES && (g.cash[me] ?? 0) >= TYPHU_GROUPS[c.group].house
    );
  };

  // quân cờ theo ô
  const tokensAt = new Map<number, string[]>();
  for (const id of g.order) {
    if (g.bankrupt.includes(id)) continue;
    const p = g.pos[id];
    tokensAt.set(p, [...(tokensAt.get(p) ?? []), id]);
  }

  const pending = g.pendingBuy !== null ? TYPHU_BOARD[g.pendingBuy] : null;
  const curName = g.currentPlayerId ? nameOf(g.currentPlayerId) : '';
  const status = myTurn
    ? g.step === 'roll'
      ? inJail
        ? 'Bạn đang ngồi tù: đổ đôi để ra, hoặc nộp tiền'
        : 'Tới lượt bạn, đổ xúc xắc đi!'
      : g.step === 'buy'
        ? 'Mua miếng đất này không?'
        : g.step === 'manage'
          ? 'Chạm vào đất của bạn để xây nhà'
          : 'Chờ chút…'
    : `Lượt của ${curName}`;

  const recent = g.log.slice(-3).reverse();
  const d = detail !== null ? TYPHU_BOARD[detail] : null;

  return (
    <Shell
      game={game}
      room={room}
      strip={{
        order: g.order,
        active: g.currentPlayerId,
        dim: (p) => g.bankrupt.includes(p.id),
        ring: (p) => (g.order.includes(p.id) ? colorOf(p.id) : undefined),
        sub: (p) =>
          g.bankrupt.includes(p.id) ? 'phá sản' : p.id in g.cash ? `${fmt(g.cash[p.id])} xu${p.id in g.jail ? ' 🚔' : ''}` : undefined,
      }}
      bottom={
        <>
          <T testID="typhu-status" numberOfLines={2} style={[styles.status, myTurn && { color: C.gold }]}>{status}</T>
          {myTurn && g.step === 'roll' ? (
            <View style={styles.row}>
              {inJail && (
                <Button
                  testID="pay-jail"
                  small
                  variant="paper"
                  title={`Nộp ${TYPHU_JAIL_FINE} xu ra tù`}
                  style={{ flex: 1 }}
                  onPress={() => act({ type: 'payJail' })}
                />
              )}
              <Button testID="roll-btn" title="Đổ xúc xắc" style={{ flex: 1 }} onPress={() => act({ type: 'roll' })} />
            </View>
          ) : myTurn && g.step === 'buy' && pending?.kind === 'land' ? (
            <View style={styles.row}>
              <Button testID="skip-btn" small variant="paper" title="Bỏ qua" style={{ flex: 1 }} onPress={() => act({ type: 'skip' })} />
              <Button
                testID="buy-btn"
                title={`Mua ${pending.name} (${fmt(pending.price)})`}
                style={{ flex: 2 }}
                onPress={() => act({ type: 'buy' })}
              />
            </View>
          ) : myTurn && g.step === 'manage' ? (
            <Button testID="end-turn" title="Xong lượt" variant="ink" onPress={() => act({ type: 'endTurn' })} />
          ) : null}
          <TimerBar left={left} total={g.turnSeconds} />
          {error && <T style={styles.error}>{error}</T>}
        </>
      }
    >
      <View style={[styles.board, sticker(5), { width: boardSize, height: boardSize }]}>
        {TYPHU_BOARD.map((c, i) => {
          const [r, col] = typhuCellPos(i);
          const owner = g.owners[i];
          const houses = g.houses[i] ?? 0;
          const corner = c.kind !== 'land';
          const here = g.pendingBuy === i;
          return (
            <Pressable
              key={i}
              testID={`cell-${i}`}
              accessibilityRole="button"
              accessibilityLabel={c.name}
              onPress={() => setDetail(i)}
              style={[
                styles.cell,
                { top: r * cell, left: col * cell, width: cell, height: cell },
                owner && { backgroundColor: `${colorOf(owner)}33` },
                here && styles.cellHere,
              ]}
            >
              {c.kind === 'land' && <View style={[styles.band, { backgroundColor: TYPHU_GROUPS[c.group].color, height: cell * 0.2 }]} />}
              {corner && <T style={{ fontSize: cell * 0.36, lineHeight: cell * 0.44 }}>{CORNER_ICON[c.kind]}</T>}
              <T numberOfLines={2} style={[styles.cellName, { fontSize: Math.max(8, cell * 0.17) }]}>{c.name}</T>
              {c.kind === 'land' && !owner && (
                <T style={[styles.price, { fontSize: Math.max(8, cell * 0.16) }]}>{c.price}</T>
              )}
              {owner && (
                <View style={[styles.ownerBar, { backgroundColor: colorOf(owner) }]}>
                  <T style={[styles.houses, { fontSize: Math.max(8, cell * 0.16) }]}>
                    {houses === TYPHU_MAX_HOUSES ? '🏨' : houses > 0 ? '🏠'.repeat(houses) : ' '}
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}

        {/* quân cờ */}
        {[...tokensAt.entries()].flatMap(([pos, ids]) =>
          ids.map((id, k) => {
            const [r, col] = typhuCellPos(pos);
            const size = cell * (ids.length > 2 ? 0.36 : 0.44);
            const perRow = ids.length > 2 ? 3 : 2;
            const ox = (k % perRow) * size * 0.92 + cell * 0.06;
            // đặt quân ở nửa dưới ô để không che tên đất
            const oy = cell - size - 2 - Math.floor(k / perRow) * size * 0.8;
            return (
              <View
                key={id}
                testID={`token-${id}`}
                pointerEvents="none"
                style={[
                  styles.token,
                  {
                    width: size, height: size, borderRadius: size / 2, top: r * cell + oy, left: col * cell + ox,
                    backgroundColor: avatarOf(avatarById.get(id) ?? 0).bg, borderColor: colorOf(id),
                  },
                  id === g.currentPlayerId && styles.tokenActive,
                ]}
              >
                <T style={{ fontSize: size * 0.62, lineHeight: size * 0.9 }}>{avatarOf(avatarById.get(id) ?? 0).emoji}</T>
              </View>
            );
          }),
        )}

        {/* giữa bàn */}
        <View style={[styles.center, { top: cell * 1.08, left: cell * 1.08, width: cell * 5.84, height: cell * 5.84 }]}>
          <View style={styles.centerHead}>
            <T style={styles.logo}>Tỷ phú</T>
            {isHost && (
              <Pressable testID="end-open" onPress={() => setEnding(true)} hitSlop={8}>
                <T style={styles.endLink}>Tổng kết</T>
              </Pressable>
            )}
          </View>
          <View style={styles.dice}>
            <Dice testID="die-1" value={g.dice?.[0] ?? null} rollId={g.rollId} size={Math.min(52, cell * 0.95)} />
            <Dice testID="die-2" value={g.dice?.[1] ?? null} rollId={g.rollId} size={Math.min(52, cell * 0.95)} />
          </View>
          {g.card && (
            <View testID="typhu-card" style={[styles.card, sticker(3)]}>
              <T style={styles.cardTitle}>❓ Cơ hội</T>
              <T style={styles.cardText}>{g.card.text}</T>
            </View>
          )}
          <View style={{ gap: 2, alignSelf: 'stretch' }}>
            {recent.map((l, i) => (
              <T key={l.id} numberOfLines={2} style={[styles.log, i > 0 && { opacity: 0.6 }]}>{l.text}</T>
            ))}
          </View>
        </View>
      </View>

      {d && detail !== null && (
        <Sheet title={d.name} onClose={() => setDetail(null)}>
          {d.kind === 'land' ? (
            <View style={{ gap: 6 }}>
              <View style={[styles.detailBand, { backgroundColor: TYPHU_GROUPS[d.group].color }]}>
                <T style={styles.detailGroup}>{TYPHU_GROUPS[d.group].name}</T>
              </View>
              <T>Giá đất: <T style={{ fontWeight: '900' }}>{fmt(d.price)} xu</T>, xây mỗi nhà {fmt(TYPHU_GROUPS[d.group].house)} xu</T>
              <T>
                Chủ: <T style={{ fontWeight: '900' }}>{g.owners[detail] ? nameOf(g.owners[detail]) : 'chưa có'}</T>
                {g.houses[detail] ? `, ${g.houses[detail] === TYPHU_MAX_HOUSES ? 'có khách sạn' : `${g.houses[detail]} nhà`}` : ''}
              </T>
              <View style={styles.rents}>
                {[
                  ['Đất trống', d.rent],
                  ['Đủ bộ màu', d.rent * 2],
                  ...TYPHU_HOUSE_MULT.map((m, k) => [k === 3 ? 'Khách sạn' : `${k + 1} nhà`, d.rent * m] as [string, number]),
                ].map(([label, v]) => (
                  <View key={label} style={styles.rentRow}>
                    <T style={{ color: C.muted }}>{label}</T>
                    <T style={{ fontWeight: '800' }}>{fmt(v as number)} xu</T>
                  </View>
                ))}
              </View>
              {g.owners[detail] && (
                <T style={{ color: C.muted }}>
                  Tiền thuê hiện tại: {fmt(rentOf(detail, g.houses[detail] ?? 0, ownsGroup(g.owners[detail], detail)))} xu
                </T>
              )}
              {canBuild(detail) && (
                <Button
                  testID="build-btn"
                  icon="🏠"
                  title={`Xây ${(g.houses[detail] ?? 0) === TYPHU_MAX_HOUSES - 1 ? 'khách sạn' : 'nhà'} (${fmt(TYPHU_GROUPS[d.group].house)} xu)`}
                  onPress={() => act({ type: 'build', cell: detail })}
                />
              )}
            </View>
          ) : (
            <T style={{ color: C.muted }}>
              {d.kind === 'start' && 'Đi qua ô này được nhận 200 xu.'}
              {d.kind === 'jail' && 'Ngồi tù: đổ đôi để ra, hoặc nộp 50 xu. Chỉ đi ngang qua thì không sao.'}
              {d.kind === 'rest' && 'Nghỉ chân uống trà đá, không có gì xảy ra.'}
              {d.kind === 'gotojail' && 'Dừng ở đây là vào tù ngay.'}
              {d.kind === 'chance' && 'Rút một thẻ cơ hội: có thể được tiền, mất tiền hoặc bị đưa đi chỗ khác.'}
              {d.kind === 'tax' && `Nộp ${fmt(d.amount)} xu cho ngân hàng.`}
            </T>
          )}
        </Sheet>
      )}

      {ending && (
        <Sheet title="Tổng kết ván cờ?" onClose={() => setEnding(false)}>
          <T style={{ color: C.muted }}>Ván sẽ dừng lại và xếp hạng theo tổng tài sản (tiền mặt + đất + nhà).</T>
          <Button testID="end-confirm" title="Tổng kết" variant="ink" onPress={() => act({ type: 'end' })} />
          <Button title="Chơi tiếp" variant="paper" onPress={() => setEnding(false)} />
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center', backgroundColor: '#DFF5E1', borderRadius: 10, overflow: 'hidden', position: 'relative' },
  cell: {
    position: 'absolute', backgroundColor: C.paper, borderWidth: 0.75, borderColor: C.ink, alignItems: 'center',
    justifyContent: 'flex-start', overflow: 'hidden',
  },
  cellHere: { borderWidth: 3, borderColor: C.gold },
  band: { alignSelf: 'stretch', borderBottomWidth: 0.75, borderColor: C.ink },
  cellName: { fontWeight: '800', textAlign: 'center', lineHeight: 11, paddingHorizontal: 1, marginTop: 1 },
  price: { color: C.muted, fontWeight: '700', position: 'absolute', bottom: 1 },
  ownerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' },
  houses: { lineHeight: 13 },
  token: {
    position: 'absolute', borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 5,
    transitionProperty: 'top, left', transitionDuration: '450ms',
  } as object,
  tokenActive: { zIndex: 6, transform: [{ scale: 1.15 }] },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  centerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { fontWeight: '900', fontSize: 22, color: C.son, letterSpacing: -0.5 },
  endLink: { color: C.son, fontWeight: '800', textDecorationLine: 'underline', fontSize: 13 },
  dice: { flexDirection: 'row', gap: 12 },
  card: { backgroundColor: '#FFF3BF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '96%' },
  cardTitle: { fontWeight: '900', fontSize: 12, color: C.son },
  cardText: { fontWeight: '700', fontSize: 13 },
  log: { fontSize: 12, textAlign: 'center', color: C.ink },
  status: { color: C.onSon, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 6, borderRadius: 8, fontWeight: '700', fontSize: 13, textAlign: 'center' },
  detailBand: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderColor: C.ink },
  detailGroup: { color: '#fff', fontWeight: '900' },
  rents: { backgroundColor: C.mist, borderRadius: 12, padding: 10, gap: 3 },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
