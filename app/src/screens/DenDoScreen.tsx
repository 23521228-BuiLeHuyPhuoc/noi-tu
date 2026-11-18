import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DEN_DO_GIFT_CHECKPOINTS,
  DEN_DO_GOAL_METERS,
  DEN_DO_ITEM_INFO,
  type DenDoView,
} from '../../../shared/src/dendo';
import { PLAYER_COLORS, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import { themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Button, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Confetti } from '../components/Fun';
import { EmojiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

export function DenDoScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as DenDoView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [nowMs, setNowMs] = useState(() => Date.now() + game.clockOffset);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const lastStepPointerAtRef = useRef<number>(0);

  const sirenActive =
    view.fakeSirenUntil !== null && view.fakeSirenUntil > nowMs && view.fakeSirenBy !== null;

  useEffect(() => {
    if (!view.fakeSirenUntil || view.fakeSirenUntil <= Date.now() + game.clockOffset) return;
    const iv = setInterval(() => setNowMs(Date.now() + game.clockOffset), 120);
    return () => clearInterval(iv);
  }, [view.fakeSirenUntil, game.clockOffset]);

  useOnChange(view.light, (lt) => {
    setNowMs(Date.now() + game.clockOffset);
    if (lt === 'green') play('turn');
    else if (lt === 'yellow') play('pop');
    else play('error');
  });

  useOnChange(view.caughtIds.includes(me), (caught) => {
    if (caught) play('lose');
  });

  useOnChange(view.finishedOrder.includes(me), (fin) => {
    if (fin) play('win');
  });

  const caughtSet = useMemo(() => new Set(view.caughtIds), [view.caughtIds]);
  const shieldSet = useMemo(() => new Set(view.shieldedIds), [view.shieldedIds]);
  const finishedSet = useMemo(() => new Set(view.finishedOrder), [view.finishedOrder]);

  const myProgress = view.progress[me] ?? 0;
  const myItem = view.items[me] ?? null;
  const myCaught = caughtSet.has(me);
  const myFinished = finishedSet.has(me);
  const isSpectator = !view.order.includes(me);

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    room.players.forEach((p, idx) => {
      const cIdx = p.character?.color ?? idx;
      m.set(p.id, PLAYER_COLORS[cIdx % PLAYER_COLORS.length].hex);
    });
    return m;
  }, [room.players]);

  const sortedOrder = useMemo(
    () =>
      [...view.order].sort((a, b) => {
        const fa = view.finishedOrder.indexOf(a);
        const fb = view.finishedOrder.indexOf(b);
        if (fa !== -1 && fb !== -1) return fa - fb;
        if (fa !== -1) return -1;
        if (fb !== -1) return 1;
        return (view.progress[b] ?? 0) - (view.progress[a] ?? 0);
      }),
    [view.order, view.finishedOrder, view.progress],
  );

  const doStep = async () => {
    if (isSpectator || myFinished || myCaught) return;
    if (view.light === 'green' || view.light === 'yellow') play('pop');
    await game.act({ type: 'dd_step' });
  };

  const doTrick = async () => {
    if (isSpectator || !myItem) return;
    play('sparkle');
    await game.act({ type: 'dd_trick' });
  };

  const handleEarlyEnd = async () => {
    if (!isHost) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await game.act({ type: 'end' });
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: sortedOrder,
      ring: (p: PublicPlayer) => {
        if (finishedSet.has(p.id)) return C.gold;
        if (caughtSet.has(p.id)) return '#F43F5E';
        if (shieldSet.has(p.id)) return '#38BDF8';
        return undefined;
      },
      rank: (p: PublicPlayer) => {
        const idx = sortedOrder.indexOf(p.id);
        return idx >= 0 ? idx + 1 : undefined;
      },
      sub: (p: PublicPlayer) => {
        const m = Math.round(view.progress[p.id] ?? 0);
        if (finishedSet.has(p.id)) return '🏁 Đích!';
        if (caughtSet.has(p.id)) return `${m}m 💥`;
        return `${m}m`;
      },
    }),
    [sortedOrder, finishedSet, caughtSet, shieldSet, view.progress],
  );

  const signalColors: [string, string, string] =
    view.light === 'green'
      ? ['#065F46', '#064E3B', '#022C22']
      : view.light === 'yellow'
        ? ['#78350F', '#451A03', '#1E293B']
        : ['#7F1D1D', '#450A0A', '#18181B'];

  return (
    <Shell
      game={game}
      room={room}
      strip={strip}
      wide={wide}
      bottom={
        <View style={styles.bottomWrap}>
          {!isSpectator && (
            <View
              style={[
                styles.controlDeck,
                Platform.OS === 'web'
                  ? ({
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      touchAction: 'manipulation',
                    } as object)
                  : null,
              ]}
              testID="dd-controls"
              // @ts-expect-error chặn menu giữ ngón tay trên di động
              onContextMenu={(e: Event) => e.preventDefault()}
            >
              <Pressable
                testID="dd-step-btn"
                disabled={myFinished || myCaught}
                // @ts-expect-error nhạy tức thì ngay khi chạm ngón cái
                onPointerDown={(e: PointerEvent) => {
                  if (myFinished || myCaught) return;
                  e.preventDefault();
                  lastStepPointerAtRef.current = performance.now();
                  void doStep();
                }}
                onPress={() => {
                  if (performance.now() - lastStepPointerAtRef.current < 320) return;
                  void doStep();
                }}
                style={({ pressed }) => [
                  styles.sprintPad,
                  view.light === 'red' && styles.sprintPadRed,
                  view.light === 'yellow' && styles.sprintPadYellow,
                  (myFinished || myCaught) && styles.sprintPadDisabled,
                  pressed && !myFinished && !myCaught && { transform: [{ scale: 0.96 }] },
                ]}
              >
                <EmojiIcon
                  emoji={
                    myFinished ? '🏆' : myCaught ? '💥' : view.light === 'red' ? '🛑' : '🏃'
                  }
                  size={28}
                />
                <View style={{ alignItems: 'center' }}>
                  <T selectable={false} style={styles.sprintMainTxt}>
                    {myFinished
                      ? 'ĐÃ VỀ ĐÍCH 100M!'
                      : myCaught
                        ? 'BỊ PHẠT ĐÈN ĐỎ (-28M)'
                        : view.light === 'red'
                          ? 'ĐÈN ĐỎ — DỪNG TAY!'
                          : 'NHẤP CHẠY NGAY! (+3.5M)'}
                  </T>
                  <T selectable={false} style={styles.sprintSubTxt}>
                    Bạn đang ở mốc {Math.round(myProgress)}m / 100m
                  </T>
                </View>
              </Pressable>

              <Pressable
                testID="dd-trick-btn"
                disabled={!myItem}
                onPress={() => void doTrick()}
                style={({ pressed }) => [
                  styles.trickPad,
                  myItem ? styles.trickPadReady : styles.trickPadEmpty,
                  pressed && myItem && { transform: [{ scale: 0.95 }] },
                ]}
              >
                <EmojiIcon emoji={myItem ? DEN_DO_ITEM_INFO[myItem].emoji : '🎁'} size={24} />
                <T selectable={false} numberOfLines={2} style={styles.trickTxt}>
                  {myItem ? DEN_DO_ITEM_INFO[myItem].name : 'Qua 25m/55m\nnhận Đạo cụ'}
                </T>
              </Pressable>
            </View>
          )}
          <T style={[styles.bottomHint, { color: theme.onBg }]}>
            {myFinished
              ? '🏆 Bạn đã cán vạch 100m an toàn! Cổ vũ (hoặc xem đồng đội ngã nhào) nhé!'
              : view.light === 'red'
                ? '🛑 ĐÈN ĐỎ RADAR QUÉT! Đứng im tuyệt đối (trừ khi bạn có Khiên 🛡️ hoặc muốn bóp còi dụ bạn)!'
                : '🟢 ĐÈN XANH! Nhấp liên hoàn nút CHẠY bên trên để bứt tốc qua mốc quà 25m / 55m / 80m!'}
          </T>
          {isHost && (
            <View style={styles.hostRow}>
              <Button
                testID="dendo-end-early"
                small
                variant={confirmEnd ? 'danger' : 'paper'}
                title={confirmEnd ? 'Xác nhận kết thúc?' : 'Kết thúc sớm'}
                onPress={() => void handleEarlyEnd()}
              />
              {confirmEnd && (
                <Button small variant="paper" title="Hủy" onPress={() => setConfirmEnd(false)} />
              )}
            </View>
          )}
        </View>
      }
    >
      {myFinished && <Confetti />}

      {/* CỘT ĐÈN TÍN HIỆU & BÚP BÊ CẢNH SÁT GIAO THÔNG */}
      <MotionSurface>
        <LinearGradient
          colors={signalColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.signalCard, sticker(4)]}
          testID="dd-signal-card"
        >
          <View style={styles.signalTopRow}>
            {/* Hộp 3 bóng đèn giao thông */}
            <View style={styles.lampHousing} testID={`dd-light-${view.light}`}>
              <View style={[styles.lampBulb, view.light === 'red' && styles.lampRedOn]} />
              <View style={[styles.lampBulb, view.light === 'yellow' && styles.lampYellowOn]} />
              <View style={[styles.lampBulb, view.light === 'green' && styles.lampGreenOn]} />
            </View>

            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T style={styles.roundSubTxt}>
                NHỊP ĐÈN {view.round}/{view.maxRounds} · ĐÍCH {DEN_DO_GOAL_METERS}M
              </T>
              <T style={styles.signalHeadline}>
                {view.light === 'green'
                  ? '🟢 ĐÈN XANH — CHẠY TỐC LỰC!'
                  : view.light === 'yellow'
                    ? '🟡 ĐÈN VÀNG — PHANH GẤP!'
                    : '🔴 ĐÈN ĐỎ — ĐỨNG IM TUYỆT ĐỐI!'}
              </T>
            </View>

            <View style={styles.dollOrb}>
              <EmojiIcon
                emoji={view.light === 'red' ? '🚨' : view.light === 'yellow' ? '⚠️' : '🏃'}
                size={28}
                glow={view.light === 'red'}
              />
            </View>
          </View>

          <CountdownBar
            endsAt={view.lightEndsAt}
            total={view.lightSeconds}
            clockOffset={game.clockOffset}
            lightText
            testID="dd-timer"
          />
        </LinearGradient>
      </MotionSurface>

      {/* CÒI GIẢ ĐÈN XANH BÓP ĐỒNG ĐỘI LÚC ĐÈN ĐỎ! */}
      {sirenActive && (
        <LinearGradient
          colors={['#16A34A', '#EC4899', '#CA8A04']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fakeSirenBanner, sticker(3)]}
          testID="dd-fake-siren"
        >
          <EmojiIcon emoji="📣" size={22} />
          <T style={styles.fakeSirenTxt}>
            @{view.names[view.fakeSirenBy!] ?? 'Ai đó'} HÔ TO: «ĐÈN XANH BẬT RỒI CHẠY LẸ KÌA!!»{' '}
            {view.light === 'red' ? '(COI CHỪNG CÚ LỪA!!)' : ''}
          </T>
        </LinearGradient>
      )}

      {/* ĐƯỜNG ĐUA 0 -> 100M CHO 2–12 NGƯỜI CHƠI */}
      <View style={[styles.trackArena, sticker(4)]} testID="dd-track">
        {/* Thước mốc Hộp Quà Đạo Cụ 25m / 55m / 80m / 100m */}
        <View style={styles.checkpointRuler}>
          <T style={styles.rulerMark}>0m</T>
          {DEN_DO_GIFT_CHECKPOINTS.map((cp) => (
            <View key={cp} style={styles.rulerGiftPin}>
              <EmojiIcon emoji="🎁" size={12} />
              <T style={styles.rulerMark}>{cp}m</T>
            </View>
          ))}
          <T style={[styles.rulerMark, { color: '#FDE047' }]}>🏁100m</T>
        </View>

        <View style={{ gap: 6 }}>
          {sortedOrder.map((pid) => {
            const m = Math.max(0, Math.min(DEN_DO_GOAL_METERS, view.progress[pid] ?? 0));
            const pct = (m / DEN_DO_GOAL_METERS) * 100;
            const hex = colorMap.get(pid) ?? '#38BDF8';
            const caught = caughtSet.has(pid);
            const shielded = shieldSet.has(pid);
            const fin = finishedSet.has(pid);
            const isMeRow = pid === me;

            return (
              <View
                key={pid}
                testID={`dd-lane-${pid}`}
                style={[styles.laneRow, isMeRow && styles.laneRowMe]}
              >
                <View style={styles.laneInfoCol}>
                  <T numberOfLines={1} style={[styles.laneName, isMeRow && { color: '#FEF08A' }]}>
                    {view.names[pid] ?? pid}
                  </T>
                  <T style={styles.laneMeters}>{Math.round(m)}m</T>
                </View>

                <View style={styles.laneTrackBar}>
                  <View
                    style={[
                      styles.laneFill,
                      {
                        width: `${pct}%`,
                        backgroundColor: caught ? '#F43F5E' : fin ? '#FACC15' : hex,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.runnerPin,
                      { left: `${Math.min(93, Math.max(0, pct - 3))}%` },
                    ]}
                  >
                    <EmojiIcon emoji="🏃" size={16} style={{ transform: [{ scaleX: -1 }] }} />
                    {shielded && <EmojiIcon emoji="🛡️" size={12} />}
                    {caught && <EmojiIcon emoji="💥" size={13} />}
                    {fin && <EmojiIcon emoji="🏆" size={13} />}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* NHẬT KÝ BÓP ĐỒNG ĐỘI & TIA LASER */}
      {view.lastEvents.length > 0 && (
        <View style={[styles.eventBox, sticker(2)]} testID="dd-events">
          {view.lastEvents.slice(-2).map((ev, i) => (
            <T key={i} numberOfLines={1} style={styles.eventLineTxt}>
              • {ev}
            </T>
          ))}
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  signalCard: {
    borderRadius: 22,
    padding: 12,
    gap: 9,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  signalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lampHousing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#090D16',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#475569',
  },
  lampBulb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  lampRedOn: {
    backgroundColor: '#EF4444',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 12px #EF4444' } as object) : null),
  },
  lampYellowOn: {
    backgroundColor: '#FACC15',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 12px #FACC15' } as object) : null),
  },
  lampGreenOn: {
    backgroundColor: '#22C55E',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 0 12px #22C55E' } as object) : null),
  },
  roundSubTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#CBD5E1',
    letterSpacing: 0.4,
  },
  signalHeadline: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONT,
  },
  dollOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  fakeSirenBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FEF08A',
  },
  fakeSirenTxt: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  trackArena: {
    backgroundColor: '#0B1324',
    borderRadius: 22,
    padding: 11,
    gap: 8,
    borderWidth: 2,
    borderColor: '#334155',
  },
  checkpointRuler: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 82,
    paddingRight: 4,
    position: 'relative',
    height: 18,
  },
  rulerGiftPin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rulerMark: {
    fontSize: 10,
    fontWeight: '900',
    color: '#94A3B8',
  },
  laneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
  },
  laneRowMe: {
    backgroundColor: 'rgba(20, 83, 45, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.55)',
  },
  laneInfoCol: {
    width: 72,
  },
  laneName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  laneMeters: {
    fontSize: 10,
    fontWeight: '900',
    color: '#38BDF8',
  },
  laneTrackBar: {
    flex: 1,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  laneFill: {
    height: '100%',
    borderRadius: 10,
    opacity: 0.72,
  },
  runnerPin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  eventBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  eventLineTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FEF08A',
  },

  controlDeck: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 9,
  },
  sprintPad: {
    flex: 1,
    minHeight: 74,
    borderRadius: 20,
    backgroundColor: '#16A34A',
    borderWidth: 3,
    borderColor: '#86EFAC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10,
  },
  sprintPadYellow: {
    backgroundColor: '#D97706',
    borderColor: '#FDE68A',
  },
  sprintPadRed: {
    backgroundColor: '#991B1B',
    borderColor: '#FDA4AF',
  },
  sprintPadDisabled: {
    backgroundColor: '#334155',
    borderColor: '#64748B',
    opacity: 0.85,
  },
  sprintMainTxt: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONT,
    textAlign: 'center',
  },
  sprintSubTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#ECFDF5',
  },

  trickPad: {
    width: 112,
    minHeight: 74,
    borderRadius: 20,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 6,
  },
  trickPadReady: {
    backgroundColor: '#581C87',
    borderColor: '#FACC15',
  },
  trickPadEmpty: {
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    opacity: 0.78,
  },
  trickTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEF08A',
    textAlign: 'center',
    lineHeight: 13,
  },

  bottomWrap: { gap: 6 },
  bottomHint: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', paddingHorizontal: 6 },
  hostRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
