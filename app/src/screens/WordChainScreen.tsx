import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { RoomState, WordChainView, WordHistoryItem } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip } from '../messages';
import { useOnNew, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { TimerBar } from '../components/TimerBar';
import { useShake } from '../components/Fun';

export function WordChainScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as WordChainView;
  const myTurn = g.currentPlayerId === game.me;
  const meOut = g.eliminated.includes(game.me ?? '');
  const word = g.currentWord;
  const [first, last] = word.split(' ');
  const prefill = myTurn ? last + ' ' : '';
  const feed = useFeed();
  const shake = useShake();

  const [text, setText] = useState(prefill);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // sang lượt mới: điền sẵn chữ cuối (cập nhật ngay khi render, không dùng effect)
  const turnKey = `${g.currentPlayerId}|${word}`;
  const [prevTurnKey, setPrevTurnKey] = useState(turnKey);
  if (prevTurnKey !== turnKey) {
    setPrevTurnKey(turnKey);
    setText(prefill);
    setError(null);
    setHint(null);
  }

  useEffect(() => {
    if (!myTurn) return;
    vibrate();
    play('turn');
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [myTurn, word]);

  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const lastTick = useRef(-1);
  useEffect(() => {
    if (myTurn && left > 0 && left <= 5 && left !== lastTick.current) play('tick');
    lastTick.current = left;
  }, [left, myTurn]);

  // câu bình luận + âm thanh cho sự kiện mới
  useOnNew(g.history, (h: WordHistoryItem) => {
    if (h.kind === 'word' && h.playerId !== game.me) play('pop');
    if (h.kind === 'eliminated') {
      play(h.playerId === game.me ? 'lose' : 'splat');
      feed(h.reason === 'left' ? quip.left(h.name) : quip.eliminated(h.playerId === game.me ? 'Bạn' : h.name), 'bad');
      if (h.playerId === game.me) shake();
    }
    if (h.kind === 'newWord') feed(`Hết đường nối, đổi sang từ mới: ${h.word}`, 'info');
    if (h.kind === 'hint' && h.playerId !== game.me) feed(quip.hint(h.name), 'fun');
  });

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const r = await game.act({ type: 'submit', word: text });
    setSending(false);
    if (!r.ok) {
      setError(actionText[r.reason]);
      play('error');
    } else play('coin');
  };

  const askHint = async () => {
    const r = await game.act({ type: 'hint' });
    if (r.ok && r.hint) setHint(r.hint);
    else if (!r.ok) setError(actionText[r.reason]);
  };

  const names = new Map(room.players.map((p) => [p.id, p.name]));
  const current = room.players.find((p) => p.id === g.currentPlayerId);
  const history = [...g.history].reverse();

  return (
    <Shell
      game={game}
      room={room}
      strip={{
        order: g.order,
        active: g.currentPlayerId,
        dim: (p) => g.eliminated.includes(p.id),
        sub: (p) => `${g.words[p.id] ?? 0} từ`,
      }}
    >
      <Card style={styles.board}>
        <T testID="turn-label" style={[styles.turn, myTurn && { color: C.jade }]}>
          {myTurn ? 'Tới lượt bạn!' : current ? `Lượt của ${current.name}` : ''}
        </T>
        <T testID="current-word" style={styles.word} numberOfLines={1} adjustsFontSizeToFit>
          {first} <T style={styles.last}>{last}</T>
        </T>
        <T testID="next-count" style={styles.count}>
          Còn <T style={{ fontWeight: '900' }}>{g.nextCount}</T> từ có thể nối với “{last}”
        </T>
        <TimerBar testID="seconds-left" left={left} total={g.turnSeconds} />
      </Card>

      {meOut ? (
        <T style={styles.out}>Bạn đã bay màu. Ngồi xem và ném dép cổ vũ nhé 🩴</T>
      ) : myTurn ? (
        <View style={{ gap: 8 }}>
          <View style={styles.inputRow}>
            <TextInput
              testID="word-input"
              ref={inputRef}
              style={styles.input}
              value={text}
              onChangeText={(t) => {
                setText(t);
                setError(null);
              }}
              placeholder={`${last} …`}
              placeholderTextColor={C.muted}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={submit}
              blurOnSubmit={false}
            />
            <Button testID="submit-btn" title="Gửi" disabled={sending} onPress={submit} style={{ minWidth: 84 }} />
          </View>
          {error && <T testID="word-error" style={styles.error}>{error}</T>}
          {hint ? (
            <Button testID="hint-word" small variant="paper" title={`Gợi ý: ${hint} (chạm để điền)`} onPress={() => setText(hint)} />
          ) : (
            !g.hintUsed.includes(game.me ?? '') && (
              <Button testID="hint-btn" small variant="ghost" icon="🆘" title="Cứu trợ (1 lần mỗi ván)" onPress={askHint} />
            )
          )}
        </View>
      ) : (
        current && (
          <Button
            testID="poke-current"
            small
            variant="ghost"
            icon="⏰"
            title={`Hối ${current.name}`}
            onPress={() => game.sendFun({ kind: 'poke', to: current.id })}
          />
        )
      )}

      <Card style={styles.history}>
        {history.map((h, i) => (
          <HistoryRow key={g.history.length - i} item={h} isMe={(id) => id === game.me} names={names} />
        ))}
      </Card>
    </Shell>
  );
}

function HistoryRow({ item, isMe }: { item: WordHistoryItem; isMe: (id: string) => boolean; names: Map<string, string> }) {
  switch (item.kind) {
    case 'start':
      return <T style={styles.sys}>Từ mở đầu: {item.word}</T>;
    case 'newWord':
      return <T style={styles.sys}>Đổi từ mới: {item.word}</T>;
    case 'hint':
      return <T style={styles.sys}>{isMe(item.playerId) ? 'Bạn' : item.name} đã gọi cứu trợ 🆘</T>;
    case 'eliminated':
      return (
        <T style={[styles.sys, { color: C.danger }]}>
          {isMe(item.playerId) ? 'Bạn' : item.name} {item.reason === 'timeout' ? 'hết giờ, bay màu 💨' : 'đã rời phòng'}
        </T>
      );
    case 'word':
      return (
        <View style={styles.wordRow}>
          <T style={styles.wordText}>{item.word}</T>
          <T numberOfLines={1} style={styles.by}>{isMe(item.playerId) ? 'Bạn' : item.name}</T>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  board: { alignItems: 'center', gap: 8 },
  turn: { fontSize: 17, fontWeight: '800', color: C.muted, textAlign: 'center' },
  word: { fontSize: 44, fontWeight: '900', letterSpacing: -1, lineHeight: 52, maxWidth: '100%' },
  last: { color: C.son, fontSize: 44, fontWeight: '900' },
  count: { color: C.muted, fontSize: 15, textAlign: 'center' },
  out: { color: C.onSon, textAlign: 'center', fontWeight: '700', fontSize: 16 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  input: {
    flex: 1, minWidth: 0, fontFamily: FONT, backgroundColor: C.paper, borderRadius: 14, paddingHorizontal: 14, height: 54,
    fontSize: 20, fontWeight: '700', color: C.ink, borderWidth: 2.5, borderColor: C.ink,
  },
  error: { color: C.ink, backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  history: { gap: 2, paddingVertical: 10 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 3 },
  wordText: { fontSize: 18, fontWeight: '800' },
  by: { flex: 1, color: C.muted, fontSize: 14, textAlign: 'right' },
  sys: { color: C.muted, fontSize: 14, fontStyle: 'italic', paddingVertical: 3 },
});
