/**
 * Hệ thống Trang Trí Phú Hào "Ố Dề / Lầy Lội / Hologram" mua bằng Ruby (8 ô) & Cấp bậc VIP 1..6:
 * - 26 Khung Avatar (từ cơ bản tới Lăng Kính Hologram SSR & Vô Cực Đế 3 vòng xoay)
 * - 20 Hiệu Ứng Tên (chữ nhảy Rạp Xiếc, Phóng Xạ, Ma Trận, Đèn Quẩy, Hologram, Chân Ngôn Đế Vương)
 * - 16 Hào Quang (tỏa sáng liên tục cho bậc cao & bùng nổ khi tới lượt)
 * - 14 Thú Cưng nhún nhảy, 16 Danh Hiệu & 12 Bong Bóng Chat cá tính.
 */
import { memo, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { shopItem, vipByTier } from '../../../shared/src/shop';
import { EmojiIcon } from './Icons';

type FrameDef = {
  base: string;
  image?: string;
  glow?: string;
  badge?: string;
  pulse?: boolean;
  spin?: boolean;
  disco?: boolean;
  dualRing?: boolean;
  tripleOmega?: boolean;
  swords?: boolean;
  orbitIcons?: [string, string, string, string];
};

const FRAMES: Record<string, FrameDef> = {
  frame_gold: { base: '#EAB308', image: 'linear-gradient(135deg, #FEF9C3, #EAB308 42%, #B45309 72%, #FEF08A)', glow: '0 0 12px 2px rgba(234,179,8,0.88)', badge: '✨' },
  frame_fire: { base: '#FF5722', image: 'conic-gradient(#FF1744, #FF9100, #FFEA00, #FF3D00, #FF1744)', glow: '0 0 15px 4px rgba(255,87,34,0.9)', spin: true, badge: '🔥' },
  frame_sakura: { base: '#F472B6', image: 'conic-gradient(#FBCFE8, #EC4899, #F472B6, #FDF2F8, #EC4899, #FBCFE8)', glow: '0 0 14px 3px rgba(244,114,182,0.85)', spin: true, badge: '🌸' },
  frame_rainbow: { base: '#A855F7', image: 'conic-gradient(#ff0055, #ff8800, #ffee00, #00e676, #00e5ff, #651fff, #ff00e5, #ff0055)', glow: '0 0 16px 4px rgba(232,121,249,0.85)', spin: true, badge: '🌈' },
  frame_clown_circus: { base: '#EF4444', image: 'repeating-conic-gradient(#EF4444 0% 12.5%, #FACC15 12.5% 25%, #3B82F6 25% 37.5%, #22C55E 37.5% 50%)', glow: '0 0 16px 4px rgba(250,204,21,0.92)', spin: true, badge: '🤡' },
  frame_neon: { base: '#00F0FF', image: 'linear-gradient(135deg, #00F0FF, #FF00E5, #00F0FF)', glow: '0 0 14px 4px #00F0FF, 0 0 28px 8px rgba(255,0,229,0.82)', pulse: true, badge: '💠' },
  frame_thunder: { base: '#38BDF8', image: 'conic-gradient(#0EA5E9, #FFFFFF, #7C3AED, #38BDF8, #FDE047, #0EA5E9)', glow: '0 0 16px 4px rgba(56,189,248,0.92)', spin: true, badge: '⚡' },
  frame_toxic_slime: { base: '#84CC16', image: 'conic-gradient(#4D7C0F, #A3E635, #ECFCCB, #22C55E, #A3E635, #4D7C0F)', glow: '0 0 18px 5px rgba(163,230,53,0.95)', spin: true, badge: '🧪' },
  frame_dragon: { base: '#10B981', image: 'conic-gradient(#047857, #FACC15, #DC2626, #FDE047, #047857)', glow: '0 0 15px 4px rgba(250,204,21,0.9)', spin: true, badge: '🐉' },
  frame_ice_crown: { base: '#7DD3FC', image: 'conic-gradient(#FFFFFF, #38BDF8, #E0F2FE, #0284C7, #FFFFFF)', glow: '0 0 16px 4px rgba(125,211,252,0.92)', pulse: true, badge: '❄️' },
  frame_disco_strobe: { base: '#EC4899', image: 'conic-gradient(#FF0080, #00F0FF, #FFEA00, #AA00FF, #00FF88, #FF0080)', glow: '0 0 20px 6px rgba(236,72,153,0.92)', spin: true, disco: true, badge: '🪩' },
  frame_cyber: { base: '#08F7FE', image: 'conic-gradient(#08F7FE, #FE53BB, #09FBD3, #7122FA, #08F7FE)', glow: '0 0 18px 5px rgba(8,247,254,0.9)', spin: true, dualRing: true, badge: '🤖' },
  frame_matrix_glitch: { base: '#10B981', image: 'repeating-conic-gradient(#059669 0% 10%, #34D399 10% 20%, #022C22 20% 30%)', glow: '0 0 18px 5px rgba(16,185,129,0.95)', spin: true, badge: '👾' },
  frame_phoenix: { base: '#FF5722', image: 'conic-gradient(#FF2A00, #FFB300, #FFF176, #FF6D00, #D50000, #FF2A00)', glow: '0 0 20px 6px rgba(255,87,34,0.95)', spin: true, badge: '🦅' },
  frame_holo_prism: { base: '#E879F9', image: 'conic-gradient(#ff0080, #ff8c00, #ffee00, #00ff88, #00e5ff, #7b2cbf, #ff0080)', glow: '0 0 22px 6px rgba(255,255,255,0.9), 0 0 36px 10px rgba(56,189,248,0.8)', spin: true, dualRing: true, badge: '💿' },
  frame_gold_bars: { base: '#FACC15', image: 'conic-gradient(#78350F, #FEF08A, #F59E0B, #FFFFFF, #EAB308, #78350F)', glow: '0 0 20px 6px rgba(250,204,21,0.96)', spin: true, orbitIcons: ['🪙', '💰', '🪙', '💰'], badge: '👑' },
  frame_galaxy: { base: '#9333EA', image: 'conic-gradient(#4C1D95, #E879F9, #38BDF8, #6366F1, #C084FC, #4C1D95)', glow: '0 0 20px 6px rgba(217,70,239,0.92)', spin: true, badge: '🌌' },
  frame_lava_hellfire: { base: '#DC2626', image: 'conic-gradient(#450A0A, #FF3B00, #FACC15, #EF4444, #7F1D1D, #450A0A)', glow: '0 0 22px 7px rgba(239,68,68,0.95)', spin: true, dualRing: true, badge: '🌋' },
  frame_diamond_grillz: { base: '#E0F2FE', image: 'conic-gradient(#FFFFFF, #38BDF8, #F0F9FF, #818CF8, #FFFFFF, #7DD3FC, #FFFFFF)', glow: '0 0 22px 7px rgba(186,230,253,0.98)', spin: true, orbitIcons: ['💎', '✨', '💎', '✨'], badge: '💎' },
  frame_jade_emperor: { base: '#10B981', image: 'conic-gradient(#FDE047, #059669, #FEF08A, #047857, #FDE047)', glow: '0 0 20px 6px rgba(250,204,21,0.95)', spin: true, dualRing: true, badge: '👑' },
  frame_angel_demon: { base: '#EC4899', image: 'linear-gradient(90deg, #FDE047 0%, #38BDF8 48%, #DC2626 52%, #7F1D1D 100%)', glow: '0 0 22px 6px rgba(244,63,94,0.9), 0 0 32px 8px rgba(250,204,21,0.75)', spin: true, orbitIcons: ['🪽', '🔥', '✨', '😈'], badge: '🎭' },
  frame_celestial_sword: { base: '#38BDF8', image: 'conic-gradient(#FDE047, #38BDF8, #FFFFFF, #F59E0B, #38BDF8, #FDE047)', glow: '0 0 22px 6px rgba(56,189,248,0.95)', spin: true, swords: true },
  frame_lotus_buddha: { base: '#F472B6', image: 'conic-gradient(#FEF08A, #F472B6, #FDE047, #FB7185, #FEF08A)', glow: '0 0 24px 8px rgba(253,224,71,0.95), 0 0 38px 12px rgba(244,114,182,0.75)', spin: true, dualRing: true, orbitIcons: ['🪷', '✨', '🪷', '✨'], badge: '🪷' },
  frame_super_saiyan: { base: '#FACC15', image: 'conic-gradient(#FEF08A, #38BDF8, #FACC15, #FFFFFF, #F59E0B, #FEF08A)', glow: '0 0 26px 8px rgba(250,204,21,0.98), 0 0 44px 14px rgba(56,189,248,0.82)', spin: true, dualRing: true, orbitIcons: ['⚡', '🔥', '⚡', '🔥'], badge: '⚡' },
  frame_supreme_god: { base: '#D946EF', image: 'conic-gradient(#FFD700, #FF00E5, #00F0FF, #FFE066, #A855F7, #FFD700)', glow: '0 0 24px 7px rgba(255,215,0,0.95), 0 0 40px 10px rgba(217,70,239,0.75)', spin: true, dualRing: true, badge: '⚜️' },
  frame_emperor_omega: {
    base: '#FFD700',
    image: 'conic-gradient(#FF0080, #FFD700, #00FF88, #00F0FF, #A855F7, #FFD700, #FF0080)',
    glow: '0 0 28px 9px rgba(255,215,0,0.98), 0 0 50px 16px rgba(236,72,153,0.88), 0 0 70px 22px rgba(56,189,248,0.65)',
    spin: true,
    dualRing: true,
    tripleOmega: true,
    orbitIcons: ['👑', '💎', '🔱', '💎'],
    badge: '🔱',
  },
};

export const frameOf = (id: string | undefined) => (id ? FRAMES[id] : undefined);

const web = (o: Record<string, unknown>) => (Platform.OS === 'web' ? (o as object) : {});

function Pulse({ children, style, from = 0.45 }: { children?: ReactNode; style: StyleProp<object>; from?: number }) {
  const t = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: from, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t, from]);
  if (Platform.OS === 'web') {
    return <View pointerEvents="none" style={[style, web({ animation: 'xl-pulse 1.4s ease-in-out infinite', willChange: 'transform, opacity' })]}>{children}</View>;
  }
  return <Animated.View pointerEvents="none" style={[style, { opacity: t }]}>{children}</Animated.View>;
}

