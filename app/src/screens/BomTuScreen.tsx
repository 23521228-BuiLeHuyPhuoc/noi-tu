import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import type { BomTuView } from '../../../shared/src/bomtu';
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
import { useSecondsLeft } from '../hooks';

export function BomTuScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as BomTuView;
  const me = game.me ?? '';
  const isHolder = view.holderId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);

  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [pulse] = useState(() => new Animated.Value(1));
  const secsLeft = useSecondsLeft(view.fuseEndsAt, game.clockOffset, view.fuseSeconds);
  const panic = secsLeft <= 3;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: panic ? 1.12 : 1.05, duration: panic ? 200 : 480, useNativeDriver: false }),
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

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.holderId,
      dim: (p: PublicPlayer) => !aliveSet.has(p.id),
      ring: (p: PublicPlayer) => (p.id === view.holderId ? C.danger : !aliveSet.has(p.id) ? '#64748B' : undefined),
      sub: (p: PublicPlayer) => {
        const h = view.hearts[p.id] ?? 0;
        return h > 0 ? '❤️'.repeat(h) : '💥 Loại';
      },
    }),
    [view.order, view.holderId, view.hearts, aliveSet],
  );

  const renderBottom = () => {
    if (!aliveSet.has(me)) {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>💥 Bạn đã hết tim! Cùng cổ vũ những người còn lại nhé.</T>;
    }
    if (!isHolder) {
      return (
        <T style={[styles.waitNote, { color: theme.onBg }]}>
          💣 Quả bom đang trên tay {view.names[view.holderId ?? ''] ?? '...'} — Chuẩn bị sẵn từ chứa tiếng «{view.bombSyllable}»!
        </T>
      );
    }
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          <T style={[styles.dockAlert, panic && { color: '#DC2626' }]}>
            🔥 NHANH TAY! Gõ từ 2 chữ chứa tiếng «{view.bombSyllable.toUpperCase()}» để chuyền bom!
          </T>
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
            <Button testID="bt-submit" disabled={busy || !word.trim()} title="Nộp!" onPress={submitWord} />
          </View>
        </View>
      </KeyboardLift>
    );
  };

  return (
    <Shell game={game} room={room} strip={strip} bottom={renderBottom()}>
      {/* Thông Báo Nổ Bom Vừa Xảy Ra */}
      {view.lastBoom && (
        <View style={styles.boomBanner}>
          <T style={styles.boomTxt}>
            💥 BÙM!! {view.lastBoom.name} ôm bom tiếng «{view.lastBoom.syllable}» mất 1 tim!
          </T>
        </View>
      )}

      {/* Quả Bom Đếm Ngược Ở Trung Tâm */}
      <View testID="bt-bomb" style={[styles.bombStage, panic && styles.bombStagePanic]}>
        <View style={styles.stageMeta}>
          <T style={styles.metaChip}>Vòng {view.round}</T>
          <T style={styles.metaChip}>Đã nối: {view.usedCount} từ</T>
        </View>
        <Animated.Text style={[styles.bombEmoji, { transform: [{ scale: pulse }] }]}>
          {panic ? '🧨' : '💣'}
        </Animated.Text>
        <T style={styles.bombPrompt}>GÕ TỪ 2 CHỮ CÓ TIẾNG</T>
        <View style={styles.syllablePill}>
          <T testID="bt-syllable" style={styles.syllableTxt}>{view.bombSyllable.toUpperCase()}</T>
        </View>
        <T style={styles.holderTxt}>
          Đang cháy trên tay: <T style={{ fontWeight: '900', color: '#FDE047' }}>{view.names[view.holderId ?? ''] ?? '...'}</T>
        </T>
        <CountdownBar endsAt={view.fuseEndsAt} total={view.fuseSeconds} clockOffset={game.clockOffset} testID="bt-timer" lightText />
      </View>

      {/* Vòng Người Chơi & Tim */}
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
                { flexBasis: wide ? '23.5%' : '31.5%' },
                isHolding && styles.seatHolding,
                dead && styles.seatDead,
              ]}
            >
              {isHolding && <T style={styles.bombBadge}>💣</T>}
              {player ? (
                <Portrait p={player} size={42} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
              ) : (
                <T style={{ fontSize: 24 }}>{dead ? '💥' : '🧑'}</T>
              )}
              <NameText fx={player?.cosmetics?.nameFx} style={styles.seatName}>
                {view.names[id] ?? id}
              </NameText>
              <T style={styles.heartsTxt}>{h > 0 ? '❤️'.repeat(h) + '🤍'.repeat(Math.max(0, 3 - h)) : '💥 Loại'}</T>
            </View>
          );
        })}
      </View>

      {/* Lịch Sử Chuyền Bom */}
      {view.recent.length > 0 && (
        <Card>
          <T style={styles.secTitle}>⚡ Lịch Sử Chuyền Bom</T>
          <View style={{ gap: 4 }}>
            {view.recent.slice(-8).reverse().map((entry) => (
              <T key={entry.id} style={[styles.logTxt, entry.boom && { color: '#DC2626', fontWeight: '900' }]}>
                <T style={{ fontWeight: '900' }}>{entry.name}: </T>{entry.word}
              </T>
            ))}
          </View>
        </Card>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  boomBanner: { backgroundColor: '#FEE2E2', borderRadius: 14, borderWidth: 2, borderColor: '#DC2626', padding: 10 },
  boomTxt: { color: '#991B1B', fontWeight: '900', fontSize: 13, textAlign: 'center' },

  bombStage: {
    backgroundColor: '#1E293B', borderRadius: 18, borderWidth: 3, borderColor: C.ink,
    padding: 14, alignItems: 'center', gap: 6,
  },
  bombStagePanic: { backgroundColor: '#450A0A', borderColor: '#EF4444' },
  stageMeta: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  metaChip: { color: '#CBD5E1', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  bombEmoji: { fontSize: 54 },
  bombPrompt: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  syllablePill: { backgroundColor: '#FDE047', borderRadius: 14, borderWidth: 2.5, borderColor: C.ink, paddingHorizontal: 22, paddingVertical: 6 },
  syllableTxt: { color: C.ink, fontSize: 24, fontWeight: '900', fontFamily: FONT },
  holderTxt: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 96, maxWidth: '48%', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFDF8', borderRadius: 14, borderWidth: 2, borderColor: C.ink,
    paddingVertical: 9, paddingHorizontal: 6, position: 'relative',
  },
  seatHolding: { borderColor: '#DC2626', borderWidth: 3, backgroundColor: '#FEF2F2' },
  seatDead: { opacity: 0.5, backgroundColor: '#E2E8F0' },
  bombBadge: { position: 'absolute', top: 4, right: 6, fontSize: 16 },
  seatName: { fontSize: 12, fontWeight: '900', color: C.ink, textAlign: 'center' },
  heartsTxt: { fontSize: 12 },

  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 4 },
  logTxt: { fontSize: 13, color: C.ink },

  dock: { gap: 6 },
  dockAlert: { fontSize: 13, fontWeight: '900', textAlign: 'center', color: C.ink },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#FFFFFF', borderColor: C.ink, borderWidth: 2,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: C.ink, fontSize: 14, fontWeight: '700',
  },
  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: C.muted, paddingVertical: 6 },
  err: { fontSize: 12, fontWeight: '800', color: C.danger, textAlign: 'center' },
});
