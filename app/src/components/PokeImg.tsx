/**
 * Hình 3D của món chọc (Microsoft Fluent Emoji, MIT, (c) Microsoft) tải từ jsDelivr.
 * Không tải được thì dùng ký tự emoji gốc. Hình đã tải được nhớ lại để lần sau hiện ngay.
 */
import { memo, useEffect, useState } from 'react';
import { Image, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { pokeImageUrl, type PokeItem } from '../../../shared/src/pokes';

type State = 'ok' | 'fail';
const known = new Map<string, State>();
const waiting = new Map<string, Promise<State>>();

/** tải trước một hình; hết `ms` mà chưa xong thì coi như lỗi (nhưng vẫn nhớ kết quả nếu tải xong sau đó) */
export function preloadPoke(p: Pick<PokeItem, 'fluent'>, ms = 2200): Promise<State> {
  const url = pokeImageUrl(p);
  const k = known.get(url);
  if (k) return Promise.resolve(k);
  if (typeof window === 'undefined' || typeof window.Image === 'undefined') return Promise.resolve('fail');
  let pending = waiting.get(url);
  if (!pending) {
    pending = new Promise<State>((resolve) => {
      const img = new window.Image();
      img.onload = () => { known.set(url, 'ok'); waiting.delete(url); resolve('ok'); };
      img.onerror = () => { known.set(url, 'fail'); waiting.delete(url); resolve('fail'); };
      img.src = url;
    });
    waiting.set(url, pending);
  }
  return Promise.race([pending, new Promise<State>((r) => setTimeout(() => r('fail'), ms))]);
}

/** trạng thái tải của hình: undefined = đang chờ */
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

const SHADOW = { filter: 'drop-shadow(0px 4px 4px rgba(42,10,16,0.35))' } as object;

/** hình món chọc vuông `size` px; `ok` = false (hoặc hình lỗi) thì hiện emoji gốc */
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
        <Text style={[{ fontSize: size * 0.78, lineHeight: size, textAlign: 'center', width: size }, shadow ? ({ textShadow: '0px 3px 3px rgba(42,10,16,0.35)' } as object) : null]}>{item.emoji}</Text>
      )}
    </View>
  );
});
