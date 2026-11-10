import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { toSyllables } from '../../../shared/src/vi';
import type { RoomState, WordChainView, WordDefinition, WordHistoryItem, WordVote } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { shortName } from '../avatars';
import { actionText, quip } from '../messages';
import { useOnNew, useSecondsLeft } from '../hooks';
import { play } from '../sound';
import { vibrate } from '../web';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { KeyboardLift } from '../components/KeyboardLift';
import { TimerBar } from '../components/TimerBar';
import { useShake } from '../components/Fun';

export function WordChainScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as WordChainView;
  const myTurn = g.currentPlayerId === game.me;
  const isSpectator = !g.order.includes(game.me ?? '');
  const meOut = g.eliminated.includes(game.me ?? '');
  const word = g.currentWord;
  const [first, last] = word.split(' ');
  const feed = useFeed();
  const shake = useShake();

  // chữ đầu đã khóa (= chữ cuối của từ trước), ô nhập chỉ chứa chữ thứ hai
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  // sang lượt mới: xóa ô nhập (cập nhật ngay khi render, không dùng effect)
  const turnKey = `${g.currentPlayerId}|${word}`;
  const [prevTurnKey, setPrevTurnKey] = useState(turnKey);
  if (prevTurnKey !== turnKey) {
    setPrevTurnKey(turnKey);
    setText('');
    setError(null);
    setRejected(null);
    setHint(null);
  }

  /** ghép chữ đầu đã khóa với phần người chơi gõ (bỏ chữ đầu nếu lỡ gõ lại) */
  const fullWord = (typed: string) => {
    const parts = typed.normalize('NFC').trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      const a = toSyllables(parts[0])?.[0];
      const b = toSyllables(last)?.[0];
      if (a && a === b) parts.shift();
    }
    return `${last} ${parts.join(' ')}`;
  };

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
    if (h.kind === 'vote') {
      if (h.approved) {
        play('win');
        feed(`Cả phòng duyệt “${h.word}”, thêm vào từ điển 📚`, 'good');
      } else {
        play('lose');
        feed(`“${h.word}” không được duyệt ❌`, 'bad');
      }
    }
  });

  const submit = async () => {
    if (!text.trim() || sending) return;
    const w = fullWord(text);
    setSending(true);
    const r = await game.act({ type: 'submit', word: w });
    setSending(false);
    if (!r.ok) {
      setError(actionText[r.reason]);
      setRejected(r.reason === 'not_in_dictionary' ? w : null);
      play('error');
    } else play('coin');
  };

  const appeal = async () => {
    if (!rejected) return;
    const r = await game.act({ type: 'appeal', word: rejected });
    if (r.ok) {
      setError(null);
      setRejected(null);
      play('pop');
    } else setError(actionText[r.reason]);
  };

  const askHint = async () => {
    const r = await game.act({ type: 'hint' });
    if (r.ok && r.hint) setHint(r.hint);
    else if (!r.ok) setError(actionText[r.reason]);
  };
  const voting = g.vote !== null;

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
      overlay={g.vote && <VoteCard vote={g.vote} game={game} />}
    >
      <Card style={styles.board}>
        <T testID="turn-label" style={[styles.turn, myTurn && { color: C.jade }]}>
          {myTurn ? 'Tới lượt bạn!' : current ? `Lượt của ${shortName(current.name, 14)}` : ''}
        </T>
        <T testID="current-word" style={styles.word} numberOfLines={1} adjustsFontSizeToFit>
          {first} <T style={styles.last}>{last}</T>
        </T>
        <Definition definition={g.currentDefinition} current />
        <T testID="next-count" style={styles.count}>
          Còn <T style={{ fontWeight: '900' }}>{g.nextCount}</T> từ có thể nối với “{last}”
        </T>
        {voting ? (
          <T style={styles.paused}>⏸ Đồng hồ tạm dừng trong lúc bỏ phiếu</T>
        ) : (
          <TimerBar testID="seconds-left" left={left} total={g.turnSeconds} />
        )}
      </Card>

      {isSpectator ? null : meOut ? (
        <T style={styles.out}>Bạn đã bay màu. Ngồi xem và ném dép cổ vũ nhé 🩴</T>
      ) : myTurn ? (
        <>
          <KeyboardLift>
            <View style={styles.inputRow}>
              <View style={[styles.inputBox, voting && { opacity: 0.5 }]}>
                <View testID="word-prefix" style={styles.prefix} accessibilityLabel={`Chữ đầu: ${last}`}>
                  <T style={styles.prefixText}>{last}</T>
                  <T style={styles.lock}>🔒</T>
                </View>
                <TextInput
                  testID="word-input"
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  editable={!voting}
                  onChangeText={(t) => {
                    setText(t);
                    setError(null);
                    setRejected(null);
                  }}
                  placeholder="chữ tiếp…"
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={submit}
                  blurOnSubmit={false}
                />
              </View>
              <Button testID="submit-btn" title="Gửi" disabled={sending || voting} onPress={submit} style={{ minWidth: 76, marginBottom: 0 }} />
            </View>
            {error && <T testID="word-error" style={styles.error}>{error}</T>}
            {rejected && !voting && (
              <Button testID="appeal-btn" small icon="🙋" title={`Xin cả phòng duyệt “${rejected}”`} variant="ink" onPress={appeal} />
            )}
          </KeyboardLift>
          {hint ? (
            <Button
              testID="hint-word"
              small
              variant="paper"
              title={`Gợi ý: ${hint} (chạm để điền)`}
              onPress={() => setText(hint.split(' ').slice(1).join(' '))}
            />
          ) : (
            !g.hintUsed.includes(game.me ?? '') && (
              <Button testID="hint-btn" small variant="ghost" icon="🆘" title="Cứu trợ (1 lần mỗi ván)" onPress={askHint} />
            )
          )}
        </>
      ) : (
        current && (
          <Button
            testID="poke-current"
            small
            variant="ghost"
            icon="⏰"
            title={`Hối ${shortName(current.name, 14)}`}
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

function VoteCard({ vote, game }: { vote: WordVote; game: Game }) {
  const me = game.me ?? '';
  const left = useSecondsLeft(vote.endsAt, game.clockOffset, 99);
  const canVote = vote.voters.includes(me);
  const myVote = vote.yes.includes(me) ? 'yes' : vote.no.includes(me) ? 'no' : null;
  const cast = (yes: boolean) => {
    play('pop');
    void game.act({ type: 'vote', yes });
  };
  return (
    <View pointerEvents="box-none" style={styles.voteLayer}>
      <View testID="vote-card" style={[styles.voteCard, sticker(6)]}>
        <T style={styles.voteHead}>🗳️ {vote.byId === me ? 'Bạn' : vote.byName} xin duyệt từ</T>
        <T style={styles.voteWord}>“{vote.word}”</T>
        <T style={styles.voteSub}>
          {canVote ? 'Từ này có nghĩa không?' : vote.byId === me ? 'Đang chờ cả phòng bỏ phiếu…' : 'Cả phòng đang bỏ phiếu…'} ({left}s)
        </T>
        <T testID="vote-tally" style={styles.tally}>
          👍 {vote.yes.length}   👎 {vote.no.length}   ⏳ {vote.voters.length - vote.yes.length - vote.no.length}
        </T>
        {canVote && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              testID="vote-yes"
              title="👍 Có nghĩa"
              variant={myVote === 'yes' ? 'jade' : 'paper'}
              style={{ flex: 1 }}
              onPress={() => cast(true)}
            />
            <Button
              testID="vote-no"
              title="👎 Không"
              variant={myVote === 'no' ? 'ink' : 'paper'}
              style={{ flex: 1 }}
              onPress={() => cast(false)}
            />
          </View>
        )}
        <T style={styles.voteNote}>Đồng ý nhiều hơn phản đối thì được tính và lưu vào từ điển.</T>
      </View>
    </View>
  );
}

function Definition({ definition, current = false }: { definition?: WordDefinition; current?: boolean }) {
  const text = definition?.text.trim();
  const source = definition?.source?.trim();
  // server trả câu "Chưa có giải nghĩa" khi thiếu nghĩa: ẩn hẳn khung
  if (!text || text === 'Chưa có giải nghĩa') return null;
  return (
    <View style={[styles.definition, current && styles.currentDefinition]} testID={current ? 'current-definition' : 'history-definition'}>
      <T numberOfLines={current ? 2 : undefined} style={styles.definitionText}>{text}</T>
      {source && <T numberOfLines={current ? 1 : undefined} style={styles.definitionSource}>Nguồn: {source}</T>}
    </View>
  );
}

function HistoryRow({ item, isMe }: { item: WordHistoryItem; isMe: (id: string) => boolean; names: Map<string, string> }) {
  switch (item.kind) {
    case 'start':
      return (
        <View style={styles.historyEntry}>
          <T style={styles.sys}>Từ mở đầu: {item.word}</T>
          <Definition definition={item.definition} />
        </View>
      );
    case 'newWord':
      return (
        <View style={styles.historyEntry}>
          <T style={styles.sys}>Đổi từ mới: {item.word}</T>
          <Definition definition={item.definition} />
        </View>
      );
    case 'hint':
      return <T style={styles.sys}>{isMe(item.playerId) ? 'Bạn' : item.name} đã gọi cứu trợ 🆘</T>;
    case 'vote':
      return (
        <View style={styles.historyEntry}>
          <T style={[styles.sys, { color: item.approved ? C.jade : C.danger }]}>
            {item.approved ? `✅ Cả phòng duyệt “${item.word}” (từ mới)` : `❌ “${item.word}” không được duyệt`}
          </T>
          <Definition definition={item.definition} />
        </View>
      );
    case 'eliminated':
      return (
        <T style={[styles.sys, { color: C.danger }]}>
          {isMe(item.playerId) ? 'Bạn' : item.name} {item.reason === 'timeout' ? 'hết giờ, bay màu 💨' : 'đã rời phòng'}
        </T>
      );
    case 'word':
      return (
        <View style={styles.historyEntry}>
          <View style={styles.wordRow}>
            <T style={styles.wordText}>{item.word}</T>
            <T numberOfLines={1} style={styles.by}>{isMe(item.playerId) ? 'Bạn' : item.name}</T>
          </View>
          <Definition definition={item.definition} />
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
  inputBox: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 14, height: 54,
    borderWidth: 2.5, borderColor: C.ink, paddingLeft: 6, overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: C.son, borderRadius: 10, paddingHorizontal: 10,
    height: 40, flexShrink: 0,
  },
  prefixText: { color: C.paper, fontSize: 20, fontWeight: '900' },
  lock: { fontSize: 11, marginTop: -10 },
  input: {
    flex: 1, minWidth: 0, fontFamily: FONT, paddingHorizontal: 10, height: '100%',
    fontSize: 20, fontWeight: '700', color: C.ink, outlineStyle: 'none',
  } as object,
  paused: { color: C.son, fontWeight: '800', fontSize: 14 },
  voteLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', padding: 16, zIndex: 75 },
  voteCard: { backgroundColor: C.paper, borderRadius: 22, padding: 18, gap: 10, alignItems: 'stretch' },
  voteHead: { fontSize: 16, fontWeight: '800', color: C.muted, textAlign: 'center' },
  voteWord: { fontSize: 36, fontWeight: '900', textAlign: 'center', color: C.son },
  voteSub: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  tally: { fontSize: 20, fontWeight: '900', textAlign: 'center' },
  voteNote: { fontSize: 12, color: C.muted, textAlign: 'center' },
  error: { color: C.ink, backgroundColor: C.gold, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, fontWeight: '700', overflow: 'hidden' },
  history: { gap: 2, paddingVertical: 10 },
  historyEntry: { paddingVertical: 7, gap: 2, minWidth: 0 },
  definition: { gap: 3, minWidth: 0, alignSelf: 'stretch' },
  currentDefinition: { backgroundColor: C.mist, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  definitionText: { color: C.ink, fontSize: 14, lineHeight: 21 },
  definitionMissing: { color: C.muted, fontStyle: 'italic' },
  definitionSource: { color: C.muted, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 3 },
  wordText: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
  by: { flex: 1, color: C.muted, fontSize: 14, textAlign: 'right' },
  sys: { color: C.muted, fontSize: 14, fontStyle: 'italic', paddingVertical: 3 },
});
