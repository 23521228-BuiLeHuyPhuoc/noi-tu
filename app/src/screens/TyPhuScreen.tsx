import { useEffect, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { RoomState, TyPhuView } from '../../../shared/src/types';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_ROLL_MS, isTyPhuProperty, stationRent, utilityRent, TYPHU_HOUSE_MULT, TYPHU_JAIL_FINE, TYPHU_MAX_HOUSES, groupCells, rentOf, typhuCellPos,
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
const CORNER_ICON: Record<string, string> = { start: '🏁', jail: '🚔', rest: '☕', gotojail: '👮', chance: '❓', community: '🎁', station: '🚆', utility: '⚡', tax: '💸' };
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
  const playerById = new Map(room.players.map((p) => [p.id, p]));
  const avatarFor = (id: string) => avatarOf(playerById.get(id)?.avatar ?? 0);
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');
  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const inJail = me in g.jail;

  const landscape = width >= 700 && width > height;
  const shortLandscape = landscape && height < 520;
  const boardSize = Math.floor(landscape
    ? Math.min(width - 310, 680, Math.max(308, height - (shortLandscape ? 72 : 185)))
    : Math.min(width - 28, 600));
  const cell = boardSize / 11;
  const [now, setNow] = useState(() => Date.now());
  const [localRoll, setLocalRoll] = useState<{ id: number; startedAt: number; endsAt: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);
  const serverNow = now + game.clockOffset;
  const movement = g.movement;
  const moving = !!movement && serverNow < movement.endsAt;
  const rollStartedAt = movement?.kind === 'roll'
    ? movement.startedAt
    : localRoll?.id === g.rollId ? localRoll.startedAt : null;
  const rollElapsed = rollStartedAt === null ? TYPHU_ROLL_MS : serverNow - rollStartedAt;
  const diceAnimating = !reducedMotion && rollStartedAt !== null && rollElapsed >= 0 && rollElapsed < TYPHU_ROLL_MS;
  const dicePhase = diceAnimating
    ? rollElapsed < 400 ? 'roll' : rollElapsed < 540 ? 'bounce' : 'reveal'
    : 'reveal';
  const animationEndsAt = reducedMotion ? 0 : Math.max(
    movement?.endsAt ?? 0,
    localRoll?.id === g.rollId ? localRoll.endsAt : 0,
  );
  const animating = serverNow < animationEndsAt;
  useEffect(() => {
    if (!animating || reducedMotion) return;
    const tick = setInterval(() => setNow(Date.now()), 32);
    return () => clearInterval(tick);
  }, [animating, animationEndsAt, reducedMotion]);
  const displayedPos = (id: string) => {
    if (reducedMotion && movement?.playerId === id) return g.pos[id];
    if (!movement || movement.playerId !== id || serverNow >= movement.endsAt) return g.pos[id];
    const delay = movement.kind === 'roll' ? TYPHU_ROLL_MS : 0;
    const elapsed = serverNow - movement.startedAt - delay;
    if (elapsed <= 0 || !movement.path.length) return movement.from;
    const duration = Math.max(1, movement.endsAt - movement.startedAt - delay);
    const progress = Math.min(movement.path.length, elapsed / duration * movement.path.length);
    const step = Math.floor(progress);
    const from = step === 0 ? movement.from : movement.path[step - 1];
    const to = movement.path[Math.min(step, movement.path.length - 1)];
    const [fr, fc] = typhuCellPos(from);
    const [tr, tc] = typhuCellPos(to);
    return [fr + (tr - fr) * (progress - step), fc + (tc - fc) * (progress - step)] as [number, number];
  };

  useOnChange(g.rollId, (id) => {
    const startedAt = Date.now() + game.clockOffset;
    setLocalRoll({ id, startedAt, endsAt: startedAt + TYPHU_ROLL_MS });
    setNow(Date.now());
    play('dice');
  });
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
    if (moving) return false;
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
      !moving && myTurn && (g.step === 'roll' || g.step === 'manage') && c.kind === 'land' && g.owners[i] === me &&
      ownsGroup(me, i) && (g.houses[i] ?? 0) < TYPHU_MAX_HOUSES && (g.cash[me] ?? 0) >= TYPHU_GROUPS[c.group].house
    );
  };

  const pending = g.pendingBuy !== null ? TYPHU_BOARD[g.pendingBuy] : null;
  const curName = g.currentPlayerId ? nameOf(g.currentPlayerId) : '';
  const status = diceAnimating ? `${g.currentPlayerId ? nameOf(g.currentPlayerId) : 'Người chơi'} đang đổ xúc xắc…`
    : moving ? `${nameOf(movement!.playerId)} đang di chuyển từng ô…` : myTurn
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
  const controls = (
    <>
      <T testID="typhu-status" numberOfLines={2} style={[styles.status, myTurn && { color: C.gold }]}>{status}</T>
      {!moving && myTurn && g.step === 'roll' ? (
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
          <Button testID="roll-btn" small={shortLandscape} title="Đổ xúc xắc" style={{ flex: 1 }} onPress={() => act({ type: 'roll' })} />
        </View>
      ) : !moving && myTurn && g.step === 'buy' && pending && isTyPhuProperty(pending) ? (
        <View style={styles.row}>
          <Button testID="skip-btn" small variant="paper" title="Bỏ qua" style={{ flex: 1 }} onPress={() => act({ type: 'skip' })} />
          <Button
            testID="buy-btn"
            small={shortLandscape}
            title={`Mua ${pending.name} (${fmt(pending.price)})`}
            style={{ flex: 2 }}
            onPress={() => act({ type: 'buy' })}
          />
        </View>
      ) : !moving && myTurn && g.step === 'manage' ? (
        <Button testID="end-turn" small={shortLandscape} title="Xong lượt" variant="ink" onPress={() => act({ type: 'endTurn' })} />
      ) : null}
      <TimerBar left={left} total={g.turnSeconds} />
      {error && <T style={styles.error}>{error}</T>}
    </>
  );

  return (
    <Shell
      wide
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
      bottom={landscape ? undefined : controls}
    >
      {!landscape && <T style={styles.rotateHint}>↻ Xoay ngang để xem bàn cờ và bảng tài sản cạnh nhau. Chạm ô để đọc chi tiết.</T>}
      <View style={[styles.layout, landscape && styles.layoutWide]}>
      <View style={[styles.board, sticker(5), { width: boardSize, height: boardSize }]}>
        {TYPHU_BOARD.map((c, i) => {
          const [r, col] = typhuCellPos(i);
          const owner = g.owners[i];
          const houses = g.houses[i] ?? 0;
          const here = g.pendingBuy === i;
          return (
            <Pressable
              key={i}
              testID={`cell-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${i + 1}. ${c.name}${owner ? `, thuộc ${nameOf(owner)}` : ''}${isTyPhuProperty(c) ? `, giá ${c.price} xu` : ''}`}
              onPress={() => setDetail(i)}
              style={[
                styles.cell,
                { top: r * cell, left: col * cell, width: cell, height: cell },
                owner && { backgroundColor: `${colorOf(owner)}22`, borderWidth: 2, borderColor: colorOf(owner), borderStyle: g.order.indexOf(owner) % 2 ? 'dashed' : 'solid' },
                here && styles.cellHere,
              ]}
            >
              {c.kind === 'land' && <View style={[styles.band, { backgroundColor: TYPHU_GROUPS[c.group].color, height: Math.max(4, cell * 0.15) }]} />}
              {c.kind !== 'land' && <T style={{ fontSize: Math.max(7, cell * (isTyPhuProperty(c) ? 0.19 : 0.26)), lineHeight: Math.max(8, cell * (isTyPhuProperty(c) ? 0.21 : 0.3)) }}>{CORNER_ICON[c.kind]}</T>}
              <T numberOfLines={2} style={[styles.cellName, { fontSize: Math.max(isTyPhuProperty(c) && c.kind !== 'land' ? 5.2 : 6, cell * (isTyPhuProperty(c) && c.kind !== 'land' ? 0.135 : 0.155)), lineHeight: Math.max(isTyPhuProperty(c) && c.kind !== 'land' ? 5.8 : 7, cell * (isTyPhuProperty(c) && c.kind !== 'land' ? 0.155 : 0.185)) }]}>{c.name}</T>
              {isTyPhuProperty(c) && !owner && (
                <T style={[styles.price, { fontSize: Math.max(6.5, cell * 0.15), lineHeight: Math.max(7.5, cell * 0.18) }]}>{c.price}</T>
              )}
              {owner && (
                <View style={[styles.ownerBar, { backgroundColor: colorOf(owner), minHeight: Math.max(8, cell * 0.2) }]}>
                  {playerById.get(owner)?.avatarUrl ? (
                    <Image
                      source={{ uri: playerById.get(owner)!.avatarUrl }}
                      style={[styles.ownerImage, { width: Math.max(7, cell * 0.18), height: Math.max(7, cell * 0.18) }]}
                    />
                  ) : <T style={[styles.houses, { fontSize: Math.max(6.5, cell * 0.15), lineHeight: Math.max(8, cell * 0.19) }]}>{avatarFor(owner).emoji}</T>}
                  {houses > 0 && (
                    <T style={[styles.houses, { fontSize: Math.max(6.5, cell * 0.15), lineHeight: Math.max(8, cell * 0.19) }]}>
                      {houses === TYPHU_MAX_HOUSES ? '🏨' : '▪'.repeat(houses)}
                    </T>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}

        {/* quân cờ */}
        {g.order.filter((id) => !g.bankrupt.includes(id)).map((id) => {
          const position = displayedPos(id);
          const [r, col] = Array.isArray(position) ? position : typhuCellPos(position);
          const k = g.order.filter((other) => !g.bankrupt.includes(other) && g.pos[other] === g.pos[id]).indexOf(id);
          const size = cell * 0.43;
          return <View key={id} testID={`token-${id}`} pointerEvents="none"
            accessibilityLabel={`${nameOf(id)}, ô ${g.pos[id] + 1}`}
            style={[styles.token, { width: size, height: size, borderRadius: size / 2,
              top: r * cell + cell * 0.51 - Math.floor(k / 3) * size * 0.65,
              left: col * cell + (k % 3) * size * 0.61,
              backgroundColor: avatarFor(id).bg, borderColor: colorOf(id) },
              id === g.currentPlayerId && styles.tokenActive]}>
            {playerById.get(id)?.avatarUrl ? (
              <Image source={{ uri: playerById.get(id)!.avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} />
            ) : <T style={{ fontSize: size * 0.67, lineHeight: size }}>{avatarFor(id).emoji}</T>}
          </View>;
        })}

        {/* giữa bàn */}
        <View style={[styles.center, { top: cell * 1.08, left: cell * 1.08, width: cell * 8.84, height: cell * 8.84 }]}>
          <View style={styles.centerHead}>
            <T style={styles.logo}>Tỷ phú</T>
            {isHost && (
              <Pressable testID="end-open" accessibilityRole="button" onPress={() => setEnding(true)} hitSlop={8}>
                <T style={styles.endLink}>Tổng kết</T>
              </Pressable>
            )}
          </View>
          <View testID={`dice-phase-${dicePhase}`} accessibilityLabel={`Xúc xắc: ${dicePhase}`} style={[styles.dice,
            !reducedMotion && dicePhase === 'roll' && { transform: [{ rotate: `${rollElapsed * 1.8}deg` }, { scale: 1.1 }] },
            !reducedMotion && dicePhase === 'bounce' && { transform: [{ translateY: -Math.sin((rollElapsed - 400) / 140 * Math.PI) * 12 }, { scale: 1.08 }] }]}>
            <Dice testID="die-1" value={dicePhase === 'roll' ? Math.floor(now / 65) % 6 + 1 : g.dice?.[0] ?? null} rollId={diceAnimating ? g.rollId : 0} size={Math.min(52, cell * 0.95)} />
            <Dice testID="die-2" value={dicePhase === 'roll' ? Math.floor(now / 83) % 6 + 1 : g.dice?.[1] ?? null} rollId={diceAnimating ? g.rollId : 0} size={Math.min(52, cell * 0.95)} />
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
      <View style={[styles.sideCol, landscape && { width: Math.min(340, Math.max(220, width - boardSize - 42)) }]}>
        <View style={[styles.hud, shortLandscape && { padding: 8, gap: 4 }]}>
          <T style={styles.hudTitle}>BẢNG TÀI SẢN</T>
          {g.order.map((id) => <View key={id} style={[styles.playerRow, { borderColor: colorOf(id), opacity: g.bankrupt.includes(id) ? 0.45 : 1 }]}>
            <View style={styles.playerNameRow}>
              {playerById.get(id)?.avatarUrl ? (
                <Image source={{ uri: playerById.get(id)!.avatarUrl }} style={styles.hudAvatar} />
              ) : <T>{avatarFor(id).emoji}</T>}
              <T numberOfLines={1} style={{ flex: 1, fontWeight: '900', fontSize: shortLandscape ? 14 : 16 }}>{nameOf(id)}{id === g.currentPlayerId ? ' ◀' : ''}</T>
            </View>
            <T style={{ fontSize: 12 }}>{g.bankrupt.includes(id) ? 'Phá sản' : `${fmt(g.cash[id] ?? 0)} xu · ${Object.values(g.owners).filter((owner) => owner === id).length} tài sản`}</T>
          </View>)}
          <T style={styles.legend}>Viền màu + avatar là chủ sở hữu. Dải màu trên ô là bộ đất.</T>
          {moving && <T accessibilityLiveRegion="polite" style={styles.legend}>Đang đi quân. Quyết định mua và xây sẽ mở khi quân dừng.</T>}
        </View>
        {landscape && <View style={styles.landscapeControls}>{controls}</View>}
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
          ) : d.kind === 'station' || d.kind === 'utility' ? (
            <View style={{ gap: 10 }}>
              <T>Giá mua: {fmt(d.price)} xu</T>
              <T>Chủ: {g.owners[detail] ? nameOf(g.owners[detail]) : 'Chưa có'}</T>
              <T>{d.kind === 'station' ? 'Tiền thuê theo số ga sở hữu: 25 / 50 / 100 / 200 xu.' : 'Tiền thuê: tổng xúc xắc × 4; sở hữu cả hai công ty: × 10.'}</T>
              {g.owners[detail] && <T>Thuê theo lượt đổ hiện tại: {fmt(d.kind === 'station'
                ? stationRent(TYPHU_BOARD.filter((c, i) => c.kind === 'station' && g.owners[i] === g.owners[detail]).length)
                : utilityRent(TYPHU_BOARD.filter((c, i) => c.kind === 'utility' && g.owners[i] === g.owners[detail]).length, (g.dice?.[0] ?? 0) + (g.dice?.[1] ?? 0)))} xu</T>}
            </View>
          ) : (
            <T style={{ color: C.muted }}>
              {d.kind === 'start' && 'Đi qua ô này được nhận 200 xu.'}
              {d.kind === 'jail' && 'Ngồi tù: đổ đôi để ra, hoặc nộp 50 xu. Chỉ đi ngang qua thì không sao.'}
              {d.kind === 'rest' && 'Nghỉ chân uống trà đá, không có gì xảy ra.'}
              {d.kind === 'gotojail' && 'Dừng ở đây là vào tù ngay.'}
              {d.kind === 'community' && 'Rút thẻ khí vận dành cho cộng đồng: nhận tiền, trả phí hoặc di chuyển.'}
              {d.kind === 'chance' && 'Rút một thẻ cơ hội: có thể được tiền, mất tiền hoặc bị đưa đi chỗ khác.'}
              {d.kind === 'tax' && `Nộp ${fmt(d.amount)} xu cho ngân hàng.`}
            </T>
          )}
        </Sheet>
      )}

      {ending && (
        <Sheet title="Tổng kết ván cờ?" onClose={() => setEnding(false)}>
          <T style={{ color: C.muted }}>Ván sẽ dừng lại và xếp hạng theo tổng tài sản (tiền mặt + đất + nhà).</T>
          <Button testID="end-confirm" title="Tổng kết" variant="ink" disabled={moving} onPress={() => act({ type: 'end' })} />
          <Button title="Chơi tiếp" variant="paper" onPress={() => setEnding(false)} />
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 14, alignItems: 'center' },
  layoutWide: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  sideCol: { alignSelf: 'stretch', gap: 8 },
  landscapeControls: { gap: 6, backgroundColor: C.sonDark, padding: 10, borderRadius: 14 },
  rotateHint: { fontSize: 12, color: C.onSon, textAlign: 'center' },
  hud: { alignSelf: 'stretch', padding: 12, backgroundColor: C.paper, borderRadius: 14, gap: 8 },
  hudTitle: { color: C.son, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  playerRow: { borderLeftWidth: 5, paddingLeft: 9, gap: 2 },
  playerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hudAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: C.ink },
  legend: { color: C.muted, fontSize: 11 },
  board: { alignSelf: 'center', backgroundColor: '#DFF5E1', borderRadius: 10, overflow: 'hidden', position: 'relative' },
  cell: {
    position: 'absolute', backgroundColor: C.paper, borderWidth: 0.75, borderColor: C.ink, alignItems: 'center',
    justifyContent: 'flex-start', overflow: 'hidden',
  },
  cellHere: { borderWidth: 3, borderColor: C.gold },
  band: { alignSelf: 'stretch', borderBottomWidth: 0.75, borderColor: C.ink },
  cellName: { fontWeight: '800', textAlign: 'center', paddingHorizontal: 1, marginTop: 0.5 },
  price: { color: C.muted, fontWeight: '700', position: 'absolute', bottom: 0.5 },
  ownerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1 },
  ownerImage: { borderRadius: 99, borderWidth: 1, borderColor: '#fff' },
  houses: { lineHeight: 13 },
  token: {
    position: 'absolute', borderWidth: 2, alignItems: 'center', justifyContent: 'center', zIndex: 5,
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
