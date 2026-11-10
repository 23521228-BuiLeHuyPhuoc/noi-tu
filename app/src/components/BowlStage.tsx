import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Image, StyleSheet, View } from 'react-native';
import type { BauCuaSymbol, BauCuaView } from '../../../shared/src/types';
import { ART } from '../baucuaArt';
import { SYMBOL } from '../messages';
import { T } from '../ui';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => mounted && setReduced(value));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return reduced;
}

/** Faces exist only after the server publishes the result; the covered dice are blank. */
export function BowlStage({ step, dice, compact }: { step: BauCuaView['step']; dice: BauCuaSymbol[] | null | undefined; compact: boolean }) {
  const reduced = useReducedMotion();
  const [lift] = useState(() => new Animated.Value(step === 'result' ? 1 : 0));
  const [shake] = useState(() => new Animated.Value(0));
  const open = step === 'result' && !!dice;
  useEffect(() => {
    const animation = Animated.timing(lift, { toValue: open ? 1 : 0, duration: reduced ? 0 : open ? 780 : 180, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [open, lift, reduced]);
  useEffect(() => {
    shake.setValue(0);
    if (step !== 'rolling' || reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 85, useNativeDriver: false }),
      Animated.timing(shake, { toValue: -1, duration: 85, useNativeDriver: false }),
    ]));
    animation.start();
    return () => { animation.stop(); shake.setValue(0); };
  }, [step, shake, reduced]);
  return (
    <View testID="bc-bowl-stage" accessibilityLabel={open ? 'Bát đã mở, ba xúc xắc trên đĩa' : 'Bát úp kín ba xúc xắc'} style={[s.stage, compact && { height: 112 }]}>
      <View style={s.plateShadow} />
      <View style={s.plate}><View style={s.plateRim} /><View style={s.plateWell} /></View>
      <View style={s.dice}>
        {[0, 1, 2].map((i) => <View key={i} testID={open ? 'bc-die' : undefined} accessibilityLabel={open && dice?.[i] ? SYMBOL[dice[i]].name : undefined} style={[s.die, { transform: [{ rotate: `${[-12, 7, -5][i]}deg` }, { translateY: i === 1 ? -4 : 3 }] }]}>
          {open && dice?.[i] && <Image source={{ uri: ART[dice[i]] }} style={s.face} />}
        </View>)}
      </View>
      <Animated.View testID="bc-bowl" style={[s.bowlAssembly, { transform: [
        { translateX: Animated.add(open ? lift.interpolate({ inputRange: [0, 1], outputRange: [0, 91] }) : 0, shake.interpolate({ inputRange: [-1, 1], outputRange: [-3, 3] })) },
        { translateY: open ? lift.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, -49, -30] }) : 0 },
        { rotate: open ? lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '29deg'] }) : '0deg' },
        { scale: open ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.72] }) : 1 },
      ] }]}>
        <View style={s.foot}><View style={s.footInset} /></View>
        <View style={s.bowl}><View style={s.shine} /><View style={s.motif}><T style={s.flower}>✦</T><T style={s.motifText}>PHÚC</T><T style={s.flower}>✦</T></View><View style={s.bowlBand} /></View>
        <View style={s.lip} />
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { width: 286, height: 132, marginTop: 4, alignItems: 'center', justifyContent: 'flex-end' },
  plateShadow: { position: 'absolute', bottom: 3, width: 238, height: 54, borderRadius: 120, backgroundColor: '#4A261B35' },
  plate: { position: 'absolute', bottom: 10, width: 258, height: 79, borderRadius: 140, backgroundColor: '#E0C99A', borderWidth: 2, borderColor: '#8A6941', borderBottomWidth: 7 },
  plateRim: { position: 'absolute', inset: 5, borderRadius: 130, borderWidth: 2, borderColor: '#AD3B28', backgroundColor: '#FFF4D8' },
  plateWell: { position: 'absolute', left: 24, right: 24, top: 14, bottom: 12, borderRadius: 100, backgroundColor: '#E8D7B1', borderWidth: 1, borderColor: '#C4A477' },
  dice: { position: 'absolute', bottom: 31, flexDirection: 'row', gap: 7 },
  die: { width: 48, height: 48, backgroundColor: '#FFF2CE', borderWidth: 1.5, borderColor: '#B18C58', borderBottomWidth: 5, borderRightWidth: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center', boxShadow: '1px 4px 3px #55362140' },
  face: { width: 40, height: 40 },
  bowlAssembly: { position: 'absolute', width: 224, height: 112, bottom: 21, alignItems: 'center' },
  foot: { position: 'absolute', top: 0, width: 70, height: 20, borderRadius: 40, backgroundColor: '#9D251E', borderWidth: 2, borderColor: '#69241D' },
  footInset: { margin: 4, height: 6, borderRadius: 20, backgroundColor: '#D3A559' },
  bowl: { position: 'absolute', top: 12, width: 216, height: 95, borderTopLeftRadius: 108, borderTopRightRadius: 108, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, backgroundColor: '#A62D22', borderColor: '#63231C', borderWidth: 2, overflow: 'hidden', boxShadow: 'inset -15px -8px 18px #641C20' },
  shine: { position: 'absolute', left: 31, top: 10, width: 28, height: 64, borderRadius: 40, backgroundColor: '#DC62443D', transform: [{ rotate: '24deg' }] },
  motif: { position: 'absolute', bottom: 23, left: 43, right: 43, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  motifText: { color: '#F6D28A', fontSize: 18, fontWeight: '900', letterSpacing: 3 },
  flower: { color: '#EBC77B', fontSize: 19 },
  bowlBand: { position: 'absolute', bottom: 9, left: 0, right: 0, height: 7, borderTopWidth: 2, borderBottomWidth: 2, borderColor: '#D9AE64' },
  lip: { position: 'absolute', bottom: 0, width: 224, height: 15, borderRadius: 30, backgroundColor: '#7D221D', borderColor: '#D2A05B', borderWidth: 2, borderBottomWidth: 4 },
});
