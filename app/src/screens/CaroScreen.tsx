import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import type { CaroSymbol, CaroView } from '../../../shared/src/caro';
import { themeById } from '../../../shared/src/themes';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Button, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, UiIcon, type UiIconName } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

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
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const isLargeBoard = view.size >= 20;
  const [zoomMode, setZoomMode] = useState<ZoomMode>(() => (view.size >= 20 ? 'comfort' : 'fit'));
  const [prevBoardSize, setPrevBoardSize] = useState(view.size);
  if (prevBoardSize !== view.size) {
    setPrevBoardSize(view.size);
    setZoomMode(view.size >= 20 ? 'comfort' : 'fit');
  }

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
    play('pop');
  });

  useOnChange(view.currentPlayerId, (cur) => {
    if (cur === me && !view.winnerId && !view.isDraw) {
      play('turn');
    }
  });

  useOnChange(view.winnerId, (w) => {
    if (w) play(w === me ? 'win' : 'lose');
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

  // Khung hiển thị bàn cờ: rộng rãi trên Desktop (tới 624px), gọn khít trên Mobile (360-390px)
  const availBoardPx = Math.max(316, Math.min(wide ? 624 : width - 36, 624));
  const fitCellPx = Math.max(12, Math.min(wide ? 32 : 25, Math.floor(availBoardPx / view.size)));
  const comfortCellPx = wide ? 27 : 26;
  const zoomCellPx = wide ? 38 : 35;

  const cellPx =
    zoomMode === 'zoom'
      ? zoomCellPx
      : zoomMode === 'comfort'
        ? Math.max(fitCellPx, comfortCellPx)
        : fitCellPx;
  const emblemPx = Math.max(9, Math.round(cellPx * 0.72));

  const boardPixelSide = cellPx * view.size + 6;
  const viewportW = Math.min(boardPixelSide, availBoardPx + 6);
  const viewportH = Math.min(boardPixelSide, wide ? 370 : 396);
  const needsScroll = zoomMode !== 'fit' && (boardPixelSide > viewportW + 4 || boardPixelSide > viewportH + 4);

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
      play('error');
      setErr(errOf(res.reason));
    }
    return res.ok;
  };

  const handlePlaceStone = useCallback(async (r: number, c: number) => {
    const cur = actRef.current;
    if (cur.busy || cur.gameEnded || !cur.isMyTurn) return;
    if (cur.view.board[r * cur.view.size + c] !== null) return;
    play('stamp');
    setBusy(true);
    setErr(null);
    const res = await cur.act({ type: 'caro_move', row: r, col: c });
    setBusy(false);
    if (!res.ok) {
      play('error');
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
    play('pop');
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

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.currentPlayerId,
      ring: (p: PublicPlayer) => {
        if (view.winnerId === p.id) return C.gold;
        const sym = view.symbols[p.id];
        return sym ? SYMBOL_META[sym].color : undefined;
      },
      sub: (p: PublicPlayer) => {
        const sym = view.symbols[p.id];
        if (!sym) return 'Đang xem';
        if (view.winnerId === p.id) return `Quân ${sym} · Thắng!`;
        return view.currentPlayerId === p.id ? `Quân ${sym} · Lượt đi` : `Quân ${sym}`;
      },
    }),
    [view.order, view.currentPlayerId, view.winnerId, view.symbols],
  );

  const renderBottom = () => {
    return (
      <View style={styles.bottomWrap}>
        <View style={styles.bottomStatusRow}>
          {view.winnerId ? (
            <>
              <EmojiIcon emoji="🏆" size={18} />
              <T style={[styles.bottomTxt, { color: '#FDE047' }]}>
                {view.winnerId === me
                  ? 'Đỉnh cao chiến thuật! Bạn đã nối thành công 5 quân thắng tuyệt đối!'
                  : `${view.names[view.winnerId] ?? view.winnerId} đã tạo đường 5 quân chiến thắng!`}
              </T>
            </>
          ) : view.isDraw ? (
            <>
              <EmojiIcon emoji="🤝" size={18} />
              <T style={[styles.bottomTxt, { color: '#BAE6FD' }]}>
                Bàn cờ {view.size}×{view.size} kín đặc bất phân thắng bại — Hòa cờ lịch sử!
              </T>
            </>
          ) : isMyTurn && mySymbol ? (
            <>
              <CaroEmblem symbol={mySymbol} size={18} />
              <T style={[styles.bottomTxt, { color: '#4ADE80' }]}>
                Tới lượt bạn cầm quân {mySymbol}! Chạm vào ô trống trên bàn {view.size}×{view.size} để đánh.
              </T>
            </>
          ) : mySymbol ? (
            <>
              <UiIcon name="Timer" size={16} color="#CBD5E1" />
              <T style={[styles.bottomTxt, { color: theme.onBg }]}>
                Đang chờ @{view.names[view.currentPlayerId ?? ''] ?? 'đối thủ'} đi nước tiếp theo…
              </T>
            </>
          ) : (
            <T style={[styles.bottomTxt, { color: theme.onBg }]}>
              Đang theo dõi đại chiến Cờ Caro {view.order.length} phe ({view.size}×{view.size}) kịch tính!
            </T>
          )}
        </View>

        {isHost && !gameEnded && (
          <View style={styles.hostRow}>
            <Button
              testID="caro-end-early"
              small
              variant={confirmEnd ? 'danger' : 'paper'}
              disabled={busy}
              iconNode={
                <UiIcon
                  name="XCircle"
                  size={14}
                  color={confirmEnd ? '#FFFFFF' : C.ink}
                />
              }
              title={confirmEnd ? 'Xác nhận kết thúc sớm?' : 'Kết thúc sớm'}
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
    );
  };

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
    <Shell game={game} room={room} strip={strip} wide={wide} bottom={renderBottom()}>
      {view.winnerId !== null && <Confetti />}

      {/* THANH ĐIỀU KHIỂN LƯỢT ĐÁNH, QUY MÔ BÀN CỜ & LUẬT CHẶN 2 ĐẦU */}
      <MotionSurface>
        <LinearGradient
          colors={['#042F2E', '#0F172A', '#1E293B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.arenaHeader, sticker(4)]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.activeTurnWrap}>
              {activePlayer ? (
                <Portrait
                  p={activePlayer}
                  size={34}
                  frame={activePlayer.cosmetics?.frame}
                />
              ) : (
                <EmojiIcon emoji="⚔️" size={20} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.turnMiniLabel}>
                  {gameEnded ? 'KẾT QUẢ ĐẠI CHIẾN' : 'ĐANG TỚI LƯỢT ĐÁNH'}
                </T>
                <View style={styles.inlineRow}>
                  {activeSymbol && !gameEnded && (
                    <CaroEmblem symbol={activeSymbol} size={16} />
                  )}
                  <NameText
                    fx={activePlayer?.cosmetics?.nameFx}
                    style={styles.activePlayerName}
                  >
                    {view.winnerId
                      ? `${view.names[view.winnerId] ?? view.winnerId} chiến thắng!`
                      : view.isDraw
                        ? 'Hòa cờ nảy lửa!'
                        : (view.names[view.currentPlayerId ?? ''] ?? '---')}
                  </NameText>
                </View>
              </View>
            </View>

            <View style={styles.headerBadgesCol}>
              <View style={styles.inlineBadges}>
                <View testID="caro-size-badge" style={styles.sizePill}>
                  <UiIcon name="LayoutGrid" size={11} color="#5EEAD4" />
                  <T style={styles.sizePillTxt}>
                    {view.size}×{view.size} ({view.size * view.size} ô)
                  </T>
                </View>
                <View
                  style={[
                    styles.rulePill,
                    view.blockTwoEnds ? styles.rulePillBlock : styles.rulePillFree,
                  ]}
                >
                  <UiIcon
                    name={view.blockTwoEnds ? 'Shield' : 'Zap'}
                    size={11}
                    color={view.blockTwoEnds ? '#FDE047' : '#67E8F9'}
                  />
                  <T style={styles.rulePillTxt}>
                    {view.blockTwoEnds ? 'Chặn 2 đầu' : 'Tự do'}
                  </T>
                </View>
              </View>
              <T style={styles.moveCounterTxt}>
                Nước #{view.moveCount} · {view.order.length} Phe
              </T>
            </View>
          </View>

          {!gameEnded && (
            <CountdownBar
              endsAt={view.turnEndsAt}
              total={view.turnSeconds}
              clockOffset={game.clockOffset}
              lightText
              testID="caro-timer"
            />
          )}

          {/* Thanh Huy Hiệu Các Phe Tham Chiến (2–4 người) */}
          <View style={styles.factionBar}>
            {view.order.map((pid) => {
              const sym = view.symbols[pid];
              if (!sym) return null;
              const m = SYMBOL_META[sym];
              const isTurn = !gameEnded && view.currentPlayerId === pid;
              return (
                <View
                  key={pid}
                  style={[
                    styles.factionChip,
                    {
                      backgroundColor: m.pillBg,
                      borderColor: isTurn ? m.pillBorder : 'rgba(255,255,255,0.12)',
                    },
                    isTurn && styles.factionChipActive,
                  ]}
                >
                  <CaroEmblem symbol={sym} size={14} />
                  <T numberOfLines={1} style={styles.factionNameTxt}>
                    {view.names[pid] ?? pid}
                  </T>
                </View>
              );
            })}
          </View>
        </LinearGradient>
      </MotionSurface>

      {view.winLine && view.winnerId && (
        <LinearGradient
          testID="caro-win-reveal-banner"
          colors={['#78350F', '#B45309', '#92400E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.winRevealBanner, sticker(3)]}
        >
          <View style={styles.winRevealTop}>
            <EmojiIcon emoji="🎯" size={20} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T style={styles.winRevealTitle}>
                {view.winnerId === me
                  ? `CHIẾN THẮNG! Bạn nối thành công ${view.winLine.length} quân!`
                  : `🏆 ${view.names[view.winnerId] ?? view.winnerId} đã nối ${view.winLine.length} quân thẳng hàng!`}
              </T>
              <T style={styles.winRevealSub}>
                Hàng thắng: {view.winLine.map(([r, c]) => `(${r + 1},${c + 1})`).join(' → ')}
              </T>
            </View>
            <Button
              testID="caro-finish-reveal"
              small
              variant="gold"
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
              lightText
            />
          )}
        </LinearGradient>
      )}

      {err && (
        <View style={[styles.errBanner, sticker(2)]}>
          <UiIcon name="AlertTriangle" size={15} color="#FEF08A" />
          <T style={styles.errBannerTxt}>{err}</T>
        </View>
      )}

      {/* THANH ĐIỀU HƯỚNG PAN / ZOOM & ĐỊNH VỊ TÂM CỜ TRÊN DI ĐỘNG */}
      <View style={styles.boardToolbar}>
        <View style={styles.lastMoveInfo}>
          <UiIcon name="Crosshair" size={14} color={theme.onBg} />
          <T numberOfLines={1} style={[styles.lastMoveInfoTxt, { color: theme.onBg }]}>
            {view.lastMove
              ? `Vừa đánh: (${view.lastMove.row + 1}, ${view.lastMove.col + 1}) · @${view.names[view.lastMove.playerId] ?? ''}`
              : isLargeBoard
                ? `Bàn đại chiến ${view.size}×${view.size} (${view.size * view.size} ô) — vuốt để đảo khắp bản đồ`
                : `Bàn cờ ${view.size}×${view.size} sẵn sàng khai cuộc`}
          </T>
        </View>

        <View style={styles.toolbarBtns}>
          {needsScroll && (
            <Pressable
              testID="caro-center-btn"
              onPress={() => {
                play('pop');
                const mid = Math.floor(view.size / 2);
                focusBoardCell(
                  view.lastMove ? view.lastMove.row : mid,
                  view.lastMove ? view.lastMove.col : mid,
                  true,
                );
              }}
              style={styles.centerBtn}
            >
              <UiIcon name="Crosshair" size={13} color="#FDE047" />
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
              size={13}
              color={zoomMode === 'zoom' ? '#022C22' : '#E2E8F0'}
            />
            <T style={[styles.zoomToggleTxt, zoomMode === 'zoom' && { color: '#022C22' }]}>
              {zoomBtnLabel}
            </T>
          </Pressable>
        </View>
      </View>

      {/* ĐẤU TRƯỜNG BÀN CỜ CARO CO GIÃN ĐA PHE CYBER JADE */}
      <View style={[styles.boardArenaWrap, sticker(4)]}>
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
    </Shell>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  arenaHeader: {
    borderRadius: 22,
    padding: 12,
    gap: 9,
    borderWidth: 2,
    borderColor: 'rgba(45, 212, 191, 0.36)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeTurnWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
  },
  turnMiniLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#5EEAD4',
  },
  activePlayerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: FONT,
  },
  headerBadgesCol: {
    alignItems: 'flex-end',
    gap: 3,
  },
  sizePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: 'rgba(94, 234, 212, 0.5)',
  },
  sizePillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#99F6E4',
  },
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  rulePillBlock: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(250, 204, 21, 0.5)',
  },
  rulePillFree: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: 'rgba(103, 232, 249, 0.5)',
  },
  rulePillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  moveCounterTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },

  factionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factionChip: {
    flexGrow: 1,
    minWidth: 108,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  factionChipActive: {
    transform: [{ translateY: -1 }],
  },
  factionNameTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#991B1B',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  winRevealBanner: {
    borderRadius: 16,
    padding: 10,
    gap: 7,
    borderWidth: 2,
    borderColor: '#FEF08A',
  },
  winRevealTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  winRevealTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FEF08A',
    fontFamily: FONT,
  },
  winRevealSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FDE68A',
  },
  errBannerTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
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
    gap: 5,
    minWidth: 0,
  },
  lastMoveInfoTxt: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '800',
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
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1.5,
    borderColor: 'rgba(253, 224, 71, 0.55)',
  },
  centerBtnTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FEF08A',
  },
  zoomToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1.5,
    borderColor: 'rgba(94, 234, 212, 0.5)',
  },
  zoomToggleBtnOn: {
    backgroundColor: '#2DD4BF',
    borderColor: '#99F6E4',
  },
  zoomToggleTxt: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#E2E8F0',
  },

  boardArenaWrap: {
    alignSelf: 'center',
    maxWidth: '100%',
    borderRadius: 16,
    backgroundColor: '#0B192C',
    padding: 4,
    borderWidth: 2,
    borderColor: '#14B8A6',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 24px rgba(20, 184, 166, 0.35)' } as object)
      : null),
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
    backgroundColor: '#0F2439',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.3)',
  },
  boardRow: {
    flexDirection: 'row',
  },
  cell: {
    borderWidth: 0.5,
    borderColor: 'rgba(94, 234, 212, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 36, 57, 0.92)',
  },
  cellPressed: {
    backgroundColor: 'rgba(45, 212, 191, 0.28)',
  },
  cellLastMove: {
    backgroundColor: 'rgba(56, 189, 248, 0.24)',
  },
  lastMoveRing: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FDE047',
  },
  cellWinLaser: {
    backgroundColor: 'rgba(250, 204, 21, 0.38)',
    borderWidth: 1.5,
    borderColor: '#FEF08A',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: 'inset 0 0 10px rgba(250, 204, 21, 0.85)' } as object)
      : null),
  },
  starDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(94, 234, 212, 0.48)',
  },

  bottomWrap: {
    gap: 6,
  },
  bottomStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  bottomTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
