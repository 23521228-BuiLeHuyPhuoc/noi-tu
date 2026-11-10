import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { GAME_INFO, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { isMuted, setMuted } from '../sound';
import { copyText } from '../web';
import { C } from '../theme';
import { Button, IconButton, T, useFeed } from '../ui';
import { Avatar } from './Avatar';
import { ChatSheet, FunLayer, ThrowSheet } from './Fun';
import { Sheet } from './Sheet';

export interface StripOptions {
  sub?: (p: PublicPlayer) => string | undefined;
  active?: string | null;
  dim?: (p: PublicPlayer) => boolean;
  ring?: (p: PublicPlayer) => string | undefined;
  /** thứ tự hiển thị (vd: theo lượt chơi) */
  order?: string[];
}

/** Khung chung cho mọi màn trong phòng: thanh trên, hàng avatar, nội dung, vùng nút dưới cùng */
export function Shell({
  game, room, strip = {}, children, bottom, scroll = true, overlay, wide = false, fullscreen = false,
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
}) {
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  // tin nhắn chưa đọc: chỉ đếm tin mới sau khi vào màn hình
  const lastId = game.chat.at(-1)?.id ?? 0;
  const [seenId, setSeenId] = useState(lastId);
  if (chatOpen && seenId !== lastId) setSeenId(lastId);
  const unread = game.chat.filter((m) => m.id > seenId && m.from !== game.me).length;
  const [leaving, setLeaving] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const feed = useFeed();
  const { width, height } = useWindowDimensions();
  const compactLandscape = fullscreen || (wide && width >= 700 && height < 520);

  const players = strip.order
    ? strip.order.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p)
    : [...room.players];
  // người đã rời phòng giữa ván không còn trong room.players; người mới (nếu có) thêm vào cuối
  for (const p of room.players) if (!players.includes(p)) players.push(p);

  const content = (
    <View style={[styles.content, compactLandscape && styles.contentLandscape, fullscreen && styles.contentFullscreen]}>
      {children}
    </View>
  );
  const stripItems = players.map((p) => (
    <View key={p.id} style={compactLandscape ? styles.avatarCompact : undefined}>
      <Avatar
        player={p}
        me={p.id === game.me}
        host={p.id === room.hostId}
        active={strip.active === p.id}
        dim={strip.dim?.(p)}
        sub={strip.sub?.(p)}
        ring={strip.ring?.(p)}
        onPress={p.id === game.me ? undefined : () => setTarget(p)}
      />
    </View>
  ));

  return (
    <View style={[styles.root, wide && styles.rootWide, fullscreen && styles.rootFullscreen]}>
      <View style={[styles.top, compactLandscape && styles.topLandscape]}>
        <Button
          testID="room-chip"
          small
          variant="paper"
          title={`Phòng ${room.code}`}
          style={styles.chip}
          onPress={async () => (await copyText(room.code)) && feed('Đã sao chép mã phòng')}
        />
        <T numberOfLines={1} style={[styles.gameName, compactLandscape && styles.gameNameLandscape]}>{GAME_INFO[room.gameType].name}</T>
        {compactLandscape && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScrollLandscape} contentContainerStyle={styles.stripLandscape}>
            {stripItems}
          </ScrollView>
        )}
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

      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}

      {bottom && <View style={styles.bottom}>{bottom}</View>}

      {overlay}
      <FunLayer game={game} players={room.players} chat={game.chat} />
      {target && <ThrowSheet game={game} target={target} onClose={() => setTarget(null)} />}
      {chatOpen && <ChatSheet game={game} players={room.players} onClose={() => setChatOpen(false)} />}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center' },
  rootWide: { maxWidth: 1120 },
  rootFullscreen: { maxWidth: '100%' },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  topLandscape: { paddingTop: 3, paddingBottom: 2, paddingHorizontal: 8, gap: 6 },
  chip: { marginBottom: 0 },
  gameName: { flex: 1, color: C.onSon, fontWeight: '800', fontSize: 15 },
  gameNameLandscape: { flex: 0, marginRight: 4 },
  // ScrollView ngang trên web mặc định giãn hết chiều cao còn lại -> chặn lại
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  stripScrollLandscape: { flex: 1, flexGrow: 1, maxHeight: 54 },
  strip: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 8, gap: 2 },
  stripLandscape: { alignItems: 'center', paddingVertical: 0, gap: 0 },
  avatarCompact: { transform: [{ scale: 0.56 }], marginHorizontal: -12, marginVertical: -18 },
  content: { flex: 1, paddingHorizontal: 14, paddingBottom: 12, gap: 12 },
  contentLandscape: { paddingBottom: 4, gap: 6 },
  contentFullscreen: { paddingHorizontal: 4, paddingBottom: 4, gap: 4 },
  badge: {
    position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.gold,
    borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '900' },
  bottom: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8, borderTopWidth: 2, borderTopColor: C.sonDark },
});
