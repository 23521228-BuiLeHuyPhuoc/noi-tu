import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CG_START_HP,
  cgTotalWealth,
  type CashGunsView,
  type CgLootCard,
  type CgLootKind,
} from '../../../shared/src/cashnguns';
import { themeById } from '../../../shared/src/themes';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Button, Card, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, GameIcon, UiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const PHASE_META: Record<
  CashGunsView['phase'],
  { title: string; badge: string; hint: string; emoji: string }
> = {
  plan: {
    title: 'Lên Đạn Bí Mật & Chọn Mục Tiêu',
    badge: 'LÊN ĐẠN NGẦM',
    hint: 'Chọn 1 viên đạn (Thật hoặc Giả) và khóa nòng súng vào 1 tay anh chị!',
    emoji: '🔫',
  },
  standoff: {
    title: 'Đấu Súng Cân Não Giữa Sòng',
    badge: 'ĐẤU SÚNG CĂNG',
    hint: 'Nhìn kỹ xem bao nhiêu họng súng đang chĩa vào mình để chọn Đứng Lại hay Nằm Xuống!',
    emoji: '😎',
  },
  resolve: {
    title: 'Bóp Cò & Chia Chiến Lợi Phẩm',
    badge: 'KẾT QUẢ PHI VỤ',
    hint: 'Ai trụ vững không trúng đạn thật sẽ chia sạch két bạc trên bàn!',
    emoji: '💰',
  },
};

const LOOT_VISUAL: Record<
  CgLootKind,
  {
    fluentEmoji: string;
    shortTag: string;
    colors: readonly [string, string, string];
    border: string;
    fg: string;
  }
> = {
  cash_5k: {
    fluentEmoji: '💸',
    shortTag: '$5,000',
    colors: ['#DCFCE7', '#BBF7D0', '#86EFAC'],
    border: '#16A34A',
    fg: '#14532D',
  },
  cash_10k: {
    fluentEmoji: '🪙',
    shortTag: '$10,000',
    colors: ['#FEF9C3', '#FDE047', '#FACC15'],
    border: '#CA8A04',
    fg: '#713F12',
  },
  cash_20k: {
    fluentEmoji: '💰',
    shortTag: '$20,000',
    colors: ['#FFEDD5', '#FDBA74', '#FB923C'],
    border: '#EA580C',
    fg: '#7C2D12',
  },
  diamond_1k: {
    fluentEmoji: '💎',
    shortTag: 'KC $1k',
    colors: ['#E0F2FE', '#BAE6FD', '#7DD3FC'],
    border: '#0284C7',
    fg: '#0C4A6E',
  },
  diamond_5k: {
    fluentEmoji: '💎',
    shortTag: 'KC $5k',
    colors: ['#CFFAFE', '#67E8F9', '#22D3EE'],
    border: '#0891B2',
    fg: '#164E63',
  },
  diamond_10k: {
    fluentEmoji: '💎',
    shortTag: 'KC $10k',
    colors: ['#EDE9FE', '#C4B5FD', '#A78BFA'],
    border: '#7C3AED',
    fg: '#4C1D95',
  },
  medkit: {
    fluentEmoji: '🩹',
    shortTag: 'Đầy 3 Tim',
    colors: ['#FFE4E6', '#FECDD3', '#FDA4AF'],
    border: '#E11D48',
    fg: '#881337',
  },
  godfather: {
    fluentEmoji: '👑',
    shortTag: 'Ngôi Bố Già',
    colors: ['#FAF5FF', '#E9D5FF', '#FDE68A'],
    border: '#9333EA',
    fg: '#581C87',
  },
};

function errOf(reason: ActionError): string {
  return (actionText as Partial<Record<ActionError, string>>)[reason] ?? 'Thao tác chưa hợp lệ, thử lại nhé!';
}