function FrameBg({ f, outer }: { f: FrameDef; outer: number }) {
  const anim = f.disco
    ? 'xl-spin 2.4s linear infinite, xl-disco-hue 1.6s linear infinite'
    : f.spin
      ? `xl-spin ${f.tripleOmega ? 2.6 : f.dualRing ? 3.6 : 5.2}s linear infinite`
      : undefined;
  const style = [
    StyleSheet.absoluteFill,
    { borderRadius: outer / 2, backgroundColor: f.base },
    web({
      ...(f.image ? { backgroundImage: f.image } : {}),
      ...(f.glow ? { boxShadow: f.glow } : {}),
      ...(anim ? { animation: anim, willChange: 'transform' } : {}),
    }),
  ];
  if (f.pulse) return <Pulse style={style} from={0.5} />;
  return <View pointerEvents="none" style={style} />;
}

const ALWAYS_ON_AURAS = new Set([
  'aura_holy_wings',
  'aura_cosmic_orbit',
  'aura_dark_wolf',
  'aura_rainbow_halo',
  'aura_lava_eruption',
  'aura_diamond_storm',
  'aura_omega_divine',
  'aura_disco_ball',
  'aura_clown_honk',
]);

/** Hào quang quanh avatar: các bậc Đại Gia tỏa sáng liên tục kể cả lúc chờ, bùng nổ gấp đôi khi tới lượt! */
function AuraGlow({ kind, outer, active }: { kind: string; outer: number; active?: boolean }) {
  const alwaysOn = ALWAYS_ON_AURAS.has(kind);
  if (!active && !alwaysOn) return null;

  const glowMap: Record<string, string> = {
    aura_glow: '0 0 18px 8px rgba(120,200,255,0.92), 0 0 36px 14px rgba(255,255,255,0.55)',
    aura_fire: '0 0 18px 8px rgba(255,98,0,0.92), 0 0 36px 14px rgba(255,200,0,0.6)',
    aura_sakura: '0 0 18px 8px rgba(255,133,179,0.9), 0 0 32px 12px rgba(255,214,235,0.58)',
    aura_clown_honk: '0 0 20px 8px rgba(250,204,21,0.92), 0 0 36px 14px rgba(239,68,68,0.68)',
    aura_lightning: '0 0 20px 8px rgba(56,189,248,0.95), 0 0 38px 14px rgba(139,92,246,0.7)',
    aura_butterfly: '0 0 18px 7px rgba(232,121,249,0.9), 0 0 32px 12px rgba(167,243,208,0.58)',
    aura_disco_ball: '0 0 22px 9px rgba(236,72,153,0.95), 0 0 42px 16px rgba(34,211,238,0.75)',
    aura_gold_coins: '0 0 20px 9px rgba(250,204,21,0.95), 0 0 38px 14px rgba(245,158,11,0.65)',
    aura_dark_wolf: '0 0 20px 9px rgba(168,85,247,0.92), 0 0 38px 14px rgba(15,23,42,0.82)',
    aura_matrix_ring: '0 0 20px 8px rgba(16,185,129,0.95), 0 0 38px 14px rgba(52,211,153,0.68)',
    aura_rainbow_halo: '0 0 24px 10px rgba(255,0,128,0.9), 0 0 44px 18px rgba(0,229,255,0.75), 0 0 60px 22px rgba(255,238,0,0.55)',
    aura_holy_wings: '0 0 22px 9px rgba(255,243,191,0.96), 0 0 42px 16px rgba(56,189,248,0.72)',
    aura_lava_eruption: '0 0 24px 10px rgba(239,68,68,0.96), 0 0 46px 18px rgba(250,204,21,0.72)',
    aura_diamond_storm: '0 0 24px 10px rgba(186,230,253,0.98), 0 0 46px 18px rgba(129,140,248,0.75)',
    aura_cosmic_orbit: '0 0 24px 10px rgba(217,70,239,0.96), 0 0 46px 18px rgba(56,189,248,0.72)',
    aura_omega_divine: '0 0 30px 12px rgba(255,215,0,0.98), 0 0 56px 22px rgba(236,72,153,0.88), 0 0 78px 28px rgba(0,240,255,0.68)',
  };

  const badgePairs: Record<string, [string, string]> = {
    aura_fire: ['🔥', '🔥'],
    aura_sakura: ['🌸', '🌸'],
    aura_clown_honk: ['🎈', '🤡'],
    aura_lightning: ['⚡', '⚡'],
    aura_butterfly: ['🦋', '✨'],
    aura_disco_ball: ['🪩', '🎶'],
    aura_gold_coins: ['🪙', '💰'],
    aura_dark_wolf: ['🌙', '🐺'],
    aura_matrix_ring: ['👾', '💻'],
    aura_rainbow_halo: ['🌈', '🦄'],
    aura_holy_wings: ['🪽', '🪽'],
    aura_lava_eruption: ['🌋', '🔥'],
    aura_diamond_storm: ['💎', '✨'],
    aura_cosmic_orbit: ['🪐', '⭐'],
    aura_omega_divine: ['🔱', '👑'],
  };
  const pair = badgePairs[kind];
  const sz = Math.max(14, Math.round(outer * 0.3));

  return (
    <>
      <Pulse
        from={active ? 0.45 : 0.62}
        style={[
          { position: 'absolute', left: 0, top: 0, width: outer, height: outer, borderRadius: outer / 2 },
          web({
            boxShadow: glowMap[kind] ?? glowMap.aura_glow,
            ...(kind === 'aura_rainbow_halo' || kind === 'aura_disco_ball' || kind === 'aura_omega_divine'
              ? { animation: 'xl-pulse 1.3s ease-in-out infinite, xl-disco-hue 2.4s linear infinite' }
              : {}),
          }),
        ]}
      />
      {pair && (active || alwaysOn) && (
        <>
          <View pointerEvents="none" style={[{ position: 'absolute', top: kind === 'aura_holy_wings' ? outer * 0.2 : -11, left: kind === 'aura_holy_wings' ? -14 : outer * 0.04 }, web({ animation: 'xl-wing-flap 1.1s ease-in-out infinite' })]}>
            <EmojiIcon emoji={pair[0]} size={sz} />
          </View>
          <View pointerEvents="none" style={[{ position: 'absolute', top: kind === 'aura_holy_wings' ? outer * 0.2 : -11, right: kind === 'aura_holy_wings' ? -14 : outer * 0.04 }, web({ animation: 'xl-wing-flap 1.1s ease-in-out infinite' })]}>
            <EmojiIcon emoji={pair[1]} size={sz} />
          </View>
        </>
      )}
    </>
  );
}

