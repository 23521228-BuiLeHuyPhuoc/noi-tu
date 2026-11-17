/**
 * Trang trí avatar mua bằng Ruby (8 ô) & Cấp bậc VIP Đại Gia:
 * khung quanh vòng tròn, hiệu ứng chữ cho tên, hào quang tới lượt, thú cưng bay trên vai,
 * danh hiệu dưới tên và kiểu bong bóng chat. Trên Web dùng CSS GPU keyframes 60fps.
 */
import { memo, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { shopItem, vipByTier } from '../../../shared/src/shop';

type FrameDef = {
  base: string;
  image?: string;
  glow?: string;
  badge?: string;
  pulse?: boolean;
  spin?: boolean;
  dualRing?: boolean;
  swords?: boolean;
};

const FRAMES: Record<string, FrameDef> = {
  frame_gold: { base: '#E8B923', image: 'linear-gradient(135deg, #FFF0A8, #E0A100 45%, #FFE27A)', glow: '0 0 8px 1px rgba(224,161,0,0.85)' },
  frame_fire: { base: '#FF7A00', image: 'linear-gradient(0deg, #FF3B00, #FF9E00 55%, #FFD400)', glow: '0 0 10px 2px rgba(255,92,0,0.8)', badge: '🔥' },
  frame_sakura: { base: '#FF85B3', image: 'linear-gradient(135deg, #FFD6EB, #FF5C9E 50%, #FFE4F2)', glow: '0 0 10px 2px rgba(255,110,165,0.7)', badge: '🌸' },
  frame_rainbow: { base: '#A55EEA', image: 'conic-gradient(#ff4d4d, #ffb84d, #ffee55, #5fe08a, #4dd2ff, #6a6bff, #c64dff, #ff4d4d)', spin: true },
  frame_neon: { base: '#00F0FF', glow: '0 0 10px 3px #00F0FF, 0 0 22px 6px rgba(255,0,229,0.75)', pulse: true },
  frame_thunder: { base: '#38BDF8', image: 'conic-gradient(#0EA5E9, #E0F2FE, #7C3AED, #38BDF8, #FDE047, #0EA5E9)', glow: '0 0 12px 3px rgba(56,189,248,0.85)', spin: true, badge: '⚡' },
  frame_dragon: { base: '#0F7A43', image: 'linear-gradient(135deg, #0B6B3A, #F2C94C 50%, #0B6B3A)', glow: '0 0 8px 2px rgba(242,201,76,0.85)', badge: '🐉' },
  frame_ice_crown: { base: '#A5F3FC', image: 'linear-gradient(135deg, #FFFFFF, #38BDF8 45%, #E0F2FE 70%, #0284C7)', glow: '0 0 12px 3px rgba(125,211,252,0.85)', pulse: true, badge: '❄️' },
  frame_cyber: { base: '#08F7FE', image: 'conic-gradient(#08F7FE, #FE53BB, #09FBD3, #7122FA, #08F7FE)', glow: '0 0 14px 3px rgba(8,247,254,0.8)', spin: true, badge: '💠' },
  frame_phoenix: { base: '#FF5722', image: 'conic-gradient(#FF2A00, #FFB300, #FFF176, #FF6D00, #D50000, #FF2A00)', glow: '0 0 16px 4px rgba(255,87,34,0.9)', spin: true, badge: '🦅' },
  frame_galaxy: { base: '#9333EA', image: 'conic-gradient(#4C1D95, #E879F9, #38BDF8, #6366F1, #C084FC, #4C1D95)', glow: '0 0 18px 4px rgba(217,70,239,0.85)', spin: true, badge: '🌌' },
  frame_jade_emperor: { base: '#10B981', image: 'linear-gradient(135deg, #FDE047, #059669 35%, #FEF08A 60%, #047857)', glow: '0 0 16px 4px rgba(250,204,21,0.9)', pulse: true, badge: '👑' },
  frame_celestial_sword: { base: '#38BDF8', image: 'conic-gradient(#FDE047, #38BDF8, #FFFFFF, #F59E0B, #38BDF8, #FDE047)', glow: '0 0 18px 4px rgba(56,189,248,0.9)', spin: true, swords: true },
  frame_supreme_god: { base: '#D946EF', image: 'conic-gradient(#FFD700, #FF00E5, #00F0FF, #FFE066, #A855F7, #FFD700)', glow: '0 0 22px 6px rgba(255,215,0,0.92), 0 0 36px 8px rgba(217,70,239,0.65)', spin: true, dualRing: true, badge: '⚜️' },
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
    return <View pointerEvents="none" style={[style, web({ animation: 'xl-pulse 1.5s ease-in-out infinite', willChange: 'transform, opacity' })]}>{children}</View>;
  }
  return <Animated.View pointerEvents="none" style={[style, { opacity: t }]}>{children}</Animated.View>;
}

