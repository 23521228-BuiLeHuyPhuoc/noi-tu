import { useLayoutEffect, useRef, type ComponentRef } from 'react';
import { AppState, Platform, View } from 'react-native';

export type WindowRect = Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom' | 'width' | 'height'>;
type MeasuredView = ComponentRef<typeof View>;
const bounds = new WeakMap<MeasuredView, WindowRect>();
const targets = new Map<string, MeasuredView>();
const views = new Set<MeasuredView>();
let timer: ReturnType<typeof setInterval> | undefined;

function measure(node: MeasuredView) {
  node.measureInWindow((left, top, width, height) => {
    if (!views.has(node) || ![left, top, width, height].every(Number.isFinite)) return;
    bounds.set(node, { left, top, right: left + width, bottom: top + height, width, height });
  });
}

// Socket effects need synchronous coordinates. Refresh mounted native targets
// so scrolling and keyboard movement do not leave their positions stale.
export function useMeasuredView(id?: string) {
  const ref = useRef<MeasuredView>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (Platform.OS === 'web' || !node) return;
    views.add(node);
    if (id) targets.set(id, node);
    measure(node);
    timer ??= setInterval(() => {
      if (AppState.currentState === 'active') views.forEach(measure);
    }, 120);
    return () => {
      views.delete(node);
      bounds.delete(node);
      if (id && targets.get(id) === node) targets.delete(id);
      if (!views.size) { clearInterval(timer); timer = undefined; }
    };
  }, [id]);
  return ref;
}

export function viewRect(node: MeasuredView | null): WindowRect | null {
  if (!node) return null;
  if (Platform.OS === 'web') return (node as unknown as HTMLElement).getBoundingClientRect();
  return bounds.get(node) ?? null;
}

export function targetRect(id: string): WindowRect | null {
  const node = targets.get(id);
  return node ? bounds.get(node) ?? null : null;
}
