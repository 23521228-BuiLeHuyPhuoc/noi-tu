import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GAME_INFO, type ChatMsg, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import { CHAOS_POKE_RUBY } from '../../../shared/src/shop';
import { ROOM_THEMES } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { GAME_META } from '../messages';
import { isMuted, setMuted, subscribeAudioSettings } from '../sound';
import { copyText } from '../web';
import { C, backdropPalette } from '../theme';
import { Button, IconButton, T, useFeed, useFeedInset } from '../ui';
import { useKeyboardInset, useStableWindow } from '../hooks';
import { useLocalTheme, useSmoothMode } from '../smoothMode';
import { MapBackdrop } from './MapBackdrop';
import { AudioSheet } from './AudioSheet';
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
  game, room, strip = {}, children, bottom, scroll = true, overlay, wide = false, fullscreen = false, hideStrip = false, hideChat = false, keyboardAware = false, bare = false,
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
  hideChat?: boolean;
  keyboardAware?: boolean;
}) {
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const lastId = game.chat.at(-1)?.id ?? 0;
  const [seenId, setSeenId] = useState(lastId);
  if (chatOpen && seenId !== lastId) setSeenId(lastId);
  const unread = game.chat.filter((m) => m.id > seenId && m.from !== game.me).length;
  const [leaving, setLeaving] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => subscribeAudioSettings(() => setMutedState(isMuted())), []);
  const feed = useFeed();
  const setFeedInset = useFeedInset();
  useEffect(() => () => setFeedInset(16), [setFeedInset]);
  const { width, height } = useStableWindow();
  const rawKbInset = useKeyboardInset();
  const webKbInset = keyboardAware && Platform.OS === 'web' ? rawKbInset : 0;

  useEffect(() => {
    if (webKbInset > 0 && typeof window !== 'undefined' && (window.visualViewport?.offsetTop ?? 0) > 0) {
      window.scrollTo(0, 0);
    }
  }, [webKbInset]);

  const [smooth, setSmooth] = useSmoothMode();
  const [localTheme, setLocalTheme] = useLocalTheme();
  const activeThemeId = room.settings.roomTheme ?? localTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);

  const iconOnly = width < 440 || fullscreen;
  const compactLandscape = fullscreen || (wide && width >= 700 && height < 520);
  const tightHeight = (!scroll && height < 720) || webKbInset > 0;
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
        darkBg={pal.dark}
        onPress={p.id === game.me ? openMyProfile : undefined}
        onSelectPlayer={p.id !== game.me && !meIsSpectator ? handleSelectPlayer : undefined}
      />
    </View>
  ));

  const iconBtnBg = pal.dark ? C.darkSubtle : C.mist;
  const iconBtnBorder = pal.dark ? C.darkBorder : C.borderSubtle;
  const iconStroke = pal.dark ? C.darkText : C.secondary;
  const compactIconBtnStyle = [
    styles.topIconBtn,
    iconOnly && styles.iconTight,
    { backgroundColor: iconBtnBg, borderColor: iconBtnBorder },
  ];

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
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <MapBackdrop themeId={activeThemeId} smooth={smooth || room.phase === 'playing'} />
      <View style={[styles.root, wide && styles.rootWide, fullscreen && styles.rootFullscreen, webKbInset > 0 && { paddingBottom: webKbInset }]}>
        {!bare && (<>
        <View
          style={[
            styles.top,
            compactLandscape && styles.topLandscape,
            tightHeight && styles.topTightVertical,
            iconOnly && styles.topTight,
            { backgroundColor: pal.card, borderColor: pal.hairline },
          ]}
        >
          <Pressable
            testID="room-chip"
            accessibilityRole="button"
            onPress={async () => (await copyText(room.code)) && feed('Đã sao chép mã phòng')}
            style={({ pressed }) => [
              styles.chipBtn,
              { backgroundColor: iconBtnBg, borderColor: iconBtnBorder },
              pressed && { opacity: 0.78 },
            ]}
          >
            <UiIcon name="Copy" size={13} color={iconStroke} strokeWidth={1.65} />
            <T style={[styles.chipTxt, { color: pal.text }]}>
              {iconOnly ? room.code : `Phòng ${room.code}`}
            </T>
          </Pressable>

          <View style={[styles.gameNameWrap, compactLandscape && styles.gameNameLandscape]}>
            <EmojiIcon emoji={GAME_META[room.gameType].emoji} size={18} />
            <T numberOfLines={1} style={[styles.gameName, { color: pal.text }]}>
              {GAME_INFO[room.gameType].name}
            </T>
          </View>

          {!hideStrip && inlineStrip && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScrollLandscape} contentContainerStyle={styles.stripLandscape}>
              {stripItems}
            </ScrollView>
          )}
          {chaos && (
            <View>
              <IconButton
                testID="chaos-btn"
                icon="Flame"
                iconNode={<UiIcon name="Flame" size={15} color="#B45309" strokeWidth={1.65} />}
                label={`Chọc loạn xạ cả phòng (${CHAOS_POKE_RUBY} Ruby)`}
                style={compactIconBtnStyle}
                onPress={chaos}
              />
              {chaosHits > 0 && <ChaosFloat key={chaosHits} style={styles.chaosFloatTop} />}
            </View>
          )}
          <IconButton testID="room-visual-open" icon="Palette" iconNode={<UiIcon name="Palette" size={15} color={iconStroke} strokeWidth={1.65} />} label="Map phòng & Siêu mượt" style={compactIconBtnStyle} onPress={() => setVisualOpen(true)} />
          <IconButton testID="profile-open" icon="Pencil" iconNode={<UiIcon name="Pencil" size={15} color={iconStroke} strokeWidth={1.65} />} label="Sửa tên & ảnh" style={compactIconBtnStyle} onPress={openMyProfile} />
          {!hideChat && (
            <View>
              <IconButton testID="chat-open" icon="MessageCircle" iconNode={<UiIcon name="MessageCircle" size={15} color={iconStroke} strokeWidth={1.65} />} label="Trò chuyện" style={compactIconBtnStyle} onPress={() => setChatOpen(true)} />
              {unread > 0 && (
                <View testID="chat-badge" pointerEvents="none" style={styles.badge}>
                  <T style={styles.badgeText}>{unread > 9 ? '9+' : unread}</T>
                </View>
              )}
            </View>
          )}
          <IconButton
            testID="audio-panel-open"
            icon="Music"
            iconNode={<UiIcon name="Music" size={15} color={iconStroke} strokeWidth={1.65} />}
            label="Nhạc nền & Bảng lầy"
            style={compactIconBtnStyle}
            onPress={() => setAudioOpen(true)}
          />
          <IconButton
            icon="Volume2"
            iconNode={<UiIcon name={muted ? 'VolumeX' : 'Volume2'} size={15} color={muted ? C.danger : iconStroke} strokeWidth={1.65} />}
            label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            style={compactIconBtnStyle}
            onPress={() => {
              setMuted(!muted);
              setMutedState(!muted);
            }}
          />
          <IconButton testID="leave-open" icon="LogOut" iconNode={<UiIcon name="LogOut" size={15} color={C.danger} strokeWidth={1.65} />} label="Rời phòng" style={compactIconBtnStyle} onPress={() => setLeaving(true)} />
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
          <View testID="spectator-banner" style={[styles.spectatorBanner, { backgroundColor: pal.card, borderColor: pal.hairline }]}>
            <UiIcon name="Eye" size={14} color={C.goldDeep} strokeWidth={1.65} />
            <T style={[styles.spectatorText, { color: pal.text }]}>Bạn đang xem ván này. Ván sau sẽ được chơi.</T>
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
          <View style={[styles.bottom, tightHeight && styles.bottomTight, { borderTopColor: pal.hairline }]} onLayout={(e) => setFeedInset(e.nativeEvent.layout.height)}>{bottom}</View>
        ) : (
          <View onLayout={() => setFeedInset(12)} />
        )}

        {overlay}
        <RoomFxOverlays game={fxGame} players={room.players} chat={game.chat} />
        {target && <ThrowSheet game={game} target={target} onClose={() => setTarget(null)} />}
        {chatOpen && <ChatSheet game={game} players={room.players} onClose={() => setChatOpen(false)} />}
        {profileOpen && <ProfileSheet game={game} room={room} onClose={() => setProfileOpen(false)} />}
        {audioOpen && <AudioSheet onClose={() => setAudioOpen(false)} />}
        {visualOpen && (
          <Sheet title="Giao diện & Chống lag" onClose={() => setVisualOpen(false)}>
            <View style={styles.smoothBox}>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <UiIcon name="Gauge" size={16} color={C.jadeDeep} strokeWidth={1.65} />
                  <T style={{ fontWeight: '600', fontSize: 14, color: C.ink }}>Chế độ Siêu mượt</T>
                </View>
                <T style={{ fontSize: 12, color: C.secondary }}>Giảm hiệu ứng pháo giấy để máy yếu hoặc phòng 12 người mượt 60fps.</T>
              </View>
              <Button
                testID="room-smooth-toggle"
                small
                variant={smooth ? 'jade' : 'paper'}
                title={smooth ? 'Đang bật' : 'Tắt'}
                onPress={() => setSmooth(!smooth)}
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UiIcon name="Map" size={16} color={C.secondary} strokeWidth={1.65} />
              <T style={{ fontWeight: '600', fontSize: 14, color: C.ink }}>
                {isHost ? 'Đổi Map cho cả phòng' : 'Đổi Map hiển thị trên máy bạn'}
              </T>
            </View>
            <View style={{ gap: 6 }}>
              {ROOM_THEMES.map((t) => {
                const canUse = !isHost ? true : t.price === 0 || ownedSet.has(t.id);
                const selected = activeThemeId === t.id;
                const isDefaultMap = t.id === 'son_mac_dinh';
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
                    <View
                      style={[
                        styles.mapSwatch,
                        {
                          backgroundColor: isDefaultMap ? C.parchment : t.bg,
                          borderColor: isDefaultMap ? C.borderStrong : t.accent,
                        },
                      ]}
                    >
                      <View
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: isDefaultMap ? C.son : t.accent,
                        }}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T style={{ fontWeight: '600', fontSize: 13.5, color: C.ink }}>{t.name}</T>
                      <T style={{ fontSize: 11.5, color: C.secondary }}>{t.desc}</T>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {selected ? (
                        <>
                          <UiIcon name="CheckCircle2" size={14} color={C.jadeDeep} strokeWidth={1.75} />
                          <T style={{ fontWeight: '600', fontSize: 12, color: C.jadeDeep }}>Đang dùng</T>
                        </>
                      ) : canUse ? (
                        <T style={{ fontWeight: '600', fontSize: 12, color: C.secondary }}>Chọn</T>
                      ) : (
                        <>
                          <RubyIcon size={13} />
                          <T style={{ fontWeight: '600', fontSize: 12, color: C.goldDeep, fontVariant: ['tabular-nums'] }}>{t.price}</T>
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
          <Sheet title="Rời phòng" onClose={() => setLeaving(false)}>
            <T style={{ color: C.secondary, fontSize: 14 }}>
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
    borderRadius: 12, backgroundColor: C.paper,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  topLandscape: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 8, gap: 6 },
  chipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, height: 30, borderRadius: 8, borderWidth: 1, flexShrink: 0,
  },
  chipTxt: { fontSize: 12.5, fontWeight: '600', fontVariant: ['tabular-nums'] },
  gameNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  gameName: { color: C.ink, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  gameNameLandscape: { flex: 0, marginRight: 4 },
  topIconBtn: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  stripScrollRow: { flexGrow: 0, flexShrink: 0, maxHeight: 68, minHeight: 68 },
  stripScrollLandscape: { flex: 1, flexGrow: 1, maxHeight: 54 },
  strip: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 4, gap: 2 },
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
    backgroundColor: C.paper, borderRadius: 10, borderWidth: 1, borderColor: C.borderSubtle,
  },
  spectatorText: { color: C.ink, fontSize: 12, fontWeight: '500', textAlign: 'center' },
  badge: {
    position: 'absolute', top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 8.5, backgroundColor: C.danger,
    borderWidth: 1.5, borderColor: C.paper, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  iconTight: { width: 28, height: 28, borderRadius: 7 },
  topTight: { gap: 4, marginHorizontal: 8, paddingHorizontal: 6 },
  chaosFloatTop: { position: 'absolute', top: 38, left: -10, right: -10, zIndex: 60 },
  chaosFloatText: { fontSize: 12.5, fontWeight: '600', color: C.goldDeep, fontVariant: ['tabular-nums'] },
  bottom: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8, borderTopWidth: 1 },
  bottomTight: { paddingHorizontal: 10, paddingTop: 5, paddingBottom: 7, gap: 5 },
  smoothBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.goldSoft, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(180,83,9,0.22)', padding: 12 },
  mapItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: C.mist, borderWidth: 1, borderColor: C.borderSubtle },
  mapItemOn: { borderColor: C.jade, backgroundColor: C.jadeSoft },
  mapSwatch: { width: 34, height: 34, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
