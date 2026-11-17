import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GAME_INFO, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import { CHAOS_POKE_RUBY } from '../../../shared/src/shop';
import { ROOM_THEMES, themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { isMuted, setMuted } from '../sound';
import { copyText } from '../web';
import { GAME_META } from '../messages';
import { C } from '../theme';
import { Button, IconButton, T, useFeed, useFeedInset } from '../ui';
import { useStableWindow } from '../hooks';
import { useLocalTheme, useSmoothMode } from '../smoothMode';
import { MapBackdrop } from './MapBackdrop';
import { Avatar } from './Avatar';
import { ChatSheet, FunLayer, ThrowSheet, TrollLayer } from './Fun';
import { TrollFxLayer } from './TrollFx';
import { SkillLayer } from './SkillFx';
import { PokeLayer } from './PokeFx';
import { PokeSideLayer } from './PokeSideFx';
import { Sheet } from './Sheet';
import { ProfileSheet } from './Account';

export interface StripOptions {
  sub?: (p: PublicPlayer) => string | undefined;
  active?: string | null;
  dim?: (p: PublicPlayer) => boolean;
  ring?: (p: PublicPlayer) => string | undefined;
  /** hạng hiển thị thành huy hiệu ở góc avatar */
  rank?: (p: PublicPlayer) => number | undefined;
  /** thứ tự hiển thị (vd: theo lượt chơi) */
  order?: string[];
}

/** Các nút chung (trò chuyện, âm thanh, rời phòng) cho màn tự vẽ thanh công cụ (vd: Cờ tỷ phú, bỏ thanh trên) */
export interface ShellTools {
  openChat: () => void;
  unread: number;
  muted: boolean;
  toggleMute: () => void;
  leave: () => void;
  /** chạm vào người khác: bảng chọc; chạm vào chính mình: bảng sửa tên & ảnh */
  openPlayer: (id: string) => void;
  /** mở bảng sửa tên & ảnh của mình */
  openProfile: () => void;
  /** admin: chọc loạn xạ cả phòng (không có khi không phải admin) */
  chaos?: () => void;
  /** số lần chọc loạn xạ thành công (đổi số thì hiện lại chữ "-💎20" cạnh nút) */
  chaosHits: number;
}
const ToolsCtx = createContext<ShellTools | null>(null);
export const useShellTools = () => useContext(ToolsCtx);

/** Khung chung cho mọi màn trong phòng: nền Map, thanh trên gọn, hàng avatar 1–12 người, nội dung, vùng nút dưới */
export function Shell({
  game, room, strip = {}, children, bottom, scroll = true, overlay, wide = false, fullscreen = false, hideStrip = false, bare = false,
}: {
  game: Game;
  room: RoomState;
  strip?: StripOptions;
  children: ReactNode;
  bottom?: ReactNode;
  scroll?: boolean;
  /** lớp phủ toàn màn hình (vd: hiệu ứng mở bát) */
  overlay?: ReactNode;
  /** Cho các bàn chơi ngang như Cờ Tỷ Phú dùng toàn bộ chiều rộng khả dụng. */
  wide?: boolean;
  /** Chế độ toàn màn hình cho bàn Cờ tỷ phú: gọn thanh trên để bàn cờ choán trọn màn hình. */
  fullscreen?: boolean;
  /** bỏ hẳn thanh trên + hàng avatar; màn tự đặt nút qua useShellTools() */
  bare?: boolean;
  /** Ẩn hàng avatar (màn thấp: nhường chỗ cho bàn cờ, thông tin người chơi nằm trong bàn) */
  hideStrip?: boolean;
}) {
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  // tin nhắn chưa đọc: chỉ đếm tin mới sau khi vào màn hình
  const lastId = game.chat.at(-1)?.id ?? 0;
  const [seenId, setSeenId] = useState(lastId);
  if (chatOpen && seenId !== lastId) setSeenId(lastId);
  const unread = game.chat.filter((m) => m.id > seenId && m.from !== game.me).length;
  const [leaving, setLeaving] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const feed = useFeed();
  const setFeedInset = useFeedInset();
  useEffect(() => () => setFeedInset(16), [setFeedInset]);
  const { width, height } = useStableWindow();

  const [smooth, setSmooth] = useSmoothMode();
  const [localTheme, setLocalTheme] = useLocalTheme();
  const activeThemeId = room.settings.roomTheme ?? localTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const theme = themeById(activeThemeId);

  const iconOnly = width < 440 || fullscreen;
  const compactLandscape = fullscreen || (wide && width >= 700 && height < 520);
  const inlineStrip = compactLandscape && width >= 700;
  const baseSize = fullscreen || compactLandscape || (wide && width >= 700) ? 50 : height >= 780 ? 58 : height >= 700 ? 52 : 44;
  // Khi phòng 7–12 người, tự thu gọn nhẹ kích thước avatar để strip đỡ cuộn và giảm tải vẽ
  const stripSize = room.players.length >= 10 ? Math.min(baseSize, 42) : room.players.length >= 7 ? Math.min(baseSize, 46) : baseSize;

  const openMyProfile = useCallback(() => setProfileOpen(true), []);

  // admin "chọc loạn xạ": bấm liên tục được, mỗi lần thành công hiện "-💎20" bay lên
  const [chaosHits, setChaosHits] = useState(0);
  const chaos = game.user?.admin
    ? () => {
      void game.sendChaos().then((r) => {
        if (r.ok) setChaosHits((n) => n + 1);
        else if (r.reason === 'need_ruby') feed(`Không đủ 💎${CHAOS_POKE_RUBY} để chọc loạn xạ`, 'info');
        else if (r.reason === 'empty') feed('Phòng chưa có ai để chọc', 'info');
        else if (r.reason === 'forbidden') feed('Chỉ admin dùng được nút này', 'info');
      });
    }
    : undefined;

  const players = strip.order
    ? strip.order.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p)
    : [...room.players];
  for (const p of room.players) if (!players.includes(p)) players.push(p);

  const meIsSpectator = room.players.find((p) => p.id === game.me)?.spectator === true;
  const isHost = room.hostId === game.me;
  const ownedSet = new Set(game.user?.owned ?? []);

  const content = (
    <View style={[styles.content, compactLandscape && styles.contentLandscape, fullscreen && styles.contentFullscreen]}>
      {children}
    </View>
  );
  const stripItems = players.map((p) => (
    <View key={p.id} style={compactLandscape ? (inlineStrip ? styles.avatarCompact : styles.avatarRow) : undefined}>
      <Avatar
        player={p}
        me={p.id === game.me}
        host={p.id === room.hostId}
        active={strip.active === p.id}
        dim={strip.dim?.(p) || p.spectator}
        sub={p.spectator ? '👀 Đang xem' : strip.sub?.(p)}
        ring={strip.ring?.(p)}
        rank={p.spectator ? undefined : strip.rank?.(p)}
        size={stripSize}
        editable={p.id === game.me}
        onPress={p.id === game.me ? openMyProfile : meIsSpectator ? undefined : () => setTarget(p)}
      />
    </View>
  ));

  return (
    <ToolsCtx.Provider value={{
      openChat: () => setChatOpen(true),
      unread,
      muted,
      toggleMute: () => { setMuted(!muted); setMutedState(!muted); },
      leave: () => setLeaving(true),
      openPlayer: (id) => {
        if (id === game.me) return setProfileOpen(true);
        const pl = room.players.find((x) => x.id === id);
        if (pl) setTarget(pl);
      },
      openProfile: openMyProfile,
      chaos,
      chaosHits,
    }}>
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth} />
      <View style={[styles.root, wide && styles.rootWide, fullscreen && styles.rootFullscreen]}>
        {!bare && (<>
        <View style={[styles.top, compactLandscape && styles.topLandscape, iconOnly && styles.topTight]}>
          <Button
            testID="room-chip"
            small
            variant="paper"
            title={iconOnly ? room.code : `Phòng ${room.code}`}
            style={[styles.chip, iconOnly && styles.chipTight]}
            onPress={async () => (await copyText(room.code)) && feed('Đã sao chép mã phòng')}
          />
          {iconOnly && chaos ? (
            <View style={styles.spacer} />
          ) : iconOnly ? (
            <T accessibilityLabel={GAME_INFO[room.gameType].name} style={[styles.gameIcon, compactLandscape && { flex: 0 }]}>
              {GAME_META[room.gameType].emoji}
            </T>
          ) : (
            <T style={[styles.gameName, { color: theme.onBg }, compactLandscape && styles.gameNameLandscape]}>
              {GAME_META[room.gameType].emoji} {GAME_INFO[room.gameType].name}
            </T>
          )}
          {inlineStrip && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScrollLandscape} contentContainerStyle={styles.stripLandscape}>
              {stripItems}
            </ScrollView>
          )}
          {chaos && (
            <View>
              <IconButton testID="chaos-btn" icon="🌪️" label={`Chọc loạn xạ cả phòng (💎${CHAOS_POKE_RUBY})`} style={iconOnly && styles.chaosSmall} onPress={chaos} />
              {chaosHits > 0 && <ChaosFloat key={chaosHits} style={styles.chaosFloatTop} />}
            </View>
          )}
          <IconButton testID="room-visual-open" icon="🎨" label="Map phòng & Siêu mượt" onPress={() => setVisualOpen(true)} />
          <IconButton testID="profile-open" icon="✏️" label="Sửa tên & ảnh" onPress={openMyProfile} />
          <View>
            <IconButton testID="chat-open" icon="💬" label="Trò chuyện" onPress={() => setChatOpen(true)} />
            {unread > 0 && (
              <View testID="chat-badge" pointerEvents="none" style={styles.badge}>
                <T style={styles.badgeText}>{unread > 9 ? '9+' : unread}</T>
              </View>
            )}
          </View>
          <IconButton
            icon={muted ? '🔇' : '🔊'}
            label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            onPress={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          />
          <IconButton testID="leave-open" icon="🚪" label="Rời phòng" onPress={() => setLeaving(true)} />
        </View>

        {!compactLandscape && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScroll} contentContainerStyle={styles.strip}>
            {stripItems}
          </ScrollView>
        )}

        {compactLandscape && !inlineStrip && !hideStrip && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScrollRow} contentContainerStyle={styles.stripLandscape}>
            {stripItems}
          </ScrollView>
        )}
        </>)}

        {meIsSpectator && (
          <View testID="spectator-banner" style={styles.spectatorBanner}>
            <T style={styles.spectatorText}>👀 Bạn đang xem ván này. Ván sau sẽ được chơi!</T>
          </View>
        )}

        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{content}</View>
        )}

        {bottom ? (
          <View style={[styles.bottom, { borderTopColor: 'rgba(0,0,0,0.22)' }]} onLayout={(e) => setFeedInset(e.nativeEvent.layout.height)}>{bottom}</View>
        ) : (
          <View onLayout={() => setFeedInset(12)} />
        )}

        {overlay}
        <FunLayer game={game} players={room.players} chat={game.chat} />
        <TrollLayer game={game} players={room.players} />
        <TrollFxLayer game={game} players={room.players} />
        <SkillLayer game={game} players={room.players} />
        <PokeLayer game={game} players={room.players} />
        <PokeSideLayer game={game} players={room.players} />
        {target && <ThrowSheet game={game} target={target} onClose={() => setTarget(null)} />}
        {chatOpen && <ChatSheet game={game} players={room.players} onClose={() => setChatOpen(false)} />}
        {profileOpen && <ProfileSheet game={game} room={room} onClose={() => setProfileOpen(false)} />}
        {visualOpen && (
          <Sheet title="🎨 Giao Diện & Chống Lag" onClose={() => setVisualOpen(false)}>
            <View style={styles.smoothBox}>
              <View style={{ flex: 1 }}>
                <T style={{ fontWeight: '900', fontSize: 14, color: C.ink }}>⚡ Chế độ Siêu Mượt</T>
                <T style={{ fontSize: 12, color: C.muted }}>Tắt hạt bay nền & giảm pháo giấy để máy yếu / phòng 12 người mượt 60fps.</T>
              </View>
              <Button
                testID="room-smooth-toggle"
                small
                variant={smooth ? 'jade' : 'paper'}
                title={smooth ? 'ĐANG BẬT' : 'Tắt'}
                onPress={() => setSmooth(!smooth)}
              />
            </View>

            <T style={{ fontWeight: '900', fontSize: 14, color: C.ink }}>
              {isHost ? '🗺️ Đổi Map cho cả phòng (kể cả giữa ván)' : '🗺️ Đổi Map hiển thị trên máy bạn'}
            </T>
            <View style={{ gap: 6 }}>
              {ROOM_THEMES.map((t) => {
                const canUse = !isHost ? true : t.price === 0 || ownedSet.has(t.id);
                const selected = activeThemeId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    testID={`room-map-${t.id}`}
                    disabled={!canUse}
                    onPress={async () => {
                      if (isHost) {
                        const err = await game.configure({ settings: { roomTheme: t.id } });
                        if (err) feed(err, 'bad');
                        else {
                          feed(`Đã đổi Map phòng: ${t.emoji} ${t.name}`, 'good');
                          setVisualOpen(false);
                        }
                      } else {
                        setLocalTheme(t.id);
                        setVisualOpen(false);
                      }
                    }}
                    style={[styles.mapItem, selected && styles.mapItemOn, !canUse && { opacity: 0.5 }]}
                  >
                    <View style={[styles.mapSwatch, { backgroundColor: t.bg, borderColor: t.accent }]}>
                      <T style={{ fontSize: 18 }}>{t.emoji}</T>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T style={{ fontWeight: '900', fontSize: 13 }}>{t.name}</T>
                      <T style={{ fontSize: 11, color: C.muted }}>{t.desc}</T>
                    </View>
                    <T style={{ fontWeight: '900', fontSize: 12, color: selected ? C.jade : C.son }}>
                      {selected ? '✔ Dùng' : canUse ? 'Chọn' : `💎${t.price}`}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </Sheet>
        )}
        {leaving && (
          <Sheet title="Rời phòng?" onClose={() => setLeaving(false)}>
            <T style={{ color: C.muted }}>
              {room.phase === 'playing' ? 'Bạn đang trong ván, rời bây giờ là tính như bỏ cuộc.' : 'Bạn có thể vào lại bằng mã phòng.'}
            </T>
            <Button testID="leave-confirm" title="Rời phòng" variant="ink" onPress={game.leave} />
            <Button title="Ở lại" variant="paper" onPress={() => setLeaving(false)} />
          </Sheet>
        )}
      </View>
    </View>
    </ToolsCtx.Provider>
  );
}

/** chữ "-💎20" bay lên rồi mờ dần sau mỗi lần chọc loạn xạ (không chặn lần bấm sau) */
export function ChaosFloat({ style }: { style: StyleProp<ViewStyle> }) {
  const t = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [t]);
  return (
    <Animated.View
      testID="chaos-float"
      pointerEvents="none"
      style={[style, { opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }), transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }] }]}
    >
      <T style={styles.chaosFloatText}>-💎{CHAOS_POKE_RUBY}</T>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center' },
  rootWide: { maxWidth: 1120 },
  rootFullscreen: { maxWidth: '100%' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4 },
  topLandscape: { paddingTop: 3, paddingBottom: 2, paddingHorizontal: 8, gap: 6 },
  chip: { marginBottom: 0, flexShrink: 1, minWidth: 0 },
  gameName: { flex: 1, color: C.onSon, fontWeight: '800', fontSize: 15 },
  gameIcon: { flex: 1, minWidth: 0, fontSize: 22, textAlign: 'center' },
  gameNameLandscape: { flex: 0, marginRight: 4 },
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  stripScrollRow: { flexGrow: 0, flexShrink: 0, maxHeight: 68, minHeight: 68 },
  stripScrollLandscape: { flex: 1, flexGrow: 1, maxHeight: 54 },
  strip: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6, gap: 2 },
  stripLandscape: { alignItems: 'center', paddingVertical: 0, gap: 0 },
  avatarRow: { transform: [{ scale: 0.78 }], marginHorizontal: -7, marginVertical: -9 },
  avatarCompact: { transform: [{ scale: 0.56 }], marginHorizontal: -12, marginVertical: -18 },
  content: { flexGrow: 1, flexShrink: 0, paddingHorizontal: 14, paddingBottom: 12, gap: 12 },
  contentLandscape: { paddingBottom: 4, gap: 6 },
  contentFullscreen: { paddingHorizontal: 4, paddingBottom: 4, gap: 4 },
  spectatorBanner: {
    marginHorizontal: 12, marginBottom: 4, paddingVertical: 5, paddingHorizontal: 10,
    backgroundColor: 'rgba(25, 18, 14, 0.86)', borderRadius: 10, borderWidth: 1.5, borderColor: C.gold,
  },
  spectatorText: { color: C.gold, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.gold,
    borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  chaosSmall: { width: 34, height: 34, borderRadius: 17 },
  topTight: { gap: 4 },
  chipTight: { paddingHorizontal: 6 },
  spacer: { flex: 1 },
  chaosFloatTop: { position: 'absolute', top: 40, left: -8, right: -8, alignItems: 'center', zIndex: 60 },
  chaosFloatText: { fontSize: 13, fontWeight: '900', color: C.gold, textShadowColor: C.ink, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  bottom: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8, borderTopWidth: 2, borderTopColor: C.sonDark },
  smoothBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 14, borderWidth: 2, borderColor: C.ink, padding: 10 },
  mapItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, backgroundColor: C.mist, borderWidth: 2, borderColor: 'transparent' },
  mapItemOn: { borderColor: C.jade, backgroundColor: '#ECFDF5' },
  mapSwatch: { width: 38, height: 38, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
