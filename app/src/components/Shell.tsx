import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GAME_INFO, type ChatMsg, type PublicPlayer, type RoomState } from '../../../shared/src/types';
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
import { EmojiIcon, RubyIcon, UiIcon } from './Icons';

export interface StripOptions {
  sub?: (p: PublicPlayer) => string | undefined;
  active?: string | null;
  dim?: (p: PublicPlayer) => boolean;
  ring?: (p: PublicPlayer) => string | undefined;
  rank?: (p: PublicPlayer) => number | undefined;
  order?: string[];
}

export interface ShellTools {
  openChat: () => void;
  unread: number;
  muted: boolean;
  toggleMute: () => void;
  leave: () => void;
  openPlayer: (id: string) => void;
  openProfile: () => void;
  chaos?: () => void;
  chaosHits: number;
}
const ToolsCtx = createContext<ShellTools | null>(null);
export const useShellTools = () => useContext(ToolsCtx);

function sameFxRoster(a: PublicPlayer[], b: PublicPlayer[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].name !== b[i].name ||
      a[i].cosmetics?.chatBubble !== b[i].cosmetics?.chatBubble
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Cô lập hoàn toàn 6 lớp hiệu ứng chọc ghẹo/quà tặng (4.200+ dòng code) khỏi luồng cập nhật `room:state`:
 * khi các ván chơi cập nhật điểm/bước chạy/xúc xắc liên tục, cả 6 lớp này KHÔNG re-render (0ms)!
 */
const RoomFxOverlays = memo(
  function RoomFxOverlays({
    game,
    players,
    chat,
  }: {
    game: Game;
    players: PublicPlayer[];
    chat: ChatMsg[];
  }) {
    return (
      <>
        <FunLayer game={game} players={players} chat={chat} />
        <TrollLayer game={game} players={players} />
        <TrollFxLayer game={game} players={players} />
        <SkillLayer game={game} players={players} />
        <PokeLayer game={game} players={players} />
        <PokeSideLayer game={game} players={players} />
      </>
    );
  },
  (prev, next) =>
    prev.game.me === next.game.me &&
    prev.game.onFun === next.game.onFun &&
    prev.chat === next.chat &&
    sameFxRoster(prev.players, next.players),
);

/** Khung chung cho mọi màn trong phòng: nền Map, HUD kính mờ, hàng avatar 1–12 người, nội dung, vùng nút dưới */
export function Shell({
  game, room, strip = {}, children, bottom, scroll = true, overlay, wide = false, fullscreen = false, hideStrip = false, bare = false,
}: {
  game: Game;
  room: RoomState;
  strip?: StripOptions;
  children: ReactNode;
  bottom?: ReactNode;
  scroll?: boolean;
  overlay?: ReactNode;
  wide?: boolean;
  fullscreen?: boolean;
  bare?: boolean;
  hideStrip?: boolean;
}) {
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
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
  const tightHeight = !scroll && height < 720;
  const inlineStrip = compactLandscape && width >= 700;
  const baseSize = fullscreen || compactLandscape || (wide && width >= 700) ? 50 : height >= 780 ? 58 : height >= 700 ? 52 : 44;
  const stripSize = room.players.length >= 10 ? Math.min(baseSize, 42) : room.players.length >= 7 ? Math.min(baseSize, 46) : baseSize;

  const openMyProfile = useCallback(() => setProfileOpen(true), []);
  const roomPlayersRef = useRef(room.players);
  useEffect(() => {
    roomPlayersRef.current = room.players;
  }, [room.players]);

  const handleSelectPlayer = useCallback(
    (id: string) => {
      if (id === game.me) {
        setProfileOpen(true);
        return;
      }
      const pl = roomPlayersRef.current.find((x) => x.id === id);
      if (pl) setTarget(pl);
    },
    [game.me],
  );

  const fxGame = useMemo(
    () => ({ me: game.me, onFun: game.onFun }) as unknown as Game,
    [game.me, game.onFun],
  );

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
  const crowded = room.players.length >= 6;
  const ownedSet = new Set(game.user?.owned ?? []);

  const content = (
    <View style={[styles.content, !scroll && styles.contentNoScroll, tightHeight && styles.contentTight, compactLandscape && styles.contentLandscape, fullscreen && styles.contentFullscreen]}>
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
        sub={p.spectator ? 'Đang xem' : strip.sub?.(p)}
        ring={strip.ring?.(p)}
        rank={p.spectator ? undefined : strip.rank?.(p)}
        size={stripSize}
        editable={p.id === game.me}
        crowded={crowded}
        onPress={p.id === game.me ? openMyProfile : undefined}
        onSelectPlayer={p.id !== game.me && !meIsSpectator ? handleSelectPlayer : undefined}
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
      openPlayer: handleSelectPlayer,
      openProfile: openMyProfile,
      chaos,
      chaosHits,
    }}>
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth || room.phase === 'playing'} />
      <View style={[styles.root, wide && styles.rootWide, fullscreen && styles.rootFullscreen]}>
        {!bare && (<>
        <View
          style={[
            styles.top,
            compactLandscape && styles.topLandscape,
            tightHeight && styles.topTightVertical,
            iconOnly && styles.topTight,
          ]}
        >
          <Button
            testID="room-chip"
            small
            variant="paper"
            iconNode={<UiIcon name="Copy" size={13} color={C.ink} />}
            title={iconOnly ? room.code : `Phòng ${room.code}`}
            style={[styles.chip, iconOnly && styles.chipTight]}
            onPress={async () => (await copyText(room.code)) && feed('Đã sao chép mã phòng')}
          />
          {iconOnly && chaos ? (
            <View style={styles.spacer} />
          ) : iconOnly ? (
            <View accessibilityLabel={GAME_INFO[room.gameType].name} style={[styles.gameIconWrap, compactLandscape && { flex: 0 }]}>
              <EmojiIcon emoji={GAME_META[room.gameType].emoji} size={20} />
            </View>
          ) : (
            <View style={[styles.gameNameWrap, compactLandscape && styles.gameNameLandscape]}>
              <EmojiIcon emoji={GAME_META[room.gameType].emoji} size={20} />
              <T numberOfLines={1} style={[styles.gameName, { color: theme.onBg }]}>
                {GAME_INFO[room.gameType].name}
              </T>
            </View>
          )}
          {!hideStrip && inlineStrip && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScrollLandscape} contentContainerStyle={styles.stripLandscape}>
              {stripItems}
            </ScrollView>
          )}
          {chaos && (
            <View>
              <IconButton
                testID="chaos-btn"
                icon="🌪️"
                iconNode={<UiIcon name="Flame" size={iconOnly ? 17 : 19} color="#EA580C" />}
                label={`Chọc loạn xạ cả phòng (💎${CHAOS_POKE_RUBY})`}
                style={iconOnly && styles.iconTight}
                onPress={chaos}
              />
              {chaosHits > 0 && <ChaosFloat key={chaosHits} style={styles.chaosFloatTop} />}
            </View>
          )}
          <IconButton testID="room-visual-open" icon="🎨" iconNode={<UiIcon name="Palette" size={iconOnly ? 16 : 19} color={C.violet} />} label="Map phòng & Siêu mượt" style={iconOnly && styles.iconTight} onPress={() => setVisualOpen(true)} />
          <IconButton testID="profile-open" icon="✏️" iconNode={<UiIcon name="Pencil" size={iconOnly ? 16 : 18} color={C.ink} />} label="Sửa tên & ảnh" style={iconOnly && styles.iconTight} onPress={openMyProfile} />
          <View>
            <IconButton testID="chat-open" icon="💬" iconNode={<UiIcon name="MessageCircle" size={iconOnly ? 16 : 19} color={C.ink} />} label="Trò chuyện" style={iconOnly && styles.iconTight} onPress={() => setChatOpen(true)} />
            {unread > 0 && (
              <View testID="chat-badge" pointerEvents="none" style={styles.badge}>
                <T style={styles.badgeText}>{unread > 9 ? '9+' : unread}</T>
              </View>
            )}
          </View>
          <IconButton
            icon={muted ? '🔇' : '🔊'}
            iconNode={<UiIcon name={muted ? 'VolumeX' : 'Volume2'} size={iconOnly ? 16 : 19} color={muted ? C.danger : C.ink} />}
            label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            style={iconOnly && styles.iconTight}
            onPress={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          />
          <IconButton testID="leave-open" icon="🚪" iconNode={<UiIcon name="LogOut" size={iconOnly ? 16 : 18} color={C.son} />} label="Rời phòng" style={iconOnly && styles.iconTight} onPress={() => setLeaving(true)} />
        </View>

        {!hideStrip && !compactLandscape && (
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
            <UiIcon name="Eye" size={14} color={C.gold} />
            <T style={styles.spectatorText}>Bạn đang xem ván này. Ván sau sẽ được chơi!</T>
          </View>
        )}

        {scroll ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            {content}
          </ScrollView>
        ) : (
          <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{content}</View>
        )}

        {bottom ? (
          <View style={[styles.bottom, tightHeight && styles.bottomTight, { borderTopColor: 'rgba(255,255,255,0.12)' }]} onLayout={(e) => setFeedInset(e.nativeEvent.layout.height)}>{bottom}</View>
        ) : (
          <View onLayout={() => setFeedInset(12)} />
        )}

        {overlay}
        <RoomFxOverlays game={fxGame} players={room.players} chat={game.chat} />
        {target && <ThrowSheet game={game} target={target} onClose={() => setTarget(null)} />}
        {chatOpen && <ChatSheet game={game} players={room.players} onClose={() => setChatOpen(false)} />}
        {profileOpen && <ProfileSheet game={game} room={room} onClose={() => setProfileOpen(false)} />}
        {visualOpen && (
          <Sheet title="🎨 Giao Diện & Chống Lag" onClose={() => setVisualOpen(false)}>
            <View style={styles.smoothBox}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <UiIcon name="Gauge" size={16} color={C.jadeDeep} />
                  <T style={{ fontWeight: '900', fontSize: 14, color: C.ink }}>Chế độ Siêu Mượt</T>
                </View>
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UiIcon name="Map" size={16} color={C.ink} />
              <T style={{ fontWeight: '900', fontSize: 14, color: C.ink }}>
                {isHost ? 'Đổi Map cho cả phòng (kể cả giữa ván)' : 'Đổi Map hiển thị trên máy bạn'}
              </T>
            </View>
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
                          feed(`Đã đổi Map phòng: ${t.name}`, 'good');
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
                      <EmojiIcon emoji={t.emoji} size={20} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T style={{ fontWeight: '900', fontSize: 13 }}>{t.name}</T>
                      <T style={{ fontSize: 11, color: C.muted }}>{t.desc}</T>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {selected ? (
                        <>
                          <UiIcon name="CheckCircle2" size={14} color={C.jadeDeep} />
                          <T style={{ fontWeight: '900', fontSize: 12, color: C.jadeDeep }}>Dùng</T>
                        </>
                      ) : canUse ? (
                        <T style={{ fontWeight: '900', fontSize: 12, color: C.son }}>Chọn</T>
                      ) : (
                        <>
                          <RubyIcon size={13} />
                          <T style={{ fontWeight: '900', fontSize: 12, color: C.son }}>{t.price}</T>
                        </>
                      )}
                    </View>
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
            <Button testID="leave-confirm" title="Rời phòng" variant="danger" onPress={game.leave} />
            <Button title="Ở lại" variant="paper" onPress={() => setLeaving(false)} />
          </Sheet>
        )}
      </View>
    </View>
    </ToolsCtx.Provider>
  );
}

