import { memo, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  LOTO_RHYMES,
  LOTO_TICKET_NUMBERS,
  LOTO_TICKET_ROWS,
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
import { useOnChange, useStableWindow } from '../hooks';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { Sheet } from '../components/Sheet';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, UiIcon } from '../components/Icons';

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

const LotoCallBar = memo(function LotoCallBar({
  nextCallAt,
  callIntervalMs,
  clockOffset,
}: {
  nextCallAt: number | null;
  callIntervalMs: number;
  clockOffset: number;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!nextCallAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 100);
    return () => clearInterval(id);
  }, [nextCallAt]);

  const totalMs = Math.max(500, callIntervalMs);
  const leftMs = nextCallAt ? Math.max(0, nextCallAt - (nowMs + clockOffset)) : 0;
  const pct = Math.max(0, Math.min(100, (leftMs / totalMs) * 100));

  return (
    <View testID="loto-timer" style={styles.callBarRow}>
      <View style={styles.callBarTrack}>
        <View style={[styles.callBarFill, { width: `${pct}%` }]} />
      </View>
      <T style={styles.callBarSec}>{(leftMs / 1000).toFixed(1)}s</T>
    </View>
  );
});

export function LotoScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as LotoView;
  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width, height } = useStableWindow();
  const wide = width >= 720;
  const compactH = height < 720;

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

  const rowCount = activeGrid.length || LOTO_TICKET_ROWS;
  const rowChecks = useMemo(() => {
    return Array.from({ length: rowCount }, (_, r) =>
      checkLotoRow(activeGrid, r, calledSet, view.autoMark ? undefined : markedSet),
    );
  }, [activeGrid, rowCount, calledSet, markedSet, view.autoMark]);

  const recentBalls = useMemo(() => view.called.slice(-6), [view.called]);
  const currentRhyme = view.currentNum !== null ? LOTO_RHYMES[view.currentNum] : null;

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

  const handleKinh = async (row: number) => {
    if (busy || !hasMyTicket || view.status !== 'calling') return;
    play('siren');
    await act({ type: 'loto_kinh', row });
  };

  const renderBottom = () => {
    if (view.winnerId) {
      return (
        <View style={styles.footerInline}>
          <EmojiIcon emoji="🎊" size={16} />
          <T numberOfLines={1} style={[styles.footerTxt, { color: '#FDE047' }]}>
            {view.winnerId === me
              ? 'Chúc mừng bạn đã KINH rực rỡ đêm hội chợ!'
              : `${view.names[view.winnerId] ?? view.winnerId} KINH hàng ${(view.winningRow ?? 0) + 1}!`}
          </T>
        </View>
      );
    }

    if (!hasMyTicket) {
      return (
        <T numberOfLines={1} style={[styles.footerTxt, { color: theme.onBg }]}>
          Đang xem ké vé @{view.names[ticketOwnerId] ?? 'hàng xóm'}
        </T>
      );
    }

    const readyRowIdx = rowChecks.findIndex((c) => c.validKinh);
    return (
      <View style={styles.footerInline}>
        <EmojiIcon emoji={readyRowIdx >= 0 ? '🎉' : '🎫'} size={15} />
        <T numberOfLines={1} style={[styles.footerTxt, { color: readyRowIdx >= 0 ? '#4ADE80' : theme.onBg }]}>
          {readyRowIdx >= 0
            ? `HÀNG ${readyRowIdx + 1} ĐỦ 5/5! BẤM KINH NGAY!`
            : view.autoMark
              ? 'Tự chấm bật — đủ 5/5 số 1 hàng là bấm KINH!'
              : 'Chạm chấm số đã kêu — đủ 5/5 hàng bấm KINH!'}
        </T>
      </View>
    );
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip wide={wide} bottom={renderBottom()}>
      <View style={styles.root}>
        {view.winnerId !== null && <Confetti />}

        <CompactPlayerStrip
          room={room}
          game={game}
          order={view.order}
          activeId={view.winnerId}
          ring={(p: PublicPlayer) => {
            if (view.winnerId === p.id) return C.gold;
            if (waitingSet.has(p.id)) return '#F97316';
            return TICKET_PALETTES[view.ticketColors[p.id] ?? 'rose']?.frameBorder;
          }}
          sub={(p: PublicPlayer) => {
            if (view.winnerId === p.id) return 'KINH!';
            if (waitingSet.has(p.id)) return 'ĐỢI!';
            const mLen = view.marked[p.id]?.length ?? 0;
            return `${mLen}/${LOTO_TICKET_NUMBERS}`;
          }}
        />

        {/* SÂN KHẤU RAO SỐ GỌN NHẸ */}
        <LinearGradient
          colors={['#FACC15', '#F97316', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.callerRim, sticker(3)]}
        >
          <LinearGradient
            testID="loto-caller"
            colors={['#2E073F', '#6B1143', '#3B0819']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.callerInner, compactH && styles.callerInnerCompact]}
          >
            {/* Thanh Đèn Lồng + Bộ đếm + Nút Soi vé cả xóm */}
            <View style={styles.marqueeBar}>
              <View style={styles.inlineRow}>
                <EmojiIcon emoji="🏮" size={14} />
                <T style={styles.marqueeTitle}>LÔ TÔ XÓM LẦY</T>
              </View>
              <View style={styles.inlineRow}>
                <View style={styles.countChip}>
                  <T style={styles.countChipTxt}>
                    {view.called.length}/90 · Còn {view.remainingCount}
                  </T>
                </View>
                <Pressable
                  testID="loto-peek-toggle"
                  onPress={() => {
                    play('pop');
                    setPeekOpen(true);
                  }}
                  style={[styles.peekPillBtn, view.waitingIds.length > 0 && styles.peekPillBtnHot]}
                >
                  <EmojiIcon emoji="👀" size={12} />
                  <T style={styles.peekPillTxt}>
                    Soi vé{view.waitingIds.length > 0 ? ` (${view.waitingIds.length})` : ''}
                  </T>
                </Pressable>
              </View>
            </View>

            {/* Quả Cầu Lô Tô + Câu Vè */}
            <View style={styles.callerStageRow}>
              <LinearGradient
                colors={['#FEF08A', '#F59E0B', '#DC2626']}
                start={{ x: 0.15, y: 0.1 }}
                end={{ x: 0.85, y: 0.95 }}
                style={[styles.bingoBallOuter, compactH && styles.bingoBallOuterCompact, wide && styles.bingoBallOuterWide]}
              >
                <View style={[styles.bingoBallCore, compactH && styles.bingoBallCoreCompact, wide && styles.bingoBallCoreWide]}>
                  <T style={[styles.bingoBallNum, compactH && { fontSize: 22 }, wide && { fontSize: 32 }]}>
                    {view.currentNum !== null ? String(view.currentNum) : '--'}
                  </T>
                </View>
              </LinearGradient>

              <View style={styles.chantBox}>
                {currentRhyme && (
                  <View style={styles.rhymeTitlePill}>
                    <EmojiIcon emoji="✨" size={11} />
                    <T numberOfLines={1} style={styles.rhymeTitleTxt}>
                      {currentRhyme.title}
                    </T>
                  </View>
                )}
                <T numberOfLines={2} style={[styles.chantText, compactH && { fontSize: 12, lineHeight: 16 }]}>
                  {view.currentChant ??
                    'Cờ ra con mấy… Bà con trải vé chuẩn bị dò nha!'}
                </T>
              </View>
            </View>

            {view.status === 'calling' && (
              <LotoCallBar
                nextCallAt={view.nextCallAt}
                callIntervalMs={view.callIntervalMs}
                clockOffset={game.clockOffset}
              />
            )}

            {/* Dải 6 Con Số Vừa Kêu + Cảnh Báo 4/5 Sắp Kinh */}
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

            {view.waitingIds.length > 0 ? (
              <LinearGradient
                colors={['#DC2626', '#EA580C', '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.waitingAlertBar}
              >
                <EmojiIcon emoji="🔥" size={14} />
                <T numberOfLines={1} style={styles.waitingAlertTxt}>
                  SẮP KINH (4/5): {view.waitingIds.map((id) => `@${view.names[id] ?? id}`).join(', ')}
                </T>
              </LinearGradient>
            ) : view.lastEvent ? (
              <View style={styles.eventBanner}>
                <EmojiIcon emoji="📢" size={12} />
                <T numberOfLines={1} style={styles.eventBannerTxt}>{view.lastEvent}</T>
              </View>
            ) : null}
          </LinearGradient>
        </LinearGradient>

        {/* THÔNG BÁO LỖI HOẶC PHẠT KHÓA KINH */}
        {err && (
          <View style={[styles.errorBanner, sticker(2)]}>
            <UiIcon name="AlertTriangle" size={14} color="#FEF08A" />
            <T numberOfLines={1} style={styles.errorBannerTxt}>{err}</T>
          </View>
        )}

        {isLocked && (
          <View style={[styles.lockPenaltyBanner, sticker(2)]}>
            <UiIcon name="Lock" size={14} color="#9A3412" />
            <T numberOfLines={1} style={styles.lockPenaltyTxt}>
              Khóa hô KINH còn {penaltyLeft} lượt gọi do hô hụt!
            </T>
          </View>
        )}

        {/* TỜ VÉ LÔ TÔ 9 CỘT × 6 HÀNG (30 SỐ, 2 KHUNG 3×9) */}
        <View style={styles.ticketStage}>
          <View
            testID="loto-ticket"
            style={[
              styles.ticketPaper,
              sticker(3),
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
                <EmojiIcon emoji="🎟️" size={14} />
                <T numberOfLines={1} style={styles.ticketHeaderTitle}>
                  {pal.name} · {LOTO_TICKET_NUMBERS} số
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
                  <View key={rIdx}>
                    {rIdx === 3 && (
                      <View style={[styles.blockDivider, { borderColor: pal.frameBorder }]} />
                    )}
                    <View
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
                                compactH ? styles.ticketCellCompact : wide ? styles.ticketCellWide : null,
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
                              compactH ? styles.ticketCellCompact : wide ? styles.ticketCellWide : null,
                              styles.ticketNumCell,
                              { borderColor: pal.cellBorder },
                              isJustCalled && !stamped && styles.cellJustCalled,
                              pressed && hasMyTicket && { transform: [{ scale: 0.93 }] },
                            ]}
                          >
                            <View
                              style={[
                                styles.numSealWrap,
                                compactH && styles.numSealWrapCompact,
                                stamped && styles.redLuckySeal,
                                wide && stamped && styles.redLuckySealWide,
                              ]}
                            >
                              <T
                                style={[
                                  styles.cellNumTxt,
                                  compactH && styles.cellNumTxtCompact,
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
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* BỘ 6 NÚT HÔ KINH HÀNG 1..6 (2×3 TRÊN MOBILE, 1×6 TRÊN DESKTOP) */}
        {hasMyTicket && (
          <View style={[styles.kinhGrid, wide && styles.kinhGridWide]}>
            {Array.from({ length: rowCount }, (_, rIdx) => {
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
                    wide ? styles.kinhBtnOuterWide : styles.kinhBtnOuterCompact,
                    sticker(ready ? 3 : 2),
                    ready && styles.kinhBtnReadyGlow,
                    pressed && { transform: [{ translateY: 1 }] },
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
                        <UiIcon name="Lock" size={11} color="#1E293B" />
                      ) : (
                        <EmojiIcon emoji={ready ? '🎉' : waitFour ? '🔥' : '🎫'} size={12} />
                      )}
                      <T
                        numberOfLines={1}
                        style={[
                          styles.kinhBtnTitle,
                          ready && { color: '#451A03' },
                        ]}
                      >
                        KINH H{rIdx + 1}
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
                        ? `Khóa (${penaltyLeft})`
                        : ready
                          ? 'ĐỦ 5/5 · HÔ!'
                          : waitFour
                            ? '4/5 · ĐỢI!'
                            : `${info.hits}/5`}
                    </T>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* MODAL SOI VÉ CẢ XÓM MỞ QUA SHEET (KHÔNG CHIẾM CHIỀU DỌC MÀN CHÍNH) */}
      {peekOpen && (
        <Sheet
          title={`👀 Soi Tiến Độ Cả Xóm (${view.order.length} tờ)`}
          onClose={() => setPeekOpen(false)}
        >
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.peekList}>
            {view.order.map((pid) => {
              const p = playerMap.get(pid);
              const pGrid = view.tickets[pid];
              const pColor = TICKET_PALETTES[view.ticketColors[pid] ?? 'rose'];
              const rows = pGrid
                ? pGrid.map((_, r) => checkLotoRow(pGrid, r, calledSet).hits)
                : Array.from({ length: LOTO_TICKET_ROWS }, () => 0);

              return (
                <View key={pid} style={[styles.peekRow, pid === me && styles.peekRowMe]}>
                  <View
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: pColor.frameBorder },
                    ]}
                  />
                  {p && <Portrait p={p} size={26} frame={p.cosmetics?.frame} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <NameText fx={p?.cosmetics?.nameFx} numberOfLines={1} style={styles.peekName}>
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
                          H{ri + 1}:{h}
                        </T>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    gap: 5,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  callerRim: {
    borderRadius: 16,
    padding: 2,
  },
  callerInner: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  callerInnerCompact: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  marqueeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  marqueeTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FDE047',
    letterSpacing: 0.4,
  },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.35)',
  },
  countChipTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEF9C3',
  },
  peekPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  peekPillBtnHot: {
    backgroundColor: '#EA580C',
    borderColor: '#FEF08A',
  },
  peekPillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  callerStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bingoBallOuter: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bingoBallOuterCompact: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  bingoBallOuterWide: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  bingoBallCore: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(180,83,9,0.3)',
  },
  bingoBallCoreCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bingoBallCoreWide: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  bingoBallNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#991B1B',
    fontFamily: FONT,
  },
  chantBox: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rhymeTitlePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
  },
  rhymeTitleTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF08A',
  },
  chantText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '800',
    fontStyle: 'italic',
    color: '#FDE047',
  },

  callBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  callBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  callBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#FACC15',
  },
  callBarSec: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEF08A',
    minWidth: 28,
    textAlign: 'right',
  },

  recentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15,23,42,0.42)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },
  recentLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FBCFE8',
  },
  recentBallsWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    overflow: 'hidden',
    gap: 4,
  },
  recentEmpty: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  miniBall: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
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
    fontSize: 10.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  miniBallTxtLatest: {
    color: '#78350F',
  },

  waitingAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  waitingAlertTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    color: '#FEF08A',
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eventBannerTxt: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#991B1B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorBannerTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF08A',
  },
  lockPenaltyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEDD5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#F97316',
  },
  lockPenaltyTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '900',
    color: '#9A3412',
  },

  ticketStage: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  ticketPaper: {
    borderRadius: 14,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 6,
  },
  ticketHeaderTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  modeTag: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.34)',
  },
  modeTagTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF08A',
  },

  ticketRowsWrap: {
    paddingHorizontal: 4,
    paddingVertical: 5,
    gap: 2.5,
  },
  blockDivider: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    marginVertical: 2,
    opacity: 0.45,
  },
  ticketRow: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 6,
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
    height: 41,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketCellCompact: {
    height: 27,
    borderRadius: 4,
  },
  ticketCellWide: {
    height: 44,
    borderRadius: 7,
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
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  numSealWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numSealWrapCompact: {
    width: 23,
    height: 23,
    borderRadius: 11.5,
  },
  redLuckySeal: {
    backgroundColor: 'rgba(225, 29, 72, 0.16)',
    borderWidth: 2,
    borderColor: '#E11D48',
  },
  redLuckySealWide: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
  },
  cellNumTxt: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: FONT,
    letterSpacing: -0.3,
  },
  cellNumTxtCompact: {
    fontSize: 12.5,
  },
  cellNumTxtWide: {
    fontSize: 18,
  },

  kinhGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  kinhGridWide: {
    flexWrap: 'nowrap',
  },
  kinhBtnOuter: {
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.18)',
  },
  kinhBtnOuterCompact: {
    flexBasis: '31.5%',
    flexGrow: 1,
  },
  kinhBtnOuterWide: {
    flex: 1,
    minWidth: 0,
  },
  kinhBtnReadyGlow: {
    borderColor: '#EA580C',
    borderWidth: 2,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 14px rgba(250, 204, 21, 0.8)' } as object)
      : null),
  },
  kinhBtnInner: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minHeight: 34,
  },
  kinhBtnTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: C.ink,
  },
  kinhBtnSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
  },

  peekList: {
    gap: 6,
    paddingVertical: 2,
  },
  peekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 7,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  peekRowMe: {
    backgroundColor: '#FEF9C3',
  },
  colorSwatch: {
    width: 5,
    height: 24,
    borderRadius: 3,
  },
  peekName: {
    fontSize: 12,
    fontWeight: '800',
    color: C.ink,
  },
  peekHitsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: 168,
    gap: 3,
  },
  rowHitChip: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  rowHitChipHot: {
    backgroundColor: '#FED7AA',
  },
  rowHitChipFull: {
    backgroundColor: '#A7F3D0',
  },
  rowHitTxt: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#334155',
  },

  footerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  footerTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
});
