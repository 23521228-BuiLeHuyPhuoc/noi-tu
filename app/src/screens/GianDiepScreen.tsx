import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { GIAN_DIEP_ROLE_META, type GianDiepRole, type GianDiepView } from '../../../shared/src/giandiep';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { KeyboardLift } from '../components/KeyboardLift';

const PHASE_META: Record<GianDiepView['phase'], { title: string; icon: string; hint: string }> = {
  word_reveal: { title: 'Nhận Từ Khóa Bí Mật', icon: '🔐', hint: 'Ghi nhớ từ khóa của bạn và giữ kín màn hình!' },
  clue_turn: { title: 'Vòng Khai Gợi Ý', icon: '🎤', hint: 'Lần lượt từng người mô tả 1 câu về từ khóa (không được nhắc trực tiếp từ đó).' },
  discussion: { title: 'Thảo Luận Truy Tìm', icon: '💬', hint: 'Ai nói trật khớp nhất? Trao đổi nhanh trước khi bỏ phiếu!' },
  vote: { title: 'Bỏ Phiếu Loại Gián Điệp', icon: '⚖️', hint: 'Chạm chọn người đáng nghi nhất để bỏ phiếu loại!' },
  mrwhite_guess: { title: 'Cơ Hội Cuối Của Mr. White', icon: '🤍', hint: 'Mr. White vừa bị loại! Nếu đoán đúng từ của Dân Thường, Mr. White sẽ lật kèo thắng!' },
};

