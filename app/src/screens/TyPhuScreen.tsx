import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, ScrollView, StyleSheet, View } from 'react-native';
import { PLAYER_COLORS, type RoomState, type TyPhuView } from '../../../shared/src/types';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_JAIL, isTyPhuProperty, stationRent, utilityRent,
  TYPHU_HOUSE_MULT, TYPHU_MAX_HOUSES, groupCells, rentOf,
} from '../../../shared/src/typhu';
import type { Game } from '../useGame';
import { actionText } from '../messages';
import { characterSvgUri, playerColorOf, shortName } from '../avatars';
import { TYPHU_PHOTOS } from '../typhuArt';
import { ICON_BY_CELL } from '../typhuCellIcons';
import type { DiceRollView } from '../../../shared/src/dice';
import { makeCenterLayout, makeGeo, type Rect } from '../typhuLayout';
import { useOnChange, useSecondsLeft, useStableWindow } from '../hooks';
import { Rotator } from '../components/Rotator';
import { play } from '../sound';
import { vibrate } from '../web';
import { C } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { TyPhuCell } from '../components/TyPhuCell';
import { TyPhuCenter, type CardFx } from '../components/TyPhuCenter';
import { ANNOUNCE_MS, TyPhuAnnounce, type Announce } from '../components/TyPhuAnnounce';
import { Pawn, TyPhuFxLayer, fxEnd, type Fx } from '../components/TyPhuFx';
import { ThrowSheet, useShake } from '../components/Fun';

/** màu dự phòng theo thứ tự lượt nếu người chơi chưa có character */
export const TOKEN_COLORS = PLAYER_COLORS.map((c) => c.hex);
const fmt = (n: number) => n.toLocaleString('vi-VN');
/** đồng hồ gọi trong callback sự kiện (không gọi lúc render) */
const clockNow = () => Date.now();

export function TyPhuScreen(props: { game: Game; room: RoomState }) {
  return <Rotator><TyPhuBody {...props} /></Rotator>;
}

