import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  GIAN_DIEP_ROLE_META,
  type GianDiepFeedItem,
  type GianDiepView,
} from '../../../shared/src/giandiep';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, T } from '../ui';
import { useKeyboardInset, useSecondsLeft, useStableWindow } from '../hooks';
import { Shell, useShellTools } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { EmojiIcon, UiIcon } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import {
  ClueRecapPopup,
  CounterGuessPopup,
  VerdictPopup,
  VotePopup,
  WordRevealPopup,
} from '../components/GianDiepPopups';

const PHASE_META: Record<
  GianDiepView['phase'],
  { title: string; short: string; emoji: string; accent: string; hint: string; step: number }
> = {
  word_reveal: {
    title: 'Nhận Từ Khóa',
    short: 'Nhận từ',
    emoji: '🔐',
    accent: '#0284C7',
    hint: 'Ghi nhớ từ khóa bí mật của bạn rồi bấm Sẵn sàng!',
    step: 0,
  },
  clue_turn: {
    title: 'Khai Gợi Ý',
    short: 'Khai gợi ý',
    emoji: '🎤',
    accent: '#16A34A',
    hint: 'Lần lượt từng người khai 1 gợi ý (tạm khóa chat tới khi khai xong).',
    step: 1,
  },
  clue_summary: {
    title: 'Tổng Hợp Lời Khai',
    short: 'Lời khai',
    emoji: '📋',
    accent: '#10B981',
    hint: 'Đối chiếu toàn bộ gợi ý vừa khai trước khi mở thảo luận!',
    step: 1,
  },
  discussion: {
    title: 'Thảo Luận',
    short: 'Thảo luận',
    emoji: '💬',
    accent: '#2563EB',
    hint: 'Chất vấn qua khung chat rồi bấm Vote để mở bỏ phiếu!',
    step: 2,
  },
  vote: {
    title: 'Bỏ Phiếu Loại',
    short: 'Bỏ phiếu',
    emoji: '🗳️',
    accent: '#D97706',
    hint: 'Mở bảng bỏ phiếu để chọn nghi phạm đáng ngờ nhất!',
    step: 3,
  },
  defense: {
    title: 'Biện Minh',
    short: 'Biện minh',
    emoji: '⚖️',
    accent: '#DC2626',
    hint: 'Nghi phạm cao phiếu nhất lên tiếng tự bào chữa!',
    step: 3,
  },
  final_vote: {
    title: 'Phán Quyết Cuối',
    short: 'Phán quyết',
    emoji: '🔨',
    accent: '#9333EA',
    hint: 'Nghe biện minh xong — Trục xuất hay Tha bổng!',
    step: 3,
  },
  mrwhite_guess: {
    title: 'Mr. White Lật Kèo',
    short: 'Phản đòn',
    emoji: '🤍',
    accent: '#475569',
    hint: 'Mr. White đoán đúng từ Dân Thường sẽ thắng ngược ngay!',
    step: 3,
  },
  spy_guess: {
    title: 'Gián Điệp Phản Đòn',
    short: 'Phản đòn',
    emoji: '🕵️',
    accent: '#EA580C',
    hint: 'Gián Điệp cuối bị lộ! Đoán trúng từ Dân Thường để lật kèo!',
    step: 3,
  },
  reveal_end: {
    title: 'Lật Mở Từ Khóa',
    short: 'Kết quả',
    emoji: '🔓',
    accent: '#EAB308',
    hint: 'Công bố toàn bộ thân phận & cặp từ khóa bí mật của cả bàn!',
    step: 4,
  },
};

const PHASE_STEPS = [
  { key: 'word', label: 'Từ' },
  { key: 'clue', label: 'Gợi ý' },
  { key: 'discuss', label: 'Bàn' },
  { key: 'vote', label: 'Vote' },
] as const;

const QUICK_CHATS = [
  'Ai nói chung chung quá vậy? 👀',
  'Câu của bạn lệch chủ đề nha!',
  'Coi chừng loại nhầm Dân!',
  'Có Mr. White đang chép bài!',
];