/** chữ "-N Ruby" bay lên rồi mờ dần sau mỗi lần chọc loạn xạ */
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
      style={[
        style,
        {
          flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'center',
          opacity: t.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
          transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, -26] }) }],
        },
      ]}
    >
      <T style={styles.chaosFloatText}>-{CHAOS_POKE_RUBY}</T>
      <RubyIcon size={13} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  rootWide: { maxWidth: 1120 },
  rootFullscreen: { maxWidth: '100%' },
  top: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 10, marginTop: 8, paddingHorizontal: 8, paddingVertical: 6,
    borderRadius: 18, backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  topLandscape: { marginTop: 3, paddingVertical: 3, paddingHorizontal: 8, gap: 6 },
  chip: { flexShrink: 0 },
  gameNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  gameName: { color: C.onSon, fontWeight: '800', fontSize: 15, flexShrink: 1 },
  gameIconWrap: { flex: 1, minWidth: 28, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  gameNameLandscape: { flex: 0, marginRight: 4 },
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  stripScrollRow: { flexGrow: 0, flexShrink: 0, maxHeight: 68, minHeight: 68 },
  stripScrollLandscape: { flex: 1, flexGrow: 1, maxHeight: 54 },
  strip: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6, gap: 2 },
  stripLandscape: { alignItems: 'center', paddingVertical: 0, gap: 0 },
  avatarRow: { transform: [{ scale: 0.78 }], marginHorizontal: -7, marginVertical: -9 },
  avatarCompact: { transform: [{ scale: 0.56 }], marginHorizontal: -12, marginVertical: -18 },
  content: { flexGrow: 1, flexShrink: 0, paddingHorizontal: 14, paddingBottom: 12, gap: 12 },
  contentNoScroll: { flex: 1, flexShrink: 1, minHeight: 0, overflow: 'hidden', paddingTop: 6, paddingBottom: 6, gap: 6 },
  contentTight: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 4, gap: 5 },
  contentLandscape: { paddingBottom: 4, gap: 6 },
  contentFullscreen: { paddingHorizontal: 4, paddingBottom: 4, gap: 4 },
  topTightVertical: { marginTop: 4, marginBottom: 0, paddingVertical: 4 },
  spectatorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 4, marginBottom: 4, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.78)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,197,61,0.55)',
  },
  spectatorText: { color: C.gold, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 9.5, backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  chaosSmall: { width: 34, height: 34, borderRadius: 12 },
  iconTight: { width: 34, height: 34, borderRadius: 11 },
  topTight: { gap: 4, marginHorizontal: 8, paddingHorizontal: 6 },
  chipTight: {},
  spacer: { flex: 1 },
  chaosFloatTop: { position: 'absolute', top: 42, left: -10, right: -10, zIndex: 60 },
  chaosFloatText: { fontSize: 13, fontWeight: '900', color: C.gold, textShadowColor: C.ink, textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  bottom: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8, borderTopWidth: 1 },
  bottomTight: { paddingHorizontal: 10, paddingTop: 5, paddingBottom: 7, gap: 5 },
  smoothBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFBEB', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(217,119,6,0.28)', padding: 12 },
  mapItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 14, backgroundColor: C.mist, borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.08)' },
  mapItemOn: { borderColor: C.jade, backgroundColor: '#ECFDF5' },
  mapSwatch: { width: 38, height: 38, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
