import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  UNO_COLORS,
  UNO_COLOR_META,
  UNO_MERCY_LIMIT,
  canPlayUnoCard,
  getUnoCardLabel,
  getUnoDrawValue,
  isUnoWild,
  sortUnoHand,
  type UnoCard,
  type UnoCardColor,
  type UnoCardKind,
  type UnoColor,
  type UnoMercyEffectBanner,
  type UnoMercyView,
} from '../../../shared/src/unomercy';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { useOnChange, useSecondsLeft, useStableWindow } from '../hooks';
import { actionText } from '../messages';
import { play } from '../sound';
import { C, sticker } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { EmojiIcon, UiIcon, type UiIconName } from '../components/Icons';
import { Sheet } from '../components/Sheet';
import { Shell, useShellTools } from '../components/Shell';

// ================= Bảng màu & Hằng số giao diện =================

const CARD_GRADS: Record<UnoCardColor, readonly [string, string, string]> = {
  red: ['#FB7185', '#EF4444', '#991B1B'],
  blue: ['#60A5FA', '#2563EB', '#1E3A8A'],
  green: ['#4ADE80', '#16A34A', '#14532D'],
  yellow: ['#FDE047', '#EAB308', '#854D0E'],
  wild: ['#334155', '#0F172A', '#020617'],
};

const BANNER_THEME: Record<
  UnoMercyEffectBanner['kind'],
  { bg: readonly [string, string]; border: string; accent: string; emoji: string }
> = {
  mercy_ko: { bg: ['#450A0A', '#7F1D1D'], border: '#F87171', accent: '#FCA5A5', emoji: '💥' },
  stack: { bg: ['#431407', '#7C2D12'], border: '#FB923C', accent: '#FDBA74', emoji: '🔥' },
  swap_7: { bg: ['#3B0764', '#581C87'], border: '#C084FC', accent: '#E9D5FF', emoji: '🦊' },
  rotate_0: { bg: ['#083344', '#155E75'], border: '#22D3EE', accent: '#A5F3FC', emoji: '🌪️' },
  discard_all: { bg: ['#064E3B', '#065F46'], border: '#34D399', accent: '#A7F3D0', emoji: '🌪️' },
  skip_all: { bg: ['#1E1B4B', '#312E81'], border: '#818CF8', accent: '#C7D2FE', emoji: '⏭️' },
  roulette: { bg: ['#4A044E', '#701A75'], border: '#E879F9', accent: '#F5D0FE', emoji: '🎰' },
  uno_catch: { bg: ['#4C0519', '#881337'], border: '#FDA4AF', accent: '#FFE4E6', emoji: '🚨' },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  not_your_turn: 'Chưa tới lượt đánh của bạn!',
  illegal_move: 'Lá bài này không hợp lệ với màu/số hoặc chồng bài phạt hiện tại!',
  bad_action: 'Thao tác chưa hợp lệ lúc này!',
};

function errOf(reason: ActionError): string {
  return EXTRA_ERRORS[reason] ?? actionText[reason] ?? 'Thao tác chưa hợp lệ.';
}

function cornerIndexOf(kind: UnoCardKind): string {
  switch (kind) {
    case 'skip':
      return '⊘';
    case 'reverse':
      return '⇄';
    case 'skip_all':
      return '⏭';
    case 'discard_all':
      return '🌪';
    case 'draw2':
      return '+2';
    case 'draw4':
      return '+4';
    case 'wild_roulette':
      return '🎰';
    case 'wild_reverse_draw4':
      return '⇄4';
    case 'wild_draw6':
      return '+6';
    case 'wild_draw10':
      return '+10';
    default:
      return kind;
  }
}

function shortCardTag(kind: UnoCardKind): string | null {
  switch (kind) {
    case '0':
      return 'XOAY BÀN';
    case '7':
      return 'CƯỚP BÀI';
    case 'skip':
      return 'CẤM';
    case 'reverse':
      return 'ĐẢO';
    case 'skip_all':
      return 'BỎ HẾT';
    case 'discard_all':
      return 'XẢ MÀU';
    case 'draw2':
      return 'RÚT +2';
    case 'draw4':
      return 'RÚT +4';
    case 'wild_roulette':
      return 'QUAY MÀU';
    case 'wild_reverse_draw4':
      return 'ĐẢO +4';
    case 'wild_draw6':
      return 'SIÊU +6';
    case 'wild_draw10':
      return 'HỦY +10';
    default:
      return null;
  }
}

function cardIconName(kind: UnoCardKind): UiIconName | null {
  switch (kind) {
    case 'skip':
      return 'XCircle';
    case 'reverse':
      return 'RefreshCw';
    case 'skip_all':
      return 'Zap';
    case 'discard_all':
      return 'Layers';
    case 'wild_roulette':
      return 'Dices';
    default:
      return null;
  }
}

// ================= Lá Bài Vector UNO Tàn Nhẫn =================

