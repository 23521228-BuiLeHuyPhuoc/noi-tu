import { useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GAME_INFO, type GameType } from '../../../shared/src/types';
import { ROOM_THEMES, themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { useStableWindow } from '../hooks';
import { storage } from '../storage';
import { getInviteCode } from '../web';
import { GAME_META } from '../messages';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T } from '../ui';
import { AuthSheet, GuestAvatarButton, ProfileCard, ProfileSheet } from '../components/Account';
import { Portrait } from '../components/Avatar';
import { NameText, TitleBadge, VipBadge } from '../components/Cosmetics';
import { WalletSheet } from '../components/Wallet';
import { AdminSheet } from '../components/Admin';
import { CheckinSheet, ShopBody, ShopSheet } from '../components/Shop';
import { LeaderboardSheet, OpenRooms } from '../components/RoomTools';
import { MapBackdrop } from '../components/MapBackdrop';
import { Sheet } from '../components/Sheet';
import { useLocalTheme, useSmoothMode } from '../smoothMode';
import { EmojiIcon, RubyIcon, UiIcon, type UiIconName } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const GAMES: GameType[] = [
  'croaksquad',
  'ca_sau',
  'tinh_mat',
  'den_do',
  'loto',
  'caro',
  'masoi',
  'do_vui',
  'giandiep',
  've_doan',
  'bom_tu',
  'wordchain',
  'wordchain_en',
  'baucua',
  'typhu',
];

type HomeFragment = 'games' | 'rooms' | 'shop' | 'profile';

const FRAGMENTS: { id: HomeFragment; label: string; emoji: string }[] = [
  { id: 'games', label: 'Chơi ngay', emoji: '🎮' },
  { id: 'rooms', label: 'Phòng mở', emoji: '🚪' },
  { id: 'shop', label: 'Phú Hào', emoji: '💎' },
  { id: 'profile', label: 'Cá nhân', emoji: '👑' },
];

type Category = 'all' | 'party' | 'hidden' | 'coop' | 'word' | 'classic';
const CATS: { id: Category; label: string; icon?: UiIconName; games?: GameType[] }[] = [
  { id: 'all', label: 'Tất cả (15)', icon: 'LayoutGrid' },
  { id: 'party', label: 'Party Lầy', icon: 'PartyPopper', games: ['ca_sau', 'tinh_mat', 'den_do', 've_doan', 'bom_tu', 'do_vui'] },
  { id: 'hidden', label: 'Ẩn Vai', icon: 'Eye', games: ['masoi', 'giandiep'] },
  { id: 'coop', label: 'Co-op & Cờ', icon: 'Swords', games: ['croaksquad', 'caro'] },
  { id: 'classic', label: 'Hội Chợ', icon: 'Dices', games: ['loto', 'baucua', 'typhu'] },
  { id: 'word', label: 'Từ Vựng', icon: 'BookOpen', games: ['wordchain', 'wordchain_en'] },
];

const BADGE_FOR: Partial<Record<GameType, { text: string; grad: readonly [string, string] }>> = {
  croaksquad: { text: '60FPS 2D', grad: ['#10B981', '#047857'] },
  ca_sau: { text: 'CỰC CĂNG', grad: ['#16A34A', '#14532D'] },
  tinh_mat: { text: 'PHẢN XẠ', grad: ['#0284C7', '#1E3A8A'] },
  den_do: { text: 'HOT TREND', grad: ['#E11D48', '#881337'] },
  loto: { text: 'HỘI CHỢ', grad: ['#F59E0B', '#B45309'] },
  caro: { text: 'BÀN KHỦNG', grad: ['#06B6D4', '#0E7490'] },
  masoi: { text: 'BẢN 2.0', grad: ['#7C3AED', '#4C1D95'] },
  do_vui: { text: 'IT QUIZ', grad: ['#2563EB', '#1E3A8A'] },
  baucua: { text: 'LỘC x3', grad: ['#EA580C', '#9A3412'] },
  typhu: { text: 'MUA ĐỨT', grad: ['#16A34A', '#14532D'] },
};

