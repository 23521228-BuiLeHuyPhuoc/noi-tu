/**
 * Sàn diễn Catwalk thiết kế v4 ("Sàn Diễn Xóm Lầy"):
 * - Sân khấu 3D spotlight tối full-bleed (đèn vàng chạy dọc, sọc hồng, khán giả phía dưới).
 * - Người trình diễn có 11 nút tạo dáng (không có spin), mỗi dáng tự đổi biểu cảm tương ứng.
 * - Khán giả chấm 1,0–5,0★ bước 0,5★ (2..10 nửa-sao) + cổ vũ emoji; Giám khảo Máy giữ bí mật tới cuối.
 */
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  THOI_TRANG_CHEERS,
  THOI_TRANG_POSE_EMOJIS,
  THOI_TRANG_POSE_LABELS,
  THOI_TRANG_RUNWAY_POSES,
  formatHalfStars,
  type ThoiTrangCheerId,
  type ThoiTrangOutfit,
  type ThoiTrangPoseId,
  type ThoiTrangTheme,
} from '../../../shared/src/thoitrang';
import { T } from '../ui';
import { ThoiTrangDollCanvas } from './ThoiTrangDollCanvas';
import { V4 } from './ThoiTrangWardrobeControls';

export interface ThoiTrangCheerBubble {
  id: number;
  name: string;
  cheer: ThoiTrangCheerId;
}

export interface ThoiTrangRunwayProps {
  theme: ThoiTrangTheme;
  walkerName: string;
  walkerOutfit: ThoiTrangOutfit;
  runwayIndex: number;
  totalWalkers: number;
  isWalker: boolean;
  isSpectator: boolean;
  activePose: ThoiTrangPoseId;
  poseNonce: number;
  catwalkNonce: number;
  myRating: number | null;
  ratedCount: number;
  cheers: readonly ThoiTrangCheerBubble[];
  countdownText: string;
  mobile: boolean;
  topRightTools?: ReactNode;
  onPose: (pose: ThoiTrangPoseId) => void;
  onRate: (halfStars: number) => void;
  onCheer: (cheer: ThoiTrangCheerId) => void;
}

