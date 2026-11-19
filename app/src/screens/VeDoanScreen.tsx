import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import {
  buildVeDoanShapePoints,
  computeFloodFillPath,
  findHitStrokeIndex,
  sprayStrokeToPath,
  VE_DOAN_COLORS,
  VE_DOAN_WIDTHS,
  type VeDoanStroke,
  type VeDoanTool,
  type VeDoanView,
} from '../../../shared/src/vedoan';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { backdropPalette, C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { useOnChange, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { Button, T } from '../ui';
import { Shell } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Image } from '../components/Image';
import { KeyboardLift } from '../components/KeyboardLift';
import { UiIcon, type UiIconName } from '../components/Icons';

const TOOL_META: { id: VeDoanTool; label: string; icon?: UiIconName }[] = [
  { id: 'pen', label: 'Bút', icon: 'Pencil' },
  { id: 'spray', label: 'Xịt' },
  { id: 'fill', label: 'Tô', icon: 'Palette' },
  { id: 'eraser', label: 'Tẩy', icon: 'Eraser' },
  { id: 'line', label: 'Thẳng' },
  { id: 'rect', label: 'Vuông' },
  { id: 'circle', label: 'Tròn' },
];

function ToolGlyph({ tool, icon, active }: { tool: VeDoanTool; icon?: UiIconName; active: boolean }) {
  const color = active ? C.ink : C.secondary;
  if (icon) return <UiIcon name={icon} size={13} color={color} />;
  if (tool === 'spray') {
    return (
      <View style={{ width: 13, height: 13, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 1.5, marginBottom: 1, marginLeft: 3 }}>
          <View style={{ width: 2, height: 2, borderRadius: 1, backgroundColor: color }} />
          <View style={{ width: 2.5, height: 2.5, borderRadius: 1.5, backgroundColor: color }} />
        </View>
        <View style={{ width: 7, height: 6.5, borderRadius: 2, borderWidth: 1.4, borderColor: color }} />
      </View>
    );
  }
  if (tool === 'line') {
    return (
      <View
        style={{
          width: 11,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
          transform: [{ rotate: '-35deg' }],
        }}
      />
    );
  }
  if (tool === 'rect') {
    return <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: color }} />;
  }
  return <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: color }} />;
}

function strokeMarkup(s: VeDoanStroke, all: VeDoanStroke[], idx: number): string {
  const tool = s.tool ?? 'pen';
  if (tool === 'fill') {
    const d = s.fillPath ?? (s.points[0] ? computeFloodFillPath(all.slice(0, idx), s.points[0][0], s.points[0][1]) : '');
    return d ? `<path d="${d}" fill="${s.color}"/>` : '';
  }
  if (tool === 'spray') {
    const d = sprayStrokeToPath(s);
    return d ? `<path d="${d}" fill="${s.color}"/>` : '';
  }
  const strokeColor = tool === 'eraser' ? '#FFFFFF' : s.color;
  if (!s.points.length) return '';
  if (s.points.length === 1) {
    const [x, y] = s.points[0];
    return `<circle cx="${x}" cy="${y}" r="${Math.max(4, s.width * 0.7)}" fill="${strokeColor}"/>`;
  }
  const pts = s.points.map(([x, y]) => `${x},${y}`).join(' ');
  return `<polyline fill="none" stroke="${strokeColor}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>`;
}

function strokesToSvgUri(strokes: VeDoanStroke[]): string {
  const parts = strokes.map((s, idx) => strokeMarkup(s, strokes, idx)).filter(Boolean);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" preserveAspectRatio="none">${parts.join('')}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface WebPointerEvt {
  clientX: number;
  clientY: number;
  pointerId?: number;
  currentTarget: {
    getBoundingClientRect: () => { left: number; top: number; width: number; height: number };
    setPointerCapture?: (id: number) => void;
  };
}

const VeDoanGuessDock = memo(function VeDoanGuessDock({
  resetKey,
  busy,
  err,
  onClearErr,
  onSubmit,
}: {
  resetKey: string;
  busy: boolean;
  err: string | null;
  onClearErr: () => void;
  onSubmit: (clean: string) => Promise<boolean>;
}) {
  const [guess, setGuess] = useState('');
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    if (guess) setGuess('');
  }

  const handleSubmit = async () => {
    const clean = guess.trim();
    if (!clean || busy) return;
    const ok = await onSubmit(clean);
    if (ok) setGuess('');
  };

  return (
    <KeyboardLift>
      <View style={styles.dock}>
        {err && <T style={styles.err}>{err}</T>}
        <View style={styles.guessRow}>
          <TextInput
            testID="vd-guess-input"
            value={guess}
            onChangeText={(t) => {
              setGuess(t);
              if (err) onClearErr();
            }}
            onSubmitEditing={() => void handleSubmit()}
            placeholder="Gõ từ bạn đoán tại đây..."
            placeholderTextColor={C.muted}
            maxLength={60}
            returnKeyType="send"
            blurOnSubmit={false}
            style={styles.input}
          />
          <Button
            testID="vd-guess-submit"
            disabled={busy || !guess.trim()}
            iconNode={<UiIcon name="Send" size={15} color={busy || !guess.trim() ? C.muted : C.onSon} />}
            title="Đoán"
            onPress={() => void handleSubmit()}
          />
        </View>
      </View>
    </KeyboardLift>
  );
});

