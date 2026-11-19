import { memo, useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { GianDiepView } from '../../../shared/src/giandiep';
import type { PublicPlayer } from '../../../shared/src/types';
import { useKeyboardInset, useSecondsLeft, useStableWindow } from '../hooks';
import { useSmoothMode } from '../smoothMode';
import { C, FONT } from '../theme';
import { Button, T } from '../ui';
import { Portrait } from './Avatar';
import { EmojiIcon, UiIcon } from './Icons';

interface GlowingPopupProps {
  testID?: string;
  title: string;
  emoji: string;
  accent: string;
  glowRgba: string;
  endsAt: number | null;
  totalSeconds: number;
  clockOffset: number;
  onMinimize?: () => void;
  minimizeTestID?: string;
  minimizeLabel?: string;
  children: ReactNode;
}

export const GlowingPopup = memo(function GlowingPopup({
  testID,
  title,
  emoji,
  accent,
  glowRgba,
  endsAt,
  totalSeconds,
  clockOffset,
  onMinimize,
  minimizeTestID,
  minimizeLabel = 'Xem chat',
  children,
}: GlowingPopupProps) {
  const [smooth] = useSmoothMode();
  const { width, height } = useStableWindow();
  const rawKbInset = useKeyboardInset();
  const kbInset = Platform.OS === 'web' ? rawKbInset : 0;
  const sec = useSecondsLeft(endsAt, clockOffset, totalSeconds || 999);

  const [pulse] = useState(() => new Animated.Value(0));
  const [popIn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    popIn.setValue(0);
    Animated.timing(popIn, {
      toValue: 1,
      duration: 210,
      easing: Easing.out(Easing.back(1.25)),
      useNativeDriver: false,
    }).start();
  }, [popIn]);

  useEffect(() => {
    if (smooth) {
      pulse.setValue(0.65);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse, smooth]);

  const auraOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  const auraScale = smooth
    ? 1
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1.018] });
  const cardScale = popIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const cardWidth = Math.min(440, Math.max(300, width - 24));
  const usableHeight = Math.max(260, height - kbInset - 28);

  return (
    <View
      testID={testID}
      style={[
        styles.overlayBackdrop,
        kbInset > 0 && { paddingBottom: 14 + kbInset },
      ]}
    >
      <Animated.View
        style={[
          styles.auraShell,
          {
            width: cardWidth,
            maxHeight: Math.min(620, usableHeight),
            borderColor: accent,
            opacity: popIn,
            transform: [{ scale: cardScale }],
          },
          Platform.OS === 'web'
            ? ({
                boxShadow: `0 0 36px 8px ${glowRgba}, 0 0 14px 2px ${accent}, 0 18px 40px rgba(0,0,0,0.65)`,
              } as object)
            : {
                shadowColor: accent,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.85,
                shadowRadius: 20,
                elevation: 18,
              },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.auraHaloRing,
            {
              borderColor: accent,
              opacity: auraOpacity,
              transform: [{ scale: auraScale }],
            },
            Platform.OS === 'web'
              ? ({
                  boxShadow: `inset 0 0 22px ${glowRgba}, 0 0 28px 6px ${glowRgba}`,
                } as object)
              : null,
          ]}
        />

        <View style={styles.cardInner}>
          <View style={[styles.headerRow, { borderBottomColor: 'rgba(255,255,255,0.12)' }]}>
            <View style={[styles.headerIconBadge, { backgroundColor: glowRgba, borderColor: accent }]}>
              <EmojiIcon emoji={emoji} size={18} />
            </View>
            <T numberOfLines={1} style={[styles.headerTitle, width < 390 && { fontSize: 13.5 }]}>{title}</T>
            {endsAt !== null && (
              <View style={[styles.timerPill, sec <= 5 && styles.timerPillUrgent]}>
                <T style={styles.timerTxt}>{sec}s</T>
              </View>
            )}
            {onMinimize && (
              <Pressable
                testID={minimizeTestID}
                onPress={onMinimize}
                hitSlop={6}
                style={({ pressed }) => [styles.minimizeBtn, pressed && { opacity: 0.75 }]}
              >
                <UiIcon name="Eye" size={13} color="#E2E8F0" />
                <T style={styles.minimizeTxt}>{minimizeLabel}</T>
              </Pressable>
            )}
          </View>

          <View style={styles.body}>{children}</View>
        </View>
      </Animated.View>
    </View>
  );
});

