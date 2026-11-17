import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
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
import { EmojiIcon, RubyIcon, UiIcon, type UiIconName } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const GAMES: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu', 'masoi', 'giandiep', 've_doan', 'bom_tu', 'do_vui'];

type Category = 'all' | 'hidden' | 'party' | 'word' | 'classic';
const CATS: { id: Category; label: string; icon?: UiIconName; games?: GameType[] }[] = [
  { id: 'all', label: 'Tất cả (9)', icon: 'LayoutGrid' },
  { id: 'hidden', label: 'Ẩn vai', icon: 'Eye', games: ['masoi', 'giandiep'] },
  { id: 'party', label: 'Party', icon: 'PartyPopper', games: ['ve_doan', 'bom_tu', 'do_vui'] },
  { id: 'word', label: 'Từ vựng', icon: 'BookOpen', games: ['wordchain', 'wordchain_en'] },
  { id: 'classic', label: 'Dân gian', icon: 'Dices', games: ['baucua', 'typhu'] },
];

const BADGE_FOR: Partial<Record<GameType, { text: string; grad: readonly [string, string] }>> = {
  masoi: { text: 'HOT', grad: ['#EF4444', '#B91C1C'] },
  giandiep: { text: 'MỚI', grad: ['#F59E0B', '#B45309'] },
  ve_doan: { text: 'MỚI', grad: ['#8B5CF6', '#5B21B6'] },
  bom_tu: { text: 'MỚI', grad: ['#F97316', '#C2410C'] },
  do_vui: { text: 'MỚI', grad: ['#10B981', '#047857'] },
};

