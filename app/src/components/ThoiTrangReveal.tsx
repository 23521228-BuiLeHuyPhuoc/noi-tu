/**
 * Màn Công bố Điểm thiết kế v4 ("Sàn Diễn Xóm Lầy"):
 * - Bục vinh quang Top 3 + ảnh 3D toàn thân của từng người chơi.
 * - Bật mí phiếu 🤖 Giám khảo Máy + nhận xét 1 dòng tiếng Việt bên cạnh điểm khán giả.
 */
import type { ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  formatAvgStars,
  formatHalfStars,
  type ThoiTrangOutfit,
  type ThoiTrangScoreRow,
  type ThoiTrangTheme,
} from '../../../shared/src/thoitrang';
import { T } from '../ui';
import { useThoiTrangSnapshots } from './ThoiTrangDollCanvas';
import { V4 } from './ThoiTrangWardrobeControls';

export interface ThoiTrangRevealProps {
  theme: ThoiTrangTheme;
  scores: readonly ThoiTrangScoreRow[];
  outfits: Record<string, ThoiTrangOutfit>;
  me: string | null;
  countdownText: string;
  secondsLeft: number;
  totalSeconds: number;
  skipped: boolean;
  mobile: boolean;
  topRightTools?: ReactNode;
  onSkip: () => void;
}

const MEDAL = ['👑', '🥈', '🥉'] as const;

