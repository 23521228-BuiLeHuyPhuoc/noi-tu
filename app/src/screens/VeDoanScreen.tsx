import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import {
  VE_DOAN_COLORS, VE_DOAN_WIDTHS,
  type VeDoanStroke, type VeDoanView,
} from '../../../shared/src/vedoan';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Image } from '../components/Image';
import { KeyboardLift } from '../components/KeyboardLift';

function strokesToSvgUri(strokes: VeDoanStroke[]): string {
  const parts: string[] = [];
  for (const s of strokes) {
    if (!s.points.length) continue;
    if (s.points.length === 1) {
      const [x, y] = s.points[0];
      parts.push(`<circle cx="${x}" cy="${y}" r="${Math.max(4, s.width * 0.7)}" fill="${s.color}"/>`);
    } else {
      const pts = s.points.map(([x, y]) => `${x},${y}`).join(' ');
      parts.push(
        `<polyline fill="none" stroke="${s.color}" stroke-width="${s.width}" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>`,
      );
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" preserveAspectRatio="none">${parts.join('')}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

export function VeDoanScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as VeDoanView;
  const me = game.me ?? '';
  const isDrawer = view.drawerId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);

  const [color, setColor] = useState<string>(VE_DOAN_COLORS[0]);
  const [brush, setBrush] = useState<number>(VE_DOAN_WIDTHS[1]);
  const [draft, setDraft] = useState<VeDoanStroke | null>(null);
  const [guess, setGuess] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canvasRef = useRef<ComponentRef<typeof View>>(null);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 320, h: 320 });
  const originRef = useRef<{ px: number; py: number } | null>(null);
  const draftPtsRef = useRef<[number, number][]>([]);
  const drawingRef = useRef(false);

  const canDraw = isDrawer && view.phase === 'drawing';

  // Pointer Events trên Web: đọc tọa độ trực tiếp từ DOM bounding rect (chính xác 100% cả desktop & touch)
  const webNorm = (e: WebPointerEvt): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1000, Math.round(((e.clientX - r.left) / Math.max(1, r.width)) * 1000)));
    const ny = Math.max(0, Math.min(1000, Math.round(((e.clientY - r.top) / Math.max(1, r.height)) * 1000)));
    return [nx, ny];
  };

  const onWebDown = (e: WebPointerEvt) => {
    if (!canDraw) return;
    drawingRef.current = true;
    try {
      if (e.pointerId !== undefined) e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // bỏ qua trên thiết bị không hỗ trợ capture
    }
    const pt = webNorm(e);
    draftPtsRef.current = [pt];
    setDraft({ color, width: brush, points: [pt] });
  };

  const onWebMove = (e: WebPointerEvt) => {
    if (!canDraw || !drawingRef.current) return;
    const pt = webNorm(e);
    const pts = draftPtsRef.current;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 8) {
      if (pts.length < 150) {
        const next = [...pts, pt];
        draftPtsRef.current = next;
        setDraft({ color, width: brush, points: next });
      }
    }
  };

  const onWebUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pts = draftPtsRef.current;
    draftPtsRef.current = [];
    setDraft(null);
    if (canDraw && pts.length > 0) {
      void game.act({ type: 'vd_stroke', stroke: { color, width: brush, points: pts } });
    }
  };

  // Fallback Native Responder (Android/iOS)
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
    draftPtsRef.current = [pt];
    setDraft({ color, width: brush, points: [pt] });
  };

  const onDrawMove = (evt: GestureResponderEvent) => {
    if (!canDraw || Platform.OS === 'web') return;
    const pt = toNorm(evt);
    const pts = draftPtsRef.current;
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) >= 8) {
      if (pts.length < 150) {
        const next = [...pts, pt];
        draftPtsRef.current = next;
        setDraft({ color, width: brush, points: next });
      }
    }
  };

  const onDrawEnd = () => {
    if (Platform.OS === 'web') return;
    originRef.current = null;
    const pts = draftPtsRef.current;
    draftPtsRef.current = [];
    setDraft(null);
    if (canDraw && pts.length > 0) {
      void game.act({ type: 'vd_stroke', stroke: { color, width: brush, points: pts } });
    }
  };

  const allStrokes = useMemo(
    () => (draft ? [...view.strokes, draft] : view.strokes),
    [view.strokes, draft],
  );
  const svgUri = useMemo(() => (Platform.OS === 'web' ? '' : strokesToSvgUri(allStrokes)), [allStrokes]);

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Không thực hiện được');
    return res.ok;
  };

  const sendGuess = async () => {
    const clean = guess.trim();
    if (!clean || busy) return;
    const ok = await act({ type: 'vd_guess', text: clean });
    if (ok) setGuess('');
  };

  const guessedSet = useMemo(() => new Set(view.guessedIds), [view.guessedIds]);
  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.drawerId,
      ring: (p: PublicPlayer) => (guessedSet.has(p.id) ? C.jade : p.id === view.drawerId ? C.gold : undefined),
      sub: (p: PublicPlayer) => {
        const sc = view.scores[p.id] ?? 0;
        if (p.id === view.drawerId) return `🖌️ · ${sc}đ`;
        if (guessedSet.has(p.id)) return `✅ · ${sc}đ`;
        return `${sc} điểm`;
      },
    }),
    [view.order, view.drawerId, view.scores, guessedSet],
  );

  const renderBottom = () => {
    if (view.phase === 'pick_word') {
      return isDrawer ? (
        <T style={[styles.waitNote, { color: theme.onBg }]}>🎨 Chọn 1 trong 3 từ trên màn hình để bắt đầu trổ tài họa sĩ!</T>
      ) : (
        <T style={[styles.waitNote, { color: theme.onBg }]}>⏳ {view.names[view.drawerId] ?? 'Họa sĩ'} đang chọn từ khóa…</T>
      );
    }
    if (view.phase === 'round_end') {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>✨ Đáp án lượt này là «{view.secretWord ?? '...'}» — Chuẩn bị sang lượt mới!</T>;
    }
    if (isDrawer) {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>🖌️ Bạn đang vẽ «{view.secretWord ?? '...'}» — Vẽ thật dễ hiểu nhé!</T>;
    }
    if (guessedSet.has(me)) {
      return <T style={[styles.waitNote, { color: '#4ADE80' }]}>🎉 Bạn đã đoán trúng! Chờ mọi người cùng đoán nhé.</T>;
    }
    return (
      <KeyboardLift>
        <View style={styles.dock}>
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.guessRow}>
            <TextInput
              testID="vd-guess-input"
              value={guess}
              onChangeText={setGuess}
              onSubmitEditing={sendGuess}
              placeholder="Gõ từ bạn đoán tại đây..."
              placeholderTextColor={C.muted}
              maxLength={60}
              style={styles.input}
            />
            <Button testID="vd-guess-submit" disabled={busy || !guess.trim()} title="Đoán" onPress={sendGuess} />
          </View>
        </View>
      </KeyboardLift>
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

  return (
    <Shell game={game} room={room} strip={strip} bottom={renderBottom()}>
      <View style={styles.topCard}>
        <View style={styles.topRow}>
          <T style={styles.turnLabel}>🎨 Lượt {view.turnIndex + 1}/{view.totalTurns}</T>
          <T style={styles.drawerBadge}>🖌️ Họa sĩ: {view.names[view.drawerId] ?? '...'}</T>
        </View>
        <View style={styles.wordBox}>
          {view.secretWord ? (
            <T testID="vd-word-display" style={styles.wordSecret}>{view.secretWord.toUpperCase()}</T>
          ) : (
            <T testID="vd-word-display" style={styles.wordMasked}>
              {view.maskedWord || 'Đang chuẩn bị...'} ({view.wordLength} chữ)
            </T>
          )}
        </View>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="vd-timer" />
      </View>

      {view.phase === 'pick_word' && isDrawer && view.wordOptions && (
        <Card style={{ gap: 10 }}>
          <T style={styles.secTitle}>✨ Chọn 1 từ khóa bạn muốn vẽ:</T>
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
        </Card>
      )}

      <View style={styles.canvasCard}>
        <View
          ref={canvasRef}
          testID="vd-canvas"
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) sizeRef.current = { w: width, h: height };
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
              {allStrokes.map((s, idx) =>
                s.points.length === 1 ? (
                  <circle key={idx} cx={s.points[0][0]} cy={s.points[0][1]} r={Math.max(4, s.width * 0.7)} fill={s.color} />
                ) : (
                  <polyline
                    key={idx}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={s.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={s.points.map(([x, y]) => `${x},${y}`).join(' ')}
                  />
                ),
              )}
            </svg>
          ) : (
            <Image source={{ uri: svgUri }} style={{ width: '100%', height: '100%' }} resizeMode="stretch" />
          )}
          {allStrokes.length === 0 && (
            <View style={styles.emptyCanvas} pointerEvents="none">
              <T style={styles.emptyHint}>
                {canDraw ? '✏️ Chạm và kéo để vẽ tại đây!' : '👀 Bảng vẽ đang trống...'}
              </T>
            </View>
          )}
        </View>

        {canDraw && (
          <View style={styles.tools}>
            <View style={styles.palette}>
              {VE_DOAN_COLORS.map((col) => (
                <Pressable
                  key={col}
                  testID={`vd-color-${col}`}
                  onPress={() => setColor(col)}
                  style={[styles.swatch, { backgroundColor: col }, color === col && styles.swatchActive]}
                />
              ))}
            </View>
            <View style={styles.toolActions}>
              <View style={styles.brushes}>
                {VE_DOAN_WIDTHS.map((w) => (
                  <Pressable
                    key={w}
                    testID={`vd-brush-${w}`}
                    onPress={() => setBrush(w)}
                    style={[styles.brushBtn, brush === w && styles.brushActive]}
                  >
                    <View style={{ width: w + 4, height: w + 4, borderRadius: 99, backgroundColor: color }} />
                  </Pressable>
                ))}
              </View>
              <Button testID="vd-undo" small variant="paper" title="↩️ Hoàn tác" onPress={() => act({ type: 'vd_undo' })} />
              <Button testID="vd-clear" small variant="paper" title="🗑️ Xóa" onPress={() => act({ type: 'vd_clear' })} />
            </View>
          </View>
        )}
      </View>

      <Card>
        <T style={styles.secTitle}>💬 Luồng Đoán Từ</T>
        {view.feed.length === 0 ? (
          <T style={{ color: C.muted, fontSize: 12 }}>Chưa có ai đoán… Hãy thử gõ từ đầu tiên!</T>
        ) : (
          <View style={{ gap: 4 }}>
            {view.feed.slice(-10).reverse().map((item) => (
              <View key={item.id} style={[styles.feedRow, item.hit && styles.feedHit, item.close && styles.feedClose]}>
                <T style={[styles.feedTxt, item.hit && { color: '#14532D', fontWeight: '900' }, item.close && { color: '#9A3412', fontWeight: '800' }]}>
                  <T style={{ fontWeight: '900' }}>{item.name}: </T>
                  {item.text}
                </T>
              </View>
            ))}
          </View>
        )}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  topCard: { backgroundColor: '#FFFDF8', borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, padding: 12, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  turnLabel: { fontSize: 14, fontWeight: '900', color: C.ink, fontFamily: FONT },
  drawerBadge: { fontSize: 12, fontWeight: '800', color: C.sonDark, backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  wordBox: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  wordSecret: { color: '#FDE047', fontSize: 18, fontWeight: '900', letterSpacing: 1.2 },
  wordMasked: { color: '#F8FAFC', fontSize: 17, fontWeight: '900', letterSpacing: 2 },

  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink, marginBottom: 4 },
  pickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  canvasCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2.5, borderColor: C.ink, padding: 8, gap: 8 },
  canvasSurface: {
    width: '100%', aspectRatio: 1.25, maxHeight: 360, backgroundColor: '#FFFFFF',
    borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', overflow: 'hidden', position: 'relative',
  },
  emptyCanvas: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  emptyHint: { fontSize: 14, fontWeight: '800', color: '#94A3B8' },

  tools: { gap: 8, paddingTop: 4 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#CBD5E1' },
  swatchActive: { borderColor: C.ink, borderWidth: 3.5, transform: [{ scale: 1.12 }] },
  toolActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'center' },
  brushes: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  brushBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  brushActive: { borderColor: C.ink, backgroundColor: '#FEF3C7' },

  feedRow: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },
  feedHit: { backgroundColor: '#DCFCE7' },
  feedClose: { backgroundColor: '#FFEDD5' },
  feedTxt: { fontSize: 13, color: C.ink },

  dock: { gap: 6 },
  guessRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1, backgroundColor: '#FFFFFF', borderColor: C.ink, borderWidth: 2,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, color: C.ink, fontSize: 14, fontWeight: '700',
  },
  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: '#F8FAFC', paddingVertical: 6 },
  err: { fontSize: 12, fontWeight: '800', color: C.danger, textAlign: 'center' },
});
