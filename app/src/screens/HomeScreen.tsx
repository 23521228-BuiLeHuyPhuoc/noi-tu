import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { GAME_INFO, type GameType } from '../../../shared/src/types';
import { ROOM_THEMES, themeById } from '../../../shared/src/themes';
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
import { MapBackdrop } from '../components/MapBackdrop';
import { Sheet } from '../components/Sheet';
import { useLocalTheme, useSmoothMode } from '../smoothMode';

const GAMES: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu', 'masoi', 'giandiep', 've_doan', 'bom_tu', 'do_vui'];

type Category = 'all' | 'hidden' | 'party' | 'word' | 'classic';
const CATS: { id: Category; label: string; games?: GameType[] }[] = [
  { id: 'all', label: 'Tất cả (9)' },
  { id: 'hidden', label: '🕵️ Ẩn vai', games: ['masoi', 'giandiep'] },
  { id: 'party', label: '🎉 Party', games: ['ve_doan', 'bom_tu', 'do_vui'] },
  { id: 'word', label: '🔤 Từ vựng', games: ['wordchain', 'wordchain_en'] },
  { id: 'classic', label: '🎲 Dân gian', games: ['baucua', 'typhu'] },
];

const BADGE_FOR: Partial<Record<GameType, { text: string; bg: string }>> = {
  masoi: { text: 'HOT', bg: '#DC2626' },
  giandiep: { text: 'MỚI', bg: '#D97706' },
  ve_doan: { text: 'MỚI', bg: '#7C3AED' },
  bom_tu: { text: 'MỚI', bg: '#EA580C' },
  do_vui: { text: 'MỚI', bg: '#059669' },
};

