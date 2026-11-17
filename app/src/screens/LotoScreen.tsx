import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LOTO_RHYMES,
  checkLotoRow,
  type LotoTicketColor,
  type LotoView,
} from '../../../shared/src/loto';
import { themeById } from '../../../shared/src/themes';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, UiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const TICKET_PALETTES: Record<
  LotoTicketColor,
  {
    name: string;
    headerGrad: readonly [string, string, string];
    frameBorder: string;
    blankBg: string;
    blankDot: string;
    cellBorder: string;
    paperBg: string;
    numColor: string;
  }
> = {
  rose: {
    name: 'Vé Hồng Đào Đại Cát',
    headerGrad: ['#9F1239', '#E11D48', '#FB7185'],
    frameBorder: '#BE123C',
    blankBg: '#FECDD3',
    blankDot: 'rgba(159,18,57,0.22)',
    cellBorder: '#FDA4AF',
    paperBg: '#FFF1F2',
    numColor: '#4C0519',
  },
  gold: {
    name: 'Vé Hoàng Kim Phú Quý',
    headerGrad: ['#92400E', '#D97706', '#FBBF24'],
    frameBorder: '#B45309',
    blankBg: '#FDE68A',
    blankDot: 'rgba(146,64,14,0.22)',
    cellBorder: '#FCD34D',
    paperBg: '#FFFBEB',
    numColor: '#451A03',
  },
  jade: {
    name: 'Vé Ngọc Bích Lộc Phát',
    headerGrad: ['#065F46', '#059669', '#34D399'],
    frameBorder: '#047857',
    blankBg: '#A7F3D0',
    blankDot: 'rgba(6,95,70,0.22)',
    cellBorder: '#6EE7B7',
    paperBg: '#ECFDF5',
    numColor: '#022C22',
  },
  sky: {
    name: 'Vé Thiên Thanh Vạn Sự',
    headerGrad: ['#075985', '#0284C7', '#38BDF8'],
    frameBorder: '#0369A1',
    blankBg: '#BAE6FD',
    blankDot: 'rgba(7,89,133,0.22)',
    cellBorder: '#7DD3FC',
    paperBg: '#F0F9FF',
    numColor: '#082F49',
  },
  violet: {
    name: 'Vé Tím Huế Vinh Hoa',
    headerGrad: ['#5B21B6', '#7C3AED', '#A78BFA'],
    frameBorder: '#6D28D9',
    blankBg: '#DDD6FE',
    blankDot: 'rgba(91,33,182,0.22)',
    cellBorder: '#C4B5FD',
    paperBg: '#F5F3FF',
    numColor: '#2E1065',
  },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  kinh_false: 'Hô KINH HỤT quê độ! Chưa đủ 5 số trúng trên hàng này — bị khóa bấm Kinh 2 lượt!',
  kinh_locked: 'Đang bị khóa miệng vì hô Kinh hụt vừa nãy! Đợi qua thêm số nữa nhé!',
  bad_action: 'Con số này chưa được đoàn lô tô kêu tới!',
};

function errOf(reason: ActionError): string {
  return (
    EXTRA_ERRORS[reason] ??
    (actionText as Partial<Record<ActionError, string>>)[reason] ??
    'Thao tác không hợp lệ.'
  );
}

