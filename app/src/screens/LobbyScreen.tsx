import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { copyText, shareInvite } from '../web';
import { Button, colors, common } from '../ui';

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const isHost = room.hostId === game.me;

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const share = async () => {
    const r = await shareInvite(room.code);
    if (r === 'copied') flash('Đã sao chép link mời — dán vào Zalo/Messenger gửi bạn bè nhé');
  };

  return (
    <ScrollView contentContainerStyle={common.screen}>
      <Text style={common.label}>Mã phòng (chạm để sao chép)</Text>
      <Pressable onPress={async () => (await copyText(room.code)) && flash('Đã sao chép mã phòng')}>
        <Text testID="room-code" selectable style={styles.code}>{room.code}</Text>
      </Pressable>
      <Button testID="share-btn" title="Gửi link mời bạn bè" onPress={share} />
      {toast && <Text testID="toast" style={styles.toast}>{toast}</Text>}

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
  toast: { textAlign: 'center', color: colors.ok, fontWeight: '600' },
  player: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 18, color: colors.text, flex: 1 },
  badge: {
    fontSize: 12, color: colors.primaryDark, borderWidth: 1, borderColor: colors.primary,
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
  },
});
