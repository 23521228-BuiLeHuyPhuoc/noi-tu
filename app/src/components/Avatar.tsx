import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicPlayer } from '../../../shared/src/types';
import { portraitOf, shortName, type PortraitSource } from '../avatars';
import { C, FONT } from '../theme';

export function Avatar({
  player, size = 52, active, dim, host, sub, me, onPress, ring, rank,
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
  /** hạng (1..n): hiện thành huy hiệu nhỏ ở góc avatar */
  rank?: number;
}) {
  const pt = portraitOf(player);
  const borderCol = ring ?? (player.character ? pt.hex : C.ink);
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
            backgroundColor: pt.light,
            borderColor: borderCol, borderWidth: ring || player.character ? 3.5 : 2.5,
          },
          active && styles.active,
        ]}
      >
        <Image source={{ uri: pt.uri }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
        {host && <Text style={styles.crown}>👑</Text>}
        {!player.connected && <Text style={styles.off}>💤</Text>}
        {rank !== undefined && (
          <View testID={`rank-badge-${player.id}`} style={[styles.rank, rank === 1 && { backgroundColor: C.gold }]}>
            <Text style={styles.rankText}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}</Text>
          </View>
        )}
      </View>
      <Text numberOfLines={1} style={[styles.name, active && { color: C.gold }]}>
        {me ? 'Bạn' : shortName(player.name)}
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
  rank: {
    position: 'absolute', top: -5, left: -7, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 3,
    backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: FONT, fontSize: 11, fontWeight: '900', color: C.ink },
  off: { position: 'absolute', bottom: -6, right: -6, fontSize: 16 },
  name: { fontFamily: FONT, fontSize: 13, fontWeight: '700', color: C.onSon, maxWidth: '100%' },
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.onSon, opacity: 0.85 },
});

/** Chân dung tròn dùng chung (kết quả, trò chuyện, tài khoản): cùng cách vẽ như trong ván. */
export function Portrait({ p, size = 40, border = 2.5 }: { p: PortraitSource; size?: number; border?: number }) {
  const pt = portraitOf(p);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: pt.light, overflow: 'hidden',
        borderWidth: border, borderColor: p.character ? pt.hex : C.ink,
      }}
    >
      <Image source={{ uri: pt.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
}
