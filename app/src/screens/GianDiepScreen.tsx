import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
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

const PHASE_META: Record<GianDiepView['phase'], { title: string; emoji: string; accent: string; hint: string }> = {
  word_reveal: {
    title: 'Nhận Từ Khóa',
    emoji: '🔐',
    accent: '#0284C7',
    hint: 'Ghi nhớ từ khóa ở góc phải trên (chạm để che khi ngồi cạnh bạn bè)!',
  },
  clue_turn: {
    title: 'Khai Gợi Ý',
    emoji: '🎤',
    accent: '#16A34A',
    hint: 'Lần lượt mô tả 1 câu về từ khóa — cấm nhắc trực tiếp từ bí mật!',
  },
  discussion: {
    title: 'Thảo Luận',
    emoji: '💬',
    accent: '#2563EB',
    hint: 'Đối chiếu lời khai & chat chất vấn ngay bên dưới trước khi bỏ phiếu!',
  },
  vote: {
    title: 'Bỏ Phiếu Nghi Phạm',
    emoji: '🗳️',
    accent: '#D97706',
    hint: 'Chạm trực tiếp vào Avatar nghi phạm ở hàng trên để bầu!',
  },
  defense: {
    title: 'Pha Biện Minh',
    emoji: '⚖️',
    accent: '#DC2626',
    hint: 'Nghi phạm cao phiếu nhất lên tiếng tự bào chữa trước cả phòng!',
  },
  final_vote: {
    title: 'Phán Quyết Cuối',
    emoji: '🔨',
    accent: '#9333EA',
    hint: 'Nghe biện minh xong — quyết định Trục Xuất hay Tha Bổng!',
  },
  mrwhite_guess: {
    title: 'Mr. White Lật Kèo',
    emoji: '🤍',
    accent: '#475569',
    hint: 'Mr. White đoán đúng từ của Dân Thường sẽ thắng ngược ngay lập tức!',
  },
  reveal_end: {
    title: 'Lật Mở Từ Khóa',
    emoji: '🔓',
    accent: '#EAB308',
    hint: 'Công bố toàn bộ thân phận & cặp từ khóa bí mật của cả bàn!',
  },
};

const QUICK_CHATS = [
  'Ai mô tả chung chung quá vậy? 👀',
  'Câu của bạn lệch hẳn chủ đề nha!',
  'Coi chừng loại nhầm Dân Thường!',
  'Nghi có Mr. White đang chép bài!',
];

function GianDiepBody({ game, room }: { game: Game; room: RoomState }) {
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
      {/* 1. Thanh Đỉnh Gọn Nhẹ + Thẻ Từ Khóa Bí Mật 1 chạm */}
      <View style={[styles.topCard, compact && { paddingVertical: 7, paddingHorizontal: 10 }]}>
        <View style={styles.topRow}>
          <View style={[styles.phasePill, { backgroundColor: meta.accent }]}>
            <EmojiIcon emoji={meta.emoji} size={14} />
            <T style={styles.phasePillTxt}>V{view.round} · {meta.title}</T>
          </View>
          <View style={styles.catBadge}>
            <T numberOfLines={1} style={styles.catTxt}>🏷️ {view.category}</T>
          </View>

          <Pressable
            testID="gd-secret-card"
            onPress={() => setWordVisible((v) => !v)}
            style={[styles.secretPill, !wordVisible && styles.secretPillHidden]}
          >
            <UiIcon name={wordVisible ? 'Eye' : 'Lock'} size={13} color="#FDE047" />
            {wordVisible ? (
              <T testID="gd-secret-word" numberOfLines={1} style={styles.secretPillWord}>
                {view.myRole === 'mrwhite' ? 'MR. WHITE' : (view.myWord ?? '---')}
              </T>
            ) : (
              <T style={styles.secretPillMask}>Đã che từ</T>
            )}
          </Pressable>
        </View>
        <T numberOfLines={1} style={styles.hintTxt}>{meta.hint}</T>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="gd-timer" />
      </View>

      {/* 2. DUY NHẤT 1 Hàng Avatar Nghi Phạm Đánh Số #1..#N (Bỏ hoàn toàn lặp 2 hàng avatar!) */}
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
              (view.phase === 'final_vote' && view.finalVotes?.[me] === id);
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
                  compact && { width: 68, paddingVertical: 5 },
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
                  <Portrait p={pl} size={compact ? 32 : 36} border={2} />
                ) : (
                  <UiIcon name="User" size={26} color={C.muted} />
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

      {/* 3. Khung Lịch Sử Hợp Nhất (Miêu Tả + Biện Minh + Chat Suy Luận) — Luôn hiện giữa màn hình! */}
      <View style={styles.feedContainer}>
        <View style={styles.feedHeader}>
          <EmojiIcon emoji="🕵️" size={14} />
          <T style={styles.feedHeaderTitle}>Hồ Sơ Lời Khai & Thảo Luận Trực Tiếp</T>
          <T style={styles.feedCountTxt}>{view.alive.length}/{view.order.length} còn lại</T>
        </View>

        <ScrollView
          ref={feedScrollRef}
          style={styles.feedScroll}
          contentContainerStyle={styles.feedContent}
          keyboardShouldPersistTaps="handled"
        >
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
                  styles.msgCard,
                  isClue && styles.msgClue,
                  isDef && styles.msgDefense,
                  !isClue && !isDef && (isMine ? styles.msgChatMine : styles.msgChat),
                ]}
              >
                <View style={styles.msgMetaRow}>
                  <T style={[
                    styles.msgTag,
                    isClue ? { color: '#15803D' } : isDef ? { color: '#B91C1C' } : { color: '#1D4ED8' },
                  ]}>
                    {isClue ? `🎤 GỢI Ý V${item.round}` : isDef ? '⚖️ BIỆN MINH' : '💬 THẢO LUẬN'}
                  </T>
                  <T numberOfLines={1} style={styles.msgAuthor}>
                    {seatNo ? `#${seatNo} ` : ''}{item.name}
                  </T>
                </View>
                <T style={[styles.msgBody, isClue && { fontWeight: '800' }]}>
                  {isClue ? `«${item.text}»` : item.text}
                </T>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );

  // Ghi chú: Thanh điều khiển đáy ghim qua `bottom` của `<Shell>` bên ngoài để tự nâng khi bật bàn phím
}

