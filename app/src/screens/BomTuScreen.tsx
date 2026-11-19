import { useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { BomTuView } from '../../../shared/src/bomtu';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { KeyboardLift } from '../components/KeyboardLift';
import { useSecondsLeft, useStableWindow } from '../hooks';
import { EmojiIcon, UiIcon } from '../components/Icons';

export function BomTuScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as BomTuView;
  const me = game.me ?? '';
  const isHolder = view.holderId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);

  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width, height } = useStableWindow();
  const wide = width >= 720;
  const compact = height < 720 || width < 380;

  const [pulse] = useState(() => new Animated.Value(1));
  const secsLeft = useSecondsLeft(view.fuseEndsAt, game.clockOffset, view.fuseSeconds);
  const panic = secsLeft <= 3;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: panic ? 1.14 : 1.06, duration: panic ? 200 : 480, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: panic ? 200 : 480, useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulse, panic]);

  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const submitWord = async () => {
    const clean = word.trim();
    if (!clean || busy) return;
    setBusy(true);
    setErr(null);
    const res = await game.act({ type: 'bt_submit', word: clean });
    setBusy(false);
    if (!res.ok) {
      setErr(actionText[res.reason] ?? 'Từ chưa hợp lệ!');
    } else {
      setWord('');
    }
  };

  const renderBottom = () => {
    if (!aliveSet.has(me)) {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Bạn đã hết tim! Cùng cổ vũ những người còn lại nhé.</T>;
    }
    if (!isHolder) {
      return (
        <T style={[styles.waitNote, { color: theme.onBg }]}>
          Quả bom đang trên tay {view.names[view.holderId ?? ''] ?? '...'} — Chuẩn bị sẵn từ chứa tiếng «{view.bombSyllable}»!
        </T>
      );
    }
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          <View style={styles.alertRow}>
            <UiIcon name="Flame" size={16} color={panic ? '#FCA5A5' : '#FDE047'} />
            <T style={[styles.dockAlert, { color: panic ? '#FCA5A5' : theme.onBg }]}>
              NHANH TAY! Gõ từ 2 chữ chứa tiếng «{view.bombSyllable.toUpperCase()}» để chuyền bom!
            </T>
          </View>
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="bt-input"
              value={word}
              onChangeText={(t) => { setWord(t); if (err) setErr(null); }}
              onSubmitEditing={submitWord}
              placeholder={`Ví dụ: từ chứa «${view.bombSyllable}»...`}
              placeholderTextColor={C.muted}
              maxLength={40}
              style={styles.input}
            />
            <Button testID="bt-submit" disabled={busy || !word.trim()} iconNode={<UiIcon name="Send" size={15} color="#271400" />} title="Nộp!" onPress={submitWord} />
          </View>
        </View>
      </KeyboardLift>
    );
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip bottom={renderBottom()}>
      <View style={styles.root}>
        <CompactPlayerStrip
          room={room}
          game={game}
          order={view.order}
          activeId={view.holderId}
          dim={(p: PublicPlayer) => !aliveSet.has(p.id)}
          ring={(p: PublicPlayer) => (p.id === view.holderId ? C.danger : !aliveSet.has(p.id) ? '#64748B' : undefined)}
          sub={(p: PublicPlayer) => {
            const h = view.hearts[p.id] ?? 0;
            return h > 0 ? `${h}❤️` : 'Loại';
          }}
        />

        {view.lastBoom && (
          <View style={styles.boomBanner}>
            <EmojiIcon emoji="💥" size={16} />
            <T numberOfLines={1} style={styles.boomTxt}>
              BÙM!! {view.lastBoom.name} ôm bom tiếng «{view.lastBoom.syllable}» mất 1 tim!
            </T>
          </View>
        )}

        {/* Quả Bom Đếm Ngược Ở Trung Tâm */}
        <View testID="bt-bomb" style={[styles.bombStage, compact && styles.bombStageCompact, sticker(4), panic && styles.bombStagePanic]}>
          <View style={styles.stageMeta}>
            <T style={styles.metaChip}>Vòng {view.round}</T>
            <T style={styles.metaChip}>Đã nối: {view.usedCount} từ</T>
          </View>
          <Animated.View style={[styles.bombHalo, compact && styles.bombHaloCompact, panic && styles.bombHaloPanic, { transform: [{ scale: pulse }] }]}>
            <EmojiIcon emoji={panic ? '🧨' : '💣'} size={compact ? 40 : 56} />
          </Animated.View>
          <T style={styles.bombPrompt}>GÕ TỪ 2 CHỮ CÓ TIẾNG</T>
          <View style={[styles.syllablePill, compact && { paddingHorizontal: 18, paddingVertical: 4 }]}>
            <T testID="bt-syllable" style={[styles.syllableTxt, compact && { fontSize: 21 }]}>{view.bombSyllable.toUpperCase()}</T>
          </View>
          <T numberOfLines={1} style={styles.holderTxt}>
            Đang cháy: <T style={{ fontWeight: '900', color: '#FDE047' }}>{view.names[view.holderId ?? ''] ?? '...'}</T>
          </T>
          <CountdownBar endsAt={view.fuseEndsAt} total={view.fuseSeconds} clockOffset={game.clockOffset} testID="bt-timer" lightText />
        </View>

        {/* Vòng Người Chơi & Lịch Sử Chuyền Bom (cuộn nội bộ nếu đông, 0 outer scroll) */}
        <ScrollView style={styles.arenaScroll} contentContainerStyle={styles.arenaScrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.grid}>
            {view.order.map((id) => {
              const player = playerMap.get(id);
              const h = view.hearts[id] ?? 0;
              const isHolding = view.holderId === id;
              const dead = !aliveSet.has(id);
              return (
                <View
                  key={id}
                  testID={`bt-seat-${id}`}
                  style={[
                    styles.seat,
                    compact && styles.seatCompact,
                    { flexBasis: wide ? '23.5%' : '31%' },
                    isHolding && styles.seatHolding,
                    dead && styles.seatDead,
                  ]}
                >
                  {isHolding && (
                    <View style={styles.bombBadge}>
                      <EmojiIcon emoji="💣" size={14} />
                    </View>
                  )}
                  {player ? (
                    <Portrait p={player} size={compact ? 28 : 38} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
                  ) : (
                    <UiIcon name={dead ? 'Skull' : 'User'} size={22} color={dead ? C.danger : C.muted} />
                  )}
                  <NameText fx={player?.cosmetics?.nameFx} numberOfLines={1} style={styles.seatName}>
                    {view.names[id] ?? id}
                  </NameText>
                  <View style={styles.heartsRow}>
                    {h > 0 ? (
                      Array.from({ length: 3 }, (_, idx) => (
                        <UiIcon key={idx} name={idx < h ? 'Heart' : 'HeartOff'} size={12} color={idx < h ? '#EF4444' : '#CBD5E1'} />
                      ))
                    ) : (
                      <T style={styles.deadTag}>Đã nổ</T>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {view.recent.length > 0 && (
            <Card style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <UiIcon name="Zap" size={14} color={C.goldDeep} />
                <T style={styles.secTitle}>Lịch Sử Chuyền Bom</T>
              </View>
              <View style={{ gap: 2 }}>
                {view.recent.slice(-5).reverse().map((entry) => (
                  <T key={entry.id} style={[styles.logTxt, entry.boom && { color: '#DC2626', fontWeight: '900' }]}>
                    <T style={{ fontWeight: '900' }}>{entry.name}: </T>{entry.word}
                  </T>
                ))}
              </View>
            </Card>
          )}
        </ScrollView>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, gap: 6 },
  boomBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FEE2E2', borderRadius: 12, borderWidth: 1.5, borderColor: '#DC2626', paddingVertical: 6, paddingHorizontal: 10,
  },
  boomTxt: { color: '#991B1B', fontWeight: '900', fontSize: 12, textAlign: 'center', flexShrink: 1 },

  bombStage: {
    backgroundColor: '#0F172A', borderRadius: 18, padding: 12, alignItems: 'center', gap: 6,
  },
  bombStageCompact: {
    paddingHorizontal: 10, paddingVertical: 8, gap: 4, borderRadius: 16,
  },
  bombStagePanic: { backgroundColor: '#450A0A', borderColor: '#EF4444' },
  stageMeta: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  metaChip: { color: '#CBD5E1', fontSize: 10.5, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  bombHalo: {
    width: 82, height: 82, borderRadius: 41, backgroundColor: 'rgba(255,197,61,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,197,61,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  bombHaloCompact: { width: 60, height: 60, borderRadius: 30 },
  bombHaloPanic: {
    backgroundColor: 'rgba(239,68,68,0.22)', borderColor: 'rgba(239,68,68,0.6)',
  },
  bombPrompt: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  syllablePill: { backgroundColor: '#FDE047', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 5 },
  syllableTxt: { color: C.ink, fontSize: 24, fontWeight: '900', fontFamily: FONT },
  holderTxt: { color: '#F8FAFC', fontSize: 12.5, fontWeight: '700' },

  arenaScroll: { flex: 1, minHeight: 0 },
  arenaScrollContent: { gap: 6, paddingBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 92, maxWidth: '48%', alignItems: 'center', gap: 3,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.14)',
    paddingVertical: 7, paddingHorizontal: 5, position: 'relative',
  },
  seatCompact: { paddingVertical: 5, gap: 2, borderRadius: 12 },
  seatHolding: { borderColor: '#DC2626', borderWidth: 2.5, backgroundColor: '#FEF2F2' },
  seatDead: { opacity: 0.5, backgroundColor: '#E2E8F0' },
  bombBadge: { position: 'absolute', top: 4, right: 4 },
  seatName: { fontSize: 11.5, fontWeight: '900', color: C.ink, textAlign: 'center', maxWidth: '100%' },
  heartsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 14 },
  deadTag: { fontSize: 10.5, fontWeight: '900', color: C.danger },

  secTitle: { fontSize: 13, fontWeight: '900', color: C.ink },
  logTxt: { fontSize: 12, color: C.ink },

  dock: { gap: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dockAlert: { fontSize: 13, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#FFFFFF', borderColor: 'rgba(28,32,36,0.22)', borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, color: C.ink, fontSize: 14, fontWeight: '700',
  },
  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.muted, paddingVertical: 6 },
  err: { fontSize: 12, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
});
