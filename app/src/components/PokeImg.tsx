import { Image } from './Image';
/**
 * Hình 3D của món chọc (Microsoft Fluent Emoji, MIT, (c) Microsoft) tải từ jsDelivr.
 * Không tải được (hoặc offline) thì dùng bộ vector Fluent Flat SVG ngoại tuyến đồng bộ.
 */
import { memo, useEffect, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { pokeImageUrl, type PokeItem } from '../../../shared/src/pokes';
import { EmojiIcon } from './Icons';

type State = 'ok' | 'fail';
const known = new Map<string, State>();
const waiting = new Map<string, Promise<State>>();

export function preloadPoke(p: Pick<PokeItem, 'fluent'>, ms = 2200): Promise<State> {
  const url = pokeImageUrl(p);
  const k = known.get(url);
  if (k) return Promise.resolve(k);
  let pending = waiting.get(url);
  if (!pending) {
    pending = Platform.OS !== 'web' ? Image.prefetch(url).then((ok): State => {
      const state = ok ? 'ok' : 'fail';
      known.set(url, state);
      waiting.delete(url);
      return state;
    }).catch((): State => { waiting.delete(url); return 'fail'; }) : new Promise<State>((resolve) => {
      const img = new window.Image();
      img.onload = () => { known.set(url, 'ok'); waiting.delete(url); resolve('ok'); };
      img.onerror = () => { known.set(url, 'fail'); waiting.delete(url); resolve('fail'); };
      img.src = url;
    });
    waiting.set(url, pending);
  }
  return Promise.race([pending, new Promise<State>((r) => setTimeout(() => r('fail'), ms))]);
}

export function usePokeImage(p: Pick<PokeItem, 'fluent'>): State | undefined {
  const url = pokeImageUrl(p);
  const [got, setS] = useState<{ url: string; s: State } | undefined>();
  useEffect(() => {
    let alive = true;
    if (known.get(url)) return;
    void preloadPoke(p).then((r) => { if (alive) setS({ url, s: r }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
  return known.get(url) ?? (got?.url === url ? got.s : undefined);
}

const SHADOW = Platform.OS === 'web' ? { filter: 'drop-shadow(0px 4px 5px rgba(15,23,42,0.32))' } as object : {};

/** hình món chọc vuông `size` px; `ok` = false (hoặc hình lỗi) thì hiện vector Fluent SVG */
export const PokeImg = memo(function PokeImg({ item, size, ok = true, shadow = true, style }: {
  item: Pick<PokeItem, 'fluent' | 'emoji'>; size: number; ok?: boolean; shadow?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [err, setErr] = useState(false);
  const useImg = ok && !err;
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      {useImg ? (
        <Image
          source={{ uri: pokeImageUrl(item) }}
          resizeMode="contain"
          onError={() => setErr(true)}
          accessibilityLabel={item.emoji}
          style={[{ width: size, height: size }, shadow ? SHADOW : null]}
        />
      ) : (
        <View style={shadow ? SHADOW : undefined}>
          <EmojiIcon emoji={item.emoji} size={Math.round(size * 0.86)} />
        </View>
      )}
    </View>
  );
});
