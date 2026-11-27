import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { GAME_INFO, type GameType } from '../../../shared/src/types';
import { ROOM_THEMES, themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { useStableWindow } from '../hooks';
import { storage } from '../storage';
import { getInviteCode } from '../web';
import { GAME_META } from '../messages';
import { C, FONT, backdropPalette, sticker } from '../theme';
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

// Sắp xếp chuẩn theo thứ tự ra mắt: Game cũ → Game mới
const GAMES: GameType[] = [
  'wordchain',
  'wordchain_en',
  'baucua',
  'typhu',
  'masoi',
  'giandiep',
  've_doan',
  'bom_tu',
  'do_vui',
  'loto',
  'caro',
  'croaksquad',
  'ca_sau',
  'boom_online',
  'uno_mercy',
  'family_feud',
  'who_is_it',
  'thoitrang',
];

type HomeFragment = 'games' | 'rooms' | 'shop' | 'profile';

const FRAGMENTS: { id: HomeFragment; label: string; icon: UiIconName }[] = [
  { id: 'games', label: 'Chơi ngay', icon: 'LayoutGrid' },
  { id: 'rooms', label: 'Phòng mở', icon: 'Users' },
  { id: 'shop', label: 'Cửa hàng', icon: 'ShoppingBag' },
  { id: 'profile', label: 'Cá nhân', icon: 'User' },
];

type Category = 'all' | 'party' | 'hidden' | 'coop' | 'word' | 'classic';
const CATS: { id: Category; label: string; icon?: UiIconName; games?: GameType[] }[] = [
  { id: 'all', label: 'Tất cả (18)', icon: 'LayoutGrid' },
  { id: 'party', label: 'Nhóm đông', icon: 'PartyPopper', games: ['ve_doan', 'bom_tu', 'do_vui', 'ca_sau', 'boom_online', 'uno_mercy', 'family_feud', 'who_is_it', 'thoitrang'] },
  { id: 'hidden', label: 'Ẩn vai', icon: 'Eye', games: ['masoi', 'giandiep', 'who_is_it'] },
  { id: 'coop', label: 'Phối hợp & Cờ', icon: 'Swords', games: ['caro', 'croaksquad', 'boom_online'] },
  { id: 'classic', label: 'Bàn hội chợ', icon: 'Dices', games: ['baucua', 'typhu', 'loto', 'uno_mercy'] },
  { id: 'word', label: 'Từ vựng', icon: 'BookOpen', games: ['wordchain', 'wordchain_en', 'family_feud'] },
];

const GAME_TAG: Partial<Record<GameType, string>> = {
  thoitrang: 'Mới',
  family_feud: 'Mới',
  who_is_it: 'Mới',
  uno_mercy: 'Hot',
  croaksquad: 'Co-op',
  ca_sau: '3D',
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
  const pal = backdropPalette(activeThemeId);
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
      setError('Nhập tên của bạn trước khi tạo hoặc vào phòng.');
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
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <TextInput
            testID="name-input"
            style={styles.input}
            value={name}
            onChangeText={(t) => {
              setName(t);
              setError(null);
              void storage.setName(t.trim());
            }}
            placeholder="Nhập tên người chơi"
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
              <UiIcon name="LogIn" size={13} color={C.secondary} strokeWidth={1.65} />
              <T style={styles.miniAuthTxt}>Đăng nhập</T>
            </Pressable>
            <Pressable
              testID="register-open"
              disabled={!online}
              onPress={() => setAuth('register')}
              style={[styles.miniAuthPill, styles.miniRegisterPill]}
            >
              <UiIcon name="UserPlus" size={13} color={C.ink} strokeWidth={1.65} />
              <T style={styles.miniAuthTxt}>Đăng ký</T>
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
            size={48}
            border={1.5}
            frame={eq.frame}
            aura={eq.aura}
            pet={eq.pet}
            active={!!eq.aura}
          />
        </Pressable>
        <View style={{ flex: 1, minWidth: 148, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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
            <RubyIcon size={13} />
            <T testID="home-ruby" style={[styles.rubyInlineTxt, (user.ruby ?? 0) < 0 && { color: C.danger }]}>{(user.ruby ?? 0).toLocaleString('vi-VN')} Ruby</T>
          </Pressable>
        </View>
        <View style={styles.userMiniActions}>
          <View style={{ position: 'relative' }}>
            <Button
              testID="checkin-open"
              small
              variant="gold"
              iconNode={<UiIcon name="Gift" size={14} color={C.ink} strokeWidth={1.65} />}
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
            iconNode={<UiIcon name="ShoppingBag" size={14} color={C.secondary} strokeWidth={1.65} />}
            title="Shop"
            onPress={() => setShopOpen(true)}
          />
          {user.admin && (
            <Button
              testID="admin-open-home"
              small
              variant="ink"
              iconNode={<UiIcon name="Settings2" size={14} color={C.onSon} strokeWidth={1.65} />}
              title="Quản trị"
              onPress={() => setAdminOpen(true)}
            />
          )}
        </View>
      </View>
    </Card>
  );

  const utilBg = pal.dark ? C.darkSurface : C.paper;
  const utilBd = pal.dark ? C.darkBorder : C.borderSubtle;
  const utilStroke = pal.dark ? C.darkText : C.secondary;

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth} />

      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {/* Header thương hiệu gọn gàng + 3 tiện ích */}
        <View style={styles.topRow}>
          <View style={styles.brandGroup}>
            <View style={[styles.brandEmblem, pal.dark && { backgroundColor: C.darkSurface, borderColor: C.darkBorder }]}>
              <EmojiIcon emoji={theme.emoji} size={26} />
            </View>
            <View style={{ flex: 1, minWidth: 120, gap: 1 }}>
              <T style={[styles.logo, { color: pal.text }]}>Xóm Lầy</T>
              <T style={[styles.tagline, { color: pal.muted }]} numberOfLines={1}>
                15 trò chơi bàn hội tụ họp bạn bè
              </T>
            </View>
          </View>

          <View style={styles.topPills}>
            <Pressable
              testID="leaderboard-open"
              accessibilityLabel="Bảng vàng"
              onPress={() => setBoard(true)}
              style={[styles.iconPill, { backgroundColor: utilBg, borderColor: utilBd }]}
            >
              <UiIcon name="Trophy" size={16} color={utilStroke} strokeWidth={1.65} />
            </Pressable>
            <Pressable
              testID="home-map-open"
              accessibilityLabel="Đổi Map"
              onPress={() => setMapOpen(true)}
              style={[styles.iconPill, { backgroundColor: utilBg, borderColor: utilBd }]}
            >
              <UiIcon name="Map" size={16} color={utilStroke} strokeWidth={1.65} />
            </Pressable>
            <Pressable
              testID="smooth-toggle"
              accessibilityLabel="Chế độ siêu mượt"
              onPress={() => setSmooth(!smooth)}
              style={[
                styles.iconPill,
                { backgroundColor: utilBg, borderColor: utilBd },
                smooth && { backgroundColor: C.jadeSoft, borderColor: C.jade },
              ]}
            >
              <UiIcon name="Gauge" size={16} color={smooth ? C.jadeDeep : utilStroke} strokeWidth={1.65} />
            </Pressable>
          </View>
        </View>

        {!online && (
          <View testID="connecting" style={styles.status}>
            <ActivityIndicator color={C.ink} />
            <T style={styles.statusText}>Đang kết nối máy chủ, vui lòng chờ giây lát.</T>
          </View>
        )}
        {game.notice && <T style={styles.notice}>{game.notice}</T>}
        {error && (
          <T testID="home-error" style={styles.error}>
            {error}
          </T>
        )}

        {/* FRAGMENT 1: CHƠI NGAY (15 TRÒ CHƠI) */}
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
                      on && styles.catPillActive,
                    ]}
                  >
                    {c.icon && <UiIcon name={c.icon} size={14} color={on ? C.onSon : C.secondary} strokeWidth={1.65} />}
                    <T style={[styles.catTxt, on && styles.catTxtActive]}>{c.label}</T>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={twoCols ? styles.gameGridWide : styles.gameGridSingle}>
              {visibleGames.map((g) => {
                const tag = GAME_TAG[g];
                return (
                  <View key={g} style={twoCols ? styles.gameSlotWide : undefined}>
                    <Pressable
                      testID={`create-${g}`}
                      accessibilityRole="button"
                      disabled={!online || busy}
                      onPress={() => void run(() => game.createRoom(trimmed, g))}
                      style={({ pressed }) => [
                        styles.gameCard,
                        sticker(pressed ? 1 : 2),
                        pressed && styles.gameCardPressed,
                        (!online || busy) && { opacity: 0.52 },
                      ]}
                    >
                      <View style={styles.gameIconBox}>
                        <EmojiIcon emoji={GAME_META[g].emoji} size={28} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                        <View style={styles.gameTitleRow}>
                          <T style={styles.gameTitle} numberOfLines={1}>{GAME_INFO[g].name}</T>
                          {tag && <T style={styles.quietTag}>{tag}</T>}
                        </View>
                        <T style={styles.gameTag} numberOfLines={1}>{GAME_META[g].tagline}</T>
                        <T style={styles.gamePlayers}>{GAME_META[g].players}</T>
                      </View>
                      <UiIcon name="ChevronRight" size={16} color={C.muted} strokeWidth={1.65} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* FRAGMENT 2: PHÒNG MỞ & VÀO BẰNG MÃ 6 KÝ TỰ */}
        {fragment === 'rooms' && (
          <View style={{ gap: 12 }} testID="fragment-rooms">
            {!user && guestNameBar}
            <Card style={styles.joinCard}>
              <View style={styles.cardHeaderRow}>
                <UiIcon name="KeyRound" size={16} color={C.secondary} strokeWidth={1.65} />
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
                  placeholder="Mã phòng"
                  placeholderTextColor={C.muted}
                  maxLength={6}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Button
                  testID="join-btn"
                  title="Vào phòng"
                  iconNode={<UiIcon name="LogIn" size={15} color={invite ? C.ink : C.onSon} strokeWidth={1.65} />}
                  variant={invite ? 'gold' : 'ink'}
                  disabled={!online || busy || code.length !== 6}
                  style={{ minWidth: 112 }}
                  onPress={() => void run(() => game.joinRoom(code, trimmed))}
                />
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <UiIcon name="Globe" size={15} color={pal.muted} strokeWidth={1.65} />
              <T style={[styles.section, { color: pal.text }]}>Phòng công khai đang mở</T>
            </View>
            <OpenRooms game={game} disabled={!online || busy} onJoin={(c) => void run(() => game.joinRoom(c, trimmed))} />
          </View>
        )}

        {/* FRAGMENT 3: CỬA HÀNG */}
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

        {/* FRAGMENT 4: HỒ SƠ CÁ NHÂN & CÀI ĐẶT */}
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
                <Card style={{ gap: 10 }}>
                  <T style={styles.h2}>Tạo tài khoản Xóm Lầy</T>
                  <T style={{ color: C.secondary, fontSize: 13.5, lineHeight: 20 }}>
                    Lưu thành tích 15 trò chơi, nhận Ruby mỗi ngày và mở khóa khung đại diện hoặc chủ đề bàn chơi.
                  </T>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button style={{ flex: 1 }} variant="ink" title="Đăng ký" onPress={() => setAuth('register')} />
                    <Button style={{ flex: 1 }} variant="paper" title="Đăng nhập" onPress={() => setAuth('login')} />
                  </View>
                </Card>
              </>
            )}

            <Card style={{ gap: 10 }}>
              <T style={styles.h2}>Tiện ích & Chủ đề ({ROOM_THEMES.length})</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button small variant="paper" iconNode={<UiIcon name="Trophy" size={14} color={C.secondary} strokeWidth={1.65} />} title="Bảng vàng" onPress={() => setBoard(true)} />
                <Button small variant="paper" iconNode={<UiIcon name="Map" size={14} color={C.secondary} strokeWidth={1.65} />} title="Đổi Map nền" onPress={() => setMapOpen(true)} />
                <Button
                  small
                  variant={smooth ? 'jade' : 'paper'}
                  iconNode={<UiIcon name="Gauge" size={14} color={smooth ? '#FFFFFF' : C.secondary} strokeWidth={1.65} />}
                  title={smooth ? 'Siêu mượt: Bật' : 'Chế độ Siêu mượt'}
                  onPress={() => setSmooth(!smooth)}
                />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation Bar chuẩn giấy ngà / tối neo gọn đáy */}
      <View
        testID="home-bottom-nav"
        style={[styles.bottomNavWrap, { backgroundColor: pal.card, borderTopColor: pal.hairline }]}
      >
        <View style={styles.bottomNavInner}>
          {FRAGMENTS.map((f) => {
            const active = fragment === f.id;
            const fgColor = active ? pal.text : pal.muted;
            return (
              <Pressable
                key={f.id}
                testID={`home-tab-${f.id}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFragment(f.id)}
                style={[styles.navItem, active && { backgroundColor: pal.subtle }]}
              >
                <UiIcon name={f.icon} size={18} color={fgColor} strokeWidth={active ? 1.9 : 1.6} />
                <T style={[styles.navLabel, { color: fgColor }, active && { fontWeight: '600' }]} numberOfLines={1}>
                  {f.label}
                </T>
                {f.id === 'profile' && canCheckin && <View style={styles.navDot} />}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Chọn Map nền */}
      {mapOpen && (
        <Sheet title="Chọn Map nền" onClose={() => setMapOpen(false)}>
          <T style={styles.mapNote}>
            5 chủ đề cơ bản mở sẵn cho mọi người, 10 chủ đề đặc biệt mở khóa trong Cửa hàng.
          </T>
          <View style={{ gap: 8 }}>
            {ROOM_THEMES.map((t) => {
              const freeOrOwned = t.price === 0 || ownedSet.has(t.id);
              const active = activeThemeId === t.id;
              const isDefault = t.id === 'son_mac_dinh';
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
                  <View
                    style={[
                      styles.mapSwatch,
                      {
                        backgroundColor: isDefault ? C.parchment : t.bg,
                        borderColor: isDefault ? C.borderStrong : t.accent,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: isDefault ? C.son : t.accent,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T style={styles.mapName}>{t.name}</T>
                    <T style={styles.mapDesc}>{t.desc}</T>
                  </View>
                  <View style={styles.mapActionWrap}>
                    {active ? (
                      <>
                        <UiIcon name="CheckCircle2" size={15} color={C.jadeDeep} strokeWidth={1.75} />
                        <T style={[styles.mapAction, { color: C.jadeDeep }]}>Đang dùng</T>
                      </>
                    ) : freeOrOwned ? (
                      <T style={styles.mapAction}>Chọn</T>
                    ) : (
                      <>
                        <UiIcon name="Lock" size={13} color={C.goldDeep} strokeWidth={1.65} />
                        <RubyIcon size={13} />
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 88,
    gap: 12,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  brandEmblem: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.son,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2, lineHeight: 24, fontFamily: FONT },
  tagline: { fontSize: 12.5, fontWeight: '400' },

  topPills: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  compactIdentity: { padding: 12, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  guestAuthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  miniAuthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  miniRegisterPill: { backgroundColor: C.goldSoft, borderColor: 'rgba(180, 83, 9, 0.25)' },
  miniAuthTxt: { fontSize: 12, fontWeight: '600', color: C.ink },

  userMiniRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  userMiniName: { fontSize: 15.5, fontWeight: '600', color: C.ink },
  rubyInlinePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rubyInlineTxt: { fontSize: 12, fontWeight: '600', color: C.goldDeep, fontVariant: ['tabular-nums'] },
  userMiniActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.danger, borderWidth: 1.5, borderColor: C.paper },

  status: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: C.paper, borderWidth: 1, borderColor: C.borderSubtle,
    padding: 12, borderRadius: 12,
  },
  statusText: { color: C.secondary, flex: 1, fontSize: 13, fontWeight: '500' },
  notice: { backgroundColor: C.goldSoft, borderWidth: 1, borderColor: 'rgba(180, 83, 9, 0.28)', color: C.ink, padding: 12, borderRadius: 12, fontWeight: '500', fontSize: 13 },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 10, borderRadius: 10, fontWeight: '600', fontSize: 13, textAlign: 'center' },

  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h2: { fontSize: 15.5, fontWeight: '600', color: C.ink, flex: 1 },
  input: {
    minWidth: 0,
    fontFamily: FONT,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderStrong,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14.5,
    fontWeight: '500',
    color: C.ink,
  },
  joinCard: { gap: 10 },
  joinRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  codeInput: { flex: 1, minWidth: 0, letterSpacing: 4, fontWeight: '600', textAlign: 'center', height: 44, fontSize: 16, fontVariant: ['tabular-nums'] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  section: { fontSize: 14, fontWeight: '600' },
  catRow: { gap: 8, paddingVertical: 2 },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  catPillActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  catTxt: { fontSize: 13, fontWeight: '500', color: C.secondary },
  catTxtActive: { color: C.onSon, fontWeight: '600' },

  gameGridSingle: { gap: 8 },
  gameGridWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  gameSlotWide: { flexBasis: '49%', flexGrow: 0 },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.paper,
    borderRadius: 12,
    padding: 12,
  },
  gameCardPressed: { opacity: 0.85 },
  gameIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gameTitle: { fontSize: 15, fontWeight: '600', color: C.ink, fontFamily: FONT, flexShrink: 1 },
  quietTag: {
    fontSize: 11,
    fontWeight: '600',
    color: C.goldDeep,
    backgroundColor: C.goldSoft,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  gameTag: { color: C.secondary, fontSize: 12.5, lineHeight: 17, fontWeight: '400' },
  gamePlayers: { color: C.muted, fontSize: 11.5, fontWeight: '500', fontVariant: ['tabular-nums'] },

  bottomNavWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
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
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    gap: 2,
    position: 'relative',
  },
  navLabel: { fontSize: 11.5, fontWeight: '500' },
  navDot: { position: 'absolute', top: 5, right: '26%', width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.danger },

  mapNote: { fontSize: 12.5, color: C.secondary, lineHeight: 18, marginBottom: 4 },
  mapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  mapRowOn: { borderColor: C.jade, backgroundColor: C.jadeSoft },
  mapSwatch: { width: 38, height: 38, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  mapName: { fontSize: 14, fontWeight: '600', color: C.ink },
  mapDesc: { fontSize: 12, color: C.secondary },
  mapActionWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapAction: { fontSize: 12, fontWeight: '600', color: C.secondary, fontVariant: ['tabular-nums'] },
});
