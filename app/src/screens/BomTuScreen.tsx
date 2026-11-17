import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import type { BomTuView } from '../../../shared/src/bomtu';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { KeyboardLift } from '../components/KeyboardLift';
import { useSecondsLeft } from '../hooks';
import { EmojiIcon, UiIcon } from '../components/Icons';

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

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.holderId,
      dim: (p: PublicPlayer) => !aliveSet.has(p.id),
      ring: (p: PublicPlayer) => (p.id === view.holderId ? C.danger : !aliveSet.has(p.id) ? '#64748B' : undefined),
      sub: (p: PublicPlayer) => {
        const h = view.hearts[p.id] ?? 0;
        return h > 0 ? `${h} tim` : 'Loại';
      },
    }),
    [view.order, view.holderId, view.hearts, aliveSet],
  );

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
    <Shell game={game} room={room} strip={strip} bottom={renderBottom()}>
      {view.lastBoom && (
        <View style={styles.boomBanner}>
          <EmojiIcon emoji="💥" size={18} />
          <T style={styles.boomTxt}>
            BÙM!! {view.lastBoom.name} ôm bom tiếng «{view.lastBoom.syllable}» mất 1 tim!
          </T>
        </View>
      )}

      {/* Quả Bom Đếm Ngược Ở Trung Tâm */}
      <View testID="bt-bomb" style={[styles.bombStage, sticker(4), panic && styles.bombStagePanic]}>
        <View style={styles.stageMeta}>
          <T style={styles.metaChip}>Vòng {view.round}</T>
          <T style={styles.metaChip}>Đã nối: {view.usedCount} từ</T>
        </View>
        <Animated.View style={[styles.bombHalo, panic && styles.bombHaloPanic, { transform: [{ scale: pulse }] }]}>
          <EmojiIcon emoji={panic ? '🧨' : '💣'} size={62} />
        </Animated.View>
        <T style={styles.bombPrompt}>GÕ TỪ 2 CHỮ CÓ TIẾNG</T>
        <View style={styles.syllablePill}>
          <T testID="bt-syllable" style={styles.syllableTxt}>{view.bombSyllable.toUpperCase()}</T>
        </View>
        <T style={styles.holderTxt}>
          Đang cháy trên tay: <T style={{ fontWeight: '900', color: '#FDE047' }}>{view.names[view.holderId ?? ''] ?? '...'}</T>
        </T>
        <CountdownBar endsAt={view.fuseEndsAt} total={view.fuseSeconds} clockOffset={game.clockOffset} testID="bt-timer" lightText />
      </View>

      {/* Vòng Người Chơi & Tim Vector */}
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
              {isHolding && (
                <View style={styles.bombBadge}>
                  <EmojiIcon emoji="💣" size={16} />
                </View>
              )}
              {player ? (
                <Portrait p={player} size={42} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
              ) : (
                <UiIcon name={dead ? 'Skull' : 'User'} size={24} color={dead ? C.danger : C.muted} />
              )}
              <NameText fx={player?.cosmetics?.nameFx} style={styles.seatName}>
                {view.names[id] ?? id}
              </NameText>
              <View style={styles.heartsRow}>
                {h > 0 ? (
                  Array.from({ length: 3 }, (_, idx) => (
                    <UiIcon key={idx} name={idx < h ? 'Heart' : 'HeartOff'} size={13} color={idx < h ? '#EF4444' : '#CBD5E1'} />
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
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <UiIcon name="Zap" size={15} color={C.goldDeep} />
            <T style={styles.secTitle}>Lịch Sử Chuyền Bom</T>
          </View>
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
  boomBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: 14, borderWidth: 1.5, borderColor: '#DC2626', padding: 10,
  },
  boomTxt: { color: '#991B1B', fontWeight: '900', fontSize: 13, textAlign: 'center', flexShrink: 1 },

  bombStage: {
    backgroundColor: '#0F172A', borderRadius: 22, padding: 15, alignItems: 'center', gap: 8,
  },
  bombStagePanic: { backgroundColor: '#450A0A', borderColor: '#EF4444' },
  stageMeta: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  metaChip: { color: '#CBD5E1', fontSize: 11, fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  bombHalo: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,197,61,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(255,197,61,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  bombHaloPanic: {
    backgroundColor: 'rgba(239,68,68,0.22)', borderColor: 'rgba(239,68,68,0.6)',
  },
  bombPrompt: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  syllablePill: { backgroundColor: '#FDE047', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 6 },
  syllableTxt: { color: C.ink, fontSize: 25, fontWeight: '900', fontFamily: FONT },
  holderTxt: { color: '#F8FAFC', fontSize: 13, fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 96, maxWidth: '48%', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.14)',
    paddingVertical: 10, paddingHorizontal: 6, position: 'relative',
  },
  seatHolding: { borderColor: '#DC2626', borderWidth: 2.5, backgroundColor: '#FEF2F2' },
  seatDead: { opacity: 0.5, backgroundColor: '#E2E8F0' },
  bombBadge: { position: 'absolute', top: 6, right: 6 },
  seatName: { fontSize: 12, fontWeight: '900', color: C.ink, textAlign: 'center' },
  heartsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 16 },
  deadTag: { fontSize: 11, fontWeight: '900', color: C.danger },

  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
  logTxt: { fontSize: 13, color: C.ink },

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
