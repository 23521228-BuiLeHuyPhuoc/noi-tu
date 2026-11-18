import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { CaSauToothState, CaSauView } from '../../../shared/src/casau';
import { themeById } from '../../../shared/src/themes';
import type { ActionError, PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { FONT, sticker } from '../theme';
import { actionText } from '../messages';
import { play } from '../sound';
import { useOnChange } from '../hooks';
import { Button, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { CountdownBar } from '../components/TimerBar';
import { Portrait } from '../components/Avatar';
import { NameText } from '../components/Cosmetics';
import { Confetti } from '../components/Fun';
import { EmojiIcon, GameIcon, UiIcon } from '../components/Icons';
import { MotionSurface } from '../components/MotionPrimitives';

const EXTRA_ERRORS: Partial<Record<ActionError, string>> = {
  not_your_turn: 'Chưa tới lượt khám răng của bạn đâu!',
  cell_occupied: 'Chiếc răng này đã được nhấn rồi, chọn răng trắng nguyên vẹn nhé!',
  bad_action: 'Thao tác chưa hợp lệ, hãy chọn 1 chiếc răng trắng nhé!',
};

function errOf(reason: ActionError): string {
  return EXTRA_ERRORS[reason] ?? actionText[reason] ?? 'Thao tác chưa hợp lệ.';
}

export function CaSauScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game as CaSauView;
  const me = game.me ?? '';
  const isHost = room.hostId === me;
  const theme = themeById(room.settings.roomTheme ?? game.user?.equipped?.roomTheme);
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [busyTooth, setBusyTooth] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);

  useOnChange(view.phase, (ph) => {
    setErr(null);
    if (ph === 'bite_reveal') {
      play(view.bittenPlayerId === me ? 'lose' : 'error');
    } else {
      play('pop');
    }
  });

  useOnChange(view.currentPlayerId, (cur) => {
    if (cur === me && view.phase === 'pressing') {
      play('turn');
    }
  });

  const playerMap = useMemo(() => new Map(room.players.map((p) => [p.id, p])), [room.players]);
  const isMyTurn = view.phase === 'pressing' && view.currentPlayerId === me;
  const activePlayer = view.currentPlayerId ? playerMap.get(view.currentPlayerId) : undefined;
  const bittenPlayer = view.bittenPlayerId ? playerMap.get(view.bittenPlayerId) : undefined;

  const half = Math.ceil(view.teeth.length / 2);
  const upperTeeth = view.teeth.slice(0, half);
  const lowerTeeth = view.teeth.slice(half);

  const pressTooth = async (idx: number) => {
    if (!isMyTurn || busyTooth !== null || view.teeth[idx] !== 'intact') return;
    setBusyTooth(idx);
    setErr(null);
    play('stamp');
    const res = await game.act({ type: 'cs_press', tooth: idx });
    setBusyTooth(null);
    if (!res.ok) {
      play('error');
      setErr(errOf(res.reason));
    }
  };

  const handleEarlyEnd = async () => {
    if (!isHost) return;
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setConfirmEnd(false);
    await game.act({ type: 'end' });
  };

  const strip: StripOptions = useMemo(
    () => ({
      order: view.order,
      active: view.phase === 'pressing' ? view.currentPlayerId : view.bittenPlayerId,
      ring: (p: PublicPlayer) => {
        if (view.phase === 'bite_reveal' && view.bittenPlayerId === p.id) return '#F43F5E';
        if (view.currentPlayerId === p.id) return '#4ADE80';
        return undefined;
      },
      sub: (p: PublicPlayer) => {
        const sc = view.scores[p.id] ?? 0;
        const bt = view.bites[p.id] ?? 0;
        return bt > 0 ? `${sc}đ · ${bt}💥` : `${sc}đ`;
      },
    }),
    [view.order, view.phase, view.currentPlayerId, view.bittenPlayerId, view.scores, view.bites],
  );

  const renderTooth = (state: CaSauToothState, idx: number, isUpper: boolean) => {
    const intact = state === 'intact';
    const canTap = isMyTurn && intact && busyTooth === null;
    const ownerId = view.pressedBy[idx];
    const ownerName = ownerId ? (view.names[ownerId] ?? '').slice(0, 6) : '';

    return (
      <Pressable
        key={idx}
        testID={`cs-tooth-${idx}`}
        disabled={!canTap}
        onPress={() => void pressTooth(idx)}
        style={({ pressed }) => [
          styles.toothBase,
          isUpper ? styles.toothUpper : styles.toothLower,
          !intact && styles.toothPushed,
          state === 'safe' && styles.toothSafe,
          state === 'gold' && styles.toothGold,
          state === 'reverse' && styles.toothReverse,
          state === 'trap' && styles.toothTrap,
          canTap && styles.toothInteractive,
          pressed && canTap && { transform: [{ translateY: isUpper ? -4 : 4 }, { scale: 0.94 }] },
        ]}
      >
        {intact ? (
          <>
            <EmojiIcon emoji="🦷" size={20} />
            <T selectable={false} style={styles.toothNum}>
              #{idx + 1}
            </T>
          </>
        ) : state === 'gold' ? (
          <>
            <EmojiIcon emoji="💎" size={18} />
            <T selectable={false} style={styles.toothTagGold}>
              +40đ
            </T>
          </>
        ) : state === 'reverse' ? (
          <>
            <EmojiIcon emoji="🔄" size={17} />
            <T selectable={false} style={styles.toothTagRev}>
              Đảo!
            </T>
          </>
        ) : state === 'trap' ? (
          <>
            <EmojiIcon emoji="💥" size={20} />
            <T selectable={false} style={styles.toothTagTrap}>
              ĐỚP!
            </T>
          </>
        ) : (
          <>
            <UiIcon name="Check" size={15} color="#4ADE80" strokeWidth={3} />
            <T selectable={false} numberOfLines={1} style={styles.toothTagSafe}>
              {ownerName || 'Êm'}
            </T>
          </>
        )}
      </Pressable>
    );
  };

  return (
    <Shell
      game={game}
      room={room}
      strip={strip}
      wide={wide}
      bottom={
        <View style={styles.bottomWrap}>
          <T style={[styles.bottomHint, { color: theme.onBg }]}>
            {view.phase === 'bite_reveal'
              ? `💥 PHẬP!! ${view.names[view.bittenPlayerId ?? ''] ?? 'Ai đó'} trúng ngay Răng Sâu #${(view.trapTooth ?? 0) + 1}! Chuẩn bị mở hàm hiệp kế…`
              : isMyTurn
                ? '🔥 TỚI LƯỢT BẠN! Chạm 1 chiếc răng trắng bất kỳ — trúng Răng Vàng 💎 +40đ, né Răng Đau 💥!'
                : `Đang chờ @${view.names[view.currentPlayerId ?? ''] ?? 'người chơi'} run tay nhấn răng…`}
          </T>
          {isHost && (
            <View style={styles.hostRow}>
              <Button
                testID="casau-end-early"
                small
                variant={confirmEnd ? 'danger' : 'paper'}
                title={confirmEnd ? 'Xác nhận kết thúc?' : 'Kết thúc sớm'}
                onPress={() => void handleEarlyEnd()}
              />
              {confirmEnd && (
                <Button small variant="paper" title="Hủy" onPress={() => setConfirmEnd(false)} />
              )}
            </View>
          )}
        </View>
      }
    >
      {view.round >= view.maxRounds && view.phase === 'bite_reveal' && view.bittenPlayerId !== me && (
        <Confetti />
      )}

      {/* BANNER LƯỢT KHÁM RĂNG & HIỆP ĐẤU */}
      <MotionSurface>
        <LinearGradient
          colors={
            view.phase === 'bite_reveal'
              ? ['#7F1D1D', '#450A0A', '#1E1B4B']
              : ['#064E3B', '#022C22', '#0F172A']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerCard, sticker(4)]}
          testID="casau-header"
        >
          <View style={styles.headerTop}>
            <View style={styles.turnActorRow}>
              {view.phase === 'bite_reveal' && bittenPlayer ? (
                <Portrait p={bittenPlayer} size={38} frame={bittenPlayer.cosmetics?.frame} />
              ) : activePlayer ? (
                <Portrait p={activePlayer} size={38} frame={activePlayer.cosmetics?.frame} />
              ) : (
                <EmojiIcon emoji="🐊" size={28} />
              )}
              <View style={{ flex: 1, minWidth: 0 }}>
                <T style={styles.roundBadgeTxt}>
                  HIỆP {view.round}/{view.maxRounds} ·{' '}
                  {view.direction === 1 ? '➡️ XUÔI CHIỀU' : '⬅️ ĐẢO CHIỀU'}
                </T>
                <NameText
                  fx={(view.phase === 'bite_reveal' ? bittenPlayer : activePlayer)?.cosmetics?.nameFx}
                  style={styles.actorNameTxt}
                >
                  {view.phase === 'bite_reveal'
                    ? `💥 ${view.names[view.bittenPlayerId ?? ''] ?? ''} bị Cá Sấu đớp!`
                    : isMyTurn
                      ? '🔥 Lượt của BẠN — Khám răng ngay!'
                      : `Lượt của ${view.names[view.currentPlayerId ?? ''] ?? '---'}`}
                </NameText>
              </View>
            </View>

            <View style={styles.teethCountPill}>
              <EmojiIcon emoji="🦷" size={14} />
              <T style={styles.teethCountTxt}>
                Còn {view.teeth.filter((t) => t === 'intact').length}/{view.totalTeeth}
              </T>
            </View>
          </View>

          <CountdownBar
            endsAt={view.phaseEndsAt}
            total={view.phaseSeconds}
            clockOffset={game.clockOffset}
            lightText
            testID="casau-timer"
          />

          {view.lastActionText && (
            <View style={styles.actionLogPill}>
              <EmojiIcon emoji={view.phase === 'bite_reveal' ? '💥' : '✨'} size={15} />
              <T style={styles.actionLogTxt}>{view.lastActionText}</T>
            </View>
          )}
        </LinearGradient>
      </MotionSurface>

      {err && (
        <View style={[styles.errBanner, sticker(2)]}>
          <UiIcon name="AlertTriangle" size={15} color="#FEF08A" />
          <T style={styles.errTxt}>{err}</T>
        </View>
      )}

      {/* SÂN KHẤU HÀM CÁ SẤU KHỔNG LỒ ĐỐI XỨNG TRÊN - DƯỚI */}
      <LinearGradient
        colors={
          view.phase === 'bite_reveal'
            ? ['#991B1B', '#450A0A', '#18181B']
            : ['#14532D', '#052E16', '#091E16']
        }
        style={[
          styles.gatorStage,
          sticker(4),
          view.phase === 'bite_reveal' && styles.gatorStageBite,
        ]}
        testID="casau-jaws"
      >
        {/* Mắt & Mũi Cá Sấu Chúa */}
        <View style={styles.gatorSnoutBar}>
          <View style={styles.gatorEyeOrb}>
            <View
              style={[
                styles.gatorPupil,
                view.phase === 'bite_reveal' && { backgroundColor: '#EF4444', width: 12 },
              ]}
            />
          </View>
          <View style={styles.snoutCenterBadge}>
            <GameIcon
              name="croc-jaws"
              size={24}
              color={view.phase === 'bite_reveal' ? '#FCA5A5' : '#86EFAC'}
            />
            <T selectable={false} style={styles.snoutTitle}>
              {view.phase === 'bite_reveal' ? 'PHẬP!! ĐỚP TRÚNG RĂNG ĐAU!' : 'HÀM CÁ SẤU CHÚA ĐẦM LẦY'}
            </T>
          </View>
          <View style={styles.gatorEyeOrb}>
            <View
              style={[
                styles.gatorPupil,
                view.phase === 'bite_reveal' && { backgroundColor: '#EF4444', width: 12 },
              ]}
            />
          </View>
        </View>

        {/* Vòm lợi & Hàm răng TRÊN */}
        <View style={styles.gumArchUpper}>
          <View style={styles.teethRow}>
            {upperTeeth.map((st, i) => renderTooth(st, i, true))}
          </View>
        </View>

        {/* Khoang miệng & Lưỡi hồng Cá Sấu */}
        <View
          style={[
            styles.mouthCavity,
            view.phase === 'bite_reveal' && styles.mouthCavityClamped,
          ]}
        >
          <LinearGradient
            colors={['#FB7185', '#E11D48', '#9F1239']}
            style={styles.gatorTongue}
          >
            <T selectable={false} style={styles.tongueHintTxt}>
              {view.phase === 'bite_reveal'
                ? '🐊 NGẬP RĂNG!!'
                : '💎 2 Răng Vàng (+40đ) · 🔄 1 Răng Đảo Chiều · 💥 1 Răng Sâu (-25đ)'}
            </T>
          </LinearGradient>
        </View>

        {/* Vòm lợi & Hàm răng DƯỚI */}
        <View style={styles.gumArchLower}>
          <View style={styles.teethRow}>
            {lowerTeeth.map((st, i) => renderTooth(st, half + i, false))}
          </View>
        </View>
      </LinearGradient>

      {/* BẢNG ĐIỂM GAN DẠ NHANH */}
      <View style={[styles.scoreBoard, sticker(2)]} testID="casau-scoreboard">
        {view.order.map((pid) => {
          const sc = view.scores[pid] ?? 0;
          const bt = view.bites[pid] ?? 0;
          const lv = view.lives?.[pid] ?? Math.max(0, 3 - bt);
          const isMeChip = pid === me;
          return (
            <View
              key={pid}
              style={[
                styles.scoreChip,
                isMeChip && styles.scoreChipMe,
                view.currentPlayerId === pid && view.phase === 'pressing' && styles.scoreChipTurn,
              ]}
            >
              <T numberOfLines={1} style={styles.scoreChipName}>
                {view.names[pid] ?? pid}
              </T>
              <View style={styles.scoreChipRight}>
                <T style={styles.scoreChipPts}>{sc}đ</T>
                <View style={{ flexDirection: 'row', gap: 1 }}>
                  {[0, 1, 2].map((h) => (
                    <EmojiIcon key={h} emoji={h < lv ? '❤️' : '💀'} size={11} />
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Shell>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    borderRadius: 22,
    padding: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: 'rgba(74, 222, 128, 0.42)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  turnActorRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minWidth: 0,
  },
  roundBadgeTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#86EFAC',
    letterSpacing: 0.4,
  },
  actorNameTxt: {
    fontSize: 15,
    fontWeight: '900',
    color: '#F8FAFC',
    fontFamily: FONT,
  },
  teethCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(134, 239, 172, 0.45)',
  },
  teethCountTxt: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#F0FDF4',
  },
  actionLogPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  actionLogTxt: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#FEF08A',
  },

  errBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#991B1B',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  errTxt: { flex: 1, fontSize: 12, fontWeight: '800', color: '#FEF08A' },

  gatorStage: {
    borderRadius: 26,
    padding: 12,
    gap: 8,
    borderWidth: 3,
    borderColor: '#22C55E',
    ...(Platform.OS === 'web'
      ? ({
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxShadow: '0 14px 34px rgba(5, 46, 22, 0.55)',
        } as object)
      : null),
  },
  gatorStageBite: {
    borderColor: '#F43F5E',
    ...(Platform.OS === 'web'
      ? ({ animation: 'xl-shake-hard 380ms ease-in-out' } as object)
      : null),
  },
  gatorSnoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 6,
  },
  gatorEyeOrb: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF08A',
    borderWidth: 3,
    borderColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gatorPupil: {
    width: 7,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#0F172A',
  },
  snoutCenterBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.68)',
    borderWidth: 1.5,
    borderColor: 'rgba(134, 239, 172, 0.4)',
  },
  snoutTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#ECFDF5',
    textAlign: 'center',
    flexShrink: 1,
  },

  gumArchUpper: {
    backgroundColor: '#9F1239',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    borderWidth: 2,
    borderColor: '#FB7185',
  },
  gumArchLower: {
    backgroundColor: '#9F1239',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 2,
    borderColor: '#FB7185',
  },
  teethRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },

  toothBase: {
    minWidth: 44,
    width: '14.5%',
    maxWidth: 62,
    height: 54,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  toothUpper: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  toothLower: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  toothInteractive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FDE047',
    ...(Platform.OS === 'web'
      ? ({ cursor: 'pointer', boxShadow: '0 4px 10px rgba(250, 204, 21, 0.25)' } as object)
      : null),
  },
  toothPushed: {
    height: 44,
    opacity: 0.94,
  },
  toothSafe: {
    backgroundColor: '#064E3B',
    borderColor: '#34D399',
  },
  toothGold: {
    backgroundColor: '#78350F',
    borderColor: '#FACC15',
  },
  toothReverse: {
    backgroundColor: '#0C4A6E',
    borderColor: '#38BDF8',
  },
  toothTrap: {
    backgroundColor: '#7F1D1D',
    borderColor: '#FDA4AF',
    height: 56,
  },
  toothNum: { fontSize: 10, fontWeight: '900', color: '#475569' },
  toothTagSafe: { fontSize: 9.5, fontWeight: '800', color: '#A7F3D0' },
  toothTagGold: { fontSize: 10, fontWeight: '900', color: '#FEF08A' },
  toothTagRev: { fontSize: 9.5, fontWeight: '900', color: '#BAE6FD' },
  toothTagTrap: { fontSize: 10, fontWeight: '900', color: '#FFE4E6' },

  mouthCavity: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#270914',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mouthCavityClamped: {
    minHeight: 28,
    backgroundColor: '#450A0A',
  },
  gatorTongue: {
    width: '92%',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FDA4AF',
  },
  tongueHintTxt: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFF1F2',
    textAlign: 'center',
  },

  scoreBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(148, 163, 184, 0.3)',
  },
  scoreChip: {
    flexGrow: 1,
    minWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  scoreChipMe: {
    borderColor: '#FACC15',
  },
  scoreChipTurn: {
    backgroundColor: 'rgba(20, 83, 45, 0.88)',
    borderColor: '#4ADE80',
  },
  scoreChipName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  scoreChipRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  scoreChipPts: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FDE047',
  },

  bottomWrap: { gap: 6 },
  bottomHint: { fontSize: 12.5, fontWeight: '800', textAlign: 'center', paddingHorizontal: 6 },
  hostRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
