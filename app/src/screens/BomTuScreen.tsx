import { useEffect, useMemo, useState } from 'react';
import { Animated, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { BomTuView } from '../../../shared/src/bomtu';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, backdropPalette, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { KeyboardLift } from '../components/KeyboardLift';
import { useOnChange, useSecondsLeft, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { UiIcon } from '../components/Icons';

export function BomTuScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as BomTuView;
  const me = game.me ?? '';
  const isHolder = view.holderId === me;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);

  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width, height } = useStableWindow();
  const wide = width >= 720;
  const compact = height < 720 || width < 380;

  const [pulse] = useState(() => new Animated.Value(1));
  const secsLeft = useSecondsLeft(view.fuseEndsAt, game.clockOffset, view.fuseSeconds);
  const panic = secsLeft <= 3;

  // Chỉ tạo xung nhịp khi bom thực sự sắp nổ (<= 3s), tắt hoàn toàn nhịp đập vô nghĩa lúc bình thường
  useEffect(() => {
    if (!panic) {
      pulse.setValue(1);
      return;
    }
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 220, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 1, duration: 220, useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [pulse, panic]);

  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const lastRecent = view.recent[view.recent.length - 1];
  useOnChange(lastRecent?.id ?? 0, (id) => {
    if (!id || !lastRecent) return;
    if (lastRecent.boom) {
      playMemePool('bomb', { cooldownMs: 1000 });
      play('boom');
    } else if (lastRecent.playerId !== me) {
      playMemePool('turn_move', { cooldownMs: 2400 });
      play('pop');
    }
  });
  useOnChange(view.alive.length, (len) => {
    if (len < view.order.length) {
      playMemePool('eliminated', { cooldownMs: 1200 });
      play('ko');
    }
  });
  useOnChange(panic && isHolder, (isPanic) => {
    if (isPanic) {
      playMemePool('shock', { cooldownMs: 3000 });
      play('siren');
    }
  });
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const submitWord = async () => {
    const clean = word.trim();
    if (!clean || busy) return;
    setBusy(true);
    setErr(null);
    const res = await game.act({ type: 'bt_submit', word: clean });
    setBusy(false);
    if (!res.ok) {
      playMemePool('wrong', { cooldownMs: 1000 });
      play('error');
      setErr(actionText[res.reason] ?? 'Từ chưa hợp lệ');
    } else {
      playMemePool('turn_move', { cooldownMs: 2000 });
      play('stamp');
      setWord('');
    }
  };

  const renderBottom = () => {
    if (!aliveSet.has(me)) {
      return <T style={[styles.waitNote, { color: pal.muted }]}>Bạn đã hết tim. Theo dõi và cổ vũ mọi người nhé.</T>;
    }
    if (!isHolder) {
      return (
        <T style={[styles.waitNote, { color: pal.muted }]}>
          Bom đang trên tay {view.names[view.holderId ?? ''] ?? '...'} · Chuẩn bị sẵn từ chứa tiếng «{view.bombSyllable}»
        </T>
      );
    }
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          <View style={styles.alertRow}>
            <UiIcon name="Flame" size={15} color={panic ? C.danger : C.goldDeep} strokeWidth={1.7} />
            <T style={[styles.dockAlert, { color: panic ? C.danger : pal.text }]}>
              Gõ từ 2 chữ chứa tiếng «{view.bombSyllable}» để chuyền bom
            </T>
          </View>
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.inputRow}>
            <TextInput
              testID="bt-input"
              value={word}
              onChangeText={(t) => { setWord(t); if (err) setErr(null); }}
              onSubmitEditing={submitWord}
              placeholder={`Ví dụ: từ chứa «${view.bombSyllable}»`}
              placeholderTextColor={C.muted}
              maxLength={40}
              style={styles.input}
            />
            <Button
              testID="bt-submit"
              variant="ink"
              disabled={busy || !word.trim()}
              iconNode={<UiIcon name="Send" size={15} color={busy || !word.trim() ? C.muted : C.onSon} strokeWidth={1.65} />}
              title="Nộp"
              onPress={submitWord}
            />
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
          dark={pal.dark}
          dim={(p: PublicPlayer) => !aliveSet.has(p.id)}
          ring={(p: PublicPlayer) => (p.id === view.holderId ? C.danger : !aliveSet.has(p.id) ? C.muted : undefined)}
          sub={(p: PublicPlayer) => {
            const h = view.hearts[p.id] ?? 0;
            return h > 0 ? `${h} tim` : 'Loại';
          }}
        />

        {view.lastBoom && (
          <View style={styles.boomBanner}>
            <UiIcon name="AlertTriangle" size={15} color={C.danger} strokeWidth={1.7} />
            <T numberOfLines={1} style={styles.boomTxt}>
              {view.lastBoom.name} giữ bom tiếng «{view.lastBoom.syllable}» mất 1 tim
            </T>
          </View>
        )}

        {/* Thẻ Bom trung tâm phong cách Dossier giấy ngà ấm (Ink khi gấp <= 3s) */}
        <View testID="bt-bomb" style={[styles.bombStage, compact && styles.bombStageCompact, sticker(2), panic && styles.bombStagePanic]}>
          <View style={styles.stageMeta}>
            <T style={[styles.metaChip, panic && styles.metaChipPanic]}>Vòng {view.round}</T>
            <T style={[styles.metaChip, panic && styles.metaChipPanic]}>Đã nối: {view.usedCount} từ</T>
          </View>
          <Animated.View style={[styles.bombHalo, compact && styles.bombHaloCompact, panic && styles.bombHaloPanic, { transform: [{ scale: pulse }] }]}>
            <UiIcon name={panic ? 'Flame' : 'Bomb'} size={compact ? 26 : 32} color={panic ? '#FFFFFF' : C.ink} strokeWidth={1.65} />
          </Animated.View>
          <T style={[styles.bombPrompt, panic && { color: 'rgba(255,255,255,0.82)' }]}>Gõ từ 2 chữ có tiếng</T>
          <View style={[styles.syllablePill, compact && { paddingHorizontal: 16, paddingVertical: 4 }, panic && styles.syllablePillPanic]}>
            <T testID="bt-syllable" style={[styles.syllableTxt, compact && { fontSize: 20 }]}>{view.bombSyllable}</T>
          </View>
          <T numberOfLines={1} style={[styles.holderTxt, panic && { color: '#FFFFFF' }]}>
            Đang giữ bom: <T style={{ fontWeight: '600', color: panic ? '#FEF08A' : C.goldDeep }}>{view.names[view.holderId ?? ''] ?? '...'}</T>
          </T>
          <CountdownBar endsAt={view.fuseEndsAt} total={view.fuseSeconds} clockOffset={game.clockOffset} testID="bt-timer" lightText={panic} />
        </View>

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
                      <UiIcon name="Bomb" size={12} color={C.danger} strokeWidth={1.75} />
                    </View>
                  )}
                  {player ? (
                    <Portrait p={player} size={compact ? 28 : 36} border={1.5} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
                  ) : (
                    <UiIcon name={dead ? 'Skull' : 'User'} size={20} color={dead ? C.danger : C.muted} strokeWidth={1.65} />
                  )}
                  <NameText fx={player?.cosmetics?.nameFx} numberOfLines={1} style={styles.seatName}>
                    {view.names[id] ?? id}
                  </NameText>
                  <View style={styles.heartsRow}>
                    {h > 0 ? (
                      Array.from({ length: 3 }, (_, idx) => (
                        <UiIcon key={idx} name={idx < h ? 'Heart' : 'HeartOff'} size={12} color={idx < h ? C.danger : C.borderStrong} strokeWidth={1.65} />
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <UiIcon name="History" size={14} color={C.secondary} strokeWidth={1.65} />
                <T style={styles.secTitle}>Lịch sử chuyền bom</T>
              </View>
              <View style={{ gap: 2 }}>
                {view.recent.slice(-5).reverse().map((entry) => (
                  <T key={entry.id} style={[styles.logTxt, entry.boom && { color: C.danger, fontWeight: '600' }]}>
                    <T style={{ fontWeight: '600', color: C.ink }}>{entry.name}: </T>{entry.word}
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
  root: { flex: 1, minHeight: 0, gap: 8 },
  boomBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: C.dangerSoft, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(185,28,28,0.28)',
    paddingVertical: 6, paddingHorizontal: 10,
  },
  boomTxt: { color: C.danger, fontWeight: '500', fontSize: 12.5, textAlign: 'center', flexShrink: 1 },

  bombStage: {
    backgroundColor: C.paper, borderRadius: 14, padding: 12, alignItems: 'center', gap: 6,
  },
  bombStageCompact: {
    paddingHorizontal: 10, paddingVertical: 8, gap: 4, borderRadius: 12,
  },
  bombStagePanic: { backgroundColor: '#7F1D1D', borderColor: C.danger },
  stageMeta: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' },
  metaChip: {
    color: C.secondary, fontSize: 11.5, fontWeight: '500', fontVariant: ['tabular-nums'],
    backgroundColor: C.mist, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  metaChipPanic: { color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.16)' },
  bombHalo: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: C.goldSoft,
    borderWidth: 1, borderColor: 'rgba(180,83,9,0.28)', alignItems: 'center', justifyContent: 'center',
  },
  bombHaloCompact: { width: 52, height: 52, borderRadius: 26 },
  bombHaloPanic: {
    backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.35)',
  },
  bombPrompt: { color: C.secondary, fontSize: 12, fontWeight: '500' },
  syllablePill: { backgroundColor: C.goldSoft, borderWidth: 1, borderColor: 'rgba(180,83,9,0.28)', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 5 },
  syllablePillPanic: { backgroundColor: '#FEF08A', borderColor: '#FFFFFF' },
  syllableTxt: { color: C.ink, fontSize: 22, fontWeight: '600', fontFamily: FONT },
  holderTxt: { color: C.secondary, fontSize: 12.5, fontWeight: '400' },

  arenaScroll: { flex: 1, minHeight: 0 },
  arenaScrollContent: { gap: 8, paddingBottom: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 92, maxWidth: '48%', alignItems: 'center', gap: 3,
    backgroundColor: C.paper, borderRadius: 12, borderWidth: 1, borderColor: C.borderSubtle,
    paddingVertical: 7, paddingHorizontal: 6, position: 'relative',
  },
  seatCompact: { paddingVertical: 5, gap: 2, borderRadius: 10 },
  seatHolding: { borderColor: C.danger, borderWidth: 1.5, backgroundColor: C.dangerSoft },
  seatDead: { opacity: 0.5, backgroundColor: C.mist },
  bombBadge: { position: 'absolute', top: 5, right: 5 },
  seatName: { fontSize: 12, fontWeight: '600', color: C.ink, textAlign: 'center', maxWidth: '100%' },
  heartsRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 14 },
  deadTag: { fontSize: 11, fontWeight: '600', color: C.danger },

  secTitle: { fontSize: 13, fontWeight: '600', color: C.ink },
  logTxt: { fontSize: 12.5, color: C.secondary },

  dock: { gap: 6 },
  alertRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dockAlert: { fontSize: 12.5, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderColor: C.borderStrong, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, height: 42, color: C.ink, fontSize: 14, fontWeight: '500', fontFamily: FONT,
  },
  waitNote: { fontSize: 12.5, fontWeight: '500', textAlign: 'center', paddingVertical: 4 },
  err: { fontSize: 12.5, fontWeight: '500', color: C.danger, textAlign: 'center' },
});