const HALF_STAR_STEPS = [2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function ThoiTrangRunway({
  theme,
  walkerName,
  walkerOutfit,
  runwayIndex,
  totalWalkers,
  isWalker,
  isSpectator,
  activePose,
  poseNonce,
  catwalkNonce,
  myRating,
  ratedCount,
  cheers,
  countdownText,
  mobile,
  topRightTools,
  onPose,
  onRate,
  onCheer,
}: ThoiTrangRunwayProps) {
  const audienceTotal = Math.max(0, totalWalkers - 1);

  return (
    <View testID="tt-runway" style={styles.root}>
      {/* Full-bleed dark catwalk 3D stage */}
      <View style={StyleSheet.absoluteFill}>
        <ThoiTrangDollCanvas
          outfit={walkerOutfit}
          mode="runway"
          pose={activePose}
          poseNonce={poseNonce}
          catwalkNonce={catwalkNonce}
          interactive={false}
          viewOffset="none"
          testID="tt-runway-canvas"
        />
      </View>

      {/* Top dark-glass theme + timer header */}
      <View style={[styles.topBar, mobile && styles.topBarMobile]}>
        {!mobile && (
          <View style={styles.brandPill}>
            <T style={styles.brandTxt}>✦ Sàn Diễn</T>
          </View>
        )}
        <View style={styles.themePill}>
          <T style={styles.themeSmall}>
            SÀN DIỄN · LƯỢT {Math.max(1, runwayIndex + 1)}/{Math.max(1, totalWalkers)}
          </T>
          <T numberOfLines={1} style={[styles.themeTitle, mobile && styles.themeTitleMobile]}>
            {theme.title}
          </T>
          {!mobile && (
            <T numberOfLines={1} style={styles.themeDesc}>{theme.desc}</T>
          )}
        </View>
        <View style={styles.timerPill}>
          <T testID="tt-timer" style={[styles.timerTxt, mobile && styles.timerTxtMobile]}>
            ⏱ {countdownText}
          </T>
        </View>
        {topRightTools}
      </View>

      {/* Floating live cheer bubbles */}
      {cheers.length > 0 && (
        <View pointerEvents="none" style={styles.cheerLayer}>
          {cheers.slice(-4).map((c) => (
            <View key={c.id} style={styles.cheerBubble}>
              <T style={styles.cheerEmoji}>{c.cheer}</T>
              <T style={styles.cheerName}>{c.name}</T>
            </View>
          ))}
        </View>
      )}

      {/* Bottom white-glass card matching v4 `.rate` */}
      <View style={[styles.rateWrap, mobile && styles.rateWrapMobile]}>
        <View style={[styles.rateCard, mobile && styles.rateCardMobile]}>
          <View style={styles.rateHead}>
            <T numberOfLines={1} style={styles.rateLabel}>
              ĐANG TRÌNH DIỄN · {walkerName.toUpperCase()}
            </T>
            <View style={styles.metaBadgeRow}>
              <View style={styles.metaBadge}>
                <T style={styles.metaBadgeTxt}>
                  ⭐ {ratedCount}/{audienceTotal} đã chấm
                </T>
              </View>
              <View style={styles.machineBadge}>
                <T style={styles.machineBadgeTxt}>🤖 Giám khảo Máy: bí mật</T>
              </View>
            </View>
          </View>

          {isWalker ? (
            <View style={styles.walkerBox}>
              <T style={styles.subHint}>Chọn dáng trình diễn — biểu cảm khuôn mặt tự đổi theo dáng!</T>
              <ScrollView
                horizontal={mobile}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.posesWrap, !mobile && styles.posesWrapDesktop]}
              >
                {THOI_TRANG_RUNWAY_POSES.map((pose) => {
                  const active = activePose === pose;
                  return (
                    <Pressable
                      key={pose}
                      testID={`tt-pose-${pose}`}
                      accessibilityRole="button"
                      onPress={() => onPose(pose)}
                      style={[styles.posePill, active && styles.posePillOn]}
                    >
                      <T style={[styles.poseTxt, active && styles.poseTxtOn]}>
                        {THOI_TRANG_POSE_EMOJIS[pose]} {THOI_TRANG_POSE_LABELS[pose]}
                      </T>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : isSpectator ? (
            <T style={styles.subHint}>Bạn đang xem sàn diễn · điểm tổng kết sẽ bật mí ở vòng Công bố.</T>
          ) : (
            <View style={styles.audienceBox}>
              {/* Big visual star readout + clickable half-star pills (1,0★ .. 5,0★) */}
              <View style={styles.starDisplayRow}>
                <View style={styles.starGlyphs}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = (myRating ?? 0) >= star * 2;
                    const half = !filled && (myRating ?? 0) === star * 2 - 1;
                    return (
                      <T
                        key={star}
                        style={[
                          styles.starChar,
                          filled ? styles.starFull : half ? styles.starHalf : styles.starEmpty,
                        ]}
                      >
                        ★
                      </T>
                    );
                  })}
                </View>
                <T testID="tt-my-rating" style={styles.ratingReadout}>
                  {myRating !== null ? `${formatHalfStars(myRating)}★` : 'Chạm để chấm sao'}
                </T>
              </View>

              <View style={styles.halfStarRow}>
                {HALF_STAR_STEPS.map((hs) => {
                  const active = myRating === hs;
                  return (
                    <Pressable
                      key={hs}
                      testID={`tt-rate-${hs}`}
                      accessibilityRole="button"
                      onPress={() => onRate(hs)}
                      style={[styles.rateStep, mobile && styles.rateStepMobile, active && styles.rateStepOn]}
                    >
                      <T style={[styles.rateStepTxt, active && styles.rateStepTxtOn]}>
                        {formatHalfStars(hs)}★
                      </T>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.cheerBar}>
                <T style={styles.cheerBarLabel}>Cổ vũ:</T>
                {THOI_TRANG_CHEERS.map((emoji, i) => (
                  <Pressable
                    key={emoji}
                    testID={`tt-cheer-${i}`}
                    accessibilityRole="button"
                    onPress={() => onCheer(emoji)}
                    style={({ pressed }) => [styles.cheerBtn, pressed && { transform: [{ scale: 0.92 }] }]}
                  >
                    <T style={styles.cheerBtnTxt}>{emoji}</T>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', backgroundColor: '#140c24' },
  topBar: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 4,
  },
  topBarMobile: { top: 10, left: 10, right: 10, gap: 6 },
  brandPill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  brandTxt: { fontSize: 16, fontWeight: '800', color: V4.pink2 },
  themePill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  themeSmall: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: V4.pink2 },
  themeTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  themeTitleMobile: { fontSize: 13.5 },
  themeDesc: { fontSize: 11.5, color: '#e9d8ff' },
  timerPill: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: V4.pink,
  },
  timerTxt: { fontSize: 16, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] },
  timerTxtMobile: { fontSize: 13.5 },
  cheerLayer: {
    position: 'absolute',
    right: 16,
    bottom: 205,
    gap: 6,
    alignItems: 'flex-end',
    zIndex: 5,
  },
  cheerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  cheerEmoji: { fontSize: 18 },
  cheerName: { fontSize: 12, fontWeight: '700', color: V4.ink },
  rateWrap: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 4,
  },
  rateWrapMobile: { bottom: 10, left: 8, right: 8 },
  rateCard: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  rateCardMobile: { borderRadius: 20, paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  rateHead: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  rateLabel: { fontSize: 11.5, fontWeight: '800', color: V4.pink, letterSpacing: 0.9 },
  metaBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: V4.soft },
  metaBadgeTxt: { fontSize: 11, fontWeight: '700', color: V4.ink },
  machineBadge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999, backgroundColor: '#f3ecff' },
  machineBadgeTxt: { fontSize: 11, fontWeight: '700', color: '#5b3ea8' },
  subHint: { fontSize: 12, fontWeight: '600', color: V4.ink2, textAlign: 'center' },
  walkerBox: { gap: 7 },
  posesWrap: { flexDirection: 'row', gap: 6, paddingBottom: 2 },
  posesWrapDesktop: { flexWrap: 'wrap', justifyContent: 'center' },
  posePill: { paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: V4.soft },
  posePillOn: { backgroundColor: V4.pink },
  poseTxt: { fontSize: 11.5, fontWeight: '700', color: V4.ink },
  poseTxtOn: { color: '#ffffff' },
  audienceBox: { gap: 7, alignItems: 'center' },
  starDisplayRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  starGlyphs: { flexDirection: 'row', gap: 3 },
  starChar: { fontSize: 28, lineHeight: 30 },
  starFull: { color: '#ffbf24' },
  starHalf: { color: '#ffd978' },
  starEmpty: { color: '#e6d8e4' },
  ratingReadout: { fontSize: 14, fontWeight: '800', color: V4.ink },
  halfStarRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 },
  rateStep: { paddingVertical: 5, paddingHorizontal: 9, borderRadius: 999, backgroundColor: V4.soft },
  rateStepMobile: { paddingVertical: 4, paddingHorizontal: 7 },
  rateStepOn: { backgroundColor: V4.pink },
  rateStepTxt: { fontSize: 12, fontWeight: '700', color: V4.ink, fontVariant: ['tabular-nums'] },
  rateStepTxtOn: { color: '#ffffff' },
  cheerBar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' },
  cheerBarLabel: { fontSize: 11.5, fontWeight: '700', color: V4.ink2 },
  cheerBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: V4.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cheerBtnTxt: { fontSize: 17 },
});