export function WordRevealPopup({
  view,
  clockOffset,
  me,
  busy,
  onReady,
  onMinimize,
}: {
  view: GianDiepView;
  clockOffset: number;
  me: string;
  busy: boolean;
  onReady: () => void;
  onMinimize: () => void;
}) {
  const [shown, setShown] = useState(true);
  const myReady = view.readySkip.includes(me);
  const readyCount = view.readySkip.length;
  const totalAlive = Math.max(1, view.alive.length);
  const isWhite = view.myRole === 'mrwhite';

  return (
    <GlowingPopup
      testID="gd-word-reveal-modal"
      title={`Nhận Từ Khóa · V${view.round}`}
      emoji="🔐"
      accent={isWhite ? '#94A3B8' : '#FACC15'}
      glowRgba={isWhite ? 'rgba(148, 163, 184, 0.45)' : 'rgba(250, 204, 21, 0.55)'}
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeLabel="Thu gọn"
    >
      <View style={styles.metaPillsRow}>
        <View style={styles.metaChip}>
          <T style={styles.metaChipTxt}>🏷️ Chủ đề: {view.category}</T>
        </View>
        {view.roleSummary && (
          <View testID="gd-role-summary" style={styles.metaChipIndigo}>
            <T style={styles.metaChipIndigoTxt}>
              🧑{view.roleSummary.dan} · 🕵️{view.roleSummary.giandiep}
              {view.roleSummary.mrwhite > 0 ? ` · 🤍${view.roleSummary.mrwhite}` : ''}
            </T>
          </View>
        )}
      </View>

      <Pressable
        onPress={() => setShown((v) => !v)}
        style={[
          styles.wordShowcase,
          !shown && { borderColor: '#475569', backgroundColor: '#1E293B' },
        ]}
      >
        <View style={styles.wordShowcaseTop}>
          <T style={styles.wordShowcaseLabel}>
            {isWhite ? 'THÂN PHẬN CỦA BẠN' : '🔑 TỪ KHÓA BÍ MẬT CỦA BẠN'}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <UiIcon name={shown ? 'Eye' : 'EyeOff'} size={13} color="#CBD5E1" />
            <T style={styles.wordToggleHint}>{shown ? 'Chạm che' : 'Chạm mở'}</T>
          </View>
        </View>

        {shown ? (
          <T
            testID="gd-secret-word"
            style={[
              styles.wordShowcaseValue,
              isWhite && { color: '#F1F5F9', fontSize: 22 },
            ]}
          >
            {isWhite ? '🤍 MR. WHITE (Không có từ)' : (view.myWord ?? '---').toUpperCase()}
          </T>
        ) : (
          <T testID="gd-secret-word" style={styles.wordShowcaseMask}>
            •••••••••• (Đã che)
          </T>
        )}
      </Pressable>

      <T style={styles.popupSubNote}>
        {isWhite
          ? 'Bạn không có từ — lắng nghe gợi ý của mọi người để đoán từ Dân Thường!'
          : 'Ghi nhớ kỹ từ khóa và KHÔNG nhắc trực tiếp khi khai gợi ý nhé!'}
      </T>

      <Button
        testID="gd-word-ready-btn"
        variant={myReady ? 'jade' : 'gold'}
        disabled={busy || myReady}
        title={
          myReady
            ? `✓ Đã sẵn sàng (${readyCount}/${totalAlive})`
            : `✓ Đã nhớ từ — Sẵn sàng! (${readyCount}/${totalAlive})`
        }
        onPress={onReady}
      />
    </GlowingPopup>
  );
}

