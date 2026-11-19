import { memo, useCallback, useMemo, useState } from 'react';
import {
  Animated,
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
import { C, FONT, sticker } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { UiIcon, type UiIconName } from '../components/Icons';
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

const COLOR_PICK_BG: Record<UnoColor, string> = {
  red: '#DC2626',
  blue: '#2563EB',
  green: '#15803D',
  yellow: '#B45309',
};

const BANNER_THEME: Record<
  UnoMercyEffectBanner['kind'],
  { accent: string; tint: string; icon: UiIconName }
> = {
  mercy_ko: { accent: '#F87171', tint: 'rgba(185, 28, 28, 0.20)', icon: 'Skull' },
  stack: { accent: '#FB923C', tint: 'rgba(180, 83, 9, 0.22)', icon: 'Flame' },
  swap_7: { accent: '#FACC15', tint: 'rgba(180, 83, 9, 0.20)', icon: 'RefreshCw' },
  rotate_0: { accent: '#38BDF8', tint: 'rgba(14, 116, 144, 0.22)', icon: 'RotateCcw' },
  discard_all: { accent: '#4ADE80', tint: 'rgba(21, 128, 61, 0.20)', icon: 'Layers' },
  skip_all: { accent: '#93C5FD', tint: 'rgba(37, 99, 235, 0.20)', icon: 'Zap' },
  roulette: { accent: '#FDE047', tint: 'rgba(180, 83, 9, 0.22)', icon: 'Dices' },
  uno_catch: { accent: '#FCA5A5', tint: 'rgba(159, 43, 54, 0.24)', icon: 'AlertTriangle' },
};

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  not_your_turn: 'Chưa tới lượt đánh của bạn',
  illegal_move: 'Lá bài này không hợp lệ với màu/số hoặc chồng bài phạt hiện tại',
  bad_action: 'Thao tác chưa hợp lệ lúc này',
};

