import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { C, sticker } from '../theme';

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

/** Xúc xắc có chấm; đổi `rollId` là chạy hiệu ứng lắc */
export function Dice({ value, rollId, size = 64, testID }: { value: number | null; rollId: number; size?: number; testID?: string }) {
  const spin = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (!rollId) return;
    spin.setValue(0);
    Animated.timing(spin, { toValue: 1, duration: 450, useNativeDriver: false }).start();
  }, [rollId, spin]);
  const pip = size / 6;
  return (
    <Animated.View
      testID={testID}
      accessibilityLabel={value ? `Xúc xắc ra ${value}` : 'Xúc xắc'}
      style={[
        styles.die,
        sticker(4),
        { width: size, height: size, borderRadius: size * 0.2 },
        {
          transform: [
            { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
            { scale: spin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.25, 1] }) },
          ],
        },
      ]}
    >
      {(value ? PIPS[value] : []).map(([r, c], i) => (
        <View
          key={i}
          style={{
            position: 'absolute', width: pip, height: pip, borderRadius: pip / 2,
            backgroundColor: value === 1 ? C.son : C.ink,
            top: size * 0.2 + r * (size * 0.3) - pip / 2 - 2.5,
            left: size * 0.2 + c * (size * 0.3) - pip / 2 - 2.5,
          }}
        />
      ))}
      {!value && <Animated.Text style={{ fontSize: size * 0.45 }}>🎲</Animated.Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  die: { backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' },
});