export function LotoScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as LotoView;
  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [peekOpen, setPeekOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useOnChange(view.currentNum, (num) => {
    if (num !== null) play('pop');
  });

  useOnChange(view.waitingIds.length, (len) => {
    if (len > 0) play('turn');
  });

  useOnChange(view.winnerId, (winId) => {
    if (winId) play(winId === me ? 'win' : 'reveal');
  });

  const calledSet = useMemo(() => new Set(view.called), [view.called]);
  const waitingSet = useMemo(() => new Set(view.waitingIds), [view.waitingIds]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const hasMyTicket = Boolean(view.tickets[me]);
  const ticketOwnerId = hasMyTicket ? me : (view.order[0] ?? '');
  const activeGrid = useMemo(
    () => view.tickets[ticketOwnerId] ?? [],
    [view.tickets, ticketOwnerId],
  );
  const activeColorKey: LotoTicketColor = view.ticketColors[ticketOwnerId] ?? 'rose';
  const pal = TICKET_PALETTES[activeColorKey] ?? TICKET_PALETTES.rose;

  const markedSet = useMemo(
    () => new Set(view.marked[ticketOwnerId] ?? []),
    [view.marked, ticketOwnerId],
  );

  const penaltyUntil = view.penaltyUntilCount[me] ?? 0;
  const penaltyLeft = Math.max(0, penaltyUntil - view.called.length);
  const isLocked = penaltyLeft > 0;

  const rowChecks = useMemo(() => {
    return [0, 1, 2].map((r) =>
      checkLotoRow(activeGrid, r, calledSet, view.autoMark ? undefined : markedSet),
    );
  }, [activeGrid, calledSet, markedSet, view.autoMark]);

  const recentBalls = useMemo(() => view.called.slice(-8), [view.called]);
  const currentRhyme = view.currentNum !== null ? LOTO_RHYMES[view.currentNum] : null;
  const callSec = Math.max(1, Math.round(view.callIntervalMs / 1000));

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

  const handleCellTap = async (num: number) => {
    if (busy || !hasMyTicket || view.status !== 'calling') return;
    play(calledSet.has(num) ? 'stamp' : 'tick');
    await act({ type: 'loto_mark', num });
  };

  const handleKinh = async (row: 0 | 1 | 2) => {
    if (busy || !hasMyTicket || view.status !== 'calling') return;
    play('siren');
    await act({ type: 'loto_kinh', row });
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.winnerId,
      ring: (p: PublicPlayer) => {
        if (view.winnerId === p.id) return C.gold;
        if (waitingSet.has(p.id)) return '#F97316';
        return TICKET_PALETTES[view.ticketColors[p.id] ?? 'rose']?.frameBorder;
      },
      sub: (p: PublicPlayer) => {
        if (view.winnerId === p.id) return 'KINH RỒI!';
        if (waitingSet.has(p.id)) return 'ĐỢI (4/5)!';
        const mLen = view.marked[p.id]?.length ?? 0;
        return `${mLen}/15 số`;
      },
    }),
    [view.order, view.winnerId, view.ticketColors, view.marked, waitingSet],
  );

  const renderBottom = () => {
    if (view.winnerId) {
      return (
        <View style={styles.footerInline}>
          <EmojiIcon emoji="🎊" size={18} />
          <T style={[styles.footerTxt, { color: '#FDE047' }]}>
            {view.winnerId === me
              ? 'Chúc mừng bạn đã KINH rực rỡ đêm hội chợ!'
              : `${view.names[view.winnerId] ?? view.winnerId} đã hô KINH thành công hàng ${(view.winningRow ?? 0) + 1}!`}
          </T>
        </View>
      );
    }

    if (!hasMyTicket) {
      return (
        <T style={[styles.footerTxt, { color: theme.onBg }]}>
          Bạn đang xem ké tờ vé của {view.names[ticketOwnerId] ?? 'hàng xóm'} — ván sau phát vé riêng nhé!
        </T>
      );
    }

    const readyRowIdx = rowChecks.findIndex((c) => c.validKinh);
    return (
      <View style={styles.footerInline}>
        <EmojiIcon emoji={readyRowIdx >= 0 ? '🎉' : '🎫'} size={17} />
        <T style={[styles.footerTxt, { color: readyRowIdx >= 0 ? '#4ADE80' : theme.onBg }]}>
          {readyRowIdx >= 0
            ? `HÀNG ${readyRowIdx + 1} ĐÃ ĐỦ 5/5! BẤM NÚT KINH NGAY KẺO TRỄ!`
            : view.autoMark
              ? 'Chế độ tự chấm đang bật — thấy đủ 5/5 số một hàng là bấm KINH liền tay!'
              : 'Nghe câu rao, chạm đóng dấu đỏ lên số vừa gọi rồi hô KINH khi đủ 5 số 1 hàng!'}
        </T>
      </View>
    );
  };

  return (
    <Shell game={game} room={room} strip={strip} wide={wide} bottom={renderBottom()}>
      {view.winnerId !== null && <Confetti />}

      {/* SÂN KHẤU RAO SỐ HỘI CHỢ TÂN THỜI */}
      <MotionSurface>
        <LinearGradient
          colors={['#FACC15', '#F97316', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.callerRim, sticker(4)]}
        >
          <LinearGradient
            testID="loto-caller"
            colors={['#2E073F', '#6B1143', '#3B0819']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.callerInner}
          >
            {/* Thanh Đèn Lồng Hội Chợ */}
            <View style={styles.marqueeBar}>
              <View style={styles.inlineRow}>
                <EmojiIcon emoji="🏮" size={16} />
                <T style={styles.marqueeTitle}>ĐOÀN LÔ TÔ XÓM LẦY</T>
                <EmojiIcon emoji="🎤" size={15} />
              </View>
              <View style={styles.countChip}>
                <T style={styles.countChipTxt}>
                  Đã kêu {view.called.length}/90 · Còn {view.remainingCount}
                </T>
              </View>
            </View>

            {/* Quả Cầu Lô Tô 3D + Câu Vè Rao Số */}
            <View style={styles.callerStageRow}>
              <LinearGradient
                colors={['#FEF08A', '#F59E0B', '#DC2626']}
                start={{ x: 0.15, y: 0.1 }}
                end={{ x: 0.85, y: 0.95 }}
                style={[styles.bingoBallOuter, wide && styles.bingoBallOuterWide]}
              >
                <View style={[styles.bingoBallCore, wide && styles.bingoBallCoreWide]}>
                  <T style={[styles.bingoBallNum, wide && { fontSize: 34 }]}>
                    {view.currentNum !== null ? String(view.currentNum) : '--'}
                  </T>
                </View>
              </LinearGradient>

              <View style={styles.chantBox}>
                {currentRhyme && (
                  <View style={styles.rhymeTitlePill}>
                    <EmojiIcon emoji="✨" size={12} />
                    <T numberOfLines={1} style={styles.rhymeTitleTxt}>
                      {currentRhyme.title}
                    </T>
                  </View>
                )}
                <T style={styles.chantText}>
                  {view.currentChant ??
                    'Cờ ra con mấy, con mấy gì đây… Bà con trải vé chuẩn bị dò nha!'}
                </T>
              </View>
            </View>

            {view.status === 'calling' && (
              <CountdownBar
                endsAt={view.nextCallAt}
                total={callSec}
                clockOffset={game.clockOffset}
                lightText
                testID="loto-timer"
              />
            )}

            {/* Dải 8 Con Số Vừa Kêu Gần Nhất */}
            <View style={styles.recentStrip}>
              <T style={styles.recentLabel}>Vừa ra:</T>
              <View style={styles.recentBallsWrap}>
                {recentBalls.length === 0 ? (
                  <T style={styles.recentEmpty}>Đang lắc lồng cầu…</T>
                ) : (
                  recentBalls.map((n, i) => {
                    const isLatest = i === recentBalls.length - 1;
                    return (
                      <View
                        key={`${n}-${i}`}
                        style={[styles.miniBall, isLatest && styles.miniBallLatest]}
                      >
                        <T style={[styles.miniBallTxt, isLatest && styles.miniBallTxtLatest]}>
                          {n}
                        </T>
                      </View>
                    );
                  })
                )}
              </View>
            </View>

            {/* CẢNH BÁO ĐỎ RỰC KHI CÓ NGƯỜI SẮP KINH (4/5) */}
            {view.waitingIds.length > 0 && (
              <LinearGradient
                colors={['#DC2626', '#EA580C', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.waitingAlertBar}
              >
                <EmojiIcon emoji="🔥" size={16} />
                <T style={styles.waitingAlertTxt}>
                  SẮP KINH (ĐỢI!):{' '}
                  {view.waitingIds.map((id) => `@${view.names[id] ?? id}`).join(', ')} đã trúng 4/5!
                </T>
              </LinearGradient>
            )}

            {view.lastEvent && (
              <View style={styles.eventBanner}>
                <EmojiIcon emoji="📢" size={14} />
                <T style={styles.eventBannerTxt}>{view.lastEvent}</T>
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </MotionSurface>

      {/* THÔNG BÁO LỖI HOẶC PHẠT KHÓA KINH */}
      {err && (
        <View style={[styles.errorBanner, sticker(2)]}>
          <UiIcon name="AlertTriangle" size={16} color="#FEF08A" />
          <T style={styles.errorBannerTxt}>{err}</T>
        </View>
      )}

      {isLocked && (
        <View style={[styles.lockPenaltyBanner, sticker(2)]}>
          <UiIcon name="Lock" size={15} color="#9A3412" />
          <T style={styles.lockPenaltyTxt}>
            Đang bị khóa hô KINH còn {penaltyLeft} lượt gọi số do hô hụt quê độ!
          </T>
        </View>
      )}

      {/* TỜ VÉ LÔ TÔ GIẤY TRUYỀN THỐNG 9 CỘT × 3 HÀNG */}
      <View
        testID="loto-ticket"
        style={[
          styles.ticketPaper,
          sticker(4),
          {
            backgroundColor: pal.paperBg,
            borderColor: pal.frameBorder,
          },
        ]}
      >
        <LinearGradient
          colors={[...pal.headerGrad]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ticketHeader}
        >
          <View style={styles.inlineRow}>
            <EmojiIcon emoji="🎟️" size={16} />
            <T numberOfLines={1} style={styles.ticketHeaderTitle}>
              {pal.name} · {hasMyTicket ? 'Vé Của Bạn' : `Vé @${view.names[ticketOwnerId] ?? ''}`}
            </T>
          </View>
          <View style={styles.modeTag}>
            <T style={styles.modeTagTxt}>{view.autoMark ? 'Tự chấm' : 'Tự dò'}</T>
          </View>
        </LinearGradient>

        <View style={styles.ticketRowsWrap}>
          {activeGrid.map((rowCells, rIdx) => {
            const isWinRow =
              view.winnerId === ticketOwnerId && view.winningRow === rIdx;
            const rInfo = rowChecks[rIdx];
            const isRowWaiting = rInfo && rInfo.hits === 4;

            return (
              <View
                key={rIdx}
                style={[
                  styles.ticketRow,
                  isWinRow && styles.ticketRowWin,
                  isRowWaiting && !isWinRow && styles.ticketRowWait,
                ]}
              >
                {rowCells.map((cell, cIdx) => {
                  if (cell === null) {
                    return (
                      <View
                        key={`b-${rIdx}-${cIdx}`}
                        style={[
                          styles.ticketCell,
                          wide && styles.ticketCellWide,
                          {
                            backgroundColor: pal.blankBg,
                            borderColor: pal.cellBorder,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.blankOrnament,
                            { backgroundColor: pal.blankDot },
                          ]}
                        />
                      </View>
                    );
                  }

                  const stamped = markedSet.has(cell);
                  const isJustCalled = view.currentNum === cell;

                  return (
                    <Pressable
                      key={`n-${rIdx}-${cIdx}-${cell}`}
                      testID={`loto-cell-${cell}`}
                      disabled={!hasMyTicket || view.status !== 'calling'}
                      onPress={() => handleCellTap(cell)}
                      style={({ pressed }) => [
                        styles.ticketCell,
                        wide && styles.ticketCellWide,
                        styles.ticketNumCell,
                        { borderColor: pal.cellBorder },
                        isJustCalled && !stamped && styles.cellJustCalled,
                        pressed && hasMyTicket && { transform: [{ scale: 0.93 }] },
                      ]}
                    >
                      <View
                        style={[
                          styles.numSealWrap,
                          stamped && styles.redLuckySeal,
                          wide && stamped && styles.redLuckySealWide,
                        ]}
                      >
                        <T
                          style={[
                            styles.cellNumTxt,
                            wide && styles.cellNumTxtWide,
                            { color: stamped ? '#BE123C' : pal.numColor },
                          ]}
                        >
                          {cell}
                        </T>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      {/* BỘ 3 NÚT HÔ KINH HÀNG 1 / 2 / 3 */}
      {hasMyTicket && (
        <View style={styles.kinhRow}>
          {([0, 1, 2] as const).map((rIdx) => {
            const info = rowChecks[rIdx] ?? { validKinh: false, hits: 0, nums: [] };
            const ready = info.validKinh && !isLocked;
            const waitFour = info.hits === 4 && !isLocked;

            return (
              <Pressable
                key={rIdx}
                testID={`loto-kinh-${rIdx}`}
                disabled={busy || view.status !== 'calling'}
                onPress={() => handleKinh(rIdx)}
                style={({ pressed }) => [
                  styles.kinhBtnOuter,
                  sticker(ready ? 4 : 2),
                  ready && styles.kinhBtnReadyGlow,
                  pressed && { transform: [{ translateY: 2 }] },
                  isLocked && { opacity: 0.68 },
                ]}
              >
                <LinearGradient
                  colors={
                    isLocked
                      ? ['#CBD5E1', '#94A3B8', '#64748B']
                      : ready
                        ? ['#FEF08A', '#FACC15', '#EA580C']
                        : waitFour
                          ? ['#FFEDD5', '#FED7AA', '#FDBA74']
                          : ['#FFFFFF', '#F8FAFC', '#E2E8F0']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.kinhBtnInner}
                >
                  <View style={styles.inlineRow}>
                    {isLocked ? (
                      <UiIcon name="Lock" size={13} color="#1E293B" />
                    ) : (
                      <EmojiIcon emoji={ready ? '🎉' : waitFour ? '🔥' : '🎫'} size={14} />
                    )}
                    <T
                      numberOfLines={1}
                      style={[
                        styles.kinhBtnTitle,
                        ready && { color: '#451A03' },
                      ]}
                    >
                      KINH HÀNG {rIdx + 1}!
                    </T>
                  </View>
                  <T
                    numberOfLines={1}
                    style={[
                      styles.kinhBtnSub,
                      ready && { color: '#7C2D12', fontWeight: '900' },
                      waitFour && { color: '#C2410C', fontWeight: '900' },
                    ]}
                  >
                    {isLocked
                      ? `Khóa (${penaltyLeft} lượt)`
                      : ready
                        ? 'ĐỦ 5/5 · HÔ NGAY!'
                        : waitFour
                          ? '4/5 · ĐANG ĐỢI!'
                          : `Đã trúng ${info.hits}/5`}
                  </T>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* BẢNG MỞ RỘNG SOI VÉ HÀNG XÓM */}
      <Card style={styles.peekCard}>
        <Pressable
          testID="loto-peek-toggle"
          onPress={() => {
            play('pop');
            setPeekOpen((v) => !v);
          }}
          style={styles.peekHeader}
        >
          <View style={styles.inlineRow}>
            <EmojiIcon emoji="👀" size={17} />
            <T style={styles.peekTitle}>
              Soi Tiến Độ Cả Xóm ({view.order.length} tờ vé)
            </T>
            {view.waitingIds.length > 0 && (
              <View style={styles.peekHotBadge}>
                <T style={styles.peekHotTxt}>{view.waitingIds.length} người ĐỢI!</T>
              </View>
            )}
          </View>
          <UiIcon name={peekOpen ? 'ChevronUp' : 'ChevronDown'} size={18} color={C.ink} />
        </Pressable>

        {peekOpen && (
          <View style={styles.peekList}>
            {view.order.map((pid) => {
              const p = playerMap.get(pid);
              const pGrid = view.tickets[pid];
              const pColor = TICKET_PALETTES[view.ticketColors[pid] ?? 'rose'];
              const rows = pGrid
                ? [0, 1, 2].map((r) => checkLotoRow(pGrid, r, calledSet).hits)
                : [0, 0, 0];

              return (
                <View key={pid} style={[styles.peekRow, pid === me && styles.peekRowMe]}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: pColor.frameBorder },
                    ]}
                  />
                  {p && <Portrait p={p} size={28} frame={p.cosmetics?.frame} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <NameText fx={p?.cosmetics?.nameFx} style={styles.peekName}>
                      {view.names[pid] ?? pid}
                    </NameText>
                  </View>
                  <View style={styles.peekHitsGroup}>
                    {rows.map((h, ri) => (
                      <View
                        key={ri}
                        style={[
                          styles.rowHitChip,
                          h >= 4 && styles.rowHitChipHot,
                          h === 5 && styles.rowHitChipFull,
                        ]}
                      >
                        <T
                          style={[
                            styles.rowHitTxt,
                            h >= 4 && { color: '#9A3412', fontWeight: '900' },
                            h === 5 && { color: '#065F46', fontWeight: '900' },
                          ]}
                        >
                          H{ri + 1}: {h}/5
                        </T>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  callerRim: {
    borderRadius: 22,
    padding: 2.5,
  },
  callerInner: {
    borderRadius: 20,
    padding: 12,
    gap: 9,
  },
  marqueeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  marqueeTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.6,
  },
  countChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.35)',
  },
  countChipTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF9C3',
  },

  callerStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bingoBallOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 22px rgba(250, 204, 21, 0.72)' } as object)
      : null),
  },
  bingoBallOuterWide: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  bingoBallCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(180,83,9,0.3)',
  },
  bingoBallCoreWide: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  bingoBallNum: {
    fontSize: 28,
    fontWeight: '900',
    color: '#991B1B',
    fontFamily: FONT,
  },
  chantBox: {
    flex: 1,
    gap: 4,
  },
  rhymeTitlePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
  },
  rhymeTitleTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FEF08A',
  },
  chantText: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#FDE047',
  },

  recentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.42)',
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBCFE8',
  },
  recentBallsWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
  },
  recentEmpty: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  miniBall: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBallLatest: {
    backgroundColor: '#FACC15',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  miniBallTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1E293B',
  },
  miniBallTxtLatest: {
    color: '#78350F',
  },

  waitingAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
  },
  waitingAlertTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#FEF08A',
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  eventBannerTxt: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#991B1B',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorBannerTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
  },
  lockPenaltyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FFEDD5',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  lockPenaltyTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#9A3412',
  },

  ticketPaper: {
    borderRadius: 18,
    borderWidth: 3,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 6,
  },
  ticketHeaderTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  modeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  modeTagTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEF08A',
  },

  ticketRowsWrap: {
    padding: 5,
    gap: 3,
  },
  ticketRow: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 8,
  },
  ticketRowWin: {
    backgroundColor: 'rgba(250, 204, 21, 0.35)',
    padding: 1,
  },
  ticketRowWait: {
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
  },
  ticketCell: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCellWide: {
    height: 56,
    borderRadius: 8,
  },
  ticketNumCell: {
    backgroundColor: '#FFFFFF',
  },
  cellJustCalled: {
    backgroundColor: '#FEF9C3',
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  blankOrnament: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  numSealWrap: {
    width: 33,
    height: 33,
    borderRadius: 16.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redLuckySeal: {
    backgroundColor: 'rgba(225, 29, 72, 0.16)',
    borderWidth: 2.5,
    borderColor: '#E11D48',
  },
  redLuckySealWide: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
  },
  cellNumTxt: {
    fontSize: 16.5,
    fontWeight: '900',
    fontFamily: FONT,
    letterSpacing: -0.3,
  },
  cellNumTxtWide: {
    fontSize: 20,
  },

  kinhRow: {
    flexDirection: 'row',
    gap: 6,
  },
  kinhBtnOuter: {
    flex: 1,
    minWidth: 0,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.18)',
  },
  kinhBtnReadyGlow: {
    borderColor: '#EA580C',
    borderWidth: 2.5,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 18px rgba(250, 204, 21, 0.85)' } as object)
      : null),
  },
  kinhBtnInner: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 52,
  },
  kinhBtnTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: C.ink,
  },
  kinhBtnSub: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#475569',
  },

  peekCard: {
    padding: 12,
    gap: 8,
  },
  peekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  peekTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: C.ink,
  },
  peekHotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FFEDD5',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  peekHotTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#C2410C',
  },
  peekList: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  peekRowMe: {
    backgroundColor: '#FEF9C3',
  },
  colorSwatch: {
    width: 6,
    height: 26,
    borderRadius: 3,
  },
  peekName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: C.ink,
  },
  peekHitsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rowHitChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  rowHitChipHot: {
    backgroundColor: '#FED7AA',
  },
  rowHitChipFull: {
    backgroundColor: '#A7F3D0',
  },
  rowHitTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#334155',
  },

  footerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  footerTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
});
