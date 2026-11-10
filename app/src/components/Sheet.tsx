import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardInset, useStableWindow } from '../hooks';
import { C, sticker } from '../theme';
import { T } from '../ui';

/** Bảng trượt từ dưới lên (dễ bấm bằng ngón cái) */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // bàn phím mở: chỉ bảng này nhích lên và co lại cho vừa phần còn trống (phần game phía sau không đổi)
  const kb = useKeyboardInset();
  const { height } = useStableWindow();
  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, sticker(0), kb > 0 && { marginBottom: kb, maxHeight: Math.max(220, height - kb - 12) }]}>
        <View style={styles.grip} />
        <T style={styles.title}>{title}</T>
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,10,16,0.55)' },
  panel: {
    backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 0,
    padding: 18, paddingBottom: 26, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center', maxHeight: '92%',
  },
  body: { flexGrow: 0, flexShrink: 1 },
  bodyContent: { gap: 14 },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.mist, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
});
