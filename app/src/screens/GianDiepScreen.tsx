import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  GIAN_DIEP_ROLE_META,
  type GianDiepFeedItem,
  type GianDiepView,
} from '../../../shared/src/giandiep';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { FONT } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { T } from '../ui';
import { useKeyboardInset, useSecondsLeft, useStableWindow } from '../hooks';
import { Shell, useShellTools } from '../components/Shell';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { UiIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import {
  ClueRecapPopup,
  CounterGuessPopup,
  GD,
  portraitSrc,
  VerdictLivePanel,
  VoteLivePanel,
  WordRevealPopup,
} from '../components/GianDiepPopups';

const PHASE_META: Record<
  GianDiepView['phase'],
  { label: string; dotColor: string }
> = {
  word_reveal: { label: 'Nhận từ khóa', dotColor: '#0284C7' },
  clue_turn: { label: 'Khai gợi ý', dotColor: '#15803D' },
  clue_summary: { label: 'Lời khai', dotColor: '#15803D' },
  discussion: { label: 'Thảo luận', dotColor: '#2563EB' },
  vote: { label: 'Bỏ phiếu', dotColor: '#B45309' },
  defense: { label: 'Biện minh', dotColor: '#B91C1C' },
  final_vote: { label: 'Phán quyết', dotColor: '#B91C1C' },
  mrwhite_guess: { label: 'Mr. White đoán', dotColor: '#5E554A' },
  spy_guess: { label: 'Gián điệp đoán', dotColor: '#B45309' },
  reveal_end: { label: 'Kết quả', dotColor: '#B45309' },
};

function formatClock(at?: number): string | null {
  if (!at) return null;
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function GianDiepScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as GianDiepView;
  const { width, height } = useStableWindow();
  const compact = height < 700 || width < 370;
  const rawKbInset = useKeyboardInset();
  const kbOpen = Platform.OS === 'web' && rawKbInset > 0;
  const sec = useSecondsLeft(view.phaseEndsAt, game.clockOffset, view.phaseSeconds || 999);

  const [wordVisible, setWordVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [panelCollapsedKey, setPanelCollapsedKey] = useState<string | null>(null);
  const [manualRecapOpen, setManualRecapOpen] = useState(false);
  const [playersOpen, setPlayersOpen] = useState(false);
  const [phaseKey, setPhaseKey] = useState('');

  const me = game.me ?? '';
  const iAlive = view.alive.includes(me);
  const modalKey = `${view.round}:${view.phase}:${view.mrWhiteId ?? ''}:${(view.defendants ?? []).join(',')}`;
  const curPhaseKey = `${view.phase}:${view.currentSpeakerId ?? ''}:${view.round}`;
  if (phaseKey !== curPhaseKey) {
    setPhaseKey(curPhaseKey);
    if (err !== null) setErr(null);
    if (manualRecapOpen && view.phase === 'clue_summary') setManualRecapOpen(false);
  }

  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const seatIndexMap = useMemo(() => new Map(view.order.map((id, idx) => [id, idx + 1])), [view.order]);
  const elimMap = useMemo(() => new Map(view.eliminated.map((e) => [e.id, e])), [view.eliminated]);

  const roundClues = useMemo(
    () => view.clues.filter((c) => c.round === view.round),
    [view.clues, view.round],
  );

  const latestClueByPlayer = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of roundClues) map.set(c.playerId, c.text);
    if (map.size === 0) {
      for (const c of view.clues) map.set(c.playerId, c.text);
    }
    return map;
  }, [roundClues, view.clues]);

  const voteTally = useMemo(() => {
    const map: Record<string, number> = {};
    if (view.phase === 'final_vote' && (view.defendants?.length ?? 0) > 1) {
      for (const target of Object.values(view.finalVotes ?? {})) {
        if (target !== 'skip') map[target] = (map[target] ?? 0) + 1;
      }
      return map;
    }
    for (const target of Object.values(view.votes)) {
      if (target !== 'skip') map[target] = (map[target] ?? 0) + 1;
    }
    return map;
  }, [view.votes, view.finalVotes, view.phase, view.defendants]);

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Thao tác không hợp lệ');
    return res.ok;
  };

  // Chỉ mở DossierModal toàn màn hình cho các pha KHÔNG cho phép chat (`word_reveal`, `clue_summary`, `counter`, xem lại gợi ý).
  // Pha `vote` và `final_vote` hiển thị dạng LivePanel không chặn chat phía trên khung chat!
  const isDismissed = dismissedKey === modalKey;
  const activeModalKind:
    | 'recap_manual'
    | 'word_reveal'
    | 'clue_summary'
    | 'counter'
    | null = (() => {
    if (view.phase === 'reveal_end') return null;
    if (manualRecapOpen) return 'recap_manual';
    if (view.phase === 'word_reveal' && iAlive && !isDismissed) return 'word_reveal';
    if (view.phase === 'clue_summary' && !isDismissed) return 'clue_summary';
    if ((view.phase === 'mrwhite_guess' || view.phase === 'spy_guess') && view.mrWhiteId === me && !isDismissed) {
      return 'counter';
    }
    return null;
  })();

  const overlay = (() => {
    switch (activeModalKind) {
      case 'recap_manual':
        return (
          <ClueRecapPopup
            view={view}
            clockOffset={game.clockOffset}
            me={me}
            busy={busy}
            playerMap={playerMap}
            seatIndexMap={seatIndexMap}
            isPhaseRecap={view.phase === 'clue_summary'}
            onReady={() => void act({ type: 'gd_ready' })}
            onClose={() => setManualRecapOpen(false)}
          />
        );
      case 'word_reveal':
        return (
          <WordRevealPopup
            view={view}
            clockOffset={game.clockOffset}
            me={me}
            busy={busy}
            onReady={() => void act({ type: 'gd_ready' })}
            onMinimize={() => setDismissedKey(modalKey)}
          />
        );
      case 'clue_summary':
        return (
          <ClueRecapPopup
            view={view}
            clockOffset={game.clockOffset}
            me={me}
            busy={busy}
            playerMap={playerMap}
            seatIndexMap={seatIndexMap}
            isPhaseRecap
            onReady={() => void act({ type: 'gd_ready' })}
            onClose={() => setDismissedKey(modalKey)}
          />
        );
      case 'counter':
        return (
          <CounterGuessPopup
            view={view}
            clockOffset={game.clockOffset}
            busy={busy}
            err={err}
            onGuess={(word) => act({ type: 'gd_guess', word })}
            onMinimize={() => setDismissedKey(modalKey)}
          />
        );
      default:
        return null;
    }
  })();

  const panelCollapsed = panelCollapsedKey === modalKey;
  const togglePanelCollapsed = () => {
    setPanelCollapsedKey((prev) => (prev === modalKey ? null : modalKey));
  };

  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      hideChat
      keyboardAware
      overlay={overlay}
      bottom={
        <GianDiepBottomDock
          game={game}
          view={view}
          sec={sec}
          kbOpen={kbOpen}
          busy={busy}
          err={err}
          onClearErr={() => setErr(null)}
          act={act}
          isDismissed={isDismissed}
          onReopenModal={() => setDismissedKey(null)}
        />
      }
    >
      <GianDiepBody
        game={game}
        view={view}
        sec={sec}
        compact={compact}
        kbOpen={kbOpen}
        busy={busy}
        wordVisible={wordVisible}
        onToggleWord={() => setWordVisible((v) => !v)}
        roundClues={roundClues}
        latestClueByPlayer={latestClueByPlayer}
        seatIndexMap={seatIndexMap}
        playerMap={playerMap}
        elimMap={elimMap}
        voteTally={voteTally}
        activeModalKind={activeModalKind}
        panelCollapsed={panelCollapsed}
        onTogglePanel={togglePanelCollapsed}
        playersOpen={playersOpen}
        onOpenRecap={() => setManualRecapOpen(true)}
        onOpenPlayers={() => setPlayersOpen(true)}
        onClosePlayers={() => setPlayersOpen(false)}
        act={act}
      />
    </Shell>
  );
}

