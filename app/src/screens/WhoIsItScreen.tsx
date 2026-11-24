import { Image } from '../components/Image';
import { memo, useEffect, useMemo, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  WHO_IS_IT_ART_PACKS,
  WHO_IS_IT_TRAIT_MAP,
  WHO_IS_IT_TRAITS,
  whoIsItGridDims,
  type WhoIsItArtPackId,
  type WhoIsItCharacter,
  type WhoIsItTeam,
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

const USE_NATIVE = Platform.OS !== 'web';
const TEAM_RED = '#EF4444';
const TEAM_BLUE = '#3B82F6';

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

const EXPRESSION_LABELS: Record<WhoIsItCharacter['expression'], string> = {
  happy: 'Cười tươi',
  sad: 'Mặt buồn',
  angry: 'Cau mày',
  surprised: 'Bất ngờ',
  cheeky: 'Nháy/lè lưỡi',
};

const CharacterCell = memo(function CharacterCell({
  ch,
  artPack,
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
  artPack: WhoIsItArtPackId;
  flipped: boolean;
  isSecret: boolean;
  guessMode: boolean;
  justFlipped: boolean;
  oppView: boolean;
  dense: boolean;
  onPress: (c: WhoIsItCharacter) => void;
  onLongPress: (c: WhoIsItCharacter) => void;
}) {
  const uri = whoIsItPortraitUri(ch, artPack);
  const [flipPulse] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (!justFlipped) {
      flipPulse.setValue(1);
      return;
    }
    const anim = Animated.sequence([
      Animated.timing(flipPulse, { toValue: 1.09, duration: 150, useNativeDriver: USE_NATIVE }),
      Animated.timing(flipPulse, { toValue: 0.94, duration: 140, useNativeDriver: USE_NATIVE }),
      Animated.timing(flipPulse, { toValue: 1.05, duration: 130, useNativeDriver: USE_NATIVE }),
      Animated.timing(flipPulse, { toValue: 1, duration: 140, useNativeDriver: USE_NATIVE }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [justFlipped, flipPulse]);

  return (
    <Animated.View style={[styles.cellOuter, { transform: [{ scale: flipPulse }] }]}>
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
            <View pointerEvents="none" style={[styles.flippedMask, justFlipped && styles.flippedMaskFresh]}>
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
    </Animated.View>
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
  const isMeAsking = view.activePlayerId !== null && view.activePlayerId === game.me;
  const needsMySecret = view.phase === 'pick_secret' && view.myTeam !== null && !view.secretReady[view.myTeam];
  const needsFreeAnswer =
    view.phase === 'answer_free' &&
    view.pendingQuestion !== null &&
    view.myTeam !== null &&
    view.myTeam !== view.turnTeam;

  // Tự động chuyển sang nhìn bảng ĐỐI PHƯƠNG khi tới lượt họ, và chuyển về bảng MÌNH khi tới lượt mình
  const autoSide: 'mine' | 'opp' =
    view.phase !== 'pick_secret' &&
    view.myTeam !== null &&
    !isMyTeamTurn &&
    (view.phase === 'ask' || view.phase === 'reveal' || view.phase === 'review' || view.phase === 'turn_beat')
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

  const availableTraitKeySet = useMemo(() => new Set(view.traitKeys), [view.traitKeys]);
  const availableTraits = useMemo(
    () => WHO_IS_IT_TRAITS.filter((t) => availableTraitKeySet.has(t.key)),
    [availableTraitKeySet],
  );
  const visibleTraitGroups = useMemo(
    () => TRAIT_GROUPS.filter((g) => availableTraits.some((t) => t.group === g.key)),
    [availableTraits],
  );
  const activeTraitTab: WhoIsItTraitGroup = visibleTraitGroups.some((g) => g.key === traitTab)
    ? traitTab
    : (visibleTraitGroups[0]?.key ?? 'toc_mu');

  const askedTraitSet = useMemo(
    () => new Set(view.history.filter((h) => h.team === view.myTeam && h.traitKey).map((h) => h.traitKey!)),
    [view.history, view.myTeam],
  );
  const mySecretChar = useMemo(
    () => (view.mySecretId ? view.characters.find((c) => c.id === view.mySecretId) ?? null : null),
    [view.characters, view.mySecretId],
  );

  // Đếm trước số thẻ còn mở khớp từng đặc điểm khả dụng trên bảng đội mình
  const openTraitCounts = useMemo(() => {
    const remaining = view.characters.filter((c) => !myFlippedSet.has(c.id));
    const map = new Map<string, number>();
    for (const tr of availableTraits) {
      map.set(tr.key, remaining.filter(tr.match).length);
    }
    return map;
  }, [view.characters, myFlippedSet, availableTraits]);

  // Gợi ý câu hỏi chia đôi bảng tốt nhất (⭐)
  const bestTraitKey = useMemo(() => {
    const openCount = view.characters.length - myFlippedSet.size;
    if (openCount <= 1) return null;
    const target = openCount / 2;
    let bestKey: string | null = null;
    let bestDiff = Infinity;
    for (const tr of availableTraits) {
      if (askedTraitSet.has(tr.key)) continue;
      const cnt = openTraitCounts.get(tr.key) ?? 0;
      if (cnt <= 0 || cnt >= openCount) continue;
      const diff = Math.abs(cnt - target);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestKey = tr.key;
      }
    }
    return bestKey;
  }, [availableTraits, askedTraitSet, openTraitCounts, view.characters.length, myFlippedSet.size]);

  const bestTraitGroup = bestTraitKey ? (WHO_IS_IT_TRAIT_MAP.get(bestTraitKey)?.group ?? null) : null;

  useOnChange(view.phase, (ph) => {
    if (ph === 'ask' && view.roundCount === 1) {
      playMemePool('shock', { speakerId: view.activePlayerId, cooldownMs: 1200 });
      play('turn', { speakerId: view.activePlayerId });
    } else if (ph === 'turn_beat') {
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
      play('reveal', { speakerId: view.lastQA.askedById });
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
  const turnTeamDot = view.turnTeam === 'red' ? '🔴' : '🔵';
  const turnTeamColor = view.turnTeam === 'red' ? TEAM_RED : TEAM_BLUE;
  const myTeamCount = view.myTeam ? view.remainingCounts[view.myTeam] : view.boardSize;
  const oppTeam: WhoIsItTeam | null = view.myTeam === 'red' ? 'blue' : view.myTeam === 'blue' ? 'red' : null;
  const oppTeamCount = oppTeam ? view.remainingCounts[oppTeam] : view.boardSize;
  const artPackMeta = WHO_IS_IT_ART_PACKS[view.artPack];

  const displayedTeam: WhoIsItTeam | null = boardSide === 'opp' ? oppTeam : view.myTeam;
  const showFlipHighlight =
    view.phase === 'review' &&
    view.lastFlippedTeam !== null &&
    displayedTeam === view.lastFlippedTeam;

  const recentHistory = useMemo(() => view.history.slice(-3).reverse(), [view.history]);

  const statusBanner = (() => {
    if (unreadTeam > 0 && lastTeamMsg) {
      return `💬 ${lastTeamMsg.fromName}: ${lastTeamMsg.text}`;
    }
    if (view.phase === 'pick_secret') {
      return needsMySecret
        ? '🕵️ Chạm 1 khuôn mặt hoặc bấm Chọn nhanh làm thẻ mật!'
        : 'Đã giữ bí mật! Đang chờ đội kia chọn xong…';
    }
    if (view.phase === 'turn_beat') {
      return isMeAsking
        ? `${turnTeamDot} Tới lượt BẠN hỏi!`
        : `${turnTeamDot} Tới lượt Đội ${turnTeamName}${activeName ? ` — ${activeName} hỏi` : ''}`;
    }
    if (view.phase === 'answer_free') {
      return needsFreeAnswer
        ? '❓ Đối thủ đang hỏi tự do — bấm CÓ hoặc KHÔNG!'
        : `Đang chờ Đội ${view.turnTeam === 'red' ? 'Xanh' : 'Đỏ'} trả lời…`;
    }
    const formatQAResult = (qa: NonNullable<WhoIsItView['lastQA']>) => {
      const qaDot = qa.team === 'red' ? '🔴' : '🔵';
      if (qa.kind === 'guess') {
        const target =
          (qa.characterId ? view.characters.find((c) => c.id === qa.characterId)?.name : undefined) ?? qa.question;
        const resText = qa.answer === true ? 'TRÚNG 🎯' : qa.answer === false ? 'TRẬT ❌' : '';
        return `${qaDot} ${qa.askedByName} chốt đoán ${target} → ${resText}`;
      }
      const ansText = qa.answer === true ? 'CÓ ✅' : qa.answer === false ? 'KHÔNG ❌' : '';
      return `${qaDot} ${qa.askedByName}: "${qa.question}" → ${ansText}`;
    };
    if (view.phase === 'reveal') {
      return view.lastQA
        ? formatQAResult(view.lastQA)
        : `${turnTeamDot} Đang mở đáp án lượt Đội ${turnTeamName}…`;
    }
    if (view.phase === 'review') {
      const qa = view.lastQA;
      if (isMyTeamTurn && qa?.kind === 'free') {
        return '✏️ Câu tự gõ — Chạm để úp thẻ không khớp rồi bấm Xong lượt!';
      }
      return qa ? formatQAResult(qa) : `${turnTeamDot} Đang xem bảng sau lượt hỏi…`;
    }
    if (guessMode) {
      return '🎯 CHẾ ĐỘ ĐOÁN: Chạm thẳng khuôn mặt bạn muốn chốt!';
    }
    if (isMeAsking) {
      return `${turnTeamDot} Tới lượt BẠN hỏi! Chọn đặc điểm bên dưới`;
    }
    return `${turnTeamDot} Lượt Đội ${turnTeamName}${activeName ? ` — ${activeName} đang hỏi` : ''}`;
  })();

  const zoomTagsFor = (ch: WhoIsItCharacter): string[] => {
    const tags: string[] = [ch.gender === 'male' ? 'Nam' : 'Nữ'];
    if (availableTraitKeySet.has('hat_any') && ch.hat !== 'none') {
      tags.push(ch.hat === 'cap' ? 'Mũ có vành' : ch.hat === 'beanie' ? 'Mũ len' : 'Khăn/Turban');
    }
    if (ch.glasses === 'eyepatch' && availableTraitKeySet.has('eyepatch')) {
      tags.push('Bịt mắt');
    } else if ((ch.glasses === 'clear' || ch.glasses === 'sunglasses') && availableTraitKeySet.has('glasses_any')) {
      tags.push(ch.glasses === 'sunglasses' ? 'Kính râm' : 'Kính cận');
    }
    if (availableTraitKeySet.has('facial_any') && ch.facialHair !== 'none') {
      tags.push(ch.facialHair === 'beard' ? 'Râu cằm' : 'Ria mép');
    }
    if (availableTraitKeySet.has(`exp_${ch.expression}`)) {
      tags.push(EXPRESSION_LABELS[ch.expression]);
    }
    if (ch.clothing === 'hoodie' && availableTraitKeySet.has('cloth_hoodie')) tags.push('Áo hoodie');
    if (ch.clothing === 'blazer' && availableTraitKeySet.has('cloth_blazer')) tags.push('Áo vest');
    if (ch.earrings && availableTraitKeySet.has('earrings')) tags.push('Bông tai');
    if (ch.blush && availableTraitKeySet.has('blush')) tags.push('Má hồng');
    if (ch.freckles && availableTraitKeySet.has('freckles')) tags.push('Tàn nhang');
    if (ch.scar && availableTraitKeySet.has('scar')) tags.push('Vết sẹo');
    if (ch.bow && availableTraitKeySet.has('bow')) tags.push('Nơ cài');
    return tags;
  };

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

    if (needsFreeAnswer && view.pendingQuestion) {
      return (
        <View style={styles.freeAnswerDock}>
          <View style={styles.freeAnswerHeader}>
            {mySecretChar && (
              <Image
                source={{ uri: whoIsItPortraitUri(mySecretChar, view.artPack) }}
                style={styles.freeAnswerPortrait}
                resizeMode="contain"
              />
            )}
            <T numberOfLines={2} style={styles.freeAnswerQ}>
              “{view.pendingQuestion.text}”
            </T>
          </View>
          <View style={styles.dockRow}>
            <Button
              testID="wi-answer-yes"
              title="✅ CÓ"
              variant="jade"
              small
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => actSafe({ type: 'wi_answer_free', yes: true })}
            />
            <Button
              testID="wi-answer-no"
              title="❌ KHÔNG"
              variant="danger"
              small
              style={{ flex: 1 }}
              disabled={busy}
              onPress={() => actSafe({ type: 'wi_answer_free', yes: false })}
            />
          </View>
        </View>
      );
    }

    if (view.phase === 'review' && isMyTeamTurn) {
      const isFreeReview = view.lastQA?.kind === 'free';
      const flippedCount = view.lastFlippedTeam === view.myTeam ? view.lastFlippedIds.length : 0;
      return (
        <View style={styles.dockRow}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <T numberOfLines={1} style={[styles.reviewHintTxt, isFreeReview && styles.reviewHintFree]}>
              {isFreeReview
                ? 'Chạm để úp thẻ không khớp'
                : `Đã tự úp ${flippedCount} thẻ · còn ${myTeamCount}`}
            </T>
          </View>
          <Button
            testID="wi-end-review"
            title="Xong lượt ⏭"
            variant="ink"
            small
            disabled={busy}
            onPress={() => actSafe({ type: 'wi_end_review' })}
          />
        </View>
      );
    }

    // DOCK CÂU HỎI NỘI TUYẾN (chỉ hiện các đặc điểm & nhóm khả dụng của gói nét vẽ)
    if (view.phase === 'ask' && isMyTeamTurn) {
      return (
        <View style={styles.inlineAskDock}>
          <View style={styles.inlineTopTabs}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniTabRow}>
              {visibleTraitGroups.map((g) => {
                const active = !freeAskMode && activeTraitTab === g.key;
                const hasBest = bestTraitGroup === g.key;
                return (
                  <Pressable
                    key={g.key}
                    onPress={() => {
                      setFreeAskMode(false);
                      setTraitTab(g.key);
                    }}
                    style={[styles.miniTabPill, active && styles.miniTabActive]}
                  >
                    <T style={[styles.miniTabTxt, active && { color: '#FFFFFF' }]}>
                      {hasBest ? '⭐ ' : ''}{g.label}
                    </T>
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
              {availableTraits
                .filter((t) => t.group === activeTraitTab)
                .map((t) => {
                  const used = askedTraitSet.has(t.key);
                  const isBest = !used && t.key === bestTraitKey;
                  const count = openTraitCounts.get(t.key) ?? 0;
                  return (
                    <Pressable
                      key={t.key}
                      testID={`wi-trait-${t.key}`}
                      disabled={busy || used}
                      onPress={() => handleAskTrait(t.key)}
                      style={({ pressed }) => [
                        styles.inlineTraitBtn,
                        isBest && styles.inlineTraitBest,
                        used && styles.inlineTraitUsed,
                        pressed && !used && { opacity: 0.72 },
                      ]}
                    >
                      <T style={[styles.inlineTraitTxt, isBest && styles.inlineTraitBestTxt, used && { color: C.muted }]}>
                        {used ? '✓ ' : isBest ? '⭐ ' : ''}
                        {t.shortLabel} ({count})
                        {isBest ? ' · gợi ý' : ''}
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

  const activeFrameGlow =
    view.phase !== 'pick_secret'
      ? Platform.OS === 'web'
        ? ({
            borderColor: turnTeamColor,
            boxShadow: `0 0 0 2px ${turnTeamColor}44, 0 0 18px ${turnTeamColor}40`,
          } as object)
        : {
            borderColor: turnTeamColor,
            shadowColor: turnTeamColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 10,
            elevation: 6,
          }
      : undefined;

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
                <Image
                  source={{ uri: whoIsItPortraitUri(mySecretChar, view.artPack) }}
                  style={styles.secretMiniImg}
                  resizeMode="contain"
                />
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

        {/* 2. Dải báo lượt luôn rõ ràng theo màu đội */}
        <Pressable
          onPress={() => (unreadTeam > 0 && view.myTeam ? setChatOpen(true) : view.history.length > 0 && setHistoryOpen(true))}
          style={[
            styles.statusStrip,
            view.phase !== 'pick_secret' && {
              borderColor: turnTeamColor,
              backgroundColor: view.turnTeam === 'red' ? '#FEF2F2' : '#EFF6FF',
            },
            isMeAsking && view.phase === 'ask' && styles.statusMyTurn,
            guessMode && styles.statusGuessMode,
          ]}
        >
          <T numberOfLines={1} style={styles.statusTxt}>{statusBanner}</T>
        </Pressable>

        {/* 3. Thanh tóm tắt 3 câu hỏi gần nhất của cả 2 đội (chạm mở Lịch sử) */}
        {recentHistory.length > 0 && (
          <Pressable testID="wi-qa-ticker" onPress={() => setHistoryOpen(true)} style={styles.tickerRow}>
            {recentHistory.map((qa) => {
              const shortQ = qa.traitKey ? (WHO_IS_IT_TRAIT_MAP.get(qa.traitKey)?.shortLabel ?? qa.question) : qa.question;
              return (
                <View key={qa.id} style={styles.tickerItem}>
                  <View style={[styles.tickerDot, { backgroundColor: qa.team === 'red' ? TEAM_RED : TEAM_BLUE }]} />
                  <T numberOfLines={1} style={styles.tickerTxt}>{shortQ}</T>
                  <T style={styles.tickerAns}>{qa.answer === true ? '✅' : qa.answer === false ? '❌' : '?'}</T>
                </View>
              );
            })}
          </Pressable>
        )}

        {/* 4. Lưới nhân vật co giãn flex:1 có viền phát sáng theo màu đội đang tới lượt */}
        <View style={[styles.gridFrame, activeFrameGlow]}>
          <View style={styles.grid}>
            {boardRows.map((rowItems, rIdx) => (
              <View key={rIdx} style={styles.gridRow}>
                {rowItems.map((ch) => (
                  <CharacterCell
                    key={ch.id}
                    ch={ch}
                    artPack={view.artPack}
                    flipped={activeFlippedSet.has(ch.id)}
                    isSecret={view.mySecretId === ch.id}
                    guessMode={guessMode}
                    justFlipped={showFlipHighlight && lastFlippedSet.has(ch.id)}
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

        {/* 5. Dòng ghi công nét vẽ gọn nhẹ (đáp ứng giấy phép CC BY) */}
        <Pressable onPress={() => setHistoryOpen(true)}>
          <T numberOfLines={1} style={[styles.creditLine, { color: pal.muted }]}>
            Nét vẽ: {artPackMeta.label} — {artPackMeta.author} · {artPackMeta.license}
          </T>
        </Pressable>
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
              <Image
                source={{ uri: whoIsItPortraitUri(zoomChar, view.artPack) }}
                style={styles.zoomImg}
                resizeMode="contain"
              />
              <T style={styles.zoomName}>{zoomChar.name}</T>
              <View style={styles.zoomTags}>
                {zoomTagsFor(zoomChar).map((tag) => (
                  <T key={tag} style={styles.zoomTag}>{tag}</T>
                ))}
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

      {/* Modal xem lại Thẻ Bí Mật của đội mình */}
      {peekOpen && mySecretChar && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPeekOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPeekOpen(false)}>
            <View style={styles.zoomCard}>
              <T style={styles.freeBadge}>THẺ BÍ MẬT CỦA ĐỘI {view.myTeam === 'red' ? 'ĐỎ' : 'XANH'}</T>
              <Image
                source={{ uri: whoIsItPortraitUri(mySecretChar, view.artPack) }}
                style={styles.zoomImg}
                resizeMode="contain"
              />
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

            <View style={styles.sheetCreditBox}>
              <T style={styles.sheetCreditTxt}>
                Nét vẽ: {artPackMeta.label} — {artPackMeta.author} · {artPackMeta.license}
              </T>
            </View>
          </View>
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, gap: 4, position: 'relative' },
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
  statusGuessMode: { backgroundColor: '#DCFCE7', borderColor: C.jade },
  statusTxt: { fontSize: 11.5, fontWeight: '800', color: C.ink, textAlign: 'center' },
  tickerRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  tickerItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    paddingHorizontal: 5,
    paddingVertical: 2.5,
  },
  tickerDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  tickerTxt: { flex: 1, minWidth: 0, fontSize: 10, fontWeight: '700', color: C.ink },
  tickerAns: { fontSize: 10, flexShrink: 0 },
  gridFrame: {
    flex: 1,
    minHeight: 0,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 2,
  },
  grid: { flex: 1, minHeight: 0, gap: 3.5 },
  gridRow: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 3.5 },
  cellOuter: { flex: 1, minWidth: 0, minHeight: 0 },
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
    opacity: 0.44,
  },
  cellJustFlipped: { borderColor: '#F59E0B', borderWidth: 2.5, opacity: 0.88 },
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
  flippedMaskFresh: {
    backgroundColor: 'rgba(245, 158, 11, 0.24)',
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
  creditLine: {
    fontSize: 9.5,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
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
  inlineTraitBest: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    borderWidth: 2,
  },
  inlineTraitUsed: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  inlineTraitTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  inlineTraitBestTxt: { color: '#92400E' },
  dockRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  freeAnswerDock: { gap: 6 },
  freeAnswerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D97706',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  freeAnswerPortrait: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  freeAnswerQ: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '800',
    color: C.ink,
    lineHeight: 17,
  },
  reviewHintTxt: { fontSize: 12, fontWeight: '800', color: C.secondary },
  reviewHintFree: { color: '#B45309' },
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
  sheetCreditBox: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  sheetCreditTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.muted,
    textAlign: 'center',
  },
});
