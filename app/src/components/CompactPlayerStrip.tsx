import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT } from '../theme';
import { T } from '../ui';
import { Portrait } from './Avatar';
import { useShellTools } from './Shell';

export interface CompactPlayerStripProps {
  room: RoomState;
  game: Game;
  order?: string[];
  activeId?: string | null;
  ring?: (p: PublicPlayer) => string | undefined;
  dim?: (p: PublicPlayer) => boolean;
  sub?: (p: PublicPlayer) => string | undefined;
  rank?: (p: PublicPlayer) => number | undefined;
  dark?: boolean;
  testID?: string;
}

/**
 * Dải người chơi siêu gọn (1 dòng ~36px): chân dung 22px, tên rút gọn và điểm/trạng thái.
 * Chạm vào mình mở Hồ sơ, chạm vào người khác mở Bảng chọc ghẹo — giữ đủ tương tác mà không chiếm màn chơi.
 */
export function CompactPlayerStrip({
  room,
  game,
  order,
  activeId,
  ring,
  dim,
  sub,
  rank,
  dark = false,
  testID,
}: CompactPlayerStripProps) {
  const tools = useShellTools();
  const me = game.me ?? '';
  const meIsSpectator = room.players.find((p) => p.id === me)?.spectator === true;

  const players = order
    ? order.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p)
    : [...room.players];
  for (const p of room.players) {
    if (!players.includes(p)) players.push(p);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID ?? 'compact-player-strip'}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {players.map((p) => {
        const isMe = p.id === me;
        const isActive = activeId === p.id;
        const isDim = !!dim?.(p) || p.spectator === true;
        const ringColor = ring?.(p);
        const subTxt = p.spectator ? 'Xem' : sub?.(p);
        const rk = p.spectator ? undefined : rank?.(p);

        return (
          <Pressable
            key={p.id}
            testID={`compact-player-${p.id}`}
            disabled={!isMe && meIsSpectator}
            onPress={() => {
              if (isMe) tools?.openProfile();
              else if (!meIsSpectator) tools?.openPlayer(p.id);
            }}
            style={[
              styles.pill,
              dark ? styles.pillDark : styles.pillLight,
              isMe && (dark ? styles.pillMeDark : styles.pillMeLight),
              isActive && styles.pillActive,
              ringColor ? { borderColor: ringColor, borderWidth: 2 } : null,
              isDim && styles.pillDim,
            ]}
          >
            {rk !== undefined && rk > 0 && (
              <View style={[styles.rkBadge, rk === 1 && styles.rkGold]}>
                <T style={[styles.rkTxt, rk === 1 && styles.rkTxtGold]}>#{rk}</T>
              </View>
            )}
            <Portrait p={p} size={22} border={1.5} />
            <T
              numberOfLines={1}
              style={[
                styles.name,
                dark ? styles.nameDark : styles.nameLight,
                isActive && styles.nameActive,
              ]}
            >
              {p.name}
            </T>
            {subTxt !== undefined && (
              <View style={[styles.subBadge, dark ? styles.subDark : styles.subLight]}>
                <T numberOfLines={1} style={[styles.subTxt, dark ? styles.subTxtDark : styles.subTxtLight]}>
                  {subTxt}
                </T>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 34,
    maxHeight: 38,
  },
  row: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pillLight: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderColor: 'rgba(15,23,42,0.14)',
  },
  pillDark: {
    backgroundColor: 'rgba(15,23,42,0.82)',
    borderColor: 'rgba(148,163,184,0.34)',
  },
  pillMeLight: {
    backgroundColor: '#FEF9C3',
    borderColor: 'rgba(217,119,6,0.45)',
  },
  pillMeDark: {
    backgroundColor: 'rgba(234,179,8,0.22)',
    borderColor: 'rgba(250,204,21,0.65)',
  },
  pillActive: {
    borderColor: '#F59E0B',
    borderWidth: 2,
  },
  pillDim: {
    opacity: 0.45,
  },
  rkBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  rkGold: {
    backgroundColor: '#FACC15',
  },
  rkTxt: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#334155',
  },
  rkTxtGold: {
    color: '#422006',
  },
  name: {
    fontSize: 11.5,
    fontWeight: '800',
    maxWidth: 66,
    fontFamily: FONT,
  },
  nameLight: {
    color: C.ink,
  },
  nameDark: {
    color: '#F8FAFC',
  },
  nameActive: {
    color: '#B45309',
    fontWeight: '900',
  },
  subBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  subLight: {
    backgroundColor: '#F1F5F9',
  },
  subDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  subTxt: {
    fontSize: 10,
    fontWeight: '900',
  },
  subTxtLight: {
    color: '#334155',
  },
  subTxtDark: {
    color: '#E2E8F0',
  },
});
