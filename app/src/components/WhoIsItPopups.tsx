/**
 * Popup nổi có hào quang (Halo) cho game Đoán Ai Đây? (`who_is_it`), chia 2 chế độ để không che bảng lâu:
 *
 * A. CẦN THIẾT (thẻ lớn có hào quang + nền mờ nhẹ `rgba(15, 23, 42, 0.38)`):
 * - `answer_free` cho đội phải trả lời (`needsFreeAnswer`): giữ suốt pha để bấm CÓ / KHÔNG;
 *   là trường hợp duy nhất cho phép chạm nền mờ để thu gọn và hiện nút mở lại.
 * - `turn_beat` khi tới lượt đội của người xem: giữ suốt pha (~1.8s).
 * - `reveal` (mọi người): hiện câu hỏi 500ms rồi đóng dấu CÓ ✅ / KHÔNG ❌ hoặc TRÚNG PHÓC / TRẬT,
 *   sau đó tự mờ đi ~1.2s để người chơi nhìn rõ bảng thẻ vừa úp.
 *
 * B. LƯỚT NHANH — FLASH (thẻ nhỏ ~70% chiều rộng, viền phát sáng, không nền mờ, `pointerEvents="none"`,
 *    đặt phía trên bảng, tự mờ sau ~1s, không có nút mở lại):
 * - `turn_beat` cho lượt đối thủ hoặc khán giả.
 * - `answer_free` cho đội vừa hỏi hoặc khán giả (đang chờ đối thủ trả lời).
 */
import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Polygon, RadialGradient, Stop } from 'react-native-svg';
import type { WhoIsItCharacter, WhoIsItTeam, WhoIsItView } from '../../../shared/src/whoisit';
import { useSecondsLeft, useStableWindow } from '../hooks';
import { play } from '../sound';
import { C } from '../theme';
import { Button, T } from '../ui';
import { whoIsItPortraitUri } from '../whoisitPortraits';
import { Image } from './Image';
import { UiIcon } from './Icons';

const USE_NATIVE = Platform.OS !== 'web';
const TEAM_RED = '#EF4444';
const TEAM_BLUE = '#3B82F6';
const RESULT_YES = '#16A34A';
const RESULT_NO = '#DC2626';

const CARD_FADE_IN_MS = 150;
const CARD_FADE_OUT_MS = 150;
const REVEAL_STAMP_MS = 500;
const REVEAL_POST_STAMP_MS = 1200;
const FLASH_VISIBLE_MS = 1000;

const RAY_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

function teamColor(team: WhoIsItTeam): string {
  return team === 'red' ? TEAM_RED : TEAM_BLUE;
}

function teamLabel(team: WhoIsItTeam): string {
  return team === 'red' ? 'Đỏ' : 'Xanh';
}

