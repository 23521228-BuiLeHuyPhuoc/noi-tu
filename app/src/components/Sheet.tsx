import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { C, sticker } from '../theme';
import { T } from '../ui';

/** Bảng trượt từ dưới lên (dễ bấm bằng ngón cái) */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, sticker(0)]}>
        <View style={styles.grip} />
        <T style={styles.title}>{title}</T>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,10,16,0.55)' },
  panel: {
    backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 0,
    padding: 18, paddingBottom: 26, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center',
  },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.mist, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
});
