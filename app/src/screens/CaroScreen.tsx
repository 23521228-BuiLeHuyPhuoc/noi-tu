import { memo, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Polygon } from 'react-native-svg';
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
import { EmojiIcon, UiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const SYMBOL_META: Record<
  CaroSymbol,
  {
    name: string;
    color: string;
    fill: string;
    pillBg: string;
    pillBorder: string;
    glow: string;
  }
> = {
  X: {
    name: 'Chữ Thập Đỏ',
    color: '#FB7185',
    fill: '#E11D48',
    pillBg: 'rgba(225, 29, 72, 0.18)',
    pillBorder: '#FB7185',
    glow: 'rgba(244, 63, 94, 0.55)',
  },
  O: {
    name: 'Vòng Đại Dương',
    color: '#38BDF8',
    fill: '#0284C7',
    pillBg: 'rgba(2, 132, 199, 0.2)',
    pillBorder: '#38BDF8',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  A: {
    name: 'Tam Giác Vàng',
    color: '#FACC15',
    fill: '#D97706',
    pillBg: 'rgba(234, 179, 8, 0.2)',
    pillBorder: '#FACC15',
    glow: 'rgba(250, 204, 21, 0.58)',
  },
  D: {
    name: 'Thoi Ngọc Lục',
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

/** Quân cờ vector sắc nét cho cả 4 hệ X / O / A (Tam Giác) / D (Hình Thoi) */
const CaroEmblem = memo(function CaroEmblem({
  symbol,
  size,
}: {
  symbol: CaroSymbol;
  size: number;
}) {
  const m = SYMBOL_META[symbol];
  if (symbol === 'X') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Line
          x1="4.5"
          y1="4.5"
          x2="19.5"
          y2="19.5"
          stroke={m.color}
          strokeWidth="3.8"
          strokeLinecap="round"
        />
        <Line
          x1="19.5"
          y1="4.5"
          x2="4.5"
          y2="19.5"
          stroke={m.color}
          strokeWidth="3.8"
          strokeLinecap="round"
        />
      </Svg>
    );
  }
  if (symbol === 'O') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle
          cx="12"
          cy="12"
          r="7.4"
          stroke={m.color}
          strokeWidth="3.6"
          fill="rgba(56,189,248,0.12)"
        />
      </Svg>
    );
  }
  if (symbol === 'A') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Polygon
          points="12,3.5 20.5,19.5 3.5,19.5"
          stroke={m.color}
          strokeWidth="3"
          strokeLinejoin="round"
          fill="rgba(250,204,21,0.22)"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polygon
        points="12,3 21,12 12,21 3,12"
        stroke={m.color}
        strokeWidth="3"
        strokeLinejoin="round"
        fill="rgba(52,211,153,0.22)"
      />
    </Svg>
  );
});

function isStarPoint(size: number, r: number, c: number): boolean {
  const mid = Math.floor(size / 2);
  if (r === mid && c === mid) return true;
  if (size >= 15) {
    return (r === 3 || r === size - 4) && (c === 3 || c === size - 4);
  }
  return false;
}