/** Thú cưng nhỏ nhún nhảy cạnh avatar */
export const PetBadge = memo(function PetBadge({ pet, size }: { pet?: string; size: number }) {
  if (!pet) return null;
  const it = shopItem(pet);
  if (!it) return null;
  const sz = Math.max(17, Math.round(size * 0.36));
  return (
    <View
      testID={`pet-${pet}`}
      pointerEvents="none"
      style={[
        { position: 'absolute', bottom: -5, left: -9, zIndex: 12 },
        web({ animation: 'xl-float 2s ease-in-out infinite', willChange: 'transform', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.55))' }),
      ]}
    >
      <EmojiIcon emoji={it.emoji} size={sz} glow="rgba(250,204,21,0.55)" />
    </View>
  );
});

/** Danh hiệu nổi bật đặt gọn giữa avatar và tên */
export const TitleBadge = memo(function TitleBadge({ title }: { title?: string }) {
  if (!title) return null;
  const it = shopItem(title);
  if (!it) return null;
  const palette: Record<string, { bg: string; fg: string; bd: string; holo?: boolean }> = {
    title_trum_xom: { bg: '#991B1B', fg: '#FEF08A', bd: '#FACC15' },
    title_chua_he: { bg: '#7C2D12', fg: '#FDE047', bd: '#FB923C' },
    title_than_bai: { bg: '#064E3B', fg: '#6EE7B7', bd: '#10B981' },
    title_vua_noi_tu: { bg: '#1E3A8A', fg: '#DBEAFE', bd: '#60A5FA' },
    title_tham_tu: { bg: '#312E81', fg: '#E0E7FF', bd: '#818CF8' },
    title_senior_bug: { bg: '#022C22', fg: '#6EE7B7', bd: '#34D399' },
    title_soi_alpha: { bg: '#1F2937', fg: '#FCA5A5', bd: '#EF4444' },
    title_vua_bip: { bg: '#3B0764', fg: '#F5D0FE', bd: '#C084FC' },
    title_o_de: { bg: '#831843', fg: '#FCE7F3', bd: '#F472B6', holo: true },
    title_thanh_lat_keo: { bg: '#0C4A6E', fg: '#BAE6FD', bd: '#38BDF8' },
    title_bo_doi: { bg: '#422006', fg: '#FEF08A', bd: '#FACC15' },
    title_phu_hao: { bg: '#78350F', fg: '#FEF08A', bd: '#FACC15', holo: true },
    title_trum_mafia: { bg: '#09090B', fg: '#FDE047', bd: '#EAB308' },
    title_dai_gia_ngam: { bg: '#0F172A', fg: '#E0F2FE', bd: '#38BDF8', holo: true },
    title_chi_ton: { bg: '#4A044E', fg: '#F5D0FE', bd: '#E879F9', holo: true },
    title_thien_de: { bg: '#3B0764', fg: '#FFFBEB', bd: '#FFD700', holo: true },
  };
  const col = palette[title] ?? { bg: '#1C2024', fg: '#FFC21A', bd: '#FFC21A' };
  const isSupreme = title === 'title_thien_de';
  return (
    <View
      testID={`title-${title}`}
      style={[
        styles.titlePill,
        { backgroundColor: col.bg, borderColor: col.bd },
        isSupreme
          ? web({
              backgroundImage: 'linear-gradient(90deg, #991B1B, #7E22CE, #0369A1, #B45309, #991B1B)',
              backgroundSize: '200% auto',
              animation: 'xl-shimmer 2.4s linear infinite',
              boxShadow: '0 0 12px rgba(250,204,21,0.85)',
            })
          : col.holo
            ? web({ boxShadow: `0 0 8px ${col.bd}` })
            : null,
      ]}
    >
      <EmojiIcon emoji={it.emoji} size={10} />
      <Text numberOfLines={1} style={[styles.titleText, { color: col.fg }]}>
        {it.name}
      </Text>
    </View>
  );
});

