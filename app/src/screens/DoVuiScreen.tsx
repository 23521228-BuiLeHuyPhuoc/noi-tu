import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { DoVuiView } from '../../../shared/src/dovui';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { EmojiIcon, RankMedal, UiIcon } from '../components/Icons';

const OPT_META = [
  { letter: 'A', bg: '#FFF1F2', border: '#E11D48', tag: '#E11D48' },
  { letter: 'B', bg: '#EFF6FF', border: '#2563EB', tag: '#2563EB' },
  { letter: 'C', bg: '#FFFBEB', border: '#D97706', tag: '#D97706' },
  { letter: 'D', bg: '#ECFDF5', border: '#059669', tag: '#059669' },
];

export function DoVuiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as DoVuiView;
  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 680;

  const answeredSet = useMemo(() => new Set(view.answeredIds), [view.answeredIds]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const sortedBoard = useMemo(
    () => [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)),
    [view.order, view.scores],
  );

  const pickAnswer = async (choice: 0 | 1 | 2 | 3) => {
    if (busy || view.phase !== 'question' || view.myAnswer !== null) return;
    setBusy(true);
    setErr(null);
    const res = await game.act({ type: 'dv_answer', choice });
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Không gửi được đáp án');
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: sortedBoard,
      ring: (p: PublicPlayer) => {
        if (view.phase === 'reveal' && view.picks) {
          return view.picks[p.id] === view.correctIndex ? C.jade : C.danger;
        }
        return answeredSet.has(p.id) ? C.gold : undefined;
      },
      sub: (p: PublicPlayer) => {
        const sc = view.scores[p.id] ?? 0;
        const st = view.streaks[p.id] ?? 0;
        return st >= 2 ? `Chuỗi ${st} · ${sc}đ` : `${sc}đ`;
      },
    }),
    [sortedBoard, view.phase, view.picks, view.correctIndex, view.scores, view.streaks, answeredSet],
  );

  const myCorrect = view.phase === 'reveal' && view.myAnswer !== null && view.myAnswer === view.correctIndex;

  return (
    <Shell
      game={game}
      room={room}
      strip={strip}
      bottom={
        view.phase === 'question' ? (
          <T style={[styles.waitNote, { color: theme.onBg }]}>
            {view.myAnswer !== null
              ? `Bạn đã chọn đáp án ${OPT_META[view.myAnswer].letter}! Đã trả lời: ${view.answeredIds.length}/${view.order.length}`
              : `Chạm nhanh vào 1 đáp án! Càng nhanh điểm càng cao (${view.answeredIds.length}/${view.order.length})`}
          </T>
        ) : (
          <T style={[styles.waitNote, { color: myCorrect ? '#4ADE80' : '#FCA5A5' }]}>
            {myCorrect ? 'Chính xác! Cộng điểm + giữ chuỗi!' : 'Tiếc quá! Chuẩn bị sang câu kế tiếp…'}
          </T>
        )
      }
    >
      {/* Header Câu Hỏi */}
      <View style={[styles.qHeader, sticker(3), view.doublePoints && styles.qHeaderDouble]}>
        <View style={styles.qMetaRow}>
          <EmojiIcon emoji="🧠" size={18} />
          <T style={styles.qIndex}>Câu {view.index}/{view.total}</T>
          <View style={styles.catChip}>
            <T style={styles.catTxt}>{view.category}</T>
          </View>
          {view.doublePoints && (
            <View style={styles.x2Chip}>
              <UiIcon name="Zap" size={12} color="#FEF08A" />
              <T style={styles.x2Txt}>x2 ĐIỂM</T>
            </View>
          )}
        </View>
        <T testID="dv-question" style={styles.qText}>{view.question}</T>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="dv-timer" />
      </View>

      {err && <T style={styles.err}>{err}</T>}

      {/* 4 Đáp Án A / B / C / D */}
      <View style={styles.optGrid}>
        {view.options.map((text, idx) => {
          const m = OPT_META[idx];
          const picked = view.myAnswer === idx;
          const isCorrect = view.phase === 'reveal' && view.correctIndex === idx;
          const isWrongPick = view.phase === 'reveal' && picked && view.correctIndex !== idx;
          const faded = view.phase === 'reveal' && view.correctIndex !== idx && !picked;

          const pickCount =
            view.phase === 'reveal' && view.picks
              ? Object.values(view.picks).filter((v) => v === idx).length
              : 0;

          return (
            <Pressable
              key={idx}
              testID={`dv-opt-${idx}`}
              disabled={busy || view.phase !== 'question' || view.myAnswer !== null}
              onPress={() => pickAnswer(idx as 0 | 1 | 2 | 3)}
              style={[
                styles.optBtn,
                sticker(2),
                { flexBasis: wide ? '48.5%' : '100%', backgroundColor: m.bg, borderColor: m.border },
                picked && styles.optPicked,
                isCorrect && styles.optCorrect,
                isWrongPick && styles.optWrong,
                faded && { opacity: 0.45 },
              ]}
            >
              <View style={[styles.letterBadge, { backgroundColor: m.tag }]}>
                <T style={styles.letterTxt}>{m.letter}</T>
              </View>
              <T style={styles.optTxt}>{text}</T>
              {isCorrect && <UiIcon name="CheckCircle2" size={20} color="#15803D" />}
              {isWrongPick && <UiIcon name="XCircle" size={20} color="#B91C1C" />}
              {view.phase === 'reveal' && pickCount > 0 && (
                <T style={styles.countTxt}>{pickCount} chọn</T>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Giải Thích Sau Khi Mở Đáp Án */}
      {view.phase === 'reveal' && view.explain && (
        <View style={styles.explainBox}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <UiIcon name="Lightbulb" size={16} color="#065F46" />
            <T style={styles.explainTitle}>Giải thích:</T>
          </View>
          <T style={styles.explainTxt}>{view.explain}</T>
        </View>
      )}

      {/* Bảng Xếp Hạng Trực Tiếp */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <EmojiIcon emoji="🏆" size={17} />
          <T style={styles.secTitle}>Bảng Xếp Hạng Trực Tiếp</T>
        </View>
        <View style={{ gap: 6 }}>
          {sortedBoard.map((id, i) => {
            const p = playerMap.get(id);
            const sc = view.scores[id] ?? 0;
            const st = view.streaks[id] ?? 0;
            return (
              <View key={id} style={[styles.rankRow, id === me && styles.rankMe]}>
                <RankMedal rank={i + 1} size={20} />
                {p && <Portrait p={p} size={30} frame={p.cosmetics?.frame} />}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <NameText fx={p?.cosmetics?.nameFx} style={styles.rankName}>{view.names[id] ?? id}</NameText>
                </View>
                {st >= 2 && (
                  <View style={styles.streakPill}>
                    <UiIcon name="Flame" size={12} color="#C2410C" />
                    <T style={styles.streakTxt}>{st}</T>
                  </View>
                )}
                <T style={styles.rankScore}>{sc.toLocaleString('vi-VN')}đ</T>
              </View>
            );
          })}
        </View>
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  qHeader: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, gap: 10 },
  qHeaderDouble: { backgroundColor: '#FFF7ED', borderColor: '#EA580C' },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  qIndex: { fontSize: 14, fontWeight: '900', color: C.ink },
  catChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#E0E7FF', borderWidth: 1, borderColor: 'rgba(67,56,202,0.2)' },
  catTxt: { fontSize: 11, fontWeight: '800', color: '#1E1B4B' },
  x2Chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#DC2626' },
  x2Txt: { fontSize: 11, fontWeight: '900', color: '#FEF08A' },
  qText: { fontSize: 18, fontWeight: '900', color: C.ink, lineHeight: 25, fontFamily: FONT },

  optGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 16, borderWidth: 1.5, minHeight: 56,
  },
  optPicked: { borderWidth: 3, borderColor: C.ink, transform: [{ translateY: -2 }] },
  optCorrect: { backgroundColor: '#BBF7D0', borderColor: '#15803D', borderWidth: 2.5 },
  optWrong: { backgroundColor: '#FECACA', borderColor: '#B91C1C', borderWidth: 2.5 },
  letterBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  letterTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
  optTxt: { flex: 1, fontSize: 15, fontWeight: '800', color: C.ink },
  countTxt: { fontSize: 11, fontWeight: '900', color: C.ink, backgroundColor: 'rgba(255,255,255,0.82)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },

  explainBox: { backgroundColor: '#ECFDF5', borderRadius: 16, borderWidth: 1.5, borderColor: '#10B981', padding: 12, gap: 4 },
  explainTitle: { fontSize: 13, fontWeight: '900', color: '#065F46' },
  explainTxt: { fontSize: 13, fontWeight: '700', color: '#064E3B', lineHeight: 19 },

  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F8FAFC' },
  rankMe: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: 'rgba(217,119,6,0.28)' },
  rankName: { fontSize: 13, fontWeight: '800', color: C.ink },
  streakPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFEDD5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  streakTxt: { fontSize: 11, fontWeight: '900', color: '#C2410C' },
  rankScore: { fontSize: 14, fontWeight: '900', color: C.ink },

  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.muted, paddingVertical: 6 },
  err: { fontSize: 12, fontWeight: '800', color: C.danger, textAlign: 'center' },
});