export function VeDoanScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as VeDoanView;
  const me = game.me ?? '';
  const isDrawer = view.drawerId === me;
  const bp = backdropPalette(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width, height } = useStableWindow();
  const wide = width >= 820;
  const compact = height < 720 || width < 380;

  const [tool, setTool] = useState<VeDoanTool>('pen');
  const [eraserMode, setEraserMode] = useState<'pixel' | 'object'>('pixel');
  const [color, setColor] = useState<string>(VE_DOAN_COLORS[0]);
  const [brush, setBrush] = useState<number>(VE_DOAN_WIDTHS[1]);
  const [draft, setDraft] = useState<VeDoanStroke | null>(null);
  const [erasedTracker, setErasedTracker] = useState<{ turn: number; ids: number[] }>({ turn: -1, ids: [] });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const lastFeed = view.feed[view.feed.length - 1];
  useOnChange(lastFeed?.id ?? 0, (id) => {
    if (!id || !lastFeed || lastFeed.hit) return;
    if (lastFeed.close) {
      playMemePool('twist', { cooldownMs: 1200 });
      play('sparkle');
    } else if (lastFeed.playerId === me) {
      playMemePool('wrong', { cooldownMs: 900 });
      play('error');
    } else {
      playMemePool('wrong', { cooldownMs: 2000 });
    }
  });

  useOnChange(view.guessedIds.length, (len) => {
    if (len > 0) {
      playMemePool('correct', { cooldownMs: 1000 });
      play('stamp');
    }
  });

  useOnChange(view.phase, (ph) => {
    if (ph === 'pick_word') {
      playMemePool('welcome', { cooldownMs: 2600 });
    } else if (ph === 'drawing') {
      playMemePool('turn_move', { cooldownMs: 2200 });
    } else if (ph === 'round_end') {
      playMemePool(view.guessedIds.length === 0 ? 'wrong' : 'win', { cooldownMs: 1400 });
    }
  });

  const canvasRef = useRef<ComponentRef<typeof View>>(null);
  const feedScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 320, h: 320 });
  const originRef = useRef<{ px: number; py: number } | null>(null);
  const draftPtsRef = useRef<[number, number][]>([]);
  const shapeStartRef = useRef<[number, number] | null>(null);
  const spraySeedRef = useRef(0);
  const sprayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const erasedInFlightRef = useRef<{ turn: number; set: Set<number> }>({ turn: -1, set: new Set() });
  const drawingRef = useRef(false);
  const draftRafRef = useRef<number | null>(null);

  const stopSprayTimer = () => {
    if (sprayTimerRef.current !== null) {
      clearInterval(sprayTimerRef.current);
      sprayTimerRef.current = null;
    }
  };

  useEffect(() => () => stopSprayTimer(), []);

  useEffect(() => {
    const t = setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [view.feed.length]);

  const effectiveWidth = tool === 'eraser' ? (brush === 4 ? 12 : brush === 9 ? 22 : 34) : brush;
  const effectiveColor = tool === 'eraser' ? '#FFFFFF' : color;

  const flushDraftFrame = (curTool: VeDoanTool, c: string, w: number, spraySeed?: number) => {
    const nextDraft: VeDoanStroke = {
      tool: curTool,
      color: c,
      width: w,
      points: [...draftPtsRef.current],
      ...(curTool === 'spray' && spraySeed !== undefined ? { seed: spraySeed } : {}),
    };
    if (draftRafRef.current !== null || typeof requestAnimationFrame === 'undefined') {
      if (typeof requestAnimationFrame === 'undefined') {
        setDraft(nextDraft);
      }
      return;
    }
    draftRafRef.current = requestAnimationFrame(() => {
      draftRafRef.current = null;
      if (drawingRef.current) {
        setDraft({
          tool: curTool,
          color: c,
          width: w,
          points: [...draftPtsRef.current],
          ...(curTool === 'spray' && spraySeed !== undefined ? { seed: spraySeed } : {}),
        });
      }
    });
  };

  const canDraw = isDrawer && view.phase === 'drawing';

  const eraseObjectAt = (pt: [number, number]) => {
    if (erasedInFlightRef.current.turn !== view.turnIndex) {
      erasedInFlightRef.current = { turn: view.turnIndex, set: new Set() };
    }
    const present = new Set(view.strokes.map((s) => s.id).filter((n): n is number => n !== undefined));
    for (const id of [...erasedInFlightRef.current.set]) {
      if (!present.has(id)) erasedInFlightRef.current.set.delete(id);
    }
    const candidates = view.strokes.filter(
      (s) => s.id === undefined || !erasedInFlightRef.current.set.has(s.id),
    );
    const hitRadius = brush === 4 ? 14 : brush === 9 ? 20 : 28;
    const hitIdx = findHitStrokeIndex(candidates, pt[0], pt[1], hitRadius);
    if (hitIdx < 0) return;
    const hit = candidates[hitIdx];
    if (hit.id === undefined) return;
    const hitId = hit.id;
    erasedInFlightRef.current.set.add(hitId);
    setErasedTracker((prev) => {
      const base = prev.turn === view.turnIndex ? prev.ids : [];
      return { turn: view.turnIndex, ids: base.includes(hitId) ? base : [...base, hitId] };
    });
    void game.act({ type: 'vd_erase_stroke', strokeIds: [hitId] });
  };

  const startSprayLoop = (seed: number, w: number, col: string) => {
    stopSprayTimer();
    sprayTimerRef.current = setInterval(() => {
      if (!drawingRef.current) {
        stopSprayTimer();
        return;
      }
      const cur = draftPtsRef.current;
      const tail = cur[cur.length - 1];
      if (tail && cur.length < 150) {
        draftPtsRef.current = [...cur, tail];
        flushDraftFrame('spray', col, w, seed);
      }
    }, 75);
  };

  const webNorm = (e: WebPointerEvt): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / Math.max(1, r.width)) * 1000)));
    const ny = Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / Math.max(1, r.height)) * 1000)));
    return [nx, ny];
  };

  const onWebDown = (e: WebPointerEvt) => {
    if (!canDraw) return;
    const pt = webNorm(e);
    if (tool === 'fill') {
      void game.act({ type: 'vd_stroke', stroke: { tool: 'fill', color, width: brush, points: [pt] } });
      return;
    }
    drawingRef.current = true;
    try {
      if (e.pointerId !== undefined) e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // bỏ qua
    }
    if (tool === 'eraser' && eraserMode === 'object') {
      shapeStartRef.current = null;
      eraseObjectAt(pt);
      return;
    }
    if (tool === 'spray') {
      shapeStartRef.current = null;
      const seed = Math.floor(Math.random() * 1_000_000);
      spraySeedRef.current = seed;
      draftPtsRef.current = [pt];
      setDraft({ tool: 'spray', color: effectiveColor, width: effectiveWidth, points: [pt], seed });
      startSprayLoop(seed, effectiveWidth, effectiveColor);
      return;
    }
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      shapeStartRef.current = pt;
      const pts = buildVeDoanShapePoints(tool, pt, pt);
      draftPtsRef.current = pts;
      setDraft({ tool, color: effectiveColor, width: effectiveWidth, points: pts });
    } else {
      shapeStartRef.current = null;
      draftPtsRef.current = [pt];
      setDraft({ tool, color: effectiveColor, width: effectiveWidth, points: [pt] });
    }
  };

  const onWebMove = (e: WebPointerEvt) => {
    if (!canDraw || !drawingRef.current || tool === 'fill') return;
    const pt = webNorm(e);
    if (tool === 'eraser' && eraserMode === 'object') {
      eraseObjectAt(pt);
      return;
    }
    if ((tool === 'line' || tool === 'rect' || tool === 'circle') && shapeStartRef.current) {
      draftPtsRef.current = buildVeDoanShapePoints(tool, shapeStartRef.current, pt);
      flushDraftFrame(tool, effectiveColor, effectiveWidth);
      return;
    }
    const pts = draftPtsRef.current;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 8) {
      if (pts.length < 150) {
        draftPtsRef.current = [...pts, pt];
        flushDraftFrame(tool, effectiveColor, effectiveWidth, tool === 'spray' ? spraySeedRef.current : undefined);
      }
    }
  };

  const onWebUp = () => {
    stopSprayTimer();
    if (!drawingRef.current) return;
    drawingRef.current = false;
    shapeStartRef.current = null;
    if (draftRafRef.current !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(draftRafRef.current);
      draftRafRef.current = null;
    }
    const pts = draftPtsRef.current;
    draftPtsRef.current = [];
    setDraft(null);
    if (canDraw && tool !== 'fill' && !(tool === 'eraser' && eraserMode === 'object') && pts.length > 0) {
      void game.act({
        type: 'vd_stroke',
        stroke: {
          ...(tool !== 'pen' ? { tool } : {}),
          ...(tool === 'spray' ? { seed: spraySeedRef.current } : {}),
          color: effectiveColor,
          width: effectiveWidth,
          points: pts,
        },
      });
    }
  };

  const toNorm = (evt: GestureResponderEvent): [number, number] => {
    const { w, h } = sizeRef.current;
    const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
    let x = locationX;
    let y = locationY;
    if (originRef.current && Number.isFinite(pageX) && Number.isFinite(pageY)) {
      x = pageX - originRef.current.px;
      y = pageY - originRef.current.py;
    }
    const nx = Math.max(0, Math.min(1000, Math.round((x / Math.max(1, w)) * 1000)));
    const ny = Math.max(0, Math.min(1000, Math.round((y / Math.max(1, h)) * 1000)));
    return [nx, ny];
  };

  const onDrawStart = (evt: GestureResponderEvent) => {
    if (!canDraw || Platform.OS === 'web') return;
    const node = canvasRef.current as unknown as {
      measure?: (cb: (x: number, y: number, w: number, h: number, px: number, py: number) => void) => void;
    } | null;
    node?.measure?.((_x, _y, w, h, px, py) => {
      if (w > 0 && h > 0) sizeRef.current = { w, h };
      if (Number.isFinite(px) && Number.isFinite(py)) originRef.current = { px, py };
    });
    const pt = toNorm(evt);
    if (tool === 'fill') {
      void game.act({ type: 'vd_stroke', stroke: { tool: 'fill', color, width: brush, points: [pt] } });
      return;
    }
    drawingRef.current = true;
    if (tool === 'eraser' && eraserMode === 'object') {
      shapeStartRef.current = null;
      eraseObjectAt(pt);
      return;
    }
    if (tool === 'spray') {
      shapeStartRef.current = null;
      const seed = Math.floor(Math.random() * 1_000_000);
      spraySeedRef.current = seed;
      draftPtsRef.current = [pt];
      setDraft({ tool: 'spray', color: effectiveColor, width: effectiveWidth, points: [pt], seed });
      startSprayLoop(seed, effectiveWidth, effectiveColor);
      return;
    }
    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      shapeStartRef.current = pt;
      const pts = buildVeDoanShapePoints(tool, pt, pt);
      draftPtsRef.current = pts;
      setDraft({ tool, color: effectiveColor, width: effectiveWidth, points: pts });
    } else {
      shapeStartRef.current = null;
      draftPtsRef.current = [pt];
      setDraft({ tool, color: effectiveColor, width: effectiveWidth, points: [pt] });
    }
  };

  const onDrawMove = (evt: GestureResponderEvent) => {
    if (!canDraw || Platform.OS === 'web' || tool === 'fill') return;
    const pt = toNorm(evt);
    if (tool === 'eraser' && eraserMode === 'object') {
      eraseObjectAt(pt);
      return;
    }
    if ((tool === 'line' || tool === 'rect' || tool === 'circle') && shapeStartRef.current) {
      const next = buildVeDoanShapePoints(tool, shapeStartRef.current, pt);
      draftPtsRef.current = next;
      setDraft({ tool, color: effectiveColor, width: effectiveWidth, points: next });
      return;
    }
    const pts = draftPtsRef.current;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 8) {
      if (pts.length < 150) {
        const next = [...pts, pt];
        draftPtsRef.current = next;
        setDraft({
          tool,
          color: effectiveColor,
          width: effectiveWidth,
          points: next,
          ...(tool === 'spray' ? { seed: spraySeedRef.current } : {}),
        });
      }
    }
  };

  const onDrawEnd = () => {
    if (Platform.OS === 'web') return;
    stopSprayTimer();
    drawingRef.current = false;
    originRef.current = null;
    shapeStartRef.current = null;
    const pts = draftPtsRef.current;
    draftPtsRef.current = [];
    setDraft(null);
    if (canDraw && tool !== 'fill' && !(tool === 'eraser' && eraserMode === 'object') && pts.length > 0) {
      void game.act({
        type: 'vd_stroke',
        stroke: {
          ...(tool !== 'pen' ? { tool } : {}),
          ...(tool === 'spray' ? { seed: spraySeedRef.current } : {}),
          color: effectiveColor,
          width: effectiveWidth,
          points: pts,
        },
      });
    }
  };

  const activeErasedIds = useMemo(() => {
    if (erasedTracker.turn !== view.turnIndex || erasedTracker.ids.length === 0) return new Set<number>();
    const present = new Set(view.strokes.map((s) => s.id).filter((n): n is number => n !== undefined));
    return new Set(erasedTracker.ids.filter((id) => present.has(id)));
  }, [erasedTracker, view.turnIndex, view.strokes]);

  const visibleStrokes = useMemo(
    () => (activeErasedIds.size > 0 ? view.strokes.filter((s) => s.id === undefined || !activeErasedIds.has(s.id)) : view.strokes),
    [view.strokes, activeErasedIds],
  );

  const allStrokes = useMemo(
    () => (draft ? [...visibleStrokes, draft] : visibleStrokes),
    [visibleStrokes, draft],
  );
  const svgUri = useMemo(() => (Platform.OS === 'web' ? '' : strokesToSvgUri(allStrokes)), [allStrokes]);

  const act = useCallback(
    async (payload: Parameters<Game['act']>[0]) => {
      setBusy(true);
      setErr(null);
      const res = await game.act(payload);
      setBusy(false);
      if (!res.ok) {
        playMemePool('wrong', { cooldownMs: 1100 });
        play('error');
        setErr(actionText[res.reason] ?? 'Không thực hiện được');
      }
      return res.ok;
    },
    [game],
  );

  const sendGuess = useCallback(
    (clean: string) => act({ type: 'vd_guess', text: clean }),
    [act],
  );
  const clearErr = useCallback(() => setErr(null), []);

  const guessedSet = useMemo(() => new Set(view.guessedIds), [view.guessedIds]);
  const guessResetKey = `${view.turnIndex}|${view.drawerId}`;
  const maskedParts =
    view.maskedWords && view.maskedWords.length > 0
      ? view.maskedWords
      : view.maskedWord
        ? view.maskedWord.split(/\s{2,}/).filter(Boolean)
        : [];

  const renderBottom = () => {
    if (view.phase === 'pick_word') {
      return isDrawer ? (
        <T style={[styles.waitNote, { color: bp.text }]}>Chọn 1 trong 3 từ trên bảng vẽ để bắt đầu.</T>
      ) : (
        <T style={[styles.waitNote, { color: bp.text }]}>{view.names[view.drawerId] ?? 'Họa sĩ'} đang chọn từ khóa…</T>
      );
    }
    if (view.phase === 'round_end') {
      return <T style={[styles.waitNote, { color: bp.text }]}>Đáp án: «{view.secretWord ?? '...'}» — Chuẩn bị lượt tiếp theo.</T>;
    }
    if (isDrawer) {
      return <T style={[styles.waitNote, { color: bp.text }]}>Bạn đang vẽ «{view.secretWord ?? '...'}» — Càng dễ đoán điểm càng cao.</T>;
    }
    if (guessedSet.has(me)) {
      return <T style={[styles.waitNote, { color: bp.dark ? '#4ADE80' : C.jade }]}>Bạn đã đoán trúng. Chờ mọi người cùng đoán nhé.</T>;
    }
    return (
      <VeDoanGuessDock
        resetKey={guessResetKey}
        busy={busy}
        err={err}
        onClearErr={clearErr}
        onSubmit={sendGuess}
      />
    );
  };

  const webPointerProps = Platform.OS === 'web'
    ? ({
        onPointerDown: onWebDown,
        onPointerMove: onWebMove,
        onPointerUp: onWebUp,
        onPointerCancel: onWebUp,
      } as object)
    : {};

  const nativeResponderProps = Platform.OS !== 'web'
    ? {
        onStartShouldSetResponder: () => canDraw,
        onMoveShouldSetResponder: () => canDraw,
        onResponderGrant: onDrawStart,
        onResponderMove: onDrawMove,
        onResponderRelease: onDrawEnd,
        onResponderTerminate: onDrawEnd,
      }
    : {};

  const feedList = (
    <ScrollView
      ref={feedScrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={styles.feedContent}
      keyboardShouldPersistTaps="handled"
    >
      {view.feed.length === 0 ? (
        <T style={styles.emptyFeed}>
          Chưa có ai đoán… Vẽ dễ hiểu = Họa sĩ +85–185đ · Không ai đoán = 0đ
        </T>
      ) : (
        view.feed.slice(-14).map((item) => (
          <View key={item.id} style={[styles.feedRow, item.hit && styles.feedHit, item.close && styles.feedClose]}>
            <T numberOfLines={2} style={[styles.feedTxt, item.hit && { color: C.jadeDeep, fontWeight: '600' }, item.close && { color: C.goldDeep, fontWeight: '600' }]}>
              <T style={{ fontWeight: '600' }}>{item.name}: </T>
              {item.text}
            </T>
          </View>
        ))
      )}
    </ScrollView>
  );

  return (
    <Shell game={game} room={room} scroll={false} hideStrip wide={wide} bottom={renderBottom()}>
      <View style={styles.rootStage}>
        {/* Thanh Lượt + Từ Khóa + Đồng Hồ siêu gọn (không dùng dải avatar để tối đa khung vẽ & khung chat) */}
        <View style={[styles.topCard, sticker(1), compact && styles.topCardTight]}>
          <View style={styles.topRow}>
            <View style={styles.turnPill}>
              <UiIcon name="Brush" size={12} color={C.secondary} />
              <T style={styles.turnLabel}>{view.turnIndex + 1}/{view.totalTurns}</T>
            </View>
            <View style={styles.wordInlineBox}>
              {view.secretWord ? (
                <T testID="vd-word-display" numberOfLines={1} style={styles.wordSecret}>{view.secretWord.toUpperCase()}</T>
              ) : (
                <View testID="vd-word-display" style={styles.maskedWrap}>
                  {maskedParts.length > 0 ? (
                    <View style={styles.maskedWordsRow}>
                      {maskedParts.map((part, idx) => (
                        <T key={idx} style={styles.wordMaskedPart}>{part}</T>
                      ))}
                    </View>
                  ) : (
                    <T style={styles.wordMaskedPart}>Chuẩn bị...</T>
                  )}
                  {maskedParts.length > 0 && (
                    <T style={styles.wordCountBadge}>
                      ({maskedParts.length} tiếng · {view.wordLength} chữ)
                    </T>
                  )}
                </View>
              )}
            </View>
            <View style={styles.drawerPill}>
              <UiIcon name="Pencil" size={12} color={C.goldDeep} />
              <T numberOfLines={1} style={styles.drawerBadge}>{view.names[view.drawerId] ?? '...'}</T>
            </View>
          </View>
          <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="vd-timer" />
          {wide && (
            <T style={styles.scoringNote}>
              Vẽ dễ hiểu: Họa sĩ +85–185đ · Người đoán +70–200đ · Không ai đoán trúng = 0đ
            </T>
          )}
        </View>

        {/* Thân Chính Zero-Scroll: Bảng Vẽ Khổng Lồ + Công Cụ / Luồng Đoán */}
        <View style={[styles.mainSplit, wide && styles.mainSplitWide]}>
          <View style={[styles.canvasCard, sticker(1)]}>
            <View
              ref={canvasRef}
              testID="vd-canvas"
              onLayout={(e: LayoutChangeEvent) => {
                const { width: w, height: h } = e.nativeEvent.layout;
                if (w > 0 && h > 0) sizeRef.current = { w, h };
              }}
              {...webPointerProps}
              {...nativeResponderProps}
              style={[
                styles.canvasSurface,
                { touchAction: 'none', userSelect: 'none', cursor: canDraw ? 'crosshair' : 'default' } as object,
              ]}
            >
              {Platform.OS === 'web' ? (
                <svg
                  viewBox="0 0 1000 1000"
                  preserveAspectRatio="none"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
                >
                  {allStrokes.map((s, idx) => {
                    const stTool = s.tool ?? 'pen';
                    if (stTool === 'fill') {
                      const d = s.fillPath ?? (s.points[0] ? computeFloodFillPath(allStrokes.slice(0, idx), s.points[0][0], s.points[0][1]) : '');
                      return d ? <path key={idx} d={d} fill={s.color} /> : null;
                    }
                    if (stTool === 'spray') {
                      const d = sprayStrokeToPath(s);
                      return d ? <path key={idx} d={d} fill={s.color} /> : null;
                    }
                    const stColor = stTool === 'eraser' ? '#FFFFFF' : s.color;
                    return s.points.length === 1 ? (
                      <circle key={idx} cx={s.points[0][0]} cy={s.points[0][1]} r={Math.max(4, s.width * 0.7)} fill={stColor} />
                    ) : (
                      <polyline
                        key={idx}
                        fill="none"
                        stroke={stColor}
                        strokeWidth={s.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={s.points.map(([x, y]) => `${x},${y}`).join(' ')}
                      />
                    );
                  })}
                </svg>
              ) : (
                <Image source={{ uri: svgUri }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
              )}

              {allStrokes.length === 0 && view.phase !== 'pick_word' && (
                <View style={styles.emptyCanvas} pointerEvents="none">
                  <UiIcon name={canDraw ? 'Brush' : 'Eye'} size={22} color={C.muted} />
                  <T style={styles.emptyHint}>
                    {canDraw
                      ? tool === 'fill'
                        ? 'Chạm vào vùng bất kỳ để đổ màu'
                        : tool === 'spray'
                          ? 'Chạm và kéo để xịt sơn'
                          : 'Chạm và kéo để vẽ tại đây'
                      : 'Bảng vẽ đang trống…'}
                  </T>
                </View>
              )}

              {/* Chọn 1 trong 3 từ ngay giữa bảng vẽ — không bao giờ làm tràn màn hình */}
              {view.phase === 'pick_word' && isDrawer && view.wordOptions && (
                <View style={styles.pickOverlay}>
                  <View style={[styles.pickCard, sticker(2)]}>
                    <View style={styles.rowCenter}>
                      <UiIcon name="Palette" size={15} color={C.goldDeep} />
                      <T style={styles.secTitle}>Chọn từ khóa bạn muốn vẽ</T>
                    </View>
                    <View style={styles.pickRow}>
                      {view.wordOptions.map((w, idx) => (
                        <Button
                          key={w}
                          testID={`vd-pick-${idx}`}
                          title={w}
                          onPress={() => act({ type: 'vd_pick', word: w })}
                          style={{ flexGrow: 1 }}
                        />
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Thanh Công Cụ Vẽ Gọn Chạm Dễ Trên Mobile + Chế Độ Tẩy Nét/Vùng Sơn */}
            {canDraw && (
              <View style={styles.tools}>
                <View style={styles.toolPickerRow}>
                  {TOOL_META.map((tm) => {
                    const active = tool === tm.id;
                    return (
                      <Pressable
                        key={tm.id}
                        testID={`vd-tool-${tm.id}`}
                        onPress={() => {
                          if (tm.id === 'eraser' && tool === 'eraser') {
                            setEraserMode((m) => (m === 'pixel' ? 'object' : 'pixel'));
                          } else {
                            setTool(tm.id);
                          }
                        }}
                        style={[styles.toolChip, active && styles.toolChipActive]}
                      >
                        <ToolGlyph tool={tm.id} icon={tm.icon} active={active} />
                        <T style={[styles.toolLabel, active && styles.toolLabelActive]}>{tm.label}</T>
                      </Pressable>
                    );
                  })}
                </View>

                {tool === 'eraser' && (
                  <View style={styles.eraserModeRow}>
                    <Pressable
                      testID="vd-eraser-mode-pixel"
                      accessibilityRole="button"
                      accessibilityState={{ selected: eraserMode === 'pixel' }}
                      onPress={() => setEraserMode('pixel')}
                      style={[styles.eraserModeChip, eraserMode === 'pixel' && styles.eraserModeChipActive]}
                    >
                      <T style={[styles.eraserModeTxt, eraserMode === 'pixel' && styles.eraserModeTxtActive]}>
                        Tẩy thường
                      </T>
                    </Pressable>
                    <Pressable
                      testID="vd-eraser-mode-object"
                      accessibilityRole="button"
                      accessibilityState={{ selected: eraserMode === 'object' }}
                      onPress={() => setEraserMode('object')}
                      style={[styles.eraserModeChip, eraserMode === 'object' && styles.eraserModeChipActive]}
                    >
                      <T style={[styles.eraserModeTxt, eraserMode === 'object' && styles.eraserModeTxtActive]}>
                        Tẩy nét / vùng sơn
                      </T>
                    </Pressable>
                  </View>
                )}

                <View style={styles.paletteActionBar}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paletteScroll}>
                    {VE_DOAN_COLORS.map((col) => {
                      const upper = col.toUpperCase();
                      const isLight = upper === '#FFFFFF' || upper === '#F59F00' || upper === '#38BDF8';
                      return (
                        <Pressable
                          key={col}
                          testID={`vd-color-${col}`}
                          onPress={() => {
                            setColor(col);
                            if (tool === 'eraser') setTool('pen');
                          }}
                          style={[styles.swatch, { backgroundColor: col }, color === col && tool !== 'eraser' && styles.swatchActive]}
                        >
                          {color === col && tool !== 'eraser' && (
                            <UiIcon name="Check" size={12} color={isLight ? C.ink : '#FFFFFF'} strokeWidth={2.5} />
                          )}
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <View style={styles.brushesCompact}>
                    {VE_DOAN_WIDTHS.map((w) => {
                      const dotCol = tool === 'eraser' ? C.muted : color === '#FFFFFF' ? C.secondary : color;
                      return (
                        <Pressable
                          key={w}
                          testID={`vd-brush-${w}`}
                          onPress={() => setBrush(w)}
                          style={[styles.brushBtn, brush === w && styles.brushActive]}
                        >
                          <View style={{ width: w + 3, height: w + 3, borderRadius: 99, backgroundColor: dotCol }} />
                        </Pressable>
                      );
                    })}
                    <Pressable
                      testID="vd-undo"
                      onPress={() => {
                        erasedInFlightRef.current.set.clear();
                        setErasedTracker({ turn: view.turnIndex, ids: [] });
                        void act({ type: 'vd_undo' });
                      }}
                      style={styles.toolMiniBtn}
                      accessibilityLabel="Hoàn tác"
                    >
                      <UiIcon name="Undo2" size={15} color={C.ink} />
                    </Pressable>
                    <Pressable
                      testID="vd-clear"
                      onPress={() => {
                        erasedInFlightRef.current.set.clear();
                        setErasedTracker({ turn: view.turnIndex, ids: [] });
                        playMemePool('shock', { cooldownMs: 2400 });
                        play('whoosh');
                        void act({ type: 'vd_clear' });
                      }}
                      style={styles.toolMiniBtn}
                      accessibilityLabel="Xóa hết"
                    >
                      <UiIcon name="Trash2" size={15} color={C.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Luồng Đoán Từ: Cột bên trên Desktop, khung chat thoáng dễ đọc ở Mobile */}
          {(wide || !canDraw || view.feed.length > 0) && (
            <View testID="vd-feed-box" style={[styles.feedBox, sticker(1), wide ? styles.feedBoxWide : (canDraw ? styles.feedBoxMobileDrawer : styles.feedBoxMobile)]}>
              {wide && (
                <View style={styles.feedTitleRow}>
                  <UiIcon name="MessageCircle" size={13} color={C.secondary} />
                  <T style={styles.secTitle}>Luồng đoán từ</T>
                </View>
              )}
              {feedList}
            </View>
          )}
        </View>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  rootStage: { flex: 1, minHeight: 0, gap: 6 },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topCard: {
    backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, gap: 4,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  topCardTight: { paddingVertical: 5, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  turnPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.parchment, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1, borderColor: C.borderSubtle,
  },
  turnLabel: { fontSize: 12, fontWeight: '600', color: C.ink, fontFamily: FONT, fontVariant: ['tabular-nums'] },
  wordInlineBox: {
    flex: 1, backgroundColor: C.darkBg, borderRadius: 9,
    paddingVertical: 4, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', minWidth: 0,
  },
  wordSecret: { color: '#FDE68A', fontSize: 14.5, fontWeight: '600', letterSpacing: 1 },
  maskedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 8,
    rowGap: 2,
  },
  maskedWordsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 12,
    rowGap: 2,
  },
  wordMaskedPart: { color: C.paper, fontSize: 13.5, fontWeight: '600', letterSpacing: 1.2, fontVariant: ['tabular-nums'] },
  wordCountBadge: { color: 'rgba(253, 251, 247, 0.72)', fontSize: 11, fontWeight: '500', fontVariant: ['tabular-nums'] },
  drawerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 114,
    backgroundColor: C.goldSoft, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1, borderColor: 'rgba(180,83,9,0.2)',
  },
  drawerBadge: { fontSize: 11, fontWeight: '600', color: C.goldDeep, flexShrink: 1 },
  scoringNote: { fontSize: 10.5, fontWeight: '500', color: C.secondary, textAlign: 'center', fontVariant: ['tabular-nums'] },

  mainSplit: { flex: 1, minHeight: 0, gap: 6 },
  mainSplitWide: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },

  canvasCard: {
    flex: 1, minHeight: 0, backgroundColor: C.paper, borderRadius: 16, padding: 8, gap: 6,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  canvasSurface: {
    flex: 1, minHeight: 160, width: '100%', backgroundColor: '#FFFFFF',
    borderRadius: 11, borderWidth: 1, borderColor: C.borderStrong, overflow: 'hidden', position: 'relative',
  },
  emptyCanvas: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyHint: { fontSize: 13, fontWeight: '500', color: C.muted },
  pickOverlay: {
    ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17, 20, 28, 0.56)',
    alignItems: 'center', justifyContent: 'center', padding: 14,
  },
  pickCard: {
    backgroundColor: C.paper, borderRadius: 16, padding: 14, gap: 10, width: '100%', maxWidth: 420,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  secTitle: { fontSize: 12.5, fontWeight: '600', color: C.ink },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  tools: { gap: 5, flexShrink: 0 },
  toolPickerRow: { flexDirection: 'row', gap: 3, justifyContent: 'space-between' },
  toolChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    paddingHorizontal: 3, paddingVertical: 5, borderRadius: 9,
    backgroundColor: C.parchment, borderWidth: 1, borderColor: C.borderSubtle,
  },
  toolChipActive: { backgroundColor: C.goldSoft, borderColor: C.ink },
  toolLabel: { fontSize: 10, fontWeight: '500', color: C.secondary },
  toolLabelActive: { color: C.ink, fontWeight: '600' },
  eraserModeRow: { flexDirection: 'row', gap: 6 },
  eraserModeChip: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eraserModeChipActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  eraserModeTxt: { fontSize: 11, fontWeight: '500', color: C.secondary },
  eraserModeTxtActive: { color: C.onSon, fontWeight: '600' },

  paletteActionBar: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paletteScroll: { gap: 5, alignItems: 'center', paddingVertical: 2 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: C.borderStrong, alignItems: 'center', justifyContent: 'center' },
  swatchActive: { borderColor: C.ink, borderWidth: 2, transform: [{ scale: 1.08 }] },
  brushesCompact: { flexDirection: 'row', gap: 4, alignItems: 'center', flexShrink: 0 },
  brushBtn: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: C.borderSubtle, alignItems: 'center', justifyContent: 'center', backgroundColor: C.parchment },
  brushActive: { borderColor: C.ink, backgroundColor: C.goldSoft },
  toolMiniBtn: {
    width: 28, height: 26, borderRadius: 8, borderWidth: 1, borderColor: C.borderSubtle,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper,
  },

  feedBox: {
    backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, gap: 4,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  feedBoxWide: { width: 260, minHeight: 0 },
  feedBoxMobile: { height: 112, flexShrink: 0 },
  feedBoxMobileDrawer: { height: 78, flexShrink: 0 },
  feedTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  feedContent: { gap: 4, paddingVertical: 2 },
  emptyFeed: { color: C.muted, fontSize: 12, fontWeight: '400', fontVariant: ['tabular-nums'] },
  feedRow: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 8, backgroundColor: C.parchment },
  feedHit: { backgroundColor: C.jadeSoft },
  feedClose: { backgroundColor: C.goldSoft },
  feedTxt: { fontSize: 12.5, lineHeight: 17, color: C.ink, fontWeight: '400' },

  dock: { gap: 4 },
  guessRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, minWidth: 0, backgroundColor: C.paper, borderColor: C.borderStrong, borderWidth: 1,
    borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, color: C.ink, fontSize: 14, fontWeight: '500',
  },
  waitNote: { fontSize: 12.5, fontWeight: '500', textAlign: 'center', color: C.ink, paddingVertical: 3 },
  err: { fontSize: 11.5, fontWeight: '600', color: C.danger, textAlign: 'center' },
});
