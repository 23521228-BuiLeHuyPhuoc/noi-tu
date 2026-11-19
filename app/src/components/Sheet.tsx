import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardInset, useStableWindow } from '../hooks';
import { C } from '../theme';
import { T } from '../ui';
import { UiIcon, splitEdgeEmoji } from './Icons';

let openCount = 0;
const listeners = new Set<() => void>();
const bump = (d: number) => { openCount += d; listeners.forEach((l) => l()); };
export function useSheetOpen(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => openCount > 0, () => false);
}

/** Bảng trượt từ dưới lên theo chuẩn Warm Paper & Ink */
export function Sheet({
  title,
  onClose,
  stickyTop,
  stickyBottom,
  scroll = true,
  children,
}: {
  title: string;
  onClose: () => void;
  stickyTop?: ReactNode;
  stickyBottom?: ReactNode;
  scroll?: boolean;
  children: ReactNode;
}) {
  const kb = useKeyboardInset();
  const { height } = useStableWindow();
  const maxHeight = kb > 0 && Platform.OS === 'web'
    ? Math.max(220, height - kb - 10) : Math.max(120, Math.round(height * 0.92));
  const short = height < 520;
  useEffect(() => { bump(1); return () => bump(-1); }, []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => back.remove();
  }, [onClose]);

  const parsed = splitEdgeEmoji(title);
  const cleanTitle = (parsed.text || title).replace(/!+$/g, '').trim();

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Đóng"
          style={styles.backdrop}
          onPress={onClose}
        />
        <View
          style={[
            styles.panel,
            { maxHeight },
            short && styles.panelShort,
            kb > 0 && Platform.OS === 'web' && { marginBottom: kb },
            Platform.OS === 'web'
              ? ({
                  animation: 'xl-sheet-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transition: 'margin-bottom 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  boxShadow: '0 -8px 28px rgba(31, 27, 22, 0.16)',
                } as object)
              : null,
          ]}
        >
          <View style={styles.grip} />
          <View style={styles.head}>
            <T numberOfLines={1} style={styles.title}>{cleanTitle}</T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bảng"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.72 }]}
            >
              <UiIcon name="X" size={16} color={C.secondary} strokeWidth={1.75} />
            </Pressable>
          </View>
          {stickyTop ? <View style={styles.stickyWrap}>{stickyTop}</View> : null}
          {scroll ? (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            <View style={styles.bodyFixed}>
              {children}
            </View>
          )}
          {stickyBottom ? <View style={styles.stickyWrap}>{stickyBottom}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 80, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(28, 25, 23, 0.48)' },
  panel: {
    backgroundColor: C.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.borderSubtle,
    padding: 16,
    paddingBottom: 20,
    gap: 12,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  panelShort: { maxWidth: 680, padding: 12, paddingBottom: 14, gap: 8 },
  stickyWrap: { flexShrink: 0 },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { gap: 12 },
  bodyFixed: { flexShrink: 1, minHeight: 0, gap: 10 },
  grip: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.borderStrong, alignSelf: 'center' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSubtle,
  },
  title: { fontSize: 17, fontWeight: '600', color: C.ink, flex: 1, minWidth: 0 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