function FrameBg({ f, outer }: { f: FrameDef; outer: number }) {
  const spinStyle = f.spin ? web({ animation: `xl-spin ${f.dualRing ? 4 : 6}s linear infinite`, willChange: 'transform' }) : {};
  const style = [
    StyleSheet.absoluteFill,
    { borderRadius: outer / 2, backgroundColor: f.base },
    web({ ...(f.image ? { backgroundImage: f.image } : {}), ...(f.glow ? { boxShadow: f.glow } : {}) }),
    spinStyle,
  ];
  if (f.pulse) return <Pulse style={style} from={0.5} />;
  return <View pointerEvents="none" style={style} />;
}

/** hào quang khi tới lượt (hoặc tỏa nhẹ liên tục cho các hào quang VIP cao cấp) */
function AuraGlow({ kind, outer, active }: { kind: string; outer: number; active?: boolean }) {
  const isHighTier = kind === 'aura_holy_wings' || kind === 'aura_cosmic_orbit' || kind === 'aura_dark_wolf';
  if (!active && !isHighTier) return null;

  const glowMap: Record<string, string> = {
    aura_glow: '0 0 16px 8px rgba(120,200,255,0.9), 0 0 34px 14px rgba(255,255,255,0.5)',
    aura_fire: '0 0 14px 7px rgba(255,98,0,0.88), 0 0 30px 12px rgba(255,200,0,0.5)',
    aura_sakura: '0 0 16px 7px rgba(255,133,179,0.85), 0 0 28px 10px rgba(255,214,235,0.5)',
    aura_lightning: '0 0 16px 7px rgba(56,189,248,0.92), 0 0 32px 12px rgba(139,92,246,0.65)',
    aura_butterfly: '0 0 14px 6px rgba(232,121,249,0.85), 0 0 28px 10px rgba(167,243,208,0.5)',
    aura_gold_coins: '0 0 16px 8px rgba(250,204,21,0.92), 0 0 32px 12px rgba(245,158,11,0.55)',
    aura_dark_wolf: active ? '0 0 18px 8px rgba(168,85,247,0.9), 0 0 34px 14px rgba(15,23,42,0.8)' : '0 0 10px 3px rgba(168,85,247,0.55)',
    aura_holy_wings: active ? '0 0 20px 8px rgba(255,243,191,0.95), 0 0 38px 14px rgba(56,189,248,0.65)' : '0 0 12px 4px rgba(255,243,191,0.65)',
    aura_cosmic_orbit: active ? '0 0 22px 9px rgba(217,70,239,0.95), 0 0 42px 16px rgba(56,189,248,0.65)' : '0 0 12px 4px rgba(217,70,239,0.55)',
  };

  const badgePairs: Record<string, [string, string]> = {
    aura_fire: ['🔥', '🔥'],
    aura_sakura: ['🌸', '🌸'],
    aura_lightning: ['⚡', '⚡'],
    aura_butterfly: ['🦋', '✨'],
    aura_gold_coins: ['🪙', '💰'],
    aura_dark_wolf: ['🌙', '🐺'],
    aura_holy_wings: ['🪽', '🪽'],
    aura_cosmic_orbit: ['🪐', '⭐'],
  };
  const pair = badgePairs[kind];
  const sz = Math.max(13, outer * 0.28);

  return (
    <>
      <Pulse
        from={active ? 0.35 : 0.65}
        style={[{ position: 'absolute', left: 0, top: 0, width: outer, height: outer, borderRadius: outer / 2 }, web({ boxShadow: glowMap[kind] ?? glowMap.aura_glow })]}
      />
      {pair && active && (
        <>
          <View pointerEvents="none" style={[{ position: 'absolute', top: kind === 'aura_holy_wings' ? outer * 0.22 : -12, left: kind === 'aura_holy_wings' ? -14 : outer * 0.08 }, web({ animation: 'xl-wing-flap 1.1s ease-in-out infinite' })]}>
            <Text style={{ fontSize: sz }}>{pair[0]}</Text>
          </View>
          <View pointerEvents="none" style={[{ position: 'absolute', top: kind === 'aura_holy_wings' ? outer * 0.22 : -12, right: kind === 'aura_holy_wings' ? -14 : outer * 0.08 }, web({ animation: 'xl-wing-flap 1.1s ease-in-out infinite' })]}>
            <Text style={{ fontSize: sz }}>{pair[1]}</Text>
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
  const fs = Math.max(15, Math.round(size * 0.34));
  return (
    <View
      testID={`pet-${pet}`}
      pointerEvents="none"
      style={[
        { position: 'absolute', bottom: -4, left: -8, zIndex: 12 },
        web({ animation: 'xl-float 2.2s ease-in-out infinite', willChange: 'transform', filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.45))' }),
      ]}
    >
      <Text style={{ fontSize: fs }}>{it.emoji}</Text>
    </View>
  );
});

/** Danh hiệu nổi bật đặt gọn giữa avatar và tên */
export const TitleBadge = memo(function TitleBadge({ title }: { title?: string }) {
  if (!title) return null;
  const it = shopItem(title);
  if (!it) return null;
  const palette: Record<string, { bg: string; fg: string; bd: string }> = {
    title_trum_xom: { bg: '#9B1C1C', fg: '#FFE8A3', bd: '#FFC21A' },
    title_than_bai: { bg: '#064E3B', fg: '#6EE7B7', bd: '#10B981' },
    title_vua_noi_tu: { bg: '#1E3A8A', fg: '#DBEAFE', bd: '#60A5FA' },
    title_tham_tu: { bg: '#312E81', fg: '#E0E7FF', bd: '#818CF8' },
    title_soi_alpha: { bg: '#1F2937', fg: '#FCA5A5', bd: '#EF4444' },
    title_phu_hao: { bg: '#78350F', fg: '#FEF08A', bd: '#FACC15' },
    title_chi_ton: { bg: '#4A044E', fg: '#F5D0FE', bd: '#E879F9' },
  };
  const col = palette[title] ?? { bg: '#2A0A10', fg: '#FFC21A', bd: '#FFC21A' };
  return (
    <View testID={`title-${title}`} style={[styles.titlePill, { backgroundColor: col.bg, borderColor: col.bd }]}>
      <Text numberOfLines={1} style={[styles.titleText, { color: col.fg }]}>
        {it.emoji} {it.name}
      </Text>
    </View>
  );
});

/** Huy hiệu cấp bậc VIP nhỏ gọn */
export const VipBadge = memo(function VipBadge({ tier, compact = false }: { tier?: number; compact?: boolean }) {
  if (!tier || tier <= 0) return null;
  const info = vipByTier(tier);
  return (
    <View
      testID={`vip-badge-${tier}`}
      style={[
        styles.vipPill,
        { borderColor: info.color },
        web(info.glow ? { boxShadow: `0 0 8px ${info.glow}` } : {}),
      ]}
    >
      <Text style={styles.vipText}>{info.badge}{compact ? ` V${tier}` : ` VIP ${tier} · ${info.name}`}</Text>
    </View>
  );
});

/** Style bong bóng chat theo trang bị */
export function chatBubbleStyleOf(id?: string): StyleProp<ViewStyle> {
  switch (id) {
    case 'bubble_sakura':
      return [{ backgroundColor: '#FFF0F6', borderColor: '#FF85B3', borderWidth: 2 }, web({ boxShadow: '0 2px 10px rgba(255,133,179,0.45)' })];
    case 'bubble_neon':
      return [{ backgroundColor: '#1E103C', borderColor: '#D946EF', borderWidth: 2 }, web({ boxShadow: '0 0 12px rgba(217,70,239,0.6)' })];
    case 'bubble_cyber':
      return [{ backgroundColor: '#0A192F', borderColor: '#08F7FE', borderWidth: 2 }, web({ boxShadow: '0 0 12px rgba(8,247,254,0.55)' })];
    case 'bubble_gold_vip':
      return [{ backgroundColor: '#1F1300', borderColor: '#FACC15', borderWidth: 2 }, web({ backgroundImage: 'linear-gradient(135deg, #2B1A00, #452800)', boxShadow: '0 0 12px rgba(250,204,21,0.55)' })];
    case 'bubble_dragon_scroll':
      return [{ backgroundColor: '#4A080D', borderColor: '#FFD43B', borderWidth: 2 }, web({ backgroundImage: 'linear-gradient(135deg, #5E0B12, #2A0508)', boxShadow: '0 0 14px rgba(255,169,77,0.6)' })];
    case 'bubble_galaxy':
      return [{ backgroundColor: '#170B3B', borderColor: '#E879F9', borderWidth: 2 }, web({ backgroundImage: 'linear-gradient(135deg, #1E0D4D, #0F172A)', boxShadow: '0 0 16px rgba(232,121,249,0.68)' })];
    default:
      return undefined;
  }
}

export function chatBubbleTextColorOf(id?: string): string | undefined {
  switch (id) {
    case 'bubble_neon':
      return '#F5D0FE';
    case 'bubble_cyber':
      return '#A5F3FC';
    case 'bubble_gold_vip':
    case 'bubble_dragon_scroll':
      return '#FEF08A';
    case 'bubble_galaxy':
      return '#F3E8FF';
    default:
      return undefined;
  }
}

/** vẽ khung (và hào quang khi `active`) quanh avatar; hỗ trợ thú cưng bay bên vai */
export function FrameWrap({ size, frame, aura, pet, active, children }: {
  size: number; frame?: string; aura?: string; pet?: string; active?: boolean; children: ReactNode;
}) {
  const f = frameOf(frame);
  const hasAura = !!aura;
  if (!f && !hasAura && !pet) return <>{children}</>;
  const pad = f ? Math.max(4, Math.round(size * 0.11)) : 0;
  const outer = size + pad * 2;
  return (
    <View testID={frame ? `frame-${frame}` : undefined} style={{ width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center' }}>
      {hasAura && <AuraGlow kind={aura!} outer={outer} active={active} />}
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
            web({ animation: 'xl-spin-rev 5.5s linear infinite', willChange: 'transform' }),
          ]}
        />
      )}
      {f && <FrameBg f={f} outer={outer} />}
      {f?.swords && (
        <View
          pointerEvents="none"
          style={[
            { position: 'absolute', width: outer + 10, height: outer + 10, alignItems: 'center', justifyContent: 'center' },
            web({ animation: 'xl-spin 4s linear infinite', willChange: 'transform' }),
          ]}
        >
          <Text style={{ position: 'absolute', top: -7, fontSize: 12 }}>⚔️</Text>
          <Text style={{ position: 'absolute', bottom: -7, fontSize: 12 }}>🗡️</Text>
          <Text style={{ position: 'absolute', left: -7, fontSize: 12 }}>🗡️</Text>
          <Text style={{ position: 'absolute', right: -7, fontSize: 12 }}>⚔️</Text>
        </View>
      )}
      {children}
      {f?.badge && <Text pointerEvents="none" style={{ position: 'absolute', top: -Math.round(size * 0.22), right: -Math.round(size * 0.12), fontSize: Math.max(13, size * 0.34), zIndex: 10 }}>{f.badge}</Text>}
      <PetBadge pet={pet} size={size} />
    </View>
  );
}

