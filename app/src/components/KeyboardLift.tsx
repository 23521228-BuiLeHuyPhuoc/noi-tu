import { useRef, type ComponentRef, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useKeyboardLift } from '../hooks';

/**
 * Khối chứa ô nhập: lớp ngoài (`ref`) đứng yên làm mốc đo tọa độ cố định, lớp trong chỉ chạy transform
 * nhích mượt lên phía trên bàn phím ảo, giúp mobile gõ phím 0 giật lag.
 */
export function KeyboardLift({ children }: { children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const lift = useKeyboardLift(ref);
  return (
    <View ref={ref} style={styles.anchor}>
      <View
        testID="keyboard-lift"
        style={[
          styles.base,
          Platform.OS === 'web'
            ? ({
                transition: 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                willChange: 'transform',
              } as object)
            : null,
          lift > 0 && [styles.lifted, { transform: [{ translateY: -lift }] }],
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { alignSelf: 'stretch' },
  base: { gap: 6 },
  lifted: {
    zIndex: 30,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 14,
    padding: 6,
    marginHorizontal: -4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
});
