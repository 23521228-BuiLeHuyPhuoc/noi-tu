import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  LOTO_RHYMES,
  LOTO_TICKET_NUMBERS,
  LOTO_TICKET_ROWS,
  checkLotoRow,
  type LotoTicketColor,
  type LotoView,
} from '../../../shared/src/loto';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { backdropPalette, C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play, playMemePool } from '../sound';
import { useOnChange, useStableWindow } from '../hooks';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { Sheet } from '../components/Sheet';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { UiIcon } from '../components/Icons';

const TICKET_PALETTES: Record<
  LotoTicketColor,
  {
    name: string;
    headerBg: string;
    frameBorder: string;
    blankBg: string;
    blankDot: string;
    cellBorder: string;
    paperBg: string;
    numColor: string;
  }
> = {
  rose: {
    name: 'Vé Hồng Đào',
    headerBg: '#9F2B36',
    frameBorder: '#9F2B36',
    blankBg: '#FDE8EA',
    blankDot: 'rgba(159,43,54,0.22)',
    cellBorder: 'rgba(159,43,54,0.24)',
    paperBg: '#FFF5F6',
    numColor: '#4C0519',
  },
  gold: {
    name: 'Vé Hoàng Kim',
    headerBg: '#B45309',
    frameBorder: '#B45309',
    blankBg: '#FEF3C7',
    blankDot: 'rgba(180,83,9,0.24)',
    cellBorder: 'rgba(180,83,9,0.24)',
    paperBg: '#FFFDF5',
    numColor: '#451A03',
  },
  jade: {
    name: 'Vé Ngọc Bích',
    headerBg: '#15803D',
    frameBorder: '#15803D',
    blankBg: '#DCFCE7',
    blankDot: 'rgba(21,128,61,0.22)',
    cellBorder: 'rgba(21,128,61,0.24)',
    paperBg: '#F4FBF6',
    numColor: '#052E16',
  },
  sky: {
    name: 'Vé Thiên Thanh',
    headerBg: '#0369A1',
    frameBorder: '#0369A1',
    blankBg: '#E0F2FE',
    blankDot: 'rgba(3,105,161,0.22)',
    cellBorder: 'rgba(3,105,161,0.24)',
    paperBg: '#F4FAFF',
    numColor: '#082F49',
  },
  violet: {
    name: 'Vé Tím Huế',
    headerBg: '#5B21B6',
    frameBorder: '#5B21B6',
    blankBg: '#EDE9FE',
    blankDot: 'rgba(91,33,182,0.22)',
    cellBorder: 'rgba(91,33,182,0.24)',
    paperBg: '#F8F6FF',
    numColor: '#2E1065',
  },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  kinh_false: 'Hô Kinh hụt. Chưa đủ 5 số trúng trên hàng này — tạm khóa bấm Kinh 2 lượt.',
  kinh_locked: 'Đang tạm khóa hô Kinh do hô hụt. Đợi qua lượt gọi tiếp theo.',
  bad_action: 'Con số này chưa được đoàn lô tô kêu tới.',
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
  const bp = backdropPalette(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width, height } = useStableWindow();
  const wide = width >= 720;
  const compactH = height < 720;

  const [peekOpen, setPeekOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useOnChange(view.currentNum, (num) => {
    if (num !== null) play('pop', { speakerId: null });
  });

  useOnChange(view.waitingIds.length, (len) => {
    if (len > 0) {
      playMemePool('shock', { speakerId: view.waitingIds.at(-1) ?? null, cooldownMs: 2000 });
      play('turn', { speakerId: view.waitingIds.at(-1) ?? null });
    }
  });

  useOnChange(view.winnerId, (winId) => {
    if (winId) {
      play(winId === me ? 'win' : 'reveal', { memePool: 'win', speakerId: winId, cooldownMs: 1200 });
    }
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
  useOnChange(penaltyUntil, (p) => {
    if (p > 0) {
      playMemePool('wrong', { speakerId: me, cooldownMs: 1200 });
      play('error', { speakerId: me });
    }
  });
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
      play('error', { speakerId: me });
      setErr(errOf(res.reason));
    }
    return res.ok;
  };

  const handleCellTap = async (num: number) => {
    if (busy || !hasMyTicket || view.status !== 'calling') return;
    if (!calledSet.has(num)) {
      playMemePool('wrong', { speakerId: me, cooldownMs: 1400 });
      play('tick', { speakerId: me });
    } else {
      play('stamp', { speakerId: me });
    }
    await act({ type: 'loto_mark', num });
  };

  const handleKinh = async (row: number) => {
    if (busy || !hasMyTicket || view.status !== 'calling') return;
    play('siren', { speakerId: me });
    await act({ type: 'loto_kinh', row });
  };

  const renderBottom = () => {
    if (view.winnerId) {
      return (
        <View style={styles.footerInline}>
          <UiIcon name="Trophy" size={14} color={bp.dark ? '#FDE68A' : C.goldDeep} />
          <T numberOfLines={1} style={[styles.footerTxt, { color: bp.dark ? '#FDE68A' : C.ink }]}>
            {view.winnerId === me
              ? 'Chúc mừng bạn đã Kinh rực rỡ'
              : `${view.names[view.winnerId] ?? view.winnerId} đã Kinh hàng ${(view.winningRow ?? 0) + 1}`}
          </T>
        </View>
      );
    }

    if (!hasMyTicket) {
      return (
        <T numberOfLines={1} style={[styles.footerTxt, { color: bp.text }]}>
          Đang xem vé của @{view.names[ticketOwnerId] ?? 'hàng xóm'}
        </T>
      );
    }

    const readyRowIdx = rowChecks.findIndex((c) => c.validKinh);
    return (
      <View style={styles.footerInline}>
        <UiIcon
          name={readyRowIdx >= 0 ? 'CheckCircle2' : 'Sparkles'}
          size={14}
          color={readyRowIdx >= 0 ? (bp.dark ? '#4ADE80' : C.jade) : bp.muted}
        />
        <T
          numberOfLines={1}
          style={[
            styles.footerTxt,
            { color: readyRowIdx >= 0 ? (bp.dark ? '#4ADE80' : C.jade) : bp.text },
          ]}
        >
          {readyRowIdx >= 0
            ? `Hàng ${readyRowIdx + 1} đủ 5/5 · Bấm Kinh ngay`
            : view.autoMark
              ? 'Tự chấm bật · Đủ 5/5 số 1 hàng là bấm Kinh'
              : 'Chạm chấm số đã kêu · Đủ 5/5 hàng bấm Kinh'}
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
            if (waitingSet.has(p.id)) return C.danger;
            return TICKET_PALETTES[view.ticketColors[p.id] ?? 'rose']?.frameBorder;
          }}
          sub={(p: PublicPlayer) => {
            if (view.winnerId === p.id) return 'Kinh';
            if (waitingSet.has(p.id)) return 'Đợi 4/5';
            const mLen = view.marked[p.id]?.length ?? 0;
            return `${mLen}/${LOTO_TICKET_NUMBERS}`;
          }}
        />

        {/* BẢNG RAO SỐ INK DARK PARLOR */}
        <View
          testID="loto-caller"
          style={[styles.callerBoard, sticker(1), compactH && styles.callerInnerCompact]}
        >
          {/* Thanh tiêu đề + Bộ đếm + Nút Soi vé cả xóm */}
          <View style={styles.marqueeBar}>
            <View style={styles.inlineRow}>
              <UiIcon name="Megaphone" size={13} color={C.gold} />
              <T style={styles.marqueeTitle}>Lô tô Xóm Lầy</T>
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
                  play('pop', { speakerId: me });
                  setPeekOpen(true);
                }}
                style={[styles.peekPillBtn, view.waitingIds.length > 0 && styles.peekPillBtnHot]}
              >
                <UiIcon
                  name="Eye"
                  size={12}
                  color={view.waitingIds.length > 0 ? C.ink : C.darkText}
                />
                <T
                  style={[
                    styles.peekPillTxt,
                    view.waitingIds.length > 0 && { color: C.ink },
                  ]}
                >
                  Soi vé{view.waitingIds.length > 0 ? ` (${view.waitingIds.length})` : ''}
                </T>
              </Pressable>
            </View>
          </View>

          {/* Quả Cầu Lô Tô + Câu Vè */}
          <View style={styles.callerStageRow}>
            <View
              style={[
                styles.bingoBallOuter,
                compactH && styles.bingoBallOuterCompact,
                wide && styles.bingoBallOuterWide,
              ]}
            >
              <View
                style={[
                  styles.bingoBallCore,
                  compactH && styles.bingoBallCoreCompact,
                  wide && styles.bingoBallCoreWide,
                ]}
              >
                <T style={[styles.bingoBallNum, compactH && { fontSize: 21 }, wide && { fontSize: 30 }]}>
                  {view.currentNum !== null ? String(view.currentNum) : '--'}
                </T>
              </View>
            </View>

            <View style={styles.chantBox}>
              {currentRhyme && (
                <View style={styles.rhymeTitlePill}>
                  <UiIcon name="Star" size={10} color="#FDE68A" />
                  <T numberOfLines={1} style={styles.rhymeTitleTxt}>
                    {currentRhyme.title}
                  </T>
                </View>
              )}
              <T numberOfLines={2} style={[styles.chantText, compactH && { fontSize: 12, lineHeight: 16 }]}>
                {view.currentChant ??
                  'Cờ ra con mấy… Bà con trải vé chuẩn bị dò số.'}
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
            <View style={styles.waitingAlertBar}>
              <UiIcon name="Flame" size={13} color="#FEF3C7" />
              <T numberOfLines={1} style={styles.waitingAlertTxt}>
                Sắp Kinh (4/5): {view.waitingIds.map((id) => `@${view.names[id] ?? id}`).join(', ')}
              </T>
            </View>
          ) : view.lastEvent ? (
            <View style={styles.eventBanner}>
              <UiIcon name="Info" size={12} color={C.darkText} />
              <T numberOfLines={1} style={styles.eventBannerTxt}>{view.lastEvent}</T>
            </View>
          ) : null}
        </View>

        {/* THÔNG BÁO LỖI HOẶC PHẠT KHÓA KINH */}
        {err && (
          <View style={[styles.errorBanner, sticker(1)]}>
            <UiIcon name="AlertTriangle" size={13} color="#FEF3C7" />
            <T numberOfLines={1} style={styles.errorBannerTxt}>{err}</T>
          </View>
        )}

        {isLocked && (
          <View style={[styles.lockPenaltyBanner, sticker(1)]}>
            <UiIcon name="Lock" size={13} color={C.goldDeep} />
            <T numberOfLines={1} style={styles.lockPenaltyTxt}>
              Tạm khóa hô Kinh còn {penaltyLeft} lượt gọi do hô hụt
            </T>
          </View>
        )}

        {/* TỜ VÉ LÔ TÔ 9 CỘT × 6 HÀNG (30 SỐ, 2 KHUNG 3×9) */}
        <View style={styles.ticketStage}>
          <View
            testID="loto-ticket"
            style={[
              styles.ticketPaper,
              sticker(1),
              {
                backgroundColor: pal.paperBg,
                borderColor: pal.frameBorder,
              },
            ]}
          >
            <View style={[styles.ticketHeader, { backgroundColor: pal.headerBg }]}>
              <View style={styles.inlineRow}>
                <UiIcon name="Layers" size={13} color="#FFFFFF" />
                <T numberOfLines={1} style={styles.ticketHeaderTitle}>
                  {pal.name} · {LOTO_TICKET_NUMBERS} số
                </T>
              </View>
              <View style={styles.modeTag}>
                <T style={styles.modeTagTxt}>{view.autoMark ? 'Tự chấm' : 'Tự dò'}</T>
              </View>
            </View>

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
                              pressed && hasMyTicket && { transform: [{ scale: 0.94 }] },
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
                                  { color: stamped ? C.son : pal.numColor },
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

        {/* BỘ 6 NÚT HÔ KINH HÀNG 1..6 */}
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
                    waitFour && styles.kinhBtnWait,
                    ready && styles.kinhBtnReady,
                    isLocked && styles.kinhBtnLocked,
                    pressed && { transform: [{ translateY: 1 }] },
                  ]}
                >
                  <View style={styles.inlineRow}>
                    <UiIcon
                      name={isLocked ? 'Lock' : ready ? 'CheckCircle2' : waitFour ? 'Flame' : 'Star'}
                      size={11}
                      color={isLocked ? C.muted : ready ? C.ink : waitFour ? C.goldDeep : C.secondary}
                    />
                    <T
                      numberOfLines={1}
                      style={[
                        styles.kinhBtnTitle,
                        ready && { color: C.ink },
                        waitFour && { color: C.goldDeep },
                        isLocked && { color: C.muted },
                      ]}
                    >
                      Kinh H{rIdx + 1}
                    </T>
                  </View>
                  <T
                    numberOfLines={1}
                    style={[
                      styles.kinhBtnSub,
                      ready && { color: C.ink, fontWeight: '600' },
                      waitFour && { color: C.goldDeep, fontWeight: '600' },
                      isLocked && { color: C.muted },
                    ]}
                  >
                    {isLocked
                      ? `Khóa (${penaltyLeft})`
                      : ready
                        ? 'Đủ 5/5 · Hô'
                        : waitFour
                          ? '4/5 · Đợi'
                          : `${info.hits}/5`}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* MODAL SOI VÉ CẢ XÓM MỞ QUA SHEET (KHÔNG CHIẾM CHIỀU DỌC MÀN CHÍNH) */}
      {peekOpen && (
        <Sheet
          title={`Soi Tiến Độ Cả Xóm (${view.order.length} tờ)`}
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
                            h >= 4 && { color: C.goldDeep, fontWeight: '600' },
                            h === 5 && { color: C.jadeDeep, fontWeight: '600' },
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
  callerBoard: {
    backgroundColor: C.darkSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.darkBorder,
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
    fontSize: 12,
    fontWeight: '600',
    color: C.darkText,
  },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  countChipTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },
  peekPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  peekPillBtnHot: {
    backgroundColor: C.gold,
    borderColor: C.goldDeep,
  },
  peekPillTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },

  callerStageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  bingoBallOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.paper,
  },
  bingoBallOuterCompact: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  bingoBallOuterWide: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  bingoBallCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.paper,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.28)',
  },
  bingoBallCoreCompact: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  bingoBallCoreWide: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  bingoBallNum: {
    fontSize: 23,
    fontWeight: '600',
    color: C.sonDark,
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
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
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(245, 158, 11, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.34)',
  },
  rhymeTitleTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FDE68A',
  },
  chantText: {
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    color: C.darkText,
  },

  callBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  callBarTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  callBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: C.gold,
  },
  callBarSec: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FDE68A',
    minWidth: 28,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },

  recentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.darkBg,
    borderRadius: 9,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
  },
  recentLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    color: C.darkMuted,
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
    fontWeight: '400',
    color: C.darkMuted,
  },
  miniBall: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 4,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBallLatest: {
    backgroundColor: C.gold,
    borderColor: C.paper,
  },
  miniBallTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },
  miniBallTxtLatest: {
    color: C.ink,
  },

  waitingAlertBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: C.danger,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  waitingAlertTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#FEF3C7',
  },
  eventBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.darkSubtle,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  eventBannerTxt: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '500',
    color: C.darkText,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.danger,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  errorBannerTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: '#FEF3C7',
  },
  lockPenaltyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.goldSoft,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.gold,
  },
  lockPenaltyTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: C.goldDeep,
    fontVariant: ['tabular-nums'],
  },

  ticketStage: {
    flex: 1,
    minHeight: 0,
    justifyContent: 'center',
  },
  ticketPaper: {
    borderRadius: 13,
    borderWidth: 1.5,
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
    fontWeight: '600',
    color: '#FFFFFF',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
  modeTag: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 20, 28, 0.35)',
  },
  modeTagTxt: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FEF3C7',
  },

  ticketRowsWrap: {
    paddingHorizontal: 4,
    paddingVertical: 5,
    gap: 2.5,
  },
  blockDivider: {
    borderTopWidth: 1,
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
    backgroundColor: 'rgba(245, 158, 11, 0.24)',
    padding: 1,
  },
  ticketRowWait: {
    backgroundColor: 'rgba(180, 83, 9, 0.10)',
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
    backgroundColor: C.paper,
  },
  cellJustCalled: {
    backgroundColor: C.goldSoft,
    borderColor: C.goldDeep,
    borderWidth: 1.5,
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
    backgroundColor: 'rgba(159, 43, 54, 0.12)',
    borderWidth: 1.5,
    borderColor: C.son,
  },
  redLuckySealWide: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  cellNumTxt: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    backgroundColor: C.paper,
    paddingVertical: 4,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    minHeight: 34,
  },
  kinhBtnOuterCompact: {
    flexBasis: '31.5%',
    flexGrow: 1,
  },
  kinhBtnOuterWide: {
    flex: 1,
    minWidth: 0,
  },
  kinhBtnWait: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  kinhBtnReady: {
    backgroundColor: C.gold,
    borderColor: C.goldDeep,
    borderWidth: 1.5,
  },
  kinhBtnLocked: {
    backgroundColor: C.mist,
    borderColor: C.borderSubtle,
    opacity: 0.72,
  },
  kinhBtnTitle: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.ink,
    fontVariant: ['tabular-nums'],
  },
  kinhBtnSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
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
    borderRadius: 9,
    backgroundColor: C.parchment,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  peekRowMe: {
    backgroundColor: C.goldSoft,
    borderColor: 'rgba(180,83,9,0.25)',
  },
  colorSwatch: {
    width: 5,
    height: 24,
    borderRadius: 3,
  },
  peekName: {
    fontSize: 12,
    fontWeight: '600',
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
    backgroundColor: C.mist,
  },
  rowHitChipHot: {
    backgroundColor: C.goldSoft,
  },
  rowHitChipFull: {
    backgroundColor: C.jadeSoft,
  },
  rowHitTxt: {
    fontSize: 9.5,
    fontWeight: '600',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
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
    fontWeight: '500',
    textAlign: 'center',
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
  },
});
