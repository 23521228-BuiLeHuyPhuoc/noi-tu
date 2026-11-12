import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GAME_INFO, type GameType } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { storage } from '../storage';
import { getInviteCode } from '../web';
import { GAME_META } from '../messages';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T } from '../ui';
import { AuthSheet, GuestAvatarButton, ProfileCard, ProfileSheet } from '../components/Account';
import { WalletSheet } from '../components/Wallet';
import { AdminSheet } from '../components/Admin';
import { CheckinSheet, ShopSheet } from '../components/Shop';
import { LeaderboardSheet, OpenRooms } from '../components/RoomTools';

const GAMES: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu'];

export function HomeScreen({ game }: { game: Game }) {
  const [name, setName] = useState('');
  const invite = useState(getInviteCode)[0];
  const [code, setCode] = useState(invite ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [profile, setProfile] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  // chấm đỏ trên nút Điểm danh khi hôm nay chưa nhận
  const [checkinFor, setCheckinFor] = useState<string | null>(null);
  const [board, setBoard] = useState(false);
  const user = game.user;

  useEffect(() => {
    storage.getName().then((n) => n && setName(n));
  }, []);

  const online = game.status === 'online';
  const canCheckin = !!user && online && checkinFor === user.id;
  const { checkinStatus } = game;
  const uid = user?.id;
  useEffect(() => {
    if (!uid || !online) return;
    let live = true;
    void checkinStatus().then((r) => live && setCheckinFor(r.ok && r.data.canClaim ? uid : null));
    return () => {
      live = false;
    };
  }, [uid, online, checkinStatus]);
  // đã đăng nhập thì dùng tên của tài khoản
  const trimmed = user ? user.displayName : name.trim();

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
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {!user && (
          // khách: hai nút Đăng nhập / Đăng ký ở đầu trang
          <View testID="auth-buttons" style={styles.authTop}>
            <Button testID="auth-open" small variant="paper" title="Đăng nhập" disabled={!online} style={styles.authBtn} onPress={() => setAuth('login')} />
            <Button testID="register-open" small variant="gold" title="Đăng ký" disabled={!online} style={styles.authBtn} onPress={() => setAuth('register')} />
          </View>
        )}
        <View style={styles.hero}>
          <T style={styles.logo}>Xóm Lầy</T>
          <T style={styles.tagline}>Nối từ Việt – Anh, bầu cua, cờ tỷ phú. Rủ bạn bè vào chơi ngay trên điện thoại.</T>
        </View>

        {!online && (
          <View testID="connecting" style={styles.status}>
            <ActivityIndicator color={C.gold} />
            <T style={styles.statusText}>Đang gọi server dậy… lần đầu có thể mất khoảng 1 phút.</T>
          </View>
        )}
        {game.notice && <T style={styles.notice}>{game.notice}</T>}

        {user ? (
          <ProfileCard user={user} onEdit={() => setProfile(true)} onWallet={() => setWalletOpen(true)} onAdmin={() => setAdminOpen(true)} onShop={() => setShopOpen(true)} />
        ) : (
          <Card style={{ gap: 8 }}>
            <T style={styles.h2}>Bạn tên gì?</T>
            <View style={styles.nameRow}>
              <GuestAvatarButton game={game} onPress={() => setProfile(true)} />
              <TextInput
                testID="name-input"
                style={[styles.input, { flex: 1, minWidth: 0 }]}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setError(null);
                  void storage.setName(t.trim());
                }}
                placeholder="Ví dụ: Phước"
                placeholderTextColor={C.muted}
                maxLength={24}
                autoCorrect={false}
              />
            </View>
            <T style={styles.authHint}>Chạm vào ảnh để chọn mặt đại diện hoặc tải ảnh của bạn (đổi lại được cả trong ván).</T>
            <T style={styles.authHint}>Chơi khách được luôn, hoặc đăng ký để giữ tên, Ruby và thành tích.</T>
            <Button testID="wallet-open-guest" small variant="ghost" icon="💎" title="Nạp Ruby (cần tài khoản)" disabled={!online} onPress={() => setAuth('register')} />
          </Card>
        )}

        {user && (
          <View>
            <Button testID="checkin-open" icon="🎁" title="Điểm danh nhận Ruby" variant="gold" disabled={!online} onPress={() => setCheckinOpen(true)} />
            {canCheckin && <View testID="checkin-dot" style={styles.dot} />}
          </View>
        )}

        {error && (
          <T testID="home-error" style={styles.error}>
            {error}
          </T>
        )}

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

        <T style={styles.section}>Vào phòng có sẵn</T>
        <OpenRooms game={game} disabled={!online || busy} onJoin={(c) => run(() => game.joinRoom(c, trimmed))} />
        <Button testID="leaderboard-open" icon="🏆" title="Bảng xếp hạng" variant="paper" onPress={() => setBoard(true)} />
      </ScrollView>
      {board && <LeaderboardSheet game={game} onClose={() => setBoard(false)} />}
      {walletOpen && user && <WalletSheet game={game} onClose={() => setWalletOpen(false)} />}
      {shopOpen && user && <ShopSheet game={game} onClose={() => setShopOpen(false)} />}
      {checkinOpen && user && (
        <CheckinSheet
          game={game}
          onClose={() => setCheckinOpen(false)}
          onChanged={() => setCheckinFor(null)}
        />
      )}
      {adminOpen && user?.admin && <AdminSheet game={game} onClose={() => setAdminOpen(false)} />}
      {auth && <AuthSheet game={game} initial={auth} defaultName={name.trim()} onClose={() => setAuth(null)} />}
      {profile && (
        <ProfileSheet
          game={game}
          initialName={name.trim()}
          onClose={() => {
            setProfile(false);
            // khách đổi tên trong bảng: cập nhật ô nhập tên
            if (!user) storage.getName().then((n) => n && setName(n));
          }}
        />
      )}
    </View>
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
    fontFamily: FONT,
    backgroundColor: C.mist,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    fontSize: 18,
    color: C.ink,
    borderWidth: 2,
    borderColor: C.ink,
    fontWeight: '600',
  },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 10, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  section: { color: C.onSon, fontWeight: '800', fontSize: 15, marginTop: 4 },
  gameCard: {
    backgroundColor: C.paper,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  gameEmoji: { fontSize: 44 },
  gameTitle: { fontSize: 21, fontWeight: '900' },
  gameTag: { fontSize: 14, color: C.muted },
  gamePlayers: { fontSize: 13, fontWeight: '700', color: C.jade },
  go: { fontSize: 36, fontWeight: '900', color: C.son },
  joinCard: { gap: 10 },
  dot: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#E5252A', borderWidth: 2, borderColor: '#fff' },
  authTop: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  authBtn: { minWidth: 104, marginBottom: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authHint: { fontSize: 13, color: C.muted },
  authLink: { fontSize: 13, color: C.son, fontWeight: '800', textDecorationLine: 'underline' },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 4, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' },
});
