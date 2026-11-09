import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { GAME_INFO, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { isMuted, setMuted } from '../sound';
import { copyText } from '../web';
import { C } from '../theme';
import { Button, IconButton, T, useFeed } from '../ui';
import { Avatar } from './Avatar';
import { FunLayer, TauntSheet, ThrowSheet } from './Fun';
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
  game, room, strip = {}, children, bottom, scroll = true,
}: {
  game: Game;
  room: RoomState;
  strip?: StripOptions;
  children: ReactNode;
  bottom?: ReactNode;
  scroll?: boolean;
}) {
  const [target, setTarget] = useState<PublicPlayer | null>(null);
  const [taunt, setTaunt] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const feed = useFeed();

  const players = strip.order
    ? strip.order.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p)
    : [...room.players];
  // người đã rời phòng giữa ván không còn trong room.players; người mới (nếu có) thêm vào cuối
  for (const p of room.players) if (!players.includes(p)) players.push(p);

  const content = <View style={styles.content}>{children}</View>;

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Button
          testID="room-chip"
          small
          variant="paper"
          title={`Phòng ${room.code}`}
          style={styles.chip}
          onPress={async () => (await copyText(room.code)) && feed('Đã sao chép mã phòng')}
        />
        <T numberOfLines={1} style={styles.gameName}>{GAME_INFO[room.gameType].name}</T>
        <IconButton testID="taunt-open" icon="💬" label="Khịa cả phòng" onPress={() => setTaunt(true)} />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stripScroll} contentContainerStyle={styles.strip}>
        {players.map((p) => (
          <Avatar
            key={p.id}
            player={p}
            me={p.id === game.me}
            host={p.id === room.hostId}
            active={strip.active === p.id}
            dim={strip.dim?.(p)}
            sub={strip.sub?.(p)}
            ring={strip.ring?.(p)}
            onPress={p.id === game.me ? undefined : () => setTarget(p)}
          />
        ))}
      </ScrollView>

      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{content}</View>
      )}

      {bottom && <View style={styles.bottom}>{bottom}</View>}

      <FunLayer game={game} players={room.players} />
      {target && <ThrowSheet game={game} target={target} onClose={() => setTarget(null)} />}
      {taunt && <TauntSheet game={game} onClose={() => setTaunt(false)} />}
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
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  chip: { marginBottom: 0 },
  gameName: { flex: 1, color: C.onSon, fontWeight: '800', fontSize: 15 },
  // ScrollView ngang trên web mặc định giãn hết chiều cao còn lại -> chặn lại
  stripScroll: { flexGrow: 0, flexShrink: 0 },
  strip: { paddingHorizontal: 10, paddingTop: 14, paddingBottom: 8, gap: 2 },
  content: { flex: 1, paddingHorizontal: 14, paddingBottom: 12, gap: 12 },
  bottom: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12, gap: 8, borderTopWidth: 2, borderTopColor: C.sonDark },
});