export function GianDiepScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as GianDiepView;
  const [wordVisible, setWordVisible] = useState(true);
  const [clueText, setClueText] = useState('');
  const [guessText, setGuessText] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const iAlive = aliveSet.has(me);
  const elimMap = useMemo(() => new Map(view.eliminated.map((e) => [e.id, e])), [view.eliminated]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const voteTally = useMemo(() => {
    const map: Record<string, number> = {};
    for (const target of Object.values(view.votes)) {
      if (target !== 'skip') map[target] = (map[target] ?? 0) + 1;
    }
    return map;
  }, [view.votes]);

  const roundCluesByPlayer = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of view.clues) {
      if (c.round === view.round) map[c.playerId] = c.text;
    }
    return map;
  }, [view.clues, view.round]);

  const meta = PHASE_META[view.phase];

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Thao tác không hợp lệ');
    return res.ok;
  };

  const submitClue = async () => {
    const clean = clueText.trim();
    if (!clean || busy) return;
    const ok = await act({ type: 'gd_clue', text: clean });
    if (ok) setClueText('');
  };

  const submitGuess = async () => {
    const clean = guessText.trim();
    if (!clean || busy) return;
    const ok = await act({ type: 'gd_guess', word: clean });
    if (ok) setGuessText('');
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.currentSpeakerId,
      dim: (p: PublicPlayer) => !aliveSet.has(p.id),
      ring: (p: PublicPlayer) => (view.votes[me] === p.id ? C.gold : !aliveSet.has(p.id) ? '#64748B' : undefined),
      sub: (p: PublicPlayer) => {
        if (!aliveSet.has(p.id)) return '❌ Đã loại';
        if (view.phase === 'vote' && voteTally[p.id]) return `🗳️ ${voteTally[p.id]}`;
        if (view.currentSpeakerId === p.id) return '🎤 Đang nói';
        if (roundCluesByPlayer[p.id]) return '💬 Đã khai';
        return undefined;
      },
    }),
    [view.order, view.currentSpeakerId, view.phase, view.votes, aliveSet, voteTally, roundCluesByPlayer, me],
  );

  const renderBottom = () => {
    if (view.phase === 'mrwhite_guess') {
      if (view.mrWhiteId === me) {
        return (
          <KeyboardLift>
            <View style={styles.dock}>
              <T style={[styles.dockNote, { color: theme.onBg }]}>🤍 Đoán đúng từ khóa của phe Dân Thường để THẮNG NGƯỢC!</T>
              {err && <T style={styles.err}>{err}</T>}
              <View style={styles.inputRow}>
                <TextInput
                  testID="gd-mrwhite-input"
                  value={guessText}
                  onChangeText={setGuessText}
                  onSubmitEditing={submitGuess}
                  placeholder="Nhập từ khóa của Dân Thường..."
                  placeholderTextColor={C.muted}
                  maxLength={50}
                  style={styles.input}
                />
                <Button testID="gd-mrwhite-submit" disabled={busy || !guessText.trim()} title="Chốt!" onPress={submitGuess} />
              </View>
            </View>
          </KeyboardLift>
        );
      }
      return <T style={[styles.waitNote, { color: theme.onBg }]}>🤍 Đang chờ Mr. White {view.names[view.mrWhiteId ?? ''] ?? ''} đoán từ…</T>;
    }

    if (!iAlive) {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>👀 Bạn đã bị loại khỏi vòng suy luận. Theo dõi xem ai là Gián Điệp nhé!</T>;
    }

    if (view.phase === 'clue_turn') {
      if (view.currentSpeakerId === me) {
        return (
          <KeyboardLift>
            <View style={styles.dock}>
              <T style={[styles.dockNote, { color: '#4ADE80' }]}>
                🎤 Tới lượt bạn mô tả! (Tuyệt đối không nhắc trực tiếp từ «{view.myWord ?? '...'}»)
              </T>
              {err && <T style={styles.err}>{err}</T>}
              <View style={styles.inputRow}>
                <TextInput
                  testID="gd-clue-input"
                  value={clueText}
                  onChangeText={(t) => { setClueText(t); if (err) setErr(null); }}
                  onSubmitEditing={submitClue}
                  placeholder="Nhập gợi ý ngắn gọn..."
                  placeholderTextColor={C.muted}
                  maxLength={80}
                  style={styles.input}
                />
                <Button testID="gd-clue-submit" disabled={busy || !clueText.trim()} title="Gửi" onPress={submitClue} />
              </View>
            </View>
          </KeyboardLift>
        );
      }
      return <T style={[styles.waitNote, { color: theme.onBg }]}>🎤 Đang nghe {view.names[view.currentSpeakerId ?? ''] ?? 'bạn chơi'} mô tả từ khóa…</T>;
    }

    if (view.phase === 'discussion') {
      const myReady = view.readySkip.includes(me);
      const needReady = Math.max(1, Math.ceil(view.alive.length / 2));
      return (
        <View style={styles.dock}>
          {err && <T style={styles.err}>{err}</T>}
          <Button
            testID="gd-ready-btn"
            variant={myReady ? 'jade' : 'ink'}
            disabled={busy || myReady}
            title={
              myReady
                ? `✅ Đã sẵn sàng bỏ phiếu (${view.readySkip.length}/${needReady})`
                : `⚡ Vào bỏ phiếu ngay (${view.readySkip.length}/${needReady})`
            }
            onPress={() => act({ type: 'gd_ready' })}
          />
        </View>
      );
    }

    if (view.phase === 'vote') {
      const myVote = view.votes[me];
      const votedText = myVote === 'skip' ? '🏳️ Đã bỏ phiếu trắng' : myVote ? `🗳️ Đang chọn loại: ${view.names[myVote]}` : null;
      return (
        <View style={styles.dock}>
          {votedText && <T style={[styles.dockNote, { color: C.jade }]}>{votedText}</T>}
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.inputRow}>
            <Button
              testID="gd-vote-btn"
              disabled={!selected || busy}
              title={selected ? `⚖️ Loại ${view.names[selected]}` : 'Chạm chọn 1 người ở trên'}
              onPress={async () => {
                if (selected && (await act({ type: 'gd_vote', target: selected }))) setSelected(null);
              }}
              style={{ flex: 2 }}
            />
            <Button
              testID="gd-skip-vote"
              variant="paper"
              disabled={busy}
              title="🏳️ Bỏ qua"
              onPress={async () => {
                await act({ type: 'gd_vote', target: 'skip' });
                setSelected(null);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    }

    return <T style={styles.waitNote}>{meta.hint}</T>;
  };

  const roleBadge = (r: GianDiepRole | null) => {
    if (!r) return null;
    if (r === 'mrwhite') return GIAN_DIEP_ROLE_META.mrwhite;
    return { name: 'Người giữ từ khóa', emoji: '🃏', color: '#1E293B', desc: GIAN_DIEP_ROLE_META[r].desc };
  };
  const shownMeta = roleBadge(view.myRole);

  return (
    <Shell game={game} room={room} strip={strip} bottom={renderBottom()}>
      {/* Header giai đoạn */}
      <View style={styles.phaseBanner}>
        <View style={styles.phaseTop}>
          <T style={styles.phaseTitle}>{meta.icon} {meta.title} · Vòng {view.round}</T>
          <View style={styles.catBadge}>
            <T style={styles.catTxt}>🏷️ {view.category}</T>
          </View>
        </View>
        <T style={styles.phaseHint}>{meta.hint}</T>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="gd-timer" />
      </View>

      {/* Hồ Sơ Từ Khóa Bí Mật */}
      <Pressable testID="gd-secret-card" onPress={() => setWordVisible((v) => !v)} style={styles.secretCard}>
        <View style={styles.secretHead}>
          <T style={styles.secretLabel}>📁 TỪ KHÓA BÍ MẬT CỦA BẠN</T>
          <T style={styles.tapHint}>{wordVisible ? '👁️ Chạm để che' : '👆 Chạm để xem'}</T>
        </View>
        {wordVisible ? (
          <View style={styles.secretBody}>
            {view.myRole === 'mrwhite' ? (
              <>
                <T testID="gd-secret-word" style={[styles.secretWord, { color: '#FDE047' }]}>🤍 BẠN LÀ MR. WHITE</T>
                <T style={styles.secretSub}>Không có từ khóa! Hãy nghe lời khai của mọi người để suy luận nhé.</T>
              </>
            ) : (
              <>
                <T testID="gd-secret-word" style={styles.secretWord}>{view.myWord ?? '---'}</T>
                <T style={styles.secretSub}>
                  {shownMeta?.desc ?? 'Mô tả khéo léo để đồng đội nhận ra nhau, đừng để Gián Điệp chép bài!'}
                </T>
              </>
            )}
          </View>
        ) : (
          <View style={styles.secretHidden}>
            <T style={styles.secretHiddenTxt}>🔒 Đang che từ khóa (chạm để mở lại)</T>
          </View>
        )}
      </Pressable>

      {/* Bảng Người Chơi & Lời Khai Vòng Hiện Tại */}
      <View style={styles.grid}>
        {view.order.map((id) => {
          const player = playerMap.get(id);
          const alive = aliveSet.has(id);
          const elim = elimMap.get(id);
          const isTurn = view.currentSpeakerId === id;
          const picked = selected === id;
          const votes = voteTally[id] ?? 0;
          const clue = roundCluesByPlayer[id];
          const clickable = view.phase === 'vote' && iAlive && alive && id !== me;

          return (
            <Pressable
              key={id}
              testID={`gd-seat-${id}`}
              onPress={() => clickable && setSelected((p) => (p === id ? null : id))}
              style={[
                styles.seat,
                { flexBasis: wide ? '31.5%' : '48%' },
                isTurn && styles.seatSpeaking,
                picked && styles.seatPicked,
                !alive && styles.seatDead,
              ]}
            >
              <View style={styles.seatTop}>
                {player ? (
                  <Portrait p={player} size={38} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
                ) : (
                  <T style={{ fontSize: 22 }}>{alive ? '🧑' : '❌'}</T>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <NameText fx={player?.cosmetics?.nameFx} style={[styles.seatName, !alive && styles.deadName]}>
                    {view.names[id] ?? id}
                  </NameText>
                  {!alive && elim ? (
                    <T style={styles.elimTag}>
                      {GIAN_DIEP_ROLE_META[elim.role].emoji} {GIAN_DIEP_ROLE_META[elim.role].name}
                    </T>
                  ) : isTurn ? (
                    <T style={styles.turnTag}>🎤 Đang khai…</T>
                  ) : votes > 0 ? (
                    <T style={styles.voteTag}>🗳️ {votes} phiếu</T>
                  ) : null}
                </View>
              </View>
              <View style={styles.clueBubble}>
                <T style={styles.clueBubbleTxt}>
                  {clue ? `"${clue}"` : alive ? (isTurn ? 'Đang suy nghĩ câu mô tả…' : 'Chưa tới lượt nói') : 'Đã dừng cuộc chơi'}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Nhật Ký Toàn Bộ Lời Khai */}
      {view.clues.length > 0 && (
        <Card>
          <T style={styles.secTitle}>🗒️ Biên Bản Các Vòng</T>
          <View style={{ gap: 4 }}>
            {view.clues.slice(-12).reverse().map((c) => (
              <T key={c.id} style={styles.histLine}>
                <T style={{ fontWeight: '900' }}>[V{c.round}] {c.name}: </T>«{c.text}»
              </T>
            ))}
          </View>
        </Card>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  phaseBanner: { backgroundColor: '#FFFDF8', borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, padding: 12, gap: 6 },
  phaseTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  phaseTitle: { fontSize: 16, fontWeight: '900', fontFamily: FONT, color: C.ink, flex: 1 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FEF3C7', borderWidth: 1.5, borderColor: C.ink },
  catTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  phaseHint: { fontSize: 12, fontWeight: '700', color: C.muted },

  secretCard: { backgroundColor: '#1E293B', borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, padding: 14, gap: 6 },
  secretHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  secretLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.7, color: '#94A3B8' },
  tapHint: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },
  secretBody: { alignItems: 'center', paddingVertical: 4, gap: 4 },
  secretWord: { fontSize: 24, fontWeight: '900', color: '#FDE047', textAlign: 'center', fontFamily: FONT },
  secretSub: { fontSize: 12, color: '#E2E8F0', textAlign: 'center', fontWeight: '600' },
  secretHidden: { paddingVertical: 10, alignItems: 'center' },
  secretHiddenTxt: { color: '#CBD5E1', fontWeight: '800', fontSize: 13 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 138, maxWidth: '49%', backgroundColor: '#FFFDF8',
    borderRadius: 14, borderWidth: 2, borderColor: C.ink, padding: 9, gap: 6,
  },
  seatSpeaking: { borderColor: C.jade, borderWidth: 3, backgroundColor: '#F0FDF4' },
  seatPicked: { borderColor: C.gold, borderWidth: 3, backgroundColor: '#FEFCE8' },
  seatDead: { opacity: 0.58, backgroundColor: '#E2E8F0' },
  seatTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seatName: { fontSize: 13, fontWeight: '900', color: C.ink },
  deadName: { textDecorationLine: 'line-through', color: C.muted },
  elimTag: { fontSize: 11, fontWeight: '800', color: '#DC2626' },
  turnTag: { fontSize: 11, fontWeight: '900', color: C.jade },
  voteTag: { fontSize: 11, fontWeight: '900', color: '#B45309' },
  clueBubble: { backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  clueBubbleTxt: { fontSize: 12, fontWeight: '700', color: '#334155', fontStyle: 'italic' },

  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 4 },
  histLine: { fontSize: 12, fontWeight: '600', color: C.ink },

  dock: { gap: 8 },
  dockNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.ink },
  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.muted, paddingVertical: 6 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#FFFFFF', borderColor: C.ink, borderWidth: 2,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: C.ink, fontSize: 14, fontWeight: '700',
  },
  err: { fontSize: 12, fontWeight: '800', color: C.danger, textAlign: 'center' },
});