function formatUsd(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

export function CashGunsScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CashGunsView;
  const me = game.me ?? '';
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [selectedBullet, setSelectedBullet] = useState<number | null>(0);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [choseStand, setChoseStand] = useState(false);
  const [gfShooter, setGfShooter] = useState<string | null>(null);
  const [gfNewAim, setGfNewAim] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cgResetKey = `${view.round}:${view.phase}:${view.myClip.length}`;
  const [prevCgKey, setPrevCgKey] = useState(cgResetKey);
  if (prevCgKey !== cgResetKey) {
    setPrevCgKey(cgResetKey);
    setSelectedBullet(view.myClip.length > 0 ? 0 : null);
    setSelectedTarget(null);
    setChoseStand(false);
    setGfShooter(null);
    setGfNewAim(null);
    setErr(null);
  }

  useOnChange(view.phase, (ph) => {
    if (ph === 'standoff') play('siren');
    else if (ph === 'resolve') {
      const hadBang = view.lastShots.some((s) => s.bullet === 'bang' && !s.dodged);
      play(hadBang ? 'boom' : 'cash');
    } else if (ph === 'plan') {
      play('turn');
    }
  });

  const aliveSet = useMemo(() => new Set(view.alive), [view.alive]);
  const plannedSet = useMemo(() => new Set(view.plannedIds), [view.plannedIds]);
  const surrenderedSet = useMemo(() => new Set(view.surrendered), [view.surrendered]);
  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);

  const inOrder = view.order.includes(me);
  const iAlive = aliveSet.has(me);
  const iSurrendered = surrenderedSet.has(me);
  const iPlanned = plannedSet.has(me);
  const iAmGodfather = view.godfatherId === me;

  const wealth = useMemo(
    () => cgTotalWealth(view.cash, view.diamonds, aliveSet),
    [view.cash, view.diamonds, aliveSet],
  );
  const diamondKingSet = useMemo(() => new Set(wealth.diamondKingIds), [wealth.diamondKingIds]);

  const aliveOpponents = useMemo(
    () => view.order.filter((id) => id !== me && aliveSet.has(id)),
    [view.order, me, aliveSet],
  );

  const gunsPointedAtMe = useMemo(() => {
    if (view.phase !== 'standoff' && view.phase !== 'resolve') return [];
    return view.order.filter(
      (id) => id !== me && aliveSet.has(id) && !surrenderedSet.has(id) && view.aims[id] === me,
    );
  }, [view.phase, view.order, me, aliveSet, surrenderedSet, view.aims]);

  const remainingClicks = useMemo(
    () => view.myClip.filter((b) => b === 'click').length,
    [view.myClip],
  );
  const remainingBangs = useMemo(
    () => view.myClip.filter((b) => b === 'bang').length,
    [view.myClip],
  );

  const act = async (payload: Parameters<Game['act']>[0]) => {
    setBusy(true);
    setErr(null);
    const res = await game.act(payload);
    setBusy(false);
    if (!res.ok) {
      play('error');
      setErr(errOf(res.reason));
    }
    return res.ok;
  };

  const effBullet = view.myPickedBulletIndex ?? selectedBullet;
  const effTarget = view.myAimTarget ?? selectedTarget;

  const submitPlan = async () => {
    if (busy || !iAlive || effBullet === null || !effTarget) return;
    play('stamp');
    await act({ type: 'cg_plan', bulletIndex: effBullet, targetId: effTarget });
  };

  const handleStandoff = async (decision: 'stand' | 'surrender') => {
    if (busy || !iAlive || view.phase !== 'standoff') return;
    play(decision === 'surrender' ? 'whoosh' : 'coin');
    const ok = await act({ type: 'cg_standoff', decision });
    if (ok && decision === 'stand') setChoseStand(true);
  };

  const submitGodfatherRedirect = async () => {
    if (busy || !iAmGodfather || !gfShooter || !gfNewAim) return;
    play('zap');
    const ok = await act({ type: 'cg_godfather', targetId: gfShooter, newAimId: gfNewAim });
    if (ok) {
      setGfShooter(null);
      setGfNewAim(null);
    }
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.godfatherId,
      dim: (p: PublicPlayer) => !aliveSet.has(p.id),
      ring: (p: PublicPlayer) => {
        if (!aliveSet.has(p.id)) return '#64748B';
        if (view.phase === 'standoff' && view.aims[p.id] === me && !surrenderedSet.has(p.id)) {
          return C.danger;
        }
        if (p.id === view.godfatherId) return C.gold;
        if (view.phase === 'plan' && plannedSet.has(p.id)) return C.jade;
        return undefined;
      },
      sub: (p: PublicPlayer) => {
        if (!aliveSet.has(p.id)) return 'Ngã gục';
        if (surrenderedSet.has(p.id) && view.phase !== 'plan') return 'Nằm xuống';
        return formatUsd(wealth.totals[p.id] ?? 0);
      },
    }),
    [view.order, view.godfatherId, view.phase, view.aims, aliveSet, surrenderedSet, plannedSet, wealth.totals, me],
  );

  const meta = PHASE_META[view.phase];
  const myLootWon = (view.lastLootGains[me]?.length ?? 0) > 0;

  const renderBottom = () => {
    if (!inOrder) {
      return (
        <T style={[styles.waitNote, { color: theme.onBg }]}>
          Bạn đang theo dõi phi vụ chia chác giang hồ kịch tính!
        </T>
      );
    }
    if (!iAlive) {
      return (
        <View style={styles.deadDockRow}>
          <EmojiIcon emoji="💀" size={18} />
          <T style={[styles.waitNote, { color: '#FCA5A5' }]}>
            Bạn đã hết máu và ngã xuống! Cùng xem băng đảng còn lại thanh toán nhau…
          </T>
        </View>
      );
    }

    if (view.phase === 'plan') {
      return (
        <View style={styles.dock}>
          {err && (
            <View style={styles.errPill}>
              <UiIcon name="AlertTriangle" size={14} color="#FEF08A" />
              <T style={styles.errTxt}>{err}</T>
            </View>
          )}
          <Button
            testID="cg-plan-submit"
            variant={iPlanned ? 'jade' : 'gold'}
            disabled={busy || iPlanned || effBullet === null || !effTarget}
            iconNode={
              <UiIcon
                name={iPlanned ? 'CheckCircle2' : 'Zap'}
                size={18}
                color={iPlanned ? '#FFFFFF' : '#271400'}
              />
            }
            title={
              iPlanned
                ? `Đã khóa mục tiêu @${view.names[effTarget ?? ''] ?? ''}! (${view.plannedIds.length}/${view.alive.length})`
                : effBullet !== null && effTarget
                  ? `Lên Đạn & Chĩa Súng! (@${view.names[effTarget] ?? effTarget})`
                  : 'Chọn 1 viên đạn & 1 mục tiêu để Lên Đạn!'
            }
            onPress={submitPlan}
          />
        </View>
      );
    }

    if (view.phase === 'standoff') {
      return (
        <View style={styles.dock}>
          {err && (
            <View style={styles.errPill}>
              <UiIcon name="AlertTriangle" size={14} color="#FEF08A" />
              <T style={styles.errTxt}>{err}</T>
            </View>
          )}
          <View style={styles.standoffBtnRow}>
            <Button
              testID="cg-stand"
              variant={choseStand && !iSurrendered ? 'jade' : 'gold'}
              disabled={busy || iSurrendered}
              icon="😎"
              title={choseStand && !iSurrendered ? 'Đã Chọn Đứng Lại!' : 'Đứng Lại Chia Tiền!'}
              onPress={() => handleStandoff('stand')}
              style={{ flex: 1.15 }}
            />
            <Button
              testID="cg-surrender"
              variant={iSurrendered ? 'ink' : 'danger'}
              disabled={busy || iSurrendered}
              icon="🏳️"
              title={iSurrendered ? 'Đã Nằm Xuống!' : 'Đầu Hàng Nằm Xuống!'}
              onPress={() => handleStandoff('surrender')}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      );
    }

    return (
      <View style={styles.deadDockRow}>
        <EmojiIcon emoji="💰" size={18} />
        <T style={[styles.waitNote, { color: '#FDE047' }]}>
          Đang gom két sắt chuẩn bị khui mẻ chiến lợi phẩm tiếp theo…
        </T>
      </View>
    );
  };

  const gfEligibleShooters = useMemo(
    () =>
      view.order.filter(
        (id) => id !== me && aliveSet.has(id) && !surrenderedSet.has(id) && !!view.aims[id],
      ),
    [view.order, me, aliveSet, surrenderedSet, view.aims],
  );

  const gfEligibleTargets = useMemo(() => {
    if (!gfShooter) return [];
    const curAim = view.aims[gfShooter];
    return view.order.filter(
      (id) => aliveSet.has(id) && id !== gfShooter && id !== curAim,
    );
  }, [gfShooter, view.aims, view.order, aliveSet]);

  return (
    <Shell game={game} room={room} strip={strip} wide={wide} bottom={renderBottom()}>
      {view.phase === 'resolve' && myLootWon && <Confetti />}

      {/* Header Casino & Bàn Chiến Lợi Phẩm 8 Món */}
      <MotionSurface>
        <LinearGradient
          colors={['#1C0913', '#2D0C1E', '#0F172A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.vaultStage, sticker(4)]}
        >
          <View style={styles.vaultHead}>
            <View style={styles.roundPill}>
              <EmojiIcon emoji={meta.emoji} size={15} />
              <T style={styles.roundPillTxt}>
                Phi vụ {view.round}/{view.maxRounds}
              </T>
            </View>
            <T numberOfLines={1} style={styles.vaultTitle}>
              {meta.title}
            </T>
            <View style={styles.phaseChip}>
              <T style={styles.phaseChipTxt}>{meta.badge}</T>
            </View>
          </View>

          <CountdownBar
            endsAt={view.phaseEndsAt}
            total={view.phaseSeconds}
            clockOffset={game.clockOffset}
            lightText
            testID="cg-timer"
          />

          {/* Bàn Chiến Lợi Phẩm (8 lá) */}
          <LinearGradient
            testID="cg-loot-table"
            colors={['#064E3B', '#065F46', '#022C22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.lootTable}
          >
            <View style={styles.lootTableHead}>
              <View style={styles.inlineRow}>
                <EmojiIcon emoji="💰" size={16} />
                <T style={styles.lootTableTitle}>
                  BÀN CHIẾN LỢI PHẨM ({view.tableLoot.length} MÓN)
                </T>
              </View>
              <View style={styles.godfatherInfoPill}>
                <EmojiIcon emoji="👑" size={12} />
                <T style={styles.godfatherInfoTxt}>
                  Bố Già: {view.names[view.godfatherId] ?? '---'}
                </T>
              </View>
            </View>

            <View style={styles.lootGrid}>
              {view.tableLoot.map((item: CgLootCard, i: number) => {
                const vis = LOOT_VISUAL[item.kind];
                return (
                  <LinearGradient
                    key={`${item.id}-${i}`}
                    colors={[...vis.colors]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.lootTile,
                      {
                        borderColor: vis.border,
                        flexBasis: wide ? '23.6%' : '23.4%',
                      },
                    ]}
                  >
                    <EmojiIcon emoji={vis.fluentEmoji} size={20} />
                    <T numberOfLines={1} style={[styles.lootShortTxt, { color: vis.fg }]}>
                      {vis.shortTag}
                    </T>
                  </LinearGradient>
                );
              })}
            </View>

            <View style={styles.diamondBonusBanner}>
              <EmojiIcon emoji="💎" size={15} />
              <T style={styles.diamondBonusTxt}>
                Nhiều kim cương nhất cuối ván +60.000$!
                {wealth.diamondKingIds.length > 0
                  ? ` (Đang dẫn đầu: ${wealth.diamondKingIds.map((id) => view.names[id] ?? id).join(', ')})`
                  : ''}
              </T>
            </View>
          </LinearGradient>
        </LinearGradient>
      </MotionSurface>

      {/* CẢNH BÁO ĐẤU SÚNG CÂN NÃO (PHA STANDOFF) */}
      {view.phase === 'standoff' && (
        <LinearGradient
          colors={
            gunsPointedAtMe.length > 0
              ? ['#991B1B', '#DC2626', '#7F1D1D']
              : ['#065F46', '#059669', '#064E3B']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.standoffAlert, sticker(3)]}
        >
          <EmojiIcon emoji={gunsPointedAtMe.length > 0 ? '🔫' : '😎'} size={24} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={styles.standoffAlertTitle}>
              {gunsPointedAtMe.length > 0
                ? `BÁO ĐỘNG ĐỎ: CÓ ${gunsPointedAtMe.length} HỌNG SÚNG ĐANG CHĨA VÀO ĐẦU BẠN!`
                : 'AN TOÀN TUYỆT ĐỐI: KHÔNG AI CHĨA SÚNG VÀO BẠN!'}
            </T>
            <T style={styles.standoffAlertSub}>
              {gunsPointedAtMe.length > 0
                ? `Thủ phạm nhắm bạn: ${gunsPointedAtMe.map((id) => `@${view.names[id] ?? id}`).join(', ')}. Liệu là Đạn Thật hay Đạn Giả hù tâm lý?`
                : 'Đứng lại hiên ngang chia tiền ngay kẻo phí lộc trời cho!'}
            </T>
          </View>
        </LinearGradient>
      )}

      {/* LỆNH BỐ GIÀ ĐÃ PHÁT ĐỘNG */}
      {view.redirectedByGodfather && (
        <View style={[styles.gfNoticeBar, sticker(2)]}>
          <EmojiIcon emoji="👑" size={18} />
          <T style={styles.gfNoticeTxt}>
            Quyền lực Bố Già: @{view.names[view.redirectedByGodfather.targetId] ?? ''} bị ép chĩa súng từ @
            {view.names[view.redirectedByGodfather.oldAim] ?? ''} sang @
            {view.names[view.redirectedByGodfather.newAim] ?? ''}!
          </T>
        </View>
      )}

      {/* QUYỀN ĐẶC BIỆT BỐ GIÀ TRONG PHA STANDOFF */}
      {view.phase === 'standoff' &&
        iAmGodfather &&
        iAlive &&
        !view.redirectedByGodfather &&
        gfEligibleShooters.length > 0 && (
          <LinearGradient
            colors={['#2E1065', '#4C1D95', '#1E1B4B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gfControlCard, sticker(3)]}
          >
            <View style={styles.inlineRow}>
              <EmojiIcon emoji="👑" size={18} />
              <T style={styles.gfControlTitle}>Quyền Bố Già: Ép đổi hướng súng (1 người)</T>
            </View>
            <T style={styles.gfControlSub}>
              1. Chọn tay súng muốn nắn nòng:
            </T>
            <View style={styles.chipWrap}>
              {gfEligibleShooters.map((id) => {
                const on = gfShooter === id;
                return (
                  <Pressable
                    key={id}
                    testID={`cg-gf-shooter-${id}`}
                    onPress={() => {
                      play('pop');
                      setGfShooter(id);
                      setGfNewAim(null);
                    }}
                    style={[styles.gfChip, on && styles.gfChipOn]}
                  >
                    <T style={[styles.gfChipTxt, on && styles.gfChipTxtOn]}>
                      @{view.names[id] ?? id} (nhắm @{view.names[view.aims[id] ?? ''] ?? ''})
                    </T>
                  </Pressable>
                );
              })}
            </View>

            {gfShooter && gfEligibleTargets.length > 0 && (
              <>
                <T style={styles.gfControlSub}>2. Bắt chuyển nòng sang ai:</T>
                <View style={styles.chipWrap}>
                  {gfEligibleTargets.map((dest) => {
                    const on = gfNewAim === dest;
                    return (
                      <Pressable
                        key={dest}
                        testID={`cg-gf-dest-${dest}`}
                        onPress={() => {
                          play('pop');
                          setGfNewAim(dest);
                        }}
                        style={[styles.gfChip, on && styles.gfChipOn]}
                      >
                        <T style={[styles.gfChipTxt, on && styles.gfChipTxtOn]}>
                          @{view.names[dest] ?? dest}
                          {dest === me ? ' (bạn)' : ''}
                        </T>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {gfShooter && gfNewAim && (
              <Button
                testID="cg-godfather-submit"
                small
                variant="gold"
                disabled={busy}
                icon="👑"
                title={`Ép @${view.names[gfShooter]} nhắm sang @${view.names[gfNewAim]}!`}
                onPress={submitGodfatherRedirect}
              />
            )}
          </LinearGradient>
        )}

      {/* VÒNG TRÒN GIANG HỒ (AVATAR, TIM, TIỀN, KIM CƯƠNG, MỤC TIÊU NHẮM) */}
      <View style={styles.gangGrid}>
        {view.order.map((id) => {
          const player = playerMap.get(id);
          const alive = aliveSet.has(id);
          const hp = view.hp[id] ?? 0;
          const cashVal = view.cash[id] ?? 0;
          const diaCount = view.diamonds[id] ?? 0;
          const isGf = view.godfatherId === id;
          const isSurr = surrenderedSet.has(id);
          const aimTargetId = view.aims[id];
          const aimingMe =
            (view.phase === 'standoff' || view.phase === 'resolve') &&
            aimTargetId === me &&
            !isSurr &&
            alive;

          return (
            <View
              key={id}
              style={[
                styles.gangSeat,
                sticker(aimingMe ? 4 : 2),
                { flexBasis: wide ? '31.8%' : '48.4%' },
                id === me && styles.gangSeatMe,
                aimingMe && styles.gangSeatDanger,
                !alive && styles.gangSeatDead,
              ]}
            >
              <View style={styles.gangTopRow}>
                {player ? (
                  <Portrait
                    p={player}
                    size={38}
                    frame={player.cosmetics?.frame}
                    pet={player.cosmetics?.pet}
                  />
                ) : (
                  <UiIcon name="User" size={24} color={C.muted} />
                )}

                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <NameText
                    fx={player?.cosmetics?.nameFx}
                    style={[styles.gangName, !alive && styles.deadStrike]}
                  >
                    {view.names[id] ?? id}
                  </NameText>

                  <View style={styles.heartsRow}>
                    {alive ? (
                      Array.from({ length: CG_START_HP }, (_, idx) => (
                        <EmojiIcon
                          key={idx}
                          emoji={idx < hp ? '❤️' : '🩶'}
                          size={13}
                        />
                      ))
                    ) : (
                      <View style={styles.inlineRow}>
                        <EmojiIcon emoji="💀" size={13} />
                        <T style={styles.deadLabel}>Đã ngã gục</T>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Tiền & Kim Cương */}
              <View style={styles.wealthRow}>
                <View style={styles.cashBadge}>
                  <EmojiIcon emoji="🪙" size={13} />
                  <T style={styles.cashBadgeTxt}>{formatUsd(cashVal)}</T>
                </View>
                <View style={[styles.diaBadge, diamondKingSet.has(id) && styles.diaBadgeKing]}>
                  <EmojiIcon emoji="💎" size={12} />
                  <T style={styles.diaBadgeTxt}>{diaCount}</T>
                </View>
              </View>

              {/* Các Huy Hiệu Trạng Thái: Bố Già, Đầu Hàng, Đang Nhắm */}
              <View style={styles.tagsWrap}>
                {isGf && (
                  <View style={styles.gfTag}>
                    <EmojiIcon emoji="👑" size={11} />
                    <T style={styles.gfTagTxt}>Bố Già</T>
                  </View>
                )}

                {view.phase === 'plan' && alive && (
                  <View style={[styles.planStateTag, plannedSet.has(id) && styles.planStateTagOn]}>
                    <T
                      style={[
                        styles.planStateTxt,
                        plannedSet.has(id) && { color: '#065F46' },
                      ]}
                    >
                      {plannedSet.has(id) ? 'Đã lên đạn' : 'Đang tính…'}
                    </T>
                  </View>
                )}

                {isSurr && view.phase !== 'plan' && (
                  <View style={styles.surrenderTag}>
                    <EmojiIcon emoji="🏳️" size={12} />
                    <T style={styles.surrenderTagTxt}>Đã nằm xuống</T>
                  </View>
                )}

                {(view.phase === 'standoff' || view.phase === 'resolve') &&
                  alive &&
                  !isSurr &&
                  aimTargetId && (
                    <View style={[styles.aimRedBadge, aimingMe && styles.aimRedBadgePulse]}>
                      <EmojiIcon emoji="🔫" size={12} />
                      <T numberOfLines={1} style={styles.aimRedTxt}>
                        Nhắm: @{view.names[aimTargetId] ?? aimTargetId}
                      </T>
                    </View>
                  )}
              </View>
            </View>
          );
        })}
      </View>

      {/* PHA 1: CHỌN VIÊN ĐẠN TRONG BĂNG & CHỌN MỤC TIÊU NHẮM */}
      {view.phase === 'plan' && iAlive && (
        <Card style={styles.planPanel}>
          <View style={styles.planHeadRow}>
            <View style={styles.inlineRow}>
              <EmojiIcon emoji="🔫" size={17} />
              <T style={styles.secTitle}>1. Chọn Đạn Bỏ Vào Ổ Quay</T>
            </View>
            <T style={styles.clipCountTxt}>
              Còn {remainingClicks} Giả · {remainingBangs} Thật
            </T>
          </View>

          <View style={styles.bulletRow}>
            {view.myClip.map((b, idx) => {
              const picked = effBullet === idx;
              const isBang = b === 'bang';
              return (
                <Pressable
                  key={`${idx}-${b}`}
                  testID={`cg-bullet-${idx}`}
                  disabled={busy || iPlanned}
                  onPress={() => {
                    play('flip');
                    setSelectedBullet(idx);
                  }}
                  style={({ pressed }) => [
                    styles.bulletCardOuter,
                    sticker(picked ? 4 : 2),
                    picked && styles.bulletCardPicked,
                    pressed && !iPlanned && { transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <LinearGradient
                    colors={
                      isBang
                        ? ['#7F1D1D', '#DC2626', '#991B1B']
                        : ['#1E293B', '#334155', '#0F172A']
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bulletCardInner}
                  >
                    <EmojiIcon emoji={isBang ? '💥' : '🤡'} size={20} />
                    <T style={styles.bulletTitle}>
                      {isBang ? 'Bang! Đạn Thật' : 'Click! Đạn Giả'}
                    </T>
                    <T style={styles.bulletSub}>
                      {isBang ? 'Trừ 1 tim' : 'Dọa ma thôi'}
                    </T>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.inlineRow, { marginTop: 4 }]}>
            <GameIcon name="crosshair" size={17} color="#DC2626" />
            <T style={styles.secTitle}>2. Chĩa Họng Súng Vào Ai?</T>
          </View>

          <View style={styles.targetGrid}>
            {aliveOpponents.map((id) => {
              const p = playerMap.get(id);
              const picked = effTarget === id;
              return (
                <Pressable
                  key={id}
                  testID={`cg-target-${id}`}
                  disabled={busy || iPlanned}
                  onPress={() => {
                    play('pop');
                    setSelectedTarget(id);
                  }}
                  style={[
                    styles.targetBtn,
                    picked && styles.targetBtnPicked,
                  ]}
                >
                  {p && <Portrait p={p} size={28} />}
                  <T numberOfLines={1} style={[styles.targetBtnTxt, picked && { color: '#991B1B' }]}>
                    @{view.names[id] ?? id}
                  </T>
                  <GameIcon
                    name="crosshair"
                    size={15}
                    color={picked ? '#DC2626' : '#94A3B8'}
                  />
                </Pressable>
              );
            })}
          </View>
        </Card>
      )}

      {/* PHA 3: KẾT QUẢ NỔ SÚNG & CHIA TIỀN */}
      {view.phase === 'resolve' && (
        <Card style={styles.resolveCard}>
          <View style={styles.inlineRow}>
            <EmojiIcon emoji="💥" size={18} />
            <T style={styles.secTitle}>Diễn Biến Đấu Súng & Chia Phần</T>
          </View>

          {view.lastShots.length > 0 ? (
            <View style={styles.shotsList}>
              {view.lastShots.map((s, idx) => {
                const isBang = !s.blocked && s.bullet === 'bang' && !s.dodged;
                return (
                  <View
                    key={`${s.fromId}-${s.toId}-${idx}`}
                    style={[
                      styles.shotRow,
                      isBang ? styles.shotRowBang : styles.shotRowClick,
                    ]}
                  >
                    <EmojiIcon
                      emoji={s.blocked || s.dodged ? '🏳️' : isBang ? '💥' : '🤡'}
                      size={18}
                    />
                    <T style={styles.shotTxt}>
                      <T style={{ fontWeight: '900' }}>@{view.names[s.fromId] ?? s.fromId}</T>
                      {s.blocked ? ' hạ súng đối với ' : ' bóp cò vào '}
                      <T style={{ fontWeight: '900' }}>@{view.names[s.toId] ?? s.toId}</T>
                      {': '}
                      {s.blocked
                        ? 'Đã đầu hàng nằm xuống trước — Không nổ súng!'
                        : s.dodged
                          ? 'Nằm xuống kịp thời — Đạn bay qua đầu!'
                          : isBang
                            ? 'BANG!! Đạn Thật nổ tung (-1 tim, mất phần chia!)'
                            : 'CLICK! Đạn Giả kêu cái cạch quê độ!'}
                    </T>
                  </View>
                );
              })}
            </View>
          ) : (
            <T style={styles.emptyResolveTxt}>
              Cả sòng đều nằm xuống hoặc hòa bình — không có viên đạn nào nổ!
            </T>
          )}

          <View style={styles.lootGainSection}>
            <View style={styles.inlineRow}>
              <EmojiIcon emoji="💰" size={16} />
              <T style={styles.lootGainHeader}>Chiến lợi phẩm bỏ túi vòng này:</T>
            </View>
            {Object.entries(view.lastLootGains).some(([, arr]) => arr.length > 0) ? (
              Object.entries(view.lastLootGains).map(([pid, items]) => {
                if (!items || items.length === 0) return null;
                return (
                  <View key={pid} style={styles.lootGainRow}>
                    <EmojiIcon emoji="🤑" size={15} />
                    <T style={styles.lootGainTxt}>
                      <T style={{ fontWeight: '900' }}>@{view.names[pid] ?? pid}: </T>
                      {items.join(' · ')}
                    </T>
                  </View>
                );
              })
            ) : (
              <T style={styles.emptyResolveTxt}>
                Không ai trụ lại trên bàn nên toàn bộ chiến lợi phẩm bốc hơi!
              </T>
            )}
          </View>
        </Card>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vaultStage: {
    borderRadius: 22,
    padding: 13,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(250,204,21,0.38)',
  },
  vaultHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(250,204,21,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
  },
  roundPillTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FDE047',
  },
  vaultTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: FONT,
  },
  phaseChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#BE123C',
  },
  phaseChipTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF1F2',
    letterSpacing: 0.4,
  },

  lootTable: {
    borderRadius: 16,
    padding: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: '#D97706',
  },
  lootTableHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  lootTableTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 0.4,
  },
  godfatherInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.45)',
  },
  godfatherInfoTxt: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FDE68A',
  },
  lootGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  lootTile: {
    flexGrow: 1,
    minWidth: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  lootShortTxt: {
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  diamondBonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.58)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.45)',
  },
  diamondBonusTxt: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#BAE6FD',
    textAlign: 'center',
    flexShrink: 1,
  },

  standoffAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 12,
    borderWidth: 2,
    borderColor: '#FEF08A',
  },
  standoffAlertTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FEF08A',
  },
  standoffAlertSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },

  gfNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#D97706',
  },
  gfNoticeTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '900',
    color: '#78350F',
  },

  gfControlCard: {
    borderRadius: 18,
    padding: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  gfControlTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FDE047',
  },
  gfControlSub: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E9D5FF',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  gfChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  gfChipOn: {
    backgroundColor: '#FACC15',
    borderColor: '#FEF08A',
  },
  gfChipTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  gfChipTxtOn: {
    color: '#271400',
    fontWeight: '900',
  },

  gangGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  gangSeat: {
    flexGrow: 1,
    minWidth: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.14)',
  },
  gangSeatMe: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  gangSeatDanger: {
    borderColor: '#DC2626',
    borderWidth: 2.5,
    backgroundColor: '#FFF1F2',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 0 16px rgba(220, 38, 38, 0.5)' } as object)
      : null),
  },
  gangSeatDead: {
    opacity: 0.56,
    backgroundColor: '#E2E8F0',
  },
  gangTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gangName: {
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
  },
  deadStrike: {
    textDecorationLine: 'line-through',
    color: C.muted,
  },
  heartsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deadLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
  },
  wealthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cashBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.28)',
  },
  cashBadgeTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#14532D',
  },
  diaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(2,132,199,0.28)',
  },
  diaBadgeKing: {
    backgroundColor: '#E0F2FE',
    borderColor: '#0284C7',
    borderWidth: 1.5,
  },
  diaBadgeTxt: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0C4A6E',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  gfTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  gfTagTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#92400E',
  },
  planStateTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
  },
  planStateTagOn: {
    backgroundColor: '#D1FAE5',
  },
  planStateTxt: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
  },
  surrenderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  surrenderTagTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#334155',
  },
  aimRedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#DC2626',
    maxWidth: '100%',
  },
  aimRedBadgePulse: {
    backgroundColor: '#991B1B',
    borderWidth: 1.5,
    borderColor: '#FEF08A',
  },
  aimRedTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    flexShrink: 1,
  },

  planPanel: {
    padding: 13,
    gap: 10,
  },
  planHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  secTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: C.ink,
  },
  clipCountTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: C.muted,
  },
  bulletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  bulletCardOuter: {
    flexGrow: 1,
    minWidth: 96,
    flexBasis: '23%',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  bulletCardPicked: {
    borderColor: '#FACC15',
    borderWidth: 3,
    transform: [{ translateY: -2 }],
  },
  bulletCardInner: {
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  bulletTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bulletSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetBtn: {
    flexGrow: 1,
    minWidth: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  targetBtnPicked: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
    borderWidth: 2.5,
  },
  targetBtnTxt: {
    flex: 1,
    fontSize: 13,
    fontWeight: '900',
    color: C.ink,
  },

  resolveCard: {
    padding: 13,
    gap: 10,
  },
  shotsList: {
    gap: 6,
  },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  shotRowBang: {
    backgroundColor: '#FFE4E6',
    borderColor: '#E11D48',
  },
  shotRowClick: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  shotTxt: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: C.ink,
  },
  emptyResolveTxt: {
    fontSize: 12.5,
    fontWeight: '700',
    color: C.muted,
    fontStyle: 'italic',
  },
  lootGainSection: {
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  lootGainHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: '#065F46',
  },
  lootGainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  lootGainTxt: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#064E3B',
  },

  dock: {
    gap: 6,
  },
  standoffBtnRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  deadDockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  waitNote: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  errPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#991B1B',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  errTxt: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
  },
});
