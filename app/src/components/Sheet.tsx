import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardInset, useStableWindow } from '../hooks';
import { C, sticker } from '../theme';
import { T } from '../ui';

// đếm số bảng đang mở: bong bóng chat/phản ứng nằm ở lớp khác (không đè lên được bảng) nên tự ẩn khi có bảng mở
let openCount = 0;
const listeners = new Set<() => void>();
const bump = (d: number) => { openCount += d; listeners.forEach((l) => l()); };
export function useSheetOpen(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => openCount > 0, () => false);
}

/** Bảng trượt từ dưới lên (dễ bấm bằng ngón cái) */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  // bàn phím mở: chỉ bảng này nhích lên và co lại cho vừa phần còn trống (phần game phía sau không đổi)
  const kb = useKeyboardInset();
  const { height } = useStableWindow();
  // luôn bám màn hình (kể cả khi game tự xoay ngang): chiều cao tối đa tính bằng số theo màn, không theo khung cha
  // (khung bàn Cờ tỷ phú cao hơn màn ngang làm bảng tràn khỏi đáy, mất ô nhập chat / nút chọc)
  const maxHeight = kb > 0 ? Math.max(220, height - kb - 12) : Math.max(220, Math.round(height * 0.94));
  const short = height < 520;
  useEffect(() => { bump(1); return () => bump(-1); }, []);
  return (
    <View style={styles.root}>
      <Pressable accessibilityLabel="Đóng" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.panel, sticker(0), { maxHeight }, short && styles.panelShort, kb > 0 && { marginBottom: kb }]}>
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
  // web: fixed để bám khung nhìn (trong khung đã xoay của Rotator thì bám khung xoay đó)
  root: { position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(42,10,16,0.55)' },
  panel: {
    backgroundColor: C.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 0,
    padding: 18, paddingBottom: 26, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center', overflow: 'hidden',
  },
  // màn ngang thấp: bảng rộng hơn, đệm ít hơn cho đủ chỗ
  panelShort: { maxWidth: 680, padding: 12, paddingBottom: 14, gap: 8 },
  // minHeight 0: vùng cuộn mới co được dưới chiều cao nội dung (không thì bảng tràn khỏi màn hình)
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { gap: 14 },
  grip: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.mist, alignSelf: 'center' },
  title: { fontSize: 20, fontWeight: '900' },
});
