import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import type { CaroSymbol, CaroView } from '../../../shared/src/caro';
import type { ActionError, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, backdropPalette, sticker } from '../theme';
import { actionText } from '../messages';
import { play, playMemePool } from '../sound';
import { useOnChange, useStableWindow } from '../hooks';
import { Button, T } from '../ui';
import { Shell } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { UiIcon, type UiIconName } from '../components/Icons';

const SYMBOL_META: Record<
  CaroSymbol,
  {
    name: string;
    icon: UiIconName;
    stroke: number;
    color: string;
    fill: string;
    pillBg: string;
    pillBorder: string;
    glow: string;
  }
> = {
  X: {
    name: 'Chữ Thập Đỏ',
    icon: 'X',
    stroke: 3.4,
    color: '#FB7185',
    fill: '#E11D48',
    pillBg: 'rgba(225, 29, 72, 0.18)',
    pillBorder: '#FB7185',
    glow: 'rgba(244, 63, 94, 0.55)',
  },
  O: {
    name: 'Vòng Đại Dương',
    icon: 'Circle',
    stroke: 3.1,
    color: '#38BDF8',
    fill: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.2)',
    pillBorder: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  A: {
    name: 'Tam Giác Vàng',
    icon: 'Triangle',
    stroke: 2.8,
    color: '#FACC15',
    fill: '#D97706',
    pillBg: 'rgba(234, 179, 8, 0.2)',
    pillBorder: '#FACC15',
    glow: 'rgba(250, 204, 21, 0.58)',
  },
  D: {
    name: 'Thoi Ngọc Lục',
    icon: 'Diamond',
    stroke: 2.8,
    color: '#34D399',
    fill: '#059669',
    pillBg: 'rgba(16, 185, 129, 0.2)',
    pillBorder: '#34D399',
    glow: 'rgba(52, 211, 153, 0.55)',
  },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  cell_occupied: 'Ô này đã có quân cờ rồi, chấm ô trống bên cạnh nhé!',
  not_your_turn: 'Chưa tới lượt đi của bạn!',
  spectating: 'Bạn đang ở chế độ khán giả, đợi ván sau so tài nhé!',
};

function errOf(reason: ActionError): string {
  return (
    EXTRA_ERRORS[reason] ??
    (actionText as Partial<Record<ActionError, string>>)[reason] ??
    'Nước đi không hợp lệ.'
  );
}

/** Quân cờ chuẩn Lucide Icons (`lucide-icons/lucide` 16k+ ⭐) cho cả 4 phe X / O / A / D */
const CaroEmblem = memo(function CaroEmblem({
  symbol,
  size,
}: {
  symbol: CaroSymbol;
  size: number;
}) {
  const m = SYMBOL_META[symbol];
  return <UiIcon name={m.icon} size={size} color={m.color} strokeWidth={m.stroke} />;
});

function isStarPoint(size: number, r: number, c: number): boolean {
  const mid = Math.floor(size / 2);
  if (r === mid && c === mid) return true;
  if (size >= 26) {
    const q = 5;
    const h = mid;
    const e = size - 1 - q;
    return (r === q || r === h || r === e) && (c === q || c === h || c === e);
  }
  if (size >= 20) {
    const q = 4;
    const e = size - 1 - q;
    return (r === q || r === mid || r === e) && (c === q || c === mid || c === e);
  }
  if (size >= 15) {
    return (r === 3 || r === size - 4) && (c === 3 || c === size - 4);
  }
  return false;
}

interface CaroCellProps {
  r: number;
  c: number;
  cellSym: CaroSymbol | null;
  isLast: boolean;
  isWin: boolean;
  star: boolean;
  cellPx: number;
  emblemPx: number;
  interactive: boolean;
  onPlace: (r: number, c: number) => void;
}

