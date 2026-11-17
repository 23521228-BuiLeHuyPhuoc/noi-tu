import { StyleSheet, View } from 'react-native';
import { useSecondsLeft } from '../hooks';
import { C } from '../theme';
import { T } from '../ui';

/** Thanh thời gian: chuyển đỏ khi còn ≤ 5 giây */
export function TimerBar({ left, total, testID, lightText }: { left: number; total: number; testID?: string; lightText?: boolean }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const hot = left <= 5;
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: hot ? C.danger : C.jade }]} />
      </View>
      <T testID={testID} style={[styles.num, lightText && { color: '#F8FAFC' }, hot && { color: C.danger }]}>{left}s</T>
    </View>
  );
}

/** Thanh đếm ngược tự cô lập tick thời gian, tránh ép cả màn hình game vẽ lại mỗi giây */
export function CountdownBar({ endsAt, total, clockOffset = 0, testID, lightText }: { endsAt: number | null; total: number; clockOffset?: number; testID?: string; lightText?: boolean }) {
  const left = useSecondsLeft(endsAt, clockOffset, total);
  return <TimerBar left={left} total={total} testID={testID} lightText={lightText} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  track: { flex: 1, height: 12, borderRadius: 6, backgroundColor: C.mist, borderWidth: 2, borderColor: C.ink, overflow: 'hidden' },
  fill: { height: '100%', transitionProperty: 'width', transitionDuration: '250ms' } as object,
  num: { width: 44, textAlign: 'right', fontWeight: '900', fontSize: 20 },
});
