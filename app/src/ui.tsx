import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { C, FONT, sticker } from './theme';
import { play } from './sound';

// ---------- Chữ ----------

export function T({ style, ...rest }: TextProps) {
  return <Text style={[styles.text, style]} {...rest} />;
}

// ---------- Nút sticker ----------

type Variant = 'gold' | 'paper' | 'ink' | 'jade' | 'ghost';

export function Button({
  title, variant = 'gold', small, disabled, style, onPress, icon, big, ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variant;
  small?: boolean;
  /** chữ thật to (vd: nút chỉ có emoji) */
  big?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      aria-disabled={disabled ? true : undefined}
      disabled={disabled}
      onPress={(e) => {
        play('pop');
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        variant !== 'ghost' && sticker(pressed ? 1 : 4),
        { backgroundColor: v.bg },
        variant === 'ghost' && styles.ghost,
        pressed && { transform: [{ translateY: 3 }] },
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <Text numberOfLines={1} style={[styles.btnText, small && styles.btnTextSmall, big && styles.btnTextBig, { color: v.fg }]}>
        {icon ? `${icon}  ` : ''}
        {title}
      </Text>
    </Pressable>
  );
}

const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  gold: { bg: C.gold, fg: C.ink },
  paper: { bg: C.paper, fg: C.ink },
  ink: { bg: C.ink, fg: C.gold },
  jade: { bg: C.jade, fg: '#fff' },
  ghost: { bg: 'transparent', fg: C.onSon },
};

/** Nút tròn nhỏ chỉ có biểu tượng (≥ 44px để dễ bấm) */
export function IconButton({ icon, label, onPress, style, testID }: {
  icon: string; label: string; onPress: () => void; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.icon, sticker(pressed ? 1 : 3), pressed && { transform: [{ translateY: 2 }] }, style]}
    >
      <Text style={styles.iconText}>{icon}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, sticker(4), style]}>{children}</View>;
}

// ---------- Dòng thông báo nổi (sự kiện trong game) ----------

interface FeedItem {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'fun';
}

const FeedCtx = createContext<(text: string, tone?: FeedItem['tone']) => void>(() => {});
export const useFeed = () => useContext(FeedCtx);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((text: string, tone: FeedItem['tone'] = 'info') => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <FeedCtx.Provider value={push}>
      {children}
      <View pointerEvents="none" style={styles.feed}>
        {items.map((it) => (
          <View key={it.id} style={[styles.feedItem, sticker(3), { backgroundColor: FEED_BG[it.tone] }]}>
            <Text testID="feed" style={[styles.feedText, it.tone === 'bad' && { color: '#fff' }]}>{it.text}</Text>
          </View>
        ))}
      </View>
    </FeedCtx.Provider>
  );
}

const FEED_BG = { info: C.paper, good: '#C3FAE8', bad: C.danger, fun: '#FFD6E7' };

const styles = StyleSheet.create({
  text: { fontFamily: FONT, color: C.ink, fontSize: 16 },
  btn: {
    minHeight: 54, borderRadius: 16, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  btnSmall: { minHeight: 44, borderRadius: 12, paddingHorizontal: 12 },
  ghost: { borderWidth: 2, borderColor: C.onSon, borderStyle: 'dashed', marginBottom: 0 },
  btnText: { fontFamily: FONT, fontSize: 18, fontWeight: '800' },
  btnTextSmall: { fontSize: 15 },
  btnTextBig: { fontSize: 32, lineHeight: 40 },
  disabled: { opacity: 0.45 },
  icon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  card: { backgroundColor: C.paper, borderRadius: 20, padding: 16 },
  feed: { position: 'absolute', top: 150, left: 12, right: 12, alignItems: 'center', gap: 6, zIndex: 50 },
  feedItem: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, maxWidth: 440 },
  feedText: { fontFamily: FONT, fontWeight: '700', fontSize: 15, color: C.ink, textAlign: 'center' },
});