/** Huy hiệu cấp bậc VIP rực sáng */
export const VipBadge = memo(function VipBadge({ tier, compact = false }: { tier?: number; compact?: boolean }) {
  if (!tier || tier <= 0) return null;
  const info = vipByTier(tier);
  return (
    <View
      testID={`vip-badge-${tier}`}
      style={[
        styles.vipPill,
        { borderColor: info.color },
        web(
          tier >= 5
            ? {
                backgroundImage: 'linear-gradient(135deg, #2E1065, #701A75, #451A03)',
                boxShadow: `0 0 12px ${info.glow}`,
              }
            : info.glow
              ? { boxShadow: `0 0 8px ${info.glow}` }
              : {},
        ),
      ]}
    >
      <EmojiIcon emoji={info.badge} size={11} />
      <Text style={styles.vipText}>{compact ? `V${tier}` : `VIP ${tier} · ${info.name}`}</Text>
    </View>
  );
});

/** Style bong bóng chat theo 12 trang bị Phú Hào */
export function chatBubbleStyleOf(id?: string): StyleProp<ViewStyle> {
  switch (id) {
    case 'bubble_sakura':
      return [{ backgroundColor: '#FFF0F6', borderColor: '#FF85B3', borderWidth: 1.6 }, web({ boxShadow: '0 2px 12px rgba(255,133,179,0.5)' })];
    case 'bubble_neon':
      return [{ backgroundColor: '#1E103C', borderColor: '#D946EF', borderWidth: 1.6 }, web({ boxShadow: '0 0 14px rgba(217,70,239,0.68)' })];
    case 'bubble_clown_circus':
      return [{ backgroundColor: '#FEF9C3', borderColor: '#EF4444', borderWidth: 2 }, web({ backgroundImage: 'linear-gradient(135deg, #FEF9C3, #FCE7F3)', boxShadow: '0 0 12px rgba(250,204,21,0.65)' })];
    case 'bubble_cyber':
      return [{ backgroundColor: '#0A192F', borderColor: '#08F7FE', borderWidth: 1.6 }, web({ boxShadow: '0 0 14px rgba(8,247,254,0.65)' })];
    case 'bubble_comic_boom':
      return [{ backgroundColor: '#FFEDD5', borderColor: '#EA580C', borderWidth: 2.2 }, web({ boxShadow: '3px 3px 0 #9A3412, 0 0 12px rgba(249,115,22,0.55)' })];
    case 'bubble_matrix_code':
      return [{ backgroundColor: '#022C22', borderColor: '#10B981', borderWidth: 1.6 }, web({ boxShadow: '0 0 14px rgba(16,185,129,0.68)' })];
    case 'bubble_gold_vip':
      return [{ backgroundColor: '#1F1300', borderColor: '#FACC15', borderWidth: 1.8 }, web({ backgroundImage: 'linear-gradient(135deg, #2B1A00, #452800)', boxShadow: '0 0 14px rgba(250,204,21,0.65)' })];
    case 'bubble_holo_prism':
      return [
        { backgroundColor: '#1E1B4B', borderColor: '#E879F9', borderWidth: 1.8 },
        web({
          backgroundImage: 'linear-gradient(125deg, #311042, #0F2942, #2E1065)',
          boxShadow: '0 0 16px rgba(232,121,249,0.75), 0 0 24px rgba(56,189,248,0.45)',
        }),
      ];
    case 'bubble_dragon_scroll':
      return [{ backgroundColor: '#4A080D', borderColor: '#FFD43B', borderWidth: 1.8 }, web({ backgroundImage: 'linear-gradient(135deg, #5E0B12, #2A0508)', boxShadow: '0 0 15px rgba(255,169,77,0.68)' })];
    case 'bubble_diamond_royal':
      return [{ backgroundColor: '#082F49', borderColor: '#7DD3FC', borderWidth: 1.8 }, web({ backgroundImage: 'linear-gradient(135deg, #0C4A6E, #1E1B4B)', boxShadow: '0 0 16px rgba(125,211,252,0.78)' })];
    case 'bubble_galaxy':
      return [{ backgroundColor: '#170B3B', borderColor: '#E879F9', borderWidth: 1.8 }, web({ backgroundImage: 'linear-gradient(135deg, #1E0D4D, #0F172A)', boxShadow: '0 0 18px rgba(232,121,249,0.75)' })];
    case 'bubble_emperor_jade':
      return [
        { backgroundColor: '#2E1065', borderColor: '#FFD700', borderWidth: 2 },
        web({
          backgroundImage: 'linear-gradient(135deg, #451A03, #4C1D95, #064E3B)',
          boxShadow: '0 0 20px rgba(255,215,0,0.85), 0 0 30px rgba(217,70,239,0.55)',
        }),
      ];
    default:
      return undefined;
  }
}

