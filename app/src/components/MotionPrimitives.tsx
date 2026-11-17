/**
 * Nguyên tử chuyển động mượt (`motion/react` trên Web + Animated fallback trên Native),
 * tự động giản lược khi người chơi bật chế độ "Siêu mượt".
 */
import type { ReactNode } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from 'motion/react';
import { useSmoothMode } from '../smoothMode';

export function MotionSurface({
  children,
  delay = 0,
  hoverLift = false,
  style,
}: {
  children: ReactNode;
  delay?: number;
  hoverLift?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const [smooth] = useSmoothMode();
  if (Platform.OS !== 'web' || smooth) {
    return <View style={style}>{children}</View>;
  }
  return (
    <View style={style}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay, ease: [0.22, 1, 0.36, 1] }}
        whileHover={hoverLift ? { y: -2 } : undefined}
        style={{ display: 'flex', flexDirection: 'column', width: '100%' }}
      >
        {children}
      </motion.div>
    </View>
  );
}

export function FlipCard({
  flipped,
  children,
  style,
}: {
  flipped: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [smooth] = useSmoothMode();
  if (Platform.OS !== 'web' || smooth) {
    return <View style={style}>{children}</View>;
  }
  return (
    <motion.div
      key={flipped ? 'back' : 'front'}
      initial={{ rotateY: 75, opacity: 0.65, scale: 0.97 }}
      animate={{ rotateY: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformPerspective: 900 }}
    >
      <View style={style}>{children}</View>
    </motion.div>
  );
}
