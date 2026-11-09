import { useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { type LudoColor, type LudoView, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip } from '../messages';
import { useOnChange, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { BASE, HOME, START_CELL, TRACK, piecePos } from '../ludoBoard';
import { C, LUDO_HEX, sticker } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { TimerBar } from '../components/TimerBar';
import { Dice } from '../components/Dice';
import { useShake } from '../components/Fun';

const COLOR_NAME: Record<LudoColor, string> = { red: 'Đỏ', green: 'Xanh lá', yellow: 'Vàng', blue: 'Xanh dương' };

export function LudoScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as LudoView;
  const { width, height } = useWindowDimensions();
  const feed = useFeed();
  const shake = useShake();
  const [error, setError] = useState<string | null>(null);

  const myIdx = g.order.indexOf(game.me ?? '');
  const myTurn = g.currentPlayerId === game.me;
  const curIdx = g.order.indexOf(g.currentPlayerId ?? '');
  const curColor = curIdx >= 0 ? g.colors[curIdx] : null;
  const nameOf = (id: string) => (id === game.me ? 'Bạn' : g.names[id] ?? '?');
  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);

  // bàn cờ vuông, vừa màn hình (chừa chỗ cho thanh trên + hàng avatar + nút)
  const boardSize = Math.floor(Math.min(width - 24, 500, Math.max(280, height - 330)));
  const cell = boardSize / 15;

  useOnChange(g.rollId, () => play('dice'));
  useOnChange(g.lastEvent, (e) => {
    if (!e) return;
    if (e.kind === 'capture') {
      play('splat');
      feed(quip.capture(nameOf(e.playerId), nameOf(e.victimId)), 'fun');
      if (e.victimId === game.me) {
        vibrate(300);
        shake();
      }
    } else if (e.kind === 'threeSixes') feed(quip.threeSixes(nameOf(e.playerId)), 'fun');
    else if (e.kind === 'finish') {
      play('coin');
      feed(quip.finish(nameOf(e.playerId)), 'good');
    } else if (e.kind === 'noMove' && e.playerId === game.me) feed('Không có nước đi, mất lượt', 'info');
    else if (e.kind === 'left') feed(quip.left(nameOf(e.playerId)), 'bad');
  });
  useOnChange(myTurn && g.step === 'roll', (now) => {
    if (now) {
      play('turn');
      vibrate();
    }
  });

  const act = async (a: Parameters<Game['act']>[0]) => {
    const r = await game.act(a);
    setError(r.ok ? null : actionText[r.reason]);
  };

  const status = myTurn
    ? g.step === 'roll'
      ? 'Tới lượt bạn, đổ xúc xắc đi!'
      : g.step === 'move'
        ? g.legal.length > 1
          ? 'Chạm vào con ngựa đang nhấp nháy để đi'
          : 'Đang đi…'
        : 'Chờ chút…'
    : curIdx >= 0
      ? `Lượt của ${nameOf(g.order[curIdx])}`
      : '';

  return (
    <Shell
      game={game}
      room={room}
      scroll
      strip={{
        order: g.order,
        active: g.currentPlayerId,
        dim: (p) => g.left.includes(p.id),
        ring: (p) => {
          const i = g.order.indexOf(p.id);
          return i >= 0 ? LUDO_HEX[g.colors[i]] : undefined;
        },
        sub: (p) => {
          const i = g.order.indexOf(p.id);
          if (i < 0) return undefined;
          const done = g.pieces[i].filter((x) => x === 56).length;
          return `${COLOR_NAME[g.colors[i]]} ${done}/${g.pieces[i].length}`;
        },
      }}
      bottom={
        <View style={styles.controls}>
          <Dice testID="dice" value={g.dice} rollId={g.rollId} size={60} />
          <View style={{ flex: 1, gap: 6 }}>
            <T testID="ludo-status" numberOfLines={2} style={[styles.status, myTurn && { color: C.gold }]}>{status}</T>
            {myTurn && g.step === 'roll' ? (
              <Button testID="roll-btn" title="Đổ xúc xắc" onPress={() => act({ type: 'roll' })} />
            ) : (
              <TimerBar left={left} total={g.turnSeconds} />
            )}
            {error && <T style={styles.error}>{error}</T>}
          </View>
        </View>
      }
    >
      <View style={[styles.board, sticker(5), { width: boardSize, height: boardSize }]}>
        {/* 4 khu chuồng */}
        {(Object.keys(BASE) as LudoColor[]).map((c) => {
          const [r, col] = BASE[c];
          const mine = myIdx >= 0 && g.colors[myIdx] === c;
          return (
            <View
              key={c}
              style={[styles.base, {
                top: r * cell, left: col * cell, width: cell * 6, height: cell * 6, backgroundColor: LUDO_HEX[c],
              }]}
            >
              <View style={[styles.baseInner, { margin: cell * 0.8, borderRadius: cell }]}>
                {mine && <T style={[styles.you, { fontSize: cell * 0.55 }]}>Bạn</T>}
              </View>
            </View>
          );
        })}
        {/* đường chạy */}
        {TRACK.map(([r, c], i) => {
          const start = START_CELL[`${r},${c}`];
          return (
            <View
              key={i}
              style={[styles.cell, {
                top: r * cell, left: c * cell, width: cell, height: cell,
                backgroundColor: start ? LUDO_HEX[start] : C.paper,
              }]}
            >
              {start && <T style={{ fontSize: cell * 0.5, color: C.paper }}>★</T>}
            </View>
          );
        })}
        {/* đường về đích */}
        {(Object.keys(HOME) as LudoColor[]).flatMap((c) =>
          HOME[c].map(([r, col], i) => (
            <View
              key={`${c}${i}`}
              style={[styles.cell, { top: r * cell, left: col * cell, width: cell, height: cell, backgroundColor: LUDO_HEX[c] }]}
            />
          )),
        )}
        {/* tam giác đích giữa bàn */}
        <View
          style={{
            position: 'absolute', top: 6 * cell, left: 6 * cell, width: 0, height: 0,
            borderTopWidth: cell * 1.5, borderBottomWidth: cell * 1.5, borderLeftWidth: cell * 1.5, borderRightWidth: cell * 1.5,
            borderTopColor: LUDO_HEX.green, borderRightColor: LUDO_HEX.yellow,
            borderBottomColor: LUDO_HEX.blue, borderLeftColor: LUDO_HEX.red,
          }}
        />
        {/* ngựa */}
        {g.order.map((pid, pi) =>
          g.left.includes(pid)
            ? null
            : g.pieces[pi].map((progress, k) => {
              const [r, c] = piecePos(g.colors[pi], progress, k);
              const movable = myTurn && g.step === 'move' && pi === myIdx && g.legal.includes(k);
              const size = progress === 56 ? cell * 0.6 : cell * 0.86;
              return (
                <Pressable
                  key={`${pi}-${k}`}
                  testID={`piece-${pi}-${k}`}
                  accessibilityRole={movable ? 'button' : undefined}
                  accessibilityLabel={`Ngựa ${COLOR_NAME[g.colors[pi]]} số ${k + 1}`}
                  disabled={!movable}
                  hitSlop={8}
                  onPress={() => act({ type: 'move', piece: k })}
                  style={[
                    styles.piece,
                    {
                      width: size, height: size, borderRadius: size / 2,
                      top: r * cell - size / 2, left: c * cell - size / 2,
                      backgroundColor: LUDO_HEX[g.colors[pi]],
                    },
                    movable && styles.movable,
                  ]}
                >
                  <T style={{ fontSize: size * 0.58, lineHeight: size * 0.8 }}>🐴</T>
                </Pressable>
              );
            }),
        )}
        {curColor && <View pointerEvents="none" style={[styles.turnGlow, { borderColor: LUDO_HEX[curColor] }]} />}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  board: { alignSelf: 'center', backgroundColor: C.paper, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  base: { position: 'absolute', borderWidth: 1.5, borderColor: C.ink },
  baseInner: { flex: 1, backgroundColor: C.paper, borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  you: { fontWeight: '900', color: C.muted, opacity: 0.6 },
  cell: { position: 'absolute', borderWidth: 0.75, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  piece: {
    position: 'absolute', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center',
    transitionProperty: 'top, left, width, height', transitionDuration: '320ms', zIndex: 5,
  } as object,
  movable: {
    zIndex: 10, transform: [{ scale: 1.18 }], borderColor: C.paper, borderWidth: 3,
    animationKeyframes: [{ '0%': { opacity: 1 }, '50%': { opacity: 0.55 }, '100%': { opacity: 1 } }],
    animationDuration: '0.8s', animationIterationCount: 'infinite',
  } as object,
  turnGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderWidth: 4, borderRadius: 10 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  status: { color: C.onSon, fontWeight: '800', fontSize: 15 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 6, borderRadius: 8, fontWeight: '700', fontSize: 13 },
});