export function GianDiepScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as GianDiepView;
  const me = game.me ?? '';
  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const defSet = useMemo(() => new Set(view.defendants ?? []), [view.defendants]);
  const iAlive = aliveSet.has(me);
  const iAmDefendant = defSet.has(me);

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

  const renderBottom = () => {
    if (view.phase === 'reveal_end') return undefined;

    if (view.phase === 'mrwhite_guess') {
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
                🤍 Cơ hội cuối! Đoán đúng từ của Dân Thường để LẬT KÈO THẮNG!
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
          🤍 Đang hồi hộp chờ Mr. White {view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ khóa…
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
            🔨 Chạm vào 1 trong các bị cáo đồng phiếu ở hàng trên để loại!
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
                    : '👆 Chạm nghi phạm ở hàng trên để bầu!'}
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
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip bottom={renderBottom()}>
      <GianDiepBody game={game} room={room} />
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, gap: 8, minHeight: 0 },

  topCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  phasePillTxt: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', fontFamily: FONT },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.3)',
    maxWidth: 110,
  },
  catTxt: { fontSize: 11, fontWeight: '800', color: '#92400E' },

  secretPill: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#FACC15',
    maxWidth: 155,
  },
  secretPillHidden: { borderColor: '#64748B', backgroundColor: '#1E293B' },
  secretPillWord: { color: '#FDE047', fontSize: 12, fontWeight: '900', fontFamily: FONT },
  secretPillMask: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  hintTxt: { fontSize: 11.5, fontWeight: '700', color: '#475569' },

  suspectWrap: {
    backgroundColor: 'rgba(15,23,42,0.28)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  suspectScroll: { gap: 6, paddingHorizontal: 4 },
  suspectTile: {
    width: 74,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
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
  seatBadgeTxt: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
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
  voteCountTxt: { color: '#92400E', fontSize: 9.5, fontWeight: '900' },
  suspectName: { fontSize: 11, fontWeight: '900', color: C.ink, maxWidth: '100%' },
  deadName: { textDecorationLine: 'line-through', color: '#64748B' },
  suspectSub: { fontSize: 9.5, fontWeight: '800', color: '#64748B' },

  feedContainer: {
    flex: 1,
    minHeight: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
    overflow: 'hidden',
  },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  feedHeaderTitle: { flex: 1, fontSize: 12, fontWeight: '900', color: '#1E293B' },
  feedCountTxt: { fontSize: 11, fontWeight: '800', color: '#64748B' },
  feedScroll: { flex: 1 },
  feedContent: { padding: 10, gap: 6 },

  sysRow: {
    alignSelf: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginVertical: 2,
  },
  sysTxt: { fontSize: 11, fontWeight: '800', color: '#334155', textAlign: 'center' },

  msgCard: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
    borderWidth: 1,
  },
  msgClue: { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' },
  msgDefense: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1.5 },
  msgChat: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  msgChatMine: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msgTag: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
  msgAuthor: { fontSize: 11.5, fontWeight: '900', color: '#0F172A', flex: 1 },
  msgBody: { fontSize: 13, fontWeight: '600', color: '#1E293B' },

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
