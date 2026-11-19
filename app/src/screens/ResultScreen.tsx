import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GAME_INFO, type GameType, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { play } from '../sound';
import { C, backdropPalette, sticker } from '../theme';
import { Button, Card, T } from '../ui';
import { Shell } from '../components/Shell';
import { Confetti } from '../components/Fun';
import { Portrait } from '../components/Avatar';
import { NameText, TitleBadge } from '../components/Cosmetics';
import { UiIcon } from '../components/Icons';

const GAMES: GameType[] = [
  'wordchain', 'wordchain_en', 'baucua', 'typhu',
  'masoi', 'giandiep', 've_doan', 'bom_tu', 'do_vui',
  'loto', 'caro', 'croaksquad', 'ca_sau', 'boom_online', 'uno_mercy',
];

export function ResultScreen({ game, room }: { game: Game; room: RoomState }) {
  const r = room.result!;
  const isHost = room.hostId === game.me;
  const winIds = r.winnerIds ?? (r.winnerId ? [r.winnerId] : []);
  const hasWinner = winIds.length > 0;
  const iWon = !!game.me && winIds.includes(game.me);
  const [error, setError] = useState<string | null>(null);
  const playerById = new Map(room.players.map((p) => [p.id, p]));
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);

  useEffect(() => {
    play(iWon || !hasWinner ? 'win' : 'lose');
  }, [iWon, hasWinner]);

  const cleanHeadline = r.headline.replace(/!+$/g, '').trim();

  return (
    <Shell
      game={game}
      room={room}
      bottom={
        isHost ? (
          <>
            {error && <T style={styles.error}>{error}</T>}
            <Button
              testID="restart-btn"
              variant="ink"
              iconNode={<UiIcon name="RotateCcw" size={16} color={C.onSon} strokeWidth={1.65} />}
              title={`Chơi lại ${GAME_INFO[room.gameType].name}`}
              onPress={async () => setError(await game.restart())}
            />
          </>
        ) : (
          <T style={[styles.wait, { color: pal.muted }]}>Chờ chủ phòng chọn ván tiếp theo</T>
        )
      }
    >
      {(iWon || !hasWinner) && <Confetti />}
      <Card style={[styles.heroCard, sticker(2)]}>
        <View style={[styles.trophyRing, iWon && styles.trophyRingWin]}>
          <UiIcon name={iWon ? 'Trophy' : hasWinner ? 'Award' : 'Star'} size={28} color={iWon ? C.goldDeep : C.secondary} strokeWidth={1.65} />
        </View>
        <T testID="result-title" style={styles.headline}>
          {iWon ? 'Bạn đã chiến thắng' : cleanHeadline}
        </T>
        {iWon && <T style={styles.sub}>{cleanHeadline}</T>}
      </Card>

      <Card style={{ gap: 6 }}>
        {r.ranking.map((e, i) => {
          const pl = playerById.get(e.playerId);
          const isWinnerRow = winIds.includes(e.playerId) || i === 0;
          return (
            <View key={e.playerId} style={[styles.rank, isWinnerRow && styles.first]}>
              <View style={styles.rankNumBox}>
                <T style={[styles.rankNumTxt, isWinnerRow && styles.rankNumWin]}>#{i + 1}</T>
              </View>
              <Portrait
                p={pl ?? { avatar: i }}
                size={40}
                border={1.5}
                frame={pl?.cosmetics?.frame}
                pet={pl?.cosmetics?.pet}
              />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <NameText fx={pl?.cosmetics?.nameFx} style={styles.name}>
                    {e.playerId === game.me ? `${e.name} (bạn)` : e.name}
                  </NameText>
                  {pl?.cosmetics?.title && (
                    <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
                      <TitleBadge title={pl.cosmetics.title} />
                    </View>
                  )}
                </View>
                <T style={styles.detail}>{e.detail.replace(/!+$/g, '')}</T>
              </View>
            </View>
          );
        })}
      </Card>

      {isHost && (
        <Card style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <UiIcon name="LayoutGrid" size={16} color={C.secondary} strokeWidth={1.65} />
            <T style={{ fontSize: 14.5, fontWeight: '600', color: C.ink }}>Đổi sang trò chơi khác</T>
          </View>
          <View style={styles.row}>
            {GAMES.filter((g) => g !== room.gameType).map((g) => (
              <Button
                key={g}
                testID={`switch-${g}`}
                small
                variant="paper"
                title={GAME_INFO[g].name}
                style={{ flexGrow: 1, minWidth: 112 }}
                onPress={async () => setError(await game.configure({ gameType: g }))}
              />
            ))}
          </View>
        </Card>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  trophyRing: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trophyRingWin: {
    backgroundColor: C.goldSoft,
    borderColor: 'rgba(180, 83, 9, 0.30)',
  },
  headline: { fontSize: 20, fontWeight: '600', color: C.ink, textAlign: 'center', lineHeight: 26 },
  sub: { color: C.secondary, fontSize: 13.5, textAlign: 'center', fontWeight: '400' },
  rank: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  first: { backgroundColor: C.goldSoft, borderColor: 'rgba(180, 83, 9, 0.25)' },
  rankNumBox: { width: 28, alignItems: 'center', justifyContent: 'center' },
  rankNumTxt: { fontSize: 13, fontWeight: '600', color: C.muted, fontVariant: ['tabular-nums'] },
  rankNumWin: { color: C.goldDeep },
  name: { fontWeight: '600', fontSize: 15, color: C.ink },
  detail: { color: C.secondary, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  wait: { textAlign: 'center', fontWeight: '500', fontSize: 14, paddingVertical: 12 },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 10, borderRadius: 10, fontWeight: '600', textAlign: 'center', fontSize: 13 },
});