const GRAD_TEXT: Record<string, { fallback: string; bg: string; extra?: Record<string, unknown> }> = {
  name_rainbow: {
    fallback: '#FFC371',
    bg: 'linear-gradient(90deg, #ff5f6d, #ffc371, #7bed9f, #70a1ff, #a55eea, #ff5f6d)',
  },
  name_gold_liquid: {
    fallback: '#FACC15',
    bg: 'linear-gradient(90deg, #B45309, #FEF08A, #F59E0B, #FFFBEB, #B45309)',
  },
  name_fire_blaze: {
    fallback: '#FF6B35',
    bg: 'linear-gradient(90deg, #FF2A00, #FF9E00, #FFE066, #FF3B00)',
  },
  name_ice_crystal: {
    fallback: '#7DD3FC',
    bg: 'linear-gradient(90deg, #38BDF8, #FFFFFF, #7DD3FC, #0EA5E9)',
  },
  name_blood_moon: {
    fallback: '#F87171',
    bg: 'linear-gradient(90deg, #DC2626, #FCA5A5, #991B1B, #F87171)',
  },
  name_galaxy_shimmer: {
    fallback: '#E879F9',
    bg: 'linear-gradient(90deg, #38BDF8, #E879F9, #FDE047, #818CF8, #38BDF8)',
  },
};

