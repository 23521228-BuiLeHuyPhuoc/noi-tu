import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DO_VUI_TOPICS, type DoVuiView } from '../../../shared/src/dovui';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { useStableWindow } from '../hooks';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { CountdownBar } from '../components/TimerBar';
import { EmojiIcon, UiIcon } from '../components/Icons';

const OPT_META = [
  { letter: 'A', bg: '#FFF1F2', border: '#E11D48', tag: '#E11D48' },
  { letter: 'B', bg: '#EFF6FF', border: '#2563EB', tag: '#2563EB' },
  { letter: 'C', bg: '#FFFBEB', border: '#D97706', tag: '#D97706' },
  { letter: 'D', bg: '#ECFDF5', border: '#059669', tag: '#059669' },
];

export function DoVuiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as DoVuiView;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width, height } = useStableWindow();
  const wide = width >= 680;
  const compact = height < 720 || width < 380;

  const answeredSet = useMemo(() => new Set(view.answeredIds), [view.answeredIds]);

  const sortedBoard = useMemo(
    () => [...view.order].sort((a, b) => (view.scores[b] ?? 0) - (view.scores[a] ?? 0)),
    [view.order, view.scores],
  );
  const rankMap = useMemo(() => {
    const m = new Map<string, number>();
    sortedBoard.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [sortedBoard]);

  const pickAnswer = async (choice: 0 | 1 | 2 | 3) => {
    if (busy || view.phase !== 'question' || view.myAnswer !== null) return;
    setBusy(true);
    setErr(null);
    const res = await game.act({ type: 'dv_answer', choice });
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Không gửi được đáp án');
  };

  const myCorrect = view.phase === 'reveal' && view.myAnswer !== null && view.myAnswer === view.correctIndex;

  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      wide={wide}
      bottom={
        view.phase === 'question' ? (
          <T style={[styles.waitNote, { color: theme.onBg }]}>
            {view.myAnswer !== null
              ? `Đã chọn ${OPT_META[view.myAnswer].letter}! Đã trả lời: ${view.answeredIds.length}/${view.order.length}`
              : `Chạm nhanh 1 đáp án (${view.answeredIds.length}/${view.order.length} đã trả lời)`}
          </T>
        ) : (
          <T style={[styles.waitNote, { color: myCorrect ? '#4ADE80' : '#FCA5A5' }]}>
            {myCorrect ? 'Chính xác! Cộng điểm + giữ chuỗi!' : 'Tiếc quá! Chuẩn bị câu kế tiếp…'}
          </T>
        )
      }
    >
      <View style={styles.rootStage}>
        {/* Dải Avatar Xếp Hạng Mini 1 dòng — thay cho bảng XH cồng kềnh bên dưới để ZERO SCROLL */}
        <CompactPlayerStrip
          room={room}
          game={game}
          order={sortedBoard}
          rank={(p: PublicPlayer) => rankMap.get(p.id)}
          ring={(p: PublicPlayer) => {
            if (view.phase === 'reveal' && view.picks) {
              return view.picks[p.id] === view.correctIndex ? C.jade : C.danger;
            }
            return answeredSet.has(p.id) ? C.gold : undefined;
          }}
          sub={(p: PublicPlayer) => {
            const sc = view.scores[p.id] ?? 0;
            const st = view.streaks[p.id] ?? 0;
            return st >= 2 ? `🔥${st} · ${sc}đ` : `${sc}đ`;
          }}
          testID="dv-player-strip"
        />

        {/* Header Câu Hỏi Toàn Phần */}
        <View style={[styles.qHeader, sticker(3), compact && styles.qHeaderCompact, view.doublePoints && styles.qHeaderDouble]}>
          <View style={styles.qMetaRow}>
            <EmojiIcon emoji="🧠" size={16} />
            <T style={styles.qIndex}>Câu {view.index}/{view.total}</T>
            <View style={styles.catChip}>
              <T numberOfLines={1} style={styles.catTxt}>
                {DO_VUI_TOPICS.find((t) => t.id === view.selectedTopic)?.shortName ?? view.category}
              </T>
            </View>
            {view.difficulty && (
              <View
                testID={`dv-level-${view.difficulty}`}
                style={[
                  styles.diffChip,
                  view.difficulty === 'easy'
                    ? styles.diffEasy
                    : view.difficulty === 'hard'
                      ? styles.diffHard
                      : styles.diffMedium,
                ]}
              >
                <T
                  style={[
                    styles.diffTxt,
                    view.difficulty === 'easy'
                      ? { color: '#065F46' }
                      : view.difficulty === 'medium'
                        ? { color: '#1D4ED8' }
                        : { color: '#B45309' },
                  ]}
                >
                  {view.difficulty === 'easy'
                    ? '🌱 DỄ · 16s'
                    : view.difficulty === 'medium'
                      ? '⚡ VỪA · 22s'
                      : '🔥 KHÓ · 30s'}
                </T>
              </View>
            )}
            {view.doublePoints && (
              <View style={styles.x2Chip}>
                <UiIcon name="Zap" size={11} color="#FEF08A" />
                <T style={styles.x2Txt}>x2</T>
              </View>
            )}
          </View>
          <T
            testID="dv-question"
            style={[
              styles.qText,
              {
                fontSize: compact ? 14 : wide ? 17.5 : 15.5,
                lineHeight: compact ? 19.5 : wide ? 24 : 21.5,
              },
            ]}
          >
            {view.question}
          </T>
          <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="dv-timer" />
        </View>

        {err && <T style={styles.err}>{err}</T>}

        {/* 4 Đáp Án A / B / C / D Vừa Khít Không Cần Cuộn */}
        <View style={[styles.optGrid, wide ? styles.optGridWide : styles.optGridMobile, compact && { gap: 6 }]}>
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
                  wide ? styles.optBtnWide : styles.optBtnMobile,
                  compact && styles.optBtnCompact,
                  { backgroundColor: m.bg, borderColor: m.border },
                  picked && styles.optPicked,
                  isCorrect && styles.optCorrect,
                  isWrongPick && styles.optWrong,
                  faded && { opacity: 0.45 },
                ]}
              >
                <View style={[styles.letterBadge, compact && styles.letterBadgeCompact, { backgroundColor: m.tag }]}>
                  <T style={[styles.letterTxt, compact && { fontSize: 13 }]}>{m.letter}</T>
                </View>
                <T numberOfLines={3} style={[styles.optTxt, compact && styles.optTxtCompact]}>{text}</T>
                {isCorrect && <UiIcon name="CheckCircle2" size={18} color="#15803D" />}
                {isWrongPick && <UiIcon name="XCircle" size={18} color="#B91C1C" />}
                {view.phase === 'reveal' && pickCount > 0 && (
                  <T style={styles.countTxt}>{pickCount}</T>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Giải Thích Ngắn Gọn Sau Khi Mở Đáp Án */}
        {view.phase === 'reveal' && view.explain && (
          <View style={styles.explainBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <UiIcon name="Lightbulb" size={14} color="#065F46" />
              <T style={styles.explainTitle}>Giải thích:</T>
            </View>
            <T numberOfLines={3} style={styles.explainTxt}>{view.explain}</T>
          </View>
        )}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  rootStage: { flex: 1, minHeight: 0, gap: 6 },

  qHeader: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12, gap: 7, flexShrink: 0 },
  qHeaderCompact: { padding: 9, gap: 5, borderRadius: 15 },
  qHeaderDouble: { backgroundColor: '#FFF7ED', borderColor: '#EA580C' },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  qIndex: { fontSize: 13, fontWeight: '900', color: C.ink },
  catChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#E0E7FF', borderWidth: 1, borderColor: 'rgba(67,56,202,0.2)', maxWidth: 120 },
  catTxt: { fontSize: 10.5, fontWeight: '800', color: '#1E1B4B' },
  diffChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  diffEasy: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#22C55E' },
  diffMedium: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#3B82F6' },
  diffHard: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#D97706' },
  diffTxt: { fontSize: 10, fontWeight: '900', color: '#B45309' },
  x2Chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#DC2626' },
  x2Txt: { fontSize: 10.5, fontWeight: '900', color: '#FEF08A' },
  qText: { fontWeight: '900', color: C.ink, fontFamily: FONT },

  optGrid: { flex: 1, minHeight: 0 },
  optGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignContent: 'center' },
  optGridMobile: { flexDirection: 'column', gap: 8, justifyContent: 'space-between' },

  optBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderRadius: 14, borderWidth: 1.5,
  },
  optBtnWide: { flexBasis: '48.6%', minHeight: 72, padding: 12 },
  optBtnMobile: { flex: 1, minHeight: 42, maxHeight: 82, paddingHorizontal: 10, paddingVertical: 8 },
  optBtnCompact: { minHeight: 40, paddingHorizontal: 9, paddingVertical: 6, gap: 8, borderRadius: 12 },
  optPicked: { borderWidth: 3, borderColor: C.ink, transform: [{ translateY: -1 }] },
  optCorrect: { backgroundColor: '#BBF7D0', borderColor: '#15803D', borderWidth: 2.5 },
  optWrong: { backgroundColor: '#FECACA', borderColor: '#B91C1C', borderWidth: 2.5 },
  letterBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letterBadgeCompact: { width: 26, height: 26, borderRadius: 8 },
  letterTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 14 },
  optTxt: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '800', color: C.ink },
  optTxtCompact: { fontSize: 13, lineHeight: 17.5 },
  countTxt: { fontSize: 11, fontWeight: '900', color: C.ink, backgroundColor: 'rgba(255,255,255,0.86)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7 },

  explainBox: { flexShrink: 0, backgroundColor: '#ECFDF5', borderRadius: 12, borderWidth: 1.5, borderColor: '#10B981', paddingHorizontal: 10, paddingVertical: 7, gap: 2 },
  explainTitle: { fontSize: 11.5, fontWeight: '900', color: '#065F46' },
  explainTxt: { fontSize: 12, fontWeight: '700', color: '#064E3B', lineHeight: 16.5 },

  waitNote: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', color: C.muted, paddingVertical: 3 },
  err: { fontSize: 12, fontWeight: '800', color: C.danger, textAlign: 'center' },
});