export function chatBubbleTextColorOf(id?: string): string | undefined {
  switch (id) {
    case 'bubble_neon':
    case 'bubble_holo_prism':
      return '#F5D0FE';
    case 'bubble_clown_circus':
      return '#991B1B';
    case 'bubble_comic_boom':
      return '#7C2D12';
    case 'bubble_cyber':
    case 'bubble_diamond_royal':
      return '#E0F2FE';
    case 'bubble_matrix_code':
      return '#6EE7B7';
    case 'bubble_gold_vip':
    case 'bubble_dragon_scroll':
    case 'bubble_emperor_jade':
      return '#FEF08A';
    case 'bubble_galaxy':
      return '#F3E8FF';
    default:
      return undefined;
  }
}

/** Vẽ khung đa tầng + vệ tinh xoay + hào quang + thú cưng quanh avatar */
export function FrameWrap({ size, frame, aura, pet, active, children }: {
  size: number; frame?: string; aura?: string; pet?: string; active?: boolean; children: ReactNode;
}) {
  const f = frameOf(frame);
  const hasAura = !!aura;
  if (!f && !hasAura && !pet) return <>{children}</>;
  const pad = f ? Math.max(4, Math.round(size * (f.tripleOmega ? 0.14 : 0.115))) : 0;
  const outer = size + pad * 2;
  const orbitIcons = f?.orbitIcons ?? (f?.swords ? ['⚔️', '🗡️', '🗡️', '⚔️'] : undefined);

  return (
    <View testID={frame ? `frame-${frame}` : undefined} style={{ width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center' }}>
      {hasAura && <AuraGlow kind={aura!} outer={outer} active={active} />}
      {f?.tripleOmega && (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: outer + 16,
              height: outer + 16,
              borderRadius: (outer + 16) / 2,
              borderWidth: 2,
              borderStyle: 'dotted',
              borderColor: '#00F0FF',
            },
            web({ animation: 'xl-omega-ring 3.2s ease-in-out infinite', boxShadow: '0 0 18px rgba(0,240,255,0.75)' }),
          ]}
        />
      )}
      {f?.dualRing && (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: outer + 8,
              height: outer + 8,
              borderRadius: (outer + 8) / 2,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: '#FFD700',
            },
            web({ animation: 'xl-spin-rev 4.6s linear infinite', willChange: 'transform' }),
          ]}
        />
      )}
      {f && <FrameBg f={f} outer={outer} />}
      {orbitIcons && (
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: outer + 12, height: outer + 12, alignItems: 'center', justifyContent: 'center' },
            web({ animation: 'xl-spin 3.8s linear infinite', willChange: 'transform' }),
          ]}
        >
          <View style={{ position: 'absolute', top: -8 }}><EmojiIcon emoji={orbitIcons[0]} size={13} /></View>
          <View style={{ position: 'absolute', bottom: -8 }}><EmojiIcon emoji={orbitIcons[1]} size={13} /></View>
          <View style={{ position: 'absolute', left: -8 }}><EmojiIcon emoji={orbitIcons[2]} size={13} /></View>
          <View style={{ position: 'absolute', right: -8 }}><EmojiIcon emoji={orbitIcons[3]} size={13} /></View>
        </View>
      )}
      {children}
      {f?.badge && (
        <View pointerEvents="none" style={{ position: 'absolute', top: -Math.round(size * 0.22), right: -Math.round(size * 0.12), zIndex: 10 }}>
          <EmojiIcon emoji={f.badge} size={Math.max(14, Math.round(size * 0.35))} glow="rgba(255,215,0,0.75)" />
        </View>
      )}
      <PetBadge pet={pet} size={size} />
    </View>
  );
}

