import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ViewportContext } from '../hooks';

function AndroidKeyboardFrame({ children }: { children: ReactNode }) {
  const root = useRef<ComponentRef<typeof View>>(null);
  const [overlap, setOverlap] = useState(0);
  const [viewport, setViewport] = useState<{ width: number; height: number; rotated: boolean } | null>(null);
  const measure = useCallback(() => {
    root.current?.measureInWindow((_x, y, _width, height) => {
      const keyboard = Keyboard.metrics();
      const next = keyboard ? Math.max(0, Math.round(y + height - keyboard.screenY)) : 0;
      setOverlap((previous) => previous === next ? previous : next);
    });
  }, []);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', measure);
    const hide = Keyboard.addListener('keyboardDidHide', () => setOverlap(0));
    return () => { show.remove(); hide.remove(); };
  }, [measure]);
  return (
    // Measure the unshrunk outer frame: measuring an already-avoided frame
    // feeds its changing height back into keyboard avoidance and causes flashes.
    <View ref={root} collapsable={false} style={{ flex: 1, paddingBottom: overlap }} onLayout={measure}>
      <View style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => {
        setViewport((previous) => previous?.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height, rotated: false });
      }}>
        <ViewportContext.Provider value={viewport}>{children}</ViewportContext.Provider>
      </View>
    </View>
  );
}

export function KeyboardFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [viewport, setViewport] = useState<{ width: number; height: number; rotated: boolean } | null>(null);
  if (Platform.OS === 'web') return <View style={{ flex: 1 }}>{children}</View>;
  if (Platform.OS === 'android') return <AndroidKeyboardFrame>{children}</AndroidKeyboardFrame>;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={insets.top}
    >
      <View style={{ flex: 1 }} onLayout={({ nativeEvent: { layout } }) => {
        setViewport((previous) => previous?.width === layout.width && previous.height === layout.height
          ? previous : { width: layout.width, height: layout.height, rotated: false });
      }}>
        <ViewportContext.Provider value={viewport}>{children}</ViewportContext.Provider>
      </View>
    </KeyboardAvoidingView>
  );
}
