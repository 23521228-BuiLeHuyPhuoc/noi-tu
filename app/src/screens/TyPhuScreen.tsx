import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
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
  const speed = Math.max(1, Math.min(3, g.speed ?? 1));
  // bấm x1/x2/x3 liên tiếp nhanh: tính mức kế tiếp từ lần bấm trước, không chờ server trả về
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  const layout = useMemo(
    () => makeCenterLayout(geo.center.w - 6, geo.center.h - 6, Math.max(1, g.order.length), hasCard),
    [geo, g.order.length, hasCard],
  );
  const pawnBase = Math.max(18, Math.min(26, geo.wm * 0.66));

  const [now, setNow] = useState(() => Date.now());
  const [playback, setPlayback] = useState<DiceRollView | null>(g.roll);
  if (g.roll && g.roll !== playback) setPlayback(g.roll);
  else if (!g.roll && playback && playback.id !== g.rollId) setPlayback(null);
  const [announces, setAnnounces] = useState<Announce[]>([]);
  const lastAnnEnd = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [cardFx, setCardFx] = useState<CardFx | null>(null);
  const prevCashRef = useRef<Record<string, number>>({ ...g.cash });
  const [reacts, setReacts] = useState<Record<string, Reaction>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
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
  const rollElapsed = rollInfo ? Math.max(0, serverNow - rollInfo.startedAt) : 1e9;
  const diceAnimating = !reducedMotion && !!rollInfo && rollElapsed < rollInfo.ms;
  const dicePhase: 'roll' | 'bounce' | 'reveal' = diceAnimating && rollInfo
    ? rollElapsed < rollInfo.ms - 600 ? 'roll' : rollElapsed < rollInfo.ms - 180 ? 'bounce' : 'reveal'
    : 'reveal';
  const fxEndsAt = Math.max(
    0,
    ...fx.map(fxEnd),
    ...announces.map((x) => x.end),
    cardFx ? cardFx.at + Math.round(2200 / speed) : 0,
    ...Object.values(reacts).map((r) => r.until),
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
    // đặt mặt quân cờ (vòng tròn avatar) nằm giữa ô để nhìn rõ quân đang ở ô nào; mũi ghim nhô xuống dưới
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 + pawnBase * 0.24 };
  };
  const tokenMoveState = (id: string): { x: number; y: number; hop: number; active: boolean; stepCell: number | null; trail: Set<number>; visualCell: number } => {
    const still = (cell = g.pos[id]) => ({ ...cellMid(cell), hop: 0, active: false, stepCell: null, trail: new Set<number>(), visualCell: cell });
    if (!movement || movement.playerId !== id || serverNow >= movement.endsAt || reducedMotion) return still();
    const delay = movement.delay;
    const elapsed = serverNow - movement.startedAt - delay;
    if (elapsed <= 0 || !movement.path.length) {
      return still(movement.from);
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
      visualCell: -1,
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
    // thông báo lớn: chỉ hiện cho người liên quan và hiện nhanh, xếp hàng nối đuôi nhau
    const anns: Announce[] = [];
    const SOUND: Record<Announce['kind'], Parameters<typeof play>[0]> = { buy: 'stamp', reward: 'win', loss: 'sad', build: 'cash', bankrupt: 'boom' };
    const announce = (kind: Announce['kind'], at: number, data: Omit<Announce, 'id' | 'kind' | 'start' | 'end'>) => {
      const start = Math.max(at, lastAnnEnd.current);
      const dur = Math.round((ANNOUNCE_MS[kind] / speed) * (start > at + 500 ? 0.72 : 1));
      lastAnnEnd.current = start + dur + 60;
      anns.push({ id: seqId(), kind, start, end: start + dur, ...data });
      later(start - t0, () => play(SOUND[kind]));
    };
    // khớp tên dài trước ("An 2" trước "An") và phải theo sau bởi khoảng trắng để tránh trùng tiền tố
    const sortedIds = Object.keys(g.names).sort((a, b) => (g.names[b]?.length ?? 0) - (g.names[a]?.length ?? 0));
    const idOfName = (text: string) => sortedIds.find((id) => {
      const name = g.names[id];
      return !!name && (text === name || text.startsWith(`${name} `) || text.startsWith(`${name},`));
    });
    const parseXu = (s: string): number | null => {
      const m = s.match(/([\d.]+)\s*xu/);
      if (!m) return null;
      const n = Number(m[1].replace(/\./g, ''));
      return Number.isFinite(n) ? n : null;
    };
    const cur = g.currentPlayerId ?? '';
    const passedStartIds = new Set(newLogs.filter((l) => l.kind === 'start').map((l) => idOfName(l.text) ?? cur));
    // đất & nhà
    for (let i = 0; i < TYPHU_BOARD.length; i++) {
      const owner = g.owners[i];
      const houses = g.houses[i] ?? 0;
      const cell = TYPHU_BOARD[i];
      if (owner && prevOwnersRef.current[i] !== owner && !bankruptNow) {
        adds.push({ k: 'stamp', id: seqId(), at: t0, cell: i, text: 'ĐÃ MUA!', color: colorOf(owner) });
        const price = isTyPhuProperty(cell) ? cell.price : 0;
        // thông báo mua to chỉ hiện cho chính người mua; người khác chỉ thấy dấu "ĐÃ MUA" trên ô
        if (owner === me) announce('buy', t0, {
          title: cell.name, sub: `${nameOf(owner)} · ${fmt(price)} xu`, amount: price, portrait: portraitUriOf(owner), color: colorOf(owner), icon: ICON_BY_CELL[i],
        });
      } else if (owner && houses > (prevHousesRef.current[i] ?? 0)) {
        adds.push({ k: 'build', id: seqId(), at: t0, cell: i, level: houses });
        if (owner === me) announce('build', t0, {
          title: houses >= TYPHU_MAX_HOUSES ? 'Lên khách sạn!' : `Xây nhà cấp ${houses}!`, sub: `${nameOf(owner)} · ${cell.name}`, level: houses, color: colorOf(owner),
        });
      }
      prevOwnersRef.current[i] = owner ?? '';
      prevHousesRef.current[i] = houses;
    }
    for (const l of newLogs) {
      const who = idOfName(l.text) ?? cur;
      const mine = who === me;
      if (l.kind === 'rent') {
        const payer = who;
        const taker = sortedIds.find((id) => l.text.endsWith(` cho ${g.names[id]}`))
          ?? Object.keys(deltas).find((id) => id !== payer && deltas[id] > 0);
        const amount = parseXu(l.text) ?? (taker ? Math.abs(deltas[taker] ?? 0) : 0);
        const delay = msUntilArrive();
        if (payer && taker && amount > 0) {
          consumed.add(payer); consumed.add(taker);
          adds.push({ k: 'rent', id: seqId(), at: t0 + delay, from: wealthRectOf(payer), to: wealthRectOf(taker), fromId: payer, toId: taker, amount });
          const cellName = TYPHU_BOARD[g.pos[payer]]?.name ?? '';
          if (taker === me) {
            announce('reward', t0 + delay, { title: `${nameOf(payer)} trả tiền thuê ${cellName}`, amount, portrait: portraitUriOf(taker), color: colorOf(taker) });
          } else if (payer === me) {
            announce('loss', t0 + delay, { title: `Bạn trả tiền thuê ${cellName}`, sub: `cho ${nameOf(taker)}`, amount: -amount, portrait: portraitUriOf(payer), color: colorOf(payer) });
          }
        }
      } else if (l.kind === 'start') {
        const reach = t0 + msUntilReach(0);
        adds.push({ k: 'start', id: seqId(), at: reach });
        if (mine) {
          announce('reward', reach, { title: 'Qua Xuất phát!', amount: 200, portrait: portraitUriOf(who), color: colorOf(who) });
        }
      } else if (l.kind === 'card') {
        const text = g.card?.text ?? l.text;
        const parsed = parseXu(text) ?? 0;
        const netWho = (deltas[who] ?? 0) - (passedStartIds.has(who) ? 200 : 0);
        const cardDelta = /Nhận|thưởng|hoàn thuế|học bổng/i.test(text) ? parsed
          : /nộp phạt|tiêu|Viện phí/i.test(text) ? -parsed
          : netWho;
        const cardAt = t0 + (movement?.kind === 'card' ? 0 : msUntilArrive()) + Math.round(450 / speed);
        if (mine) {
          if (cardDelta > 0) announce('reward', cardAt, { title: 'Thẻ may mắn!', sub: text, amount: cardDelta, portrait: portraitUriOf(who), color: colorOf(who) });
          else if (cardDelta < 0) announce('loss', cardAt, { title: 'Thẻ xui xẻo!', sub: text, amount: cardDelta, portrait: portraitUriOf(who), color: colorOf(who) });
        } else if (/mỗi người/i.test(text) && (deltas[me] ?? 0) !== 0) {
          const myDelta = deltas[me];
          if (myDelta > 0) announce('reward', cardAt, { title: `${nameOf(who)} mừng cưới!`, sub: text, amount: myDelta, portrait: portraitUriOf(me), color: colorOf(me) });
          else if (myDelta < 0) announce('loss', cardAt, { title: `Mừng sinh nhật ${nameOf(who)}`, sub: text, amount: myDelta, portrait: portraitUriOf(me), color: colorOf(me) });
        }
      } else if (l.kind === 'tax') {
        const amount = -(parseXu(l.text) ?? Math.abs(deltas[who] ?? 0));
        if (mine) {
          announce('loss', t0 + msUntilArrive(), { title: TYPHU_BOARD[g.pos[who] ?? 0]?.name ?? 'Thuế', sub: 'Tiền vào hũ ở ô Nghỉ chân', amount, portrait: portraitUriOf(who), color: colorOf(who) });
        }
      } else if (l.kind === 'pot') {
        const amount = parseXu(l.text) ?? Math.max(0, deltas[who] ?? 0);
        if (mine) {
          announce('reward', t0 + msUntilArrive(), { title: 'Bạn ăn trọn hũ Nghỉ chân!', amount, portrait: portraitUriOf(who), color: colorOf(who) });
        }
      } else if (l.kind === 'jail' && l.text.includes('vào tù')) {
        const delay = msUntilArrive();
        adds.push({ k: 'jail', id: seqId(), at: t0 + delay, cell: TYPHU_JAIL });
        later(delay, () => play('siren'));
        feed(l.text, 'bad');
        if (mine) {
          announce('loss', t0 + delay, { title: 'VÀO TÙ!', sub: l.text.replace(`${g.names[who] ?? ''} `, ''), portrait: portraitUriOf(who), color: colorOf(who) });
          shake();
        }
      } else if (l.kind === 'bankrupt') {
        const delay = msUntilArrive();
        adds.push({ k: 'bankrupt', id: seqId(), at: t0 + delay, name: nameOf(who) });
        const creditorMe = !!g.names[me] && l.text.includes(`(chủ nợ: ${g.names[me]})`);
        if (mine || creditorMe) {
          announce('bankrupt', t0 + delay, { title: l.text, portrait: portraitUriOf(who), color: colorOf(who) });
        }
        feed(l.text, 'bad');
      }
    }
    // người chơi chửi thề khi mất tiền, sướng rơn khi được tiền
    // chỉ phản ứng khi mất/được tiền vì dừng ô, bị thu tiền thuê, thẻ, thuế; tự mua đất / xây nhà / nộp tiền ra tù thì không
    const spenders = new Set(
      newLogs
        .filter((l) => l.kind === 'buy' || l.kind === 'build' || (l.kind === 'jail' && l.text.includes('để ra tù')))
        .map((l) => idOfName(l.text))
        .filter(Boolean),
    );
    const liquidated = new Set(
      newLogs
        .filter((l) => l.kind === 'info' && l.text.includes('bán '))
        .map((l) => idOfName(l.text))
        .filter(Boolean),
    );
    const ids = Object.keys(deltas).filter((id) => !spenders.has(id));
    if (ids.length) {
      // nói sau khi thông báo to của sự kiện này tắt
      const start = anns.length && !reducedMotion ? Math.max(t0, lastAnnEnd.current - 250) : t0;
      const picked: Record<string, Reaction> = {};
      for (const id of ids) {
        const isLoss = deltas[id] < 0 || liquidated.has(id);
        const lines = isLoss ? REACT_LOSS : REACT_GAIN;
        picked[id] = { text: lines[(seqId() * 7 + Math.abs(deltas[id])) % lines.length], kind: isLoss ? 'loss' : 'gain', from: start, until: start + Math.round(2200 / speed) };
      }
      setReacts((o) => ({ ...o, ...picked }));
    }
    if (anns.length && !reducedMotion) setAnnounces((old) => [...old.filter((x) => x.end > t0), ...anns]);
    for (const [id, delta] of Object.entries(deltas)) {
      if (consumed.has(id)) continue;
      adds.push({ k: 'float', id: seqId(), at: t0 + msUntilArrive(), at2: wealthRectOf(id), who: id, delta });
    }
    if (g.card && g.card.id !== (cardFx?.id ?? 0)) {
      const kindCell = TYPHU_BOARD[movement?.kind === 'card' ? movement.from : g.pos[g.currentPlayerId ?? ''] ?? 0];
      const delay = movement?.kind === 'card' ? 0 : msUntilArrive();
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
      !moving && myTurn && g.step === 'upgrade' && g.pendingBuy === i && c.kind === 'land' && g.owners[i] === me &&
      (g.houses[i] ?? 0) < TYPHU_MAX_HOUSES && (g.cash[me] ?? 0) >= TYPHU_GROUPS[c.group].house
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
        : g.step === 'upgrade'
          ? 'Nâng cấp nhà ở đất của bạn?'
          : 'Chờ chút…'
    : g.step === 'roll' && g.extraRoll ? `${curName} đổ đôi, được tung tiếp 🎲` : `Lượt của ${curName}`;

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

  // quân cờ: chia chỗ khi nhiều người chung một ô (hỗ trợ tối đa 6 người)
  const alive = g.order.filter((id) => !g.bankrupt.includes(id));
  const moveStates = Object.fromEntries(alive.map((id) => [id, tokenMoveState(id)]));
  const isParticipant = g.order.includes(me);
  const canChangeSpeed = isParticipant && !g.bankrupt.includes(me);
  const offsetsFor = (n: number, size: number, cellW: number): [number, number][] => {
    const dx = Math.min(size * 0.5, cellW * 0.32);
    const dy = size * 0.3;
    if (n === 1) return [[0, 0]];
    if (n === 2) return [[-dx, 0], [dx, 0]];
    if (n === 3) return [[-dx, -dy], [dx, -dy], [0, dy]];
    if (n === 4) return [[-dx, -dy], [dx, -dy], [-dx, dy], [dx, dy]];
    const dx3 = Math.min(size * 0.56, cellW * 0.36);
    if (n === 5) return [[-dx3, -dy], [0, -dy], [dx3, -dy], [-dx * 0.7, dy], [dx * 0.7, dy]];
    return [[-dx3, -dy], [0, -dy], [dx3, -dy], [-dx3, dy], [0, dy], [dx3, dy]];
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
                pot={TYPHU_BOARD[i].kind === 'rest' ? g.pot ?? 0 : undefined}
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
                reacts={reacts}
                card={cardFx}
                reducedMotion={reducedMotion}
                error={error}
                isHost={isHost}
                onEnd={() => setEnding(true)}
                onAct={(a) => void act({ type: a })}
                speed={speed}
                onRules={() => setRulesOpen(true)}
                onSpeed={canChangeSpeed ? () => { const next = speedRef.current >= 3 ? 1 : speedRef.current + 1; speedRef.current = next; void act({ type: 'speed', value: next }); } : undefined}
                onCell={setDetail}
                onPlayer={(id) => { if (isParticipant && id !== me) setThrowAt(id); }}
              />
            </View>
          </View>

          {/* quân cờ */}
          {alive.map((id) => {
            const st = moveStates[id];
            const here = st.visualCell >= 0 ? alive.filter((o) => moveStates[o].visualCell === st.visualCell) : [id];
            const stacked = !st.active && here.length > 1;
            const size = pawnBase * (stacked ? (here.length > 4 ? 0.76 : 0.84) : 1);
            const cellRect = geo.rect[st.visualCell >= 0 ? st.visualCell : g.pos[id]];
            const off = stacked ? offsetsFor(Math.min(6, here.length), size, cellRect.w)[Math.min(5, here.indexOf(id))] : [0, 0];
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
        {myTurn && !moving && !activeAnn && detail === null && (g.step === 'buy' || g.step === 'upgrade') && (
          <DecisionCard
            g={g}
            me={me}
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
                  onPress={() => { void act({ type: 'build', cell: detail }).then((ok) => { if (ok) setDetail(null); }); }}
                />
              )}
            </View>
          ) : d.kind === 'station' || d.kind === 'utility' ? (
            <View style={{ gap: 10 }}>
              <T>Giá mua: {fmt(d.price)} xu</T>
              <T>Chủ: {g.owners[detail] ? nameOf(g.owners[detail]) : 'Chưa có'}</T>
              <T>
                {d.kind === 'station'
                  ? 'Tiền thuê theo số ga sở hữu: 50 / 100 / 200 / 400 xu.'
                  : 'Tiền thuê: tổng xúc xắc × 8; sở hữu cả hai công ty: × 20.'}
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

      {rulesOpen && (
        <Sheet title="Luật chơi Cờ tỷ phú" onClose={() => setRulesOpen(false)}>
          {RULES.map((r) => <T key={r} style={{ fontSize: 13, lineHeight: 19 }}>• {r}</T>)}
          <Button title="Đã hiểu" variant="ink" onPress={() => setRulesOpen(false)} />
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


export type Reaction = { text: string; kind: 'gain' | 'loss'; from: number; until: number };
const REACT_LOSS = [
  'Đ*t! Cay vãi 🤬', 'Mẹ nó, mất tiền rồi! 😡', 'Đ* má, xui vãi 🤬', 'Đ*o chịu nổi! 😤', 'Cay như ớt hiểm 🌶️',
  'Trời ơi tiền của tui 😭', 'Vãi c*, nghèo rồi 😩', 'Ức chế vãi chưởng 😤', 'Thôi xong, đ*t mẹ 🤬',
];
const REACT_GAIN = [
  'Phê vãi! 🤑', 'Sướng vãi chưởng 😎', 'Sướng vãi l*n 🤑', 'Tiền về, phê pha 💸', 'Sướng tê người 😍',
  'Giàu rồi anh em ơi! 🤑', 'Ngon lành cành đào 😎', 'Phê như con tê tê 🤤',
];

const RULES = [
  'Mỗi người có 1.500 xu. Đổ 2 xúc xắc rồi đi theo chiều kim đồng hồ.',
  'Đổ đôi được tung thêm lượt; đổ đôi 3 lần liên tiếp thì vào tù.',
  'Đi vượt qua Xuất phát được +200 xu; dừng đúng ô Xuất phát thì không được thưởng.',
  'Dừng ở đất chưa ai mua: được mua. Dừng ở đất người khác: trả tiền thuê (đủ bộ màu mà đất trống thì thuê x2).',
  'Dừng ở đất của mình: nâng lên đúng 1 cấp (nhà cấp 1 → 2 → 3 → khách sạn). Lần sau dừng lại mới nâng tiếp.',
  'Tiền thuê đất trống bằng 3/4 giá đất; mỗi cấp nhà tăng mạnh (cấp 1 x2, cấp 2 x4, cấp 3 x6, khách sạn x9).',
  'Ga: thuê 50/100/200/400 theo số ga cùng chủ. Công ty điện, nước: tổng xúc xắc × 8, có cả hai thì × 20.',
  'Thuế và tiền phạt dồn vào hũ ở ô Nghỉ chân; ai dừng ở đó ăn cả hũ.',
  'Vào tù: đổ đôi để ra (đi luôn nhưng không tung thêm), hoặc trả 50 xu trước khi đổ; ngồi đủ 3 lượt thì trả 50 rồi đi.',
  'Thiếu tiền: tự bán nhà rồi bán đất với nửa giá. Vẫn thiếu thì phá sản; nợ người chơi thì người đó nhận hết đất.',
  'Thắng luôn khi: có đủ 4 ga, hoặc mọi ô đất trên một cạnh bàn, hoặc 3 bộ màu. Không thì người cuối cùng còn trụ lại thắng.',
  'Nút x1/x2/x3 chỉnh tốc độ cho cả bàn. Chủ phòng có thể Tổng kết sớm: xếp theo tổng tài sản.',
];

const money = (n: number) => n.toLocaleString('vi-VN');

/** Thẻ quyết định kiểu "giấy chủ quyền": mua đất / bỏ qua, hoặc xây nhà, có đếm ngược. */
function DecisionCard(p: {
  g: TyPhuView;
  me: string;
  canBuild: (i: number) => boolean;
  onAct: (a: Parameters<Game['act']>[0]) => void;
}) {
  const { g } = p;
  if (g.step === 'buy' && g.pendingBuy !== null) {
    const i = g.pendingBuy;
    const c = TYPHU_BOARD[i];
    if (!isTyPhuProperty(c)) return null;
    const color = c.kind === 'land' ? TYPHU_GROUPS[c.group].color : '#495057';
    const rows: [string, number | string][] = c.kind === 'land'
      ? [['Đất trống', c.rent], ['Đủ bộ màu', c.rent * 2], ...TYPHU_HOUSE_MULT.map((m, k) => [k === 3 ? 'Khách sạn' : `Nhà cấp ${k + 1}`, c.rent * m] as [string, number])]
      : c.kind === 'station' ? [1, 2, 3, 4].map((n) => [`Có ${n} ga`, stationRent(n)] as [string, number])
      : [['Có 1 công ty', 'xúc xắc × 8'], ['Có 2 công ty', 'xúc xắc × 20']];
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
            {c.kind === 'land' && <T style={dc.note}>Mỗi lần nâng nhà: -{money(TYPHU_GROUPS[c.group].house)} xu</T>}
            <View testID="decision-cash" style={dc.cashBox}>
              <View style={dc.rentRow}><T style={dc.cashK}>Bạn đang có</T><T style={dc.cashV}>{money(g.cash[p.me] ?? 0)} xu</T></View>
              <View style={dc.rentRow}><T style={dc.cashK}>Mua xong còn</T><T style={[dc.cashV, !afford && { color: C.danger }]}>{money((g.cash[p.me] ?? 0) - c.price)} xu</T></View>
            </View>
            <View style={dc.btns}>
              <Button testID="skip-btn" small variant="paper" title="Bỏ qua" style={{ flex: 1 }} onPress={() => p.onAct({ type: 'skip' })} />
              <Button testID="buy-btn" small variant="jade" disabled={!afford} title={`Mua -${money(c.price)}`} style={{ flex: 1.3 }} onPress={() => p.onAct({ type: 'buy' })} />
            </View>
          </View>
        </View>
      </View>
    );
  }
  if (g.step === 'upgrade' && g.pendingBuy !== null) {
    const i = g.pendingBuy;
    const c = TYPHU_BOARD[i];
    if (c.kind !== 'land') return null;
    const h = g.houses[i] ?? 0;
    const cost = TYPHU_GROUPS[c.group].house;
    const cash = g.cash[p.me] ?? 0;
    const full = groupCells(c.group).every((x) => g.owners[x] === p.me);
    // mỗi lần dừng chỉ lên đúng 1 cấp: đất trống -> cấp 1 -> cấp 2 -> cấp 3 -> khách sạn
    const afford = cash >= cost;
    const label = (lv: number) => (lv >= TYPHU_MAX_HOUSES ? 'Khách sạn' : `Nhà cấp ${lv}`);
    return (
      <View style={dc.wrap} pointerEvents="box-none">
        <View style={dc.card}>
          <View style={[dc.head, { backgroundColor: TYPHU_GROUPS[c.group].color }]}>
            <T style={dc.headSub}>ĐẤT CỦA BẠN · {h === 0 ? 'ĐẤT TRỐNG' : label(h).toUpperCase()}</T>
            <T numberOfLines={1} style={dc.headName}>{c.name.toUpperCase()}</T>
          </View>
          <View style={dc.body}>
            <View style={dc.rentRow}><T style={dc.rentK}>Tiền thuê hiện tại</T><T style={dc.rentV}>{money(rentOf(i, h, full))} xu</T></View>
            <View testID="decision-cash" style={dc.cashBox}>
              <View style={dc.rentRow}><T style={dc.cashK}>Bạn đang có</T><T style={dc.cashV}>{money(cash)} xu</T></View>
              <View style={dc.rentRow}><T style={dc.cashK}>Nâng xong còn</T><T style={[dc.cashV, !afford && { color: C.danger }]}>{money(cash - cost)} xu</T></View>
            </View>
            <View style={dc.buildRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={dc.rentV}>Lên {label(h + 1)}</T>
                <T style={dc.rentK}>Thuê {money(rentOf(i, h + 1, full))} xu</T>
              </View>
              <Button testID="build-btn" small variant="gold" disabled={!afford} title={`-${money(cost)}`} style={{ minHeight: 30, paddingVertical: 2 }} onPress={() => p.onAct({ type: 'build', cell: i })} />
            </View>
            {h + 1 < TYPHU_MAX_HOUSES && <T style={dc.note}>Lần sau dừng ở đây mới lên tiếp {label(h + 2)}</T>}
            <Button testID="skip-btn" small variant="paper" title="Để sau" onPress={() => p.onAct({ type: 'skip' })} />
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
  btns: { flexDirection: 'row', gap: 6, marginTop: 4 },
  cashBox: { backgroundColor: '#FFF3BF', borderRadius: 8, borderWidth: 1.5, borderColor: '#111', paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, gap: 1 },
  cashK: { fontSize: 12, lineHeight: 16, color: '#111', fontWeight: '700' },
  cashV: { fontSize: 13, lineHeight: 17, color: '#B45309', fontWeight: '900' },
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
