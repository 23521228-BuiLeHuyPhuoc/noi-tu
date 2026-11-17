import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GAME_INFO, type GameType, type RoomState } from '../../../shared/src/types';
import { themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { GAME_META } from '../messages';
import { play } from '../sound';
import { C } from '../theme';
import { Button, Card, T } from '../ui';
import { Shell } from '../components/Shell';
import { Confetti } from '../components/Fun';
import { Portrait } from '../components/Avatar';
import { NameText, TitleBadge } from '../components/Cosmetics';
import { EmojiIcon, RankMedal, UiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const GAMES: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu', 'masoi', 'giandiep', 've_doan', 'bom_tu', 'do_vui'];

export function ResultScreen({ game, room }: { game: Game; room: RoomState }) {
  const r = room.result!;
  const isHost = room.hostId === game.me;
  const winIds = r.winnerIds ?? (r.winnerId ? [r.winnerId] : []);
  const hasWinner = winIds.length > 0;
  const iWon = !!game.me && winIds.includes(game.me);
  const [error, setError] = useState<string | null>(null);
  const playerById = new Map(room.players.map((p) => [p.id, p]));
  const { width, height } = useWindowDimensions();
  const wide = width > height;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);

  useEffect(() => {
    play(iWon || !hasWinner ? 'win' : 'lose');
  }, [iWon, hasWinner]);

  return (
    <Shell
      game={game}
      room={room}
      bottom={
        isHost ? (
          <>
            {error && <T style={styles.error}>{error}</T>}
            <View style={wide ? styles.rowWide : undefined}>
              <Button
                testID="restart-btn"
                iconNode={<UiIcon name="RotateCcw" size={16} color="#271400" />}
                small={wide}
                style={wide ? { flexGrow: 1.4, flexBasis: '26%' } : undefined}
                title={`Chơi lại ${GAME_INFO[room.gameType].name}`}
                onPress={async () => setError(await game.restart())}
              />
              <View style={[styles.row, wide && { flex: 3 }]}>
                {GAMES.filter((g) => g !== room.gameType).map((g) => (
                  <Button
                    key={g}
                    testID={`switch-${g}`}
                    small
                    variant="paper"
                    icon={GAME_META[g].emoji}
                    title={GAME_INFO[g].name}
                    style={{ flexGrow: 1, minWidth: 102 }}
                    onPress={async () => setError(await game.configure({ gameType: g }))}
                  />
                ))}
              </View>
            </View>
          </>
        ) : (
          <T style={[styles.wait, { color: theme.onBg }]}>Chờ chủ phòng chọn ván tiếp theo…</T>
        )
      }
    >
      {(iWon || !hasWinner) && <Confetti />}
      <MotionSurface>
        <View style={styles.hero}>
          <View style={[styles.trophyRing, { borderColor: theme.accent }]}>
            <EmojiIcon emoji={iWon ? '🏆' : hasWinner ? '🎉' : '🏁'} size={54} />
          </View>
          <T testID="result-title" style={[styles.headline, { color: theme.accent }]}>
            {iWon ? 'Bạn thắng rồi!' : r.headline}
          </T>
          {iWon && <T style={[styles.sub, { color: theme.onBg }]}>{r.headline}</T>}
        </View>
      </MotionSurface>
      <Card style={{ gap: 6 }}>
        {r.ranking.map((e, i) => {
          const pl = playerById.get(e.playerId);
          const isWinnerRow = winIds.includes(e.playerId) || i === 0;
          return (
            <View key={e.playerId} style={[styles.rank, isWinnerRow && styles.first]}>
              <View style={styles.medalBox}>
                {winIds.includes(e.playerId) ? (
                  <EmojiIcon emoji="🏆" size={24} />
                ) : (
                  <RankMedal rank={i + 1} size={22} />
                )}
              </View>
              <Portrait
                p={pl ?? { avatar: i }}
                size={44}
                frame={pl?.cosmetics?.frame}
                pet={pl?.cosmetics?.pet}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <NameText fx={pl?.cosmetics?.nameFx} style={styles.name}>
                    {e.playerId === game.me ? `${e.name} (bạn)` : e.name}
                  </NameText>
                  {pl?.cosmetics?.title && <TitleBadge title={pl.cosmetics.title} />}
                </View>
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
  hero: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  trophyRing: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(15,23,42,0.42)',
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  headline: { fontSize: 26, fontWeight: '900', color: C.gold, textAlign: 'center', lineHeight: 33 },
  sub: { color: C.onSon, fontSize: 15, textAlign: 'center', fontWeight: '700' },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 14 },
  first: { backgroundColor: '#FEF9C3', borderWidth: 1, borderColor: 'rgba(217,119,6,0.28)' },
  medalBox: { width: 32, alignItems: 'center', justifyContent: 'center' },
  name: { fontWeight: '800', fontSize: 16 },
  detail: { color: C.muted, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rowWide: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  wait: { color: C.onSon, textAlign: 'center', fontWeight: '700', paddingVertical: 14 },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 8, borderRadius: 10, fontWeight: '700', textAlign: 'center' },
});
