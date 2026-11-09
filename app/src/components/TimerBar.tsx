import { StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { T } from '../ui';

/** Thanh thời gian: chuyển đỏ khi còn ≤ 5 giây */
export function TimerBar({ left, total, testID }: { left: number; total: number; testID?: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const hot = left <= 5;
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: hot ? C.danger : C.jade }]} />
      </View>
      <T testID={testID} style={[styles.num, hot && { color: C.danger }]}>{left}s</T>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: C.mist, borderWidth: 2, borderColor: C.ink, overflow: 'hidden' },
  fill: { height: '100%', transitionProperty: 'width', transitionDuration: '250ms' } as object,
  num: { width: 44, textAlign: 'right', fontWeight: '900', fontSize: 20 },
});
