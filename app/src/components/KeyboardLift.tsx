import { useRef, type ComponentRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useKeyboardLift } from '../hooks';
import { C } from '../theme';

/** Khối chứa ô nhập: khi bàn phím ảo mở thì chỉ khối này nhích lên trên bàn phím (transform), bố cục còn lại đứng yên. */
export function KeyboardLift({ children }: { children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const lift = useKeyboardLift(ref);
  return (
    <View
      ref={ref}
      testID="keyboard-lift"
      style={[
        styles.base,
        lift > 0 && [styles.lifted, { transform: [{ translateY: -lift }] }],
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { gap: 8 },
  lifted: {
    zIndex: 30,
    backgroundColor: C.son,
    borderRadius: 16,
    boxShadow: `0 0 0 6px ${C.son}, 0 8px 22px rgba(42, 10, 16, 0.5)`,
  } as object,
});
