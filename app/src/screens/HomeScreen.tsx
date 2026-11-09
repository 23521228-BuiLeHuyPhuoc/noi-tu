import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import type { Game } from '../useGame';
import { storage } from '../storage';
import { getInviteCode } from '../web';
import { Button, colors, common } from '../ui';

export function HomeScreen({ game }: { game: Game }) {
  const [name, setName] = useState('');
  const invite = useState(getInviteCode)[0];
  const [code, setCode] = useState(invite ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storage.getName().then((n) => n && setName(n));
  }, []);

  const online = game.status === 'online';
  const trimmed = name.trim();

  const run = async (fn: () => Promise<string | null>) => {
    if (!trimmed) return setError('Nhập tên của bạn trước nhé.');
    setBusy(true);
    setError(await fn());
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={common.screen} keyboardShouldPersistTaps="handled">
      <Text style={common.title}>Nối Từ</Text>
      <Text style={common.muted}>Nối từ tiếng Việt cùng bạn bè — hơn 45.000 từ.</Text>

      {!online && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={common.muted}>
            Đang kết nối tới server… (server miễn phí có thể mất khoảng 1 phút để thức dậy)
          </Text>
        </View>
      )}
      {game.notice && <Text style={common.error}>{game.notice}</Text>}
      {invite && (
        <Text testID="invite-hint" style={[common.muted, { color: colors.primaryDark }]}>
          Bạn được mời vào phòng {invite}. Nhập tên rồi bấm “Vào phòng” nhé!
        </Text>
      )}

      <Text style={common.label}>Tên của bạn</Text>
      <TextInput
        testID="name-input"
        style={common.input}
        value={name}
        onChangeText={setName}
        placeholder="Ví dụ: Phước"
        maxLength={20}
        autoCorrect={false}
      />

      <Button testID="create-btn" title="Tạo phòng mới" disabled={!online || busy} onPress={() => run(() => game.createRoom(trimmed))} />

      <View style={[common.card, { gap: 10 }]}>
        <Text style={common.label}>Hoặc vào phòng của bạn bè</Text>
        <TextInput
          testID="code-input"
          style={[common.input, { letterSpacing: 4, textAlign: 'center', fontWeight: '700' }]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="MÃ PHÒNG"
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          testID="join-btn"
          title="Vào phòng"
          variant="ghost"
          disabled={!online || busy || code.trim().length !== 6}
          onPress={() => run(() => game.joinRoom(code, trimmed))}
        />
      </View>

      {error && <Text testID="home-error" style={common.error}>{error}</Text>}
    </ScrollView>
  );
}
