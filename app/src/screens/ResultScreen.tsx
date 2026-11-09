import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { Button, colors, common } from '../ui';

export function ResultScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const isHost = room.hostId === game.me;
  const winner = room.players.find((p) => p.id === room.winnerId);
  const solo = room.players.length === 1 && !room.winnerId;
  const ranking = [...room.players].sort((a, b) => b.words - a.words);
  const chain = room.history.flatMap((h) => (h.kind === 'word' || h.kind === 'start' || h.kind === 'newWord' ? [h.word] : []));

  return (
    <ScrollView contentContainerStyle={common.screen}>
      <Text testID="result-title" style={[common.title, { textAlign: 'center' }]}>
        {solo
          ? `Bạn nối được ${room.totalWords} từ!`
          : winner
            ? `🏆 ${winner.name}${winner.id === game.me ? ' (bạn)' : ''} thắng!`
            : 'Ván chơi kết thúc'}
      </Text>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.label}>Số từ đã nối</Text>
        {ranking.map((p) => (
          <View key={p.id} style={styles.rankRow}>
            <Text style={styles.rankName}>
              {p.name}
              {p.id === game.me ? ' (bạn)' : ''}
            </Text>
            <Text style={styles.rankScore}>{p.words}</Text>
          </View>
        ))}
      </View>

      <View style={[common.card, { gap: 6 }]}>
        <Text style={common.label}>Chuỗi từ của ván ({chain.length})</Text>
        <Text style={{ fontSize: 16, color: colors.text, lineHeight: 24 }}>{chain.join(' → ')}</Text>
      </View>

      {isHost ? (
        <Button testID="restart-btn" title="Chơi lại" onPress={async () => setError(await game.restart())} />
      ) : (
        <Text style={[common.muted, { textAlign: 'center' }]}>Đang chờ chủ phòng bấm chơi lại…</Text>
      )}
      {error && <Text style={common.error}>{error}</Text>}
      <Button title="Thoát phòng" variant="ghost" onPress={game.leave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  rankRow: { flexDirection: 'row', justifyContent: 'space-between' },
  rankName: { fontSize: 17, color: colors.text },
  rankScore: { fontSize: 17, fontWeight: '800', color: colors.primaryDark },
});