function TyPhuBody({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as TyPhuView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const { width, height } = useStableWindow();
  const feed = useFeed();
  const shake = useShake();
  const [detail, setDetail] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const [throwAt, setThrowAt] = useState<string | null>(null);
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
  const portraits = useMemo(() => {
    const m: Record<string, string> = {};
    for (const id of g.order) {
      const p = room.players.find((x) => x.id === id);
      m[id] = p?.avatarUrl
        ?? characterSvgUri(p?.character ?? { gender: 'nam', age: 'tre', hair: 'han', color: Math.max(0, g.order.indexOf(id)) });
    }
    return m;
  }, [room.players, g.order]);
  const portraitUriOf = (id: string) => portraits[id] ?? characterSvgUri();
  const nameOf = (id: string) => (id === me ? 'Bạn' : shortName(g.names[id] ?? '?', 12));
  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const inJail = me in g.jail;

  const availW = stageSize && stageSize.w > 200 ? stageSize.w - 4 : Math.max(320, width - 12);
  const availH = stageSize && stageSize.h > 200 ? stageSize.h - 8 : Math.max(220, height - 60);
  const tilt = useMemo(() => fitTilted(availW, availH), [availW, availH]);
  const boardW = tilt.S;
  const boardH = tilt.S;
  const geo = useMemo(() => makeGeo(tilt.S), [tilt.S]);
  const hasCard = !!g.card;
  const layout = useMemo(
    () => makeCenterLayout(geo.center.w - 6, geo.center.h - 6, Math.max(1, g.order.length), hasCard),
    [geo, g.order.length, hasCard],
  );
  const pawnBase = Math.max(18, Math.min(26, geo.wm * 0.66));

  const [now, setNow] = useState(() => Date.now());
  const [playback, setPlayback] = useState<DiceRollView | null>(g.roll);
  if (g.roll && g.roll.id !== playback?.id) setPlayback(g.roll);
  const [announces, setAnnounces] = useState<Announce[]>([]);
  const lastAnnEnd = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [cardFx, setCardFx] = useState<CardFx | null>(null);
  const prevCashRef = useRef<Record<string, number>>({ ...g.cash });
  const prevOwnersRef = useRef<Record<number, string>>({ ...g.owners });
  const prevHousesRef = useRef<Record<number, number>>({ ...g.houses });
  const lastLogRef = useRef(g.log.at(-1)?.id ?? 0);
  const fxSeq = useRef(1);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReducedMotion(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const serverNow = now + game.clockOffset;
  const movement = g.movement;
  const moving = !!movement && serverNow < movement.endsAt;
  const rollInfo = g.roll ? { startedAt: g.roll.startedAt, ms: g.roll.ms }
    : movement?.kind === 'roll' ? { startedAt: movement.startedAt, ms: movement.delay } : null;
  const rollElapsed = rollInfo ? serverNow - rollInfo.startedAt : 1e9;
  const diceAnimating = !reducedMotion && !!rollInfo && rollElapsed >= 0 && rollElapsed < rollInfo.ms;
  const dicePhase: 'roll' | 'bounce' | 'reveal' = diceAnimating && rollInfo
    ? rollElapsed < rollInfo.ms - 600 ? 'roll' : rollElapsed < rollInfo.ms - 180 ? 'bounce' : 'reveal'
    : 'reveal';
  const fxEndsAt = Math.max(
    0,
    ...fx.map(fxEnd),
    ...announces.map((x) => x.end),
    cardFx ? cardFx.at + 3600 : 0,
  );
  const animationEndsAt = reducedMotion ? 0 : Math.max(
    movement?.endsAt ?? 0,
    rollInfo ? rollInfo.startedAt + rollInfo.ms : 0,
  );
  const animating = serverNow < animationEndsAt || (!reducedMotion && now < fxEndsAt);
  useEffect(() => {
    if (!animating) return;
    const tick = setInterval(() => setNow(Date.now()), 32);
    return () => clearInterval(tick);
  }, [animating, animationEndsAt, fxEndsAt]);

  /** Vị trí quân cờ theo pixel trên bàn (giữa ô); đang đi thì nội suy giữa hai ô liên tiếp và nhảy vòm. */
  // quân cờ đứng ở phần trên/trái của ô (che icon, chừa tên và giá cho dễ đọc)
  const cellMid = (i: number) => {
    const r = geo.rect[i];
    const sd = geo.side[i];
    // mũi ghim quân cờ cắm ở phần dưới ô, thân nổi lên trên
    if (sd === 'corner') return { x: r.x + r.w / 2, y: r.y + r.h * 0.62 };
    if (sd === 'top' || sd === 'bottom') return { x: r.x + r.w / 2, y: r.y + r.h * 0.72 };
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.9 };
  };;;
  const tokenMoveState = (id: string): { x: number; y: number; hop: number; active: boolean; stepCell: number | null; trail: Set<number> } => {
    const still = () => ({ ...cellMid(g.pos[id]), hop: 0, active: false, stepCell: null, trail: new Set<number>() });
    if (!movement || movement.playerId !== id || serverNow >= movement.endsAt || reducedMotion) return still();
    const delay = movement.delay;
    const elapsed = serverNow - movement.startedAt - delay;
    if (elapsed <= 0 || !movement.path.length) {
      return { ...cellMid(movement.from), hop: 0, active: true, stepCell: movement.from, trail: new Set([movement.from]) };
    }
    const duration = Math.max(1, movement.endsAt - movement.startedAt - delay);
    const progress = Math.min(movement.path.length, (elapsed / duration) * movement.path.length);
    const step = Math.floor(progress);
    const sub = progress - step;
    const from = step === 0 ? movement.from : movement.path[step - 1];
    const to = movement.path[Math.min(step, movement.path.length - 1)];
    const a = cellMid(from);
    const b = cellMid(to);
    return {
      x: a.x + (b.x - a.x) * sub, y: a.y + (b.y - a.y) * sub,
      hop: Math.sin(sub * Math.PI) * 15, active: true, stepCell: to,
      trail: new Set<number>([movement.from, ...movement.path.slice(0, Math.min(movement.path.length, step + 1))]),
    };
  };
  const activeMovementState = movement && moving ? tokenMoveState(movement.playerId) : null;

  // ---- hiệu ứng theo sự kiện: so sánh ảnh chụp trạng thái mới với lần trước ----
  const wealthRectOf = (id: string): Rect => {
    const r = layout.wealth[Math.max(0, g.order.indexOf(id))] ?? layout.wealth[0];
    return { x: geo.center.x + 3 + r.x, y: geo.center.y + 3 + r.y, w: r.w, h: r.h };
  };
  const msUntilArrive = () => Math.max(0, movement ? movement.endsAt - (clockNow() + game.clockOffset) : 0, g.roll ? g.roll.startedAt + g.roll.ms - (clockNow() + game.clockOffset) : 0);
  const msUntilReach = (cell: number) => {
    if (!movement) return 0;
    const idx = movement.path.indexOf(cell);
    if (idx < 0) return msUntilArrive();
    const delay = movement.delay;
    const reach = movement.startedAt + delay + ((idx + 1) / movement.path.length) * (movement.endsAt - movement.startedAt - delay);
    return Math.max(0, reach - (clockNow() + game.clockOffset));
  };
  const snapKey = `${g.log.at(-1)?.id ?? 0}|${g.order.map((id) => `${id}:${g.cash[id] ?? 0}`).join(',')}|${TYPHU_BOARD.map((_, i) => `${g.owners[i] ?? ''}:${g.houses[i] ?? 0}`).join(',')}|${g.card?.id ?? 0}`;
  useOnChange(snapKey, () => {
    const t0 = clockNow();
    const seqId = () => fxSeq.current++;
    const adds: Fx[] = [];
    const later = (ms: number, fn: () => void) => { if (ms <= 0) fn(); else setTimeout(fn, ms); };
    // tiền
    const deltas: Record<string, number> = {};
    for (const id of g.order) {
      const cur = g.cash[id] ?? 0;
      const old = prevCashRef.current[id];
      if (old !== undefined && cur !== old) deltas[id] = cur - old;
      prevCashRef.current[id] = cur;
    }
    const consumed = new Set<string>();
    const newLogs = g.log.filter((l) => l.id > lastLogRef.current);
    if (newLogs.length) lastLogRef.current = newLogs[newLogs.length - 1].id;
    const bankruptNow = newLogs.some((l) => l.kind === 'bankrupt');
    // thông báo lớn: xếp hàng nối đuôi nhau, không chồng lên nhau
    const anns: Announce[] = [];
    const SOUND: Record<Announce['kind'], Parameters<typeof play>[0]> = { buy: 'stamp', reward: 'win', loss: 'sad', build: 'cash', bankrupt: 'boom' };
    const announce = (kind: Announce['kind'], at: number, data: Omit<Announce, 'id' | 'kind' | 'start' | 'end'>) => {
      const start = Math.max(at, lastAnnEnd.current);
      const dur = Math.round(ANNOUNCE_MS[kind] * (start > at + 800 ? 0.72 : 1));
      lastAnnEnd.current = start + dur + 100;
      anns.push({ id: seqId(), kind, start, end: start + dur, ...data });
      later(start - t0, () => play(SOUND[kind]));
    };
    const idOfName = (text: string) => Object.keys(g.names).find((id) => text.startsWith(g.names[id]));
    const cur = g.currentPlayerId ?? '';
    // đất & nhà
    for (let i = 0; i < TYPHU_BOARD.length; i++) {
      const owner = g.owners[i];
      const houses = g.houses[i] ?? 0;
      const cell = TYPHU_BOARD[i];
      if (owner && prevOwnersRef.current[i] !== owner && !bankruptNow) {
        adds.push({ k: 'stamp', id: seqId(), at: t0, cell: i, text: 'ĐÃ MUA!', color: colorOf(owner) });
        const price = isTyPhuProperty(cell) ? cell.price : 0;
        announce('buy', t0, {
          title: cell.name, sub: `${nameOf(owner)} · ${fmt(price)} xu`, amount: price, portrait: portraitUriOf(owner), color: colorOf(owner), icon: ICON_BY_CELL[i],
        });
      } else if (owner && houses > (prevHousesRef.current[i] ?? 0)) {
        adds.push({ k: 'build', id: seqId(), at: t0, cell: i, level: houses });
        announce('build', t0, {
          title: houses >= TYPHU_MAX_HOUSES ? 'Lên khách sạn!' : `Xây nhà cấp ${houses}!`, sub: `${nameOf(owner)} · ${cell.name}`, level: houses, color: colorOf(owner),
        });
      }
      prevOwnersRef.current[i] = owner ?? '';
      prevHousesRef.current[i] = houses;
    }
    for (const l of newLogs) {
      const mine = l.text.startsWith(g.names[me] ?? '\u0000');
      const who = idOfName(l.text) ?? cur;
      if (l.kind === 'rent') {
        const ids = Object.keys(deltas);
        const payer = ids.find((id) => deltas[id] < 0);
        const taker = ids.find((id) => deltas[id] > 0);
        const delay = msUntilArrive();
        if (payer && taker) {
          consumed.add(payer); consumed.add(taker);
          adds.push({ k: 'rent', id: seqId(), at: t0 + delay, from: wealthRectOf(payer), to: wealthRectOf(taker), fromId: payer, toId: taker, amount: deltas[taker] });
          const cellName = TYPHU_BOARD[g.pos[payer]]?.name ?? '';
          if (taker === me) {
            announce('reward', t0 + delay, { title: `${nameOf(payer)} trả tiền thuê ${cellName}`, amount: deltas[taker], portrait: portraitUriOf(taker), color: colorOf(taker) });
          } else {
            announce('loss', t0 + delay, { title: payer === me ? `Bạn trả tiền thuê ${cellName}` : `${nameOf(payer)} trả tiền thuê ${cellName}`, sub: `cho ${nameOf(taker)}`, amount: -deltas[taker], portrait: portraitUriOf(payer), color: colorOf(payer) });
          }
        }
      } else if (l.kind === 'start') {
        announce('reward', t0 + msUntilReach(0), { title: `${nameOf(who)} qua Xuất phát`, amount: 200, portrait: portraitUriOf(who), color: colorOf(who) });
      } else if (l.kind === 'card') {
        const d = deltas[cur];
        const text = g.card?.text ?? l.text;
        if (d > 0) announce('reward', t0 + msUntilArrive() + 900, { title: 'Thẻ may mắn!', sub: text, amount: d, portrait: portraitUriOf(cur), color: colorOf(cur) });
        else if (d < 0) announce('loss', t0 + msUntilArrive() + 900, { title: 'Thẻ xui xẻo!', sub: text, amount: d, portrait: portraitUriOf(cur), color: colorOf(cur) });
      } else if (l.kind === 'tax') {
        const d = deltas[who];
        announce('loss', t0 + msUntilArrive(), { title: l.text.replace(`${g.names[who] ?? ''} `, ''), amount: d ?? 0, portrait: portraitUriOf(who), color: colorOf(who) });
      } else if (l.kind === 'jail' && l.text.includes('vào tù')) {
        const delay = msUntilArrive();
        adds.push({ k: 'jail', id: seqId(), at: t0 + delay, cell: TYPHU_JAIL });
        announce('loss', t0 + delay, { title: 'VÀO TÙ!', sub: l.text.replace(`${g.names[who] ?? ''} `, ''), portrait: portraitUriOf(who), color: colorOf(who) });
        later(delay, () => play('siren'));
        feed(l.text, 'bad');
        if (mine) shake();
      } else if (l.kind === 'bankrupt') {
        announce('bankrupt', t0 + msUntilArrive(), { title: l.text, portrait: portraitUriOf(who), color: colorOf(who) });
        feed(l.text, 'bad');
      }
    }
    if (anns.length && !reducedMotion) setAnnounces((old) => [...old.filter((x) => x.end > t0), ...anns]);
    for (const [id, delta] of Object.entries(deltas)) {
      if (consumed.has(id)) continue;
      adds.push({ k: 'float', id: seqId(), at: t0 + msUntilArrive(), at2: wealthRectOf(id), who: id, delta });
    }
    if (g.card && g.card.id !== (cardFx?.id ?? 0)) {
      const kindCell = TYPHU_BOARD[movement?.kind === 'card' ? movement.from : g.pos[g.currentPlayerId ?? ''] ?? 0];
      const delay = msUntilArrive();
      setCardFx({ id: g.card.id, text: g.card.text, title: kindCell?.kind === 'community' ? 'KHÍ VẬN' : 'CƠ HỘI', at: t0 + delay });
      later(delay, () => play('flip'));
    }
    if (adds.length && !reducedMotion) setFx((old) => [...old.filter((f) => fxEnd(f) > t0), ...adds]);
    setNow(t0);
  });
  useOnChange(g.rollId, () => {
    setNow(clockNow());
    play('dice');
  });
  useOnChange(myTurn && g.step === 'roll', (turnNow) => {
    if (turnNow) {
      play('turn');
      vibrate();
    }
  });

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
        ? pending && isTyPhuProperty(pending) ? `Mua ${pending.name} giá ${fmt(pending.price)} xu?` : 'Mua miếng đất này không?'
        : g.step === 'manage'
          ? 'Chạm vào đất của bạn để xây nhà'
          : 'Chờ chút…'
    : `Lượt của ${curName}`;

  const d = detail !== null ? TYPHU_BOARD[detail] : null;
  const landscape = true;
  const buyable = !moving && myTurn && g.step === 'buy' && pending && isTyPhuProperty(pending) ? pending : null;

  const activeAnn = reducedMotion ? null : announces.find((x) => now >= x.start && now < x.end) ?? null;

  // thẻ tài sản nháy xanh/đỏ khi vừa nhận/mất tiền
  const flash: Record<string, 'gain' | 'loss'> = {};
  for (const f of fx) {
    if (now < f.at || now > f.at + 1100) continue;
    if (f.k === 'rent') { flash[f.fromId] = 'loss'; flash[f.toId] = 'gain'; }
    if (f.k === 'float') flash[f.who] = f.delta > 0 ? 'gain' : 'loss';
  }

  // quân cờ: chia chỗ khi nhiều người chung một ô
  const alive = g.order.filter((id) => !g.bankrupt.includes(id));
  const offsetsFor = (n: number, size: number, cellW: number): [number, number][] => {
    const dx = Math.min(size * 0.5, cellW * 0.32);
    const dy = size * 0.3;
    if (n === 1) return [[0, 0]];
    if (n === 2) return [[-dx, 0], [dx, 0]];
    if (n === 3) return [[-dx, -dy], [dx, -dy], [0, dy]];
    return [[-dx, -dy], [dx, -dy], [-dx, dy], [dx, dy]];
  };

  return (
    <Shell
      wide
      fullscreen
      hideStrip
      bare
      overlay={activeAnn ? <TyPhuAnnounce a={activeAnn} now={now} W={width} H={height} /> : undefined}
      scroll={false}
      game={game}
      room={room}
      strip={{
        order: g.order,
        active: g.currentPlayerId,
        dim: (p) => g.bankrupt.includes(p.id),
        ring: (p) => (g.order.includes(p.id) ? colorOf(p.id) : undefined),
        sub: (p) =>
          g.bankrupt.includes(p.id) ? 'phá sản' : p.id in g.cash ? `${fmt(g.cash[p.id])} xu${p.id in g.jail ? ' (tù)' : ''}` : undefined,
      }}
    >
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
            { width: boardW, height: boardH, transform: [{ perspective: TILT_PERSP }, { translateY: tilt.dy }, { rotateX: `${TILT_DEG}deg` }] },
          ]}
        >
          {/* 40 ô (memo: chỉ vẽ lại khi ô đó đổi) */}
          {TYPHU_BOARD.map((_, i) => {
            const owner = g.owners[i];
            const r = geo.rect[i];
            return (
              <TyPhuCell
                key={i}
                index={i}
                x={r.x}
                y={r.y}
                w={r.w}
                h={r.h}
                side={geo.side[i]}
                ownerName={owner ? nameOf(owner) : null}
                ownerHex={owner ? colorOf(owner) : null}
                ownerLight={owner ? lightColorOf(owner) : null}
                ownerPortrait={owner ? portraitUriOf(owner) : null}
                houses={g.houses[i] ?? 0}
                here={g.pendingBuy === i}
                isTrail={activeMovementState?.trail.has(i) ?? false}
                isStepTarget={activeMovementState?.stepCell === i}
                onPress={setDetail}
              />
            );
          })}

          {/* TRUNG TÂM: người đang chơi, xúc xắc, nút, tài sản, đất của tôi, diễn biến */}
          <View style={[styles.center, { left: geo.center.x + 1.5, top: geo.center.y + 1.5, width: geo.center.w - 3, height: geo.center.h - 3 }]}>
            <View style={{ position: 'absolute', left: 3, top: 3, width: geo.center.w - 9, height: geo.center.h - 9 }}>
              <TyPhuCenter
                layout={layout}
                size={{ w: geo.center.w - 6, h: geo.center.h - 6 }}
                g={g}
                me={me}
                now={now}
                nameOf={nameOf}
                colorOf={colorOf}
                lightColorOf={lightColorOf}
                portraitUriOf={portraitUriOf}
                status={status}
                myTurn={myTurn}
                moving={moving}
                inJail={inJail}
                buyable={buyable ? { name: buyable.name, price: buyable.price } : null}
                left={left}
                paused={g.step === 'wait' || moving || diceAnimating}
                dice={{ phase: dicePhase, animating: diceAnimating, elapsed: rollElapsed }}
                playback={playback}
                clockOffset={game.clockOffset}
                onThrow={(impulse) => void act({ type: 'roll', impulse })}
                flash={flash}
                card={cardFx}
                reducedMotion={reducedMotion}
                error={error}
                isHost={isHost}
                onEnd={() => setEnding(true)}
                onAct={(a) => void act({ type: a })}
                onCell={setDetail}
                onPlayer={(id) => { if (id !== me) setThrowAt(id); }}
              />
            </View>
          </View>

          {/* quân cờ */}
          {alive.map((id) => {
            const st = tokenMoveState(id);
            const here = alive.filter((o) => g.pos[o] === g.pos[id]);
            const stacked = !st.active && here.length > 1;
            const size = pawnBase * (stacked ? 0.84 : 1);
            const off = stacked ? offsetsFor(Math.min(4, here.length), size, geo.rect[g.pos[id]].w)[Math.min(3, here.indexOf(id))] : [0, 0];
            return (
              <Pawn
                key={id}
                testID={`token-${id}`}
                label={`${nameOf(id)}, ô ${g.pos[id] + 1}`}
                uri={portraitUriOf(id)}
                color={colorOf(id)}
                light={lightColorOf(id)}
                x={st.x + off[0]}
                y={st.y + off[1]}
                size={size}
                hop={st.hop}
                active={id === g.currentPlayerId}
                moving={st.active}
              />
            );
          })}

          <TyPhuFxLayer fx={reducedMotion ? [] : fx} now={now} cells={geo.rect} W={boardW} H={boardH} center={geo.center} />
        </View>

        {/* bảng thông tin nổi khi tới ô mua được hoặc được xây nhà (không nghiêng theo bàn) */}
        {myTurn && !moving && !activeAnn && (g.step === 'buy' || g.step === 'manage') && (
          <DecisionCard
            g={g}
            me={me}
            left={left}
            canBuild={canBuild}
            onAct={(a) => void act(a)}
          />
        )}
      </View>

      {d && detail !== null && (
        <Sheet title={d.name} onClose={() => setDetail(null)}>
          <View style={landscape ? styles.detailRow : undefined}>
            {TYPHU_PHOTOS[d.name] && (
              <Image
                source={{ uri: TYPHU_PHOTOS[d.name] }}
                style={[styles.detailPhoto, landscape ? styles.detailPhotoSide : styles.detailPhotoTop]}
                resizeMode="cover"
              />
            )}
            <View style={[{ gap: 8 }, landscape && { flex: 1 }]}>
              <View style={styles.detailIconRow}>
                <Image source={{ uri: ICON_BY_CELL[detail] }} style={styles.detailIcon} />
                <T style={styles.detailKind}>{d.kind === 'land' ? 'Địa danh' : d.kind === 'station' ? 'Nhà ga' : d.kind === 'utility' ? 'Tiện ích' : d.kind === 'tax' ? 'Thuế' : d.kind === 'chance' ? 'Cơ hội' : d.kind === 'community' ? 'Khí vận' : 'Ô đặc biệt'}</T>
              </View>
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
              {d.kind === 'tax' && `Dừng ở đây: -${fmt(d.amount)} xu.`}
            </T>
          )}
              <T style={styles.credit}>Nguồn icon/ảnh: icon Twemoji (CC-BY 4.0, jdecked/twemoji); ảnh địa danh từ Wikimedia Commons / Wikipedia.</T>
            </View>
          </View>
        </Sheet>
      )}

      {throwAt && playerById.get(throwAt) && (
        <ThrowSheet game={game} target={playerById.get(throwAt)!} onClose={() => setThrowAt(null)} />
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


const money = (n: number) => n.toLocaleString('vi-VN');

/** Thẻ quyết định kiểu "giấy chủ quyền": mua đất / bỏ qua, hoặc xây nhà, có đếm ngược. */
function DecisionCard(p: {
  g: TyPhuView;
  me: string;
  left: number;
  canBuild: (i: number) => boolean;
  onAct: (a: Parameters<Game['act']>[0]) => void;
}) {
  const { g } = p;
  const total = Math.max(1, g.turnSeconds);
  const hot = p.left <= 5;
  const timer = (
    <View style={dc.timerRow}>
      <View style={dc.track}><View style={{ height: '100%', width: `${Math.max(0, Math.min(1, p.left / total)) * 100}%`, backgroundColor: hot ? C.danger : C.jade }} /></View>
      <T style={[dc.secs, hot && { color: C.danger }]}>{p.left}s</T>
    </View>
  );
  if (g.step === 'buy' && g.pendingBuy !== null) {
    const i = g.pendingBuy;
    const c = TYPHU_BOARD[i];
    if (!isTyPhuProperty(c)) return null;
    const color = c.kind === 'land' ? TYPHU_GROUPS[c.group].color : '#495057';
    const rows: [string, number | string][] = c.kind === 'land'
      ? [['Đất trống', c.rent], ['Đủ bộ màu', c.rent * 2], ...TYPHU_HOUSE_MULT.map((m, k) => [k === 3 ? 'Khách sạn' : `Nhà cấp ${k + 1}`, c.rent * m] as [string, number])]
      : c.kind === 'station' ? [1, 2, 3, 4].map((n) => [`Có ${n} ga`, stationRent(n)] as [string, number])
      : [['Có 1 công ty', 'xúc xắc × 4'], ['Có 2 công ty', 'xúc xắc × 10']];
    const afford = (g.cash[p.me] ?? 0) >= c.price;
    return (
      <View style={dc.wrap} pointerEvents="box-none">
        <View style={dc.card}>
          <View style={[dc.head, { backgroundColor: color }]}>
            <T style={dc.headSub}>{c.kind === 'land' ? TYPHU_GROUPS[c.group].name.toUpperCase() : c.kind === 'station' ? 'NHÀ GA' : 'CÔNG TY'}</T>
            <T numberOfLines={1} style={dc.headName}>{c.name.toUpperCase()}</T>
          </View>
          <View style={dc.body}>
            {rows.map(([k, v]) => (
              <View key={k} style={dc.rentRow}><T style={dc.rentK}>{k}</T><T style={dc.rentV}>{typeof v === 'number' ? `${money(v)} xu` : v}</T></View>
            ))}
            {c.kind === 'land' && <T style={dc.note}>Mỗi nhà: -{money(TYPHU_GROUPS[c.group].house)} xu</T>}
            {timer}
            <View style={dc.btns}>
              <Button testID="skip-btn" small variant="paper" title="Bỏ qua" style={{ flex: 1 }} onPress={() => p.onAct({ type: 'skip' })} />
              <Button testID="buy-btn" small variant="jade" disabled={!afford} title={`Mua -${money(c.price)}`} style={{ flex: 1.3 }} onPress={() => p.onAct({ type: 'buy' })} />
            </View>
          </View>
        </View>
      </View>
    );
  }
  if (g.step === 'manage') {
    const cells = TYPHU_BOARD.flatMap((c, i) => (c.kind === 'land' && p.canBuild(i) ? [i] : []));
    return (
      <View style={dc.wrap} pointerEvents="box-none">
        <View style={dc.card}>
          <View style={[dc.head, { backgroundColor: '#2F9E44' }]}>
            <T style={dc.headSub}>LƯỢT CỦA BẠN</T>
            <T style={dc.headName}>NÂNG CẤP NHÀ</T>
          </View>
          <View style={dc.body}>
            {cells.length === 0 && <T style={dc.note}>Chưa đủ tiền để xây thêm.</T>}
            <ScrollView style={{ maxHeight: 132 }} contentContainerStyle={{ gap: 2 }}>
            {cells.map((i) => {
              const c = TYPHU_BOARD[i];
              if (c.kind !== 'land') return null;
              const h = g.houses[i] ?? 0;
              const next = h + 1 >= TYPHU_MAX_HOUSES ? 'Khách sạn' : `Nhà cấp ${h + 1}`;
              return (
                <View key={i} style={dc.buildRow}>
                  <View style={[dc.dot, { backgroundColor: TYPHU_GROUPS[c.group].color }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T numberOfLines={1} style={dc.rentV}>{c.name}</T>
                    <T style={dc.rentK}>{h === 0 ? 'Đất trống' : `Nhà cấp ${h}`} → {next}</T>
                  </View>
                  <Button testID={`build-${i}`} small variant="gold" title={`Xây -${money(TYPHU_GROUPS[c.group].house)}`} style={{ minHeight: 30, paddingVertical: 2 }} onPress={() => p.onAct({ type: 'build', cell: i })} />
                </View>
              );
            })}
            </ScrollView>
            {timer}
            <Button testID="end-turn" small variant="ink" title="Xong lượt" onPress={() => p.onAct({ type: 'endTurn' })} />
          </View>
        </View>
      </View>
    );
  }
  return null;
}

const dc = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 40, backgroundColor: 'rgba(0,0,0,0.25)' },
  card: { width: 260, backgroundColor: '#FFFDF6', borderRadius: 12, borderWidth: 2.5, borderColor: '#111', overflow: 'hidden', boxShadow: '0px 10px 24px rgba(0,0,0,0.4)' },
  head: { paddingVertical: 6, alignItems: 'center', borderBottomWidth: 2, borderColor: '#111' },
  headSub: { color: '#fff', fontSize: 10, lineHeight: 13, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
  headName: { color: '#fff', fontSize: 17, lineHeight: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 3 },
  body: { padding: 8, gap: 3 },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rentK: { fontSize: 11, lineHeight: 15, color: C.muted, fontWeight: '700' },
  rentV: { fontSize: 12, lineHeight: 16, color: '#111', fontWeight: '800' },
  note: { fontSize: 11, lineHeight: 15, color: C.muted, textAlign: 'center' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  track: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#E9ECEF', overflow: 'hidden', borderWidth: 1, borderColor: '#111' },
  secs: { fontSize: 13, lineHeight: 16, fontWeight: '900', color: '#111', minWidth: 28, textAlign: 'right' },
  btns: { flexDirection: 'row', gap: 6, marginTop: 4 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 1 },
  dot: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: '#111' },
});

/** góc nghiêng bàn cờ 3D (nhìn từ phía người chơi) */
const TILT_DEG = 36;
const TILT_PERSP = 1100;
/** Tìm cạnh bàn vuông lớn nhất mà sau khi nghiêng 3D vẫn lọt khung, kèm độ dời để hình chiếu nằm giữa. */
function fitTilted(availW: number, availH: number): { S: number; dy: number } {
  const th = (TILT_DEG * Math.PI) / 180;
  const proj = (S: number) => {
    const a = S / 2;
    const st = TILT_PERSP / (TILT_PERSP + a * Math.sin(th));
    const sb = TILT_PERSP / (TILT_PERSP - a * Math.sin(th));
    return { h: a * Math.cos(th) * (st + sb), w: S * sb, dy: -(a * Math.cos(th) * (sb - st)) / 2 };
  };
  let lo = 200;
  let hi = 2000;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    const pr = proj(mid);
    if (pr.h <= availH - 4 && pr.w <= availW - 4) lo = mid; else hi = mid;
  }
  const S = Math.floor(lo);
  return { S, dy: proj(S).dy };
}

const styles = StyleSheet.create({
  stageWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  board: { backgroundColor: '#CDE6D0', borderWidth: 2, borderColor: '#111', position: 'relative', boxShadow: '0px 18px 24px rgba(0,0,0,0.35)' },
  center: {
    position: 'absolute', zIndex: 4,
  },
  detailPhoto: { borderRadius: 12, borderWidth: 2, borderColor: C.ink },
  // ảnh gốc 116x80: chỉ phóng tối đa ~1,7 lần
  detailPhotoTop: { width: 197, height: 136, alignSelf: 'center', marginBottom: 8 },
  detailPhotoSide: { width: 140, height: 97 },
  detailRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  detailIconRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailIcon: { width: 44, height: 44 },
  detailKind: { fontWeight: '800', color: C.muted },
  credit: { fontSize: 11, color: C.muted, marginTop: 4 },
  detailBand: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 2, borderColor: C.ink },
  detailGroup: { color: '#fff', fontWeight: '900' },
  rents: { backgroundColor: C.mist, borderRadius: 12, padding: 10, gap: 3 },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
