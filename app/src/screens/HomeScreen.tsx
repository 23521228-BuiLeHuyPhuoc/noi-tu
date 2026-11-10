import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GAME_INFO, type GameType } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { storage } from '../storage';
import { getInviteCode } from '../web';
import { GAME_META } from '../messages';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T } from '../ui';

const GAMES: GameType[] = ['wordchain', 'ludo', 'baucua', 'typhu'];

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
    if (!trimmed) return setError('Nhập tên của bạn trước đã nhé.');
    setBusy(true);
    setError(await fn());
    setBusy(false);
  };

  const join = (
    <Card style={styles.joinCard}>
      <T testID={invite ? 'invite-hint' : undefined} style={styles.h2}>
        {invite ? `Bạn được mời vào phòng ${invite}` : 'Có mã phòng của bạn bè?'}
      </T>
      <View style={styles.joinRow}>
        <TextInput
          testID="code-input"
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="Mã 6 ký tự"
          placeholderTextColor={C.muted}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          testID="join-btn"
          title="Vào"
          variant={invite ? 'gold' : 'ink'}
          disabled={!online || busy || code.length !== 6}
          style={{ minWidth: 92 }}
          onPress={() => run(() => game.joinRoom(code, trimmed))}
        />
      </View>
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <T style={styles.logo}>Xóm Lầy</T>
        <T style={styles.tagline}>Nối từ, cờ cá ngựa, bầu cua. Rủ bạn bè vào chơi ngay trên điện thoại.</T>
      </View>

      {!online && (
        <View testID="connecting" style={styles.status}>
          <ActivityIndicator color={C.gold} />
          <T style={styles.statusText}>Đang gọi server dậy… lần đầu có thể mất khoảng 1 phút.</T>
        </View>
      )}
      {game.notice && <T style={styles.notice}>{game.notice}</T>}

      <Card style={{ gap: 8 }}>
        <T style={styles.h2}>Bạn tên gì?</T>
        <TextInput
          testID="name-input"
          style={styles.input}
          value={name}
          onChangeText={(t) => {
            setName(t);
            setError(null);
          }}
          placeholder="Ví dụ: Phước"
          placeholderTextColor={C.muted}
          maxLength={24}
          autoCorrect={false}
        />
      </Card>

      {error && <T testID="home-error" style={styles.error}>{error}</T>}

      {invite && join}

      <T style={styles.section}>Tạo phòng mới</T>
      {GAMES.map((g) => (
        <Pressable
          key={g}
          testID={`create-${g}`}
          accessibilityRole="button"
          disabled={!online || busy}
          onPress={() => run(() => game.createRoom(trimmed, g))}
          style={({ pressed }) => [
            styles.gameCard,
            sticker(pressed ? 1 : 5),
            pressed && { transform: [{ translateY: 4 }] },
            (!online || busy) && { opacity: 0.5 },
          ]}
        >
          <T style={styles.gameEmoji}>{GAME_META[g].emoji}</T>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={styles.gameTitle}>{GAME_INFO[g].name}</T>
            <T style={styles.gameTag}>{GAME_META[g].tagline}</T>
            <T style={styles.gamePlayers}>{GAME_META[g].players}</T>
          </View>
          <T style={styles.go}>›</T>
        </Pressable>
      ))}

      {!invite && join}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 16, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  hero: { paddingTop: 12, paddingBottom: 4, gap: 6 },
  logo: { fontSize: 52, fontWeight: '900', color: C.gold, letterSpacing: -2, lineHeight: 56 },
  tagline: { fontSize: 16, color: C.onSon, lineHeight: 23, maxWidth: 360 },
  status: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.sonDark, padding: 12, borderRadius: 14 },
  statusText: { color: C.onSon, flex: 1, fontSize: 14 },
  notice: { color: C.ink, backgroundColor: C.gold, padding: 10, borderRadius: 12, fontWeight: '700' },
  h2: { fontSize: 17, fontWeight: '800' },
  input: {
    fontFamily: FONT, backgroundColor: C.mist, borderRadius: 14, paddingHorizontal: 14, height: 52,
    fontSize: 18, color: C.ink, borderWidth: 2, borderColor: C.ink, fontWeight: '600',
  },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 10, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  section: { color: C.onSon, fontWeight: '800', fontSize: 15, marginTop: 4 },
  gameCard: {
    backgroundColor: C.paper, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  gameEmoji: { fontSize: 44 },
  gameTitle: { fontSize: 21, fontWeight: '900' },
  gameTag: { fontSize: 14, color: C.muted },
  gamePlayers: { fontSize: 13, fontWeight: '700', color: C.jade },
  go: { fontSize: 36, fontWeight: '900', color: C.son },
  joinCard: { gap: 10 },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 4, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' },
});
