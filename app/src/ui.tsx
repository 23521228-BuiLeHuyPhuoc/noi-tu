import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { C, FONT, GRADS, sticker } from './theme';
import { play } from './sound';
import { EmojiIcon, UiIcon, splitEdgeEmoji, type UiIconName } from './components/Icons';

// ---------- Chữ ----------

export function T({ style, selectable, ...rest }: TextProps) {
  return (
    <Text
      selectable={selectable ?? false}
      {...(Platform.OS === 'web' && selectable ? ({ dataSet: { selectable: 'true' } } as object) : {})}
      style={[styles.text, style]}
      {...rest}
    />
  );
}

// ---------- Nút bấm gradient & bề mặt tactile ----------

export type Variant = 'gold' | 'paper' | 'ink' | 'jade' | 'ghost' | 'danger' | 'royal';

const VARIANTS: Record<
  Variant,
  { colors: readonly [string, string, string]; fg: string; lip: string; rim: string }
> = {
  gold: { colors: GRADS.gold, fg: '#271400', lip: '#D97706', rim: 'rgba(255,255,255,0.55)' },
  paper: { colors: GRADS.paper, fg: C.ink, lip: '#CBD5E1', rim: 'rgba(255,255,255,0.9)' },
  ink: { colors: GRADS.ink, fg: C.gold, lip: '#090D12', rim: 'rgba(255,255,255,0.16)' },
  jade: { colors: GRADS.jade, fg: '#FFFFFF', lip: '#0F6E56', rim: 'rgba(255,255,255,0.35)' },
  danger: { colors: GRADS.danger, fg: '#FFFFFF', lip: '#9F1239', rim: 'rgba(255,255,255,0.32)' },
  royal: { colors: GRADS.royal, fg: '#FFFFFF', lip: '#3730A3', rim: 'rgba(255,255,255,0.34)' },
  ghost: { colors: ['transparent', 'transparent', 'transparent'], fg: C.onSon, lip: 'transparent', rim: 'transparent' },
};

export function Button({
  title, variant = 'gold', small, disabled, style, onPress, icon, iconNode, big, ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variant;
  small?: boolean;
  /** chữ thật to (vd: nút chỉ có icon) */
  big?: boolean;
  icon?: string;
  iconNode?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const split = splitEdgeEmoji(title);
  const effectiveLead = icon ?? split.leading;
  const effectiveTrail = !icon ? split.trailing : undefined;
  const cleanTitle = icon ? title : split.text;
  const iconSz = big ? 28 : small ? 16 : 19;

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
        styles.btnOuter,
        small && styles.btnOuterSmall,
        variant !== 'ghost' && [
          styles.btnElevated,
          { backgroundColor: v.lip },
          Platform.OS === 'web' && !pressed
            ? ({ boxShadow: '0 6px 14px -4px rgba(15,23,42,0.28), 0 2px 0 ' + v.lip } as object)
            : null,
        ],
        variant === 'ghost' && styles.ghost,
        pressed && variant !== 'ghost' && { transform: [{ translateY: 2 }] },
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {variant === 'ghost' ? (
        <View style={[styles.btnInner, small && styles.btnInnerSmall]}>
          {iconNode}
          {!iconNode && effectiveLead && <EmojiIcon emoji={effectiveLead} size={iconSz} />}
          {cleanTitle ? (
            <Text selectable={false} numberOfLines={small ? 2 : 1} style={[styles.btnText, small && styles.btnTextSmall, big && styles.btnTextBig, { color: v.fg }]}>
              {cleanTitle}
            </Text>
          ) : null}
          {effectiveTrail && <EmojiIcon emoji={effectiveTrail} size={iconSz} />}
        </View>
      ) : (
        <LinearGradient
          colors={[...v.colors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.btnInner,
            small && styles.btnInnerSmall,
            { borderTopWidth: 1, borderTopColor: v.rim },
          ]}
        >
          {iconNode}
          {!iconNode && effectiveLead && <EmojiIcon emoji={effectiveLead} size={iconSz} />}
          {cleanTitle ? (
            <Text selectable={false} numberOfLines={small ? 2 : 1} style={[styles.btnText, small && { textAlign: 'center' }, small && styles.btnTextSmall, big && styles.btnTextBig, { color: v.fg }]}>
              {cleanTitle}
            </Text>
          ) : null}
          {effectiveTrail && <EmojiIcon emoji={effectiveTrail} size={iconSz} />}
        </LinearGradient>
      )}
    </Pressable>
  );
}

