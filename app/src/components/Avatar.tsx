import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicPlayer } from '../../../shared/src/types';
import { doodleUri, MOOD_EMOJI, portraitOf, type PortraitSource } from '../avatars';
import { useFace } from '../funState';
import { nickText } from '../messages';
import { C, FONT } from '../theme';
import { FrameWrap, NameText } from './Cosmetics';

/** màu phủ lên avatar theo chiêu: sét (cháy đen), băng, hôn gió (đỏ mặt) */
const TINTS = {
  burnt: { bg: 'rgba(14,10,8,0.74)', emoji: '💨' },
  ice: { bg: 'rgba(120,205,255,0.55)', emoji: '🧊' },
  blush: { bg: 'rgba(255,70,110,0.38)', emoji: '😘' },
} as const;

export function Avatar({
  player, size = 52, active, dim, host, sub, me, onPress, ring, rank, editable,
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
  /** avatar của chính mình: hiện bút chì, chạm để sửa tên & ảnh */
  editable?: boolean;
}) {
  const face = useFace(player.id);
  const pt = portraitOf(player, face.mood);
  const borderCol = ring ?? (player.character ? pt.hex : C.ink);
  const rot = useState(() => new Animated.Value(0))[0];
  const shiftX = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (!face.wobble) {
      rot.setValue(0);
      shiftX.setValue(0);
      return;
    }
    if (face.wobble === 'spin') {
      // Xoay qua xoay lại lắc lư rồi lộn vòng 360 độ
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(rot, { toValue: -0.14, duration: 95, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0.14, duration: 190, useNativeDriver: true }),
          Animated.timing(rot, { toValue: -0.18, duration: 170, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0.18, duration: 170, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    // shake / blackout: lắc qua lắc lại liên hồi
    const anim = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(shiftX, { toValue: -7, duration: 42, useNativeDriver: true }),
          Animated.timing(rot, { toValue: -0.07, duration: 42, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(shiftX, { toValue: 7, duration: 84, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0.07, duration: 84, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(shiftX, { toValue: 0, duration: 42, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0, duration: 42, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [face.wobble, rot, shiftX]);

  const rotateInterpolate = rot.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-360deg', '360deg'],
  });

  const cos = player.cosmetics;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={editable ? `Sửa tên và ảnh của bạn (${player.name})` : onPress ? `Chọc ${player.name}` : player.name}
      style={[styles.wrap, { minWidth: size + 22, maxWidth: size + 64 }, dim && { opacity: 0.4 }]}
    >
      <FrameWrap size={size} frame={cos?.frame} aura={cos?.aura} active={active}>
      <Animated.View
        testID={`avatar-${player.id}`}
        style={[
          styles.circle,
          {
            width: size, height: size, borderRadius: size / 2,
            backgroundColor: pt.light,
            borderColor: borderCol, borderWidth: ring || player.character ? 3.5 : 2.5,
            transform: [
              ...(active ? [{ scale: 1.08 }] : []),
              { translateX: shiftX },
              { rotate: rotateInterpolate },
            ],
          },
          active && styles.active,
        ]}
      >
        <Image source={{ uri: pt.uri }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
        {face.doodle && (
          <Image testID={`doodle-${player.id}`} accessibilityLabel={`Bị vẽ bậy: ${face.doodle}`} source={{ uri: doodleUri(face.doodle) }} pointerEvents="none" style={styles.doodle} resizeMode="cover" />
        )}
        {face.tint && (
          <View pointerEvents="none" testID={`tint-${player.id}`} style={[styles.blackoutMask, { borderRadius: size / 2, backgroundColor: TINTS[face.tint].bg }]}>
            <Text style={{ fontSize: Math.max(14, size * 0.4) }}>{TINTS[face.tint].emoji}</Text>
          </View>
        )}
        {face.wobble === 'blackout' && (
          <View pointerEvents="none" style={[styles.blackoutMask, { borderRadius: size / 2 }]}>
            <Text style={{ fontSize: 16 }}>🔌</Text>
          </View>
        )}
        {player.avatarUrl && face.mood !== 'normal' && <Text style={styles.moodBadge}>{MOOD_EMOJI[face.mood]}</Text>}
        {face.charm && <Text testID={`charm-${player.id}`} style={styles.charm}>✨</Text>}
        {host && <Text style={styles.crown}>👑</Text>}
        {!player.connected && <Text style={styles.off}>💤</Text>}
        {editable && player.connected && <Text testID="avatar-edit-badge" style={styles.edit}>✏️</Text>}
        {rank !== undefined && (
          <View testID={`rank-badge-${player.id}`} style={[styles.rank, rank === 1 && { backgroundColor: C.gold }]}>
            <Text style={styles.rankText}>{rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}</Text>
          </View>
        )}
      </Animated.View>
      </FrameWrap>
      {/* tên đầy đủ, xuống dòng khi dài (không cắt bớt) */}
      <NameText fx={cos?.nameFx} testID={`avatar-name-${player.id}`} style={[styles.name, active && { color: C.gold, marginTop: 7 }]}>
        {player.name}{me ? ' (bạn)' : ''}
      </NameText>
      {face.nick && (
        <Text testID={`nick-${player.id}`} numberOfLines={2} style={styles.nick}>{nickText(face.nick).replace(/\s*\p{Extended_Pictographic}\uFE0F?$/u, '')}</Text>
      )}
      {sub !== undefined && <Text style={styles.sub}>{sub}</Text>}
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
  doodle: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  blackoutMask: {
    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(5, 7, 15, 0.72)', alignItems: 'center', justifyContent: 'center',
  },
  moodBadge: { position: 'absolute', bottom: -4, left: -4, fontSize: 16 },
  charm: { position: 'absolute', top: -8, right: -8, fontSize: 18 },
  nick: {
    fontFamily: FONT, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: '900', color: C.ink, backgroundColor: C.gold, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden', maxWidth: '100%',
  },
  crown: { position: 'absolute', top: -14, fontSize: 18 },
  rank: {
    position: 'absolute', top: -5, left: -7, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 3,
    backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: FONT, fontSize: 11, fontWeight: '900', color: C.ink },
  off: { position: 'absolute', bottom: -6, right: -6, fontSize: 16 },
  edit: { position: 'absolute', bottom: -6, right: -8, fontSize: 15 },
  name: {
    fontFamily: FONT, fontSize: 12, lineHeight: 15, fontWeight: '700', color: C.onSon, maxWidth: '100%', textAlign: 'center',
    wordBreak: 'break-word', overflowWrap: 'anywhere',
  } as object,
  sub: { fontFamily: FONT, fontSize: 12, fontWeight: '600', color: C.onSon, opacity: 0.85, textAlign: 'center' },
});

/** Chân dung tròn dùng chung (kết quả, trò chuyện, tài khoản): cùng cách vẽ như trong ván. */
export function Portrait({ p, size = 40, border = 2.5, frame }: { p: PortraitSource; size?: number; border?: number; frame?: string }) {
  const pt = portraitOf(p);
  return (
    <FrameWrap size={size} frame={frame}>
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: pt.light, overflow: 'hidden',
        borderWidth: border, borderColor: p.character ? pt.hex : C.ink,
      }}
    >
      <Image source={{ uri: pt.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
    </FrameWrap>
  );
}