export function ThoiTrangReveal({
  theme,
  scores,
  outfits,
  me,
  countdownText,
  secondsLeft,
  totalSeconds,
  skipped,
  mobile,
  topRightTools,
  onSkip,
}: ThoiTrangRevealProps) {
  const shots = useThoiTrangSnapshots(outfits, 'full', 160, 210);
  const top3 = scores.slice(0, 3);
  const pct = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const urgent = secondsLeft <= 5;

  return (
    <View testID="tt-reveal" style={styles.root}>
      {/* Top pastel header */}
      <View style={[styles.topBar, mobile && styles.topBarMobile]}>
        {!mobile && (
          <View style={styles.brandPill}>
            <T style={styles.brandTxt}>✦ Công Bố</T>
          </View>
        )}
        <View style={styles.themePill}>
          <T style={styles.themeSmall}>KẾT QUẢ CHỦ ĐỀ</T>
          <T numberOfLines={1} style={styles.themeTitle}>{theme.title}</T>
        </View>
        <View style={[styles.timerPill, urgent && styles.timerPillUrgent]}>
          <T testID="tt-timer" style={styles.timerTxt}>⏱ {countdownText}</T>
        </View>
        {topRightTools}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.body, mobile && styles.bodyMobile]}>
        {/* Podium top 3 */}
        <View style={[styles.podiumRow, mobile && styles.podiumRowMobile]}>
          {top3.map((row, i) => {
            const shot = shots[row.playerId];
            const first = row.rank === 1;
            return (
              <View
                key={row.playerId}
                style={[styles.podiumCard, first && styles.podiumFirst, mobile && styles.podiumCardMobile]}
              >
                <T style={styles.medal}>{MEDAL[Math.min(2, row.rank - 1)] ?? `#${row.rank}`}</T>
                <View style={[styles.shotFrame, first && styles.shotFrameFirst]}>
                  {shot ? (
                    Platform.OS === 'web' ? (
                      <img src={shot} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Image source={{ uri: shot }} style={styles.shotImg} resizeMode="contain" />
                    )
                  ) : (
                    <T style={styles.shotPlaceholder}>👗</T>
                  )}
                </View>
                <T numberOfLines={1} style={styles.podiumName}>
                  {row.name}{row.playerId === me ? ' (Bạn)' : ''}
                </T>
                <T style={styles.podiumScore}>{formatAvgStars(row.finalAvg)}★</T>
                <T style={styles.podiumSub}>🤖 Máy {formatHalfStars(row.machineHalfStars)}★</T>
                {i === 0 && first && <View style={styles.crownTag}><T style={styles.crownTagTxt}>QUÁN QUÂN</T></View>}
              </View>
            );
          })}
        </View>

        {/* Detailed scoreboard + Machine Judge reveal */}
        <View style={styles.listCard}>
          <T style={styles.listHeading}>Chi tiết điểm & Nhận xét Giám khảo Máy</T>
          {scores.map((row) => {
            const shot = shots[row.playerId];
            const isMe = row.playerId === me;
            return (
              <View key={row.playerId} style={[styles.row, isMe && styles.rowMe]}>
                <View style={[styles.rankBadge, row.rank === 1 && styles.rankBadge1]}>
                  <T style={[styles.rankTxt, row.rank === 1 && styles.rankTxt1]}>#{row.rank}</T>
                </View>
                <View style={styles.thumbBox}>
                  {shot ? (
                    Platform.OS === 'web' ? (
                      <img src={shot} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <Image source={{ uri: shot }} style={styles.shotImg} resizeMode="contain" />
                    )
                  ) : (
                    <T style={styles.shotPlaceholder}>✨</T>
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <View style={styles.rowTitleLine}>
                    <T numberOfLines={1} style={styles.rowName}>
                      {row.name}{isMe ? ' (Bạn)' : ''}
                    </T>
                    <View style={styles.finalPill}>
                      <T style={styles.finalPillTxt}>{formatAvgStars(row.finalAvg)}★</T>
                    </View>
                  </View>
                  <T style={styles.humanLine}>
                    👥 Khán giả: {row.humanAvg !== null ? `${formatAvgStars(row.humanAvg)}★ (${row.humanVoterCount} phiếu)` : 'chưa có phiếu'}
                  </T>
                  <View testID={`tt-machine-judge-${row.playerId}`} style={styles.machineLine}>
                    <T style={styles.machineTxt}>
                      🤖 Giám khảo Máy: {formatHalfStars(row.machineHalfStars)}★ · {row.machineReason}
                    </T>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom dock */}
      <View style={styles.footer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: urgent ? '#e11d48' : V4.pink }]} />
        </View>
        <Pressable
          testID="tt-skip-reveal"
          accessibilityRole="button"
          disabled={skipped}
          onPress={onSkip}
          style={({ pressed }) => [styles.doneBtn, skipped && styles.doneBtnDim, pressed && { opacity: 0.88 }]}
        >
          <T style={styles.doneBtnTxt}>
            {skipped ? '⏳ Đang chờ chuyển sang tổng kết…' : `✨ Xem tổng kết ngay (${secondsLeft}s)`}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', backgroundColor: '#f7e4f4' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  topBarMobile: { paddingHorizontal: 10, paddingTop: 10, gap: 6 },
  brandPill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: V4.glass },
  brandTxt: { fontSize: 16, fontWeight: '800', color: V4.pink },
  themePill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: V4.glass,
  },
  themeSmall: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: V4.pink },
  themeTitle: { fontSize: 15, fontWeight: '800', color: V4.ink },
  timerPill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: V4.pink },
  timerPillUrgent: { backgroundColor: '#e11d48' },
  timerTxt: { fontSize: 15, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] },
  progressTrack: { width: '100%', maxWidth: 420, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.65)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  scroll: { flex: 1 },
  body: { width: '100%', maxWidth: 880, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 20, gap: 14 },
  bodyMobile: { paddingHorizontal: 10, gap: 10 },
  podiumRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' },
  podiumRowMobile: { gap: 8 },
  podiumCard: {
    flex: 1,
    minWidth: 105,
    maxWidth: 230,
    backgroundColor: V4.glass,
    borderRadius: 24,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  podiumCardMobile: { padding: 8, borderRadius: 18 },
  podiumFirst: { borderColor: V4.pink, backgroundColor: '#ffffff' },
  medal: { fontSize: 22 },
  shotFrame: {
    width: 96,
    height: 122,
    borderRadius: 16,
    backgroundColor: '#fff4f8',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotFrameFirst: { width: 112, height: 140 },
  shotImg: { width: '100%', height: '100%' },
  shotPlaceholder: { fontSize: 30 },
  podiumName: { fontSize: 13.5, fontWeight: '800', color: V4.ink },
  podiumScore: { fontSize: 18, fontWeight: '800', color: V4.pink },
  podiumSub: { fontSize: 11, fontWeight: '700', color: '#5b3ea8' },
  crownTag: { marginTop: 2, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: V4.pink },
  crownTagTxt: { fontSize: 9.5, fontWeight: '800', color: '#ffffff', letterSpacing: 0.8 },
  listCard: { backgroundColor: V4.glass, borderRadius: 24, padding: 14, gap: 10 },
  listHeading: { fontSize: 14.5, fontWeight: '800', color: V4.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: V4.card,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1.5,
    borderColor: V4.line,
  },
  rowMe: { borderColor: V4.pink, backgroundColor: '#ffffff' },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: V4.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadge1: { backgroundColor: V4.pink },
  rankTxt: { fontSize: 13, fontWeight: '800', color: V4.ink },
  rankTxt1: { color: '#ffffff' },
  thumbBox: {
    width: 48,
    height: 62,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, minWidth: 0, gap: 3 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rowName: { flex: 1, fontSize: 14, fontWeight: '800', color: V4.ink },
  finalPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, backgroundColor: V4.pink },
  finalPillTxt: { fontSize: 13, fontWeight: '800', color: '#ffffff' },
  humanLine: { fontSize: 11.5, fontWeight: '600', color: V4.ink2 },
  machineLine: {
    backgroundColor: '#f3ecff',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  machineTxt: { fontSize: 11.5, fontWeight: '700', color: '#4c2f96' },
  footer: { paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  doneBtn: {
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: V4.pink,
  },
  doneBtnDim: { opacity: 0.65 },
  doneBtnTxt: { fontSize: 15.5, fontWeight: '800', color: '#ffffff' },
});
