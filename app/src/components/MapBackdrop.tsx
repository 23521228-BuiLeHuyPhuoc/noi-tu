/**
 * Nền Map & Chủ Đề Màu Phòng V2 (15 Map rực rỡ):
 * Kết hợp mesh/aurora radial gradients 3 lớp + hạt vector 3D Fluent chạy GPU CSS 60fps.
 * Khi bật chế độ "Siêu mượt", giữ nguyên gradient rực rỡ và tắt hạt bay để tối ưu hiệu năng.
 */
import { memo, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { themeById, type MapParticleKind, type RoomTheme } from '../../../shared/src/themes';
import { EmojiIcon } from './Icons';

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

const GLYPHS: Record<MapParticleKind, string[]> = {
  none: [],
  lantern_gold: ['🏮', '✨', '🪙'],
  fireflies: ['✨', '🌕', '🦋'],
  neon: ['💠', '⚡', '✨'],
  bamboo: ['🎋', '🍃', '✨'],
  waves: ['🐚', '🌊', '☀️'],
  tet: ['🧧', '🌼', '🌸', '🪙'],
  sakura: ['🌸', '🌺', '✨', '🦋'],
  lantern: ['🏮', '🎇', '✨', '🍜'],
  casino: ['💎', '🎰', '🪙', '👑'],
  ocean: ['🫧', '🐚', '💎', '🐉'],
  galaxy: ['🌟', '🪐', '💎', '✨'],
  disco_party: ['🪩', '🎶', '🌈', '🦄'],
  swamp_glow: ['🐸', '🍄', '✨', '🪷'],
  matrix_cyber: ['👾', '💻', '⚡', '💠'],
  imperial_gold: ['👑', '🪙', '💎', '🔱'],
};

function makeParticles(fx: MapParticleKind, count: number): Particle[] {
  const glyphs = GLYPHS[fx] ?? [];
  if (!glyphs.length || count <= 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const s1 = ((i * 37 + 13) % 94) + 3;
    const s2 = ((i * 53 + 7) % 88) + 4;
    return {
      id: i,
      leftPct: s1,
      topPct: s2,
      delay: Number(((i * 0.6) % 5).toFixed(2)),
      dur: 5 + (i % 5) * 1.35,
      size: fx === 'imperial_gold' || fx === 'disco_party' ? 16 + (i % 4) * 5 : 14 + (i % 4) * 4,
      glyph: glyphs[i % glyphs.length],
    };
  });
}

