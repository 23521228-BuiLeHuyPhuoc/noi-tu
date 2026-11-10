import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicPlayer } from '../../../shared/src/types';
import { avatarOf, characterSvgUri, playerColorOf } from '../avatars';
import { C, FONT } from '../theme';

export function Avatar({
  player, size = 52, active, dim, host, sub, me, onPress, ring,
}: {
  player: PublicPlayer;
  size?: number;
  active?: boolean;
  dim?: boolean;
  host?: boolean;
  /** dòng nhỏ dưới tên: số từ, số xu… */
  sub?: string;
  me?: boolean;
  onPress?: () => void;
  /** màu viền riêng (vd: màu ngựa) */
  ring?: string;
}) {
  const a = avatarOf(player.avatar);
  const charColor = player.character ? playerColorOf(player.character) : null;
  const imgUri = player.avatarUrl ?? (player.character ? characterSvgUri(player.character) : undefined);
  const borderCol = ring ?? charColor?.hex ?? C.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Chọc ${player.name}` : player.name}
      style={[styles.wrap, { width: size + 22 }, dim && { opacity: 0.4 }]}
    >
      <View
        testID={`avatar-${player.id}`}
        style={[
          styles.circle,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: charColor ? charColor.light : a.bg,
            borderColor: borderCol, borderWidth: ring || charColor ? 3.5 : 2.5,
          },
          active && styles.active,
        ]}
      >
        {imgUri ? (
          <Image source={{ uri: imgUri }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
        ) : (
          <Text style={{ fontSize: size * 0.55 }}>{a.emoji}</Text>
        )}
        {host && <Text style={styles.crown}>👑</Text>}
        {!player.connected && <Text style={styles.off}>💤</Text>}
      </View>
      <Text numberOfLines={1} style={[styles.name, active && { color: C.gold }]}>
        {me ? 'Bạn' : player.name}
      </Text>
      {sub !== undefined && <Text numberOfLines={1} style={styles.sub}>{sub}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  active: {
    shadowColor: C.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 0,
    borderColor: C.gold, transform: [{ scale: 1.08 }],
    // vòng sáng vàng quanh người đang tới lượt
    outlineWidth: 4, outlineColor: C.gold, outlineStyle: 'solid', outlineOffset: 2,
  } as object,
  crown: { position: 'absolute', top: -14, fontSize: 18 },
  off: { position: 'absolute', bottom: -6, right: -6, fontSize: 16 },
  name: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.onSon, maxWidth: '100%' },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.onSon, opacity: 0.85 },
});
