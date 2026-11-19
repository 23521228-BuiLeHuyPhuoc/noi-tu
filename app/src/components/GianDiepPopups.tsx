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
import type { PortraitSource } from '../avatars';
import { useKeyboardInset, useSecondsLeft, useStableWindow } from '../hooks';
import { play } from '../sound';
import { FONT } from '../theme';
import { T } from '../ui';
import { Portrait } from './Avatar';
import { UiIcon, type UiIconName } from './Icons';

export function portraitSrc(pl?: PublicPlayer, seatNo?: number): PortraitSource {
  return pl ?? { avatar: seatNo ?? 0 };
}

function formatVoterList(
  ids: string[],
  names: Record<string, string>,
  seatIndexMap: Map<string, number>,
  me: string,
): string {
  return ids
    .map((id) => {
      if (id === me) return 'Bạn';
      const seat = seatIndexMap.get(id);
      const name = names[id] ?? id;
      return seat !== undefined ? `#${seat} ${name}` : name;
    })
    .join(', ');
}

/**
 * Bảng màu & token theo hướng Dossier Giấy Ấm + Mực (unslop):
 * - Bề mặt trung tính ấm áp, tương phản rõ, loại bỏ neon glow và emoji trang trí.
 */
export const GD = {
  card: '#FDFBF7',
  feedBg: '#F6F2EA',
  raised: '#FFFFFF',
  subtle: '#EFEAE0',
  inkSurface: '#1F1B16',
  hairline: 'rgba(31, 27, 22, 0.10)',
  hairlineStrong: 'rgba(31, 27, 22, 0.18)',
  textPrimary: '#1F1B16',
  textSecondary: '#5E554A',
  textMuted: '#7B7266',
  textOnInk: '#FBF9F5',
  textOnInkMuted: 'rgba(251, 249, 245, 0.72)',
  accent: '#B45309',
  accentSoft: '#FEF3C7',
  accentBorder: 'rgba(180, 83, 9, 0.35)',
  positive: '#15803D',
  positiveSoft: '#F0FDF4',
  positiveBorder: 'rgba(21, 128, 61, 0.32)',
  danger: '#B91C1C',
  dangerSoft: '#FEF2F2',
  dangerBorder: 'rgba(185, 28, 28, 0.32)',
} as const;

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);

interface DossierModalProps {
  testID?: string;
  title: string;
  icon: UiIconName;
  endsAt: number | null;
  totalSeconds: number;
  clockOffset: number;
  onMinimize?: () => void;
  minimizeTestID?: string;
  minimizeLabel?: string;
  children: ReactNode;
}

