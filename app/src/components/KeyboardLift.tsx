import { useRef, type ComponentRef, type ReactNode } from 'react';
import { View } from 'react-native';
import { useKeyboardLift } from '../hooks';

/** Khối chứa ô nhập: khi bàn phím ảo mở thì chỉ khối này nhích lên trên bàn phím (transform), bố cục còn lại đứng yên. */
export function KeyboardLift({ children }: { children: ReactNode }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const lift = useKeyboardLift(ref);
  return (
    <View ref={ref} testID="keyboard-lift" style={[{ gap: 8 }, lift > 0 && { transform: [{ translateY: -lift }], zIndex: 30 }]}>
      {children}
    </View>
  );
}
