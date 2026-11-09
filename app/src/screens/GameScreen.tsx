import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import type { HistoryItem, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { rejectText } from '../messages';
import { Button, colors, common } from '../ui';

/** Số giây còn lại của lượt, tính theo đồng hồ server */
function useSecondsLeft(endsAt: number | null, offset: number): number {
  const calc = () => (endsAt ? Math.max(0, Math.ceil((endsAt - (Date.now() + offset)) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!endsAt) return;
    const t = setInterval(() => setLeft(calc()), 250);
    return () => clearInterval(t);
  }, [endsAt, offset]);
  return left;
}

export function GameScreen({ game, room }: { game: Game; room: RoomState }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const names = useMemo(() => new Map(room.players.map((p) => [p.id, p.name])), [room.players]);
  const myTurn = room.currentPlayerId === game.me;
  const meEliminated = room.players.find((p) => p.id === game.me)?.eliminated ?? false;
  const word = room.currentWord ?? '';
  const last = word.split(' ')[1] ?? '';
  const left = useSecondsLeft(room.turnEndsAt, game.clockOffset);

  // tới lượt mình: điền sẵn chữ cuối để chỉ cần gõ thêm chữ thứ hai
  useEffect(() => {
    setError(null);
    if (myTurn) {
      setText(last + ' ');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else setText('');
  }, [myTurn, word]);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const reason = await game.submit(text);
    setSending(false);
    if (reason) setError(rejectText[reason]);
  };

  const history = useMemo(() => [...room.history].reverse(), [room.history]);
  const current = names.get(room.currentPlayerId ?? '') ?? '';

  return (
    <View style={[common.screen, { flex: 1 }]}>
      <View style={styles.topRow}>
        <Text style={common.label}>Phòng {room.code}</Text>
        <Text testID="seconds-left" style={[styles.timer, left <= 5 && { color: colors.danger }]}>{left}s</Text>
      </View>

      <View style={[common.card, { alignItems: 'center', gap: 6 }]}>
        <Text testID="turn-label" style={[styles.turn, myTurn && { color: colors.ok }]}>
          {myTurn ? 'Tới lượt bạn!' : `Lượt của ${current}`}
        </Text>
        <Text testID="current-word" style={styles.word}>
          {word.split(' ')[0]} <Text style={{ color: colors.primary }}>{last}</Text>
        </Text>
        <Text testID="next-count" style={common.muted}>
          Còn <Text style={{ fontWeight: '800', color: colors.text }}>{room.nextCount ?? 0}</Text> từ có thể nối
          với “{last}”
        </Text>
      </View>

      {meEliminated ? (
        <Text style={[common.muted, { textAlign: 'center' }]}>Bạn đã bị loại — ngồi xem mọi người nối tiếp nhé.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              testID="word-input"
              ref={inputRef}
              style={[common.input, { flex: 1, minWidth: 0 }]}
              value={text}
              onChangeText={(t) => {
                setText(t);
                setError(null);
              }}
              editable={myTurn}
              placeholder={myTurn ? `${last} …` : 'Chờ tới lượt…'}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={submit}
              blurOnSubmit={false}
            />
            <View style={{ width: 90 }}>
              <Button testID="submit-btn" title="Gửi" disabled={!myTurn || sending} onPress={submit} />
            </View>
          </View>
          {error && <Text testID="word-error" style={common.error}>{error}</Text>}
        </View>
      )}

      <View style={styles.players}>
        {room.players.map((p) => (
          <View
            key={p.id}
            style={[styles.chip, p.id === room.currentPlayerId && styles.chipActive, p.eliminated && styles.chipOut]}
          >
            <Text style={[styles.chipText, p.eliminated && { textDecorationLine: 'line-through' }]}>
              {p.name}
              {p.id === game.me ? ' (bạn)' : ''} · {p.words}
              {!p.connected ? ' ⚠' : ''}
            </Text>
          </View>
        ))}
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={history}
        keyExtractor={(_, i) => String(history.length - i)}
        renderItem={({ item }) => <HistoryRow item={item} />}
      />

      <Button title="Thoát ván" variant="ghost" onPress={game.leave} />
    </View>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  switch (item.kind) {
    case 'start':
      return <Text style={styles.sys}>Từ mở đầu: {item.word}</Text>;
    case 'newWord':
      return <Text style={styles.sys}>Không còn từ để nối — đổi sang từ mới: {item.word}</Text>;
    case 'eliminated':
      return (
        <Text style={[styles.sys, { color: colors.danger }]}>
          {item.name} {item.reason === 'timeout' ? 'hết giờ, bị loại' : 'đã rời phòng'}
        </Text>
      );
    case 'word':
      return (
        <Text style={styles.row}>
          <Text style={{ fontWeight: '700' }}>{item.word}</Text>
          <Text style={{ color: colors.muted }}> — {item.name}</Text>
        </Text>
      );
  }
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timer: { fontSize: 28, fontWeight: '900', color: colors.text },
  turn: { fontSize: 18, fontWeight: '700', color: colors.muted },
  word: { fontSize: 36, fontWeight: '900', color: colors.text },
  players: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: '#FFE8D6' },
  chipOut: { opacity: 0.45 },
  chipText: { fontSize: 14, color: colors.text },
  sys: { fontSize: 14, color: colors.muted, paddingVertical: 4, fontStyle: 'italic' },
  row: { fontSize: 17, color: colors.text, paddingVertical: 4 },
});
