import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useKeyboardInset, useStableWindow } from '../hooks';
import { C, sticker } from '../theme';
import { T } from '../ui';
import { EmojiIcon, UiIcon, splitEdgeEmoji } from './Icons';

let openCount = 0;
const listeners = new Set<() => void>();
const bump = (d: number) => { openCount += d; listeners.forEach((l) => l()); };
export function useSheetOpen(): boolean {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => openCount > 0, () => false);
}

/** Bảng trượt từ dưới lên bo tròn mềm mại, hỗ trợ `stickyTop`, `stickyBottom` & `scroll={false}` tránh lồng ScrollView */
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
  const titleEmoji = parsed.leading ?? parsed.trailing;

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
            sticker(0),
            { maxHeight },
            short && styles.panelShort,
            kb > 0 && Platform.OS === 'web' && { marginBottom: kb },
            Platform.OS === 'web'
              ? ({
                  animation: 'xl-sheet-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transition: 'margin-bottom 180ms cubic-bezier(0.22, 1, 0.36, 1)',
                  boxShadow: '0 -4px 16px rgba(15,23,42,0.18)',
                } as object)
              : null,
          ]}
        >
          <View style={styles.grip} />
          <View style={styles.head}>
            <View style={styles.titleRow}>
              {titleEmoji && (
                <View style={styles.titleIconWrap}>
                  <EmojiIcon emoji={titleEmoji} size={22} />
                </View>
              )}
              <T style={styles.title}>{parsed.text || title}</T>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Đóng bảng"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.7 }]}
            >
              <UiIcon name="X" size={18} color={C.ink} strokeWidth={2.5} />
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.56)' },
  panel: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomWidth: 0,
    padding: 16, paddingBottom: 20, gap: 12, width: '100%', maxWidth: 540, alignSelf: 'center', overflow: 'hidden',
  },
  panelShort: { maxWidth: 680, padding: 12, paddingBottom: 14, gap: 8 },
  stickyWrap: { flexShrink: 0 },
  body: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  bodyContent: { gap: 14 },
  bodyFixed: { flexShrink: 1, minHeight: 0, gap: 10 },
  grip: { width: 42, height: 4.5, borderRadius: 3, backgroundColor: 'rgba(28,32,36,0.16)', alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  titleIconWrap: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 19, fontWeight: '900', color: C.ink, flexShrink: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
});
