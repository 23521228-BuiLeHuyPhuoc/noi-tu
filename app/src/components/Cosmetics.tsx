/**
 * Trang trí avatar mua bằng Ruby: khung quanh vòng tròn, hiệu ứng chữ cho tên, hào quang khi tới lượt.
 * Chỉ để đẹp, không ảnh hưởng ván chơi. Khung dùng nền gradient của web (native rơi về màu đơn).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

type FrameDef = { base: string; image?: string; glow?: string; badge?: string; pulse?: boolean };

const FRAMES: Record<string, FrameDef> = {
  frame_gold: { base: '#E8B923', image: 'linear-gradient(135deg, #FFF0A8, #E0A100 45%, #FFE27A)', glow: '0 0 6px 1px rgba(224,161,0,0.8)' },
  frame_fire: { base: '#FF7A00', image: 'linear-gradient(0deg, #FF3B00, #FF9E00 55%, #FFD400)', glow: '0 0 8px 2px rgba(255,92,0,0.75)', badge: '🔥' },
  frame_rainbow: { base: '#A55EEA', image: 'conic-gradient(#ff4d4d, #ffb84d, #ffee55, #5fe08a, #4dd2ff, #6a6bff, #c64dff, #ff4d4d)' },
  frame_neon: { base: '#00F0FF', glow: '0 0 10px 3px #00F0FF, 0 0 22px 6px rgba(255,0,229,0.7)', pulse: true },
  frame_dragon: { base: '#0F7A43', image: 'linear-gradient(135deg, #0B6B3A, #F2C94C 50%, #0B6B3A)', glow: '0 0 6px 1px rgba(242,201,76,0.8)', badge: '🐉' },
};

export const frameOf = (id: string | undefined) => (id ? FRAMES[id] : undefined);

const web = (o: Record<string, unknown>) => o as object;

function Pulse({ children, style, from = 0.45 }: { children?: ReactNode; style: StyleProp<object>; from?: number }) {
  const t = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: from, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t, from]);
  return <Animated.View pointerEvents="none" style={[style, { opacity: t }]}>{children}</Animated.View>;
}

function FrameBg({ f, outer }: { f: FrameDef; outer: number }) {
  const style = [
    StyleSheet.absoluteFill,
    { borderRadius: outer / 2, backgroundColor: f.base },
    web({ ...(f.image ? { backgroundImage: f.image } : {}), ...(f.glow ? { boxShadow: f.glow } : {}) }),
  ];
  return f.pulse ? <Pulse style={style} from={0.5} /> : <View pointerEvents="none" style={style} />;
}

/** hào quang khi tới lượt: nhấp nháy sáng, hoặc lửa bốc quanh avatar */
function AuraGlow({ kind, outer }: { kind: string; outer: number }) {
  const fire = kind === 'aura_fire';
  const glow = fire ? '0 0 14px 7px rgba(255,98,0,0.85), 0 0 30px 12px rgba(255,200,0,0.45)' : '0 0 16px 8px rgba(120,200,255,0.9), 0 0 34px 14px rgba(255,255,255,0.5)';
  return (
    <>
      <Pulse
        from={0.3}
        style={[{ position: 'absolute', left: 0, top: 0, width: outer, height: outer, borderRadius: outer / 2 }, web({ boxShadow: glow })]}
      />
      {fire && (
        <>
          <Pulse from={0.4} style={{ position: 'absolute', top: -14, left: outer * 0.12 }}><Text style={{ fontSize: Math.max(14, outer * 0.3) }}>🔥</Text></Pulse>
          <Pulse from={0.4} style={{ position: 'absolute', top: -14, right: outer * 0.12 }}><Text style={{ fontSize: Math.max(14, outer * 0.3) }}>🔥</Text></Pulse>
        </>
      )}
    </>
  );
}

/** vẽ khung (và hào quang khi `active`) quanh avatar; không có gì để vẽ thì trả nguyên nội dung */
export function FrameWrap({ size, frame, aura, active, children }: { size: number; frame?: string; aura?: string; active?: boolean; children: ReactNode }) {
  const f = frameOf(frame);
  const hasAura = !!aura && !!active && (aura === 'aura_glow' || aura === 'aura_fire');
  if (!f && !hasAura) return <>{children}</>;
  const pad = f ? Math.max(3, Math.round(size * 0.1)) : 0;
  const outer = size + pad * 2;
  return (
    <View testID={frame ? `frame-${frame}` : undefined} style={{ width: outer, height: outer, borderRadius: outer / 2, alignItems: 'center', justifyContent: 'center' }}>
      {hasAura && <AuraGlow kind={aura!} outer={outer} />}
      {f && <FrameBg f={f} outer={outer} />}
      {children}
      {f?.badge && <Text pointerEvents="none" style={{ position: 'absolute', top: -Math.round(size * 0.22), right: -Math.round(size * 0.12), fontSize: Math.max(13, size * 0.34) }}>{f.badge}</Text>}
    </View>
  );
}

/** tên người chơi, kèm hiệu ứng nếu đã trang bị (cầu vồng / lấp lánh) */
export function NameText({ fx, style, children, ...rest }: { fx?: string; style?: StyleProp<TextStyle>; children: ReactNode; testID?: string }) {
  if (fx === 'name_rainbow') {
    return (
      <Text
        {...rest}
        style={[style, web({
          color: '#FFC371',
          backgroundImage: 'linear-gradient(90deg, #ff5f6d, #ffc371, #7bed9f, #70a1ff, #a55eea)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
        })]}
      >
        {children}
      </Text>
    );
  }
  if (fx === 'name_sparkle') return <Sparkle style={style} {...rest}>{children}</Sparkle>;
  return <Text {...rest} style={style}>{children}</Text>;
}

function Sparkle({ style, children, ...rest }: { style?: StyleProp<TextStyle>; children: ReactNode; testID?: string }) {
  const t = useState(() => new Animated.Value(1))[0];
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 0.55, duration: 500, useNativeDriver: false }),
        Animated.timing(t, { toValue: 1, duration: 500, useNativeDriver: false }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [t]);
  return (
    <Animated.Text {...rest} style={[style, { opacity: t, textShadowColor: '#FFD84D', textShadowRadius: 6, textShadowOffset: { width: 0, height: 0 } }]}>
      ✨{children}✨
    </Animated.Text>
  );
}