const DossierModal = memo(function DossierModal({
  testID,
  title,
  icon,
  endsAt,
  totalSeconds,
  clockOffset,
  onMinimize,
  minimizeTestID,
  minimizeLabel = 'Thu gọn',
  children,
}: DossierModalProps) {
  const { width, height } = useStableWindow();
  const rawKbInset = useKeyboardInset();
  const kbInset = Platform.OS === 'web' ? rawKbInset : 0;
  const sec = useSecondsLeft(endsAt, clockOffset, totalSeconds || 999);

  const [enterAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 200,
      easing: EASE_OUT,
      useNativeDriver: false,
    }).start();
  }, [enterAnim]);

  const translateY = enterAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
  const cardWidth = Math.min(420, Math.max(300, width - 24));
  const usableHeight = Math.max(260, height - kbInset - 28);

  return (
    <View
      testID={testID}
      style={[
        styles.overlayBackdrop,
        kbInset > 0 && { paddingBottom: 16 + kbInset },
      ]}
    >
      <Animated.View
        style={[
          styles.modalCard,
          {
            width: cardWidth,
            maxHeight: Math.min(580, usableHeight),
            opacity: enterAnim,
            transform: [{ translateY }],
          },
          Platform.OS === 'web'
            ? ({ boxShadow: '0 16px 40px rgba(28, 25, 23, 0.24)' } as object)
            : {
                shadowColor: '#1C1917',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.22,
                shadowRadius: 20,
                elevation: 14,
              },
        ]}
      >
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleGroup}>
            <UiIcon name={icon} size={16} color={GD.textSecondary} strokeWidth={1.65} />
            <T numberOfLines={1} style={styles.modalTitle}>{title}</T>
          </View>
          <View style={styles.modalRightGroup}>
            {endsAt !== null && (
              <T style={[styles.tabularTimer, sec <= 5 && { color: GD.danger }]}>
                {sec}s
              </T>
            )}
            {onMinimize && (
              <Pressable
                testID={minimizeTestID}
                accessibilityRole="button"
                onPress={() => {
                  play('pop');
                  onMinimize();
                }}
                hitSlop={6}
                style={({ pressed }) => [styles.quietActionBtn, pressed && styles.pressedSoft]}
              >
                <T style={styles.quietActionTxt}>{minimizeLabel}</T>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.modalBody}>{children}</View>
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
    <DossierModal
      testID="gd-word-reveal-modal"
      title={`Từ khóa Vòng ${view.round}`}
      icon="KeyRound"
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeLabel="Thu gọn"
    >
      <View style={styles.metaLineWrap}>
        <T style={styles.metaText}>Chủ đề: {view.category}</T>
        {view.roleSummary && (
          <T testID="gd-role-summary" style={styles.metaMutedTabular}>
            {view.roleSummary.dan} Dân · {view.roleSummary.giandiep} Gián điệp
            {view.roleSummary.mrwhite > 0 ? ` · ${view.roleSummary.mrwhite} Mr. White` : ''}
          </T>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShown((v) => !v)}
        style={({ pressed }) => [
          styles.wordSlip,
          !shown && styles.wordSlipHidden,
          pressed && styles.pressedSoft,
        ]}
      >
        <View style={styles.wordSlipTop}>
          <T style={styles.wordSlipLabel}>
            {isWhite ? 'Thân phận của bạn' : 'Từ khóa bí mật'}
          </T>
          <View style={styles.wordSlipToggle}>
            <UiIcon name={shown ? 'Eye' : 'EyeOff'} size={14} color={GD.textOnInkMuted} strokeWidth={1.6} />
            <T style={styles.wordSlipToggleTxt}>{shown ? 'Che' : 'Hiện'}</T>
          </View>
        </View>

        {shown ? (
          <T testID="gd-secret-word" style={[styles.wordSlipValue, isWhite && { fontSize: 20 }]}>
            {isWhite ? 'Mr. White (Không có từ)' : (view.myWord ?? '---')}
          </T>
        ) : (
          <T testID="gd-secret-word" style={styles.wordSlipMasked}>
            ••••••
          </T>
        )}
      </Pressable>

      <T style={styles.helperCopy}>
        {isWhite
          ? 'Bạn chưa có từ khóa. Hãy nghe gợi ý từ mọi người để suy luận từ Dân thường.'
          : 'Ghi nhớ từ khóa này và không nhắc trực tiếp khi khai gợi ý.'}
      </T>

      <Pressable
        testID="gd-word-ready-btn"
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || myReady }}
        aria-disabled={busy || myReady ? true : undefined}
        disabled={busy || myReady}
        onPress={() => {
          play('pop');
          onReady();
        }}
        style={({ pressed }) => [
          styles.primaryBtn,
          myReady && styles.primaryBtnDone,
          pressed && !(busy || myReady) && styles.pressedBtn,
          busy && styles.btnDisabled,
        ]}
      >
        {myReady && <UiIcon name="Check" size={16} color={GD.textOnInk} strokeWidth={1.8} />}
        <T style={styles.primaryBtnTxt}>
          {myReady
            ? `Đã sẵn sàng (${readyCount}/${totalAlive})`
            : `Đã nhớ từ · Sẵn sàng (${readyCount}/${totalAlive})`}
        </T>
      </Pressable>
    </DossierModal>
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
    <DossierModal
      testID="gd-clue-recap-modal"
      title={`Lời khai Vòng ${view.round}`}
      icon="BookOpen"
      endsAt={isPhaseRecap ? view.phaseEndsAt : null}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onClose}
      minimizeLabel={isPhaseRecap ? 'Thu gọn' : 'Đóng'}
    >
      <T style={styles.helperCopy}>
        Đối chiếu toàn bộ gợi ý vừa khai trước khi mở thảo luận.
      </T>

      <ScrollView
        style={{ maxHeight: Math.min(300, Math.max(160, height * 0.4)) }}
        contentContainerStyle={styles.recapList}
        showsVerticalScrollIndicator={false}
      >
        {roundClues.length === 0 ? (
          <T style={styles.emptyRecapTxt}>Chưa có lời khai nào ở vòng này</T>
        ) : (
          roundClues.map((clue) => {
            const seatNo = seatIndexMap.get(clue.playerId);
            const pl = playerMap.get(clue.playerId);
            const isMine = clue.playerId === me;
            return (
              <View key={clue.id} style={[styles.recapRow, isMine && styles.recapRowMine]}>
                <Portrait p={portraitSrc(pl, seatNo)} size={28} border={1} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={styles.recapMetaRow}>
                    {seatNo !== undefined && <T style={styles.seatTabular}>#{seatNo}</T>}
                    <T numberOfLines={1} style={styles.recapName}>
                      {clue.name}{isMine ? ' (Bạn)' : ''}
                    </T>
                  </View>
                  <T style={styles.recapClueTxt}>“{clue.text}”</T>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {isPhaseRecap ? (
        <Pressable
          testID="gd-recap-ready-btn"
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || myReady }}
          aria-disabled={busy || myReady ? true : undefined}
          disabled={busy || myReady}
          onPress={() => {
            play('pop');
            onReady();
          }}
          style={({ pressed }) => [
            styles.primaryBtn,
            myReady && styles.primaryBtnDone,
            pressed && !(busy || myReady) && styles.pressedBtn,
            busy && styles.btnDisabled,
          ]}
        >
          {myReady && <UiIcon name="Check" size={16} color={GD.textOnInk} strokeWidth={1.8} />}
          <T style={styles.primaryBtnTxt}>
            {myReady
              ? `Đã xem (${view.readySkip.length}/${needReady})`
              : `Vào thảo luận (${view.readySkip.length}/${needReady})`}
          </T>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            play('pop');
            onClose();
          }}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressedSoft]}
        >
          <T style={styles.secondaryBtnTxt}>Đóng bảng lời khai</T>
        </Pressable>
      )}
    </DossierModal>
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
    <DossierModal
      testID="gd-counter-modal"
      title={isSpyCounter ? 'Gián điệp đoán từ' : 'Mr. White đoán từ'}
      icon="ShieldAlert"
      endsAt={view.phaseEndsAt}
      totalSeconds={view.phaseSeconds}
      clockOffset={clockOffset}
      onMinimize={onMinimize}
      minimizeTestID="gd-counter-minimize"
      minimizeLabel="Xem gợi ý"
    >
      <T style={styles.helperCopy}>
        {isSpyCounter
          ? 'Bạn vừa bị lộ. Đoán đúng từ khóa của Dân thường để lật kèo thắng ngay.'
          : 'Cơ hội cuối cùng. Dựa vào lời khai vừa nghe để đoán từ khóa của Dân thường.'}
      </T>

      <T style={styles.metaText}>Chủ đề: {view.category}</T>

      {err && <T style={styles.counterErr}>{err}</T>}

      <TextInput
        testID="gd-mrwhite-input"
        value={val}
        onChangeText={setVal}
        onSubmitEditing={() => void submit()}
        placeholder="Nhập từ khóa Dân thường"
        placeholderTextColor={GD.textMuted}
        maxLength={50}
        style={styles.counterInput}
      />

      <Pressable
        testID="gd-mrwhite-submit"
        accessibilityRole="button"
        accessibilityState={{ disabled: busy || !val.trim() }}
        aria-disabled={busy || !val.trim() ? true : undefined}
        disabled={busy || !val.trim()}
        onPress={() => {
          play('pop');
          void submit();
        }}
        style={({ pressed }) => [
          styles.primaryBtn,
          pressed && !(busy || !val.trim()) && styles.pressedBtn,
          (busy || !val.trim()) && styles.btnDisabled,
        ]}
      >
        <T style={styles.primaryBtnTxt}>Xác nhận từ đoán</T>
      </Pressable>
    </DossierModal>
  );
}