export function HomeScreen({ game }: { game: Game }) {
  const [name, setName] = useState('');
  const invite = useState(getInviteCode)[0];
  const [code, setCode] = useState(invite ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState<Category>('all');
  const [auth, setAuth] = useState<'login' | 'register' | null>(null);
  const [profile, setProfile] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  // chấm đỏ trên nút Điểm danh khi hôm nay chưa nhận
  const [checkinFor, setCheckinFor] = useState<string | null>(null);
  const [board, setBoard] = useState(false);

  const [smooth, setSmooth] = useSmoothMode();
  const [localTheme, setLocalTheme] = useLocalTheme();
  const { width } = useWindowDimensions();
  const twoCols = width >= 600;

  const user = game.user;
  const activeThemeId = localTheme ?? user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const theme = themeById(activeThemeId);

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

  const visibleGames = cat === 'all' ? GAMES : (CATS.find((c) => c.id === cat)?.games ?? GAMES);
  const ownedSet = new Set(user?.owned ?? []);

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
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth} />
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Hàng trên cùng: Thương hiệu + Công cụ nhanh + Tài khoản */}
        <View style={styles.topRow}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <T style={[styles.logo, { color: theme.accent }]}>Xóm Lầy</T>
            <T style={[styles.tagline, { color: theme.onBg }]}>
              9 trò chơi tụ tập 1–12 người · Chọc lầy, VIP Phú Hào & Map rực rỡ!
            </T>
          </View>
          {!user && (
            <View testID="auth-buttons" style={styles.authTop}>
              <Button testID="auth-open" small variant="paper" title="Đăng nhập" disabled={!online} style={styles.authBtn} onPress={() => setAuth('login')} />
              <Button testID="register-open" small variant="gold" title="Đăng ký" disabled={!online} style={styles.authBtn} onPress={() => setAuth('register')} />
            </View>
          )}
        </View>

        {/* Thanh công cụ nhanh: Điểm danh, BXH, Đổi Map, Siêu mượt */}
        <View style={styles.quickBar}>
          {user && (
            <View style={{ position: 'relative', flexGrow: 1 }}>
              <Button testID="checkin-open" small icon="🎁" title="Điểm danh" variant="gold" disabled={!online} onPress={() => setCheckinOpen(true)} style={{ width: '100%', marginBottom: 0 }} />
              {canCheckin && <View testID="checkin-dot" style={styles.dot} />}
            </View>
          )}
          <Button testID="leaderboard-open" small icon="🏆" title="Bảng vàng" variant="paper" onPress={() => setBoard(true)} style={styles.quickBtn} />
          <Button testID="home-map-open" small icon={theme.emoji} title="Đổi Map" variant="paper" onPress={() => setMapOpen(true)} style={styles.quickBtn} />
          <Button
            testID="smooth-toggle"
            small
            icon="⚡"
            title={smooth ? 'Mượt: BẬT' : 'Siêu mượt'}
            variant={smooth ? 'jade' : 'paper'}
            onPress={() => setSmooth(!smooth)}
            style={styles.quickBtn}
          />
        </View>

        {!online && (
          <View testID="connecting" style={styles.status}>
            <ActivityIndicator color={C.gold} />
            <T style={styles.statusText}>Đang gọi server dậy… lần đầu có thể mất khoảng 1 phút.</T>
          </View>
        )}
        {game.notice && <T style={styles.notice}>{game.notice}</T>}

        {/* Hồ sơ / Tên người chơi + Nhập mã vào phòng */}
        <View style={twoCols ? styles.identityGrid : styles.identityStack}>
          <View style={twoCols ? { flex: 1.15 } : undefined}>
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
                <T style={styles.authHint}>Chạm ảnh để chọn chân dung. Đăng ký để lưu Ruby & VIP.</T>
                <Button testID="wallet-open-guest" small variant="paper" icon="💎" title="Nạp Ruby (cần tài khoản)" disabled={!online} onPress={() => setAuth('register')} />
              </Card>
            )}
          </View>
          <View style={twoCols ? { flex: 0.85 } : undefined}>
            {join}
          </View>
        </View>

        {error && (
          <T testID="home-error" style={styles.error}>
            {error}
          </T>
        )}

        {/* Bộ lọc thể loại & Lưới 9 Trò Chơi */}
        <View style={{ gap: 10 }}>
          <T style={[styles.section, { color: theme.onBg }]}>Chọn trò chơi & Tạo phòng ngay</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.catRow}>
            {CATS.map((c) => {
              const on = cat === c.id;
              return (
                <Pressable
                  key={c.id}
                  testID={`cat-${c.id}`}
                  onPress={() => setCat(c.id)}
                  style={[styles.catPill, on && { backgroundColor: theme.accent, borderColor: C.ink }]}
                >
                  <T style={[styles.catTxt, on && { color: theme.accentText }]}>{c.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={twoCols ? styles.gameGridWide : styles.gameGridSingle}>
            {visibleGames.map((g) => {
              const badge = BADGE_FOR[g];
              return (
                <Pressable
                  key={g}
                  testID={`create-${g}`}
                  accessibilityRole="button"
                  disabled={!online || busy}
                  onPress={() => run(() => game.createRoom(trimmed, g))}
                  style={({ pressed }) => [
                    styles.gameCard,
                    twoCols && styles.gameCardWide,
                    sticker(pressed ? 1 : 4),
                    pressed && { transform: [{ translateY: 3 }] },
                    (!online || busy) && { opacity: 0.5 },
                  ]}
                >
                  <T style={styles.gameEmoji}>{GAME_META[g].emoji}</T>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <View style={styles.gameTitleRow}>
                      <T style={styles.gameTitle}>{GAME_INFO[g].name}</T>
                      {badge && (
                        <View style={[styles.newBadge, { backgroundColor: badge.bg }]}>
                          <T style={styles.newBadgeTxt}>{badge.text}</T>
                        </View>
                      )}
                    </View>
                    <T style={styles.gameTag}>{GAME_META[g].tagline}</T>
                    <T style={styles.gamePlayers}>{GAME_META[g].players}</T>
                  </View>
                  <T style={styles.go}>›</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <T style={[styles.section, { color: theme.onBg }]}>Phòng đang mở</T>
        <OpenRooms game={game} disabled={!online || busy} onJoin={(c) => run(() => game.joinRoom(c, trimmed))} />
      </ScrollView>

      {/* Hộp thoại Chọn Map Nhanh Trang Chủ */}
      {mapOpen && (
        <Sheet title="🎨 Chọn Map & Bảng Màu" onClose={() => setMapOpen(false)}>
          <T style={styles.mapNote}>
            5 Map miễn phí ai cũng dùng được ngay. Map Ruby tạo hiệu ứng hạt bay riêng & tăng điểm VIP!
          </T>
          <View style={{ gap: 8 }}>
            {ROOM_THEMES.map((t) => {
              const freeOrOwned = t.price === 0 || ownedSet.has(t.id);
              const active = activeThemeId === t.id;
              return (
                <Pressable
                  key={t.id}
                  testID={`home-map-${t.id}`}
                  onPress={() => {
                    if (freeOrOwned) {
                      setLocalTheme(t.id);
                      if (user && t.price > 0 && ownedSet.has(t.id)) {
                        void game.equipItem('roomTheme', t.id);
                      }
                      setMapOpen(false);
                    } else if (user) {
                      setMapOpen(false);
                      setShopOpen(true);
                    } else {
                      setMapOpen(false);
                      setAuth('register');
                    }
                  }}
                  style={[styles.mapRow, active && styles.mapRowOn]}
                >
                  <View style={[styles.mapSwatch, { backgroundColor: t.bg, borderColor: t.accent }]}>
                    <T style={{ fontSize: 22 }}>{t.emoji}</T>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.mapName}>{t.name}</T>
                    <T style={styles.mapDesc}>{t.desc}</T>
                  </View>
                  <T style={[styles.mapAction, active && { color: C.jade }]}>
                    {active ? '✔ Đang dùng' : freeOrOwned ? 'Chọn' : `💎${t.price}`}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </Sheet>
      )}

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
            if (!user) storage.getName().then((n) => n && setName(n));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, padding: 14, gap: 12, width: '100%', maxWidth: 820, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  logo: { fontSize: 42, fontWeight: '900', color: C.gold, letterSpacing: -1.5, lineHeight: 46 },
  tagline: { fontSize: 13, color: C.onSon, lineHeight: 19, fontWeight: '600' },
  quickBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quickBtn: { flexGrow: 1, marginBottom: 0, minWidth: 92 },
  status: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.sonDark, padding: 12, borderRadius: 14 },
  statusText: { color: C.onSon, flex: 1, fontSize: 14 },
  notice: { color: C.ink, backgroundColor: C.gold, padding: 10, borderRadius: 12, fontWeight: '700' },
  identityGrid: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  identityStack: { gap: 12 },
  h2: { fontSize: 17, fontWeight: '800' },
  input: {
    fontFamily: FONT,
    backgroundColor: C.mist,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 17,
    color: C.ink,
    borderWidth: 2,
    borderColor: C.ink,
    fontWeight: '600',
  },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 10, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  section: { color: C.onSon, fontWeight: '900', fontSize: 15, marginTop: 2 },
  catRow: { gap: 6, paddingBottom: 2 },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.88)', borderWidth: 1.5, borderColor: C.ink },
  catTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  gameGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  gameGridSingle: { gap: 10 },
  gameCard: {
    backgroundColor: C.paper,
    borderRadius: 18,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameCardWide: { width: '48.8%' },
  gameEmoji: { fontSize: 38 },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gameTitle: { fontSize: 18, fontWeight: '900' },
  newBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  newBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '900' },
  gameTag: { fontSize: 12, color: C.muted, lineHeight: 17 },
  gamePlayers: { fontSize: 12, fontWeight: '800', color: C.jade },
  go: { fontSize: 30, fontWeight: '900', color: C.son },
  joinCard: { gap: 10, justifyContent: 'center' },
  dot: { position: 'absolute', top: -4, right: -4, width: 15, height: 15, borderRadius: 8, backgroundColor: '#E5252A', borderWidth: 2, borderColor: '#fff' },
  authTop: { flexDirection: 'row', gap: 8 },
  authBtn: { minWidth: 96, marginBottom: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authHint: { fontSize: 12, color: C.muted },
  joinRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 4, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' },
  mapNote: { fontSize: 13, color: C.muted, lineHeight: 18 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: C.mist, borderWidth: 2, borderColor: 'transparent' },
  mapRowOn: { borderColor: C.jade, backgroundColor: '#ECFDF5' },
  mapSwatch: { width: 46, height: 46, borderRadius: 12, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  mapName: { fontSize: 14, fontWeight: '900', color: C.ink },
  mapDesc: { fontSize: 12, color: C.muted },
  mapAction: { fontSize: 12, fontWeight: '900', color: C.son },
});
