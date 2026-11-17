import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { MASOI_ROLES, type MaSoiRole, type MaSoiView } from '../../../shared/src/masoi';
import { themeById } from '../../../shared/src/themes';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
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

const PHASE_META: Record<MaSoiView['phase'], { title: string; emoji: string; uiIcon: UiIconName; night: boolean; hint: string }> = {
  role_reveal: { title: 'Nhận Thân Phận', emoji: '🃏', uiIcon: 'Eye', night: true, hint: 'Hãy giữ kín vai trò của bạn khỏi người ngồi cạnh!' },
  night_cupid: { title: 'Đêm Se Duyên', emoji: '💘', uiIcon: 'Heart', night: true, hint: 'Thần Tình Yêu đang chọn 2 cư dân để nối dây tơ hồng...' },
  night_active: { title: 'Màn Đêm Buông Xuống', emoji: '🌙', uiIcon: 'Moon', night: true, hint: 'Ma Sói đi săn, Tiên Tri soi thấu, Bảo Vệ canh gác...' },
  night_witch: { title: 'Canh Ba Phù Thủy', emoji: '🧪', uiIcon: 'Sparkles', night: true, hint: 'Phù Thủy đang cân nhắc bình Thuốc Cứu và Thuốc Độc...' },
  hunter_shot: { title: 'Phát Súng Cuối Cùng', emoji: '🏹', uiIcon: 'Swords', night: false, hint: 'Thợ Săn đang nhắm bắn kẻ phải chết cùng mình!' },
  day_discuss: { title: 'Bình Minh & Thảo Luận', emoji: '☀️', uiIcon: 'Sun', night: false, hint: 'Cả làng bàn bạc tìm ra kẻ đội lốt Sói!' },
  day_vote: { title: 'Bỏ Phiếu Treo Cổ', emoji: '⚖️', uiIcon: 'ShieldAlert', night: false, hint: 'Chạm chọn người đáng nghi để bỏ phiếu, hoặc bỏ phiếu trắng.' },
};