const UnoCardFace = memo(function UnoCardFace({
  card,
  variant = 'hand',
  compact = false,
  playable = false,
  dimmed = false,
}: {
  card: UnoCard;
  variant?: 'hand' | 'table' | 'mini';
  compact?: boolean;
  playable?: boolean;
  dimmed?: boolean;
}) {
  const wild = card.color === 'wild';
  const grad = CARD_GRADS[card.color];
  const corner = cornerIndexOf(card.kind);
  const tag = shortCardTag(card.kind);
  const icName = cardIconName(card.kind);
  const drawVal = getUnoDrawValue(card.kind);

  const dims =
    variant === 'table'
      ? compact
        ? { w: 84, h: 122, r: 14, pad: 4, ovalW: 60, ovalH: 82, centerFs: 28, cornerFs: 12, tagFs: 8.5 }
        : { w: 96, h: 140, r: 16, pad: 5, ovalW: 70, ovalH: 96, centerFs: 32, cornerFs: 13, tagFs: 9.5 }
      : variant === 'mini'
        ? { w: 56, h: 82, r: 10, pad: 3, ovalW: 40, ovalH: 54, centerFs: 19, cornerFs: 10, tagFs: 7 }
        : compact
          ? { w: 64, h: 95, r: 12, pad: 3.5, ovalW: 46, ovalH: 64, centerFs: 22, cornerFs: 10.5, tagFs: 7.5 }
          : { w: 72, h: 108, r: 13, pad: 4, ovalW: 52, ovalH: 72, centerFs: 25, cornerFs: 11.5, tagFs: 8 };

  const centerTextColor =
    card.color === 'wild'
      ? '#FDE047'
      : card.color === 'yellow'
        ? '#854D0E'
        : UNO_COLOR_META[card.color].hex;

  return (
    <View
      style={[
        styles.cardOuter,
        {
          width: dims.w,
          height: dims.h,
          borderRadius: dims.r,
          padding: dims.pad,
          backgroundColor: wild ? '#FDE68A' : '#FFFFFF',
          borderColor: playable ? '#FACC15' : wild ? '#F59E0B' : 'rgba(15,23,42,0.28)',
          borderWidth: playable ? 2.5 : 1.5,
          opacity: dimmed ? 0.46 : 1,
        },
        playable && Platform.OS === 'web'
          ? ({ boxShadow: '0 0 16px rgba(250, 204, 21, 0.78), 0 8px 16px rgba(0,0,0,0.45)' } as object)
          : Platform.OS === 'web'
            ? ({ boxShadow: '0 5px 12px rgba(0,0,0,0.38)' } as object)
            : null,
      ]}
    >
      <LinearGradient
        colors={[...grad]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardInner, { borderRadius: Math.max(6, dims.r - dims.pad) }]}
      >
        {/* Chỉ số góc trên-trái */}
        <T style={[styles.cardCornerTop, { fontSize: dims.cornerFs }]}>{corner}</T>

        {/* Vòng elip nghiêng đặc trưng UNO */}
        <View
          style={[
            styles.cardOval,
            {
              width: dims.ovalW,
              height: dims.ovalH,
              borderRadius: dims.ovalW,
              backgroundColor: wild ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)',
              borderColor: wild ? 'rgba(250, 204, 21, 0.7)' : 'rgba(255, 255, 255, 0.6)',
            },
          ]}
        >
          {wild && (
            <View style={styles.wildQuadWrap} pointerEvents="none">
              <View style={[styles.wildQuad, { backgroundColor: '#EF4444', top: 0, left: 0 }]} />
              <View style={[styles.wildQuad, { backgroundColor: '#2563EB', top: 0, right: 0 }]} />
              <View style={[styles.wildQuad, { backgroundColor: '#EAB308', bottom: 0, left: 0 }]} />
              <View style={[styles.wildQuad, { backgroundColor: '#16A34A', bottom: 0, right: 0 }]} />
            </View>
          )}

          <View style={styles.cardCenterContent}>
            {icName ? (
              <UiIcon
                name={icName}
                size={Math.round(dims.centerFs * 0.92)}
                color={wild ? '#FEF08A' : centerTextColor}
                strokeWidth={2.7}
              />
            ) : (
              <T
                numberOfLines={1}
                style={[
                  styles.cardCenterSymbol,
                  {
                    fontSize: drawVal >= 10 || card.kind === 'wild_reverse_draw4' ? Math.round(dims.centerFs * 0.76) : dims.centerFs,
                    color: wild ? '#FEF08A' : centerTextColor,
                  },
                ]}
              >
                {card.kind === 'wild_reverse_draw4' ? '⇄+4' : drawVal > 0 ? `+${drawVal}` : card.kind}
              </T>
            )}
            {tag && (
              <View
                style={[
                  styles.cardMicroTag,
                  {
                    backgroundColor: wild ? 'rgba(15,23,42,0.88)' : 'rgba(15,23,42,0.12)',
                  },
                ]}
              >
                <T
                  numberOfLines={1}
                  style={[
                    styles.cardMicroTagText,
                    {
                      fontSize: dims.tagFs,
                      color: wild ? '#FDE047' : '#0F172A',
                    },
                  ]}
                >
                  {tag}
                </T>
              </View>
            )}
          </View>
        </View>

        {/* Chỉ số góc dưới-phải */}
        <T style={[styles.cardCornerBottom, { fontSize: dims.cornerFs }]}>{corner}</T>
      </LinearGradient>
    </View>
  );
});

// ================= Hàng Đối Thủ Trên Cùng =================

