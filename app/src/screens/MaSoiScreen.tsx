import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  MASOI_QUICK_CHAT, MASOI_ROLES,
  type MaSoiRole, type MaSoiView,
} from '../../../shared/src/masoi';
import { themeById } from '../../../shared/src/themes';
import type { RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { useStableWindow } from '../hooks';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { Sheet } from '../components/Sheet';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { EmojiIcon, GameIcon, UiIcon, type UiIconName } from '../components/Icons';
import { FlipCard } from '../components/MotionPrimitives';

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

const MARK_META: Record<SuspectMark, { label: string; bg: string; fg: string; border: string }> = {
  none: { label: 'Ghim?', bg: 'rgba(148,163,184,0.16)', fg: '#94A3B8', border: 'rgba(148,163,184,0.35)' },
  wolf: { label: 'Nghi Sói', bg: '#7F1D1D', fg: '#FECACA', border: '#EF4444' },
  trust: { label: 'Tin tưởng', bg: '#064E3B', fg: '#A7F3D0', border: '#10B981' },
  jester: { label: 'Nghi Ngố', bg: '#713F12', fg: '#FEF08A', border: '#FACC15' },
};

const SPEED_LABELS: Record<'slow' | 'normal' | 'fast', string> = {
  slow: 'Thong thả',
  normal: 'Chuẩn',
  fast: 'Nhanh',
};

const PHASE_META: Record<MaSoiView['phase'], { title: string; emoji: string; uiIcon: UiIconName; night: boolean; hint: string }> = {
  role_reveal: { title: 'Nhận Thân Phận Bí Mật', emoji: '🃏', uiIcon: 'Eye', night: true, hint: 'Đọc kỹ cách chơi vai trò của bạn bên dưới trước khi màn đêm bắt đầu!' },
  night_cupid: { title: 'Đêm Se Duyên Định Mệnh', emoji: '💘', uiIcon: 'Heart', night: true, hint: 'Thần Tình Yêu đang chọn 2 cư dân để nối dây tơ hồng...' },
  night_active: { title: 'Đêm Huyết Nguyệt', emoji: '🌙', uiIcon: 'Moon', night: true, hint: 'Ma Sói săn mồi, Tiên Tri soi thấu, Bảo Vệ canh gác, Thám Tử điều tra...' },
  night_witch: { title: 'Canh Ba Phù Thủy', emoji: '🧪', uiIcon: 'Sparkles', night: true, hint: 'Phù Thủy đang cân nhắc bình Thuốc Cứu và Thuốc Độc...' },
  hunter_shot: { title: 'Phát Đạn Phục Hận', emoji: '🏹', uiIcon: 'Swords', night: false, hint: 'Thợ Săn ngã xuống và đang nhắm bắn 1 kẻ phải đi theo!' },
  day_discuss: { title: 'Bình Minh Thảo Luận', emoji: '☀️', uiIcon: 'Sun', night: false, hint: 'Chat trực tiếp ngay bên dưới, đối chiếu phiếu bầu và ghim kẻ tình nghi!' },
  day_vote: { title: 'Phiên Tòa Treo Cổ', emoji: '⚖️', uiIcon: 'ShieldAlert', night: false, hint: 'Chạm chọn 1 avatar đáng nghi để bỏ phiếu treo cổ hoặc bỏ phiếu trắng.' },
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function MaSoiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as MaSoiView;
  const [roleVisible, setRoleVisible] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedTwo, setPickedTwo] = useState<string[]>([]);
  const [witchSave, setWitchSave] = useState(false);
  const [witchPoison, setWitchPoison] = useState<string | null>(null);

  const [commsTab, setCommsTab] = useState<'village' | 'wolf' | 'log'>('village');
  const [villageInput, setVillageInput] = useState('');
  const [wolfInput, setWolfInput] = useState('');
  const [suspectMarks, setSuspectMarks] = useState<Record<string, SuspectMark>>({});
  const [guideOpen, setGuideOpen] = useState(false);
  const [focusGuideRole, setFocusGuideRole] = useState<MaSoiRole | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width } = useStableWindow();
  const wide = width >= 840;

  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const myRole = view.myRole;
  const roleMeta = myRole ? MASOI_ROLES[myRole] : null;
  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const iAlive = aliveSet.has(me);
  const deadMap = useMemo(() => new Map(view.dead.map((d) => [d.id, d])), [view.dead]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const seatNumber = useMemo(() => {
    const m = new Map<string, number>();
    view.order.forEach((id, i) => m.set(id, i + 1));
    return m;
  }, [view.order]);

  // Kết quả Tiên Tri được ghim trực tiếp lên từng avatar cho dễ theo dõi!
  const seerBadgeMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const h of view.seerHistory ?? []) {
      m.set(h.targetId, h.isWolf);
    }
    return m;
  }, [view.seerHistory]);

  // Đếm số lượng từng role đã lộ diện khi chết để theo dõi bộ bài còn lại
  const revealedDeadRoleCounts = useMemo(() => {
    const c: Partial<Record<MaSoiRole, number>> = {};
    for (const d of view.dead) {
      if (d.revealedRole) c[d.revealedRole] = (c[d.revealedRole] ?? 0) + 1;
    }
    return c;
  }, [view.dead]);

  const phaseInfo = PHASE_META[view.phase];
  const isNight = phaseInfo.night;
  const canChatVillage = iAlive && !isNight;

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

  const needsTwo =
    (view.phase === 'night_cupid' && myRole === 'cupid' && !view.myNightSubmitted) ||
    (view.phase === 'night_active' && myRole === 'thamtu' && !view.myNightSubmitted);

  const canSelectOne =
    (view.phase === 'hunter_shot' && view.hunterId === me) ||
    (iAlive &&
      ((view.phase === 'day_vote') ||
        (view.phase === 'night_active' && myRole === 'soi') ||
        (view.phase === 'night_active' && (myRole === 'tientri' || myRole === 'baove') && !view.myNightSubmitted) ||
        (view.phase === 'night_witch' && myRole === 'phuthuy' && !view.myNightSubmitted && !!view.witchState?.poisonLeft)));

  const toggleSuspect = (id: string) => {
    if (id === me) return;
    setSuspectMarks((prev) => {
      const cur = prev[id] ?? 'none';
      return { ...prev, [id]: NEXT_MARK[cur] };
    });
  };

  const onSeatPress = (id: string) => {
    if (!aliveSet.has(id)) return;
    if (needsTwo) {
      setPickedTwo((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 2) return [prev[1], id];
        return [...prev, id];
      });
      setErr(null);
      return;
    }
    if (!canSelectOne) {
      // Khi đang ở pha thảo luận/chờ mà bấm vào người khác: xoay vòng ghim nghi vấn luôn cho tiện!
      if (id !== me) toggleSuspect(id);
      return;
    }
    if (view.phase === 'night_witch' && myRole === 'phuthuy') {
      setWitchPoison((prev) => (prev === id ? null : id));
      setErr(null);
      return;
    }
    if ((view.phase === 'day_vote' || view.phase === 'hunter_shot' || myRole === 'tientri') && id === me) {
      return;
    }
    if (view.phase === 'night_active' && myRole === 'baove' && id === view.guardLastId) {
      setErr('Bảo Vệ không được bảo vệ cùng 1 người 2 đêm liên tiếp!');
      return;
    }
    setSelected((prev) => (prev === id ? null : id));
    setErr(null);
  };

  const act = async (payload: Parameters<Game['act']>[0], resetSelection = false) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) setErr(actionText[res.reason] ?? 'Không thực hiện được');
    else if (resetSelection) {
      setSelected(null);
      setPickedTwo([]);
      setWitchSave(false);
      setWitchPoison(null);
    }
  };

  const sendVillageChat = async (textOverride?: string) => {
    const clean = (textOverride ?? villageInput).trim();
    if (!clean || !canChatVillage) return;
    if (!textOverride) setVillageInput('');
    await game.sendChat(clean);
  };

  const sendWolfChat = async () => {
    const clean = wolfInput.trim();
    if (!clean) return;
    setWolfInput('');
    await act({ type: 'ms_wolfChat', text: clean });
  };

  const openGuideFor = (r: MaSoiRole | null) => {
    setFocusGuideRole(r);
    setGuideOpen(true);
  };

  // Giữ strip của Shell gọn gàng nhưng tắt hiển thị trùng lặp vì bàn Làng đã có lưới Avatar siêu chi tiết!
  const strip: StripOptions = useMemo(() => ({ order: view.order }), [view.order]);

  const renderBottom = () => {
    if (view.phase === 'hunter_shot') {
      if (view.hunterId === me) {
        return (
          <View style={styles.dock}>
            <T style={[styles.dockNote, { color: '#FDBA74' }]}>
              Chọn 1 cư dân trên bàn để bắn kéo theo hoặc cất súng!
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <View style={styles.dockRow}>
              <Button
                testID="masoi-hunter-shoot"
                disabled={!selected || busy}
                icon={selected ? '💥' : undefined}
                title={selected ? `Bắn #${seatNumber.get(selected)} ${view.names[selected]}` : 'Chạm mục tiêu trên bàn'}
                onPress={() => selected && act({ type: 'ms_hunter', target: selected }, true)}
                style={{ flex: 2 }}
              />
              <Button
                testID="masoi-hunter-skip"
                variant="paper"
                disabled={busy}
                title="Cất súng"
                onPress={() => act({ type: 'ms_hunter', target: 'skip' }, true)}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        );
      }
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Thợ Săn {view.names[view.hunterId ?? ''] ?? ''} đang ngắm bắn…</T>;
    }

    if (!iAlive) {
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Bạn đã hy sinh — vẫn xem trọn lịch sử chat & diễn biến của làng!</T>;
    }

    if (view.phase === 'day_discuss') {
      const myReady = view.readySkip.includes(me);
      const aliveCount = view.alive.length;
      const needReady = Math.max(1, Math.ceil(aliveCount / 2));
      return (
        <View style={styles.dock}>
          {err && <T style={styles.err}>{err}</T>}
          <Button
            testID="masoi-ready-btn"
            variant={myReady ? 'jade' : 'ink'}
            disabled={busy || myReady}
            iconNode={<UiIcon name={myReady ? 'CheckCircle2' : 'Zap'} size={17} color={myReady ? '#FFFFFF' : C.gold} />}
            title={
              myReady
                ? `Đã sẵn sàng bỏ phiếu (${view.readySkip.length}/${needReady})`
                : `Chuyển sang Bỏ Phiếu (${view.readySkip.length}/${needReady})`
            }
            onPress={() => act({ type: 'ms_ready' })}
          />
        </View>
      );
    }

    if (view.phase === 'day_vote') {
      const myVote = view.dayVotes[me];
      const votedLabel = myVote === 'skip'
        ? 'Đang bỏ phiếu trắng'
        : myVote
          ? `Đang bầu treo cổ: #${seatNumber.get(myVote)} ${view.names[myVote]}`
          : null;
      return (
        <View style={styles.dock}>
          {votedLabel && <T style={[styles.dockNote, { color: '#6EE7B7' }]}>{votedLabel} (đổi được trước khi hết giờ)</T>}
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.dockRow}>
            <Button
              testID="masoi-vote-btn"
              disabled={!selected || busy}
              icon={selected ? '⚖️' : undefined}
              title={selected ? `Treo cổ #${seatNumber.get(selected)} ${view.names[selected]}` : 'Chạm avatar ở trên để vote'}
              onPress={() => selected && act({ type: 'ms_vote', target: selected }, true)}
              style={{ flex: 2 }}
            />
            <Button
              testID="masoi-skip-vote"
              variant="paper"
              disabled={busy}
              icon="🏳️"
              title="Phiếu trắng"
              onPress={() => act({ type: 'ms_vote', target: 'skip' }, true)}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    }

    if (view.phase === 'night_cupid' && myRole === 'cupid' && !view.myNightSubmitted) {
      return (
        <View style={styles.dock}>
          <T style={styles.dockNote}>
            Đã chọn: {pickedTwo.map((id) => `#${seatNumber.get(id)} ${view.names[id]}`).join(' & ') || 'Chạm chọn 2 người trên bàn'}
          </T>
          {err && <T style={styles.err}>{err}</T>}
          <Button
            testID="masoi-night-submit"
            disabled={pickedTwo.length !== 2 || busy}
            icon="💘"
            title="Ghép Đôi Định Mệnh"
            onPress={() => act({ type: 'ms_night', target: pickedTwo[0], target2: pickedTwo[1] }, true)}
          />
        </View>
      );
    }

    if (view.phase === 'night_active') {
      if (myRole === 'soi') {
        const currentTarget = view.wolfVotes?.[me];
        return (
          <View style={styles.dock}>
            <T style={[styles.dockNote, { color: '#FCA5A5' }]}>
              {currentTarget
                ? `Đang chốt cắn: #${seatNumber.get(currentTarget)} ${view.names[currentTarget]} (chạm người khác để đổi)`
                : 'Chọn 1 nạn nhân trên bàn để cả bầy Sói tấn công'}
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={!selected || busy}
              icon={selected ? '🩸' : undefined}
              title={selected ? `Cắn #${seatNumber.get(selected)} ${view.names[selected]}` : 'Chạm mục tiêu trên bàn'}
              onPress={() => selected && act({ type: 'ms_night', target: selected }, true)}
            />
          </View>
        );
      }

      if ((myRole === 'tientri' || myRole === 'baove') && !view.myNightSubmitted) {
        const label = myRole === 'tientri' ? 'Soi thân phận' : 'Giương khiên bảo vệ';
        return (
          <View style={styles.dock}>
            {myRole === 'baove' && view.guardLastId && (
              <T style={styles.dockNote}>Không được bảo vệ lại #{seatNumber.get(view.guardLastId)} {view.names[view.guardLastId]}</T>
            )}
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={!selected || busy}
              icon={myRole === 'tientri' ? '🔮' : '🛡️'}
              title={selected ? `${label}: #${seatNumber.get(selected)} ${view.names[selected]}` : 'Chạm 1 cư dân trên bàn'}
              onPress={() => selected && act({ type: 'ms_night', target: selected }, true)}
            />
          </View>
        );
      }

      if (myRole === 'thamtu' && !view.myNightSubmitted) {
        return (
          <View style={styles.dock}>
            <T style={styles.dockNote}>
              Đối chiếu 2 người: {pickedTwo.map((id) => `#${seatNumber.get(id)} ${view.names[id]}`).join(' & ') || 'Chạm chọn 2 avatar'}
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={pickedTwo.length !== 2 || busy}
              icon="🕵️"
              title="Điều Tra Cùng Phe / Khác Phe"
              onPress={() => act({ type: 'ms_night', target: pickedTwo[0], target2: pickedTwo[1] }, true)}
            />
          </View>
        );
      }

      if (view.myNightSubmitted) {
        return <T style={[styles.waitNote, { color: theme.onBg }]}>Đã thực hiện xong kỹ năng đêm nay — chờ bình minh hé rạng…</T>;
      }
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Đêm khuya thanh vắng… Bạn có thể xem lại Lịch sử chat & Ghim nghi vấn!</T>;
    }

    if (view.phase === 'night_witch' && myRole === 'phuthuy' && !view.myNightSubmitted) {
      const ws = view.witchState;
      const victimName = ws?.victimId ? `#${seatNumber.get(ws.victimId)} ${view.names[ws.victimId]}` : null;
      return (
        <View style={styles.dock}>
          <T style={[styles.dockNote, { color: theme.onBg }]}>
            {victimName ? `Đêm nay Sói vừa cắn ${victimName}!` : 'Đêm nay không ai bị Sói cắn.'}
          </T>
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.dockRow}>
            {ws?.healLeft && ws?.victimId && (
              <Button
                testID="masoi-witch-save"
                variant={witchSave ? 'jade' : 'paper'}
                icon="💚"
                title={witchSave ? 'Đã bật Bình Cứu!' : 'Dùng Bình Cứu'}
                onPress={() => setWitchSave((v) => !v)}
                style={{ flex: 1 }}
              />
            )}
            <Button
              testID="masoi-night-submit"
              disabled={busy}
              icon={witchPoison ? '☠️' : witchSave ? '💚' : '⏭️'}
              title={witchPoison ? `Độc ${view.names[witchPoison]} & Xong` : witchSave ? 'Cứu & Kết thúc đêm' : 'Không dùng bình'}
              onPress={() => act({ type: 'ms_night', save: witchSave, poison: witchPoison }, true)}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      );
    }

    return <T style={[styles.waitNote, { color: theme.onBg }]}>{phaseInfo.hint}</T>;
  };

  const deckEntries = useMemo(
    () => Object.entries(view.roleCounts) as [MaSoiRole, number][],
    [view.roleCounts],
  );

  return (
    <Shell game={game} room={room} strip={strip} hideStrip wide={wide} bottom={renderBottom()}>
      {/* 1. Banner Pha Đêm Huyết Nguyệt / Bình Minh Vàng + Thanh Bộ Bài & Cẩm Nang Vai Trò */}
      <View style={[styles.phaseBanner, sticker(3), isNight ? styles.nightBanner : styles.dayBanner]}>
        <View style={styles.phaseHead}>
          <View style={[styles.phaseIconWrap, { backgroundColor: isNight ? 'rgba(239,68,68,0.24)' : '#FDE68A' }]}>
            <EmojiIcon emoji={phaseInfo.emoji} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={[styles.phaseTitle, isNight && { color: '#F8FAFC' }]}>
              {phaseInfo.title} · Ngày {view.day}
            </T>
            <T style={[styles.phaseSubMeta, isNight && { color: '#94A3B8' }]}>
              Sống {view.alive.length}/{view.order.length} · Nhịp {SPEED_LABELS[view.speed ?? 'normal']}
            </T>
          </View>
          <Pressable
            testID="masoi-guide-open"
            onPress={() => openGuideFor(myRole)}
            style={[styles.guideBtn, isNight && styles.guideBtnNight]}
          >
            <UiIcon name="BookOpen" size={14} color={isNight ? '#FDE047' : '#92400E'} />
            <T style={[styles.guideBtnTxt, isNight && { color: '#FDE047' }]}>Sổ Tay Vai</T>
          </Pressable>
        </View>

        <T style={[styles.phaseHint, isNight && { color: '#CBD5E1' }]}>{phaseInfo.hint}</T>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="masoi-timer" lightText={isNight} />

        {/* Thanh Theo Dõi Bộ Vai Trò Trong Ván (bấm vào role bất kỳ để đọc chi tiết cách hoạt động!) */}
        <View style={styles.deckRow}>
          {deckEntries.map(([r, totalCnt]) => {
            const m = MASOI_ROLES[r];
            const deadCnt = revealedDeadRoleCounts[r] ?? 0;
            const remain = Math.max(0, totalCnt - deadCnt);
            return (
              <Pressable
                key={r}
                testID={`masoi-deck-${r}`}
                onPress={() => openGuideFor(r)}
                style={[
                  styles.deckChip,
                  isNight && styles.deckChipNight,
                  remain === 0 && { opacity: 0.45 },
                ]}
              >
                <View style={[styles.deckRoleDot, { backgroundColor: m.color }]}>
                  <GameIcon name={ROLE_GAME_ICON[r]} size={11} color="#FFFFFF" />
                </View>
                <T style={[styles.deckChipTxt, isNight && { color: '#F1F5F9' }]}>
                  {m.name} {deadCnt > 0 ? `${remain}/${totalCnt}` : `×${totalCnt}`}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Bố cục 2 cột trên màn rộng hoặc xếp dọc gọn gàng trên điện thoại */}
      <View style={wide ? styles.splitWrap : styles.stackWrap}>
        {/* CỘT TRÁI: Thẻ Vai Trò + Bàn Ghế Làng Có Ghim Theo Dõi */}
        <View style={wide ? styles.leftCol : styles.fullCol}>
          <FlipCard flipped={!roleVisible}>
            <Pressable
              testID="masoi-role-card"
              onPress={() => setRoleVisible((v) => !v)}
              style={[styles.roleCard, sticker(3), isNight && styles.roleCardNight]}
            >
              {roleVisible && roleMeta && myRole ? (
                <View style={{ gap: 7 }}>
                  <View style={styles.roleTop}>
                    <View style={[styles.rolePill, { backgroundColor: roleMeta.color }]}>
                      <GameIcon name={ROLE_GAME_ICON[myRole]} size={18} color="#FFFFFF" />
                      <T style={styles.rolePillTxt}>
                        {roleMeta.name} · {roleMeta.teamLabel}
                      </T>
                    </View>
                    <View style={styles.hideHintRow}>
                      <UiIcon name="EyeOff" size={13} color={isNight ? '#94A3B8' : C.muted} />
                      <T style={[styles.tapHide, isNight && { color: '#94A3B8' }]}>Úp thẻ</T>
                    </View>
                  </View>
                  <T style={[styles.roleDesc, isNight && { color: '#F8FAFC' }]}>{roleMeta.shortDesc}</T>
                  <View style={[styles.roleHowBox, isNight && styles.roleHowBoxNight]}>
                    <T style={[styles.roleHowTxt, isNight && { color: '#CBD5E1' }]}>
                      💡 {roleMeta.howToPlay}
                    </T>
                  </View>
                  {view.myPartnerId && (
                    <View style={styles.secretRow}>
                      <UiIcon name="Heart" size={14} color="#F472B6" />
                      <T style={styles.loverInfo}>
                        Cặp đôi định mệnh với #{seatNumber.get(view.myPartnerId)} {view.names[view.myPartnerId]}
                      </T>
                    </View>
                  )}
                  {view.wolfPackIds && view.wolfPackIds.length > 0 && (
                    <View style={styles.secretRow}>
                      <GameIcon name="wolf-head" size={15} color="#F87171" />
                      <T style={styles.wolfInfo}>
                        Bầy Sói: {view.wolfPackIds.map((id) => `#${seatNumber.get(id)} ${view.names[id]}`).join(', ')}
                      </T>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.hiddenRole}>
                  <EmojiIcon emoji="🃏" size={26} />
                  <T style={[styles.hiddenTitle, isNight && { color: '#F8FAFC' }]}>Thẻ Vai Trò Đang Úp Kín</T>
                  <T style={[styles.tapHide, isNight && { color: '#94A3B8' }]}>Chạm để lật xem vai trò & hướng dẫn</T>
                </View>
              )}
            </Pressable>
          </FlipCard>

          {/* Lưới 4–12 Cư Dân Làng Với Đầy Đủ Huy Hiệu Track Avatar */}
          <View style={styles.grid}>
            {view.order.map((id) => {
              const num = seatNumber.get(id) ?? 0;
              const player = playerMap.get(id);
              const alive = aliveSet.has(id);
              const deadEntry = deadMap.get(id);
              const isPicked = selected === id || pickedTwo.includes(id) || witchPoison === id;
              const isWolfAlly = view.wolfPackIds?.includes(id);
              const isPartner = view.myPartnerId === id;
              const votes = dayTally[id] ?? 0;
              const wolfMark = wolfTally[id] ?? 0;
              const votedWho = view.dayVotes[id];
              const guardLocked = view.phase === 'night_active' && myRole === 'baove' && id === view.guardLastId;
              const guardActive = view.guardCurrentTargetId === id;
              const seerResult = seerBadgeMap.has(id) ? seerBadgeMap.get(id) : undefined;
              const suspect = suspectMarks[id] ?? 'none';
              const markInfo = MARK_META[suspect];

              return (
                <Pressable
                  key={id}
                  testID={`masoi-seat-${id}`}
                  onPress={() => onSeatPress(id)}
                  style={[
                    styles.seat,
                    { flexBasis: wide ? '23.5%' : '31.5%' },
                    isNight && styles.seatNight,
                    !alive && styles.seatDead,
                    suspect === 'wolf' && alive && styles.seatSuspectWolf,
                    suspect === 'trust' && alive && styles.seatSuspectTrust,
                    isPicked && styles.seatPicked,
                    guardLocked && { opacity: 0.55 },
                  ]}
                >
                  {/* Số ghế #1..#12 góc trên trái */}
                  <View style={[styles.seatNumPill, id === me && { backgroundColor: '#FACC15' }]}>
                    <T style={[styles.seatNumTxt, id === me && { color: '#0F172A' }]}>#{num}</T>
                  </View>

                  {/* Nút Ghim Nghi Vấn cá nhân góc trên phải */}
                  {id !== me && alive && (
                    <Pressable
                      testID={`masoi-note-${id}`}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleSuspect(id);
                      }}
                      hitSlop={6}
                      style={[styles.notePin, { backgroundColor: markInfo.bg, borderColor: markInfo.border }]}
                    >
                      <T style={[styles.notePinTxt, { color: markInfo.fg }]}>{markInfo.label}</T>
                    </Pressable>
                  )}

                  {/* Huy hiệu bí mật (Cặp đôi / Đồng bọn Sói / Kết quả Tiên Tri / Khiên Bảo Vệ) */}
                  <View style={styles.avatarWrap}>
                    {player ? (
                      <Portrait p={player} size={48} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
                    ) : (
                      <UiIcon name={alive ? 'User' : 'Skull'} size={30} color={alive ? C.muted : '#94A3B8'} />
                    )}
                    {isPartner && (
                      <View style={styles.badgeBottomLeft}>
                        <EmojiIcon emoji="💘" size={14} />
                      </View>
                    )}
                    {isWolfAlly && (
                      <View style={styles.badgeBottomRight}>
                        <GameIcon name="wolf-head" size={14} color="#FFFFFF" />
                      </View>
                    )}
                    {guardActive && (
                      <View style={[styles.badgeBottomRight, { backgroundColor: '#0284C7' }]}>
                        <UiIcon name="Shield" size={12} color="#FFFFFF" />
                      </View>
                    )}
                  </View>

                  <NameText
                    fx={player?.cosmetics?.nameFx}
                    numberOfLines={1}
                    style={[styles.seatName, isNight && { color: '#F1F5F9' }, !alive && styles.deadName]}
                  >
                    {view.names[id] ?? id}
                  </NameText>

                  {/* Kết quả Tiên Tri ghim thẳng dưới tên */}
                  {seerResult !== undefined && alive && (
                    <View style={[styles.intelPill, { backgroundColor: seerResult ? '#991B1B' : '#065F46' }]}>
                      <T style={styles.intelPillTxt}>{seerResult ? '🔮 LÀ SÓI!' : '🔮 PHE DÂN'}</T>
                    </View>
                  )}

                  {/* Trạng thái Sống / Chết / Số phiếu / Đã vote ai */}
                  {!alive ? (
                    <View style={styles.deadRow}>
                      <GameIcon
                        name={deadEntry?.revealedRole ? ROLE_GAME_ICON[deadEntry.revealedRole] : 'tombstone'}
                        size={12}
                        color="#FCA5A5"
                      />
                      <T style={styles.deadTag} numberOfLines={1}>
                        {deadEntry?.revealedRole ? MASOI_ROLES[deadEntry.revealedRole].name : 'Đã mất'}
                      </T>
                    </View>
                  ) : votes > 0 ? (
                    <View style={styles.votePill}>
                      <EmojiIcon emoji="⚖️" size={11} />
                      <T style={styles.votePillTxt}>{votes} phiếu</T>
                    </View>
                  ) : wolfMark > 0 ? (
                    <View style={[styles.votePill, { backgroundColor: '#991B1B' }]}>
                      <EmojiIcon emoji="🩸" size={11} />
                      <T style={styles.votePillTxt}>{wolfMark} Sói</T>
                    </View>
                  ) : view.phase === 'day_vote' && votedWho ? (
                    <T style={styles.votedWhoTxt} numberOfLines={1}>
                      {votedWho === 'skip' ? '🏳️ Phiếu trắng' : `👉 Bầu #${seatNumber.get(votedWho)}`}
                    </T>
                  ) : view.phase === 'day_discuss' && view.readySkip.includes(id) ? (
                    <T style={styles.readyTxt}>✓ Xong thảo luận</T>
                  ) : guardLocked ? (
                    <T style={styles.lockTag}>🛡️ Đêm trước</T>
                  ) : id === me ? (
                    <T style={[styles.meTag, isNight && { color: '#FDE047' }]}>★ Bạn</T>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* CỘT PHẢI (hoặc phần dưới trên Mobile): TRUNG TÂM CHAT LÀNG, KÊNH SÓI & LỊCH SỬ TRỌN VẸN */}
        <View style={wide ? styles.rightCol : styles.fullCol} testID="masoi-comms-card">
          <Card style={[styles.commsCard, isNight && styles.darkInfoCard]}>
            {/* Thanh chuyển Tab Chat Làng / Kênh Sói / Nhật Ký Ván */}
            <View style={styles.tabBar}>
              <Pressable
                testID="masoi-tab-village"
                onPress={() => setCommsTab('village')}
                style={[styles.tabBtn, commsTab === 'village' && styles.tabBtnActive]}
              >
                <EmojiIcon emoji="💬" size={14} />
                <T style={[styles.tabBtnTxt, commsTab === 'village' && styles.tabBtnTxtActive]}>
                  Chat Làng ({game.chat.length})
                </T>
              </Pressable>

              {myRole === 'soi' && view.wolfChat && (
                <Pressable
                  testID="masoi-tab-wolf"
                  onPress={() => setCommsTab('wolf')}
                  style={[styles.tabBtn, commsTab === 'wolf' && styles.tabBtnWolfActive]}
                >
                  <GameIcon name="wolf-head" size={14} color={commsTab === 'wolf' ? '#FFFFFF' : '#F87171'} />
                  <T style={[styles.tabBtnTxt, { color: '#F87171' }, commsTab === 'wolf' && { color: '#FFFFFF' }]}>
                    Kênh Sói ({view.wolfChat.length})
                  </T>
                </Pressable>
              )}

              <Pressable
                testID="masoi-tab-log"
                onPress={() => setCommsTab('log')}
                style={[styles.tabBtn, commsTab === 'log' && styles.tabBtnActive]}
              >
                <EmojiIcon emoji="📜" size={14} />
                <T style={[styles.tabBtnTxt, commsTab === 'log' && styles.tabBtnTxtActive]}>
                  Nhật Ký ({view.publicLog.length})
                </T>
              </Pressable>
            </View>

            {/* NỘI DUNG TAB 1: CHAT LÀNG TRỰC TIẾP + CÂU HỎI NHANH + LỊCH SỬ CUỘN */}
            {commsTab === 'village' && (
              <View style={{ gap: 8 }}>
                <ScrollView style={styles.historyScroll} nestedScrollEnabled>
                  {game.chat.length === 0 ? (
                    <T style={[styles.emptyChatTxt, isNight && { color: '#94A3B8' }]}>
                      Chưa có tin nhắn nào. Khi trời sáng, cả làng chat tranh luận trực tiếp ngay tại đây!
                    </T>
                  ) : (
                    game.chat.map((m) => {
                      const sNum = seatNumber.get(m.from);
                      const isDeadSender = !aliveSet.has(m.from);
                      return (
                        <View key={m.id} style={[styles.chatRow, m.from === me && styles.chatRowMine]}>
                          <View style={styles.chatHeader}>
                            <T style={[styles.chatSender, isNight && { color: '#FDE047' }]}>
                              {sNum ? `#${sNum} ` : ''}{m.name}{isDeadSender ? ' (👻)' : ''}
                            </T>
                            <T style={styles.chatTime}>{fmtTime(m.at)}</T>
                          </View>
                          <T style={[styles.chatBody, isNight && { color: '#F1F5F9' }]}>
                            {m.kind === 'sticker' ? `[Nhãn dán ${m.stickerId}]` : m.text}
                          </T>
                        </View>
                      );
                    })
                  )}
                </ScrollView>

                {canChatVillage ? (
                  <>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                      {MASOI_QUICK_CHAT.map((q, idx) => (
                        <Pressable
                          key={idx}
                          testID={`masoi-quick-${idx}`}
                          onPress={() => void sendVillageChat(q)}
                          style={styles.quickChip}
                        >
                          <T style={styles.quickChipTxt}>{q}</T>
                        </Pressable>
                      ))}
                    </ScrollView>
                    <View style={styles.inputRow}>
                      <TextInput
                        testID="masoi-village-input"
                        value={villageInput}
                        onChangeText={setVillageInput}
                        onSubmitEditing={() => void sendVillageChat()}
                        placeholder="Nhập lập luận của bạn cho cả làng..."
                        placeholderTextColor="#94A3B8"
                        maxLength={200}
                        style={[styles.chatInput, isNight && styles.chatInputDark]}
                      />
                      <Button testID="masoi-village-send" small title="Gửi" onPress={() => void sendVillageChat()} />
                    </View>
                  </>
                ) : (
                  <View style={styles.lockedChatNote}>
                    <T style={styles.lockedChatTxt}>
                      {!iAlive
                        ? '👻 Người đã hy sinh giữ im lặng để đảm bảo công bằng — bạn vẫn xem trọn lịch sử chat!'
                        : '🌙 Ban đêm cả làng giữ im lặng (Sói dùng tab Kênh Sói) — chờ trời sáng để tranh luận tiếp!'}
                    </T>
                  </View>
                )}
              </View>
            )}

            {/* NỘI DUNG TAB 2: KÊNH RADIO BÍ MẬT BẦY SÓI */}
            {commsTab === 'wolf' && myRole === 'soi' && view.wolfChat && (
              <View style={{ gap: 8 }}>
                <ScrollView style={styles.historyScroll} nestedScrollEnabled>
                  {view.wolfChat.length === 0 ? (
                    <T style={{ color: '#FCA5A5', fontSize: 12.5, fontWeight: '700' }}>
                      Chưa có mật thư Sói… Bàn nhau cắn ai hoặc thống nhất kịch bản giả danh đi!
                    </T>
                  ) : (
                    view.wolfChat.map((m) => (
                      <View key={m.id} style={styles.wolfMsgBox}>
                        <T style={styles.wolfMsg}>
                          <T style={{ fontWeight: '900', color: '#FCA5A5' }}>
                            #{seatNumber.get(m.from) ?? '?'} {m.name}:{' '}
                          </T>
                          {m.text}
                        </T>
                      </View>
                    ))
                  )}
                </ScrollView>
                {iAlive && (
                  <View style={styles.inputRow}>
                    <TextInput
                      testID="masoi-wolf-chat-input"
                      value={wolfInput}
                      onChangeText={setWolfInput}
                      onSubmitEditing={() => void sendWolfChat()}
                      placeholder="Nhắn bí mật cho bầy Sói..."
                      placeholderTextColor="#94A3B8"
                      maxLength={120}
                      style={[styles.chatInput, styles.chatInputDark, { borderColor: '#EF4444' }]}
                    />
                    <Button testID="masoi-wolf-chat-send" small title="Gửi" onPress={() => void sendWolfChat()} />
                  </View>
                )}
              </View>
            )}

            {/* NỘI DUNG TAB 3: NHẬT KÝ SỰ KIỆN ĐẦY ĐỦ + HỒ SƠ TIÊN TRI / THÁM TỬ */}
            {commsTab === 'log' && (
              <ScrollView style={styles.historyScroll} nestedScrollEnabled>
                {view.seerHistory && view.seerHistory.length > 0 && (
                  <View style={styles.privateLogBox}>
                    <T style={styles.privateLogTitle}>🔮 Sổ Tay Tiên Tri Của Bạn</T>
                    {view.seerHistory.map((h, i) => (
                      <T key={i} style={styles.privateLogLine}>
                        • Đêm {h.day}: #{seatNumber.get(h.targetId)} {view.names[h.targetId]} →{' '}
                        {h.isWolf ? '🐺 CHÍNH LÀ MA SÓI!' : '🧑‍🌾 Phe Dân Làng'}
                      </T>
                    ))}
                  </View>
                )}
                {view.detectiveHistory && view.detectiveHistory.length > 0 && (
                  <View style={[styles.privateLogBox, { borderColor: '#10B981' }]}>
                    <T style={[styles.privateLogTitle, { color: '#6EE7B7' }]}>🕵️ Hồ Sơ Thám Tử Của Bạn</T>
                    {view.detectiveHistory.map((h, i) => (
                      <T key={i} style={styles.privateLogLine}>
                        • Đêm {h.day}: #{seatNumber.get(h.a)} {view.names[h.a]} & #{seatNumber.get(h.b)} {view.names[h.b]} →{' '}
                        {h.sameTeam ? 'CÙNG PHE' : 'KHÁC PHE'}
                      </T>
                    ))}
                  </View>
                )}
                <View style={{ gap: 6 }}>
                  {[...view.publicLog].reverse().map((entry) => (
                    <View key={entry.id} style={[styles.logItemRow, isNight && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                      <T style={styles.logDayPill}>Ngày {entry.day}</T>
                      <T style={[styles.logLine, isNight && { color: '#E2E8F0' }]}>{entry.text}</T>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </Card>
        </View>
      </View>

      {/* SỔ TAY CẨM NANG VAI TRÒ CHI TIẾT */}
      {guideOpen && (
        <Sheet onClose={() => setGuideOpen(false)} title="📖 Cẩm Nang Vai Trò Ma Sói">
          <View style={{ gap: 10 }}>
            <T style={{ fontSize: 12.5, color: C.muted, fontWeight: '700' }}>
              Danh sách các vai trò xuất hiện trong ván ({view.order.length} người chơi) — chạm để nắm rõ kỹ năng & mẹo suy luận:
            </T>
            {deckEntries.map(([r, cnt]) => {
              const m = MASOI_ROLES[r];
              const highlighted = focusGuideRole === r;
              return (
                <View
                  key={r}
                  style={[
                    styles.guideRoleCard,
                    highlighted && { borderColor: m.color, borderWidth: 2.5, backgroundColor: '#FFFBEB' },
                  ]}
                >
                  <View style={styles.guideRoleHead}>
                    <View style={[styles.rolePill, { backgroundColor: m.color }]}>
                      <GameIcon name={ROLE_GAME_ICON[r]} size={16} color="#FFFFFF" />
                      <T style={styles.rolePillTxt}>
                        {m.name} ×{cnt}
                      </T>
                    </View>
                    <T style={[styles.guideTeamTag, { color: m.color }]}>{m.teamLabel}</T>
                  </View>
                  <T style={styles.guideLine}><T style={styles.guideBold}>Cách hoạt động: </T>{m.howToPlay}</T>
                  <T style={styles.guideLine}><T style={styles.guideBold}>Điều kiện thắng: </T>{m.winCond}</T>
                  <T style={styles.guideTip}>💡 Mẹo: {m.tips}</T>
                </View>
              );
            })}
          </View>
        </Sheet>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  phaseBanner: { borderRadius: 20, padding: 12, gap: 7 },
  nightBanner: { backgroundColor: '#111633', borderColor: '#6366F1' },
  dayBanner: { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseIconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  phaseTitle: { fontSize: 15.5, fontWeight: '900', fontFamily: FONT, color: C.ink },
  phaseSubMeta: { fontSize: 11.5, fontWeight: '800', color: '#78350F' },
  guideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FDE68A',
    borderWidth: 1.5,
    borderColor: '#D97706',
  },
  guideBtnNight: { backgroundColor: 'rgba(250, 204, 21, 0.16)', borderColor: '#FACC15' },
  guideBtnTxt: { fontSize: 11.5, fontWeight: '900', color: '#92400E' },
  phaseHint: { fontSize: 12, fontWeight: '700', color: '#78350F' },

  deckRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  deckChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    backgroundColor: '#FFFFFF',
  },
  deckChipNight: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' },
  deckRoleDot: { width: 18, height: 18, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  deckChipTxt: { fontSize: 11, fontWeight: '800', color: C.ink },

  splitWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stackWrap: { gap: 10 },
  leftCol: { flex: 1.15, gap: 10 },
  rightCol: { flex: 0.95, gap: 10 },
  fullCol: { gap: 10 },

  roleCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 13, gap: 8 },
  roleCardNight: { backgroundColor: '#192242', borderColor: '#4F46E5' },
  roleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 999 },
  rolePillTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 12.5 },
  hideHintRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tapHide: { fontSize: 11, fontWeight: '700', color: C.muted },
  roleDesc: { fontSize: 13, fontWeight: '800', color: C.ink },
  roleHowBox: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 8, borderWidth: 1, borderColor: '#FDE68A' },
  roleHowBoxNight: { backgroundColor: 'rgba(15,23,42,0.55)', borderColor: 'rgba(148,163,184,0.24)' },
  roleHowTxt: { fontSize: 11.5, fontWeight: '700', color: '#78350F', lineHeight: 16 },
  secretRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loverInfo: { fontSize: 12.5, fontWeight: '800', color: '#F472B6' },
  wolfInfo: { fontSize: 12.5, fontWeight: '800', color: '#F87171' },
  hiddenRole: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  hiddenTitle: { fontSize: 15, fontWeight: '900', color: C.ink },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1,
    minWidth: 96,
    maxWidth: '48.5%',
    alignItems: 'center',
    gap: 4,
    paddingTop: 24,
    paddingBottom: 9,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(15,23,42,0.15)',
    position: 'relative',
  },
  seatNight: { backgroundColor: '#161E3B', borderColor: 'rgba(148,163,184,0.28)' },
  seatDead: { opacity: 0.56, backgroundColor: '#334155', borderColor: '#64748B' },
  seatSuspectWolf: { borderColor: '#EF4444', backgroundColor: 'rgba(127, 29, 29, 0.16)' },
  seatSuspectTrust: { borderColor: '#10B981', backgroundColor: 'rgba(6, 78, 59, 0.14)' },
  seatPicked: { borderColor: '#FACC15', borderWidth: 3, transform: [{ translateY: -2 }] },

  seatNumPill: {
    position: 'absolute',
    top: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  seatNumTxt: { fontSize: 10, fontWeight: '900', color: '#F8FAFC' },

  notePin: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  notePinTxt: { fontSize: 9.5, fontWeight: '900' },

  avatarWrap: { position: 'relative', marginVertical: 2 },
  badgeBottomLeft: {
    position: 'absolute',
    bottom: -2,
    left: -4,
    backgroundColor: '#831843',
    borderRadius: 999,
    padding: 2,
  },
  badgeBottomRight: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#B91C1C',
    borderRadius: 999,
    padding: 3,
  },

  seatName: { fontSize: 12.5, fontWeight: '900', color: C.ink, textAlign: 'center', maxWidth: '100%' },
  deadName: { textDecorationLine: 'line-through', color: '#CBD5E1' },
  intelPill: { paddingHorizontal: 7, paddingVertical: 1.5, borderRadius: 999 },
  intelPillTxt: { fontSize: 9.5, fontWeight: '900', color: '#FFFFFF' },
  deadRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deadTag: { fontSize: 10.5, fontWeight: '800', color: '#FCA5A5' },
  votePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.ink },
  votePillTxt: { color: '#FACC15', fontSize: 10.5, fontWeight: '900' },
  votedWhoTxt: { fontSize: 10, fontWeight: '800', color: '#38BDF8' },
  readyTxt: { fontSize: 10, fontWeight: '800', color: '#22C55E' },
  lockTag: { fontSize: 10, fontWeight: '800', color: '#FBBF24' },
  meTag: { fontSize: 10.5, fontWeight: '900', color: C.jade },

  commsCard: { padding: 11, gap: 9 },
  darkInfoCard: { backgroundColor: '#151D38', borderColor: 'rgba(129, 140, 248, 0.35)' },
  tabBar: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tabBtn: {
    flex: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(148,163,184,0.14)',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabBtnActive: { backgroundColor: '#FACC15', borderColor: '#CA8A04' },
  tabBtnWolfActive: { backgroundColor: '#B91C1C', borderColor: '#F87171' },
  tabBtnTxt: { fontSize: 11.5, fontWeight: '900', color: '#94A3B8' },
  tabBtnTxtActive: { color: '#0F172A' },

  historyScroll: { maxHeight: 220, minHeight: 125 },
  emptyChatTxt: { fontSize: 12.5, fontWeight: '700', color: C.muted, textAlign: 'center', paddingVertical: 20 },
  chatRow: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 5,
    borderRadius: 11,
    backgroundColor: 'rgba(148,163,184,0.12)',
  },
  chatRowMine: { backgroundColor: 'rgba(56, 189, 248, 0.16)', borderLeftWidth: 3, borderLeftColor: '#38BDF8' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 },
  chatSender: { fontSize: 11.5, fontWeight: '900', color: '#B45309' },
  chatTime: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },
  chatBody: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 18 },

  quickRow: { gap: 6, paddingVertical: 2 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  quickChipTxt: { fontSize: 11.5, fontWeight: '800', color: '#78350F' },

  inputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  chatInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    color: C.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  chatInputDark: { backgroundColor: '#0F172A', borderColor: '#475569', color: '#FFFFFF' },
  lockedChatNote: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.3)',
  },
  lockedChatTxt: { fontSize: 11.5, fontWeight: '700', color: '#C7D2FE', textAlign: 'center' },

  wolfMsgBox: { paddingVertical: 4, paddingHorizontal: 8, marginBottom: 4, borderRadius: 10, backgroundColor: 'rgba(185, 28, 28, 0.22)' },
  wolfMsg: { fontSize: 12.5, color: '#FEE2E2', fontWeight: '700' },

  privateLogBox: {
    padding: 9,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.16)',
    borderWidth: 1.5,
    borderColor: '#8B5CF6',
    gap: 3,
  },
  privateLogTitle: { fontSize: 12.5, fontWeight: '900', color: '#DDD6FE' },
  privateLogLine: { fontSize: 12, fontWeight: '800', color: '#F8FAFC' },
  logItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 7,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(15,23,42,0.05)',
  },
  logDayPill: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
    backgroundColor: '#FDE68A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  logLine: { flex: 1, fontSize: 12.5, fontWeight: '700', color: C.ink, lineHeight: 17 },

  guideRoleCard: {
    padding: 11,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  guideRoleHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guideTeamTag: { fontSize: 11.5, fontWeight: '900' },
  guideLine: { fontSize: 12.5, fontWeight: '600', color: C.ink, lineHeight: 18 },
  guideBold: { fontWeight: '900', color: C.ink },
  guideTip: { fontSize: 12, fontWeight: '800', color: '#B45309', marginTop: 2 },

  dock: { gap: 8 },
  dockRow: { flexDirection: 'row', gap: 8 },
  dockNote: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', color: '#F8FAFC' },
  waitNote: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', color: '#F8FAFC', paddingVertical: 5 },
  err: { fontSize: 12, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
});