/** tên người chơi, kèm hiệu ứng nếu đã trang bị (10 mẫu VIP) */
export function NameText({ fx, style, children, ...rest }: { fx?: string; style?: StyleProp<TextStyle>; children: ReactNode; testID?: string }) {
  if (fx && fx in GRAD_TEXT) {
    const g = GRAD_TEXT[fx];
    return (
      <Text
        {...rest}
        style={[
          style,
          web({
            color: g.fallback,
            backgroundImage: g.bg,
            backgroundSize: '200% auto',
            animation: 'xl-shimmer 2.8s linear infinite',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 1px 1.2px rgba(20, 10, 26, 0.88))',
          }),
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
          { color: '#06B6D4', textShadowColor: '#0F172A', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
          web({ textShadow: '0 1px 2px rgba(10,12,24,0.92), 0 0 8px #08F7FE' }),
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
          { color: '#F59F00', textShadowColor: '#451A03', textShadowRadius: 0, textShadowOffset: { width: 1.5, height: 1.5 } },
        ]}
      >
        👑 {children}
      </Text>
    );
  }
  if (fx === 'name_divine_glitch') {
    return (
      <Text
        {...rest}
        style={[
          style,
          { color: '#C026D3' },
          web({
            animation: 'xl-glitch 2.6s infinite',
            textShadow: '0 1px 2px rgba(12,8,22,0.92), -1px 0 0 #06B6D4, 1px 0 0 #F43F5E, 0 0 10px rgba(217,70,239,0.75)',
          }),
        ]}
      >
        ⚡{children}⚡
      </Text>
    );
  }
  if (fx === 'name_sparkle') return <Sparkle style={style} {...rest}>{children}</Sparkle>;
  return <Text {...rest} style={style}>{children}</Text>;
}

function Sparkle({ style, children, ...rest }: { style?: StyleProp<TextStyle>; children: ReactNode; testID?: string }) {
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
      <Text
        {...rest}
        style={[style, { textShadowColor: '#FFD84D', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }, web({ animation: 'xl-pulse 1.3s ease-in-out infinite' })]}
      >
        ✨{children}✨
      </Text>
    );
  }
  return (
    <Animated.Text {...rest} style={[style, { opacity: t, textShadowColor: '#FFD84D', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }]}>
      ✨{children}✨
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  titlePill: {
    borderWidth: 1.4,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
    maxWidth: '100%',
  },
  titleText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  vipPill: {
    backgroundColor: '#181016',
    borderWidth: 1.5,
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  vipText: {
    color: '#FFF9DB',
    fontSize: 10,
    fontWeight: '900',
  },
});