export function CaroScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CaroView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [zoomed, setZoomed] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  // Tính kích thước ô cờ vừa khít màn 360-390px (22..24px/ô) và 32px trên desktop
  const availBoardPx = Math.max(315, Math.min(wide ? 495 : width - 38, 495));
  const fitCellPx = Math.max(21, Math.min(wide ? 32 : 25, Math.floor(availBoardPx / view.size)));
  const cellPx = zoomed ? Math.round(fitCellPx * 1.56) : fitCellPx;
  const emblemPx = Math.max(13, Math.round(cellPx * 0.72));

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

  const handlePlaceStone = async (r: number, c: number) => {
    if (busy || gameEnded || !isMyTurn) return;
    if (view.board[r * view.size + c] !== null) return;
    play('stamp');
    await act({ type: 'caro_move', row: r, col: c });
  };

  const handleEarlyEnd = async () => {
    if (!isHost || busy) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await act({ type: 'end' });
  };

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
                Bàn cờ kín đặc bất phân thắng bại — Hòa cờ lịch sử!
              </T>
            </>
          ) : isMyTurn && mySymbol ? (
            <>
              <CaroEmblem symbol={mySymbol} size={18} />
              <T style={[styles.bottomTxt, { color: '#4ADE80' }]}>
                Tới lượt bạn cầm quân {mySymbol}! Chạm vào ô trống trên bàn cờ để đánh.
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
              Đang theo dõi đại chiến Cờ Caro {view.order.length} phe kịch tính!
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

  const boardElement = (
    <View
      testID="caro-board"
      style={[
        styles.boardGrid,
        {
          width: cellPx * view.size + 6,
          height: cellPx * view.size + 6,
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
              <Pressable
                key={c}
                testID={`caro-${r}-${c}`}
                disabled={busy || gameEnded || !isMyTurn || cellSym !== null}
                onPress={() => handlePlaceStone(r, c)}
                style={({ pressed }) => [
                  styles.cell,
                  { width: cellPx, height: cellPx },
                  isLast && styles.cellLastMove,
                  isWin && styles.cellWinLaser,
                  pressed && isMyTurn && cellSym === null && styles.cellPressed,
                ]}
              >
                {star && <View style={styles.starDot} />}
                {cellSym !== null && (
                  <CaroEmblem symbol={cellSym} size={emblemPx} />
                )}
                {isLast && !isWin && <View pointerEvents="none" style={styles.lastMoveRing} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <Shell game={game} room={room} strip={strip} wide={wide} bottom={renderBottom()}>
      {view.winnerId !== null && <Confetti />}

      {/* THANH ĐIỀU KHIỂN LƯỢT ĐÁNH & LUẬT BÀN CỜ */}
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
              <View
                style={[
                  styles.rulePill,
                  view.blockTwoEnds ? styles.rulePillBlock : styles.rulePillFree,
                ]}
              >
                <UiIcon
                  name={view.blockTwoEnds ? 'Shield' : 'Zap'}
                  size={12}
                  color={view.blockTwoEnds ? '#FDE047' : '#67E8F9'}
                />
                <T style={styles.rulePillTxt}>
                  {view.blockTwoEnds ? 'Chặn 2 đầu' : 'Tự do'}
                </T>
              </View>
              <T style={styles.moveCounterTxt}>Nước #{view.moveCount}</T>
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

      {err && (
        <View style={[styles.errBanner, sticker(2)]}>
          <UiIcon name="AlertTriangle" size={15} color="#FEF08A" />
          <T style={styles.errBannerTxt}>{err}</T>
        </View>
      )}

      {/* THANH ZOOM 1.5× / PAN TRÊN DI ĐỘNG + TỌA ĐỘ NƯỚC VỪA ĐÁNH */}
      <View style={styles.boardToolbar}>
        <View style={styles.lastMoveInfo}>
          <UiIcon name="LayoutGrid" size={14} color={theme.onBg} />
          <T style={[styles.lastMoveInfoTxt, { color: theme.onBg }]}>
            {view.lastMove
              ? `Vừa đánh: (${view.lastMove.row + 1}, ${view.lastMove.col + 1}) bởi @${view.names[view.lastMove.playerId] ?? ''}`
              : `Bàn cờ ${view.size}×${view.size} sẵn sàng khai cuộc`}
          </T>
        </View>

        <Pressable
          testID="caro-zoom-toggle"
          onPress={() => {
            play('pop');
            setZoomed((z) => !z);
          }}
          style={[styles.zoomToggleBtn, zoomed && styles.zoomToggleBtnOn]}
        >
          <UiIcon
            name="Search"
            size={13}
            color={zoomed ? '#022C22' : '#E2E8F0'}
          />
          <T style={[styles.zoomToggleTxt, zoomed && { color: '#022C22' }]}>
            {zoomed ? 'Thu gọn 1×' : 'Zoom 1.5×'}
          </T>
        </Pressable>
      </View>

      {/* ĐẤU TRƯỜNG BÀN CỜ CARO 15×15 CYBER JADE */}
      <View style={[styles.boardArenaWrap, sticker(4)]}>
        {zoomed ? (
          <ScrollView
            style={styles.zoomVertScroll}
            contentContainerStyle={styles.zoomScrollContent}
            nestedScrollEnabled
          >
            <ScrollView
              horizontal
              contentContainerStyle={styles.zoomScrollContent}
              nestedScrollEnabled
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
  rulePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
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
    fontSize: 11,
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
    gap: 8,
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
  zoomVertScroll: {
    maxHeight: 410,
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
  },
  bottomTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
  hostRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
});
