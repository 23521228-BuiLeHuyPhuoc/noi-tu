/**
 * Nền Map & Chủ Đề Màu Phòng: đổi toàn bộ không khí thị giác + hiệu ứng hạt nền chạy GPU CSS.
 * Khi bật chế độ "⚡ Siêu mượt", giữ nguyên bảng màu đẹp và tắt bớt hạt bay để tối ưu hiệu năng.
 */
import { memo, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { themeById, type RoomTheme } from '../../../shared/src/themes';

const web = (o: Record<string, unknown>) => (Platform.OS === 'web' ? (o as object) : {});

interface Particle {
  id: number;
  leftPct: number;
  topPct: number;
  delay: number;
  dur: number;
  size: number;
  glyph: string;
}

const GLYPHS: Record<NonNullable<RoomTheme['particleFx']>, string[]> = {
  none: [],
  fireflies: ['✨', '🌙'],
  neon: ['◆', '✦', '⚡'],
  bamboo: ['🍃', '🎋'],
  waves: ['🐚', '✨', '🌊'],
  tet: ['🌼', '🌸', '🧧', '✨'],
  sakura: ['🌸', '🌺', '✨'],
  lantern: ['🏮', '✨', '🎇'],
  casino: ['♦️', '♠️', '💎', '✨'],
  ocean: ['🫧', '🐚', '💎'],
  galaxy: ['✦', '⭐', '🌟', '🪐'],
};

function makeParticles(fx: NonNullable<RoomTheme['particleFx']>, count: number): Particle[] {
  const glyphs = GLYPHS[fx];
  if (!glyphs.length || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    // rải vị trí cố định không dùng Math.random lúc render
    const s1 = ((i * 37 + 13) % 94) + 3;
    const s2 = ((i * 53 + 7) % 88) + 4;
    return {
      id: i,
      leftPct: s1,
      topPct: s2,
      delay: ((i * 0.65) % 5).toFixed(2) as unknown as number,
      dur: 5.5 + (i % 5) * 1.4,
      size: fx === 'galaxy' ? 10 + (i % 3) * 5 : 14 + (i % 4) * 4,
      glyph: glyphs[i % glyphs.length],
    };
  });
}

function backgroundGradient(t: RoomTheme): string {
  switch (t.id) {
    case 'map_cung_ngan_ha':
      return 'radial-gradient(circle at 20% 18%, rgba(217,70,239,0.34), transparent 45%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.26), transparent 50%), linear-gradient(160deg, #070516 0%, #160D3B 52%, #0B102E 100%)';
    case 'map_sakura_kyoto':
      return 'radial-gradient(circle at 80% 12%, rgba(255,133,179,0.28), transparent 45%), linear-gradient(170deg, #3B1847 0%, #240C2E 58%, #16071D 100%)';
    case 'map_long_cung':
      return 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.26), transparent 55%), linear-gradient(180deg, #042A4A 0%, #021529 100%)';
    case 'map_casino_royale':
      return 'radial-gradient(circle at 50% 20%, rgba(245,158,11,0.18), transparent 55%), linear-gradient(165deg, #094D38 0%, #042219 100%)';
    case 'pho_dem_neon':
      return 'radial-gradient(circle at 15% 15%, rgba(8,247,254,0.16), transparent 42%), radial-gradient(circle at 85% 80%, rgba(255,0,229,0.16), transparent 42%), linear-gradient(160deg, #0C1220 0%, #191D38 100%)';
    default:
      return `linear-gradient(175deg, ${t.bg} 0%, ${t.bgAlt} 100%)`;
  }
}

export const MapBackdrop = memo(function MapBackdrop({ themeId, smooth = false }: { themeId?: string; smooth?: boolean }) {
  const theme = themeById(themeId);
  const fx = theme.particleFx ?? 'none';
  const count = smooth ? 0 : fx === 'none' ? 0 : theme.price > 0 ? 14 : 6;
  const particles = useMemo(() => makeParticles(fx, count), [fx, count]);

  return (
    <View
      testID={`map-backdrop-${theme.id}`}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: theme.bg, overflow: 'hidden' },
        web({ backgroundImage: backgroundGradient(theme) }),
      ]}
    >
      {Platform.OS === 'web' && fx === 'galaxy' && !smooth && (
        <View
          style={[
            StyleSheet.absoluteFill,
            web({
              background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(232,121,249,0.75), rgba(56,189,248,0.9), rgba(255,255,255,0))',
              height: 2,
              width: 140,
              top: '18%',
              left: '65%',
              animation: 'xl-meteor-streak 6.5s ease-in infinite',
            }),
          ]}
        />
      )}
      {Platform.OS === 'web' && particles.map((p) => {
        const animName =
          fx === 'sakura' || fx === 'tet' || fx === 'bamboo'
            ? 'xl-petal-fall'
            : fx === 'ocean' || fx === 'waves'
              ? 'xl-bubble-rise'
              : 'xl-star-twinkle';
        const isFallOrRise = animName !== 'xl-star-twinkle';
        return (
          <Text
            key={p.id}
            style={[
              styles.particle,
              {
                left: `${p.leftPct}%`,
                top: isFallOrRise ? -30 : `${p.topPct}%`,
                fontSize: p.size,
                opacity: fx === 'galaxy' ? 0.85 : 0.72,
              },
              web({
                animation: `${animName} ${p.dur}s ${isFallOrRise ? 'linear' : 'ease-in-out'} ${p.delay}s infinite`,
                willChange: 'transform, opacity',
              }),
            ]}
          >
            {p.glyph}
          </Text>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    userSelect: 'none',
  } as object,
});
