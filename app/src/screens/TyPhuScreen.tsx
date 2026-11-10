import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { PLAYER_COLORS, type RoomState, type TyPhuView } from '../../../shared/src/types';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_ROLL_MS, isTyPhuProperty, stationRent, utilityRent,
  TYPHU_HOUSE_MULT, TYPHU_JAIL_FINE, TYPHU_MAX_HOUSES, groupCells, rentOf, typhuCellPos,
} from '../../../shared/src/typhu';
import type { Game } from '../useGame';
import { actionText } from '../messages';
import { characterSvgUri, playerColorOf } from '../avatars';
import { TYPHU_PHOTOS } from '../typhuArt';
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

/** màu dự phòng theo thứ tự lượt nếu người chơi chưa có character */
export const TOKEN_COLORS = PLAYER_COLORS.map((c) => c.hex);
const CORNER_ICON: Record<string, string> = {
  start: '🏁', jail: '🚔', rest: '☕', gotojail: '👮',
  chance: '❓', community: '🎁', station: '🚆', utility: '⚡', tax: '💸',
};
const fmt = (n: number) => n.toLocaleString('vi-VN');

interface CashFx {
  delta: number;
  at: number;
}

interface CellFx {
  cell: number;
  label: string;
  color: string;
  at: number;
}