/** Nút tròn/squircle nhỏ gọn chỉ có biểu tượng vector (≥ 42px dễ chạm) */
export function IconButton({ icon, iconNode, label, onPress, style, testID }: {
  icon: string; iconNode?: ReactNode; label: string; onPress: () => void; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        play('pop');
        onPress();
      }}
      hitSlop={6}
      style={({ pressed }) => [styles.icon, sticker(pressed ? 1 : 2), pressed && { transform: [{ translateY: 2 }] }, style]}
    >
      {iconNode ?? <EmojiIcon emoji={icon} size={20} />}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, sticker(3), style]}>{children}</View>;
}

// ---------- Dòng thông báo nổi (sự kiện trong game) ----------

interface FeedItem {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad' | 'fun';
}

const FeedCtx = createContext<(text: string, tone?: FeedItem['tone']) => void>(() => {});
export const useFeed = () => useContext(FeedCtx);
/** Shell báo chiều cao vùng nút dưới cùng để thông báo nổi nằm ngay phía trên, không đè bàn chơi */
const FeedInsetCtx = createContext<(h: number) => void>(() => {});
export const useFeedInset = () => useContext(FeedInsetCtx);
const FEED_DEFAULT_INSET = 16;

const FEED_STYLE: Record<FeedItem['tone'], { bg: string; bd: string; fg: string; icon: UiIconName; icColor: string }> = {
  info: { bg: 'rgba(255,255,255,0.96)', bd: 'rgba(28,32,36,0.16)', fg: C.ink, icon: 'Info', icColor: '#2563EB' },
  good: { bg: '#E6F7ED', bd: '#56BA9F', fg: '#134E3A', icon: 'CheckCircle2', icColor: '#208368' },
  bad: { bg: '#DC2626', bd: '#991B1B', fg: '#FFFFFF', icon: 'AlertTriangle', icColor: '#FEF08A' },
  fun: { bg: '#FFF0F6', bd: '#F472B6', fg: '#831843', icon: 'Sparkles', icColor: '#DB2777' },
};

export function FeedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const seq = useRef(0);
  const [inset, setInset] = useState(FEED_DEFAULT_INSET);
  const push = useCallback((text: string, tone: FeedItem['tone'] = 'info') => {
    const id = ++seq.current;
    setItems((xs) => [...xs.slice(-1), { id, text, tone }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <FeedCtx.Provider value={push}>
     <FeedInsetCtx.Provider value={setInset}>
      {children}
      <View pointerEvents="none" style={[styles.feed, { bottom: inset + 6 }]}>
        {items.map((it) => {
          const st = FEED_STYLE[it.tone];
          return (
            <View
              key={it.id}
              style={[
                styles.feedItem,
                sticker(2),
                { backgroundColor: st.bg, borderColor: st.bd },
                Platform.OS === 'web' ? ({ backdropFilter: 'blur(8px)' } as object) : null,
              ]}
            >
              <UiIcon name={st.icon} size={15} color={st.icColor} />
              <Text testID="feed" style={[styles.feedText, { color: st.fg }]}>{it.text}</Text>
            </View>
          );
        })}
      </View>
     </FeedInsetCtx.Provider>
    </FeedCtx.Provider>
  );
}

const styles = StyleSheet.create({
  text: { fontFamily: FONT, color: C.ink, fontSize: 16 },
  btnOuter: {
    borderRadius: 16,
    paddingBottom: 3,
    overflow: 'hidden',
  },
  btnOuterSmall: {
    borderRadius: 12,
    paddingBottom: 2,
  },
  btnElevated: {
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.22)',
  },
  btnInner: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnInnerSmall: {
    minHeight: 40,
    borderRadius: 11,
    paddingHorizontal: 12,
    gap: 6,
  },
  ghost: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,247,237,0.65)',
    borderStyle: 'dashed',
    paddingBottom: 0,
  },
  btnText: { fontFamily: FONT, fontSize: 16, fontWeight: '800', letterSpacing: 0.1 },
  btnTextSmall: { fontSize: 14 },
  btnTextBig: { fontSize: 26, lineHeight: 34 },
  disabled: { opacity: 0.45 },
  icon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center',
  },
  card: { backgroundColor: C.paper, borderRadius: 22, padding: 16 },
  feed: { position: 'absolute', left: 12, right: 12, alignItems: 'center', gap: 6, zIndex: 50 },
  feedItem: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7, maxWidth: 460,
  },
  feedText: { fontFamily: FONT, fontWeight: '700', fontSize: 13, flexShrink: 1 },
});