const GRAD_TEXT: Record<string, { fallback: string; bg: string; glow?: string; wiggle?: boolean; disco?: boolean }> = {
  name_rainbow: {
    fallback: '#FF5F6D',
    bg: 'linear-gradient(90deg, #ff0055, #ff9900, #ffee00, #00e676, #00e5ff, #a855f7, #ff0055)',
    glow: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92))',
  },
  name_gold_liquid: {
    fallback: '#FACC15',
    bg: 'linear-gradient(90deg, #B45309, #FEF08A, #F59E0B, #FFFFFF, #EAB308, #B45309)',
    glow: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92)) drop-shadow(0 0 8px rgba(250,204,21,0.55))',
  },
  name_fire_blaze: {
    fallback: '#FF5722',
    bg: 'linear-gradient(90deg, #FF1744, #FF9100, #FFEA00, #FF3D00)',
    glow: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92)) drop-shadow(0 0 8px rgba(255,87,34,0.65))',
  },
  name_clown_circus: {
    fallback: '#FB923C',
    bg: 'linear-gradient(90deg, #EF4444, #FACC15, #22C55E, #3B82F6, #EC4899, #EF4444)',
    glow: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92))',
    wiggle: true,
  },
  name_ice_crystal: {
    fallback: '#38BDF8',
    bg: 'linear-gradient(90deg, #38BDF8, #FFFFFF, #7DD3FC, #0EA5E9)',
    glow: 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92)) drop-shadow(0 0 8px rgba(56,189,248,0.65))',
  },
  name_toxic_neon: {
    fallback: '#A3E635',
    bg: 'linear-gradient(90deg, #65A30D, #BEF264, #22C55E, #ECFCCB, #84CC16)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 10px rgba(163,230,53,0.8))',
  },
  name_blood_moon: {
    fallback: '#F87171',
    bg: 'linear-gradient(90deg, #DC2626, #FECACA, #EF4444, #FCA5A5, #DC2626)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 8px rgba(239,68,68,0.7))',
  },
  name_pink_diva: {
    fallback: '#F472B6',
    bg: 'linear-gradient(90deg, #EC4899, #FDF2F8, #F472B6, #E879F9, #EC4899)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.92)) drop-shadow(0 0 10px rgba(244,114,182,0.85))',
    wiggle: true,
  },
  name_matrix_hacker: {
    fallback: '#34D399',
    bg: 'linear-gradient(90deg, #059669, #6EE7B7, #10B981, #D1FAE5, #059669)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 10px rgba(16,185,129,0.8))',
  },
  name_galaxy_shimmer: {
    fallback: '#E879F9',
    bg: 'linear-gradient(90deg, #38BDF8, #E879F9, #FDE047, #818CF8, #38BDF8)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.92)) drop-shadow(0 0 9px rgba(232,121,249,0.7))',
  },
  name_disco_fever: {
    fallback: '#F472B6',
    bg: 'linear-gradient(90deg, #FF0080, #00F0FF, #FFEA00, #00FF88, #FF0080)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.92)) drop-shadow(0 0 12px rgba(255,0,128,0.8))',
    disco: true,
  },
  name_lava_core: {
    fallback: '#FB923C',
    bg: 'linear-gradient(90deg, #DC2626, #FEF08A, #F97316, #FFFFFF, #EF4444)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 10px rgba(249,115,22,0.85))',
  },
  name_holo_prism: {
    fallback: '#E0F2FE',
    bg: 'linear-gradient(110deg, #ff0080, #ff8c00, #ffee00, #00ff88, #00e5ff, #c084fc, #ff0080)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.94)) drop-shadow(0 0 12px rgba(56,189,248,0.85))',
  },
  name_diamond_glitter: {
    fallback: '#E0F2FE',
    bg: 'linear-gradient(90deg, #7DD3FC, #FFFFFF, #C4B5FD, #FFFFFF, #38BDF8)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 12px rgba(186,230,253,0.9))',
  },
  name_thunder_king: {
    fallback: '#FDE047',
    bg: 'linear-gradient(90deg, #38BDF8, #FEF08A, #A855F7, #FFFFFF, #FACC15)',
    glow: 'drop-shadow(0 1px 2px rgba(15,23,42,0.95)) drop-shadow(0 0 14px rgba(56,189,248,0.9))',
  },
};

