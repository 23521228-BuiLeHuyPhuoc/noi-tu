import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { useStableWindow } from '../hooks';
import { Shell, useShellTools } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { KeyboardLift } from '../components/KeyboardLift';
import { EmojiIcon, UiIcon } from '../components/Icons';

const PHASE_META: Record<GianDiepView['phase'], { title: string; emoji: string; accent: string; hint: string; step: number }> = {
  word_reveal: {
    title: 'Nhận Từ Khóa',
    emoji: '🔐',
    accent: '#0284C7',
    hint: 'Ghi nhớ từ khóa của bạn — chạm thẻ để ẩn khi ngồi cạnh bạn bè!',
    step: 0,
  },
  clue_turn: {
    title: 'Khai Gợi Ý',
    emoji: '🎤',
    accent: '#16A34A',
    hint: 'Lần lượt mô tả 1 câu về từ khóa — cấm nói thẳng từ bí mật!',
    step: 1,
  },
  discussion: {
    title: 'Thảo Luận',
    emoji: '💬',
    accent: '#2563EB',
    hint: 'Đối chiếu lời khai, chat chất vấn rồi bấm Vote để mở bỏ phiếu!',
    step: 2,
  },
  vote: {
    title: 'Bỏ Phiếu Loại',
    emoji: '🗳️',
    accent: '#D97706',
    hint: 'Chọn nghi phạm đáng ngờ nhất bên dưới để bỏ phiếu trục xuất!',
    step: 3,
  },
  defense: {
    title: 'Biện Minh',
    emoji: '⚖️',
    accent: '#DC2626',
    hint: 'Nghi phạm cao phiếu nhất lên tiếng tự bào chữa trước cả bàn!',
    step: 3,
  },
  final_vote: {
    title: 'Phán Quyết Cuối',
    emoji: '🔨',
    accent: '#9333EA',
    hint: 'Nghe biện minh xong — chọn Trục Xuất hay Tha Bổng!',
    step: 3,
  },
  mrwhite_guess: {
    title: 'Mr. White Lật Kèo',
    emoji: '🤍',
    accent: '#475569',
    hint: 'Mr. White đoán đúng từ Dân Thường sẽ thắng ngược ngay!',
    step: 3,
  },
  spy_guess: {
    title: 'Gián Điệp Phản Đòn',
    emoji: '🕵️',
    accent: '#EA580C',
    hint: 'Gián Điệp cuối bị lộ! Đoán trúng từ Dân Thường để lật kèo!',
    step: 3,
  },
  reveal_end: {
    title: 'Lật Mở Từ Khóa',
    emoji: '🔓',
    accent: '#EAB308',
    hint: 'Công bố toàn bộ thân phận & cặp từ khóa bí mật của cả bàn!',
    step: 4,
  },
};

const PHASE_STEPS = [
  { key: 'word', label: '1. Nhận từ' },
  { key: 'clue', label: '2. Gợi ý' },
  { key: 'discuss', label: '3. Bàn luận' },
  { key: 'vote', label: '4. Bỏ phiếu' },
] as const;

const QUICK_CHATS = [
  'Ai mô tả chung chung quá vậy? 👀',
  'Câu của bạn lệch hẳn chủ đề nha!',
  'Coi chừng loại nhầm Dân Thường!',
  'Nghi có Mr. White đang chép bài!',
];