/** Ô cờ memo hóa độc lập: bàn 28×28 (784 ô) hoặc 32×32 (1024 ô) chỉ re-render đúng 1–2 ô mỗi nước đi! */
const CaroCell = memo(function CaroCell({
  r,
  c,
  cellSym,
  isLast,
  isWin,
  star,
  cellPx,
  emblemPx,
  interactive,
  onPlace,
}: CaroCellProps) {
  return (
    <Pressable
      testID={`caro-${r}-${c}`}
      disabled={!interactive || cellSym !== null}
      onPress={() => onPlace(r, c)}
      style={({ pressed }) => [
        styles.cell,
        { width: cellPx, height: cellPx },
        isLast && styles.cellLastMove,
        isWin && styles.cellWinLaser,
        pressed && interactive && cellSym === null && styles.cellPressed,
      ]}
    >
      {star && <View style={styles.starDot} />}
      {cellSym !== null && <CaroEmblem symbol={cellSym} size={emblemPx} />}
      {isLast && !isWin && <View pointerEvents="none" style={styles.lastMoveRing} />}
    </Pressable>
  );
});

type ZoomMode = 'comfort' | 'zoom' | 'fit';

export function CaroScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CaroView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const { width, height } = useStableWindow();
  const wide = width >= 720;
  const compact = height < 700 || width < 380;

  const isLargeBoard = view.size >= 20;
  const [zoomMode, setZoomMode] = useState<ZoomMode>(() => (view.size >= 20 ? 'comfort' : 'fit'));
  const [prevBoardSize, setPrevBoardSize] = useState(view.size);
  if (prevBoardSize !== view.size) {
    setPrevBoardSize(view.size);
    setZoomMode(view.size >= 20 ? 'comfort' : 'fit');
  }

  const [arenaSize, setArenaSize] = useState({ w: 0, h: 0 });
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const vScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const hScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const [prevMoveCount, setPrevMoveCount] = useState(view.moveCount);
  if (prevMoveCount !== view.moveCount) {
    setPrevMoveCount(view.moveCount);
    setConfirmEnd(false);
    setErr(null);
  }

  useOnChange(view.moveCount, () => {
    play('pop', { speakerId: view.lastMove?.playerId ?? null });
  });

  useOnChange(view.currentPlayerId, (cur) => {
    if (cur === me && !view.winnerId && !view.isDraw) {
      play('turn', { speakerId: me });
    }
  });

  useOnChange(view.winnerId, (w) => {
    if (w) {
      play(w === me ? 'win' : 'lose', { memePool: 'win', speakerId: w, cooldownMs: 1200 });
    }
  });

  useOnChange(view.isDraw, (d) => {
    if (d) {
      playMemePool('shock', { speakerId: null, cooldownMs: 1200 });
      play('reveal', { speakerId: null });
    }
  });

  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const winSet = useMemo(() => {
    const s = new Set<string>();
    if (view.winLine) {
      for (const [r, c] of view.winLine) s.add(`${r}-${c}`);
    }
    return s;
  }, [view.winLine]);

  const gameEnded = view.winnerId !== null || view.isDraw;
  const isMyTurn = !gameEnded && view.currentPlayerId === me;
  const mySymbol: CaroSymbol | null = view.symbols[me] ?? null;
  const activePlayer = view.currentPlayerId ? playerMap.get(view.currentPlayerId) : undefined;
  const activeSymbol: CaroSymbol | null = view.currentPlayerId
    ? (view.symbols[view.currentPlayerId] ?? null)
    : null;

  // Khung đấu trường đo động qua onLayout để bàn cờ to hết cỡ theo màn hình mà không bao giờ tràn trang ngoài
  const availW = Math.max(260, (arenaSize.w || (wide ? 624 : width - 24)) - 12);
  const availH = Math.max(200, (arenaSize.h || (wide ? 500 : height - 210)) - 12);
  const availSquare = Math.min(availW, availH);
  const fitCellPx = Math.max(11, Math.min(wide ? 42 : 30, Math.floor((availSquare - 6) / view.size)));
  const comfortCellPx = wide ? 29 : 26;
  const zoomCellPx = wide ? 40 : 35;

  const cellPx =
    zoomMode === 'zoom'
      ? zoomCellPx
      : zoomMode === 'comfort'
        ? Math.max(fitCellPx, comfortCellPx)
        : fitCellPx;
  const emblemPx = Math.max(8, Math.round(cellPx * 0.72));

  const boardPixelSide = cellPx * view.size + 6;
  const viewportW = Math.min(boardPixelSide, availW);
  const viewportH = Math.min(boardPixelSide, availH);
  const needsScroll = boardPixelSide > viewportW + 2 || boardPixelSide > viewportH + 2;

  const focusBoardCell = useCallback(
    (targetRow: number, targetCol: number, animated: boolean) => {
      if (!needsScroll) return;
      const targetX = Math.max(0, targetCol * cellPx + cellPx / 2 - viewportW / 2);
      const targetY = Math.max(0, targetRow * cellPx + cellPx / 2 - viewportH / 2);
      hScrollRef.current?.scrollTo({ x: targetX, animated });
      vScrollRef.current?.scrollTo({ y: targetY, animated });
    },
    [needsScroll, cellPx, viewportW, viewportH],
  );

  // Tự căn giữa vào tâm bàn cờ khi khai cuộc hoặc đổi mức zoom; khi có winLine thì khóa tiêu điểm vào đúng giữa 5 quân thắng!
  useEffect(() => {
    if (!needsScroll) return;
    const mid = Math.floor(view.size / 2);
    const winMid = view.winLine && view.winLine.length > 0 ? view.winLine[Math.floor(view.winLine.length / 2)] : null;
    const r = winMid ? winMid[0] : view.lastMove ? view.lastMove.row : mid;
    const c = winMid ? winMid[1] : view.lastMove ? view.lastMove.col : mid;
    const id = setTimeout(() => focusBoardCell(r, c, view.moveCount > 0), 40);
    return () => clearTimeout(id);
  }, [needsScroll, view.size, view.moveCount, view.lastMove, view.winLine, zoomMode, focusBoardCell]);

  const actRef = useRef({ busy, gameEnded, isMyTurn, view, act: game.act });
  useEffect(() => {
    actRef.current = { busy, gameEnded, isMyTurn, view, act: game.act };
  }, [busy, gameEnded, isMyTurn, view, game.act]);

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) {
      play('error', { speakerId: me });
      setErr(errOf(res.reason));
    }
    return res.ok;
  };

  const handlePlaceStone = useCallback(async (r: number, c: number) => {
    const cur = actRef.current;
    if (cur.busy || cur.gameEnded || !cur.isMyTurn) return;
    if (cur.view.board[r * cur.view.size + c] !== null) return;
    playMemePool('turn_move', { speakerId: cur.view.currentPlayerId, cooldownMs: 2600 });
    play('stamp', { speakerId: cur.view.currentPlayerId });
    setBusy(true);
    setErr(null);
    const res = await cur.act({ type: 'caro_move', row: r, col: c });
    setBusy(false);
    if (!res.ok) {
      play('error', { speakerId: cur.view.currentPlayerId });
      setErr(errOf(res.reason));
    }
  }, []);

  const handleEarlyEnd = async () => {
    if (!isHost || busy) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await act({ type: 'end' });
  };

  const cycleZoom = () => {
    play('pop', { speakerId: me });
    if (isLargeBoard) {
      setZoomMode((m) => (m === 'comfort' ? 'zoom' : m === 'zoom' ? 'fit' : 'comfort'));
    } else {
      setZoomMode((m) => (m === 'zoom' ? 'fit' : 'zoom'));
    }
  };

  const zoomBtnLabel = isLargeBoard
    ? zoomMode === 'comfort'
      ? 'Zoom 1.5×'
      : zoomMode === 'zoom'
        ? 'Toàn cảnh'
        : 'Cận cảnh'
    : zoomMode === 'zoom'
      ? 'Thu gọn 1×'
      : 'Zoom 1.5×';

  const renderBottom = () => (
    <View style={styles.bottomWrap}>
      <View style={styles.bottomStatusRow}>
        {view.winnerId ? (
          <>
            <UiIcon name="Trophy" size={15} color={C.goldDeep} strokeWidth={1.65} />
            <T numberOfLines={1} style={[styles.bottomTxt, { color: pal.text }]}>
              {view.winnerId === me
                ? `Bạn nối đủ ${view.winLine?.length ?? 5} quân chiến thắng`
                : `${view.names[view.winnerId] ?? view.winnerId} nối ${view.winLine?.length ?? 5} quân thắng`}
            </T>
          </>
        ) : view.isDraw ? (
          <>
            <UiIcon name="LayoutGrid" size={14} color={pal.muted} strokeWidth={1.65} />
            <T numberOfLines={1} style={[styles.bottomTxt, { color: pal.muted }]}>
              Bàn {view.size}×{view.size} đầy · Hòa cờ
            </T>
          </>
        ) : isMyTurn && mySymbol ? (
          <>
            <CaroEmblem symbol={mySymbol} size={15} />
            <T numberOfLines={1} style={[styles.bottomTxt, { color: C.jade }]}>
              Lượt bạn ({mySymbol}) · Chạm ô trống để đánh
            </T>
          </>
        ) : mySymbol ? (
          <>
            <UiIcon name="Timer" size={14} color={pal.muted} strokeWidth={1.65} />
            <T numberOfLines={1} style={[styles.bottomTxt, { color: pal.muted }]}>
              Chờ {view.names[view.currentPlayerId ?? ''] ?? 'đối thủ'}
            </T>
          </>
        ) : (
          <T numberOfLines={1} style={[styles.bottomTxt, { color: pal.muted }]}>
            Đang xem Caro {view.order.length} phe ({view.size}×{view.size})
          </T>
        )}

        {isHost && !gameEnded && (
          <View style={styles.hostInlineBtns}>
            <Button
              testID="caro-end-early"
              small
              variant={confirmEnd ? 'danger' : 'paper'}
              disabled={busy}
              iconNode={
                <UiIcon
                  name="XCircle"
                  size={13}
                  color={confirmEnd ? '#FFFFFF' : C.ink}
                />
              }
              title={confirmEnd ? 'Chắc?' : 'Dừng'}
              onPress={handleEarlyEnd}
            />
            {confirmEnd && (
              <Button
                small
                variant="paper"
                title="Hủy"
                onPress={() => setConfirmEnd(false)}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );

  const boardRows = useMemo(
    () => Array.from({ length: view.size }, (_, r) => r),
    [view.size],
  );
  const boardCols = useMemo(
    () => Array.from({ length: view.size }, (_, c) => c),
    [view.size],
  );

  const interactiveBoard = !busy && !gameEnded && isMyTurn;

  const boardElement = (
    <View
      testID="caro-board"
      style={[
        styles.boardGrid,
        {
          width: boardPixelSide,
          height: boardPixelSide,
        },
      ]}
    >
      {boardRows.map((r) => (
        <View key={r} style={styles.boardRow}>
          {boardCols.map((c) => {
            const idx = r * view.size + c;
            const cellSym = view.board[idx];
            const isLast =
              view.lastMove !== null &&
              view.lastMove.row === r &&
              view.lastMove.col === c;
            const isWin = winSet.has(`${r}-${c}`);
            const star = cellSym === null && isStarPoint(view.size, r, c);

            return (
              <CaroCell
                key={c}
                r={r}
                c={c}
                cellSym={cellSym}
                isLast={isLast}
                isWin={isWin}
                star={star}
                cellPx={cellPx}
                emblemPx={emblemPx}
                interactive={interactiveBoard}
                onPlace={handlePlaceStone}
              />
            );
          })}
        </View>
      ))}

      {view.winLine && view.winLine.length >= 2 && (() => {
        const first = view.winLine[0];
        const last = view.winLine[view.winLine.length - 1];
        const pad = 3;
        const x1 = pad + first[1] * cellPx + cellPx / 2;
        const y1 = pad + first[0] * cellPx + cellPx / 2;
        const x2 = pad + last[1] * cellPx + cellPx / 2;
        const y2 = pad + last[0] * cellPx + cellPx / 2;
        const winSym = view.winnerId ? view.symbols[view.winnerId] : undefined;
        const glowColor = winSym ? SYMBOL_META[winSym].color : '#FACC15';
        return (
          <View pointerEvents="none" testID="caro-win-laser-line" style={StyleSheet.absoluteFill}>
            <Svg width={boardPixelSide} height={boardPixelSide} viewBox={`0 0 ${boardPixelSide} ${boardPixelSide}`}>
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={glowColor} strokeWidth={Math.max(8, cellPx * 0.42)} strokeOpacity={0.38} strokeLinecap="round" />
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FACC15" strokeWidth={Math.max(4.5, cellPx * 0.22)} strokeOpacity={0.95} strokeLinecap="round" />
              <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FFFFFF" strokeWidth={Math.max(2, cellPx * 0.09)} strokeLinecap="round" />
              <SvgCircle cx={x1} cy={y1} r={Math.max(4, cellPx * 0.16)} fill="#FEF08A" />
              <SvgCircle cx={x2} cy={y2} r={Math.max(4, cellPx * 0.16)} fill="#FEF08A" />
            </Svg>
          </View>
        );
      })()}
    </View>
  );

  return (
    <Shell game={game} room={room} scroll={false} hideStrip wide={wide} bottom={renderBottom()}>
      <View style={styles.root}>
        {view.winnerId !== null && <Confetti />}

        {/* Thanh HUD lượt đánh gọn nhẹ trên thẻ giấy ngà */}
        <View style={[styles.arenaHeader, compact && styles.arenaHeaderCompact, sticker(1)]}>
          <View style={styles.headerTopRow}>
            <View style={styles.activeTurnWrap}>
              {activePlayer ? (
                <Portrait
                  p={activePlayer}
                  size={24}
                  border={1}
                  frame={activePlayer.cosmetics?.frame}
                />
              ) : (
                <UiIcon name="Swords" size={15} color={C.secondary} strokeWidth={1.65} />
              )}
              {activeSymbol && !gameEnded && (
                <CaroEmblem symbol={activeSymbol} size={14} />
              )}
              <NameText
                fx={activePlayer?.cosmetics?.nameFx}
                numberOfLines={1}
                style={styles.activePlayerName}
              >
                {view.winnerId
                  ? `${view.names[view.winnerId] ?? view.winnerId} thắng`
                  : view.isDraw
                    ? 'Hòa cờ'
                    : (view.names[view.currentPlayerId ?? ''] ?? '---')}
              </NameText>
            </View>

            <View style={styles.inlineBadges}>
              <View testID="caro-size-badge" style={styles.sizePill}>
                <UiIcon name="LayoutGrid" size={10} color={C.secondary} strokeWidth={1.65} />
                <T style={styles.sizePillTxt}>
                  {view.size}×{view.size}
                </T>
              </View>
              <View style={styles.rulePill}>
                <UiIcon
                  name={view.blockTwoEnds ? 'Shield' : 'Zap'}
                  size={10}
                  color={view.blockTwoEnds ? C.goldDeep : C.secondary}
                  strokeWidth={1.65}
                />
                <T style={styles.rulePillTxt}>
                  {view.blockTwoEnds ? 'Chặn 2' : 'Tự do'}
                </T>
              </View>
              <T style={styles.moveCounterTxt}>#{view.moveCount}</T>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.factionBar}>
            {view.order.map((pid) => {
              const sym = view.symbols[pid];
              if (!sym) return null;
              const m = SYMBOL_META[sym];
              const pl = playerMap.get(pid);
              const isTurn = !gameEnded && view.currentPlayerId === pid;
              return (
                <View
                  key={pid}
                  style={[
                    styles.factionChip,
                    isTurn && { borderColor: m.fill, backgroundColor: C.goldSoft },
                  ]}
                >
                  {pl && <Portrait p={pl} size={18} border={1} />}
                  <CaroEmblem symbol={sym} size={12} />
                  <T numberOfLines={1} style={[styles.factionNameTxt, isTurn && { fontWeight: '600' }]}>
                    {view.names[pid] ?? pid}
                  </T>
                </View>
              );
            })}
          </ScrollView>

          {!gameEnded && (
            <CountdownBar
              endsAt={view.turnEndsAt}
              total={view.turnSeconds}
              clockOffset={game.clockOffset}
              testID="caro-timer"
            />
          )}
        </View>

        {view.winLine && view.winnerId && (
          <View
            testID="caro-win-reveal-banner"
            style={[styles.winRevealBanner, sticker(1)]}
          >
            <View style={styles.winRevealTop}>
              <UiIcon name="Trophy" size={16} color={C.goldDeep} strokeWidth={1.65} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T numberOfLines={1} style={styles.winRevealTitle}>
                  {view.winnerId === me
                    ? `Chiến thắng · Nối đủ ${view.winLine.length} quân`
                    : `${view.names[view.winnerId] ?? view.winnerId} nối ${view.winLine.length} quân thắng`}
                </T>
                <T numberOfLines={1} style={styles.winRevealSub}>
                  {view.winLine.map(([r, c]) => `(${r + 1},${c + 1})`).join(' · ')}
                </T>
              </View>
              <Button
                testID="caro-finish-reveal"
                small
                variant="ink"
                disabled={busy}
                title="Tổng kết"
                onPress={() => void act({ type: 'caro_finish_reveal' })}
              />
            </View>
            {view.revealEndsAt && (
              <CountdownBar
                endsAt={view.revealEndsAt}
                total={5}
                clockOffset={game.clockOffset}
              />
            )}
          </View>
        )}

        {err && (
          <View style={[styles.errBanner, sticker(1)]}>
            <UiIcon name="AlertTriangle" size={14} color={C.danger} strokeWidth={1.7} />
            <T style={styles.errBannerTxt}>{err}</T>
          </View>
        )}

        {/* Thanh định vị tâm cờ & zoom trên 1 dòng */}
        <View style={styles.boardToolbar}>
          <View style={styles.lastMoveInfo}>
            <UiIcon name="Crosshair" size={13} color={pal.muted} strokeWidth={1.65} />
            <T numberOfLines={1} style={[styles.lastMoveInfoTxt, { color: pal.muted }]}>
              {view.lastMove
                ? `Vừa đánh (${view.lastMove.row + 1},${view.lastMove.col + 1}) · ${view.names[view.lastMove.playerId] ?? ''}`
                : isLargeBoard
                  ? `Bàn ${view.size}×${view.size} (${view.size * view.size} ô)`
                  : `Bàn cờ ${view.size}×${view.size} sẵn sàng`}
            </T>
          </View>

          <View style={styles.toolbarBtns}>
            {needsScroll && (
              <Pressable
                testID="caro-center-btn"
                onPress={() => {
                  play('pop', { speakerId: me });
                  const mid = Math.floor(view.size / 2);
                  focusBoardCell(
                    view.lastMove ? view.lastMove.row : mid,
                    view.lastMove ? view.lastMove.col : mid,
                    true,
                  );
                }}
                style={styles.centerBtn}
              >
                <UiIcon name="Crosshair" size={12} color={C.secondary} strokeWidth={1.65} />
                <T style={styles.centerBtnTxt}>Tâm cờ</T>
              </Pressable>
            )}

            <Pressable
              testID="caro-zoom-toggle"
              onPress={cycleZoom}
              style={[styles.zoomToggleBtn, zoomMode === 'zoom' && styles.zoomToggleBtnOn]}
            >
              <UiIcon
                name={zoomMode === 'zoom' ? 'ZoomOut' : 'ZoomIn'}
                size={12}
                color={zoomMode === 'zoom' ? C.onSon : C.secondary}
                strokeWidth={1.65}
              />
              <T style={[styles.zoomToggleTxt, zoomMode === 'zoom' && { color: C.onSon }]}>
                {zoomBtnLabel}
              </T>
            </Pressable>
          </View>
        </View>

        {/* ĐẤU TRƯỜNG BÀN CỜ CHIẾM TOÀN BỘ KHÔNG GIAN CÒN LẠI (0 OUTER SCROLL) */}
        <View
          style={[styles.boardArenaWrap, sticker(3)]}
          onLayout={({ nativeEvent: { layout } }) => {
            const w = Math.floor(layout.width);
            const h = Math.floor(layout.height);
            setArenaSize((prev) =>
              Math.abs(prev.w - w) > 2 || Math.abs(prev.h - h) > 2 ? { w, h } : prev,
            );
          }}
        >
          {needsScroll ? (
            <ScrollView
              ref={vScrollRef}
              style={{ maxHeight: viewportH, maxWidth: viewportW }}
              contentContainerStyle={styles.zoomScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
              <ScrollView
                ref={hScrollRef}
                horizontal
                contentContainerStyle={styles.zoomScrollContent}
                nestedScrollEnabled
                showsHorizontalScrollIndicator
              >
                {boardElement}
              </ScrollView>
            </ScrollView>
          ) : (
            <View style={styles.fitCenterWrap}>{boardElement}</View>
          )}
        </View>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: 5,
  },
  inlineBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  arenaHeader: {
    borderRadius: 12,
    backgroundColor: C.paper,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  arenaHeaderCompact: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  activeTurnWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  activePlayerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONT,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: C.mist,
    borderColor: C.borderSubtle,
  },
  sizePillTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
  },
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: C.mist,
    borderColor: C.borderSubtle,
  },
  rulePillTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary,
  },
  moveCounterTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.muted,
    fontVariant: ['tabular-nums'],
  },

  factionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  factionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    backgroundColor: C.mist,
    maxWidth: 120,
  },
  factionNameTxt: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.ink,
    flexShrink: 1,
  },

  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.dangerSoft,
    borderRadius: 10,
    borderColor: 'rgba(185,28,28,0.28)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  winRevealBanner: {
    borderRadius: 12,
    backgroundColor: C.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
    borderColor: 'rgba(180,83,9,0.35)',
  },
  winRevealTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winRevealTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONT,
  },
  winRevealSub: {
    fontSize: 11,
    fontWeight: '500',
    color: C.goldDeep,
    fontVariant: ['tabular-nums'],
  },
  errBannerTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: C.danger,
  },

  boardToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  lastMoveInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  lastMoveInfoTxt: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  toolbarBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  centerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  centerBtnTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.ink,
  },
  zoomToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  zoomToggleBtnOn: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  zoomToggleTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.secondary,
  },

  boardArenaWrap: {
    flex: 1,
    minHeight: 0,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: C.darkBg,
    padding: 4,
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  fitCenterWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomScrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  boardGrid: {
    backgroundColor: C.darkSurface,
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(251, 249, 245, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B26',
  },
  cellPressed: {
    backgroundColor: 'rgba(251, 249, 245, 0.14)',
  },
  cellLastMove: {
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
  },
  lastMoveRing: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: C.gold,
  },
  cellWinLaser: {
    backgroundColor: 'rgba(250, 204, 21, 0.28)',
    borderWidth: 1,
    borderColor: C.gold,
  },
  starDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(251, 249, 245, 0.35)',
  },

  bottomWrap: {
    gap: 4,
  },
  bottomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 4,
  },
  bottomTxt: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: '500',
  },
  hostInlineBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
});
