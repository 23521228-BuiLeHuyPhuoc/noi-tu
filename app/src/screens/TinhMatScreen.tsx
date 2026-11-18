import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TinhMatView } from '../../../shared/src/tinhmat';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
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

export function TinhMatScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as TinhMatView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [nowMs, setNowMs] = useState(() => Date.now() + game.clockOffset);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const lastPointerTapAtRef = useRef<number>(0);

  const myStunUntil = view.stunnedUntil[me] ?? 0;
  const isStunned = view.phase === 'playing' && myStunUntil > nowMs;

  useEffect(() => {
    const remain = myStunUntil - (Date.now() + game.clockOffset);
    if (remain <= 0) return;
    const tm = setTimeout(() => {
      setNowMs(Date.now() + game.clockOffset);
    }, remain + 25);
    return () => clearTimeout(tm);
  }, [myStunUntil, game.clockOffset]);

  useOnChange(view.round, () => {
    setNowMs(Date.now() + game.clockOffset);
    play('pop');
  });

  useOnChange(view.roundHits.length, (len) => {
    if (len <= 0) return;
    const latest = view.roundHits[view.roundHits.length - 1];
    if (!latest) return;
    if (latest.playerId === me) {
      play(latest.ok ? 'coin' : 'error');
      setNowMs(Date.now() + game.clockOffset);
    } else if (latest.ok) {
      play('pop');
    }
  });

  const sortedLeader = useMemo(
    () => [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)),
    [view.order, view.scores],
  );
  const topLeaderId = sortedLeader[0] ?? null;

  const tapCell = async (cellId: number) => {
    if (view.phase !== 'playing') return;
    if (isStunned) {
      play('error');
      return;
    }
    const cell = view.grid[cellId];
    if (!cell || cell.hitBy !== null) return;
    await game.act({ type: 'tm_tap', cellId });
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
      order: sortedLeader,
      ring: (p: PublicPlayer) => {
        if (p.id === topLeaderId && (view.scores[p.id] ?? 0) > 0) return C.gold;
        if ((view.streaks[p.id] ?? 0) >= 2) return '#4ADE80';
        return undefined;
      },
      rank: (p: PublicPlayer) => {
        const idx = sortedLeader.indexOf(p.id);
        return idx >= 0 ? idx + 1 : undefined;
      },
      sub: (p: PublicPlayer) => {
        const sc = view.scores[p.id] ?? 0;
        const st = view.streaks[p.id] ?? 0;
        return st >= 2 ? `${sc}đ · 🔥${st}` : `${sc}đ`;
      },
    }),
    [sortedLeader, topLeaderId, view.scores, view.streaks],
  );

  const modeColors: [string, string, string] =
    view.challengeKind === 'match_target'
      ? ['#1E3A8A', '#0F172A', '#172554']
      : view.challengeKind === 'odd_one_out'
        ? ['#4C1D95', '#1E1B4B', '#3B0764']
        : ['#7C2D12', '#450A0A', '#1F2937'];

  const modeBadgeLabel =
    view.challengeKind === 'match_target'
      ? '🎯 ĐẬP ĐÚNG MỤC TIÊU'
      : view.challengeKind === 'odd_one_out'
        ? '🔍 TÌM HÌNH ĐỘC NHẤT'
        : '💎 SĂN KHO BÁU · NÉ BOM';

  return (
    <Shell
      game={game}
      room={room}
      strip={strip}
      wide={wide}
      bottom={
        <View style={styles.bottomWrap}>
          <T style={[styles.bottomHint, { color: theme.onBg }]}>
            {view.phase === 'reveal'
              ? '✨ Đang tổng kết điểm vòng này — chuẩn bị mắt nhanh cho vòng kế tiếp!'
              : isStunned
                ? '💫 Bạn vừa đập nhầm ô — tay bị tê 1.3 giây, nhìn thật kỹ rồi đập tiếp nhé!'
                : '⚡ Tất cả đập CÙNG LÚC không chờ lượt! Ai chạm chuẩn nhanh nhất ăn trọn +150đ!'}
          </T>
          {isHost && (
            <View style={styles.hostRow}>
              <Button
                testID="tinhmat-end-early"
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
      {view.round >= view.maxRounds && view.phase === 'reveal' && topLeaderId === me && (
        <Confetti />
      )}

      {/* BẢNG ĐỀ BÀI & MỤC TIÊU NỔI BẬT */}
      <MotionSurface>
        <LinearGradient
          colors={modeColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.promptCard, sticker(4)]}
          testID="tm-prompt-card"
        >
          <View style={styles.promptTopRow}>
            <View style={styles.modePill}>
              <T style={styles.modePillTxt}>
                VÒNG {view.round}/{view.maxRounds} · {modeBadgeLabel}
              </T>
            </View>
            <View style={styles.myScorePill}>
              <EmojiIcon emoji="⚡" size={13} />
              <T style={styles.myScoreTxt}>
                {view.scores[me] ?? 0}đ
                {(view.streaks[me] ?? 0) >= 2 ? ` · 🔥x${view.streaks[me]}` : ''}
              </T>
            </View>
          </View>

          <View style={styles.showcaseRow}>
            {view.challengeKind === 'match_target' && view.targetEmoji && (
              <View style={styles.targetSpotlight} testID="tm-target-box">
                <EmojiIcon emoji={view.targetEmoji} size={46} glow />
              </View>
            )}
            {view.challengeKind === 'odd_one_out' && (
              <View style={[styles.targetSpotlight, { borderColor: '#C084FC' }]}>
                <EmojiIcon emoji="👀" size={40} />
              </View>
            )}
            {view.challengeKind === 'avoid_bomb' && (
              <View style={styles.bonusShowcaseRow} testID="tm-bonus-box">
                {view.bonusEmojis.map((em, i) => (
                  <View key={i} style={styles.bonusMiniOrb}>
                    <EmojiIcon emoji={em} size={28} />
                  </View>
                ))}
              </View>
            )}

            <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
              <T style={styles.promptHeadline}>{view.promptText}</T>
              <T style={styles.promptSub}>
                {view.challengeKind === 'avoid_bomb'
                  ? 'Kho báu +90đ · Chạm nhầm 💣 trừ -60đ & choáng 1.3s!'
                  : 'Nhanh #1 +150đ · #2 +110đ · #3 +80đ · Đập sai choáng 1.3s!'}
              </T>
            </View>
          </View>

          <CountdownBar
            endsAt={view.phaseEndsAt}
            total={view.phaseSeconds}
            clockOffset={game.clockOffset}
            lightText
            testID="tm-timer"
          />
        </LinearGradient>
      </MotionSurface>

      {/* CẢNH BÁO CHOÁNG TAY KHI ĐẬP NHẦM */}
      {isStunned && (
        <View style={[styles.stunBanner, sticker(2)]} testID="tm-stun-banner">
          <EmojiIcon emoji="💫" size={18} />
          <T style={styles.stunTxt}>
            CHOÁNG TAY! Đập nhầm mục tiêu — mở khóa sau{' '}
            {Math.max(0.1, (myStunUntil - nowMs) / 1000).toFixed(1)}s!
          </T>
        </View>
      )}

      {/* LƯỚI ĐẤU TRƯỜNG PHẢN XẠ 4 CỘT CHUẨN MOBILE FLUENT 3D */}
      <View
        style={[styles.gridArena, sticker(4), isStunned && { opacity: 0.62 }]}
        testID="tm-grid"
      >
        {view.grid.map((cell) => {
          const claimed = cell.hitBy !== null;
          const claimedByMe = cell.hitBy === me;
          const revealTarget = view.phase === 'reveal' && cell.isTarget;
          const interactive = view.phase === 'playing' && !claimed && !isStunned;

          return (
            <Pressable
              key={cell.id}
              testID={`tm-cell-${cell.id}`}
              disabled={!interactive}
              // @ts-expect-error phản xạ 0ms ngay khi ngón tay chạm xuống ô
              onPointerDown={(e: PointerEvent) => {
                if (!interactive) return;
                e.preventDefault();
                lastPointerTapAtRef.current = performance.now();
                void tapCell(cell.id);
              }}
              onPress={() => {
                if (performance.now() - lastPointerTapAtRef.current < 320) return;
                void tapCell(cell.id);
              }}
              style={({ pressed }) => [
                styles.gridTile,
                claimed && (claimedByMe ? styles.tileClaimedMe : styles.tileClaimedOther),
                revealTarget && !claimed && styles.tileMissedTarget,
                pressed && interactive && styles.tilePressed,
              ]}
            >
              <EmojiIcon emoji={cell.emoji} size={wide ? 42 : 35} />
              {claimed && (
                <View
                  style={[
                    styles.claimBadge,
                    claimedByMe ? styles.claimBadgeMe : styles.claimBadgeOther,
                  ]}
                >
                  <T selectable={false} numberOfLines={1} style={styles.claimBadgeTxt}>
                    {claimedByMe ? '✓ BẠN!' : (view.names[cell.hitBy!] ?? '').slice(0, 7)}
                  </T>
                </View>
              )}
              {revealTarget && !claimed && (
                <View style={styles.missedPill}>
                  <T selectable={false} style={styles.missedPillTxt}>
                    ĐÁP ÁN
                  </T>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* BẢNG GHI NHẬN TỐC ĐỘ TRONG VÒNG */}
      {view.roundHits.length > 0 && (
        <View style={[styles.hitFeed, sticker(2)]} testID="tm-hits">
          {view.roundHits.slice(-4).map((h, i) => (
            <View
              key={`${h.playerId}-${h.cellId}-${i}`}
              style={[styles.hitChip, h.ok ? styles.hitChipGood : styles.hitChipBad]}
            >
              <EmojiIcon emoji={h.emoji} size={14} />
              <T numberOfLines={1} style={styles.hitChipTxt}>
                {h.name}: {h.delta >= 0 ? `+${h.delta}đ` : `${h.delta}đ`}
              </T>
            </View>
          ))}
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    borderRadius: 22,
    padding: 12,
    gap: 9,
    borderWidth: 2,
    borderColor: 'rgba(96, 165, 250, 0.48)',
  },
  promptTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    flexWrap: 'wrap',
  },
  modePill: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.45)',
  },
  modePillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 0.3,
  },
  myScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(34, 197, 94, 0.22)',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  myScoreTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DCFCE7',
  },
  showcaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  targetSpotlight: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 2.5,
    borderColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusShowcaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bonusMiniOrb: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 2,
    borderColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptHeadline: {
    fontSize: 15.5,
    fontWeight: '900',
    color: '#FFFFFF',
    fontFamily: FONT,
  },
  promptSub: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CBD5E1',
  },

  stunBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#7C2D12',
    borderWidth: 2,
    borderColor: '#FDBA74',
  },
  stunTxt: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFEDD5',
  },

  gridArena: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 10,
    borderRadius: 24,
    backgroundColor: '#0B1324',
    borderWidth: 2.5,
    borderColor: '#38BDF8',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'manipulation',
        } as object)
      : null),
  },
  gridTile: {
    width: '23%',
    minHeight: 76,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  tilePressed: {
    transform: [{ scale: 0.92 }],
    backgroundColor: '#334155',
    borderColor: '#FACC15',
  },
  tileClaimedMe: {
    backgroundColor: '#064E3B',
    borderColor: '#4ADE80',
  },
  tileClaimedOther: {
    backgroundColor: '#0C4A6E',
    borderColor: '#38BDF8',
  },
  tileMissedTarget: {
    backgroundColor: '#78350F',
    borderColor: '#FACC15',
    borderStyle: 'dashed',
  },
  claimBadge: {
    position: 'absolute',
    bottom: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 999,
    maxWidth: '92%',
  },
  claimBadgeMe: { backgroundColor: '#22C55E' },
  claimBadgeOther: { backgroundColor: '#0284C7' },
  claimBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#052E16',
  },
  missedPill: {
    position: 'absolute',
    bottom: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#FACC15',
  },
  missedPillTxt: { fontSize: 8.5, fontWeight: '900', color: '#1E293B' },

  hitFeed: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  hitChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  hitChipGood: {
    backgroundColor: 'rgba(22, 163, 74, 0.22)',
    borderColor: '#4ADE80',
  },
  hitChipBad: {
    backgroundColor: 'rgba(225, 29, 72, 0.25)',
    borderColor: '#FB7185',
  },
  hitChipTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  bottomWrap: { gap: 6 },
  bottomHint: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', paddingHorizontal: 6 },
  hostRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
