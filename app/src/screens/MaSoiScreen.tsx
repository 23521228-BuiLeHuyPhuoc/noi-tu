import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  MASOI_ROLES,
  type MaSoiLogItem,
  type MaSoiPhase,
  type MaSoiRole,
  type MaSoiView,
} from '../../../shared/src/masoi';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { useOnChange, useSecondsLeft, useStableWindow } from '../hooks';
import { C, FONT } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { KeyboardLift } from '../components/KeyboardLift';
import { Portrait } from '../components/Avatar';
import { GameIcon, UiIcon } from '../components/Icons';

const ROLE_GAME_ICON: Record<MaSoiRole, string> = {
  soi: 'wolf-head',
  tientri: 'crystal-ball',
  baove: 'shield',
  phuthuy: 'magic-potion',
  thosan: 'archer',
  cupid: 'pierced-heart',
  kengo: 'jester-hat',
  thamtu: 'carnival-mask',
  dan: 'farmer',
};

type SuspectMark = 'none' | 'wolf' | 'trust' | 'jester';
const NEXT_MARK: Record<SuspectMark, SuspectMark> = {
  none: 'wolf',
  wolf: 'trust',
  trust: 'jester',
  jester: 'none',
};

const NIGHT_PHASES = new Set<MaSoiPhase>([
  'role_reveal',
  'night_cupid',
  'night_active',
  'night_witch',
]);

function fmtShortTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type UnifiedFeedItem =
  | {
      key: string;
      kind: 'log';
      at: number;
      log: MaSoiLogItem;
    }
  | {
      key: string;
      kind: 'chat';
      at: number;
      id: number;
      from: string;
      name: string;
      text: string;
      isSticker: boolean;
      stickerId?: string;
    };

