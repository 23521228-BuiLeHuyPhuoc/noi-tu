import { useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { Button, colors, common } from '../ui';

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const isHost = room.hostId === game.me;

  const share = async () => {
    try {
      await Share.share({ message: `Vào chơi Nối Từ với mình nhé! Mã phòng: ${room.code}` });
    } catch {
      // thiết bị không hỗ trợ chia sẻ: người dùng tự đọc mã phòng
    }
  };

  return (
    <ScrollView contentContainerStyle={common.screen}>
      <Text style={common.label}>Mã phòng</Text>
      <Text testID="room-code" selectable style={styles.code}>{room.code}</Text>
      <Button title="Chia sẻ mã phòng" variant="ghost" onPress={share} />

      <View style={[common.card, { gap: 8 }]}>
        <Text style={common.label}>
          Người chơi ({room.players.length}/{room.maxPlayers})
        </Text>
        {room.players.map((p) => (
          <View key={p.id} style={styles.player}>
            <View style={[styles.dot, { backgroundColor: p.connected ? colors.ok : colors.border }]} />
            <Text style={styles.name}>
              {p.name}
              {p.id === game.me ? ' (bạn)' : ''}
            </Text>
            {p.id === room.hostId && <Text style={styles.badge}>Chủ phòng</Text>}
          </View>
        ))}
      </View>

      <Text style={common.muted}>
        Luật: nối từ 2 chữ, chữ đầu phải trùng chữ cuối của từ trước. Mỗi lượt {room.turnSeconds} giây,
        gõ sai được gõ lại, hết giờ thì bị loại. Người còn lại cuối cùng thắng.
      </Text>

      {isHost ? (
        <Button
          testID="start-btn"
          title={room.players.length === 1 ? 'Chơi một mình' : 'Bắt đầu'}
          onPress={async () => setError(await game.start())}
        />
      ) : (
        <Text style={[common.muted, { textAlign: 'center' }]}>Đang chờ chủ phòng bắt đầu…</Text>
      )}
      {error && <Text style={common.error}>{error}</Text>}
      <Button title="Thoát phòng" variant="ghost" onPress={game.leave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  code: { fontSize: 44, fontWeight: '900', letterSpacing: 8, color: colors.primaryDark, textAlign: 'center' },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 18, color: colors.text, flex: 1 },
  badge: {
    fontSize: 12, color: colors.primaryDark, borderWidth: 1, borderColor: colors.primary,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
});