function backgroundGradient(t: RoomTheme): string {
  switch (t.id) {
    case 'map_hoang_kim_dien':
      return 'radial-gradient(circle at 20% 15%, rgba(250,204,21,0.42), transparent 46%), radial-gradient(circle at 82% 78%, rgba(245,158,11,0.34), transparent 52%), linear-gradient(160deg, #451A03 0%, #78350F 46%, #1C0D02 100%)';
    case 'map_san_nhay_disco':
      return 'radial-gradient(circle at 18% 20%, rgba(244,63,94,0.45), transparent 45%), radial-gradient(circle at 84% 25%, rgba(34,211,238,0.38), transparent 46%), radial-gradient(circle at 50% 85%, rgba(168,85,247,0.45), transparent 55%), linear-gradient(155deg, #2E094E 0%, #4A044E 52%, #17082E 100%)';
    case 'map_dam_lay_ech':
      return 'radial-gradient(circle at 22% 18%, rgba(132,204,22,0.32), transparent 46%), radial-gradient(circle at 80% 78%, rgba(16,185,129,0.28), transparent 50%), linear-gradient(165deg, #052E16 0%, #064E3B 54%, #0F172A 100%)';
    case 'map_vuc_tham_cyber':
      return 'radial-gradient(circle at 18% 18%, rgba(16,185,129,0.32), transparent 44%), radial-gradient(circle at 85% 80%, rgba(168,85,247,0.34), transparent 48%), linear-gradient(160deg, #021812 0%, #0F172A 52%, #1E0B36 100%)';
    case 'map_cung_ngan_ha':
      return 'radial-gradient(circle at 20% 18%, rgba(232,121,249,0.38), transparent 46%), radial-gradient(circle at 85% 75%, rgba(56,189,248,0.32), transparent 50%), linear-gradient(160deg, #09061D 0%, #1E104C 52%, #0B1238 100%)';
    case 'map_sakura_kyoto':
      return 'radial-gradient(circle at 80% 14%, rgba(244,114,182,0.36), transparent 46%), radial-gradient(circle at 15% 80%, rgba(192,132,252,0.26), transparent 48%), linear-gradient(170deg, #4A1259 0%, #2B0938 58%, #160520 100%)';
    case 'map_long_cung':
      return 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.36), transparent 55%), radial-gradient(circle at 85% 85%, rgba(20,184,166,0.25), transparent 48%), linear-gradient(180deg, #062C4F 0%, #021326 100%)';
    case 'map_casino_royale':
      return 'radial-gradient(circle at 50% 16%, rgba(250,204,21,0.28), transparent 52%), linear-gradient(165deg, #064E3B 0%, #022C22 60%, #021712 100%)';
    case 'pho_dem_neon':
      return 'radial-gradient(circle at 15% 15%, rgba(34,211,238,0.26), transparent 44%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.26), transparent 44%), linear-gradient(160deg, #090D1E 0%, #1E113A 100%)';
    case 'son_mac_dinh':
      return 'radial-gradient(circle at 18% 12%, rgba(250,204,21,0.26), transparent 44%), radial-gradient(circle at 85% 85%, rgba(236,72,153,0.22), transparent 50%), linear-gradient(165deg, #DC2626 0%, #991B1B 52%, #580816 100%)';
    default:
      return t.bgGlow
        ? `radial-gradient(circle at 22% 16%, ${t.bgGlow}38, transparent 48%), linear-gradient(170deg, ${t.bg} 0%, ${t.bgAlt} 100%)`
        : `linear-gradient(175deg, ${t.bg} 0%, ${t.bgAlt} 100%)`;
  }
}

export const MapBackdrop = memo(function MapBackdrop({ themeId, smooth = false }: { themeId?: string; smooth?: boolean }) {
  const theme = themeById(themeId);
  const fx = theme.particleFx ?? 'none';
  const count = smooth ? 0 : fx === 'none' ? 0 : theme.price > 0 ? 4 : 2;
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
      {Platform.OS === 'web' && (fx === 'galaxy' || fx === 'imperial_gold' || fx === 'disco_party') && !smooth && (
        <View
          style={[
            StyleSheet.absoluteFill,
            web({
              background:
                fx === 'imperial_gold'
                  ? 'linear-gradient(90deg, rgba(255,255,255,0), rgba(250,204,21,0.9), rgba(255,255,255,0.95), rgba(255,255,255,0))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0), rgba(232,121,249,0.85), rgba(56,189,248,0.95), rgba(255,255,255,0))',
              height: 2.5,
              width: 160,
              top: '18%',
              left: '65%',
              animation: 'xl-meteor-streak 5.5s ease-in infinite',
            }),
          ]}
        />
      )}
      {Platform.OS === 'web' && particles.map((p) => {
        const animName =
          fx === 'sakura' || fx === 'tet' || fx === 'bamboo' || fx === 'imperial_gold' || fx === 'matrix_cyber'
            ? 'xl-petal-fall'
            : fx === 'ocean' || fx === 'waves' || fx === 'swamp_glow' || fx === 'lantern_gold'
              ? 'xl-bubble-rise'
              : 'xl-star-twinkle';
        const isFall = animName === 'xl-petal-fall';
        const isRise = animName === 'xl-bubble-rise';
        return (
          <View
            key={p.id}
            style={[
              styles.particle,
              {
                left: `${p.leftPct}%`,
                top: isFall ? -36 : isRise ? 0 : `${p.topPct}%`,
                opacity: theme.price > 0 ? 0.88 : 0.72,
              } as object,
              web({
                animation: `${animName} ${p.dur}s linear ${p.delay}s infinite`,
                willChange: 'transform, opacity',
              }),
            ]}
          >
            <EmojiIcon emoji={p.glyph} size={p.size} />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    pointerEvents: 'none',
  },
});
