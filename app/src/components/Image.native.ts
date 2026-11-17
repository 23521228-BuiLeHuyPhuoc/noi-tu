import { Image as ExpoImage, type ImageProps, type ImageSource } from 'expo-image';
import { createElement, useMemo } from 'react';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const svgCache = new Map<string, string>();

function nativeUri(uri: string): string {
  if (!uri.startsWith('data:image/svg+xml') || uri.slice(0, uri.indexOf(',')).includes(';base64')) return uri;
  const cached = svgCache.get(uri);
  if (cached) return cached;
  // Android's data-URI loader expects base64; preserve the SVG's UTF-8 bytes.
  const raw = decodeURIComponent(uri.slice(uri.indexOf(',') + 1));
  const bytes = Array.from(encodeURIComponent(raw).matchAll(/%([0-9a-f]{2})|([^%])/gi),
    (m) => m[1] ? parseInt(m[1], 16) : m[2].charCodeAt(0));
  let encoded = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    encoded += alphabet[(n >>> 18) & 63] + alphabet[(n >>> 12) & 63]
      + (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=')
      + (i + 2 < bytes.length ? alphabet[n & 63] : '=');
  }
  const result = `data:image/svg+xml;base64,${encoded}`;
  if (svgCache.size >= 256) svgCache.delete(svgCache.keys().next().value!);
  svgCache.set(uri, result);
  return result;
}

function normalizeSource(source: ImageProps['source']): ImageProps['source'] {
  if (typeof source === 'string') return nativeUri(source);
  if (Array.isArray(source)) return source.map((item) => normalizeSource(item) as ImageSource);
  if (source && typeof source === 'object' && 'uri' in source && source.uri) {
    return { ...source, uri: nativeUri(source.uri) };
  }
  return source;
}

function NativeImage({ source, ...props }: ImageProps) {
  const resolved = useMemo(() => normalizeSource(source), [source]);
  return createElement(ExpoImage, { ...props, source: resolved });
}

export const Image = Object.assign(NativeImage, { prefetch: ExpoImage.prefetch });