const MaSoiChatInputBar = memo(function MaSoiChatInputBar({
  inputTestID,
  sendTestID,
  placeholder,
  placeholderTextColor,
  maxLength,
  wolf = false,
  day = false,
  onSend,
}: {
  inputTestID: string;
  sendTestID: string;
  placeholder: string;
  placeholderTextColor: string;
  maxLength: number;
  wolf?: boolean;
  day?: boolean;
  onSend: (clean: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const submit = async () => {
    const clean = text.trim();
    if (!clean) return;
    setText('');
    await onSend(clean);
  };
  return (
    <KeyboardLift>
      <View style={styles.pinnedInputRow}>
        <TextInput
          testID={inputTestID}
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => void submit()}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          maxLength={maxLength}
          returnKeyType="send"
          blurOnSubmit={false}
          style={[styles.chatInput, day && !wolf && styles.chatInputDay, wolf && styles.chatInputWolf]}
        />
        <Pressable
          testID={sendTestID}
          onPress={() => void submit()}
          style={[styles.sendBtn, day && !wolf && styles.sendBtnDay, wolf && { backgroundColor: C.danger }]}
        >
          <UiIcon name="Send" size={14} color={wolf ? '#FFFFFF' : day ? C.paper : C.darkBg} />
        </Pressable>
      </View>
    </KeyboardLift>
  );
});

export function MaSoiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as MaSoiView;
  const me = game.me ?? '';
  const { width, height } = useStableWindow();
  const wide = width >= 900 && height >= 540;
  const compactMobile = height < 720;

  const [roleHidden, setRoleHidden] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedTwo, setPickedTwo] = useState<string[]>([]);
  const [witchSave, setWitchSave] = useState(false);
  const [witchPoison, setWitchPoison] = useState<string | null>(null);
  const [lastFocusSeatId, setLastFocusSeatId] = useState<string | null>(null);

  const [commsTab, setCommsTab] = useState<'village' | 'wolf' | 'role'>('village');
  const [suspectMarks, setSuspectMarks] = useState<Record<string, SuspectMark>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const feedScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);
  const wolfScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);

  const myRole = view.myRole;
  const roleMeta = myRole ? MASOI_ROLES[myRole] : null;
  const isNight = NIGHT_PHASES.has(view.phase);

  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const iAlive = aliveSet.has(me);
  const deadMap = useMemo(() => new Map(view.dead.map((d) => [d.id, d])), [view.dead]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const seatNumber = useMemo(() => {
    const m = new Map<string, number>();
    view.order.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [view.order]);

  const seerBadgeMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const h of view.seerHistory ?? []) {
      m.set(h.targetId, h.isWolf);
    }
    return m;
  }, [view.seerHistory]);

  const revealedDeadRoleCounts = useMemo(() => {
    const c: Partial<Record<MaSoiRole, number>> = {};
    for (const d of view.dead) {
      if (d.revealedRole) c[d.revealedRole] = (c[d.revealedRole] ?? 0) + 1;
    }
    return c;
  }, [view.dead]);

  // Live 1s countdown ticker for compact Wolvesville header
  const secLeft = useSecondsLeft(view.phaseEndsAt, game.clockOffset ?? 0, view.phaseSeconds);
  const timerRatio = view.phaseSeconds > 0 ? Math.min(1, secLeft / view.phaseSeconds) : 0;

  // Reset transient selections & auto-channel switch for Wolves between Night and Day
  useOnChange(view.phase, (ph) => {
    setErr(null);
    setSelected(null);
    setPickedTwo([]);
    setWitchSave(false);
    setWitchPoison(null);
    play('pop');

    const nightNow = NIGHT_PHASES.has(ph);
    if (myRole === 'soi' && iAlive) {
      if (ph === 'night_active') {
        setCommsTab('wolf');
      } else if (!nightNow) {
        setCommsTab((prev) => (prev === 'wolf' ? 'village' : prev));
      }
    } else if (!nightNow && commsTab === 'wolf') {
      setCommsTab('village');
    }
  });

  // Merge server-stamped publicLog banners chronologically with village chat (rejoin-safe)
  const unifiedVillageFeed = useMemo<UnifiedFeedItem[]>(() => {
    const items: UnifiedFeedItem[] = [];
    for (let i = 0; i < view.publicLog.length; i++) {
      const log = view.publicLog[i];
      items.push({
        key: `log-${log.id}`,
        kind: 'log',
        at: log.at ?? i,
        log,
      });
    }
    for (const m of game.chat) {
      items.push({
        key: `chat-${m.id}`,
        kind: 'chat',
        at: m.at,
        id: m.id,
        from: m.from,
        name: m.name,
        text: m.text ?? '',
        isSticker: m.kind === 'sticker',
        stickerId: m.stickerId,
      });
    }
    items.sort((a, b) => {
      if (a.at !== b.at) return a.at - b.at;
      if (a.kind === 'log' && b.kind === 'log') return a.log.id - b.log.id;
      if (a.kind === 'chat' && b.kind === 'chat') return a.id - b.id;
      return a.kind === 'log' ? -1 : 1;
    });
    return items;
  }, [view.publicLog, game.chat]);

  // Auto-scroll active chat stream on new messages/events
  useEffect(() => {
    if (commsTab === 'village') {
      const t = setTimeout(() => feedScrollRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(t);
    }
  }, [unifiedVillageFeed.length, commsTab]);

  useEffect(() => {
    if (commsTab === 'wolf') {
      const t = setTimeout(() => wolfScrollRef.current?.scrollToEnd({ animated: true }), 60);
      return () => clearTimeout(t);
    }
  }, [view.wolfChat?.length, commsTab]);

  const dayTally = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const target of Object.values(view.dayVotes)) {
      if (target !== 'skip') counts[target] = (counts[target] ?? 0) + 1;
    }
    return counts;
  }, [view.dayVotes]);

  const wolfTally = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const target of Object.values(view.wolfVotes ?? {})) {
      counts[target] = (counts[target] ?? 0) + 1;
    }
    return counts;
  }, [view.wolfVotes]);

  const act = useCallback(
    async (payload: Parameters<Game['act']>[0], resetSelection = false) => {
      if (busy) return;
      setBusy(true);
      setErr(null);
      const res = await game.act(payload);
      setBusy(false);
      if (!res.ok) {
        play('error');
        setErr(actionText[res.reason] ?? 'Không thực hiện được');
      } else {
        play('stamp');
        if (resetSelection) {
          setSelected(null);
          setPickedTwo([]);
          setWitchSave(false);
          setWitchPoison(null);
        }
      }
    },
    [busy, game],
  );

  const toggleSuspect = (id: string) => {
    if (id === me) return;
    setSuspectMarks((prev) => {
      const cur = prev[id] ?? 'none';
      return { ...prev, [id]: NEXT_MARK[cur] };
    });
  };

  const needsTwo =
    iAlive &&
    ((view.phase === 'night_cupid' && myRole === 'cupid' && !view.myNightSubmitted) ||
      (view.phase === 'night_active' && myRole === 'thamtu' && !view.myNightSubmitted));

  // Direct Wolvesville Tap-on-Plot Interaction!
  const onPlotPress = (id: string) => {
    if (id !== me) setLastFocusSeatId(id);
    if (!aliveSet.has(id)) return;

    // 1. Hunter Revenge: immediate 1-tap shot on plot
    if (view.phase === 'hunter_shot' && view.hunterId === me) {
      if (id === me) return;
      void act({ type: 'ms_hunter', target: id }, true);
      return;
    }

    if (!iAlive) return;

    // 2. Day Voting: immediate Wolvesville 1-tap vote on plot (tap same again -> skip)
    if (view.phase === 'day_vote') {
      if (id === me) return;
      const myCurrentVote = view.dayVotes[me];
      const nextTarget = myCurrentVote === id ? 'skip' : id;
      void act({ type: 'ms_vote', target: nextTarget }, true);
      return;
    }

    // 3. Night — Wolf Pack: immediate 1-tap target selection / update (không cắn đồng bọn Sói)
    if (view.phase === 'night_active' && myRole === 'soi') {
      if (view.wolfPackIds?.includes(id)) {
        setErr('Không thể chọn đồng bọn Ma Sói làm mồi');
        return;
      }
      void act({ type: 'ms_night', target: id });
      return;
    }

    // 4. Night — Cupid / Detective: pick 2 plots
    if (needsTwo) {
      setPickedTwo((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
      setErr(null);
      return;
    }

    // 5. Night — Seer / Guard: tap once to lock sights, tap confirm pill (or tap same plot 2nd time) to fire!
    if (
      view.phase === 'night_active' &&
      (myRole === 'tientri' || myRole === 'baove') &&
      !view.myNightSubmitted
    ) {
      if (myRole === 'tientri' && id === me) return;
      if (myRole === 'baove' && id === view.guardLastId) {
        setErr('Không thể bảo vệ cùng 1 người 2 đêm liên tiếp');
        return;
      }
      setErr(null);
      if (selected === id) {
        void act({ type: 'ms_night', target: id }, true);
      } else {
        setSelected(id);
      }
      return;
    }

    // 6. Night — Witch: tap bitten victim to toggle Save, or tap another alive plot to toggle Poison!
    if (view.phase === 'night_witch' && myRole === 'phuthuy' && !view.myNightSubmitted) {
      const ws = view.witchState;
      setErr(null);
      if (ws?.victimId === id && ws.healLeft) {
        setWitchSave((v) => !v);
        return;
      }
      if (ws?.poisonLeft && id !== me) {
        setWitchPoison((prev) => (prev === id ? null : id));
        return;
      }
      return;
    }

    // 7. Discussion / Idle: cycle personal suspect mark on plot
    if (id !== me) {
      toggleSuspect(id);
    }
  };

  const canChatVillage = iAlive && !isNight;
  const canChatWolf = iAlive && myRole === 'soi' && !!view.wolfChat;

  const sendVillageChat = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !canChatVillage) return;
      await game.sendChat(clean);
    },
    [canChatVillage, game],
  );

  const sendWolfChat = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !canChatWolf) return;
      await act({ type: 'ms_wolfChat', text: clean });
    },
    [act, canChatWolf],
  );

  // Context-aware Quick Wolvesville Deduction Chips (auto-inserting #X)
  const quickDeductionChips = useMemo(() => {
    const focusNum = lastFocusSeatId ? seatNumber.get(lastFocusSeatId) : undefined;
    if (commsTab === 'wolf' && canChatWolf) {
      const chips: string[] = [];
      if (focusNum) chips.push(`Đêm nay cắn #${focusNum}`);
      chips.push('Ai giả Tiên Tri sáng mai nhảy ra?');
      chips.push('Chia phiếu ban ngày tránh lộ bầy');
      chips.push('Tìm Tiên Tri hoặc Bảo Vệ trước');
      return chips;
    }

    const chips: string[] = [];
    const lastSeer = view.seerHistory?.[view.seerHistory.length - 1];
    if (myRole === 'tientri' && lastSeer) {
      const sNum = seatNumber.get(lastSeer.targetId);
      if (sNum) {
        chips.push(
          lastSeer.isWolf
            ? `Tôi Tiên Tri, đêm qua soi #${sNum} là Sói`
            : `Tôi Tiên Tri, đã soi #${sNum} phe Dân`,
        );
      }
    }
    if (focusNum) {
      chips.push(`Nghi #${focusNum}`);
      chips.push(`Vote #${focusNum}`);
    }
    chips.push('Ai có thông tin gì không?');
    chips.push('Tôi dân thường');
    chips.push('Tiên tri lộ diện đi');
    chips.push('Vote bỏ qua lượt này?');
    return chips;
  }, [commsTab, canChatWolf, lastFocusSeatId, seatNumber, myRole, view.seerHistory]);

  // Concise Phase Header Label & Instruction
  const headerInstruction = useMemo(() => {
    if (err) return err;
    if (view.phase === 'hunter_shot') {
      return view.hunterId === me
        ? 'Chạm ô người chơi để bắn kéo theo'
        : `Thợ Săn #${seatNumber.get(view.hunterId ?? '') ?? '?'} đang ngắm bắn…`;
    }
    if (view.phase === 'day_vote') {
      const myV = view.dayVotes[me];
      if (!iAlive) return 'Làng đang bỏ phiếu treo cổ';
      if (myV === 'skip') return 'Đã bỏ phiếu trắng (chạm ô để đổi)';
      if (myV) return `Đã bầu #${seatNumber.get(myV)} (chạm ô khác để đổi)`;
      return 'Chạm vào ô người chơi để bỏ phiếu';
    }
    if (view.phase === 'day_discuss') {
      return 'Thảo luận bên dưới · Ghim nghi vấn trên ô';
    }
    if (view.phase === 'role_reveal') {
      return roleMeta
        ? `Bạn là ${roleMeta.name} (${roleMeta.teamLabel})`
        : 'Nhận vai trò bí mật trước khi đêm xuống';
    }
    if (view.phase === 'night_cupid') {
      return myRole === 'cupid' && iAlive && !view.myNightSubmitted
        ? 'Chạm chọn 2 ô cư dân để ghép đôi'
        : 'Thần Tình Yêu đang se duyên…';
    }
    if (view.phase === 'night_witch') {
      if (myRole === 'phuthuy' && iAlive && !view.myNightSubmitted) {
        const vNum = view.witchState?.victimId ? seatNumber.get(view.witchState.victimId) : null;
        if (!view.witchState?.healLeft) {
          return view.witchState?.poisonLeft
            ? 'Hết thuốc cứu · Chọn Độc hoặc Bỏ qua'
            : 'Hết bình phép · Bấm Bỏ qua để tiếp tục';
        }
        return vNum ? `#${vNum} bị Sói cắn · Cứu hoặc quăng Độc` : 'Đêm bình yên · Dùng Độc hoặc bỏ qua';
      }
      return 'Phù Thủy đang pha chế bình thuốc…';
    }
    // night_active
    if (!iAlive) return 'Bạn đã hy sinh · Theo dõi ván đấu';
    if (myRole === 'soi') {
      const cur = view.wolfVotes?.[me];
      return cur
        ? `Đang chọn cắn #${seatNumber.get(cur)} (chạm ô khác để đổi)`
        : 'Chạm mục tiêu để Sói cắn';
    }
    if (view.myNightSubmitted) return 'Đã xong kỹ năng đêm · Chờ trời sáng…';
    if (myRole === 'tientri') return 'Chạm 1 ô để Tiên Tri soi thân phận';
    if (myRole === 'baove') return 'Chạm 1 ô để giương khiên bảo vệ';
    if (myRole === 'thamtu') return 'Chạm 2 ô để điều tra cùng/khác phe';
    return 'Màn đêm buông xuống · Hãy giữ im lặng';
  }, [
    err,
    view.phase,
    view.hunterId,
    view.dayVotes,
    view.myNightSubmitted,
    view.witchState,
    view.wolfVotes,
    seatNumber,
    me,
    iAlive,
    roleMeta,
    myRole,
  ]);

  const deckEntries = useMemo(
    () => Object.entries(view.roleCounts) as [MaSoiRole, number][],
    [view.roleCounts],
  );

  const rowCount = Math.max(1, Math.ceil(view.order.length / 4));
  const avatarSize = compactMobile ? (rowCount >= 3 ? 31 : 35) : rowCount >= 3 ? 37 : 42;

  const readyCount = view.readySkip.length;
  const needReady = Math.max(1, Math.ceil(view.alive.length / 2));
  const myReady = view.readySkip.includes(me);

  // Render floating 1-line Night / Confirm Action Strip right under the 4-col grid when an action needs confirmation
  const renderGridActionStrip = () => {
    if (!iAlive) return null;

    if (
      view.phase === 'night_active' &&
      (myRole === 'tientri' || myRole === 'baove') &&
      !view.myNightSubmitted
    ) {
      const sNum = selected ? seatNumber.get(selected) : null;
      return (
        <View style={styles.actionStripNight}>
          <T numberOfLines={1} style={styles.actionStripTxt}>
            {selected
              ? `${myRole === 'tientri' ? 'Soi' : 'Bảo vệ'} #${sNum} ${view.names[selected]}?`
              : myRole === 'baove' && view.guardLastId
                ? `Chạm 1 ô (trừ #${seatNumber.get(view.guardLastId)} đêm trước)`
                : `Chạm 1 ô người chơi ở trên để ${myRole === 'tientri' ? 'soi' : 'bảo vệ'}`}
          </T>
          <Pressable
            testID="masoi-night-submit"
            disabled={!selected || busy}
            onPress={() => selected && void act({ type: 'ms_night', target: selected }, true)}
            style={[styles.confirmPill, (!selected || busy) && styles.confirmPillDisabled]}
          >
            <T style={styles.confirmPillTxt}>Xác nhận</T>
          </Pressable>
        </View>
      );
    }

    if (needsTwo) {
      const label = pickedTwo.map((id) => `#${seatNumber.get(id)}`).join(' & ');
      return (
        <View style={styles.actionStripNight}>
          <T numberOfLines={1} style={styles.actionStripTxt}>
            {myRole === 'cupid' ? 'Ghép đôi: ' : 'Điều tra: '}
            {label || 'Chạm chọn đủ 2 ô trên lưới'}
          </T>
          <Pressable
            testID="masoi-night-submit"
            disabled={pickedTwo.length !== 2 || busy}
            onPress={() =>
              pickedTwo.length === 2 &&
              void act({ type: 'ms_night', target: pickedTwo[0], target2: pickedTwo[1] }, true)
            }
            style={[styles.confirmPill, (pickedTwo.length !== 2 || busy) && styles.confirmPillDisabled]}
          >
            <T style={styles.confirmPillTxt}>Xác nhận ({pickedTwo.length}/2)</T>
          </Pressable>
        </View>
      );
    }

    if (view.phase === 'night_witch' && myRole === 'phuthuy' && !view.myNightSubmitted) {
      const ws = view.witchState;
      const vNum = ws?.victimId ? seatNumber.get(ws.victimId) : null;
      const pNum = witchPoison ? seatNumber.get(witchPoison) : null;
      return (
        <View style={styles.actionStripNight}>
          {ws?.healLeft && ws.victimId ? (
            <Pressable
              testID="masoi-witch-save"
              onPress={() => setWitchSave((v) => !v)}
              style={[styles.witchPill, witchSave && styles.witchPillSaveActive]}
            >
              <T style={styles.witchPillTxt}>
                {witchSave ? `Đã cứu #${vNum}` : `Cứu #${vNum}`}
              </T>
            </Pressable>
          ) : (
            <T numberOfLines={1} style={styles.actionStripTxt}>
              {ws?.poisonLeft ? 'Chạm ô để quăng Độc' : 'Hết bình phép'}
            </T>
          )}

          {pNum && (
            <Pressable onPress={() => setWitchPoison(null)} style={styles.witchPillPoisonActive}>
              <T style={styles.witchPillTxt}>Độc #{pNum} ×</T>
            </Pressable>
          )}

          <Pressable
            testID="masoi-night-submit"
            disabled={busy}
            onPress={() => void act({ type: 'ms_night', save: witchSave, poison: witchPoison }, true)}
            style={styles.confirmPill}
          >
            <T style={styles.confirmPillTxt}>
              {witchSave || witchPoison ? 'Dùng bình' : 'Bỏ qua'}
            </T>
          </Pressable>
        </View>
      );
    }

    if (view.phase === 'role_reveal' && roleMeta && myRole) {
      return (
        <View style={[styles.actionStripNight, { borderColor: roleMeta.color }]}>
          <GameIcon name={ROLE_GAME_ICON[myRole]} size={13} color="#FFFFFF" />
          <T numberOfLines={1} style={styles.actionStripTxt}>
            {roleHidden
              ? 'Đã ẩn vai trò trên màn hình'
              : `${roleMeta.name}: ${roleMeta.shortDesc}`}
          </T>
          <Pressable onPress={() => setRoleHidden((v) => !v)} style={styles.subtleMiniBtn}>
            <T style={styles.subtleMiniBtnTxt}>{roleHidden ? 'Hiện' : 'Ẩn'}</T>
          </Pressable>
        </View>
      );
    }

    return null;
  };

  return (
    <Shell game={game} room={room} scroll={false} hideStrip wide={wide}>
      <View style={styles.wolvesvilleRoot}>
        {/* ZONE 1: COMPACT DAY / NIGHT TOP HEADER (~44px) */}
        <View style={[styles.topHeader, isNight ? styles.topHeaderNight : styles.topHeaderDay]}>
          <View style={styles.topHeaderRow}>
            {/* Phase Pill */}
            <View style={[styles.phasePill, isNight ? styles.phasePillNight : styles.phasePillDay]}>
              <UiIcon
                name={isNight ? 'Moon' : view.phase === 'hunter_shot' ? 'Crosshair' : 'Sun'}
                size={12}
                color={isNight ? C.darkText : C.goldDeep}
              />
              <T style={[styles.phasePillTxt, isNight ? styles.txtLight : styles.txtAmberInk]}>
                {isNight ? `Đêm ${view.day}` : `Ngày ${view.day}`}
              </T>
            </View>

            {/* Concise Live Instruction */}
            <T
              numberOfLines={1}
              style={[
                styles.headerHintTxt,
                isNight ? styles.headerHintNight : styles.headerHintDay,
                err ? { color: isNight ? '#FCA5A5' : C.danger } : null,
              ]}
            >
              {headerInstruction}
            </T>

            {/* Live Countdown Seconds */}
            <View
              testID="masoi-timer"
              style={[
                styles.timerBadge,
                !isNight && styles.timerBadgeDay,
                secLeft <= 8 && styles.timerBadgeUrgent,
              ]}
            >
              <T
                style={[
                  styles.timerBadgeTxt,
                  !isNight && secLeft > 8 && { color: C.ink },
                ]}
              >
                {secLeft}s
              </T>
            </View>

            {/* Alive Counter */}
            <View style={[styles.aliveBadge, !isNight && styles.aliveBadgeDay]}>
              <UiIcon name="Users" size={10} color={isNight ? C.darkText : C.goldDeep} />
              <T style={[styles.aliveBadgeTxt, !isNight && styles.txtAmberInk]}>
                {view.alive.length}/{view.order.length}
              </T>
            </View>

            {/* Contextual 1-Tap Action Pill (Ready / Skip Vote / Skip Shot / Role Peek) */}
            {(view.phase === 'day_discuss' || view.phase === 'role_reveal') && iAlive ? (
              <Pressable
                testID="masoi-ready-btn"
                disabled={busy || myReady}
                onPress={() => void act({ type: 'ms_ready' })}
                style={[styles.headerActBtn, myReady && styles.headerActBtnDone]}
              >
                <T style={styles.headerActBtnTxt}>
                  {view.phase === 'role_reveal'
                    ? myReady
                      ? `Đã xem ${readyCount}/${view.alive.length}`
                      : 'Đã nhớ vai'
                    : myReady
                      ? `Xong ${readyCount}/${needReady}`
                      : `Sẵn sàng ${readyCount}/${needReady}`}
                </T>
              </Pressable>
            ) : view.phase === 'day_vote' && iAlive ? (
              <Pressable
                testID="masoi-skip-vote"
                disabled={busy}
                onPress={() => void act({ type: 'ms_vote', target: 'skip' }, true)}
                style={[
                  styles.headerActBtn,
                  styles.headerActBtnSkip,
                  view.dayVotes[me] === 'skip' && styles.headerActBtnDone,
                ]}
              >
                <T style={styles.headerActBtnTxt}>Phiếu trắng</T>
              </Pressable>
            ) : view.phase === 'hunter_shot' && view.hunterId === me ? (
              <Pressable
                testID="masoi-hunter-skip"
                disabled={busy}
                onPress={() => void act({ type: 'ms_hunter', target: 'skip' }, true)}
                style={[styles.headerActBtn, styles.headerActBtnSkip]}
              >
                <T style={styles.headerActBtnTxt}>Cất súng</T>
              </Pressable>
            ) : roleMeta && myRole ? (
              <Pressable
                testID="masoi-guide-open"
                onPress={() => setCommsTab((t) => (t === 'role' ? 'village' : 'role'))}
                style={[styles.roleMiniChip, { backgroundColor: roleMeta.color }]}
              >
                {roleHidden ? (
                  <UiIcon name="EyeOff" size={12} color="#FFFFFF" />
                ) : (
                  <GameIcon name={ROLE_GAME_ICON[myRole]} size={13} color="#FFFFFF" />
                )}
              </Pressable>
            ) : null}
          </View>

          {/* Sleek 3px Bottom Timer Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(timerRatio * 100)}%`,
                  backgroundColor: secLeft <= 8 ? C.danger : isNight ? '#818CF8' : C.goldDeep,
                },
              ]}
            />
          </View>
        </View>

        {/* MAIN SPLIT: Vertical 3-Zone on Mobile, 2-Column Side-by-Side on Wide Desktop */}
        <View style={[styles.mainBody, wide && styles.mainBodyWide]}>
          {/* ZONE 2: NUMBERED 4-COLUMN VILLAGE GRID */}
          <View style={[styles.villageZone, wide && styles.villageZoneWide]}>
            <View style={styles.grid4Col}>
              {view.order.map((id) => {
                const num = seatNumber.get(id) ?? 0;
                const player = playerMap.get(id);
                const alive = aliveSet.has(id);
                const deadEntry = deadMap.get(id);
                const isMePlot = id === me;

                const myVotedThis = view.phase === 'day_vote' && view.dayVotes[me] === id;
                const myWolfBitThis = view.phase === 'night_active' && myRole === 'soi' && view.wolfVotes?.[me] === id;
                const isPicked =
                  selected === id ||
                  pickedTwo.includes(id) ||
                  witchPoison === id ||
                  myVotedThis ||
                  myWolfBitThis;

                const isWolfAlly = id !== me && !!view.wolfPackIds?.includes(id);
                const isLover = view.myPartnerId === id || (isMePlot && !!view.myPartnerId);
                const seerResult = seerBadgeMap.has(id) ? seerBadgeMap.get(id) : undefined;
                const isWitchVictim =
                  view.phase === 'night_witch' &&
                  myRole === 'phuthuy' &&
                  view.witchState?.victimId === id;
                const isGuarded = view.guardCurrentTargetId === id;
                const guardLocked =
                  view.phase === 'night_active' && myRole === 'baove' && id === view.guardLastId;

                const votes = dayTally[id] ?? 0;
                const wolfClaws = wolfTally[id] ?? 0;
                const votedWho = view.dayVotes[id];
                const suspect = suspectMarks[id] ?? 'none';

                return (
                  <Pressable
                    key={id}
                    testID={`masoi-seat-${id}`}
                    onPress={() => onPlotPress(id)}
                    onLongPress={() => toggleSuspect(id)}
                    style={({ pressed }) => [
                      styles.plotCard,
                      compactMobile && rowCount >= 3 && styles.plotCardCompact,
                      isNight ? styles.plotCardNight : styles.plotCardDay,
                      !alive && (isNight ? styles.plotCardDeadNight : styles.plotCardDeadDay),
                      suspect === 'wolf' && alive && styles.plotSuspectWolf,
                      suspect === 'trust' && alive && styles.plotSuspectTrust,
                      suspect === 'jester' && alive && styles.plotSuspectJester,
                      isPicked && styles.plotCardSelected,
                      isWitchVictim && alive && styles.plotCardVictim,
                      guardLocked && { opacity: 0.52 },
                      pressed && alive && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    {/* Top-Left #Seat Number Badge (#1..#12) */}
                    <View
                      style={[
                        styles.seatBadge,
                        isMePlot ? styles.seatBadgeMe : isNight ? styles.seatBadgeNight : styles.seatBadgeDay,
                      ]}
                    >
                      <T
                        style={[
                          styles.seatBadgeTxt,
                          isNight && !isMePlot && { color: C.darkText },
                          isMePlot && styles.seatBadgeTxtMe,
                        ]}
                      >
                        #{num}
                      </T>
                    </View>

                    {/* Top-Right Role / Intel / Dead / Lover Badges */}
                    <View style={styles.topRightBadges}>
                      {isLover && (
                        <View style={styles.intelDotLover}>
                          <UiIcon name="Heart" size={9} color="#FDF2F8" />
                        </View>
                      )}
                      {!alive ? (
                        <View style={styles.intelDotDead}>
                          {deadEntry?.revealedRole ? (
                            <GameIcon name={ROLE_GAME_ICON[deadEntry.revealedRole]} size={10} color="#FFFFFF" />
                          ) : (
                            <UiIcon name="Skull" size={9} color="#E2E8F0" />
                          )}
                        </View>
                      ) : isMePlot && roleMeta && myRole ? (
                        <View style={[styles.intelDotRole, { backgroundColor: roleMeta.color }]}>
                          {roleHidden ? (
                            <UiIcon name="EyeOff" size={9} color="#FFFFFF" />
                          ) : (
                            <GameIcon name={ROLE_GAME_ICON[myRole]} size={10} color="#FFFFFF" />
                          )}
                        </View>
                      ) : isWolfAlly ? (
                        <View style={styles.intelDotWolf}>
                          <GameIcon name="wolf-head" size={10} color="#FECACA" />
                        </View>
                      ) : seerResult !== undefined ? (
                        <View
                          style={seerResult ? styles.intelDotWolf : styles.intelDotGood}
                        >
                          <GameIcon name={seerResult ? 'wolf-head' : 'farmer'} size={10} color="#FFFFFF" />
                        </View>
                      ) : isWitchVictim ? (
                        <View style={styles.intelDotWolf}>
                          <UiIcon name="AlertTriangle" size={9} color="#FECACA" />
                        </View>
                      ) : isGuarded ? (
                        <View style={styles.intelDotGuard}>
                          <UiIcon name="Shield" size={9} color="#E0F2FE" />
                        </View>
                      ) : suspect !== 'none' ? (
                        <Pressable
                          testID={`masoi-note-${id}`}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            toggleSuspect(id);
                          }}
                          style={styles.intelDotSuspect}
                        >
                          <UiIcon
                            name={suspect === 'wolf' ? 'HelpCircle' : suspect === 'trust' ? 'Check' : 'AlertTriangle'}
                            size={9}
                            color={suspect === 'wolf' ? '#FCA5A5' : suspect === 'trust' ? '#86EFAC' : '#FDE047'}
                          />
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Center Avatar with Tombstone Overlay or Target Ring */}
                    <View
                      style={[
                        styles.plotAvatarWrap,
                        isPicked && styles.plotAvatarTargeted,
                      ]}
                    >
                      {player ? (
                        <View style={!alive ? styles.deadAvatarDim : undefined}>
                          <Portrait p={player} size={avatarSize} border={isPicked ? 2 : 1} />
                        </View>
                      ) : (
                        <UiIcon
                          name={alive ? 'User' : 'Skull'}
                          size={Math.round(avatarSize * 0.7)}
                          color={C.muted}
                        />
                      )}

                      {!alive && (
                        <View pointerEvents="none" style={styles.tombstoneOverlay}>
                          <UiIcon name="Skull" size={15} color="#CBD5E1" />
                        </View>
                      )}

                      {/* Live Vote Tally Pill or Wolf Pack Targets */}
                      {alive && votes > 0 && (
                        <View style={styles.tallyOverlayVote}>
                          <T style={styles.tallyOverlayTxt}>{votes}</T>
                        </View>
                      )}
                      {alive && wolfClaws > 0 && (
                        <View style={styles.tallyOverlayWolf}>
                          <T style={styles.tallyOverlayTxt}>{wolfClaws}</T>
                        </View>
                      )}
                    </View>

                    {/* Bottom 1-Line Truncated Name / Status */}
                    <T
                      numberOfLines={1}
                      style={[
                        styles.plotName,
                        isNight ? styles.plotNameNight : styles.plotNameDay,
                        !alive && styles.plotNameDead,
                      ]}
                    >
                      {!alive && deadEntry?.revealedRole
                        ? `${MASOI_ROLES[deadEntry.revealedRole].name}`
                        : view.phase === 'day_vote' && alive && votedWho
                          ? votedWho === 'skip'
                            ? `${view.names[id] ?? id} · Trắng`
                            : `${view.names[id] ?? id} →#${seatNumber.get(votedWho)}`
                          : view.names[id] ?? id}
                    </T>
                  </Pressable>
                );
              })}
            </View>

            {/* Optional 1-Line Confirm Bar for Seer / Guard / Cupid / Detective / Witch */}
            {renderGridActionStrip()}
          </View>

          {/* ZONE 3: ALWAYS-VISIBLE CHAT & VILLAGE LOG (flex: 1, Pinned Input) */}
          <View
            testID="masoi-comms-card"
            style={[
              styles.chatZone,
              isNight ? styles.chatZoneNight : styles.chatZoneDay,
            ]}
          >
            {/* Channel Tabs Bar */}
            <View style={[styles.channelBar, !isNight && styles.channelBarDay]}>
              <Pressable
                testID="masoi-tab-village"
                onPress={() => setCommsTab('village')}
                style={[
                  styles.channelTab,
                  commsTab === 'village' &&
                    (isNight ? styles.channelTabActiveNight : styles.channelTabActiveDay),
                ]}
              >
                <UiIcon
                  name="MessageCircle"
                  size={12}
                  color={
                    commsTab === 'village'
                      ? isNight
                        ? C.darkBg
                        : C.paper
                      : isNight
                        ? C.darkMuted
                        : C.muted
                  }
                />
                <T
                  style={[
                    styles.channelTabTxt,
                    !isNight && { color: C.secondary },
                    commsTab === 'village' &&
                      (isNight ? styles.channelTabTxtActiveNight : styles.channelTabTxtActiveDay),
                  ]}
                >
                  Chat làng
                </T>
              </Pressable>

              {myRole === 'soi' && view.wolfChat && (
                <Pressable
                  testID="masoi-tab-wolf"
                  onPress={() => setCommsTab('wolf')}
                  style={[
                    styles.channelTab,
                    commsTab === 'wolf' && styles.channelTabWolfActive,
                  ]}
                >
                  <GameIcon name="wolf-head" size={12} color={commsTab === 'wolf' ? '#FFFFFF' : '#F87171'} />
                  <T
                    style={[
                      styles.channelTabTxt,
                      { color: isNight ? '#FCA5A5' : C.danger, fontVariant: ['tabular-nums'] },
                      commsTab === 'wolf' && { color: '#FFFFFF' },
                    ]}
                  >
                    Kênh Sói ({view.wolfChat.length})
                  </T>
                </Pressable>
              )}

              <Pressable
                testID="masoi-tab-log"
                onPress={() => setCommsTab('role')}
                style={[
                  styles.channelTab,
                  commsTab === 'role' &&
                    (isNight ? styles.channelTabActiveNight : styles.channelTabActiveDay),
                ]}
              >
                <UiIcon
                  name="BookOpen"
                  size={12}
                  color={
                    commsTab === 'role'
                      ? isNight
                        ? C.darkBg
                        : C.paper
                      : isNight
                        ? C.darkMuted
                        : C.muted
                  }
                />
                <T
                  style={[
                    styles.channelTabTxt,
                    !isNight && { color: C.secondary },
                    commsTab === 'role' &&
                      (isNight ? styles.channelTabTxtActiveNight : styles.channelTabTxtActiveDay),
                  ]}
                >
                  Vai & Luật
                </T>
              </Pressable>
            </View>

            {/* TAB 1: UNIFIED VILLAGE CHAT + SYSTEM EVENT BANNERS */}
            {commsTab === 'village' && (
              <View style={styles.chatContentFill}>
                {/* Ghim tức thì kết quả Tiên Tri / Thám Tử ngay trên luồng chat */}
                {myRole === 'tientri' && view.seerHistory && view.seerHistory.length > 0 && (() => {
                  const last = view.seerHistory[view.seerHistory.length - 1];
                  return (
                    <View
                      testID="masoi-intel-banner"
                      style={[
                        styles.intelPinBanner,
                        last.isWolf ? styles.intelPinWolf : styles.intelPinGood,
                      ]}
                    >
                      <UiIcon name="Eye" size={12} color="#FFFFFF" />
                      <T numberOfLines={1} style={styles.intelPinTxt}>
                        Đêm {last.day}: #{seatNumber.get(last.targetId)} {view.names[last.targetId]} là{' '}
                        {last.isWolf ? 'Ma Sói' : 'Phe Dân'}
                      </T>
                    </View>
                  );
                })()}
                {myRole === 'thamtu' && view.detectiveHistory && view.detectiveHistory.length > 0 && (() => {
                  const last = view.detectiveHistory[view.detectiveHistory.length - 1];
                  return (
                    <View testID="masoi-intel-banner" style={[styles.intelPinBanner, styles.intelPinGood]}>
                      <UiIcon name="Search" size={12} color="#FFFFFF" />
                      <T numberOfLines={1} style={styles.intelPinTxt}>
                        Đêm {last.day}: #{seatNumber.get(last.a)} &amp; #{seatNumber.get(last.b)} ·{' '}
                        {last.sameTeam ? 'Cùng phe' : 'Khác phe'}
                      </T>
                    </View>
                  );
                })()}

                <ScrollView
                  ref={feedScrollRef}
                  style={styles.feedScroll}
                  contentContainerStyle={styles.feedScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {unifiedVillageFeed.length === 0 ? (
                    <T style={[styles.emptyFeedTxt, !isNight && { color: C.muted }]}>
                      Chưa có thông báo. Khi bình minh lên, hãy dùng #SốGhế để suy luận cùng dân làng.
                    </T>
                  ) : (
                    unifiedVillageFeed.map((item) => {
                      if (item.kind === 'log') {
                        const isDawn = item.log.kind === 'dawn';
                        const isHunter = item.log.kind === 'hunter';
                        return (
                          <View
                            key={item.key}
                            style={[
                              styles.sysBanner,
                              isDawn
                                ? isNight
                                  ? styles.sysBannerDawnNight
                                  : styles.sysBannerDay
                                : isHunter
                                  ? styles.sysBannerHunter
                                  : isNight
                                    ? styles.sysBannerNight
                                    : styles.sysBannerDay,
                            ]}
                          >
                            <T
                              style={[
                                styles.sysBannerTxt,
                                !isNight && !isHunter && { color: C.ink },
                                !isNight && isHunter && { color: C.danger },
                              ]}
                            >
                              [Ngày {item.log.day}] {item.log.text}
                            </T>
                          </View>
                        );
                      }

                      const sNum = seatNumber.get(item.from);
                      const sender = playerMap.get(item.from);
                      const isMine = item.from === me;
                      const senderDead = !aliveSet.has(item.from);
                      return (
                        <View
                          key={item.key}
                          style={[
                            styles.msgRow,
                            isNight ? styles.msgRowNight : styles.msgRowDay,
                            isMine && (isNight ? styles.msgRowMineNight : styles.msgRowMineDay),
                          ]}
                        >
                          <Portrait p={sender ?? { avatar: 0 }} size={22} />
                          <T numberOfLines={4} style={isNight ? styles.msgLineNight : styles.msgLineDay}>
                            <T
                              style={[
                                styles.msgAuthor,
                                isMine
                                  ? isNight
                                    ? { color: '#93C5FD' }
                                    : styles.msgAuthorMe
                                  : isNight
                                    ? styles.msgAuthorNight
                                    : styles.msgAuthorDay,
                              ]}
                            >
                              {sNum ? `#${sNum} ` : ''}
                              {item.name}
                              {senderDead ? ' (Đã mất)' : ''}:{' '}
                            </T>
                            {item.isSticker ? `[Nhãn dán ${item.stickerId}]` : item.text}
                          </T>
                          <T style={[styles.msgTime, !isNight && { color: C.muted }]}>{fmtShortTime(item.at)}</T>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* 1-Line Quick Deduction Chips */}
                {canChatVillage && (
                  <View style={[styles.quickStripWrap, !isNight && { borderTopColor: C.borderSubtle }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.quickStripScroll}
                    >
                      {quickDeductionChips.map((q, idx) => (
                        <Pressable
                          key={`vq-${idx}`}
                          testID={`masoi-quick-${idx}`}
                          onPress={() => void sendVillageChat(q)}
                          style={[styles.quickChip, isNight && styles.quickChipNight]}
                        >
                          <T style={[styles.quickChipTxt, isNight && { color: '#FDE68A' }]}>{q}</T>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Pinned Bottom Input Row */}
                {!iAlive ? (
                  <View style={[styles.pinnedStatusRow, !isNight && styles.pinnedStatusRowDay]}>
                    <T style={[styles.pinnedStatusTxt, !isNight && { color: C.secondary }]}>
                      Bạn đã hy sinh · Đang theo dõi làng suy luận
                    </T>
                  </View>
                ) : isNight ? (
                  myRole === 'soi' && view.wolfChat ? (
                    <Pressable
                      onPress={() => setCommsTab('wolf')}
                      style={[styles.pinnedStatusRow, styles.pinnedWolfJump]}
                    >
                      <T style={[styles.pinnedStatusTxt, { color: '#FECACA' }]}>
                        Đang là ban đêm · Chạm mở Kênh Sói để bàn mưu
                      </T>
                    </Pressable>
                  ) : (
                    <View style={styles.pinnedStatusRow}>
                      <T style={styles.pinnedStatusTxt}>
                        Ban đêm cả làng giữ im lặng · Chờ trời sáng để chat
                      </T>
                    </View>
                  )
                ) : (
                  <MaSoiChatInputBar
                    inputTestID="masoi-village-input"
                    sendTestID="masoi-village-send"
                    placeholder="Chat suy luận với làng (vd: Nghi #3 là Sói)..."
                    placeholderTextColor={C.muted}
                    maxLength={200}
                    day={!isNight}
                    onSend={sendVillageChat}
                  />
                )}
              </View>
            )}

            {/* TAB 2: WOLF PACK SECRET CHANNEL */}
            {commsTab === 'wolf' && myRole === 'soi' && view.wolfChat && (
              <View style={styles.chatContentFill}>
                {view.wolfPackIds && view.wolfPackIds.length > 0 && (
                  <View style={styles.wolfPackStrip}>
                    <GameIcon name="wolf-head" size={13} color="#FCA5A5" />
                    <T numberOfLines={1} style={styles.wolfPackStripTxt}>
                      Bầy Sói:{' '}
                      {view.wolfPackIds
                        .map((id) => `#${seatNumber.get(id)} ${view.names[id]}`)
                        .join(', ')}
                    </T>
                  </View>
                )}

                <ScrollView
                  ref={wolfScrollRef}
                  style={styles.feedScroll}
                  contentContainerStyle={styles.feedScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {view.wolfChat.length === 0 ? (
                    <T style={styles.emptyWolfTxt}>
                      Kênh bí mật của bầy Sói. Bàn nhau chọn mồi hoặc giả danh Tiên Tri tại đây.
                    </T>
                  ) : (
                    view.wolfChat.map((m) => {
                      const wolfSender = playerMap.get(m.from);
                      return (
                        <View key={`wm-${m.id}`} style={styles.wolfMsgRow}>
                          <Portrait p={wolfSender ?? { avatar: 0 }} size={22} />
                          <T style={styles.wolfMsgTxt}>
                            <T style={styles.wolfMsgAuthor}>
                              #{seatNumber.get(m.from) ?? '?'} {m.name}:{' '}
                            </T>
                            {m.text}
                          </T>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {canChatWolf && (
                  <View style={styles.quickStripWrap}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={styles.quickStripScroll}
                    >
                      {quickDeductionChips.map((q, idx) => (
                        <Pressable
                          key={`wq-${idx}`}
                          onPress={() => void sendWolfChat(q)}
                          style={styles.quickChipWolf}
                        >
                          <T style={styles.quickChipWolfTxt}>{q}</T>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {iAlive ? (
                  <MaSoiChatInputBar
                    inputTestID="masoi-wolf-chat-input"
                    sendTestID="masoi-wolf-chat-send"
                    placeholder="Nhắn mật cho đồng bọn Sói..."
                    placeholderTextColor="#FCA5A5"
                    maxLength={140}
                    wolf
                    onSend={sendWolfChat}
                  />
                ) : (
                  <View style={styles.pinnedStatusRow}>
                    <T style={styles.pinnedStatusTxt}>
                      Bạn đã hy sinh · Chỉ xem lại mật thư bầy Sói
                    </T>
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: COMPACT ROLE, PRIVATE INTEL & DECK REFERENCE */}
            {commsTab === 'role' && (
              <ScrollView
                style={styles.feedScroll}
                contentContainerStyle={styles.roleTabContent}
              >
                {/* My Role Summary Card */}
                {roleMeta && myRole && (
                  <View
                    style={[
                      styles.myRoleRefCard,
                      !isNight && styles.myRoleRefCardDay,
                      { borderColor: roleMeta.color },
                    ]}
                  >
                    <View style={styles.myRoleRefHead}>
                      <View style={[styles.myRoleBadge, { backgroundColor: roleMeta.color }]}>
                        <GameIcon name={ROLE_GAME_ICON[myRole]} size={15} color="#FFFFFF" />
                        <T style={styles.myRoleBadgeTxt}>
                          {roleMeta.name} · {roleMeta.teamLabel}
                        </T>
                      </View>
                      <Pressable
                        onPress={() => setRoleHidden((v) => !v)}
                        style={[styles.subtleMiniBtn, !isNight && { backgroundColor: C.mist }]}
                      >
                        <T style={[styles.subtleMiniBtnTxt, !isNight && { color: C.secondary }]}>
                          {roleHidden ? 'Hiện huy hiệu' : 'Ẩn huy hiệu'}
                        </T>
                      </Pressable>
                    </View>
                    <T style={[styles.myRoleHow, !isNight && { color: C.ink }]}>
                      {roleMeta.howToPlay}
                    </T>
                    <T style={[styles.myRoleWin, !isNight && { color: C.goldDeep }]}>
                      Mục tiêu: {roleMeta.winCond}
                    </T>
                    {view.myPartnerId && (
                      <T style={styles.loverLine}>
                        Cặp đôi định mệnh với #{seatNumber.get(view.myPartnerId)}{' '}
                        {view.names[view.myPartnerId]}
                      </T>
                    )}
                  </View>
                )}

                {/* Seer Inspection History */}
                {view.seerHistory && view.seerHistory.length > 0 && (
                  <View style={[styles.intelHistoryCard, !isNight && styles.intelHistoryCardDay]}>
                    <T style={[styles.intelHistoryTitle, !isNight && { color: C.ink }]}>Lịch sử Tiên Tri soi</T>
                    {view.seerHistory.map((h, i) => (
                      <T key={`sh-${i}`} style={[styles.intelHistoryItem, !isNight && { color: C.ink }]}>
                        · Đêm {h.day}: #{seatNumber.get(h.targetId)} {view.names[h.targetId]} →{' '}
                        {h.isWolf ? 'Ma Sói' : 'Phe Dân Làng'}
                      </T>
                    ))}
                  </View>
                )}

                {/* Detective History */}
                {view.detectiveHistory && view.detectiveHistory.length > 0 && (
                  <View style={[styles.intelHistoryCard, { borderColor: C.jade }, !isNight && styles.intelHistoryCardDay]}>
                    <T style={[styles.intelHistoryTitle, { color: isNight ? '#6EE7B7' : C.jadeDeep }]}>
                      Hồ sơ Thám Tử
                    </T>
                    {view.detectiveHistory.map((h, i) => (
                      <T key={`dh-${i}`} style={[styles.intelHistoryItem, !isNight && { color: C.ink }]}>
                        · Đêm {h.day}: #{seatNumber.get(h.a)} &amp; #{seatNumber.get(h.b)} →{' '}
                        {h.sameTeam ? 'Cùng phe' : 'Khác phe'}
                      </T>
                    ))}
                  </View>
                )}

                {/* Room Role Deck */}
                <T style={[styles.deckSectionTitle, !isNight && { color: C.secondary }]}>
                  Bộ vai trò trong phòng ({view.order.length} người):
                </T>
                <View style={styles.deckGrid}>
                  {deckEntries.map(([r, cnt]) => {
                    const m = MASOI_ROLES[r];
                    const deadCnt = revealedDeadRoleCounts[r] ?? 0;
                    const remain = Math.max(0, cnt - deadCnt);
                    return (
                      <View
                        key={`dk-${r}`}
                        testID={`masoi-deck-${r}`}
                        style={[
                          styles.deckCard,
                          !isNight && styles.deckCardDay,
                          remain === 0 && { opacity: 0.48 },
                        ]}
                      >
                        <View style={styles.deckCardHead}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                            <GameIcon name={ROLE_GAME_ICON[r]} size={13} color={m.color} />
                            <T style={[styles.deckCardName, { color: m.color }]}>
                              {m.name} {deadCnt > 0 ? `(${remain}/${cnt})` : `×${cnt}`}
                            </T>
                          </View>
                        </View>
                        <T
                          numberOfLines={2}
                          style={[styles.deckCardDesc, !isNight && { color: C.secondary }]}
                        >
                          {m.shortDesc}
                        </T>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  wolvesvilleRoot: {
    flex: 1,
    minHeight: 0,
    gap: 6,
    marginHorizontal: -6,
  },

  /* ZONE 1: TOP HEADER (~44px) */
  topHeader: {
    borderRadius: 13,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 5,
    borderWidth: 1,
  },
  topHeaderNight: {
    backgroundColor: C.darkSurface,
    borderColor: C.darkBorder,
  },
  topHeaderDay: {
    backgroundColor: C.paper,
    borderColor: C.borderSubtle,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  phasePillNight: {
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  phasePillDay: {
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.2)',
  },
  phasePillTxt: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: FONT,
    fontVariant: ['tabular-nums'],
  },
  txtLight: {
    color: C.darkText,
  },
  txtAmberInk: {
    color: C.goldDeep,
  },
  headerHintTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    minWidth: 0,
  },
  headerHintNight: {
    color: C.darkMuted,
  },
  headerHintDay: {
    color: C.secondary,
  },
  timerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
    backgroundColor: C.darkSubtle,
  },
  timerBadgeDay: {
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  timerBadgeUrgent: {
    backgroundColor: C.danger,
  },
  timerBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FDE68A',
    fontVariant: ['tabular-nums'],
  },
  aliveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 7,
    backgroundColor: C.darkSubtle,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  aliveBadgeDay: {
    backgroundColor: C.goldSoft,
    borderColor: 'rgba(180,83,9,0.2)',
  },
  aliveBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.darkText,
    fontVariant: ['tabular-nums'],
  },
  headerActBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.son,
  },
  headerActBtnSkip: {
    backgroundColor: C.secondary,
  },
  headerActBtnDone: {
    backgroundColor: C.jade,
  },
  headerActBtnTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  roleMiniChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(123, 114, 102, 0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  /* MAIN SPLIT */
  mainBody: {
    flex: 1,
    minHeight: 0,
    gap: 6,
  },
  mainBodyWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },

  /* ZONE 2: 4-COLUMN NUMBERED VILLAGE GRID */
  villageZone: {
    gap: 5,
    flexShrink: 0,
  },
  villageZoneWide: {
    width: '49%',
    justifyContent: 'flex-start',
  },
  grid4Col: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'flex-start',
  },
  plotCard: {
    width: '23.4%',
    flexGrow: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 3,
    borderRadius: 11,
    borderWidth: 1,
    position: 'relative',
    ...(Platform.OS === 'web'
      ? ({
          cursor: 'pointer',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        } as object)
      : null),
  },
  plotCardCompact: {
    paddingTop: 11,
    paddingBottom: 3,
    borderRadius: 9,
  },
  plotCardNight: {
    backgroundColor: C.darkSurface,
    borderColor: C.darkBorder,
  },
  plotCardDay: {
    backgroundColor: C.paper,
    borderColor: C.borderSubtle,
  },
  plotCardDeadNight: {
    backgroundColor: C.darkBg,
    borderColor: C.darkBorder,
    opacity: 0.62,
  },
  plotCardDeadDay: {
    backgroundColor: C.mist,
    borderColor: C.borderSubtle,
    opacity: 0.68,
  },
  plotSuspectWolf: {
    borderColor: C.danger,
  },
  plotSuspectTrust: {
    borderColor: C.jade,
  },
  plotSuspectJester: {
    borderColor: C.gold,
  },
  plotCardSelected: {
    borderColor: C.goldDeep,
    borderWidth: 2,
  },
  plotCardVictim: {
    borderColor: C.danger,
    borderWidth: 1.5,
  },

  seatBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 5,
    zIndex: 2,
  },
  seatBadgeMe: {
    backgroundColor: C.gold,
  },
  seatBadgeNight: {
    backgroundColor: C.darkSubtle,
  },
  seatBadgeDay: {
    backgroundColor: C.mist,
  },
  seatBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '600',
    color: C.secondary,
    fontVariant: ['tabular-nums'],
  },
  seatBadgeTxtMe: {
    color: C.ink,
  },

  topRightBadges: {
    position: 'absolute',
    top: 3,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  intelDotRole: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  intelDotWolf: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: C.danger,
  },
  intelDotGood: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: C.jade,
  },
  intelDotGuard: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: '#0369A1',
  },
  intelDotLover: {
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: '#9D174D',
  },
  intelDotDead: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: C.darkSubtle,
  },
  intelDotSuspect: {
    paddingHorizontal: 3.5,
    paddingVertical: 1,
    borderRadius: 5,
    backgroundColor: C.darkSubtle,
  },

  plotAvatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  plotAvatarTargeted: {
    borderRadius: 999,
  },
  deadAvatarDim: {
    opacity: 0.42,
  },
  tombstoneOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallyOverlayVote: {
    position: 'absolute',
    bottom: -3,
    right: -7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: C.ink,
    borderWidth: 1,
    borderColor: C.gold,
  },
  tallyOverlayWolf: {
    position: 'absolute',
    bottom: -3,
    right: -7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: C.danger,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tallyOverlayTxt: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FEF3C7',
    fontVariant: ['tabular-nums'],
  },

  plotName: {
    fontSize: 10.5,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: '100%',
    marginTop: 1,
  },
  plotNameNight: {
    color: C.darkText,
  },
  plotNameDay: {
    color: C.ink,
  },
  plotNameDead: {
    color: C.muted,
    textDecorationLine: 'line-through',
  },

  /* 1-Line Floating Night Action Bar inside Zone 2 */
  actionStripNight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
  },
  actionStripTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    color: C.darkText,
  },
  confirmPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    backgroundColor: C.gold,
  },
  confirmPillDisabled: {
    opacity: 0.4,
  },
  confirmPillTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.ink,
    fontVariant: ['tabular-nums'],
  },
  witchPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(21, 128, 61, 0.25)',
    borderWidth: 1,
    borderColor: C.jade,
  },
  witchPillSaveActive: {
    backgroundColor: C.jade,
  },
  witchPillPoisonActive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.danger,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  witchPillTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtleMiniBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: C.darkSubtle,
  },
  subtleMiniBtnTxt: {
    fontSize: 10,
    fontWeight: '500',
    color: C.darkText,
  },

  /* ZONE 3: ALWAYS-VISIBLE CHAT & VILLAGE LOG (flex: 1) */
  chatZone: {
    flex: 1,
    minHeight: 0,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chatZoneNight: {
    backgroundColor: C.darkBg,
    borderColor: C.darkBorder,
  },
  chatZoneDay: {
    backgroundColor: C.paper,
    borderColor: C.borderSubtle,
  },
  channelBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: C.darkSurface,
    borderBottomWidth: 1,
    borderBottomColor: C.darkBorder,
  },
  channelBarDay: {
    backgroundColor: C.parchment,
    borderBottomColor: C.borderSubtle,
  },
  channelTab: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTabActiveNight: {
    backgroundColor: C.gold,
  },
  channelTabActiveDay: {
    backgroundColor: C.ink,
  },
  channelTabWolfActive: {
    backgroundColor: C.danger,
  },
  channelTabTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkMuted,
  },
  channelTabTxtActiveNight: {
    color: C.ink,
  },
  channelTabTxtActiveDay: {
    color: C.paper,
  },

  chatContentFill: {
    flex: 1,
    minHeight: 0,
  },
  feedScroll: {
    flex: 1,
    minHeight: 0,
  },
  feedScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
  },
  emptyFeedTxt: {
    fontSize: 11.5,
    fontWeight: '400',
    color: C.darkMuted,
    textAlign: 'center',
    paddingVertical: 14,
  },

  sysBanner: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderLeftWidth: 2.5,
  },
  sysBannerDawnNight: {
    backgroundColor: 'rgba(217, 119, 6, 0.16)',
    borderLeftColor: C.gold,
  },
  sysBannerHunter: {
    backgroundColor: 'rgba(185, 28, 28, 0.16)',
    borderLeftColor: C.danger,
  },
  sysBannerNight: {
    backgroundColor: C.darkSurface,
    borderLeftColor: '#818CF8',
  },
  sysBannerDay: {
    backgroundColor: C.goldSoft,
    borderLeftColor: C.goldDeep,
  },
  sysBannerTxt: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#FDE68A',
    lineHeight: 16,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  msgRowNight: {
    backgroundColor: C.darkSurface,
  },
  msgRowDay: {
    backgroundColor: C.parchment,
  },
  msgRowMineNight: {
    backgroundColor: C.darkSubtle,
    borderLeftWidth: 2,
    borderLeftColor: C.gold,
  },
  msgRowMineDay: {
    backgroundColor: C.goldSoft,
    borderLeftWidth: 2,
    borderLeftColor: C.goldDeep,
  },
  msgLineNight: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: C.darkText,
    lineHeight: 16,
  },
  msgLineDay: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: C.ink,
    lineHeight: 16,
  },
  msgAuthor: {
    fontWeight: '600',
  },
  msgAuthorMe: {
    color: C.son,
  },
  msgAuthorNight: {
    color: '#FDE68A',
  },
  msgAuthorDay: {
    color: C.goldDeep,
  },
  msgTime: {
    fontSize: 9.5,
    fontWeight: '400',
    color: C.darkMuted,
    fontVariant: ['tabular-nums'],
  },

  quickStripWrap: {
    borderTopWidth: 1,
    borderTopColor: C.darkBorder,
    paddingVertical: 4,
  },
  quickStripScroll: {
    paddingHorizontal: 6,
    gap: 5,
    alignItems: 'center',
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: 'rgba(180,83,9,0.2)',
  },
  quickChipNight: {
    backgroundColor: 'rgba(217, 119, 6, 0.16)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  quickChipTxt: {
    fontSize: 10.5,
    fontWeight: '500',
    color: C.goldDeep,
  },
  quickChipWolf: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(185, 28, 28, 0.22)',
    borderWidth: 1,
    borderColor: C.danger,
  },
  quickChipWolfTxt: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#FECACA',
  },

  pinnedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: C.borderSubtle,
  },
  chatInput: {
    flex: 1,
    minWidth: 0,
    height: 34,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
    color: C.darkText,
    fontSize: 12.5,
    fontWeight: '500',
  },
  chatInputDay: {
    backgroundColor: C.paper,
    borderColor: C.borderStrong,
    color: C.ink,
  },
  chatInputWolf: {
    backgroundColor: '#260E12',
    borderColor: C.danger,
    color: '#FEE2E2',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDay: {
    backgroundColor: C.ink,
  },

  pinnedStatusRow: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: C.darkSurface,
    borderTopWidth: 1,
    borderTopColor: C.darkBorder,
    alignItems: 'center',
  },
  pinnedStatusRowDay: {
    backgroundColor: C.parchment,
    borderTopColor: C.borderSubtle,
  },
  pinnedWolfJump: {
    backgroundColor: 'rgba(153, 27, 27, 0.45)',
  },
  pinnedStatusTxt: {
    fontSize: 11,
    fontWeight: '500',
    color: C.darkMuted,
    textAlign: 'center',
  },

  /* WOLF CHANNEL */
  wolfPackStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(153, 27, 27, 0.35)',
  },
  wolfPackStripTxt: {
    flex: 1,
    fontSize: 10.5,
    fontWeight: '500',
    color: '#FECACA',
  },
  emptyWolfTxt: {
    fontSize: 11.5,
    fontWeight: '400',
    color: '#FCA5A5',
    textAlign: 'center',
    paddingVertical: 14,
  },
  wolfMsgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 28, 28, 0.22)',
    borderLeftWidth: 2,
    borderLeftColor: C.danger,
  },
  wolfMsgTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '400',
    color: '#FEE2E2',
  },
  wolfMsgAuthor: {
    fontWeight: '600',
    color: '#FCA5A5',
  },

  /* ROLE & RULES REFERENCE TAB */
  roleTabContent: {
    padding: 8,
    gap: 7,
  },
  myRoleRefCard: {
    padding: 9,
    borderRadius: 10,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    gap: 4,
  },
  myRoleRefCardDay: {
    backgroundColor: C.parchment,
  },
  myRoleRefHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  myRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  myRoleBadgeTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  myRoleHow: {
    fontSize: 11.5,
    fontWeight: '400',
    color: C.darkText,
    lineHeight: 16,
  },
  myRoleWin: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDE68A',
  },
  loverLine: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#F472B6',
  },

  intelHistoryCard: {
    padding: 8,
    borderRadius: 9,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    gap: 2,
  },
  intelHistoryCardDay: {
    backgroundColor: C.parchment,
    borderColor: C.borderStrong,
  },
  intelHistoryTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#C4B5FD',
  },
  intelPinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderBottomWidth: 1,
    borderBottomColor: C.darkBorder,
  },
  intelPinWolf: {
    backgroundColor: C.danger,
  },
  intelPinGood: {
    backgroundColor: C.jade,
  },
  intelPinTxt: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  intelHistoryItem: {
    fontSize: 11.5,
    fontWeight: '500',
    color: C.darkText,
  },

  deckSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.darkMuted,
    marginTop: 2,
  },
  deckGrid: {
    gap: 5,
  },
  deckCard: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: C.darkSurface,
    borderWidth: 1,
    borderColor: C.darkBorder,
    gap: 2,
  },
  deckCardDay: {
    backgroundColor: C.parchment,
    borderColor: C.borderSubtle,
  },
  deckCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckCardName: {
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  deckCardDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: C.darkMuted,
    lineHeight: 15,
  },
});
