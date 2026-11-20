import { useSpeakingMemeFor, useVoicePulse } from './MemeSpeakerFocus';
import { getPersonaDisplay } from '../audioAssets';
import { Image } from './Image';
import { PortraitImage } from './PortraitImage';
import { memo, useCallback, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { PublicPlayer } from '../../../shared/src/types';
import { configCacheKey, doodleUri, MOOD_EMOJI, portraitOf, type PortraitSource } from '../avatars';
import { useFace } from '../funState';
import { nickText } from '../messages';
import { C, FONT } from '../theme';
import { FrameWrap, NameText, TitleBadge, VipBadge } from './Cosmetics';
import { EmojiIcon, RankMedal, UiIcon } from './Icons';
import { useMeasuredView } from '../viewMeasurements';

/** màu phủ lên avatar theo chiêu: sét (cháy đen), băng, hôn gió (đỏ mặt) */
const TINTS = {
  burnt: { bg: 'rgba(14,10,8,0.76)', emoji: '💨' },
  ice: { bg: 'rgba(120,205,255,0.58)', emoji: '🧊' },
  blush: { bg: 'rgba(255,70,110,0.42)', emoji: '😘' },
} as const;

/** biến hình do hiệu ứng phụ của món chọc: nền phủ + vector icon giữa mặt */
const MORPHS = {
  pig: { bg: 'rgba(255,170,200,0.88)', emoji: '🐷' },
  baby: { bg: 'rgba(255,236,200,0.88)', emoji: '👶' },
  stone: { bg: 'rgba(110,110,116,0.9)', emoji: '🗿' },
} as const;

/** bom trên đầu đếm ngược 5 → 1 (tự đếm theo thời gian thật) */
function BombBadge() {
  const [left, setLeft] = useState(5);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return (
    <View pointerEvents="none" style={styles.bomb}>
      <EmojiIcon emoji="💣" size={22} />
      <View style={styles.bombCountPill}>
        <Text style={styles.bombCount}>{Math.max(1, left)}</Text>
      </View>
    </View>
  );
}

interface AvatarProps {
  player: PublicPlayer;
  size?: number;
  active?: boolean;
  dim?: boolean;
  host?: boolean;
  /** dòng nhỏ dưới tên: số từ, số xu… */
  sub?: string;
  me?: boolean;
  onPress?: () => void;
  /** callback ổn định nhận playerId để không phá vỡ React.memo khi danh sách người chơi cập nhật */
  onSelectPlayer?: (playerId: string) => void;
  /** màu viền riêng (vd: màu ngựa) */
  ring?: string;
  /** hạng (1..n): hiện thành huy hiệu nhỏ ở góc avatar */
  rank?: number;
  /** avatar của chính mình: hiện bút chì, chạm để sửa tên & ảnh */
  editable?: boolean;
  /** phòng đông (>= 6 người): tự động giảm hiệu ứng xoay liên tục của người đang chờ lượt */
  crowded?: boolean;
  /** nền phía sau là tông tối hay giấy sáng để chỉnh độ tương phản chữ */
  darkBg?: boolean;
}

function sameCosmetics(a: PublicPlayer['cosmetics'], b: PublicPlayer['cosmetics']): boolean {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  return (
    a.frame === b.frame &&
    a.aura === b.aura &&
    a.pet === b.pet &&
    a.title === b.title &&
    a.nameFx === b.nameFx &&
    a.chatBubble === b.chatBubble
  );
}

function samePlayerVisual(a: PublicPlayer, b: PublicPlayer): boolean {
  if (a === b) return true;
  if (
    a.id !== b.id ||
    a.voice !== b.voice ||
    a.name !== b.name ||
    a.connected !== b.connected ||
    a.spectator !== b.spectator ||
    a.avatar !== b.avatar ||
    a.avatarUrl !== b.avatarUrl ||
    a.vipTier !== b.vipTier ||
    !sameCosmetics(a.cosmetics, b.cosmetics)
  ) {
    return false;
  }
  if (a.character === b.character) return true;
  if (!a.character || !b.character) return false;
  return configCacheKey(a.character) === configCacheKey(b.character);
}

function areAvatarPropsEqual(prev: AvatarProps, next: AvatarProps): boolean {
  return (
    prev.size === next.size &&
    prev.active === next.active &&
    prev.dim === next.dim &&
    prev.host === next.host &&
    prev.sub === next.sub &&
    prev.me === next.me &&
    prev.ring === next.ring &&
    prev.rank === next.rank &&
    prev.editable === next.editable &&
    prev.crowded === next.crowded &&
    prev.darkBg === next.darkBg &&
    prev.onPress === next.onPress &&
    prev.onSelectPlayer === next.onSelectPlayer &&
    samePlayerVisual(prev.player, next.player)
  );
}

export const Avatar = memo(function Avatar({
  player, size = 52, active, dim, host, sub, me, onPress, onSelectPlayer, ring, rank, editable, crowded, darkBg = false,
}: AvatarProps) {
  const speaking = useSpeakingMemeFor(player.id);
  const pulse = useVoicePulse(!!speaking);
  const voice = speaking?.persona ?? player.voice;
  const persona = voice ? getPersonaDisplay(voice) : null;
  const face = useFace(player.id);
  const avatarRef = useMeasuredView(`avatar-${player.id}`);
  const pt = portraitOf(player, face.mood);
  const borderCol = (speaking && persona?.accent) || ring || (player.character ? pt.hex : C.ink);
  const rot = useState(() => new Animated.Value(0))[0];
  const shiftX = useState(() => new Animated.Value(0))[0];
  const grow = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    if (!face.wobble) {
      rot.setValue(0);
      shiftX.setValue(0);
      grow.setValue(1);
      return;
    }
    if (face.wobble === 'big') {
      Animated.spring(grow, { toValue: 2, friction: 3, tension: 120, useNativeDriver: true }).start();
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(rot, { toValue: -0.06, duration: 220, useNativeDriver: true }),
          Animated.timing(rot, { toValue: 0.06, duration: 220, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    if (face.wobble === 'slip') {
      const anim = Animated.sequence([
        Animated.timing(rot, { toValue: -0.12, duration: 110, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 0.25, duration: 140, useNativeDriver: true }),
      ]);
      anim.start();
      return () => anim.stop();
    }
    if (face.wobble === 'spin') {
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
  }, [face.wobble, rot, shiftX, grow]);

  const handlePress = useCallback(() => {
    if (onPress) onPress();
    else if (onSelectPlayer) onSelectPlayer(player.id);
  }, [onPress, onSelectPlayer, player.id]);

  const interactive = Boolean(onPress || onSelectPlayer);
  const cos = player.cosmetics;

  const circleContent = (
    <>
      <PortraitImage p={player} mood={face.mood} size={size} resolvedUri={pt.uri} />
      {face.doodle && (
        <Image testID={`doodle-${player.id}`} accessibilityLabel={`Bị vẽ bậy: ${face.doodle}`} source={{ uri: doodleUri(face.doodle) }} pointerEvents="none" style={styles.doodle} resizeMode="cover" />
      )}
      {face.tint && (
        <View pointerEvents="none" testID={`tint-${player.id}`} style={[styles.blackoutMask, { borderRadius: size / 2, backgroundColor: TINTS[face.tint].bg }]}>
          <EmojiIcon emoji={TINTS[face.tint].emoji} size={Math.max(16, Math.round(size * 0.44))} />
        </View>
      )}
      {face.morph && face.morph in MORPHS && (
        <View pointerEvents="none" testID={`morph-${player.id}`} style={[styles.blackoutMask, { borderRadius: size / 2, backgroundColor: MORPHS[face.morph as keyof typeof MORPHS].bg }]}>
          <EmojiIcon emoji={MORPHS[face.morph as keyof typeof MORPHS].emoji} size={Math.max(20, Math.round(size * 0.64))} />
        </View>
      )}
      {face.morph === 'cage' && (
        <View pointerEvents="none" testID={`morph-${player.id}`} style={[styles.cage, { borderRadius: size / 2 }]}>
          {[0, 1, 2, 3, 4].map((i) => <View key={i} style={styles.cageBar} />)}
          <View style={styles.cageLockPill}>
            <UiIcon name="Lock" size={11} color="#FEF08A" strokeWidth={2.5} />
          </View>
        </View>
      )}
      {face.wobble === 'blackout' && (
        <View pointerEvents="none" style={[styles.blackoutMask, { borderRadius: size / 2 }]}>
          <EmojiIcon emoji="🔌" size={Math.max(16, Math.round(size * 0.42))} />
        </View>
      )}
      {player.avatarUrl && face.mood !== 'normal' && (
        <View pointerEvents="none" style={styles.moodBadge}>
          <EmojiIcon emoji={MOOD_EMOJI[face.mood]} size={16} />
        </View>
      )}
      {face.charm && (
        <View pointerEvents="none" testID={`charm-${player.id}`} style={styles.charm}>
          <EmojiIcon emoji="✨" size={18} />
        </View>
      )}
      {face.morph === 'bomb' && <BombBadge />}
      {host && (
        <View pointerEvents="none" style={styles.crown}>
          <EmojiIcon emoji="👑" size={18} />
        </View>
      )}
      {!player.connected && (
        <View pointerEvents="none" style={styles.offPill}>
          <EmojiIcon emoji="💤" size={14} />
        </View>
      )}
      {editable && player.connected && (
        <View pointerEvents="none" testID="avatar-edit-badge" style={styles.editPill}>
          <UiIcon name="Pencil" size={10} color="#1C2024" strokeWidth={2.5} />
        </View>
      )}
      {rank !== undefined && (
        <View testID={`rank-badge-${player.id}`} style={[styles.rank, rank === 1 && { backgroundColor: '#FFF7C2', borderColor: '#F59E0B' }]}>
          <RankMedal rank={rank} size={16} />
        </View>
      )}
    </>
  );

  return (
    <Pressable
      onPress={interactive ? handlePress : undefined}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={editable ? `Sửa tên và ảnh của bạn (${player.name})` : interactive ? `Chọc ${player.name}` : player.name}
      style={[styles.wrap, { minWidth: size + 22, maxWidth: size + 64 }, dim && { opacity: 0.4 }]}
    >
      <View style={speaking ? { transform: [{ scale: 1.07 }] } : undefined}>
      {!!speaking && persona && <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: size, borderWidth: 2, borderColor: persona.accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }} />}
      <FrameWrap size={size} frame={cos?.frame} aura={cos?.aura} pet={cos?.pet} active={active} crowded={crowded}>
        {face.wobble ? (
          <Animated.View
            ref={avatarRef}
            collapsable={false}
            testID={`avatar-${player.id}`}
            style={[
              styles.circle,
              {
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: pt.light,
                borderColor: borderCol, borderWidth: ring || player.character ? 3 : 2,
                transform: [
                  ...(active ? [{ scale: 1.08 }] : []),
                  { scale: grow },
                  { translateX: shiftX },
                  {
                    rotate: rot.interpolate({
                      inputRange: [-1, 1],
                      outputRange: ['-360deg', '360deg'],
                    }),
                  },
                ],
              },
              active && styles.active,
            ]}
          >
            {circleContent}
          </Animated.View>
        ) : (
          <View
            ref={avatarRef}
            collapsable={false}
            testID={`avatar-${player.id}`}
            style={[
              styles.circle,
              {
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: pt.light,
                borderColor: borderCol, borderWidth: ring || player.character ? 3 : 2,
              },
              active && styles.active,
            ]}
          >
            {circleContent}
          </View>
        )}
      </FrameWrap>
      {persona && !speaking && <View pointerEvents="none" style={{ position: 'absolute', bottom: 1, right: 1, borderRadius: 4, width: 8, height: 8, backgroundColor: persona.accent, borderWidth: 1, borderColor: C.paper }} />}
      </View>
      {speaking && persona && <Text numberOfLines={1} style={{ color: C.ink, backgroundColor: persona.badgeBg, borderRadius: 6, paddingHorizontal: 4, fontSize: 9 }}>Đang nói</Text>}
      {(cos?.title || (player.vipTier && player.vipTier > 0)) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, flexWrap: 'wrap', marginTop: active ? 4 : 1 }}>
          {player.vipTier && player.vipTier > 0 ? <VipBadge tier={player.vipTier} compact /> : null}
          {cos?.title ? <TitleBadge title={cos.title} /> : null}
        </View>
      )}
      <NameText
        fx={cos?.nameFx}
        testID={`avatar-name-${player.id}`}
        style={[
          styles.name,
          { color: darkBg ? C.darkText : C.ink },
          active && { color: darkBg ? C.gold : C.goldDeep, fontWeight: '600', marginTop: cos?.title || player.vipTier ? 1 : 5 },
        ]}
      >
        {face.morph === 'flipname' ? Array.from(player.name).reverse().join('') : player.name}{me ? ' (bạn)' : ''}
      </NameText>
      {face.nick && (
        <Text testID={`nick-${player.id}`} numberOfLines={2} style={styles.nick}>{nickText(face.nick).replace(/\s*\p{Extended_Pictographic}\uFE0F?$/u, '')}</Text>
      )}
      {sub !== undefined && (
        <Text style={[styles.sub, { color: darkBg ? C.darkMuted : C.secondary }]}>{sub}</Text>
      )}
    </Pressable>
  );
}, areAvatarPropsEqual);

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 3 },
  circle: { alignItems: 'center', justifyContent: 'center' },
  active: {
    borderColor: C.goldDeep,
    borderWidth: 2.5,
  } as object,
  doodle: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  blackoutMask: {
    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(5, 7, 15, 0.72)', alignItems: 'center', justifyContent: 'center',
  },
  moodBadge: { position: 'absolute', bottom: -4, left: -4 },
  charm: { position: 'absolute', top: -8, right: -8 },
  cage: {
    position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden',
    flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: 'rgba(20,20,30,0.25)',
  },
  cageBar: { width: 3, height: '100%', backgroundColor: '#2B2B33', borderRadius: 2 },
  cageLockPill: {
    position: 'absolute', bottom: 1, alignSelf: 'center', width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(15,23,42,0.88)', alignItems: 'center', justifyContent: 'center',
  },
  bomb: { position: 'absolute', top: -15, alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  bombCountPill: {
    position: 'absolute', bottom: -2, right: -4, width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#DC2626', borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  bombCount: { fontSize: 9, fontWeight: '900', color: '#FFFFFF' },
  nick: {
    fontFamily: FONT, fontSize: 10, lineHeight: 12, textAlign: 'center', fontWeight: '900', color: C.ink, backgroundColor: C.gold, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden', maxWidth: '100%',
  },
  crown: { position: 'absolute', top: -13 },
  rank: {
    position: 'absolute', top: -5, left: -7, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 2,
    backgroundColor: C.paper, borderWidth: 1.5, borderColor: 'rgba(28,32,36,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  offPill: {
    position: 'absolute', bottom: -5, right: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  editPill: {
    position: 'absolute', bottom: -4, right: -5, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(28,32,36,0.25)', alignItems: 'center', justifyContent: 'center',
  },
  name: {
    fontFamily: FONT, fontSize: 12, lineHeight: 15, fontWeight: '600', color: C.ink, maxWidth: '100%', textAlign: 'center',
    wordBreak: 'break-word', overflowWrap: 'anywhere',
  } as object,
  sub: { fontFamily: FONT, fontSize: 11.5, fontWeight: '500', color: C.secondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

/** Chân dung tròn dùng chung (kết quả, trò chuyện, tài khoản): cùng cách vẽ như trong ván. */
export const Portrait = memo(function Portrait({ p, size = 40, border = 2.5, frame, aura, pet, active }: { p: PortraitSource; size?: number; border?: number; frame?: string; aura?: string; pet?: string; active?: boolean }) {
  const pt = portraitOf(p);
  return (
    <FrameWrap size={size} frame={frame} aura={aura} pet={pet} active={active}>
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: pt.light, overflow: 'hidden',
        borderWidth: border, borderColor: p.character ? pt.hex : 'rgba(28,32,36,0.35)',
      }}
    >
      <PortraitImage p={p} size={size} resolvedUri={pt.uri} />
    </View>
    </FrameWrap>
  );
});