const Halo = memo(function Halo({ color, size, boost }: { color: string; size: number; boost?: boolean }) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: boost ? 750 : 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: boost ? 750 : 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE,
        }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 16000,
        easing: Easing.linear,
        useNativeDriver: USE_NATIVE,
      }),
    );
    pulseLoop.start();
    spinLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
    };
  }, [pulse, spin, boost]);

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: boost ? [0.96, 1.14] : [0.94, 1.07],
  });
  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: boost ? [0.74, 1] : [0.64, 0.94],
  });
  const spinDeg = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const gradId = `wi_halo_${color.replace('#', '')}`;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.haloWrap,
        { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 },
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 360 360">
          <Defs>
            <RadialGradient id={gradId} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={color} stopOpacity={0.68} />
              <Stop offset="48%" stopColor={color} stopOpacity={0.28} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="180" cy="180" r="176" fill={`url(#${gradId})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ rotate: spinDeg }], opacity: boost ? 0.52 : 0.36 },
        ]}
      >
        <Svg width={size} height={size} viewBox="0 0 360 360">
          <G>
            {RAY_ANGLES.map((deg) => (
              <Polygon
                key={deg}
                points="180,180 166,12 194,12"
                fill={color}
                opacity={0.45}
                transform={`rotate(${deg} 180 180)`}
              />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
});

export interface WhoIsItPopupsProps {
  view: WhoIsItView;
  me: string | null;
  clockOffset: number;
  busy: boolean;
  mySecretChar: WhoIsItCharacter | null;
  onAnswerFree: (yes: boolean) => void;
}

export const WhoIsItPopups = memo(function WhoIsItPopups({
  view,
  me,
  clockOffset,
  busy,
  mySecretChar,
  onAnswerFree,
}: WhoIsItPopupsProps) {
  const { width } = useStableWindow();
  const sec = useSecondsLeft(view.phaseEndsAt, clockOffset, view.phaseSeconds || 1);

  const isPopupPhase =
    view.phase === 'turn_beat' ||
    (view.phase === 'answer_free' && view.pendingQuestion !== null) ||
    (view.phase === 'reveal' && view.lastQA !== null);

  const needsFreeAnswer =
    view.phase === 'answer_free' &&
    view.pendingQuestion !== null &&
    view.myTeam !== null &&
    view.myTeam !== view.pendingQuestion.askedByTeam;

  const isMyTeamTurn =
    view.phase === 'turn_beat' &&
    view.myTeam !== null &&
    view.myTeam === view.turnTeam;

  const isFlash =
    (view.phase === 'turn_beat' && !isMyTeamTurn) ||
    (view.phase === 'answer_free' && view.pendingQuestion !== null && !needsFreeAnswer);

  const pendingId = view.pendingQuestion?.id ?? 0;
  const lastQaId = view.lastQA?.id ?? 0;
  const lastQaAnswer = view.lastQA?.answer ?? null;
  const lastQaAskedById = view.lastQA?.askedById ?? null;

  const popupKey = useMemo(() => {
    if (view.phase === 'turn_beat') {
      return `turn_beat:${view.roundCount}:${view.turnTeam}:${view.activePlayerId ?? ''}:${view.turnNote ?? ''}`;
    }
    if (view.phase === 'answer_free' && pendingId) {
      return `answer_free:${pendingId}`;
    }
    if (view.phase === 'reveal' && lastQaId) {
      return `reveal:${lastQaId}`;
    }
    return '';
  }, [view.phase, view.roundCount, view.turnTeam, view.activePlayerId, view.turnNote, pendingId, lastQaId]);

  const [dismissedKey, setDismissedKey] = useState<string>('');
  const [stampedQaId, setStampedQaId] = useState<number>(0);
  const [autoHiddenKey, setAutoHiddenKey] = useState<string>('');

  const [cardScale] = useState(() => new Animated.Value(0.84));
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [fadeOutOpacity] = useState(() => new Animated.Value(1));
  const [stampScale] = useState(() => new Animated.Value(1.55));
  const [stampOpacity] = useState(() => new Animated.Value(0));

  const canMinimize = needsFreeAnswer;
  const isMinimized = canMinimize && Boolean(popupKey) && dismissedKey === popupKey;
  const isAutoHidden = Boolean(popupKey) && autoHiddenKey === popupKey;
  const isStamped = view.phase === 'reveal' && lastQaId > 0 && stampedQaId === lastQaId;

  const autoHideDelayMs = isFlash
    ? FLASH_VISIBLE_MS
    : view.phase === 'reveal' && lastQaId > 0
      ? REVEAL_STAMP_MS + REVEAL_POST_STAMP_MS
      : 0;

  // Hiệu ứng nảy vào mỗi khi mở popup mới
  useEffect(() => {
    if (!isPopupPhase || !popupKey || isMinimized || isAutoHidden) return;
    fadeOutOpacity.setValue(1);
    cardScale.setValue(isFlash ? 0.92 : 0.84);
    cardOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 6.5,
        tension: 90,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: CARD_FADE_IN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [isPopupPhase, popupKey, isMinimized, isAutoHidden, isFlash, cardScale, cardOpacity, fadeOutOpacity]);

  // Nhịp 2 của pha `reveal`: sau 500ms đóng dấu đáp án + âm thanh (đúng 1 lần cho mỗi `lastQA.id`)
  useEffect(() => {
    if (view.phase !== 'reveal' || !lastQaId || stampedQaId === lastQaId) return;
    const timer = setTimeout(() => {
      setStampedQaId(lastQaId);
      play(lastQaAnswer ? 'stamp' : 'error', { speakerId: lastQaAskedById });
    }, REVEAL_STAMP_MS);
    return () => clearTimeout(timer);
  }, [view.phase, lastQaId, lastQaAnswer, lastQaAskedById, stampedQaId]);

  useEffect(() => {
    if (!isStamped) return;
    stampScale.setValue(1.65);
    stampOpacity.setValue(0);
    const anim = Animated.parallel([
      Animated.spring(stampScale, {
        toValue: 1,
        friction: 6,
        tension: 160,
        useNativeDriver: USE_NATIVE,
      }),
      Animated.timing(stampOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: USE_NATIVE,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [isStamped, stampScale, stampOpacity]);

  // Tự mờ & ẩn cho Flash (~1s) và Reveal (~1.2s sau khi đóng dấu), gắn theo `popupKey` để broadcast lại không reset timer
  useEffect(() => {
    if (!isPopupPhase || !popupKey || !autoHideDelayMs) return;
    let cancelled = false;
    let fadeAnim: Animated.CompositeAnimation | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const hideTimer = setTimeout(() => {
      if (cancelled) return;
      fadeAnim = Animated.timing(fadeOutOpacity, {
        toValue: 0,
        duration: CARD_FADE_OUT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE,
      });
      fadeAnim.start(() => {
        if (!cancelled) setAutoHiddenKey(popupKey);
      });
      fallbackTimer = setTimeout(() => {
        if (!cancelled) setAutoHiddenKey(popupKey);
      }, CARD_FADE_OUT_MS + 80);
    }, autoHideDelayMs);

    return () => {
      cancelled = true;
      clearTimeout(hideTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
      fadeAnim?.stop();
    };
  }, [isPopupPhase, popupKey, autoHideDelayMs, fadeOutOpacity]);

  if (!isPopupPhase || isAutoHidden) return null;

  // Chỉ giữ nút thu gọn / mở lại cho đội đang phải bấm CÓ / KHÔNG ở pha `answer_free`
  if (isMinimized) {
    return (
      <View pointerEvents="box-none" style={styles.minimizedAnchor}>
        <Pressable
          testID="wi-popup-reopen"
          onPress={() => setDismissedKey('')}
          style={({ pressed }) => [
            styles.minimizedPill,
            styles.minimizedPillUrgent,
            pressed && { opacity: 0.82 },
          ]}
        >
          <UiIcon name="HelpCircle" size={14} color="#FFFFFF" />
          <T style={styles.minimizedTxt}>Trả lời câu hỏi ({sec}s) · Bấm mở</T>
        </Pressable>
      </View>
    );
  }

  const cardWidth = Math.min(372, Math.max(280, width - 32));
  const haloSize = Math.min(460, Math.round(cardWidth * 1.28));

  let accentColor = teamColor(view.turnTeam);
  let haloBoost = false;

  if (view.phase === 'answer_free' && view.pendingQuestion) {
    accentColor = teamColor(view.pendingQuestion.askedByTeam);
  } else if (view.phase === 'reveal' && view.lastQA) {
    if (isStamped && view.lastQA.answer !== null) {
      accentColor = view.lastQA.answer ? RESULT_YES : RESULT_NO;
      haloBoost = true;
    } else {
      accentColor = teamColor(view.lastQA.team);
    }
  }

  const renderContent = () => {
    if (view.phase === 'turn_beat') {
      const isMeAsking = view.activePlayerId !== null && me !== null && view.activePlayerId === me;
      const isMyTeam = view.myTeam !== null && view.myTeam === view.turnTeam;
      const askerName = view.activePlayerId ? (view.names[view.activePlayerId] ?? 'Đồng đội') : 'Cả đội';
      const prevTeam = view.turnTeam === 'red' ? 'Đội Xanh' : 'Đội Đỏ';
      const subLabel = isMeAsking ? 'Lượt của bạn' : isMyTeam ? 'Đội bạn hỏi' : 'Đối thủ hỏi';

      return (
        <View style={styles.body}>
          <View style={[styles.topBadge, { backgroundColor: accentColor }]}>
            <T style={styles.topBadgeTxt}>{subLabel.toUpperCase()}</T>
          </View>

          <T style={[styles.turnHeadline, { color: accentColor }]}>
            TỚI LƯỢT ĐỘI {teamLabel(view.turnTeam).toUpperCase()}
          </T>

          <T style={styles.turnAsker}>
            {isMeAsking ? 'Tới lượt BẠN hỏi!' : `${askerName} hỏi`}
          </T>

          {view.turnNote === 'timeout' && (
            <View style={styles.timeoutBox}>
              <T style={styles.timeoutTxt}>⏰ {prevTeam} hết giờ, mất lượt</T>
            </View>
          )}

          <View style={styles.timerChip}>
            <UiIcon name="Timer" size={13} color={C.secondary} />
            <T style={styles.timerTxt}>Bắt đầu sau {sec}s</T>
          </View>
        </View>
      );
    }

    if (view.phase === 'answer_free' && view.pendingQuestion) {
      const pq = view.pendingQuestion;
      const askerTeamLabel = teamLabel(pq.askedByTeam);
      const ansTeamLabel = teamLabel(pq.askedByTeam === 'red' ? 'blue' : 'red');
      const askerName = view.activePlayerId ? (view.names[view.activePlayerId] ?? `Đội ${askerTeamLabel}`) : `Đội ${askerTeamLabel}`;

      return (
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={[styles.topBadge, { backgroundColor: accentColor }]}>
              <T style={styles.topBadgeTxt}>CÂU HỎI TỰ DO</T>
            </View>
            <View style={styles.timerChip}>
              <UiIcon name="Timer" size={13} color={sec <= 5 ? RESULT_NO : C.secondary} />
              <T style={[styles.timerTxt, sec <= 5 && { color: RESULT_NO }]}>{sec}s</T>
            </View>
          </View>

          <T style={styles.askerLine}>
            {askerName} (Đội {askerTeamLabel}) hỏi:
          </T>
          <T style={styles.bigQuote}>“{pq.text}”</T>

          {needsFreeAnswer ? (
            <>
              {mySecretChar && (
                <View style={styles.secretBox}>
                  <Image
                    source={{ uri: whoIsItPortraitUri(mySecretChar, view.artPack) }}
                    style={styles.secretPortrait}
                    resizeMode="contain"
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.secretCaption}>Thẻ bí mật của đội bạn</T>
                    <T numberOfLines={1} style={styles.secretName}>{mySecretChar.name}</T>
                  </View>
                </View>
              )}

              <View style={styles.answerBtnRow}>
                <Button
                  testID="wi-answer-yes"
                  title="✅ CÓ"
                  variant="jade"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onPress={() => onAnswerFree(true)}
                />
                <Button
                  testID="wi-answer-no"
                  title="❌ KHÔNG"
                  variant="danger"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onPress={() => onAnswerFree(false)}
                />
              </View>
            </>
          ) : (
            <View style={styles.waitAnsBox}>
              <T style={styles.waitAnsTxt}>Đang chờ Đội {ansTeamLabel} trả lời… ({sec}s)</T>
            </View>
          )}
        </View>
      );
    }

    if (view.phase === 'reveal' && view.lastQA) {
      const qa = view.lastQA;
      const qaTeamLabel = teamLabel(qa.team);
      const isGuess = qa.kind === 'guess';
      const guessedChar = isGuess
        ? ((qa.characterId ? view.characters.find((c) => c.id === qa.characterId) : undefined) ??
          view.characters.find((c) => qa.question === `Chốt đoán: ${c.name}!`) ??
          (view.lastFlippedIds[0] ? view.characters.find((c) => c.id === view.lastFlippedIds[0]) : undefined) ??
          null)
        : null;

      const flippedCount = view.lastFlippedTeam === qa.team ? view.lastFlippedIds.length : 0;
      const remaining = view.remainingCounts[qa.team];

      const stampBg = qa.answer ? RESULT_YES : RESULT_NO;
      const stampText = isGuess
        ? qa.answer
          ? 'TRÚNG PHÓC! 🎯'
          : 'TRẬT! −1 ♥'
        : qa.answer
          ? 'CÓ ✅'
          : 'KHÔNG ❌';

      return (
        <View style={styles.body}>
          <View style={[styles.topBadge, { backgroundColor: teamColor(qa.team) }]}>
            <T style={styles.topBadgeTxt}>
              {qa.askedByName} (Đội {qaTeamLabel}) {isGuess ? 'chốt đoán' : 'hỏi'}
            </T>
          </View>

          {isGuess && guessedChar ? (
            <View style={styles.guessPortraitBox}>
              <Image
                source={{ uri: whoIsItPortraitUri(guessedChar, view.artPack) }}
                style={styles.guessPortrait}
                resizeMode="contain"
              />
              <T style={styles.guessName}>{guessedChar.name}</T>
            </View>
          ) : (
            <T style={styles.bigQuote}>“{qa.question}”</T>
          )}

          <View style={styles.stampSlot}>
            {isStamped ? (
              <Animated.View
                testID="wi-reveal-stamp"
                style={[
                  styles.stampPill,
                  { backgroundColor: stampBg, transform: [{ scale: stampScale }], opacity: stampOpacity },
                ]}
              >
                <T style={styles.stampTxt}>{stampText}</T>
              </Animated.View>
            ) : (
              <View style={styles.drumrollPill}>
                <T style={styles.drumrollTxt}>Đang lật đáp án…</T>
              </View>
            )}
          </View>

          {isStamped && !isGuess && (
            <T style={styles.revealSub}>
              {qa.kind === 'trait'
                ? `Đội ${qaTeamLabel} úp ${flippedCount} thẻ · còn ${remaining}`
                : `Câu tự gõ — Đội ${qaTeamLabel} tự úp thẻ không khớp`}
            </T>
          )}
        </View>
      );
    }

    return null;
  };

  const renderFlashContent = () => {
    if (view.phase === 'turn_beat') {
      const askerName = view.activePlayerId ? (view.names[view.activePlayerId] ?? 'Đồng đội') : 'Cả đội';
      const prevTeam = view.turnTeam === 'red' ? 'Đội Xanh' : 'Đội Đỏ';

      return (
        <View style={styles.flashBody}>
          <View style={[styles.flashBadge, { backgroundColor: accentColor }]}>
            <T style={styles.flashBadgeTxt}>ĐỐI THỦ HỎI</T>
          </View>
          <T style={[styles.flashHeadline, { color: accentColor }]}>
            TỚI LƯỢT ĐỘI {teamLabel(view.turnTeam).toUpperCase()}
          </T>
          <T style={styles.flashAsker}>{askerName} hỏi</T>
          {view.turnNote === 'timeout' && (
            <View style={styles.flashTimeoutBox}>
              <T style={styles.flashTimeoutTxt}>⏰ {prevTeam} hết giờ, mất lượt</T>
            </View>
          )}
        </View>
      );
    }

    if (view.phase === 'answer_free' && view.pendingQuestion) {
      const pq = view.pendingQuestion;
      const askerTeamLabel = teamLabel(pq.askedByTeam);
      const ansTeamLabel = teamLabel(pq.askedByTeam === 'red' ? 'blue' : 'red');
      const askerName = view.activePlayerId
        ? (view.names[view.activePlayerId] ?? `Đội ${askerTeamLabel}`)
        : `Đội ${askerTeamLabel}`;

      return (
        <View style={styles.flashBody}>
          <View style={[styles.flashBadge, { backgroundColor: accentColor }]}>
            <T style={styles.flashBadgeTxt}>CÂU HỎI TỰ DO</T>
          </View>
          <T style={styles.flashAskerLine}>
            {askerName} (Đội {askerTeamLabel}) hỏi:
          </T>
          <T numberOfLines={2} style={styles.flashQuote}>
            “{pq.text}”
          </T>
          <T style={styles.flashWaitTxt}>Đang chờ Đội {ansTeamLabel} trả lời…</T>
        </View>
      );
    }

    return null;
  };

  if (isFlash) {
    const flashCardWidth = Math.min(276, Math.max(210, Math.round(cardWidth * 0.72)));

    return (
      <Animated.View
        testID={`wi-popup-${view.phase}`}
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.flashRoot, { opacity: fadeOutOpacity }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flashCard,
            {
              width: flashCardWidth,
              borderColor: accentColor,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
            Platform.OS === 'web'
              ? ({ boxShadow: `0 8px 24px rgba(15, 23, 42, 0.22), 0 0 18px ${accentColor}66` } as object)
              : {
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.36,
                  shadowRadius: 12,
                  elevation: 8,
                },
          ]}
        >
          {renderFlashContent()}
        </Animated.View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      testID={`wi-popup-${view.phase}`}
      style={[StyleSheet.absoluteFill, styles.overlayRoot, { opacity: fadeOutOpacity }]}
    >
      {canMinimize ? (
        <Pressable
          testID="wi-popup-backdrop"
          accessibilityLabel="Thu gọn thông báo"
          onPress={() => setDismissedKey(popupKey)}
          style={[StyleSheet.absoluteFill, styles.dimBackdrop]}
        />
      ) : (
        <View testID="wi-popup-backdrop" style={[StyleSheet.absoluteFill, styles.dimBackdrop]} />
      )}

      <View pointerEvents="box-none" style={styles.centerStage}>
        <Halo color={accentColor} size={haloSize} boost={haloBoost} />

        <Animated.View
          style={[
            styles.card,
            {
              width: cardWidth,
              borderColor: accentColor,
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
            Platform.OS === 'web'
              ? ({ boxShadow: `0 18px 46px rgba(15, 23, 42, 0.36), 0 0 28px ${accentColor}55` } as object)
              : {
                  shadowColor: accentColor,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.42,
                  shadowRadius: 22,
                  elevation: 16,
                },
          ]}
        >
          {renderContent()}
          {canMinimize && <T style={styles.dismissHint}>Chạm vùng mờ bên ngoài để thu gọn</T>}
        </Animated.View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  overlayRoot: {
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
  },
  flashRoot: {
    zIndex: 40,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 14,
  },
  flashCard: {
    backgroundColor: 'rgba(255, 253, 248, 0.96)',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  flashBody: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 4,
  },
  flashBadge: {
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  flashBadgeTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  flashHeadline: {
    fontSize: 14.5,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  flashAsker: {
    fontSize: 15,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
  },
  flashAskerLine: {
    fontSize: 12,
    fontWeight: '800',
    color: C.secondary,
    textAlign: 'center',
  },
  flashQuote: {
    fontSize: 14.5,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
    lineHeight: 19,
  },
  flashWaitTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: C.secondary,
    textAlign: 'center',
    marginTop: 1,
  },
  flashTimeoutBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  flashTimeoutTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    textAlign: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  haloWrap: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  card: {
    backgroundColor: '#FFFDF8',
    borderRadius: 24,
    borderWidth: 3,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  body: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: 10,
  },
  headerRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  topBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  topBadgeTxt: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  turnHeadline: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  turnAsker: {
    fontSize: 24,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
  },
  timeoutBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeoutTxt: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B91C1C',
    textAlign: 'center',
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  timerTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
  },
  askerLine: {
    fontSize: 14,
    fontWeight: '800',
    color: C.secondary,
    textAlign: 'center',
  },
  bigQuote: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
    textAlign: 'center',
    lineHeight: 27,
    paddingHorizontal: 4,
  },
  secretBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 8,
  },
  secretPortrait: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  secretCaption: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  secretName: {
    fontSize: 17,
    fontWeight: '900',
    color: C.ink,
  },
  answerBtnRow: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'stretch',
    marginTop: 2,
  },
  waitAnsBox: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignSelf: 'stretch',
  },
  waitAnsTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: C.secondary,
    textAlign: 'center',
  },
  guessPortraitBox: {
    alignItems: 'center',
    gap: 6,
  },
  guessPortrait: {
    width: 112,
    height: 112,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.ink,
  },
  guessName: {
    fontSize: 21,
    fontWeight: '900',
    color: C.ink,
  },
  stampSlot: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampPill: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  stampTxt: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  drumrollPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  drumrollTxt: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.secondary,
  },
  revealSub: {
    fontSize: 13.5,
    fontWeight: '800',
    color: C.secondary,
    textAlign: 'center',
  },
  dismissHint: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
  },
  minimizedAnchor: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
  },
  minimizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  minimizedPillUrgent: {
    backgroundColor: '#DC2626',
  },
  minimizedTxt: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
