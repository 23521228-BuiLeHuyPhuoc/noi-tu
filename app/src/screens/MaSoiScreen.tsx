import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
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
import { FONT } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { T } from '../ui';
import { Shell } from '../components/Shell';
import { Portrait } from '../components/Avatar';
import { EmojiIcon, GameIcon, UiIcon } from '../components/Icons';

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
  const [villageInput, setVillageInput] = useState('');
  const [wolfInput, setWolfInput] = useState('');
  const [suspectMarks, setSuspectMarks] = useState<Record<string, SuspectMark>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [logOrderStamps, setLogOrderStamps] = useState<Record<number, number>>({});

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

  // Gắn mốc thời gian nhận từng dòng log công khai để gộp chuẩn xác theo thứ tự với Chat Làng
  const lastLogId = view.publicLog.at(-1)?.id ?? 0;
  useOnChange(lastLogId, () => {
    const baseAt = game.chat.at(-1)?.at ?? 1;
    setLogOrderStamps((prev) => {
      let changed = false;
      const next = { ...prev };
      view.publicLog.forEach((entry, idx) => {
        if (next[entry.id] === undefined) {
          next[entry.id] = baseAt + idx + 1;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  });

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

  // Merge publicLog banners chronologically with village chat (100% pure render)
  const unifiedVillageFeed = useMemo<UnifiedFeedItem[]>(() => {
    const items: UnifiedFeedItem[] = [];
    for (let i = 0; i < view.publicLog.length; i++) {
      const log = view.publicLog[i];
      items.push({
        key: `log-${log.id}`,
        kind: 'log',
        at: logOrderStamps[log.id] ?? i,
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
    items.sort((a, b) => (a.at !== b.at ? a.at - b.at : a.key.localeCompare(b.key)));
    return items;
  }, [view.publicLog, game.chat, logOrderStamps]);

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

  const act = async (payload: Parameters<Game['act']>[0], resetSelection = false) => {
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
  };

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

    // 3. Night — Wolf Pack: immediate 1-tap target selection / update
    if (view.phase === 'night_active' && myRole === 'soi') {
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
        setErr('Không được bảo vệ cùng 1 người 2 đêm liên tiếp!');
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

  const sendVillageChat = async (textOverride?: string) => {
    const clean = (textOverride ?? villageInput).trim();
    if (!clean || !canChatVillage) return;
    if (!textOverride) setVillageInput('');
    await game.sendChat(clean);
  };

  const sendWolfChat = async (textOverride?: string) => {
    const clean = (textOverride ?? wolfInput).trim();
    if (!clean || !canChatWolf) return;
    if (!textOverride) setWolfInput('');
    await act({ type: 'ms_wolfChat', text: clean });
  };

  // Context-aware Quick Wolvesville Deduction Chips (auto-inserting #X!)
  const quickDeductionChips = useMemo(() => {
    const focusNum = lastFocusSeatId ? seatNumber.get(lastFocusSeatId) : undefined;
    if (commsTab === 'wolf' && canChatWolf) {
      const chips: string[] = [];
      if (focusNum) chips.push(`🐾 Đêm nay cắn #${focusNum} đi!`);
      chips.push('🐺 Ai giả Tiên Tri sáng mai nhảy ra?');
      chips.push('🤫 Chia phiếu ban ngày tránh lộ bầy!');
      chips.push('👀 Tìm Tiên Tri / Bảo Vệ thịt trước!');
      return chips;
    }

    const chips: string[] = [];
    const lastSeer = view.seerHistory?.[view.seerHistory.length - 1];
    if (myRole === 'tientri' && lastSeer) {
      const sNum = seatNumber.get(lastSeer.targetId);
      if (sNum) {
        chips.push(
          lastSeer.isWolf
            ? `🔮 Tui Tiên Tri! Đêm qua soi #${sNum} là SÓI!`
            : `🔮 Tui Tiên Tri! Đã soi #${sNum} phe Dân tốt!`,
        );
      }
    }
    if (focusNum) {
      chips.push(`🤔 Nghi #${focusNum} lắm nha!`);
      chips.push(`⚖️ Vote #${focusNum} đi mọi người!`);
    }
    chips.push('Ai có thông tin gì không?');
    chips.push('Tui dân thường nha');
    chips.push('Tiên tri lộ diện đi!');
    chips.push('Vote bỏ qua lượt này?');
    return chips;
  }, [commsTab, canChatWolf, lastFocusSeatId, seatNumber, myRole, view.seerHistory]);

  // Concise Phase Header Label & Instruction
  const headerInstruction = useMemo(() => {
    if (err) return `⚠️ ${err}`;
    if (view.phase === 'hunter_shot') {
      return view.hunterId === me
        ? '🏹 Chạm ô người chơi để bắn kéo theo!'
        : `🏹 Thợ Săn #${seatNumber.get(view.hunterId ?? '') ?? '?'} đang ngắm bắn…`;
    }
    if (view.phase === 'day_vote') {
      const myV = view.dayVotes[me];
      if (!iAlive) return '⚖️ Làng đang bỏ phiếu treo cổ';
      if (myV === 'skip') return '🏳️ Đã bỏ phiếu trắng (chạm ô để đổi)';
      if (myV) return `🗳️ Đã bầu #${seatNumber.get(myV)} (chạm ô khác để đổi)`;
      return 'Chạm vào ô người chơi để bỏ phiếu';
    }
    if (view.phase === 'day_discuss') {
      return '☀️ Thảo luận bên dưới · Ghim nghi vấn trên ô';
    }
    if (view.phase === 'role_reveal') {
      return roleMeta
        ? `🃏 Bạn là ${roleMeta.emoji} ${roleMeta.name} (${roleMeta.teamLabel})`
        : '🃏 Nhận vai trò bí mật trước khi đêm xuống';
    }
    if (view.phase === 'night_cupid') {
      return myRole === 'cupid' && iAlive && !view.myNightSubmitted
        ? '💘 Chạm chọn 2 ô cư dân để ghép đôi'
        : '💘 Thần Tình Yêu đang se duyên…';
    }
    if (view.phase === 'night_witch') {
      if (myRole === 'phuthuy' && iAlive && !view.myNightSubmitted) {
        const vNum = view.witchState?.victimId ? seatNumber.get(view.witchState.victimId) : null;
        return vNum ? `🧪 #${vNum} bị Sói cắn — Cứu hoặc quăng Độc!` : '🧪 Đêm bình yên — dùng Độc hoặc bỏ qua';
      }
      return '🧪 Phù Thủy đang pha chế bình thuốc…';
    }
    // night_active
    if (!iAlive) return '👻 Bạn đã hy sinh — theo dõi ván đấu';
    if (myRole === 'soi') {
      const cur = view.wolfVotes?.[me];
      return cur
        ? `🐾 Đang chọn cắn #${seatNumber.get(cur)} (chạm ô khác để đổi)`
        : '🐾 Chạm mục tiêu để Sói cắn';
    }
    if (view.myNightSubmitted) return '✓ Đã xong kỹ năng đêm — chờ trời sáng…';
    if (myRole === 'tientri') return '🔮 Chạm 1 ô để Tiên Tri soi thân phận';
    if (myRole === 'baove') return '🛡️ Chạm 1 ô để giương khiên bảo vệ';
    if (myRole === 'thamtu') return '🕵️ Chạm 2 ô để điều tra cùng/khác phe';
    return '🌙 Màn đêm buông xuống… hãy giữ im lặng';
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
              ? `${myRole === 'tientri' ? '🔮 Soi' : '🛡️ Bảo vệ'} #${sNum} ${view.names[selected]}?`
              : myRole === 'baove' && view.guardLastId
                ? `🛡️ Chạm 1 ô (trừ #${seatNumber.get(view.guardLastId)} đêm trước)`
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
            {myRole === 'cupid' ? '💘 Ghép đôi: ' : '🕵️ Điều tra: '}
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
                {witchSave ? `💚 Đã cứu #${vNum}` : `💚 Cứu #${vNum}`}
              </T>
            </Pressable>
          ) : (
            <T numberOfLines={1} style={styles.actionStripTxt}>
              {ws?.poisonLeft ? '🧪 Chạm ô để quăng Độc' : '🧪 Hết bình phép'}
            </T>
          )}

          {pNum && (
            <Pressable onPress={() => setWitchPoison(null)} style={styles.witchPillPoisonActive}>
              <T style={styles.witchPillTxt}>☠️ Độc #{pNum} ✕</T>
            </Pressable>
          )}

          <Pressable
            testID="masoi-night-submit"
            disabled={busy}
            onPress={() => void act({ type: 'ms_night', save: witchSave, poison: witchPoison }, true)}
            style={styles.confirmPill}
          >
            <T style={styles.confirmPillTxt}>
              {witchSave || witchPoison ? '✓ Dùng bình' : '⏭️ Bỏ qua'}
            </T>
          </Pressable>
        </View>
      );
    }

    if (view.phase === 'role_reveal' && roleMeta) {
      return (
        <View style={[styles.actionStripNight, { borderColor: roleMeta.color }]}>
          <T numberOfLines={1} style={styles.actionStripTxt}>
            {roleHidden
              ? '🃏 Đã ẩn vai trò trên màn hình'
              : `${roleMeta.emoji} ${roleMeta.name}: ${roleMeta.shortDesc}`}
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
        {/* ZONE 1: COMPACT WOLVESVILLE DAY / NIGHT TOP HEADER (~44px) */}
        <View style={[styles.topHeader, isNight ? styles.topHeaderNight : styles.topHeaderDay]}>
          <View style={styles.topHeaderRow}>
            {/* Phase Pill */}
            <View style={[styles.phasePill, isNight ? styles.phasePillNight : styles.phasePillDay]}>
              <EmojiIcon emoji={isNight ? '🌙' : view.phase === 'hunter_shot' ? '🏹' : '☀️'} size={14} />
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
                err ? { color: '#F87171' } : null,
              ]}
            >
              {headerInstruction}
            </T>

            {/* Live Countdown Seconds */}
            <View
              testID="masoi-timer"
              style={[
                styles.timerBadge,
                secLeft <= 8 && styles.timerBadgeUrgent,
              ]}
            >
              <T style={styles.timerBadgeTxt}>{secLeft}s</T>
            </View>

            {/* Alive Counter */}
            <View style={[styles.aliveBadge, !isNight && styles.aliveBadgeDay]}>
              <T style={[styles.aliveBadgeTxt, !isNight && styles.txtAmberInk]}>
                👤{view.alive.length}/{view.order.length}
              </T>
            </View>

            {/* Contextual 1-Tap Action Pill (Ready / Skip Vote / Skip Shot / Role Peek) */}
            {view.phase === 'day_discuss' && iAlive ? (
              <Pressable
                testID="masoi-ready-btn"
                disabled={busy || myReady}
                onPress={() => void act({ type: 'ms_ready' })}
                style={[styles.headerActBtn, myReady && styles.headerActBtnDone]}
              >
                <T style={styles.headerActBtnTxt}>
                  {myReady ? `✓ ${readyCount}/${needReady}` : `Sẵn sàng ${readyCount}/${needReady}`}
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
                <T style={styles.headerActBtnTxt}>🏳️ Trắng</T>
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
            ) : roleMeta ? (
              <Pressable
                testID="masoi-guide-open"
                onPress={() => setCommsTab((t) => (t === 'role' ? 'village' : 'role'))}
                style={[styles.roleMiniChip, { backgroundColor: roleMeta.color }]}
              >
                <T style={styles.roleMiniChipTxt}>
                  {roleHidden ? '🃏' : roleMeta.emoji}
                </T>
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
                  backgroundColor: secLeft <= 8 ? '#EF4444' : isNight ? '#818CF8' : '#F59E0B',
                },
              ]}
            />
          </View>
        </View>

        {/* MAIN SPLIT: Vertical 3-Zone on Mobile, 2-Column Side-by-Side on Wide Desktop */}
        <View style={[styles.mainBody, wide && styles.mainBodyWide]}>
          {/* ZONE 2: WOLVESVILLE NUMBERED 4-COLUMN VILLAGE GRID */}
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
                      <T style={[styles.seatBadgeTxt, isMePlot && styles.seatBadgeTxtMe]}>
                        #{num}
                      </T>
                    </View>

                    {/* Top-Right Role / Intel / Dead / Lover Badges */}
                    <View style={styles.topRightBadges}>
                      {isLover && (
                        <View style={styles.intelDotLover}>
                          <T style={styles.intelDotEmoji}>💘</T>
                        </View>
                      )}
                      {!alive ? (
                        <View style={styles.intelDotDead}>
                          <T style={styles.intelDotEmoji}>
                            {deadEntry?.revealedRole ? MASOI_ROLES[deadEntry.revealedRole].emoji : '🪦'}
                          </T>
                        </View>
                      ) : isMePlot && roleMeta ? (
                        <View style={[styles.intelDotRole, { backgroundColor: roleMeta.color }]}>
                          <T style={styles.intelDotEmoji}>{roleHidden ? '🃏' : roleMeta.emoji}</T>
                        </View>
                      ) : isWolfAlly ? (
                        <View style={styles.intelDotWolf}>
                          <T style={styles.intelDotEmoji}>🐺</T>
                        </View>
                      ) : seerResult !== undefined ? (
                        <View
                          style={seerResult ? styles.intelDotWolf : styles.intelDotGood}
                        >
                          <T style={styles.intelDotEmoji}>{seerResult ? '🐺' : '🧑'}</T>
                        </View>
                      ) : isWitchVictim ? (
                        <View style={styles.intelDotWolf}>
                          <T style={styles.intelDotEmoji}>🩸</T>
                        </View>
                      ) : isGuarded ? (
                        <View style={styles.intelDotGuard}>
                          <T style={styles.intelDotEmoji}>🛡️</T>
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
                          <T style={styles.intelDotEmoji}>
                            {suspect === 'wolf' ? '❓' : suspect === 'trust' ? '✓' : '🤡'}
                          </T>
                        </Pressable>
                      ) : null}
                    </View>

                    {/* Center Avatar with Gravestone Overlay or Target Ring */}
                    <View
                      style={[
                        styles.plotAvatarWrap,
                        isPicked && styles.plotAvatarTargeted,
                      ]}
                    >
                      {player ? (
                        <View style={!alive ? styles.deadAvatarDim : undefined}>
                          <Portrait p={player} size={avatarSize} border={isPicked ? 2.5 : 1.5} />
                        </View>
                      ) : (
                        <UiIcon
                          name={alive ? 'User' : 'Skull'}
                          size={Math.round(avatarSize * 0.7)}
                          color="#94A3B8"
                        />
                      )}

                      {!alive && (
                        <View pointerEvents="none" style={styles.tombstoneOverlay}>
                          <T style={styles.tombstoneEmoji}>🪦</T>
                        </View>
                      )}

                      {/* Live Vote Tally Pill (🗳️ X) or Wolf Pack Claws (🐾 X) */}
                      {alive && votes > 0 && (
                        <View style={styles.tallyOverlayVote}>
                          <T style={styles.tallyOverlayTxt}>🗳️{votes}</T>
                        </View>
                      )}
                      {alive && wolfClaws > 0 && (
                        <View style={styles.tallyOverlayWolf}>
                          <T style={styles.tallyOverlayTxt}>🐾{wolfClaws}</T>
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
                            ? `${view.names[id] ?? id} ·🏳️`
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

          {/* ZONE 3: ALWAYS-VISIBLE WOLVESVILLE CHAT & VILLAGE LOG (flex: 1, Pinned Input) */}
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
                <T
                  style={[
                    styles.channelTabTxt,
                    commsTab === 'village' &&
                      (isNight ? styles.channelTabTxtActiveNight : styles.channelTabTxtActiveDay),
                  ]}
                >
                  💬 Chat Làng
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
                  <T
                    style={[
                      styles.channelTabTxt,
                      { color: '#F87171' },
                      commsTab === 'wolf' && { color: '#FFFFFF' },
                    ]}
                  >
                    🐺 Kênh Sói ({view.wolfChat.length})
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
                <T
                  style={[
                    styles.channelTabTxt,
                    commsTab === 'role' &&
                      (isNight ? styles.channelTabTxtActiveNight : styles.channelTabTxtActiveDay),
                  ]}
                >
                  📜 Vai & Luật
                </T>
              </Pressable>
            </View>

            {/* TAB 1: UNIFIED VILLAGE CHAT + SYSTEM EVENT BANNERS */}
            {commsTab === 'village' && (
              <View style={styles.chatContentFill}>
                <ScrollView
                  ref={feedScrollRef}
                  style={styles.feedScroll}
                  contentContainerStyle={styles.feedScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  {unifiedVillageFeed.length === 0 ? (
                    <T style={[styles.emptyFeedTxt, !isNight && { color: '#64748B' }]}>
                      Chưa có thông báo. Khi bình minh lên, hãy dùng #SốGhế để suy luận cùng dân làng!
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
                                ? styles.sysBannerDawn
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
                                !isNight && !isDawn && !isHunter && { color: '#334155' },
                              ]}
                            >
                              {isDawn ? '☀️ ' : isHunter ? '🏹 ' : item.log.kind === 'vote' ? '⚖️ ' : '📢 '}
                              [Ngày {item.log.day}] {item.log.text}
                            </T>
                          </View>
                        );
                      }

                      const sNum = seatNumber.get(item.from);
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
                          <T numberOfLines={4} style={isNight ? styles.msgLineNight : styles.msgLineDay}>
                            <T
                              style={[
                                styles.msgAuthor,
                                isMine
                                  ? styles.msgAuthorMe
                                  : isNight
                                    ? styles.msgAuthorNight
                                    : styles.msgAuthorDay,
                              ]}
                            >
                              {sNum ? `#${sNum} ` : ''}
                              {item.name}
                              {senderDead ? '👻' : ''}:{' '}
                            </T>
                            {item.isSticker ? `[Nhãn dán ${item.stickerId}]` : item.text}
                          </T>
                          <T style={styles.msgTime}>{fmtShortTime(item.at)}</T>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {/* 1-Line Quick Wolvesville Deduction Chips */}
                {canChatVillage && (
                  <View style={styles.quickStripWrap}>
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
                  <View style={styles.pinnedStatusRow}>
                    <T style={styles.pinnedStatusTxt}>
                      👻 Bạn đã hy sinh — đang xem làng suy luận
                    </T>
                  </View>
                ) : isNight ? (
                  myRole === 'soi' && view.wolfChat ? (
                    <Pressable
                      onPress={() => setCommsTab('wolf')}
                      style={[styles.pinnedStatusRow, styles.pinnedWolfJump]}
                    >
                      <T style={[styles.pinnedStatusTxt, { color: '#FECACA' }]}>
                        🐺 Đang là ban đêm — chạm mở Kênh Sói để bàn mưu!
                      </T>
                    </Pressable>
                  ) : (
                    <View style={styles.pinnedStatusRow}>
                      <T style={styles.pinnedStatusTxt}>
                        🌙 Ban đêm cả làng giữ im lặng — chờ trời sáng để chat
                      </T>
                    </View>
                  )
                ) : (
                  <View style={styles.pinnedInputRow}>
                    <TextInput
                      testID="masoi-village-input"
                      value={villageInput}
                      onChangeText={setVillageInput}
                      onSubmitEditing={() => void sendVillageChat()}
                      placeholder="Chat suy luận với làng (vd: Nghi #3 là Sói)..."
                      placeholderTextColor="#94A3B8"
                      maxLength={200}
                      returnKeyType="send"
                      style={[styles.chatInput, !isNight && styles.chatInputDay]}
                    />
                    <Pressable
                      testID="masoi-village-send"
                      onPress={() => void sendVillageChat()}
                      style={styles.sendBtn}
                    >
                      <UiIcon name="Send" size={15} color="#0F172A" />
                    </Pressable>
                  </View>
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
                      🐺 Kênh bí mật của bầy Sói! Bàn nhau chọn mồi hoặc giả danh Tiên Tri ngay tại đây.
                    </T>
                  ) : (
                    view.wolfChat.map((m) => (
                      <View key={`wm-${m.id}`} style={styles.wolfMsgRow}>
                        <T style={styles.wolfMsgTxt}>
                          <T style={styles.wolfMsgAuthor}>
                            #{seatNumber.get(m.from) ?? '?'} {m.name}:{' '}
                          </T>
                          {m.text}
                        </T>
                      </View>
                    ))
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
                  <View style={styles.pinnedInputRow}>
                    <TextInput
                      testID="masoi-wolf-chat-input"
                      value={wolfInput}
                      onChangeText={setWolfInput}
                      onSubmitEditing={() => void sendWolfChat()}
                      placeholder="Nhắn mật cho đồng bọn Sói..."
                      placeholderTextColor="#FCA5A5"
                      maxLength={140}
                      returnKeyType="send"
                      style={[styles.chatInput, styles.chatInputWolf]}
                    />
                    <Pressable
                      testID="masoi-wolf-chat-send"
                      onPress={() => void sendWolfChat()}
                      style={[styles.sendBtn, { backgroundColor: '#EF4444' }]}
                    >
                      <UiIcon name="Send" size={15} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.pinnedStatusRow}>
                    <T style={styles.pinnedStatusTxt}>
                      👻 Bạn đã hy sinh — chỉ xem lại mật thư bầy Sói
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
                        style={styles.subtleMiniBtn}
                      >
                        <T style={styles.subtleMiniBtnTxt}>
                          {roleHidden ? 'Hiện huy hiệu' : 'Ẩn huy hiệu'}
                        </T>
                      </Pressable>
                    </View>
                    <T style={[styles.myRoleHow, !isNight && { color: '#1E293B' }]}>
                      {roleMeta.howToPlay}
                    </T>
                    <T style={styles.myRoleWin}>🏆 {roleMeta.winCond}</T>
                    {view.myPartnerId && (
                      <T style={styles.loverLine}>
                        💘 Cặp đôi định mệnh với #{seatNumber.get(view.myPartnerId)}{' '}
                        {view.names[view.myPartnerId]}
                      </T>
                    )}
                  </View>
                )}

                {/* Seer Inspection History */}
                {view.seerHistory && view.seerHistory.length > 0 && (
                  <View style={styles.intelHistoryCard}>
                    <T style={styles.intelHistoryTitle}>🔮 Lịch Sử Tiên Tri Soi</T>
                    {view.seerHistory.map((h, i) => (
                      <T key={`sh-${i}`} style={styles.intelHistoryItem}>
                        • Đêm {h.day}: #{seatNumber.get(h.targetId)} {view.names[h.targetId]} →{' '}
                        {h.isWolf ? '🐺 MA SÓI!' : '🧑 Phe Dân Làng'}
                      </T>
                    ))}
                  </View>
                )}

                {/* Detective History */}
                {view.detectiveHistory && view.detectiveHistory.length > 0 && (
                  <View style={[styles.intelHistoryCard, { borderColor: '#10B981' }]}>
                    <T style={[styles.intelHistoryTitle, { color: '#6EE7B7' }]}>
                      🕵️ Hồ Sơ Thám Tử
                    </T>
                    {view.detectiveHistory.map((h, i) => (
                      <T key={`dh-${i}`} style={styles.intelHistoryItem}>
                        • Đêm {h.day}: #{seatNumber.get(h.a)} & #{seatNumber.get(h.b)} →{' '}
                        {h.sameTeam ? 'CÙNG PHE' : 'KHÁC PHE'}
                      </T>
                    ))}
                  </View>
                )}

                {/* Room Role Deck */}
                <T style={[styles.deckSectionTitle, !isNight && { color: '#475569' }]}>
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
                          <T style={[styles.deckCardName, { color: m.color }]}>
                            {m.emoji} {m.name} {deadCnt > 0 ? `(${remain}/${cnt})` : `×${cnt}`}
                          </T>
                        </View>
                        <T
                          numberOfLines={2}
                          style={[styles.deckCardDesc, !isNight && { color: '#334155' }]}
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
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 4,
    gap: 5,
    borderWidth: 1.5,
  },
  topHeaderNight: {
    backgroundColor: '#111827',
    borderColor: '#4F46E5',
  },
  topHeaderDay: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  phasePillNight: {
    backgroundColor: '#1E1B4B',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  phasePillDay: {
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  phasePillTxt: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: FONT,
  },
  txtLight: {
    color: '#F8FAFC',
  },
  txtAmberInk: {
    color: '#78350F',
  },
  headerHintTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    minWidth: 0,
  },
  headerHintNight: {
    color: '#CBD5E1',
  },
  headerHintDay: {
    color: '#78350F',
  },
  timerBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  timerBadgeUrgent: {
    backgroundColor: '#DC2626',
  },
  timerBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEF08A',
  },
  aliveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
  },
  aliveBadgeDay: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  aliveBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#E2E8F0',
  },
  headerActBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#2563EB',
  },
  headerActBtnSkip: {
    backgroundColor: '#475569',
  },
  headerActBtnDone: {
    backgroundColor: '#059669',
  },
  headerActBtnTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  roleMiniChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleMiniChipTxt: {
    fontSize: 13,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(148, 163, 184, 0.24)',
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

  /* ZONE 2: WOLVESVILLE 4-COLUMN NUMBERED VILLAGE GRID */
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
    width: '23.6%',
    flexGrow: 1,
    maxWidth: '24.6%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 4,
    paddingHorizontal: 3,
    borderRadius: 12,
    borderWidth: 1.5,
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
    borderRadius: 10,
  },
  plotCardNight: {
    backgroundColor: '#162038',
    borderColor: '#2D3F66',
  },
  plotCardDay: {
    backgroundColor: '#FFFDF7',
    borderColor: '#D6D3D1',
  },
  plotCardDeadNight: {
    backgroundColor: '#111625',
    borderColor: '#334155',
    opacity: 0.64,
  },
  plotCardDeadDay: {
    backgroundColor: '#E2E8F0',
    borderColor: '#94A3B8',
    opacity: 0.72,
  },
  plotSuspectWolf: {
    borderColor: '#EF4444',
  },
  plotSuspectTrust: {
    borderColor: '#10B981',
  },
  plotSuspectJester: {
    borderColor: '#EAB308',
  },
  plotCardSelected: {
    borderColor: '#FACC15',
    borderWidth: 2.5,
  },
  plotCardVictim: {
    borderColor: '#F43F5E',
    borderWidth: 2,
  },

  seatBadge: {
    position: 'absolute',
    top: 3,
    left: 3,
    paddingHorizontal: 4.5,
    paddingVertical: 1,
    borderRadius: 6,
    zIndex: 2,
  },
  seatBadgeMe: {
    backgroundColor: '#F59E0B',
  },
  seatBadgeNight: {
    backgroundColor: '#1E293B',
  },
  seatBadgeDay: {
    backgroundColor: '#334155',
  },
  seatBadgeTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  seatBadgeTxtMe: {
    color: '#0F172A',
  },

  topRightBadges: {
    position: 'absolute',
    top: 2,
    right: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    zIndex: 2,
  },
  intelDotRole: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
  },
  intelDotWolf: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: '#991B1B',
  },
  intelDotGood: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: '#065F46',
  },
  intelDotGuard: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: '#0369A1',
  },
  intelDotLover: {
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: '#831843',
  },
  intelDotDead: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: '#334155',
  },
  intelDotSuspect: {
    paddingHorizontal: 3.5,
    paddingVertical: 0.5,
    borderRadius: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
  },
  intelDotEmoji: {
    fontSize: 10,
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
  tombstoneEmoji: {
    fontSize: 16,
  },
  tallyOverlayVote: {
    position: 'absolute',
    bottom: -3,
    right: -8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#FACC15',
  },
  tallyOverlayWolf: {
    position: 'absolute',
    bottom: -3,
    right: -8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: '#991B1B',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tallyOverlayTxt: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FEF08A',
  },

  plotName: {
    fontSize: 10.5,
    fontWeight: '800',
    textAlign: 'center',
    maxWidth: '100%',
    marginTop: 1,
  },
  plotNameNight: {
    color: '#F1F5F9',
  },
  plotNameDay: {
    color: '#1E293B',
  },
  plotNameDead: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },

  /* 1-Line Floating Night Action Bar inside Zone 2 */
  actionStripNight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: '#1E1B4B',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  actionStripTxt: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#E0E7FF',
  },
  confirmPill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 999,
    backgroundColor: '#FACC15',
  },
  confirmPillDisabled: {
    opacity: 0.4,
  },
  confirmPillTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  witchPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  witchPillSaveActive: {
    backgroundColor: '#059669',
  },
  witchPillPoisonActive: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#991B1B',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  witchPillTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtleMiniBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(148, 163, 184, 0.22)',
  },
  subtleMiniBtnTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#CBD5E1',
  },

  /* ZONE 3: ALWAYS-VISIBLE CHAT & VILLAGE LOG (flex: 1) */
  chatZone: {
    flex: 1,
    minHeight: 0,
    borderRadius: 15,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  chatZoneNight: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  chatZoneDay: {
    backgroundColor: '#FFFDF9',
    borderColor: '#CBD5E1',
  },
  channelBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.2)',
  },
  channelBarDay: {
    backgroundColor: '#F1F5F9',
    borderBottomColor: '#E2E8F0',
  },
  channelTab: {
    flex: 1,
    paddingVertical: 4.5,
    paddingHorizontal: 6,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelTabActiveNight: {
    backgroundColor: '#FACC15',
  },
  channelTabActiveDay: {
    backgroundColor: '#0F172A',
  },
  channelTabWolfActive: {
    backgroundColor: '#B91C1C',
  },
  channelTabTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
  },
  channelTabTxtActiveNight: {
    color: '#0F172A',
  },
  channelTabTxtActiveDay: {
    color: '#FFFFFF',
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
    fontWeight: '700',
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 14,
  },

  sysBanner: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 9,
    borderLeftWidth: 3,
  },
  sysBannerDawn: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderLeftColor: '#F59E0B',
  },
  sysBannerHunter: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderLeftColor: '#EF4444',
  },
  sysBannerNight: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderLeftColor: '#818CF8',
  },
  sysBannerDay: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#D97706',
  },
  sysBannerTxt: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FDE68A',
    lineHeight: 16,
  },

  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  msgRowNight: {
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
  },
  msgRowDay: {
    backgroundColor: '#F1F5F9',
  },
  msgRowMineNight: {
    backgroundColor: 'rgba(56, 189, 248, 0.16)',
    borderLeftWidth: 2.5,
    borderLeftColor: '#38BDF8',
  },
  msgRowMineDay: {
    backgroundColor: '#E0F2FE',
    borderLeftWidth: 2.5,
    borderLeftColor: '#0284C7',
  },
  msgLineNight: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#F1F5F9',
    lineHeight: 16,
  },
  msgLineDay: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 16,
  },
  msgAuthor: {
    fontWeight: '900',
  },
  msgAuthorMe: {
    color: '#0284C7',
  },
  msgAuthorNight: {
    color: '#FACC15',
  },
  msgAuthorDay: {
    color: '#B45309',
  },
  msgTime: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#94A3B8',
  },

  quickStripWrap: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.16)',
    paddingVertical: 3.5,
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
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  quickChipNight: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  quickChipTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#78350F',
  },
  quickChipWolf: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
    backgroundColor: 'rgba(185, 28, 28, 0.26)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  quickChipWolfTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FECACA',
  },

  pinnedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  chatInput: {
    flex: 1,
    height: 34,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: '700',
  },
  chatInputDay: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    color: '#0F172A',
  },
  chatInputWolf: {
    backgroundColor: '#2A0A0E',
    borderColor: '#EF4444',
    color: '#FEE2E2',
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },

  pinnedStatusRow: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
  },
  pinnedWolfJump: {
    backgroundColor: 'rgba(153, 27, 27, 0.45)',
  },
  pinnedStatusTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
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
    fontWeight: '800',
    color: '#FECACA',
  },
  emptyWolfTxt: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FCA5A5',
    textAlign: 'center',
    paddingVertical: 14,
  },
  wolfMsgRow: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 9,
    backgroundColor: 'rgba(185, 28, 28, 0.24)',
    borderLeftWidth: 2.5,
    borderLeftColor: '#EF4444',
  },
  wolfMsgTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FEE2E2',
  },
  wolfMsgAuthor: {
    fontWeight: '900',
    color: '#FCA5A5',
  },

  /* ROLE & RULES REFERENCE TAB */
  roleTabContent: {
    padding: 8,
    gap: 7,
  },
  myRoleRefCard: {
    padding: 9,
    borderRadius: 11,
    backgroundColor: 'rgba(30, 41, 59, 0.72)',
    borderWidth: 1.5,
    gap: 4,
  },
  myRoleRefCardDay: {
    backgroundColor: '#F8FAFC',
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
    fontWeight: '900',
    color: '#FFFFFF',
  },
  myRoleHow: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E2E8F0',
    lineHeight: 16,
  },
  myRoleWin: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F59E0B',
  },
  loverLine: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F472B6',
  },

  intelHistoryCard: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
    gap: 2,
  },
  intelHistoryTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#C4B5FD',
  },
  intelHistoryItem: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#F8FAFC',
  },

  deckSectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#94A3B8',
    marginTop: 2,
  },
  deckGrid: {
    gap: 5,
  },
  deckCard: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    gap: 2,
  },
  deckCardDay: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  deckCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deckCardName: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  deckCardDesc: {
    fontSize: 11,
    fontWeight: '600',
    color: '#CBD5E1',
    lineHeight: 15,
  },
});
