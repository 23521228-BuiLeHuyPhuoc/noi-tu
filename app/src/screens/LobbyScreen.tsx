import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GAME_INFO, type GameType, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { shareInvite } from '../web';
import { GAME_META, RULES } from '../messages';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';

const GAMES: GameType[] = ['wordchain', 'ludo', 'baucua', 'typhu'];

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const feed = useFeed();
  const isHost = room.hostId === game.me;
  const info = GAME_INFO[room.gameType];
  const n = room.players.length;
  const tooFew = n < info.min;
  const tooMany = n > info.max;

  const share = async () => {
    const r = await shareInvite(room.code);
    if (r === 'copied') feed('Đã sao chép link mời. Dán vào Zalo hoặc Messenger nhé', 'good');
  };

  const startLabel = tooFew
    ? `Cần ít nhất ${info.min} người`
    : tooMany
      ? `${info.name} tối đa ${info.max} người`
      : n === 1
        ? 'Chơi một mình'
        : `Bắt đầu ${info.name}`;

  return (
    <Shell
      game={game}
      room={room}
      bottom={
        <>
          {error && <T style={styles.error}>{error}</T>}
          {isHost ? (
            <Button
              testID="start-btn"
              title={startLabel}
              disabled={tooFew || tooMany}
              onPress={async () => setError(await game.start())}
            />
          ) : (
            <T style={styles.wait}>Chờ chủ phòng bắt đầu…</T>
          )}
        </>
      }
    >
      <Card style={styles.invite}>
        <T style={styles.label}>Mã phòng</T>
        <T testID="room-code" selectable style={styles.code}>{room.code}</T>
        <Button testID="share-btn" icon="📨" title="Gửi link mời bạn bè" variant="gold" onPress={share} />
        <T style={styles.hint}>
          {n}/{room.maxPlayers} người trong phòng. Chạm vào avatar của bạn bè để chọc họ.
        </T>
      </Card>

      <T style={styles.section}>{isHost ? 'Chọn game' : 'Game của phòng'}</T>
      {isHost ? (
        <View style={styles.games}>
          {GAMES.map((g) => {
            const on = g === room.gameType;
            return (
              <Pressable
                key={g}
                testID={`pick-${g}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => game.configure({ gameType: g })}
                style={[styles.pick, sticker(on ? 4 : 2), on && styles.pickOn]}
              >
                <T style={styles.pickEmoji}>{GAME_META[g].emoji}</T>
                <T numberOfLines={1} style={styles.pickName}>{GAME_INFO[g].name}</T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card style={styles.chosen}>
          <T style={styles.pickEmoji}>{GAME_META[room.gameType].emoji}</T>
          <T style={styles.chosenName}>{info.name}</T>
        </Card>
      )}

      {room.gameType === 'ludo' && (
        <Card style={{ gap: 10 }}>
          <T style={styles.h3}>Số ngựa mỗi người</T>
          <View style={styles.row}>
            {([2, 4] as const).map((k) => (
              <Button
                key={k}
                testID={`pieces-${k}`}
                small
                variant={room.settings.ludoPieces === k ? 'ink' : 'paper'}
                title={k === 2 ? '2 con (nhanh)' : '4 con (chuẩn)'}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { ludoPieces: k } })}
              />
            ))}
          </View>
        </Card>
      )}

      <Card style={{ gap: 8 }}>
        <T style={styles.h3}>Luật chơi</T>
        {RULES[room.gameType].map((r) => (
          <T key={r} style={styles.rule}>• {r}</T>
        ))}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  invite: { gap: 8, alignItems: 'stretch' },
  label: { color: C.muted, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  code: { fontSize: 46, fontWeight: '900', letterSpacing: 8, textAlign: 'center', color: C.son, lineHeight: 52 },
  hint: { color: C.muted, fontSize: 14, textAlign: 'center' },
  section: { color: C.onSon, fontWeight: '800', fontSize: 15 },
  games: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  pick: {
    width: '48%', backgroundColor: C.paper, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  pickOn: { backgroundColor: C.gold },
  pickEmoji: { fontSize: 30 },
  pickName: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chosenName: { fontSize: 22, fontWeight: '900' },
  h3: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  rule: { fontSize: 15, lineHeight: 22 },
  wait: { color: C.onSon, textAlign: 'center', fontWeight: '700', paddingVertical: 14 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 8, borderRadius: 10, fontWeight: '700', textAlign: 'center' },
});
