/**
 * Host WebGL full-bleed cho sân khấu 3D v4 của "Sàn Diễn Xóm Lầy" (`thoitrang`)
 * và hook `useThoiTrangSnapshots` tạo ảnh chân dung/toàn thân qua 1 offscreen renderer dùng chung.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ThoiTrangOutfit, ThoiTrangPoseId } from '../../../shared/src/thoitrang';
import { outfitHash } from '../../../shared/src/thoitrang-catalog';
import {
  createThoiTrangEngine,
  snapshotThoiTrangOutfit,
  type ThoiTrangEngine,
  type ThoiTrangSnapshotFraming,
  type ThoiTrangStageMode,
} from '../thoitrang3d';
import { T } from '../ui';

export interface ThoiTrangDollCanvasProps {
  outfit: ThoiTrangOutfit;
  mode: ThoiTrangStageMode;
  pose?: ThoiTrangPoseId;
  poseNonce?: number;
  catwalkNonce?: number;
  interactive?: boolean;
  viewOffset?: 'auto' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ThoiTrangDollCanvas({
  outfit,
  mode,
  pose = 'idle',
  poseNonce = 0,
  catwalkNonce = 0,
  interactive = true,
  viewOffset = 'auto',
  style,
  testID = 'tt-doll-canvas',
}: ThoiTrangDollCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ThoiTrangEngine | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const outfitRef = useRef(outfit);
  const modeRef = useRef(mode);
  const interactiveRef = useRef(interactive);
  useLayoutEffect(() => {
    outfitRef.current = outfit;
    modeRef.current = mode;
    interactiveRef.current = interactive;
  }, [outfit, mode, interactive]);

  const hash = outfitHash(outfit);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const host = hostRef.current;
    if (!host) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.cursor = interactiveRef.current ? 'grab' : 'default';
    host.appendChild(canvas);

    let engine: ThoiTrangEngine | null = null;
    try {
      const rect = host.getBoundingClientRect();
      engine = createThoiTrangEngine(canvas, {
        mode: modeRef.current,
        width: Math.max(240, rect.width || window.innerWidth),
        height: Math.max(240, rect.height || window.innerHeight),
        viewOffset,
      });
      engine.setOutfit(outfitRef.current);
      engineRef.current = engine;
    } catch {
      window.setTimeout(() => setWebglFailed(true), 0);
      canvas.remove();
      return;
    }

    let dragX: number | null = null;
    const onDown = (e: PointerEvent) => {
      if (!interactiveRef.current || modeRef.current !== 'wardrobe') return;
      dragX = e.clientX;
      canvas.style.cursor = 'grabbing';
      try { canvas.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };
    const onMove = (e: PointerEvent) => {
      if (dragX === null || !interactiveRef.current || modeRef.current !== 'wardrobe') return;
      engine?.orbit((e.clientX - dragX) * 0.01);
      dragX = e.clientX;
    };
    const onUp = (e: PointerEvent) => {
      dragX = null;
      canvas.style.cursor = interactiveRef.current ? 'grab' : 'default';
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    };
    const onWheel = (e: WheelEvent) => {
      if (!interactiveRef.current || modeRef.current !== 'wardrobe') return;
      e.preventDefault();
      engine?.zoom(e.deltaY * 0.0025);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver((entries) => {
          const box = entries[0]?.contentRect;
          if (box && box.width > 10 && box.height > 10) engine?.resize(box.width, box.height);
        })
      : null;
    ro?.observe(host);

    return () => {
      ro?.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
      engineRef.current = null;
      engine?.dispose();
      canvas.remove();
    };
  }, [viewOffset]);

  useEffect(() => {
    engineRef.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    engineRef.current?.setOutfit(outfitRef.current);
  }, [hash]);

  useEffect(() => {
    if (mode === 'runway') engineRef.current?.pose(pose);
  }, [mode, pose, poseNonce]);

  useEffect(() => {
    if (mode === 'runway' && catwalkNonce > 0) engineRef.current?.catwalk();
  }, [mode, catwalkNonce]);

  if (Platform.OS !== 'web' || webglFailed) {
    return (
      <View testID={testID} style={[styles.fallback, style]}>
        <T style={styles.fallbackTxt}>
          {webglFailed ? 'Trình duyệt chưa hỗ trợ WebGL 3D' : 'Sân khấu 3D khả dụng trên bản Web'}
        </T>
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.wrap, style]}>
      <div ref={hostRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} />
    </View>
  );
}

const snapshotCache = new Map<string, string>();

/**
 * Chụp chân dung / toàn thân bằng 1 WebGLRenderer offscreen dùng chung, cache theo `outfitHash`.
 */
export function useThoiTrangSnapshots(
  outfits: Record<string, ThoiTrangOutfit>,
  framing: ThoiTrangSnapshotFraming = 'portrait',
  width = 128,
  height = 128,
): Record<string, string> {
  const [shots, setShots] = useState<Record<string, string>>({});
  const entries = Object.entries(outfits);
  const sig = entries.map(([id, o]) => `${id}=${outfitHash(o)}`).sort().join(';');
  const outfitsRef = useRef(outfits);
  useLayoutEffect(() => {
    outfitsRef.current = outfits;
  }, [outfits]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    const ids = Object.keys(outfitsRef.current);

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const next: Record<string, string> = {};
      for (const id of ids) {
        const o = outfitsRef.current[id];
        if (!o) continue;
        const key = `${framing}:${width}x${height}:${outfitHash(o)}`;
        let url = snapshotCache.get(key);
        if (!url) {
          url = snapshotThoiTrangOutfit(o, width, height, framing);
          if (url) {
            if (snapshotCache.size > 160) {
              const firstKey = snapshotCache.keys().next().value;
              if (firstKey) snapshotCache.delete(firstKey);
            }
            snapshotCache.set(key, url);
          }
        }
        if (url) next[id] = url;
      }
      if (!cancelled) setShots(next);
    }, 24);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sig, framing, width, height]);

  return shots;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fde4f1',
    padding: 16,
  },
  fallbackTxt: { color: '#3b2a3f', fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
