import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { toSyllables } from '../../../shared/src/vi';
import { hasVietMarks } from '../../../shared/src/en';
import { WORDCHAIN_DIFFICULTIES, WORDCHAIN_RULES } from '../../../shared/src/pos';
import {
  EN_HINT_EVERY, EN_RAMP_WORDS, EN_TURN_MIN_RATIO, TURN_SECONDS, enTurnMs,
  type RoomState, type WordChainView, type WordDefinition, type WordHistoryItem, type WordVote,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { actionText, quip } from '../messages';
import { useOnNew, useSecondsLeft, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { vibrate } from '../web';
import { C, FONT, backdropPalette, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { CompactPlayerStrip } from '../components/CompactPlayerStrip';
import { KeyboardLift } from '../components/KeyboardLift';
import { TimerBar } from '../components/TimerBar';
import { useShake } from '../components/Fun';
import { UiIcon } from '../components/Icons';

export function WordChainScreen({ game, room }: { game: Game; room: RoomState }) {
  const g = room.game as WordChainView;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const isEn = g.type === 'wordchain_en';
  const myTurn = g.currentPlayerId === game.me;
  const isSpectator = !g.order.includes(game.me ?? '');
  const meOut = g.eliminated.includes(game.me ?? '');
  const word = g.currentWord;
  const [first, last] = isEn ? [word.slice(0, -1), word.slice(-1)] : word.split(' ');
  const feed = useFeed();
  const shake = useShake();

  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const turnKey = `${g.currentPlayerId}|${word}`;
  const [prevTurnKey, setPrevTurnKey] = useState(turnKey);
  if (prevTurnKey !== turnKey) {
    setPrevTurnKey(turnKey);
    setText('');
    setError(null);
    setRejected(null);
  }

  const fullWord = (typed: string) => {
    if (isEn) {
      const clean = typed.normalize('NFC').trim().toLowerCase();
      return clean ? `${last}${clean}` : '';
    }
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
    play('turn', { speakerId: game.me });
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [game.me, myTurn, word]);

  const left = useSecondsLeft(g.turnEndsAt, game.clockOffset, g.turnSeconds);
  const lastTick = useRef(-1);
  useEffect(() => {
    if (myTurn && left === 3 && left !== lastTick.current) playMemePool('shock', { speakerId: game.me, cooldownMs: 3200 });
    if (myTurn && left > 0 && left <= 5 && left !== lastTick.current) play('tick', { speakerId: game.me });
    lastTick.current = left;
  }, [game.me, left, myTurn]);

  useOnNew(g.history, (h: WordHistoryItem) => {
    if (h.kind === 'word' && h.playerId !== game.me) play('pop', { memePool: 'correct', speakerId: h.playerId, cooldownMs: 2200 });
    if (h.kind === 'eliminated') {
      playMemePool(h.playerId === game.me ? 'lose' : 'eliminated', { speakerId: h.playerId, cooldownMs: 1800 });
      play(h.playerId === game.me ? 'lose' : 'splat', { speakerId: h.playerId });
      feed(h.reason === 'left' ? quip.left(h.name) : quip.eliminated(h.playerId === game.me ? 'Bạn' : h.name), 'bad');
      if (h.playerId === game.me) shake();
    }
    if (h.kind === 'newWord') {
      playMemePool('twist', { speakerId: null, cooldownMs: 1600 });
      play('reveal', { speakerId: null });
      feed(`Hết đường nối, đổi sang từ mới: ${h.word}`, 'info');
    }
    if (h.kind === 'hint' && h.playerId !== game.me) {
      playMemePool('help', { speakerId: h.playerId, cooldownMs: 2400 });
      feed(quip.hint(h.name), 'fun');
    }
    if (h.kind === 'vote') {
      playMemePool(h.approved ? 'correct' : 'wrong', { speakerId: h.playerId, cooldownMs: 1400 });
      if (h.approved) {
        play('win', { speakerId: h.playerId });
        feed(`Cả phòng duyệt “${h.word}” và thêm vào từ điển`, 'good');
      } else {
        play('lose', { speakerId: h.playerId });
        feed(`“${h.word}” chưa được duyệt`, 'bad');
      }
    }
  });

  const submit = async () => {
    if (!text.trim() || sending) return;
    const w = fullWord(text);
    setSending(true);
    const r = await game.act({ type: 'submit', word: w });
    setSending(false);
    inputRef.current?.focus();
    if (!r.ok) {
      const viKeys = isEn && r.reason !== 'vi_keyboard' && hasVietMarks(text);
      setError(
        r.reason === 'format' && isEn
          ? viKeys ? actionText.vi_keyboard : 'Từ phải là 1 từ đơn tiếng Anh (a–z), không dấu và không khoảng trắng.'
          : actionText[r.reason],
      );
      setRejected(r.reason === 'not_in_dictionary' ? r.word ?? w : null);
      playMemePool('wrong', { speakerId: game.me, cooldownMs: 1000 });
      play('error', { speakerId: game.me });
    } else {
      playMemePool('correct', { speakerId: game.me, cooldownMs: 2200 });
      play('coin', { speakerId: game.me });
    }
  };

  const appeal = async () => {
    if (!rejected) return;
    const r = await game.act({ type: 'appeal', word: rejected });
    if (r.ok) {
      setError(null);
      setRejected(null);
      playMemePool('defense', { speakerId: game.me, cooldownMs: 1400 });
      play('pop', { speakerId: game.me });
    } else {
      playMemePool('wrong', { speakerId: game.me, cooldownMs: 1200 });
      play('error', { speakerId: game.me });
      setError(actionText[r.reason]);
    }
  };

  const [hinting, setHinting] = useState(false);
  const askHint = async () => {
    if (hinting) return;
    setHinting(true);
    const r = await game.act({ type: 'hint' });
    setHinting(false);
    if (r.ok && r.hint) {
      playMemePool('help', { speakerId: game.me, cooldownMs: 1500 });
      play('coin', { speakerId: game.me });
      feed(`Cứu trợ nối hộ: ${r.hint}`, 'good');
    } else if (!r.ok) {
      playMemePool('wrong', { speakerId: game.me, cooldownMs: 1200 });
      play('error', { speakerId: game.me });
      setError(actionText[r.reason]);
    }
  };
  const voting = g.vote !== null;
  const me = game.me ?? '';
  const myHints = g.hintsLeft?.[me] ?? (g.hintUsed.includes(me) ? 0 : 1);
  const myCorrect = g.correct?.[me] ?? 0;
  const curCorrect = g.correct?.[g.currentPlayerId ?? ''] ?? 0;
  const baseMs = g.currentPlayerId
    ? Math.round((g.turnSeconds * 1000) / (1 - (1 - EN_TURN_MIN_RATIO) * (Math.min(curCorrect, EN_RAMP_WORDS) / EN_RAMP_WORDS)) / 100) * 100
    : TURN_SECONDS * 1000;
  const myTurnSec = isEn ? enTurnMs(baseMs, myCorrect) / 1000 : g.turnSeconds;
  const toBonus = EN_HINT_EVERY - (myCorrect % EN_HINT_EVERY);
  const fmtSec = (x: number) => `${Number.isInteger(x) ? x : x.toFixed(1).replace('.', ',')}s`;

  const { height, width } = useStableWindow();
  const compact = height < 700 || width < 380;
  const names = new Map(room.players.map((p) => [p.id, p.name]));
  const current = room.players.find((p) => p.id === g.currentPlayerId);
  const history = [...g.history].reverse();

  const controls = (
    <>
      {isSpectator ? null : meOut ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          <T style={[styles.out, { color: pal.muted }]}>Bạn đã hết lượt. Theo dõi và cổ vũ mọi người</T>
        </View>
      ) : myTurn ? (
        <>
          <KeyboardLift>
            <View style={styles.inputRow}>
              <View style={[styles.inputBox, voting && { opacity: 0.5 }]}>
                <View testID="word-prefix" style={styles.prefix} accessibilityLabel={`Chữ đầu: ${last}`}>
                  <T style={styles.prefixText}>{last}</T>
                  <UiIcon name="Lock" size={12} color={C.goldSoft} strokeWidth={1.75} />
                </View>
                <TextInput
                  testID="word-input"
                  ref={inputRef}
                  style={styles.input}
                  value={text}
                  editable={!voting}
                  autoComplete="off"
                  spellCheck={false}
                  {...(isEn && Platform.OS === 'android' ? { keyboardType: 'visible-password' as const } : {})}
                  {...(isEn && Platform.OS === 'web' ? ({ lang: 'en' } as object) : {})}
                  onChangeText={(t) => {
                    setText(t);
                    setError(null);
                    setRejected(null);
                  }}
                  placeholder={isEn ? 'nối tiếp' : 'chữ tiếp'}
                  placeholderTextColor={C.muted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={submit}
                  blurOnSubmit={false}
                />
              </View>
              <View onPointerDown={(e) => { if (Platform.OS === 'web') e.preventDefault(); }}>
                <Button testID="submit-btn" variant="ink" title="Gửi" disabled={sending || voting} onPress={submit} style={{ minWidth: 74 }} />
              </View>
            </View>
            {error && <T testID="word-error" style={styles.error}>{error}</T>}
            {rejected && !voting && (
              <Button testID="appeal-btn" small iconNode={<UiIcon name="HelpCircle" size={14} color={C.ink} strokeWidth={1.65} />} title={`Xin cả phòng duyệt “${rejected}”`} variant="paper" onPress={appeal} />
            )}
          </KeyboardLift>
          {myHints > 0 && (
            <Button
              testID="hint-btn"
              small
              variant="paper"
              iconNode={<UiIcon name="Lightbulb" size={14} color={C.secondary} strokeWidth={1.65} />}
              title={hinting ? 'Đang cứu trợ' : `Cứu trợ: nối hộ 1 từ (còn ${myHints})`}
              disabled={hinting || voting || sending}
              onPress={askHint}
            />
          )}
        </>
      ) : (
        current && (
          <Button
            testID="poke-current"
            small
            variant="paper"
            iconNode={<UiIcon name="Timer" size={14} color={C.secondary} strokeWidth={1.65} />}
            title={`Nhắc ${current.name}`}
            onPress={async () => {
              const r = await game.sendFun({ kind: 'poke', to: current.id });
              if (!r.ok && r.reason === 'limited') feed(`Nhắc nhẹ sau ${Math.ceil((r.retryMs ?? 1000) / 1000)} giây nữa`, 'info');
            }}
          />
        )
      )}
    </>
  );

  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      bottom={Platform.OS !== 'web' ? controls : undefined}
      overlay={g.vote && <VoteCard vote={g.vote} game={game} />}
    >
      <View style={styles.root}>
        <CompactPlayerStrip
          room={room}
          game={game}
          order={g.order}
          activeId={g.currentPlayerId}
          dark={pal.dark}
          dim={(p) => g.eliminated.includes(p.id)}
          sub={(p) => {
            const st = g.streaks?.[p.id] ?? 0;
            return st >= 2 ? `x${st} · ${g.words[p.id] ?? 0}` : `${g.words[p.id] ?? 0} từ`;
          }}
        />

        <Card style={[styles.board, compact && styles.boardCompact]}>
          {(g.difficulty && g.difficulty !== 'normal') || (g.rule && g.rule !== 'free') || (g.streaks?.[g.currentPlayerId ?? ''] ?? 0) >= 2 ? (
            <View style={styles.challengeRow} testID="wordchain-badges">
              {g.difficulty && g.difficulty !== 'normal' && (
                <View style={styles.challengePill}>
                  <T style={styles.challengeTxt}>{WORDCHAIN_DIFFICULTIES[g.difficulty].name}</T>
                </View>
              )}
              {g.rule && g.rule !== 'free' && (
                <View style={styles.challengePill}>
                  <T style={styles.challengeTxt}>
                    {WORDCHAIN_RULES[g.rule].name}{g.ruleRelaxed ? ' (Tạm nới)' : ''}
                  </T>
                </View>
              )}
              {(g.streaks?.[g.currentPlayerId ?? ''] ?? 0) >= 2 && (
                <View style={[styles.challengePill, styles.pillStreak]}>
                  <T style={[styles.challengeTxt, { color: C.goldDeep }]}>Chuỗi x{g.streaks?.[g.currentPlayerId ?? '']}</T>
                </View>
              )}
            </View>
          ) : null}
          <T testID="turn-label" style={[styles.turn, compact && { fontSize: 14 }, myTurn && { color: C.jade }]}>
            {myTurn ? 'Tới lượt bạn' : current ? `Lượt của ${current.name}` : ''}
          </T>
          <T testID="current-word" style={[styles.word, compact && styles.wordCompact]} numberOfLines={1} adjustsFontSizeToFit>
            {isEn ? first : `${first} `}<T style={[styles.last, compact && styles.wordCompact]}>{last}</T>
          </T>
          <Definition definition={g.currentDefinition} current />
          <T testID="next-count" style={[styles.count, compact && { fontSize: 12.5 }]}>
            Còn <T style={{ fontWeight: '600', color: C.ink }}>{g.nextCount}</T> từ có thể nối với “{last}”
          </T>
          {voting ? (
            <T style={styles.paused}>Đồng hồ tạm dừng khi cả phòng bỏ phiếu</T>
          ) : (
            <TimerBar testID="seconds-left" left={left} total={g.turnSeconds + (g.turnBonusMs ?? 0) / 1000} />
          )}
          {!voting && (g.turnBonusMs ?? 0) > 0 && (
            <T testID="turn-bonus" style={styles.bonus}>
              Bù +{fmtSec((g.turnBonusMs ?? 0) / 1000)} cho {myTurn ? 'bạn' : current?.name ?? 'người chơi'}
            </T>
          )}
          {isEn && !isSpectator && !meOut && (
            <T testID="en-progress" style={styles.progress}>
              Lượt bạn: {fmtSec(myTurnSec)}{myCorrect < EN_RAMP_WORDS ? ' (tới 15s)' : ''} · Cứu trợ: {myHints} · +{toBonus} từ thêm cứu trợ
            </T>
          )}
        </Card>

        {Platform.OS === 'web' && controls}

        <Card style={styles.historyWrap}>
          <ScrollView style={styles.historyScroll} contentContainerStyle={styles.history} keyboardShouldPersistTaps="handled">
            {history.map((h, i) => (
              <HistoryRow key={g.history.length - i} item={h} isMe={(id) => id === game.me} names={names} />
            ))}
          </ScrollView>
        </Card>
      </View>
    </Shell>
  );
}

function VoteCard({ vote, game }: { vote: WordVote; game: Game }) {
  const me = game.me ?? '';
  const left = useSecondsLeft(vote.endsAt, game.clockOffset, 99);
  const canVote = vote.voters.includes(me);
  const myVote = vote.yes.includes(me) ? 'yes' : vote.no.includes(me) ? 'no' : null;
  const cast = (yes: boolean) => {
    play('pop', { speakerId: game.me });
    void game.act({ type: 'vote', yes });
  };
  return (
    <View pointerEvents="box-none" style={styles.voteLayer}>
      <View testID="vote-card" style={[styles.voteCard, sticker(3)]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <UiIcon name="BookOpen" size={16} color={C.secondary} strokeWidth={1.65} />
          <T style={styles.voteHead}>{vote.byId === me ? 'Bạn' : vote.byName} xin duyệt từ</T>
        </View>
        <T style={styles.voteWord}>“{vote.word}”</T>
        <T style={styles.voteSub}>
          {canVote ? 'Từ này có nghĩa không' : vote.byId === me ? 'Đang chờ cả phòng bỏ phiếu' : 'Cả phòng đang bỏ phiếu'} ({left}s)
        </T>
        <View testID="vote-tally" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <UiIcon name="Check" size={15} color={C.jade} strokeWidth={1.75} />
            <T style={styles.tally}>{vote.yes.length}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <UiIcon name="X" size={15} color={C.danger} strokeWidth={1.75} />
            <T style={styles.tally}>{vote.no.length}</T>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <UiIcon name="Timer" size={15} color={C.muted} strokeWidth={1.75} />
            <T style={styles.tally}>{vote.voters.length - vote.yes.length - vote.no.length}</T>
          </View>
        </View>
        {canVote && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              testID="vote-yes"
              iconNode={<UiIcon name="Check" size={15} color={myVote === 'yes' ? '#FFFFFF' : C.jade} strokeWidth={1.75} />}
              title="Có nghĩa"
              variant={myVote === 'yes' ? 'jade' : 'paper'}
              style={{ flex: 1 }}
              onPress={() => cast(true)}
            />
            <Button
              testID="vote-no"
              iconNode={<UiIcon name="X" size={15} color={myVote === 'no' ? C.onSon : C.danger} strokeWidth={1.75} />}
              title="Không"
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
  if (!text || text === 'Chưa có giải nghĩa') return null;
  return (
    <View style={[styles.definition, current && styles.currentDefinition]} testID={current ? 'current-definition' : 'history-definition'}>
      <T numberOfLines={current ? 3 : undefined} style={styles.definitionText}>{text}</T>
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
      return <T style={styles.sys}>{isMe(item.playerId) ? 'Bạn' : item.name} đã dùng cứu trợ</T>;
    case 'vote':
      return (
        <View style={styles.historyEntry}>
          <T style={[styles.sys, { color: item.approved ? C.jade : C.danger }]}>
            {item.approved ? `Cả phòng duyệt “${item.word}” (từ mới)` : `“${item.word}” chưa được duyệt`}
          </T>
          <Definition definition={item.definition} />
        </View>
      );
    case 'eliminated':
      return (
        <T style={[styles.sys, { color: C.danger }]}>
          {isMe(item.playerId) ? 'Bạn' : item.name} {item.reason === 'timeout' ? 'hết giờ' : 'đã rời phòng'}
        </T>
      );
    case 'word':
      return (
        <View style={styles.historyEntry}>
          <View style={styles.wordRow}>
            <T style={styles.wordText}>{item.word}{item.hint ? ' (Cứu trợ)' : ''}</T>
            <T style={styles.by}>{isMe(item.playerId) ? 'Bạn' : item.name}</T>
          </View>
          <Definition definition={item.definition} />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, gap: 8 },
  board: { alignItems: 'center', gap: 6, paddingVertical: 10 },
  boardCompact: { gap: 4, paddingVertical: 8, paddingHorizontal: 10 },
  turn: { fontSize: 14.5, fontWeight: '600', color: C.secondary, textAlign: 'center' },
  word: { fontSize: 36, fontWeight: '600', letterSpacing: -0.6, lineHeight: 44, maxWidth: '100%', color: C.ink },
  wordCompact: { fontSize: 30, lineHeight: 36 },
  last: { color: C.son, fontSize: 36, fontWeight: '600' },
  count: { color: C.secondary, fontSize: 13.5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  out: { textAlign: 'center', fontWeight: '500', fontSize: 14.5 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  inputBox: {
    flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: C.paper, borderRadius: 10, height: 46,
    borderWidth: 1, borderColor: C.borderStrong, paddingLeft: 6, overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.ink, borderRadius: 7, paddingHorizontal: 10,
    height: 34, flexShrink: 0,
  },
  prefixText: { color: C.onSon, fontSize: 16, fontWeight: '600' },
  input: {
    flex: 1, minWidth: 0, fontFamily: FONT, paddingHorizontal: 10, height: '100%',
    fontSize: 16.5, fontWeight: '500', color: C.ink, outlineStyle: 'none',
  } as object,
  paused: { color: C.son, fontWeight: '600', fontSize: 13 },
  bonus: { color: C.jade, fontWeight: '600', fontSize: 12.5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  progress: { color: C.muted, fontWeight: '500', fontSize: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  voteLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', padding: 16, zIndex: 75, backgroundColor: 'rgba(28,25,23,0.45)' },
  voteCard: { backgroundColor: C.paper, borderRadius: 16, padding: 16, gap: 10, alignItems: 'stretch' },
  voteHead: { fontSize: 14.5, fontWeight: '600', color: C.secondary, textAlign: 'center' },
  voteWord: { fontSize: 28, fontWeight: '600', textAlign: 'center', color: C.ink },
  voteSub: { fontSize: 14, fontWeight: '500', color: C.secondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
  tally: { fontSize: 17, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'], color: C.ink },
  voteNote: { fontSize: 12, color: C.muted, textAlign: 'center' },
  error: { color: C.danger, backgroundColor: C.dangerSoft, borderWidth: 1, borderColor: 'rgba(185,28,28,0.28)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, fontWeight: '500', fontSize: 13, overflow: 'hidden' },
  historyWrap: { flex: 1, minHeight: 56, paddingVertical: 6 },
  historyScroll: { flex: 1 },
  history: { gap: 2, paddingVertical: 4 },
  historyEntry: { paddingVertical: 6, gap: 2, minWidth: 0, borderBottomWidth: 1, borderBottomColor: C.borderSubtle },
  definition: { gap: 3, minWidth: 0, alignSelf: 'stretch' },
  currentDefinition: { backgroundColor: C.mist, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  definitionText: { color: C.secondary, fontSize: 13.5, lineHeight: 19 },
  wordRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingVertical: 2 },
  wordText: { fontSize: 15.5, fontWeight: '600', color: C.ink, flexShrink: 1 },
  by: { flex: 1, color: C.muted, fontSize: 12.5, textAlign: 'right', wordBreak: 'break-word' } as object,
  sys: { color: C.muted, fontSize: 13, paddingVertical: 3 },
  challengeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 2 },
  challengePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: C.mist, borderWidth: 1, borderColor: C.borderSubtle },
  pillStreak: { backgroundColor: C.goldSoft, borderColor: 'rgba(180,83,9,0.28)' },
  challengeTxt: { fontSize: 11.5, fontWeight: '600', color: C.secondary, fontVariant: ['tabular-nums'] },
});