function errOf(reason: ActionError): string {
  return EXTRA_ERRORS[reason] ?? actionText[reason] ?? 'Thao tác chưa hợp lệ';
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
      return '≡';
    case 'draw2':
      return '+2';
    case 'draw4':
      return '+4';
    case 'wild_roulette':
      return '◎';
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
      return 'Xoay bàn';
    case '7':
      return 'Đổi bài';
    case 'skip':
      return 'Cấm';
    case 'reverse':
      return 'Đảo';
    case 'skip_all':
      return 'Bỏ hết';
    case 'discard_all':
      return 'Xả màu';
    case 'draw2':
      return 'Rút +2';
    case 'draw4':
      return 'Rút +4';
    case 'wild_roulette':
      return 'Quay màu';
    case 'wild_reverse_draw4':
      return 'Đảo +4';
    case 'wild_draw6':
      return 'Siêu +6';
    case 'wild_draw10':
      return 'Hủy +10';
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
          ? ({ boxShadow: '0 8px 16px rgba(0,0,0,0.45)' } as object)
          : Platform.OS === 'web'
            ? ({ boxShadow: '0 4px 10px rgba(0,0,0,0.34)' } as object)
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

  let badgeBg = C.darkSubtle;
  let badgeBorder = C.darkBorder;
  let badgeText = `${count} lá`;
  let badgeColor = C.darkText;

  if (elim) {
    badgeBg = 'rgba(185, 28, 28, 0.35)';
    badgeBorder = '#F87171';
    badgeText = elim.reason === 'mercy_25' ? `Cháy ${elim.peakCards}` : 'Đã rời';
    badgeColor = '#FECACA';
  } else if (unoVulnerable) {
    badgeBg = '#9F2B36';
    badgeBorder = '#FACC15';
    badgeText = 'Quên UNO';
    badgeColor = '#FEF3C7';
  } else if (isOne || unoSafe) {
    badgeBg = C.goldDeep;
    badgeBorder = '#FACC15';
    badgeText = 'UNO (1)';
    badgeColor = '#FEF9C3';
  } else if (nearMercy) {
    badgeBg = '#991B1B';
    badgeBorder = '#FCA5A5';
    badgeText = `${count}/${UNO_MERCY_LIMIT}`;
    badgeColor = '#FEE2E2';
  } else if (warnMercy) {
    badgeBg = '#9A3412';
    badgeBorder = '#FDBA74';
    badgeText = `${count}/${UNO_MERCY_LIMIT}`;
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

  let statusHint = `Đang chờ lượt của ${activeName}`;
  if (!amParticipant) {
    statusHint = 'Bạn đang theo dõi bàn UNO No Mercy';
  } else if (myElim) {
    statusHint = `Bạn đã nổ bài (${myElim.peakCards} lá) — chờ xem ai sống sót cuối cùng`;
  } else if (isMyTurn && view.phase === 'choose_swap') {
    statusHint = 'Chọn 1 đối thủ để đổi toàn bộ bài trên tay';
  } else if (isMyTurn && view.roulettePending) {
    statusHint = `Vòng quay tử thần — chạm Nọc bài để bốc tới khi trúng màu ${activeMeta.name}`;
  } else if (isMyTurn && view.drawStack > 0) {
    statusHint =
      playableIds.size > 0
        ? `Chọn lá ≥ +${view.drawMinValue} để chồng tiếp, hoặc chạm Nọc nhận +${view.drawStack} lá`
        : `Hết bài đỡ — chạm Nọc bài để nhận +${view.drawStack} lá phạt`;
  } else if (isMyTurn && view.drewThisTurn) {
    statusHint = 'Chạm lá sáng viền để đánh ngay, hoặc chọn Qua lượt';
  } else if (isMyTurn) {
    statusHint =
      playableIds.size > 0
        ? 'Tới lượt bạn — chạm lá sáng viền để đánh'
        : 'Không có lá hợp lệ — chạm Nọc bài để bốc';
  }

  const canTapDeck = isMyTurn && view.phase === 'playing' && !view.drewThisTurn && !busy;
  const deckUrgent = canTapDeck && (view.roulettePending || playableIds.size === 0);

  let deckLabel = `Nọc: ${view.deckCount}`;
  let deckSub = canTapDeck ? '+ Rút 1 lá' : 'Chồng bốc';
  if (isMyTurn && view.roulettePending) {
    deckLabel = 'Quay màu';
    deckSub = `Ra ${activeMeta.name}`;
  } else if (isMyTurn && view.drawStack > 0 && !view.drewThisTurn) {
    deckLabel = `Nhận +${view.drawStack}`;
    deckSub = playableIds.size > 0 ? 'Hoặc chồng bài' : 'Bắt buộc rút';
  } else if (isMyTurn && playableIds.size === 0 && !view.drewThisTurn) {
    deckLabel = 'Bốc bài';
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
              color={view.direction === 1 ? '#7DD3FC' : '#FDE047'}
              strokeWidth={1.75}
            />
            <T style={styles.dirPillText}>
              {view.direction === 1 ? 'Chiều thuận' : 'Chiều ngược'}
            </T>
          </View>

          <View style={[styles.colorIndicatorPill, { borderColor: activeMeta.border }]}>
            <View style={[styles.colorDot, { backgroundColor: activeMeta.hex }]} />
            <T numberOfLines={1} style={styles.colorIndicatorText}>
              {activeMeta.name}
            </T>
          </View>

          <View style={[styles.timerPill, secLeft <= 5 && styles.timerPillUrgent]}>
            <UiIcon name="Timer" size={12} color={secLeft <= 5 ? '#FCA5A5' : '#FDE047'} strokeWidth={1.75} />
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
            <UiIcon name="History" size={14} color={C.darkText} strokeWidth={1.65} />
          </Pressable>

          <Pressable
            testID="um-rules-open"
            accessibilityRole="button"
            accessibilityLabel="Luật UNO No Mercy"
            onPress={() => {
              play('pop');
              setRulesOpen(true);
            }}
            style={styles.miniToolBtn}
          >
            <UiIcon name="HelpCircle" size={14} color={C.gold} strokeWidth={1.65} />
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
              style={[styles.miniToolBtn, { borderColor: 'rgba(248, 113, 113, 0.35)' }]}
            >
              <UiIcon name="X" size={14} color="#FCA5A5" strokeWidth={1.65} />
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

      {/* 2. Bảng Thông Báo Sự Kiện Trên Bàn */}
      {view.lastBanner && bannerTheme ? (
        <Animated.View style={{ transform: [{ scale: bannerAnim }] }}>
          <View
            style={[
              styles.shockBanner,
              { backgroundColor: C.darkSurface, borderColor: C.darkBorder, borderLeftColor: bannerTheme.accent },
            ]}
          >
            <View style={[styles.shockIconBox, { backgroundColor: bannerTheme.tint }]}>
              <UiIcon name={bannerTheme.icon} size={compact ? 15 : 17} color={bannerTheme.accent} strokeWidth={1.75} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T numberOfLines={1} style={[styles.shockHeadline, compact && { fontSize: 12 }]}>
                {view.lastBanner.headline.replace(/!+$/g, '')}
              </T>
              {view.lastBanner.subtext ? (
                <T numberOfLines={1} style={[styles.shockSubtext, { color: bannerTheme.accent }]}>
                  {view.lastBanner.subtext.replace(/!+$/g, '')}
                </T>
              ) : null}
            </View>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.idleTicker}>
          <T numberOfLines={1} style={styles.idleTickerText}>
            {view.log.at(-1)?.text ?? 'UNO No Mercy — Chồng bài không giới hạn, 25 lá bị loại'}
          </T>
        </View>
      )}

      {/* 3. Sới Bài Trung Tâm */}
      <View style={[styles.feltArena, { borderColor: C.darkBorder }]}>
        <View
          pointerEvents="none"
          style={[
            styles.arenaColorHalo,
            {
              borderColor: activeMeta.hex + '44',
              backgroundColor: activeMeta.hex + '12',
            },
          ]}
        />

        <View style={styles.tableColumns}>
          {/* Cột Trái: Nọc Bài */}
          <View style={styles.deckCol}>
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
              <View style={[styles.deckShadowCard, { top: 4, left: 5 }]} />
              <View style={[styles.deckShadowCard, { top: 2, left: 2.5 }]} />
              <View
                style={[
                  styles.deckTopFace,
                  isMyTurn && view.roulettePending && { backgroundColor: '#2A1635', borderColor: C.gold },
                  isMyTurn && view.drawStack > 0 && { backgroundColor: '#3B1219', borderColor: '#F87171' },
                  canTapDeck && styles.deckTopInteractive,
                  deckUrgent && styles.deckTopUrgent,
                ]}
              >
                <View style={styles.deckCrest}>
                  <T style={styles.deckCrestTitle}>No Mercy</T>
                </View>
                <T numberOfLines={2} style={[styles.deckMainLabel, compact && { fontSize: 10.5 }]}>
                  {deckLabel}
                </T>
                <T numberOfLines={1} style={styles.deckSubLabel}>
                  {deckSub}
                </T>
              </View>
            </Pressable>
          </View>

          {/* Cột Giữa: Lá Trên Đỉnh + Vòng Màu Hiệu Lực + Huy Hiệu Chồng Phạt */}
          <View style={styles.centerPileCol}>
            {view.drawStack > 0 && (
              <View testID="um-stack-badge" style={styles.stackBadge}>
                <T style={styles.stackBadgeMain}>Chồng phạt +{view.drawStack}</T>
                <T style={styles.stackBadgeSub}>Đỡ bằng ≥ +{view.drawMinValue}</T>
              </View>
            )}

            {view.roulettePending && (
              <View testID="um-roulette-badge" style={styles.rouletteBadge}>
                <T style={styles.rouletteBadgeText}>
                  Vòng quay: {activeMeta.name}
                </T>
              </View>
            )}

            <View
              style={[
                styles.discardHaloWrap,
                {
                  borderColor: activeMeta.hex,
                  backgroundColor: activeMeta.hex + '1C',
                },
                Platform.OS === 'web'
                  ? ({ boxShadow: '0 8px 20px rgba(0, 0, 0, 0.35)' } as object)
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
              <Pressable
                testID="um-catch-uno"
                accessibilityRole="button"
                onPress={handleCatchUnoPress}
                style={({ pressed }) => [styles.catchUnoBtn, pressed && { opacity: 0.88 }]}
              >
                <UiIcon name="AlertTriangle" size={16} color="#FEF2F2" strokeWidth={1.75} />
                <T style={styles.catchUnoTitle}>Bắt UNO</T>
                <T numberOfLines={1} style={styles.catchUnoSub}>
                  {(view.names[catchTargetId] ?? 'Đối thủ').slice(0, 8)} (+2 lá)
                </T>
              </Pressable>
            )}

            {showShoutUno && (
              <Pressable
                testID="um-shout-uno"
                accessibilityRole="button"
                onPress={handleShoutUnoPress}
                style={({ pressed }) => [styles.shoutUnoBtn, pressed && { opacity: 0.88 }]}
              >
                <UiIcon name="Megaphone" size={16} color="#FFFBEB" strokeWidth={1.75} />
                <T style={styles.shoutUnoTitle}>Hô UNO</T>
                <T style={styles.shoutUnoSub}>Bấm kẻo phạt +2</T>
              </Pressable>
            )}

            {amAlive && amUnoSafe && myCount <= 2 && (
              <View style={styles.unoSafeBadge}>
                <UiIcon name="Shield" size={13} color="#4ADE80" strokeWidth={1.75} />
                <T style={styles.unoSafeText}>Đã hô UNO</T>
              </View>
            )}

            {isMyTurn && view.drewThisTurn && (
              <Pressable
                testID="um-pass-btn"
                accessibilityRole="button"
                onPress={handlePassPress}
                style={({ pressed }) => [styles.passTurnBtn, pressed && { opacity: 0.88 }]}
              >
                <UiIcon name="ChevronRight" size={15} color={C.darkText} strokeWidth={1.75} />
                <T style={styles.passTurnText}>Qua lượt</T>
              </Pressable>
            )}

            {!catchTargetId && !showShoutUno && !(amAlive && amUnoSafe && myCount <= 2) && !(isMyTurn && view.drewThisTurn) && (
              <View style={styles.turnSpotlightBox}>
                <T style={styles.turnSpotlightLabel}>Lượt hiện tại</T>
                <T numberOfLines={2} style={[styles.turnSpotlightName, isMyTurn && { color: '#4ADE80' }]}>
                  {isMyTurn ? 'Đến lượt bạn' : activeName}
                </T>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 4. Khay Bài Của Bạn + Thanh Đo Nổ Bài */}
      <View style={[styles.handDock, isMyTurn && styles.handDockMyTurn]}>
        <View style={styles.handHeader}>
          <View style={styles.handTitleRow}>
            <T style={styles.handTitleText}>
              {myElim
                ? `Đã nổ bài (${myElim.peakCards} lá)`
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
                  {myCount >= 21 ? 'Sắp nổ' : myCount >= 16 ? 'Nguy hiểm' : 'An toàn'}
                </T>
              </View>
            )}
          </View>
          <T numberOfLines={1} style={[styles.handHintText, isMyTurn && { color: C.goldSoft }]}>
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
                ? `Quá mốc ${UNO_MERCY_LIMIT} lá — Bạn vẫn có thể bấm Bắt UNO nếu có người quên hô`
                : 'Đang chờ chia bài…'}
            </T>
          </View>
        )}
      </View>

      {/* ================= MODAL 1: Chọn Màu Cho Lá Wild ================= */}
      {pendingWild && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPendingWild(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, sticker(3)]}>
              <View style={styles.modalTopRow}>
                <UnoCardFace card={pendingWild} variant="mini" playable />
                <View style={{ flex: 1, gap: 4 }}>
                  <T style={styles.modalTitle}>{getUnoCardLabel(pendingWild.kind).title}</T>
                  <T style={styles.modalDesc}>
                    {pendingWild.kind === 'wild_roulette'
                      ? 'Chọn màu tử thần — người kế tiếp phải bốc liên tục tới khi ra màu này'
                      : 'Chọn màu hiệu lực tiếp theo cho bàn đấu'}
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
                        { backgroundColor: COLOR_PICK_BG[col] },
                        pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <T style={styles.colorChoiceName}>{meta.name}</T>
                      <T style={styles.colorChoiceCount}>Trên tay: {cnt} lá</T>
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
            <View style={[styles.modalCard, sticker(3)]}>
              <View style={styles.modalHeaderLine}>
                <View style={styles.modalIconRing}>
                  <UiIcon name="RefreshCw" size={18} color={C.goldDeep} strokeWidth={1.65} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T style={styles.modalTitle}>Số 7 · Đổi toàn bộ bài</T>
                  <T style={styles.modalDesc}>
                    Chọn 1 đối thủ để đổi toàn bộ {myCount} lá của bạn lấy bài của họ
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
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      {opp.player && <Portrait p={opp.player} size={36} border={1.5} />}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T numberOfLines={1} style={styles.swapRowName}>
                          {opp.name}
                        </T>
                        <T style={[styles.swapRowHint, juicy && { color: C.goldDeep }, risky && { color: C.danger }]}>
                          {opp.count === 1
                            ? 'Chỉ còn 1 lá UNO — đổi ngay'
                            : juicy
                              ? 'Rất ít bài — nên đổi'
                              : risky
                                ? 'Đang ôm nhiều bài, coi chừng nổ'
                                : 'Đổi toàn bộ bài trên tay'}
                        </T>
                      </View>
                      <View style={[styles.swapCountBadge, juicy && styles.swapCountBadgeJuicy]}>
                        <T style={[styles.swapCountText, juicy && { color: C.goldDeep }]}>{opp.count} lá</T>
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
        <Sheet title="Diễn biến bàn đấu" onClose={() => setLogOpen(false)}>
          <View style={{ gap: 6 }}>
            {[...view.log].reverse().map((entry) => (
              <View key={entry.id} style={styles.logRow}>
                <T style={styles.logText}>{entry.text}</T>
              </View>
            ))}
          </View>
        </Sheet>
      )}

      {/* ================= SHEET: Sổ Tay Luật UNO No Mercy ================= */}
      {rulesOpen && (
        <Sheet title="Luật UNO No Mercy" onClose={() => setRulesOpen(false)}>
          <View style={{ gap: 10 }}>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>Luật Nổ bài (từ {UNO_MERCY_LIMIT} lá)</T>
              <T style={styles.ruleBody}>
                Ai cầm từ {UNO_MERCY_LIMIT} lá trở lên trên tay ở bất kỳ thời điểm nào sẽ nổ bài và bị loại khỏi ván.
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>Cộng dồn lá rút (+2, +4, +6, +10)</T>
              <T style={styles.ruleBody}>
                Khi bị tấn công bằng lá rút phạt, bạn được phép chồng tiếp bất kỳ lá rút phạt nào có giá trị lớn hơn hoặc bằng lá vừa đánh (+2 lên +2/+4/+6/+10; +6 lên +6/+10).
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>Luật Số 7 và Số 0</T>
              <T style={styles.ruleBody}>
                Đánh lá Số 7: chọn 1 người bất kỳ để tráo toàn bộ bài trên tay.{'\n'}
                Đánh lá Số 0: tất cả mọi người chuyển bài cho người kế tiếp theo chiều đánh.
              </T>
            </View>
            <View style={styles.ruleCard}>
              <T style={styles.ruleTitle}>Các lá hành động đặc biệt</T>
              <T style={styles.ruleBody}>
                Xả cùng màu: đánh 1 lá, xả sạch mọi lá cùng màu đó trên tay.{'\n'}
                Bỏ tất cả: bỏ lượt cả bàn, bạn được đánh tiếp ngay 1 lượt.{'\n'}
                Vòng quay tử thần: chỉ định 1 màu; người kế tiếp phải bốc liên tục tới khi ra lá màu đó.
              </T>
            </View>
          </View>
        </Sheet>
      )}

      {/* ================= SHEET: Chủ Phòng Kết Thúc Sớm ================= */}
      {confirmEnd && (
        <Sheet title="Kết thúc ván sớm" onClose={() => setConfirmEnd(false)}>
          <T style={{ color: C.secondary, fontSize: 13.5, lineHeight: 19 }}>
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
    gap: 6,
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
    gap: 6,
    paddingHorizontal: 4,
  },
  dirPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  dirPillRev: {
    borderColor: 'rgba(250, 204, 21, 0.35)',
    backgroundColor: C.darkSubtle,
  },
  dirPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
  },
  colorIndicatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colorIndicatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkText,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(185, 28, 28, 0.36)',
    borderColor: '#F87171',
  },
  timerPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.gold,
    fontVariant: ['tabular-nums'],
  },
  miniToolBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
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
    borderRadius: 12,
    minWidth: 74,
    maxWidth: 92,
    backgroundColor: 'rgba(26, 30, 40, 0.88)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    gap: 3,
    overflow: 'hidden',
  },
  oppCardCompact: {
    minWidth: 68,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  oppNameText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkText,
    maxWidth: '100%',
    textAlign: 'center',
  },
  oppCardActive: {
    backgroundColor: 'rgba(21, 128, 61, 0.28)',
    borderColor: '#4ADE80',
  },
  oppCardDanger: {
    borderColor: C.danger,
    backgroundColor: 'rgba(127, 29, 29, 0.34)',
  },
  oppCardElim: {
    opacity: 0.65,
    backgroundColor: 'rgba(17, 20, 28, 0.72)',
  },
  oppCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  oppCountText: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // --- Shock Banner ---
  shockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    flexShrink: 0,
  },
  shockIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shockHeadline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.darkText,
  },
  shockSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  idleTicker: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(26, 30, 40, 0.85)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    flexShrink: 0,
  },
  idleTickerText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.darkMuted,
    textAlign: 'center',
  },

  // --- Felt Arena Trung Tâm ---
  feltArena: {
    flex: 1,
    minHeight: 156,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#131922',
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  arenaColorHalo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    borderWidth: 1,
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
    borderRadius: 12,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: 'rgba(251, 249, 245, 0.22)',
  },
  deckTopFace: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(251, 249, 245, 0.30)',
    backgroundColor: C.darkSurface,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckTopInteractive: {
    borderColor: '#93C5FD',
  },
  deckTopUrgent: {
    borderColor: C.gold,
    borderWidth: 2,
  },
  deckCrest: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: C.son,
    borderWidth: 1,
    borderColor: 'rgba(254, 243, 199, 0.5)',
  },
  deckCrestTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: C.goldSoft,
  },
  deckMainLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.darkText,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  deckSubLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: C.darkMuted,
    textAlign: 'center',
  },

  centerPileCol: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stackBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.danger,
    borderWidth: 1,
    borderColor: 'rgba(254, 243, 199, 0.45)',
    alignItems: 'center',
  },
  stackBadgeMain: {
    fontSize: 11,
    fontWeight: '600',
    color: C.goldSoft,
    fontVariant: ['tabular-nums'],
  },
  stackBadgeSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#FECACA',
    fontVariant: ['tabular-nums'],
  },
  rouletteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.gold,
  },
  rouletteBadgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.goldSoft,
  },
  discardHaloWrap: {
    padding: 4,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  activeColorTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  colorDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeColorTagText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  quickActionsCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  catchUnoBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.danger,
    borderWidth: 1,
    borderColor: 'rgba(254, 243, 199, 0.5)',
    minWidth: 88,
    gap: 2,
  },
  catchUnoTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  catchUnoSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: '#FFE4E6',
    fontVariant: ['tabular-nums'],
  },
  shoutUnoBtn: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: C.goldDeep,
    borderWidth: 1,
    borderColor: 'rgba(254, 243, 199, 0.5)',
    minWidth: 88,
    gap: 2,
  },
  shoutUnoTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  shoutUnoSub: {
    fontSize: 9.5,
    fontWeight: '500',
    color: C.goldSoft,
    fontVariant: ['tabular-nums'],
  },
  unoSafeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(21, 128, 61, 0.25)',
    borderWidth: 1,
    borderColor: '#4ADE80',
  },
  unoSafeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#A7F3D0',
  },
  passTurnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  passTurnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.darkText,
  },
  turnSpotlightBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
    maxWidth: 100,
  },
  turnSpotlightLabel: {
    fontSize: 9.5,
    fontWeight: '500',
    color: C.darkMuted,
  },
  turnSpotlightName: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.darkText,
    textAlign: 'center',
    marginTop: 2,
  },

  // --- Khay Bài Người Chơi (Bottom Pinned Hand Dock) ---
  handDock: {
    flexShrink: 0,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    backgroundColor: 'rgba(26, 30, 40, 0.94)',
    borderWidth: 1,
    borderColor: C.darkBorder,
    gap: 4,
  },
  handDockMyTurn: {
    borderColor: 'rgba(245, 158, 11, 0.55)',
    backgroundColor: C.darkBg,
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
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
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
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    overflow: 'hidden',
  },
  mercyMeterFill: {
    height: '100%',
    borderRadius: 3,
  },
  mercyMeterTag: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkMuted,
  },
  handHintText: {
    fontSize: 11,
    fontWeight: '500',
    color: C.darkMuted,
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
    fontWeight: '500',
    color: C.darkMuted,
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
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    zIndex: 3,
  },
  cardCornerBottom: {
    position: 'absolute',
    bottom: 3,
    right: 5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
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
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cardMicroTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  cardMicroTagText: {
    fontWeight: '600',
  },

  // --- Modals (Warm Paper & Ink) ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 25, 23, 0.54)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    backgroundColor: C.paper,
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
  modalIconRing: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: C.ink,
    fontFamily: FONT,
  },
  modalDesc: {
    fontSize: 12.5,
    color: C.secondary,
    lineHeight: 17,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChoiceBtn: {
    width: '48%',
    flexGrow: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(31, 27, 22, 0.14)',
  },
  colorChoiceName: {
    fontSize: 14.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  colorChoiceCount: {
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.92)',
    fontVariant: ['tabular-nums'],
  },

  swapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  swapRowJuicy: {
    backgroundColor: C.goldSoft,
    borderColor: 'rgba(180, 83, 9, 0.30)',
  },
  swapRowName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  swapRowHint: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.secondary,
  },
  swapCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  swapCountBadgeJuicy: {
    borderColor: 'rgba(180, 83, 9, 0.35)',
  },
  swapCountText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.ink,
    fontVariant: ['tabular-nums'],
  },

  logRow: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  logText: {
    fontSize: 12.5,
    color: C.ink,
    fontWeight: '500',
  },
  ruleCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    gap: 4,
  },
  ruleTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    color: C.ink,
  },
  ruleBody: {
    fontSize: 12.5,
    color: C.secondary,
    lineHeight: 18,
  },
});
