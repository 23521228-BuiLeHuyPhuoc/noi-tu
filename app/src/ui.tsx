import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { C, FONT, sticker } from './theme';
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

// ---------- Nút bấm phẳng tinh tế & bề mặt hairline ----------

export type Variant = 'gold' | 'paper' | 'ink' | 'jade' | 'ghost' | 'danger' | 'royal';

const VARIANTS: Record<
  Variant,
  { bg: string; fg: string; bd: string }
> = {
  gold: { bg: '#F59E0B', fg: C.ink, bd: 'rgba(180, 83, 9, 0.36)' },
  paper: { bg: C.mist, fg: C.ink, bd: C.borderSubtle },
  ink: { bg: C.ink, fg: C.onSon, bd: C.ink },
  jade: { bg: C.jade, fg: '#FFFFFF', bd: C.jadeDeep },
  danger: { bg: C.danger, fg: '#FFFFFF', bd: '#991B1B' },
  royal: { bg: C.violet, fg: '#FFFFFF', bd: '#4C1D95' },
  ghost: { bg: 'transparent', fg: C.secondary, bd: C.borderSubtle },
};

export function Button({
  title, variant = 'ink', small, disabled, style, onPress, icon, iconNode, big, ...rest
}: Omit<PressableProps, 'style'> & {
  title: string;
  variant?: Variant;
  small?: boolean;
  /** chữ thật to (vd: nút chỉ có icon picker) */
  big?: boolean;
  icon?: string;
  iconNode?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const split = splitEdgeEmoji(title);
  const rawLabel = (icon ? title : split.text).replace(/!+$/g, '').trim();
  const hasLabel = rawLabel.length > 0;
  // Giữ icon emoji thuần khi nút CHỈ là ô chọn emoji (không có nhãn chữ); các nút có nhãn chữ bỏ emoji trang trí
  const emojiOnly = !hasLabel ? (icon ?? split.leading ?? split.trailing) : undefined;
  const fg = disabled ? C.muted : v.fg;
  const iconSz = big ? 26 : small ? 15 : 18;

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
        styles.btnBase,
        small && styles.btnSmall,
        {
          backgroundColor: disabled ? '#E5DFD3' : v.bg,
          borderColor: disabled ? C.borderSubtle : v.bd,
        },
        pressed && !disabled && styles.btnPressed,
        style,
      ]}
      {...rest}
    >
      {iconNode}
      {!iconNode && emojiOnly && <EmojiIcon emoji={emojiOnly} size={iconSz} />}
      {hasLabel ? (
        <Text
          selectable={false}
          numberOfLines={small ? 2 : 1}
          style={[
            styles.btnText,
            small && { textAlign: 'center' },
            small && styles.btnTextSmall,
            big && styles.btnTextBig,
            { color: fg },
          ]}
        >
          {rawLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Nút vuông bo góc nhẹ chỉ có biểu tượng vector */
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
      style={({ pressed }) => [styles.icon, pressed && styles.btnPressed, style]}
    >
      {iconNode ?? <EmojiIcon emoji={icon} size={18} />}
    </Pressable>
  );
}

export function Card({ children, style, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <View testID={testID} style={[styles.card, sticker(2), style]}>{children}</View>;
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
  info: { bg: C.paper, bd: C.borderStrong, fg: C.ink, icon: 'Info', icColor: C.secondary },
  good: { bg: C.jadeSoft, bd: 'rgba(21, 128, 61, 0.30)', fg: '#14532D', icon: 'CheckCircle2', icColor: C.jade },
  bad: { bg: C.dangerSoft, bd: 'rgba(185, 28, 28, 0.30)', fg: '#7F1D1D', icon: 'AlertTriangle', icColor: C.danger },
  fun: { bg: C.goldSoft, bd: 'rgba(180, 83, 9, 0.32)', fg: '#78350F', icon: 'Sparkles', icColor: C.goldDeep },
};

export function FeedProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const seq = useRef(0);
  const [inset, setInset] = useState(FEED_DEFAULT_INSET);
  const push = useCallback((text: string, tone: FeedItem['tone'] = 'info') => {
    const id = ++seq.current;
    const clean = text.replace(/!+$/g, '').trim();
    setItems((xs) => [...xs.slice(-1), { id, text: clean, tone }]);
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
                sticker(1),
                { backgroundColor: st.bg, borderColor: st.bd },
              ]}
            >
              <UiIcon name={st.icon} size={15} color={st.icColor} strokeWidth={1.75} />
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
  text: { fontFamily: FONT, color: C.ink, fontSize: 15 },
  btnBase: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSmall: {
    minHeight: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  btnText: { fontFamily: FONT, fontSize: 15, fontWeight: '600' },
  btnTextSmall: { fontSize: 13.5, fontWeight: '600' },
  btnTextBig: { fontSize: 24, lineHeight: 30 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: { backgroundColor: C.paper, borderRadius: 14, padding: 16 },
  feed: { position: 'absolute', left: 12, right: 12, alignItems: 'center', gap: 6, zIndex: 50 },
  feedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 460,
  },
  feedText: { fontFamily: FONT, fontWeight: '500', fontSize: 13, flexShrink: 1 },
});