const SEAT_COLORS = ['#0284C7', '#16A34A', '#D97706', '#9333EA', '#E11D48', '#0D9488', '#4F46E5', '#B45309'];

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

  const isDismissed = dismissedKey === modalKey;
  const activeModalKind:
    | 'recap_manual'
    | 'word_reveal'
    | 'clue_summary'
    | 'vote'
    | 'final_vote'
    | 'counter'
    | null = (() => {
    if (view.phase === 'reveal_end') return null;
    if (manualRecapOpen) return 'recap_manual';
    if (view.phase === 'word_reveal' && iAlive && !isDismissed) return 'word_reveal';
    if (view.phase === 'clue_summary' && !isDismissed) return 'clue_summary';
    if (view.phase === 'vote' && iAlive && !isDismissed) return 'vote';
    if (view.phase === 'final_vote' && iAlive && !isDismissed) return 'final_vote';
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
      case 'vote':
        return (
          <VotePopup
            view={view}
            clockOffset={game.clockOffset}
            me={me}
            busy={busy}
            playerMap={playerMap}
            seatIndexMap={seatIndexMap}
            voteTally={voteTally}
            latestClueByPlayer={latestClueByPlayer}
            onVote={(target) => void act({ type: 'gd_vote', target })}
            onMinimize={() => setDismissedKey(modalKey)}
          />
        );
      case 'final_vote':
        return (
          <VerdictPopup
            view={view}
            clockOffset={game.clockOffset}
            me={me}
            busy={busy}
            playerMap={playerMap}
            seatIndexMap={seatIndexMap}
            voteTally={voteTally}
            latestClueByPlayer={latestClueByPlayer}
            onVerdict={(verdict) => void act({ type: 'gd_verdict', verdict })}
            onMinimize={() => setDismissedKey(modalKey)}
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
        room={room}
        view={view}
        sec={sec}
        compact={compact}
        kbOpen={kbOpen}
        wordVisible={wordVisible}
        onToggleWord={() => setWordVisible((v) => !v)}
        roundClues={roundClues}
        latestClueByPlayer={latestClueByPlayer}
        seatIndexMap={seatIndexMap}
        playerMap={playerMap}
        elimMap={elimMap}
        voteTally={voteTally}
        activeModalKind={activeModalKind}
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
  room,
  view,
  sec,
  compact,
  kbOpen,
  wordVisible,
  onToggleWord,
  roundClues,
  latestClueByPlayer,
  seatIndexMap,
  playerMap,
  elimMap,
  voteTally,
  activeModalKind,
  playersOpen,
  onOpenRecap,
  onOpenPlayers,
  onClosePlayers,
  act,
}: {
  game: Game;
  room: RoomState;
  view: GianDiepView;
  sec: number;
  compact: boolean;
  kbOpen: boolean;
  wordVisible: boolean;
  onToggleWord: () => void;
  roundClues: GianDiepView['clues'];
  latestClueByPlayer: Map<string, string>;
  seatIndexMap: Map<string, number>;
  playerMap: Map<string, RoomState['players'][number]>;
  elimMap: Map<string, GianDiepView['eliminated'][number]>;
  voteTally: Record<string, number>;
  activeModalKind: string | null;
  playersOpen: boolean;
  onOpenRecap: () => void;
  onOpenPlayers: () => void;
  onClosePlayers: () => void;
  act: (payload: Parameters<Game['act']>[0]) => Promise<boolean>;
}) {
  const tools = useShellTools();
  const feedScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const me = game.me ?? '';
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
  }, [timeline.length, view.phase, kbOpen]);

  const speakerSeat = view.currentSpeakerId ? seatIndexMap.get(view.currentSpeakerId) : undefined;
  const speakerName = view.currentSpeakerId ? (view.names[view.currentSpeakerId] ?? view.currentSpeakerId) : '';
  const defNames = (view.defendants ?? []).map((id) => view.names[id] ?? id).join(', ');
  const pct = view.phaseSeconds > 0 ? Math.max(0, Math.min(1, sec / view.phaseSeconds)) : 0;

  const calloutText = (() => {
    switch (view.phase) {
      case 'word_reveal':
        return `🏷️ ${view.category} · Ghi nhớ từ khóa rồi bấm Sẵn sàng!`;
      case 'clue_turn':
        return view.currentSpeakerId === me
          ? '🎤 TỚI LƯỢT BẠN! Nhập 1 câu mô tả từ khóa bên dưới.'
          : `🔒 Đang nghe ${speakerSeat ? `#${speakerSeat} ` : ''}${speakerName} khai gợi ý (tạm khóa chat)`;
      case 'clue_summary':
        return `📋 Đã khai đủ ${roundClues.length} gợi ý — chuẩn bị vào thảo luận!`;
      case 'discussion':
        return '💬 Thảo luận tự do & soi lời khai! Bấm Vote khi xong.';
      case 'vote':
        return '🗳️ Bảng bỏ phiếu đang mở — chọn nghi phạm hoặc bấm Xem chat.';
      case 'defense':
        return (view.defendants ?? []).includes(me)
          ? '⚖️ BẠN ĐANG BỊ NGHI NGỜ! Nhanh tay gửi lời biện minh.'
          : `⚖️ Bị cáo ${defNames} đang lên tiếng biện minh...`;
      case 'final_vote':
        return `🔨 Phán quyết cuối cho ${defNames}: Trục xuất hay Tha bổng?`;
      case 'mrwhite_guess':
      case 'spy_guess':
        return view.mrWhiteId === me
          ? '💥 CƠ HỘI LẬT KÈO! Gõ đúng từ Dân Thường để thắng!'
          : `💥 Đang chờ ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ phản đòn...`;
      default:
        return meta.hint;
    }
  })();

  // Màn Lật Mở Toàn Bộ Từ Khóa cuối ván
  if (view.phase === 'reveal_end' && view.revealedAll) {
    return (
      <View style={styles.root}>
        <View style={[styles.revealHeader, sticker(3)]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <EmojiIcon emoji="🔓" size={22} />
            <T style={styles.revealHeadline}>{view.wordPairReveal?.winnerHeadline ?? 'Kết quả ván đấu'}</T>
          </View>
          <View style={styles.wordCompareRow}>
            <View style={[styles.wordBox, { backgroundColor: '#DCFCE7', borderColor: '#22C55E' }]}>
              <T style={[styles.wordBoxRole, { color: '#15803D' }]}>🧑 TỪ DÂN THƯỜNG</T>
              <T style={[styles.wordBoxVal, { color: '#14532D' }]}>{view.wordPairReveal?.wordA ?? '---'}</T>
            </View>
            <View style={[styles.wordBox, { backgroundColor: '#FFEDD5', borderColor: '#F97316' }]}>
              <T style={[styles.wordBoxRole, { color: '#C2410C' }]}>🕵️ TỪ GIÁN ĐIỆP</T>
              <T style={[styles.wordBoxVal, { color: '#7C2D12' }]}>{view.wordPairReveal?.wordB ?? '---'}</T>
            </View>
          </View>
          <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.revealList}>
          {view.revealedAll.map((item, idx) => {
            const pl = playerMap.get(item.id);
            const rMeta = GIAN_DIEP_ROLE_META[item.role];
            return (
              <View
                key={item.id}
                testID={`gd-reveal-${item.id}`}
                style={[
                  styles.revealRow,
                  item.role === 'giandiep' && { borderColor: '#F97316', backgroundColor: '#FFF7ED' },
                  item.role === 'mrwhite' && { borderColor: '#64748B', backgroundColor: '#F8FAFC' },
                ]}
              >
                <View style={styles.seatNumBadge}>
                  <T style={styles.seatNumTxt}>#{idx + 1}</T>
                </View>
                {pl && <Portrait p={pl} size={34} frame={pl.cosmetics?.frame} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={styles.revealName}>{item.name}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <EmojiIcon emoji={rMeta.emoji} size={13} />
                    <T style={[styles.revealRoleTxt, { color: rMeta.color }]}>{rMeta.name}</T>
                  </View>
                </View>
                <View style={styles.revealWordPill}>
                  <T style={styles.revealWordTxt}>{item.word ? `«${item.word}»` : 'Giấy trắng'}</T>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <Button
          testID="gd-finish-reveal-btn"
          variant="gold"
          icon="🏆"
          title="Sang bảng tổng kết ngay"
          onPress={() => void act({ type: 'gd_ready' })}
        />
      </View>
    );
  }

  const clueDoneIds = new Set(roundClues.map((c) => c.playerId));
  const wordLabel =
    view.myRole === 'mrwhite'
      ? '🤍 MR. WHITE'
      : (view.myWord ?? '---').toUpperCase();

  return (
    <View style={styles.root}>
      {/* 1. HUD Siêu Gọn Duy Nhất: Chừa 75-80% màn hình cho Chat */}
      <View style={[styles.hudCard, kbOpen && styles.hudCardKb]}>
        <View style={styles.hudRow1}>
          <View style={[styles.phasePill, { backgroundColor: meta.accent }]}>
            <EmojiIcon emoji={meta.emoji} size={12} />
            <T numberOfLines={1} style={styles.phasePillTxt}>V{view.round}·{meta.short}</T>
          </View>

          <View style={[styles.hudTimerPill, sec <= 5 && styles.hudTimerUrgent]}>
            <T testID="gd-timer" style={styles.hudTimerTxt}>{sec}s</T>
          </View>

          <Pressable
            testID="gd-secret-card"
            onPress={onToggleWord}
            style={[styles.secretChip, !wordVisible && styles.secretChipHidden]}
          >
            <UiIcon name={wordVisible ? 'Eye' : 'EyeOff'} size={12} color={wordVisible ? '#FACC15' : '#94A3B8'} />
            <T
              testID={activeModalKind === 'word_reveal' ? undefined : 'gd-secret-word'}
              numberOfLines={1}
              style={[
                styles.secretChipTxt,
                !wordVisible && { color: '#CBD5E1', letterSpacing: 1 },
              ]}
            >
              {wordVisible ? wordLabel : '••••••'}
            </T>
          </Pressable>

          {roundClues.length > 0 && (
            <Pressable
              testID="gd-recap-open-btn"
              onPress={onOpenRecap}
              style={({ pressed }) => [styles.hudIconBtn, pressed && { opacity: 0.7 }]}
            >
              <T style={styles.hudIconTxt}>📋{roundClues.length}</T>
            </Pressable>
          )}

          <Pressable
            testID="gd-players-btn"
            onPress={onOpenPlayers}
            style={({ pressed }) => [styles.hudIconBtn, pressed && { opacity: 0.7 }]}
          >
            <UiIcon name="Users" size={12} color="#1E293B" />
            <T style={styles.hudIconTxt}>{view.alive.length}/{view.order.length}</T>
          </Pressable>
        </View>

        {!kbOpen && (
          <>
            <View style={styles.thinProgressTrack}>
              <View
                style={[
                  styles.thinProgressFill,
                  {
                    width: `${pct * 100}%`,
                    backgroundColor: sec <= 5 ? C.danger : meta.accent,
                  },
                ]}
              />
            </View>

            <View style={styles.hudRow2}>
              <T testID="gd-phase-callout" numberOfLines={1} style={[styles.calloutLine, compact && { fontSize: 11 }]}>
                {calloutText}
              </T>
              <View testID="gd-phase-stepper" style={styles.stepDotsRow}>
                {PHASE_STEPS.map((st, idx) => {
                  const active = meta.step === idx;
                  const done = meta.step > idx;
                  return (
                    <View
                      key={st.key}
                      style={[
                        styles.stepMiniPill,
                        done && styles.stepMiniDone,
                        active && { backgroundColor: meta.accent, borderColor: meta.accent },
                      ]}
                    >
                      <T style={[styles.stepMiniTxt, done && { color: '#15803D' }, active && { color: '#FFFFFF' }]}>
                        {st.label}
                      </T>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>

      {/* 2. Dải Thứ Tự Lượt Siêu Mỏng (chỉ hiện trong pha Khai gợi ý khi bàn phím đóng) */}
      {view.phase === 'clue_turn' && !kbOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.turnStripScroll}
          contentContainerStyle={styles.turnStripContent}
        >
          {view.speakerOrder.map((id) => {
            const seatNo = seatIndexMap.get(id);
            const active = view.currentSpeakerId === id;
            const done = clueDoneIds.has(id) && !active;
            return (
              <Pressable
                key={id}
                testID={`gd-seat-${id}`}
                onPress={onOpenPlayers}
                style={[
                  styles.turnChip,
                  done && styles.turnChipDone,
                  active && styles.turnChipActive,
                ]}
              >
                <T numberOfLines={1} style={[styles.turnChipTxt, active && { color: '#FFFFFF' }, done && { color: '#15803D' }]}>
                  {active ? '🎤 ' : done ? '✓ ' : ''}#{seatNo} {view.names[id] ?? id}
                  {id === me ? ' (Bạn)' : ''}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* 3. Khung Chat & Lời Khai Sắc Nét kiểu Messenger (chiếm trọn phần giữa) */}
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
              <T style={styles.sysTxt}>Chưa có lời khai — chờ người đầu tiên mô tả!</T>
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

            const seatNo = item.playerId ? seatIndexMap.get(item.playerId) : undefined;
            const isMine = item.playerId === me;
            const isClue = item.kind === 'clue';
            const isDef = item.kind === 'defense';
            const clockStr = formatClock(item.at);
            const seatColor = seatNo ? SEAT_COLORS[(seatNo - 1) % SEAT_COLORS.length] : '#475569';

            if (isClue || isDef) {
              return (
                <View key={item.id} style={styles.bubbleWrap}>
                  <View style={[styles.calloutCard, isClue ? styles.clueCard : styles.defenseCard]}>
                    <View style={styles.msgMetaRow}>
                      <View style={[styles.kindBadge, { backgroundColor: isClue ? '#16A34A' : '#DC2626' }]}>
                        <T style={styles.kindBadgeTxt}>
                          {isClue ? `🎤 GỢI Ý V${item.round}` : '⚖️ BIỆN MINH'}
                        </T>
                      </View>
                      {seatNo && (
                        <View style={[styles.inlineSeatTag, { backgroundColor: seatColor }]}>
                          <T style={styles.inlineSeatTxt}>#{seatNo}</T>
                        </View>
                      )}
                      <T numberOfLines={1} style={styles.calloutAuthor}>
                        {item.name}{isMine ? ' (Bạn)' : ''}
                      </T>
                      {clockStr && <T style={styles.timeMuted}>{clockStr}</T>}
                    </View>
                    <T style={[styles.calloutBody, isClue && { color: '#064E3B' }]}>
                      «{item.text}»
                    </T>
                  </View>
                </View>
              );
            }

            return (
              <View
                key={item.id}
                style={[styles.bubbleWrap, isMine ? styles.bubbleMineAlign : styles.bubbleOtherAlign]}
              >
                <View style={[styles.chatBubble, isMine ? styles.chatBubbleMine : styles.chatBubbleOther]}>
                  {!isMine && (
                    <View style={styles.chatAuthorRow}>
                      {seatNo && (
                        <View style={[styles.inlineSeatTag, { backgroundColor: seatColor }]}>
                          <T style={styles.inlineSeatTxt}>#{seatNo}</T>
                        </View>
                      )}
                      <T numberOfLines={1} style={[styles.chatAuthorName, { color: seatColor }]}>
                        {item.name}
                      </T>
                    </View>
                  )}
                  <T style={[styles.chatBody, isMine && { color: '#FFFFFF' }]}>{item.text}</T>
                  {clockStr && (
                    <T style={[styles.chatTime, isMine && { color: 'rgba(255,255,255,0.78)' }]}>
                      {clockStr}
                    </T>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* 4. Sheet Danh Sách Người Chơi & Thân Phận Đã Lộ */}
      {playersOpen && (
        <Sheet title={`🕵️ Danh Sách Phòng (${view.alive.length}/${view.order.length})`} onClose={onClosePlayers}>
          <View testID="gd-players-sheet" style={{ gap: 8 }}>
            <View style={styles.sheetTopMeta}>
              <T style={styles.sheetMetaChip}>🏷️ Chủ đề: {view.category}</T>
              {view.roleSummary && activeModalKind !== 'word_reveal' && (
                <T testID="gd-role-summary" style={styles.sheetMetaChip}>
                  🧑{view.roleSummary.dan} · 🕵️{view.roleSummary.giandiep}
                  {view.roleSummary.mrwhite > 0 ? ` · 🤍${view.roleSummary.mrwhite}` : ''}
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
                  <View style={[styles.seatNumBadge, id === me && { backgroundColor: C.gold }]}>
                    <T style={[styles.seatNumTxt, id === me && { color: '#0F172A' }]}>#{idx + 1}</T>
                  </View>
                  {pl && <Portrait p={pl} size={34} border={2} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                    <NameText fx={pl?.cosmetics?.nameFx} numberOfLines={1} style={styles.revealName}>
                      {view.names[id] ?? id}{id === me ? ' (Bạn)' : ''}
                    </NameText>
                    <T numberOfLines={1} style={{ fontSize: 11.5, color: alive ? '#475569' : '#B91C1C', fontWeight: '700' }}>
                      {!alive && elim
                        ? `💥 Bị loại V${elim.round}: ${GIAN_DIEP_ROLE_META[elim.role].emoji} ${GIAN_DIEP_ROLE_META[elim.role].name}`
                        : clue
                          ? `🎤 «${clue}»`
                          : 'Chưa khai vòng này'}
                    </T>
                  </View>
                  {votes > 0 && alive && (
                    <View style={styles.sheetVotePill}>
                      <T style={styles.sheetVoteTxt}>🗳️ {votes}</T>
                    </View>
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
            <Button
              testID="gd-reopen-counter-btn"
              variant="gold"
              icon="💥"
              title={`✨ MỞ KHUNG LẬT KÈO (${sec}s)`}
              onPress={onReopenModal}
            />
          ) : (
            <View testID="gd-chat-locked" style={styles.lockedBar}>
              <T style={styles.lockedTxt}>💥 Hãy nhập từ khóa Dân Thường trong khung phản đòn!</T>
            </View>
          )}
        </View>
      );
    }
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <T style={styles.lockedTxt}>
          {view.phase === 'spy_guess'
            ? `🕵️ Đang hồi hộp chờ Gián Điệp ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ phản đòn (${sec}s)…`
            : `🤍 Đang hồi hộp chờ Mr. White ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ (${sec}s)…`}
        </T>
      </View>
    );
  }

  if (!iAlive) {
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <T style={styles.lockedTxt}>👻 Bạn đã rời vòng suy luận — theo dõi mọi người đấu trí nhé!</T>
      </View>
    );
  }

  // Pha Nhận từ hoặc Tổng hợp lời khai: tạm khóa chat, nếu thu gọn popup thì có nút mở lại ngay
  if (view.phase === 'word_reveal' || view.phase === 'clue_summary') {
    const label =
      view.phase === 'word_reveal'
        ? `🔐 Xem từ khóa & bấm Sẵn sàng (${sec}s)`
        : `📋 Xem bảng tổng hợp lời khai (${sec}s)`;
    return (
      <View style={styles.dock}>
        {isDismissed ? (
          <Button
            testID="gd-reopen-modal-btn"
            variant="gold"
            title={label}
            onPress={onReopenModal}
          />
        ) : (
          <View testID="gd-chat-locked" style={styles.lockedBar}>
            <T style={styles.lockedTxt}>
              {view.phase === 'word_reveal'
                ? '🔒 Đang nhận từ khóa — tạm khóa khung chat.'
                : '🔒 Đang đối chiếu tất cả lời khai trước khi mở chat…'}
            </T>
          </View>
        )}
      </View>
    );
  }

  // Pha Khai Gợi Ý: chỉ người tới lượt được nhập gợi ý, người khác tuyệt đối khóa chat!
  if (view.phase === 'clue_turn') {
    if (view.currentSpeakerId === me) {
      const submitClue = async () => {
        const clean = inputVal.trim();
        if (!clean || busy) return;
        if (await act({ type: 'gd_clue', text: clean })) setInputVal('');
      };
      return (
        <View style={styles.dock}>
          {!kbOpen && (
            <T style={[styles.dockHint, { color: '#86EFAC' }]}>
              🎤 TỚI LƯỢT BẠN KHAI GỢI Ý! (Cấm nhắc «{view.myWord ?? 'từ khóa'}»)
            </T>
          )}
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="gd-clue-input"
              value={inputVal}
              onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
              onSubmitEditing={() => void submitClue()}
              placeholder="Gõ 1 câu mô tả từ khóa..."
              placeholderTextColor="#64748B"
              returnKeyType="send"
              maxLength={80}
              style={[styles.input, { borderColor: '#22C55E' }]}
            />
            <Button testID="gd-clue-submit" disabled={busy || !inputVal.trim()} title="Khai" onPress={() => void submitClue()} />
          </View>
        </View>
      );
    }

    const spName = view.names[view.currentSpeakerId ?? ''] ?? '';
    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <T style={styles.lockedTxt}>
          🔒 Chưa tới lượt — đang chờ {spName} khai gợi ý (tạm khóa chat)
        </T>
      </View>
    );
  }

  // Pha Biện Minh: chỉ bị cáo được nói
  if (view.phase === 'defense') {
    if (iAmDefendant) {
      const myReady = view.readySkip.includes(me);
      const submitDef = async () => {
        const clean = inputVal.trim();
        if (!clean || busy) return;
        if (await act({ type: 'gd_defense', text: clean })) setInputVal('');
      };
      return (
        <View style={styles.dock}>
          {!kbOpen && (
            <T style={[styles.dockHint, { color: '#FCA5A5' }]}>
              ⚖️ BẠN ĐANG BỊ NGHI NGỜ! Nhanh tay gửi lời tự bào chữa:
            </T>
          )}
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="gd-defense-input"
              value={inputVal}
              onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
              onSubmitEditing={() => void submitDef()}
              placeholder="Nhập lời biện minh của bạn..."
              placeholderTextColor="#64748B"
              returnKeyType="send"
              maxLength={120}
              style={[styles.input, { borderColor: '#EF4444' }]}
            />
            <Button testID="gd-defense-submit" small disabled={busy || !inputVal.trim()} title="Nói" onPress={() => void submitDef()} />
            <Button
              testID="gd-defense-done"
              small
              variant="paper"
              disabled={busy || myReady}
              title={myReady ? 'Đã xong' : 'Xong'}
              onPress={() => void act({ type: 'gd_ready' })}
            />
          </View>
        </View>
      );
    }

    return (
      <View testID="gd-chat-locked" style={styles.lockedBar}>
        <T style={styles.lockedTxt}>⚖️ Đang nghe bị cáo biện minh (tạm khóa chat)…</T>
      </View>
    );
  }

  // Pha Thảo Luận / Vote (khi thu gọn popup) / Phán Quyết (khi thu gọn popup): Khung Chat Messenger chuẩn!
  const sendChatLine = async (raw?: string) => {
    const clean = (raw ?? inputVal).trim();
    if (!clean || busy) return;
    if (await act({ type: 'gd_chat', text: clean })) {
      if (!raw) setInputVal('');
    }
  };

  const myReady = view.readySkip.includes(me);
  const needReady = Math.max(1, Math.ceil(view.alive.length / 2));

  return (
    <View style={styles.dock}>
      {err && <T style={styles.errTxt}>{err}</T>}

      {(view.phase === 'vote' || view.phase === 'final_vote') && isDismissed && (
        <Button
          testID={view.phase === 'vote' ? 'gd-reopen-vote-btn' : 'gd-reopen-verdict-btn'}
          variant="gold"
          icon={view.phase === 'vote' ? '🗳️' : '🔨'}
          title={
            view.phase === 'vote'
              ? `✨ MỞ BẢNG BỎ PHIẾU (${sec}s)`
              : `✨ MỞ BẢNG PHÁN QUYẾT (${sec}s)`
          }
          onPress={onReopenModal}
        />
      )}

      {view.phase === 'discussion' && !kbOpen && (
        <View style={styles.discussActionRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, minWidth: 0 }} contentContainerStyle={styles.quickRow}>
            {QUICK_CHATS.map((q) => (
              <Pressable key={q} onPress={() => void sendChatLine(q)} style={styles.quickChip}>
                <T style={styles.quickChipTxt}>{q}</T>
              </Pressable>
            ))}
          </ScrollView>
          <Button
            testID="gd-ready-btn"
            small
            variant={myReady ? 'jade' : 'ink'}
            disabled={busy || myReady}
            title={myReady ? `✓${view.readySkip.length}/${needReady}` : `🗳️ Vote ${view.readySkip.length}/${needReady}`}
            onPress={() => void act({ type: 'gd_ready' })}
          />
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          testID="gd-chat-input"
          value={inputVal}
          onChangeText={(t) => { setInputVal(t); if (err) onClearErr(); }}
          onSubmitEditing={() => void sendChatLine()}
          placeholder="Nhắn tin thảo luận với cả phòng..."
          placeholderTextColor="#64748B"
          returnKeyType="send"
          maxLength={120}
          style={styles.input}
        />
        <Button
          testID="gd-chat-send"
          small
          disabled={busy || !inputVal.trim()}
          iconNode={<UiIcon name="Send" size={14} color="#271400" />}
          title="Gửi"
          onPress={() => void sendChatLine()}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, gap: 5, minHeight: 0 },

  hudCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  hudCardKb: {
    paddingVertical: 4,
    borderRadius: 12,
  },
  hudRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  phasePillTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', fontFamily: FONT },
  hudTimerPill: {
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexShrink: 0,
  },
  hudTimerUrgent: { backgroundColor: '#DC2626' },
  hudTimerTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },

  secretChip: {
    flex: 1,
    minWidth: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  secretChipHidden: {
    backgroundColor: '#334155',
    borderColor: '#94A3B8',
  },
  secretChipTxt: {
    color: '#FDE047',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  hudIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 4,
    flexShrink: 0,
  },
  hudIconTxt: { fontSize: 11, fontWeight: '900', color: '#0F172A' },

  thinProgressTrack: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  thinProgressFill: {
    height: '100%',
  },
  hudRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calloutLine: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#1E293B',
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  stepMiniPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepMiniDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  stepMiniTxt: { fontSize: 9, fontWeight: '900', color: '#64748B' },

  turnStripScroll: { flexGrow: 0, maxHeight: 30 },
  turnStripContent: { gap: 5, paddingHorizontal: 2, alignItems: 'center' },
  turnChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  turnChipDone: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7',
  },
  turnChipActive: {
    backgroundColor: '#16A34A',
    borderColor: '#14532D',
  },
  turnChipTxt: { fontSize: 11, fontWeight: '800', color: '#334155' },

  feedContainer: {
    flex: 1,
    minHeight: 72,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
    overflow: 'hidden',
  },
  feedScroll: { flex: 1 },
  feedContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 7 },

  sysRow: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginVertical: 2,
  },
  sysTxt: { fontSize: 11, fontWeight: '800', color: '#334155', textAlign: 'center' },

  bubbleWrap: { width: '100%' },
  bubbleMineAlign: { alignItems: 'flex-end' },
  bubbleOtherAlign: { alignItems: 'flex-start' },

  calloutCard: {
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3,
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  clueCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderLeftColor: '#10B981',
  },
  defenseCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderLeftColor: '#DC2626',
  },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kindBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1.5 },
  kindBadgeTxt: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
  inlineSeatTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  inlineSeatTxt: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
  calloutAuthor: { fontSize: 11.5, fontWeight: '900', color: '#0F172A', flexShrink: 1 },
  timeMuted: { marginLeft: 'auto', fontSize: 10, fontWeight: '700', color: '#64748B' },
  calloutBody: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', lineHeight: 20 },

  chatBubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 2,
  },
  chatBubbleOther: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderTopLeftRadius: 4,
  },
  chatBubbleMine: {
    backgroundColor: '#2563EB',
    borderTopRightRadius: 4,
  },
  chatAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 1 },
  chatAuthorName: { fontSize: 11.5, fontWeight: '900', flexShrink: 1 },
  chatBody: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 19 },
  chatTime: { fontSize: 9.5, fontWeight: '700', color: '#94A3B8', alignSelf: 'flex-end' },

  sheetTopMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  sheetMetaChip: {
    backgroundColor: '#EEF2FF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 11.5,
    fontWeight: '800',
    color: '#3730A3',
  },
  playerSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  playerSheetRowDead: { opacity: 0.65, backgroundColor: '#F1F5F9' },
  sheetVotePill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sheetVoteTxt: { fontSize: 11, fontWeight: '900', color: '#92400E' },

  dock: { gap: 5 },
  dockHint: { fontSize: 11.5, fontWeight: '900', textAlign: 'center' },
  errTxt: { fontSize: 11.5, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
  lockedBar: {
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lockedTxt: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    color: '#E2E8F0',
  },
  discussActionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  quickRow: { gap: 6, paddingBottom: 1, alignItems: 'center' },
  quickChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
  },
  quickChipTxt: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(28,32,36,0.22)',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: C.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 42,
  },

  revealHeader: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    gap: 8,
  },
  revealHeadline: { flex: 1, fontSize: 14, fontWeight: '900', color: C.ink, fontFamily: FONT },
  wordCompareRow: { flexDirection: 'row', gap: 8 },
  wordBox: { flex: 1, borderRadius: 12, padding: 8, borderWidth: 1.5, alignItems: 'center', gap: 2 },
  wordBoxRole: { fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  wordBoxVal: { fontSize: 16, fontWeight: '900', fontFamily: FONT, textAlign: 'center' },
  revealList: { gap: 6, paddingVertical: 4 },
  revealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  seatNumBadge: { backgroundColor: '#1E293B', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  seatNumTxt: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  revealName: { fontSize: 13, fontWeight: '900', color: C.ink },
  revealRoleTxt: { fontSize: 11.5, fontWeight: '800' },
  revealWordPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  revealWordTxt: { color: '#FDE047', fontSize: 12.5, fontWeight: '900' },
});
