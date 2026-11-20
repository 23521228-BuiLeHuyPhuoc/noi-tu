import { memo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Mood } from '../../../shared/src/types';
import { avatarOf, portraitOf, type PortraitSource } from '../avatars';
import { EmojiIcon } from './Icons';
import { Image } from './Image';

export const PortraitImage = memo(function PortraitImage({ p, mood = 'normal', size, resolvedUri }: { p: PortraitSource; mood?: Mood; size: number; resolvedUri?: string }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const primary = resolvedUri ?? portraitOf(p, mood).uri;
  const uri = failedUri === primary ? portraitOf({ ...p, avatarUrl: undefined }, mood).uri : primary;
  const needFallbackUnderlay = !uri.startsWith('data:');
  return (
    <>
      {needFallbackUnderlay && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <EmojiIcon emoji={avatarOf(p.avatar).emoji} size={Math.max(16, Math.round(size * 0.56))} />
        </View>
      )}
      <Image source={{ uri }} onError={() => setFailedUri(primary)} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
    </>
  );
});