export function ClueRecapPopup({
  view,
  clockOffset,
  me,
  busy,
  playerMap,
  seatIndexMap,
  isPhaseRecap,
  onReady,
  onClose,
}: {
  view: GianDiepView;
  clockOffset: number;
  me: string;
  busy: boolean;
  playerMap: Map<string, PublicPlayer>;
  seatIndexMap: Map<string, number>;
  isPhaseRecap: boolean;
  onReady: () => void;
  onClose: () => void;
}) {
  const { height } = useStableWindow();
  const roundClues = view.clues.filter((c) => c.round === view.round);
  const myReady = view.readySkip.includes(me);
  const needReady = Math.max(1, Math.ceil(view.alive.length / 2));

  return (
    <GlowingPopup
      testID="gd-clue-recap-modal"
      title="Tổng Hợp Lời Khai"
      emoji="📋"
      accent="#10B981"
      glowRgba="rgba(16, 185, 129, 0.5)"
      endsAt={isPhaseRecap ? view.phaseEndsAt : null}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onClose}
      minimizeLabel={isPhaseRecap ? 'Thu gọn' : 'Đóng'}
    >
      <T style={styles.popupSubNote}>
        Đối chiếu toàn bộ câu gợi ý mọi người vừa khai để tìm ra điểm bất thường:
      </T>

      <ScrollView
        style={{ maxHeight: Math.min(320, Math.max(170, height * 0.42)) }}
        contentContainerStyle={styles.recapList}
        showsVerticalScrollIndicator={false}
      >
        {roundClues.length === 0 ? (
          <T style={styles.emptyRecapTxt}>Chưa có lời khai nào ở vòng này.</T>
        ) : (
          roundClues.map((clue) => {
            const seatNo = seatIndexMap.get(clue.playerId);
            const pl = playerMap.get(clue.playerId);
            const isMine = clue.playerId === me;
            return (
              <View
                key={clue.id}
                style={[
                  styles.recapRow,
                  isMine && styles.recapRowMine,
                ]}
              >
                {pl ? (
                  <Portrait p={pl} size={32} border={2} />
                ) : (
                  <UiIcon name="User" size={24} color="#94A3B8" />
                )}
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    {seatNo && (
                      <View style={[styles.miniSeatPill, isMine && { backgroundColor: '#FACC15' }]}>
                        <T style={[styles.miniSeatTxt, isMine && { color: '#0F172A' }]}>#{seatNo}</T>
                      </View>
                    )}
                    <T numberOfLines={1} style={styles.recapName}>
                      {clue.name}{isMine ? ' (Bạn)' : ''}
                    </T>
                  </View>
                  <T style={styles.recapClueTxt}>«{clue.text}»</T>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {isPhaseRecap ? (
        <Button
          testID="gd-recap-ready-btn"
          variant={myReady ? 'jade' : 'gold'}
          disabled={busy || myReady}
          title={
            myReady
              ? `✓ Đã xem xong (${view.readySkip.length}/${needReady})`
              : `💬 Vào thảo luận! (${view.readySkip.length}/${needReady})`
          }
          onPress={onReady}
        />
      ) : (
        <Button
          variant="paper"
          title="Đóng bảng lời khai"
          onPress={onClose}
        />
      )}
    </GlowingPopup>
  );
}

export function VotePopup({
  view,
  clockOffset,
  me,
  busy,
  playerMap,
  seatIndexMap,
  voteTally,
  latestClueByPlayer,
  onVote,
  onMinimize,
}: {
  view: GianDiepView;
  clockOffset: number;
  me: string;
  busy: boolean;
  playerMap: Map<string, PublicPlayer>;
  seatIndexMap: Map<string, number>;
  voteTally: Record<string, number>;
  latestClueByPlayer: Map<string, string>;
  onVote: (target: string | 'skip') => void;
  onMinimize: () => void;
}) {
  const { width, height } = useStableWindow();
  const candidates = view.order.filter((id) => id !== me && view.alive.includes(id));
  const myVote = view.votes[me];
  const votedCount = view.alive.filter((id) => Boolean(view.votes[id])).length;
  const cols = width >= 350 ? 2 : 1;

  return (
    <GlowingPopup
      testID="gd-vote-modal"
      title={`Bỏ Phiếu · V${view.round}`}
      emoji="🗳️"
      accent="#F59E0B"
      glowRgba="rgba(245, 158, 11, 0.56)"
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeTestID="gd-vote-minimize"
      minimizeLabel="Xem chat"
    >
      <View testID="gd-vote-panel" style={{ gap: 8 }}>
        <T style={styles.popupSubNote}>
          Chọn nghi phạm đáng ngờ nhất để đưa lên Biện Minh ({votedCount}/{view.alive.length} đã bầu):
        </T>

        <ScrollView
          style={{ maxHeight: Math.min(310, Math.max(160, height * 0.4)) }}
          contentContainerStyle={styles.voteGrid}
          showsVerticalScrollIndicator={false}
        >
          {candidates.map((id) => {
            const pl = playerMap.get(id);
            const seatNo = seatIndexMap.get(id);
            const votes = voteTally[id] ?? 0;
            const selected = myVote === id;
            const clueText = latestClueByPlayer.get(id);
            return (
              <Pressable
                key={id}
                testID={`gd-vote-pick-${id}`}
                disabled={busy}
                onPress={() => onVote(id)}
                style={({ pressed }) => [
                  styles.voteCard,
                  { width: cols === 2 ? '48.5%' : '100%' },
                  selected && styles.voteCardSelected,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={styles.voteCardTop}>
                  {seatNo && (
                    <View style={styles.miniSeatPill}>
                      <T style={styles.miniSeatTxt}>#{seatNo}</T>
                    </View>
                  )}
                  {votes > 0 && (
                    <View style={styles.voteCountBadge}>
                      <T style={styles.voteCountTxt}>🗳️ {votes}</T>
                    </View>
                  )}
                </View>

                <View style={styles.voteCardProfile}>
                  {pl ? (
                    <Portrait p={pl} size={34} border={2} />
                  ) : (
                    <UiIcon name="User" size={26} color="#94A3B8" />
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T numberOfLines={1} style={[styles.voteCardName, selected && { color: '#FEF08A' }]}>
                      {view.names[id] ?? id}
                    </T>
                    <T numberOfLines={1} style={styles.voteCardStatus}>
                      {selected ? '✓ Đang chọn' : 'Chạm để bầu'}
                    </T>
                  </View>
                </View>

                {clueText && (
                  <T numberOfLines={1} style={styles.voteCardClue}>
                    🎤 «{clueText}»
                  </T>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        <Button
          testID="gd-skip-vote"
          variant={myVote === 'skip' ? 'gold' : 'paper'}
          disabled={busy}
          icon="🏳️"
          title={myVote === 'skip' ? '✓ Đã chọn Bỏ phiếu trắng' : 'Bỏ phiếu trắng (Chưa loại ai)'}
          onPress={() => onVote('skip')}
        />
      </View>
    </GlowingPopup>
  );
}

export function VerdictPopup({
  view,
  clockOffset,
  me,
  busy,
  playerMap,
  seatIndexMap,
  voteTally,
  latestClueByPlayer,
  onVerdict,
  onMinimize,
}: {
  view: GianDiepView;
  clockOffset: number;
  me: string;
  busy: boolean;
  playerMap: Map<string, PublicPlayer>;
  seatIndexMap: Map<string, number>;
  voteTally: Record<string, number>;
  latestClueByPlayer: Map<string, string>;
  onVerdict: (verdict: string) => void;
  onMinimize: () => void;
}) {
  const { height } = useStableWindow();
  const defs = view.defendants ?? [];
  const myVerdict = view.finalVotes?.[me];
  const isSingle = defs.length === 1;

  if (isSingle) {
    const accId = defs[0];
    const accName = view.names[accId] ?? accId;
    const accSeat = seatIndexMap.get(accId);
    const accPlayer = playerMap.get(accId);
    const accClue = latestClueByPlayer.get(accId);
    const latestDef = [...view.timeline]
      .reverse()
      .find((m) => m.round === view.round && m.kind === 'defense' && m.playerId === accId)?.text;

    const banishVotes = Object.values(view.finalVotes ?? {}).filter((v) => v === 'banish').length;
    const forgiveVotes = Object.values(view.finalVotes ?? {}).filter((v) => v === 'forgive').length;
    const isSelfProtected = accId === me && view.alive.length > 2;

    return (
      <GlowingPopup
        testID="gd-verdict-modal"
        title="Phán Quyết Cuối"
        emoji="🔨"
        accent="#E11D48"
        glowRgba="rgba(225, 29, 72, 0.56)"
        endsAt={view.phaseEndsAt}
        totalSeconds={view.phaseSeconds}
        clockOffset={clockOffset}
        onMinimize={onMinimize}
        minimizeTestID="gd-verdict-minimize"
        minimizeLabel="Xem chat"
      >
        <View style={styles.defendantSpotlight}>
          {accPlayer ? (
            <Portrait p={accPlayer} size={50} border={2} />
          ) : (
            <UiIcon name="User" size={34} color="#FCA5A5" />
          )}
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {accSeat && (
                <View style={[styles.miniSeatPill, { backgroundColor: '#DC2626' }]}>
                  <T style={styles.miniSeatTxt}>#{accSeat}</T>
                </View>
              )}
              <T numberOfLines={1} style={styles.spotlightName}>{accName}</T>
            </View>
            {accClue && (
              <T numberOfLines={2} style={styles.spotlightQuote}>🎤 Gợi ý: «{accClue}»</T>
            )}
            {latestDef && (
              <T numberOfLines={2} style={[styles.spotlightQuote, { color: '#FECDD3' }]}>
                ⚖️ Biện minh: «{latestDef}»
              </T>
            )}
          </View>
        </View>

        <View style={styles.tallyStrip}>
          <T style={styles.tallyBanish}>👎 Trục xuất: {banishVotes}</T>
          <T style={styles.tallyDivider}>·</T>
          <T style={styles.tallyForgive}>👍 Tha bổng: {forgiveVotes}</T>
        </View>

        {isSelfProtected ? (
          <View style={styles.waitingBox}>
            <T style={styles.waitingBoxTxt}>
              ⚖️ Cả phòng đang bỏ phiếu phán quyết số phận của bạn…
            </T>
          </View>
        ) : (
          <View style={styles.verdictBtnRow}>
            <Button
              testID="gd-verdict-banish"
              small
              variant="danger"
              disabled={busy}
              icon="👎"
              title={myVerdict === 'banish' ? '✓ TRỤC XUẤT' : 'TRỤC XUẤT'}
              onPress={() => onVerdict('banish')}
              style={[
                { flex: 1 },
                myVerdict === 'banish' && styles.selectedActionOutline,
              ]}
            />
            <Button
              testID="gd-verdict-forgive"
              small
              variant="jade"
              disabled={busy}
              icon="👍"
              title={myVerdict === 'forgive' ? '✓ THA BỔNG' : 'THA BỔNG'}
              onPress={() => onVerdict('forgive')}
              style={[
                { flex: 1 },
                myVerdict === 'forgive' && styles.selectedActionOutline,
              ]}
            />
          </View>
        )}

        <T style={styles.popupSubNote}>
          Hết giờ nếu phiếu Tha Bổng không vượt Trục Xuất, {accName} sẽ bị loại!
        </T>
      </GlowingPopup>
    );
  }

  return (
    <GlowingPopup
      testID="gd-verdict-modal"
      title="Chung Kết Đồng Phiếu"
      emoji="🔨"
      accent="#A855F7"
      glowRgba="rgba(168, 85, 247, 0.56)"
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeTestID="gd-verdict-minimize"
      minimizeLabel="Xem chat"
    >
      <T style={styles.popupSubNote}>
        Các nghi phạm có số phiếu bằng nhau! Chọn 1 người để trục xuất hoặc tha cả nhóm:
      </T>

      <ScrollView
        style={{ maxHeight: Math.min(260, Math.max(150, height * 0.36)) }}
        contentContainerStyle={{ gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {defs.filter((id) => id !== me).map((id) => {
          const pl = playerMap.get(id);
          const seatNo = seatIndexMap.get(id);
          const votes = voteTally[id] ?? 0;
          const selected = myVerdict === id;
          const clueText = latestClueByPlayer.get(id);
          return (
            <Pressable
              key={id}
              testID={`gd-vote-pick-${id}`}
              disabled={busy}
              onPress={() => onVerdict(id)}
              style={[styles.tieCard, selected && styles.voteCardSelected]}
            >
              {pl ? <Portrait p={pl} size={36} border={2} /> : <UiIcon name="User" size={26} color="#94A3B8" />}
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {seatNo && (
                    <View style={styles.miniSeatPill}>
                      <T style={styles.miniSeatTxt}>#{seatNo}</T>
                    </View>
                  )}
                  <T numberOfLines={1} style={styles.voteCardName}>{view.names[id] ?? id}</T>
                </View>
                {clueText && (
                  <T numberOfLines={1} style={styles.voteCardClue}>🎤 «{clueText}»</T>
                )}
              </View>
              <View style={[styles.voteCountBadge, selected && { backgroundColor: '#FACC15' }]}>
                <T style={[styles.voteCountTxt, selected && { color: '#0F172A' }]}>
                  {selected ? '✓ ' : ''}🗳️ {votes}
                </T>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Button
        testID="gd-verdict-skip"
        variant={myVerdict === 'skip' ? 'gold' : 'paper'}
        disabled={busy}
        icon="🏳️"
        title={myVerdict === 'skip' ? '✓ Đã chọn Tha cả nhóm' : 'Tha bổng tất cả (Phiếu trắng)'}
        onPress={() => onVerdict('skip')}
      />
    </GlowingPopup>
  );
}

export function CounterGuessPopup({
  view,
  clockOffset,
  busy,
  err,
  onGuess,
  onMinimize,
}: {
  view: GianDiepView;
  clockOffset: number;
  busy: boolean;
  err: string | null;
  onGuess: (word: string) => Promise<boolean>;
  onMinimize: () => void;
}) {
  const [val, setVal] = useState('');
  const isSpyCounter = view.phase === 'spy_guess';

  const submit = async () => {
    const clean = val.trim();
    if (!clean || busy) return;
    if (await onGuess(clean)) setVal('');
  };

  return (
    <GlowingPopup
      testID="gd-counter-modal"
      title={isSpyCounter ? 'Gián Điệp Phản Đòn!' : 'Mr. White Lật Kèo!'}
      emoji={isSpyCounter ? '🕵️' : '🤍'}
      accent="#EA580C"
      glowRgba="rgba(234, 88, 12, 0.58)"
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeTestID="gd-counter-minimize"
      minimizeLabel="Xem chat"
    >
      <T style={styles.popupSubNote}>
        {isSpyCounter
          ? 'Bạn đã bị lộ! Hãy đoán ĐÚNG TỪ KHÓA của phe Dân Thường để lật kèo thắng độc lập!'
          : 'Cơ hội cuối! Dựa vào gợi ý vừa nghe, đoán ĐÚNG TỪ KHÓA phe Dân Thường để thắng ngay!'}
      </T>

      <View style={styles.metaChip}>
        <T style={styles.metaChipTxt}>🏷️ Chủ đề: {view.category}</T>
      </View>

      {err && <T style={styles.counterErr}>{err}</T>}

      <TextInput
        testID="gd-mrwhite-input"
        value={val}
        onChangeText={setVal}
        onSubmitEditing={() => void submit()}
        placeholder="Nhập từ khóa của Dân Thường..."
        placeholderTextColor="#64748B"
        maxLength={50}
        style={styles.counterInput}
      />

      <Button
        testID="gd-mrwhite-submit"
        variant="gold"
        disabled={busy || !val.trim()}
        icon="💥"
        title="CHỐT TỪ LẬT KÈO!"
        onPress={() => void submit()}
      />
    </GlowingPopup>
  );
}

const styles = StyleSheet.create({
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  auraShell: {
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: '#0F172A',
    position: 'relative',
  },
  auraHaloRing: {
    position: 'absolute',
    top: -4,
    right: -4,
    bottom: -4,
    left: -4,
    borderRadius: 25,
    borderWidth: 2,
  },
  cardInner: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
  },
  headerIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14.5,
    fontWeight: '900',
    fontFamily: FONT,
  },
  timerPill: {
    backgroundColor: '#1E293B',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timerPillUrgent: {
    backgroundColor: '#991B1B',
    borderColor: '#F87171',
  },
  timerTxt: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '900',
  },
  minimizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  minimizeTxt: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '800',
  },
  body: {
    padding: 14,
    gap: 10,
  },
  popupSubNote: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16.5,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  metaChip: {
    backgroundColor: 'rgba(254, 243, 199, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.35)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  metaChipTxt: {
    color: '#FDE68A',
    fontSize: 11.5,
    fontWeight: '800',
  },
  metaChipIndigo: {
    backgroundColor: 'rgba(99, 102, 241, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.38)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaChipIndigoTxt: {
    color: '#E0E7FF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  wordShowcase: {
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FACC15',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  wordShowcaseTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordShowcaseLabel: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  wordToggleHint: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '800',
  },
  wordShowcaseValue: {
    color: '#FDE047',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    fontFamily: FONT,
  },
  wordShowcaseMask: {
    color: '#CBD5E1',
    fontSize: 17,
    fontWeight: '800',
    paddingVertical: 6,
  },
  recapList: {
    gap: 7,
    paddingVertical: 2,
  },
  emptyRecapTxt: {
    color: '#94A3B8',
    fontSize: 12.5,
    textAlign: 'center',
    paddingVertical: 16,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  recapRowMine: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
  },
  miniSeatPill: {
    backgroundColor: '#334155',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  miniSeatTxt: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '900',
  },
  recapName: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },
  recapClueTxt: {
    color: '#6EE7B7',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  voteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  voteCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    padding: 9,
    gap: 5,
  },
  voteCardSelected: {
    borderColor: '#FACC15',
    borderWidth: 2,
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
  },
  voteCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 18,
  },
  voteCountBadge: {
    backgroundColor: '#78350F',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  voteCountTxt: {
    color: '#FEF08A',
    fontSize: 10,
    fontWeight: '900',
  },
  voteCardProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  voteCardName: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '900',
  },
  voteCardStatus: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
  },
  voteCardClue: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  defendantSpotlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: 'rgba(225, 29, 72, 0.16)',
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 113, 133, 0.5)',
    padding: 11,
  },
  spotlightName: {
    color: '#FFF1F2',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: FONT,
    flexShrink: 1,
  },
  spotlightQuote: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  tallyStrip: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  tallyBanish: {
    color: '#FDA4AF',
    fontSize: 12.5,
    fontWeight: '900',
  },
  tallyDivider: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '900',
  },
  tallyForgive: {
    color: '#6EE7B7',
    fontSize: 12.5,
    fontWeight: '900',
  },
  verdictBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedActionOutline: {
    borderWidth: 2,
    borderColor: '#FDE047',
  },
  waitingBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  waitingBoxTxt: {
    color: '#FECDD3',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  tieCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1E293B',
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    padding: 10,
  },
  counterErr: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  counterInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
  },
});