const GAME_TILE_GRAD: Record<GameType, readonly [string, string]> = {
  wordchain: ['#FEF3C7', '#FDE68A'],
  wordchain_en: ['#DBEAFE', '#BFDBFE'],
  baucua: ['#FFE4E6', '#FECDD3'],
  typhu: ['#D1FAE5', '#A7F3D0'],
  masoi: ['#EDE9FE', '#DDD6FE'],
  giandiep: ['#E0E7FF', '#C7D2FE'],
  ve_doan: ['#FCE7F3', '#FBCFE8'],
  bom_tu: ['#FFEDD5', '#FED7AA'],
  do_vui: ['#CCFBF1', '#99F6E4'],
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
      <View style={styles.cardHeaderRow}>
        <View style={[styles.badgeCircle, { backgroundColor: '#FEF3C7' }]}>
          <UiIcon name="KeyRound" size={16} color="#B45309" />
        </View>
        <T testID={invite ? 'invite-hint' : undefined} style={styles.h2}>
          {invite ? `Bạn được mời vào phòng ${invite}` : 'Vào phòng nhanh'}
        </T>
      </View>
      <View style={styles.joinRow}>
        <TextInput
          testID="code-input"
          style={[styles.input, styles.codeInput]}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="MÃ 6 KÝ TỰ"
          placeholderTextColor={C.muted}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Button
          testID="join-btn"
          title="Vào"
          iconNode={<UiIcon name="LogIn" size={16} color={invite ? '#271400' : C.gold} />}
          variant={invite ? 'gold' : 'ink'}
          disabled={!online || busy || code.length !== 6}
          style={{ minWidth: 96 }}
          onPress={() => run(() => game.joinRoom(code, trimmed))}
        />
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth} />
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Hàng trên cùng: Thương hiệu + Tài khoản */}
        <View style={styles.topRow}>
          <View style={styles.brandGroup}>
            <View style={[styles.brandEmblem, { borderColor: theme.accent }]}>
              <EmojiIcon emoji={theme.emoji} size={28} />
            </View>
            <View style={{ flex: 1, minWidth: 160 }}>
              <T style={[styles.logo, { color: theme.accent }]}>Xóm Lầy</T>
              <T style={[styles.tagline, { color: theme.onBg }]}>
                9 trò chơi tụ tập 1–12 người · Avatar Studio & VIP Phú Hào
              </T>
            </View>
          </View>
          {!user && (
            <View testID="auth-buttons" style={styles.authTop}>
              <Button testID="auth-open" small variant="paper" iconNode={<UiIcon name="LogIn" size={15} color={C.ink} />} title="Đăng nhập" disabled={!online} style={styles.authBtn} onPress={() => setAuth('login')} />
              <Button testID="register-open" small variant="gold" iconNode={<UiIcon name="UserPlus" size={15} color="#271400" />} title="Đăng ký" disabled={!online} style={styles.authBtn} onPress={() => setAuth('register')} />
            </View>
          )}
        </View>

        {/* Thanh công cụ nhanh Frosted Glass */}
        <View
          style={[
            styles.quickBarWrap,
            Platform.OS === 'web' ? ({ backdropFilter: 'blur(12px)' } as object) : null,
          ]}
        >
          <View style={styles.quickBar}>
            {user && (
              <View style={{ position: 'relative', flexGrow: 1 }}>
                <Button testID="checkin-open" small icon="🎁" title="Điểm danh" variant="gold" disabled={!online} onPress={() => setCheckinOpen(true)} style={{ width: '100%' }} />
                {canCheckin && <View testID="checkin-dot" style={styles.dot} />}
              </View>
            )}
            <Button testID="leaderboard-open" small icon="🏆" title="Bảng vàng" variant="paper" onPress={() => setBoard(true)} style={styles.quickBtn} />
            <Button testID="home-map-open" small iconNode={<UiIcon name="Map" size={15} color={C.ink} />} title="Đổi Map" variant="paper" onPress={() => setMapOpen(true)} style={styles.quickBtn} />
            <Button
              testID="smooth-toggle"
              small
              iconNode={<UiIcon name="Gauge" size={15} color={smooth ? '#FFFFFF' : C.ink} />}
              title={smooth ? 'Mượt: BẬT' : 'Siêu mượt'}
              variant={smooth ? 'jade' : 'paper'}
              onPress={() => setSmooth(!smooth)}
              style={styles.quickBtn}
            />
          </View>
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
              <Card style={{ gap: 10 }}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.badgeCircle, { backgroundColor: '#FCE7F3' }]}>
                    <UiIcon name="User" size={16} color="#BE185D" />
                  </View>
                  <T style={styles.h2}>Bạn tên gì?</T>
                </View>
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
                <T style={styles.authHint}>Chạm ảnh để chọn chân dung Studio. Đăng ký để lưu Ruby & VIP.</T>
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
        <View style={{ gap: 12 }}>
          <View style={styles.sectionHeader}>
            <UiIcon name="Sparkles" size={16} color={theme.accent} />
            <T style={[styles.section, { color: theme.onBg }]}>Chọn trò chơi & Tạo phòng ngay</T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.catRow}>
            {CATS.map((c) => {
              const on = cat === c.id;
              return (
                <Pressable
                  key={c.id}
                  testID={`cat-${c.id}`}
                  accessibilityRole="button"
                  onPress={() => setCat(c.id)}
                  style={[
                    styles.catPill,
                    on && { backgroundColor: theme.accent, borderColor: 'rgba(15,23,42,0.35)' },
                  ]}
                >
                  {c.icon && <UiIcon name={c.icon} size={14} color={on ? theme.accentText : C.ink} />}
                  <T style={[styles.catTxt, on && { color: theme.accentText }]}>{c.label}</T>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={twoCols ? styles.gameGridWide : styles.gameGridSingle}>
            {visibleGames.map((g, idx) => {
              const badge = BADGE_FOR[g];
              const tileGrad = GAME_TILE_GRAD[g];
              return (
                <MotionSurface
                  key={g}
                  delay={Math.min(idx * 0.03, 0.25)}
                  hoverLift
                  style={twoCols ? styles.gameSlotWide : undefined}
                >
                  <Pressable
                    testID={`create-${g}`}
                    accessibilityRole="button"
                    disabled={!online || busy}
                    onPress={() => run(() => game.createRoom(trimmed, g))}
                    style={({ pressed }) => [
                      styles.gameCard,
                      sticker(pressed ? 1 : 3),
                      pressed && { transform: [{ translateY: 2 }] },
                      (!online || busy) && { opacity: 0.5 },
                    ]}
                  >
                    <LinearGradient colors={[...tileGrad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gameMedallion}>
                      <EmojiIcon emoji={GAME_META[g].emoji} size={32} />
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <View style={styles.gameTitleRow}>
                        <T style={styles.gameTitle}>{GAME_INFO[g].name}</T>
                        {badge && (
                          <LinearGradient colors={[...badge.grad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newBadge}>
                            <T style={styles.newBadgeTxt}>{badge.text}</T>
                          </LinearGradient>
                        )}
                      </View>
                      <T style={styles.gameTag}>{GAME_META[g].tagline}</T>
                      <View style={styles.playerChip}>
                        <UiIcon name="Users" size={12} color={C.jadeDeep} />
                        <T style={styles.gamePlayers}>{GAME_META[g].players}</T>
                      </View>
                    </View>
                    <View style={styles.goPill}>
                      <UiIcon name="ChevronRight" size={18} color={C.son} strokeWidth={2.6} />
                    </View>
                  </Pressable>
                </MotionSurface>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <UiIcon name="Globe" size={16} color={theme.accent} />
          <T style={[styles.section, { color: theme.onBg }]}>Phòng đang mở</T>
        </View>
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
                  accessibilityRole="button"
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
                    <EmojiIcon emoji={t.emoji} size={22} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.mapName}>{t.name}</T>
                    <T style={styles.mapDesc}>{t.desc}</T>
                  </View>
                  <View style={styles.mapActionWrap}>
                    {active ? (
                      <>
                        <UiIcon name="CheckCircle2" size={15} color={C.jadeDeep} />
                        <T style={[styles.mapAction, { color: C.jadeDeep }]}>Đang dùng</T>
                      </>
                    ) : freeOrOwned ? (
                      <T style={styles.mapAction}>Chọn</T>
                    ) : (
                      <>
                        <UiIcon name="Lock" size={13} color={C.son} />
                        <RubyIcon size={14} />
                        <T style={styles.mapAction}>{t.price}</T>
                      </>
                    )}
                  </View>
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
  screen: { flexGrow: 1, padding: 16, gap: 14, width: '100%', maxWidth: 840, alignSelf: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 4 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 220 },
  brandEmblem: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(15,23,42,0.34)', borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  logo: { fontSize: 34, fontWeight: '900', color: C.gold, letterSpacing: -1, lineHeight: 38 },
  tagline: { fontSize: 12.5, color: C.onSon, lineHeight: 17, fontWeight: '600', opacity: 0.92 },
  quickBarWrap: {
    backgroundColor: 'rgba(15, 23, 42, 0.28)',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  quickBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  quickBtn: { flexGrow: 1, minWidth: 94 },
  status: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.65)', padding: 12, borderRadius: 14 },
  statusText: { color: C.onSon, flex: 1, fontSize: 14 },
  notice: { color: C.ink, backgroundColor: C.gold, padding: 10, borderRadius: 12, fontWeight: '700' },
  identityGrid: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  identityStack: { gap: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 17, fontWeight: '800', flex: 1 },
  input: {
    fontFamily: FONT,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 16,
    color: C.ink,
    borderWidth: 1.5,
    borderColor: 'rgba(28,32,36,0.18)',
    fontWeight: '600',
  },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 11, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  section: { color: C.onSon, fontWeight: '900', fontSize: 15 },
  catRow: { gap: 8, paddingBottom: 2 },
  catPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)', borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.16)',
  },
  catTxt: { fontSize: 13, fontWeight: '800', color: C.ink },
  gameGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  gameGridSingle: { gap: 10 },
  gameSlotWide: { width: '48.8%' },
  gameCard: {
    backgroundColor: C.paper,
    borderRadius: 20,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gameMedallion: {
    width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)',
  },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gameTitle: { fontSize: 17, fontWeight: '900', color: C.ink },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  newBadgeTxt: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.4 },
  gameTag: { fontSize: 12, color: C.muted, lineHeight: 16.5 },
  playerChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  gamePlayers: { fontSize: 11.5, fontWeight: '800', color: C.jadeDeep },
  goPill: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#F4F4F6', alignItems: 'center', justifyContent: 'center',
  },
  joinCard: { gap: 10, justifyContent: 'center', height: '100%' },
  dot: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFFFFF' },
  authTop: { flexDirection: 'row', gap: 8 },
  authBtn: { minWidth: 96 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authHint: { fontSize: 12, color: C.muted },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 3, textAlign: 'center', fontWeight: '900', textTransform: 'uppercase' },
  mapNote: { fontSize: 13, color: C.muted, lineHeight: 18 },
  mapRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 16, backgroundColor: C.mist, borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.08)' },
  mapRowOn: { borderColor: C.jade, backgroundColor: '#ECFDF5' },
  mapSwatch: { width: 46, height: 46, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mapName: { fontSize: 14, fontWeight: '900', color: C.ink },
  mapDesc: { fontSize: 12, color: C.muted },
  mapActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapAction: { fontSize: 12, fontWeight: '900', color: C.son },
});