/** Tên người chơi với 20 mẫu hiệu ứng rực rỡ */
export function NameText({ fx, style, children, ...rest }: { fx?: string; style?: StyleProp<TextStyle>; children: ReactNode; testID?: string; numberOfLines?: number }) {
  const flat = StyleSheet.flatten(style) ?? {};

  if (fx === 'name_omega_emperor') {
    return (
      <View style={styles.sparkRow}>
        <EmojiIcon emoji="👑" size={12} glow="rgba(255,215,0,0.85)" />
        <Text
          {...rest}
          style={[
            style,
            { color: '#FEF08A', fontWeight: '900' },
            web({
              backgroundImage: 'linear-gradient(90deg, #FFD700, #FF0080, #00F0FF, #FFFBEB, #FFD700)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'xl-shimmer 1.8s linear infinite',
              filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.96)) drop-shadow(0 0 12px rgba(255,215,0,0.85))',
            }),
          ]}
        >
          {children}
        </Text>
        <EmojiIcon emoji="🔱" size={12} glow="rgba(232,121,249,0.85)" />
      </View>
    );
  }

  const grad = fx ? GRAD_TEXT[fx] : undefined;
  if (grad) {
    const anim = grad.disco
      ? 'xl-shimmer 1.6s linear infinite, xl-disco-hue 1.8s linear infinite'
      : grad.wiggle
        ? 'xl-shimmer 2.2s linear infinite, xl-wiggle-clown 1.4s ease-in-out infinite'
        : 'xl-shimmer 2.4s linear infinite';
    return (
      <Text
        {...rest}
        style={[
          style,
          { color: grad.fallback, fontWeight: '900' },
          web({
            backgroundImage: grad.bg,
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: anim,
            filter: grad.glow ?? 'drop-shadow(0 1px 1.5px rgba(15,23,42,0.92))',
          }),
        ]}
      >
        {children}
      </Text>
    );
  }
  if (fx === 'name_divine_glitch') {
    return (
      <Text
        {...rest}
        style={[
          style,
          { color: '#F0ABFC', fontWeight: '900', textShadowColor: 'rgba(15,23,42,0.92)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
          web({ animation: 'xl-glitch 2.4s infinite' }),
        ]}
      >
        {children}
      </Text>
    );
  }
  if (fx === 'name_neon_pulse') {
    return (
      <Text
        {...rest}
        style={[
          style,
          { color: '#22D3EE', fontWeight: '900', textShadowColor: 'rgba(15,23,42,0.88)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
          web({ animation: 'xl-pulse 1.5s ease-in-out infinite', filter: 'drop-shadow(0 0 8px rgba(34,211,238,0.75))' }),
        ]}
      >
        {children}
      </Text>
    );
  }
  if (fx === 'name_royal_3d') {
    return (
      <Text
        {...rest}
        style={[
          style,
          { color: '#FACC15', fontWeight: '900', textShadowColor: '#1C0F00', textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 1 },
          web({ textShadow: '0 1px 0 #854D0E, 0 2px 0 #422006, 0 0 10px rgba(250,204,21,0.65), 0 4px 8px rgba(0,0,0,0.65)' }),
        ]}
      >
        {children}
      </Text>
    );
  }
  if (fx === 'name_sparkle') return <SparkleText {...rest} style={flat}>{children}</SparkleText>;
  return <Text {...rest} style={style}>{children}</Text>;
}

function SparkleText({ style, children, ...rest }: { style?: StyleProp<TextStyle>; children: ReactNode; testID?: string; numberOfLines?: number }) {
  const t = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 0.55, duration: 500, useNativeDriver: false }),
        Animated.timing(t, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t]);
  if (Platform.OS === 'web') {
    return (
      <View style={styles.sparkRow}>
        <EmojiIcon emoji="✨" size={11} />
        <Text
          {...rest}
          style={[style, { textShadowColor: '#FFD84D', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }, web({ animation: 'xl-pulse 1.3s ease-in-out infinite' })]}
        >
          {children}
        </Text>
        <EmojiIcon emoji="✨" size={11} />
      </View>
    );
  }
  return (
    <View style={styles.sparkRow}>
      <EmojiIcon emoji="✨" size={11} />
      <Animated.Text {...rest} style={[style, { opacity: t, textShadowColor: '#FFD84D', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }]}>
        {children}
      </Animated.Text>
      <EmojiIcon emoji="✨" size={11} />
    </View>
  );
}

const styles = StyleSheet.create({
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1.5,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    maxWidth: '100%',
  },
  titleText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.25,
  },
  vipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#181024',
    borderWidth: 1.5,
    borderRadius: 99,
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    alignSelf: 'flex-start',
  },
  vipText: {
    color: '#FFFBEB',
    fontSize: 10,
    fontWeight: '900',
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