/**
 * Thẻ Bỏ Phiếu nổi không chặn nền: đặt phía trên khung chat để người chơi vừa chọn nghi phạm vừa nhắn tin trực tiếp.
 */
export const VoteLivePanel = memo(function VoteLivePanel({
  view,
  sec,
  me,
  busy,
  compact,
  collapsed,
  kbOpen,
  playerMap,
  seatIndexMap,
  voteTally,
  latestClueByPlayer,
  onVote,
  onToggleCollapse,
}: {
  view: GianDiepView;
  sec: number;
  me: string;
  busy: boolean;
  compact: boolean;
  collapsed: boolean;
  kbOpen: boolean;
  playerMap: Map<string, PublicPlayer>;
  seatIndexMap: Map<string, number>;
  voteTally: Record<string, number>;
  latestClueByPlayer: Map<string, string>;
  onVote: (target: string | 'skip') => void;
  onToggleCollapse: () => void;
}) {
  const { width, height } = useStableWindow();
  const candidates = view.order.filter((id) => id !== me && view.alive.includes(id));
  const myVote = view.votes[me];
  const votedCount = view.alive.filter((id) => Boolean(view.votes[id])).length;
  const cols = width >= 340 ? 2 : 1;

  const votersByTarget: Record<string, string[]> = {};
  const skipVoters: string[] = [];
  for (const voterId of view.order) {
    if (!view.alive.includes(voterId)) continue;
    const target = view.votes[voterId];
    if (!target) continue;
    if (target === 'skip') skipVoters.push(voterId);
    else {
      votersByTarget[target] ??= [];
      votersByTarget[target].push(voterId);
    }
  }

  if (collapsed || kbOpen) {
    const pickedLabel =
      myVote === 'skip'
        ? 'Phiếu trắng'
        : myVote
          ? `#${seatIndexMap.get(myVote) ?? '?'} ${view.names[myVote] ?? myVote}`
          : 'Chưa chọn';
    return (
      <Pressable
        testID="gd-reopen-vote-btn"
        accessibilityRole="button"
        onPress={() => {
          if (!kbOpen) {
            play('pop');
            onToggleCollapse();
          }
        }}
        style={({ pressed }) => [styles.dockedBanner, pressed && !kbOpen && styles.pressedSoft]}
      >
        <View style={[styles.accentIndicator, { backgroundColor: GD.accent }]} />
        <T numberOfLines={1} style={styles.dockedBannerTxt}>
          Bỏ phiếu · {votedCount}/{view.alive.length} đã chọn · {pickedLabel}
        </T>
        <T style={styles.tabularTimerSm}>{sec}s</T>
        {!kbOpen && (
          <View style={styles.bannerToggleTag}>
            <UiIcon name="ChevronDown" size={14} color={GD.textSecondary} strokeWidth={1.65} />
            <T style={styles.bannerToggleTxt}>Mở</T>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View testID="gd-vote-modal" style={[styles.liveCard, styles.liveCardElevation]}>
      <View style={[styles.liveTopHairline, { backgroundColor: GD.accent }]} />
      <View testID="gd-vote-panel" style={styles.liveCardInner}>
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveHeaderLeft}>
            <UiIcon name="Fingerprint" size={15} color={GD.accent} strokeWidth={1.65} />
            <T style={styles.liveTitle}>Bỏ phiếu loại</T>
            <T style={styles.liveCountTabular}>
              {votedCount}/{view.alive.length}
            </T>
          </View>
          <Pressable
            testID="gd-vote-minimize"
            accessibilityRole="button"
            onPress={() => {
              play('pop');
              onToggleCollapse();
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.quietCollapseBtn, pressed && styles.pressedSoft]}
          >
            <UiIcon name="ChevronUp" size={14} color={GD.textSecondary} strokeWidth={1.65} />
            <T style={styles.quietCollapseTxt}>Thu gọn</T>
          </Pressable>
        </View>

        <T style={styles.liveSubtleNote}>Đổi phiếu tự do tới khi hết giờ ({sec}s)</T>

        <ScrollView
          style={{ maxHeight: compact ? 150 : Math.min(204, height * 0.27) }}
          contentContainerStyle={styles.voteGrid}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {candidates.map((id) => {
            const pl = playerMap.get(id);
            const seatNo = seatIndexMap.get(id);
            const voters = votersByTarget[id] ?? [];
            const votes = voteTally[id] ?? voters.length;
            const selected = myVote === id;
            const clueText = latestClueByPlayer.get(id);
            return (
              <Pressable
                key={id}
                testID={`gd-vote-pick-${id}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  play('pop');
                  onVote(id);
                }}
                style={({ pressed }) => [
                  styles.voteTile,
                  { width: cols === 2 ? '48.8%' : '100%' },
                  selected && styles.voteTileSelected,
                  pressed && styles.pressedSoft,
                ]}
              >
                <Portrait p={portraitSrc(pl, seatNo)} size={28} border={1} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={styles.voteTileTop}>
                    {seatNo !== undefined && (
                      <T style={[styles.seatTabular, selected && { color: GD.accent }]}>#{seatNo}</T>
                    )}
                    <T numberOfLines={1} style={[styles.voteTileName, selected && { color: GD.textPrimary }]}>
                      {view.names[id] ?? id}
                    </T>
                    {votes > 0 && (
                      <T style={[styles.voteCountTabular, selected && { color: GD.accent }]}>
                        {votes}
                      </T>
                    )}
                  </View>
                  {clueText ? (
                    <T numberOfLines={1} style={styles.voteTileClue}>“{clueText}”</T>
                  ) : (
                    <T numberOfLines={1} style={styles.voteTileClue}>
                      {selected ? 'Đang chọn' : 'Chạm để bầu'}
                    </T>
                  )}
                  {voters.length > 0 && (
                    <T testID={`gd-voters-${id}`} numberOfLines={2} style={styles.voterNamesTxt}>
                      Bầu: {formatVoterList(voters, view.names, seatIndexMap, me)}
                    </T>
                  )}
                </View>
                {selected && <UiIcon name="Check" size={14} color={GD.accent} strokeWidth={2} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          testID="gd-skip-vote"
          accessibilityRole="button"
          accessibilityState={{ selected: myVote === 'skip', disabled: busy }}
          disabled={busy}
          onPress={() => {
            play('pop');
            onVote('skip');
          }}
          style={({ pressed }) => [
            styles.skipVoteBtn,
            skipVoters.length > 0 && { height: 'auto', minHeight: 36, paddingVertical: 6 },
            myVote === 'skip' && styles.skipVoteBtnSelected,
            pressed && styles.pressedSoft,
          ]}
        >
          <View style={styles.skipVoteInner}>
            <View style={styles.skipVoteTopRow}>
              {myVote === 'skip' && <UiIcon name="Check" size={14} color={GD.accent} strokeWidth={1.8} />}
              <T style={[styles.skipVoteTxt, myVote === 'skip' && { color: GD.accent }]}>
                {myVote === 'skip'
                  ? `Đã chọn bỏ phiếu trắng${skipVoters.length ? ` (${skipVoters.length})` : ''}`
                  : `Bỏ phiếu trắng${skipVoters.length ? ` (${skipVoters.length})` : ''}`}
              </T>
            </View>
            {skipVoters.length > 0 && (
              <T testID="gd-voters-skip" numberOfLines={1} style={styles.voterNamesTxt}>
                {formatVoterList(skipVoters, view.names, seatIndexMap, me)}
              </T>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
});

/**
 * Thẻ Phán Quyết Cuối không chặn nền: cho phép bị cáo và cả phòng vừa phán quyết vừa nhắn tin biện minh trực tiếp.
 */
export const VerdictLivePanel = memo(function VerdictLivePanel({
  view,
  sec,
  me,
  busy,
  collapsed,
  kbOpen,
  playerMap,
  seatIndexMap,
  voteTally,
  latestClueByPlayer,
  onVerdict,
  onToggleCollapse,
}: {
  view: GianDiepView;
  sec: number;
  me: string;
  busy: boolean;
  collapsed: boolean;
  kbOpen: boolean;
  playerMap: Map<string, PublicPlayer>;
  seatIndexMap: Map<string, number>;
  voteTally: Record<string, number>;
  latestClueByPlayer: Map<string, string>;
  onVerdict: (verdict: string) => void;
  onToggleCollapse: () => void;
}) {
  const { height } = useStableWindow();
  const defs = view.defendants ?? [];
  const myVerdict = view.finalVotes?.[me];
  const isSingle = defs.length === 1;

  const accId = defs[0] ?? '';
  const accName = view.names[accId] ?? accId;
  const accSeat = seatIndexMap.get(accId);
  const banishVoters: string[] = [];
  const forgiveVoters: string[] = [];
  const tieVotersByTarget: Record<string, string[]> = {};
  const tieSkipVoters: string[] = [];

  for (const voterId of view.order) {
    if (!view.alive.includes(voterId)) continue;
    const v = view.finalVotes?.[voterId];
    if (!v) continue;
    if (isSingle) {
      if (v === 'banish') banishVoters.push(voterId);
      else if (v === 'forgive') forgiveVoters.push(voterId);
    } else {
      if (v === 'skip') tieSkipVoters.push(voterId);
      else {
        tieVotersByTarget[v] ??= [];
        tieVotersByTarget[v].push(voterId);
      }
    }
  }
  const banishVotes = banishVoters.length;
  const forgiveVotes = forgiveVoters.length;

  if (collapsed || kbOpen) {
    return (
      <Pressable
        testID="gd-reopen-verdict-btn"
        accessibilityRole="button"
        onPress={() => {
          if (!kbOpen) {
            play('pop');
            onToggleCollapse();
          }
        }}
        style={({ pressed }) => [styles.dockedBanner, pressed && !kbOpen && styles.pressedSoft]}
      >
        <View style={[styles.accentIndicator, { backgroundColor: GD.danger }]} />
        <T numberOfLines={1} style={styles.dockedBannerTxt}>
          {isSingle
            ? `Phán quyết ${accSeat ? `#${accSeat} ` : ''}${accName} · Loại ${banishVotes} · Tha ${forgiveVotes}`
            : `Chung kết đồng phiếu (${defs.length} người)`}
        </T>
        <T style={styles.tabularTimerSm}>{sec}s</T>
        {!kbOpen && (
          <View style={styles.bannerToggleTag}>
            <UiIcon name="ChevronDown" size={14} color={GD.textSecondary} strokeWidth={1.65} />
            <T style={styles.bannerToggleTxt}>Mở</T>
          </View>
        )}
      </Pressable>
    );
  }

  if (isSingle) {
    const accPlayer = playerMap.get(accId);
    const accClue = latestClueByPlayer.get(accId);
    const latestDef = [...view.timeline]
      .reverse()
      .find((m) => m.round === view.round && m.kind === 'defense' && m.playerId === accId)?.text;
    const isSelfProtected = accId === me && view.alive.length > 2;
    const quoteText = latestDef ?? accClue;

    return (
      <View testID="gd-verdict-modal" style={[styles.liveCard, styles.liveCardElevation]}>
        <View style={[styles.liveTopHairline, { backgroundColor: GD.danger }]} />
        <View style={styles.liveCardInner}>
          <View style={styles.liveHeaderRow}>
            <View style={styles.liveHeaderLeft}>
              <UiIcon name="ShieldAlert" size={15} color={GD.danger} strokeWidth={1.65} />
              <T style={styles.liveTitle}>Phán quyết cuối</T>
              <T style={styles.liveCountTabular}>
                Loại {banishVotes} · Tha {forgiveVotes}
              </T>
            </View>
            <Pressable
              testID="gd-verdict-minimize"
              accessibilityRole="button"
              onPress={() => {
                play('pop');
                onToggleCollapse();
              }}
              hitSlop={6}
              style={({ pressed }) => [styles.quietCollapseBtn, pressed && styles.pressedSoft]}
            >
              <UiIcon name="ChevronUp" size={14} color={GD.textSecondary} strokeWidth={1.65} />
              <T style={styles.quietCollapseTxt}>Thu gọn</T>
            </Pressable>
          </View>

          <T style={styles.liveSubtleNote}>Đổi quyết định tự do tới khi hết giờ ({sec}s)</T>

          <View style={styles.accusedCompactRow}>
            <Portrait p={portraitSrc(accPlayer, accSeat)} size={34} border={1} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {accSeat !== undefined && <T style={[styles.seatTabular, { color: GD.danger }]}>#{accSeat}</T>}
                <T numberOfLines={1} style={styles.accusedName}>{accName}</T>
              </View>
              {quoteText && (
                <T numberOfLines={1} style={styles.accusedQuote}>
                  {latestDef ? `Biện minh: “${latestDef}”` : `Gợi ý: “${quoteText}”`}
                </T>
              )}
            </View>
          </View>

          <View testID="gd-verdict-voters" style={styles.verdictLedgerBox}>
            <View style={styles.verdictLedgerRow}>
              <T style={[styles.verdictLedgerLabel, { color: GD.danger }]}>Trục xuất ({banishVotes}):</T>
              <T numberOfLines={2} style={styles.verdictLedgerNames}>
                {banishVoters.length > 0 ? formatVoterList(banishVoters, view.names, seatIndexMap, me) : 'Chưa có'}
              </T>
            </View>
            <View style={styles.verdictLedgerRow}>
              <T style={[styles.verdictLedgerLabel, { color: GD.positive }]}>Tha bổng ({forgiveVotes}):</T>
              <T numberOfLines={2} style={styles.verdictLedgerNames}>
                {forgiveVoters.length > 0 ? formatVoterList(forgiveVoters, view.names, seatIndexMap, me) : 'Chưa có'}
              </T>
            </View>
          </View>

          {isSelfProtected ? (
            <View style={styles.defendantHintBar}>
              <T style={styles.defendantHintTxt}>
                Cả phòng đang phán quyết — bạn vẫn có thể nhắn tin biện minh bên dưới
              </T>
            </View>
          ) : (
            <View style={styles.verdictActionRow}>
              <Pressable
                testID="gd-verdict-banish"
                accessibilityRole="button"
                accessibilityState={{ selected: myVerdict === 'banish', disabled: busy }}
                disabled={busy}
                onPress={() => {
                  play('pop');
                  onVerdict('banish');
                }}
                style={({ pressed }) => [
                  styles.verdictChoiceBtn,
                  styles.verdictBanishIdle,
                  myVerdict === 'banish' && styles.verdictBanishActive,
                  pressed && styles.pressedBtn,
                ]}
              >
                {myVerdict === 'banish' && <UiIcon name="Check" size={15} color="#FFFFFF" strokeWidth={2} />}
                <T style={[styles.verdictChoiceTxt, { color: myVerdict === 'banish' ? '#FFFFFF' : GD.danger }]}>
                  Trục xuất
                </T>
              </Pressable>

              <Pressable
                testID="gd-verdict-forgive"
                accessibilityRole="button"
                accessibilityState={{ selected: myVerdict === 'forgive', disabled: busy }}
                disabled={busy}
                onPress={() => {
                  play('pop');
                  onVerdict('forgive');
                }}
                style={({ pressed }) => [
                  styles.verdictChoiceBtn,
                  styles.verdictForgiveIdle,
                  myVerdict === 'forgive' && styles.verdictForgiveActive,
                  pressed && styles.pressedBtn,
                ]}
              >
                {myVerdict === 'forgive' && <UiIcon name="Check" size={15} color="#FFFFFF" strokeWidth={2} />}
                <T style={[styles.verdictChoiceTxt, { color: myVerdict === 'forgive' ? '#FFFFFF' : GD.positive }]}>
                  Tha bổng
                </T>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View testID="gd-verdict-modal" style={[styles.liveCard, styles.liveCardElevation]}>
      <View style={[styles.liveTopHairline, { backgroundColor: GD.danger }]} />
      <View style={styles.liveCardInner}>
        <View style={styles.liveHeaderRow}>
          <View style={styles.liveHeaderLeft}>
            <UiIcon name="ShieldAlert" size={15} color={GD.danger} strokeWidth={1.65} />
            <T style={styles.liveTitle}>Chung kết đồng phiếu</T>
          </View>
          <Pressable
            testID="gd-verdict-minimize"
            accessibilityRole="button"
            onPress={() => {
              play('pop');
              onToggleCollapse();
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.quietCollapseBtn, pressed && styles.pressedSoft]}
          >
            <UiIcon name="ChevronUp" size={14} color={GD.textSecondary} strokeWidth={1.65} />
            <T style={styles.quietCollapseTxt}>Thu gọn</T>
          </Pressable>
        </View>

        <T style={styles.liveSubtleNote}>Đổi quyết định tự do tới khi hết giờ ({sec}s)</T>

        <ScrollView
          style={{ maxHeight: Math.min(170, height * 0.25) }}
          contentContainerStyle={{ gap: 6 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {defs.filter((id) => id !== me).map((id) => {
            const pl = playerMap.get(id);
            const seatNo = seatIndexMap.get(id);
            const voters = tieVotersByTarget[id] ?? [];
            const votes = voteTally[id] ?? voters.length;
            const selected = myVerdict === id;
            const clueText = latestClueByPlayer.get(id);
            return (
              <Pressable
                key={id}
                testID={`gd-vote-pick-${id}`}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: busy }}
                disabled={busy}
                onPress={() => {
                  play('pop');
                  onVerdict(id);
                }}
                style={({ pressed }) => [
                  styles.tieRow,
                  selected && styles.voteTileSelected,
                  pressed && styles.pressedSoft,
                ]}
              >
                <Portrait p={portraitSrc(pl, seatNo)} size={28} border={1} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {seatNo !== undefined && <T style={styles.seatTabular}>#{seatNo}</T>}
                    <T numberOfLines={1} style={styles.voteTileName}>{view.names[id] ?? id}</T>
                  </View>
                  {clueText && <T numberOfLines={1} style={styles.voteTileClue}>“{clueText}”</T>}
                  {voters.length > 0 && (
                    <T testID={`gd-verdict-voters-${id}`} numberOfLines={2} style={styles.voterNamesTxt}>
                      Bầu: {formatVoterList(voters, view.names, seatIndexMap, me)}
                    </T>
                  )}
                </View>
                <T style={[styles.voteCountTabular, selected && { color: GD.accent }]}>
                  {selected ? `Đã chọn · ${votes}` : `${votes}`}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          testID="gd-verdict-skip"
          accessibilityRole="button"
          accessibilityState={{ selected: myVerdict === 'skip', disabled: busy }}
          disabled={busy}
          onPress={() => {
            play('pop');
            onVerdict('skip');
          }}
          style={({ pressed }) => [
            styles.skipVoteBtn,
            tieSkipVoters.length > 0 && { height: 'auto', minHeight: 36, paddingVertical: 6 },
            myVerdict === 'skip' && styles.skipVoteBtnSelected,
            pressed && styles.pressedSoft,
          ]}
        >
          <View style={styles.skipVoteInner}>
            <View style={styles.skipVoteTopRow}>
              <T style={[styles.skipVoteTxt, myVerdict === 'skip' && { color: GD.accent }]}>
                {myVerdict === 'skip'
                  ? `Đã chọn tha cả nhóm${tieSkipVoters.length ? ` (${tieSkipVoters.length})` : ''}`
                  : `Tha bổng tất cả${tieSkipVoters.length ? ` (${tieSkipVoters.length})` : ''}`}
              </T>
            </View>
            {tieSkipVoters.length > 0 && (
              <T testID="gd-verdict-voters-skip" numberOfLines={1} style={styles.voterNamesTxt}>
                {formatVoterList(tieSkipVoters, view.names, seatIndexMap, me)}
              </T>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlayBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    backgroundColor: 'rgba(28, 25, 23, 0.48)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: GD.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GD.hairline,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: GD.hairline,
  },
  modalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    color: GD.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },
  modalRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  tabularTimer: {
    color: GD.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  tabularTimerSm: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  quietActionBtn: {
    backgroundColor: GD.subtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quietActionTxt: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  metaLineWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metaText: {
    color: GD.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: FONT,
  },
  metaMutedTabular: {
    color: GD.textMuted,
    fontSize: 12,
    fontWeight: '400',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  wordSlip: {
    backgroundColor: GD.inkSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    alignItems: 'center',
  },
  wordSlipHidden: {
    backgroundColor: '#363029',
  },
  wordSlipTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordSlipLabel: {
    color: GD.textOnInkMuted,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
  },
  wordSlipToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wordSlipToggleTxt: {
    color: GD.textOnInkMuted,
    fontSize: 12,
    fontWeight: '400',
    fontFamily: FONT,
  },
  wordSlipValue: {
    color: GD.textOnInk,
    fontSize: 26,
    fontWeight: '600',
    fontFamily: FONT,
    textAlign: 'center',
    paddingVertical: 4,
  },
  wordSlipMasked: {
    color: GD.textOnInkMuted,
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 2,
    paddingVertical: 6,
  },
  helperCopy: {
    color: GD.textSecondary,
    fontSize: 13,
    fontWeight: '400',
    fontFamily: FONT,
    lineHeight: 19,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: GD.inkSurface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  primaryBtnDone: {
    backgroundColor: GD.positive,
  },
  primaryBtnTxt: {
    color: GD.textOnInk,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  secondaryBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: GD.subtle,
    borderWidth: 1,
    borderColor: GD.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  secondaryBtnTxt: {
    color: GD.textPrimary,
    fontSize: 13.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  pressedBtn: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  pressedSoft: {
    opacity: 0.78,
  },

  recapList: {
    gap: 8,
    paddingVertical: 2,
  },
  emptyRecapTxt: {
    color: GD.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  recapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GD.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recapRowMine: {
    borderColor: GD.positiveBorder,
    backgroundColor: GD.positiveSoft,
  },
  recapMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  seatTabular: {
    color: GD.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  recapName: {
    color: GD.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },
  recapClueTxt: {
    color: GD.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONT,
    lineHeight: 19,
  },

  counterErr: {
    color: GD.danger,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
  counterInput: {
    minWidth: 0,
    height: 44,
    backgroundColor: GD.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairlineStrong,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '500',
    color: GD.textPrimary,
    fontFamily: FONT,
  },

  /* ---- Non-blocking live panels (Vote & Verdict) ---- */
  dockedBanner: {
    height: 40,
    backgroundColor: GD.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  dockedBannerTxt: {
    flex: 1,
    minWidth: 0,
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
  bannerToggleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: GD.subtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bannerToggleTxt: {
    color: GD.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: FONT,
  },

  liveCard: {
    backgroundColor: GD.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GD.hairlineStrong,
    overflow: 'hidden',
  },
  liveCardElevation: Platform.OS === 'web'
    ? ({ boxShadow: '0 6px 18px rgba(28, 25, 23, 0.08)' } as object)
    : {
        shadowColor: '#1C1917',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      },
  liveTopHairline: {
    height: 2,
    width: '100%',
  },
  liveCardInner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  liveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  liveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  liveTitle: {
    color: GD.textPrimary,
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: FONT,
  },
  liveCountTabular: {
    color: GD.textMuted,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  quietCollapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: GD.subtle,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quietCollapseTxt: {
    color: GD.textSecondary,
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: FONT,
  },

  voteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  voteTile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GD.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  voteTileSelected: {
    borderColor: GD.accent,
    backgroundColor: GD.accentSoft,
  },
  voteTileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voteTileName: {
    flex: 1,
    minWidth: 0,
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
  },
  voteCountTabular: {
    color: GD.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  voteTileClue: {
    color: GD.textSecondary,
    fontSize: 11,
    fontWeight: '400',
    fontFamily: FONT,
  },
  liveSubtleNote: {
    color: GD.textMuted,
    fontSize: 11,
    fontWeight: '400',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  voterNamesTxt: {
    color: GD.textMuted,
    fontSize: 10.5,
    fontWeight: '500',
    fontFamily: FONT,
    lineHeight: 14,
  },
  skipVoteInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    width: '100%',
  },
  skipVoteTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verdictLedgerBox: {
    backgroundColor: GD.feedBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 3,
  },
  verdictLedgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  verdictLedgerLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },
  verdictLedgerNames: {
    flex: 1,
    minWidth: 0,
    color: GD.textSecondary,
    fontSize: 11.5,
    fontWeight: '400',
    fontFamily: FONT,
    lineHeight: 15,
  },

  skipVoteBtn: {
    height: 36,
    borderRadius: 8,
    backgroundColor: GD.raised,
    borderWidth: 1,
    borderColor: GD.hairline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  skipVoteBtnSelected: {
    borderColor: GD.accent,
    backgroundColor: GD.accentSoft,
  },
  skipVoteTxt: {
    color: GD.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
  },

  accusedCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GD.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accusedName: {
    color: GD.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },
  accusedQuote: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    fontFamily: FONT,
    lineHeight: 16,
  },
  defendantHintBar: {
    backgroundColor: GD.subtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  defendantHintTxt: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
    textAlign: 'center',
  },
  verdictActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  verdictChoiceBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  verdictBanishIdle: {
    backgroundColor: GD.dangerSoft,
    borderColor: GD.dangerBorder,
  },
  verdictBanishActive: {
    backgroundColor: GD.danger,
    borderColor: GD.danger,
  },
  verdictForgiveIdle: {
    backgroundColor: GD.positiveSoft,
    borderColor: GD.positiveBorder,
  },
  verdictForgiveActive: {
    backgroundColor: GD.positive,
    borderColor: GD.positive,
  },
  verdictChoiceTxt: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: FONT,
  },
  tieRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: GD.raised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
