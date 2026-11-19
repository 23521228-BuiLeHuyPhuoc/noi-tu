import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DO_VUI_TOPICS, type DoVuiView } from '../../../shared/src/dovui';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, backdropPalette, sticker } from '../theme';
import { actionText } from '../messages';
import { useOnChange, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { CountdownBar } from '../components/TimerBar';
import { UiIcon } from '../components/Icons';

const LETTERS = ['A', 'B', 'C', 'D'] as const;

export function DoVuiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as DoVuiView;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useOnChange(view.index, () => {
    if (view.doublePoints) {
      playMemePool('twist', { cooldownMs: 1800 });
      play('sparkle');
    }
  });

  useOnChange(view.phase, (ph) => {
    if (ph === 'reveal') {
      const ok = view.myAnswer !== null && view.myAnswer === view.correctIndex;
      const streak = view.streaks[game.me ?? ''] ?? 0;
      playMemePool(ok ? (streak >= 2 ? 'win' : 'correct') : 'wrong', { cooldownMs: 900 });
      play(ok ? 'stamp' : 'error');
    }
  });

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
    if (!res.ok) {
      playMemePool('wrong', { cooldownMs: 1200 });
      play('error');
      setErr(actionText[res.reason] ?? 'Không gửi được đáp án');
    } else {
      playMemePool('turn_move', { cooldownMs: 2200 });
      play('pop');
    }
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
          <T style={[styles.waitNote, { color: pal.muted }]}>
            {view.myAnswer !== null
              ? `Đã chọn ${LETTERS[view.myAnswer]} · Đã trả lời ${view.answeredIds.length}/${view.order.length}`
              : `Chạm chọn 1 đáp án · ${view.answeredIds.length}/${view.order.length} đã trả lời`}
          </T>
        ) : (
          <T style={[styles.waitNote, { color: myCorrect ? C.jade : C.danger }]}>
            {myCorrect ? 'Chính xác, đã cộng điểm vào bảng xếp hạng' : 'Chưa đúng, chuẩn bị sang câu tiếp theo'}
          </T>
        )
      }
    >
      <View style={styles.rootStage}>
        <CompactPlayerStrip
          room={room}
          game={game}
          order={sortedBoard}
          dark={pal.dark}
          rank={(p: PublicPlayer) => rankMap.get(p.id)}
          ring={(p: PublicPlayer) => {
            if (view.phase === 'reveal' && view.picks) {
              return view.picks[p.id] === view.correctIndex ? C.jade : C.danger;
            }
            return answeredSet.has(p.id) ? C.goldDeep : undefined;
          }}
          sub={(p: PublicPlayer) => {
            const sc = view.scores[p.id] ?? 0;
            const st = view.streaks[p.id] ?? 0;
            return st >= 2 ? `x${st} · ${sc}đ` : `${sc}đ`;
          }}
          testID="dv-player-strip"
        />

        {/* Header câu hỏi trên thẻ giấy ngà thống nhất */}
        <View style={[styles.qHeader, sticker(1), compact && styles.qHeaderCompact, view.doublePoints && styles.qHeaderDouble]}>
          <View style={styles.qMetaRow}>
            <UiIcon name="HelpCircle" size={15} color={C.secondary} strokeWidth={1.65} />
            <T style={styles.qIndex}>Câu {view.index}/{view.total}</T>
            <View style={styles.catChip}>
              <T numberOfLines={1} style={styles.catTxt}>
                {DO_VUI_TOPICS.find((t) => t.id === view.selectedTopic)?.shortName ?? view.category}
              </T>
            </View>
            {view.difficulty && (
              <View
                testID={`dv-level-${view.difficulty}`}
                style={styles.diffChip}
              >
                <T
                  style={[
                    styles.diffTxt,
                    view.difficulty === 'easy'
                      ? { color: C.jade }
                      : view.difficulty === 'hard'
                        ? { color: C.danger }
                        : { color: C.secondary },
                  ]}
                >
                  {view.difficulty === 'easy'
                    ? 'Dễ · 16s'
                    : view.difficulty === 'medium'
                      ? 'Vừa · 22s'
                      : 'Khó · 30s'}
                </T>
              </View>
            )}
            {view.doublePoints && (
              <View style={styles.x2Chip}>
                <UiIcon name="Zap" size={11} color={C.goldDeep} strokeWidth={1.8} />
                <T style={styles.x2Txt}>x2 điểm</T>
              </View>
            )}
          </View>
          <T
            testID="dv-question"
            style={[
              styles.qText,
              {
                fontSize: compact ? 14 : wide ? 17 : 15,
                lineHeight: compact ? 19 : wide ? 23 : 21,
              },
            ]}
          >
            {view.question}
          </T>
          <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="dv-timer" />
        </View>

        {err && <T style={styles.err}>{err}</T>}

        {/* 4 đáp án đồng nhất thẻ giấy ngà; chỉ tô màu nghĩa khi chọn hoặc mở đáp án */}
        <View style={[styles.optGrid, wide ? styles.optGridWide : styles.optGridMobile, compact && { gap: 6 }]}>
          {view.options.map((text, idx) => {
            const letter = LETTERS[idx];
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
                  sticker(1),
                  wide ? styles.optBtnWide : styles.optBtnMobile,
                  compact && styles.optBtnCompact,
                  picked && view.phase === 'question' && styles.optPicked,
                  isCorrect && styles.optCorrect,
                  isWrongPick && styles.optWrong,
                  faded && { opacity: 0.45 },
                ]}
              >
                <View
                  style={[
                    styles.letterBadge,
                    compact && styles.letterBadgeCompact,
                    picked && view.phase === 'question' && { backgroundColor: C.goldDeep },
                    isCorrect && { backgroundColor: C.jade },
                    isWrongPick && { backgroundColor: C.danger },
                  ]}
                >
                  <T
                    style={[
                      styles.letterTxt,
                      compact && { fontSize: 12.5 },
                      (picked || isCorrect || isWrongPick) && { color: '#FFFFFF' },
                    ]}
                  >
                    {letter}
                  </T>
                </View>
                <T numberOfLines={3} style={[styles.optTxt, compact && styles.optTxtCompact]}>{text}</T>
                {isCorrect && <UiIcon name="CheckCircle2" size={17} color={C.jade} strokeWidth={1.8} />}
                {isWrongPick && <UiIcon name="XCircle" size={17} color={C.danger} strokeWidth={1.8} />}
                {view.phase === 'reveal' && pickCount > 0 && (
                  <T style={styles.countTxt}>{pickCount}</T>
                )}
              </Pressable>
            );
          })}
        </View>

        {view.phase === 'reveal' && view.explain && (
          <View style={styles.explainBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <UiIcon name="Lightbulb" size={14} color={C.jadeDeep} strokeWidth={1.65} />
              <T style={styles.explainTitle}>Giải thích</T>
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

  qHeader: {
    backgroundColor: C.paper,
    borderRadius: 14,
    padding: 12,
    gap: 7,
    flexShrink: 0,
  },
  qHeaderCompact: { padding: 9, gap: 5, borderRadius: 12 },
  qHeaderDouble: { borderColor: C.goldDeep },
  qMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  qIndex: { fontSize: 13, fontWeight: '600', color: C.ink, fontVariant: ['tabular-nums'] },
  catChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    maxWidth: 130,
  },
  catTxt: { fontSize: 11.5, fontWeight: '500', color: C.secondary },
  diffChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  diffTxt: { fontSize: 11.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  x2Chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.28)',
  },
  x2Txt: { fontSize: 11.5, fontWeight: '600', color: C.goldDeep },
  qText: { fontWeight: '600', color: C.ink, fontFamily: FONT },

  optGrid: { flex: 1, minHeight: 0 },
  optGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignContent: 'center' },
  optGridMobile: { flexDirection: 'column', gap: 8, justifyContent: 'space-between' },

  optBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  optBtnWide: { flexBasis: '48.6%', minHeight: 70, padding: 12 },
  optBtnMobile: { flex: 1, minHeight: 40, maxHeight: 78, paddingHorizontal: 10, paddingVertical: 8 },
  optBtnCompact: { minHeight: 38, paddingHorizontal: 9, paddingVertical: 6, gap: 8, borderRadius: 10 },
  optPicked: { backgroundColor: C.goldSoft, borderColor: C.goldDeep, borderWidth: 1.5 },
  optCorrect: { backgroundColor: C.jadeSoft, borderColor: C.jade, borderWidth: 1.5 },
  optWrong: { backgroundColor: C.dangerSoft, borderColor: C.danger, borderWidth: 1.5 },
  letterBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letterBadgeCompact: { width: 24, height: 24, borderRadius: 6 },
  letterTxt: { color: C.ink, fontWeight: '600', fontSize: 13 },
  optTxt: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500', color: C.ink },
  optTxtCompact: { fontSize: 13, lineHeight: 17 },
  countTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.secondary,
    backgroundColor: C.mist,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontVariant: ['tabular-nums'],
  },

  explainBox: {
    flexShrink: 0,
    backgroundColor: C.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 2,
  },
  explainTitle: { fontSize: 12, fontWeight: '600', color: C.jadeDeep },
  explainTxt: { fontSize: 12.5, fontWeight: '400', color: C.ink, lineHeight: 17 },

  waitNote: { fontSize: 12.5, fontWeight: '500', textAlign: 'center', paddingVertical: 2, fontVariant: ['tabular-nums'] },
  err: { fontSize: 12.5, fontWeight: '500', color: C.danger, textAlign: 'center' },
});
