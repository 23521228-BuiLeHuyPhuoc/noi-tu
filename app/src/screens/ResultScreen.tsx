import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GAME_INFO, type GameType, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { GAME_META } from '../messages';
import { play } from '../sound';
import { C } from '../theme';
import { Button, Card, T } from '../ui';
import { Shell } from '../components/Shell';
import { Confetti } from '../components/Fun';
import { Portrait } from '../components/Avatar';

const MEDALS = ['🥇', '🥈', '🥉'];
const GAMES: GameType[] = ['wordchain', 'baucua', 'typhu', 'ludo'];

export function ResultScreen({ game, room }: { game: Game; room: RoomState }) {
  const r = room.result!;
  const isHost = room.hostId === game.me;
  const iWon = r.winnerId === game.me;
  const [error, setError] = useState<string | null>(null);
  const playerById = new Map(room.players.map((p) => [p.id, p]));

  useEffect(() => {
    play(iWon || !r.winnerId ? 'win' : 'lose');
  }, [iWon, r.winnerId]);

  return (
    <Shell
      game={game}
      room={room}
      bottom={
        isHost ? (
          <>
            {error && <T style={styles.error}>{error}</T>}
            <Button testID="restart-btn" icon="🔁" title={`Chơi lại ${GAME_INFO[room.gameType].name}`} onPress={async () => setError(await game.restart())} />
            <View style={styles.row}>
              {GAMES.filter((g) => g !== room.gameType).map((g) => (
                <Button
                  key={g}
                  testID={`switch-${g}`}
                  small
                  variant="paper"
                  title={`${GAME_META[g].emoji} ${GAME_INFO[g].name}`}
                  style={{ flexGrow: 1, flexBasis: '30%' }}
                  onPress={async () => setError(await game.configure({ gameType: g }))}
                />
              ))}
            </View>
          </>
        ) : (
          <T style={styles.wait}>Chờ chủ phòng chọn ván tiếp theo…</T>
        )
      }
    >
      {(iWon || !r.winnerId) && <Confetti />}
      <View style={styles.hero}>
        <T style={styles.trophy}>{iWon ? '🏆' : r.winnerId ? '🎉' : '🏁'}</T>
        <T testID="result-title" style={styles.headline}>
          {iWon ? 'Bạn thắng rồi!' : r.headline}
        </T>
        {iWon && <T style={styles.sub}>{r.headline}</T>}
      </View>
      <Card style={{ gap: 4 }}>
        {r.ranking.map((e, i) => {
          const pl = playerById.get(e.playerId);
          return (
            <View key={e.playerId} style={[styles.rank, i === 0 && styles.first]}>
              <T style={styles.medal}>{MEDALS[i] ?? `${i + 1}.`}</T>
              <Portrait p={pl ?? { avatar: i }} size={44} />
              <View style={{ flex: 1 }}>
                <T style={styles.name}>{e.playerId === game.me ? `${e.name} (bạn)` : e.name}</T>
                <T style={styles.detail}>{e.detail}</T>
              </View>
            </View>
          );
        })}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingVertical: 8 },
  trophy: { fontSize: 64 },
  headline: { fontSize: 28, fontWeight: '900', color: C.gold, textAlign: 'center', lineHeight: 34 },
  sub: { color: C.onSon, fontSize: 16, textAlign: 'center' },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 12 },
  first: { backgroundColor: '#FFF3BF' },
  medal: { fontSize: 24, width: 34, textAlign: 'center', fontWeight: '900' },
  av: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', fontSize: 17 },
  detail: { color: C.muted, fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wait: { color: C.onSon, textAlign: 'center', fontWeight: '700', paddingVertical: 14 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 8, borderRadius: 10, fontWeight: '700', textAlign: 'center' },
});