const GianDiepBody = memo(function GianDiepBody({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as GianDiepView;
  const tools = useShellTools();
  const { width, height } = useStableWindow();
  const compact = height < 720 || width < 380;

  const [wordVisible, setWordVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const feedScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);

  const me = game.me ?? '';
  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const defSet = useMemo(() => new Set(view.defendants ?? []), [view.defendants]);
  const iAlive = aliveSet.has(me);
  const elimMap = useMemo(() => new Map(view.eliminated.map((e) => [e.id, e])), [view.eliminated]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const seatIndexMap = useMemo(() => new Map(view.order.map((id, idx) => [id, idx + 1])), [view.order]);

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

  const timeline: GianDiepFeedItem[] = useMemo(() => {
    if (view.timeline && view.timeline.length > 0) return view.timeline;
    return view.clues.map((c) => ({
      id: c.id,
      round: c.round,
      kind: 'clue' as const,
      playerId: c.playerId,
      name: c.name,
      text: c.text,
    }));
  }, [view.timeline, view.clues]);

  useEffect(() => {
    const t = setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [timeline.length, view.phase]);

  const meta = PHASE_META[view.phase] ?? PHASE_META.discussion;

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    const res = await game.act(payload);
    setBusy(false);
    return res.ok;
  };

  const handleTapSuspect = async (targetId: string) => {
    if (busy) return;
    if (view.phase === 'vote' && iAlive && aliveSet.has(targetId) && targetId !== me) {
      await act({ type: 'gd_vote', target: targetId });
      return;
    }
    if (
      view.phase === 'final_vote' &&
      (view.defendants?.length ?? 0) > 1 &&
      iAlive &&
      defSet.has(targetId) &&
      targetId !== me
    ) {
      await act({ type: 'gd_verdict', verdict: targetId });
      return;
    }
    if (targetId !== me) tools?.openPlayer(targetId);
  };

  const speakerSeat = view.currentSpeakerId ? seatIndexMap.get(view.currentSpeakerId) : undefined;
  const speakerName = view.currentSpeakerId ? (view.names[view.currentSpeakerId] ?? view.currentSpeakerId) : '';
  const defNames = (view.defendants ?? []).map((id) => view.names[id] ?? id).join(', ');
  const myVote = view.phase === 'final_vote' ? view.finalVotes?.[me] : view.votes[me];

  const calloutText = (() => {
    switch (view.phase) {
      case 'word_reveal':
        return view.myRole === 'mrwhite'
          ? '👀 Bạn là Mr. White — lắng nghe mọi người để đoán từ khóa!'
          : '👀 Ghi nhớ từ khóa của bạn — chạm vào khung từ để che nhanh!';
      case 'clue_turn':
        return view.currentSpeakerId === me
          ? '🎤 TỚI LƯỢT BẠN! Gõ 1 câu mô tả từ khóa ở ô bên dưới.'
          : `🎧 Đang nghe ${speakerSeat ? `#${speakerSeat} ` : ''}${speakerName} khai gợi ý...`;
      case 'discussion':
        return '💬 Trao đổi & soi lời khai! Bấm nút Vote bên dưới khi xong.';
      case 'vote':
        return myVote === 'skip'
          ? '🏳️ Bạn đang chọn Bỏ qua phiếu — có thể chạm tên khác để đổi!'
          : myVote
            ? `🗳️ Bạn đang bầu loại ${view.names[myVote] ?? myVote} — chạm tên khác để đổi!`
            : '🗳️ CHỌN 1 NGHI PHẠM BÊN DƯỚI ĐỂ BỎ PHIẾU LOẠI!';
      case 'defense':
        return defSet.has(me)
          ? '⚖️ BẠN ĐANG BỊ NGHI NGỜ! Nhanh tay viết lời biện minh bên dưới.'
          : `⚖️ Bị cáo ${defNames} đang lên tiếng biện minh...`;
      case 'final_vote':
        return (view.defendants?.length ?? 0) > 1
          ? '🔨 Đồng phiếu! Chọn 1 trong các bị cáo bên dưới để trục xuất.'
          : `🔨 Phán quyết cuối cho ${defNames}: Trục xuất hay Tha bổng?`;
      case 'mrwhite_guess':
      case 'spy_guess':
        return view.mrWhiteId === me
          ? '💥 CƠ HỘI LẬT KÈO! Gõ đúng từ Dân Thường để chiến thắng!'
          : `💥 Đang chờ ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ phản đòn...`;
      default:
        return meta.hint;
    }
  })();

  const showVotePanel =
    iAlive &&
    (view.phase === 'vote' || (view.phase === 'final_vote' && (view.defendants?.length ?? 0) > 1));

  const voteCandidates = useMemo(() => {
    if (!showVotePanel) return [];
    return view.order.filter((id) => {
      if (id === me) return false;
      if (view.phase === 'vote') return aliveSet.has(id);
      return defSet.has(id);
    });
  }, [showVotePanel, view.order, view.phase, me, aliveSet, defSet]);

  // Màn Lật Mở Toàn Bộ Từ Khóa cuối ván (Phase 33 yêu cầu đặc biệt)
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
                {pl && <Portrait p={pl} size={36} frame={pl.cosmetics?.frame} />}
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

  return (
    <View style={styles.root}>
      {/* 1. Thanh Trạng Thái Vòng Chơi + Phase Stepper 4 bước + Hướng dẫn trực tiếp */}
      <View style={[styles.topCard, compact && { paddingVertical: 5, paddingHorizontal: 9, gap: 4 }]}>
        <View style={styles.topRow}>
          <View style={[styles.phasePill, { backgroundColor: meta.accent }]}>
            <EmojiIcon emoji={meta.emoji} size={13} />
            <T style={styles.phasePillTxt}>V{view.round} · {meta.title}</T>
          </View>
          <View style={styles.catBadge}>
            <T numberOfLines={1} style={styles.catTxt}>🏷️ {view.category}</T>
          </View>
          {view.roleSummary && (
            <View testID="gd-role-summary" style={styles.roleSummaryPill}>
              <T numberOfLines={1} style={styles.roleSummaryTxt}>
                🧑{view.roleSummary.dan} · 🕵️{view.roleSummary.giandiep}
                {view.roleSummary.mrwhite > 0 ? ` · 🤍${view.roleSummary.mrwhite}` : ''}
              </T>
            </View>
          )}
        </View>

        <View testID="gd-phase-stepper" style={styles.stepperRow}>
          {PHASE_STEPS.map((st, i) => {
            const active = meta.step === i;
            const done = meta.step > i;
            return (
              <View
                key={st.key}
                style={[
                  styles.stepPill,
                  done && styles.stepPillDone,
                  active && { backgroundColor: meta.accent, borderColor: meta.accent },
                ]}
              >
                <T
                  numberOfLines={1}
                  style={[
                    styles.stepTxt,
                    done && styles.stepTxtDone,
                    active && styles.stepTxtActive,
                  ]}
                >
                  {done ? '✓ ' : ''}{st.label}
                </T>
              </View>
            );
          })}
        </View>

        <View testID="gd-phase-callout" style={[styles.calloutBox, { borderLeftColor: meta.accent }]}>
          <T numberOfLines={2} style={styles.calloutTxt}>{calloutText}</T>
        </View>

        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="gd-timer" />
      </View>

      {/* 1B. THẺ TỪ KHÓA BÍ MẬT CỠ LỚN NỔI BẬT Ở TRUNG TÂM */}
      <Pressable
        testID="gd-secret-card"
        onPress={() => setWordVisible((v) => !v)}
        style={[
          styles.heroSecretCard,
          compact && { paddingVertical: 5, paddingHorizontal: 10 },
          !wordVisible && styles.heroSecretCardHidden,
        ]}
      >
        <View style={styles.heroSecretHeader}>
          <View style={styles.heroSecretBadge}>
            <UiIcon name={wordVisible ? 'Eye' : 'EyeOff'} size={12} color="#FDE047" />
            <T style={styles.heroSecretLabel}>
              {view.myRole === 'mrwhite'
                ? 'THÂN PHẬN CỦA BẠN'
                : '🔑 TỪ KHÓA BÍ MẬT CỦA BẠN'}
            </T>
          </View>
          <T style={styles.heroSecretToggleHint}>
            {wordVisible ? 'Chạm che 🙈' : 'Chạm xem 👁️'}
          </T>
        </View>
        {wordVisible ? (
          <T
            testID="gd-secret-word"
            numberOfLines={1}
            style={[
              styles.heroSecretWord,
              compact && { fontSize: 18 },
              view.myRole === 'mrwhite' && { color: '#E2E8F0', fontSize: compact ? 15 : 17 },
            ]}
          >
            {view.myRole === 'mrwhite'
              ? '🤍 MR. WHITE (Không có từ)'
              : (view.myWord ?? '---').toUpperCase()}
          </T>
        ) : (
          <T style={styles.heroSecretMask}>•••••••••• (Đã che từ khóa)</T>
        )}
      </Pressable>

      {/* 2. DUY NHẤT 1 Hàng Nghi Phạm Đánh Số #1..#N */}
      <View style={styles.suspectWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suspectScroll}>
          {view.order.map((id, idx) => {
            const pl = playerMap.get(id);
            const alive = aliveSet.has(id);
            const elim = elimMap.get(id);
            const isSpeaking = view.currentSpeakerId === id;
            const isDef = defSet.has(id);
            const myVotedThis =
              (view.phase === 'vote' && view.votes[me] === id) ||
              (view.phase === 'final_vote' && (view.defendants?.length ?? 0) > 1 && view.finalVotes?.[me] === id);
            const votes = voteTally[id] ?? 0;
            const votable =
              (view.phase === 'vote' && iAlive && alive && id !== me) ||
              (view.phase === 'final_vote' && (view.defendants?.length ?? 0) > 1 && iAlive && isDef && id !== me);

            return (
              <Pressable
                key={id}
                testID={`gd-seat-${id}`}
                onPress={() => void handleTapSuspect(id)}
                style={[
                  styles.suspectTile,
                  compact && { width: 64, paddingVertical: 4 },
                  isSpeaking && styles.suspectSpeaking,
                  isDef && styles.suspectDefendant,
                  myVotedThis && styles.suspectVoted,
                  votable && !myVotedThis && styles.suspectVotable,
                  !alive && styles.suspectDead,
                ]}
              >
                <View style={[styles.seatBadge, id === me && { backgroundColor: C.gold }]}>
                  <T style={[styles.seatBadgeTxt, id === me && { color: '#1E293B' }]}>#{idx + 1}</T>
                </View>

                {votes > 0 && alive && (
                  <View style={styles.voteCountBadge}>
                    <T style={styles.voteCountTxt}>🗳️{votes}</T>
                  </View>
                )}

                {pl ? (
                  <Portrait p={pl} size={compact ? 26 : 30} border={2} />
                ) : (
                  <UiIcon name="User" size={24} color={C.muted} />
                )}

                <NameText
                  fx={pl?.cosmetics?.nameFx}
                  numberOfLines={1}
                  style={[styles.suspectName, !alive && styles.deadName]}
                >
                  {view.names[id] ?? id}
                </NameText>

                <T numberOfLines={1} style={[
                  styles.suspectSub,
                  isDef ? { color: '#DC2626' } : isSpeaking ? { color: '#15803D' } : undefined,
                ]}>
                  {!alive && elim
                    ? `${GIAN_DIEP_ROLE_META[elim.role].emoji} ${GIAN_DIEP_ROLE_META[elim.role].name}`
                    : isDef
                      ? '⚖️ Bị cáo'
                      : isSpeaking
                        ? '🎤 Đang khai'
                        : votable
                          ? (myVotedThis ? '✓ Đã bầu' : 'Chạm bầu')
                          : id === me
                            ? 'Bạn'
                            : 'Đang nghe'}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2B. Bảng Bỏ Phiếu Nhanh (hiện trực tiếp khi tới pha Vote / Đồng phiếu) */}
      {showVotePanel && (
        <View testID="gd-vote-panel" style={styles.votePanel}>
          <T style={styles.votePanelTitle}>
            🗳️ CHỌN NGHI PHẠM ĐỂ BỎ PHIẾU ({view.phase === 'vote' ? 'Vòng loại' : 'Đồng phiếu'}):
          </T>
          <View style={styles.voteChipWrap}>
            {voteCandidates.map((id) => {
              const seatNo = seatIndexMap.get(id);
              const votes = voteTally[id] ?? 0;
              const selected = myVote === id;
              return (
                <Pressable
                  key={id}
                  testID={`gd-vote-pick-${id}`}
                  disabled={busy}
                  onPress={() => void handleTapSuspect(id)}
                  style={[styles.votePickChip, selected && styles.votePickChipActive]}
                >
                  <T numberOfLines={1} style={[styles.votePickTxt, selected && styles.votePickTxtActive]}>
                    {selected ? '✓ ' : ''}{seatNo ? `#${seatNo} ` : ''}{view.names[id] ?? id}
                    {votes > 0 ? ` (${votes})` : ''}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {/* 3. Khung Lịch Sử Hợp Nhất kiểu Messenger — Luôn cuộn bên trong, 0 outer scroll! */}
      <View style={styles.feedContainer}>
        <View style={styles.feedHeader}>
          <EmojiIcon emoji="🕵️" size={13} />
          <T style={styles.feedHeaderTitle}>Lời Khai & Thảo Luận</T>
          <T style={styles.feedCountTxt}>
            {view.aliveCounts ? `🧑${view.aliveCounts.dan} vs 🕵️${view.aliveCounts.hidden}` : `${view.alive.length}/${view.order.length} còn lại`}
          </T>
        </View>

        <ScrollView
          ref={feedScrollRef}
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
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
            return (
              <View
                key={item.id}
                style={[
                  styles.bubbleWrap,
                  isMine ? styles.bubbleMineAlign : styles.bubbleOtherAlign,
                ]}
              >
                <View
                  style={[
                    styles.msgCard,
                    isClue && styles.msgClue,
                    isDef && styles.msgDefense,
                    !isClue && !isDef && (isMine ? styles.msgChatMine : styles.msgChat),
                  ]}
                >
                  <View style={styles.msgMetaRow}>
                    <View
                      style={[
                        styles.msgKindPill,
                        isClue
                          ? { backgroundColor: '#DCFCE7' }
                          : isDef
                            ? { backgroundColor: '#FEE2E2' }
                            : { backgroundColor: isMine ? '#BFDBFE' : '#E2E8F0' },
                      ]}
                    >
                      <T
                        style={[
                          styles.msgTag,
                          isClue ? { color: '#15803D' } : isDef ? { color: '#B91C1C' } : { color: '#1E40AF' },
                        ]}
                      >
                        {isClue ? `🎤 GỢI Ý V${item.round}` : isDef ? '⚖️ BIỆN MINH' : '💬 CHAT'}
                      </T>
                    </View>
                    <T numberOfLines={1} style={styles.msgAuthor}>
                      {seatNo ? `#${seatNo} ` : ''}{isMine ? `${item.name} (Bạn)` : item.name}
                    </T>
                  </View>
                  <T style={[styles.msgBody, isClue && { fontWeight: '800', color: '#064E3B' }]}>
                    {isClue ? `«${item.text}»` : item.text}
                  </T>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
});

const GianDiepBottomDock = memo(function GianDiepBottomDock({
  game,
  view,
}: {
  game: Game;
  view: GianDiepView;
}) {
  const me = game.me ?? '';
  const iAlive = view.alive.includes(me);
  const iAmDefendant = (view.defendants ?? []).includes(me);

  const [inputVal, setInputVal] = useState('');
  const [guessVal, setGuessVal] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [phaseKey, setPhaseKey] = useState('');

  const curPhaseKey = `${view.phase}:${view.currentSpeakerId ?? ''}`;
  if (phaseKey !== curPhaseKey) {
    setPhaseKey(curPhaseKey);
    if (err !== null) setErr(null);
  }

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Thao tác không hợp lệ');
    return res.ok;
  };

  if (view.phase === 'reveal_end') return null;

  if (view.phase === 'mrwhite_guess' || view.phase === 'spy_guess') {
    const isSpyCounter = view.phase === 'spy_guess';
    if (view.mrWhiteId === me) {
      const submitGuess = async () => {
        const clean = guessVal.trim();
        if (!clean || busy) return;
        if (await act({ type: 'gd_guess', word: clean })) setGuessVal('');
      };
      return (
        <KeyboardLift>
          <View style={styles.dock}>
            <T style={[styles.dockStatus, { color: '#FDE047' }]}>
              {isSpyCounter
                ? '🕵️ Phản đòn cuối! Đoán trúng từ của Dân Thường để LẬT KÈO THẮNG!'
                : '🤍 Cơ hội cuối! Đoán đúng từ của Dân Thường để LẬT KÈO THẮNG!'}
            </T>
            {err && <T style={styles.errTxt}>{err}</T>}
            <View style={styles.inputRow}>
              <TextInput
                testID="gd-mrwhite-input"
                value={guessVal}
                onChangeText={setGuessVal}
                onSubmitEditing={submitGuess}
                placeholder="Nhập từ khóa phe Dân Thường..."
                placeholderTextColor={C.muted}
                maxLength={50}
                style={styles.input}
              />
              <Button testID="gd-mrwhite-submit" disabled={busy || !guessVal.trim()} title="Chốt!" onPress={submitGuess} />
            </View>
          </View>
        </KeyboardLift>
      );
    }
    return (
      <T style={styles.waitTxt}>
        {isSpyCounter
          ? `🕵️ Đang hồi hộp chờ Gián Điệp ${view.names[view.mrWhiteId ?? ''] ?? ''} phản đòn đoán từ khóa…`
          : `🤍 Đang hồi hộp chờ Mr. White ${view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ khóa…`}
      </T>
    );
  }

  if (!iAlive) {
    return (
      <T style={styles.waitTxt}>
        👻 Bạn đã rời vòng suy luận — cùng xem mọi người đấu trí nhé!
      </T>
    );
  }

  // Pha 1: Tới lượt mình khai gợi ý
  if (view.phase === 'clue_turn' && view.currentSpeakerId === me) {
    const submitClue = async () => {
      const clean = inputVal.trim();
      if (!clean || busy) return;
      if (await act({ type: 'gd_clue', text: clean })) setInputVal('');
    };
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          <T style={[styles.dockStatus, { color: '#4ADE80' }]}>
            🎤 Tới lượt bạn khai! (Cấm gõ thẳng từ «{view.myWord ?? '...'}»)
          </T>
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="gd-clue-input"
              value={inputVal}
              onChangeText={(t) => { setInputVal(t); if (err) setErr(null); }}
              onSubmitEditing={submitClue}
              placeholder="Nhập câu mô tả khéo léo..."
              placeholderTextColor={C.muted}
              maxLength={80}
              style={styles.input}
            />
            <Button testID="gd-clue-submit" disabled={busy || !inputVal.trim()} title="Khai" onPress={submitClue} />
          </View>
        </View>
      </KeyboardLift>
    );
  }

  // Pha Biện Minh: nếu mình là Bị cáo
  if (view.phase === 'defense' && iAmDefendant) {
    const myReady = view.readySkip.includes(me);
    const submitDef = async () => {
      const clean = inputVal.trim();
      if (!clean || busy) return;
      if (await act({ type: 'gd_defense', text: clean })) setInputVal('');
    };
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          <T style={[styles.dockStatus, { color: '#FCA5A5' }]}>
            ⚖️ BẠN ĐANG BỊ NGHI NGỜ CAO NHẤT! Hãy biện minh tự cứu mình:
          </T>
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="gd-defense-input"
              value={inputVal}
              onChangeText={(t) => { setInputVal(t); if (err) setErr(null); }}
              onSubmitEditing={submitDef}
              placeholder="Nhập lời bào chữa thuyết phục cả phòng..."
              placeholderTextColor={C.muted}
              maxLength={120}
              style={styles.input}
            />
            <Button testID="gd-defense-submit" disabled={busy || !inputVal.trim()} title="Nói" onPress={submitDef} />
            <Button
              testID="gd-defense-done"
              variant="paper"
              disabled={busy || myReady}
              title={myReady ? 'Đã xong' : 'Xong'}
              onPress={() => void act({ type: 'gd_ready' })}
            />
          </View>
        </View>
      </KeyboardLift>
    );
  }

  // Pha Phán Quyết cuối cùng (sau Biện Minh)
  if (view.phase === 'final_vote') {
    const defs = view.defendants ?? [];
    const myVerdict = view.finalVotes?.[me];
    if (defs.length === 1) {
      const accId = defs[0];
      const accName = view.names[accId] ?? accId;
      if (accId === me && view.alive.length > 2) {
        return (
          <T style={styles.waitTxt}>
            ⚖️ Cả phòng đang bỏ phiếu phán quyết số phận của bạn…
          </T>
        );
      }
      return (
        <View style={styles.dock}>
          <T style={[styles.dockStatus, { color: '#E9D5FF' }]}>
            🔨 Phán quyết cho {accName}: {myVerdict === 'banish' ? 'Đã chọn TRỤC XUẤT' : myVerdict === 'forgive' ? 'Đã chọn THA BỔNG' : 'Hãy ra quyết định!'}
          </T>
          {err && <T style={styles.errTxt}>{err}</T>}
          <View style={styles.inputRow}>
            <Button
              testID="gd-verdict-banish"
              variant="danger"
              disabled={busy}
              icon="👎"
              title={`Trục xuất ${accName}`}
              onPress={() => void act({ type: 'gd_verdict', verdict: 'banish' })}
              style={{ flex: 1 }}
            />
            <Button
              testID="gd-verdict-forgive"
              variant="jade"
              disabled={busy}
              icon="👍"
              title="Tha bổng"
              onPress={() => void act({ type: 'gd_verdict', verdict: 'forgive' })}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.dock}>
        <T style={[styles.dockStatus, { color: '#E9D5FF' }]}>
          🔨 Chạm vào 1 trong các bị cáo đồng phiếu ở trên để loại!
        </T>
        <Button
          testID="gd-verdict-skip"
          variant="paper"
          disabled={busy}
          icon="🏳️"
          title={myVerdict === 'skip' ? 'Đã chọn Tha cả hai' : 'Tha bổng (Phiếu trắng)'}
          onPress={() => void act({ type: 'gd_verdict', verdict: 'skip' })}
        />
      </View>
    );
  }

  // Mặc định (Đang nghe người khác khai / Thảo luận / Bỏ phiếu / Nghe biện minh): Luôn có ô Chat thảo luận trực tiếp!
  const sendChatLine = async (raw?: string) => {
    const clean = (raw ?? inputVal).trim();
    if (!clean || busy) return;
    if (await act({ type: 'gd_chat', text: clean })) {
      if (!raw) setInputVal('');
    }
  };

  const myReady = view.readySkip.includes(me);
  const needReady = Math.max(1, Math.ceil(view.alive.length / 2));
  const myVote = view.votes[me];

  return (
    <KeyboardLift>
      <View style={styles.dock}>
        {err && <T style={styles.errTxt}>{err}</T>}

        {view.phase === 'discussion' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_CHATS.map((q) => (
              <Pressable key={q} onPress={() => void sendChatLine(q)} style={styles.quickChip}>
                <T style={styles.quickChipTxt}>{q}</T>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {view.phase === 'vote' && (
          <View style={styles.voteActionRow}>
            <T numberOfLines={1} style={[styles.dockStatus, { flex: 1, textAlign: 'left', color: '#FDE047' }]}>
              {myVote === 'skip'
                ? '🏳️ Đã bỏ phiếu trắng'
                : myVote
                  ? `🗳️ Đang bầu loại: ${view.names[myVote]}`
                  : '👆 Chọn tên ở trên hoặc Bỏ qua'}
            </T>
            <Button
              testID="gd-skip-vote"
              variant="paper"
              disabled={busy}
              icon="🏳️"
              title="Bỏ qua"
              onPress={() => void act({ type: 'gd_vote', target: 'skip' })}
            />
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            testID="gd-chat-input"
            value={inputVal}
            onChangeText={(t) => { setInputVal(t); if (err) setErr(null); }}
            onSubmitEditing={() => void sendChatLine()}
            placeholder={
              view.phase === 'clue_turn'
                ? `Đang nghe ${view.names[view.currentSpeakerId ?? ''] ?? ''} khai — chat bàn luận...`
                : 'Chat suy luận trực tiếp với cả phòng...'
            }
            placeholderTextColor={C.muted}
            maxLength={120}
            style={styles.input}
          />
          <Button
            testID="gd-chat-send"
            disabled={busy || !inputVal.trim()}
            iconNode={<UiIcon name="Send" size={14} color="#271400" />}
            title="Gửi"
            onPress={() => void sendChatLine()}
          />
          {view.phase === 'discussion' && (
            <Button
              testID="gd-ready-btn"
              variant={myReady ? 'jade' : 'ink'}
              disabled={busy || myReady}
              title={myReady ? `✓ ${view.readySkip.length}/${needReady}` : `Vote (${view.readySkip.length}/${needReady})`}
              onPress={() => void act({ type: 'gd_ready' })}
            />
          )}
        </View>
      </View>
    </KeyboardLift>
  );
});

export function GianDiepScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as GianDiepView;
  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      bottom={<GianDiepBottomDock game={game} view={view} />}
    >
      <GianDiepBody game={game} room={room} />
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 6, minHeight: 0 },

  topCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  phasePillTxt: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '900', fontFamily: FONT },
  catBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.3)',
    maxWidth: 110,
  },
  catTxt: { fontSize: 10.5, fontWeight: '800', color: '#92400E' },
  roleSummaryPill: {
    marginLeft: 'auto',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  roleSummaryTxt: { fontSize: 10, fontWeight: '900', color: '#3730A3' },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  stepPillDone: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  stepTxt: { fontSize: 9.5, fontWeight: '800', color: '#64748B' },
  stepTxtDone: { color: '#15803D' },
  stepTxtActive: { color: '#FFFFFF', fontWeight: '900' },

  calloutBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderLeftWidth: 3.5,
  },
  calloutTxt: { fontSize: 11.5, fontWeight: '800', color: '#0F172A', lineHeight: 15 },

  heroSecretCard: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 2,
    borderWidth: 2,
    borderColor: '#FACC15',
    alignItems: 'center',
  },
  heroSecretCardHidden: { borderColor: '#64748B', backgroundColor: '#1E293B' },
  heroSecretHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroSecretBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroSecretLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  heroSecretToggleHint: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  heroSecretWord: {
    color: '#FDE047',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 1.0,
    textAlign: 'center',
    fontFamily: FONT,
  },
  heroSecretMask: { color: '#CBD5E1', fontSize: 14, fontWeight: '800', paddingVertical: 2 },

  suspectWrap: {
    backgroundColor: 'rgba(15,23,42,0.28)',
    borderRadius: 14,
    paddingVertical: 4,
    paddingHorizontal: 3,
  },
  suspectScroll: { gap: 5, paddingHorizontal: 4 },
  suspectTile: {
    width: 68,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 4,
    gap: 2,
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.12)',
    position: 'relative',
    overflow: 'hidden',
  },
  suspectSpeaking: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  suspectDefendant: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  suspectVoted: { borderColor: '#EAB308', backgroundColor: '#FEFCE8' },
  suspectVotable: { borderColor: '#60A5FA' },
  suspectDead: { opacity: 0.52, backgroundColor: '#CBD5E1' },

  seatBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    zIndex: 3,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  seatBadgeTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  voteCountBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    zIndex: 3,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  voteCountTxt: { color: '#92400E', fontSize: 9, fontWeight: '900' },
  suspectName: { fontSize: 10.5, fontWeight: '900', color: C.ink, maxWidth: '100%' },
  deadName: { textDecorationLine: 'line-through', color: '#64748B' },
  suspectSub: { fontSize: 9, fontWeight: '800', color: '#64748B' },

  votePanel: {
    backgroundColor: 'rgba(255,251,235,0.97)',
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 6,
    gap: 5,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  votePanelTitle: { fontSize: 11, fontWeight: '900', color: '#92400E' },
  voteChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  votePickChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D97706',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 165,
  },
  votePickChipActive: {
    backgroundColor: '#D97706',
    borderColor: '#92400E',
  },
  votePickTxt: { fontSize: 11.5, fontWeight: '900', color: '#78350F' },
  votePickTxtActive: { color: '#FFFFFF' },

  feedContainer: {
    flex: 1,
    minHeight: 72,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
    overflow: 'hidden',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  feedHeaderTitle: { flex: 1, fontSize: 11.5, fontWeight: '900', color: '#1E293B' },
  feedCountTxt: { fontSize: 10.5, fontWeight: '800', color: '#64748B' },
  feedScroll: { flex: 1 },
  feedContent: { padding: 8, gap: 6 },

  sysRow: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginVertical: 2,
  },
  sysTxt: { fontSize: 10.5, fontWeight: '800', color: '#334155', textAlign: 'center' },

  bubbleWrap: { width: '100%' },
  bubbleMineAlign: { alignItems: 'flex-end' },
  bubbleOtherAlign: { alignItems: 'flex-start' },
  msgCard: {
    maxWidth: '90%',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 3,
    borderWidth: 1,
  },
  msgClue: { backgroundColor: '#ECFDF5', borderColor: '#6EE7B7', maxWidth: '96%' },
  msgDefense: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1.5, maxWidth: '96%' },
  msgChat: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1', borderTopLeftRadius: 4 },
  msgChatMine: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD', borderTopRightRadius: 4 },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  msgKindPill: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5 },
  msgTag: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.2 },
  msgAuthor: { fontSize: 11, fontWeight: '900', color: '#0F172A', flexShrink: 1 },
  msgBody: { fontSize: 13.5, fontWeight: '600', color: '#0F172A', lineHeight: 18 },

  dock: { gap: 6 },
  dockStatus: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  waitTxt: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', color: '#E2E8F0', paddingVertical: 4 },
  errTxt: { fontSize: 11.5, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
  quickRow: { gap: 6, paddingBottom: 2 },
  quickChip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.16)',
  },
  quickChipTxt: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
  voteActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(28,32,36,0.22)',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    color: C.ink,
    fontSize: 13.5,
    fontWeight: '700',
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