const GianDiepBody = memo(function GianDiepBody({
  game,
  view,
  sec,
  compact,
  kbOpen,
  busy,
  wordVisible,
  onToggleWord,
  roundClues,
  latestClueByPlayer,
  seatIndexMap,
  playerMap,
  elimMap,
  voteTally,
  activeModalKind,
  panelCollapsed,
  onTogglePanel,
  playersOpen,
  onOpenRecap,
  onOpenPlayers,
  onClosePlayers,
  act,
}: {
  game: Game;
  view: GianDiepView;
  sec: number;
  compact: boolean;
  kbOpen: boolean;
  busy: boolean;
  wordVisible: boolean;
  onToggleWord: () => void;
  roundClues: GianDiepView['clues'];
  latestClueByPlayer: Map<string, string>;
  seatIndexMap: Map<string, number>;
  playerMap: Map<string, RoomState['players'][number]>;
  elimMap: Map<string, GianDiepView['eliminated'][number]>;
  voteTally: Record<string, number>;
  activeModalKind: string | null;
  panelCollapsed: boolean;
  onTogglePanel: () => void;
  playersOpen: boolean;
  onOpenRecap: () => void;
  onOpenPlayers: () => void;
  onClosePlayers: () => void;
  act: (payload: Parameters<Game['act']>[0]) => Promise<boolean>;
}) {
  const tools = useShellTools();
  const feedScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const me = game.me ?? '';
  const iAlive = view.alive.includes(me);
  const meta = PHASE_META[view.phase] ?? PHASE_META.discussion;

  const timeline: GianDiepFeedItem[] = useMemo(() => {
    if (view.timeline && view.timeline.length > 0) return view.timeline;
    return view.clues.map((c) => ({
      id: c.id,
      round: c.round,
      kind: 'clue' as const,
      playerId: c.playerId,
      name: c.name,
      text: c.text,
      at: c.at,
    }));
  }, [view.timeline, view.clues]);

  useEffect(() => {
    const t = setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: !kbOpen }), 50);
    return () => clearTimeout(t);
  }, [timeline.length, view.phase, panelCollapsed, kbOpen]);

  const speakerId = view.currentSpeakerId;
  const speakerSeat = speakerId ? seatIndexMap.get(speakerId) : undefined;
  const speakerName = speakerId ? (view.names[speakerId] ?? speakerId) : '';
  const speakerPlayer = speakerId ? playerMap.get(speakerId) : undefined;
  const defendantSet = useMemo(() => new Set(view.defendants ?? []), [view.defendants]);
  const pct = view.phaseSeconds > 0 ? Math.max(0, Math.min(1, sec / view.phaseSeconds)) : 0;

  // Màn Lật Mở Từ Khóa cuối ván
  if (view.phase === 'reveal_end' && view.revealedAll) {
    return (
      <View style={styles.root}>
        <View style={styles.revealHeader}>
          <T style={styles.revealHeadline}>{view.wordPairReveal?.winnerHeadline ?? 'Kết quả ván đấu'}</T>
          <View style={styles.wordCompareRow}>
            <View style={[styles.wordCompareCard, { backgroundColor: GD.positiveSoft, borderColor: GD.positiveBorder }]}>
              <T style={[styles.wordCompareRole, { color: GD.positive }]}>Dân thường</T>
              <T style={styles.wordCompareVal}>{view.wordPairReveal?.wordA ?? '---'}</T>
            </View>
            <View style={[styles.wordCompareCard, { backgroundColor: GD.accentSoft, borderColor: GD.accentBorder }]}>
              <T style={[styles.wordCompareRole, { color: GD.accent }]}>Gián điệp</T>
              <T style={styles.wordCompareVal}>{view.wordPairReveal?.wordB ?? '---'}</T>
            </View>
          </View>
          <View style={styles.revealTrack}>
            <View style={[styles.revealTrackFill, { width: `${pct * 100}%` }]} />
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.revealList} showsVerticalScrollIndicator={false}>
          {view.revealedAll.map((item, idx) => {
            const pl = playerMap.get(item.id);
            const rMeta = GIAN_DIEP_ROLE_META[item.role];
            const isSpy = item.role === 'giandiep';
            const isWhite = item.role === 'mrwhite';
            return (
              <View
                key={item.id}
                testID={`gd-reveal-${item.id}`}
                style={[
                  styles.revealRow,
                  isSpy && { borderColor: GD.accentBorder, backgroundColor: '#FFFBEB' },
                  isWhite && { borderColor: GD.hairlineStrong },
                ]}
              >
                <T style={styles.revealSeat}>#{idx + 1}</T>
                <Portrait p={portraitSrc(pl, idx + 1)} size={32} border={1} />
                <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                  <T numberOfLines={1} style={styles.revealName}>{item.name}</T>
                  <View style={styles.revealRoleRow}>
                    <View
                      style={[
                        styles.roleDot,
                        { backgroundColor: isSpy ? GD.accent : isWhite ? GD.textMuted : GD.positive },
                      ]}
                    />
                    <T style={styles.revealRoleTxt}>{rMeta.name}</T>
                  </View>
                </View>
                <View style={styles.revealWordSlip}>
                  <T style={styles.revealWordTxt}>{item.word ?? 'Không có từ'}</T>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <Pressable
          testID="gd-finish-reveal-btn"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => {
            play('pop');
            void act({ type: 'gd_ready' });
          }}
          style={({ pressed }) => [styles.primaryDockBtn, pressed && styles.pressedBtn, busy && { opacity: 0.5 }]}
        >
          <T style={styles.primaryDockBtnTxt}>Sang bảng tổng kết</T>
        </Pressable>
      </View>
    );
  }

  const wordLabel =
    view.myRole === 'mrwhite'
      ? 'Mr. White'
      : (view.myWord ?? '---');

  const firstDefId = (view.defendants ?? [])[0];
  const firstDefPlayer = firstDefId ? playerMap.get(firstDefId) : undefined;
  const firstDefSeat = firstDefId ? seatIndexMap.get(firstDefId) : undefined;
  const defSummary = (view.defendants ?? [])
    .map((id) => `${seatIndexMap.get(id) ? `#${seatIndexMap.get(id)} ` : ''}${view.names[id] ?? id}`)
    .join(', ');

  return (
    <View style={styles.root}>
      {/* 1. Thanh Tiêu Đề Duy Nhất (gọn, dịu mắt, không nhồi badge thừa) */}
      <View style={styles.headerCard}>
        <View style={[styles.headerRow, compact && styles.headerRowCompact, kbOpen && styles.headerRowKb]}>
          <View style={styles.phaseGroup}>
            <View style={[styles.phaseDot, { backgroundColor: meta.dotColor }]} />
            <T testID="gd-phase-callout" numberOfLines={1} style={[styles.phaseText, compact && styles.phaseTextCompact]}>
              V{view.round} · {meta.label}
            </T>
            <T testID="gd-timer" style={[styles.timerTabular, compact && styles.phaseTextCompact, sec <= 5 && { color: GD.danger }]}>
              {sec}s
            </T>
          </View>

          <Pressable
            testID="gd-secret-card"
            accessibilityRole="button"
            onPress={onToggleWord}
            style={({ pressed }) => [
              styles.secretSlip,
              !wordVisible && styles.secretSlipHidden,
              pressed && styles.pressedSoft,
            ]}
          >
            <UiIcon
              name={wordVisible ? 'Eye' : 'EyeOff'}
              size={13}
              color={wordVisible ? GD.textOnInkMuted : '#E7E2D8'}
              strokeWidth={1.65}
            />
            <T
              testID={activeModalKind === 'word_reveal' ? undefined : 'gd-secret-word'}
              numberOfLines={1}
              style={[styles.secretSlipTxt, compact && { fontSize: 11.5 }]}
            >
              {wordVisible ? wordLabel : '••••••'}
            </T>
          </Pressable>

          <View style={styles.headerActions}>
            {roundClues.length > 0 && (
              <Pressable
                testID="gd-recap-open-btn"
                accessibilityRole="button"
                onPress={() => {
                  play('pop');
                  onOpenRecap();
                }}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedSoft]}
              >
                <UiIcon name="BookOpen" size={14} color={GD.textSecondary} strokeWidth={1.65} />
                <T style={styles.headerIconTxt}>{roundClues.length}</T>
              </Pressable>
            )}

            <Pressable
              testID="gd-players-btn"
              accessibilityRole="button"
              onPress={() => {
                play('pop');
                onOpenPlayers();
              }}
              style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressedSoft]}
            >
              <UiIcon name="Users" size={14} color={GD.textSecondary} strokeWidth={1.65} />
              <T style={styles.headerIconTxt}>{view.alive.length}/{view.order.length}</T>
            </Pressable>
          </View>
        </View>

        {!kbOpen && (
          <View style={styles.headerProgressTrack}>
            <View
              style={[
                styles.headerProgressFill,
                {
                  width: `${pct * 100}%`,
                  backgroundColor: sec <= 5 ? GD.danger : GD.inkSurface,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* 2. Dải Bối Cảnh Ngắn / Bảng Vote & Phán Quyết Không Chặn Chat */}
      {view.phase === 'clue_turn' && speakerId && !kbOpen && (
        <View style={styles.contextStrip}>
          <Portrait
            p={portraitSrc(speakerPlayer, speakerSeat)}
            size={22}
            border={1}
          />
          <T numberOfLines={1} style={styles.contextStripTxt}>
            {speakerId === me
              ? 'Lượt của bạn khai 1 gợi ý'
              : `Đang nghe ${speakerSeat ? `#${speakerSeat} ` : ''}${speakerName} khai gợi ý`}
          </T>
          <T style={styles.contextStripCount}>
            {roundClues.length}/{view.speakerOrder.length}
          </T>
        </View>
      )}

      {view.phase === 'defense' && firstDefId && !kbOpen && (
        <View style={[styles.contextStrip, styles.contextStripDefense]}>
          <Portrait
            p={portraitSrc(firstDefPlayer, firstDefSeat)}
            size={22}
            border={1}
          />
          <T numberOfLines={1} style={styles.contextStripTxt}>
            {defendantSet.has(me)
              ? 'Bạn đang biện minh trước phòng'
              : `${defSummary} đang biện minh · Có thể nhắn tin trao đổi`}
          </T>
        </View>
      )}

      {view.phase === 'vote' && iAlive && (
        <VoteLivePanel
          view={view}
          sec={sec}
          me={me}
          busy={busy}
          compact={compact}
          collapsed={panelCollapsed}
          kbOpen={kbOpen}
          playerMap={playerMap}
          seatIndexMap={seatIndexMap}
          voteTally={voteTally}
          latestClueByPlayer={latestClueByPlayer}
          onVote={(target) => void act({ type: 'gd_vote', target })}
          onToggleCollapse={onTogglePanel}
        />
      )}

      {view.phase === 'final_vote' && iAlive && (
        <VerdictLivePanel
          view={view}
          sec={sec}
          me={me}
          busy={busy}
          collapsed={panelCollapsed}
          kbOpen={kbOpen}
          playerMap={playerMap}
          seatIndexMap={seatIndexMap}
          voteTally={voteTally}
          latestClueByPlayer={latestClueByPlayer}
          onVerdict={(verdict) => void act({ type: 'gd_verdict', verdict })}
          onToggleCollapse={onTogglePanel}
        />
      )}

      {/* 3. Khung Chat Chính Có Avatar Nhỏ Bên Cạnh Từng Lời Thoại */}
      <View style={styles.feedContainer}>
        <ScrollView
          ref={feedScrollRef}
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => feedScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {timeline.length === 0 && (
            <View style={styles.sysRow}>
              <T style={styles.sysTxt}>Chưa có lời khai ở vòng này</T>
            </View>
          )}
          {timeline.map((item) => {
            if (item.kind === 'system') {
              return (
                <View key={item.id} style={styles.sysRow}>
                  <T style={styles.sysTxt}>{item.text}</T>
                </View>
              );
            }

            const pid = item.playerId ?? '';
            const seatNo = pid ? seatIndexMap.get(pid) : undefined;
            const pl = pid ? playerMap.get(pid) : undefined;
            const avatarData = portraitSrc(pl, seatNo);
            const isMine = pid === me;
            const isClue = item.kind === 'clue';
            const isDef = item.kind === 'defense';
            const clockStr = formatClock(item.at);
            const isAccusedTag =
              (view.phase === 'defense' || view.phase === 'final_vote') && defendantSet.has(pid);

            if (isClue || isDef) {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.statementCard,
                    { borderLeftColor: isClue ? GD.positive : GD.danger },
                  ]}
                >
                  <View testID={`gd-msg-avatar-${item.id}`} style={styles.msgAvatarSlot}>
                    <Portrait p={avatarData} size={28} border={1} />
                  </View>
                  <View style={styles.statementContent}>
                    <View style={styles.msgMetaRow}>
                      {seatNo !== undefined && <T style={styles.msgSeat}>#{seatNo}</T>}
                      <T numberOfLines={1} style={styles.statementAuthor}>
                        {item.name}{isMine ? ' (Bạn)' : ''}
                      </T>
                      <T style={[styles.statementTag, { color: isClue ? GD.positive : GD.danger }]}>
                        · {isClue ? `Gợi ý V${item.round}` : 'Biện minh'}
                      </T>
                      {clockStr && <T style={styles.msgTime}>{clockStr}</T>}
                    </View>
                    <T style={styles.statementBody}>“{item.text}”</T>
                  </View>
                </View>
              );
            }

            if (isMine) {
              return (
                <View key={item.id} style={styles.chatRowMine}>
                  <View style={styles.chatBubbleMine}>
                    {isAccusedTag && <T style={styles.accusedMineTag}>Bị cáo</T>}
                    <T style={styles.chatBodyMine}>{item.text}</T>
                    {clockStr && <T style={styles.chatTimeMine}>{clockStr}</T>}
                  </View>
                  <View testID={`gd-msg-avatar-${item.id}`} style={styles.msgAvatarSlot}>
                    <Portrait p={avatarData} size={28} border={1} />
                  </View>
                </View>
              );
            }

            return (
              <View key={item.id} style={styles.chatRowOther}>
                <View testID={`gd-msg-avatar-${item.id}`} style={styles.msgAvatarSlot}>
                  <Portrait p={avatarData} size={28} border={1} />
                </View>
                <View style={styles.chatBubbleOther}>
                  <View style={styles.msgMetaRow}>
                    {seatNo !== undefined && <T style={styles.msgSeat}>#{seatNo}</T>}
                    <T numberOfLines={1} style={styles.chatAuthor}>{item.name}</T>
                    {isAccusedTag && <T style={styles.accusedOtherTag}>· Bị cáo</T>}
                  </View>
                  <T style={styles.chatBodyOther}>{item.text}</T>
                  {clockStr && <T style={styles.chatTimeOther}>{clockStr}</T>}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Bảng Danh Sách Người Chơi */}
      {playersOpen && (
        <Sheet title={`Người chơi (${view.alive.length}/${view.order.length})`} onClose={onClosePlayers}>
          <View testID="gd-players-sheet" style={{ gap: 8 }}>
            <View style={styles.sheetTopMeta}>
              <T style={styles.sheetMetaTxt}>Chủ đề: {view.category}</T>
              {view.roleSummary && activeModalKind !== 'word_reveal' && (
                <T testID="gd-role-summary" style={styles.sheetMetaTabular}>
                  {view.roleSummary.dan} Dân · {view.roleSummary.giandiep} Gián điệp
                  {view.roleSummary.mrwhite > 0 ? ` · ${view.roleSummary.mrwhite} Mr. White` : ''}
                </T>
              )}
            </View>

            {view.order.map((id, idx) => {
              const pl = playerMap.get(id);
              const alive = view.alive.includes(id);
              const elim = elimMap.get(id);
              const clue = latestClueByPlayer.get(id);
              const votes = voteTally[id] ?? 0;
              return (
                <Pressable
                  key={id}
                  onPress={() => {
                    onClosePlayers();
                    if (id !== me) tools?.openPlayer(id);
                    else tools?.openProfile();
                  }}
                  style={[styles.playerSheetRow, !alive && styles.playerSheetRowDead]}
                >
                  <T style={[styles.revealSeat, id === me && { color: GD.accent }]}>#{idx + 1}</T>
                  <Portrait p={portraitSrc(pl, idx + 1)} size={32} border={1} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <NameText fx={pl?.cosmetics?.nameFx} numberOfLines={1} style={styles.revealName}>
                      {view.names[id] ?? id}{id === me ? ' (Bạn)' : ''}
                    </NameText>
                    <T numberOfLines={1} style={[styles.sheetSubTxt, !alive && { color: GD.danger }]}>
                      {!alive && elim
                        ? `Bị loại V${elim.round} · ${GIAN_DIEP_ROLE_META[elim.role].name}`
                        : clue
                          ? `“${clue}”`
                          : 'Chưa khai vòng này'}
                    </T>
                  </View>
                  {votes > 0 && alive && (
                    <T style={styles.sheetVoteTabular}>{votes} phiếu</T>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Sheet>
      )}
    </View>
  );
});

const GianDiepBottomDock = memo(function GianDiepBottomDock({
  game,
  view,
  sec,
  kbOpen,
  busy,
  err,
  onClearErr,
  act,
  isDismissed,
  onReopenModal,
}: {
  game: Game;
  view: GianDiepView;
  sec: number;
  kbOpen: boolean;
  busy: boolean;
  err: string | null;
  onClearErr: () => void;
  act: (payload: Parameters<Game['act']>[0]) => Promise<boolean>;
  isDismissed: boolean;
  onReopenModal: () => void;
}) {
  const me = game.me ?? '';
  const iAlive = view.alive.includes(me);
  const iAmDefendant = (view.defendants ?? []).includes(me);
  const [inputVal, setInputVal] = useState('');
  const [phaseKey, setPhaseKey] = useState('');

  const curPhaseKey = `${view.phase}:${view.currentSpeakerId ?? ''}:${view.round}`;
  if (phaseKey !== curPhaseKey) {
    setPhaseKey(curPhaseKey);
  }

  if (view.phase === 'reveal_end') return null;

  if (view.phase === 'mrwhite_guess' || view.phase === 'spy_guess') {
    if (view.mrWhiteId === me) {
      return (
        <View style={styles.dock}>
          {isDismissed ? (
            <Pressable
              testID="gd-reopen-counter-btn"
              accessibilityRole="button"
              onPress={() => {
                play('pop');
                onReopenModal();
              }}
              style={({ pressed }) => [styles.primaryDockBtn, pressed && styles.pressedBtn]}
            >
              <T style={styles.primaryDockBtnTxt}>Mở khung đoán từ ({sec}s)</T>
            </Pressable>
          ) : (
            <View testID="gd-chat-locked" style={styles.lockedBar}>
              <UiIcon name="Lock" size={14} color={GD.textMuted} strokeWidth={1.65} />
              <T style={styles.lockedTxt}>Nhập từ khóa Dân thường trong khung đoán từ</T>
            </View>
          )}
        </View>
      );
    }
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <UiIcon name="Lock" size={14} color={GD.textMuted} strokeWidth={1.65} />
        <T style={styles.lockedTxt}>
          {view.phase === 'spy_guess'
            ? `Đang chờ Gián điệp ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ (${sec}s)`
            : `Đang chờ Mr. White ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ (${sec}s)`}
        </T>
      </View>
    );
  }

  if (!iAlive) {
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <UiIcon name="Eye" size={14} color={GD.textMuted} strokeWidth={1.65} />
        <T style={styles.lockedTxt}>Bạn đã bị loại · Đang theo dõi ván đấu</T>
      </View>
    );
  }

  if (view.phase === 'word_reveal' || view.phase === 'clue_summary') {
    const label =
      view.phase === 'word_reveal'
        ? `Mở thẻ từ khóa (${sec}s)`
        : `Mở bảng lời khai (${sec}s)`;
    return (
      <View style={styles.dock}>
        {isDismissed ? (
          <Pressable
            testID="gd-reopen-modal-btn"
            accessibilityRole="button"
            onPress={() => {
              play('pop');
              onReopenModal();
            }}
            style={({ pressed }) => [styles.primaryDockBtn, pressed && styles.pressedBtn]}
          >
            <T style={styles.primaryDockBtnTxt}>{label}</T>
          </Pressable>
        ) : (
          <View testID="gd-chat-locked" style={styles.lockedBar}>
            <UiIcon name="Lock" size={14} color={GD.textMuted} strokeWidth={1.65} />
            <T style={styles.lockedTxt}>
              {view.phase === 'word_reveal'
                ? 'Đang nhận từ khóa · Tạm khóa chat'
                : 'Đang đối chiếu lời khai · Tạm khóa chat'}
            </T>
          </View>
        )}
      </View>
    );
  }

  // Pha Khai Gợi Ý: chỉ người tới lượt khai gợi ý, người khác khóa chat
  if (view.phase === 'clue_turn') {
    if (view.currentSpeakerId === me) {
      const clueReady = Boolean(inputVal.trim()) && !busy;
      const submitClue = async () => {
        const clean = inputVal.trim();
        if (!clean || busy) return;
        if (await act({ type: 'gd_clue', text: clean })) setInputVal('');
      };
      return (
        <View style={styles.dock}>
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="gd-clue-input"
              value={inputVal}
              onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
              onSubmitEditing={() => void submitClue()}
              placeholder="Mô tả từ khóa (không nhắc trực tiếp)"
              placeholderTextColor={GD.textMuted}
              returnKeyType="send"
              maxLength={80}
              style={styles.input}
            />
            <Pressable
              testID="gd-clue-submit"
              accessibilityRole="button"
              disabled={!clueReady}
              onPress={() => {
                play('pop');
                void submitClue();
              }}
              style={({ pressed }) => [
                styles.sendTextBtn,
                !clueReady && styles.sendBtnIdle,
                pressed && clueReady && styles.pressedBtn,
              ]}
            >
              <T style={[styles.sendTextBtnTxt, !clueReady && { color: GD.textMuted }]}>Khai</T>
            </Pressable>
          </View>
        </View>
      );
    }

    const spName = view.names[view.currentSpeakerId ?? ''] ?? '';
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <UiIcon name="Lock" size={14} color={GD.textMuted} strokeWidth={1.65} />
        <T style={styles.lockedTxt}>Chờ {spName} khai gợi ý</T>
      </View>
    );
  }

  const sendChatLine = async () => {
    const clean = inputVal.trim();
    if (!clean || busy) return;
    if (await act({ type: 'gd_chat', text: clean })) setInputVal('');
  };

  // Pha Biện Minh: bị cáo dùng gd_defense (kèm nút Xong), người chơi khác vẫn chat tự do via gd_chat!
  if (view.phase === 'defense' && iAmDefendant) {
    const myReady = view.readySkip.includes(me);
    const defReady = Boolean(inputVal.trim()) && !busy;
    const submitDef = async () => {
      const clean = inputVal.trim();
      if (!clean || busy) return;
      if (await act({ type: 'gd_defense', text: clean })) setInputVal('');
    };
    return (
      <View style={styles.dock}>
        {err && <T style={styles.errTxt}>{err}</T>}
        <View style={styles.inputRow}>
          <TextInput
            testID="gd-defense-input"
            value={inputVal}
            onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
            onSubmitEditing={() => void submitDef()}
            placeholder="Nhập lời biện minh"
            placeholderTextColor={GD.textMuted}
            returnKeyType="send"
            maxLength={120}
            style={styles.input}
          />
          <Pressable
            testID="gd-defense-submit"
            accessibilityRole="button"
            disabled={!defReady}
            onPress={() => {
              play('pop');
              void submitDef();
            }}
            style={({ pressed }) => [
              styles.sendIconBtn,
              !defReady && styles.sendBtnIdle,
              pressed && defReady && styles.pressedBtn,
            ]}
          >
            <UiIcon name="Send" size={16} color={defReady ? GD.textOnInk : GD.textMuted} strokeWidth={1.75} />
          </Pressable>
          <Pressable
            testID="gd-defense-done"
            accessibilityRole="button"
            disabled={busy || myReady}
            onPress={() => {
              play('pop');
              void act({ type: 'gd_ready' });
            }}
            style={({ pressed }) => [
              styles.voteSkipReadyBtn,
              pressed && styles.pressedSoft,
              (busy || myReady) && { opacity: 0.5 },
            ]}
          >
            <T style={styles.voteSkipReadyTxt}>{myReady ? 'Đã xong' : 'Xong'}</T>
          </Pressable>
        </View>
      </View>
    );
  }

  // Pha Thảo Luận / Vote / Biện Minh (người nghe) / Phán Quyết (cả bị cáo lẫn cử tri): Chat luôn mở!
  const myReady = view.readySkip.includes(me);
  const needReady = Math.max(1, Math.ceil(view.alive.length / 2));
  const chatReady = Boolean(inputVal.trim()) && !busy;
  const placeholder =
    (view.phase === 'final_vote' || view.phase === 'defense') && iAmDefendant
      ? 'Nhắn tin biện minh...'
      : view.phase === 'vote'
        ? 'Nhắn tin trong lúc bỏ phiếu'
        : view.phase === 'final_vote'
          ? 'Nhắn tin trước phán quyết'
          : 'Nhắn tin thảo luận';

  return (
    <View style={styles.dock}>
      {err && <T style={styles.errTxt}>{err}</T>}
      <View style={styles.inputRow}>
        <TextInput
          testID="gd-chat-input"
          value={inputVal}
          onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
          onSubmitEditing={() => void sendChatLine()}
          placeholder={placeholder}
          placeholderTextColor={GD.textMuted}
          returnKeyType="send"
          maxLength={120}
          style={styles.input}
        />
        <Pressable
          testID="gd-chat-send"
          accessibilityRole="button"
          disabled={!chatReady}
          onPress={() => {
            play('pop');
            void sendChatLine();
          }}
          style={({ pressed }) => [
            styles.sendIconBtn,
            !chatReady && styles.sendBtnIdle,
            pressed && chatReady && styles.pressedBtn,
          ]}
        >
          <UiIcon name="Send" size={16} color={chatReady ? GD.textOnInk : GD.textMuted} strokeWidth={1.75} />
        </Pressable>

        {view.phase === 'discussion' && !kbOpen && (
          <Pressable
            testID="gd-ready-btn"
            accessibilityRole="button"
            disabled={busy || myReady}
            onPress={() => {
              play('pop');
              void act({ type: 'gd_ready' });
            }}
            style={({ pressed }) => [
              styles.voteSkipReadyBtn,
              myReady && styles.voteSkipReadyBtnActive,
              pressed && styles.pressedSoft,
              busy && { opacity: 0.5 },
            ]}
          >
            <T style={[styles.voteSkipReadyTxt, myReady && { color: '#FFFFFF' }]}>
              Vote {view.readySkip.length}/{needReady}
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 8,
    minHeight: 0,
  },

  headerCard: {
    backgroundColor: GD.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GD.hairline,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  headerRowCompact: {
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  headerRowKb: {
    paddingVertical: 5,
  },
  phaseGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseText: {
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
    maxWidth: 112,
  },
  phaseTextCompact: {
    fontSize: 11.5,
  },
  timerTabular: {
    color: GD.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },

  secretSlip: {
    flex: 1,
    minWidth: 92,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: GD.inkSurface,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  secretSlipHidden: {
    backgroundColor: '#363029',
  },
  secretSlipTxt: {
    color: GD.textOnInk,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  headerIconBtn: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: GD.subtle,
    borderRadius: 8,
    paddingHorizontal: 6,
  },
  headerIconTxt: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  headerProgressTrack: {
    height: 2,
    backgroundColor: GD.subtle,
    width: '100%',
  },
  headerProgressFill: {
    height: '100%',
  },

  contextStrip: {
    height: 36,
    backgroundColor: GD.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contextStripDefense: {
    borderLeftWidth: 3,
    borderLeftColor: GD.danger,
  },
  contextStripTxt: {
    flex: 1,
    minWidth: 0,
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
  contextStripCount: {
    color: GD.textMuted,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },

  feedContainer: {
    flex: 1,
    minHeight: 72,
    backgroundColor: GD.feedBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GD.hairline,
    overflow: 'hidden',
  },
  feedScroll: { flex: 1 },
  feedContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },

  sysRow: {
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sysTxt: {
    color: GD.textMuted,
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: FONT,
    textAlign: 'center',
  },

  statementCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: GD.raised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GD.hairline,
    borderLeftWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statementContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  msgAvatarSlot: {
    flexShrink: 0,
    paddingTop: 1,
  },
  msgMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  msgSeat: {
    color: GD.textMuted,
    fontSize: 11.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  statementAuthor: {
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },
  statementTag: {
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: FONT,
    flexShrink: 0,
  },
  msgTime: {
    marginLeft: 'auto',
    color: GD.textMuted,
    fontSize: 10.5,
    fontWeight: '400',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  statementBody: {
    color: GD.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: FONT,
    lineHeight: 20,
  },

  chatRowOther: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    maxWidth: '90%',
    alignSelf: 'flex-start',
  },
  chatBubbleOther: {
    flexShrink: 1,
    backgroundColor: GD.raised,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
  },
  chatAuthor: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    flexShrink: 1,
  },
  accusedOtherTag: {
    color: GD.danger,
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT,
  },
  chatBodyOther: {
    color: GD.textPrimary,
    fontSize: 14,
    fontWeight: '400',
    fontFamily: FONT,
    lineHeight: 20,
  },
  chatTimeOther: {
    color: GD.textMuted,
    fontSize: 10,
    fontWeight: '400',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
    alignSelf: 'flex-end',
  },

  chatRowMine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 8,
    maxWidth: '90%',
    alignSelf: 'flex-end',
  },
  chatBubbleMine: {
    flexShrink: 1,
    backgroundColor: GD.inkSurface,
    borderRadius: 12,
    borderTopRightRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 3,
  },
  accusedMineTag: {
    color: '#FCA5A5',
    fontSize: 10.5,
    fontWeight: '600',
    fontFamily: FONT,
  },
  chatBodyMine: {
    color: GD.textOnInk,
    fontSize: 14,
    fontWeight: '400',
    fontFamily: FONT,
    lineHeight: 20,
  },
  chatTimeMine: {
    color: GD.textOnInkMuted,
    fontSize: 10,
    fontWeight: '400',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
    alignSelf: 'flex-end',
  },

  sheetTopMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    paddingBottom: 4,
  },
  sheetMetaTxt: {
    color: GD.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    fontFamily: FONT,
  },
  sheetMetaTabular: {
    color: GD.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  playerSheetRow: {
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
  playerSheetRowDead: {
    opacity: 0.65,
    backgroundColor: GD.subtle,
  },
  sheetSubTxt: {
    color: GD.textSecondary,
    fontSize: 12,
    fontWeight: '400',
    fontFamily: FONT,
  },
  sheetVoteTabular: {
    color: GD.accent,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },

  dock: {
    gap: 6,
  },
  errTxt: {
    color: '#FECACA',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: FONT,
    textAlign: 'center',
  },
  lockedBar: {
    height: 40,
    backgroundColor: GD.subtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GD.hairlineStrong,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  lockedTxt: {
    color: GD.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
    flexShrink: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    backgroundColor: GD.raised,
    borderColor: GD.hairlineStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: GD.textPrimary,
    fontSize: 15,
    fontWeight: '400',
    fontFamily: FONT,
  },
  sendIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: GD.inkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendTextBtn: {
    height: 42,
    borderRadius: 10,
    backgroundColor: GD.inkSurface,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendTextBtnTxt: {
    color: GD.textOnInk,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT,
  },
  sendBtnIdle: {
    backgroundColor: '#E5DFD3',
  },
  voteSkipReadyBtn: {
    height: 42,
    borderRadius: 10,
    backgroundColor: GD.card,
    borderWidth: 1,
    borderColor: GD.hairlineStrong,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  voteSkipReadyBtnActive: {
    backgroundColor: GD.positive,
    borderColor: GD.positive,
  },
  voteSkipReadyTxt: {
    color: GD.textPrimary,
    fontSize: 12.5,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  primaryDockBtn: {
    height: 44,
    borderRadius: 10,
    backgroundColor: GD.inkSurface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryDockBtnTxt: {
    color: GD.textOnInk,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  pressedBtn: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  pressedSoft: {
    opacity: 0.78,
  },

  revealHeader: {
    backgroundColor: GD.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: GD.hairline,
    padding: 14,
    gap: 10,
  },
  revealHeadline: {
    fontSize: 15,
    fontWeight: '600',
    color: GD.textPrimary,
    fontFamily: FONT,
  },
  wordCompareRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wordCompareCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  wordCompareRole: {
    fontSize: 11.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
  wordCompareVal: {
    fontSize: 16,
    fontWeight: '600',
    color: GD.textPrimary,
    fontFamily: FONT,
  },
  revealTrack: {
    height: 2,
    borderRadius: 1,
    backgroundColor: GD.subtle,
    overflow: 'hidden',
  },
  revealTrackFill: {
    height: '100%',
    backgroundColor: GD.accent,
  },
  revealList: {
    gap: 6,
    paddingVertical: 2,
  },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: GD.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GD.hairline,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revealSeat: {
    color: GD.textMuted,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  revealName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: GD.textPrimary,
    fontFamily: FONT,
  },
  revealRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  revealRoleTxt: {
    fontSize: 12,
    fontWeight: '500',
    color: GD.textSecondary,
    fontFamily: FONT,
  },
  revealWordSlip: {
    backgroundColor: GD.inkSurface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  revealWordTxt: {
    color: GD.textOnInk,
    fontSize: 12.5,
    fontWeight: '500',
    fontFamily: FONT,
  },
});