const GAME_TILE_GRAD: Record<GameType, readonly [string, string]> = {
  croaksquad: ['#A7F3D0', '#34D399'],
  ca_sau: ['#BBF7D0', '#22C55E'],
  tinh_mat: ['#BAE6FD', '#38BDF8'],
  den_do: ['#FECDD3', '#FB7185'],
  loto: ['#FDE68A', '#FBBF24'],
  caro: ['#99F6E4', '#2DD4BF'],
  masoi: ['#DDD6FE', '#A78BFA'],
  giandiep: ['#C7D2FE', '#818CF8'],
  ve_doan: ['#F5D0FE', '#E879F9'],
  bom_tu: ['#FED7AA', '#FB923C'],
  do_vui: ['#BFDBFE', '#60A5FA'],
  wordchain: ['#FEF08A', '#FACC15'],
  wordchain_en: ['#E0E7FF', '#818CF8'],
  baucua: ['#FED7AA', '#F97316'],
  typhu: ['#A7F3D0', '#10B981'],
};

export function HomeScreen({ game }: { game: Game }) {
  const [name, setName] = useState('');
  const invite = useState(getInviteCode)[0];
  const [fragment, setFragment] = useState<HomeFragment>(() => (invite ? 'rooms' : 'games'));
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
  const { width } = useStableWindow();
  const twoCols = width >= 620;

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
    if (!trimmed) {
      setError('Nhập tên của bạn trước đã nhé.');
      return;
    }
    setBusy(true);
    setError(await fn());
    setBusy(false);
  };

  const visibleGames = cat === 'all' ? GAMES : (CATS.find((c) => c.id === cat)?.games ?? GAMES);
  const ownedSet = new Set(user?.owned ?? []);
  const eq = user?.equipped ?? {};

  const guestNameBar = !user && (
    <Card style={styles.compactIdentity}>
      <View style={styles.nameRow}>
        <GuestAvatarButton game={game} onPress={() => setProfile(true)} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <TextInput
            testID="name-input"
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
              void storage.setName(t.trim());
            }}
            placeholder="Nhập tên của bạn (vd: Phước)…"
            placeholderTextColor={C.muted}
            maxLength={24}
            autoCorrect={false}
          />
          <View testID="auth-buttons" style={styles.guestAuthRow}>
            <Pressable
              testID="auth-open"
              disabled={!online}
              onPress={() => setAuth('login')}
              style={styles.miniAuthPill}
            >
              <UiIcon name="LogIn" size={13} color={C.ink} />
              <T style={styles.miniAuthTxt}>Đăng nhập</T>
            </Pressable>
            <Pressable
              testID="register-open"
              disabled={!online}
              onPress={() => setAuth('register')}
              style={[styles.miniAuthPill, styles.miniRegisterPill]}
            >
              <RubyIcon size={13} />
              <T style={[styles.miniAuthTxt, { color: '#271400' }]}>Đăng ký VIP</T>
            </Pressable>
          </View>
        </View>
      </View>
    </Card>
  );

  const userMiniHud = user && (
    <Card style={styles.compactIdentity}>
      <View testID="profile-card" style={styles.userMiniRow}>
        <Pressable onPress={() => setProfile(true)}>
          <Portrait
            p={{ avatar: user.avatar, avatarUrl: user.avatarUrl }}
            size={50}
            frame={eq.frame}
            aura={eq.aura}
            pet={eq.pet}
            active={!!eq.aura}
          />
        </Pressable>
        <View style={{ flex: 1, minWidth: 155, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            {(user.vipTier ?? 0) > 0 && <VipBadge tier={user.vipTier} compact />}
            <NameText fx={eq.nameFx} numberOfLines={1} style={styles.userMiniName}>
              {user.displayName}
            </NameText>
          </View>
          {eq.title && (
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
              <TitleBadge title={eq.title} />
            </View>
          )}
          <Pressable onPress={() => setWalletOpen(true)} style={styles.rubyInlinePill}>
            <RubyIcon size={14} />
            <T testID="home-ruby" style={styles.rubyInlineTxt}>{(user.ruby ?? 0).toLocaleString('vi-VN')} Ruby</T>
          </Pressable>
        </View>
        <View style={styles.userMiniActions}>
          <View style={{ position: 'relative' }}>
            <Button
              testID="checkin-open"
              small
              variant="gold"
              icon="🎁"
              title="Quà ngày"
              disabled={!online}
              onPress={() => setCheckinOpen(true)}
            />
            {canCheckin && <View testID="checkin-dot" style={styles.dot} />}
          </View>
          <Button
            testID="shop-open"
            small
            variant="paper"
            icon="🛍️"
            title="Shop"
            onPress={() => setShopOpen(true)}
          />
          {user.admin && (
            <Button
              testID="admin-open-home"
              small
              variant="ink"
              icon="🛠"
              title="Admin"
              onPress={() => setAdminOpen(true)}
            />
          )}
        </View>
      </View>
    </Card>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth} />

      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Thanh Thương Hiệu Gọn Gàng + Nút Đổi Map / Bảng Vàng / Siêu Mượt */}
        <View style={styles.topRow}>
          <View style={styles.brandGroup}>
            <LinearGradient
              colors={['#FACC15', '#EC4899', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.brandEmblem}
            >
              <EmojiIcon emoji={theme.emoji} size={26} />
            </LinearGradient>
            <View style={{ flex: 1, minWidth: 120 }}>
              <T style={[styles.logo, { color: theme.accent }]}>Xóm Lầy</T>
              <T style={[styles.tagline, { color: theme.onBg }]} numberOfLines={1}>
                15 đại tiệc trò chơi · Phú Hào Lố Lăng
              </T>
            </View>
          </View>

          <View style={styles.topPills}>
            <Pressable
              testID="leaderboard-open"
              accessibilityLabel="Bảng vàng"
              onPress={() => setBoard(true)}
              style={styles.iconPill}
            >
              <EmojiIcon emoji="🏆" size={17} />
            </Pressable>
            <Pressable
              testID="home-map-open"
              accessibilityLabel="Đổi Map"
              onPress={() => setMapOpen(true)}
              style={styles.iconPill}
            >
              <EmojiIcon emoji="🗺️" size={17} />
            </Pressable>
            <Pressable
              testID="smooth-toggle"
              accessibilityLabel="Chế độ siêu mượt"
              onPress={() => setSmooth(!smooth)}
              style={[styles.iconPill, smooth && styles.iconPillActive]}
            >
              <UiIcon name="Gauge" size={16} color={smooth ? '#0F172A' : '#F8FAFC'} />
            </Pressable>
          </View>
        </View>

        {!online && (
          <View testID="connecting" style={styles.status}>
            <ActivityIndicator color={C.gold} />
            <T style={styles.statusText}>Đang gọi server dậy… lần đầu có thể mất khoảng 1 phút.</T>
          </View>
        )}
        {game.notice && <T style={styles.notice}>{game.notice}</T>}
        {error && (
          <T testID="home-error" style={styles.error}>
            {error}
          </T>
        )}

        {/* ============================================================ */}
        {/* FRAGMENT 1: CHƠI NGAY (14 TRÒ CHƠI PHÂN LOẠI GỌN ĐẸP)        */}
        {/* ============================================================ */}
        {fragment === 'games' && (
          <View style={{ gap: 12 }} testID="fragment-games">
            {user ? userMiniHud : guestNameBar}

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
                      on && { backgroundColor: theme.accent, borderColor: '#0F172A' },
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
                    delay={Math.min(idx * 0.025, 0.22)}
                    hoverLift
                    style={twoCols ? styles.gameSlotWide : undefined}
                  >
                    <Pressable
                      testID={`create-${g}`}
                      accessibilityRole="button"
                      disabled={!online || busy}
                      onPress={() => void run(() => game.createRoom(trimmed, g))}
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
                          <T style={styles.gameTitle} numberOfLines={1}>{GAME_INFO[g].name}</T>
                          {badge && (
                            <LinearGradient colors={[...badge.grad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.newBadge}>
                              <T style={styles.newBadgeTxt}>{badge.text}</T>
                            </LinearGradient>
                          )}
                        </View>
                        <T style={styles.gameTag} numberOfLines={2}>{GAME_META[g].tagline}</T>
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
        )}

        {/* ============================================================ */}
        {/* FRAGMENT 2: PHÒNG MỞ & VÀO BẰNG MÃ 6 KÝ TỰ                   */}
        {/* ============================================================ */}
        {fragment === 'rooms' && (
          <View style={{ gap: 12 }} testID="fragment-rooms">
            {!user && guestNameBar}
            <Card style={styles.joinCard}>
              <View style={styles.cardHeaderRow}>
                <View style={[styles.badgeCircle, { backgroundColor: '#FEF3C7' }]}>
                  <UiIcon name="KeyRound" size={16} color="#B45309" />
                </View>
                <T testID={invite ? 'invite-hint' : undefined} style={styles.h2}>
                  {invite ? `Lời mời vào phòng ${invite}` : 'Nhập mã 6 ký tự vào phòng'}
                </T>
              </View>
              <View style={styles.joinRow}>
                <TextInput
                  testID="code-input"
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="MÃ PHÒNG"
                  placeholderTextColor={C.muted}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Button
                  testID="join-btn"
                  title="Vào ngay"
                  iconNode={<UiIcon name="LogIn" size={16} color={invite ? '#271400' : C.gold} />}
                  variant={invite ? 'gold' : 'ink'}
                  disabled={!online || busy || code.length !== 6}
                  style={{ minWidth: 108 }}
                  onPress={() => void run(() => game.joinRoom(code, trimmed))}
                />
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <UiIcon name="Globe" size={16} color={theme.accent} />
              <T style={[styles.section, { color: theme.onBg }]}>Sảnh phòng công khai đang mở</T>
            </View>
            <OpenRooms game={game} disabled={!online || busy} onJoin={(c) => void run(() => game.joinRoom(c, trimmed))} />
          </View>
        )}

        {/* ============================================================ */}
        {/* FRAGMENT 3: CỬA HÀNG PHÚ HÀO & SÂN KHẤU HÓA TRANG ĐẠI GIA    */}
        {/* ============================================================ */}
        {fragment === 'shop' && (
          <View style={{ gap: 12 }} testID="fragment-shop">
            <Card style={{ gap: 10 }}>
              <ShopBody
                game={game}
                initialTab="deco"
                onRequestAuth={() => setAuth('register')}
                onOpenWallet={() => setWalletOpen(true)}
              />
            </Card>
          </View>
        )}

        {/* ============================================================ */}
        {/* FRAGMENT 4: HỒ SƠ CÁ NHÂN, THÀNH TÍCH 14 GAME & KHO MAP      */}
        {/* ============================================================ */}
        {fragment === 'profile' && (
          <View style={{ gap: 12 }} testID="fragment-profile">
            {user ? (
              <ProfileCard
                user={user}
                onEdit={() => setProfile(true)}
                onWallet={() => setWalletOpen(true)}
                onAdmin={() => setAdminOpen(true)}
                onShop={() => setFragment('shop')}
              />
            ) : (
              <>
                {guestNameBar}
                <Card style={{ gap: 8 }}>
                  <T style={styles.h2}>🌟 Tạo tài khoản Phú Hào Xóm Lầy</T>
                  <T style={{ color: C.muted, fontSize: 13, lineHeight: 19 }}>
                    Lưu thành tích 15 trò chơi, điểm danh nhận Ruby miễn phí mỗi ngày, mở khóa 146 vật phẩm Hóa Trang Lố Lăng & danh hiệu Thiên Đế Chí Tôn!
                  </T>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button style={{ flex: 1 }} variant="gold" title="Đăng ký miễn phí" onPress={() => setAuth('register')} />
                    <Button style={{ flex: 1 }} variant="paper" title="Đăng nhập" onPress={() => setAuth('login')} />
                  </View>
                </Card>
              </>
            )}

            <Card style={{ gap: 8 }}>
              <T style={styles.h2}>⚙️ Tiện Ích & Kho Map Nền ({ROOM_THEMES.length} Map)</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button small variant="gold" icon="🏆" title="Bảng Vàng Cao Thủ" onPress={() => setBoard(true)} />
                <Button small variant="paper" icon="🗺️" title="Đổi Map & Bảng Màu" onPress={() => setMapOpen(true)} />
                <Button
                  small
                  variant={smooth ? 'jade' : 'paper'}
                  title={smooth ? '⚡ Siêu mượt: ĐANG BẬT' : '⚡ Bật chế độ Siêu mượt'}
                  onPress={() => setSmooth(!smooth)}
                />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Thanh Điều Hướng 4 Mảnh (Bottom Navigation Bar) Chuẩn Điện Thoại */}
      <View
        testID="home-bottom-nav"
        style={styles.bottomNavWrap}
      >
        <View style={styles.bottomNavInner}>
          {FRAGMENTS.map((f) => {
            const active = fragment === f.id;
            return (
              <Pressable
                key={f.id}
                testID={`home-tab-${f.id}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFragment(f.id)}
                style={[styles.navItem, active && styles.navItemActive]}
              >
                <EmojiIcon emoji={f.emoji} size={active ? 22 : 19} glow={active} />
                <T style={[styles.navLabel, active && styles.navLabelActive]} numberOfLines={1}>
                  {f.label}
                </T>
                {f.id === 'profile' && canCheckin && <View style={styles.navDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Hộp thoại Chọn Map Nhanh Trang Chủ */}
      {mapOpen && (
        <Sheet title="🎨 Chọn Map & Bảng Màu (15 Map)" onClose={() => setMapOpen(false)}>
          <T style={styles.mapNote}>
            5 Map miễn phí ai cũng dùng được ngay. 10 Map Đại Gia Ruby tạo bầu trời hiệu ứng riêng cực cháy!
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
  screen: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 98,
    gap: 12,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  brandEmblem: {
    width: 48,
    height: 48,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#FEF08A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 25, fontWeight: '900', letterSpacing: -0.6, lineHeight: 30, fontFamily: FONT },
  tagline: { fontSize: 12, fontWeight: '800', opacity: 0.92 },

  topPills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: { backgroundColor: '#4ADE80', borderColor: '#FEF08A' },

  compactIdentity: { padding: 11, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestAuthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  miniAuthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: C.mist,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  miniRegisterPill: { backgroundColor: '#FACC15', borderColor: '#CA8A04' },
  miniAuthTxt: { fontSize: 11.5, fontWeight: '900', color: C.ink },

  userMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  userMiniName: { fontSize: 16, fontWeight: '900', color: C.ink },
  rubyInlinePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  rubyInlineTxt: { fontSize: 12, fontWeight: '900', color: C.son },
  userMiniActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { position: 'absolute', top: -3, right: -3, width: 11, height: 11, borderRadius: 6, backgroundColor: C.danger, borderWidth: 2, borderColor: '#FFFFFF' },

  status: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.72)', padding: 12, borderRadius: 14 },
  statusText: { color: '#FFFFFF', flex: 1, fontSize: 13, fontWeight: '700' },
  notice: { backgroundColor: C.gold, color: C.ink, padding: 12, borderRadius: 14, fontWeight: '800' },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 10, borderRadius: 12, fontWeight: '800', textAlign: 'center' },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 16, fontWeight: '900', color: C.ink, flex: 1 },
  input: {
    fontFamily: FONT,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(15, 23, 42, 0.2)',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 15,
    fontWeight: '800',
    color: C.ink,
  },
  joinCard: { gap: 10 },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 4, fontWeight: '900', textAlign: 'center', height: 48, fontSize: 17 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  catRow: { gap: 7, paddingVertical: 2 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.16)',
  },
  catTxt: { fontSize: 12.5, fontWeight: '900', color: C.ink },

  gameGridSingle: { gap: 10 },
  gameGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  gameSlotWide: { flexBasis: '48.8%', flexGrow: 0 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 13,
  },
  gameMedallion: {
    width: 58,
    height: 58,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  gameTitle: { fontSize: 16.5, fontWeight: '900', color: C.ink, fontFamily: FONT },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  newBadgeTxt: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.4 },
  gameTag: { color: C.muted, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
  playerChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 1,
  },
  gamePlayers: { color: C.jadeDeep, fontSize: 11, fontWeight: '800' },
  goPill: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  bottomNavWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(250, 204, 21, 0.45)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  bottomNavInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    gap: 6,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRadius: 15,
    gap: 2,
    position: 'relative',
  },
  navItemActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  navLabel: { fontSize: 11, fontWeight: '800', color: '#CBD5E1' },
  navLabelActive: { color: '#FEF08A', fontWeight: '900' },
  navDot: { position: 'absolute', top: 4, right: '26%', width: 9, height: 9, borderRadius: 5, backgroundColor: '#EF4444' },

  mapNote: { fontSize: 12.5, color: C.muted, lineHeight: 18, marginBottom: 4 },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: C.mist,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mapRowOn: { borderColor: C.jade, backgroundColor: '#ECFDF5' },
  mapSwatch: { width: 44, height: 44, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mapName: { fontSize: 14, fontWeight: '900', color: C.ink },
  mapDesc: { fontSize: 12, color: C.muted },
  mapActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapAction: { fontSize: 12, fontWeight: '900', color: C.son },
});