const OpponentCard = memo(function OpponentCard({
  player,
  count,
  isTurn,
  elim,
  unoSafe,
  unoVulnerable,
  compact,
  onSelect,
}: {
  player: PublicPlayer;
  count: number;
  isTurn: boolean;
  elim?: { id: string; reason: 'mercy_25' | 'left'; peakCards: number };
  unoSafe: boolean;
  unoVulnerable: boolean;
  compact: boolean;
  onSelect?: (id: string) => void;
}) {
  const nearMercy = !elim && count >= 21;
  const warnMercy = !elim && count >= 17 && count < 21;
  const isOne = !elim && count === 1;

  let badgeBg = 'rgba(30, 41, 59, 0.9)';
  let badgeBorder = 'rgba(148, 163, 184, 0.35)';
  let badgeText = `${count} lá`;
  let badgeColor = '#F8FAFC';

  if (elim) {
    badgeBg = 'rgba(127, 29, 29, 0.92)';
    badgeBorder = '#F87171';
    badgeText = elim.reason === 'mercy_25' ? `💥 CHÁY ${elim.peakCards}` : '🚪 RỜI';
    badgeColor = '#FECACA';
  } else if (unoVulnerable) {
    badgeBg = '#BE123C';
    badgeBorder = '#FDE047';
    badgeText = '🚨 QUÊN UNO';
    badgeColor = '#FEF08A';
  } else if (isOne || unoSafe) {
    badgeBg = '#B45309';
    badgeBorder = '#FACC15';
    badgeText = '🔥 UNO! (1)';
    badgeColor = '#FEF9C3';
  } else if (nearMercy) {
    badgeBg = '#991B1B';
    badgeBorder = '#FCA5A5';
    badgeText = `⚠️ ${count}/${UNO_MERCY_LIMIT}`;
    badgeColor = '#FEE2E2';
  } else if (warnMercy) {
    badgeBg = '#9A3412';
    badgeBorder = '#FDBA74';
    badgeText = `🔥 ${count}/${UNO_MERCY_LIMIT}`;
    badgeColor = '#FFEDD5';
  }

  return (
    <Pressable
      onPress={onSelect ? () => onSelect(player.id) : undefined}
      style={[
        styles.oppCard,
        compact && styles.oppCardCompact,
        isTurn && styles.oppCardActive,
        nearMercy && styles.oppCardDanger,
        !!elim && styles.oppCardElim,
      ]}
    >
      <View style={elim ? { opacity: 0.45 } : undefined}>
        <Portrait
          p={player}
          size={compact ? 30 : 34}
          border={isTurn ? 2.5 : 1.5}
          active={isTurn}
        />
      </View>
      <NameText
        fx={player.cosmetics?.nameFx}
        numberOfLines={1}
        style={[styles.oppNameText, isTurn && { color: '#86EFAC' }]}
      >
        {player.name}
      </NameText>
      <View style={[styles.oppCountPill, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
        <T numberOfLines={1} style={[styles.oppCountText, { color: badgeColor }]}>
          {badgeText}
        </T>
      </View>
    </Pressable>
  );
});

// ================= Nội dung Bàn Chơi Chính (Bên trong Shell) =================

function UnoMercyTable({ game, room, view }: { game: Game; room: RoomState; view: UnoMercyView }) {
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const tools = useShellTools();
  const feed = useFeed();
  const { width, height } = useStableWindow();

  const compact = height < 720 || width < 390;
  const desktop = width >= 860;

  const [busy, setBusy] = useState(false);
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);
  const [pendingSeven, setPendingSeven] = useState<UnoCard | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const secLeft = useSecondsLeft(view.turnEndsAt, game.clockOffset, view.turnSeconds);

  // Hiệu ứng nảy Banner khi có biến cố mới trên bàn
  const [bannerAnim] = useState(() => new Animated.Value(1));
  useOnChange(view.lastBanner?.id ?? 0, (id) => {
    if (!id || !view.lastBanner) return;
    bannerAnim.setValue(0.86);
    Animated.spring(bannerAnim, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: false,
    }).start();

    switch (view.lastBanner.kind) {
      case 'mercy_ko':
        play(view.lastBanner.targetId === me ? 'ko' : 'boom');
        break;
      case 'stack':
        play(view.drawStack >= 10 ? 'zap' : 'punch');
        break;
      case 'swap_7':
        play('whoosh');
        break;
      case 'rotate_0':
        play('spin');
        break;
      case 'discard_all':
        play('rocket');
        break;
      case 'skip_all':
        play('stamp');
        break;
      case 'roulette':
        play('dice');
        break;
      case 'uno_catch':
        play('siren');
        break;
    }
  });

  useOnChange(view.currentPlayerId, (cur) => {
    setPendingWild(null);
    setPendingSeven(null);
    if (cur === me) {
      play('turn');
    }
  });

  // Hiệu ứng nhịp thở cho Nọc Bài / Cảnh báo
  const [pulseAnim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const elimMap = useMemo(() => new Map(view.eliminated.map((e) => [e.id, e])), [view.eliminated]);

  const amParticipant = view.order.includes(me);
  const amAlive = view.alive.includes(me);
  const myElim = elimMap.get(me);
  const isMyTurn = amAlive && view.currentPlayerId === me;

  // Sắp xếp đối thủ quanh bàn theo chiều ngồi tính từ vị trí của mình
  const opponents = useMemo(() => {
    const list: PublicPlayer[] = [];
    const myIdx = view.order.indexOf(me);
    const orderedIds =
      myIdx >= 0
        ? [...view.order.slice(myIdx + 1), ...view.order.slice(0, myIdx)]
        : view.order;
    for (const id of orderedIds) {
      const p = playerMap.get(id);
      if (p) list.push(p);
    }
    return list;
  }, [view.order, me, playerMap]);

  const aliveOpponentsForSwap = useMemo(() => {
    return view.alive
      .filter((id) => id !== me)
      .map((id) => ({
        id,
        name: view.names[id] ?? 'Đối thủ',
        player: playerMap.get(id),
        count: view.handCounts[id] ?? 0,
      }))
      .sort((a, b) => a.count - b.count);
  }, [view.alive, me, view.names, playerMap, view.handCounts]);

  const sortedHand = useMemo(
    () => sortUnoHand(view.myHand, view.activeColor),
    [view.myHand, view.activeColor],
  );

  const playableIds = useMemo(() => {
    const set = new Set<string>();
    if (!isMyTurn || view.phase !== 'playing') return set;
    for (const c of view.myHand) {
      if (
        canPlayUnoCard(
          c,
          view.topCard,
          view.activeColor,
          view.drawStack,
          view.drawMinValue,
          view.roulettePending,
        )
      ) {
        set.add(c.id);
      }
    }
    return set;
  }, [isMyTurn, view.phase, view.myHand, view.topCard, view.activeColor, view.drawStack, view.drawMinValue, view.roulettePending]);

  // Đếm số lá từng màu trên tay để hiển thị gợi ý thông minh khi chọn màu Wild
  const myColorCounts = useMemo(() => {
    const counts: Record<UnoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
    for (const c of view.myHand) {
      if (c.color !== 'wild') counts[c.color]++;
    }
    return counts;
  }, [view.myHand]);

  const amUnoSafe = view.unoSafeIds.includes(me);
  const canDropToOne = useMemo(() => {
    if (view.myHand.length < 2) return false;
    if (view.myHand.length === 2) return true;
    for (const c of view.myHand) {
      if (c.kind === 'discard_all' && playableIds.has(c.id)) {
        const rem = view.myHand.filter((x) => x.color !== c.color).length;
        if (rem === 1) return true;
      }
    }
    return false;
  }, [view.myHand, playableIds]);

  const showShoutUno =
    amAlive &&
    !amUnoSafe &&
    ((isMyTurn && view.phase === 'playing' && !view.roulettePending && canDropToOne) ||
      view.myHand.length === 1);

  const catchTargetId =
    amAlive && view.unoVulnerableId && view.unoVulnerableId !== me ? view.unoVulnerableId : null;

  const runAction = useCallback(
    async (actPayload: Parameters<Game['act']>[0]) => {
      if (busy) return false;
      setBusy(true);
      try {
        const res = await game.act(actPayload);
        if (!res.ok) {
          play('error');
          feed(errOf(res.reason), 'bad');
          return false;
        }
        return true;
      } finally {
        setBusy(false);
      }
    },
    [busy, game, feed],
  );

  const handleCardPress = useCallback(
    (card: UnoCard) => {
      if (!isMyTurn || view.phase !== 'playing' || !playableIds.has(card.id) || busy) return;

      if (isUnoWild(card)) {
        play('pop');
        setPendingWild(card);
        return;
      }

      // Đánh Số 7 khi còn >= 2 lá trên tay và có từ 2 đối thủ còn sống trở lên -> mở bảng chọn nạn nhân cướp bài!
      if (card.kind === '7' && view.myHand.length > 1 && aliveOpponentsForSwap.length >= 2) {
        play('pop');
        setPendingSeven(card);
        return;
      }

      play('flip');
      const autoTarget =
        card.kind === '7' && view.myHand.length > 1 && aliveOpponentsForSwap.length === 1
          ? aliveOpponentsForSwap[0].id
          : undefined;
      void runAction({
        type: 'um_play',
        cardId: card.id,
        ...(autoTarget ? { swapTargetId: autoTarget } : {}),
      });
    },
    [isMyTurn, view.phase, playableIds, busy, view.myHand.length, aliveOpponentsForSwap, runAction],
  );

  const handleConfirmWild = useCallback(
    (color: UnoColor) => {
      const card = pendingWild;
      if (!card) return;
      setPendingWild(null);
      play('flip');
      void runAction({ type: 'um_play', cardId: card.id, chosenColor: color });
    },
    [pendingWild, runAction],
  );

  const handleConfirmSwapTarget = useCallback(
    (targetId: string) => {
      if (pendingSeven) {
        const card = pendingSeven;
        setPendingSeven(null);
        play('whoosh');
        void runAction({ type: 'um_play', cardId: card.id, swapTargetId: targetId });
        return;
      }
      if (isMyTurn && view.phase === 'choose_swap') {
        play('whoosh');
        void runAction({ type: 'um_pick_swap', targetId });
      }
    },
    [pendingSeven, isMyTurn, view.phase, runAction],
  );

  const handleDrawPress = useCallback(() => {
    if (!isMyTurn || view.phase !== 'playing' || view.drewThisTurn || busy) return;
    play('pop');
    void runAction({ type: 'um_draw' });
  }, [isMyTurn, view.phase, view.drewThisTurn, busy, runAction]);

  const handlePassPress = useCallback(() => {
    if (!isMyTurn || !view.drewThisTurn || busy) return;
    play('pop');
    void runAction({ type: 'um_pass' });
  }, [isMyTurn, view.drewThisTurn, busy, runAction]);

  const handleShoutUnoPress = useCallback(() => {
    if (!showShoutUno || busy) return;
    play('sparkle');
    void runAction({ type: 'um_shout_uno' });
  }, [showShoutUno, busy, runAction]);

  const handleCatchUnoPress = useCallback(() => {
    if (!catchTargetId || busy) return;
    play('siren');
    void runAction({ type: 'um_catch_uno', targetId: catchTargetId });
  }, [catchTargetId, busy, runAction]);

  // Thông tin màu hiệu lực & hướng dẫn trạng thái dưới khay bài
  const activeMeta = UNO_COLOR_META[view.activeColor];
  const activeName = view.currentPlayerId ? (view.names[view.currentPlayerId] ?? 'Người chơi') : '—';
  const myCount = view.myHand.length;
  const mercyRatio = Math.min(1, myCount / UNO_MERCY_LIMIT);
  const mercyBarColor =
    myCount >= 21 ? '#EF4444' : myCount >= 16 ? '#F97316' : myCount >= 11 ? '#EAB308' : '#22C55E';

  let statusHint = `⏳ Đang chờ lượt của ${activeName}...`;
  if (!amParticipant) {
    statusHint = '👀 Bạn đang theo dõi bàn UNO Tàn Nhẫn!';
  } else if (myElim) {
    statusHint = `💥 Bạn đã cháy bài (${myElim.peakCards} lá) — cùng hóng xem ai sống sót cuối cùng!`;
  } else if (isMyTurn && view.phase === 'choose_swap') {
    statusHint = '🦊 Chọn ngay 1 đối thủ để CƯỚP TRẮNG toàn bộ bài trên tay!';
  } else if (isMyTurn && view.roulettePending) {
    statusHint = `🎰 Vòng Quay Tử Thần! Chạm Nọc Bài để bốc tới khi trúng màu ${activeMeta.name}!`;
  } else if (isMyTurn && view.drawStack > 0) {
    statusHint =
      playableIds.size > 0
        ? `🔥 Chọn bài >= +${view.drawMinValue} (viền vàng) để CHỒNG TIẾP, hoặc chạm Nọc nhận +${view.drawStack} lá!`
        : `💀 Hết bài đỡ! Chạm Nọc Bài để nuốt trọn +${view.drawStack} lá phạt!`;
  } else if (isMyTurn && view.drewThisTurn) {
    statusHint = '✨ Chạm lá sáng viền vàng để đánh ngay, hoặc bấm "Qua lượt"!';
  } else if (isMyTurn) {
    statusHint =
      playableIds.size > 0
        ? '⚡ Tới lượt bạn — chạm lá bài sáng viền vàng để ra đòn!'
        : '🃏 Không có lá hợp lệ — chạm Nọc Bài để bốc tới khi đi được!';
  }

  const canTapDeck = isMyTurn && view.phase === 'playing' && !view.drewThisTurn && !busy;
  const deckUrgent = canTapDeck && (view.roulettePending || playableIds.size === 0);

  let deckLabel = `Nọc: ${view.deckCount}`;
  let deckSub = canTapDeck ? '+ Rút 1 lá' : 'Chồng bốc';
  if (isMyTurn && view.roulettePending) {
    deckLabel = '🎰 QUAY MÀU';
    deckSub = `Ra ${activeMeta.name}`;
  } else if (isMyTurn && view.drawStack > 0 && !view.drewThisTurn) {
    deckLabel = `💀 NHẬN +${view.drawStack}`;
    deckSub = playableIds.size > 0 ? 'Hoặc chồng bài!' : 'Bắt buộc rút!';
  } else if (isMyTurn && playableIds.size === 0 && !view.drewThisTurn) {
    deckLabel = '✨ BỐC BÀI';
    deckSub = 'Tới khi đi được';
  }

  const bannerTheme = view.lastBanner ? BANNER_THEME[view.lastBanner.kind] : null;
  const swapModalVisible = !!pendingSeven || (isMyTurn && view.phase === 'choose_swap');

  return (
    <View style={styles.screenRoot}>
      {/* 1. Thanh Trạng Thái Vòng Đánh + Hàng Đối Thủ */}
      <View style={styles.topZone}>
        <View style={styles.metaRow}>
          <View style={[styles.dirPill, view.direction === -1 && styles.dirPillRev]}>
            <UiIcon
              name={view.direction === 1 ? 'RefreshCw' : 'RotateCcw'}
              size={12}
              color={view.direction === 1 ? '#38BDF8' : '#E879F9'}
            />
            <T style={styles.dirPillText}>
              {view.direction === 1 ? '↻ Chiều thuận' : '↺ Chiều ngược'}
            </T>
          </View>

          <View style={[styles.colorIndicatorPill, { borderColor: activeMeta.border }]}>
            <View style={[styles.colorDot, { backgroundColor: activeMeta.hex }]} />
            <T numberOfLines={1} style={styles.colorIndicatorText}>
              {activeMeta.name}
            </T>
          </View>

          <View style={[styles.timerPill, secLeft <= 5 && styles.timerPillUrgent]}>
            <UiIcon name="Timer" size={12} color={secLeft <= 5 ? '#FCA5A5' : '#FDE047'} />
            <T style={[styles.timerPillText, secLeft <= 5 && { color: '#FECACA' }]}>{secLeft}s</T>
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            testID="um-log-open"
            accessibilityRole="button"
            accessibilityLabel="Lịch sử bàn chơi"
            onPress={() => {
              play('pop');
              setLogOpen(true);
            }}
            style={styles.miniToolBtn}
          >
            <UiIcon name="History" size={14} color="#E2E8F0" />
          </Pressable>

          <Pressable
            testID="um-rules-open"
            accessibilityRole="button"
            accessibilityLabel="Luật UNO Tàn Nhẫn"
            onPress={() => {
              play('pop');
              setRulesOpen(true);
            }}
            style={styles.miniToolBtn}
          >
            <UiIcon name="HelpCircle" size={14} color="#FDE047" />
          </Pressable>

          {isHost && (
            <Pressable
              testID="um-host-end"
              accessibilityRole="button"
              accessibilityLabel="Kết thúc ván sớm"
              onPress={() => {
                play('pop');
                setConfirmEnd(true);
              }}
              style={[styles.miniToolBtn, { borderColor: 'rgba(248,113,113,0.45)' }]}
            >
              <UiIcon name="X" size={14} color="#FCA5A5" />
            </Pressable>
          )}
        </View>

        {opponents.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.oppScroll}
            contentContainerStyle={[styles.oppScrollContent, desktop && { justifyContent: 'center', flexGrow: 1 }]}
          >
            {opponents.map((p) => (
              <OpponentCard
                key={p.id}
                player={p}
                count={view.handCounts[p.id] ?? 0}
                isTurn={view.currentPlayerId === p.id}
                elim={elimMap.get(p.id)}
                unoSafe={view.unoSafeIds.includes(p.id)}
                unoVulnerable={view.unoVulnerableId === p.id}
                compact={compact}
                onSelect={tools?.openPlayer}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 2. Bảng Điện Tử Chấn Động (Shock Banner / Event Ticker) */}
      {view.lastBanner && bannerTheme ? (
        <Animated.View style={{ transform: [{ scale: bannerAnim }] }}>
          <LinearGradient
            colors={[...bannerTheme.bg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.shockBanner, { borderColor: bannerTheme.border }]}
          >
            <EmojiIcon emoji={bannerTheme.emoji} size={compact ? 18 : 22} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T numberOfLines={1} style={[styles.shockHeadline, compact && { fontSize: 11.5 }]}>
                {view.lastBanner.headline}
              </T>
              {view.lastBanner.subtext ? (
                <T numberOfLines={1} style={[styles.shockSubtext, { color: bannerTheme.accent }]}>
                  {view.lastBanner.subtext}
                </T>
              ) : null}
            </View>
          </LinearGradient>
        </Animated.View>
      ) : (
        <View style={styles.idleTicker}>
          <T numberOfLines={1} style={styles.idleTickerText}>
            {view.log.at(-1)?.text ?? '🃏 UNO Show \'Em No Mercy — Chồng bài không đáy, 25 lá NỔ BÀI!'}
          </T>
        </View>
      )}

      {/* 3. Sới Bài Trung Tâm (No-Mercy Felt Arena) */}
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.86)', 'rgba(9, 13, 22, 0.94)']}
        style={[styles.feltArena, { borderColor: activeMeta.hex + '66' }]}
      >
        {/* Vòng hào quang màu hiện tại dưới mặt bàn */}
        <View
          pointerEvents="none"
          style={[
            styles.arenaColorHalo,
            {
              borderColor: activeMeta.hex + '44',
              backgroundColor: activeMeta.hex + '14',
            },
          ]}
        />

        <View style={styles.tableColumns}>
          {/* Cột Trái: Nọc Bài 3D */}
          <View style={styles.deckCol}>
            <Animated.View
              style={[
                deckUrgent && {
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.06],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable
                testID="um-draw-pile"
                accessibilityRole="button"
                accessibilityLabel={deckLabel}
                disabled={!canTapDeck}
                onPress={handleDrawPress}
                style={({ pressed }) => [
                  styles.deckStackWrap,
                  compact ? { width: 78, height: 112 } : { width: 88, height: 126 },
                  pressed && canTapDeck && { transform: [{ translateY: 2 }] },
                ]}
              >
                {/* 2 lớp bài lót tạo khối 3D */}
                <View style={[styles.deckShadowCard, { top: 4, left: 5 }]} />
                <View style={[styles.deckShadowCard, { top: 2, left: 2.5 }]} />
                <LinearGradient
                  colors={
                    isMyTurn && view.roulettePending
                      ? ['#86198F', '#4A044E', '#1E1B4B']
                      : isMyTurn && view.drawStack > 0
                        ? ['#991B1B', '#450A0A', '#0F172A']
                        : ['#1E293B', '#0F172A', '#020617']
                  }
                  style={[
                    styles.deckTopFace,
                    canTapDeck && styles.deckTopInteractive,
                    deckUrgent && styles.deckTopUrgent,
                  ]}
                >
                  <View style={styles.deckCrest}>
                    <T style={styles.deckCrestTitle}>NO MERCY</T>
                  </View>
                  <T numberOfLines={2} style={[styles.deckMainLabel, compact && { fontSize: 10.5 }]}>
                    {deckLabel}
                  </T>
                  <T numberOfLines={1} style={styles.deckSubLabel}>
                    {deckSub}
                  </T>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {/* Cột Giữa: Lá Trên Đỉnh + Vòng Neon Màu + Huy Hiệu Chồng Phạt */}
          <View style={styles.centerPileCol}>
            {view.drawStack > 0 && (
              <View testID="um-stack-badge" style={styles.stackBadge}>
                <T style={styles.stackBadgeMain}>🔥 CHỒNG PHẠT +{view.drawStack}</T>
                <T style={styles.stackBadgeSub}>Đỡ bằng &gt;= +{view.drawMinValue}</T>
              </View>
            )}

            {view.roulettePending && (
              <View testID="um-roulette-badge" style={styles.rouletteBadge}>
                <T style={styles.rouletteBadgeText}>
                  🎰 VÒNG QUAY: {activeMeta.name.toUpperCase()}
                </T>
              </View>
            )}

            <View
              style={[
                styles.discardHaloWrap,
                {
                  borderColor: activeMeta.hex,
                  backgroundColor: activeMeta.hex + '22',
                },
                Platform.OS === 'web'
                  ? ({ boxShadow: `0 0 26px ${activeMeta.hex}77` } as object)
                  : null,
              ]}
            >
              <UnoCardFace card={view.topCard} variant="table" compact={compact} />
            </View>

            <View style={[styles.activeColorTag, { backgroundColor: activeMeta.dark, borderColor: activeMeta.border }]}>
              <View style={[styles.colorDotSmall, { backgroundColor: activeMeta.hex }]} />
              <T numberOfLines={1} style={styles.activeColorTagText}>
                Màu: {activeMeta.name}
              </T>
            </View>
          </View>

          {/* Cột Phải: Các Nút Tác Chiến Nổi (Hô UNO / Bắt Lỗi UNO / Qua Lượt) */}
          <View style={styles.quickActionsCol}>
            {catchTargetId && (
              <Animated.View
                style={{
                  transform: [
                    {
                      scale: pulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.07],
                      }),
                    },
                  ],
                }}
              >
                <Pressable
                  testID="um-catch-uno"
                  accessibilityRole="button"
                  onPress={handleCatchUnoPress}
                  style={styles.catchUnoBtn}
                >
                  <EmojiIcon emoji="🚨" size={18} />
                  <T style={styles.catchUnoTitle}>BẮT UNO!</T>
                  <T numberOfLines={1} style={styles.catchUnoSub}>
                    {(view.names[catchTargetId] ?? 'Đối thủ').slice(0, 8)} (+2 lá)
                  </T>
                </Pressable>
              </Animated.View>
            )}

            {showShoutUno && (
              <Pressable
                testID="um-shout-uno"
                accessibilityRole="button"
                onPress={handleShoutUnoPress}
                style={styles.shoutUnoBtn}
              >
                <EmojiIcon emoji="🔥" size={18} />
                <T style={styles.shoutUnoTitle}>HÔ UNO!</T>
                <T style={styles.shoutUnoSub}>Bấm kẻo phạt +2</T>
              </Pressable>
            )}

            {amAlive && amUnoSafe && myCount <= 2 && (
              <View style={styles.unoSafeBadge}>
                <UiIcon name="Shield" size={14} color="#4ADE80" />
                <T style={styles.unoSafeText}>ĐÃ HÔ UNO</T>
              </View>
            )}

            {isMyTurn && view.drewThisTurn && (
              <Pressable
                testID="um-pass-btn"
                accessibilityRole="button"
                onPress={handlePassPress}
                style={styles.passTurnBtn}
              >
                <UiIcon name="ChevronRight" size={16} color="#F8FAFC" />
                <T style={styles.passTurnText}>Qua lượt</T>
              </Pressable>
            )}

            {!catchTargetId && !showShoutUno && !(amAlive && amUnoSafe && myCount <= 2) && !(isMyTurn && view.drewThisTurn) && (
              <View style={styles.turnSpotlightBox}>
                <T style={styles.turnSpotlightLabel}>LƯỢT HIỆN TẠI</T>
                <T numberOfLines={2} style={[styles.turnSpotlightName, isMyTurn && { color: '#4ADE80' }]}>
                  {isMyTurn ? '⚡ BẠN ĐÁNH!' : activeName}
                </T>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* 4. Khay Bài Của Bạn + Thanh Đo Nổ Bài (Mercy Meter) */}
      <View style={[styles.handDock, isMyTurn && styles.handDockMyTurn]}>
        <View style={styles.handHeader}>
          <View style={styles.handTitleRow}>
            <T style={styles.handTitleText}>
              {myElim
                ? `💀 Đã nổ bài (${myElim.peakCards} lá)`
                : amParticipant
                  ? `Bài của bạn: ${myCount}/${UNO_MERCY_LIMIT} lá`
                  : 'Chế độ khán giả'}
            </T>
            {amAlive && (
              <View style={styles.mercyMeterWrap}>
                <View style={styles.mercyMeterTrack}>
                  <View
                    style={[
                      styles.mercyMeterFill,
                      {
                        width: `${Math.round(mercyRatio * 100)}%`,
                        backgroundColor: mercyBarColor,
                      },
                    ]}
                  />
                </View>
                <T style={[styles.mercyMeterTag, myCount >= 20 && { color: '#FCA5A5' }]}>
                  {myCount >= 21 ? '⚠️ SẮP NỔ!' : myCount >= 16 ? '🔥 Nguy hiểm' : 'An toàn'}
                </T>
              </View>
            )}
          </View>
          <T numberOfLines={1} style={[styles.handHintText, isMyTurn && { color: '#FEF08A' }]}>
            {statusHint}
          </T>
        </View>

        {amAlive && sortedHand.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.handScroll}
            contentContainerStyle={[
              styles.handScrollContent,
              sortedHand.length <= 6 && { flexGrow: 1, justifyContent: 'center' },
            ]}
          >
            {sortedHand.map((card) => {
              const canPlay = playableIds.has(card.id);
              const dimmed = isMyTurn && view.phase === 'playing' && !canPlay;
              return (
                <Pressable
                  key={card.id}
                  testID={`um-card-${card.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={getUnoCardLabel(card.kind).title}
                  disabled={!canPlay || busy}
                  onPress={() => handleCardPress(card)}
                  style={({ pressed }) => [
                    styles.handCardSlot,
                    canPlay && styles.handCardPlayableLift,
                    pressed && canPlay && { transform: [{ translateY: -4 }, { scale: 0.97 }] },
                  ]}
                >
                  <UnoCardFace
                    card={card}
                    variant="hand"
                    compact={compact}
                    playable={canPlay}
                    dimmed={dimmed}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyHandBox}>
            <T style={styles.emptyHandText}>
              {myElim
                ? `💥 Quá mốc ${UNO_MERCY_LIMIT} lá — Bạn vẫn có thể bấm BẮT UNO nếu có người quên hô!`
                : 'Đang chờ chia bài...'}
            </T>
          </View>
        )}
      </View>

      {/* ================= MODAL 1: Chọn Màu Cho Lá Wild ================= */}
      {pendingWild && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPendingWild(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, sticker(4)]}>
              <View style={styles.modalTopRow}>
                <UnoCardFace card={pendingWild} variant="mini" playable />
                <View style={{ flex: 1, gap: 3 }}>
                  <T style={styles.modalTitle}>{getUnoCardLabel(pendingWild.kind).title}</T>
                  <T style={styles.modalDesc}>
                    {pendingWild.kind === 'wild_roulette'
                      ? 'Chọn màu Tử Thần — người kế tiếp phải bốc liên tục tới khi ra màu này!'
                      : 'Chọn màu hiệu lực tiếp theo cho bàn đấu:'}
                  </T>
                </View>
              </View>

              <View style={styles.colorGrid}>
                {UNO_COLORS.map((col) => {
                  const meta = UNO_COLOR_META[col];
                  const cnt = myColorCounts[col];
                  return (
                    <Pressable
                      key={col}
                      testID={`um-pick-color-${col}`}
                      accessibilityRole="button"
                      onPress={() => handleConfirmWild(col)}
                      style={({ pressed }) => [
                        styles.colorChoiceBtn,
                        { borderColor: meta.border },
                        pressed && { transform: [{ scale: 0.97 }] },
                      ]}
                    >
                      <LinearGradient
                        colors={[...CARD_GRADS[col]]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.colorChoiceInner}
                      >
                        <T style={styles.colorChoiceName}>{meta.name}</T>
                        <T style={styles.colorChoiceCount}>Trên tay: {cnt} lá</T>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </View>

              <Button small variant="paper" title="Hủy chọn" onPress={() => setPendingWild(null)} />
            </View>
          </View>
        </Modal>
      )}

      {/* ================= MODAL 2: Chọn Đối Thủ Tráo Bài Số 7 ================= */}
      {swapModalVisible && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => {
            if (pendingSeven) setPendingSeven(null);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, sticker(4)]}>
              <View style={styles.modalHeaderLine}>
                <EmojiIcon emoji="🦊" size={24} />
                <View style={{ flex: 1 }}>
                  <T style={styles.modalTitle}>Số 7 · Cướp Trắng Bộ Bài!</T>
                  <T style={styles.modalDesc}>
                    Chọn 1 đối thủ để đổi toàn bộ {myCount} lá của bạn lấy bài của họ:
                  </T>
                </View>
              </View>

              <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: 8 }}>
                {aliveOpponentsForSwap.map((opp) => {
                  const juicy = opp.count <= 2;
                  const risky = opp.count >= 18;
                  return (
                    <Pressable
                      key={opp.id}
                      testID={`um-swap-target-${opp.id}`}
                      accessibilityRole="button"
                      onPress={() => handleConfirmSwapTarget(opp.id)}
                      style={({ pressed }) => [
                        styles.swapRow,
                        juicy && styles.swapRowJuicy,
                        pressed && { transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      {opp.player && <Portrait p={opp.player} size={36} border={2} />}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T numberOfLines={1} style={styles.swapRowName}>
                          {opp.name}
                        </T>
                        <T style={[styles.swapRowHint, juicy && { color: '#FDE047' }, risky && { color: '#FCA5A5' }]}>
                          {opp.count === 1
                            ? '🔥 CƯỚP LÁ UNO CUỐI CÙNG!!'
                            : juicy
                              ? '✨ Rất ít bài — Cướp ngay!'
                              : risky
                                ? '⚠️ Đang ôm nhiều bài, coi chừng nổ!'
                                : 'Đổi toàn bộ bài trên tay'}
                        </T>
                      </View>
                      <View style={[styles.swapCountBadge, juicy && { backgroundColor: '#B45309', borderColor: '#FACC15' }]}>
                        <T style={styles.swapCountText}>{opp.count} lá</T>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {pendingSeven && (
                <Button small variant="paper" title="Khoan đánh Số 7" onPress={() => setPendingSeven(null)} />
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* ================= SHEET: Lịch Sử Bàn Chơi ================= */}
      {logOpen && (
        <Sheet title="📜 Diễn Biến Bàn Đấu" onClose={() => setLogOpen(false)}>
          <View style={{ gap: 6 }}>
            {[...view.log].reverse().map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <T style={styles.logText}>{entry.text}</T>
              </View>
            ))}
          </View>
        </Sheet>
      )}

      {/* ================= SHEET: Sổ Tay Luật UNO Tàn Nhẫn ================= */}
      {rulesOpen && (
        <Sheet title="🃏 Luật UNO Tàn Nhẫn (No Mercy)" onClose={() => setRulesOpen(false)}>
          <View style={{ gap: 10 }}>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>💥 Luật Nổ Bài (&gt;= {UNO_MERCY_LIMIT} lá)</T>
              <T style={styles.ruleBody}>
                Bất cứ ai cầm từ {UNO_MERCY_LIMIT} lá trở lên trên tay ở bất kỳ thời điểm nào sẽ CHÁY BÀI và bị loại trực tiếp khỏi ván!
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>🔥 Cộng Dồn Không Đáy (+2, +4, +6, +10)</T>
              <T style={styles.ruleBody}>
                Khi bị tấn công bằng lá rút phạt, bạn được phép chồng tiếp bất kỳ lá rút phạt nào có giá trị lớn hơn hoặc bằng lá vừa đánh (+2 → +2/+4/+6/+10; +6 → +6/+10)!
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>🦊 Luật Số 7 &amp; 🌪️ Luật Số 0</T>
              <T style={styles.ruleBody}>
                • Đánh lá Số 7: Chọn 1 người bất kỳ để TRÁO TOÀN BỘ BÀI trên tay!{'\n'}
                • Đánh lá Số 0: Tất cả mọi người chuyển bài cho người kế tiếp theo chiều đánh!
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>🎰 Bảo Bối Hủy Diệt Tình Bạn</T>
              <T style={styles.ruleBody}>
                • 🌪️ Xả Cùng Màu: Đánh 1 lá, xả sạch mọi lá cùng màu đó trên tay!{'\n'}
                • ⏭️ Bỏ Tất Cả: Cấm lượt cả bàn, bạn được đánh tiếp ngay 1 lượt!{'\n'}
                • 🎰 Vòng Quay Tử Thần: Chỉ định 1 màu; người kế tiếp phải bốc liên tục cho tới khi ra lá màu đó!
              </T>
            </View>
          </View>
        </Sheet>
      )}

      {/* ================= SHEET: Chủ Phòng Kết Thúc Sớm ================= */}
      {confirmEnd && (
        <Sheet title="⏹ Kết thúc ván sớm?" onClose={() => setConfirmEnd(false)}>
          <T style={{ color: C.muted }}>
            Ván đấu sẽ khép lại ngay và xếp hạng theo người đang cầm ít bài nhất trên tay.
          </T>
          <Button
            testID="um-confirm-end"
            variant="danger"
            title="Kết thúc ngay"
            onPress={() => {
              setConfirmEnd(false);
              void runAction({ type: 'end' });
            }}
          />
          <Button variant="paper" title="Tiếp tục chơi" onPress={() => setConfirmEnd(false)} />
        </Sheet>
      )}
    </View>
  );
}

export function UnoMercyScreen({ game, room: propRoom }: { game: Game; room?: RoomState }) {
  const room = propRoom ?? game.room;
  if (!room || room.game?.type !== 'uno_mercy') return null;
  const view = room.game;

  return (
    <Shell game={game} room={room} scroll={false} hideStrip fullscreen>
      <UnoMercyTable game={game} room={room} view={view} />
    </Shell>
  );
}

// ================= Styles =================

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    minHeight: 0,
    gap: 5,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },

  // --- Vùng đối thủ & thanh thông tin ---
  topZone: {
    gap: 4,
    flexShrink: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  dirPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 99,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  dirPillRev: {
    borderColor: 'rgba(232, 121, 249, 0.55)',
    backgroundColor: 'rgba(59, 7, 100, 0.72)',
  },
  dirPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  colorIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 99,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
  },
  colorDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  colorIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 99,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.4)',
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    borderColor: '#F87171',
  },
  timerPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FDE047',
  },
  miniToolBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },

  oppScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  oppScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  oppCard: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 14,
    minWidth: 74,
    maxWidth: 92,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 2,
    overflow: 'hidden',
  },
  oppCardCompact: {
    minWidth: 68,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  oppNameText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F1F5F9',
    maxWidth: '100%',
    textAlign: 'center',
  },
  oppCardActive: {
    backgroundColor: 'rgba(6, 78, 59, 0.78)',
    borderColor: '#4ADE80',
  },
  oppCardDanger: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(69, 10, 10, 0.78)',
  },
  oppCardElim: {
    opacity: 0.68,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  oppCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 99,
    borderWidth: 1,
  },
  oppCountText: {
    fontSize: 10,
    fontWeight: '900',
  },

  // --- Shock Banner ---
  shockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  shockHeadline: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  shockSubtext: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  idleTicker: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexShrink: 0,
  },
  idleTickerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CBD5E1',
    textAlign: 'center',
  },

  // --- Felt Arena Trung Tâm ---
  feltArena: {
    flex: 1,
    minHeight: 156,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arenaColorHalo: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    alignSelf: 'center',
  },
  tableColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  deckCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckStackWrap: {
    position: 'relative',
  },
  deckShadowCard: {
    position: 'absolute',
    width: '94%',
    height: '94%',
    borderRadius: 13,
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  deckTopFace: {
    flex: 1,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckTopInteractive: {
    borderColor: '#93C5FD',
  },
  deckTopUrgent: {
    borderColor: '#FACC15',
    borderWidth: 2.5,
  },
  deckCrest: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#DC2626',
    borderWidth: 1,
    borderColor: '#FDE047',
    transform: [{ rotate: '-8deg' }],
  },
  deckCrestTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 0.4,
  },
  deckMainLabel: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  deckSubLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#CBD5E1',
    textAlign: 'center',
  },

  centerPileCol: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  stackBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#991B1B',
    borderWidth: 1.5,
    borderColor: '#FACC15',
    alignItems: 'center',
  },
  stackBadgeMain: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FEF08A',
  },
  stackBadgeSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FECACA',
  },
  rouletteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#701A75',
    borderWidth: 1.5,
    borderColor: '#F5D0FE',
  },
  rouletteBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FDF4FF',
  },
  discardHaloWrap: {
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
  },
  activeColorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 99,
    borderWidth: 1,
  },
  colorDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeColorTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  quickActionsCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  catchUnoBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#BE123C',
    borderWidth: 2,
    borderColor: '#FDE047',
    minWidth: 86,
  },
  catchUnoTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FEF08A',
  },
  catchUnoSub: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFE4E6',
  },
  shoutUnoBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: '#D97706',
    borderWidth: 2,
    borderColor: '#FEF08A',
    minWidth: 86,
  },
  shoutUnoTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFBEB',
  },
  shoutUnoSub: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FEF3C7',
  },
  unoSafeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 78, 59, 0.88)',
    borderWidth: 1,
    borderColor: '#34D399',
  },
  unoSafeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A7F3D0',
  },
  passTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 13,
    backgroundColor: '#334155',
    borderWidth: 1.5,
    borderColor: '#94A3B8',
  },
  passTurnText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  turnSpotlightBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    maxWidth: 98,
  },
  turnSpotlightLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  turnSpotlightName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F8FAFC',
    textAlign: 'center',
    marginTop: 2,
  },

  // --- Khay Bài Người Chơi (Bottom Pinned Hand Dock) ---
  handDock: {
    flexShrink: 0,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.86)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    gap: 2,
  },
  handDockMyTurn: {
    borderColor: 'rgba(250, 204, 21, 0.7)',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
  },
  handHeader: {
    gap: 2,
    paddingHorizontal: 2,
  },
  handTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  handTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  mercyMeterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    maxWidth: 170,
  },
  mercyMeterTrack: {
    flex: 1,
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  mercyMeterFill: {
    height: '100%',
    borderRadius: 99,
  },
  mercyMeterTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
  },
  handHintText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#CBD5E1',
  },
  handScroll: {
    flexGrow: 0,
  },
  handScrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    paddingTop: 14,
    paddingBottom: 3,
    paddingHorizontal: 4,
  },
  handCardSlot: {
    transform: [{ translateY: 0 }],
  },
  handCardPlayableLift: {
    transform: [{ translateY: -10 }],
  },
  emptyHandBox: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHandText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
  },

  // --- Vector UNO Card ---
  cardOuter: {
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardCornerTop: {
    position: 'absolute',
    top: 3,
    left: 5,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    zIndex: 3,
  },
  cardCornerBottom: {
    position: 'absolute',
    bottom: 3,
    right: 5,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    transform: [{ rotate: '180deg' }],
    zIndex: 3,
  },
  cardOval: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    transform: [{ rotate: '-18deg' }],
    overflow: 'hidden',
  },
  wildQuadWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.42,
  },
  wildQuad: {
    position: 'absolute',
    width: '50%',
    height: '50%',
  },
  cardCenterContent: {
    transform: [{ rotate: '18deg' }],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  cardCenterSymbol: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  cardMicroTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardMicroTagText: {
    fontWeight: '900',
    letterSpacing: -0.2,
  },

  // --- Modals ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 22,
    backgroundColor: '#0F172A',
    borderWidth: 1.5,
    borderColor: 'rgba(250, 204, 21, 0.45)',
    padding: 16,
    gap: 12,
  },
  modalTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  modalDesc: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChoiceBtn: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  colorChoiceInner: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  colorChoiceName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  colorChoiceCount: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
  },

  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
  swapRowJuicy: {
    backgroundColor: 'rgba(120, 53, 15, 0.55)',
    borderColor: '#FACC15',
  },
  swapRowName: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  swapRowHint: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  swapCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  swapCountText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FEF08A',
  },

  logRow: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: C.mist,
  },
  logText: {
    fontSize: 12.5,
    color: C.ink,
    fontWeight: '600',
  },
  ruleCard: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: C.mist,
    gap: 3,
  },
  ruleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
  },
  ruleBody: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 17,
  },
});