function houseBadgeInfo(houses: number, ownerHex: string): { text: string; bg: string; border: string } {
  if (houses >= TYPHU_MAX_HOUSES) return { text: '🏨 KS', bg: '#E03131', border: '#FFD43B' };
  if (houses === 3) return { text: '🏘️ C3', bg: '#7950F2', border: '#E5DBFF' };
  if (houses === 2) return { text: '🏠 C2', bg: '#1D6FE8', border: '#D0EBFF' };
  if (houses === 1) return { text: '🏠 C1', bg: '#0CA678', border: '#C3FAE8' };
  return { text: 'ĐẤT', bg: ownerHex, border: '#FFFFFF' };
}

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
  const [forceRotate, setForceRotate] = useState(false);
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);

  const myTurn = g.currentPlayerId === me;
  const playerById = new Map(room.players.map((p) => [p.id, p]));
  const colorEntryOf = (id: string) => {
    const p = playerById.get(id);
    if (p?.character) return playerColorOf(p.character);
    const idx = Math.max(0, g.order.indexOf(id));
    return playerColorOf(idx);
  };
  const colorOf = (id: string) => colorEntryOf(id).hex;
  const lightColorOf = (id: string) => colorEntryOf(id).light;
  const portraitUriOf = (id: string) => {
    const p = playerById.get(id);
    if (p?.avatarUrl) return p.avatarUrl;
    if (p?.character) return characterSvgUri(p.character);
    return characterSvgUri({ gender: 'nam', age: 'tre', hair: 'han', color: Math.max(0, g.order.indexOf(id)) });
  };
  const nameOf = (id: string) => (id === me ? 'Bạn' : g.names[id] ?? '?');
  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const inJail = me in g.jail;

  const isPortrait = height > width;
  const rotated = isPortrait && forceRotate;
  const availW = stageSize && stageSize.w > 200 ? stageSize.w - 4 : Math.max(320, width - 12);
  const availH = stageSize && stageSize.h > 200 ? stageSize.h - 4 : Math.max(260, height - (isPortrait ? 96 : 68));
  const boardW = rotated ? availH : availW;
  const boardH = rotated ? availW : availH;
  const cellW = boardW / 11;
  const cellH = boardH / 11;
  const minCell = Math.min(cellW, cellH);

  const [now, setNow] = useState(() => Date.now());
  const [localRoll, setLocalRoll] = useState<{ id: number; startedAt: number; endsAt: number } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [cashFx, setCashFx] = useState<Record<string, CashFx>>({});
  const [cellFx, setCellFx] = useState<CellFx | null>(null);
  const prevCashRef = useRef<Record<string, number>>({ ...g.cash });
  const prevOwnersRef = useRef<Record<number, string>>({ ...g.owners });
  const prevHousesRef = useRef<Record<number, number>>({ ...g.houses });

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const cashSignature = g.order.map((id) => `${id}:${g.cash[id] ?? 0}`).join('|');
  useOnChange(cashSignature, () => {
    const prev = prevCashRef.current;
    const updates: Record<string, CashFx> = {};
    const t = room.serverNow - game.clockOffset;
    for (const id of g.order) {
      const cur = g.cash[id] ?? 0;
      const old = prev[id];
      if (old !== undefined && cur !== old) {
        updates[id] = { delta: cur - old, at: t };
      }
      prev[id] = cur;
    }
    if (Object.keys(updates).length > 0) {
      setCashFx((old) => ({ ...old, ...updates }));
      setNow(t);
    }
  });

  const boardSignature = TYPHU_BOARD.map((_, i) => `${g.owners[i] ?? ''}:${g.houses[i] ?? 0}`).join('|');
  useOnChange(boardSignature, () => {
    const prevO = prevOwnersRef.current;
    const prevH = prevHousesRef.current;
    const t = room.serverNow - game.clockOffset;
    for (let i = 0; i < TYPHU_BOARD.length; i++) {
      const owner = g.owners[i];
      const houses = g.houses[i] ?? 0;
      if (owner && prevO[i] !== owner) {
        setCellFx({ cell: i, label: '✨ MUA ĐẤT!', color: colorOf(owner), at: t });
        setNow(t);
      } else if (owner && houses > (prevH[i] ?? 0)) {
        const lbl = houses >= TYPHU_MAX_HOUSES ? '🏨 LÊN KHÁCH SẠN!' : `🏠 NHÀ CẤP ${houses}!`;
        setCellFx({ cell: i, label: lbl, color: '#FFD43B', at: t });
        setNow(t);
      }
      if (owner) prevO[i] = owner;
      prevH[i] = houses;
    }
  });

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
  const fxEndsAt = Math.max(
    cellFx ? cellFx.at + 2200 : 0,
    ...Object.values(cashFx).map((x) => x.at + 2200),
  );
  const animationEndsAt = reducedMotion ? 0 : Math.max(
    movement?.endsAt ?? 0,
    localRoll?.id === g.rollId ? localRoll.endsAt : 0,
  );
  const animating = serverNow < animationEndsAt || now < fxEndsAt;
  useEffect(() => {
    if (!animating || reducedMotion) return;
    const tick = setInterval(() => setNow(Date.now()), 32);
    return () => clearInterval(tick);
  }, [animating, animationEndsAt, fxEndsAt, reducedMotion]);

  const tokenMoveState = (id: string): { pos: [number, number]; hop: number; activeStepCell: number | null; trail: Set<number> } => {
    const emptyTrail = new Set<number>();
    if (reducedMotion && movement?.playerId === id) {
      return { pos: typhuCellPos(g.pos[id]), hop: 0, activeStepCell: null, trail: emptyTrail };
    }
    if (!movement || movement.playerId !== id || serverNow >= movement.endsAt) {
      return { pos: typhuCellPos(g.pos[id]), hop: 0, activeStepCell: null, trail: emptyTrail };
    }
    const delay = movement.kind === 'roll' ? TYPHU_ROLL_MS : 0;
    const elapsed = serverNow - movement.startedAt - delay;
    if (elapsed <= 0 || !movement.path.length) {
      return { pos: typhuCellPos(movement.from), hop: 0, activeStepCell: movement.from, trail: new Set([movement.from]) };
    }
    const duration = Math.max(1, movement.endsAt - movement.startedAt - delay);
    const progress = Math.min(movement.path.length, (elapsed / duration) * movement.path.length);
    const step = Math.floor(progress);
    const sub = progress - step;
    const from = step === 0 ? movement.from : movement.path[step - 1];
    const to = movement.path[Math.min(step, movement.path.length - 1)];
    const [fr, fc] = typhuCellPos(from);
    const [tr, tc] = typhuCellPos(to);
    const hop = Math.sin(sub * Math.PI) * 14;
    const trail = new Set<number>([movement.from, ...movement.path.slice(0, Math.min(movement.path.length, step + 1))]);
    return {
      pos: [fr + (tr - fr) * sub, fc + (tc - fc) * sub],
      hop,
      activeStepCell: to,
      trail,
    };
  };

  const activeMovementState = movement && moving ? tokenMoveState(movement.playerId) : null;

  useOnChange(g.rollId, (id) => {
    const startedAt = Date.now() + game.clockOffset;
    setLocalRoll({ id, startedAt, endsAt: startedAt + TYPHU_ROLL_MS });
    setNow(Date.now());
    play('dice');
  });
  useOnChange(myTurn && g.step === 'roll', (turnNow) => {
    if (turnNow) {
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
    if (l.kind === 'build') {
      play('coin');
      if (!mine) feed(l.text, 'info');
    }
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

  const recent = g.log.slice(-2).reverse();
  const d = detail !== null ? TYPHU_BOARD[detail] : null;
  const activeCellFx = cellFx && now - cellFx.at < 2200 ? cellFx : null;

  return (
    <Shell
      wide
      fullscreen
      scroll={false}
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
    >
      {isPortrait && (
        <View style={styles.rotateBar}>
          <T numberOfLines={1} style={styles.rotateHint}>
            📱 Xoay ngang màn hình để bàn cờ trải rộng cực đại!
          </T>
          <Pressable
            testID="rotate-toggle"
            accessibilityRole="button"
            onPress={() => setForceRotate((v) => !v)}
            style={styles.rotateBtn}
          >
            <T style={styles.rotateBtnText}>{forceRotate ? '↩ Khung dọc' : '🔄 Xoay ngang 90°'}</T>
          </Pressable>
        </View>
      )}

      <View
        style={styles.stageWrap}
        onLayout={(e) => {
          const { width: lw, height: lh } = e.nativeEvent.layout;
          if (lw > 0 && lh > 0) setStageSize({ w: Math.floor(lw), h: Math.floor(lh) });
        }}
      >
        <View
          style={[
            styles.board,
            sticker(5),
            { width: boardW, height: boardH },
            rotated && { transform: [{ rotate: '90deg' }] },
          ]}
        >
          {/* 40 ô xung quanh bàn cờ với ảnh thật địa danh & huy hiệu cấp nhà rõ nét */}
          {TYPHU_BOARD.map((c, i) => {
            const [r, col] = typhuCellPos(i);
            const owner = g.owners[i];
            const houses = g.houses[i] ?? 0;
            const here = g.pendingBuy === i;
            const isTrail = activeMovementState?.trail.has(i) ?? false;
            const isStepTarget = activeMovementState?.activeStepCell === i;
            const isFxCell = activeCellFx?.cell === i;
            const photoUri = TYPHU_PHOTOS[c.name];
            const badge = owner ? houseBadgeInfo(houses, colorOf(owner)) : null;

            return (
              <Pressable
                key={i}
                testID={`cell-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${i + 1}. ${c.name}${owner ? `, thuộc ${nameOf(owner)}` : ''}${isTyPhuProperty(c) ? `, giá ${c.price} xu` : ''}`}
                onPress={() => setDetail(i)}
                style={[
                  styles.cell,
                  { top: r * cellH, left: col * cellW, width: cellW, height: cellH },
                  owner && {
                    backgroundColor: lightColorOf(owner),
                    borderWidth: 2.5,
                    borderColor: colorOf(owner),
                  },
                  isTrail && styles.cellTrail,
                  isStepTarget && styles.cellStepTarget,
                  here && styles.cellHere,
                  isFxCell && { borderWidth: 3.5, borderColor: activeCellFx.color },
                ]}
              >
                {/* Ảnh địa danh thật trên mạng */}
                {photoUri && (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.cellPhoto}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.cellScrim} />

                {/* Dải màu bộ đất hoặc biểu tượng ô đặc biệt */}
                {c.kind === 'land' ? (
                  <View style={[styles.band, { backgroundColor: TYPHU_GROUPS[c.group].color, height: Math.max(5, cellH * 0.16) }]} />
                ) : (
                  <View style={styles.cornerBadge}>
                    <T style={{ fontSize: Math.max(9, minCell * 0.22), lineHeight: Math.max(11, minCell * 0.25) }}>
                      {CORNER_ICON[c.kind]}
                    </T>
                  </View>
                )}

                {/* Tên địa danh nổi bật trên nền ảnh */}
                <View style={styles.cellNamePill}>
                  <T
                    numberOfLines={2}
                    style={[
                      styles.cellName,
                      {
                        fontSize: Math.max(7.5, Math.min(12, minCell * 0.19)),
                        lineHeight: Math.max(8.5, Math.min(13.5, minCell * 0.22)),
                      },
                    ]}
                  >
                    {c.name}
                  </T>
                </View>

                {/* Giá tiền khi chưa có chủ */}
                {isTyPhuProperty(c) && !owner && (
                  <View style={styles.pricePill}>
                    <T style={[styles.price, { fontSize: Math.max(7, Math.min(11, minCell * 0.17)) }]}>
                      {c.price}
                    </T>
                  </View>
                )}

                {/* Huy hiệu Chủ sở hữu + Cấp nhà (ĐẤT / C1 / C2 / C3 / KS) cực kỳ dễ phân biệt */}
                {owner && badge && (
                  <View
                    style={[
                      styles.ownerBar,
                      {
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                        minHeight: Math.max(12, cellH * 0.26),
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: portraitUriOf(owner) }}
                      style={[
                        styles.ownerImage,
                        { width: Math.max(10, minCell * 0.24), height: Math.max(10, minCell * 0.24) },
                      ]}
                    />
                    <T
                      numberOfLines={1}
                      style={[
                        styles.levelText,
                        { fontSize: Math.max(7, Math.min(11, minCell * 0.18)) },
                      ]}
                    >
                      {badge.text}
                    </T>
                  </View>
                )}

                {/* Hiệu ứng ánh sáng bùng lên khi vừa mua đất hoặc nâng cấp nhà */}
                {isFxCell && (
                  <View pointerEvents="none" style={[styles.cellBurstOverlay, { borderColor: activeCellFx.color }]}>
                    <View style={[styles.cellBurstPill, { backgroundColor: activeCellFx.color }]}>
                      <T style={styles.cellBurstText}>{activeCellFx.label}</T>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })}

          {/* Quân cờ nhân vật chạy từng bước có hiệu ứng nhảy vòm & vòng sáng */}
          {g.order.filter((id) => !g.bankrupt.includes(id)).map((id) => {
            const moveState = tokenMoveState(id);
            const [r, col] = moveState.pos;
            const isMovingMe = moving && movement?.playerId === id;
            const k = g.order.filter((other) => !g.bankrupt.includes(other) && g.pos[other] === g.pos[id]).indexOf(id);
            const size = Math.max(20, Math.min(38, minCell * 0.56));
            const topPos = r * cellH + cellH * 0.42 - Math.floor(k / 3) * size * 0.5 - moveState.hop;
            const leftPos = col * cellW + cellW * 0.14 + (k % 3) * size * 0.52;

            return (
              <View
                key={id}
                testID={`token-${id}`}
                pointerEvents="none"
                accessibilityLabel={`${nameOf(id)}, ô ${g.pos[id] + 1}`}
                style={[
                  styles.token,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    top: topPos,
                    left: leftPos,
                    backgroundColor: lightColorOf(id),
                    borderColor: colorOf(id),
                  },
                  id === g.currentPlayerId && styles.tokenActive,
                  isMovingMe && styles.tokenMoving,
                ]}
              >
                <Image
                  source={{ uri: portraitUriOf(id) }}
                  style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
                />
                {isMovingMe && <View style={[styles.tokenGlowRing, { borderColor: colorOf(id) }]} />}
              </View>
            );
          })}

          {/* TRUNG TÂM BÀN CỜ: Bảng tài sản trực quan + Xúc xắc + Nút điều khiển + Diễn biến */}
          <View
            style={[
              styles.center,
              {
                top: cellH * 1.02,
                left: cellW * 1.02,
                width: cellW * 8.96,
                height: cellH * 8.96,
              },
            ]}
          >
            {/* Thanh tiêu đề trung tâm */}
            <View style={styles.centerHead}>
              <View style={styles.brandRow}>
                <T style={styles.logo}>🏛️ ĐẠI GIA ĐẤT VIỆT</T>
                <View style={styles.legendPills}>
                  <View style={[styles.lvlLegend, { backgroundColor: '#0CA678' }]}><T style={styles.lvlLegendTxt}>🏠C1</T></View>
                  <View style={[styles.lvlLegend, { backgroundColor: '#1D6FE8' }]}><T style={styles.lvlLegendTxt}>🏠C2</T></View>
                  <View style={[styles.lvlLegend, { backgroundColor: '#7950F2' }]}><T style={styles.lvlLegendTxt}>🏘️C3</T></View>
                  <View style={[styles.lvlLegend, { backgroundColor: '#E03131' }]}><T style={styles.lvlLegendTxt}>🏨KS</T></View>
                </View>
              </View>
              {isHost && (
                <Pressable testID="end-open" accessibilityRole="button" onPress={() => setEnding(true)} hitSlop={8} style={styles.endBtn}>
                  <T style={styles.endLink}>🏆 Tổng kết</T>
                </Pressable>
              )}
            </View>

            {/* BẢNG TÀI SẢN NGƯỜI CHƠI Ở CHÍNH GIỮA BÀN CỜ */}
            <View style={styles.wealthGrid}>
              {g.order.map((id) => {
                const isCur = id === g.currentPlayerId;
                const isBankrupt = g.bankrupt.includes(id);
                const pColor = colorOf(id);
                const ownedCells = Object.entries(g.owners)
                  .filter(([, ownerId]) => ownerId === id)
                  .map(([cellIdx]) => Number(cellIdx));
                const houseCount = ownedCells.reduce((acc, idx) => acc + ((g.houses[idx] ?? 0) < TYPHU_MAX_HOUSES ? (g.houses[idx] ?? 0) : 0), 0);
                const hotelCount = ownedCells.reduce((acc, idx) => acc + ((g.houses[idx] ?? 0) >= TYPHU_MAX_HOUSES ? 1 : 0), 0);
                const fx = cashFx[id];
                const showCashFx = fx && now - fx.at < 2200;
                const isGain = (fx?.delta ?? 0) > 0;

                return (
                  <View
                    key={id}
                    testID={`wealth-card-${id}`}
                    style={[
                      styles.wealthCard,
                      {
                        borderColor: pColor,
                        opacity: isBankrupt ? 0.42 : 1,
                      },
                      isCur && styles.wealthCardActive,
                      showCashFx && (isGain ? styles.wealthCardGain : styles.wealthCardLoss),
                    ]}
                  >
                    <View style={[styles.wealthAvatarWrap, { borderColor: pColor, backgroundColor: lightColorOf(id) }]}>
                      <Image source={{ uri: portraitUriOf(id) }} style={styles.wealthAvatar} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.wealthNameRow}>
                        <T numberOfLines={1} style={styles.wealthName}>
                          {nameOf(id)}
                        </T>
                        {isCur && <T style={styles.turnDot}>🎲</T>}
                        {id in g.jail && <T style={styles.turnDot}>🚔</T>}
                      </View>
                      <T numberOfLines={1} style={styles.wealthCash}>
                        {isBankrupt ? '💀 Phá sản' : `💰 ${fmt(g.cash[id] ?? 0)} xu`}
                      </T>
                      <T numberOfLines={1} style={styles.wealthProps}>
                        {ownedCells.length} đất{houseCount > 0 ? ` · ${houseCount} nhà` : ''}{hotelCount > 0 ? ` · ${hotelCount} KS` : ''}
                      </T>
                    </View>

                    {/* Hiệu ứng ánh sáng +xu / -xu bay lên khi có tiền hoặc mất tiền */}
                    {showCashFx && (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.cashDeltaBadge,
                          isGain ? styles.cashDeltaGain : styles.cashDeltaLoss,
                        ]}
                      >
                        <T style={styles.cashDeltaText}>
                          {isGain ? `+${fmt(fx.delta)} xu 💰` : `${fmt(fx.delta)} xu 💸`}
                        </T>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* KHU VỰC XÚC XẮC & NÚT HÀNH ĐỘNG TRUNG TÂM */}
            <View style={styles.actionHub}>
              <View
                testID={`dice-phase-${dicePhase}`}
                accessibilityLabel={`Xúc xắc: ${dicePhase}`}
                style={[
                  styles.diceArena,
                  diceAnimating && styles.diceArenaGlow,
                  !reducedMotion && dicePhase === 'roll' && { transform: [{ rotate: `${rollElapsed * 1.8}deg` }, { scale: 1.1 }] },
                  !reducedMotion && dicePhase === 'bounce' && { transform: [{ translateY: -Math.sin(((rollElapsed - 400) / 140) * Math.PI) * 10 }, { scale: 1.08 }] },
                ]}
              >
                <Dice
                  testID="die-1"
                  value={dicePhase === 'roll' ? (Math.floor(now / 65) % 6) + 1 : g.dice?.[0] ?? null}
                  rollId={diceAnimating ? g.rollId : 0}
                  size={Math.max(34, Math.min(48, minCell * 0.78))}
                />
                <Dice
                  testID="die-2"
                  value={dicePhase === 'roll' ? (Math.floor(now / 83) % 6) + 1 : g.dice?.[1] ?? null}
                  rollId={diceAnimating ? g.rollId : 0}
                  size={Math.max(34, Math.min(48, minCell * 0.78))}
                />
              </View>

              <View style={styles.controlsCol}>
                <T testID="typhu-status" numberOfLines={2} style={[styles.status, myTurn && { color: C.gold }]}>
                  {status}
                </T>
                {!moving && myTurn && g.step === 'roll' ? (
                  <View style={styles.row}>
                    {inJail && (
                      <Button
                        testID="pay-jail"
                        small
                        variant="paper"
                        title={`Nộp ${TYPHU_JAIL_FINE} xu`}
                        style={{ flex: 1 }}
                        onPress={() => act({ type: 'payJail' })}
                      />
                    )}
                    <Button
                      testID="roll-btn"
                      small
                      title="🎲 Đổ xúc xắc"
                      style={{ flex: 1.2 }}
                      onPress={() => act({ type: 'roll' })}
                    />
                  </View>
                ) : !moving && myTurn && g.step === 'buy' && pending && isTyPhuProperty(pending) ? (
                  <View style={styles.row}>
                    <Button
                      testID="skip-btn"
                      small
                      variant="paper"
                      title="Bỏ qua"
                      style={{ flex: 0.8 }}
                      onPress={() => act({ type: 'skip' })}
                    />
                    <Button
                      testID="buy-btn"
                      small
                      title={`Mua ${pending.name} (${fmt(pending.price)})`}
                      style={{ flex: 1.6 }}
                      onPress={() => act({ type: 'buy' })}
                    />
                  </View>
                ) : !moving && myTurn && g.step === 'manage' ? (
                  <Button
                    testID="end-turn"
                    small
                    title="✓ Xong lượt"
                    variant="gold"
                    onPress={() => act({ type: 'endTurn' })}
                  />
                ) : null}
                <TimerBar left={left} total={g.turnSeconds} />
                {error && <T style={styles.error}>{error}</T>}
              </View>
            </View>

            {/* Thẻ Cơ hội / Khí vận & dòng sự kiện */}
            <View style={styles.bottomTicker}>
              {g.card && (
                <View testID="typhu-card" style={styles.card}>
                  <T numberOfLines={1} style={styles.cardText}>🎴 {g.card.text}</T>
                </View>
              )}
              {recent.map((l, i) => (
                <T key={l.id} numberOfLines={1} style={[styles.log, i > 0 && { opacity: 0.65 }]}>
                  {l.text}
                </T>
              ))}
            </View>
          </View>
        </View>
      </View>

      {d && detail !== null && (
        <Sheet title={d.name} onClose={() => setDetail(null)}>
          {TYPHU_PHOTOS[d.name] && (
            <Image source={{ uri: TYPHU_PHOTOS[d.name] }} style={styles.detailPhoto} resizeMode="cover" />
          )}
          {d.kind === 'land' ? (
            <View style={{ gap: 6 }}>
              <View style={[styles.detailBand, { backgroundColor: TYPHU_GROUPS[d.group].color }]}>
                <T style={styles.detailGroup}>{TYPHU_GROUPS[d.group].name}</T>
              </View>
              <T>
                Giá đất: <T style={{ fontWeight: '900' }}>{fmt(d.price)} xu</T>, xây mỗi nhà {fmt(TYPHU_GROUPS[d.group].house)} xu
              </T>
              <T>
                Chủ: <T style={{ fontWeight: '900' }}>{g.owners[detail] ? nameOf(g.owners[detail]) : 'chưa có'}</T>
                {g.houses[detail] ? `, ${g.houses[detail] === TYPHU_MAX_HOUSES ? 'có khách sạn' : `nhà cấp ${g.houses[detail]}`}` : ''}
              </T>
              <View style={styles.rents}>
                {[
                  ['Đất trống', d.rent],
                  ['Đủ bộ màu', d.rent * 2],
                  ...TYPHU_HOUSE_MULT.map((m, k) => [k === 3 ? 'Khách sạn (Cấp 4)' : `Nhà cấp ${k + 1} (${k + 1} nhà)`, d.rent * m] as [string, number]),
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
              <T>
                {d.kind === 'station'
                  ? 'Tiền thuê theo số ga sở hữu: 25 / 50 / 100 / 200 xu.'
                  : 'Tiền thuê: tổng xúc xắc × 4; sở hữu cả hai công ty: × 10.'}
              </T>
              {g.owners[detail] && (
                <T>
                  Thuê theo lượt đổ hiện tại:{' '}
                  {fmt(
                    d.kind === 'station'
                      ? stationRent(TYPHU_BOARD.filter((c, i) => c.kind === 'station' && g.owners[i] === g.owners[detail]).length)
                      : utilityRent(
                          TYPHU_BOARD.filter((c, i) => c.kind === 'utility' && g.owners[i] === g.owners[detail]).length,
                          (g.dice?.[0] ?? 0) + (g.dice?.[1] ?? 0),
                        ),
                  )}{' '}
                  xu
                </T>
              )}
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
  rotateBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1E1510', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, gap: 8,
  },
  rotateHint: { flex: 1, fontSize: 11, color: '#FFE066', fontWeight: '700' },
  rotateBtn: {
    backgroundColor: C.gold, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.ink,
  },
  rotateBtnText: { fontSize: 11, fontWeight: '900', color: C.ink },
  stageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  board: {
    backgroundColor: '#0F2E22', borderRadius: 14, overflow: 'hidden', position: 'relative',
  },
  cell: {
    position: 'absolute', backgroundColor: '#FFFFFF', borderWidth: 0.8, borderColor: '#2B2118',
    alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden',
  },
  cellPhoto: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.84,
  },
  cellScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(12, 16, 20, 0.22)',
  },
  cellTrail: {
    borderWidth: 2.5, borderColor: '#FFD43B',
    shadowColor: '#FFD43B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6,
  } as object,
  cellStepTarget: {
    borderWidth: 3, borderColor: '#FFF3BF',
  },
  cellHere: {
    borderWidth: 3.5, borderColor: C.gold,
  },
  band: {
    alignSelf: 'stretch', borderBottomWidth: 1.2, borderColor: '#1A1412', zIndex: 2,
  },
  cornerBadge: {
    marginTop: 1, backgroundColor: 'rgba(255, 255, 255, 0.86)', borderRadius: 6, paddingHorizontal: 3, zIndex: 2,
  },
  cellNamePill: {
    backgroundColor: 'rgba(15, 20, 26, 0.72)', borderRadius: 4, paddingHorizontal: 2.5, paddingVertical: 0.5,
    maxWidth: '96%', zIndex: 2,
  },
  cellName: {
    color: '#FFFFFF', fontWeight: '900', textAlign: 'center',
  },
  pricePill: {
    backgroundColor: 'rgba(255, 212, 59, 0.94)', borderRadius: 4, paddingHorizontal: 3, marginBottom: 1,
    borderWidth: 0.8, borderColor: '#1A1412', zIndex: 2,
  },
  price: {
    color: '#1A1412', fontWeight: '900', lineHeight: 11,
  },
  ownerBar: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 2, paddingHorizontal: 2, borderTopWidth: 1.2, zIndex: 3,
  },
  ownerImage: {
    borderRadius: 99, borderWidth: 1, borderColor: '#FFFFFF', backgroundColor: '#FFFFFF',
  },
  levelText: {
    color: '#FFFFFF', fontWeight: '900', letterSpacing: -0.2,
  },
  cellBurstOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 3,
    backgroundColor: 'rgba(255, 212, 59, 0.28)', alignItems: 'center', justifyContent: 'center', zIndex: 8,
  },
  cellBurstPill: {
    paddingHorizontal: 4, paddingVertical: 1.5, borderRadius: 6, borderWidth: 1.5, borderColor: '#1A1412',
  },
  cellBurstText: {
    color: '#1A1412', fontWeight: '900', fontSize: 8.5, textAlign: 'center',
  },
  token: {
    position: 'absolute', borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', zIndex: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.45, shadowRadius: 3,
  } as object,
  tokenActive: {
    zIndex: 12, transform: [{ scale: 1.18 }],
  },
  tokenMoving: {
    zIndex: 15, transform: [{ scale: 1.28 }],
    shadowColor: '#FFD43B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
  } as object,
  tokenGlowRing: {
    position: 'absolute', top: -5, left: -5, right: -5, bottom: -5, borderRadius: 99,
    borderWidth: 2.5, opacity: 0.85,
  },
  center: {
    position: 'absolute', backgroundColor: '#102A20', borderRadius: 12,
    borderWidth: 2.5, borderColor: '#D4AF37', paddingHorizontal: 8, paddingVertical: 6,
    justifyContent: 'space-between', zIndex: 4,
  },
  centerHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1,
  },
  logo: {
    fontWeight: '900', fontSize: 14, color: '#FFD43B', letterSpacing: 0.4,
  },
  legendPills: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  lvlLegend: {
    paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4,
  },
  lvlLegendTxt: {
    color: '#FFFFFF', fontSize: 9, fontWeight: '900',
  },
  endBtn: {
    backgroundColor: 'rgba(255, 212, 59, 0.18)', borderWidth: 1, borderColor: '#FFD43B',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  endLink: {
    color: '#FFD43B', fontWeight: '900', fontSize: 11,
  },
  wealthGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'space-between', alignItems: 'stretch',
  },
  wealthCard: {
    width: '49%', backgroundColor: 'rgba(20, 48, 36, 0.95)', borderRadius: 9,
    borderWidth: 1.5, borderLeftWidth: 5, paddingHorizontal: 6, paddingVertical: 4,
    flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', overflow: 'visible',
  },
  wealthCardActive: {
    backgroundColor: 'rgba(42, 78, 56, 0.98)',
    shadowColor: '#FFD43B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6,
  } as object,
  wealthCardGain: {
    backgroundColor: 'rgba(18, 110, 66, 0.96)', borderColor: '#51CF66',
  },
  wealthCardLoss: {
    backgroundColor: 'rgba(128, 30, 30, 0.96)', borderColor: '#FF6B6B',
  },
  wealthAvatarWrap: {
    width: 30, height: 30, borderRadius: 15, borderWidth: 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  wealthAvatar: {
    width: '100%', height: '100%',
  },
  wealthNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
  },
  wealthName: {
    color: '#FFFFFF', fontWeight: '900', fontSize: 12, flexShrink: 1,
  },
  turnDot: {
    fontSize: 11,
  },
  wealthCash: {
    color: '#FFD43B', fontWeight: '900', fontSize: 13, lineHeight: 15,
  },
  wealthProps: {
    color: '#B2F2BB', fontWeight: '700', fontSize: 10, lineHeight: 12,
  },
  cashDeltaBadge: {
    position: 'absolute', top: -8, right: 4, paddingHorizontal: 6, paddingVertical: 1.5,
    borderRadius: 8, borderWidth: 1.5, zIndex: 20,
  },
  cashDeltaGain: {
    backgroundColor: '#2B8A3E', borderColor: '#FFD43B',
  },
  cashDeltaLoss: {
    backgroundColor: '#C92A2A', borderColor: '#FFC9C9',
  },
  cashDeltaText: {
    color: '#FFFFFF', fontWeight: '900', fontSize: 10,
  },
  actionHub: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(10, 26, 19, 0.82)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.35)',
  },
  diceArena: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderRadius: 10,
  },
  diceArenaGlow: {
    backgroundColor: 'rgba(255, 212, 59, 0.22)',
    shadowColor: '#FFD43B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10,
  } as object,
  controlsCol: {
    flex: 1, gap: 4, justifyContent: 'center',
  },
  status: {
    color: '#FFFFFF', fontWeight: '800', fontSize: 12.5, textAlign: 'center',
  },
  row: {
    flexDirection: 'row', gap: 6, alignItems: 'center',
  },
  error: {
    color: C.ink, backgroundColor: C.gold, padding: 4, borderRadius: 6,
    fontWeight: '700', fontSize: 11, textAlign: 'center',
  },
  bottomTicker: {
    gap: 2, alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF3BF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1.5, borderColor: '#D4AF37', maxWidth: '98%',
  },
  cardText: {
    fontWeight: '800', fontSize: 11, color: C.ink,
  },
  log: {
    fontSize: 11, textAlign: 'center', color: '#D8F5A2', fontWeight: '700',
  },
  detailPhoto: {
    width: '100%', height: 140, borderRadius: 12, borderWidth: 2, borderColor: C.ink,
  },
  detailBand: {
    borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderColor: C.ink,
  },
  detailGroup: {
    color: '#fff', fontWeight: '900',
  },
  rents: {
    backgroundColor: C.mist, borderRadius: 12, padding: 10, gap: 3,
  },
  rentRow: {
    flexDirection: 'row', justifyContent: 'space-between',
  },
});
