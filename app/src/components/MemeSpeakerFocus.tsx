import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { VOICE_PERSONA_META, getPersonaDisplay, type MemePersona } from '../audioAssets';
import { renderDivaPortraitUri } from '../avatars';
import { getActiveMeme, subscribeActiveMeme } from '../memePlayback';
import { C } from '../theme';
import { T } from '../ui';
import { Image } from './Image';
import { UiIcon } from './Icons';
import { PortraitImage } from './PortraitImage';

export function DivaBadge({ persona, size = 32 }: { persona: MemePersona; size?: number }) {
  if (persona === 'game_fx') return <UiIcon name="Volume2" size={size} color={C.muted} />;
  const meta = VOICE_PERSONA_META[persona];
  return <Image source={{ uri: renderDivaPortraitUri(persona, meta.avatarOpts, meta.badgeBg) }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}
export function useSpeakingMemeFor(playerId?: string) {
  return useSyncExternalStore(subscribeActiveMeme, () => {
    const current = getActiveMeme();
    return !playerId || current?.speakerId === playerId ? current : null;
  }, () => null);
}
export function useVoicePulse(enabled: boolean) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!enabled) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.setValue(0); };
  }, [enabled, pulse]);
  return pulse;
}
export function MemeSpeakerFocus() {
  const active = useSpeakingMemeFor();
  const pulse = useVoicePulse(!!active);
  if (!active) return null;
  const meta = getPersonaDisplay(active.persona);
  return <View pointerEvents="none" testID="meme-speaker-focus" style={styles.position}>
    <View style={[styles.pill, { borderColor: meta.accent }]}>
      {active.speakerPortrait ? (
        <View testID="meme-speaker-portrait" style={styles.portrait}>
          <PortraitImage p={active.speakerPortrait} size={32} />
        </View>
      ) : <UiIcon name="Volume2" size={24} color={meta.accent} />}
      <View style={styles.copy}>
        <T numberOfLines={1} style={styles.title}>{active.speakerName ?? meta.shortName}</T>
        <T numberOfLines={1} style={styles.quote}>“{active.quote}”</T>
      </View>
      <View style={styles.meter}>{[8, 16, 11].map((height, index) => <Animated.View key={height} style={{ height, width: 3, borderRadius: 2, backgroundColor: meta.accent, transform: [{ scaleY: pulse.interpolate({ inputRange: [0, 1], outputRange: index === 1 ? [1, 0.4] : [0.4, 1] }) }] }} />)}</View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  position: { position: 'absolute', top: 6, left: 8, right: 8, alignItems: 'center', zIndex: 90 },
  pill: { maxWidth: '100%', height: 46, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, borderRadius: 14, borderWidth: 1, backgroundColor: C.paper },
  portrait: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden' },
  copy: { flexShrink: 1, maxWidth: 280 }, title: { fontSize: 12, fontWeight: '700', color: C.ink }, quote: { fontSize: 11, color: C.secondary },
  meter: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
