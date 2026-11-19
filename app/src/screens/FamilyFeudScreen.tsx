import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { FamilyFeudView, FeudSlotView, FeudTeam } from '../../../shared/src/familyfeud-types';
import type { RoomState } from '../../../shared/src/types';
import { actionText } from '../messages';
import { useOnChange, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { C, backdropPalette } from '../theme';
import type { Game } from '../useGame';
import { Button, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { CountdownBar } from '../components/TimerBar';
import { UiIcon } from '../components/Icons';

const ROW_PAIRS: [number, number][] = [
  [0, 3],
  [1, 4],
  [2, 5],
];

const QUICK_TEAM_CALLS = [
  'Để tui gõ câu này!',
  'Cẩn thận dính gậy X!',
  'Nhường cho nó hố đi!',
  'Gần đúng rồi, đổi từ ngắn!',
];

function FeudTile({
  slot,
  showAll,
  compact,
  justRevealed,
}: {
  slot: FeudSlotView;
  showAll: boolean;
  compact: boolean;
  justRevealed: boolean;
}) {
  const revealed = slot.revealed;
  const visible = revealed || showAll;
  const teamAccent = slot.revealedBy === 'red' ? '#DC2626' : slot.revealedBy === 'blue' ? '#2563EB' : C.muted;

  return (
    <View
      testID={`ff-slot-${slot.index}`}
      style={[
        styles.tile,
        revealed
          ? styles.tileRevealed
          : showAll
            ? styles.tileMissed
            : styles.tileHidden,
        justRevealed && styles.tileFlash,
        revealed && { borderColor: teamAccent },
      ]}
    >
      <View
        style={[
          styles.rankBadge,
          revealed ? { backgroundColor: teamAccent } : showAll ? { backgroundColor: C.muted } : styles.rankBadgeHidden,
        ]}
      >
        <T style={[styles.rankTxt, (revealed || showAll) && { color: '#FFFFFF' }]}>{slot.index + 1}</T>
      </View>

      {visible ? (
        <>
          <T
            numberOfLines={2}
            style={[
              styles.tileText,
              compact && styles.tileTextCompact,
              !revealed && { color: C.secondary },
            ]}
          >
            {slot.text ?? '—'}
          </T>
          <View style={[styles.ptsPill, !revealed && { backgroundColor: 'rgba(100,116,139,0.16)' }]}>
            <T style={[styles.ptsTxt, !revealed && { color: C.secondary }]}>{slot.points ?? 0}</T>
          </View>
        </>
      ) : (
        <View style={styles.hiddenBars}>
          <View style={styles.hiddenBarLong} />
          <View style={styles.hiddenBarShort} />
        </View>
      )}
    </View>
  );
}

export function FamilyFeudScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as FamilyFeudView;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const feed = useFeed();
  const { width, height } = useStableWindow();
  const compact = height < 700 || width < 380;

  const [answerText, setAnswerText] = useState('');
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [seenChatId, setSeenChatId] = useState(0);

  const myTeam: FeudTeam | null = view.myTeam;
  const lastTeamMsg = view.teamChat.at(-1) ?? null;
  const unreadTeam = chatOpen ? 0 : view.teamChat.filter((m) => m.id > seenChatId && m.fromId !== game.me).length;

  const revealedCount = useMemo(() => view.slots.filter((s) => s.revealed).length, [view.slots]);
  const lastAttempt = view.attempts.at(-1) ?? null;

  useOnChange(view.round, () => {
    playMemePool('shock', { cooldownMs: 1400 });
    play('turn');
  });

  useOnChange(revealedCount, (cur) => {
    if (cur > 0) {
      playMemePool('correct', { cooldownMs: 900 });
      play('stamp');
    }
  });

  useOnChange(view.strikes, (cur) => {
    if (cur > 0) {
      playMemePool('wrong', { cooldownMs: 900 });
      play('error');
    }
  });

  useOnChange(view.phase, (ph) => {
    if (ph === 'steal') {
      playMemePool('twist', { cooldownMs: 1200 });
      play('sparkle');
    }
  });

  const canAnswer = useMemo(() => {
    if (!game.me || !myTeam) return false;
    if (view.phase === 'faceoff') {
      const expected = myTeam === 'red' ? view.faceoffRedId : view.faceoffBlueId;
      return game.me === expected && !view.faceoffSubmitted[myTeam];
    }
    if (view.phase === 'play') {
      return myTeam === view.controllingTeam && game.me === view.activePlayerId;
    }
    if (view.phase === 'steal') {
      return view.controllingTeam !== null && myTeam !== view.controllingTeam;
    }
    return false;
  }, [game.me, myTeam, view]);

  const canDecide = view.phase === 'decide' && myTeam !== null && myTeam === view.faceoffWinner;

  const submitAnswer = async () => {
    const clean = answerText.trim();
    if (!clean || busy || !canAnswer) return;
    setBusy(true);
    const res = await game.act({ type: 'ff_answer', text: clean });
    setBusy(false);
    if (!res.ok) {
      if (res.reason === 'used') {
        playMemePool('troll', { cooldownMs: 1200 });
        play('pop');
        feed('Đáp án này đã được mở trên bảng rồi — gõ ý khác nhé!', 'info');
      } else {
        playMemePool('wrong', { cooldownMs: 1200 });
        play('error');
        feed(actionText[res.reason] ?? 'Chưa gửi được đáp án', 'bad');
      }
      return;
    }
    playMemePool('turn_move', { cooldownMs: 2500 });
    play('pop');
    setAnswerText('');
  };

  const sendDecide = async (choice: 'play' | 'pass') => {
    if (busy || !canDecide) return;
    setBusy(true);
    const res = await game.act({ type: 'ff_decide', choice });
    setBusy(false);
    if (!res.ok) {
      feed(actionText[res.reason] ?? 'Không chọn được', 'bad');
    } else {
      playMemePool(choice === 'play' ? 'turn_move' : 'twist', { cooldownMs: 1200 });
      play('pop');
    }
  };

  const sendTeamChat = async (textOverride?: string) => {
    const txt = (textOverride ?? chatInput).trim();
    if (!txt || !myTeam) return;
    const res = await game.act({ type: 'ff_team_chat', text: txt });
    if (res.ok) {
      if (!textOverride) setChatInput('');
      play('pop');
    }
  };

  const activeName = view.activePlayerId ? (view.names[view.activePlayerId] ?? 'Đồng đội') : 'Cả bàn';
  const stealTeamName = view.controllingTeam === 'red' ? 'Xanh' : 'Đỏ';

  const statusText = (() => {
    if (view.phase === 'reveal_beat' && view.spotlight) {
      return `${view.spotlight.title}${view.spotlight.detail ? ` · ${view.spotlight.detail}` : ''}`;
    }
    if (view.phase === 'faceoff') {
      const rName = view.faceoffRedId ? (view.names[view.faceoffRedId] ?? 'Đỏ') : 'Đỏ';
      const bName = view.faceoffBlueId ? (view.names[view.faceoffBlueId] ?? 'Xanh') : 'Xanh';
      if (canAnswer) return '⚡ ĐỐI ĐẦU: Nhập từ ngắn (1–4 chữ) chốt ngay!';
      return `Đối đầu: ${rName} (Đỏ) vs ${bName} (Xanh)`;
    }
    if (view.phase === 'decide') {
      return `Đội ${view.faceoffWinner === 'red' ? 'Đỏ' : 'Xanh'} chọn Chơi tiếp hoặc Nhường lượt`;
    }
    if (view.phase === 'play') {
      return canAnswer ? '🔥 Tới lượt BẠN trả lời (gõ 1–4 chữ)!' : `Đội ${view.controllingTeam === 'red' ? 'Đỏ' : 'Xanh'} · Lượt ${activeName}`;
    }
    if (view.phase === 'steal') {
      return canAnswer ? `💥 CƠ HỘI CƯỚP ${view.roundBank}đ — Hội ý rồi chốt 1 ý!` : `Đội ${stealTeamName} đang hội ý cướp điểm!`;
    }
    return `Tổng kết vòng ${view.round}/${view.maxRounds} — xem đáp án còn lại!`;
  })();

  const spotStyle = (() => {
    const tone = view.phase === 'reveal_beat' || view.phase === 'round_end' ? view.spotlight?.tone : undefined;
    if (tone === 'hit') return { backgroundColor: '#DCFCE7', borderColor: C.jade };
    if (tone === 'miss') return { backgroundColor: '#FEE2E2', borderColor: '#DC2626' };
    if (tone === 'steal') return { backgroundColor: '#FEF3C7', borderColor: '#D97706' };
    return null;
  })();

  const bottomBar = canDecide ? (
    <View style={styles.decideRow}>
      <Button
        testID="ff-decide-play"
        title="🔥 CHƠI TIẾP"
        variant="jade"
        small
        disabled={busy}
        style={{ flex: 1 }}
        onPress={() => sendDecide('play')}
      />
      <Button
        testID="ff-decide-pass"
        title="🤝 NHƯỜNG LƯỢT"
        variant="paper"
        small
        disabled={busy}
        style={{ flex: 1 }}
        onPress={() => sendDecide('pass')}
      />
    </View>
  ) : canAnswer ? (
    <View style={styles.inputRow}>
      <TextInput
        testID="ff-input"
        value={answerText}
        onChangeText={setAnswerText}
        placeholder="Nhập câu ngắn 1–4 chữ…"
        placeholderTextColor="#9CA3AF"
        returnKeyType="send"
        onSubmitEditing={submitAnswer}
        maxLength={60}
        style={styles.textInput}
      />
      <Button
        testID="ff-send"
        title="Gửi"
        variant="ink"
        small
        disabled={busy || answerText.trim().length < 2}
        onPress={submitAnswer}
      />
    </View>
  ) : (
    <View style={styles.waitDock}>
      <T numberOfLines={1} style={[styles.waitTxt, { color: pal.muted }]}>{statusText}</T>
    </View>
  );

  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      keyboardAware
      bottom={bottomBar}
    >
      <View style={styles.container}>
        {/* 1. Thanh điểm 2 đội + Quỹ vòng + Nút thảo luận đội */}
        <View style={styles.hudBar}>
          <Pressable
            onPress={() => setInfoOpen(true)}
            style={[styles.teamPill, styles.redPill, myTeam === 'red' && styles.myTeamGlow]}
          >
            <T style={styles.teamLabel}>ĐỎ ({view.teams.red.length})</T>
            <T style={styles.teamScore}>{view.scores.red}</T>
          </Pressable>

          <View style={styles.centerHud}>
            <View style={styles.bankRow}>
              <T style={styles.roundBadge}>V{view.round}/{view.maxRounds} · ×{view.multiplier}</T>
              <View style={styles.bankChip}>
                <T style={styles.bankTxt}>Quỹ {view.roundBank}</T>
              </View>
              {myTeam && (
                <Pressable
                  testID="ff-team-chat-btn"
                  onPress={() => {
                    if (lastTeamMsg) setSeenChatId(lastTeamMsg.id);
                    setChatOpen(true);
                  }}
                  hitSlop={6}
                  style={[styles.chatTeamBtn, unreadTeam > 0 && styles.chatTeamUnread]}
                >
                  <UiIcon name="MessageCircle" size={13} color={unreadTeam > 0 ? '#FFFFFF' : C.ink} strokeWidth={2} />
                  {unreadTeam > 0 && <T style={styles.unreadTxt}>{unreadTeam}</T>}
                </Pressable>
              )}
              <Pressable onPress={() => setInfoOpen(true)} hitSlop={6} style={styles.infoBtn}>
                <UiIcon name="Users" size={13} color={C.ink} strokeWidth={2} />
              </Pressable>
            </View>
            <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} />
          </View>

          <Pressable
            onPress={() => setInfoOpen(true)}
            style={[styles.teamPill, styles.bluePill, myTeam === 'blue' && styles.myTeamGlow]}
          >
            <T style={styles.teamLabel}>XANH ({view.teams.blue.length})</T>
            <T style={styles.teamScore}>{view.scores.blue}</T>
          </Pressable>
        </View>

        {/* 2. Câu hỏi khảo sát + 3 gậy X */}
        <View style={styles.questionCard}>
          <View style={styles.qHeadRow}>
            <View style={styles.catChip}>
              <T numberOfLines={1} style={styles.catTxt}>{view.category}</T>
            </View>
            <View style={styles.strikeRow}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.strikeBox, i < view.strikes && styles.strikeBoxOn]}>
                  <T style={[styles.strikeX, i < view.strikes && styles.strikeXOn]}>✕</T>
                </View>
              ))}
            </View>
          </View>
          <T numberOfLines={compact ? 2 : 3} style={[styles.questionTxt, compact && styles.questionTxtCompact]}>
            {view.question}
          </T>
        </View>

        {/* 3. Bảng 6 ô đáp án ngắn gọn (2 cột x 3 hàng co giãn vừa khít màn hình, 0 scroll) */}
        <View style={styles.board}>
          {ROW_PAIRS.map(([leftIdx, rightIdx]) => (
            <View key={leftIdx} style={styles.boardRow}>
              <FeudTile
                slot={view.slots[leftIdx]}
                showAll={view.phase === 'round_end'}
                compact={compact}
                justRevealed={lastAttempt?.hitIndex === leftIdx}
              />
              <FeudTile
                slot={view.slots[rightIdx]}
                showAll={view.phase === 'round_end'}
                compact={compact}
                justRevealed={lastAttempt?.hitIndex === rightIdx}
              />
            </View>
          ))}
        </View>

        {/* 4. Dòng diễn biến spotlight / chat đồng đội mới nhất (1 dòng gọn) */}
        <Pressable
          onPress={() => (unreadTeam > 0 && myTeam ? setChatOpen(true) : setInfoOpen(true))}
          style={[styles.eventBar, spotStyle]}
        >
          <T numberOfLines={1} style={styles.eventTxt}>
            {unreadTeam > 0 && lastTeamMsg
              ? `💬 ${lastTeamMsg.fromName}: ${lastTeamMsg.text}`
              : (view.phase === 'reveal_beat' || view.phase === 'round_end') && view.spotlight
                ? `${view.spotlight.title}${view.spotlight.detail ? ` — ${view.spotlight.detail}` : ''}`
                : (view.lastEvent ?? statusText)}
          </T>
          <UiIcon name="History" size={13} color={C.secondary} />
        </Pressable>
      </View>

      {/* Sheet Kênh Thảo Luận Riêng Của Đội */}
      {chatOpen && myTeam && (
        <Sheet
          title={`Hội ý riêng Đội ${myTeam === 'red' ? 'Đỏ' : 'Xanh'}`}
          onClose={() => {
            if (lastTeamMsg) setSeenChatId(lastTeamMsg.id);
            setChatOpen(false);
          }}
          stickyTop={
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              {QUICK_TEAM_CALLS.map((qTxt) => (
                <Pressable key={qTxt} onPress={() => sendTeamChat(qTxt)} style={styles.quickChip}>
                  <T style={styles.quickTxt}>{qTxt}</T>
                </Pressable>
              ))}
            </ScrollView>
          }
          stickyBottom={
            <View style={styles.inputRow}>
              <TextInput
                testID="ff-team-chat-input"
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Nhắn riêng cho đồng đội..."
                placeholderTextColor="#9CA3AF"
                maxLength={140}
                returnKeyType="send"
                onSubmitEditing={() => sendTeamChat()}
                style={styles.textInput}
              />
              <Button testID="ff-team-chat-send" small variant="ink" title="Gửi" onPress={() => sendTeamChat()} />
            </View>
          }
        >
          <View style={{ gap: 6 }}>
            {view.teamChat.length === 0 ? (
              <T style={{ color: C.muted, fontSize: 13 }}>
                Đội đối phương không thấy kênh này! Hãy bàn đáp án với đồng đội trước khi chốt.
              </T>
            ) : (
              view.teamChat.map((m) => (
                <View key={m.id} style={[styles.chatMsgRow, m.fromId === game.me && styles.chatMsgMine]}>
                  <T style={{ fontSize: 12, fontWeight: '800', color: myTeam === 'red' ? '#B91C1C' : '#1D4ED8' }}>
                    {m.fromName}
                  </T>
                  <T style={{ fontSize: 13.5, color: C.ink }}>{m.text}</T>
                </View>
              ))
            )}
          </View>
        </Sheet>
      )}

      {/* Sheet Đội hình & Lịch sử đoán */}
      {infoOpen && (
        <Sheet title="Đội hình & Lịch sử đoán" onClose={() => setInfoOpen(false)}>
          <View style={{ gap: 10 }}>
            <View style={styles.sheetTeamRow}>
              <View style={[styles.sheetTeamCard, { borderColor: '#DC2626', backgroundColor: '#FEF2F2' }]}>
                <T style={[styles.sheetTeamTitle, { color: '#B91C1C' }]}>ĐỘI ĐỎ · {view.scores.red}đ</T>
                {view.teams.red.map((id) => (
                  <T key={id} style={styles.sheetMember}>
                    {id === game.me ? '★ ' : '• '}
                    {view.names[id] ?? id}
                  </T>
                ))}
              </View>
              <View style={[styles.sheetTeamCard, { borderColor: '#2563EB', backgroundColor: '#EFF6FF' }]}>
                <T style={[styles.sheetTeamTitle, { color: '#1D4ED8' }]}>ĐỘI XANH · {view.scores.blue}đ</T>
                {view.teams.blue.map((id) => (
                  <T key={id} style={styles.sheetMember}>
                    {id === game.me ? '★ ' : '• '}
                    {view.names[id] ?? id}
                  </T>
                ))}
              </View>
            </View>

            <T style={{ fontWeight: '800', fontSize: 13, color: C.ink }}>Lượt đoán gần nhất ({view.attempts.length})</T>
            {view.attempts.length === 0 ? (
              <T style={{ color: C.muted, fontSize: 13 }}>Chưa có câu trả lời nào trong vòng này.</T>
            ) : (
              [...view.attempts].reverse().map((a) => (
                <View key={a.id} style={styles.logItem}>
                  <View style={[styles.logDot, { backgroundColor: a.team === 'red' ? '#DC2626' : '#2563EB' }]} />
                  <T style={styles.logText}>
                    <T style={{ fontWeight: '700' }}>{a.playerName}:</T> “{a.text}”
                  </T>
                  <T style={[styles.logRes, { color: a.hitIndex !== null ? C.jade : C.danger }]}>
                    {a.hitIndex !== null ? `+${a.pointsAdded}` : '✕'}
                  </T>
                </View>
              ))
            )}
          </View>
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, gap: 6 },
  hudBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamPill: {
    minWidth: 64,
    paddingHorizontal: 7,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  redPill: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  bluePill: { backgroundColor: '#DBEAFE', borderColor: '#2563EB' },
  myTeamGlow: { shadowColor: '#111', shadowOpacity: 0.16, shadowRadius: 4, elevation: 2 },
  teamLabel: { fontSize: 10, fontWeight: '800', color: C.ink },
  teamScore: { fontSize: 15.5, fontWeight: '900', color: C.ink, fontVariant: ['tabular-nums'] },
  centerHud: { flex: 1, minWidth: 0, gap: 3 },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  roundBadge: { fontSize: 11, fontWeight: '800', color: C.ink },
  bankChip: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  bankTxt: { fontSize: 11, fontWeight: '900', color: '#92400E', fontVariant: ['tabular-nums'] },
  chatTeamBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.ink,
  },
  chatTeamUnread: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  unreadTxt: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  infoBtn: {
    padding: 3.5,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  questionCard: {
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 8,
    gap: 5,
    borderWidth: 2,
    borderColor: '#D97706',
  },
  qHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  catChip: {
    flexShrink: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  catTxt: { fontSize: 10.5, fontWeight: '700', color: '#FDE68A' },
  strikeRow: { flexDirection: 'row', gap: 4 },
  strikeBox: {
    width: 22,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strikeBoxOn: { backgroundColor: '#DC2626', borderColor: '#FCA5A5' },
  strikeX: { fontSize: 11, fontWeight: '900', color: 'rgba(255,255,255,0.32)' },
  strikeXOn: { color: '#FFFFFF' },
  questionTxt: { fontSize: 14.5, lineHeight: 19, fontWeight: '800', color: '#FFFDF7' },
  questionTxtCompact: { fontSize: 13.5, lineHeight: 17.5 },
  board: { flex: 1, minHeight: 0, gap: 6 },
  boardRow: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 6 },
  tile: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 7,
    paddingVertical: 5,
    gap: 6,
  },
  tileHidden: { backgroundColor: '#1E293B', borderColor: '#475569' },
  tileRevealed: { backgroundColor: '#FFFBEB', borderColor: C.jade },
  tileMissed: { backgroundColor: '#F1F5F9', borderColor: '#94A3B8' },
  tileFlash: { shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 6, elevation: 3 },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeHidden: { backgroundColor: '#334155', borderWidth: 1, borderColor: '#64748B' },
  rankTxt: { fontSize: 12, fontWeight: '900', color: '#CBD5E1' },
  tileText: { flex: 1, fontSize: 13.5, lineHeight: 16.5, fontWeight: '800', color: C.ink },
  tileTextCompact: { fontSize: 12.5, lineHeight: 15 },
  ptsPill: {
    backgroundColor: '#D1FAE5',
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: 'center',
  },
  ptsTxt: { fontSize: 12, fontWeight: '900', color: '#065F46', fontVariant: ['tabular-nums'] },
  hiddenBars: { flex: 1, gap: 4, opacity: 0.42 },
  hiddenBarLong: { height: 7, borderRadius: 4, backgroundColor: '#64748B', width: '82%' },
  hiddenBarShort: { height: 5, borderRadius: 4, backgroundColor: '#475569', width: '50%' },
  eventBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: C.paper,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.borderSubtle,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  eventTxt: { flex: 1, fontSize: 12, fontWeight: '800', color: C.ink },
  decideRow: { flexDirection: 'row', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: C.ink,
    paddingHorizontal: 11,
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  waitDock: { minHeight: 36, justifyContent: 'center', alignItems: 'center' },
  waitTxt: { fontSize: 12.5, fontWeight: '700', textAlign: 'center' },
  quickRow: { gap: 6, paddingBottom: 6 },
  quickChip: {
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickTxt: { fontSize: 12, fontWeight: '700', color: C.ink },
  chatMsgRow: {
    backgroundColor: C.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  chatMsgMine: { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
  sheetTeamRow: { flexDirection: 'row', gap: 8 },
  sheetTeamCard: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 9, gap: 3 },
  sheetTeamTitle: { fontSize: 12.5, fontWeight: '900', marginBottom: 2 },
  sheetMember: { fontSize: 12.5, fontWeight: '600', color: C.ink },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.paper,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logText: { flex: 1, fontSize: 12.5, color: C.ink },
  logRes: { fontSize: 13, fontWeight: '900' },
});
