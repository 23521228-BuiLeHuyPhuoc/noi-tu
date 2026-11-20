import { Image } from '../components/Image';
import { memo, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  WHO_IS_IT_TRAITS,
  whoIsItGridDims,
  type WhoIsItCharacter,
  type WhoIsItTraitGroup,
  type WhoIsItView,
} from '../../../shared/src/whoisit';
import type { RoomState } from '../../../shared/src/types';
import { actionText } from '../messages';
import { useOnChange, useStableWindow } from '../hooks';
import { play, playMemePool } from '../sound';
import { C, backdropPalette } from '../theme';
import { whoIsItPortraitUri } from '../whoisitPortraits';
import type { Game } from '../useGame';
import { Button, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { CountdownBar } from '../components/TimerBar';
import { UiIcon } from '../components/Icons';

const TRAIT_GROUPS: { key: WhoIsItTraitGroup; label: string }[] = [
  { key: 'toc_mu', label: 'Tóc/Mũ' },
  { key: 'mat_kinh', label: 'Mắt/Kính' },
  { key: 'rau_ct', label: 'Râu/Nét' },
  { key: 'ao_khac', label: 'Áo/Da' },
];

const QUICK_WI_CHATS = [
  'Hỏi nam/nữ trước đi!',
  'Hỏi đeo kính hoặc mũ!',
  'Chắc chắn người này rồi!',
  'Từ từ hãy đoán, hỏi thêm!',
];

const CharacterCell = memo(function CharacterCell({
  ch,
  flipped,
  isSecret,
  guessMode,
  justFlipped,
  oppView,
  dense,
  onPress,
  onLongPress,
}: {
  ch: WhoIsItCharacter;
  flipped: boolean;
  isSecret: boolean;
  guessMode: boolean;
  justFlipped: boolean;
  oppView: boolean;
  dense: boolean;
  onPress: (c: WhoIsItCharacter) => void;
  onLongPress: (c: WhoIsItCharacter) => void;
}) {
  const uri = whoIsItPortraitUri(ch);
  return (
    <Pressable
      testID={`wi-card-${ch.id}`}
      onPress={() => onPress(ch)}
      onLongPress={() => onLongPress(ch)}
      style={({ pressed }) => [
        styles.cell,
        oppView && styles.cellOppBoard,
        flipped && styles.cellFlipped,
        justFlipped && styles.cellJustFlipped,
        isSecret && styles.cellSecret,
        guessMode && !flipped && !oppView && styles.cellGuessReady,
        pressed && { opacity: 0.78 },
      ]}
    >
      <View style={styles.cellImgWrap}>
        <Image
          source={{ uri }}
          style={[styles.cellImg, flipped && styles.cellImgFlipped]}
          resizeMode="contain"
        />
        {flipped && (
          <View pointerEvents="none" style={styles.flippedMask}>
            <T style={[styles.flippedX, dense && { fontSize: 15 }]}>✕</T>
          </View>
        )}
        {isSecret && (
          <View pointerEvents="none" style={styles.secretStar}>
            <T style={styles.secretStarTxt}>★</T>
          </View>
        )}
      </View>
      <View style={[styles.cellNameBox, oppView && styles.cellNameBoxOpp, flipped && styles.cellNameBoxFlipped]}>
        <T
          numberOfLines={1}
          style={[
            styles.cellName,
            dense && styles.cellNameDense,
            flipped && styles.cellNameFlipped,
          ]}
        >
          {ch.name}
        </T>
      </View>
    </Pressable>
  );
});

export function WhoIsItScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as WhoIsItView;
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const feed = useFeed();
  const { width, height } = useStableWindow();
  const compactPortrait = width < 700 || height >= width;
  const { cols, rows } = useMemo(
    () => whoIsItGridDims(view.boardSize, compactPortrait),
    [view.boardSize, compactPortrait],
  );
  const dense = view.boardSize >= 36;

  const [traitTab, setTraitTab] = useState<WhoIsItTraitGroup>('toc_mu');
  const [freeAskMode, setFreeAskMode] = useState(false);
  const [freeQuestion, setFreeQuestion] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [peekOpen, setPeekOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [seenChatId, setSeenChatId] = useState(0);
  const [zoomChar, setZoomChar] = useState<WhoIsItCharacter | null>(null);
  const [guessMode, setGuessMode] = useState(false);
  const [busy, setBusy] = useState(false);

  const isMyTeamTurn = view.myTeam !== null && view.myTeam === view.turnTeam;
  const needsMySecret = view.phase === 'pick_secret' && view.myTeam !== null && !view.secretReady[view.myTeam];
  const needsFreeAnswer = view.phase === 'answer_free' && view.pendingQuestion !== null && view.myTeam !== null && view.myTeam !== view.turnTeam;

  // Tự động chuyển sang nhìn bảng ĐỐI PHƯƠNG khi tới lượt họ hỏi/úp thẻ, và chuyển về bảng MÌNH khi tới lượt mình!
  const autoSide: 'mine' | 'opp' =
    view.phase !== 'pick_secret' && view.myTeam !== null && !isMyTeamTurn && (view.phase === 'ask' || view.phase === 'review' || view.phase === 'turn_beat')
      ? 'opp'
      : 'mine';
  const turnKey = `${view.roundCount}:${view.turnTeam}:${view.phase === 'pick_secret' ? 'p' : 'g'}`;
  const [sideOverride, setSideOverride] = useState<{ key: string; side: 'mine' | 'opp' } | null>(null);
  const boardSide: 'mine' | 'opp' = sideOverride?.key === turnKey ? sideOverride.side : autoSide;
  const setBoardSide = (side: 'mine' | 'opp') => setSideOverride({ key: turnKey, side });

  const lastTeamMsg = view.teamChat.at(-1) ?? null;
  const unreadTeam = chatOpen ? 0 : view.teamChat.filter((m) => m.id > seenChatId && m.fromId !== game.me).length;

  const myFlippedSet = useMemo(() => new Set(view.myFlipped), [view.myFlipped]);
  const oppFlippedSet = useMemo(() => new Set(view.oppFlipped), [view.oppFlipped]);
  const lastFlippedSet = useMemo(() => new Set(view.lastFlippedIds), [view.lastFlippedIds]);

  const activeFlippedSet = boardSide === 'opp' ? oppFlippedSet : myFlippedSet;

  const askedTraitSet = useMemo(
    () => new Set(view.history.filter((h) => h.team === view.myTeam && h.traitKey).map((h) => h.traitKey!)),
    [view.history, view.myTeam],
  );
  const mySecretChar = useMemo(
    () => (view.mySecretId ? view.characters.find((c) => c.id === view.mySecretId) ?? null : null),
    [view.characters, view.mySecretId],
  );

  // Đếm trước số thẻ còn mở khớp từng đặc điểm trên bảng đội mình (giúp chọn câu hỏi chia đôi thông minh!)
  const openTraitCounts = useMemo(() => {
    const remaining = view.characters.filter((c) => !myFlippedSet.has(c.id));
    const map = new Map<string, number>();
    for (const tr of WHO_IS_IT_TRAITS) {
      map.set(tr.key, remaining.filter(tr.match).length);
    }
    return map;
  }, [view.characters, myFlippedSet]);

  useOnChange(view.phase, (ph) => {
    if (ph === 'ask' && view.roundCount === 1) {
      playMemePool('shock', { speakerId: view.activePlayerId, cooldownMs: 1200 });
      play('turn', { speakerId: view.activePlayerId });
    } else if (ph === 'answer_free') {
      playMemePool('vote', { speakerId: view.activePlayerId, cooldownMs: 1200 });
      play('pop', { speakerId: view.activePlayerId });
    }
    if (ph !== 'ask') setGuessMode(false);
  });

  useOnChange(view.lastQA?.id, (id) => {
    if (!id || !view.lastQA) return;
    if (view.lastQA.kind === 'guess') {
      playMemePool(view.lastQA.answer ? 'win' : 'wrong', { speakerId: view.lastQA.askedById, cooldownMs: 800 });
      play(view.lastQA.answer ? 'stamp' : 'error', { speakerId: view.lastQA.askedById });
    } else {
      playMemePool(view.lastQA.answer ? 'correct' : 'twist', { speakerId: view.lastQA.askedById, cooldownMs: 1100 });
      play('pop', { speakerId: view.lastQA.askedById });
    }
  });

  const boardRows = useMemo(() => {
    const out: WhoIsItCharacter[][] = [];
    for (let r = 0; r < rows; r++) {
      out.push(view.characters.slice(r * cols, (r + 1) * cols));
    }
    return out;
  }, [view.characters, rows, cols]);

  const actSafe = async (payload: Parameters<Game['act']>[0]) => {
    if (busy) return false;
    setBusy(true);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) {
      feed(actionText[res.reason] ?? 'Chưa thực hiện được', 'bad');
      return false;
    }
    return true;
  };

  const handleCardPress = async (ch: WhoIsItCharacter) => {
    if (view.myTeam === null || boardSide === 'opp') {
      setZoomChar(ch);
      return;
    }
    if (view.phase === 'pick_secret') {
      const ok = await actSafe({ type: 'wi_pick_secret', characterId: ch.id });
      if (ok) {
        playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1200 });
        play('stamp', { speakerId: game.me });
      }
      return;
    }
    if (guessMode && isMyTeamTurn && view.phase === 'ask') {
      setZoomChar(ch);
      return;
    }
    const ok = await actSafe({ type: 'wi_toggle_flip', characterId: ch.id });
    if (ok) play('flip', { speakerId: game.me });
  };

  const handleAskTrait = async (traitKey: string) => {
    const ok = await actSafe({ type: 'wi_ask_trait', traitKey });
    if (ok) {
      setBoardSide('mine');
      playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1500 });
      play('pop', { speakerId: game.me });
    }
  };

  const handleAskFree = async () => {
    const clean = freeQuestion.trim();
    if (clean.length < 2) return;
    const ok = await actSafe({ type: 'wi_ask_free', question: clean });
    if (ok) {
      setFreeQuestion('');
      setFreeAskMode(false);
      playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1500 });
      play('pop', { speakerId: game.me });
    }
  };

  const handleGuess = async (ch: WhoIsItCharacter) => {
    const ok = await actSafe({ type: 'wi_guess', characterId: ch.id });
    if (ok) {
      setZoomChar(null);
      setGuessMode(false);
    }
  };

  const sendTeamChat = async (textOverride?: string) => {
    const txt = (textOverride ?? chatInput).trim();
    if (!txt || !view.myTeam) return;
    const ok = await actSafe({ type: 'wi_team_chat', text: txt });
    if (ok) {
      if (!textOverride) setChatInput('');
      play('pop', { speakerId: game.me });
    }
  };

  const activeName = view.activePlayerId ? (view.names[view.activePlayerId] ?? 'Đồng đội') : '';
  const turnTeamName = view.turnTeam === 'red' ? 'Đỏ' : 'Xanh';
  const myTeamCount = view.myTeam ? view.remainingCounts[view.myTeam] : view.boardSize;
  const oppTeam = view.myTeam === 'red' ? 'blue' : view.myTeam === 'blue' ? 'red' : null;
  const oppTeamCount = oppTeam ? view.remainingCounts[oppTeam] : view.boardSize;

  const statusBanner = (() => {
    if (unreadTeam > 0 && lastTeamMsg) {
      return `💬 ${lastTeamMsg.fromName}: ${lastTeamMsg.text}`;
    }
    if (view.phase === 'pick_secret') {
      return needsMySecret
        ? '🕵️ Chạm 1 khuôn mặt hoặc bấm Chọn nhanh làm thẻ mật!'
        : 'Đã giữ bí mật! Đang chờ đội kia chọn xong…';
    }
    if (view.phase === 'answer_free') {
      return needsFreeAnswer
        ? '❓ Đối thủ đang hỏi tự do — bấm CÓ hoặc KHÔNG!'
        : `Đang chờ Đội ${view.turnTeam === 'red' ? 'Xanh' : 'Đỏ'} trả lời…`;
    }
    if (view.phase === 'review' || view.phase === 'turn_beat') {
      const qa = view.lastQA;
      const ansText = qa?.answer === true ? 'CÓ ✅' : qa?.answer === false ? 'KHÔNG ❌' : '';
      const prefix = boardSide === 'opp' ? `👀 Bảng ${turnTeamName}: ` : '';
      return qa ? `${prefix}${qa.team === 'red' ? 'Đỏ' : 'Xanh'}: "${qa.question}" → ${ansText}` : 'Đang xem kết quả úp thẻ…';
    }
    if (guessMode) {
      return '🎯 CHẾ ĐỘ ĐOÁN: Chạm thẳng khuôn mặt bạn muốn chốt!';
    }
    if (boardSide === 'opp' && oppTeam) {
      return `👀 Bảng ĐỐI PHƯƠNG (${oppTeam === 'red' ? 'Đỏ' : 'Xanh'} còn ${oppTeamCount}/${view.boardSize} thẻ)`;
    }
    return isMyTeamTurn
      ? `🔥 Lượt Đội BẠN (${activeName || 'Cả đội'}): Chọn câu hỏi ngay bên dưới!`
      : `⏳ Lượt Đội ${turnTeamName} (${activeName}) — đang soi bảng đối thủ`;
  })();

  const bottomDock = (() => {
    if (view.phase === 'pick_secret') {
      return needsMySecret ? (
        <View style={styles.dockRow}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <T numberOfLines={1} style={[styles.waitTxt, { color: pal.muted, textAlign: 'left' }]}>
              Chạm 1 thẻ trên bảng làm thẻ bí mật
            </T>
          </View>
          <Button
            testID="wi-random-secret"
            title="🎲 Chọn nhanh"
            variant="gold"
            small
            disabled={busy || view.characters.length === 0}
            onPress={async () => {
              const pick = view.characters[Math.floor(Math.random() * view.characters.length)];
              if (pick && (await actSafe({ type: 'wi_pick_secret', characterId: pick.id }))) {
                playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1200 });
                play('stamp', { speakerId: game.me });
              }
            }}
          />
        </View>
      ) : (
        <View style={styles.waitDock}>
          <T style={[styles.waitTxt, { color: pal.muted }]}>Đã giữ bí mật! Chờ đội bạn kia…</T>
        </View>
      );
    }

    if (view.phase === 'review' && isMyTeamTurn) {
      return (
        <View style={styles.dockRow}>
          {view.lastQA?.kind === 'trait' && (
            <Button
              testID="wi-auto-flip"
              title="⚡ Úp tự động"
              variant="gold"
              small
              disabled={busy}
              style={{ flex: 1 }}
              onPress={async () => {
                setBoardSide('mine');
                if (await actSafe({ type: 'wi_auto_flip' })) play('sparkle', { speakerId: game.me });
              }}
            />
          )}
          <Button
            testID="wi-end-review"
            title="Xong lượt ⏭"
            variant="ink"
            small
            disabled={busy}
            style={{ flex: 1 }}
            onPress={() => actSafe({ type: 'wi_end_review' })}
          />
        </View>
      );
    }

    // DOCK CÂU HỎI NỘI TUYẾN (vừa nhìn toàn bộ khuôn mặt ở trên, vừa bấm hỏi trực tiếp bên dưới — 0 che popup!)
    if (view.phase === 'ask' && isMyTeamTurn) {
      return (
        <View style={styles.inlineAskDock}>
          <View style={styles.inlineTopTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniTabRow}>
              {TRAIT_GROUPS.map((g) => {
                const active = !freeAskMode && traitTab === g.key;
                return (
                  <Pressable
                    key={g.key}
                    onPress={() => {
                      setFreeAskMode(false);
                      setTraitTab(g.key);
                    }}
                    style={[styles.miniTabPill, active && styles.miniTabActive]}
                  >
                    <T style={[styles.miniTabTxt, active && { color: '#FFFFFF' }]}>{g.label}</T>
                  </Pressable>
                );
              })}
              <Pressable
                testID="wi-toggle-free"
                onPress={() => setFreeAskMode((f) => !f)}
                style={[styles.miniTabPill, freeAskMode && styles.miniTabActive]}
              >
                <T style={[styles.miniTabTxt, freeAskMode && { color: '#FFFFFF' }]}>⌨️ Tự gõ</T>
              </Pressable>
            </ScrollView>

            <Pressable
              testID="wi-toggle-guess"
              onPress={() => {
                setBoardSide('mine');
                setGuessMode((g) => !g);
              }}
              style={[styles.guessPill, guessMode && styles.guessPillActive]}
            >
              <T style={[styles.guessPillTxt, guessMode && { color: '#FFFFFF' }]}>
                {guessMode ? '✕ Hủy' : `🎯 Đoán ${view.lives[view.myTeam!]}♥`}
              </T>
            </Pressable>
          </View>

          {freeAskMode ? (
            <View style={styles.freeAskRow}>
              <TextInput
                testID="wi-free-input"
                value={freeQuestion}
                onChangeText={setFreeQuestion}
                placeholder="Gõ câu hỏi Có/Không (vd: Có đeo kính không?)..."
                placeholderTextColor="#9CA3AF"
                maxLength={120}
                returnKeyType="send"
                onSubmitEditing={handleAskFree}
                style={styles.freeAskInput}
              />
              <Button
                testID="wi-free-send"
                title="Hỏi"
                variant="ink"
                small
                disabled={busy || freeQuestion.trim().length < 2}
                onPress={handleAskFree}
              />
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.traitChipStrip}>
              {WHO_IS_IT_TRAITS.filter((t) => t.group === traitTab).map((t) => {
                const used = askedTraitSet.has(t.key);
                const count = openTraitCounts.get(t.key) ?? 0;
                return (
                  <Pressable
                    key={t.key}
                    testID={`wi-trait-${t.key}`}
                    disabled={busy}
                    onPress={() => handleAskTrait(t.key)}
                    style={({ pressed }) => [
                      styles.inlineTraitBtn,
                      used && styles.inlineTraitUsed,
                      pressed && { opacity: 0.72 },
                    ]}
                  >
                    <T style={[styles.inlineTraitTxt, used && { color: C.muted }]}>
                      {used ? '✓ ' : ''}{t.shortLabel} ({count})
                    </T>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      );
    }

    return (
      <View style={styles.waitDock}>
        <T numberOfLines={1} style={[styles.waitTxt, { color: pal.muted }]}>
          {boardSide === 'opp'
            ? `Đang xem bảng đối thủ (${oppTeamCount} thẻ mở · ★ là thẻ của bạn)`
            : 'Chạm thẻ để úp/mở · Nhấn giữ để phóng to'}
        </T>
      </View>
    );
  })();

  return (
    <Shell
      game={game}
      room={room}
      scroll={false}
      hideStrip
      keyboardAware
      bottom={bottomDock}
    >
      <View style={styles.container}>
        {/* 1. HUD gọn 1 hàng: Nút đổi Bảng mình / Bảng địch + Đồng hồ + Chat đội + Thẻ mật */}
        <View style={styles.hudBar}>
          <Pressable
            testID="wi-view-mine"
            onPress={() => setBoardSide('mine')}
            style={[
              styles.sideTogglePill,
              view.myTeam === 'red' ? styles.redChip : styles.blueChip,
              boardSide === 'mine' && styles.sideToggleActive,
            ]}
          >
            <T style={styles.chipTitle}>Mình {myTeamCount}</T>
            <T style={styles.hearts}>{view.myTeam ? '♥'.repeat(view.lives[view.myTeam]) : ''}</T>
          </Pressable>

          <View style={styles.centerHud}>
            <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} />
          </View>

          {oppTeam && (
            <Pressable
              testID="wi-view-opp"
              onPress={() => {
                setGuessMode(false);
                setBoardSide('opp');
              }}
              style={[
                styles.sideTogglePill,
                oppTeam === 'red' ? styles.redChip : styles.blueChip,
                boardSide === 'opp' && styles.sideToggleActive,
              ]}
            >
              <T style={styles.chipTitle}>Địch {oppTeamCount}</T>
              <T style={styles.hearts}>{'♥'.repeat(view.lives[oppTeam])}</T>
            </Pressable>
          )}

          {view.myTeam && (
            <Pressable
              testID="wi-team-chat-btn"
              onPress={() => {
                if (lastTeamMsg) setSeenChatId(lastTeamMsg.id);
                setChatOpen(true);
              }}
              style={[styles.histBtn, unreadTeam > 0 && styles.chatTeamUnread]}
            >
              <UiIcon name="MessageCircle" size={14} color={unreadTeam > 0 ? '#FFFFFF' : C.ink} />
              {unreadTeam > 0 && <T style={styles.unreadTxt}>{unreadTeam}</T>}
            </Pressable>
          )}

          <Pressable
            testID="wi-peek-secret"
            onPress={() => mySecretChar && setPeekOpen(true)}
            style={styles.secretMini}
          >
            {mySecretChar ? (
              <>
                <Image source={{ uri: whoIsItPortraitUri(mySecretChar) }} style={styles.secretMiniImg} resizeMode="contain" />
                <T numberOfLines={1} style={styles.secretMiniTxt}>{mySecretChar.name}</T>
              </>
            ) : (
              <T style={styles.secretMiniEmpty}>?</T>
            )}
          </Pressable>

          <Pressable testID="wi-history-btn" onPress={() => setHistoryOpen(true)} style={styles.histBtn}>
            <UiIcon name="History" size={14} color={C.ink} />
          </Pressable>
        </View>

        {/* 2. Dải trạng thái / Chat đội / Câu hỏi vừa hỏi */}
        <Pressable
          onPress={() => (unreadTeam > 0 && view.myTeam ? setChatOpen(true) : view.history.length > 0 && setHistoryOpen(true))}
          style={[
            styles.statusStrip,
            isMyTeamTurn && view.phase === 'ask' && styles.statusMyTurn,
            boardSide === 'opp' && styles.statusOppView,
            guessMode && styles.statusGuessMode,
          ]}
        >
          <T numberOfLines={1} style={styles.statusTxt}>{statusBanner}</T>
        </Pressable>

        {/* 3. Lưới nhân vật co giãn flex:1 vừa khít 1 màn hình (24..54 thẻ, 0 scroll) */}
        <View style={styles.grid}>
          {boardRows.map((rowItems, rIdx) => (
            <View key={rIdx} style={styles.gridRow}>
              {rowItems.map((ch) => (
                <CharacterCell
                  key={ch.id}
                  ch={ch}
                  flipped={activeFlippedSet.has(ch.id)}
                  isSecret={view.mySecretId === ch.id}
                  guessMode={guessMode}
                  justFlipped={boardSide === 'mine' && lastFlippedSet.has(ch.id)}
                  oppView={boardSide === 'opp'}
                  dense={dense}
                  onPress={handleCardPress}
                  onLongPress={setZoomChar}
                />
              ))}
            </View>
          ))}
        </View>
      </View>

      {/* Sheet Kênh Thảo Luận Riêng Của Đội */}
      {chatOpen && view.myTeam && (
        <Sheet
          title={`Hội ý riêng Đội ${view.myTeam === 'red' ? 'Đỏ' : 'Xanh'}`}
          onClose={() => {
            if (lastTeamMsg) setSeenChatId(lastTeamMsg.id);
            setChatOpen(false);
          }}
          stickyTop={
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
              {QUICK_WI_CHATS.map((qTxt) => (
                <Pressable key={qTxt} onPress={() => sendTeamChat(qTxt)} style={styles.quickChip}>
                  <T style={styles.quickTxt}>{qTxt}</T>
                </Pressable>
              ))}
            </ScrollView>
          }
          stickyBottom={
            <View style={styles.freeAskRow}>
              <TextInput
                testID="wi-team-chat-input"
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Nhắn riêng cho đồng đội…"
                placeholderTextColor="#9CA3AF"
                maxLength={140}
                returnKeyType="send"
                onSubmitEditing={() => sendTeamChat()}
                style={styles.freeAskInput}
              />
              <Button testID="wi-team-chat-send" small variant="ink" title="Gửi" onPress={() => sendTeamChat()} />
            </View>
          }
        >
          <View style={{ gap: 6 }}>
            {view.teamChat.length === 0 ? (
              <T style={{ color: C.muted, fontSize: 13 }}>
                Đội đối phương không đọc được kênh này — hãy hội ý chiến thuật cùng đồng đội!
              </T>
            ) : (
              view.teamChat.map((m) => (
                <View key={m.id} style={[styles.chatMsgRow, m.fromId === game.me && styles.chatMsgMine]}>
                  <T style={{ fontSize: 12, fontWeight: '800', color: view.myTeam === 'red' ? '#B91C1C' : '#1D4ED8' }}>
                    {m.fromName}
                  </T>
                  <T style={{ fontSize: 13.5, color: C.ink }}>{m.text}</T>
                </View>
              ))
            )}
          </View>
        </Sheet>
      )}

      {/* Modal phóng to 1 nhân vật (khi nhấn giữ hoặc đang Chốt Đoán) */}
      {zoomChar && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setZoomChar(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.zoomCard}>
              <Image source={{ uri: whoIsItPortraitUri(zoomChar) }} style={styles.zoomImg} resizeMode="contain" />
              <T style={styles.zoomName}>{zoomChar.name}</T>
              <View style={styles.zoomTags}>
                <T style={styles.zoomTag}>{zoomChar.gender === 'male' ? 'Nam' : 'Nữ'}</T>
                {zoomChar.hat !== 'none' && <T style={styles.zoomTag}>Có mũ/khăn</T>}
                {zoomChar.glasses !== 'none' && <T style={styles.zoomTag}>{zoomChar.glasses === 'eyepatch' ? 'Bịt mắt' : 'Đeo kính'}</T>}
                {zoomChar.facialHair !== 'none' && <T style={styles.zoomTag}>Có râu/ria</T>}
                {zoomChar.earrings && <T style={styles.zoomTag}>Bông tai</T>}
                {zoomChar.blush && <T style={styles.zoomTag}>Má hồng</T>}
                {zoomChar.freckles && <T style={styles.zoomTag}>Tàn nhang</T>}
                {zoomChar.scar && <T style={styles.zoomTag}>Vết sẹo</T>}
                {zoomChar.bow && <T style={styles.zoomTag}>Nơ cài</T>}
              </View>
              <View style={styles.zoomBtns}>
                {view.phase !== 'pick_secret' && view.myTeam !== null && boardSide === 'mine' && (
                  <Button
                    small
                    variant="paper"
                    title={myFlippedSet.has(zoomChar.id) ? 'Mở lại thẻ' : 'Úp thẻ này'}
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await actSafe({ type: 'wi_toggle_flip', characterId: zoomChar.id });
                      setZoomChar(null);
                    }}
                  />
                )}
                {isMyTeamTurn && view.phase === 'ask' && (
                  <Button
                    testID="wi-confirm-guess"
                    small
                    variant="jade"
                    title={`🎯 Đoán là ${zoomChar.name}`}
                    style={{ flex: 1 }}
                    onPress={() => handleGuess(zoomChar)}
                  />
                )}
              </View>
              <Button small variant="paper" title="Đóng" onPress={() => setZoomChar(null)} />
            </View>
          </View>
        </Modal>
      )}

      {/* Modal trả lời câu hỏi tự do của đội bạn */}
      {needsFreeAnswer && view.pendingQuestion && (
        <Modal transparent visible animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.zoomCard}>
              <T style={styles.freeBadge}>CÂU HỎI TỪ ĐỘI {view.pendingQuestion.askedByTeam === 'red' ? 'ĐỎ' : 'XANH'}</T>
              {mySecretChar && (
                <View style={styles.answerSecretRow}>
                  <Image source={{ uri: whoIsItPortraitUri(mySecretChar) }} style={styles.answerSecretImg} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontSize: 11, color: C.muted, fontWeight: '700' }}>Thẻ bí mật của đội bạn:</T>
                    <T style={{ fontSize: 16, fontWeight: '900', color: C.ink }}>{mySecretChar.name}</T>
                  </View>
                </View>
              )}
              <T style={styles.freeQText}>“{view.pendingQuestion.text}”</T>
              <View style={styles.zoomBtns}>
                <Button
                  testID="wi-answer-yes"
                  title="✅ CÓ"
                  variant="jade"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onPress={() => actSafe({ type: 'wi_answer_free', yes: true })}
                />
                <Button
                  testID="wi-answer-no"
                  title="❌ KHÔNG"
                  variant="danger"
                  style={{ flex: 1 }}
                  disabled={busy}
                  onPress={() => actSafe({ type: 'wi_answer_free', yes: false })}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal xem lại Thẻ Bí Mật của đội mình */}
      {peekOpen && mySecretChar && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPeekOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPeekOpen(false)}>
            <View style={styles.zoomCard}>
              <T style={styles.freeBadge}>THẺ BÍ MẬT CỦA ĐỘI {view.myTeam === 'red' ? 'ĐỎ' : 'XANH'}</T>
              <Image source={{ uri: whoIsItPortraitUri(mySecretChar) }} style={styles.zoomImg} resizeMode="contain" />
              <T style={styles.zoomName}>{mySecretChar.name}</T>
              <T style={{ fontSize: 12.5, color: C.secondary, textAlign: 'center' }}>
                Đối thủ phải đoán đúng nhân vật này để thắng!
              </T>
              <Button small variant="ink" title="Đóng" onPress={() => setPeekOpen(false)} />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Sheet Lịch sử hỏi & Đội hình */}
      {historyOpen && (
        <Sheet title="Lịch sử hỏi đáp & Đội hình" onClose={() => setHistoryOpen(false)}>
          <View style={{ gap: 10 }}>
            <View style={styles.sheetTeamRow}>
              <View style={[styles.sheetTeamBox, { borderColor: '#DC2626', backgroundColor: '#FEF2F2' }]}>
                <T style={{ fontWeight: '900', fontSize: 12.5, color: '#B91C1C' }}>ĐỘI ĐỎ ({view.remainingCounts.red} thẻ)</T>
                {view.teams.red.map((id) => (
                  <T key={id} style={styles.sheetMember}>{id === game.me ? '★ ' : '• '}{view.names[id] ?? id}</T>
                ))}
              </View>
              <View style={[styles.sheetTeamBox, { borderColor: '#2563EB', backgroundColor: '#EFF6FF' }]}>
                <T style={{ fontWeight: '900', fontSize: 12.5, color: '#1D4ED8' }}>ĐỘI XANH ({view.remainingCounts.blue} thẻ)</T>
                {view.teams.blue.map((id) => (
                  <T key={id} style={styles.sheetMember}>{id === game.me ? '★ ' : '• '}{view.names[id] ?? id}</T>
                ))}
              </View>
            </View>

            <T style={{ fontWeight: '800', fontSize: 13, color: C.ink }}>Lịch sử ({view.history.length})</T>
            {view.history.length === 0 ? (
              <T style={{ color: C.muted, fontSize: 13 }}>Chưa có lượt hỏi nào.</T>
            ) : (
              [...view.history].reverse().map((qa) => (
                <View key={qa.id} style={styles.histRow}>
                  <View style={[styles.histDot, { backgroundColor: qa.team === 'red' ? '#DC2626' : '#2563EB' }]} />
                  <T style={{ flex: 1, fontSize: 12.5, color: C.ink }}>
                    <T style={{ fontWeight: '700' }}>{qa.askedByName}:</T> {qa.question}
                  </T>
                  <T style={{ fontSize: 12.5, fontWeight: '900', color: qa.answer ? C.jade : C.danger }}>
                    {qa.answer === null ? '?' : qa.answer ? 'CÓ' : 'KHÔNG'}
                  </T>
                </View>
              ))
            )}
          </View>
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, gap: 4 },
  hudBar: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sideTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    opacity: 0.72,
  },
  sideToggleActive: { borderColor: C.ink, borderWidth: 2, opacity: 1 },
  redChip: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  blueChip: { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' },
  chipTitle: { fontSize: 10.5, fontWeight: '900', color: C.ink, fontVariant: ['tabular-nums'] },
  hearts: { fontSize: 9.5, color: '#DC2626' },
  centerHud: { flex: 1, minWidth: 0 },
  secretMini: {
    width: 38,
    height: 34,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D97706',
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  secretMiniImg: { width: 24, height: 22 },
  secretMiniTxt: { fontSize: 8, fontWeight: '900', color: '#92400E', lineHeight: 9 },
  secretMiniEmpty: { fontSize: 13, fontWeight: '900', color: '#92400E' },
  histBtn: {
    minWidth: 30,
    height: 34,
    paddingHorizontal: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.borderSubtle,
    backgroundColor: C.paper,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatTeamUnread: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  unreadTxt: { fontSize: 10, fontWeight: '900', color: '#FFFFFF' },
  statusStrip: {
    backgroundColor: C.paper,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.borderSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  statusMyTurn: { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
  statusOppView: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  statusGuessMode: { backgroundColor: '#DCFCE7', borderColor: C.jade },
  statusTxt: { fontSize: 11.5, fontWeight: '800', color: C.ink, textAlign: 'center' },
  grid: { flex: 1, minHeight: 0, gap: 3.5 },
  gridRow: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 3.5 },
  cell: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: C.ink,
    overflow: 'hidden',
  },
  cellOppBoard: { borderColor: '#3B82F6' },
  cellFlipped: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
    opacity: 0.42,
  },
  cellJustFlipped: { borderColor: '#DC2626', borderWidth: 2 },
  cellSecret: {
    borderColor: '#D97706',
    borderWidth: 2.5,
  },
  cellGuessReady: {
    borderColor: C.jade,
    borderWidth: 2,
  },
  cellImgWrap: { flex: 1, minHeight: 0, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  cellImg: { width: '100%', height: '100%' },
  cellImgFlipped: { opacity: 0.35 },
  flippedMask: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.16)',
  },
  flippedX: { fontSize: 20, fontWeight: '900', color: '#DC2626' },
  secretStar: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 999,
    width: 13,
    height: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secretStarTxt: { fontSize: 8.5, fontWeight: '900', color: '#FFFFFF' },
  cellNameBox: {
    backgroundColor: C.ink,
    paddingHorizontal: 2,
    paddingVertical: 1,
    alignItems: 'center',
  },
  cellNameBoxOpp: { backgroundColor: '#1D4ED8' },
  cellNameBoxFlipped: { backgroundColor: '#64748B' },
  cellName: { fontSize: 10, fontWeight: '800', color: '#FFFFFF' },
  cellNameDense: { fontSize: 8.5, lineHeight: 10 },
  cellNameFlipped: { textDecorationLine: 'line-through', color: '#E2E8F0' },
  inlineAskDock: { gap: 5 },
  inlineTopTabs: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  miniTabRow: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  miniTabPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.borderSubtle,
    backgroundColor: C.paper,
  },
  miniTabActive: { backgroundColor: C.ink, borderColor: C.ink },
  miniTabTxt: { fontSize: 11, fontWeight: '800', color: C.ink },
  guessPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.jade,
    backgroundColor: '#DCFCE7',
  },
  guessPillActive: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  guessPillTxt: { fontSize: 11, fontWeight: '900', color: '#065F46' },
  traitChipStrip: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  inlineTraitBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.ink,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineTraitUsed: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  inlineTraitTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  dockRow: { flexDirection: 'row', gap: 8 },
  waitDock: { minHeight: 34, justifyContent: 'center', alignItems: 'center' },
  waitTxt: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  freeAskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freeAskInput: {
    flex: 1,
    height: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.ink,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  quickRow: { gap: 6, paddingBottom: 6 },
  quickChip: {
    backgroundColor: C.paper,
    borderWidth: 1.5,
    borderColor: C.ink,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickTxt: { fontSize: 12, fontWeight: '700', color: C.ink },
  chatMsgRow: {
    backgroundColor: C.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  chatMsgMine: { backgroundColor: '#FEF3C7', borderColor: '#D97706' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  zoomCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: C.paper,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: C.ink,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  zoomImg: { width: 156, height: 156, borderRadius: 16 },
  zoomName: { fontSize: 22, fontWeight: '900', color: C.ink },
  zoomTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 5 },
  zoomTag: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    fontSize: 11.5,
    fontWeight: '700',
    color: '#92400E',
  },
  zoomBtns: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  freeBadge: { fontSize: 11, fontWeight: '900', color: '#B45309', letterSpacing: 0.4 },
  answerSecretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D97706',
    padding: 8,
    alignSelf: 'stretch',
  },
  answerSecretImg: { width: 52, height: 52 },
  freeQText: { fontSize: 16, fontWeight: '800', color: C.ink, textAlign: 'center', paddingVertical: 6 },
  sheetTeamRow: { flexDirection: 'row', gap: 8 },
  sheetTeamBox: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 9, gap: 3 },
  sheetMember: { fontSize: 12.5, fontWeight: '600', color: C.ink },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.paper,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  histDot: { width: 8, height: 8, borderRadius: 4 },
});