export function MaSoiScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as MaSoiView;
  const [roleVisible, setRoleVisible] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [pickedTwo, setPickedTwo] = useState<string[]>([]);
  const [witchSave, setWitchSave] = useState(false);
  const [witchPoison, setWitchPoison] = useState<string | null>(null);
  const [wolfInput, setWolfInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const myRole = view.myRole;
  const roleMeta = myRole ? MASOI_ROLES[myRole] : null;
  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const iAlive = aliveSet.has(me);
  const deadMap = useMemo(() => new Map(view.dead.map((d) => [d.id, d])), [view.dead]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const phaseInfo = PHASE_META[view.phase];
  const isNight = phaseInfo.night;

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
    if (!canSelectOne) return;
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

  const sendWolfChat = async () => {
    const clean = wolfInput.trim();
    if (!clean) return;
    setWolfInput('');
    await act({ type: 'ms_wolfChat', text: clean });
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      dim: (p: PublicPlayer) => !aliveSet.has(p.id),
      ring: (p: PublicPlayer) => {
        if (view.hunterId === p.id) return '#EA580C';
        if (!aliveSet.has(p.id)) return '#64748B';
        if (view.dayVotes[me] === p.id) return C.gold;
        return undefined;
      },
      sub: (p: PublicPlayer) => {
        if (!aliveSet.has(p.id)) return 'Đã mất';
        if (view.phase === 'day_vote' && dayTally[p.id]) return `${dayTally[p.id]} phiếu`;
        if (view.phase === 'day_discuss' && view.readySkip.includes(p.id)) return 'Xong';
        if (view.phase === 'night_active' && wolfTally[p.id]) return `${wolfTally[p.id]} Sói`;
        return undefined;
      },
    }),
    [view.order, view.hunterId, view.dayVotes, view.phase, view.readySkip, aliveSet, dayTally, wolfTally, me],
  );

  const renderBottom = () => {
    if (view.phase === 'hunter_shot') {
      if (view.hunterId === me) {
        return (
          <View style={styles.dock}>
            <T style={[styles.dockNote, { color: '#FDBA74' }]}>
              Chọn 1 cư dân ở trên để bắn kéo theo hoặc cất súng!
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <View style={styles.dockRow}>
              <Button
                testID="masoi-hunter-shoot"
                disabled={!selected || busy}
                icon={selected ? '💥' : undefined}
                title={selected ? `Bắn ${view.names[selected]}` : 'Chọn mục tiêu ở trên'}
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
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Bạn đã hy sinh. Hãy theo dõi diễn biến của làng nhé!</T>;
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
                : `Sẵn sàng bỏ phiếu (${view.readySkip.length}/${needReady})`
            }
            onPress={() => act({ type: 'ms_ready' })}
          />
        </View>
      );
    }

    if (view.phase === 'day_vote') {
      const myVote = view.dayVotes[me];
      const votedLabel = myVote === 'skip' ? 'Bỏ phiếu trắng' : myVote ? `Đang chọn: ${view.names[myVote]}` : null;
      return (
        <View style={styles.dock}>
          {votedLabel && <T style={[styles.dockNote, { color: '#6EE7B7' }]}>{votedLabel} (có thể đổi phiếu trước khi hết giờ)</T>}
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.dockRow}>
            <Button
              testID="masoi-vote-btn"
              disabled={!selected || busy}
              icon={selected ? '⚖️' : undefined}
              title={selected ? `Treo cổ ${view.names[selected]}` : 'Chạm người ở trên để vote'}
              onPress={() => selected && act({ type: 'ms_vote', target: selected }, true)}
              style={{ flex: 2 }}
            />
            <Button
              testID="masoi-skip-vote"
              variant="paper"
              disabled={busy}
              icon="🏳️"
              title="Bỏ qua"
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
            Đã chọn: {pickedTwo.map((id) => view.names[id]).join(' & ') || 'Chưa chọn (cần 2 người)'}
          </T>
          {err && <T style={styles.err}>{err}</T>}
          <Button
            testID="masoi-night-submit"
            disabled={pickedTwo.length !== 2 || busy}
            icon="💘"
            title="Ghép đôi định mệnh"
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
              {currentTarget ? `Đã chọn cắn: ${view.names[currentTarget]} (chạm người khác để đổi)` : 'Chọn 1 nạn nhân để cả bầy cắn'}
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={!selected || busy}
              icon={selected ? '🩸' : undefined}
              title={selected ? `Cắn ${view.names[selected]}` : 'Chạm mục tiêu ở trên'}
              onPress={() => selected && act({ type: 'ms_night', target: selected }, true)}
            />
          </View>
        );
      }

      if ((myRole === 'tientri' || myRole === 'baove') && !view.myNightSubmitted) {
        const label = myRole === 'tientri' ? 'Soi thân phận' : 'Bảo vệ đêm nay';
        return (
          <View style={styles.dock}>
            {myRole === 'baove' && view.guardLastId && (
              <T style={styles.dockNote}>Lưu ý: Không chọn lại {view.names[view.guardLastId]}</T>
            )}
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={!selected || busy}
              icon={myRole === 'tientri' ? '🔮' : '🛡️'}
              title={selected ? `${label}: ${view.names[selected]}` : 'Chạm cư dân ở trên'}
              onPress={() => selected && act({ type: 'ms_night', target: selected }, true)}
            />
          </View>
        );
      }

      if (myRole === 'thamtu' && !view.myNightSubmitted) {
        return (
          <View style={styles.dock}>
            <T style={styles.dockNote}>
              Kiểm tra 2 người: {pickedTwo.map((id) => view.names[id]).join(' & ') || 'Chạm chọn 2 người'}
            </T>
            {err && <T style={styles.err}>{err}</T>}
            <Button
              testID="masoi-night-submit"
              disabled={pickedTwo.length !== 2 || busy}
              icon="🕵️"
              title="So sánh phe 2 người"
              onPress={() => act({ type: 'ms_night', target: pickedTwo[0], target2: pickedTwo[1] }, true)}
            />
          </View>
        );
      }

      if (view.myNightSubmitted) {
        return <T style={[styles.waitNote, { color: theme.onBg }]}>Bạn đã hoàn tất hành động đêm nay, chờ mọi người…</T>;
      }
      return <T style={[styles.waitNote, { color: theme.onBg }]}>Đêm khuya thanh vắng… Hãy nhắm mắt chờ trời sáng!</T>;
    }

    if (view.phase === 'night_witch' && myRole === 'phuthuy' && !view.myNightSubmitted) {
      const ws = view.witchState;
      const victimName = ws?.victimId ? view.names[ws.victimId] : null;
      return (
        <View style={styles.dock}>
          <T style={[styles.dockNote, { color: theme.onBg }]}>
            {victimName ? `Đêm nay Sói cắn ${victimName}!` : 'Đêm nay Sói không cắn được ai.'}
          </T>
          {err && <T style={styles.err}>{err}</T>}
          <View style={styles.dockRow}>
            {ws?.healLeft && ws?.victimId && (
              <Button
                testID="masoi-witch-save"
                variant={witchSave ? 'jade' : 'paper'}
                icon="💚"
                title={witchSave ? 'Sẽ Cứu!' : 'Dùng Bình Cứu'}
                onPress={() => setWitchSave((v) => !v)}
                style={{ flex: 1 }}
              />
            )}
            <Button
              testID="masoi-night-submit"
              disabled={busy}
              icon={witchPoison ? '☠️' : witchSave ? '💚' : '⏭️'}
              title={witchPoison ? `Độc ${view.names[witchPoison]} & Xong` : witchSave ? 'Cứu & Xong' : 'Không dùng bình'}
              onPress={() => act({ type: 'ms_night', save: witchSave, poison: witchPoison }, true)}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      );
    }

    return <T style={[styles.waitNote, { color: theme.onBg }]}>{phaseInfo.hint}</T>;
  };

  return (
    <Shell game={game} room={room} strip={strip} bottom={renderBottom()}>
      {/* Banner Giai Đoạn & Đếm Ngược */}
      <View style={[styles.phaseBanner, sticker(3), isNight ? styles.nightBanner : styles.dayBanner]}>
        <View style={styles.phaseHead}>
          <View style={[styles.phaseIconWrap, { backgroundColor: isNight ? 'rgba(99,102,241,0.22)' : '#FEF3C7' }]}>
            <EmojiIcon emoji={phaseInfo.emoji} size={20} />
          </View>
          <T style={[styles.phaseTitle, isNight && { color: '#F8FAFC' }]}>
            {phaseInfo.title} · Ngày {view.day}
          </T>
          <View style={[styles.aliveBadge, isNight && { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.24)' }]}>
            <T style={[styles.aliveBadgeTxt, isNight && { color: '#E2E8F0' }]}>
              Sống: {view.alive.length}/{view.order.length}
            </T>
          </View>
        </View>
        <T style={[styles.phaseHint, isNight && { color: '#CBD5E1' }]}>{phaseInfo.hint}</T>
        <CountdownBar endsAt={view.phaseEndsAt} total={view.phaseSeconds} clockOffset={game.clockOffset} testID="masoi-timer" lightText={isNight} />
      </View>

      {/* Thẻ Vai Trò Bí Mật (Bấm để lật 3D) */}
      <FlipCard flipped={!roleVisible}>
        <Pressable testID="masoi-role-card" onPress={() => setRoleVisible((v) => !v)} style={[styles.roleCard, sticker(3), isNight && styles.roleCardNight]}>
          {roleVisible && roleMeta && myRole ? (
            <View style={{ gap: 7 }}>
              <View style={styles.roleTop}>
                <View style={[styles.rolePill, { backgroundColor: roleMeta.color }]}>
                  <GameIcon name={ROLE_GAME_ICON[myRole]} size={18} color="#FFFFFF" />
                  <T style={styles.rolePillTxt}>{roleMeta.name}</T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <UiIcon name="EyeOff" size={14} color={isNight ? '#94A3B8' : C.muted} />
                  <T style={[styles.tapHide, isNight && { color: '#94A3B8' }]}>Bấm để úp thẻ</T>
                </View>
              </View>
              <T style={[styles.roleDesc, isNight && { color: '#E2E8F0' }]}>{roleMeta.shortDesc}</T>
              {view.myPartnerId && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <UiIcon name="Heart" size={14} color="#F472B6" />
                  <T style={styles.loverInfo}>Người thương định mệnh của bạn: {view.names[view.myPartnerId]}</T>
                </View>
              )}
              {view.wolfPackIds && view.wolfPackIds.length > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <GameIcon name="wolf-head" size={15} color="#F87171" />
                  <T style={styles.wolfInfo}>
                    Đồng bọn Sói: {view.wolfPackIds.map((id) => view.names[id]).join(', ')}
                  </T>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.hiddenRole}>
              <EmojiIcon emoji="🃏" size={28} />
              <T style={[styles.hiddenTitle, isNight && { color: '#F8FAFC' }]}>Thẻ Thân Phận Đang Úp</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <UiIcon name="Eye" size={13} color={isNight ? '#94A3B8' : C.muted} />
                <T style={[styles.tapHide, isNight && { color: '#94A3B8' }]}>Chạm để lật xem bí mật</T>
              </View>
            </View>
          )}
          <View style={styles.deckRow}>
            {(Object.entries(view.roleCounts) as [MaSoiRole, number][]).map(([r, cnt]) => {
              const m = MASOI_ROLES[r];
              return (
                <View key={r} style={[styles.deckChip, isNight && { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                  <GameIcon name={ROLE_GAME_ICON[r]} size={12} color={isNight ? '#E2E8F0' : C.ink} />
                  <T style={[styles.deckChipTxt, isNight && { color: '#E2E8F0' }]}>{m.name} ×{cnt}</T>
                </View>
              );
            })}
          </View>
        </Pressable>
      </FlipCard>

      {/* Lưới 4–12 Cư Dân Làng */}
      <View style={styles.grid}>
        {view.order.map((id) => {
          const player = playerMap.get(id);
          const alive = aliveSet.has(id);
          const deadEntry = deadMap.get(id);
          const isPicked = selected === id || pickedTwo.includes(id) || witchPoison === id;
          const isWolfAlly = view.wolfPackIds?.includes(id);
          const isPartner = view.myPartnerId === id;
          const votes = dayTally[id] ?? 0;
          const wolfMark = wolfTally[id] ?? 0;
          const guardLocked = view.phase === 'night_active' && myRole === 'baove' && id === view.guardLastId;

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
                isPicked && styles.seatPicked,
                guardLocked && { opacity: 0.5 },
              ]}
            >
              {isPartner && (
                <View style={styles.cornerTopLeft}>
                  <UiIcon name="Heart" size={14} color="#EC4899" />
                </View>
              )}
              {isWolfAlly && (
                <View style={styles.cornerTopRight}>
                  <GameIcon name="wolf-head" size={15} color="#EF4444" />
                </View>
              )}
              {player ? (
                <Portrait p={player} size={46} frame={player.cosmetics?.frame} pet={player.cosmetics?.pet} />
              ) : (
                <UiIcon name={alive ? 'User' : 'Skull'} size={28} color={alive ? C.muted : '#94A3B8'} />
              )}
              <NameText
                fx={player?.cosmetics?.nameFx}
                style={[styles.seatName, isNight && { color: '#F1F5F9' }, !alive && styles.deadName]}
              >
                {view.names[id] ?? id}
              </NameText>
              {!alive ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <GameIcon name={deadEntry?.revealedRole ? ROLE_GAME_ICON[deadEntry.revealedRole] : 'tombstone'} size={12} color="#FCA5A5" />
                  <T style={styles.deadTag}>Đã mất</T>
                </View>
              ) : votes > 0 ? (
                <View style={styles.votePill}>
                  <EmojiIcon emoji="🗳️" size={11} />
                  <T style={styles.votePillTxt}>{votes}</T>
                </View>
              ) : wolfMark > 0 ? (
                <View style={[styles.votePill, { backgroundColor: '#991B1B' }]}>
                  <EmojiIcon emoji="🩸" size={11} />
                  <T style={styles.votePillTxt}>{wolfMark}</T>
                </View>
              ) : guardLocked ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <UiIcon name="Shield" size={11} color="#FBBF24" />
                  <T style={styles.lockTag}>Mới bảo vệ</T>
                </View>
              ) : id === me ? (
                <T style={[styles.meTag, isNight && { color: '#FDE047' }]}>Bạn</T>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {view.seerHistory && view.seerHistory.length > 0 && (
        <Card style={isNight ? styles.darkInfoCard : undefined}>
          <View style={styles.secRow}>
            <GameIcon name="crystal-ball" size={16} color="#C4B5FD" />
            <T style={[styles.secTitle, isNight && { color: '#C4B5FD' }]}>Sổ Tay Tiên Tri</T>
          </View>
          {view.seerHistory.map((h, i) => (
            <T key={i} style={[styles.histLine, isNight && { color: '#E2E8F0' }]}>
              Đêm {h.day}: {view.names[h.targetId]} → {h.isWolf ? 'LÀ MA SÓI!' : 'Người tốt'}
            </T>
          ))}
        </Card>
      )}

      {view.detectiveHistory && view.detectiveHistory.length > 0 && (
        <Card style={isNight ? styles.darkInfoCard : undefined}>
          <View style={styles.secRow}>
            <GameIcon name="carnival-mask" size={16} color="#6EE7B7" />
            <T style={[styles.secTitle, isNight && { color: '#6EE7B7' }]}>Hồ Sơ Thám Tử</T>
          </View>
          {view.detectiveHistory.map((h, i) => (
            <T key={i} style={[styles.histLine, isNight && { color: '#E2E8F0' }]}>
              Đêm {h.day}: {view.names[h.a]} & {view.names[h.b]} → {h.sameTeam ? 'CÙNG PHE' : 'KHÁC PHE'}
            </T>
          ))}
        </Card>
      )}

      {myRole === 'soi' && view.wolfChat && (
        <Card style={[styles.darkInfoCard, { borderColor: '#B91C1C' }]}>
          <View style={styles.secRow}>
            <GameIcon name="wolf-head" size={16} color="#FCA5A5" />
            <T style={[styles.secTitle, { color: '#FCA5A5' }]}>Kênh Chat Bí Mật Bầy Sói</T>
          </View>
          <View style={styles.wolfMsgs}>
            {view.wolfChat.length === 0 ? (
              <T style={{ color: '#94A3B8', fontSize: 12 }}>Chưa có tin nhắn… Bàn nhau cắn ai đêm nay đi!</T>
            ) : (
              view.wolfChat.slice(-6).map((m) => (
                <T key={m.id} style={styles.wolfMsg}>
                  <T style={{ fontWeight: '900', color: '#FCA5A5' }}>{m.name}: </T>
                  {m.text}
                </T>
              ))
            )}
          </View>
          {iAlive && (
            <View style={styles.wolfInputRow}>
              <TextInput
                testID="masoi-wolf-chat-input"
                value={wolfInput}
                onChangeText={setWolfInput}
                onSubmitEditing={sendWolfChat}
                placeholder="Nhắn riêng cho bầy Sói..."
                placeholderTextColor="#94A3B8"
                maxLength={120}
                style={styles.wolfInput}
              />
              <Button testID="masoi-wolf-chat-send" small title="Gửi" onPress={sendWolfChat} />
            </View>
          )}
        </Card>
      )}

      <Card style={isNight ? styles.darkInfoCard : undefined}>
        <View style={styles.secRow}>
          <UiIcon name="BookOpen" size={16} color={isNight ? '#FDE047' : C.ink} />
          <T style={[styles.secTitle, isNight && { color: '#FDE047' }]}>Nhật Ký Ngôi Làng</T>
        </View>
        <View style={{ gap: 5 }}>
          {view.publicLog.slice(-8).reverse().map((entry) => (
            <T key={entry.id} style={[styles.logLine, isNight && { color: '#E2E8F0' }]}>
              {entry.text}
            </T>
          ))}
        </View>
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  phaseBanner: { borderRadius: 20, padding: 13, gap: 7 },
  nightBanner: { backgroundColor: '#131A35', borderColor: '#475569' },
  dayBanner: { backgroundColor: '#FFFBEB' },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phaseIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  phaseTitle: { fontSize: 16, fontWeight: '900', fontFamily: FONT, color: C.ink, flex: 1 },
  aliveBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: 'rgba(28,32,36,0.16)' },
  aliveBadgeTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  phaseHint: { fontSize: 12, fontWeight: '700', color: C.muted },

  roleCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, gap: 9 },
  roleCardNight: { backgroundColor: '#1E293B', borderColor: '#475569' },
  roleTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  rolePillTxt: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  tapHide: { fontSize: 11, fontWeight: '700', color: C.muted },
  roleDesc: { fontSize: 13, fontWeight: '600', color: C.ink },
  loverInfo: { fontSize: 13, fontWeight: '800', color: '#F472B6' },
  wolfInfo: { fontSize: 12, fontWeight: '800', color: '#F87171' },
  hiddenRole: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  hiddenTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  deckRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  deckChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(15,23,42,0.1)', backgroundColor: C.mist },
  deckChipTxt: { fontSize: 10.5, fontWeight: '700', color: C.ink },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  seat: {
    flexGrow: 1, minWidth: 96, maxWidth: '48%', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.14)', position: 'relative',
  },
  seatNight: { backgroundColor: '#1A223D', borderColor: 'rgba(148,163,184,0.28)' },
  seatDead: { opacity: 0.56, backgroundColor: '#334155', borderColor: '#64748B' },
  seatPicked: { borderColor: C.gold, borderWidth: 2.5, transform: [{ translateY: -2 }] },
  seatName: { fontSize: 13, fontWeight: '800', color: C.ink, textAlign: 'center' },
  deadName: { textDecorationLine: 'line-through', color: '#CBD5E1' },
  deadTag: { fontSize: 11, fontWeight: '800', color: '#FCA5A5' },
  votePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: C.ink },
  votePillTxt: { color: C.gold, fontSize: 11, fontWeight: '900' },
  lockTag: { fontSize: 10, fontWeight: '800', color: '#FBBF24' },
  meTag: { fontSize: 10, fontWeight: '800', color: C.jade },
  cornerTopLeft: { position: 'absolute', top: 6, left: 6 },
  cornerTopRight: { position: 'absolute', top: 6, right: 6 },

  darkInfoCard: { backgroundColor: '#17203A', borderColor: 'rgba(148,163,184,0.3)' },
  secRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  secTitle: { fontSize: 14, fontWeight: '900', color: C.ink },
  histLine: { fontSize: 13, fontWeight: '700', color: C.ink },
  logLine: { fontSize: 13, fontWeight: '600', color: C.ink, lineHeight: 18 },

  wolfMsgs: { gap: 4, marginBottom: 8 },
  wolfMsg: { fontSize: 12, color: '#FEE2E2' },
  wolfInputRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  wolfInput: {
    flex: 1, backgroundColor: '#0F172A', borderColor: '#64748B', borderWidth: 1.5,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, color: '#FFFFFF', fontSize: 13, fontWeight: '700',
  },

  dock: { gap: 8 },
  dockRow: { flexDirection: 'row', gap: 8 },
  dockNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: '#F8FAFC' },
  waitNote: { fontSize: 13, fontWeight: '800', textAlign: 'center', color: '#F8FAFC', paddingVertical: 6 },
  err: { fontSize: 12, fontWeight: '800', color: '#FCA5A5', textAlign: 'center' },
});
