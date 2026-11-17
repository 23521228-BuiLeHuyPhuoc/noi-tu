import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import { DICE_FRAME_STRIDE, TRAY_HX, type DiceRollView, type ThrowImpulse } from '../../../shared/src/dice';
import { TyPhuDie } from './TyPhuFx';

export function TyPhuDice3D({ width, height, roll, clockOffset, values, canThrow, onThrow }: {
  width: number; height: number; roll: DiceRollView | null; clockOffset: number;
  values: [number, number] | null; canThrow: boolean; onThrow: (impulse?: ThrowImpulse) => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const live = useRef({ canThrow, onThrow, clockOffset });
  useEffect(() => { live.current = { canThrow, onThrow, clockOffset }; });
  useEffect(() => {
    if (!roll) return;
    const initial = Math.max(0, Math.min(roll.ms * 0.35, Date.now() + live.current.clockOffset - roll.startedAt));
    const start = performance.now() - initial;
    let raf = 0;
    const tick = () => {
      const next = Math.min(roll.ms, performance.now() - start);
      setElapsed(next);
      if (next < roll.ms) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [roll]);

  const gestures = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canThrow,
    onMoveShouldSetPanResponder: () => canThrow,
    onPanResponderRelease: (_, gesture) => {
      if (!canThrow) return;
      const length = Math.hypot(gesture.dx, gesture.dy);
      if (length < 8) onThrow();
      else onThrow({
        x: gesture.dx / length, z: gesture.dy / length,
        p: Math.min(1, Math.max(0.3, Math.hypot(gesture.vx, gesture.vy) / 2.5)),
      });
    },
  }), [canThrow, onThrow]);
  const rolling = !!roll && elapsed < roll.ms;
  const size = Math.max(20, Math.min(52, height * 0.4, width / 5));
  const scale = Math.min(width / (2 * TRAY_HX + 1.5), height / 4);
  const count = roll ? Math.floor(roll.frames.length / DICE_FRAME_STRIDE) : 0;
  const frame = Math.max(0, Math.min(count - 1, Math.floor(elapsed * (roll?.fps ?? 0) / 1000)));

  return (
    <View
      testID="dice-tray"
      accessibilityLabel={canThrow ? 'Chạm hoặc vuốt để tung xúc xắc' : 'Khay xúc xắc'}
      accessibilityRole={canThrow ? 'button' : undefined}
      style={{ width, height }}
      {...gestures.panHandlers}
    >
      {[0, 1].map((k) => {
        const offset = frame * DICE_FRAME_STRIDE + k * 7;
        const x = count ? roll!.frames[offset] : k ? 1 : -1;
        const y = count ? roll!.frames[offset + 1] : 0.5;
        const z = count ? roll!.frames[offset + 2] : 0;
        const value = rolling ? (Math.floor(elapsed / 70) + k * 3) % 6 + 1 : values?.[k] ?? null;
        return (
          <View key={k} style={{
            position: 'absolute',
            left: Math.max(0, Math.min(width - size - 6, width / 2 + x * scale - size / 2)),
            top: Math.max(0, Math.min(height - size - 14, height * 0.5 + z * scale * 0.55 - (y - 0.5) * scale * 0.45 - size / 2)),
          }}>
            <TyPhuDie testID={`die-${k + 1}`} size={size} phase={rolling ? 'roll' : 'reveal'} elapsed={elapsed} seed={k} value={value} />
          </View>
        );
      })}
    </View>
  );
}
